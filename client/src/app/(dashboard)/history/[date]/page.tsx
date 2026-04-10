'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { api } from '@/lib/api';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDate } from '@/lib/utils';

export default function HistoryDatePage() {
  const { date } = useParams<{ date: string }>();
  const router = useRouter();
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getHistoryDate(date)
      .then((res) => setContent(res.data.content))
      .catch(() => setError('분석 결과를 불러오지 못했습니다.'))
      .finally(() => setLoading(false));
  }, [date]);

  return (
    <>
      <Header title={formatDate(date)} />
      <div className="mx-auto max-w-4xl space-y-4 pt-4">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          목록으로
        </Button>

        <Card>
          <CardContent className="pt-6">
            {loading ? (
              <div className="space-y-3">
                {[...Array(6)].map((_, i) => (
                  <Skeleton key={i} className="h-4 w-full" />
                ))}
              </div>
            ) : error ? (
              <p className="text-center text-red-400">{error}</p>
            ) : (
              <pre className="whitespace-pre-wrap text-sm leading-relaxed text-gray-300">{content}</pre>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
