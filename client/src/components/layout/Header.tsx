'use client';

import { useAuthStore } from '@/store/authStore';
import { Badge } from '@/components/ui/badge';

const roleBadge = {
  guest: { label: '게스트',  variant: 'secondary'  as const },
  user:  { label: '사용자',  variant: 'default'    as const },
  admin: { label: '관리자',  variant: 'success'    as const },
};

interface HeaderProps { title: string; }

export function Header({ title }: HeaderProps) {
  const { profile } = useAuthStore();
  const badge = profile ? roleBadge[profile.role] : null;

  return (
    <div className="flex items-center justify-between pb-6">
      <h1 className="text-xl font-semibold tracking-tight text-[#f4f4f4]">{title}</h1>
      {badge && <Badge variant={badge.variant}>{badge.label}</Badge>}
    </div>
  );
}
