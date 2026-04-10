'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import type { FeaturePermission, Role } from '@/types';

const ROLE_RANK: Record<Role, number> = { guest: 0, user: 1, admin: 2 };

export function usePermission(featureKey: string) {
  const { profile } = useAuthStore();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    if (!profile) return;
    api.getPermissions().then((res) => {
      const perm = res.data.find((p: FeaturePermission) => p.feature_key === featureKey);
      if (!perm) return setAllowed(false);
      setAllowed(ROLE_RANK[profile.role] >= ROLE_RANK[perm.min_role]);
    }).catch(() => setAllowed(false));
  }, [profile, featureKey]);

  return allowed;
}
