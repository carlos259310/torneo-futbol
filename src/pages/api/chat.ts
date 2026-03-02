export const prerender = false;

import fs from 'node:fs';
import path from 'node:path';
import type { APIRoute } from 'astro';
import { GoogleGenerativeAI } from '@google/generative-ai';
import Groq from 'groq-sdk';
import { createClient } from '@supabase/supabase-js';
import rosterSeed from '../../data/roster.json';
import resultsSeed from '../../data/results.json';
import tournamentInfo from '../../data/tournament_info.json';

// Helper to get Supabase clients lazily (important for Serverless/Vercel env vars)
const getSupabase = () => {
    const url = import.meta.env.SUPABASE_URL || process.env.SUPABASE_URL;
    const anon = import.meta.env.SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
    if (!url || !anon) return null;
    return createClient(url, anon);
};

const getSupabaseAdmin = () => {
    const url = import.meta.env.SUPABASE_URL || process.env.SUPABASE_URL;
    const key = import.meta.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
        console.warn('[Memory] Missing Supabase Admin credentials');
        return null;
    }
    return createClient(url, key);
};

// Helper to load data
const loadData = async () => {
  try {
    const dataDir = path.join(process.cwd(), 'public', 'data');
    const rosterPath = path.join(dataDir, 'roster.json');
    const resultsPath = path.join(dataDir, 'results.json');
    const tournamentPath = path.join(dataDir, 'tournament_info.json');

    const roster = fs.existsSync(rosterPath) ? JSON.parse(fs.readFileSync(rosterPath, 'utf-8')) : (rosterSeed || {});
    const results = fs.existsSync(resultsPath) ? JSON.parse(fs.readFileSync(resultsPath, 'utf-8')) : (resultsSeed || {});
    const tournament = fs.existsSync(tournamentPath) ? JSON.parse(fs.readFileSync(tournamentPath, 'utf-8')) : (tournamentInfo || {});
    
    return { roster, results, tournament };
  } catch (e) {
    console.error("Error loading data:", e);
    return { roster: rosterSeed || {}, results: resultsSeed || {}, tournament: tournamentInfo || {} };
  }
};

// Smart memory fetch: prioritizes entries mentioning players in the query,
// falls back to most recent entries
const fetchRelevantMemory = async (query: string, roster: any): Promise<any[]> => {
  const client = getSupabase();
  if (!client) return [];

  try {
    const players = extractPlayers(query, roster);

    // If specific players mentioned → filter by those players first
    if (players.length > 0) {
      const { data, error } = await client
        .from('ai_memory')
        .select('*')
        .overlaps('players', players)
        .order('created_at', { ascending: false })
        .limit(MEMORY_CONTEXT_LIMIT);

      if (!error && data && data.length > 0) {
        console.log(`[Memory] Smart fetch: ${data.length} entries for players: ${players.join(', ')}`);
        return data.reverse();
      }
    }

    // Fallback: most recent relevant entries
    const { data, error } = await client
      .from('ai_memory')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(MEMORY_CONTEXT_LIMIT);

    if (error) {
      console.error('[Supabase] Failed to fetch memory:', error.message);
      return [];
    }
    return (data || []).reverse();
  } catch (dbError: any) {
    console.error('[Supabase] Exception during memory fetch:', dbError.message);
    return [];
  }
};

const MEMORY_LIMIT = 200;
const MEMORY_CONTEXT_LIMIT = 10;  // reduces tokens sent per request
const MEMORY_MAX_CHARS = 200;

// Normalize: lowercase + remove accents (fixes 'formación' → matches 'formacion')
const normalizeText = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

// Pre-normalized keywords (no accents) so they match normalizeText() output correctly
const RELEVANT_KEYWORDS = [
  'alineacion','jugador','jugadores','partido','resultado','fortalezas','mejoras',
  'rating','portero','defensa','defensas','mediocampo','medio','delantero','convocatoria',
  'capitan','dt','director tecnico','entrenamiento','tactica','formacion',
  'rival','proximo','torneo','fecha','horario','puntos','tabla','reglas','reglamento',
  'costo','tarjeta','amarilla','roja','gol','goles','anotador','arquero',
  'leonardo','fernando','gregorio','jhon','alexander','julian','julio','henry','edgar',
  'cesar','diego','duvan','manuel','yeison','vladimir','oscar','pedro','sergio','wilmer',
  'javier','harold','carlos','fredual','juan'
];

const IRRELEVANT_PATTERNS = [
  'hola','buenos dias','buenas tardes','buenas noches','como estas',
  'gracias','ok','vale','bien','perfecto','entendido','test','prueba',
  'ayuda','que puedes hacer','quien eres'
];

const shouldStoreMemory = (text: string) => {
  if (!text || text.trim().length < 6) return false;
  const t = normalizeText(text);  // no accents, lowercase

  // Short irrelevant greetings/acks → skip
  const isIrrelevant = IRRELEVANT_PATTERNS.some(p => new RegExp(`\\b${p}\\b`).test(t));
  if (isIrrelevant && text.trim().length < 40) return false;

  // Must contain at least one relevant keyword (all pre-normalized)
  return RELEVANT_KEYWORDS.some(k => t.includes(k));
};

