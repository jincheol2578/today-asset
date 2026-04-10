'use client';

import { useState, useEffect } from 'react';
import { RefreshCw, BarChart2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { api } from '@/lib/api';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDate } from '@/lib/utils';

export default function AnalysisPage() {
  const [content, setContent] = useState('');
  const [date, setDate]       = useState('');
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError]     = useState('');

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
      <div className="flex items-center justify-between pb-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-[#f4f4f4]">시장 분석</h1>
          {date && <p className="mt-0.5 text-sm text-[#8d969e]">{formatDate(date)} 기준</p>}
        </div>
        <Button onClick={handleAnalyze} disabled={running}>
          <RefreshCw className={`mr-2 h-4 w-4 ${running ? 'animate-spin' : ''}`} />
          {running ? '분석 중 (최대 60초)...' : '분석 실행'}
        </Button>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-[#e23b4a]/25 bg-[#e23b4a]/10 px-4 py-3">
          <p className="text-sm text-[#e23b4a]">{error}</p>
        </div>
      )}

      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="space-y-3">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className={`h-4 ${i % 3 === 2 ? 'w-3/5' : i % 2 === 0 ? 'w-full' : 'w-4/5'}`} />
              ))}
            </div>
          ) : content ? (
            <div className="analysis-content text-sm">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 py-16 text-[#505a63]">
              <BarChart2 className="h-10 w-10" />
              <p className="font-medium">오늘의 분석 결과가 없습니다</p>
              <p className="text-xs">분석 실행 버튼을 눌러 시장 분석을 시작하세요</p>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
