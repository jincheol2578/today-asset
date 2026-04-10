'use client';

import { Sidebar } from '@/components/layout/Sidebar';
import { useAuth } from '@/hooks/useAuth';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  // 미들웨어가 이미 인증/권한 검사를 함 — 클라이언트에서 재검사 불필요
  // useAuth는 사이드바/헤더에서 프로필 정보(이메일, 역할 표시)를 위해서만 사용
  useAuth();

  return (
    <div className="flex h-screen bg-gray-950">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
