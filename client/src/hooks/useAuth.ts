'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/store/authStore';
import type { Profile } from '@/types';

export function useAuth() {
  const { profile, loading, setProfile, setLoading } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    const supabase = getSupabaseClient();
    let mounted = true;

    const fetchProfile = async (userId: string): Promise<Profile | null> => {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      return (data as Profile) ?? null;
    };

    // getSession: 쿠키에서 직접 읽음 (네트워크 불필요, 빠름)
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!mounted) return;
      if (session?.user) {
        const p = await fetchProfile(session.user.id);
        if (mounted) {
          setProfile(p);
          setLoading(false);
        }
      } else {
        if (mounted) setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        if (event === 'SIGNED_OUT') {
          setProfile(null);
          setLoading(false);
          router.replace('/login');
          return;
        }

        if (event === 'SIGNED_IN' && session?.user) {
          const p = await fetchProfile(session.user.id);
          if (mounted) {
            setProfile(p);
            setLoading(false);
          }
        }

        // TOKEN_REFRESHED: 세션 갱신만 되므로 프로필 재조회 불필요
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const signOut = async () => {
    const supabase = getSupabaseClient();
    await supabase.auth.signOut();
    setProfile(null);
    router.replace('/login');
    router.refresh(); // 서버 캐시 초기화 + 미들웨어 재실행
  };

  return { profile, loading, signOut };
}
