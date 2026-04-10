'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BarChart2, Search, Star, History, Users, Settings, LogOut, TrendingUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

const navItems = [
  { href: '/analysis', label: '시장 분석', icon: BarChart2 },
  { href: '/stock', label: '종목 분석', icon: Search },
  { href: '/watchlist', label: '관심종목', icon: Star },
  { href: '/history', label: '분석 히스토리', icon: History },
];

const adminItems = [
  { href: '/admin/users', label: '유저 관리', icon: Users },
  { href: '/admin/permissions', label: '권한 관리', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { profile, signOut } = useAuth();

  return (
    <aside className="flex h-screen w-56 flex-col border-r border-gray-800 bg-gray-950">
      {/* Logo */}
      <div className="flex h-14 items-center gap-2 border-b border-gray-800 px-4">
        <TrendingUp className="h-5 w-5 text-blue-400" />
        <span className="font-bold text-gray-100">TodayAsset</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1 px-2">
          {navItems.map(({ href, label, icon: Icon }) => (
            <li key={href}>
              <Link
                href={href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                  pathname === href
                    ? 'bg-gray-800 text-white'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            </li>
          ))}
        </ul>

        {profile?.role === 'admin' && (
          <>
            <div className="mx-4 my-3 border-t border-gray-800" />
            <p className="mb-1 px-5 text-xs font-semibold uppercase tracking-wider text-gray-500">
              관리자
            </p>
            <ul className="space-y-1 px-2">
              {adminItems.map(({ href, label, icon: Icon }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                      pathname.startsWith(href)
                        ? 'bg-gray-800 text-white'
                        : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </nav>

      {/* User */}
      <div className="border-t border-gray-800 p-4">
        <div className="mb-2 truncate text-xs text-gray-400">{profile?.email}</div>
        <button
          onClick={signOut}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-400 transition-colors hover:bg-gray-800 hover:text-white"
        >
          <LogOut className="h-4 w-4" />
          로그아웃
        </button>
      </div>
    </aside>
  );
}
