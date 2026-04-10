'use client';

import { Clock, LogOut } from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export default function PendingPage() {
  const router = useRouter();

  const handleSignOut = async () => {
    await getSupabaseClient().auth.signOut();
    router.push('/login');
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[#191c1f] px-4">
      <div className="flex flex-col items-center gap-5 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#ec7e00]/15">
          <Clock className="h-8 w-8 text-[#ec7e00]" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-[#f4f4f4]">승인 대기 중</h1>
          <p className="max-w-sm text-sm leading-relaxed text-[#8d969e]">
            회원가입이 완료되었습니다. 관리자가 계정을 승인하면 서비스를 이용할 수 있습니다.
          </p>
        </div>
      </div>
      <Button variant="outline" onClick={handleSignOut}>
        <LogOut className="mr-2 h-4 w-4" />
        로그아웃
      </Button>
    </div>
  );
}
