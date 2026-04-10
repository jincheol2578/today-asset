'use client';

import { useState } from 'react';
import {
  AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, Legend,
} from 'recharts';
import { cn } from '@/lib/utils';

export interface CandleData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  ma50: number | null;
  ma200: number | null;
}

interface Props {
  candles: CandleData[];
  ticker: string;
  currency?: string;
}

const RANGES = ['3mo', '6mo', '1y', '2y'] as const;
type Range = typeof RANGES[number];

const RANGE_LABEL: Record<Range, string> = {
  '3mo': '3개월',
  '6mo': '6개월',
  '1y':  '1년',
  '2y':  '2년',
};

function sliceCandles(candles: CandleData[], range: Range) {
  const days = { '3mo': 63, '6mo': 126, '1y': 252, '2y': 504 };
  const n = days[range];
  return candles.length > n ? candles.slice(-n) : candles;
}

const CustomTooltip = ({ active, payload, label, currency }: {
  active?: boolean;
  payload?: { value: number | null; name: string; color: string }[];
  label?: string;
  currency?: string;
}) => {
  if (!active || !payload?.length) return null;
  const fmt = (v: number | null) => v == null ? '-' : `${currency} ${v.toFixed(2)}`;

  return (
    <div className="rounded-[12px] border border-[rgba(255,255,255,0.08)] bg-[#252a30] px-3 py-2.5 text-xs shadow-xl">
      <p className="mb-1.5 font-semibold text-[#8d969e]">{label}</p>
      {payload.map((p) => (
        p.value != null && (
          <div key={p.name} className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: p.color }} />
            <span className="text-[#8d969e]">{p.name}:</span>
            <span className="font-medium text-[#f4f4f4]">{fmt(p.value)}</span>
          </div>
        )
      ))}
    </div>
  );
};

export function StockChart({ candles, ticker, currency = 'USD' }: Props) {
  const [range, setRange] = useState<Range>('1y');
  const data = sliceCandles(candles, range);

  // Y축 도메인 (padding 2%)
  const prices = data.flatMap((d) => [d.close, d.ma50, d.ma200].filter((v): v is number => v != null));
  const yMin = Math.min(...prices) * 0.98;
  const yMax = Math.max(...prices) * 1.02;

  // X축: 매월 첫날만 라벨 표시
  const xTicks = data
    .filter((d) => d.date.slice(8) === '01' || data.indexOf(d) === 0)
    .map((d) => d.date);

  // 최근 종가가 MA200 위아래에 따라 색상 결정
  const last = data[data.length - 1];
  const isAboveMA200 = last?.ma200 != null && last.close > last.ma200;
  const areaColor = isAboveMA200 ? '#00a87e' : '#e23b4a';
  const areaFill  = isAboveMA200 ? 'url(#fillGreen)' : 'url(#fillRed)';

  return (
    <div>
      {/* Range selector */}
      <div className="mb-4 flex items-center gap-1">
        {RANGES.map((r) => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className={cn(
              'rounded-full px-3 py-1 text-xs font-medium transition-all',
              r === range
                ? 'bg-[#494fdf] text-white'
                : 'text-[#8d969e] hover:bg-[rgba(255,255,255,0.06)] hover:text-[#f4f4f4]'
            )}
          >
            {RANGE_LABEL[r]}
          </button>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={data} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
          <defs>
            <linearGradient id="fillGreen" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#00a87e" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#00a87e" stopOpacity={0.01} />
            </linearGradient>
            <linearGradient id="fillRed" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#e23b4a" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#e23b4a" stopOpacity={0.01} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
          <XAxis
            dataKey="date"
            ticks={xTicks}
            tickFormatter={(d) => {
              const [, m] = d.split('-');
              const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
              return months[parseInt(m, 10) - 1] || m;
            }}
            tick={{ fill: '#505a63', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={[yMin, yMax]}
            tickFormatter={(v) => v.toFixed(0)}
            tick={{ fill: '#505a63', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={52}
          />
          <Tooltip content={<CustomTooltip currency={currency} />} />
          <Area
            type="monotone"
            dataKey="close"
            name="종가"
            stroke={areaColor}
            strokeWidth={1.5}
            fill={areaFill}
            dot={false}
            activeDot={{ r: 4, fill: areaColor }}
          />
          <Line
            type="monotone"
            dataKey="ma50"
            name="MA50"
            stroke="#ec7e00"
            strokeWidth={1}
            dot={false}
            activeDot={false}
            connectNulls
          />
          <Line
            type="monotone"
            dataKey="ma200"
            name="MA200"
            stroke="#494fdf"
            strokeWidth={1}
            dot={false}
            activeDot={false}
            connectNulls
          />
          <Legend
            formatter={(value) => <span className="text-xs text-[#8d969e]">{value}</span>}
            wrapperStyle={{ paddingTop: '8px' }}
          />
        </AreaChart>
      </ResponsiveContainer>

      {/* 현재가 요약 */}
      {last && (
        <div className="mt-4 flex items-center gap-4 text-sm">
          <span className="font-semibold text-[#f4f4f4]">
            {currency} {last.close.toFixed(2)}
          </span>
          {last.ma200 != null && (
            <span className={cn('text-xs', isAboveMA200 ? 'text-[#00a87e]' : 'text-[#e23b4a]')}>
              MA200 대비 {isAboveMA200 ? '+' : ''}{(((last.close - last.ma200) / last.ma200) * 100).toFixed(1)}%
            </span>
          )}
          {last.ma50 != null && (
            <span className="text-xs text-[#8d969e]">
              MA50: {last.ma50.toFixed(2)}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
