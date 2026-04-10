'use strict';

const express  = require('express');
const cors     = require('cors');
const config   = require('./config');
const analysisRouter  = require('./routes/analysis');
const watchlistRouter = require('./routes/watchlist');
const adminRouter     = require('./routes/admin');
const { startScheduler } = require('./services/scheduler');
const telegram = require('./services/telegram');

const app = express();

// CORS — 프론트엔드 도메인 허용
app.use(cors({
  origin: [config.frontendUrl, 'http://localhost:3001'].filter(Boolean),
  credentials: true,
}));

app.use(express.json());

// Health check (인증 불필요)
app.get('/health', (req, res) => {
  res.json({ status: 'ok', model: config.openrouter.model, env: process.env.VERCEL ? 'vercel' : 'local' });
});

// Telegram webhook (Vercel 배포 시 사용)
if (config.telegram.botToken) {
  app.post('/telegram-webhook', (req, res) => {
    telegram.handleWebhook(req, res);
  });
}

// API Routes
app.use('/api', analysisRouter);
app.use('/api/watchlist', watchlistRouter);
app.use('/api/admin', adminRouter);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('[Error]', err.message);
  res.status(500).json({ success: false, error: err.message });
});

// ─── 실행 환경 분기 ────────────────────────────────────────────────────────────
if (process.env.VERCEL) {
  telegram.initWebhook().catch((e) => console.error('[Telegram webhook init]', e.message));
} else {
  app.listen(config.port, () => {
    console.log(`[Server] http://localhost:${config.port}  model: ${config.openrouter.model}`);
    startScheduler();
    telegram.initBot();
  });
}

module.exports = app;
