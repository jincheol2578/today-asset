'use strict';

const config    = require('../config');
const watchlist = require('./watchlist');

let bot = null;

// ─── 기본 추천 종목 (관심종목이 없을 때 표시) ────────────────────────────────
const DEFAULT_STOCKS = ['QQQ','NVDA','AAPL','TSLA','MSFT','AMZN','GLD','SLV','005930.KS','000660.KS'];

function buildKeyboard(tickers) {
  const rows = [];
  for (let i = 0; i < tickers.length; i += 2) {
    const row = [{ text: tickers[i], callback_data: `stock:${tickers[i]}` }];
    if (tickers[i + 1]) row.push({ text: tickers[i + 1], callback_data: `stock:${tickers[i + 1]}` });
    rows.push(row);
  }
  return { reply_markup: { inline_keyboard: rows } };
}

async function getKeyboard(userId) {
  try {
    const tickers = await watchlist.getWatchlist(userId);
    if (tickers.length > 0) return buildKeyboard(tickers);
  } catch { /* fallback */ }
  return buildKeyboard(DEFAULT_STOCKS);
}

// ─── 종목 분석 공통 로직 ───────────────────────────────────────────────────────
async function runStockAnalysis(query) {
  const { findTicker, getStockData, formatStockForPrompt, getCompanyOverview, formatCompanyForPrompt } = require('./marketData');
  const { getStockNews }      = require('./news');
  const { analyze }           = require('./openrouter');
  const { saveStockAnalysis } = require('./storage');

  const { ticker, name } = await findTicker(query);

  const [stockResult, overviewResult, newsResult] = await Promise.allSettled([
    getStockData(ticker),
    getCompanyOverview(ticker),
    getStockNews(ticker),
  ]);

  if (stockResult.status === 'rejected') throw new Error(stockResult.reason.message);

  const prompt = [
    formatStockForPrompt(stockResult.value),
    overviewResult.status === 'fulfilled' ? formatCompanyForPrompt(overviewResult.value) : '',
    newsResult.status === 'fulfilled' ? newsResult.value : '',
    `위 데이터를 바탕으로 다음 두 가지를 분석해 주세요.

1. 비즈니스 분석: 섹터 포지션, 성장성, 수익성, 경쟁 우위, 주요 리스크, 최신 뉴스가 사업에 미치는 영향
2. 매매 의견: Trading_Strategy.md 원칙(200일 이동평균, 이격도, 리스크 관리)을 적용해 현재 매수/관망/매도 여부, 진입 가격대, 손절 기준, 목표가를 구체적으로 제시`,
  ].filter(Boolean).join('\n\n');

  const content = await analyze(prompt);
  saveStockAnalysis(ticker, name, content).catch((e) => console.warn('[stock 저장]', e.message));
  return { content, ticker, name };
}

