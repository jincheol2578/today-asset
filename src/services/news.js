'use strict';

const config = require('../config');

const AV_BASE = 'https://www.alphavantage.co/query';

/**
 * Alpha Vantage NEWS_SENTIMENT API 호출
 * @param {object} params - 추가 쿼리 파라미터
 * @returns {Promise<Array>} feed 배열
 */
async function fetchAV(params) {
  if (!config.alphaVantage.apiKey) return [];

  const query = new URLSearchParams({
    function: 'NEWS_SENTIMENT',
    apikey: config.alphaVantage.apiKey,
    sort: 'LATEST',
    limit: '10',
    ...params,
  }).toString();

  const res = await fetch(`${AV_BASE}?${query}`);
  if (!res.ok) throw new Error(`Alpha Vantage ${res.status}`);

  const data = await res.json();

  // API 키 오류 또는 한도 초과 시
  if (data.Note || data.Information) {
    console.warn('[News] Alpha Vantage:', data.Note || data.Information);
    return [];
  }

  return data.feed || [];
}

/**
 * 감성 점수를 한국어 레이블로 변환
 */
function sentimentLabel(label) {
  const map = {
    'Bullish':          '강세',
    'Somewhat-Bullish': '약간 강세',
    'Neutral':          '중립',
    'Somewhat-Bearish': '약간 약세',
    'Bearish':          '약세',
  };
  return map[label] || label;
}

/**
 * 뉴스 피드를 프롬프트용 텍스트로 변환
 * @param {Array} articles
 * @param {string} header - 섹션 제목
 */
function articlesToText(articles, header) {
  if (articles.length === 0) return '';

  const lines = articles.map((a) => {
    const date      = (a.time_published || '').slice(0, 8); // YYYYMMDD
    const sentiment = a.overall_sentiment_label
      ? ` [${sentimentLabel(a.overall_sentiment_label)}, ${a.overall_sentiment_score?.toFixed(2)}]`
      : '';
    return `- [${a.source}] ${a.title} (${date})${sentiment}`;
  });

  return `${header}\n${lines.join('\n')}`;
}

/**
 * 시장 전반 주요 뉴스 수집
 * 토픽: 금융시장, 거시경제, 재정/통화정책, 기술
 * @returns {Promise<string>}
 */
async function getMarketNews() {
  if (!config.alphaVantage.apiKey) return '';

  const [macro, markets] = await Promise.allSettled([
    fetchAV({ topics: 'economy_macro,economy_fiscal,economy_monetary', limit: '6' }),
    fetchAV({ topics: 'financial_markets,technology', limit: '6' }),
  ]);

  const seen = new Set();
  const articles = [
    ...(macro.status === 'fulfilled' ? macro.value : []),
    ...(markets.status === 'fulfilled' ? markets.value : []),
  ].filter((a) => {
    if (seen.has(a.title)) return false;
    seen.add(a.title);
    return true;
  }).slice(0, 12);

  return articlesToText(articles, '[최신 시장 뉴스 및 감성]');
}

/**
 * 특정 종목 관련 뉴스 수집
 * @param {string} ticker - 종목 심볼 (예: AAPL)
 * @returns {Promise<string>}
 */
async function getStockNews(ticker) {
  if (!config.alphaVantage.apiKey) return '';

  const articles = await fetchAV({ tickers: ticker, limit: '6' });
  return articlesToText(articles, `[${ticker} 뉴스 및 감성]`);
}

module.exports = { getMarketNews, getStockNews };
