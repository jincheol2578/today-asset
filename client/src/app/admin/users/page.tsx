'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import type { Profile } from '@/types';
import { formatDate } from '@/lib/utils';

const statusBadge = {
  pending: { label: '대기', variant: 'warning' as const },
  approved: { label: '승인', variant: 'success' as const },
  rejected: { label: '거절', variant: 'destructive' as const },
};

const roleBadge = {
  guest: { label: '게스트', variant: 'secondary' as const },
  user: { label: '사용자', variant: 'default' as const },
  admin: { label: '관리자', variant: 'outline' as const },
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);

  const fetchUsers = async () => {
    try {
      const res = await api.getAdminUsers();
      setUsers(res.data);
    } catch {
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleApprove = async (id: string) => {
    setActionId(id);
    await api.approveUser(id);
    await fetchUsers();
    setActionId(null);
  };

  const handleReject = async (id: string) => {
    setActionId(id);
    await api.rejectUser(id);
    await fetchUsers();
    setActionId(null);
  };

  const handleRoleChange = async (id: string, role: string) => {
    setActionId(id);
    await api.updateUserRole(id, role);
    await fetchUsers();
    setActionId(null);
  };

  return (
    <>
      <Header title="유저 관리" />
      <div className="mx-auto max-w-5xl pt-4">
        {loading ? (
          <div className="space-y-2">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-700">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700 bg-gray-900">
                  <th className="px-4 py-3 text-left text-gray-400">이메일</th>
                  <th className="px-4 py-3 text-left text-gray-400">역할</th>
                  <th className="px-4 py-3 text-left text-gray-400">상태</th>
                  <th className="px-4 py-3 text-left text-gray-400">가입일</th>
                  <th className="px-4 py-3 text-right text-gray-400">관리</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b border-gray-800 bg-gray-950 hover:bg-gray-900">
                    <td className="px-4 py-3 text-gray-200">{user.email}</td>
                    <td className="px-4 py-3">
                      <Select
                        value={user.role}
                        onValueChange={(v) => handleRoleChange(user.id, v)}
                        disabled={actionId === user.id}
                      >
                        <SelectTrigger className="h-7 w-24 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="guest">게스트</SelectItem>
                          <SelectItem value="user">사용자</SelectItem>
                          <SelectItem value="admin">관리자</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={statusBadge[user.status].variant}>
                        {statusBadge[user.status].label}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-gray-400">{formatDate(user.created_at)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        {user.status !== 'approved' && (
                          <Button
                            size="sm"
                            onClick={() => handleApprove(user.id)}
                            disabled={actionId === user.id}
                          >
                            승인
                          </Button>
                        )}
                        {user.status !== 'rejected' && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleReject(user.id)}
                            disabled={actionId === user.id}
                          >
                            거절
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
