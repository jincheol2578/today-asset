'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, Star, TrendingUp } from 'lucide-react';
import { useWatchlist } from '@/hooks/useWatchlist';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

export default function WatchlistPage() {
  const router = useRouter();
  const { tickers, loading, add, remove } = useWatchlist();
  const [newTicker, setNewTicker] = useState('');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTicker.trim()) return;
    setAdding(true);
    setError('');
    try {
      await add(newTicker.trim());
      setNewTicker('');
      setOpen(false);
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message || '추가 실패');
    } finally {
      setAdding(false);
    }
  };

  const handleAnalyze = (ticker: string) => {
    router.push(`/stock?q=${encodeURIComponent(ticker)}`);
  };

  return (
    <>
      <Header title="관심종목" />
      <div className="mx-auto max-w-2xl space-y-4 pt-4">
        <div className="flex justify-end">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                종목 추가
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>관심종목 추가</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAdd} className="mt-4 space-y-4">
                <Input
                  value={newTicker}
                  onChange={(e) => setNewTicker(e.target.value)}
                  placeholder="종목명 또는 티커 (예: AAPL, 삼성전자)"
                  autoFocus
                />
                {error && <p className="text-sm text-red-400">{error}</p>}
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                    취소
                  </Button>
                  <Button type="submit" disabled={adding}>
                    {adding ? '추가 중...' : '추가'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : tickers.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-12 text-gray-500">
              <Star className="h-10 w-10" />
              <p>관심종목이 없습니다.</p>
              <p className="text-xs">종목을 추가하여 빠르게 분석할 수 있습니다.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {tickers.map((ticker) => (
              <Card key={ticker}>
                <CardContent className="flex items-center justify-between py-4">
                  <span className="font-mono text-gray-100">{ticker}</span>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleAnalyze(ticker)}
                      title="종목 분석"
                    >
                      <TrendingUp className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => remove(ticker)}
                      className="text-red-400 hover:text-red-300"
                      title="삭제"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
