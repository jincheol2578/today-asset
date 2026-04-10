'use strict';

const express = require('express');
const { analyze } = require('../services/openrouter');
const { saveAnalysis, getAnalysis, listAnalyses, saveStockAnalysis } = require('../services/storage');
const {
  getAllMarketData, formatForPrompt,
  getStockData, formatStockForPrompt,
  findTicker, getCompanyOverview, formatCompanyForPrompt,
} = require('../services/marketData');
const { getMarketNews, getStockNews } = require('../services/news');
const { requireAuth } = require('../middleware/auth');
const { searchStocks } = require('../services/krxSearch');

const router = express.Router();

/**
 * POST /api/analyze
 * Body (선택): { "extraContext": "..." }
 */
router.post('/analyze', requireAuth('user'), async (req, res) => {
  try {
    const { extraContext } = req.body || {};
    const date = new Date().toISOString().slice(0, 10);

    const [marketResult, newsResult] = await Promise.allSettled([
      getAllMarketData(),
      getMarketNews(),
    ]);

    const marketSection = marketResult.status === 'fulfilled'
      ? formatForPrompt(marketResult.value)
      : '[시장 데이터 자동 수집 실패]';
    const newsSection = newsResult.status === 'fulfilled' ? newsResult.value : '';

    const prompt = [
      marketSection,
      newsSection,
      extraContext ? `[추가 컨텍스트]\n${extraContext}` : '',
      '위 데이터와 뉴스를 모두 반영해 Trading_Strategy.md의 분석 프로토콜(Step 1~4)을 순서대로 실행해 주세요.',
    ].filter(Boolean).join('\n\n');

    const content = await analyze(prompt);
    const record  = await saveAnalysis(date, content);

    res.json({ success: true, data: record });
  } catch (err) {
    console.error('[POST /analyze]', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/stock
 * Body: { "query": "Apple 또는 AAPL", "extraContext": "..." }
 * query에 한글/영문 회사명 또는 티커 모두 가능
 */
router.post('/stock', requireAuth('user'), async (req, res) => {
  try {
    const { query, extraContext } = req.body || {};
    if (!query) {
      return res.status(400).json({ success: false, error: 'query는 필수입니다. (예: AAPL 또는 "애플")' });
    }

    // 종목명 → 티커 변환
    const { ticker, name } = await findTicker(query);

    // 가격, 기업 개요, 뉴스 병렬 수집
    const [stockResult, overviewResult, newsResult] = await Promise.allSettled([
      getStockData(ticker),
      getCompanyOverview(ticker),
      getStockNews(ticker),
    ]);

    if (stockResult.status === 'rejected') {
      return res.status(400).json({ success: false, error: `데이터 조회 실패: ${stockResult.reason.message}` });
    }

    const stockSection   = formatStockForPrompt(stockResult.value);
    const companySection = overviewResult.status === 'fulfilled'
      ? formatCompanyForPrompt(overviewResult.value) : '';
    const newsSection    = newsResult.status === 'fulfilled' ? newsResult.value : '';

    const prompt = [
      stockSection,
      companySection,
      newsSection,
      extraContext ? `[추가 컨텍스트]\n${extraContext}` : '',
      `위 데이터를 바탕으로 다음 두 가지를 분석해 주세요.

1. 비즈니스 분석: 섹터 포지션, 성장성, 수익성, 경쟁 우위, 주요 리스크, 최신 뉴스가 사업에 미치는 영향
2. 매매 의견: Trading_Strategy.md 원칙(200일 이동평균, 이격도, 리스크 관리)을 적용해 현재 매수/관망/매도 여부, 진입 가격대, 손절 기준, 목표가를 구체적으로 제시`,
    ].filter(Boolean).join('\n\n');

    const content = await analyze(prompt);

    // Supabase에 저장
    await saveStockAnalysis(ticker, name, content).catch((e) =>
      console.warn('[stock] 저장 실패:', e.message)
    );

    res.json({
      success: true,
      data: { ticker, name, stockData: stockResult.value, analysis: content, analyzedAt: new Date().toISOString() },
    });
  } catch (err) {
    console.error('[POST /stock]', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/cron/analyze
 * Vercel Cron Jobs가 호출하는 엔드포인트 (vercel.json schedule 참고)
 * 평일 09:00 KST = 00:00 UTC 자동 실행
 */
router.get('/cron/analyze', async (req, res) => {
  // Vercel은 Authorization 헤더로 CRON_SECRET을 검증 (선택적 보안)
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.authorization;
    if (auth !== `Bearer ${cronSecret}`) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
  }

  try {
    const { runAnalysis } = require('../services/scheduler');
    const record = await runAnalysis();
    res.json({ success: true, date: record.date });
  } catch (err) {
    console.error('[GET /cron/analyze]', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/search?q=keyword
 * DB에서 종목명/티커 prefix 검색 (드롭다운용)
 */
router.get('/search', requireAuth('user'), async (req, res) => {
  const q = (req.query.q || '').trim();
  if (!q || q.length < 1) return res.json({ success: true, data: [] });
  try {
    const results = await searchStocks(q, 10);
    res.json({ success: true, data: results });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/market
 */
router.get('/market', requireAuth('user'), async (req, res) => {
  try {
    const marketData = await getAllMarketData();
    res.json({ success: true, data: marketData });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/history
 */
router.get('/history', requireAuth('user'), async (req, res) => {
  try {
    const dates = await listAnalyses();
    res.json({ success: true, dates });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/history/:date
 */
router.get('/history/:date', requireAuth('user'), async (req, res) => {
  const { date } = req.params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ success: false, error: '날짜 형식은 YYYY-MM-DD 이어야 합니다.' });
  }
  try {
    const record = await getAnalysis(date);
    if (!record) return res.status(404).json({ success: false, error: `${date} 분석 결과가 없습니다.` });
    res.json({ success: true, data: record });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
