'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { Session, AuthChangeEvent } from '@supabase/supabase-js';
import { getSupabaseClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/store/authStore';
import type { Profile } from '@/types';

export function useAuth() {
  const { profile, loading, setProfile, setLoading } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    const supabase = getSupabaseClient();

    const fetchProfile = async (userId: string): Promise<Profile | null> => {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      return data as Profile | null;
    };

    const init = async () => {
      const { data } = await supabase.auth.getSession();
      const session: Session | null = data.session;
      if (session?.user) {
        const p = await fetchProfile(session.user.id);
        setProfile(p);
      } else {
        setProfile(null);
      }
      setLoading(false);
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event: AuthChangeEvent, session: Session | null) => {
        if (session?.user) {
          const p = await fetchProfile(session.user.id);
          setProfile(p);
        } else {
          setProfile(null);
        }
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, [setProfile, setLoading]);

  const signOut = async () => {
    const supabase = getSupabaseClient();
    await supabase.auth.signOut();
    setProfile(null);
    router.push('/login');
  };

  return { profile, loading, signOut };
}
