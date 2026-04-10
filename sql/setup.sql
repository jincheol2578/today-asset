-- TodayAsset — Supabase 테이블 설정
-- Supabase 대시보드 > SQL Editor에서 실행하세요.

-- 1. 일일 시장 분석
CREATE TABLE IF NOT EXISTS analyses (
  id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  date       DATE        UNIQUE NOT NULL,
  content    TEXT        NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 개별 종목 분석
CREATE TABLE IF NOT EXISTS stock_analyses (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  ticker      TEXT        NOT NULL,
  ticker_name TEXT,
  content     TEXT        NOT NULL,
  analyzed_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 사용자 관심종목
CREATE TABLE IF NOT EXISTS watchlists (
  id       UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id  TEXT        NOT NULL,
  ticker   TEXT        NOT NULL,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, ticker)
);

-- RLS 비활성화 (서버 전용 백엔드이므로)
ALTER TABLE analyses       DISABLE ROW LEVEL SECURITY;
ALTER TABLE stock_analyses DISABLE ROW LEVEL SECURITY;
ALTER TABLE watchlists     DISABLE ROW LEVEL SECURITY;
