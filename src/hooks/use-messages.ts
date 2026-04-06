import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getSupabaseClient, syncRealtimeAuth } from '@/lib/supabase-client';
import { uploadChatAttachment } from '@/services/chat-attachment-service';
import {
  fetchMessagesPage,
  insertMessage,
  subscribeToMessageInsertsForActiveConversation,
} from '@/services/message-service';
import type { MessageAttachment } from '@/types';
import type { ChatMessage } from '@/types';

const sortAscending = (items: ChatMessage[]): ChatMessage[] =>
  [...items].sort(
    (a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );

export const useMessages = (enabled: boolean, conversationId: string | null) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [initialLoading, setInitialLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const idsRef = useRef<Set<string>>(new Set());
  const conversationIdRef = useRef(conversationId);
  conversationIdRef.current = conversationId;

  const mergeIds = useCallback((items: ChatMessage[]) => {
    const next = new Set(idsRef.current);
    items.forEach((m) => next.add(m.id));
    idsRef.current = next;
  }, []);

  const loadInitial = useCallback(async () => {
    if (!enabled || !conversationId) {
      return;
    }
    setInitialLoading(true);
    setError(null);
    const { messages: page, hasMore: more, error: err } =
      await fetchMessagesPage(conversationId);
    if (err) {
      setError(err);
      setMessages([]);
      idsRef.current = new Set();
      setHasMore(false);
    } else {
      idsRef.current = new Set(page.map((m) => m.id));
      setMessages(sortAscending(page));
      setHasMore(more);
    }
    setInitialLoading(false);
  }, [enabled, conversationId]);

  useEffect(() => {
    if (!enabled || !conversationId) {
      setMessages([]);
      idsRef.current = new Set();
      setHasMore(false);
      setError(null);
      setInitialLoading(false);
      return;
    }
    setMessages([]);
    idsRef.current = new Set();
    void loadInitial();
  }, [enabled, conversationId, loadInitial]);

  const loadOlder = useCallback(async () => {
    if (
      !enabled ||
      !conversationId ||
      loadingMore ||
      !hasMore ||
      messages.length === 0
    ) {
      return;
    }
    const oldest = messages[0];
    if (!oldest) {
      return;
    }
    setLoadingMore(true);
    setError(null);
    const { messages: older, hasMore: more, error: err } =
      await fetchMessagesPage(conversationId, oldest.created_at);
    if (err) {
      setError(err);
    } else {
      const deduped = older.filter((m) => !idsRef.current.has(m.id));
      mergeIds(deduped);
      setMessages((prev) => sortAscending([...deduped, ...prev]));
      setHasMore(more);
    }
    setLoadingMore(false);
  }, [
    enabled,
    conversationId,
    hasMore,
    loadingMore,
    mergeIds,
    messages,
  ]);

  const upsertMessage = useCallback((msg: ChatMessage) => {
    setMessages((prev) => {
      const byId = new Map(prev.map((m) => [m.id, m]));
      byId.set(msg.id, msg);
      idsRef.current = new Set(byId.keys());
      return sortAscending([...byId.values()]);
    });
  }, []);

  const handlerRef = useRef(upsertMessage);
  handlerRef.current = upsertMessage;

  useEffect(() => {
    if (!enabled) {
      return;
    }
    const { unsubscribe } = subscribeToMessageInsertsForActiveConversation(
      () => conversationIdRef.current,
      (msg) => handlerRef.current(msg),
    );
    return unsubscribe;
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      return;
    }
    const supabase = getSupabaseClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void syncRealtimeAuth();
    });
    return () => subscription.unsubscribe();
  }, [enabled]);

  const send = useCallback(
    async (
      text: string,
      files: File[] = [],
    ): Promise<{ error: string | null }> => {
      if (!conversationId) {
        return { error: 'No conversation selected' };
      }
      const trimmed = text.trim();
      if (!trimmed && files.length === 0) {
        return { error: 'Message cannot be empty' };
      }
      const attachments: MessageAttachment[] = [];
      for (const file of files) {
        const { attachment, error: upErr } = await uploadChatAttachment(
          conversationId,
          file,
        );
        if (upErr || !attachment) {
          const msg = upErr ?? 'Upload failed';
          setError(msg);
          return { error: msg };
        }
        attachments.push(attachment);
      }
      const { message, error: err } = await insertMessage(
        conversationId,
        trimmed,
        attachments,
      );
      if (err) {
        setError(err);
        return { error: err };
      }
      if (message) {
        upsertMessage(message);
      }
      return { error: null };
    },
    [conversationId, upsertMessage],
  );

  const state = useMemo(
    () => ({
      messages,
      initialLoading,
      loadingMore,
      error,
      hasMore,
      loadOlder,
      send,
      reload: loadInitial,
    }),
    [
      messages,
      initialLoading,
      loadingMore,
      error,
      hasMore,
      loadOlder,
      send,
      loadInitial,
    ],
  );

  return state;
};
