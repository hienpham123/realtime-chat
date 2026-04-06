import { X } from 'lucide-react';

interface ChatNoticeBannerProps {
  message: string;
  onDismiss: () => void;
}

export const ChatNoticeBanner = ({
  message,
  onDismiss,
}: ChatNoticeBannerProps) => (
  <div
    className="mx-4 mt-2 flex items-start gap-2 rounded border border-primary/20 bg-primary-light/80 px-3 py-2 text-sm text-teams-text sm:mx-8"
    role="status"
    aria-live="polite"
  >
    <p className="min-w-0 flex-1 leading-snug">{message}</p>
    <button
      type="button"
      onClick={onDismiss}
      className="shrink-0 rounded p-1 text-primary transition-colors hover:bg-primary/15"
      aria-label="Dismiss"
    >
      <X className="h-4 w-4" strokeWidth={2} />
    </button>
  </div>
);
