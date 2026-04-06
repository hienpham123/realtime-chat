import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from 'react';
import type { ChatMessage } from '@/types';
import { MessageItem } from '@/components/chat/message-item/message-item';

export type MessageListHandle = {
  scrollToBottom: (behavior?: ScrollBehavior) => void;
  scrollToTop: (behavior?: ScrollBehavior) => void;
};

interface MessageListProps {
  messages: ChatMessage[];
  currentUserId: string;
  hasMore: boolean;
  loadingMore: boolean;
  onLoadOlder: () => void;
  onUpdateMessage?: (
    id: string,
    content: string,
  ) => Promise<{ error: string | null }>;
  onDeleteMessage?: (id: string) => Promise<{ error: string | null }>;
  onToggleReaction?: (
    id: string,
    emoji: string,
  ) => Promise<{ error: string | null }>;
}

export const MessageList = forwardRef<MessageListHandle, MessageListProps>(
  (
    {
      messages,
      currentUserId,
      hasMore,
      loadingMore,
      onLoadOlder,
      onUpdateMessage,
      onDeleteMessage,
      onToggleReaction,
    },
    ref,
  ) => {
    const bottomRef = useRef<HTMLDivElement | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const lastMessageIdRef = useRef<string | null>(null);

    useImperativeHandle(ref, () => ({
      scrollToBottom: (behavior = 'smooth') => {
        bottomRef.current?.scrollIntoView({ behavior, block: 'end' });
      },
      scrollToTop: (behavior = 'smooth') => {
        const el = containerRef.current;
        if (!el) {
          return;
        }
        el.scrollTo({ top: 0, behavior });
      },
    }));

    useEffect(() => {
      const last = messages[messages.length - 1];
      if (!last) {
        lastMessageIdRef.current = null;
        return;
      }
      const prevLastId = lastMessageIdRef.current;
      lastMessageIdRef.current = last.id;
      if (prevLastId === null) {
        bottomRef.current?.scrollIntoView({ block: 'end' });
        return;
      }
      if (prevLastId !== last.id) {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }
    }, [messages]);

    const onScroll = () => {
      const el = containerRef.current;
      if (!el || !hasMore || loadingMore) {
        return;
      }
      if (el.scrollTop < 80) {
        onLoadOlder();
      }
    };

    return (
      <div
        ref={containerRef}
        onScroll={onScroll}
        className="scrollbar-subtle flex flex-1 flex-col space-y-6 overflow-x-hidden overflow-y-auto bg-white px-4 py-4 sm:px-6 sm:py-5"
      >
        {hasMore ? (
          <div className="flex justify-center">
            <button
              type="button"
              onClick={onLoadOlder}
              disabled={loadingMore}
              className="text-xs font-semibold text-primary hover:text-primary-hover disabled:opacity-50"
            >
              {loadingMore ? 'Loading…' : 'Load older messages'}
            </button>
          </div>
        ) : null}
        {messages.map((m) => (
          <MessageItem
            key={m.id}
            message={m}
            isOwn={m.user_id === currentUserId}
            currentUserId={currentUserId}
            onUpdateMessage={onUpdateMessage}
            onDeleteMessage={onDeleteMessage}
            onToggleReaction={onToggleReaction}
          />
        ))}
        <div ref={bottomRef} className="h-2 shrink-0" aria-hidden />
      </div>
    );
  },
);

MessageList.displayName = 'MessageList';
