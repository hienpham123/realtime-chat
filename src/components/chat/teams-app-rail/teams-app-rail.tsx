import { MessageCircle, Settings } from 'lucide-react';
import { Link } from 'react-router-dom';

export const TeamsAppRail = () => (
  <nav
    className="hidden h-full w-[52px] shrink-0 flex-col items-center border-r border-white/10 bg-teams-rail py-3 md:flex"
    aria-label="App navigation"
  >
    <div
      className="mb-3 flex h-9 w-9 items-center justify-center rounded bg-teams-purple text-xs font-bold text-white"
      title="Realtime Chat"
    >
      RC
    </div>
    <div className="flex flex-1 flex-col items-center gap-1 pt-2">
      <span
        className="rounded-md bg-white/15 p-2 text-white"
        title="Chat"
        aria-current="page"
      >
        <MessageCircle className="h-[22px] w-[22px]" strokeWidth={1.75} />
      </span>
    </div>
    <Link
      to="/settings"
      className="rounded-md p-2 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
      title="Settings"
      aria-label="Settings"
    >
      <Settings className="h-[22px] w-[22px]" strokeWidth={1.75} />
    </Link>
  </nav>
);
