import { getSupabaseClient } from '@/lib/supabase-client';
import type { PublicProfile } from '@/types';

const PROFILE_LIST_LIMIT = 100;

const mapProfileRow = (row: Record<string, unknown>): PublicProfile => ({
  id: String(row.id),
  email: String(row.email ?? ''),
  created_at: String(row.created_at ?? ''),
  display_name:
    row.display_name === undefined || row.display_name === null
      ? null
      : String(row.display_name),
  avatar_url:
    row.avatar_url === undefined || row.avatar_url === null
      ? null
      : String(row.avatar_url),
});

export const fetchMyProfile = async (): Promise<{
  profile: PublicProfile | null;
  error: string | null;
}> => {
  try {
    const supabase = getSupabaseClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return { profile: null, error: userError?.message ?? 'Not authenticated' };
    }
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, created_at, display_name, avatar_url')
      .eq('id', user.id)
      .maybeSingle();

    if (error) {
      return { profile: null, error: error.message };
    }
    if (!data) {
      return { profile: null, error: null };
    }
    return { profile: mapProfileRow(data as Record<string, unknown>), error: null };
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to load profile';
    return { profile: null, error: message };
  }
};

export const updateMyProfile = async (patch: {
  displayName: string | null;
  avatarUrl?: string | null;
}): Promise<{ error: string | null }> => {
  try {
    const supabase = getSupabaseClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return { error: userError?.message ?? 'Not authenticated' };
    }

    const payload: Record<string, string | null> = {
      display_name: patch.displayName?.trim() ? patch.displayName.trim() : null,
    };
    if (patch.avatarUrl !== undefined) {
      payload.avatar_url = patch.avatarUrl?.trim() || null;
    }

    const { error } = await supabase
      .from('profiles')
      .update(payload)
      .eq('id', user.id);

    if (error) {
      return { error: error.message };
    }
    return { error: null };
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to update profile';
    return { error: message };
  }
};

export const uploadAvatarToStorage = async (
  file: File,
): Promise<{ url: string | null; error: string | null }> => {
  try {
    const supabase = getSupabaseClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return { url: null, error: userError?.message ?? 'Not authenticated' };
    }

    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    const allowed = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
    const safeExt = allowed.includes(ext) ? ext : 'jpg';
    const path = `${user.id}/avatar.${safeExt}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, file, {
        upsert: true,
        contentType: file.type || `image/${safeExt === 'jpg' ? 'jpeg' : safeExt}`,
      });

    if (uploadError) {
      return { url: null, error: uploadError.message };
    }

    const { data: pub } = supabase.storage.from('avatars').getPublicUrl(path);
    return { url: pub.publicUrl, error: null };
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to upload avatar';
    return { url: null, error: message };
  }
};

export const fetchProfilesExceptSelf = async (
  currentUserId: string,
): Promise<{ profiles: PublicProfile[]; error: string | null }> => {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, created_at, display_name, avatar_url')
      .neq('id', currentUserId)
      .order('email', { ascending: true })
      .limit(PROFILE_LIST_LIMIT);

    if (error) {
      return { profiles: [], error: error.message };
    }
    const rows = (data ?? []) as Record<string, unknown>[];
    return {
      profiles: rows.map((r) => mapProfileRow(r)),
      error: null,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to load users';
    return { profiles: [], error: message };
  }
};
