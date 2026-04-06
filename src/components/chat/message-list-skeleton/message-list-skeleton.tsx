export const MessageListSkeleton = () => (
  <div
    className="flex flex-1 flex-col space-y-6 overflow-hidden bg-white px-4 py-4 sm:px-6 sm:py-5"
    aria-busy="true"
    aria-label="Loading messages"
    role="status"
  >
    <div className="flex max-w-[75%] animate-pulse gap-3">
      <div className="h-8 w-8 shrink-0 rounded-full bg-teams-border" />
      <div className="min-w-0 flex-1 space-y-2">
        <div className="h-2.5 w-28 rounded bg-teams-border" />
        <div className="h-20 rounded rounded-bl-sm bg-teams-canvas" />
      </div>
    </div>
    <div className="ml-auto flex max-w-[75%] animate-pulse flex-col items-end gap-2">
      <div className="h-2.5 w-24 rounded bg-teams-border" />
      <div className="bg-message-own-tint h-16 w-[85%] rounded rounded-br-sm" />
    </div>
    <div className="flex max-w-[75%] animate-pulse gap-3">
      <div className="h-8 w-8 shrink-0 rounded-full bg-teams-border" />
      <div className="min-w-0 flex-1 space-y-2">
        <div className="h-2.5 w-32 rounded bg-teams-border" />
        <div className="h-14 rounded rounded-bl-sm bg-teams-canvas" />
      </div>
    </div>
    <div className="ml-auto flex max-w-[75%] animate-pulse flex-col items-end gap-2">
      <div className="h-2.5 w-20 rounded bg-teams-border" />
      <div className="bg-message-own-tint h-12 w-[70%] rounded rounded-br-sm" />
    </div>
    <div className="flex max-w-[75%] animate-pulse gap-3">
      <div className="h-8 w-8 shrink-0 rounded-full bg-teams-border" />
      <div className="min-w-0 flex-1 space-y-2">
        <div className="h-2.5 w-24 rounded bg-teams-border" />
        <div className="h-24 rounded rounded-bl-sm bg-teams-canvas" />
      </div>
    </div>
  </div>
);
