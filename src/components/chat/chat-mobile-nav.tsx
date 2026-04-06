import { Bookmark, LogOut, MessageCircle, Settings, Users, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { PublicProfile } from '@/types';
import { UserAvatar } from '@/components/user-avatar/user-avatar';
import { resolveDisplayName } from '@/utils/display-name';

export type ChatMobileNavTab = 'messages' | 'teams' | 'saved' | 'you';

interface ChatMobileNavProps {
  userEmail: string;
  displayName: string;
  avatarUrl?: string | null;
  profiles: PublicProfile[];
  profilesLoading: boolean;
  activeTab: ChatMobileNavTab;
  onTabChange: (tab: ChatMobileNavTab) => void;
  onSignOut: () => void;
  onSelectUserForDm: (userId: string) => void;
}

export const ChatMobileNav = ({
  userEmail,
  displayName,
  avatarUrl,
  profiles,
  profilesLoading,
  activeTab,
  onTabChange,
  onSignOut,
  onSelectUserForDm,
}: ChatMobileNavProps) => {
  const initial = (userEmail[0] ?? '?').toUpperCase();
  const sheetOpen = activeTab !== 'messages';

  const navButtonClass = (tab: ChatMobileNavTab) =>
    `flex flex-col items-center gap-1 ${
      activeTab === tab ? 'text-primary' : 'text-teams-text-secondary'
    }`;

  return (
    <>
      {sheetOpen ? (
        <div
          className="fixed inset-0 z-[60] flex flex-col bg-teams-canvas md:hidden"
          role="dialog"
          aria-modal="true"
          aria-label={activeTab === 'you' ? 'Your profile' : 'Navigation'}
        >
          <div className="flex items-center justify-between border-b border-teams-border bg-white px-4 py-3">
            <h2 className="text-sm font-semibold text-teams-text">
              {activeTab === 'teams' && 'People'}
              {activeTab === 'saved' && 'Saved'}
              {activeTab === 'you' && 'You'}
            </h2>
            <button
              type="button"
              onClick={() => onTabChange('messages')}
              className="rounded p-2 text-teams-text-secondary hover:bg-teams-hover"
              aria-label="Close"
            >
              <X className="h-5 w-5" strokeWidth={2} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {activeTab === 'teams' ? (
              <div className="space-y-1">
                {profilesLoading ? (
                  <p className="text-sm text-teams-text-secondary">Loading users…</p>
                ) : profiles.length === 0 ? (
                  <p className="text-sm text-teams-text-secondary">No other users yet.</p>
                ) : (
                  profiles.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      className="flex w-full items-center gap-3 rounded border border-teams-border bg-white px-3 py-3 text-left transition-colors hover:bg-teams-hover"
                      onClick={() => {
                        onSelectUserForDm(p.id);
                        onTabChange('messages');
                      }}
                    >
                      <UserAvatar
                        label={resolveDisplayName(p.email, p.display_name)}
                        email={p.email}
                        imageUrl={p.avatar_url}
                        sizeClass="h-10 w-10 text-sm"
                      />
                      <span className="min-w-0">
                        <span className="block truncate font-semibold text-teams-text">
                          {resolveDisplayName(p.email, p.display_name)}
                        </span>
                        <span className="block truncate text-xs text-teams-text-secondary">
                          {p.email}
                        </span>
                      </span>
                    </button>
                  ))
                )}
              </div>
            ) : null}
            {activeTab === 'saved' ? (
              <p className="text-sm text-teams-text-secondary">
                No saved messages yet. Use the desktop sidebar for full chat and
                group options.
              </p>
            ) : null}
            {activeTab === 'you' ? (
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <UserAvatar
                    label={displayName}
                    email={userEmail}
                    imageUrl={avatarUrl}
                    sizeClass="h-14 w-14 text-lg"
                  />
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-teams-text">{displayName}</p>
                    <p className="truncate text-sm text-teams-text-secondary">{userEmail}</p>
                  </div>
                </div>
                <Link
                  to="/settings"
                  className="flex w-full items-center justify-center gap-2 rounded border border-teams-border bg-white py-3 text-sm font-semibold text-primary transition-colors hover:bg-teams-hover"
                  onClick={() => onTabChange('messages')}
                >
                  <Settings className="h-4 w-4" strokeWidth={2} />
                  Profile &amp; settings
                </Link>
                <button
                  type="button"
                  onClick={() => void onSignOut()}
                  className="flex w-full items-center justify-center gap-2 rounded border border-teams-border bg-white py-3 text-sm font-semibold text-teams-text transition-colors hover:bg-teams-hover"
                >
                  <LogOut className="h-4 w-4" strokeWidth={2} />
                  Sign out
                </button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-between border-t border-teams-border bg-white px-6 py-2.5 md:hidden">
        <button
          type="button"
          className={navButtonClass('messages')}
          aria-current={activeTab === 'messages' ? 'page' : undefined}
          onClick={() => onTabChange('messages')}
        >
          <MessageCircle className="h-6 w-6" strokeWidth={2.25} />
          <span className="text-[10px] font-bold">Messages</span>
        </button>
        <button
          type="button"
          className={navButtonClass('teams')}
          onClick={() => onTabChange('teams')}
        >
          <Users className="h-6 w-6" strokeWidth={1.75} />
          <span className="text-[10px] font-bold">People</span>
        </button>
        <button
          type="button"
          className={navButtonClass('saved')}
          onClick={() => onTabChange('saved')}
        >
          <Bookmark className="h-6 w-6" strokeWidth={1.75} />
          <span className="text-[10px] font-bold">Saved</span>
        </button>
        <button
          type="button"
          className={navButtonClass('you')}
          onClick={() => onTabChange('you')}
        >
          <span className="flex h-6 w-6 items-center justify-center overflow-hidden rounded-full">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="flex h-full w-full items-center justify-center bg-teams-border text-[10px] font-bold text-teams-text">
                {initial}
              </span>
            )}
          </span>
          <span className="text-[10px] font-bold">You</span>
        </button>
      </nav>
    </>
  );
};
