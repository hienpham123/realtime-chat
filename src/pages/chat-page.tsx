import { Plus, PlusCircle, Smile, Paperclip, Send } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { ChatEmptyState } from '@/components/chat/chat-empty-state';
import { ChatHeader } from '@/components/chat/chat-header';
import { MessageListSkeleton } from '@/components/chat/message-list-skeleton/message-list-skeleton';
import { ChatLoading } from '@/components/chat/chat-loading';
import {
  ChatMobileNav,
  type ChatMobileNavTab,
} from '@/components/chat/chat-mobile-nav';
import { ChatNoticeBanner } from '@/components/chat/chat-notice-banner';
import { ChatRightPanel } from '@/components/chat/chat-right-panel';
import { ChatSidebar } from '@/components/chat/chat-sidebar';
import { TeamsAppRail } from '@/components/chat/teams-app-rail/teams-app-rail';
import { CreateGroupModal } from '@/components/chat/create-group-modal/create-group-modal';
import {
  MessageInput,
  type MessageInputHandle,
} from '@/components/chat/message-input/message-input';
import {
  MessageList,
  type MessageListHandle,
} from '@/components/chat/message-list/message-list';
import { useAuth } from '@/hooks/use-auth';
import { useConversations } from '@/hooks/use-conversations';
import { useDismissibleNotice } from '@/hooks/use-dismissible-notice';
import { useMyProfile } from '@/hooks/use-my-profile';
import { useMessages } from '@/hooks/use-messages';
import type { ConversationSummary } from '@/types';
import { signOut } from '@/services/auth-service';
import { markConversationRead } from '@/services/conversation-service';
import { buildConversationSharedSummary } from '@/utils/conversation-shared-summary';
import { resolveDisplayName } from '@/utils/display-name';

const subtitleForConversation = (c: ConversationSummary | undefined): string => {
  if (!c) {
    return 'Select a conversation';
  }
  if (c.kind === 'channel') {
    return 'Team channel';
  }
  if (c.kind === 'group') {
    const n = c.members.length;
    return `${n} member${n === 1 ? '' : 's'}`;
  }
  return 'Direct message';
};

