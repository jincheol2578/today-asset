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
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();
        if (error) return null;
        return data as Profile | null;
      } catch {
        return null;
      }
    };

    const init = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const session: Session | null = data.session;
        if (session?.user) {
          const p = await fetchProfile(session.user.id);
          setProfile(p);
        } else {
          // 세션 없음 → 로그인 페이지로
          setProfile(null);
          router.replace('/login');
        }
      } catch {
        setProfile(null);
        router.replace('/login');
      } finally {
        setLoading(false);
      }
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
        try {
          if (event === 'SIGNED_OUT' || !session) {
            setProfile(null);
            router.replace('/login');
            return;
          }
          if (session?.user) {
            const p = await fetchProfile(session.user.id);
            setProfile(p);
          }
        } catch {
          setProfile(null);
          router.replace('/login');
        } finally {
          setLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [setProfile, setLoading, router]);

  const signOut = async () => {
    const supabase = getSupabaseClient();
    await supabase.auth.signOut();
    setProfile(null);
    router.push('/login');
  };

  return { profile, loading, signOut };
}
