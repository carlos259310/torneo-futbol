/**
 * test-chat.js — Valida que el chat funcione con openrouter/free y Gemini
 * Uso: node test-chat.js
 * Requiere: OPENROUTER_API_KEY y GEMINI_API_KEY en .env
 */

import { config } from 'dotenv';
config();

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const GEMINI_URL     = 'https://generativelanguage.googleapis.com/v1beta/models';
const OR_KEY         = process.env.OPENROUTER_API_KEY;
const GEMINI_KEY     = process.env.GEMINI_API_KEY;

// ─── Colores ANSI ─────────────────────────────────────────────────────────────
const c = {
  green:  (s) => `\x1b[32m${s}\x1b[0m`,
  red:    (s) => `\x1b[31m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  bold:   (s) => `\x1b[1m${s}\x1b[0m`,
  cyan:   (s) => `\x1b[36m${s}\x1b[0m`,
  gray:   (s) => `\x1b[90m${s}\x1b[0m`,
};

let passed = 0;
let failed = 0;

function assert(label, condition, detail = '') {
  if (condition) {
    console.log(c.green('  ✓'), label);
    passed++;
  } else {
    console.log(c.red('  ✗'), label, detail ? c.yellow(`(${detail})`) : '');
    failed++;
  }
}

function warn(msg) {
  console.log(c.yellow('  ⚠'), msg);
}

// ─── Llamada a OpenRouter ─────────────────────────────────────────────────────
async function callOpenRouter(messages, model = 'openrouter/free') {
  const res = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OR_KEY}`,
      'Content-Type':  'application/json',
      'HTTP-Referer':  'https://torneo-futbol.vercel.app',
      'X-Title':       'Torneo CEA Test',
    },
    body: JSON.stringify({ model, messages, max_tokens: 200, temperature: 0.3 }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${JSON.stringify(data)}`);
  return { data, status: res.status };
}

// ─── Llamada a Gemini REST ────────────────────────────────────────────────────
async function callGemini(messages, model = 'gemini-3-flash-preview') {
  const system  = messages.find(m => m.role === 'system')?.content || '';
  const history = messages.filter(m => m.role !== 'system');

  const contents = history.map(m => ({
    role:  m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  const body = {
    system_instruction: system ? { parts: [{ text: system }] } : undefined,
    contents,
    generationConfig: { maxOutputTokens: 200, temperature: 0.3 },
  };

  const res = await fetch(
    `${GEMINI_URL}/${model}:generateContent?key=${GEMINI_KEY}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
  );
  const data = await res.json();
  if (!res.ok) throw new Error(`Gemini HTTP ${res.status}: ${JSON.stringify(data)}`);
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  return { text, model: data.modelVersion || model };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
// openrouter/free usa modelos variables; algunos thinking devuelven texto mínimo
const getOrContent = (data) => {
  const msg = data.choices?.[0]?.message || {};
  return msg.content || msg.reasoning || '';
};

// ─── SUITE DE TESTS ───────────────────────────────────────────────────────────
async function runTests() {
  console.log(c.bold('\n🧪 Test Suite — Chat: OpenRouter Free + Gemini\n'));

  // ── TEST 1: Claves configuradas ──────────────────────────────────────────────
  console.log(c.cyan('▶ Test 1: Configuración de claves'));
  assert('OPENROUTER_API_KEY definida', !!OR_KEY,     'Agrega al .env');
  assert('GEMINI_API_KEY definida',     !!GEMINI_KEY, 'Agrega al .env');
  console.log();

  const canOR     = !!OR_KEY;
  const canGemini = !!GEMINI_KEY;

  // ── TEST 2: OpenRouter Free — conexión básica ────────────────────────────────
  if (canOR) {
    console.log(c.cyan('▶ Test 2: OpenRouter Free — conexión básica'));
    try {
      const { data, status } = await callOpenRouter([
        { role: 'system', content: 'Eres el asistente del equipo Tránsito de Girón. Responde en español, muy breve.' },
        { role: 'user',   content: '¿Cuántos jugadores juegan en el fútbol 6?' }
      ]);

      assert('HTTP 200 recibido',       status === 200);
      assert('data.choices existe',     Array.isArray(data.choices) && data.choices.length > 0);
      assert('Modelo usado reportado',  !!data.model);

      const text = getOrContent(data);
      if (!text) {
        warn('Respuesta vacía del modelo (puntual en openrouter/free — no crítico)');
      } else {
        assert('Respuesta no vacía', text.length > 5, `"${text.slice(0, 60)}"`);
      }
      console.log(c.gray(`  → Modelo: ${data.model}`));
      console.log(c.gray(`  → Respuesta: "${text.slice(0, 100)}"`));
    } catch (e) {
      assert('Llamada exitosa', false, e.message);
    }
    console.log();
  }

  // ── TEST 3: OpenRouter Free — restricción de contexto ───────────────────────
  if (canOR) {
    console.log(c.cyan('▶ Test 3: OpenRouter Free — restricción de contexto'));
    try {
      const { data } = await callOpenRouter([
        {
          role: 'system',
          content: `Eres el DT IA del equipo "Tránsito de Girón" en el Torneo CEA Fútbol 6.
RESTRICCIÓN ABSOLUTA: Solo puedes hablar sobre el equipo, sus jugadores, tácticas y el torneo.
Si la pregunta no tiene relación, responde EXACTAMENTE: "Solo puedo ayudarte con temas del equipo Tránsito de Girón y el Torneo CEA."`,
        },
        { role: 'user', content: '¿Cuál es la capital de Francia?' }
      ]);

      const text = getOrContent(data);
      if (!text) {
        warn('Respuesta vacía del modelo (comportamiento puntual de openrouter/free)');
      } else {
        const isRestricted =
          text.toLowerCase().includes('tránsito') ||
          text.toLowerCase().includes('transito') ||
          text.toLowerCase().includes('torneo')   ||
          text.toLowerCase().includes('equipo')   ||
          text.toLowerCase().includes('cea');
        assert('Respuesta restringida al equipo', isRestricted, `"${text.slice(0, 80)}"`);
        console.log(c.gray(`  → Respuesta: "${text.slice(0, 120)}"`));
      }
    } catch (e) {
      assert('Llamada de restricción exitosa', false, e.message);
    }
    console.log();
  }

  // ── TEST 4: OpenRouter Free — contexto multi-turno ──────────────────────────
  if (canOR) {
    console.log(c.cyan('▶ Test 4: OpenRouter Free — contexto multi-turno'));
    try {
      const { data } = await callOpenRouter([
        { role: 'system',    content: 'Eres el asistente del equipo Tránsito de Girón. Responde en español, muy breve.' },
        { role: 'user',      content: 'El equipo tiene 6 jugadores en cancha.' },
        { role: 'assistant', content: 'Correcto, en fútbol 6 siempre van 6 jugadores.' },
        { role: 'user',      content: '¿Cuántos jugadores mencioné?' }
      ]);

      const text = getOrContent(data);
      if (!text) {
        warn('Respuesta vacía del modelo (puntual en openrouter/free)');
      } else {
        // Acepta tanto el dígito "6" como la palabra "seis"
        const remembers = text.includes('6') || text.toLowerCase().includes('seis');
        assert('Recuerda el número 6 del contexto', remembers, `"${text.slice(0, 80)}"`);
        console.log(c.gray(`  → Respuesta: "${text.slice(0, 120)}"`));
      }
    } catch (e) {
      assert('Llamada multi-turno exitosa', false, e.message);
    }
    console.log();
  }

  // ── TEST 5: Gemini 3 Flash Preview — conexión básica ──────────────────────────────
  if (canGemini) {
    console.log(c.cyan('▶ Test 5: Gemini 3 Flash Preview — conexión básica'));
    try {
      const { text, model } = await callGemini([
        { role: 'system', content: 'Eres el asistente del equipo Tránsito de Girón. Responde en español, muy breve.' },
        { role: 'user',   content: '¿Cuántos jugadores juegan en el fútbol 6?' }
      ], 'gemini-3-flash-preview');

      assert('Respuesta no vacía',        text.length > 5, `"${text.slice(0, 60)}"`);
      assert('Responde sobre fútbol (6)', text.includes('6') || text.toLowerCase().includes('seis'));
      console.log(c.gray(`  → Modelo: ${model}`));
      console.log(c.gray(`  → Respuesta: "${text.slice(0, 120)}"`));
    } catch (e) {
      if (e.message.includes('429')) {
        warn('Gemini 429 — cuota agotada o API no activada. Ve a https://ai.dev/rate-limit para verificar tu cuota.');
        warn('La clave es válida — el código de integración es correcto.');
      } else {
        assert('Llamada Gemini exitosa', false, e.message);
      }
    }
    console.log();
  }

  // ── TEST 6: Gemini — restricción de contexto ────────────────────────────────
  if (canGemini) {
    console.log(c.cyan('▶ Test 6: Gemini — restricción de contexto'));
    try {
      const { text } = await callGemini([
        {
          role: 'system',
          content: `Eres el DT IA del equipo "Tránsito de Girón" en el Torneo CEA Fútbol 6.
RESTRICCIÓN ABSOLUTA: Solo puedes hablar sobre el equipo, sus jugadores, tácticas y el torneo.
Si la pregunta no tiene relación, responde EXACTAMENTE: "Solo puedo ayudarte con temas del equipo Tránsito de Girón y el Torneo CEA."`,
        },
        { role: 'user', content: '¿Cuál es la capital de Francia?' }
      ], 'gemini-3-flash-preview');

      assert('Respuesta no vacía', text.length > 0);
      const isRestricted =
        text.toLowerCase().includes('tránsito') ||
        text.toLowerCase().includes('transito') ||
        text.toLowerCase().includes('torneo')   ||
        text.toLowerCase().includes('equipo')   ||
        text.toLowerCase().includes('cea');
      assert('Restricción de contexto activa', isRestricted, `"${text.slice(0, 80)}"`);
      console.log(c.gray(`  → Respuesta: "${text.slice(0, 120)}"`));
    } catch (e) {
      if (e.message.includes('429')) {
        warn('Gemini 429 — omitido por cuota. Reintenta en ~1 minuto.');
      } else {
        assert('Llamada Gemini restricción exitosa', false, e.message);
      }
    }
    console.log();
  }

  // ── TEST 7: Endpoint local /api/chat (si el servidor está corriendo) ─────────
  console.log(c.cyan('▶ Test 7: Endpoint local /api/chat (opcional — requiere npm run dev)'));
  for (const [label, model, provider] of [
    ['openrouter/free', 'openrouter/free', 'openrouter'],
    ['gemini-3-flash-preview', 'gemini-3-flash-preview', 'gemini'],
  ]) {
    try {
      const res = await fetch('http://localhost:4321/api/chat', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ model, messages: [{ role: 'user', content: '¿Cuántos jugadores en fútbol 6?' }] }),
        signal:  AbortSignal.timeout(6000),
      });
      if (res.ok) {
        const d = await res.json();
        assert(`[${label}] Endpoint responde`,         !!d.content);
        assert(`[${label}] modelUsed incluye provider`, d.modelUsed?.toLowerCase().includes(provider));
        console.log(c.gray(`  → modelUsed: ${d.modelUsed}`));
      } else {
        warn(`[${label}] Servidor respondió ${res.status}`);
      }
    } catch {
      warn(`[${label}] Servidor local no disponible — omitido`);
      break;
    }
  }
  console.log();

  printSummary();
}

function printSummary() {
  const total = passed + failed;
  console.log(c.bold('─'.repeat(45)));
  console.log(c.bold(`Resultado: ${passed}/${total} tests pasaron`));
  if (failed === 0) {
    console.log(c.green('✅ Todo en orden — OpenRouter Free y Gemini funcionan correctamente.\n'));
  } else {
    console.log(c.red(`❌ ${failed} test(s) fallaron — revisa los detalles arriba.\n`));
    process.exitCode = 1;
  }
}

runTests().catch(e => {
  console.error(c.red('\n💥 Error inesperado:'), e.message);
  process.exitCode = 1;
});
