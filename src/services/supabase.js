'use strict';

const { createClient } = require('@supabase/supabase-js');
const config = require('../config');

if (!config.supabase.url || !config.supabase.key) {
  throw new Error('SUPABASE_URL 또는 SUPABASE_KEY가 설정되지 않았습니다.');
}

const supabase = createClient(config.supabase.url, config.supabase.key);

module.exports = supabase;
