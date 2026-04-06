-- Fix: "infinite recursion detected in policy for relation conversation_members"
-- Policies must not SELECT the same table they protect. Use a SECURITY DEFINER helper
-- (runs as owner, bypasses RLS inside the function).
-- Run once in Supabase SQL Editor after migration-002.

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

drop policy if exists "conversations_select_member" on public.conversations;
create policy "conversations_select_member"
  on public.conversations for select to authenticated
  using (public.user_is_conversation_member(id));

drop policy if exists "conversation_members_select_member" on public.conversation_members;
create policy "conversation_members_select_member"
  on public.conversation_members for select to authenticated
  using (public.user_is_conversation_member(conversation_id));

drop policy if exists "messages_select_conversation_member" on public.messages;
create policy "messages_select_conversation_member"
  on public.messages for select to authenticated
  using (public.user_is_conversation_member(conversation_id));

drop policy if exists "messages_insert_conversation_member" on public.messages;
create policy "messages_insert_conversation_member"
  on public.messages for insert to authenticated
  with check (
    user_id = auth.uid()
    and public.user_is_conversation_member(conversation_id)
  );
