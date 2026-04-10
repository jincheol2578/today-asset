'use strict';

const { createClient } = require('@supabase/supabase-js');
const config = require('../config');

if (!config.supabase.url || !config.supabase.key) {
  throw new Error('SUPABASE_URL 또는 SUPABASE_KEY가 설정되지 않았습니다.');
}

// 기존 anon 클라이언트 (Telegram, scheduler 등 서버 내부용)
const supabase = createClient(config.supabase.url, config.supabase.key);

// service role 클라이언트 (auth 미들웨어, admin 라우트용)
const supabaseAdmin = config.supabase.serviceRoleKey
  ? createClient(config.supabase.url, config.supabase.serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  : supabase; // 키 없으면 anon으로 fallback (로컬 개발 편의)

module.exports = supabase;
module.exports.supabaseAdmin = supabaseAdmin;
