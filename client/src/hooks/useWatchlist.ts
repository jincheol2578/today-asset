'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';

export function useWatchlist() {
  const [tickers, setTickers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchWatchlist = useCallback(async () => {
    try {
      const res = await api.getWatchlist();
      setTickers(res.data.map((item) => item.ticker));
    } catch {
      setTickers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWatchlist();
  }, [fetchWatchlist]);

  const add = async (ticker: string) => {
    await api.addWatchlist(ticker);
    await fetchWatchlist();
  };

  const remove = async (ticker: string) => {
    await api.removeWatchlist(ticker);
    setTickers((prev) => prev.filter((t) => t !== ticker));
  };

  return { tickers, loading, add, remove, refresh: fetchWatchlist };
}
