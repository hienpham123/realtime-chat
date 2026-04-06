-- Message edit / soft-delete, reactions, leave conversation, unread excludes deleted.

-- 1) Messages: edit + soft delete
alter table public.messages
  add column if not exists edited_at timestamptz,
  add column if not exists deleted_at timestamptz;

alter table public.messages drop constraint if exists messages_content_or_attachments_check;

alter table public.messages add constraint messages_content_or_attachments_check check (
  deleted_at is not null
  or length(trim(coalesce(content, ''))) > 0
  or coalesce(jsonb_array_length(attachments), 0) > 0
);

-- 2) Reactions
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

-- 3) Messages: update own (edit + soft delete)
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

-- 4) Leave conversation (remove self from members)
create policy "conversation_members_delete_own"
  on public.conversation_members for delete to authenticated
  using (user_id = auth.uid());

-- 5) Unread + mark read ignore deleted messages
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

-- 6) Realtime for reactions
alter publication supabase_realtime add table public.message_reactions;
