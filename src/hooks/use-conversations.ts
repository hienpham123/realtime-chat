import { useCallback, useEffect, useMemo, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabase-client';
import {
  createGroupChat,
  createOrGetDirectChat,
  fetchMyConversations,
} from '@/services/conversation-service';
import { fetchProfilesExceptSelf } from '@/services/profile-service';
import type { ConversationSummary, PublicProfile } from '@/types';

export const useConversations = (
  enabled: boolean,
  currentUserId: string,
  selectedConversationId: string | null,
) => {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [profiles, setProfiles] = useState<PublicProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [profilesLoading, setProfilesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadConversations = useCallback(async (silent = false) => {
    if (!enabled || !currentUserId) {
      return;
    }
    if (!silent) {
      setLoading(true);
    }
    setError(null);
    const { conversations: list, error: err } =
      await fetchMyConversations(currentUserId);
    if (err) {
      setError(err);
      setConversations([]);
    } else {
      setConversations(list);
    }
    if (!silent) {
      setLoading(false);
    }
  }, [enabled, currentUserId]);

  const loadProfiles = useCallback(async () => {
    if (!enabled || !currentUserId) {
      return;
    }
    setProfilesLoading(true);
    const { profiles: list, error: err } =
      await fetchProfilesExceptSelf(currentUserId);
    if (err) {
      setError(err);
      setProfiles([]);
    } else {
      setProfiles(list);
    }
    setProfilesLoading(false);
  }, [enabled, currentUserId]);

  useEffect(() => {
    if (!enabled || !currentUserId) {
      setConversations([]);
      setProfiles([]);
      setError(null);
      return;
    }
    void loadConversations(false);
    void loadProfiles();
  }, [enabled, currentUserId, loadConversations, loadProfiles]);

  const updateUnreadFromIncomingMessage = useCallback(
    (payload: Record<string, unknown> | null | undefined) => {
      const newRow = payload?.new as Record<string, unknown> | undefined;
      if (!newRow) {
        return;
      }
      const conversationId =
        typeof newRow.conversation_id === 'string'
          ? newRow.conversation_id
          : '';
      if (!conversationId) {
        return;
      }
      const senderId =
        typeof newRow.user_id === 'string' ? newRow.user_id : '';
      const createdAt =
        typeof newRow.created_at === 'string'
          ? newRow.created_at
          : new Date().toISOString();
      const lastMessagePreview =
        typeof newRow.content === 'string' ? newRow.content.trim() : '';
      setConversations((prev) => {
        let changed = false;
        const next = prev
          .map((conv) => {
            if (conv.id !== conversationId) {
              return conv;
            }
            const isOwnMessage = senderId === currentUserId;
            const isActiveConversation =
              selectedConversationId !== null &&
              selectedConversationId === conversationId;
            const unreadCount =
              !isOwnMessage && !isActiveConversation
                ? conv.unread_count + 1
                : conv.unread_count;
            const updated: ConversationSummary = {
              ...conv,
              unread_count: unreadCount,
              last_activity_at: createdAt,
              last_message_preview:
                lastMessagePreview || conv.last_message_preview,
            };
            if (
              updated.unread_count === conv.unread_count &&
              updated.last_activity_at === conv.last_activity_at &&
              updated.last_message_preview === conv.last_message_preview
            ) {
              return conv;
            }
            changed = true;
            return updated;
          })
          .sort(
            (a, b) =>
              new Date(b.last_activity_at).getTime() -
              new Date(a.last_activity_at).getTime(),
          );
        return changed ? next : prev;
      });
    },
    [currentUserId, selectedConversationId],
  );

  useEffect(() => {
    if (!enabled || !currentUserId) {
      return;
    }
    const supabase = getSupabaseClient();
    const channel = supabase
      .channel('conversation-list-refresh')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          updateUnreadFromIncomingMessage(payload as Record<string, unknown>);
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [enabled, currentUserId, updateUnreadFromIncomingMessage]);

  const openDirectChat = useCallback(
    async (otherUserId: string) => {
      const { conversationId, error: err } =
        await createOrGetDirectChat(otherUserId);
      if (err || !conversationId) {
        setError(err ?? 'Could not open chat');
        return { conversationId: null as string | null, error: err };
      }
      await loadConversations();
      return { conversationId, error: null as string | null };
    },
    [loadConversations],
  );

  const openNewGroup = useCallback(
    async (title: string, memberUserIds: string[]) => {
      const { conversationId, error: err } = await createGroupChat(
        title,
        memberUserIds,
      );
      if (err || !conversationId) {
        setError(err ?? 'Could not create group');
        return { conversationId: null as string | null, error: err };
      }
      await loadConversations();
      return { conversationId, error: null as string | null };
    },
    [loadConversations],
  );

  const markConversationReadLocally = useCallback((conversationId: string) => {
    setConversations((prev) =>
      prev.map((conv) =>
        conv.id === conversationId
          ? { ...conv, unread_count: 0 }
          : conv,
      ),
    );
  }, []);

  const state = useMemo(
    () => ({
      conversations,
      profiles,
      loading,
      profilesLoading,
      error,
      reload: () => void loadConversations(false),
      reloadQuiet: () => void loadConversations(true),
      markConversationReadLocally,
      openDirectChat,
      openNewGroup,
    }),
    [
      conversations,
      profiles,
      loading,
      profilesLoading,
      error,
      loadConversations,
      openDirectChat,
      openNewGroup,
    ],
  );

  return state;
};
