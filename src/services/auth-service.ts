import type { User } from '@supabase/supabase-js';
import { getSupabaseClient } from '@/lib/supabase-client';

export interface AuthCredentials {
  email: string;
  password: string;
}

export const signInWithPassword = async (
  credentials: AuthCredentials,
): Promise<{ user: User | null; error: string | null }> => {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: credentials.email.trim(),
      password: credentials.password,
    });
    if (error) {
      return { user: null, error: error.message };
    }
    return { user: data.user ?? null, error: null };
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Sign in failed';
    return { user: null, error: message };
  }
};

export const signUpWithPassword = async (
  credentials: AuthCredentials,
): Promise<{ user: User | null; error: string | null }> => {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.auth.signUp({
      email: credentials.email.trim(),
      password: credentials.password,
    });
    if (error) {
      return { user: null, error: error.message };
    }
    return { user: data.user ?? null, error: null };
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Sign up failed';
    return { user: null, error: message };
  }
};

export const signOut = async (): Promise<{ error: string | null }> => {
  try {
    const supabase = getSupabaseClient();
    const { error } = await supabase.auth.signOut();
    if (error) {
      return { error: error.message };
    }
    return { error: null };
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Sign out failed';
    return { error: message };
  }
};

export const getSessionUser = async (): Promise<User | null> => {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      return null;
    }
    return data.session?.user ?? null;
  } catch {
    return null;
  }
};
