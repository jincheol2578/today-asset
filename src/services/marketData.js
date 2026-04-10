'use strict';

const config = require('../config');
const { findByKoreanName } = require('./krxSearch');

const YAHOO_BASE   = 'https://query2.finance.yahoo.com/v8/finance/chart';
const YAHOO_SEARCH = 'https://query2.finance.yahoo.com/v1/finance/search';
const FRED_BASE    = 'https://api.stlouisfed.org/fred/series/observations';
const AV_BASE      = 'https://www.alphavantage.co/query';

const YAHOO_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept-Encoding': 'gzip, deflate, br',
  'Referer': 'https://finance.yahoo.com/',
  'Origin': 'https://finance.yahoo.com',
};

// ─── Yahoo Finance ────────────────────────────────────────────────────────────

async function fetchYahoo(symbol, range = '1y', interval = '1d') {
  const url = `${YAHOO_BASE}/${encodeURIComponent(symbol)}?interval=${interval}&range=${range}`;
  const res = await fetch(url, { headers: YAHOO_HEADERS });
  if (!res.ok) throw new Error(`Yahoo Finance [${symbol}] ${res.status}`);
  return res.json();
}

function calcMA(closes, period) {
  if (closes.length < period) return null;
  const slice = closes.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / period;
}

async function getPriceData(symbol) {
  const data = await fetchYahoo(symbol, '1y', '1d');
  const result = data.chart?.result?.[0];
  if (!result) throw new Error(`Yahoo Finance: no result for ${symbol}`);

  const closes = result.indicators.quote[0].close.filter((v) => v != null);
  const currentPrice = closes[closes.length - 1];
  const ma200 = calcMA(closes, 200);
  const disparity = ma200 != null ? (currentPrice - ma200) / ma200 * 100 : null;

  return { symbol, currentPrice, ma200, disparity };
}

// ─── FRED API ─────────────────────────────────────────────────────────────────

async function fetchFred(seriesId) {
  if (!config.fred.apiKey) return null;

  const url =
    `${FRED_BASE}?series_id=${seriesId}` +
    `&api_key=${config.fred.apiKey}` +
    `&limit=1&sort_order=desc&file_type=json`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`FRED [${seriesId}] ${res.status}`);

  const data = await res.json();
  const obs = data.observations?.[0];
  if (!obs || obs.value === '.') return null;

  return { date: obs.date, value: parseFloat(obs.value) };
}

// ─── 전체 데이터 수집 ──────────────────────────────────────────────────────────

/**
 * 전략에 필요한 모든 시장 데이터를 병렬로 수집합니다.
 *
 * Yahoo Finance 심볼:
 *   QQQ       - NASDAQ 100 ETF
 *   ^VIX      - CBOE 변동성 지수
 *   GC=F      - Gold 선물
 *   SI=F      - Silver 선물
 *   HG=F      - Copper 선물
 *   DX-Y.NYB  - US Dollar Index (DXY)
 *
 * FRED 시리즈:
 *   ICSA      - Initial Jobless Claims (주간 신규 실업수당 청구건수)
 *   DFII10    - 10-Year TIPS Yield (실질금리)
 *   WTREGEN   - Treasury General Account Balance (TGA 잔고)
 */
