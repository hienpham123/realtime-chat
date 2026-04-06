import { MdAddReaction } from 'react-icons/md';

interface MessageReactionBarProps {
  disabled?: boolean;
  onPick: (emoji: string) => void;
}

export const QUICK_REACTION_EMOJIS = ['👍', '❤️', '😆', '😮'] as const;

export const MessageReactionBar = ({
  disabled = false,
  onPick,
}: MessageReactionBarProps) => (
  <div
    className="flex items-center gap-0.5 rounded-xl border border-teams-border bg-white px-1 py-1 shadow-md"
    role="toolbar"
    aria-label="Quick reactions"
  >
    {QUICK_REACTION_EMOJIS.map((emoji) => (
      <button
        key={emoji}
        type="button"
        disabled={disabled}
        className="rounded p-1 text-lg leading-none transition-transform hover:scale-110 active:scale-95 disabled:opacity-40"
        aria-label={`React with ${emoji}`}
        onClick={() => onPick(emoji)}
      >
        {emoji}
      </button>
    ))}
    <button
      type="button"
      disabled={disabled}
      className="ml-0.5 flex h-7 w-7 items-center justify-center rounded-full text-teams-text-secondary transition-colors hover:bg-teams-hover hover:text-teams-text disabled:opacity-40"
      aria-label="Add reaction"
      onClick={() => onPick('😀')}
    >
      <MdAddReaction className="h-4 w-4" />
    </button>
  </div>
);
