'use strict';

const express  = require('express');
const config   = require('./config');
const analysisRouter = require('./routes/analysis');
const { startScheduler } = require('./services/scheduler');
const telegram = require('./services/telegram');

const app = express();

app.use(express.json());

// Health check
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
  // Vercel 서버리스: 웹훅 모드로 Telegram 초기화 (폴링 불가)
  telegram.initWebhook().catch((e) => console.error('[Telegram webhook init]', e.message));
} else {
  // 로컬 개발: 일반 서버 시작 + cron 스케줄러 + 폴링 모드
  app.listen(config.port, () => {
    console.log(`[Server] http://localhost:${config.port}  model: ${config.openrouter.model}`);
    startScheduler();
    telegram.initBot();
  });
}

// Vercel이 Express 앱을 서버리스 함수로 사용하기 위해 export 필요
module.exports = app;
