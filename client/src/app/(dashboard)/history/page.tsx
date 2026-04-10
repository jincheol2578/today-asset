'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { History, ChevronRight } from 'lucide-react';
import { api } from '@/lib/api';
import { Header } from '@/components/layout/Header';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDate } from '@/lib/utils';

export default function HistoryPage() {
  const [dates, setDates] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getHistory()
      .then((res) => setDates(res.dates))
      .catch(() => setDates([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <Header title="분석 히스토리" />
      <div className="mx-auto max-w-2xl space-y-2 pt-4">
        {loading ? (
          [...Array(5)].map((_, i) => <Skeleton key={i} className="h-14 w-full" />)
        ) : dates.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-12 text-gray-500">
              <History className="h-10 w-10" />
              <p>분석 히스토리가 없습니다.</p>
            </CardContent>
          </Card>
        ) : (
          dates.map((date) => (
            <Link key={date} href={`/history/${date}`}>
              <Card className="cursor-pointer transition-colors hover:border-gray-600 hover:bg-gray-800/50">
                <CardContent className="flex items-center justify-between py-4">
                  <span className="text-gray-200">{formatDate(date)}</span>
                  <ChevronRight className="h-4 w-4 text-gray-500" />
                </CardContent>
              </Card>
            </Link>
          ))
        )}
      </div>
    </>
  );
}
