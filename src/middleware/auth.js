'use strict';

const { supabaseAdmin } = require('../services/supabase');

const ROLE_RANK = { guest: 0, user: 1, admin: 2 };

/**
 * requireAuth(minRole?)
 * Bearer JWT를 검증하고 프로필 역할/상태를 확인하는 Express 미들웨어 팩토리.
 * @param {'guest'|'user'|'admin'} minRole - 최소 요구 역할 (기본: 'user')
 */
function requireAuth(minRole = 'user') {
  return async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: '인증이 필요합니다.' });
    }
    const token = authHeader.slice(7);

    // 1. Supabase JWT 검증
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !user) {
      return res.status(401).json({ success: false, error: '유효하지 않은 토큰입니다.' });
    }

    // 2. profiles 조회 (status, role 확인)
    const { data: profile, error: profileErr } = await supabaseAdmin
      .from('profiles')
      .select('role, status')
      .eq('id', user.id)
      .single();

    if (profileErr || !profile) {
      return res.status(403).json({ success: false, error: '프로필을 찾을 수 없습니다.' });
    }

    if (profile.status !== 'approved') {
      return res.status(403).json({
        success: false,
        error: '승인 대기 중입니다. 관리자 승인 후 이용할 수 있습니다.',
        status: profile.status,
      });
    }

    if ((ROLE_RANK[profile.role] ?? -1) < (ROLE_RANK[minRole] ?? 999)) {
      return res.status(403).json({ success: false, error: '권한이 없습니다.' });
    }

    req.user = { id: user.id, email: user.email, role: profile.role };
    next();
  };
}

module.exports = { requireAuth };