export const ChatPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const enabled = Boolean(user);
  const userId = user?.id ?? '';

  const {
    conversations,
    profiles,
    loading: conversationsLoading,
    profilesLoading,
    error: conversationsError,
    openDirectChat,
    openNewGroup,
    reloadQuiet: reloadConversationsQuiet,
  } = useConversations(enabled, userId);

  const [selectedConversationId, setSelectedConversationId] = useState<
    string | null
  >(null);
  const [composerReady, setComposerReady] = useState(false);
  const [mobileTab, setMobileTab] = useState<ChatMobileNavTab>('messages');
  const [groupModalOpen, setGroupModalOpen] = useState(false);

  const { notice, showNotice, dismiss } = useDismissibleNotice();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const messageInputRef = useRef<MessageInputHandle>(null);
  const messageListRef = useRef<MessageListHandle>(null);

  const {
    messages,
    initialLoading: messagesLoading,
    loadingMore,
    error: messagesError,
    hasMore,
    loadOlder,
    send,
  } = useMessages(enabled && Boolean(selectedConversationId), selectedConversationId);

  const lastMessageId = messages[messages.length - 1]?.id;

  useEffect(() => {
    if (!enabled || !selectedConversationId || messagesLoading) {
      return;
    }

    const run = async () => {
      const { error } = await markConversationRead(selectedConversationId);
      if (!error) {
        void reloadConversationsQuiet();
      }
    };

    if (messages.length === 0) {
      void run();
      return;
    }
    if (!lastMessageId) {
      return;
    }
    void run();
  }, [
    enabled,
    selectedConversationId,
    messagesLoading,
    messages.length,
    lastMessageId,
    reloadConversationsQuiet,
  ]);

  const email = user?.email ?? '';
  const { profile: myProfile } = useMyProfile(userId);
  const displayName = email
    ? resolveDisplayName(email, myProfile?.display_name ?? null)
    : 'Member';
  const myAvatarUrl = myProfile?.avatar_url ?? null;

  useEffect(() => {
    if (conversations.length === 0) {
      return;
    }
    setSelectedConversationId((prev) => {
      if (prev && conversations.some((c) => c.id === prev)) {
        return prev;
      }
      const preferred =
        conversations.find(
          (c) =>
            c.kind === 'channel' &&
            (c.title ?? '').toLowerCase().includes('design'),
        ) ?? conversations[0];
      return preferred?.id ?? null;
    });
  }, [conversations]);

  const activeConversation = useMemo(
    () => conversations.find((c) => c.id === selectedConversationId),
    [conversations, selectedConversationId],
  );

  const handleSignOut = useCallback(async () => {
    const { error: err } = await signOut();
    if (!err) {
      navigate('/login', { replace: true });
    }
  }, [navigate]);

  const handleSend = useCallback(
    async (text: string, files: File[]) => {
      const result = await send(text, files);
      if (!result.error) {
        void reloadConversationsQuiet();
      }
      return result;
    },
    [send, reloadConversationsQuiet],
  );

  const sharedSummary = useMemo(
    () => buildConversationSharedSummary(messages),
    [messages],
  );

  const isEmptyLanding = messages.length === 0 && !composerReady;

  const handleJumpTo = useCallback(() => {
    if (isEmptyLanding) {
      searchInputRef.current?.focus();
      showNotice('Search this conversation from the bar above.');
      return;
    }
    messageInputRef.current?.focus();
    showNotice('Type a message in the composer below.');
  }, [isEmptyLanding, showNotice]);

  const handleRecent = useCallback(() => {
    if (messages.length === 0) {
      showNotice('No messages yet—say hello when you are ready.');
      return;
    }
    messageListRef.current?.scrollToBottom();
  }, [messages.length, showNotice]);

  const handleStartDirectWith = useCallback(
    async (otherUserId: string) => {
      const { conversationId, error: err } = await openDirectChat(otherUserId);
      if (err) {
        showNotice(err);
        return;
      }
      if (conversationId) {
        setSelectedConversationId(conversationId);
      }
    },
    [openDirectChat, showNotice],
  );

  const handleCreateGroup = useCallback(
    async (title: string, memberIds: string[]) => {
      const { conversationId, error: err } = await openNewGroup(title, memberIds);
      if (err) {
        return { error: err };
      }
      if (conversationId) {
        setSelectedConversationId(conversationId);
      }
      return { error: null as string | null };
    },
    [openNewGroup],
  );

  const handleBrowseChannels = useCallback(() => {
    showNotice(
      'Pick a chat in the sidebar, or tap People on your phone to message someone.',
    );
  }, [showNotice]);

  const handleInfo = useCallback(() => {
    if (!activeConversation) {
      showNotice('Select a conversation from the list.');
      return;
    }
    if (activeConversation.kind === 'direct') {
      showNotice(
        `Direct chat with ${activeConversation.displayLabel}. Realtime via Supabase.`,
      );
      return;
    }
    if (activeConversation.kind === 'group') {
      const names = activeConversation.members
        .map((m) => m.displayName)
        .join(', ');
      showNotice(`Members: ${names}`);
      return;
    }
    showNotice(
      `${activeConversation.displayLabel} — team channel. Messages are shared with everyone in the channel.`,
    );
  }, [activeConversation, showNotice]);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const appBootstrap =
    conversationsLoading && conversations.length === 0 && !conversationsError;

  if (appBootstrap) {
    return <ChatLoading />;
  }

  const showEmpty = isEmptyLanding;
  const showThread = messages.length > 0 || composerReady;
  const loadError = conversationsError ?? messagesError;
  const headerTitle = activeConversation?.displayLabel ?? 'Chat';
  const headerSubtitle = subtitleForConversation(activeConversation);

  return (
    <div className="flex h-screen overflow-hidden bg-teams-canvas">
      <TeamsAppRail />
      <ChatSidebar
        currentUserId={user.id}
        conversations={conversations}
        profiles={profiles}
        selectedConversationId={selectedConversationId}
        profilesLoading={profilesLoading}
        onSelectConversation={setSelectedConversationId}
        onStartDirectWith={(id) => void handleStartDirectWith(id)}
        onOpenCreateGroup={() => setGroupModalOpen(true)}
        onSignOut={() => void handleSignOut()}
        onFilterClick={() =>
          showNotice('Bộ lọc chưa khả dụng trong bản demo.')
        }
        onVideoHeaderClick={() =>
          showNotice('Cuộc gọi video chưa khả dụng trong bản demo.')
        }
        onInviteClick={() =>
          showNotice('Mời thành viên: chia sẻ liên kết đăng ký với đồng đội.')
        }
      />
      <main className="relative flex min-w-0 flex-1 flex-col bg-white pb-16 md:pb-0">
        <ChatHeader
          userEmail={email}
          userDisplayName={displayName}
          userAvatarUrl={myAvatarUrl}
          showSearch={showEmpty}
          searchInputRef={searchInputRef}
          searchPlaceholder={`Search ${headerTitle}…`}
          conversationKind={activeConversation?.kind ?? 'channel'}
          conversationTitle={headerTitle}
          conversationSubtitle={headerSubtitle}
          conversationMembers={activeConversation?.members}
          currentUserId={user.id}
          onVideoCall={() =>
            showNotice('Video calls are not available in this demo.')
          }
          onVoiceCall={() =>
            showNotice('Voice calls are not available in this demo.')
          }
          onInfo={handleInfo}
        />
        {notice ? (
          <ChatNoticeBanner message={notice} onDismiss={dismiss} />
        ) : null}
        {loadError ? (
          <div
            className="mx-4 mt-2 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 sm:mx-8"
            role="alert"
          >
            {loadError}
          </div>
        ) : null}
        {selectedConversationId && messagesLoading ? (
          <MessageListSkeleton />
        ) : null}
        {selectedConversationId && !messagesLoading ? (
          <>
            {showEmpty ? (
              <ChatEmptyState
                onStartMessaging={() => setComposerReady(true)}
                onBrowseChannels={handleBrowseChannels}
              />
            ) : null}
            {showThread && messages.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
                <p className="text-sm font-medium text-teams-text-secondary">
                  No messages yet. Say hello.
                </p>
              </div>
            ) : null}
            {showThread && messages.length > 0 ? (
              <MessageList
                ref={messageListRef}
                messages={messages}
                currentUserId={user.id}
                hasMore={hasMore}
                loadingMore={loadingMore}
                onLoadOlder={loadOlder}
              />
            ) : null}
            {showEmpty ? (
              <footer className="shrink-0 border-t border-teams-border bg-white px-4 py-6 sm:px-8">
                <div className="mx-auto w-full max-w-4xl">
                  <div className="flex cursor-not-allowed items-center gap-3 rounded-lg border border-teams-border bg-teams-canvas p-2 opacity-60 grayscale">
                    <button
                      type="button"
                      disabled
                      className="p-3 text-on-surface-variant"
                      aria-hidden
                    >
                      <PlusCircle className="h-6 w-6" strokeWidth={1.75} />
                    </button>
                    <div className="flex-1 px-2 py-3 text-sm font-medium text-on-surface-variant">
                      Your messages will appear here…
                    </div>
                    <div className="flex items-center gap-2 pr-2">
                      <span className="p-2 text-on-surface-variant" aria-hidden>
                        <Smile className="h-5 w-5" strokeWidth={1.75} />
                      </span>
                      <span className="p-2 text-on-surface-variant" aria-hidden>
                        <Paperclip className="h-5 w-5" strokeWidth={1.75} />
                      </span>
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-teams-border text-teams-text-secondary">
                        <Send className="h-5 w-5" strokeWidth={2} />
                      </div>
                    </div>
                  </div>
                  <p className="mt-3 text-center text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/40">
                    Encrypted End-to-End Environment
                  </p>
                </div>
              </footer>
            ) : (
              <MessageInput ref={messageInputRef} onSend={handleSend} />
            )}
          </>
        ) : null}
        {!selectedConversationId && !conversationsLoading ? (
          <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
            <p className="text-sm font-medium text-teams-text-secondary">
              No conversations available. Run the database migration or sign in
              again after your admin creates the team channel.
            </p>
          </div>
        ) : null}
      </main>
      <ChatRightPanel
        onJumpTo={handleJumpTo}
        onRecent={handleRecent}
        conversationLabel={activeConversation?.displayLabel ?? null}
        conversationKind={activeConversation?.kind}
        imagePreview={sharedSummary.imagePreview}
        imageExtraCount={sharedSummary.imageExtraCount}
        files={sharedSummary.files}
        links={sharedSummary.links}
      />
      <ChatMobileNav
        userEmail={email}
        displayName={displayName}
        avatarUrl={myAvatarUrl}
        profiles={profiles}
        profilesLoading={profilesLoading}
        activeTab={mobileTab}
        onTabChange={setMobileTab}
        onSignOut={handleSignOut}
        onSelectUserForDm={(id) => void handleStartDirectWith(id)}
      />
      <CreateGroupModal
        open={groupModalOpen}
        profiles={profiles}
        onClose={() => setGroupModalOpen(false)}
        onCreate={handleCreateGroup}
      />
      <button
        type="button"
        onClick={() => setGroupModalOpen(true)}
        className="fixed bottom-24 right-4 z-30 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-white shadow-md transition-transform hover:bg-primary-hover active:scale-95 md:hidden"
        aria-label="New group"
      >
        <Plus className="h-6 w-6" strokeWidth={2.5} />
      </button>
    </div>
  );
};
