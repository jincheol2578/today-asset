'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Header } from '@/components/layout/Header';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import type { FeaturePermission } from '@/types';
import { formatDate } from '@/lib/utils';

export default function AdminPermissionsPage() {
  const [permissions, setPermissions] = useState<FeaturePermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    api.getPermissions()
      .then((res) => setPermissions(res.data))
      .catch(() => setPermissions([]))
      .finally(() => setLoading(false));
  }, []);

  const handleChange = async (feature: string, min_role: string) => {
    setSaving(feature);
    try {
      await api.updatePermission(feature, min_role);
      setPermissions((prev) =>
        prev.map((p) =>
          p.feature_key === feature
            ? { ...p, min_role: min_role as FeaturePermission['min_role'], updated_at: new Date().toISOString() }
            : p
        )
      );
    } catch {
      // ignore
    } finally {
      setSaving(null);
    }
  };

  return (
    <>
      <Header title="권한 관리" />
      <div className="mx-auto max-w-2xl pt-4">
        {loading ? (
          <div className="space-y-2">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-700">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700 bg-gray-900">
                  <th className="px-4 py-3 text-left text-gray-400">기능</th>
                  <th className="px-4 py-3 text-left text-gray-400">최소 역할</th>
                  <th className="px-4 py-3 text-left text-gray-400">최종 수정</th>
                </tr>
              </thead>
              <tbody>
                {permissions.map((perm) => (
                  <tr key={perm.feature_key} className="border-b border-gray-800 bg-gray-950 hover:bg-gray-900">
                    <td className="px-4 py-3 text-gray-200">{perm.label_ko || perm.feature_key}</td>
                    <td className="px-4 py-3">
                      <Select
                        value={perm.min_role}
                        onValueChange={(v) => handleChange(perm.feature_key, v)}
                        disabled={saving === perm.feature_key}
                      >
                        <SelectTrigger className="h-7 w-28 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="guest">게스트</SelectItem>
                          <SelectItem value="user">사용자</SelectItem>
                          <SelectItem value="admin">관리자</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{formatDate(perm.updated_at)}</td>
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
