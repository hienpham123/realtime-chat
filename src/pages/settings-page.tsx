import { ArrowLeft, Camera } from 'lucide-react';
import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { UserAvatar } from '@/components/user-avatar/user-avatar';
import { useAuth } from '@/hooks/use-auth';
import { useMyProfile } from '@/hooks/use-my-profile';
import {
  updateMyProfile,
  uploadAvatarToStorage,
} from '@/services/profile-service';
import { resolveDisplayName } from '@/utils/display-name';

export const SettingsPage = () => {
  const { user } = useAuth();
  const { profile, loading, reload } = useMyProfile(user?.id);
  const [displayName, setDisplayName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const email = user?.email ?? '';

  useEffect(() => {
    if (!profile) {
      return;
    }
    setDisplayName(profile.display_name ?? '');
    setPreview(profile.avatar_url);
    setRemoveAvatar(false);
    setFile(null);
  }, [profile]);

  useEffect(() => {
    if (!file) {
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    setRemoveAvatar(false);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    let nextAvatarUrl: string | null | undefined;
    if (removeAvatar) {
      nextAvatarUrl = null;
    } else if (file) {
      const { url, error: upErr } = await uploadAvatarToStorage(file);
      if (upErr || !url) {
        setError(upErr ?? 'Upload failed');
        setSaving(false);
        return;
      }
      nextAvatarUrl = url;
    } else {
      nextAvatarUrl = undefined;
    }

    const { error: upProfileErr } = await updateMyProfile({
      displayName: displayName.trim() || null,
      ...(nextAvatarUrl !== undefined ? { avatarUrl: nextAvatarUrl } : {}),
    });

    if (upProfileErr) {
      setError(upProfileErr);
      setSaving(false);
      return;
    }

    setFile(null);
    await reload();
    setSaving(false);
  };

  const previewLabel = resolveDisplayName(email, displayName || null);

  return (
    <div className="min-h-screen bg-teams-canvas px-4 py-10">
      <div className="mx-auto w-full max-w-lg">
        <Link
          to="/chat"
          className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary-hover"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={2} />
          Back to chat
        </Link>

        <div className="rounded border border-teams-border bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-semibold text-teams-text">Profile</h1>
          <p className="mt-1 text-sm text-teams-text-secondary">
            Update how your name and photo appear to others.
          </p>

          {loading && !profile ? (
            <p className="mt-8 text-sm text-teams-text-secondary">Loading…</p>
          ) : (
            <form className="mt-8 space-y-6" onSubmit={(ev) => void onSubmit(ev)}>
              {error ? (
                <p
                  className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
                  role="alert"
                >
                  {error}
                </p>
              ) : null}

              <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
                <div className="relative">
                  <UserAvatar
                    label={previewLabel}
                    email={email}
                    imageUrl={
                      removeAvatar ? null : preview ?? profile?.avatar_url
                    }
                    sizeClass="h-24 w-24 text-2xl"
                  />
                  <label className="absolute bottom-0 right-0 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-primary text-white shadow-md transition-colors hover:bg-primary-hover">
                    <Camera className="h-4 w-4" strokeWidth={2} />
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      className="sr-only"
                      onChange={(ev) => {
                        const f = ev.target.files?.[0];
                        setFile(f ?? null);
                        if (!f) {
                          setPreview(profile?.avatar_url ?? null);
                        }
                      }}
                    />
                  </label>
                </div>
                <div className="flex-1 space-y-2 text-center sm:text-left">
                  <p className="text-xs font-semibold uppercase tracking-wide text-teams-text-secondary">
                    Photo
                  </p>
                  <p className="text-sm text-teams-text-secondary">
                    JPG, PNG, WebP or GIF. Max 5 MB (Supabase bucket limit).
                  </p>
                  {(profile?.avatar_url || file) && !removeAvatar ? (
                    <button
                      type="button"
                      className="text-sm font-semibold text-red-600 hover:underline"
                      onClick={() => {
                        setRemoveAvatar(true);
                        setFile(null);
                        setPreview(null);
                      }}
                    >
                      Remove photo
                    </button>
                  ) : null}
                </div>
              </div>

              <div>
                <label
                  htmlFor="display-name"
                  className="mb-2 block text-xs font-semibold uppercase tracking-wide text-teams-text-secondary"
                >
                  Display name
                </label>
                <input
                  id="display-name"
                  type="text"
                  value={displayName}
                  onChange={(ev) => setDisplayName(ev.target.value)}
                  disabled={saving}
                  placeholder={resolveDisplayName(email, null)}
                  className="w-full rounded border border-teams-border px-4 py-3 text-sm text-teams-text focus:outline-none focus:ring-2 focus:ring-primary/25 disabled:opacity-50"
                  autoComplete="nickname"
                />
                <p className="mt-1 text-xs text-teams-text-secondary">
                  Email ({email}) is unchanged; sign-in still uses your account.
                </p>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full rounded bg-primary py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-hover disabled:opacity-40"
              >
                {saving ? 'Saving…' : 'Save changes'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
