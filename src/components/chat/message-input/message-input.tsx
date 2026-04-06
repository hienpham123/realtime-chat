import {
  Cloud,
  FileText,
  Image as ImageIcon,
  Paperclip,
  Send,
  Smile,
  Upload,
  X,
} from 'lucide-react';
import type { ChangeEvent } from 'react';
import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';

const QUICK_EMOJIS = ['😀', '👍', '❤️', '🎉', '🔥', '✨', '🙏', '👀'];
const MAX_STAGED_FILES = 5;

/** Only for the image toolbar button — must not be mixed into the generic file input. */
const IMAGE_ACCEPT = 'image/*';

/**
 * Generic file picker: no `accept` so all file types appear in the OS dialog.
 */

export type MessageInputHandle = {
  focus: () => void;
};

interface StagedFile {
  id: string;
  file: File;
  previewUrl: string | null;
}

interface MessageInputProps {
  onSend: (
    text: string,
    files: File[],
  ) => Promise<{ error: string | null }>;
  disabled?: boolean;
  placeholder?: string;
}

const makeId = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`;

const formatFileLabel = (name: string, max = 42): string => {
  if (name.length <= max) {
    return name;
  }
  return `${name.slice(0, max - 1)}…`;
};

export const MessageInput = forwardRef<MessageInputHandle, MessageInputProps>(
  (
    {
      onSend,
      disabled = false,
      placeholder = 'Type a message…',
    },
    ref,
  ) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const imageInputRef = useRef<HTMLInputElement>(null);
    const emojiPopoverRef = useRef<HTMLDivElement>(null);
    const attachMenuRef = useRef<HTMLDivElement>(null);
    const attachTriggerRef = useRef<HTMLButtonElement>(null);
    const [value, setValue] = useState('');
    const [staged, setStaged] = useState<StagedFile[]>([]);
    const [sending, setSending] = useState(false);
    const [emojiOpen, setEmojiOpen] = useState(false);
    const [attachMenuOpen, setAttachMenuOpen] = useState(false);
    const fileInputId = useId();
    const imageInputId = useId();
    const stagedRef = useRef(staged);
    stagedRef.current = staged;

    useImperativeHandle(ref, () => ({
      focus: () => textareaRef.current?.focus(),
    }));

    useEffect(
      () => () => {
        stagedRef.current.forEach((s) => {
          if (s.previewUrl) {
            URL.revokeObjectURL(s.previewUrl);
          }
        });
      },
      [],
    );

    useEffect(() => {
      if (!emojiOpen && !attachMenuOpen) {
        return;
      }
      const onPointerDown = (e: MouseEvent) => {
        const t = e.target as Node;
        if (emojiOpen && emojiPopoverRef.current?.contains(t)) {
          return;
        }
        if (emojiOpen && !emojiPopoverRef.current?.contains(t)) {
          setEmojiOpen(false);
        }
        if (
          attachMenuOpen &&
          !attachMenuRef.current?.contains(t) &&
          !attachTriggerRef.current?.contains(t)
        ) {
          setAttachMenuOpen(false);
        }
      };
      document.addEventListener('mousedown', onPointerDown);
      return () => document.removeEventListener('mousedown', onPointerDown);
    }, [emojiOpen, attachMenuOpen]);

    const canSend = value.trim().length > 0 || staged.length > 0;

    const clearStaged = useCallback((items: StagedFile[]) => {
      items.forEach((s) => {
        if (s.previewUrl) {
          URL.revokeObjectURL(s.previewUrl);
        }
      });
    }, []);

    const submit = async () => {
      if (disabled || sending || !canSend) {
        return;
      }
      setSending(true);
      const files = staged.map((s) => s.file);
      const toClear = [...staged];
      try {
        const { error } = await onSend(value, files);
        if (!error) {
          setValue('');
          clearStaged(toClear);
          setStaged([]);
        }
      } finally {
        setSending(false);
        setTimeout(() => {
          textareaRef.current?.focus();
        }, 0);
      }
    };

    const insertAtCursor = useCallback((chunk: string) => {
      const el = textareaRef.current;
      if (!el) {
        setValue((v) => `${v}${chunk}`);
        return;
      }
      const start = el.selectionStart ?? value.length;
      const end = el.selectionEnd ?? value.length;
      const next = `${value.slice(0, start)}${chunk}${value.slice(end)}`;
      setValue(next);
      requestAnimationFrame(() => {
        el.focus();
        const pos = start + chunk.length;
        el.setSelectionRange(pos, pos);
      });
    }, [value]);

    const appendPickedFiles = (picked: File[]) => {
      if (picked.length === 0) {
        return;
      }
      setStaged((prev) => {
        const next = [...prev];
        for (const file of picked) {
          if (next.length >= MAX_STAGED_FILES) {
            break;
          }
          const isImage = file.type.startsWith('image/');
          const previewUrl = isImage ? URL.createObjectURL(file) : null;
          next.push({ id: makeId(), file, previewUrl });
        }
        return next;
      });
    };

    const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
      const input = e.currentTarget;
      const picked = input.files ? Array.from(input.files) : [];
      input.value = '';
      appendPickedFiles(picked);
      setAttachMenuOpen(false);
    };

    const onImageChange = (e: ChangeEvent<HTMLInputElement>) => {
      const input = e.currentTarget;
      const picked = input.files ? Array.from(input.files) : [];
      input.value = '';
      appendPickedFiles(picked);
    };

    const openFilePicker = () => {
      fileInputRef.current?.click();
    };

    const removeStaged = (id: string) => {
      setStaged((prev) => {
        const item = prev.find((s) => s.id === id);
        if (item?.previewUrl) {
          URL.revokeObjectURL(item.previewUrl);
        }
        return prev.filter((s) => s.id !== id);
      });
    };

    const toolBtn =
      'rounded p-2 text-teams-text-secondary transition-colors hover:bg-teams-hover hover:text-primary disabled:opacity-40';

    const filePickerDisabled =
      disabled || sending || staged.length >= MAX_STAGED_FILES;

    return (
      <footer className="border-t border-teams-border bg-white p-4 sm:p-6">
        <input
          ref={fileInputRef}
          id={fileInputId}
          type="file"
          multiple
          tabIndex={-1}
          className="fixed left-[-100px] top-0 z-[100] m-0 block h-8 w-48 cursor-pointer border-0 p-0 opacity-0"
          aria-label="Attach files"
          onChange={onFileChange}
        />
        <input
          ref={imageInputRef}
          id={imageInputId}
          type="file"
          multiple
          accept={IMAGE_ACCEPT}
          tabIndex={-1}
          className="fixed left-[-100px] top-0 z-[100] m-0 block h-8 w-48 cursor-pointer border-0 p-0 opacity-0"
          aria-label="Attach images"
          onChange={onImageChange}
        />

        <div className="relative mx-auto max-w-4xl">
          <div className="rounded-lg border border-teams-border bg-white shadow-sm">
            {staged.length > 0 ? (
              <div className="space-y-2 border-b border-teams-border px-3 py-3">
                {staged.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center gap-3 rounded-md border border-teams-border bg-teams-canvas px-3 py-2.5 pr-2"
                  >
                    {s.previewUrl ? (
                      <img
                        src={s.previewUrl}
                        alt=""
                        className="h-10 w-10 shrink-0 rounded object-cover"
                      />
                    ) : (
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded border border-teams-border bg-white">
                        <FileText
                          className="h-5 w-5 text-teams-text-secondary"
                          strokeWidth={1.75}
                        />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-teams-text">
                        {formatFileLabel(s.file.name)}
                      </p>
                      <p className="truncate text-xs text-teams-text-secondary">
                        Uploads when you send · anyone in this chat can open the
                        link
                      </p>
                    </div>
                    <button
                      type="button"
                      className="shrink-0 rounded p-1.5 text-teams-text-secondary transition-colors hover:bg-black/5 hover:text-teams-text"
                      aria-label="Remove attachment"
                      onClick={() => removeStaged(s.id)}
                    >
                      <X className="h-4 w-4" strokeWidth={2} />
                    </button>
                  </div>
                ))}
              </div>
            ) : null}

            <textarea
              ref={textareaRef}
              rows={1}
              className="max-h-40 min-h-[44px] w-full resize-none border-0 bg-transparent px-3 py-3 text-sm text-teams-text placeholder:text-teams-text-secondary focus:outline-none focus:ring-0 disabled:opacity-50"
              placeholder={placeholder}
              value={value}
              disabled={disabled || sending}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  void submit();
                }
              }}
              aria-label="Message"
            />

            <div className="flex items-center justify-between gap-2 border-t border-teams-border px-2 py-1.5 sm:px-3">
              <div className="flex min-w-0 flex-1 items-center gap-0.5">
                <div className="relative" ref={emojiPopoverRef}>
                  {emojiOpen ? (
                    <div
                      className="absolute bottom-full left-0 z-20 mb-2 flex gap-1 rounded-md border border-teams-border bg-white p-2 shadow-lg"
                      role="listbox"
                      aria-label="Quick emoji"
                    >
                      {QUICK_EMOJIS.map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          className="rounded p-1.5 text-lg leading-none transition-colors hover:bg-teams-hover"
                          onClick={() => {
                            insertAtCursor(emoji);
                            setEmojiOpen(false);
                          }}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  ) : null}
                  <button
                    type="button"
                    className={toolBtn}
                    disabled={disabled || sending}
                    aria-label="Emoji"
                    aria-expanded={emojiOpen}
                    onClick={() => {
                      setAttachMenuOpen(false);
                      setEmojiOpen((o) => !o);
                    }}
                  >
                    <Smile className="h-5 w-5" strokeWidth={1.75} />
                  </button>
                </div>

                {filePickerDisabled ? (
                  <span
                    className={`${toolBtn} cursor-not-allowed opacity-40`}
                    aria-disabled
                  >
                    <ImageIcon className="h-5 w-5" strokeWidth={1.75} />
                  </span>
                ) : (
                  <label
                    htmlFor={imageInputId}
                    className={`${toolBtn} cursor-pointer`}
                    aria-label="Attach image"
                    onClick={() => {
                      setEmojiOpen(false);
                      setAttachMenuOpen(false);
                    }}
                  >
                    <ImageIcon className="h-5 w-5" strokeWidth={1.75} />
                  </label>
                )}

                <div className="relative">
                  <button
                    ref={attachTriggerRef}
                    type="button"
                    className={`${toolBtn} ${attachMenuOpen ? 'bg-teams-hover text-primary' : ''}`}
                    disabled={
                      disabled || sending || staged.length >= MAX_STAGED_FILES
                    }
                    aria-label="Attach file"
                    aria-expanded={attachMenuOpen}
                    onClick={() => {
                      setEmojiOpen(false);
                      setAttachMenuOpen((o) => !o);
                    }}
                  >
                    <Paperclip className="h-5 w-5" strokeWidth={1.75} />
                  </button>
                  {attachMenuOpen ? (
                    <div
                      ref={attachMenuRef}
                      className="absolute bottom-full left-0 z-20 mb-1 w-[min(100vw-2rem,280px)] rounded-md border border-teams-border bg-white py-1 shadow-lg"
                      role="menu"
                    >
                      <button
                        type="button"
                        role="menuitem"
                        disabled
                        className="flex w-full cursor-not-allowed items-center gap-3 px-3 py-2.5 text-left text-sm text-teams-text-secondary opacity-60"
                        title="Not available in this app"
                      >
                        <Cloud className="h-5 w-5 shrink-0 text-primary" strokeWidth={1.75} />
                        <span>Attach cloud file</span>
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        className="flex w-full cursor-pointer items-center gap-3 px-3 py-2.5 text-left text-sm text-teams-text transition-colors hover:bg-teams-hover"
                        onMouseDown={(ev) => {
                          ev.preventDefault();
                        }}
                        onClick={() => {
                          openFilePicker();
                        }}
                      >
                        <Upload className="h-5 w-5 shrink-0 text-primary" strokeWidth={1.75} />
                        <span>Upload from this device</span>
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2 pl-1">
                <div
                  className="hidden h-6 w-px bg-teams-border sm:block"
                  aria-hidden
                />
                <button
                  type="button"
                  onClick={() => void submit()}
                  disabled={disabled || sending || !canSend}
                  className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-white shadow-sm transition-colors hover:bg-primary-hover disabled:opacity-40"
                  aria-label="Send message"
                >
                  <Send className="h-[18px] w-[18px]" strokeWidth={2} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </footer>
    );
  },
);

MessageInput.displayName = 'MessageInput';
