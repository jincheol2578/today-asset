'use client';

import { Sidebar } from '@/components/layout/Sidebar';
import { useAuth } from '@/hooks/useAuth';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  useAuth();
  return (
    <div className="flex h-screen bg-[#191c1f]">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
