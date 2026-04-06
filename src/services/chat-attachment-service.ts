import { getSupabaseClient } from '@/lib/supabase-client';
import type { MessageAttachment, MessageAttachmentKind } from '@/types';

const BUCKET = 'chat-attachments';

const sanitizeFileName = (name: string): string => {
  const base = name.replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 120);
  return base || 'file';
};

const kindFromMime = (mime: string): MessageAttachmentKind => {
  if (mime.startsWith('image/')) {
    return 'image';
  }
  return 'file';
};

export const uploadChatAttachment = async (
  conversationId: string,
  file: File,
): Promise<{ attachment: MessageAttachment | null; error: string | null }> => {
  try {
    const supabase = getSupabaseClient();
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      return { attachment: null, error: userError?.message ?? 'Not authenticated' };
    }
    const userId = userData.user.id;
    const safeName = sanitizeFileName(file.name);
    const path = `${userId}/${conversationId}/${crypto.randomUUID()}_${safeName}`;

    const contentType =
      file.type && file.type.length > 0
        ? file.type
        : 'application/octet-stream';

    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false,
        contentType,
      });

    if (upErr) {
      return { attachment: null, error: upErr.message };
    }

    const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
    const url = pub.publicUrl;
    const attachment: MessageAttachment = {
      url,
      path,
      kind: kindFromMime(file.type || ''),
      name: file.name,
      mimeType: contentType,
      size: file.size,
    };
    return { attachment, error: null };
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Upload failed';
    return { attachment: null, error: message };
  }
};
