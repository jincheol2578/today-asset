'use strict';

const express  = require('express');
const { requireAuth } = require('../middleware/auth');
const { supabaseAdmin } = require('../services/supabase');

const router = express.Router();

// ─── 유저 관리 ────────────────────────────────────────────────────────────────

/** GET /api/admin/users — 전체 유저 목록 */
router.get('/users', requireAuth('admin'), async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('id, email, role, status, created_at, updated_at')
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ success: false, error: error.message });
  res.json({ success: true, data: data || [] });
});

/** PATCH /api/admin/users/:id/approve — 유저 승인 */
router.patch('/users/:id/approve', requireAuth('admin'), async (req, res) => {
  const { id } = req.params;

  const { error } = await supabaseAdmin
    .from('profiles')
    .update({ role: 'user', status: 'approved' })
    .eq('id', id);

  if (error) return res.status(500).json({ success: false, error: error.message });

  // JWT user_metadata 업데이트 (다음 refresh부터 반영)
  await supabaseAdmin.auth.admin.updateUserById(id, {
    user_metadata: { role: 'user', status: 'approved' },
  }).catch((e) => console.warn('[admin/approve] JWT meta 업데이트 실패:', e.message));

  res.json({ success: true });
});

/** PATCH /api/admin/users/:id/reject — 유저 거절 */
router.patch('/users/:id/reject', requireAuth('admin'), async (req, res) => {
  const { id } = req.params;

  const { error } = await supabaseAdmin
    .from('profiles')
    .update({ status: 'rejected' })
    .eq('id', id);

  if (error) return res.status(500).json({ success: false, error: error.message });

  await supabaseAdmin.auth.admin.updateUserById(id, {
    user_metadata: { status: 'rejected' },
  }).catch((e) => console.warn('[admin/reject] JWT meta 업데이트 실패:', e.message));

  res.json({ success: true });
});

/** PATCH /api/admin/users/:id/role — 역할 변경 */
router.patch('/users/:id/role', requireAuth('admin'), async (req, res) => {
  const { id } = req.params;
  const { role } = req.body || {};

  if (!['guest', 'user', 'admin'].includes(role)) {
    return res.status(400).json({ success: false, error: '유효하지 않은 역할입니다.' });
  }

  const { error } = await supabaseAdmin
    .from('profiles')
    .update({ role })
    .eq('id', id);

  if (error) return res.status(500).json({ success: false, error: error.message });

  await supabaseAdmin.auth.admin.updateUserById(id, {
    user_metadata: { role },
  }).catch((e) => console.warn('[admin/role] JWT meta 업데이트 실패:', e.message));

  res.json({ success: true });
});

// ─── 권한 관리 ────────────────────────────────────────────────────────────────

/** GET /api/admin/permissions — 기능별 권한 목록 */
router.get('/permissions', requireAuth('admin'), async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('feature_permissions')
    .select('feature_key, min_role, label_ko, updated_at')
    .order('feature_key');

  if (error) return res.status(500).json({ success: false, error: error.message });
  res.json({ success: true, data: data || [] });
});

/** PATCH /api/admin/permissions/:feature — 기능 권한 수정 */
router.patch('/permissions/:feature', requireAuth('admin'), async (req, res) => {
  const { feature } = req.params;
  const { min_role } = req.body || {};

  if (!['guest', 'user', 'admin'].includes(min_role)) {
    return res.status(400).json({ success: false, error: '유효하지 않은 역할입니다.' });
  }

  const { error } = await supabaseAdmin
    .from('feature_permissions')
    .update({ min_role })
    .eq('feature_key', feature);

  if (error) return res.status(500).json({ success: false, error: error.message });
  res.json({ success: true });
});

module.exports = router;
