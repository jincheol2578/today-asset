import { getSupabaseClient } from './supabase/client';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const supabase = getSupabaseClient();
  const { data: { session } } = await supabase.auth.getSession();

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
      ...(options?.headers ?? {}),
    },
  });

  if (res.status === 401 || res.status === 403) {
    const body = await res.json().catch(() => ({}));
    // 세션 만료 → 로그아웃 후 로그인으로 이동
    supabase.auth.signOut().finally(() => {
      window.location.href = '/login';
    });
    throw Object.assign(new Error(body.error || `HTTP ${res.status}`), { status: res.status });
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `API error ${res.status}`);
  }

  return res.json();
}

export const api = {
  // 시장 분석
  postAnalyze: (extraContext?: string) =>
    apiFetch<{ success: boolean; data: { date: string; content: string } }>('/api/analyze', {
      method: 'POST',
      body: JSON.stringify({ extraContext }),
    }),
  getMarket: () => apiFetch<{ success: boolean; data: unknown }>('/api/market'),

  // 종목 분석
  postStock: (query: string, extraContext?: string) =>
    apiFetch<{ success: boolean; data: { ticker: string; name: string; analysis: string; analyzedAt: string } }>('/api/stock', {
      method: 'POST',
      body: JSON.stringify({ query, extraContext }),
    }),

  // 히스토리
  getHistory: () => apiFetch<{ success: boolean; dates: string[] }>('/api/history'),
  getHistoryDate: (date: string) =>
    apiFetch<{ success: boolean; data: { date: string; content: string } }>(`/api/history/${date}`),

  // 종목 검색 (드롭다운)
  searchStocks: (q: string) =>
    apiFetch<{ success: boolean; data: { code: string; name: string; market: string; ticker: string }[] }>(
      `/api/search?q=${encodeURIComponent(q)}`
    ),

  // 차트 데이터
  getStockChart: (ticker: string, range = '1y') =>
    apiFetch<{
      success: boolean;
      data: {
        ticker: string;
        currency: string;
        candles: { date: string; open: number; high: number; low: number; close: number; ma50: number | null; ma200: number | null }[];
      };
    }>(`/api/stock/chart?ticker=${encodeURIComponent(ticker)}&range=${range}`),

  // 관심종목
  getWatchlist: () => apiFetch<{ success: boolean; data: { ticker: string; added_at: string }[] }>('/api/watchlist'),
  addWatchlist: (ticker: string) =>
    apiFetch<{ success: boolean; data: { ticker: string; name: string } }>('/api/watchlist', {
      method: 'POST',
      body: JSON.stringify({ ticker }),
    }),
  removeWatchlist: (ticker: string) =>
    apiFetch<{ success: boolean }>(`/api/watchlist/${encodeURIComponent(ticker)}`, { method: 'DELETE' }),

  // 관리자 - 유저
  getAdminUsers: () => apiFetch<{ success: boolean; data: import('@/types').Profile[] }>('/api/admin/users'),
  approveUser: (id: string) => apiFetch<{ success: boolean }>(`/api/admin/users/${id}/approve`, { method: 'PATCH' }),
  rejectUser: (id: string) => apiFetch<{ success: boolean }>(`/api/admin/users/${id}/reject`, { method: 'PATCH' }),
  updateUserRole: (id: string, role: string) =>
    apiFetch<{ success: boolean }>(`/api/admin/users/${id}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    }),

  // 관리자 - 권한
  getPermissions: () => apiFetch<{ success: boolean; data: import('@/types').FeaturePermission[] }>('/api/admin/permissions'),
  updatePermission: (feature: string, min_role: string) =>
    apiFetch<{ success: boolean }>(`/api/admin/permissions/${feature}`, {
      method: 'PATCH',
      body: JSON.stringify({ min_role }),
    }),
};
