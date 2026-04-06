import type { RefObject } from 'react';
import { Info, MessageCircle, Phone, Search, Users, Video } from 'lucide-react';
import { UserAvatar } from '@/components/user-avatar/user-avatar';
import type { ConversationKind, ConversationMemberPreview } from '@/types';

interface ChatHeaderProps {
  userEmail: string;
  userDisplayName: string;
  userAvatarUrl?: string | null;
  showSearch?: boolean;
  searchInputRef?: RefObject<HTMLInputElement | null>;
  searchPlaceholder?: string;
  conversationKind?: ConversationKind;
  conversationTitle: string;
  conversationSubtitle: string;
  conversationMembers?: ConversationMemberPreview[];
  currentUserId?: string;
  onVideoCall?: () => void;
  onVoiceCall?: () => void;
  onInfo?: () => void;
}

const HeaderIcon = ({ kind }: { kind: ConversationKind }) => {
  const wrap =
    'flex h-10 w-10 shrink-0 items-center justify-center rounded border border-teams-border bg-teams-canvas';
  if (kind === 'group') {
    return (
      <div className={wrap}>
        <Users className="h-5 w-5 text-primary" strokeWidth={1.75} />
      </div>
    );
  }
  if (kind === 'direct') {
    return (
      <div className={wrap}>
        <MessageCircle className="h-5 w-5 text-primary" strokeWidth={1.75} />
      </div>
    );
  }
  return (
    <div className={wrap}>
      <span className="text-sm font-bold text-primary">#</span>
    </div>
  );
};

const GROUP_AVATAR_MAX = 4;

const ConversationHeaderAvatars = ({
  kind,
  members,
  currentUserId,
}: {
  kind: ConversationKind;
  members: ConversationMemberPreview[];
  currentUserId: string;
}) => {
  if (kind === 'direct') {
    const other = members.find((m) => m.userId !== currentUserId);
    if (other) {
      return (
        <UserAvatar
          label={other.displayName}
          email={other.email}
          imageUrl={other.avatarUrl}
          sizeClass="h-10 w-10 text-sm"
        />
      );
    }
  }

  if ((kind === 'group' || kind === 'channel') && members.length > 0) {
    const othersFirst = [
      ...members.filter((m) => m.userId !== currentUserId),
      ...members.filter((m) => m.userId === currentUserId),
    ];
    const shown = othersFirst.slice(0, GROUP_AVATAR_MAX);
    const extra = members.length - shown.length;

    return (
      <div className="flex shrink-0 items-center">
        <div className="flex -space-x-2">
          {shown.map((m) => (
            <div
              key={m.userId}
              className="relative ring-2 ring-white rounded-full"
            >
              <UserAvatar
                label={m.displayName}
                email={m.email}
                imageUrl={m.avatarUrl}
                sizeClass="h-9 w-9 text-xs"
              />
            </div>
          ))}
        </div>
        {extra > 0 ? (
          <div
            className="-ml-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-teams-border text-[10px] font-bold text-teams-text ring-2 ring-white"
            aria-label={`${extra} more members`}
          >
            +{extra}
          </div>
        ) : null}
      </div>
    );
  }

  return <HeaderIcon kind={kind} />;
};

export const ChatHeader = ({
  userEmail,
  userDisplayName,
  userAvatarUrl,
  showSearch = false,
  searchInputRef,
  searchPlaceholder = 'Search conversation…',
  conversationKind = 'channel',
  conversationTitle,
  conversationSubtitle,
  conversationMembers,
  currentUserId,
  onVideoCall,
  onVoiceCall,
  onInfo,
}: ChatHeaderProps) => {
  const showMemberAvatars =
    !showSearch &&
    conversationMembers &&
    conversationMembers.length > 0 &&
    currentUserId &&
    (conversationKind === 'direct' ||
      conversationKind === 'group' ||
      conversationKind === 'channel');

  return (
    <header className="sticky top-0 z-40 flex w-full shrink-0 items-center justify-between border-b border-teams-border bg-white px-4 py-3 sm:px-6">
      <div className="flex min-w-0 flex-1 items-center gap-4">
        {showSearch ? (
          <div className="relative w-full max-w-md">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-teams-text-secondary"
              strokeWidth={1.75}
            />
            <input
              ref={searchInputRef}
              type="search"
              placeholder={searchPlaceholder}
              className="w-full rounded border border-teams-border bg-teams-canvas py-2 pl-10 pr-4 text-sm text-teams-text placeholder:text-teams-text-secondary focus:outline-none focus:ring-2 focus:ring-primary/25"
              aria-label="Search"
            />
          </div>
        ) : (
          <>
            {showMemberAvatars ? (
              <ConversationHeaderAvatars
                kind={conversationKind}
                members={conversationMembers}
                currentUserId={currentUserId}
              />
            ) : (
              <HeaderIcon kind={conversationKind} />
            )}
            <div className="min-w-0">
              <h2 className="truncate text-lg font-semibold text-teams-text sm:text-xl">
                {conversationTitle}
              </h2>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 shrink-0 rounded-full bg-[#13a10e]" />
                <span className="truncate text-xs text-teams-text-secondary">
                  {conversationSubtitle}
                </span>
              </div>
            </div>
          </>
        )}
      </div>
      <div className="flex items-center gap-1 sm:gap-2">
        <button
          type="button"
          className="rounded p-2 text-teams-text-secondary transition-colors hover:bg-teams-hover active:scale-95"
          aria-label="Video call"
          onClick={onVideoCall}
        >
          <Video className="h-5 w-5" strokeWidth={1.75} />
        </button>
        <button
          type="button"
          className="rounded p-2 text-teams-text-secondary transition-colors hover:bg-teams-hover active:scale-95"
          aria-label="Voice call"
          onClick={onVoiceCall}
        >
          <Phone className="h-5 w-5" strokeWidth={1.75} />
        </button>
        <button
          type="button"
          className="ml-1 rounded border-l border-teams-border pl-3 sm:ml-2 sm:pl-4"
          aria-label="Conversation info"
          onClick={onInfo}
        >
          <Info className="h-5 w-5 text-teams-text-secondary" strokeWidth={1.75} />
        </button>
        <div className="ml-2 hidden sm:flex">
          <UserAvatar
            label={userDisplayName}
            email={userEmail}
            imageUrl={userAvatarUrl}
            sizeClass="h-9 w-9 text-sm"
          />
        </div>
      </div>
    </header>
  );
};