async function getAllMarketData() {
  const [qqq, vix, gold, silver, copper, dxy, joblessClaims, realRate, tga] =
    await Promise.allSettled([
      getPriceData('QQQ'),
      getPriceData('^VIX'),
      getPriceData('GC=F'),
      getPriceData('SI=F'),
      getPriceData('HG=F'),
      getPriceData('DX-Y.NYB'),
      fetchFred('ICSA'),     // 신규 실업수당 청구건수
      fetchFred('DFII10'),   // 실질금리 (10Y TIPS)
      fetchFred('WTREGEN'),  // TGA 잔고 (단위: 백만 달러)
    ]);

  const val = (r) => (r.status === 'fulfilled' ? r.value : null);

  const goldData   = val(gold);
  const silverData = val(silver);
  const copperData = val(copper);
  const gp = goldData?.currentPrice;
  const sp = silverData?.currentPrice;
  const cp = copperData?.currentPrice;

  return {
    fetchedAt: new Date().toISOString(),
    equities: {
      qqq: val(qqq),
      vix: val(vix),
    },
    commodities: {
      gold:   goldData,
      silver: silverData,
      copper: copperData,
      goldSilverRatio: gp && sp ? +(gp / sp).toFixed(2) : null,
      goldCopperRatio: gp && cp ? +(gp / cp).toFixed(2) : null,
    },
    fx: {
      dxy: val(dxy),
    },
    macro: {
      joblessClaims:    val(joblessClaims),
      realInterestRate: val(realRate),
      tgaBalance:       val(tga),
    },
  };
}

// ─── 프롬프트용 텍스트 변환 ───────────────────────────────────────────────────

/**
 * 수집한 데이터를 AI 프롬프트에 삽입할 텍스트로 변환합니다.
 */
function formatForPrompt(data) {
  const { equities, commodities, fx, macro } = data;

  const fmt   = (v, d = 2) => (v != null ? v.toFixed(d) : 'N/A');
  const fmtK  = (v) => (v != null ? `${(v / 1000).toFixed(0)}k` : 'N/A');
  const fmtB  = (v) => (v != null ? `$${(v / 1000).toFixed(1)}B` : 'N/A'); // FRED TGA 단위: 백만달러

  const dispStr = (d) => (d != null ? `${d >= 0 ? '+' : ''}${d.toFixed(1)}%` : 'N/A');

  return `
[실시간 시장 데이터] (수집시각: ${data.fetchedAt})

■ 주식
- QQQ:  $${fmt(equities.qqq?.currentPrice)}  |  200일MA: $${fmt(equities.qqq?.ma200)}  |  이격도: ${dispStr(equities.qqq?.disparity)}
- VIX:  ${fmt(equities.vix?.currentPrice, 1)}

■ 원자재
- Gold:   $${fmt(commodities.gold?.currentPrice, 0)}  |  200일MA: $${fmt(commodities.gold?.ma200, 0)}  |  이격도: ${dispStr(commodities.gold?.disparity)}
- Silver: $${fmt(commodities.silver?.currentPrice)}  |  200일MA: $${fmt(commodities.silver?.ma200)}  |  이격도: ${dispStr(commodities.silver?.disparity)}
- Copper: $${fmt(commodities.copper?.currentPrice)}  |  200일MA: $${fmt(commodities.copper?.ma200)}  |  이격도: ${dispStr(commodities.copper?.disparity)}
- Gold/Silver 비율: ${commodities.goldSilverRatio ?? 'N/A'}
- Gold/Copper 비율: ${commodities.goldCopperRatio ?? 'N/A'}

■ 달러
- DXY: ${fmt(fx.dxy?.currentPrice, 1)}

■ 매크로 (FRED)
- 신규 실업수당 청구건수: ${fmtK(macro.joblessClaims?.value)}  (기준일: ${macro.joblessClaims?.date ?? '-'})
- 실질금리 10Y TIPS:     ${fmt(macro.realInterestRate?.value)}%  (기준일: ${macro.realInterestRate?.date ?? '-'})
- TGA 잔고:              ${fmtB(macro.tgaBalance?.value)}  (기준일: ${macro.tgaBalance?.date ?? '-'})
`.trim();
}

/**
 * 개별 종목 데이터 수집 (가격, 200일MA, 이격도, 52주 고저)
 * @param {string} ticker - Yahoo Finance 심볼 (예: AAPL, TSLA, 005930.KS)
 */
