import { Camera, Lock, Search, Users, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { PublicProfile } from '@/types';
import { UserAvatar } from '@/components/user-avatar/user-avatar';
import { resolveDisplayName } from '@/utils/display-name';

const TEAMS_PURPLE = '#6264A7';

interface CreateGroupModalProps {
  open: boolean;
  profiles: PublicProfile[];
  onClose: () => void;
  onCreate: (
    title: string,
    memberIds: string[],
  ) => Promise<{ error: string | null }>;
}

type GroupPrivacy = 'private' | 'standard';

export const CreateGroupModal = ({
  open,
  profiles,
  onClose,
  onCreate,
}: CreateGroupModalProps) => {
  const [title, setTitle] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [privacy, setPrivacy] = useState<GroupPrivacy>('private');
  const [teamPhotoFile, setTeamPhotoFile] = useState<File | null>(null);
  const [teamPhotoPreview, setTeamPhotoPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!teamPhotoFile) {
      setTeamPhotoPreview(null);
      return;
    }
    const url = URL.createObjectURL(teamPhotoFile);
    setTeamPhotoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [teamPhotoFile]);

  const filteredProfiles = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) {
      return profiles;
    }
    return profiles.filter((p) => {
      const name = resolveDisplayName(p.email, p.display_name).toLowerCase();
      return (
        p.email.toLowerCase().includes(q) ||
        name.includes(q)
      );
    });
  }, [profiles, searchQuery]);

  const toggle = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleClose = useCallback(() => {
    if (submitting) {
      return;
    }
    setTitle('');
    setSearchQuery('');
    setSelected(new Set());
    setLocalError(null);
    setPrivacy('private');
    setTeamPhotoFile(null);
    onClose();
  }, [onClose, submitting]);

  const submit = useCallback(async () => {
    const t = title.trim();
    if (!t) {
      setLocalError('Enter a group name.');
      return;
    }
    if (selected.size === 0) {
      setLocalError('Select at least one person for the group.');
      return;
    }
    setSubmitting(true);
    setLocalError(null);
    const { error } = await onCreate(t, [...selected]);
    setSubmitting(false);
    if (error) {
      setLocalError(error);
      return;
    }
    handleClose();
  }, [handleClose, onCreate, selected, title]);

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          handleClose();
        }
      }}
    >
      <div
        className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-none bg-[#f3f2f1] shadow-2xl sm:max-h-[88vh] sm:rounded-lg"
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-group-title"
        onMouseDown={(e) => e.stopPropagation()}
        style={{ fontFamily: '"Segoe UI", system-ui, sans-serif' }}
      >
        {/* Teams-style header */}
        <div
          className="flex shrink-0 items-center justify-between px-4 py-3.5"
          style={{ backgroundColor: TEAMS_PURPLE }}
        >
          <h2
            id="create-group-title"
            className="text-lg font-semibold tracking-tight text-white"
          >
            New group
          </h2>
          <button
            type="button"
            onClick={handleClose}
            disabled={submitting}
            className="rounded p-1.5 text-white/95 transition-colors hover:bg-white/15 disabled:opacity-50"
            aria-label="Close"
          >
            <X className="h-5 w-5" strokeWidth={2} />
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pb-4 pt-5">
          {/* Team picture — preview only (not persisted yet) */}
          <div className="mb-6 flex flex-col items-center">
            <label className="flex cursor-pointer flex-col items-center gap-2">
              <span className="relative flex h-[88px] w-[88px] items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-slate-300 bg-white shadow-sm transition-colors hover:border-slate-400">
                {teamPhotoPreview ? (
                  <img
                    src={teamPhotoPreview}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <Users
                    className="h-10 w-10 text-slate-300"
                    strokeWidth={1.25}
                  />
                )}
                <span
                  className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full text-white shadow-md"
                  style={{ backgroundColor: TEAMS_PURPLE }}
                >
                  <Camera className="h-4 w-4" strokeWidth={2} />
                </span>
              </span>
              <span
                className="text-sm font-semibold"
                style={{ color: TEAMS_PURPLE }}
              >
                Add team picture
              </span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null;
                  setTeamPhotoFile(f);
                  e.target.value = '';
                }}
              />
            </label>
            <p className="mt-1 max-w-xs text-center text-xs text-slate-500">
              Optional — shown here only until group images are saved on the server.
            </p>
          </div>

          {/* Group type */}
          <fieldset className="mb-5">
            <legend className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-600">
              Group type
            </legend>
            <div className="space-y-2">
              <label className="flex cursor-pointer gap-3 rounded-md border border-slate-200 bg-white p-3 shadow-sm transition-colors has-[:checked]:border-[#6264A7] has-[:checked]:ring-1 has-[:checked]:ring-[#6264A7]/30">
                <input
                  type="radio"
                  name="group-privacy"
                  checked={privacy === 'private'}
                  onChange={() => setPrivacy('private')}
                  className="mt-0.5 h-4 w-4 shrink-0 border-slate-300"
                  style={{ accentColor: TEAMS_PURPLE }}
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                    <Lock className="h-3.5 w-3.5 text-slate-500" strokeWidth={2} />
                    Private
                  </div>
                  <p className="mt-0.5 text-xs leading-snug text-slate-500">
                    Only people you add can see chat and join.
                  </p>
                </div>
              </label>
              <label className="flex cursor-pointer gap-3 rounded-md border border-slate-200 bg-white p-3 shadow-sm transition-colors has-[:checked]:border-[#6264A7] has-[:checked]:ring-1 has-[:checked]:ring-[#6264A7]/30">
                <input
                  type="radio"
                  name="group-privacy"
                  checked={privacy === 'standard'}
                  onChange={() => setPrivacy('standard')}
                  className="mt-0.5 h-4 w-4 shrink-0"
                  style={{ accentColor: TEAMS_PURPLE }}
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                    <Users className="h-3.5 w-3.5 text-slate-500" strokeWidth={2} />
                    Standard
                  </div>
                  <p className="mt-0.5 text-xs leading-snug text-slate-500">
                    Same visibility as your other groups in this workspace.
                  </p>
                </div>
              </label>
            </div>
          </fieldset>

          <label
            htmlFor="group-name-input"
            className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-600"
          >
            Group name <span className="text-red-500">*</span>
          </label>
          <input
            id="group-name-input"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={submitting}
            placeholder="e.g. Design review"
            className="mb-5 w-full rounded border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-[#6264A7] focus:outline-none focus:ring-2 focus:ring-[#6264A7]/25 disabled:opacity-50"
          />

          <label
            htmlFor="group-member-search"
            className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-600"
          >
            Add people
          </label>
          <div className="relative mb-2">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              strokeWidth={2}
            />
            <input
              id="group-member-search"
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              disabled={submitting}
              placeholder="Search by name or email"
              className="w-full rounded border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-sm placeholder:text-slate-400 focus:border-[#6264A7] focus:outline-none focus:ring-2 focus:ring-[#6264A7]/25 disabled:opacity-50"
              autoComplete="off"
            />
          </div>

          {selected.size > 0 ? (
            <p className="mb-2 text-xs font-medium text-slate-600">
              {selected.size} selected
            </p>
          ) : null}

          {profiles.length === 0 ? (
            <p className="rounded-md border border-slate-200 bg-white p-4 text-sm text-slate-500">
              No other users registered yet.
            </p>
          ) : filteredProfiles.length === 0 ? (
            <p className="rounded-md border border-slate-200 bg-white p-4 text-sm text-slate-500">
              No people match your search.
            </p>
          ) : (
            <ul className="max-h-[min(240px,40vh)] overflow-y-auto rounded-md border border-slate-200 bg-white shadow-sm">
              {filteredProfiles.map((p) => {
                const checked = selected.has(p.id);
                const label = resolveDisplayName(p.email, p.display_name);
                return (
                  <li
                    key={p.id}
                    className="border-b border-slate-100 last:border-b-0"
                  >
                    <label className="flex cursor-pointer items-center gap-3 px-3 py-2.5 transition-colors hover:bg-slate-50">
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={submitting}
                        onChange={() => toggle(p.id)}
                        className="h-4 w-4 shrink-0 rounded border-slate-300"
                        style={{ accentColor: TEAMS_PURPLE }}
                      />
                      <UserAvatar
                        label={label}
                        email={p.email}
                        imageUrl={p.avatar_url}
                        sizeClass="h-9 w-9 text-xs"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-slate-900">
                          {label}
                        </span>
                        <span className="block truncate text-xs text-slate-500">
                          {p.email}
                        </span>
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}

          {localError ? (
            <p className="mt-3 text-sm text-red-600" role="alert">
              {localError}
            </p>
          ) : null}
        </div>

        <div className="shrink-0 border-t border-slate-200 bg-white px-4 py-3">
          <button
            type="button"
            disabled={submitting || profiles.length === 0}
            onClick={() => void submit()}
            className="w-full rounded bg-[#6264A7] py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#5558a0] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {submitting ? 'Creating…' : 'Create group'}
          </button>
        </div>
      </div>
    </div>
  );
};
