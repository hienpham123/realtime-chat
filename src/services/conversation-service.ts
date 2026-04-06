import { getSupabaseClient } from '@/lib/supabase-client';
import type {
  ConversationKind,
  ConversationMemberPreview,
  ConversationSummary,
} from '@/types';
import { resolveDisplayName } from '@/utils/display-name';

type ProfileEmbed = {
  email: string;
  display_name?: string | null;
  avatar_url?: string | null;
};

type MemberRow = {
  user_id: string;
  profiles: ProfileEmbed | ProfileEmbed[] | null;
};

type ConversationRow = {
  id: string;
  kind: ConversationKind;
  title: string | null;
  created_at: string;
  last_activity_at?: string | null;
  last_message_preview?: string | null;
  conversation_members: MemberRow[] | null;
};

type UnreadCountRow = {
  conversation_id: string;
  unread_count: number | string;
};

const memberProfile = (row: MemberRow): ProfileEmbed | null => {
  const p = row.profiles;
  if (Array.isArray(p)) {
    return p[0] ?? null;
  }
  return p;
};

const mapToSummary = (
  row: ConversationRow,
  currentUserId: string,
): ConversationSummary => {
  const members: ConversationMemberPreview[] = (row.conversation_members ?? []).map(
    (m) => {
      const prof = memberProfile(m);
      const email = prof?.email ?? 'Unknown';
      return {
        userId: m.user_id,
        email,
        displayName: resolveDisplayName(email, prof?.display_name),
        avatarUrl: prof?.avatar_url?.trim() || null,
      };
    },
  );

  let displayLabel = row.title?.trim() ?? '';
  if (row.kind === 'direct') {
    const other = members.find((m) => m.userId !== currentUserId);
    displayLabel = other ? other.displayName : 'Direct message';
  }
  if (!displayLabel) {
    displayLabel =
      row.kind === 'channel' ? 'Channel' : row.kind === 'group' ? 'Group' : 'Chat';
  }

  return {
    id: row.id,
    kind: row.kind,
    title: row.title,
    created_at: row.created_at,
    last_activity_at: row.last_activity_at ?? row.created_at,
    last_message_preview: row.last_message_preview?.trim() || null,
    unread_count: 0,
    displayLabel,
    members,
  };
};

export const fetchMyConversations = async (
  currentUserId: string,
): Promise<{ conversations: ConversationSummary[]; error: string | null }> => {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('conversations')
      .select(
        `
        id,
        kind,
        title,
        created_at,
        last_activity_at,
        last_message_preview,
        conversation_members (
          user_id,
          profiles ( email, display_name, avatar_url )
        )
      `,
      )
      .order('last_activity_at', { ascending: false });

    if (error) {
      return { conversations: [], error: error.message };
    }

    const rows = (data ?? []) as ConversationRow[];
    const summaries = rows.map((r) => mapToSummary(r, currentUserId));

    const { data: unreadRows, error: unreadErr } = await supabase.rpc(
      'my_conversation_unread_counts',
    );

    const unreadMap = new Map<string, number>();
    if (!unreadErr && Array.isArray(unreadRows)) {
      for (const raw of unreadRows as UnreadCountRow[]) {
        if (raw?.conversation_id) {
          const n = Number(raw.unread_count);
          unreadMap.set(raw.conversation_id, Number.isFinite(n) ? n : 0);
        }
      }
    }

    const conversations = summaries.map((s) => ({
      ...s,
      unread_count: unreadMap.get(s.id) ?? 0,
    }));

    return { conversations, error: null };
  } catch (e) {
    const message =
      e instanceof Error ? e.message : 'Failed to load conversations';
    return { conversations: [], error: message };
  }
};

export const markConversationRead = async (
  conversationId: string,
): Promise<{ error: string | null }> => {
  try {
    const supabase = getSupabaseClient();
    const { error } = await supabase.rpc('mark_conversation_read', {
      p_conversation_id: conversationId,
    });
    return { error: error?.message ?? null };
  } catch (e) {
    const message =
      e instanceof Error ? e.message : 'Failed to mark conversation read';
    return { error: message };
  }
};

export const createOrGetDirectChat = async (
  otherUserId: string,
): Promise<{ conversationId: string | null; error: string | null }> => {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.rpc('create_or_get_direct_chat', {
      other_user_id: otherUserId,
    });

    if (error) {
      return { conversationId: null, error: error.message };
    }
    if (typeof data !== 'string' || !data) {
      return { conversationId: null, error: 'Unexpected response' };
    }
    return { conversationId: data, error: null };
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to open chat';
    return { conversationId: null, error: message };
  }
};

export const leaveConversation = async (
  conversationId: string,
): Promise<{ error: string | null }> => {
  try {
    const supabase = getSupabaseClient();
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      return { error: userError?.message ?? 'Not authenticated' };
    }
    const { error } = await supabase
      .from('conversation_members')
      .delete()
      .eq('conversation_id', conversationId)
      .eq('user_id', userData.user.id);
    return { error: error?.message ?? null };
  } catch (e) {
    const message =
      e instanceof Error ? e.message : 'Failed to leave conversation';
    return { error: message };
  }
};

export const createGroupChat = async (
  title: string,
  memberUserIds: string[],
): Promise<{ conversationId: string | null; error: string | null }> => {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.rpc('create_group_chat', {
      group_title: title.trim(),
      member_ids: memberUserIds,
    });

    if (error) {
      return { conversationId: null, error: error.message };
    }
    if (typeof data !== 'string' || !data) {
      return { conversationId: null, error: 'Unexpected response' };
    }
    return { conversationId: data, error: null };
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to create group';
    return { conversationId: null, error: message };
  }
};
