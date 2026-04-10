'use strict';

const express = require('express');
const config = require('./config');
const analysisRouter = require('./routes/analysis');
const { startScheduler } = require('./services/scheduler');
const telegram = require('./services/telegram');

const app = express();

app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', model: config.openrouter.model });
});

// Routes
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

// Start
app.listen(config.port, () => {
  console.log(`[Server] TodayAsset running on http://localhost:${config.port}`);
  console.log(`[Server] Model: ${config.openrouter.model}`);

  startScheduler();
  telegram.initBot();
});
