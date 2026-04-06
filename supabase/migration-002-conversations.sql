-- Run in Supabase SQL Editor after the initial schema.
-- Adds conversations, DMs, groups, and wires messages to a conversation.

-- 1) Types & tables
do $$ begin
  create type public.conversation_kind as enum ('channel', 'direct', 'group');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  kind public.conversation_kind not null,
  title text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.conversation_members (
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

create index if not exists conversation_members_user_id_idx
  on public.conversation_members (user_id);

-- 2) Messages: add conversation
alter table public.messages
  add column if not exists conversation_id uuid references public.conversations (id) on delete cascade;

-- 3) Seed default team channel (one row)
do $$
declare
  ch_id uuid;
begin
  select id into ch_id from public.conversations
  where kind = 'channel' and title = 'Design Syndicate' limit 1;
  if ch_id is null then
    insert into public.conversations (kind, title) values ('channel', 'Design Syndicate');
  end if;
end $$;

-- 4) Backfill: every profile joins default channel; orphan messages attach to it
do $$
declare
  ch_id uuid;
begin
  select id into ch_id from public.conversations
  where kind = 'channel' and title = 'Design Syndicate' limit 1;

  insert into public.conversation_members (conversation_id, user_id)
  select ch_id, p.id from public.profiles p
  where not exists (
    select 1 from public.conversation_members m
    where m.conversation_id = ch_id and m.user_id = p.id
  );

  update public.messages set conversation_id = ch_id where conversation_id is null;
end $$;

alter table public.messages alter column conversation_id set not null;

create index if not exists messages_conversation_created_idx
  on public.messages (conversation_id, created_at desc);

-- 5) RLS (helper avoids self-referential policies on conversation_members)
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

drop policy if exists "conversations_select_member" on public.conversations;
create policy "conversations_select_member"
  on public.conversations for select to authenticated
  using (public.user_is_conversation_member(id));

drop policy if exists "conversations_insert_own" on public.conversations;
create policy "conversations_insert_own"
  on public.conversations for insert to authenticated
  with check (created_by = auth.uid());

drop policy if exists "conversation_members_select_member" on public.conversation_members;
create policy "conversation_members_select_member"
  on public.conversation_members for select to authenticated
  using (public.user_is_conversation_member(conversation_id));

drop policy if exists "conversation_members_insert" on public.conversation_members;
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

-- Messages: replace policies
drop policy if exists "messages_select_authenticated" on public.messages;
drop policy if exists "messages_insert_authenticated_self" on public.messages;

create policy "messages_select_conversation_member"
  on public.messages for select to authenticated
  using (public.user_is_conversation_member(conversation_id));

create policy "messages_insert_conversation_member"
  on public.messages for insert to authenticated
  with check (
    user_id = auth.uid()
    and public.user_is_conversation_member(conversation_id)
  );

-- 6) RPC: direct chat
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
  if me is null then
    raise exception 'Not authenticated';
  end if;
  if other_user_id = me then
    raise exception 'Invalid peer';
  end if;

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

-- 7) RPC: group
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
  if me is null then
    raise exception 'Not authenticated';
  end if;
  if coalesce(trim(group_title), '') = '' then
    raise exception 'Title required';
  end if;

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

-- 8) New profiles join default channel
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
