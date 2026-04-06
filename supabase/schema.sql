-- Full schema for a fresh Supabase project (SQL Editor).
-- Existing projects that already ran the older schema should use
-- migration-002-conversations.sql instead of re-running this whole file.

-- ── Profiles ───────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_authenticated"
  on public.profiles for select to authenticated using (true);

create policy "profiles_insert_own"
  on public.profiles for insert to authenticated
  with check (id = auth.uid());

create policy "profiles_update_own"
  on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- ── Conversations (channel / DM / group) ───────────────────────────────────
do $$ begin
  create type public.conversation_kind as enum ('channel', 'direct', 'group');
exception when duplicate_object then null;
end $$;

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  kind public.conversation_kind not null,
  title text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  last_activity_at timestamptz not null default now(),
  last_message_preview text
);

create table if not exists public.conversation_members (
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  last_read_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

create index if not exists conversation_members_user_id_idx
  on public.conversation_members (user_id);

do $$
begin
  if not exists (
    select 1 from public.conversations
    where kind = 'channel' and title = 'Design Syndicate'
  ) then
    insert into public.conversations (kind, title) values ('channel', 'Design Syndicate');
  end if;
end $$;

create or replace function public.user_is_conversation_member(p_conversation_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.conversation_members cm
    where cm.conversation_id = p_conversation_id
      and cm.user_id = auth.uid()
  );
$$;

revoke all on function public.user_is_conversation_member(uuid) from public;
grant execute on function public.user_is_conversation_member(uuid) to authenticated;

alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;

create policy "conversations_select_member"
  on public.conversations for select to authenticated
  using (public.user_is_conversation_member(id));

create policy "conversations_insert_own"
  on public.conversations for insert to authenticated
  with check (created_by = auth.uid());

create policy "conversation_members_select_member"
  on public.conversation_members for select to authenticated
  using (public.user_is_conversation_member(conversation_id));

create policy "conversation_members_insert"
  on public.conversation_members for insert to authenticated
  with check (
    user_id = auth.uid()
    or exists (
      select 1 from public.conversations c
      where c.id = conversation_members.conversation_id
        and c.created_by = auth.uid()
    )
  );

-- ── Messages ───────────────────────────────────────────────────────────────
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  content text not null,
  user_id uuid not null references public.profiles (id) on delete cascade,
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  created_at timestamptz not null default now(),
  edited_at timestamptz,
  deleted_at timestamptz,
  attachments jsonb not null default '[]'::jsonb,
  constraint messages_content_or_attachments_check check (
    deleted_at is not null
    or length(trim(coalesce(content, ''))) > 0
    or coalesce(jsonb_array_length(attachments), 0) > 0
  )
);

create index if not exists messages_created_at_idx on public.messages (created_at desc);
create index if not exists messages_conversation_created_idx
  on public.messages (conversation_id, created_at desc);

alter table public.messages replica identity full;

alter table public.messages enable row level security;

create policy "messages_select_conversation_member"
  on public.messages for select to authenticated
  using (public.user_is_conversation_member(conversation_id));

create policy "messages_insert_conversation_member"
  on public.messages for insert to authenticated
  with check (
    user_id = auth.uid()
    and public.user_is_conversation_member(conversation_id)
  );

create policy "messages_update_own"
  on public.messages for update to authenticated
  using (
    user_id = auth.uid()
    and public.user_is_conversation_member(conversation_id)
  )
  with check (
    user_id = auth.uid()
    and public.user_is_conversation_member(conversation_id)
  );

create table if not exists public.message_reactions (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  emoji text not null,
  created_at timestamptz not null default now(),
  constraint message_reactions_emoji_len check (char_length(emoji) between 1 and 32),
  constraint message_reactions_unique_user_emoji unique (message_id, user_id, emoji)
);

create index if not exists message_reactions_message_id_idx
  on public.message_reactions (message_id);

alter table public.message_reactions enable row level security;

create policy "message_reactions_select_member"
  on public.message_reactions for select to authenticated
  using (
    exists (
      select 1 from public.messages m
      where m.id = message_reactions.message_id
        and public.user_is_conversation_member(m.conversation_id)
    )
  );

create policy "message_reactions_insert_own"
  on public.message_reactions for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.messages m
      where m.id = message_reactions.message_id
        and m.deleted_at is null
        and public.user_is_conversation_member(m.conversation_id)
    )
  );

create policy "message_reactions_delete_own"
  on public.message_reactions for delete to authenticated
  using (user_id = auth.uid());

create policy "conversation_members_delete_own"
  on public.conversation_members for delete to authenticated
  using (user_id = auth.uid());

create or replace function public.touch_conversation_last_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  preview text;
  att jsonb;
  att_name text;
  mime text;
begin
  preview := nullif(trim(new.content), '');
  if preview is null
     and new.attachments is not null
     and jsonb_array_length(new.attachments) > 0 then
    att := new.attachments->0;
    att_name := coalesce(att->>'name', '');
    mime := coalesce(lower(att->>'mimeType'), '');
    if (att->>'kind') = 'image' or left(mime, 6) = 'image/' then
      preview := '[Ảnh]';
    elsif length(att_name) > 0 then
      preview := '[' || left(att_name, 120) || ']';
    else
      preview := '[Tệp đính kèm]';
    end if;
  end if;
  if preview is null then
    preview := '…';
  end if;
  if length(preview) > 200 then
    preview := left(preview, 197) || '...';
  end if;

  update public.conversations
  set
    last_activity_at = new.created_at,
    last_message_preview = preview
  where id = new.conversation_id;
  return new;
end;
$$;

drop trigger if exists messages_touch_conversation_last_activity on public.messages;

