'use strict';

require('dotenv').config();

module.exports = {
  port: parseInt(process.env.PORT || '3000', 10),
  openrouter: {
    apiKey: process.env.OPENROUTER_API_KEY || '',
    model: process.env.OPENROUTER_MODEL || 'google/gemini-2.5-pro',
    siteUrl: process.env.OPENROUTER_SITE_URL || 'http://localhost:3000',
    siteName: process.env.OPENROUTER_SITE_NAME || 'TodayAsset',
  },
  analysisCron: process.env.ANALYSIS_CRON || '0 9 * * *',
  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN || '',
    chatId: process.env.TELEGRAM_CHAT_ID || '',
  },
  fred: {
    apiKey: process.env.FRED_API_KEY || '',
  },
  alphaVantage: {
    apiKey: process.env.ALPHA_VANTAGE_KEY || '',
  },
  supabase: {
    url: process.env.SUPABASE_URL || '',
    key: process.env.SUPABASE_KEY || '',
  },
};
