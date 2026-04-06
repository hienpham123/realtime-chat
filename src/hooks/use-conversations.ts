import { useCallback, useEffect, useMemo, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabase-client';
import {
  createGroupChat,
  createOrGetDirectChat,
  fetchMyConversations,
} from '@/services/conversation-service';
import { fetchProfilesExceptSelf } from '@/services/profile-service';
import type { ConversationSummary, PublicProfile } from '@/types';

export const useConversations = (enabled: boolean, currentUserId: string) => {
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
        () => {
          void loadConversations(true);
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [enabled, currentUserId, loadConversations]);

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

  const state = useMemo(
    () => ({
      conversations,
      profiles,
      loading,
      profilesLoading,
      error,
      reload: () => void loadConversations(false),
      reloadQuiet: () => void loadConversations(true),
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
