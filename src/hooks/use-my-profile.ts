import { useCallback, useEffect, useState } from 'react';
import { fetchMyProfile } from '@/services/profile-service';
import type { PublicProfile } from '@/types';

export const useMyProfile = (userId: string | undefined) => {
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(false);

  const reload = useCallback(async () => {
    if (!userId) {
      setProfile(null);
      return;
    }
    setLoading(true);
    const { profile: p, error } = await fetchMyProfile();
    if (!error && p) {
      setProfile(p);
    } else {
      setProfile(null);
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { profile, loading, reload, setProfile };
};
