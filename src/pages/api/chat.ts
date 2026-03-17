export const prerender = false;

import fs from 'node:fs';
import path from 'node:path';
import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenAI } from '@google/genai';
import rosterSeed     from '../../data/roster.json';
import resultsSeed    from '../../data/results.json';
import tournamentInfo from '../../data/tournament_info.json';

// ─── Config ───────────────────────────────────────────────────────────────────
const DEFAULT_MODEL  = 'openrouter/free';
const MAX_TOKENS     = 300;
const TEMPERATURE    = 0.3;
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MEMORY_LIMIT   = 3;
const MEMORY_CHARS   = 180;
const MEMORY_TIMEOUT = 600;

// Modelos de fallback en orden — si el primero falla, prueba el siguiente
const FREE_MODELS = [
  'openrouter/free',
  'qwen/qwen-2.5-7b-instruct:free',
  'meta-llama/llama-3.2-3b-instruct:free',
];

// ─── Supabase singleton ───────────────────────────────────────────────────────
let _sb: ReturnType<typeof createClient> | null = null;
const getSupabase = () => {
  if (_sb) return _sb;
  const url = import.meta.env.SUPABASE_URL      || process.env.SUPABASE_URL;
  const key = import.meta.env.SUPABASE_KEY      || process.env.SUPABASE_KEY
           || import.meta.env.SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
           || import.meta.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  _sb = createClient(url, key);
  return _sb;
};

