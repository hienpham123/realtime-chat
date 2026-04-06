-- Track last message time per conversation for sidebar ordering and timestamps.

alter table public.conversations
  add column if not exists last_activity_at timestamptz not null default now();

update public.conversations c
set last_activity_at = coalesce(
  (
    select max(m.created_at)
    from public.messages m
    where m.conversation_id = c.id
  ),
  c.created_at
);

create or replace function public.touch_conversation_last_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.conversations
  set last_activity_at = new.created_at
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
