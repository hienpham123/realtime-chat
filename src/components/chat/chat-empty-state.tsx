import { Compass, MessageSquarePlus, MessagesSquare } from 'lucide-react';

interface ChatEmptyStateProps {
  onStartMessaging: () => void;
  onBrowseChannels: () => void;
}

export const ChatEmptyState = ({
  onStartMessaging,
  onBrowseChannels,
}: ChatEmptyStateProps) => (
  <div className="relative flex flex-1 flex-col items-center justify-center bg-white p-6 sm:p-8">
    <div className="max-w-md space-y-8 text-center">
      <div className="relative inline-block">
        <div className="relative mx-auto flex h-52 w-52 items-center justify-center overflow-hidden rounded-full border border-teams-border bg-teams-canvas sm:h-56 sm:w-56">
          <MessagesSquare
            className="relative z-0 h-20 w-20 text-primary/25 sm:h-24 sm:w-24"
            strokeWidth={1.25}
          />
          <div className="absolute right-1/4 top-1/4 z-10 flex h-11 w-11 items-center justify-center rounded border border-teams-border bg-white shadow-md">
            <MessagesSquare className="h-6 w-6 text-primary" strokeWidth={2.25} />
          </div>
          <div className="absolute bottom-1/4 left-1/4 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-teams-border bg-white shadow-sm">
            <span className="text-base font-semibold text-primary">@</span>
          </div>
        </div>
      </div>
      <div className="space-y-3">
        <h1 className="text-2xl font-semibold tracking-tight text-teams-text sm:text-3xl">
          Select a conversation to start chatting
        </h1>
        <p className="text-base leading-relaxed text-teams-text-secondary sm:text-lg">
          Connect with your team and keep the conversation going in Realtime Chat.
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={onStartMessaging}
          className="flex items-center gap-2 rounded bg-primary px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-hover active:scale-[0.98]"
        >
          <MessageSquarePlus className="h-5 w-5" strokeWidth={2} />
          New message
        </button>
        <button
          type="button"
          onClick={onBrowseChannels}
          className="flex items-center gap-2 rounded border border-teams-border bg-white px-6 py-2.5 text-sm font-semibold text-teams-text shadow-sm transition-colors hover:bg-teams-hover active:scale-[0.98]"
        >
          <Compass className="h-5 w-5" strokeWidth={1.75} />
          Browse channels
        </button>
      </div>
    </div>
    <div className="pointer-events-none absolute bottom-24 left-8 hidden opacity-30 lg:block">
      <div className="max-w-xs rotate-[-4deg] rounded border border-teams-border bg-white p-4 shadow-sm">
        <div className="mb-2 flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-teams-border" />
          <div className="h-2 w-24 rounded bg-teams-border" />
        </div>
        <div className="space-y-2">
          <div className="h-2 w-full rounded bg-teams-border/60" />
          <div className="h-2 w-2/3 rounded bg-teams-border/60" />
        </div>
      </div>
    </div>
    <div className="pointer-events-none absolute right-8 top-40 hidden opacity-30 lg:block">
      <div className="max-w-xs rotate-[6deg] rounded border border-teams-border bg-white p-4 shadow-sm">
        <div className="mb-2 flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-primary/30" />
          <div className="h-2 w-24 rounded bg-primary/20" />
        </div>
        <div className="h-2 w-full rounded bg-primary/15" />
      </div>
    </div>
  </div>
);
