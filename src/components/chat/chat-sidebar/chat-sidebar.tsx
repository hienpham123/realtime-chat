import {
  ChevronDown,
  ChevronRight,
  ListFilter,
  LogOut,
  PanelLeftClose,
  PanelRight,
  Settings,
  SquarePen,
  UserPlus,
  Users,
  Video,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ConversationListItem } from '@/components/chat/chat-sidebar/conversation-list-item';
import type { ConversationSummary, PublicProfile } from '@/types';
import { UserAvatar } from '@/components/user-avatar/user-avatar';
import { resolveDisplayName } from '@/utils/display-name';

const SIDEBAR_COLLAPSED_KEY = 'realtime-chat-sidebar-collapsed';

interface ChatSidebarProps {
  currentUserId: string;
  conversations: ConversationSummary[];
  profiles: PublicProfile[];
  selectedConversationId: string | null;
  profilesLoading: boolean;
  onSelectConversation: (id: string) => void;
  onStartDirectWith: (userId: string) => void;
  onOpenCreateGroup: () => void;
  onSignOut: () => void;
  onFilterClick?: () => void;
  onVideoHeaderClick?: () => void;
  onInviteClick?: () => void;
}

export const ChatSidebar = ({
  currentUserId,
  conversations,
  profiles,
  selectedConversationId,
  profilesLoading,
  onSelectConversation,
  onStartDirectWith,
  onOpenCreateGroup,
  onSignOut,
  onFilterClick,
  onVideoHeaderClick,
  onInviteClick,
}: ChatSidebarProps) => {
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === 'undefined') {
      return false;
    }
    return window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1';
  });
  const [recentOpen, setRecentOpen] = useState(true);
  const [peopleOpen, setPeopleOpen] = useState(false);

  useEffect(() => {
    window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, collapsed ? '1' : '0');
  }, [collapsed]);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((v) => !v);
  }, []);

  const headerBtnClass =
    'rounded p-1.5 text-teams-text transition-colors hover:bg-black/5';

  return (
    <aside
      className={`hidden h-full shrink-0 flex-col border-r border-teams-border bg-teams-canvas transition-[width] duration-200 ease-out md:flex ${
        collapsed ? 'w-[56px]' : 'w-[300px]'
      }`}
      aria-label="Danh sách trò chuyện"
    >
      {collapsed ? (
        <div className="flex h-full flex-col items-center gap-2 py-3">
          <button
            type="button"
            onClick={toggleCollapsed}
            className={headerBtnClass}
            title="Mở rộng"
            aria-expanded="false"
            aria-label="Mở rộng bảng trò chuyện"
          >
            <PanelRight className="h-5 w-5" strokeWidth={2} />
          </button>
          <div className="pt-2 scrollbar-subtle flex w-full flex-1 flex-col items-center gap-2 overflow-y-auto px-1.5 pb-2">
            {conversations.map((c) => (
              <ConversationListItem
                key={c.id}
                conversation={c}
                selected={selectedConversationId === c.id}
                currentUserId={currentUserId}
                onSelect={() => onSelectConversation(c.id)}
                compact
              />
            ))}
          </div>
          <Link
            to="/settings"
            className={`${headerBtnClass} mb-1`}
            title="Cài đặt"
            aria-label="Cài đặt"
          >
            <Settings className="h-5 w-5" strokeWidth={2} />
          </Link>
        </div>
      ) : (
        <>
          <div className="flex shrink-0 items-center justify-between gap-1 px-3 pt-3 pb-2">
            <h2 className="min-w-0 truncate text-base font-bold text-teams-text">
              Trò chuyện
            </h2>
            <div className="flex shrink-0 items-center gap-0.5">
              <button
                type="button"
                className={headerBtnClass}
                aria-label="Lọc"
                title="Lọc"
                onClick={onFilterClick}
              >
                <ListFilter className="h-[18px] w-[18px]" strokeWidth={2} />
              </button>
              <button
                type="button"
                className={headerBtnClass}
                aria-label="Cuộc gọi video"
                title="Cuộc gọi video"
                onClick={onVideoHeaderClick}
              >
                <Video className="h-[18px] w-[18px]" strokeWidth={2} />
              </button>
              <button
                type="button"
                className={headerBtnClass}
                aria-label="Tin nhắn mới"
                title="Tin nhắn mới"
                onClick={onOpenCreateGroup}
              >
                <SquarePen className="h-[18px] w-[18px]" strokeWidth={2} />
              </button>
              <button
                type="button"
                className={headerBtnClass}
                onClick={toggleCollapsed}
                title="Thu gọn"
                aria-expanded="true"
                aria-label="Thu gọn bảng trò chuyện"
              >
                <PanelLeftClose className="h-[18px] w-[18px]" strokeWidth={2} />
              </button>
            </div>
          </div>

          <button
            type="button"
            className="mx-2 mb-2 flex items-center gap-2 rounded-lg border border-transparent px-2 py-2 text-left transition-colors hover:bg-white/60"
            onClick={onInviteClick}
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#ca5010] text-white shadow-sm">
              <Users className="h-4 w-4" strokeWidth={2} />
            </span>
            <span className="text-sm font-semibold text-teams-text">
              1 yêu cầu
            </span>
          </button>

          <div className="scrollbar-subtle min-h-0 flex-1 overflow-y-auto px-2">
            <button
              type="button"
              className="mb-1 flex w-full items-center gap-1 px-1 py-1 text-left text-xs font-bold uppercase tracking-wide text-teams-text-secondary"
              onClick={() => setRecentOpen((v) => !v)}
              aria-expanded={recentOpen}
            >
              {recentOpen ? (
                <ChevronDown className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
              ) : (
                <ChevronRight className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
              )}
              Gần đây
            </button>
            {recentOpen ? (
              <nav className="space-y-0.5 pb-3">
                {conversations.length === 0 ? (
                  <p className="px-2 py-2 text-sm text-teams-text-secondary">
                    Chưa có cuộc trò chuyện.
                  </p>
                ) : (
                  conversations.map((c) => (
                    <ConversationListItem
                      key={c.id}
                      conversation={c}
                      selected={selectedConversationId === c.id}
                      currentUserId={currentUserId}
                      onSelect={() => onSelectConversation(c.id)}
                    />
                  ))
                )}
              </nav>
            ) : null}

            <button
              type="button"
              className="mb-1 flex w-full items-center gap-1 px-1 py-1 text-left text-xs font-bold uppercase tracking-wide text-teams-text-secondary"
              onClick={() => setPeopleOpen((v) => !v)}
              aria-expanded={peopleOpen}
            >
              {peopleOpen ? (
                <ChevronDown className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
              ) : (
                <ChevronRight className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
              )}
              Mọi người
            </button>
            {peopleOpen ? (
              <div className="space-y-0.5 pb-3">
                {profilesLoading ? (
                  <p className="px-2 py-1 text-sm text-teams-text-secondary">
                    Đang tải…
                  </p>
                ) : profiles.length === 0 ? (
                  <p className="px-2 py-1 text-sm text-teams-text-secondary">
                    Chưa có người dùng khác.
                  </p>
                ) : (
                  profiles.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left transition-colors hover:bg-white/70"
                      onClick={() => onStartDirectWith(p.id)}
                    >
                      <div className="relative shrink-0">
                        <UserAvatar
                          label={resolveDisplayName(p.email, p.display_name)}
                          email={p.email}
                          imageUrl={p.avatar_url}
                          sizeClass="h-8 w-8 text-xs"
                        />
                        <span
                          className="absolute bottom-0 right-0 h-2 w-2 rounded-full border-2 border-teams-canvas bg-[#13a10e]"
                          aria-hidden
                        />
                      </div>
                      <span className="min-w-0 truncate text-sm font-semibold text-teams-text">
                        {resolveDisplayName(p.email, p.display_name)}
                      </span>
                    </button>
                  ))
                )}
              </div>
            ) : null}
          </div>

          <div className="mt-auto shrink-0 space-y-2 border-t border-teams-border/80 px-2 py-3">
            <button
              type="button"
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-teams-border bg-white py-2.5 text-sm font-semibold text-teams-text shadow-sm transition-colors hover:bg-teams-hover"
              onClick={onInviteClick}
            >
              <UserPlus className="h-4 w-4 shrink-0" strokeWidth={2} />
              <span className="truncate">Mời tham gia Teams Chats</span>
            </button>
            <div className="flex gap-1">
              <Link
                to="/settings"
                className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-teams-border bg-white py-2 text-xs font-semibold text-teams-text transition-colors hover:bg-teams-hover"
              >
                <Settings className="h-3.5 w-3.5" strokeWidth={2} />
                Cài đặt
              </Link>
              <button
                type="button"
                onClick={onSignOut}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-teams-border bg-white py-2 text-xs font-semibold text-teams-text transition-colors hover:bg-teams-hover"
              >
                <LogOut className="h-3.5 w-3.5" strokeWidth={2} />
                Đăng xuất
              </button>
            </div>
          </div>
        </>
      )}
    </aside>
  );
};
