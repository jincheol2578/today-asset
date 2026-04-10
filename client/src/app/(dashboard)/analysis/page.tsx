'use client';

import { useState, useEffect } from 'react';
import { BarChart2, RefreshCw } from 'lucide-react';
import { api } from '@/lib/api';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDate } from '@/lib/utils';

export default function AnalysisPage() {
  const [content, setContent] = useState('');
  const [date, setDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');

  const loadToday = async () => {
    setLoading(true);
    setError('');
    try {
      const today = new Date().toISOString().slice(0, 10);
      const res = await api.getHistoryDate(today);
      setContent(res.data.content);
      setDate(res.data.date);
    } catch {
      setContent('');
      setDate('');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadToday(); }, []);

  const handleAnalyze = async () => {
    setRunning(true);
    setError('');
    try {
      const res = await api.postAnalyze();
      setContent(res.data.content);
      setDate(res.data.date);
    } catch (e: unknown) {
      const err = e as { message?: string };
      setError(err.message || '분석 실패');
    } finally {
      setRunning(false);
    }
  };

  return (
    <>
      <Header title="시장 분석" />
      <div className="mx-auto max-w-4xl space-y-4 pt-4">
        <div className="flex items-center justify-between">
          <div>
            {date && <p className="text-sm text-gray-400">{formatDate(date)} 기준</p>}
          </div>
          <Button onClick={handleAnalyze} disabled={running}>
            <RefreshCw className={`mr-2 h-4 w-4 ${running ? 'animate-spin' : ''}`} />
            {running ? '분석 중...' : '분석 실행'}
          </Button>
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <Card>
          <CardContent className="pt-6">
            {loading ? (
              <div className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-4/5" />
                <Skeleton className="h-4 w-3/5" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            ) : content ? (
              <pre className="prose-dark whitespace-pre-wrap text-sm leading-relaxed text-gray-300">{content}</pre>
            ) : (
              <div className="flex flex-col items-center gap-3 py-12 text-gray-500">
                <BarChart2 className="h-10 w-10" />
                <p>오늘의 분석 결과가 없습니다.</p>
                <p className="text-xs">분석 실행 버튼을 눌러 시장 분석을 시작하세요.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
