import { Bookmark, MessageCircle, Search, Settings, Users } from 'lucide-react';
import { TeamsAppRail } from '@/components/chat/teams-app-rail/teams-app-rail';

const SkeletonBar = ({ className }: { className: string }) => (
  <div
    className={`animate-pulse rounded-full bg-teams-border/80 ${className}`}
    aria-hidden
  />
);

const SkeletonBox = ({ className }: { className: string }) => (
  <div
    className={`animate-pulse rounded border border-teams-border bg-teams-canvas ${className}`}
    aria-hidden
  />
);

export const ChatLoading = () => (
  <div className="flex h-screen overflow-hidden bg-teams-canvas font-sans">
    <TeamsAppRail />
    <nav
      className="flex h-full w-[280px] shrink-0 flex-col border-r border-teams-border bg-white px-2 py-4"
      aria-busy
      aria-label="Loading sidebar"
    >
      <div className="mb-5 flex items-center gap-2 px-2">
        <div className="flex h-9 w-9 items-center justify-center rounded bg-primary text-xs font-bold text-white">
          RC
        </div>
        <SkeletonBar className="h-4 w-28" />
      </div>
      <div className="mb-4 flex items-center gap-3 rounded-md border border-teams-border bg-teams-canvas px-2 py-2">
        <SkeletonBox className="h-9 w-9 rounded-full border-0" />
        <div className="flex flex-col gap-1.5">
          <SkeletonBar className="h-3 w-24" />
          <SkeletonBar className="h-2 w-16 opacity-70" />
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-3 rounded border-l-[3px] border-primary bg-teams-hover py-2 px-3 font-semibold text-teams-text">
          <MessageCircle className="h-5 w-5" strokeWidth={1.75} />
          <span className="text-sm">Chat</span>
        </div>
        <div className="flex items-center gap-3 rounded py-2 px-3 font-medium text-teams-text-secondary">
          <Users className="h-5 w-5" strokeWidth={1.75} />
          <span className="text-sm">People</span>
        </div>
        <div className="flex items-center gap-3 rounded py-2 px-3 font-medium text-teams-text-secondary">
          <Bookmark className="h-5 w-5" strokeWidth={1.75} />
          <span className="text-sm">Saved</span>
        </div>
        <div className="flex items-center gap-3 rounded py-2 px-3 font-medium text-teams-text-secondary">
          <Settings className="h-5 w-5" strokeWidth={1.75} />
          <span className="text-sm">Settings</span>
        </div>
      </div>
      <div className="mt-8 px-2">
        <SkeletonBar className="mb-3 h-2 w-16 opacity-50" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <SkeletonBox className="h-8 w-8 rounded-full border-0" />
              <SkeletonBar className="h-2 w-28" />
            </div>
          ))}
        </div>
      </div>
    </nav>
    <main className="flex min-w-0 flex-1 flex-col border-l border-teams-border bg-white">
      <header className="sticky top-0 z-40 flex w-full items-center justify-between border-b border-teams-border bg-white px-6 py-3 sm:px-8">
        <div className="flex flex-1 items-center gap-6">
          <div className="relative w-full max-w-md">
            <SkeletonBar className="h-9 w-full rounded border opacity-60" />
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-teams-text-secondary"
              strokeWidth={1.75}
            />
          </div>
        </div>
        <div className="flex items-center gap-4">
          <SkeletonBox className="h-9 w-9 rounded-full border-0" />
        </div>
      </header>
      <div className="scrollbar-subtle flex-1 space-y-6 overflow-y-auto bg-white p-6 sm:p-8">
        <div className="flex justify-center">
          <SkeletonBar className="h-4 w-24 opacity-40" />
        </div>
        <div className="flex max-w-2xl items-end gap-3">
          <SkeletonBox className="h-10 w-10 shrink-0 rounded-full border-0" />
          <div className="flex flex-col items-start space-y-2">
            <SkeletonBox className="h-16 w-64 rounded rounded-bl-sm border-0" />
            <SkeletonBar className="ml-1 h-2 w-12 opacity-50" />
          </div>
        </div>
        <div className="ml-auto flex max-w-2xl flex-row-reverse items-end gap-3">
          <SkeletonBox className="h-10 w-10 shrink-0 rounded-full border-0" />
          <div className="flex flex-col items-end space-y-2">
            <div
              className="bg-message-own-tint-strong h-24 w-80 animate-pulse rounded rounded-br-sm"
              aria-hidden
            />
            <SkeletonBar className="mr-1 h-2 w-12 opacity-50" />
          </div>
        </div>
        <div className="flex max-w-2xl items-end gap-3">
          <SkeletonBox className="h-10 w-10 shrink-0 rounded-full border-0" />
          <div className="flex flex-col items-start space-y-2">
            <SkeletonBox className="h-12 w-48 rounded border-0" />
            <SkeletonBox className="h-20 w-72 rounded rounded-bl-sm border-0" />
          </div>
        </div>
      </div>
      <footer className="border-t border-teams-border bg-white p-6 pt-0 sm:p-8">
        <div className="flex items-center gap-4 rounded-lg border border-teams-border bg-teams-canvas py-3 px-4">
          <SkeletonBox className="h-6 w-6 rounded-full border-0 opacity-40" />
          <SkeletonBar className="h-4 flex-1 opacity-30" />
        </div>
      </footer>
    </main>
    <aside
      className="hidden w-72 shrink-0 flex-col space-y-6 border-l border-teams-border bg-white p-6 lg:flex"
      aria-hidden
    >
      <SkeletonBox className="mx-auto h-24 w-24 rounded-full border-0" />
      <div className="grid grid-cols-3 gap-3 pt-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex flex-col items-center gap-2">
            <SkeletonBox className="h-10 w-10 rounded-full border-0" />
            <SkeletonBar className="h-2 w-8" />
          </div>
        ))}
      </div>
    </aside>
  </div>
);
