'use strict';

const express  = require('express');
const { requireAuth } = require('../middleware/auth');
const { supabaseAdmin } = require('../services/supabase');
const { findTicker } = require('../services/marketData');

const router = express.Router();

// 웹 유저는 auth_user_id(UUID)로 관리 (Telegram의 user_id TEXT와 분리)

/** GET /api/watchlist — 내 관심종목 목록 */
router.get('/', requireAuth('user'), async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('watchlists')
    .select('ticker, added_at')
    .eq('auth_user_id', req.user.id)
    .order('added_at', { ascending: true });

  if (error) return res.status(500).json({ success: false, error: error.message });
  res.json({ success: true, data: data || [] });
});

/** POST /api/watchlist — 종목 추가 (티커 또는 종목명) */
router.post('/', requireAuth('user'), async (req, res) => {
  const { ticker: rawQuery } = req.body || {};
  if (!rawQuery) return res.status(400).json({ success: false, error: 'ticker는 필수입니다.' });

  let ticker, name;
  try {
    ({ ticker, name } = await findTicker(rawQuery));
  } catch (e) {
    return res.status(400).json({ success: false, error: e.message });
  }

  const { error } = await supabaseAdmin
    .from('watchlists')
    .insert({ auth_user_id: req.user.id, ticker, user_id: req.user.id });

  if (error?.code === '23505') {
    return res.status(409).json({ success: false, error: `${ticker}은(는) 이미 추가되어 있습니다.` });
  }
  if (error) return res.status(500).json({ success: false, error: error.message });

  res.json({ success: true, data: { ticker, name } });
});

/** DELETE /api/watchlist/:ticker — 종목 삭제 */
router.delete('/:ticker', requireAuth('user'), async (req, res) => {
  const ticker = req.params.ticker.toUpperCase();

  const { error } = await supabaseAdmin
    .from('watchlists')
    .delete()
    .eq('auth_user_id', req.user.id)
    .eq('ticker', ticker);

  if (error) return res.status(500).json({ success: false, error: error.message });
  res.json({ success: true });
});

module.exports = router;
