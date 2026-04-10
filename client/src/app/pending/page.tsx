'use client';

import { Clock, LogOut } from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export default function PendingPage() {
  const router = useRouter();

  const handleSignOut = async () => {
    const supabase = getSupabaseClient();
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-gray-950 px-4">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-yellow-900/30">
          <Clock className="h-8 w-8 text-yellow-400" />
        </div>
        <h1 className="text-2xl font-bold text-gray-100">승인 대기 중</h1>
        <p className="max-w-sm text-gray-400">
          회원가입이 완료되었습니다. 관리자가 계정을 승인하면 서비스를 이용할 수 있습니다.
          승인까지 잠시 기다려 주세요.
        </p>
      </div>
      <Button variant="outline" onClick={handleSignOut}>
        <LogOut className="mr-2 h-4 w-4" />
        로그아웃
      </Button>
    </div>
  );
}
