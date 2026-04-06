import { Hash, MessageCircle, Users } from 'lucide-react';
import type {
  ConversationKind,
  ConversationMemberPreview,
  ConversationSummary,
} from '@/types';
import { UserAvatar } from '@/components/user-avatar/user-avatar';

const kindGlyph = (kind: ConversationKind) => {
  if (kind === 'channel') {
    return Hash;
  }
  if (kind === 'group') {
    return Users;
  }
  return MessageCircle;
};

const sidebarSubtitleFallback = (c: ConversationSummary): string => {
  if (c.kind === 'direct') {
    return 'Trò chuyện trực tiếp';
  }
  if (c.kind === 'group') {
    return `${c.members.length} thành viên`;
  }
  return 'Kênh';
};

const sidebarPreviewLine = (c: ConversationSummary): string => {
  const fromServer = c.last_message_preview?.trim();
  if (fromServer) {
    return fromServer;
  }
  return sidebarSubtitleFallback(c);
};

const formatSidebarTime = (iso: string): string => {
  try {
    return new Intl.DateTimeFormat(undefined, {
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso));
  } catch {
    return '';
  }
};

const membersForGroupStack = (
  c: ConversationSummary,
  currentUserId: string,
): ConversationMemberPreview[] => {
  if (c.kind === 'direct') {
    return [];
  }

  const me = c.members.find((m) => m.userId === currentUserId);
  const others = c.members.filter((m) => m.userId !== currentUserId);

  if (others.length >= 2) {
    return others.slice(0, 2);
  }

  if (others.length === 1 && me) {
    return [others[0], me];
  }

  if (others.length === 1) {
    return others;
  }

  return c.members.slice(0, 2);
};

const avatarForDirect = (
  c: ConversationSummary,
  currentUserId: string,
): { label: string; email: string; imageUrl: string | null } | null => {
  if (c.kind !== 'direct') {
    return null;
  }
  const other = c.members.find((m) => m.userId !== currentUserId);
  if (other) {
    return {
      label: other.displayName,
      email: other.email,
      imageUrl: other.avatarUrl,
    };
  }
  return {
    label: c.displayLabel,
    email: c.displayLabel,
    imageUrl: null,
  };
};

interface GroupAvatarStackProps {
  members: ConversationMemberPreview[];
  kind: ConversationKind;
  compact?: boolean;
}

const GroupAvatarStack = ({
  members,
  kind,
  compact,
}: GroupAvatarStackProps) => {
  const Glyph = kindGlyph(kind);
  const outer = compact ? 'h-8 w-8' : 'h-9 w-9';
  const inner = compact ? 'h-6 w-6 text-[10px]' : 'h-7 w-7 text-xs';
  const ring = 'ring-2 ring-white';

  if (members.length === 0) {
    return (
      <span
        className={`flex ${outer} shrink-0 items-center justify-center rounded-full bg-white text-primary shadow-sm ring-1 ring-teams-border`}
      >
        <Glyph className="h-4 w-4" strokeWidth={2} />
      </span>
    );
  }

  if (members.length === 1) {
    const m = members[0];
    return (
      <UserAvatar
        label={m.displayName}
        email={m.email}
        imageUrl={m.avatarUrl}
        sizeClass={`${outer} text-xs`}
      />
    );
  }

  const [a, b] = members;
  return (
    <div className={`relative ${outer} shrink-0`} aria-hidden>
      <div className={`absolute left-0 top-0 z-[1] rounded-full ${ring}`}>
        <UserAvatar
          label={a.displayName}
          email={a.email}
          imageUrl={a.avatarUrl}
          sizeClass={inner}
        />
      </div>
      <div className={`absolute -right-0.5 bottom-0 z-0 rounded-full ${ring}`}>
        <UserAvatar
          label={b.displayName}
          email={b.email}
          imageUrl={b.avatarUrl}
          sizeClass={inner}
        />
      </div>
    </div>
  );
};

interface ConversationListItemProps {
  conversation: ConversationSummary;
  selected: boolean;
  currentUserId: string;
  onSelect: () => void;
  compact?: boolean;
}

export const ConversationListItem = ({
  conversation: c,
  selected,
  currentUserId,
  onSelect,
  compact,
}: ConversationListItemProps) => {
  const directAv = avatarForDirect(c, currentUserId);
  const stackMembers =
    c.kind === 'direct' ? [] : membersForGroupStack(c, currentUserId);
  const time = formatSidebarTime(c.last_activity_at);
  const preview = sidebarPreviewLine(c);
  const showPresenceDot = c.kind === 'direct';
  const unread = c.unread_count > 0;

  const renderAvatar = () => {
    if (c.kind === 'direct' && directAv) {
      return (
        <UserAvatar
          label={directAv.label}
          email={directAv.email}
          imageUrl={directAv.imageUrl}
          sizeClass={compact ? 'h-8 w-8 text-xs' : 'h-9 w-9 text-xs'}
        />
      );
    }
    return (
      <GroupAvatarStack
        members={stackMembers}
        kind={c.kind}
        compact={compact}
      />
    );
  };

  if (compact) {
    return (
      <button
        type="button"
        onClick={onSelect}
        title={c.displayLabel}
        aria-label={c.displayLabel}
        aria-current={selected ? 'true' : undefined}
        className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-transform ${
          selected ? 'ring-2 ring-primary ring-offset-2 ring-offset-teams-canvas' : 'hover:opacity-90'
        }`}
      >
        {unread ? (
          <span className="absolute -right-0.5 -top-0.5 z-[4] flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold leading-none text-white">
            {c.unread_count > 99 ? '99+' : c.unread_count}
          </span>
        ) : null}
        {renderAvatar()}
        {showPresenceDot ? (
          <span
            className="absolute bottom-0 right-0 z-[2] h-2.5 w-2.5 rounded-full border-2 border-teams-canvas bg-[#13a10e]"
            aria-hidden
          />
        ) : null}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex w-full gap-2 rounded-lg border px-2 py-2 text-left transition-colors ${
        selected
          ? 'border-teams-border bg-white shadow-sm'
          : 'border-transparent hover:bg-white/70'
      }`}
    >
      <div className="relative shrink-0">
        {unread ? (
          <span className="absolute -right-1 -top-1 z-[4] flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold leading-none text-white shadow-sm">
            {c.unread_count > 99 ? '99+' : c.unread_count}
          </span>
        ) : null}
        {renderAvatar()}
        {showPresenceDot ? (
          <span
            className="absolute bottom-0 right-0 z-[2] h-2.5 w-2.5 rounded-full border-2 border-white bg-[#13a10e]"
            aria-hidden
          />
        ) : null}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-1">
          <span className="min-w-0 truncate text-sm font-semibold text-teams-text">
            {c.displayLabel}
          </span>
          <span className="shrink-0 text-[11px] text-teams-text-secondary">
            {time}
          </span>
        </div>
        <p className="mt-0.5 truncate text-xs text-teams-text-secondary">
          {preview}
        </p>
      </div>
    </button>
  );
};
