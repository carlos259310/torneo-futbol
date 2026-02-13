export const prerender = false;

import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';

export const GET: APIRoute = async () => {
  const url = import.meta.env.SUPABASE_URL || process.env.SUPABASE_URL;
  const anonKey = import.meta.env.SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  const serviceKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  const checks: Record<string, any> = {
    SUPABASE_URL: url ? '✅ Set' : '❌ Missing',
    SUPABASE_ANON_KEY: anonKey ? '✅ Set' : '❌ Missing',
    SUPABASE_SERVICE_ROLE_KEY: serviceKey ? '✅ Set' : '❌ Missing',
  };

  // Test connection + insert with service key
  if (url && serviceKey) {
    const admin = createClient(url, serviceKey);

    // Test READ
    const { data: readData, error: readErr } = await admin
      .from('ai_memory')
      .select('*')
      .limit(1);
    checks.READ = readErr ? `❌ ${readErr.message}` : `✅ OK (${(readData || []).length} rows)`;

    // Test WRITE
    const { error: writeErr } = await admin.from('ai_memory').insert([{
      user_query: 'TEST - debug check',
      ai_response: 'TEST - this is a test entry',
      players: []
    }]);
    checks.WRITE = writeErr ? `❌ ${writeErr.message}` : '✅ OK (inserted test row)';
  } else {
    checks.CONNECTION = '❌ Cannot test - missing credentials';
  }

  return new Response(JSON.stringify(checks, null, 2), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};
