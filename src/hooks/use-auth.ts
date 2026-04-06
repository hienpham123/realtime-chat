import type { User } from '@supabase/supabase-js';
import { useEffect } from 'react';
import { getSupabaseClient, syncRealtimeAuth } from '@/lib/supabase-client';
import { getSessionUser } from '@/services/auth-service';
import { useAuthStore } from '@/stores/auth-store';

export const useAuth = () => {
  const user = useAuthStore((s) => s.user);
  const initialized = useAuthStore((s) => s.initialized);
  const setUser = useAuthStore((s) => s.setUser);
  const setInitialized = useAuthStore((s) => s.setInitialized);

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      const sessionUser = await getSessionUser();
      await syncRealtimeAuth();
      if (!cancelled) {
        setUser(sessionUser);
        setInitialized(true);
      }
    };

    void init();

    const supabase = getSupabaseClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event: string, session: { user: User | null } | null) => {
        void syncRealtimeAuth();
        if (!cancelled) {
          setUser(session?.user ?? null);
        }
      },
    );

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [setInitialized, setUser]);

  return { user, initialized };
};
