'use strict';

const { createClient } = require('@supabase/supabase-js');
const config = require('../config');

let _client = null;
function getClient() {
  if (!_client) {
    _client = createClient(config.supabase.url, config.supabase.serviceRoleKey || config.supabase.key);
  }
  return _client;
}

/**
 * 한국어 종목명으로 krx_stocks 테이블 검색
 * @param {string} name - 한국어 종목명 (예: '삼성전자', '삼성')
 * @returns {Promise<{ ticker: string, name: string, code: string, market: string } | null>}
 */
async function findByKoreanName(name) {
  const db = getClient();
  const trimmed = name.trim();

  // 1차: 정확 일치
  const { data: exact } = await db
    .from('krx_stocks')
    .select('code, name, market, ticker')
    .eq('name', trimmed)
    .limit(1);

  if (exact && exact.length > 0) {
    return { ticker: exact[0].ticker, name: exact[0].name, code: exact[0].code, market: exact[0].market };
  }

  // 2차: 전방 일치 (LIKE '검색어%')
  const { data: prefix } = await db
    .from('krx_stocks')
    .select('code, name, market, ticker')
    .like('name', `${trimmed}%`)
    .limit(5);

  if (prefix && prefix.length > 0) {
    // 여러 결과면 이름 길이가 짧은 것 우선 (가장 정확한 매칭)
    prefix.sort((a, b) => a.name.length - b.name.length);
    return { ticker: prefix[0].ticker, name: prefix[0].name, code: prefix[0].code, market: prefix[0].market };
  }

  // 3차: 부분 일치 (LIKE '%검색어%')
  const { data: partial } = await db
    .from('krx_stocks')
    .select('code, name, market, ticker')
    .like('name', `%${trimmed}%`)
    .limit(5);

  if (partial && partial.length > 0) {
    partial.sort((a, b) => a.name.length - b.name.length);
    return { ticker: partial[0].ticker, name: partial[0].name, code: partial[0].code, market: partial[0].market };
  }

  return null;
}

/**
 * 종목 검색 (한글명 + 영문명 + 티커 복합 검색)
 * @param {string} query - 검색어
 * @param {number} limit
 * @returns {Promise<Array<{ code, name, market, ticker }>>}
 */
async function searchStocks(query, limit = 10) {
  const db = getClient();
  const trimmed = query.trim();
  if (!trimmed) return [];

  // ilike 로 name prefix 또는 ticker prefix 또는 code prefix 검색
  const { data } = await db
    .from('krx_stocks')
    .select('code, name, market, ticker')
    .or(`name.ilike.${trimmed}%,ticker.ilike.${trimmed}%,code.ilike.${trimmed}%`)
    .limit(limit);

  // 정확도 순 정렬: 티커 일치 > 이름 앞부분 일치 > 그 외
  const q = trimmed.toLowerCase();
  return (data || []).sort((a, b) => {
    const aTickerExact = a.ticker.toLowerCase() === q ? -2 : a.ticker.toLowerCase().startsWith(q) ? -1 : 0;
    const bTickerExact = b.ticker.toLowerCase() === q ? -2 : b.ticker.toLowerCase().startsWith(q) ? -1 : 0;
    const score = aTickerExact - bTickerExact;
    if (score !== 0) return score;
    return a.name.length - b.name.length;
  });
}

module.exports = { findByKoreanName, searchStocks };
