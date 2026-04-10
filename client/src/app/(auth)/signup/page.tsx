'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { TrendingUp } from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== confirm) { setError('비밀번호가 일치하지 않습니다.'); return; }
    if (password.length < 6)  { setError('비밀번호는 6자 이상이어야 합니다.'); return; }

    setLoading(true);
    const supabase = getSupabaseClient();
    const { error: authError } = await supabase.auth.signUp({ email, password });

    if (authError) {
      setError(authError.message === 'User already registered'
        ? '이미 가입된 이메일입니다.'
        : '회원가입에 실패했습니다. 다시 시도해주세요.');
      setLoading(false);
      return;
    }
    router.push('/pending');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#191c1f]">
      <div className="w-full max-w-sm space-y-8 px-4">
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#494fdf]">
            <TrendingUp className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#f4f4f4]">TodayAsset</h1>
          <p className="text-sm text-[#8d969e]">새 계정을 만드세요</p>
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
              placeholder="••••••••" required autoComplete="new-password" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[#8d969e]">비밀번호 확인</label>
            <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)}
              placeholder="••••••••" required autoComplete="new-password" />
          </div>

          {error && (
            <div className="rounded-xl border border-[#e23b4a]/25 bg-[#e23b4a]/10 px-4 py-3">
              <p className="text-sm text-[#e23b4a]">{error}</p>
            </div>
          )}

          <Button type="submit" className="w-full" size="lg" disabled={loading}>
            {loading ? '가입 중...' : '회원가입'}
          </Button>
        </form>

        <p className="text-center text-sm text-[#8d969e]">
          이미 계정이 있으신가요?{' '}
          <Link href="/login" className="font-medium text-[#494fdf] hover:text-[#7b80f0] transition-colors">
            로그인
          </Link>
        </p>
      </div>
    </div>
  );
}
