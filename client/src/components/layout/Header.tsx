'use client';

import { useAuthStore } from '@/store/authStore';
import { Badge } from '@/components/ui/badge';

const roleBadge = {
  guest: { label: '게스트', variant: 'secondary' as const },
  user: { label: '사용자', variant: 'default' as const },
  admin: { label: '관리자', variant: 'success' as const },
};

interface HeaderProps {
  title: string;
}

export function Header({ title }: HeaderProps) {
  const { profile } = useAuthStore();
  const badge = profile ? roleBadge[profile.role] : null;

  return (
    <header className="flex h-14 items-center justify-between border-b border-gray-800 bg-gray-950 px-6">
      <h1 className="text-lg font-semibold text-gray-100">{title}</h1>
      {badge && <Badge variant={badge.variant}>{badge.label}</Badge>}
    </header>
  );
}
