-- Allow any MIME type for chat-attachments uploads (browsers often send
-- application/octet-stream or empty types for local files).
-- Run in Supabase SQL Editor if you already applied migration-005.

update storage.buckets
set allowed_mime_types = null
where id = 'chat-attachments';
