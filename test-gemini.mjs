/**
 * test-gemini.mjs
 * Valida qué modelos de Gemini funcionan con tu API key.
 * USO: node test-gemini.mjs TU_GEMINI_API_KEY
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.argv[2] || process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.error('❌ Pasa tu clave como argumento: node test-gemini.mjs TU_API_KEY');
  process.exit(1);
}

// Modelos gratuitos candidatos (ordenados por preferencia)
const MODELS = [
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
  'gemini-1.5-flash',
  'gemini-2.0-flash-exp',
  'gemini-1.5-flash-8b',
];

const genAI = new GoogleGenerativeAI(apiKey);

console.log(`\n🔑 Probando clave: ${apiKey.slice(0, 8)}...\n`);

for (const modelName of MODELS) {
  try {
    const model = genAI.getGenerativeModel({ model: modelName });
    const result = await model.generateContent('Responde solo: OK');
    const text = result.response.text().trim();
    console.log(`✅ ${modelName.padEnd(30)} → "${text}"`);
  } catch (e) {
    const reason = e.message?.includes('404') ? 'Modelo no disponible (404)'
      : e.message?.includes('429') ? 'Cuota excedida (429)'
      : e.message?.includes('403') ? 'Sin permiso (403)'
      : e.message?.slice(0, 60);
    console.log(`❌ ${modelName.padEnd(30)} → ${reason}`);
  }
}

console.log('\n✅ = usar este modelo | ❌ 404 = no disponible | ❌ 429 = espera cuota\n');
