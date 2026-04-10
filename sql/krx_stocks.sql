-- KRX 전체 상장 종목 테이블
CREATE TABLE IF NOT EXISTS krx_stocks (
  code    TEXT PRIMARY KEY,             -- KRX 6자리 코드 (예: 005930)
  name    TEXT NOT NULL,               -- 한국어 종목명 (예: 삼성전자)
  market  TEXT NOT NULL,               -- KOSPI | KOSDAQ
  ticker  TEXT NOT NULL UNIQUE         -- Yahoo Finance 티커 (예: 005930.KS / 035720.KQ)
);

-- 한글 이름 검색용 인덱스
CREATE INDEX IF NOT EXISTS idx_krx_stocks_name ON krx_stocks (name text_pattern_ops);

-- RLS (읽기는 누구나 가능 — 백엔드 service role로 삽입)
ALTER TABLE krx_stocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "krx_stocks_read" ON krx_stocks FOR SELECT USING (true);
