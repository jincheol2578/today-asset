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

    async function init() {
      // localStorage에서 세션 읽기 — 새로고침해도 유지됨
      const { data: { session } } = await supabase.auth.getSession();
      if (!mounted) return;

      if (!session?.user) {
        setLoading(false);
        router.replace('/login');
        return;
      }

      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (mounted) {
        setProfile((data as Profile) ?? null);
        setLoading(false);
      }
    }

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (!mounted) return;
      if (event === 'SIGNED_OUT') {
        setProfile(null);
        setLoading(false);
        router.replace('/login');
      }
    });

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
  };

  return { profile, loading, signOut };
}