// ─── 명령어 등록 (폴링/웹훅 공통) ────────────────────────────────────────────
function _registerCommands(instance) {
  instance.telegram.setMyCommands([
    { command: 'start',     description: '봇 소개 및 명령어 안내' },
    { command: 'analysis',  description: '전체 시장 분석 실행' },
    { command: 'stock',     description: '종목 매매 의견 (버튼 선택 또는 /stock AAPL)' },
    { command: 'watchlist', description: '내 관심종목 보기 및 분석' },
    { command: 'add',       description: '관심종목 추가 — /add AAPL' },
    { command: 'remove',    description: '관심종목 삭제 — /remove AAPL' },
    { command: 'history',   description: '최근 분석 날짜 목록' },
  ]).then(() => console.log('[Telegram] 명령어 자동완성 등록 완료'));

  instance.command('start', (ctx) => {
    ctx.reply(
      'TodayAsset 분석 봇에 오신 것을 환영합니다.\n\n' +
      '/analysis — 전체 시장 분석\n' +
      '/stock — 종목 매매 의견\n' +
      '/watchlist — 내 관심종목 분석\n' +
      '/add AAPL — 관심종목 추가\n' +
      '/remove AAPL — 관심종목 삭제\n' +
      '/history — 최근 분석 목록'
    );
  });

  instance.command('analysis', async (ctx) => {
    await ctx.reply('시장 데이터와 뉴스를 수집 중입니다... 잠시 기다려 주세요.');
    try {
      const { runAnalysis } = require('./scheduler');
      const record = await runAnalysis();
      await sendLongMessage(ctx, record.content);
    } catch (err) {
      await ctx.reply(`오류가 발생했습니다: ${err.message}`);
    }
  });

  instance.command('stock', async (ctx) => {
    const query  = ctx.message.text.trim().split(/\s+/).slice(1).join(' ').trim();
    const userId = ctx.from.id;

    if (!query) {
      const keyboard = await getKeyboard(userId);
      const tickers  = await watchlist.getWatchlist(userId).catch(() => []);
      const msg = tickers.length > 0
        ? '내 관심종목 중 분석할 종목을 선택하세요.'
        : '분석할 종목을 선택하거나 직접 입력하세요.\n예: /stock AAPL 또는 /stock 애플';
      return ctx.reply(msg, keyboard);
    }

    await ctx.reply(`"${query}" 검색 중입니다... 잠시 기다려 주세요.`);
    try {
      const { content, ticker, name } = await runStockAnalysis(query);
      await ctx.reply(`📊 ${name} (${ticker}) 분석 결과`);
      await sendLongMessage(ctx, content);
    } catch (err) {
      await ctx.reply(`종목 조회 실패: ${err.message}`);
    }
  });

  instance.command('watchlist', async (ctx) => {
    const userId = ctx.from.id;
    try {
      const tickers = await watchlist.getWatchlist(userId);
      if (tickers.length === 0) return ctx.reply('등록된 관심종목이 없습니다.\n\n/add AAPL 형식으로 추가해 보세요.');
      ctx.reply(`내 관심종목 (${tickers.length}개)\n분석할 종목을 선택하세요.`, buildKeyboard(tickers));
    } catch (err) { ctx.reply(`오류: ${err.message}`); }
  });

  instance.command('add', async (ctx) => {
    const query  = ctx.message.text.trim().split(/\s+/).slice(1).join(' ').trim();
    const userId = ctx.from.id;
    if (!query) return ctx.reply('추가할 종목 코드나 이름을 입력해 주세요.\n예: /add AAPL 또는 /add 삼성전자');
    try {
      const { findTicker } = require('./marketData');
      const { ticker, name } = await findTicker(query);
      const { tickers, added } = await watchlist.addTicker(userId, ticker);
      if (!added) return ctx.reply(`${ticker}은(는) 이미 관심종목에 있습니다.\n현재 목록: ${tickers.join(', ')}`);
      ctx.reply(`${name} (${ticker}) 추가 완료!\n\n현재 관심종목 (${tickers.length}개): ${tickers.join(', ')}`);
    } catch (err) { ctx.reply(`오류: ${err.message}`); }
  });

  instance.command('remove', async (ctx) => {
    const ticker = ctx.message.text.trim().split(/\s+/)[1]?.toUpperCase();
    const userId = ctx.from.id;
    if (!ticker) return ctx.reply('삭제할 종목 코드를 입력해 주세요.\n예: /remove AAPL');
    try {
      const { tickers, removed } = await watchlist.removeTicker(userId, ticker);
      if (!removed) return ctx.reply(`${ticker}은(는) 관심종목에 없습니다.`);
      ctx.reply(tickers.length > 0
        ? `${ticker} 삭제 완료!\n현재 관심종목 (${tickers.length}개): ${tickers.join(', ')}`
        : `${ticker} 삭제 완료!\n관심종목이 없습니다. /add 로 추가해 보세요.`);
    } catch (err) { ctx.reply(`오류: ${err.message}`); }
  });

  instance.action(/^stock:(.+)$/, async (ctx) => {
    const query = ctx.match[1];
    await ctx.answerCbQuery(`${query} 분석 중...`);
    await ctx.reply(`"${query}" 데이터와 뉴스를 수집 중입니다... 잠시 기다려 주세요.`);
    try {
      const { content, ticker, name } = await runStockAnalysis(query);
      await ctx.reply(`📊 ${name} (${ticker}) 분석 결과`);
      await sendLongMessage(ctx, content);
    } catch (err) { await ctx.reply(`종목 조회 실패: ${err.message}`); }
  });

  instance.command('history', async (ctx) => {
    const { listAnalyses } = require('./storage');
    const dates = await listAnalyses().catch(() => []);
    ctx.reply(dates.length === 0
      ? '저장된 분석 결과가 없습니다.'
      : `최근 분석 날짜 목록:\n\n${dates.slice(0, 10).join('\n')}`);
  });

  // TODO: bot.command('alert', ...) — 가격 알림 설정
}

// ─── 로컬 폴링 모드 초기화 ────────────────────────────────────────────────────
function initBot() {
  if (!config.telegram.botToken) {
    console.log('[Telegram] BOT_TOKEN 미설정 — Telegram 연동 비활성화');
    return;
  }
  const { Telegraf } = require('telegraf');
  bot = new Telegraf(config.telegram.botToken);
  _registerCommands(bot);
  bot.launch();
  console.log('[Telegram] 봇 시작됨 (폴링 모드)');
  process.once('SIGINT',  () => bot.stop('SIGINT'));
  process.once('SIGTERM', () => bot.stop('SIGTERM'));
}

// ─── Vercel 웹훅 모드 초기화 ─────────────────────────────────────────────────
async function initWebhook() {
  if (!config.telegram.botToken) return;
  const { Telegraf } = require('telegraf');
  bot = new Telegraf(config.telegram.botToken);
  _registerCommands(bot);

  const domain = process.env.VERCEL_URL || process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (!domain) {
    console.warn('[Telegram] VERCEL_URL 미설정 — 웹훅 URL을 자동 등록할 수 없습니다.');
    return;
  }
  const webhookUrl = `https://${domain}/telegram-webhook`;
  await bot.telegram.setWebhook(webhookUrl);
  console.log(`[Telegram] 웹훅 등록 완료: ${webhookUrl}`);
}

function handleWebhook(req, res) {
  if (!bot) return res.sendStatus(200);
  bot.handleUpdate(req.body, res);
}

// ─── 유틸 ─────────────────────────────────────────────────────────────────────
async function sendLongMessage(ctx, text) {
  const MAX = 4000;
  for (let i = 0; i < text.length; i += MAX) await ctx.reply(text.slice(i, i + MAX));
}

async function sendMessage(text) {
  if (!bot || !config.telegram.chatId) return;
  const MAX = 4000;
  for (let i = 0; i < text.length; i += MAX) {
    await bot.telegram.sendMessage(config.telegram.chatId, text.slice(i, i + MAX));
  }
}

module.exports = { initBot, initWebhook, handleWebhook, sendMessage };
