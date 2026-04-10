'use strict';

const supabase = require('./supabase');

/**
 * 사용자 관심종목 조회
 */
async function getWatchlist(userId) {
  const { data, error } = await supabase
    .from('watchlists')
    .select('ticker')
    .eq('user_id', String(userId))
    .order('added_at', { ascending: true });

  if (error) throw new Error(`관심종목 조회 실패: ${error.message}`);
  return (data || []).map((r) => r.ticker);
}

/**
 * 종목 추가
 * @returns {{ tickers: string[], added: boolean }}
 */
async function addTicker(userId, ticker) {
  const upper = ticker.toUpperCase();

  const { error } = await supabase
    .from('watchlists')
    .insert({ user_id: String(userId), ticker: upper });

  // unique 제약 위반 = 이미 존재
  const already = error?.code === '23505';
  if (error && !already) throw new Error(`추가 실패: ${error.message}`);

  const tickers = await getWatchlist(userId);
  return { tickers, added: !already };
}

/**
 * 종목 삭제
 * @returns {{ tickers: string[], removed: boolean }}
 */
async function removeTicker(userId, ticker) {
  const upper = ticker.toUpperCase();

  const { count, error } = await supabase
    .from('watchlists')
    .delete()
    .eq('user_id', String(userId))
    .eq('ticker', upper)
    .select('*', { count: 'exact', head: true });

  if (error) throw new Error(`삭제 실패: ${error.message}`);

  const tickers = await getWatchlist(userId);
  return { tickers, removed: (count ?? 0) > 0 };
}

module.exports = { getWatchlist, addTicker, removeTicker };
