import { createClient } from '@supabase/supabase-js';
export { renderers } from '../../renderers.mjs';

const prerender = false;
const GET = async () => {
  const url = "https://wkvpqmladoihgguklriu.supabase.co";
  const anonKey = process.env.SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const checks = {
    SUPABASE_URL: "✅ Set" ,
    SUPABASE_ANON_KEY: anonKey ? "✅ Set" : "❌ Missing",
    SUPABASE_SERVICE_ROLE_KEY: serviceKey ? "✅ Set" : "❌ Missing"
  };
  if (serviceKey) {
    const admin = createClient(url, serviceKey);
    const { data: readData, error: readErr } = await admin.from("ai_memory").select("*").limit(1);
    checks.READ = readErr ? `❌ ${readErr.message}` : `✅ OK (${(readData || []).length} rows)`;
    const { error: writeErr } = await admin.from("ai_memory").insert([{
      user_query: "TEST - debug check",
      ai_response: "TEST - this is a test entry",
      players: []
    }]);
    checks.WRITE = writeErr ? `❌ ${writeErr.message}` : "✅ OK (inserted test row)";
  } else {
    checks.CONNECTION = "❌ Cannot test - missing credentials";
  }
  return new Response(JSON.stringify(checks, null, 2), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });
};

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  GET,
  prerender
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
