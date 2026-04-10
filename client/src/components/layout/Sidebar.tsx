'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart2, Search, Star, History, Users, Settings, LogOut, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

const navItems = [
  { href: '/analysis',  label: '시장 분석',    icon: BarChart2 },
  { href: '/stock',     label: '종목 분석',    icon: Search },
  { href: '/watchlist', label: '관심종목',     icon: Star },
  { href: '/history',   label: '분석 히스토리', icon: History },
];

const adminItems = [
  { href: '/admin/users',       label: '유저 관리', icon: Users },
  { href: '/admin/permissions', label: '권한 관리', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { profile, signOut } = useAuth();

  return (
    <aside className="flex h-screen w-56 flex-col bg-[#191c1f]">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2.5 px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#494fdf]">
          <TrendingUp className="h-4 w-4 text-white" />
        </div>
        <span className="font-semibold tracking-tight text-[#f4f4f4]">TodayAsset</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-2">
        <ul className="space-y-0.5">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={cn(
                    'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150',
                    active
                      ? 'bg-[#494fdf]/15 text-[#7b80f0]'
                      : 'text-[#8d969e] hover:bg-[rgba(255,255,255,0.05)] hover:text-[#f4f4f4]'
                  )}
                >
                  <Icon className={cn('h-4 w-4', active ? 'text-[#494fdf]' : '')} />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>

        {profile?.role === 'admin' && (
          <>
            <div className="mx-2 my-4 border-t border-[rgba(255,255,255,0.07)]" />
            <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-[#505a63]">
              관리자
            </p>
            <ul className="space-y-0.5">
              {adminItems.map(({ href, label, icon: Icon }) => {
                const active = pathname.startsWith(href);
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      className={cn(
                        'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150',
                        active
                          ? 'bg-[#494fdf]/15 text-[#7b80f0]'
                          : 'text-[#8d969e] hover:bg-[rgba(255,255,255,0.05)] hover:text-[#f4f4f4]'
                      )}
                    >
                      <Icon className={cn('h-4 w-4', active ? 'text-[#494fdf]' : '')} />
                      {label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </nav>

      {/* User */}
      <div className="border-t border-[rgba(255,255,255,0.07)] p-3">
        <div className="mb-1 truncate px-3 text-xs text-[#505a63]">{profile?.email}</div>
        <button
          onClick={signOut}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-[#8d969e] transition-all duration-150 hover:bg-[rgba(255,255,255,0.05)] hover:text-[#f4f4f4]"
        >
          <LogOut className="h-4 w-4" />
          로그아웃
        </button>
      </div>
    </aside>
  );
}
