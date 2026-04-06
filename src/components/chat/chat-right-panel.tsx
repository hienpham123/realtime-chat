import { Bolt, ChevronsLeft, ChevronsRight, Clock, FileText, Link2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import type { ConversationKind } from '@/types';
import type { ExtractedChatLink } from '@/utils/extract-chat-links';
import type {
  SharedFileItem,
  SharedImagePreview,
} from '@/utils/conversation-shared-summary';

const RIGHT_PANEL_EXPANDED_KEY = 'realtime-chat-right-panel-expanded';

interface ChatRightPanelProps {
  onJumpTo?: () => void;
  onRecent?: () => void;
  conversationLabel?: string | null;
  conversationKind?: ConversationKind;
  imagePreview: SharedImagePreview[];
  imageExtraCount: number;
  files: SharedFileItem[];
  links: ExtractedChatLink[];
}

export const ChatRightPanel = ({
  onJumpTo,
  onRecent,
  conversationLabel,
  conversationKind = 'channel',
  imagePreview,
  imageExtraCount,
  files,
  links,
}: ChatRightPanelProps) => {
  const [expanded, setExpanded] = useState(() => {
    if (typeof window === 'undefined') {
      return true;
    }
    return window.localStorage.getItem(RIGHT_PANEL_EXPANDED_KEY) !== '0';
  });

  useEffect(() => {
    window.localStorage.setItem(RIGHT_PANEL_EXPANDED_KEY, expanded ? '1' : '0');
  }, [expanded]);

  const collapse = useCallback(() => setExpanded(false), []);
  const openPanel = useCallback(() => setExpanded(true), []);

  const chatLine =
    conversationLabel == null || conversationLabel === ''
      ? null
      : conversationKind === 'channel'
        ? `# ${conversationLabel}`
        : conversationLabel;

  const railBtnClass =
    'rounded-md p-2 text-teams-text-secondary transition-colors hover:bg-teams-hover hover:text-teams-text';

  if (!expanded) {
    return (
      <aside
        className="hidden w-11 shrink-0 flex-col items-center border-l border-teams-border bg-white py-3 xl:flex"
        aria-label="Panel chi tiết — đang thu gọn"
      >
        <button
          type="button"
          onClick={openPanel}
          className={railBtnClass}
          title="Mở rộng panel"
          aria-expanded="false"
          aria-label="Mở rộng panel bên phải"
        >
          <ChevronsLeft className="h-5 w-5" strokeWidth={2} />
        </button>
      </aside>
    );
  }

  return (
    <aside className="hidden w-72 shrink-0 flex-col border-l border-teams-border bg-white xl:flex">
      <div className="flex shrink-0 items-center justify-end border-b border-teams-border px-2 py-2">
        <button
          type="button"
          onClick={collapse}
          className={railBtnClass}
          title="Thu gọn panel"
          aria-expanded="true"
          aria-label="Thu gọn panel bên phải"
        >
          <ChevronsRight className="h-5 w-5" strokeWidth={2} />
        </button>
      </div>
      <div className="scrollbar-subtle min-h-0 flex-1 overflow-y-auto p-5 sm:p-6">
        <h3 className="mb-4 text-[11px] font-semibold uppercase tracking-wide text-teams-text-secondary">
          Shortcuts
        </h3>
        <div className="mb-8 grid grid-cols-2 gap-2">
          <button
            type="button"
            className="group flex cursor-pointer flex-col gap-2 rounded border border-teams-border bg-teams-canvas p-3 text-left transition-colors hover:border-primary/30 hover:bg-white"
            onClick={onJumpTo}
          >
            <span className="flex h-9 w-9 items-center justify-center rounded bg-white text-primary shadow-sm transition-colors group-hover:bg-primary group-hover:text-white">
              <Bolt className="h-5 w-5" strokeWidth={1.75} />
            </span>
            <span className="text-sm font-semibold text-teams-text">Jump to</span>
          </button>
          <button
            type="button"
            className="group flex cursor-pointer flex-col gap-2 rounded border border-teams-border bg-teams-canvas p-3 text-left transition-colors hover:border-primary/30 hover:bg-white"
            onClick={onRecent}
          >
            <span className="flex h-9 w-9 items-center justify-center rounded bg-white text-primary shadow-sm transition-colors group-hover:bg-primary group-hover:text-white">
              <Clock className="h-5 w-5" strokeWidth={1.75} />
            </span>
            <span className="text-sm font-semibold text-teams-text">Recent</span>
          </button>
        </div>

        <h3 className="mb-4 text-[11px] font-semibold uppercase tracking-wide text-teams-text-secondary">
          Chat
        </h3>
        <div className="mb-8">
          {chatLine ? (
            <div className="flex items-center gap-2 py-0.5">
              <div className="h-2 w-2 shrink-0 rounded-full bg-primary" />
              <span className="truncate text-sm font-medium text-teams-text">
                {chatLine}
              </span>
            </div>
          ) : (
            <p className="text-sm text-teams-text-secondary">No chat selected</p>
          )}
        </div>

        <h3 className="mb-4 text-[11px] font-semibold uppercase tracking-wide text-teams-text-secondary">
          Files
        </h3>
        <div className="mb-8">
          {imagePreview.length === 0 && files.length === 0 ? (
            <p className="text-sm text-teams-text-secondary">
              No images or files shared in this chat yet.
            </p>
          ) : (
            <>
              {imagePreview.length > 0 || imageExtraCount > 0 ? (
                <div className="mb-3 grid grid-cols-2 gap-2">
                  {imagePreview.map((img) => (
                    <a
                      key={img.key}
                      href={img.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="aspect-square overflow-hidden rounded border border-teams-border bg-teams-canvas"
                    >
                      <img
                        src={img.url}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    </a>
                  ))}
                  {imageExtraCount > 0 ? (
                    <div className="flex aspect-square items-center justify-center rounded border border-dashed border-teams-border bg-teams-canvas text-xs font-semibold text-teams-text-secondary">
                      +{imageExtraCount}
                    </div>
                  ) : null}
                </div>
              ) : null}
              {files.length > 0 ? (
                <ul className="space-y-2">
                  {files.slice(0, 12).map((f) => (
                    <li key={f.key}>
                      <a
                        href={f.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 rounded border border-teams-border bg-teams-canvas px-2 py-2 text-sm transition-colors hover:bg-teams-hover"
                      >
                        <FileText
                          className="h-4 w-4 shrink-0 text-primary"
                          strokeWidth={2}
                        />
                        <span className="min-w-0 truncate font-medium text-teams-text">
                          {f.name}
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
              ) : null}
            </>
          )}
        </div>

        <h3 className="mb-4 text-[11px] font-semibold uppercase tracking-wide text-teams-text-secondary">
          Links
        </h3>
        <div className="mb-8 space-y-2">
          {links.length === 0 ? (
            <p className="text-sm text-teams-text-secondary">
              Links you paste in messages appear here.
            </p>
          ) : (
            links.map((link) => (
              <a
                key={link.url}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-3 rounded border border-teams-border bg-white p-3 shadow-sm transition-colors hover:bg-teams-hover"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-primary-light text-primary">
                  <Link2 className="h-4 w-4" strokeWidth={2} />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-teams-text">
                    {link.title}
                  </p>
                  <p className="text-[10px] text-teams-text-secondary">{link.host}</p>
                </div>
              </a>
            ))
          )}
        </div>

        <div className="mt-auto rounded border border-teams-border bg-primary-light/60 p-3">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-primary">
            Tip
          </p>
          <p className="text-xs font-medium leading-relaxed text-teams-text">
            Use the paperclip → Upload from this device (or the image icon) to
            attach files; they show in the thread and in Files. Paste a URL in a
            message to list it under Links.
          </p>
        </div>
      </div>
    </aside>
  );
};