create trigger messages_touch_conversation_last_activity
  after insert on public.messages
  for each row
  execute function public.touch_conversation_last_activity();

create index if not exists conversations_last_activity_idx
  on public.conversations (last_activity_at desc);

create or replace function public.mark_conversation_read(p_conversation_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  t timestamptz;
begin
  if not public.user_is_conversation_member(p_conversation_id) then
    raise exception 'not a member';
  end if;
  select max(m.created_at) into t
  from public.messages m
  where m.conversation_id = p_conversation_id
    and m.deleted_at is null;
  update public.conversation_members
  set last_read_at = coalesce(t, now())
  where conversation_id = p_conversation_id
    and user_id = auth.uid();
end;
$$;

revoke all on function public.mark_conversation_read(uuid) from public;
grant execute on function public.mark_conversation_read(uuid) to authenticated;

create or replace function public.my_conversation_unread_counts()
returns table (conversation_id uuid, unread_count bigint)
language sql
security definer
set search_path = public
stable
as $$
  select m.conversation_id, count(*)::bigint
  from public.messages m
  inner join public.conversation_members cm
    on cm.conversation_id = m.conversation_id
   and cm.user_id = auth.uid()
  where m.created_at > cm.last_read_at
    and m.deleted_at is null
  group by m.conversation_id;
$$;

revoke all on function public.my_conversation_unread_counts() from public;
grant execute on function public.my_conversation_unread_counts() to authenticated;

-- ── RPCs ───────────────────────────────────────────────────────────────────
create or replace function public.create_or_get_direct_chat(other_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  existing_id uuid;
  new_id uuid;
begin
  if me is null then raise exception 'Not authenticated'; end if;
  if other_user_id = me then raise exception 'Invalid peer'; end if;

  select c.id into existing_id
  from public.conversations c
  where c.kind = 'direct'
    and (select count(*)::int from public.conversation_members m where m.conversation_id = c.id) = 2
    and exists (select 1 from public.conversation_members m where m.conversation_id = c.id and m.user_id = me)
    and exists (select 1 from public.conversation_members m where m.conversation_id = c.id and m.user_id = other_user_id)
  limit 1;

  if existing_id is not null then
    return existing_id;
  end if;

  insert into public.conversations (kind, created_by)
  values ('direct', me)
  returning id into new_id;

  insert into public.conversation_members (conversation_id, user_id)
  values (new_id, me), (new_id, other_user_id);

  return new_id;
end;
$$;

grant execute on function public.create_or_get_direct_chat(uuid) to authenticated;

create or replace function public.create_group_chat(group_title text, member_ids uuid[])
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  new_id uuid;
  uid uuid;
begin
  if me is null then raise exception 'Not authenticated'; end if;
  if coalesce(trim(group_title), '') = '' then raise exception 'Title required'; end if;

  insert into public.conversations (kind, title, created_by)
  values ('group', trim(group_title), me)
  returning id into new_id;

  insert into public.conversation_members (conversation_id, user_id)
  values (new_id, me);

  foreach uid in array coalesce(member_ids, array[]::uuid[])
  loop
    if uid is not null and uid <> me then
      insert into public.conversation_members (conversation_id, user_id)
      values (new_id, uid)
      on conflict do nothing;
    end if;
  end loop;

  return new_id;
end;
$$;

grant execute on function public.create_group_chat(text, uuid[]) to authenticated;

-- ── Auth → profile ─────────────────────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, coalesce(new.email, ''))
  on conflict (id) do update
    set email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── Profile → default channel membership ───────────────────────────────────
create or replace function public.after_profile_created_add_to_default_channel()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  ch_id uuid;
begin
  select id into ch_id from public.conversations
  where kind = 'channel' and title = 'Design Syndicate'
  limit 1;
  if ch_id is not null then
    insert into public.conversation_members (conversation_id, user_id)
    values (ch_id, new.id)
    on conflict do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists profile_default_channel on public.profiles;
create trigger profile_default_channel
  after insert on public.profiles
  for each row execute function public.after_profile_created_add_to_default_channel();

-- ── Storage (avatars) ─────────────────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
)
on conflict (id) do nothing;

create policy "Public read avatars"
  on storage.objects for select
  to public
  using (bucket_id = 'avatars');

create policy "Users upload own avatars"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and split_part(name, '/', 1) = auth.uid()::text
  );

create policy "Users update own avatars"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and split_part(name, '/', 1) = auth.uid()::text
  )
  with check (
    bucket_id = 'avatars'
    and split_part(name, '/', 1) = auth.uid()::text
  );

create policy "Users delete own avatars"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and split_part(name, '/', 1) = auth.uid()::text
  );

-- ── Storage (chat attachments) ─────────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'chat-attachments',
  'chat-attachments',
  true,
  10485760,
  null
)
on conflict (id) do nothing;

create policy "Public read chat attachments"
  on storage.objects for select
  to public
  using (bucket_id = 'chat-attachments');

create policy "Users upload chat attachments own prefix"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'chat-attachments'
    and split_part(name, '/', 1) = auth.uid()::text
  );

create policy "Users update own chat attachments"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'chat-attachments'
    and split_part(name, '/', 1) = auth.uid()::text
  )
  with check (
    bucket_id = 'chat-attachments'
    and split_part(name, '/', 1) = auth.uid()::text
  );

create policy "Users delete own chat attachments"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'chat-attachments'
    and split_part(name, '/', 1) = auth.uid()::text
  );

-- ── Realtime publication ───────────────────────────────────────────────────
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.message_reactions;

-- Dashboard → Replication: ensure `messages` is enabled for Realtime.