const trimForMemory = (text: string) => {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  return cleaned.length > MEMORY_MAX_CHARS ? cleaned.slice(0, MEMORY_MAX_CHARS) + '...' : cleaned;
};

const extractPlayers = (text: string, roster: any) => {
  if (!text || !roster?.players) return [] as string[];
  const t = normalizeText(text);
  const names: string[] = [];
  for (const p of Object.values(roster.players) as any[]) {
    if (!p?.name) continue;
    const norm = normalizeText(p.name);
    const firstName = norm.split(' ')[0];
    // Match full normalized name OR first word (if long enough to avoid false positives)
    if (t.includes(norm) || (firstName.length > 3 && t.includes(firstName))) {
      names.push(p.name);
    }
  }
  return Array.from(new Set(names));
};

// Compressed roster: only fields the AI needs to make decisions
const buildRosterSummary = (roster: any) =>
  Object.entries(roster?.players || {}).map(([id, p]: [string, any]) => ({
    id, name: p.name, num: p.number, vet: p.veteran, rating: p.rating
  }));

const addMemoryEntry = async (userText: string, assistantText: string, roster: any) => {
  const admin = getSupabaseAdmin();
  const shouldStore = shouldStoreMemory(userText) || shouldStoreMemory(assistantText);
  
  if (!shouldStore || !admin) {
    console.log('[Memory] SKIPPED - shouldStore:', shouldStore, ', hasAdmin:', !!admin);
    return { success: false, reason: !admin ? 'no_admin_client' : 'filtered' };
  }
  
  try {
    const entry = {
      user_query: trimForMemory(userText),
      ai_response: trimForMemory(assistantText),
      players: extractPlayers(userText + ' ' + assistantText, roster)
    };

    const { error } = await admin.from('ai_memory').insert([entry]);
    if (error) {
      console.error('[Supabase] Memory insert failed:', error.message);
      return { success: false, reason: error.message };
    }
    console.log('[Memory] ✅ Saved to Supabase');
    return { success: true };
  } catch (dbError: any) {
    console.error('[Supabase] Exception during memory insert:', dbError.message);
    return { success: false, reason: dbError.message };
  }
};