// ─── Data cache ───────────────────────────────────────────────────────────────
let _data: { roster: any; results: any; tournament: any } | null = null;
const getData = () => {
  if (_data) return _data;
  try {
    const dir  = path.join(process.cwd(), 'public', 'data');
    const read = (f: string, seed: any) => {
      const p = path.join(dir, f);
      return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf-8')) : seed;
    };
    _data = {
      roster:     read('roster.json',          rosterSeed     || {}),
      results:    read('results.json',         resultsSeed    || {}),
      tournament: read('tournament_info.json', tournamentInfo || {})
    };
  } catch {
    _data = { roster: rosterSeed || {}, results: resultsSeed || {}, tournament: tournamentInfo || {} };
  }
  return _data;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const normalize  = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const trimText   = (s: string, max = MEMORY_CHARS) => s.replace(/\s+/g, ' ').trim().slice(0, max);

const extractPlayers = (text: string, roster: any): string[] => {
  if (!text || !roster?.players) return [];
  const t = normalize(text);
  const found = new Set<string>();
  for (const p of Object.values(roster.players) as any[]) {
    if (!p?.name) continue;
    const norm = normalize(p.name);
    const first = norm.split(' ')[0];
    if (t.includes(norm) || (first.length > 3 && t.includes(first))) found.add(p.name);
  }
  return [...found];
};

const KEYWORDS = ['jugador','partido','resultado','rating','portero','defensa','mediocampo',
  'delantero','convocatoria','tactica','formacion','rival','torneo','gol','tarjeta',
  'alineacion','veterano','capitan','fortaleza','mejora','arquero',
  'leonardo','fernando','gregorio','jhon','alexander','julian','julio','henry','edgar',
  'cesar','diego','duvan','manuel','yeison','vladimir','oscar','pedro','sergio','wilmer',
  'javier','harold','carlos','fredual','juan'];
const SKIP = ['hola','buenos','gracias','ok','bien','perfecto','entendido','test','prueba'];

const isRelevant = (text: string) => {
  if (!text || text.trim().length < 6) return false;
  const t = normalize(text);
  if (SKIP.some(k => t.includes(k)) && text.trim().length < 40) return false;
  return KEYWORDS.some(k => t.includes(k));
};

// ─── Memoria Supabase ─────────────────────────────────────────────────────────
const fetchMemory = async (query: string, roster: any): Promise<string> => {
  if (!isRelevant(query)) return '';
  const sb = getSupabase();
  if (!sb) return '';
  try {
    const players = extractPlayers(query, roster);
    const base    = sb.from('ai_memory').select('user_query,ai_response');
    const q       = players.length
      ? base.overlaps('players', players).order('created_at', { ascending: false }).limit(MEMORY_LIMIT)
      : base.order('created_at', { ascending: false }).limit(MEMORY_LIMIT);

    const { data } = await Promise.race([
      q,
      new Promise<any>(r => setTimeout(() => r({ data: null }), MEMORY_TIMEOUT))
    ]);

    if (!data?.length) return '';
    const lines = [...data].reverse().map((m: any) => `P:${m.user_query} R:${m.ai_response}`);
    return `\nCONTEXTO PREVIO:\n${lines.join('\n')}`;
  } catch { return ''; }
};

const saveMemory = (userText: string, aiText: string, roster: any) => {
  if (!isRelevant(userText) && !isRelevant(aiText)) return;
  const sb = getSupabase();
  if (!sb) return;
  sb.from('ai_memory').insert([{
    user_query:  trimText(userText),
    ai_response: trimText(aiText),
    players:     extractPlayers(`${userText} ${aiText}`, roster)
  }]).then(({ error }) => {
    if (error) console.error('[Memory] insert failed:', error.message);
    else       console.log('[Memory] ✅ saved');
  });
};

// ─── Summaries compactos ──────────────────────────────────────────────────────
const rosterSummary = (roster: any) => {
  const players  = roster?.players  || {};
  const positions = roster?.positions || {};
  const captains  = (roster?.captains || []).sort((a: any, b: any) => a.order - b.order);
  const dtId      = roster?.dt?.id;

  // Posición principal de cada jugador (la de mayor prioridad)
  const posLabel: Record<string, string> = { porteros: 'POR', defensas: 'DEF', medio: 'MED', delanteros: 'DEL' };
  const playerPos: Record<string, string> = {};
  for (const [pos, list] of Object.entries(positions)) {
    for (const item of (list as any[])) {
      if (!playerPos[item.id] || item.priority === 'high-priority') {
        playerPos[item.id] = posLabel[pos] || pos;
      }
    }
  }

  const capOrder: Record<string, number> = {};
  captains.forEach((c: any) => { capOrder[c.id] = c.order; });

  return Object.entries(players).map(([id, p]: [string, any]) => {
    const tags = [
      p.veteran     ? 'VET'        : '',
      capOrder[id]  ? `C${capOrder[id]}` : '',
      id === dtId   ? 'DT'         : '',
    ].filter(Boolean).join(',');
    const fort = (p.strengths   || []).slice(0, 2).join(',');
    const mej  = (p.improvements|| []).slice(0, 1).join(',');
    return `#${p.number} ${p.name}${tags ? ' ['+tags+']' : ''} ${playerPos[id] || ''} ★${p.rating} | +${fort} | ~${mej}`;
  }).join('\n');
};

const matchSummary = (results: any, roster: any) => {
  const matches = results?.matches || [];
  if (!matches.length) return 'Sin partidos aún.';
  const players = roster?.players || {};

  let wins = 0, draws = 0, losses = 0, gf = 0, gc = 0;
  const lines = matches.map((m: any) => {
    const icon = m.homeScore > m.awayScore ? '✅' : m.homeScore === m.awayScore ? '🟡' : '❌';
    if (m.homeScore > m.awayScore) wins++;
    else if (m.homeScore === m.awayScore) draws++;
    else losses++;
    gf += m.homeScore; gc += m.awayScore;

    const scorers = (m.scorers || [])
      .map((s: any) => `${players[s.playerId]?.name || s.playerId} ${s.goals}gol`)
      .join(', ');
    const fort = (m.strengths   || []).slice(0, 1).join('');
    const mej  = (m.improvements|| []).slice(0, 1).join('');
    return `F${m.id} ${m.date} vs ${m.awayTeam} ${m.homeScore}-${m.awayScore}${icon}${scorers ? ' | '+scorers : ''}${fort ? ' | +'+fort.slice(0,60) : ''}${mej ? ' | ~'+mej.slice(0,60) : ''}`;
  });
  lines.push(`BALANCE: ${wins}V ${draws}E ${losses}D | GF:${gf} GC:${gc}`);
  return lines.join('\n');
};

const tournamentSummary = (t: any) => {
  const tr = t?.tournament  || {};
  const ts = t?.tournament_structure || {};
  const d  = t?.discipline  || {};
  const r  = t?.match_rules || {};
  const sp = t?.special_rules || {};
  return [
    `${tr.name} | Equipo#${tr.team_number} | ${tr.location} | ${tr.schedule}`,
    `${ts.total_teams || 10} equipos, ${ts.total_dates || 9} fechas | Clasif: 5 ganadores + 3 mejores perdedores`,
    `Puntos: V=3 E=1 D=0 | Desempate: dif.goles > goles.favor > directo`,
    `Reglas: ${r.veteran_requirement || '1 veterano 40+'} | susts.${r.substitutions?.includes('ILIM') ? 'ilimitadas' : r.substitutions} | ${r.match_duration || '2×20min'} | mín.${r.minimum_players || 4}`,
    `Tarjetas: amarilla ${d.yellow_card_cost} | azul ${d.blue_card_cost} | roja ${d.red_card_cost}+1fecha susp`,
    `WO: >10min tarde=partido perdido | 2 WO=expulsión torneo`,
    `Planilla: modificable hasta F3 | Carnet sellado obligatorio | Solo capitán reclama al árbitro`,
  ].join('\n');
};

// ─── Llamada a OpenRouter — reintenta en 429 ─────────────────────────────────
const callOpenRouter = async (model: string, system: string, history: any[], orKey: string): Promise<string> => {
  const models = model === 'openrouter/free' ? FREE_MODELS : [model];

  for (const m of models) {
    try {
      const res = await fetch(OPENROUTER_URL, {
        method:  'POST',
        headers: {
          'Authorization': `Bearer ${orKey}`,
          'Content-Type':  'application/json',
          'HTTP-Referer':  'https://torneo-futbol.vercel.app',
          'X-Title':       'Torneo CEA Fútbol 6'
        },
        body:   JSON.stringify({ model: m, messages: [{ role: 'system', content: system }, ...history], temperature: TEMPERATURE, max_tokens: MAX_TOKENS }),
        signal: AbortSignal.timeout(18000),
      });

      if (!res.ok) {
        const body = await res.text();
        // 429 = modelo saturado → probar el siguiente
        if (res.status === 429) { console.warn(`[OR] ${m} rate-limited, trying next`); continue; }
        throw new Error(`OpenRouter ${res.status}: ${body.slice(0, 150)}`);
      }

      const data = await res.json();
      // Algunos modelos "thinking" usan el campo reasoning en lugar de content
      const text = data.choices?.[0]?.message?.content
                || data.choices?.[0]?.message?.reasoning
                || '';
      if (!text) { console.warn(`[OR] ${m} empty response, trying next`); continue; }
      console.log(`[OR] ✅ ${m}`);
      return text;

    } catch (e: any) {
      if (e.name === 'AbortError' || e.name === 'TimeoutError') {
        console.warn(`[OR] ${m} timeout, trying next`);
        continue;
      }
      throw e;
    }
  }

  throw new Error('Todos los modelos fallaron. Intenta en un momento.');
};

// Modelos Gemini en orden de velocidad — fallback automático en 503/429
const GEMINI_MODELS = [
  'gemini-2.5-flash',    // ~1s, más rápido
  'gemini-flash-latest', // ~2s, backup
];

// ─── Llamada a Gemini ─────────────────────────────────────────────────────────
const callGemini = async (model: string, system: string, history: any[], geminiKey: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: geminiKey });
  const contents = history.map((m: any) => ({
    role:  m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content || '' }],
  }));

  // Si el modelo pedido no está en la lista, usarlo solo; si está, usar la lista completa en orden
  const models = GEMINI_MODELS.includes(model) ? GEMINI_MODELS : [model, ...GEMINI_MODELS];

  for (const m of models) {
    try {
      const result = await Promise.race([
        ai.models.generateContent({ model: m, contents, config: { systemInstruction: system, maxOutputTokens: MAX_TOKENS, temperature: TEMPERATURE } }),
        new Promise<never>((_, rej) => setTimeout(() => rej(new Error('Gemini timeout')), 15000))
      ]);
      const text = (result as any).text || '';
      if (!text) { console.warn(`[Gemini] ${m} empty, trying next`); continue; }
      console.log(`[Gemini] ✅ ${m}`);
      return text;
    } catch (e: any) {
      const msg = e.message || '';
      // 503 = sobrecarga, 429 = cuota → probar siguiente
      if (msg.includes('"code":503') || msg.includes('"code":429') || msg.includes('timeout')) {
        console.warn(`[Gemini] ${m} → ${msg.includes('timeout') ? 'timeout' : msg.includes('503') ? 'sobrecarga' : 'cuota'}, trying next`);
        continue;
      }
      throw e;
    }
  }

  throw new Error('Todos los modelos Gemini no disponibles. Intenta en un momento.');
};

