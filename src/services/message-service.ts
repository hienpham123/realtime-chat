import type { RealtimeChannel } from '@supabase/supabase-js';
import { getSupabaseClient, syncRealtimeAuth } from '@/lib/supabase-client';
import type {
  ChatMessage,
  MessageAttachment,
  MessageReactionChip,
  MessageReactionDbRow,
  MessageRow,
} from '@/types';
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

const aggregateReactions = (
  rows: MessageReactionDbRow[] | null | undefined,
): MessageReactionChip[] => {
  if (!rows?.length) {
    return [];
  }
  const byEmoji = new Map<string, string[]>();
  for (const r of rows) {
    const list = byEmoji.get(r.emoji) ?? [];
    list.push(r.user_id);
    byEmoji.set(r.emoji, list);
  }
  return [...byEmoji.entries()].map(([emoji, userIds]) => ({ emoji, userIds }));
};

const mapRowToChatMessage = (row: MessageRow): ChatMessage => {
  const profile = Array.isArray(row.profiles)
    ? row.profiles[0]
    : row.profiles;
  const email = profile?.email ?? 'Unknown';
  const avatar = profile?.avatar_url?.trim() || null;
  const reactionRows = Array.isArray(row.message_reactions)
    ? row.message_reactions
    : [];
  return {
    id: row.id,
    conversationId: row.conversation_id,
    content: row.content,
    user_id: row.user_id,
    created_at: row.created_at,
    edited_at: row.edited_at ?? null,
    deleted_at: row.deleted_at ?? null,
    userEmail: email,
    userDisplayName: resolveDisplayName(email, profile?.display_name),
    userAvatarUrl: avatar,
    attachments: parseAttachments(row.attachments),
    reactions: aggregateReactions(reactionRows),
  };
};

export const messageSelect = `
  id,
  content,
  user_id,
  conversation_id,
  created_at,
  edited_at,
  deleted_at,
  attachments,
  profiles ( email, display_name, avatar_url ),
  message_reactions ( emoji, user_id )
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

export const updateMessageContent = async (
  messageId: string,
  content: string,
): Promise<{ message: ChatMessage | null; error: string | null }> => {
  try {
    await syncRealtimeAuth();
    const supabase = getSupabaseClient();
    const trimmed = content.trim();
    if (!trimmed) {
      return { message: null, error: 'Message cannot be empty' };
    }
    const { data, error } = await supabase
      .from('messages')
      .update({
        content: trimmed,
        edited_at: new Date().toISOString(),
      })
      .eq('id', messageId)
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
    const message = e instanceof Error ? e.message : 'Failed to update message';
    return { message: null, error: message };
  }
};

export const softDeleteMessage = async (
  messageId: string,
): Promise<{ message: ChatMessage | null; error: string | null }> => {
  try {
    await syncRealtimeAuth();
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('messages')
      .update({
        deleted_at: new Date().toISOString(),
        content: '',
        attachments: [],
      })
      .eq('id', messageId)
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
    const message = e instanceof Error ? e.message : 'Failed to delete message';
    return { message: null, error: message };
  }
};

export const toggleMessageReaction = async (
  messageId: string,
  emoji: string,
): Promise<{ message: ChatMessage | null; error: string | null }> => {
  try {
    await syncRealtimeAuth();
    const supabase = getSupabaseClient();
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      return { message: null, error: userError?.message ?? 'Not authenticated' };
    }
    const userId = userData.user.id;
    const { data: existing, error: findErr } = await supabase
      .from('message_reactions')
      .select('id')
      .eq('message_id', messageId)
      .eq('user_id', userId)
      .eq('emoji', emoji)
      .maybeSingle();

    if (findErr) {
      return { message: null, error: findErr.message };
    }

    if (existing?.id) {
      const { error: delErr } = await supabase
        .from('message_reactions')
        .delete()
        .eq('id', existing.id);
      if (delErr) {
        return { message: null, error: delErr.message };
      }
    } else {
      const { error: insErr } = await supabase.from('message_reactions').insert({
        message_id: messageId,
        user_id: userId,
        emoji,
      });
      if (insErr) {
        return { message: null, error: insErr.message };
      }
    }

    return fetchMessageById(messageId);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to update reaction';
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
  deleted_at?: string | null;
};

const mapInsertPayloadToMessage = (raw: InsertRow): ChatMessage | null => {
  if (!raw.id || !raw.user_id || !raw.created_at) {
    return null;
  }
  if (raw.deleted_at) {
    return null;
  }
  const content = typeof raw.content === 'string' ? raw.content : '';
  const attachments = parseAttachments(raw.attachments);
  if (!content.trim() && attachments.length === 0) {
    return null;
  }
  const cid =
    typeof raw.conversation_id === 'string' ? raw.conversation_id : '';
  return {
    id: raw.id,
    conversationId: cid,
    content,
    user_id: raw.user_id,
    created_at: raw.created_at,
    edited_at: null,
    deleted_at: null,
    userEmail: 'Unknown',
    userDisplayName: 'Unknown',
    userAvatarUrl: null,
    attachments,
    reactions: [],
  };
};

const normalizeUuid = (value: unknown): string =>
  String(value ?? '')
    .replace(/-/g, '')
    .toLowerCase();

type ReactionPayload = {
  message_id?: string;
};

export const subscribeToMessageInsertsForActiveConversation = (
  getActiveConversationId: () => string | null,
  onUpsert: (message: ChatMessage) => void,
): { unsubscribe: () => void } => {
  const supabase = getSupabaseClient();
  let channel: RealtimeChannel | null = null;
  let cancelled = false;
  const channelName = 'messages:conversation-realtime';

  const isActiveConversation = (conversationId: unknown): boolean => {
    const active = getActiveConversationId();
    if (!active) {
      return false;
    }
    return normalizeUuid(conversationId) === normalizeUuid(active);
  };

  const refreshMessage = (messageId: unknown) => {
    if (typeof messageId !== 'string' || !messageId) {
      return;
    }
    void (async () => {
      const { message, error } = await fetchMessageById(messageId);
      if (error || !message) {
        return;
      }
      if (!isActiveConversation(message.conversationId)) {
        return;
      }
      onUpsert(message);
    })();
  };

  const onMessageInsert = (payload: InsertPayload) => {
    if (!isActiveConversation(payload.new?.conversation_id)) {
      return;
    }
    const raw = payload.new as InsertRow;
    const quick = mapInsertPayloadToMessage(raw);
    if (quick) {
      onUpsert(quick);
    }
    if (!raw?.id) {
      return;
    }
    refreshMessage(raw.id);
  };

  const onMessageUpdate = (payload: InsertPayload) => {
    if (!isActiveConversation(payload.new?.conversation_id)) {
      return;
    }
    const id = payload.new?.id;
    refreshMessage(id);
  };

  const onReactionChange = (payload: { new: unknown; old: unknown }) => {
    const n = payload.new as ReactionPayload | null;
    const o = payload.old as ReactionPayload | null;
    const messageId = n?.message_id ?? o?.message_id;
    refreshMessage(messageId);
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
        (p) => onMessageInsert(p as InsertPayload),
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
        },
        (p) => onMessageUpdate(p as InsertPayload),
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'message_reactions',
        },
        (p) => onReactionChange(p as { new: unknown; old: unknown }),
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'message_reactions',
        },
        (p) => onReactionChange(p as { new: unknown; old: unknown }),
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