const buildMemoryContext = (memory: any[]) => {
  if (!Array.isArray(memory) || memory.length === 0) return '';
  const recent = memory.slice(-MEMORY_CONTEXT_LIMIT);
  const lines = recent.map((m: any) => {
    const date = (m.created_at || '').slice(0, 10);
    const players = (m.players && m.players.length) ? ` (jugadores: ${m.players.join(', ')})` : '';
    return `- [${date}] Q: ${m.user_query} | A: ${m.ai_response}${players}`;
  });
  return `\nMEMORIA (notas relevantes):\n${lines.join('\n')}\n`;
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    let { messages, provider, model, apiKey } = body;
    let modelUsed = model;

    // Load Data + smart memory fetch after we know the user's question
    const teamData = await loadData();
    const lastUserMessage = [...messages].reverse().find((m: any) => m.role === 'user')?.content || '';
    const memory = await fetchRelevantMemory(lastUserMessage, teamData?.roster);
    const memoryContext = buildMemoryContext(memory);

    // Compressed context: no pretty-print JSON, only essential roster fields → saves ~40% tokens
    const systemContext = `ROL: Eres el Asistente Técnico (DT IA) de "Tránsito de Girón" en el Torneo CEA Fútbol 6 (2026).
RESTRICCIÓN: Tu único tema es el torneo, el equipo Tránsito de Girón y sus jugadores. Si la pregunta no tiene ninguna relación con esto, responde amablemente: "Soy el asistente del equipo, solo puedo ayudarte con temas del torneo, partidos o jugadores. ¿Tienes alguna duda del equipo?"
PLANTILLA:${JSON.stringify(buildRosterSummary(teamData?.roster))}
RESULTADOS:${JSON.stringify((teamData?.results as any)?.matches || [])}
TORNEO:${JSON.stringify(teamData?.tournament || {})}${memoryContext}
REGLAS:
1. Usa nombres EXACTOS del JSON. No inventes jugadores.
2. Fútbol 6: 6 jugadores (portero incluido), veterano 40+ obligatorio, sustituciones ilimitadas.
3. Partidos: 2×20 min. Mínimo 4 en cancha.
4. Responde técnico, motivador, breve y claro.`;

    // Prepend System Message
    const refinedMessages = [
        { role: 'system', content: systemContext },
        ...messages.filter((m: any) => m.role !== 'system')
    ];

    const respond = async (text: string, modelLabel: string, extraNote?: string) => {
        const finalText = extraNote ? `${text}

${extraNote}` : text;
        const memoryResult = await addMemoryEntry(lastUserMessage, text, teamData?.roster);
        return new Response(JSON.stringify({ 
          content: finalText, 
          modelUsed: modelLabel,
          memorySaved: memoryResult?.success || false,
          memoryNote: memoryResult?.reason || 'OK'
        }), { status: 200 });
    };

    // 1. Define Keys & Helpers
    const geminiKey = apiKey || import.meta.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY;
    const requestedProvider = (provider || 'groq').toLowerCase();

    // Helper: Groq
    const runGroq = async (msgs: any[], userKey?: string) => {
        const gKey = userKey || import.meta.env.GROQ_API_KEY || process.env.GROQ_API_KEY;
        if (!gKey) throw new Error("Missing GROQ_API_KEY");
        
        const groq = new Groq({ apiKey: gKey });
        const finalModel = "llama-3.3-70b-versatile"; 
        modelUsed = finalModel;
        
        const completion = await groq.chat.completions.create({
            messages: msgs,
            model: finalModel,
        });
        return completion.choices[0]?.message?.content || "";
    };

    // Helper: DeepSeek
    const runDeepSeek = async (msgs: any[], userKey?: string) => {
        const dsKey = userKey || import.meta.env.DEEPSEEK_API_KEY || process.env.DEEPSEEK_API_KEY;
        if (!dsKey) throw new Error("Missing DEEPSEEK_API_KEY");
        
        const openai = new Groq({ apiKey: dsKey, baseURL: 'https://api.deepseek.com' }); 
        const finalModel = model || "deepseek-chat";
        modelUsed = finalModel;
        
        // @ts-ignore
        const completion = await openai.chat.completions.create({
            messages: msgs,
            model: finalModel,
        });
        return completion.choices[0]?.message?.content || "";
    };

    // Helper: Gemini
    const runGemini = async (modelName: string) => {
        if (!geminiKey) throw new Error("No Gemini Key");
        const genAI = new GoogleGenerativeAI(geminiKey);
        modelUsed = modelName;
        
        const geminiModel = genAI.getGenerativeModel({
            model: modelName,
            systemInstruction: systemContext,
            generationConfig: {
                maxOutputTokens: 800,
                temperature: 0.7,
            }
        });

        const conversation = messages.filter((m: any) => m.role !== 'system').map((m: any) => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }]
        }));

        // Gemini history MUST start with 'user' role
        let history = conversation.length > 0 ? conversation.slice(0, -1) : [];
        const firstUserIndex = history.findIndex((m: {role: string, parts: {text: string}[]}) => m.role === 'user');
        
        if (firstUserIndex === -1 && history.length > 0) {
            console.log('[Gemini] History starts with model, clearing history to avoid error');
            history = [];
        } else if (firstUserIndex > 0) {
            console.log(`[Gemini] Slicing history from index ${firstUserIndex} to find first user message`);
            history = history.slice(firstUserIndex);
        }

        const chat = geminiModel.startChat({ history });
        
        const lastMessage = conversation.length > 0 
            ? conversation[conversation.length - 1].parts[0].text 
            : body.messages[body.messages.length - 1].content;

        try {
            console.log(`[Gemini] Sending message to ${modelName}...`);
            const result = await chat.sendMessage(lastMessage);
            return result.response.text();
        } catch (sendError: any) {
            console.error(`[Gemini] Send error (${modelName}):`, sendError.message);
            throw sendError;
        }
    };

    // Provider routing
    if (requestedProvider === 'groq') {
        const text = await runGroq(refinedMessages, apiKey);
        return await respond(text, `Groq (${modelUsed})`);
    }

    if (requestedProvider === 'deepseek') {
        const text = await runDeepSeek(refinedMessages, apiKey);
        return await respond(text, `DeepSeek (${modelUsed})`);
    }

    // Default to Gemini with Groq fallback
    try {
        if (!geminiKey) throw new Error("No Gemini Key");

        // Solo modelos confirmados disponibles con esta API key (gratuita)
        const geminiCandidates = [
            (model && model.includes('gemini')) ? model : null,
            'gemini-2.0-flash',
            'gemini-2.0-flash-lite',
        ].filter(Boolean) as string[];

        let lastError: any = null;
        for (const useModel of geminiCandidates) {
            try {
                const text = await runGemini(useModel);
                return await respond(text, `Gemini (${useModel})`);
            } catch (e: any) {
                lastError = e;
                console.warn(`Gemini model failed (${useModel})`, e.message);
                // If it's a 429 or quota error, try next
                if (e.message?.includes('429') || e.message?.includes('quota')) continue;
                // If it's a 404 model not found, try next
                if (e.message?.includes('404')) continue;
                // Otherwise throw to trigger Groq fallback
                throw e;
            }
        }

        throw new Error("Gemini models exhausted: " + (lastError?.message || "unknown error"));
    } catch (geminiFinalError: any) {
        console.warn("All Gemini attempts failed. Trying Groq fallback...", geminiFinalError.message);
        try {
            const text = await runGroq(refinedMessages, apiKey);
            return await respond(text, `Groq (${modelUsed})`);
        } catch (groqError: any) {
            return new Response(JSON.stringify({ error: `All providers failed. Gemini: ${geminiFinalError.message}. Groq: ${groqError.message}` }), { status: 500 });
        }
    }


  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
