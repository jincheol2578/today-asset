'use strict';

/**
 * 미국 상장 종목(NYSE, NASDAQ, AMEX)을 krx_stocks 테이블에 시딩합니다.
 *
 * 데이터 출처: NASDAQ Trader FTP 심볼 디렉토리 (HTTP로 접근)
 *   nasdaqlisted.txt  → NASDAQ 종목
 *   otherlisted.txt   → NYSE / AMEX / 기타
 *
 * 사용법: node scripts/seed_us_stocks.js
 */

require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY 환경변수가 없습니다.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (compatible; TodayAsset/1.0)',
};

/**
 * NASDAQ listed 파싱
 * 컬럼: Symbol|Security Name|Market Category|Test Issue|Financial Status|Round Lot Size|ETF|NextShares
 */
async function fetchNasdaqListed() {
  const url = 'https://nasdaqtrader.com/dynamic/symdir/nasdaqlisted.txt';
  console.log('  📥 nasdaqlisted.txt 다운로드 중...');
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`NASDAQ listed HTTP ${res.status}`);
  const text = await res.text();

  const lines = text.split('\n');
  const results = [];

  for (const line of lines) {
    const cols = line.split('|');
    if (cols.length < 7) continue;
    const [symbol, name, , testIssue, , , etf] = cols;
    if (!symbol || symbol === 'Symbol' || testIssue === 'Y') continue;
    // 워런트/우선주 제외 (특수 문자 포함 심볼)
    if (/[^A-Z0-9]/.test(symbol)) continue;
    if (!name || name.trim() === '') continue;

    const market = 'NASDAQ';
    results.push({
      code:   symbol.trim(),
      name:   cleanName(name.trim()),
      market,
      ticker: symbol.trim(),
    });
  }

  return results;
}

/**
 * Other listed 파싱
 * 컬럼: ACT Symbol|Security Name|Exchange|CQS Symbol|ETF|Round Lot Size|Test Issue|NASDAQ Symbol
 * Exchange: N=NYSE, A=NYSE MKT(AMEX), P=NYSE Arca, Z=BATS, V=IEXG 등
 */
async function fetchOtherListed() {
  const url = 'https://nasdaqtrader.com/dynamic/symdir/otherlisted.txt';
  console.log('  📥 otherlisted.txt 다운로드 중...');
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`Other listed HTTP ${res.status}`);
  const text = await res.text();

  const lines = text.split('\n');
  const results = [];

  const EXCHANGE_MAP = {
    N: 'NYSE',
    A: 'AMEX',
    P: 'NYSE Arca',
    Z: 'BATS',
    V: 'IEX',
  };

  for (const line of lines) {
    const cols = line.split('|');
    if (cols.length < 7) continue;
    const [symbol, name, exchange, , , , testIssue] = cols;
    if (!symbol || symbol === 'ACT Symbol' || testIssue?.trim() === 'Y') continue;
    // NYSE/AMEX만 포함 (기타 거래소는 제외 — 필요시 주석 해제)
    if (!['N', 'A', 'P'].includes(exchange?.trim())) continue;
    // 특수 문자 포함 심볼 제외 (워런트, 권리주 등)
    if (/[^A-Z0-9]/.test(symbol.trim())) continue;
    if (!name || name.trim() === '') continue;

    const market = EXCHANGE_MAP[exchange?.trim()] || exchange?.trim();
    results.push({
      code:   symbol.trim(),
      name:   cleanName(name.trim()),
      market,
      ticker: symbol.trim(),
    });
  }

  return results;
}

/** 종목명에서 불필요한 suffix 정리 */
function cleanName(name) {
  return name
    .replace(/\s*-\s*Common Stock$/i, '')
    .replace(/\s*Common Stock$/i, '')
    .replace(/\s*Class [A-Z] Common Stock$/i, '')
    .trim();
}

/** Supabase 청크 upsert */
async function upsertStocks(stocks) {
  const CHUNK = 500;
  let total = 0;

  for (let i = 0; i < stocks.length; i += CHUNK) {
    const chunk = stocks.slice(i, i + CHUNK);
    const { error } = await supabase
      .from('krx_stocks')
      .upsert(chunk, { onConflict: 'code' });

    if (error) throw error;
    total += chunk.length;
    process.stdout.write(`\r  ✅ upsert ${total}/${stocks.length}건`);
  }
  console.log();
}

async function main() {
  console.log('🚀 미국 주식 시딩 시작\n');

  let all = [];

  try {
    const nasdaq = await fetchNasdaqListed();
    console.log(`  📊 NASDAQ: ${nasdaq.length}종목 파싱 완료`);
    all = all.concat(nasdaq);
  } catch (err) {
    console.error('  ❌ NASDAQ 실패:', err.message);
  }

  try {
    const other = await fetchOtherListed();
    console.log(`  📊 NYSE/AMEX: ${other.length}종목 파싱 완료`);
    all = all.concat(other);
  } catch (err) {
    console.error('  ❌ NYSE/AMEX 실패:', err.message);
  }

  if (all.length === 0) {
    console.error('파싱된 종목이 없습니다.');
    process.exit(1);
  }

  // 중복 제거 (code 기준)
  const unique = Object.values(
    Object.fromEntries(all.map((s) => [s.code, s]))
  );
  console.log(`\n💾 총 ${unique.length}개 종목을 Supabase에 upsert 중...`);
  await upsertStocks(unique);

  const byMarket = {};
  for (const s of unique) byMarket[s.market] = (byMarket[s.market] || 0) + 1;

  console.log('\n🎉 완료!');
  for (const [m, c] of Object.entries(byMarket)) {
    console.log(`   ${m.padEnd(12)}: ${c}종목`);
  }
}

main().catch((err) => {
  console.error('\n❌ 오류:', err.message);
  process.exit(1);
});