// ─── API Route ────────────────────────────────────────────────────────────────
export const POST: APIRoute = async ({ request }) => {
  try {
    const { messages, model, apiKey } = await request.json();

    const useModel  = (model || DEFAULT_MODEL) as string;
    const isGemini  = useModel.startsWith('gemini-');
    const orKey     = (apiKey || import.meta.env.OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY) as string;
    const geminiKey = (import.meta.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY) as string;

    const { roster, results, tournament } = getData();
    const userMsg = [...messages].reverse().find((m: any) => m.role === 'user')?.content || '';
    const memCtx  = await fetchMemory(userMsg, roster);

    const system = `Eres el DT IA del equipo "Tránsito de Girón", Torneo CEA Fútbol 6 (2026).
RESTRICCIÓN: Solo responde sobre el equipo, jugadores, partidos, tácticas y reglas del Fútbol 6.
Si preguntan otra cosa responde EXACTAMENTE: "Solo puedo ayudarte con temas del equipo Tránsito de Girón y el Torneo CEA."

PLANTILLA (#número Nombre [VET=veterano,C1=capitán1°,DT] posición ★rating | +fortalezas | ~mejoras):
${rosterSummary(roster)}

PARTIDOS (F#=fecha | ✅ganado ❌perdido 🟡empate | +fortaleza ~mejora):
${matchSummary(results, roster)}

TORNEO:
${tournamentSummary(tournament)}
${memCtx}
Responde en español, breve y técnico. Usa los nombres exactos de la plantilla.`;

    const history = messages.filter((m: any) => m.role !== 'system').slice(-4);
    console.log(`[Chat] model:${useModel} msgs:${history.length} mem:${!!memCtx}`);

    let aiText: string;
    let provider: string;

    if (isGemini && geminiKey) {
      try {
        aiText   = await callGemini(useModel, system, history, geminiKey);
        provider = 'Gemini';
      } catch (e: any) {
        // Gemini falla (cuota/error) → OpenRouter Free automáticamente
        console.warn(`[Chat] Gemini → fallback OpenRouter (${e.message?.slice(0, 50)})`);
        if (!orKey) throw new Error('Sin modelos disponibles. Verifica las claves API.');
        aiText   = await callOpenRouter('openrouter/free', system, history, orKey);
        provider = 'OpenRouter';
      }
    } else {
      if (!orKey) throw new Error('Falta OPENROUTER_API_KEY en .env');
      aiText   = await callOpenRouter(useModel, system, history, orKey);
      provider = 'OpenRouter';
    }

    saveMemory(userMsg, aiText, roster);

    return new Response(
      JSON.stringify({ content: aiText, modelUsed: `${provider} (${useModel})` }),
      { status: 200 }
    );

  } catch (error: any) {
    console.error('[Chat] Error:', error.message);
    // Devuelve 200 con mensaje de error en content — el frontend lo muestra bien
    return new Response(
      JSON.stringify({ content: `Lo siento, no pude obtener respuesta: ${error.message}`, modelUsed: 'error' }),
      { status: 200 }
    );
  }
};