async function getStockData(ticker) {
  const data = await fetchYahoo(ticker, '1y', '1d');
  const result = data.chart?.result?.[0];
  if (!result) throw new Error(`Yahoo Finance: ${ticker} 데이터 없음`);

  const meta   = result.meta;
  const closes = result.indicators.quote[0].close.filter((v) => v != null);
  const current = closes[closes.length - 1];
  const ma200   = calcMA(closes, 200);
  const ma50    = calcMA(closes, 50);
  const disparity200 = ma200 != null ? (current - ma200) / ma200 * 100 : null;
  const high52w = Math.max(...closes);
  const low52w  = Math.min(...closes);

  return {
    ticker,
    name:       meta.longName || meta.shortName || ticker,
    currency:   meta.currency || 'USD',
    currentPrice: current,
    ma200,
    ma50,
    disparity200,
    high52w,
    low52w,
    fromHigh: (current - high52w) / high52w * 100,
    fromLow:  (current - low52w)  / low52w  * 100,
  };
}

/**
 * 개별 종목 데이터를 프롬프트용 텍스트로 변환
 */
function formatStockForPrompt(stock) {
  const fmt  = (v, d = 2) => (v != null ? v.toFixed(d) : 'N/A');
  const disp = (d) => (d != null ? `${d >= 0 ? '+' : ''}${d.toFixed(1)}%` : 'N/A');

  return `
[${stock.ticker} — ${stock.name}] 종목 데이터

현재가:       ${stock.currency} ${fmt(stock.currentPrice)}
200일 이동평균: ${fmt(stock.ma200)}  (이격도: ${disp(stock.disparity200)})
50일 이동평균:  ${fmt(stock.ma50)}
52주 고점:    ${fmt(stock.high52w)}  (현재가 대비: ${disp(stock.fromHigh)})
52주 저점:    ${fmt(stock.low52w)}   (현재가 대비: ${disp(stock.fromLow)})
`.trim();
}

// ─── 종목명 → 티커 변환 ───────────────────────────────────────────────────────

/**
 * 입력값이 티커 형식인지 판단 (영문+숫자+.^- 조합, 공백 없음)
 */
function looksLikeTicker(input) {
  // 대문자+숫자+특수문자(.^-)만 허용 — 소문자 포함 시 종목명으로 판단
  return /^[A-Z0-9.\-^]{1,10}$/.test(input);
}

/**
 * Yahoo Finance 검색으로 종목명 → 티커 변환
 * 이미 티커 형식이면 그대로 반환.
 * @param {string} query - 종목명 또는 티커 (영문/한글 모두 가능)
 * @returns {Promise<{ ticker: string, name: string }>}
 */
async function findTicker(query) {
  const trimmed = query.trim();
  if (looksLikeTicker(trimmed)) {
    return { ticker: trimmed.toUpperCase(), name: trimmed.toUpperCase() };
  }

  // 1차: Yahoo Finance 검색
  try {
    const url = `${YAHOO_SEARCH}?q=${encodeURIComponent(trimmed)}&quotesCount=5&newsCount=0&listsCount=0&lang=en-US&region=US`;
    const res  = await fetch(url, { headers: YAHOO_HEADERS });
    if (res.ok) {
      const data   = await res.json();
      const quotes = (data.quotes || []).filter(
        (q) => q.symbol && ['EQUITY', 'ETF', 'MUTUALFUND'].includes(q.quoteType)
      );
      if (quotes.length > 0) {
        const best = quotes[0];
        return { ticker: best.symbol, name: best.longname || best.shortname || best.symbol };
      }
    }
  } catch (_) { /* 폴백으로 진행 */ }

  // 2차: Alpha Vantage SYMBOL_SEARCH 폴백
  if (config.alphaVantage.apiKey) {
    try {
      const url = `${AV_BASE}?function=SYMBOL_SEARCH&keywords=${encodeURIComponent(trimmed)}&apikey=${config.alphaVantage.apiKey}`;
      const res  = await fetch(url);
      if (res.ok) {
        const data    = await res.json();
        const matches = (data.bestMatches || []).filter(
          (m) => m['3. type'] === 'Equity' || m['3. type'] === 'ETF'
        );
        if (matches.length > 0) {
          const best = matches[0];
          return { ticker: best['1. symbol'], name: best['2. name'] };
        }
      }
    } catch (_) { /* 무시 */ }
  }

  // 한글 포함 시 KRX DB 조회
  const hasKorean = /[\uAC00-\uD7A3]/.test(trimmed);
  if (hasKorean) {
    try {
      const krx = await findByKoreanName(trimmed);
      if (krx) return { ticker: krx.ticker, name: krx.name };
    } catch (_) { /* DB 오류 시 폴백 */ }
    throw new Error(`"${trimmed}" 종목을 찾을 수 없습니다. 티커로 직접 입력하세요. (예: 005930.KS)`);
  }
  throw new Error(`"${trimmed}"에 해당하는 종목을 찾을 수 없습니다.`);
}

