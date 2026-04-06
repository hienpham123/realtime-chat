-- Message attachments (images/files) + Storage bucket for chat uploads.
-- Run after migration-004 in Supabase SQL Editor.

alter table public.messages
  add column if not exists attachments jsonb not null default '[]'::jsonb;

comment on column public.messages.attachments is
  'Array of { url, path, kind, name, mimeType, size? } for uploaded files';

update public.messages
set content = '(message)'
where length(trim(coalesce(content, ''))) = 0;

alter table public.messages
  drop constraint if exists messages_content_or_attachments_check;

alter table public.messages
  add constraint messages_content_or_attachments_check
  check (
    length(trim(coalesce(content, ''))) > 0
    or coalesce(jsonb_array_length(attachments), 0) > 0
  );

-- Public bucket: paths are unguessable UUIDs; members only see URLs from messages they can read.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'chat-attachments',
  'chat-attachments',
  true,
  10485760,
  null
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public read chat attachments" on storage.objects;
create policy "Public read chat attachments"
  on storage.objects for select
  to public
  using (bucket_id = 'chat-attachments');

drop policy if exists "Users upload chat attachments own prefix" on storage.objects;
create policy "Users upload chat attachments own prefix"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'chat-attachments'
    and split_part(name, '/', 1) = auth.uid()::text
  );

drop policy if exists "Users update own chat attachments" on storage.objects;
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

drop policy if exists "Users delete own chat attachments" on storage.objects;
create policy "Users delete own chat attachments"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'chat-attachments'
    and split_part(name, '/', 1) = auth.uid()::text
  );
