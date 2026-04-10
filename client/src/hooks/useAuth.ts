'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { getSupabaseClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/store/authStore';
import type { Profile } from '@/types';

export function useAuth() {
  const { profile, loading, setProfile, setLoading } = useAuthStore();
  const router = useRouter();
  // router를 ref에 보관해 effect 클로저가 항상 최신 값 참조
  const routerRef = useRef(router);
  routerRef.current = router;

  useEffect(() => {
    const supabase = getSupabaseClient();

    const fetchProfile = async (userId: string): Promise<Profile | null> => {
      try {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();
        return (data as Profile) ?? null;
      } catch {
        return null;
      }
    };

    // onAuthStateChange 한 곳에서 모든 인증 상태를 처리
    // INITIAL_SESSION → 첫 로드 시 현재 세션
    // SIGNED_IN / TOKEN_REFRESHED → 세션 갱신
    // SIGNED_OUT → 로그아웃 (→ /login 이동)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
        if (event === 'SIGNED_OUT') {
          setProfile(null);
          setLoading(false);
          routerRef.current.replace('/login');
          return;
        }

        if (session?.user) {
          const p = await fetchProfile(session.user.id);
          setProfile(p);
          setLoading(false);
        } else if (event === 'INITIAL_SESSION') {
          // 미들웨어를 통과했지만 클라이언트 세션이 없는 엣지 케이스
          setProfile(null);
          setLoading(false);
          routerRef.current.replace('/login');
        }
        // TOKEN_REFRESHED 등 다른 이벤트에서 session이 잠깐 null이어도 redirect 안 함
      }
    );

    return () => subscription.unsubscribe();
  }, []); // 마운트 한 번만 실행 — router는 ref로 참조

  const signOut = async () => {
    const supabase = getSupabaseClient();
    // signOut 호출 → SIGNED_OUT 이벤트 → 위 핸들러가 /login으로 redirect
    await supabase.auth.signOut();
  };

  return { profile, loading, signOut };
}