// ─── Alpha Vantage 기업 개요 ─────────────────────────────────────────────────

/**
 * Alpha Vantage OVERVIEW로 기업 기본 정보 + 재무 지표 수집
 * @param {string} ticker
 */
async function getCompanyOverview(ticker) {
  if (!config.alphaVantage.apiKey) return null;

  const url = `${AV_BASE}?function=OVERVIEW&symbol=${ticker}&apikey=${config.alphaVantage.apiKey}`;
  const res  = await fetch(url);
  if (!res.ok) return null;

  const d = await res.json();
  if (!d.Symbol || d.Note || d.Information) return null;

  return {
    name:          d.Name,
    sector:        d.Sector,
    industry:      d.Industry,
    description:   d.Description,
    country:       d.Country,
    exchange:      d.Exchange,
    marketCap:     d.MarketCapitalization,
    pe:            d.PERatio,
    eps:           d.EPS,
    dividendYield: d.DividendYield,
    profitMargin:  d.ProfitMargin,
    revenueGrowth: d.QuarterlyRevenueGrowthYOY,
    earningsGrowth:d.QuarterlyEarningsGrowthYOY,
    analystTarget: d['AnalystTargetPrice'],
    week52High:    d['52WeekHigh'],
    week52Low:     d['52WeekLow'],
  };
}

/**
 * 기업 개요를 프롬프트용 텍스트로 변환
 */
function formatCompanyForPrompt(overview) {
  if (!overview) return '';
  const f = (v) => (v && v !== 'None' && v !== '-' ? v : 'N/A');
  const pct = (v) => (v && v !== 'None' ? `${(parseFloat(v) * 100).toFixed(1)}%` : 'N/A');
  const usd = (v) => {
    const n = parseFloat(v);
    if (isNaN(n)) return 'N/A';
    if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
    if (n >= 1e9)  return `$${(n / 1e9).toFixed(1)}B`;
    return `$${n.toLocaleString()}`;
  };

  return `
[${overview.name} (${overview.exchange}) — 기업 정보]

섹터 / 업종: ${f(overview.sector)} / ${f(overview.industry)}
국가: ${f(overview.country)}
시가총액: ${usd(overview.marketCap)}

재무 지표
  PER: ${f(overview.pe)}배
  EPS: $${f(overview.eps)}
  배당 수익률: ${pct(overview.dividendYield)}
  순이익률: ${pct(overview.profitMargin)}
  분기 매출 성장(YoY): ${pct(overview.revenueGrowth)}
  분기 이익 성장(YoY): ${pct(overview.earningsGrowth)}

52주 고점: $${f(overview.week52High)}  /  52주 저점: $${f(overview.week52Low)}
애널리스트 목표가: $${f(overview.analystTarget)}

비즈니스 개요:
${f(overview.description).slice(0, 600)}${overview.description?.length > 600 ? '...' : ''}
`.trim();
}

module.exports = {
  getAllMarketData,
  formatForPrompt,
  getStockData,
  formatStockForPrompt,
  findTicker,
  getCompanyOverview,
  formatCompanyForPrompt,
};
