'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { RefreshCw } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { api } from '@/lib/api';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { StockSearchInput } from '@/components/StockSearchInput';
import { StockChart, type CandleData } from '@/components/StockChart';
import { formatDate } from '@/lib/utils';

interface StockResult {
  ticker: string;
  name: string;
  analysis: string;
  analyzedAt: string;
}

function StockContent() {
  const searchParams = useSearchParams();
  const [selectedTicker, setSelectedTicker] = useState('');
  const [result, setResult]     = useState<StockResult | null>(null);
  const [candles, setCandles]   = useState<CandleData[]>([]);
  const [currency, setCurrency] = useState('USD');
  const [loading, setLoading]   = useState(false);
  const [chartLoading, setChartLoading] = useState(false);
  const [error, setError]       = useState('');

  const loadChart = async (ticker: string) => {
    setChartLoading(true);
    try {
      const res = await api.getStockChart(ticker, '1y');
      setCandles(res.data.candles);
      setCurrency(res.data.currency);
    } catch {
      setCandles([]);
    } finally {
      setChartLoading(false);
    }
  };

  const doAnalyze = async (ticker: string) => {
    if (!ticker.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    setCandles([]);

    // 차트와 AI 분석 병렬 실행
    loadChart(ticker);

    try {
      const res = await api.postStock(ticker.trim());
      setResult(res.data);
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message || '종목 분석 실패');
    } finally {
      setLoading(false);
    }
  };

  // watchlist에서 q 파라미터로 넘어올 때 자동 분석
  useEffect(() => {
    const q = searchParams.get('q');
    if (q) {
      setSelectedTicker(q);
      doAnalyze(q);
    }
  }, [searchParams]);

  const handleSelect = (stock: { ticker: string; name: string }) => {
    setSelectedTicker(stock.ticker);
    doAnalyze(stock.ticker);
  };

  return (
    <div className="mx-auto max-w-4xl space-y-4 pt-4">
      {/* 검색창 */}
      <div className="flex gap-2">
        <StockSearchInput onSelect={handleSelect} disabled={loading} />
        {selectedTicker && !loading && (
          <Button variant="outline" size="sm" onClick={() => doAnalyze(selectedTicker)} className="shrink-0">
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            재분석
          </Button>
        )}
      </div>

      {error && (
        <div className="rounded-xl border border-[#e23b4a]/25 bg-[#e23b4a]/10 px-4 py-3">
          <p className="text-sm text-[#e23b4a]">{error}</p>
        </div>
      )}

      {/* 차트 */}
      {(chartLoading || candles.length > 0) && (
        <Card>
          <CardContent className="pt-5">
            {chartLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-[280px] w-full" />
              </div>
            ) : (
              <StockChart
                candles={candles}
                ticker={selectedTicker}
                currency={currency}
              />
            )}
          </CardContent>
        </Card>
      )}

      {/* AI 분석 결과 */}
      {loading && (
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-32" />
          </CardHeader>
          <CardContent className="space-y-3">
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} className={`h-4 ${i % 3 === 2 ? 'w-3/5' : i % 2 === 0 ? 'w-full' : 'w-4/5'}`} />
            ))}
          </CardContent>
        </Card>
      )}

      {result && !loading && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                {result.name}
                <Badge variant="outline">{result.ticker}</Badge>
              </CardTitle>
              <span className="text-xs text-[#505a63]">{formatDate(result.analyzedAt)}</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="analysis-content text-sm">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{result.analysis}</ReactMarkdown>
            </div>
          </CardContent>
        </Card>
      )}

      {!loading && !result && !error && !chartLoading && candles.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-20 text-[#505a63]">
          <p className="text-sm">종목명이나 티커를 검색해서 선택하세요</p>
          <p className="text-xs">예: 삼성전자, AAPL, 005930.KS</p>
        </div>
      )}
    </div>
  );
}

export default function StockPage() {
  return (
    <>
      <Header title="종목 분석" />
      <Suspense fallback={<div className="pt-4 text-[#505a63] text-sm">로딩 중...</div>}>
        <StockContent />
      </Suspense>
    </>
  );
}
