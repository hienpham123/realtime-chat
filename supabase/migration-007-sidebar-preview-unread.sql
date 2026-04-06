-- Sidebar: last message preview + per-member read state for unread badges.

alter table public.conversations
  add column if not exists last_message_preview text;

alter table public.conversation_members
  add column if not exists last_read_at timestamptz not null default now();

-- Backfill preview from latest message per conversation
with last_msg as (
  select distinct on (m.conversation_id)
    m.conversation_id,
    m.content,
    m.attachments
  from public.messages m
  order by m.conversation_id, m.created_at desc
)
update public.conversations c
set last_message_preview = left(
  coalesce(
    nullif(trim(lm.content), ''),
    case
      when lm.attachments is not null and jsonb_array_length(lm.attachments) > 0
      then '[Tệp đính kèm]'
      else null
    end
  ),
  200
)
from last_msg lm
where c.id = lm.conversation_id;

-- Existing members: treat as caught up (no mass unread)
update public.conversation_members cm
set last_read_at = greatest(
  cm.last_read_at,
  coalesce(
    (select max(m.created_at) from public.messages m where m.conversation_id = cm.conversation_id),
    cm.joined_at
  )
);

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
  where m.conversation_id = p_conversation_id;
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
  group by m.conversation_id;
$$;

revoke all on function public.my_conversation_unread_counts() from public;
grant execute on function public.my_conversation_unread_counts() to authenticated;
