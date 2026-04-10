'use strict';

const cron = require('node-cron');
const config = require('../config');
const { analyze } = require('./openrouter');
const { saveAnalysis } = require('./storage');
const { getAllMarketData, formatForPrompt } = require('./marketData');
const { getMarketNews } = require('./news');

/**
 * 실시간 시장 데이터를 수집한 뒤 AI 분석을 실행하고 저장합니다.
 * @param {string} [extraContext] - 사용자가 추가로 전달하는 시장 메모 (선택)
 * @returns {Promise<{date: string, content: string, savedAt: string}>}
 */
async function runAnalysis(extraContext) {
  const date = new Date().toISOString().slice(0, 10);
  console.log(`[Scheduler] 시장 데이터 수집 중... (${date})`);

  let marketSection = '';
  let newsSection = '';

  try {
    const [marketData, newsText] = await Promise.allSettled([
      getAllMarketData(),
      getMarketNews(),
    ]);
    if (marketData.status === 'fulfilled') {
      marketSection = formatForPrompt(marketData.value);
      console.log('[Scheduler] 시장 데이터 수집 완료');
    }
    if (newsText.status === 'fulfilled' && newsText.value) {
      newsSection = newsText.value;
      console.log('[Scheduler] 뉴스 수집 완료');
    }
  } catch (err) {
    console.warn('[Scheduler] 데이터 수집 일부 실패:', err.message);
  }

  if (!marketSection) marketSection = '[시장 데이터 자동 수집 실패 — AI가 가용한 지식으로 분석합니다]';

  const prompt = [
    marketSection,
    newsSection,
    extraContext ? `\n[추가 컨텍스트]\n${extraContext}` : '',
    '\n위 데이터와 뉴스를 모두 반영해 Trading_Strategy.md의 분석 프로토콜(Step 1~4)을 순서대로 실행해 주세요.',
  ]
    .filter(Boolean)
    .join('\n');

  console.log(`[Scheduler] AI 분석 요청 중...`);
  const content = await analyze(prompt);
  const record = saveAnalysis(date, content);
  console.log(`[Scheduler] 분석 저장 완료: ${date}`);

  // Telegram 전송
  try {
    const telegram = require('./telegram');
    await telegram.sendMessage(content);
  } catch {
    // Telegram 미설정 시 무시
  }

  return record;
}

/**
 * cron 스케줄러를 시작합니다.
 */
function startScheduler() {
  const expression = config.analysisCron;
  if (!cron.validate(expression)) {
    console.error(`[Scheduler] 유효하지 않은 cron 표현식: "${expression}". 스케줄러를 시작하지 않습니다.`);
    return;
  }

  cron.schedule(expression, () => {
    runAnalysis().catch((err) => {
      console.error('[Scheduler] 분석 실패:', err.message);
    });
  });

  console.log(`[Scheduler] 시작됨 — cron: "${expression}"`);
}

module.exports = { startScheduler, runAnalysis };
