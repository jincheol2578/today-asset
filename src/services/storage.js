'use strict';

const supabase = require('./supabase');

/**
 * 일일 시장 분석 저장
 * @param {string} date - YYYY-MM-DD
 * @param {string} content - AI 분석 텍스트
 */
async function saveAnalysis(date, content) {
  const { data, error } = await supabase
    .from('analyses')
    .upsert({ date, content }, { onConflict: 'date' })
    .select()
    .single();

  if (error) throw new Error(`분석 저장 실패: ${error.message}`);
  return data;
}

/**
 * 특정 날짜 분석 조회
 * @param {string} date - YYYY-MM-DD
 */
async function getAnalysis(date) {
  const { data, error } = await supabase
    .from('analyses')
    .select('*')
    .eq('date', date)
    .maybeSingle();

  if (error) throw new Error(`분석 조회 실패: ${error.message}`);
  return data;
}

/**
 * 분석 날짜 목록 (최신순)
 */
async function listAnalyses() {
  const { data, error } = await supabase
    .from('analyses')
    .select('date')
    .order('date', { ascending: false })
    .limit(30);

  if (error) throw new Error(`목록 조회 실패: ${error.message}`);
  return (data || []).map((r) => r.date);
}

/**
 * 개별 종목 분석 저장
 * @param {string} ticker
 * @param {string} tickerName - 회사명
 * @param {string} content
 */
async function saveStockAnalysis(ticker, tickerName, content) {
  const { data, error } = await supabase
    .from('stock_analyses')
    .insert({ ticker, ticker_name: tickerName, content })
    .select()
    .single();

  if (error) throw new Error(`종목 분석 저장 실패: ${error.message}`);
  return data;
}

module.exports = { saveAnalysis, getAnalysis, listAnalyses, saveStockAnalysis };
