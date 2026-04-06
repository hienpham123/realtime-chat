import { FileText } from 'lucide-react';
import { UserAvatar } from '@/components/user-avatar/user-avatar';
import type { ChatMessage, MessageAttachment } from '@/types';

interface MessageItemProps {
  message: ChatMessage;
  isOwn: boolean;
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
            className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
              isOwn
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

export const MessageItem = ({ message, isOwn }: MessageItemProps) => {
  const label = message.userDisplayName;
  const time = formatTime(message.created_at);
  const meta = `${label} • ${time}`;
  const text = message.content.trim();
  const hasText = text.length > 0;
  const hasFiles = message.attachments.length > 0;

  if (isOwn) {
    return (
      <div className="ml-auto flex max-w-[85%] flex-col items-end gap-1">
        <span className="mr-2 text-[10px] font-semibold tracking-wide text-teams-text-secondary">
          {meta}
        </span>
        <div className="min-w-0 rounded rounded-br-sm bg-message-own px-3 py-2 text-white shadow-sm">
          <div className="flex flex-col gap-2">
            <AttachmentBlock items={message.attachments} isOwn />
            {hasText ? (
              <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                {text}
              </p>
            ) : null}
            {!hasText && !hasFiles ? (
              <p className="text-sm leading-relaxed opacity-80">(empty)</p>
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
      <div className="flex flex-col gap-1">
        <span className="ml-2 text-[10px] font-semibold tracking-wide text-teams-text-secondary">
          {meta}
        </span>
        <div className="rounded rounded-bl-sm border border-teams-border bg-white px-3 py-2 text-teams-text shadow-sm">
          <div className="flex flex-col gap-2">
            <AttachmentBlock items={message.attachments} isOwn={false} />
            {hasText ? (
              <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                {text}
              </p>
            ) : null}
            {!hasText && !hasFiles ? (
              <p className="text-sm leading-relaxed text-teams-text-secondary">
                (empty)
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};
