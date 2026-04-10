'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { TrendingUp } from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function LoginPage() {
  const router = useRouter();
  const { setProfile } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const supabase = getSupabaseClient();
    supabase.auth.signOut().then(() => setProfile(null));
  }, [setProfile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const supabase = getSupabaseClient();
    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });

    if (authError) {
      setError('이메일 또는 비밀번호가 올바르지 않습니다.');
      setLoading(false);
      return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('status')
      .eq('id', data.user.id)
      .single();

    router.push(profile?.status === 'approved' ? '/analysis' : '/pending');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#191c1f]">
      <div className="w-full max-w-sm space-y-8 px-4">
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#494fdf]">
            <TrendingUp className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#f4f4f4]">TodayAsset</h1>
          <p className="text-sm text-[#8d969e]">계정에 로그인하세요</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[#8d969e]">이메일</label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com" required autoComplete="email" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[#8d969e]">비밀번호</label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••" required autoComplete="current-password" />
          </div>

          {error && (
            <div className="rounded-xl border border-[#e23b4a]/25 bg-[#e23b4a]/10 px-4 py-3">
              <p className="text-sm text-[#e23b4a]">{error}</p>
            </div>
          )}

          <Button type="submit" className="w-full" size="lg" disabled={loading}>
            {loading ? '로그인 중...' : '로그인'}
          </Button>
        </form>

        <p className="text-center text-sm text-[#8d969e]">
          계정이 없으신가요?{' '}
          <Link href="/signup" className="font-medium text-[#494fdf] hover:text-[#7b80f0] transition-colors">
            회원가입
          </Link>
        </p>
      </div>
    </div>
  );
}
