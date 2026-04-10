'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Search } from 'lucide-react';
import { api } from '@/lib/api';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';

interface StockData {
  ticker: string;
  name: string;
  analysis: string;
  analyzedAt: string;
}

function StockContent() {
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [result, setResult] = useState<StockData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const doSearch = async (q: string) => {
    if (!q.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await api.postStock(q.trim());
      setResult(res.data);
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message || '종목 분석 실패');
    } finally {
      setLoading(false);
    }
  };

  // Auto-search when coming from watchlist
  useEffect(() => {
    const q = searchParams.get('q');
    if (q) {
      setQuery(q);
      doSearch(q);
    }
  }, [searchParams]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    doSearch(query);
  };

  return (
    <div className="mx-auto max-w-4xl space-y-4 pt-4">
      <form onSubmit={handleSearch} className="flex gap-2">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="종목명 또는 티커 (예: 삼성전자, AAPL)"
          className="flex-1"
        />
        <Button type="submit" disabled={loading}>
          <Search className="mr-2 h-4 w-4" />
          {loading ? '분석 중...' : '분석'}
        </Button>
      </form>

      {error && <p className="text-sm text-red-400">{error}</p>}

      {loading && (
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-32" />
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-4 w-3/5" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </CardContent>
        </Card>
      )}

      {result && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                {result.name}
                <Badge variant="outline">{result.ticker}</Badge>
              </CardTitle>
              <span className="text-xs text-gray-500">{formatDate(result.analyzedAt)}</span>
            </div>
          </CardHeader>
          <CardContent>
            <pre className="whitespace-pre-wrap text-sm leading-relaxed text-gray-300">{result.analysis}</pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function StockPage() {
  return (
    <>
      <Header title="종목 분석" />
      <Suspense fallback={<div className="pt-4 text-gray-500">로딩 중...</div>}>
        <StockContent />
      </Suspense>
    </>
  );
}
