import type { RealtimeChannel } from '@supabase/supabase-js';
import { getSupabaseClient, syncRealtimeAuth } from '@/lib/supabase-client';
import type { ChatMessage, MessageAttachment, MessageRow } from '@/types';
import { resolveDisplayName } from '@/utils/display-name';

const MESSAGE_PAGE_SIZE = 20;

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null;

export const parseAttachments = (raw: unknown): MessageAttachment[] => {
  if (!Array.isArray(raw)) {
    return [];
  }
  const out: MessageAttachment[] = [];
  for (const item of raw) {
    if (!isRecord(item)) {
      continue;
    }
    const url = typeof item.url === 'string' ? item.url : '';
    const path = typeof item.path === 'string' ? item.path : '';
    const name = typeof item.name === 'string' ? item.name : 'file';
    const mimeType =
      typeof item.mimeType === 'string' ? item.mimeType : 'application/octet-stream';
    const kind =
      item.kind === 'image' || item.kind === 'file' ? item.kind : 'file';
    const size = typeof item.size === 'number' ? item.size : undefined;
    if (!url || !path) {
      continue;
    }
    out.push({ url, path, kind, name, mimeType, size });
  }
  return out;
};

const mapRowToChatMessage = (row: MessageRow): ChatMessage => {
  const profile = Array.isArray(row.profiles)
    ? row.profiles[0]
    : row.profiles;
  const email = profile?.email ?? 'Unknown';
  const avatar = profile?.avatar_url?.trim() || null;
  return {
    id: row.id,
    content: row.content,
    user_id: row.user_id,
    created_at: row.created_at,
    userEmail: email,
    userDisplayName: resolveDisplayName(email, profile?.display_name),
    userAvatarUrl: avatar,
    attachments: parseAttachments(row.attachments),
  };
};

const messageSelect = `
  id,
  content,
  user_id,
  conversation_id,
  created_at,
  attachments,
  profiles ( email, display_name, avatar_url )
`;

export const fetchMessagesPage = async (
  conversationId: string,
  beforeCreatedAt?: string,
): Promise<{ messages: ChatMessage[]; hasMore: boolean; error: string | null }> => {
  try {
    const supabase = getSupabaseClient();
    let query = supabase
      .from('messages')
      .select(messageSelect)
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(MESSAGE_PAGE_SIZE + 1);

    if (beforeCreatedAt) {
      query = query.lt('created_at', beforeCreatedAt);
    }

    const { data, error } = await query;

    if (error) {
      return { messages: [], hasMore: false, error: error.message };
    }

    const rows = (data ?? []) as MessageRow[];
    const hasMore = rows.length > MESSAGE_PAGE_SIZE;
    const slice = hasMore ? rows.slice(0, MESSAGE_PAGE_SIZE) : rows;
    const messages = slice.map(mapRowToChatMessage).reverse();

    return { messages, hasMore, error: null };
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to load messages';
    return { messages: [], hasMore: false, error: message };
  }
};

export const fetchMessageById = async (
  id: string,
): Promise<{ message: ChatMessage | null; error: string | null }> => {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('messages')
      .select(messageSelect)
      .eq('id', id)
      .maybeSingle();

    if (error) {
      return { message: null, error: error.message };
    }
    if (!data) {
      return { message: null, error: null };
    }
    return { message: mapRowToChatMessage(data as MessageRow), error: null };
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to load message';
    return { message: null, error: message };
  }
};

export const insertMessage = async (
  conversationId: string,
  content: string,
  attachments: MessageAttachment[] = [],
): Promise<{ message: ChatMessage | null; error: string | null }> => {
  try {
    await syncRealtimeAuth();
    const supabase = getSupabaseClient();
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      return { message: null, error: userError?.message ?? 'Not authenticated' };
    }

    const trimmed = content.trim();
    if (!trimmed && attachments.length === 0) {
      return { message: null, error: 'Message cannot be empty' };
    }

    const { data, error } = await supabase
      .from('messages')
      .insert({
        content: trimmed,
        user_id: userData.user.id,
        conversation_id: conversationId,
        attachments,
      })
      .select(messageSelect)
      .single();

    if (error) {
      return { message: null, error: error.message };
    }
    if (!data) {
      return { message: null, error: 'No row returned' };
    }
    return { message: mapRowToChatMessage(data as MessageRow), error: null };
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to send message';
    return { message: null, error: message };
  }
};

type InsertPayload = { new: Record<string, unknown> };

type InsertRow = {
  id?: string;
  content?: string;
  user_id?: string;
  conversation_id?: string;
  created_at?: string;
  attachments?: unknown;
};

const mapInsertPayloadToMessage = (raw: InsertRow): ChatMessage | null => {
  if (!raw.id || !raw.user_id || !raw.created_at) {
    return null;
  }
  const content = typeof raw.content === 'string' ? raw.content : '';
  const attachments = parseAttachments(raw.attachments);
  if (!content.trim() && attachments.length === 0) {
    return null;
  }
  return {
    id: raw.id,
    content,
    user_id: raw.user_id,
    created_at: raw.created_at,
    userEmail: 'Unknown',
    userDisplayName: 'Unknown',
    userAvatarUrl: null,
    attachments,
  };
};

const normalizeUuid = (value: unknown): string =>
  String(value ?? '')
    .replace(/-/g, '')
    .toLowerCase();

export const subscribeToMessageInsertsForActiveConversation = (
  getActiveConversationId: () => string | null,
  onInsert: (message: ChatMessage) => void,
): { unsubscribe: () => void } => {
  const supabase = getSupabaseClient();
  let channel: RealtimeChannel | null = null;
  let cancelled = false;
  const channelName = 'messages:all-visible';

  const handler = (payload: InsertPayload) => {
    const active = getActiveConversationId();
    if (!active) {
      return;
    }
    const raw = payload.new as InsertRow;
    if (normalizeUuid(raw.conversation_id) !== normalizeUuid(active)) {
      return;
    }
    const quick = mapInsertPayloadToMessage(raw);
    if (quick) {
      onInsert(quick);
    }
    if (!raw?.id) {
      return;
    }
    const messageId = raw.id;
    void (async () => {
      if (!messageId) {
        return;
      }
      const { message, error } = await fetchMessageById(messageId);
      if (!error && message) {
        onInsert(message);
      }
    })();
  };

  void (async () => {
    await syncRealtimeAuth();
    if (cancelled) {
      return;
    }
    const ch = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        (p) => handler(p as InsertPayload),
      )
      .subscribe((status) => {
        if (!cancelled && (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT')) {
          void syncRealtimeAuth();
        }
      });

    if (cancelled) {
      void supabase.removeChannel(ch);
      return;
    }
    channel = ch;
  })();

  return {
    unsubscribe: () => {
      cancelled = true;
      if (channel) {
        void supabase.removeChannel(channel);
        channel = null;
      }
    },
  };
};
