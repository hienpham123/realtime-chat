import { Check, FileText, Image, Paperclip, Pencil, Smile, Trash2, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { MdMoreHoriz } from 'react-icons/md';
import { UserAvatar } from '@/components/user-avatar/user-avatar';
import type { ChatMessage, MessageAttachment } from '@/types';
import { MessageReactionBar } from '@/components/chat/message-item/message-reaction-bar';

interface MessageItemProps {
  message: ChatMessage;
  isOwn: boolean;
  currentUserId: string;
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

const formatTime = (iso: string): string => {
  try {
    return new Intl.DateTimeFormat(undefined, {
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(iso));
  } catch {
    return '';
  }
};

const AttachmentBlock = ({
  items,
  isOwn,
}: {
  items: MessageAttachment[];
  isOwn: boolean;
}) => {
  if (items.length === 0) {
    return null;
  }
  return (
    <div className="flex flex-col gap-2">
      {items.map((a) =>
        a.kind === 'image' ? (
          <a
            key={a.path}
            href={a.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block overflow-hidden rounded-md"
          >
            <img
              src={a.url}
              alt={a.name}
              className="max-h-56 max-w-full object-contain"
            />
          </a>
        ) : (
          <a
            key={a.path}
            href={a.url}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${isOwn
                ? 'border-white/30 bg-white/10 text-white hover:bg-white/15'
                : 'border-teams-border bg-teams-canvas text-primary hover:bg-teams-hover'
              }`}
          >
            <FileText className="h-4 w-4 shrink-0" strokeWidth={2} />
            <span className="min-w-0 truncate">{a.name}</span>
          </a>
        ),
      )}
    </div>
  );
};

export const MessageItem = ({
  message,
  isOwn,
  currentUserId,
  onUpdateMessage,
  onDeleteMessage,
  onToggleReaction,
}: MessageItemProps) => {
  const label = message.userDisplayName;
  const time = formatTime(message.created_at);
  const metaOwn = `${label} • ${time}${message.edited_at ? ' • Edited' : ''}`;
  const metaOther = `${label}${message.edited_at ? ' • Edited' : ''}`;
  const text = message.content.trim();
  const hasText = text.length > 0;
  const hasFiles = message.attachments.length > 0;
  const isDeleted = Boolean(message.deleted_at);

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(text);
  const [busy, setBusy] = useState(false);
  const [actionsMenuOpen, setActionsMenuOpen] = useState(false);
  const ownActionsMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!editing) {
      setDraft(text);
    }
  }, [text, editing]);

  useEffect(() => {
    if (!actionsMenuOpen) {
      return;
    }
    const onPointerDown = (e: PointerEvent) => {
      const el = ownActionsMenuRef.current;
      if (el && !el.contains(e.target as Node)) {
        setActionsMenuOpen(false);
      }
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    return () => document.removeEventListener('pointerdown', onPointerDown, true);
  }, [actionsMenuOpen]);

  useEffect(() => {
    if (!actionsMenuOpen) {
      return;
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActionsMenuOpen(false);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [actionsMenuOpen]);

  const closeMenu = useCallback(() => {
    setActionsMenuOpen(false);
  }, []);

  const handleSaveEdit = useCallback(async () => {
    if (!onUpdateMessage) {
      return;
    }
    const next = draft.trim();
    if (!next || next === text) {
      setEditing(false);
      return;
    }
    setBusy(true);
    const { error } = await onUpdateMessage(message.id, next);
    setBusy(false);
    if (!error) {
      setEditing(false);
    }
  }, [draft, message.id, onUpdateMessage, text]);

  const handleDelete = useCallback(async () => {
    if (!onDeleteMessage) {
      return;
    }
    const ok = window.confirm('Delete this message?');
    if (!ok) {
      return;
    }
    closeMenu();
    setBusy(true);
    await onDeleteMessage(message.id);
    setBusy(false);
  }, [closeMenu, message.id, onDeleteMessage]);

  const hasReactionChipsBelow = message.reactions.length > 0;

  const reactionToolbarButtons = (
    <>
      {message.reactions.map((r) => {
        const reactedByMe = r.userIds.includes(currentUserId);
        return (
          <button
            key={r.emoji}
            type="button"
            disabled={!onToggleReaction || busy}
            className={`inline-flex shrink-0 items-center gap-1 rounded-full border border-teams-border bg-white px-2 py-0.5 text-xs font-medium text-teams-text shadow-sm transition-colors hover:bg-teams-hover ${reactedByMe ? 'ring-1 ring-primary/30' : ''
              } disabled:opacity-50`}
            onClick={() => void onToggleReaction?.(message.id, r.emoji)}
          >
            <span>{r.emoji}</span>
            <span className="tabular-nums text-[10px] text-teams-text-secondary">
              {r.userIds.length}
            </span>
          </button>
        );
      })}
    </>
  );

  const bubbleBody = isDeleted ? (
    <p className="text-sm italic text-teams-text-secondary text-white">
      This message was deleted.
    </p>
  ) : editing ? (
    <div className="flex w-full min-w-[16rem] flex-col rounded-md border border-teams-border bg-white text-teams-text shadow-sm">
      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        rows={2}
        className="min-h-[4.5rem] w-full resize-y rounded-t-md border-b border-teams-border bg-white px-3 py-2 text-sm text-teams-text focus:outline-none focus:ring-2 focus:ring-primary/20"
        disabled={busy}
      />
      <div className="flex items-center justify-between px-2 py-1.5">
        <div className="flex items-center gap-1 text-teams-text-secondary">
          <button
            type="button"
            className="rounded p-1.5 hover:bg-teams-hover"
            aria-label="Insert emoji"
            disabled
          >
            <Smile className="h-4 w-4" strokeWidth={1.75} />
          </button>
          <button
            type="button"
            className="rounded p-1.5 hover:bg-teams-hover"
            aria-label="Insert image"
            disabled
          >
            <Image className="h-4 w-4" strokeWidth={1.75} />
          </button>
          <button
            type="button"
            className="rounded p-1.5 hover:bg-teams-hover"
            aria-label="Attach file"
            disabled
          >
            <Paperclip className="h-4 w-4" strokeWidth={1.75} />
          </button>
          <span className="mx-1 h-5 w-px bg-teams-border" aria-hidden />
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="rounded p-1.5 text-teams-text-secondary hover:bg-teams-hover"
            onClick={() => {
              setEditing(false);
              setDraft(text);
            }}
            disabled={busy}
            aria-label="Cancel edit"
          >
            <X className="h-4 w-4" strokeWidth={2} />
          </button>
          <button
            type="button"
            className="rounded p-1.5 text-teams-text-secondary hover:bg-teams-hover disabled:opacity-50"
            onClick={() => void handleSaveEdit()}
            disabled={busy}
            aria-label="Save edit"
          >
            <Check className="h-4 w-4" strokeWidth={2.25} />
          </button>
        </div>
      </div>
    </div>
  ) : (
    <div className="flex flex-col gap-2">
      <AttachmentBlock items={message.attachments} isOwn={isOwn} />
      {hasText ? (
        <p className="text-sm leading-relaxed whitespace-pre-wrap break-words [word-break:normal]">
          {text}
        </p>
      ) : null}
      {!hasText && !hasFiles ? (
        <p
          className={`text-sm leading-relaxed ${isOwn ? 'opacity-80' : 'text-teams-text-secondary'}`}
        >
          (empty)
        </p>
      ) : null}
    </div>
  );

  const bubbleShellClass = editing
    ? 'w-[min(22rem,100%)] max-w-full'
    : 'w-fit max-w-[min(100%,70%)] min-w-max shrink-0';

  const showOwnMessageMenu =
    isOwn &&
    !isDeleted &&
    !editing &&
    Boolean(onUpdateMessage && onDeleteMessage);

  const showHoverMessageToolbar =
    !isDeleted &&
    !editing &&
    (Boolean(onToggleReaction) || showOwnMessageMenu);

  const hoverMessageToolbar = showHoverMessageToolbar ? (
    <div
      className={`absolute top-full z-20 mt-1 flex items-center gap-1 transition-opacity ${isOwn ? 'right-0' : 'left-0'} ${
        actionsMenuOpen
          ? 'pointer-events-auto opacity-100'
          : 'pointer-events-none opacity-0 group-hover:pointer-events-auto group-hover:opacity-100'
      }`}
      role="presentation"
    >
      {onToggleReaction && !actionsMenuOpen ? (
        <div className="pointer-events-auto">
          <MessageReactionBar
            disabled={busy}
            onPick={(emoji) => void onToggleReaction(message.id, emoji)}
          />
        </div>
      ) : null}
      {showOwnMessageMenu ? (
        <div
          ref={ownActionsMenuRef}
          className="pointer-events-auto relative h-7 w-7 shrink-0"
        >
          {!actionsMenuOpen ? (
            <button
              type="button"
              className="flex h-7 w-7 items-center justify-center rounded-xl border border-teams-border bg-white text-teams-text-secondary shadow-md transition-colors hover:bg-teams-hover"
              aria-label="Message actions"
              aria-expanded={false}
              aria-haspopup="menu"
              onClick={() => setActionsMenuOpen(true)}
            >
              <MdMoreHoriz className="h-4 w-4" aria-hidden />
            </button>
          ) : (
            <div
              role="menu"
              aria-label="Message actions"
              className="absolute right-0 top-full z-50 mt-1 min-w-[9rem] rounded-md border border-teams-border bg-white py-1 text-teams-text shadow-lg"
            >
              <button
                type="button"
                role="menuitem"
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-teams-hover"
                onClick={() => {
                  closeMenu();
                  setEditing(true);
                }}
              >
                <Pencil className="h-4 w-4 shrink-0" strokeWidth={2} />
                Edit
              </button>
              <button
                type="button"
                role="menuitem"
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-700 hover:bg-red-50"
                onClick={() => void handleDelete()}
              >
                <Trash2 className="h-4 w-4 shrink-0" strokeWidth={2} />
                Delete
              </button>
            </div>
          )}
        </div>
      ) : null}
    </div>
  ) : null;

  const showFloatingReactions =
    !isDeleted && !editing && hasReactionChipsBelow;

  const reactionRowAbsoluteClass = isOwn
    ? 'right-0 justify-end'
    : 'left-0 justify-start';

  if (isOwn) {
    return (
      <div
        className={`ml-auto flex max-w-[85%] flex-col items-end gap-1 ${showFloatingReactions ? 'mb-4' : ''}`}
      >
        <span className="mr-2 text-[10px] font-semibold tracking-wide text-teams-text-secondary">
          {metaOwn}
        </span>
        <div className="group flex max-w-full flex-col items-end gap-1.5">
          <div className={`relative ${bubbleShellClass}`}>
            {hoverMessageToolbar}
            <div
              className={`relative rounded-2xl rounded-br-md px-3 py-2 shadow-sm ${editing
                  ? 'border border-teams-border bg-white text-teams-text'
                  : 'bg-message-own text-white'
                } ${showFloatingReactions ? 'pb-2' : ''}`}
            >
              {bubbleBody}
            </div>
            {showFloatingReactions ? (
              <div
                className={`pointer-events-auto absolute -bottom-3 z-10 flex max-w-full flex-nowrap items-center gap-1 overflow-x-auto scrollbar-subtle ${reactionRowAbsoluteClass}`}
              >
                {!actionsMenuOpen ? reactionToolbarButtons : null}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex max-w-[85%] items-end gap-3">
      <UserAvatar
        label={label}
        email={message.userEmail}
        imageUrl={message.userAvatarUrl}
        sizeClass="h-8 w-8 text-xs"
      />
      <div
        className={`group ml-2 flex min-w-0 flex-1 flex-col gap-1 ${showFloatingReactions ? 'mb-4' : ''}`}
      >
        <span className="text-[10px] font-semibold tracking-wide text-teams-text-secondary">
          {metaOther}
        </span>
        <div className="flex items-end gap-2">
          <div className={`relative ${bubbleShellClass}`}>
            {hoverMessageToolbar}
            <div
              className={`relative rounded-2xl rounded-bl-md border border-transparent bg-[#F0F0F0] px-3 py-2 text-sm text-teams-text shadow-sm ${showFloatingReactions ? 'pb-2' : ''}`}
            >
              {bubbleBody}
            </div>
            {showFloatingReactions ? (
              <div
                className={`pointer-events-auto absolute -bottom-3 z-10 flex max-w-full flex-nowrap items-center gap-1 scrollbar-subtle ${reactionRowAbsoluteClass}`}
              >
                {reactionToolbarButtons}
              </div>
            ) : null}
          </div>
          {!editing ? (
            <time
              className="shrink-0 pb-1 text-[11px] tabular-nums text-teams-text-secondary"
              dateTime={message.created_at}
            >
              {time}
            </time>
          ) : null}
        </div>
      </div>
    </div>
  );
};
