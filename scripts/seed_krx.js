'use strict';

/**
 * KRX 전체 상장 종목을 krx_stocks 테이블에 시딩합니다.
 *
 * 사용법: node scripts/seed_krx.js
 * 환경변수: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (.env 자동 로드)
 *
 * 데이터 출처: kind.krx.co.kr (EUC-KR HTML 다운로드)
 */

require('dotenv').config();

const iconv       = require('iconv-lite');
const { parse }   = require('node-html-parser');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY 환경변수가 없습니다.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

/**
 * KRX 종목 목록 HTML 다운로드 (EUC-KR → UTF-8 디코딩)
 * @param {'KOSPI'|'KOSDAQ'} market
 * @returns {Promise<string>} UTF-8 HTML 문자열
 */
async function fetchKrxHtml(market) {
  // marketType: 'stockMkt' = KOSPI, 'kosdaqMkt' = KOSDAQ
  const marketType = market === 'KOSPI' ? 'stockMkt' : 'kosdaqMkt';
  const url = `https://kind.krx.co.kr/corpgeneral/corpList.do?method=download&searchType=13&marketType=${marketType}`;

  console.log(`  📥 ${market} 목록 다운로드 중...`);
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      'Referer': 'https://kind.krx.co.kr/corpgeneral/corpList.do',
    },
  });

  if (!res.ok) throw new Error(`KRX ${market} HTTP ${res.status}`);

  const buf = Buffer.from(await res.arrayBuffer());
  return iconv.decode(buf, 'EUC-KR');
}

/**
 * HTML 파싱 → { code, name, market, ticker }[] 배열 반환
 *
 * HTML 컬럼 순서 (thead 없이 tr로 구성):
 *   td[0]: 회사명
 *   td[1]: 시장구분 (유가/코스닥)
 *   td[2]: 종목코드 (6자리, 숫자/알파벳 혼합 가능)
 *   td[3..]: 업종, 주요제품, 상장일, ...
 */
function parseKrxHtml(html, market) {
  const root = parse(html);
  // tbody 없이 바로 tr 사용
  const rows = root.querySelectorAll('table tr');
  const suffix = market === 'KOSPI' ? '.KS' : '.KQ';
  const results = [];

  for (const row of rows) {
    const cells = row.querySelectorAll('td');
    if (cells.length < 3) continue; // th 행(헤더) 또는 빈 행 스킵

    const name = cells[0].text.trim();
    const code = cells[2].text.trim().replace(/\s/g, '');

    // 6자리 영숫자 코드만 허용
    if (!name || !code || !/^[A-Z0-9]{6}$/i.test(code)) continue;

    results.push({
      code: code.toUpperCase(),
      name,
      market,
      ticker: `${code.toUpperCase()}${suffix}`,
    });
  }

  return results;
}

/**
 * Supabase upsert (충돌 시 name/market/ticker 업데이트)
 */
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
  console.log('🚀 KRX 종목 시딩 시작\n');

  let all = [];

  for (const market of ['KOSPI', 'KOSDAQ']) {
    try {
      const html   = await fetchKrxHtml(market);
      const stocks = parseKrxHtml(html, market);
      console.log(`  📊 ${market}: ${stocks.length}종목 파싱 완료`);
      all = all.concat(stocks);
    } catch (err) {
      console.error(`  ❌ ${market} 실패:`, err.message);
    }
  }

  if (all.length === 0) {
    console.error('파싱된 종목이 없습니다. HTML 구조 변경 여부를 확인하세요.');
    process.exit(1);
  }

  console.log(`\n💾 총 ${all.length}개 종목을 Supabase에 upsert 중...`);
  await upsertStocks(all);

  console.log('\n🎉 완료!');
  console.log(`   KOSPI  : ${all.filter(s => s.market === 'KOSPI').length}종목`);
  console.log(`   KOSDAQ : ${all.filter(s => s.market === 'KOSDAQ').length}종목`);
}

main().catch((err) => {
  console.error('\n❌ 오류:', err.message);
  process.exit(1);
});
