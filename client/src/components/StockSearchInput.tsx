'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

interface StockResult {
  code: string;
  name: string;
  market: string;
  ticker: string;
}

interface Props {
  onSelect: (stock: StockResult) => void;
  placeholder?: string;
  disabled?: boolean;
  initialValue?: string;
}

export function StockSearchInput({ onSelect, placeholder = '종목명 또는 티커 (예: 삼성전자, AAPL)', disabled, initialValue = '' }: Props) {
  const [query, setQuery] = useState(initialValue);
  const [results, setResults] = useState<StockResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const search = useCallback(async (q: string) => {
    if (!q.trim() || q.trim().length < 1) {
      setResults([]);
      setOpen(false);
      return;
    }
    setLoading(true);
    try {
      const res = await api.searchStocks(q.trim());
      setResults(res.data || []);
      setOpen((res.data || []).length > 0);
      setActiveIdx(-1);
    } catch {
      setResults([]);
      setOpen(false);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(val), 250);
  };

  const handleSelect = (stock: StockResult) => {
    setQuery(stock.name);
    setOpen(false);
    setResults([]);
    onSelect(stock);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || results.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, -1));
    } else if (e.key === 'Enter' && activeIdx >= 0) {
      e.preventDefault();
      handleSelect(results[activeIdx]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  const marketBadgeClass = (market: string) => {
    if (market === 'KOSPI') return 'bg-[#494fdf]/20 text-[#7b80f0]';
    if (market === 'KOSDAQ') return 'bg-[#00a87e]/20 text-[#00c896]';
    if (market === 'NASDAQ') return 'bg-[#ec7e00]/20 text-[#f5a623]';
    return 'bg-[rgba(255,255,255,0.08)] text-[#8d969e]';
  };

  return (
    <div ref={containerRef} className="relative flex-1">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#505a63]" />
        <input
          ref={inputRef}
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="off"
          className={cn(
            'w-full rounded-full border border-[rgba(255,255,255,0.08)] bg-[#1e2227] py-2.5 pl-10 pr-10 text-sm text-[#f4f4f4] placeholder:text-[#505a63]',
            'outline-none ring-0 transition-all duration-150',
            'focus:border-[#494fdf]/50 focus:ring-2 focus:ring-[#494fdf]/20',
            'disabled:opacity-50'
          )}
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-[#505a63]" />
        )}
      </div>

      {open && results.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full overflow-hidden rounded-[16px] border border-[rgba(255,255,255,0.08)] bg-[#1e2227] py-1 shadow-xl">
          {results.map((stock, idx) => (
            <li key={stock.ticker}>
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); handleSelect(stock); }}
                onMouseEnter={() => setActiveIdx(idx)}
                className={cn(
                  'flex w-full items-center justify-between px-4 py-2.5 text-left text-sm transition-colors',
                  idx === activeIdx
                    ? 'bg-[#494fdf]/15 text-[#f4f4f4]'
                    : 'text-[#c8cfd6] hover:bg-[rgba(255,255,255,0.04)]'
                )}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="truncate font-medium">{stock.name}</span>
                  <span className="shrink-0 text-xs text-[#505a63]">{stock.ticker}</span>
                </div>
                <span className={cn('ml-2 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold', marketBadgeClass(stock.market))}>
                  {stock.market}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
