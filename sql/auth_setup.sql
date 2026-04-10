-- TodayAsset — Auth & Permission 테이블 설정
-- Supabase 대시보드 > SQL Editor에서 실행하세요.

-- ─── 1. profiles 테이블 ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id         UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email      TEXT        NOT NULL,
  role       TEXT        NOT NULL DEFAULT 'guest' CHECK (role IN ('guest','user','admin')),
  status     TEXT        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- updated_at 자동 갱신 함수
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── 2. 회원가입 시 자동으로 guest/pending 프로필 생성 트리거 ──────────────────
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO profiles (id, email) VALUES (NEW.id, NEW.email);
  -- JWT user_metadata에 role/status 삽입 → Next.js middleware에서 DB 쿼리 없이 확인 가능
  UPDATE auth.users
    SET raw_user_meta_data = jsonb_build_object('role', 'guest', 'status', 'pending')
  WHERE id = NEW.id;
  RETURN NEW;
END; $$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ─── 3. feature_permissions 테이블 ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS feature_permissions (
  feature_key TEXT        UNIQUE NOT NULL,
  min_role    TEXT        NOT NULL DEFAULT 'user' CHECK (min_role IN ('guest','user','admin')),
  label_ko    TEXT,
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER feature_permissions_updated_at
  BEFORE UPDATE ON feature_permissions FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 기본값 삽입
INSERT INTO feature_permissions (feature_key, min_role, label_ko) VALUES
  ('analysis',  'user', '시장 분석'),
  ('stock',     'user', '종목 분석'),
  ('watchlist', 'user', '관심종목'),
  ('history',   'user', '분석 히스토리')
ON CONFLICT (feature_key) DO NOTHING;

-- ─── 4. watchlists에 auth_user_id 컬럼 추가 ──────────────────────────────────
-- 기존 Telegram user_id(TEXT)는 유지, 웹 유저는 auth_user_id(UUID) 사용
ALTER TABLE watchlists
  ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- ─── 5. RLS 설정 ─────────────────────────────────────────────────────────────
ALTER TABLE profiles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE watchlists          ENABLE ROW LEVEL SECURITY;

-- profiles: 본인 행만 읽기 가능 (service role은 모두 접근 가능)
CREATE POLICY "profiles_self_read" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- feature_permissions: 인증된 사용자라면 누구나 읽기
CREATE POLICY "feature_perms_read" ON feature_permissions
  FOR SELECT USING (auth.role() = 'authenticated');

-- watchlists: auth_user_id 기반 본인 행만 CRUD
CREATE POLICY "watchlists_auth_user" ON watchlists
  USING (auth_user_id = auth.uid())
  WITH CHECK (auth_user_id = auth.uid());
