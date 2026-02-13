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

// Supabase Setup: Cliente para lectura (público) y escritura (privado/seguro)
const supabaseUrl = import.meta.env.SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseAnonKey = import.meta.env.SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

// Cliente público (solo lectura)
const supabase = (supabaseUrl && supabaseAnonKey) ? createClient(supabaseUrl, supabaseAnonKey) : null;

// Cliente privado del servidor (puede escribir con seguridad)
const supabaseAdmin = (supabaseUrl && supabaseServiceKey) ? createClient(supabaseUrl, supabaseServiceKey) : null;

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
    
    // Memory: Fetch from Supabase (with graceful fallback)
    let memory = [];
    if (supabase) {
        try {
            const { data, error } = await supabase
                .from('ai_memory')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(20);
            
            if (error) {
                console.error('[Supabase] Failed to fetch memory:', error.message);
            } else {
                memory = (data || []).reverse();
            }
        } catch (dbError: any) {
            console.error('[Supabase] Exception during memory fetch:', dbError.message);
        }
    }
    
    return { roster, results, tournament, memory };
  } catch (e) {
    console.error("Error loading data:", e);
    return { roster: rosterSeed || {}, results: resultsSeed || {}, tournament: tournamentInfo || {}, memory: [] };
  }
};

const MEMORY_LIMIT = 200;
const MEMORY_CONTEXT_LIMIT = 20;
const MEMORY_MAX_CHARS = 280;

const normalizeText = (s: string) => s.toLowerCase();

const shouldStoreMemory = (text: string) => {
  if (!text || text.trim().length < 6) return false;
  const t = normalizeText(text);
  
  // Keywords relevantes del equipo/torneo que SÍ queremos guardar
  const relevantKeywords = [
    'alineacion','alineación','jugador','jugadores','partido','resultado','fortalezas','mejoras',
    'rating','portero','defensa','defensas','mediocampo','medio','delantero','convocatoria',
    'capitan','capitán','dt','director tecnico','director técnico','entrenamiento','táctica',
    'tactica','formacion','formación','rival','proximo','próximo','torneo','fecha','horario'
  ];
  
  // Palabras que indican preguntas genéricas/irrelevantes que NO queremos guardar
  const irrelevantPatterns = [
    'hola', 'buenos dias', 'buenas tardes', 'buenas noches', 'como estas', 'cómo estás',
    'gracias', 'ok', 'vale', 'bien', 'perfecto', 'entendido', 'test', 'prueba',
    'ayuda', 'que puedes hacer', 'qué puedes hacer', 'quien eres', 'quién eres'
  ];
  
  // Si contiene patrones irrelevantes y es muy corto, NO guardar
  const isIrrelevant = irrelevantPatterns.some(pattern => {
    const regex = new RegExp(`\\b${pattern}\\b`, 'i');
    return regex.test(t);
  });
  
  if (isIrrelevant && text.trim().length < 30) return false;
  
  // Solo guardar si contiene keywords relevantes
  return relevantKeywords.some(k => t.includes(k));
};

const trimForMemory = (text: string) => {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  return cleaned.length > MEMORY_MAX_CHARS ? cleaned.slice(0, MEMORY_MAX_CHARS) + '...' : cleaned;
};

const extractPlayers = (text: string, roster: any) => {
  if (!text || !roster || !roster.players) return [] as string[];
  const t = normalizeText(text);
  const names: string[] = [];
  for (const id of Object.keys(roster.players)) {
    const name = roster.players[id]?.name;
    if (!name) continue;
    if (t.includes(name.toLowerCase())) names.push(name);
  }
  return Array.from(new Set(names));
};

const addMemoryEntry = async (userText: string, assistantText: string, roster: any) => {
  console.log('[Memory] Checking if should store. User text:', userText?.substring(0, 50));
  console.log('[Memory] supabaseAdmin exists:', !!supabaseAdmin);
  console.log('[Memory] shouldStore(user):', shouldStoreMemory(userText));
  console.log('[Memory] shouldStore(assistant):', shouldStoreMemory(assistantText));
  
  // Store if EITHER user query OR AI response contains relevant keywords
  const shouldStore = shouldStoreMemory(userText) || shouldStoreMemory(assistantText);
  
  if (!shouldStore || !supabaseAdmin) {
    console.log('[Memory] SKIPPED - shouldStore:', shouldStore, ', hasAdmin:', !!supabaseAdmin);
    return;
  }
  
  try {
    const entry = {
      user_query: trimForMemory(userText),
      ai_response: trimForMemory(assistantText),
      players: extractPlayers(userText + ' ' + assistantText, roster)
    };

    console.log('[Memory] Inserting entry:', JSON.stringify(entry).substring(0, 100));
    const { error } = await supabaseAdmin.from('ai_memory').insert([entry]);
    if (error) {
      console.error('[Supabase] Memory insert failed:', error.message);
    } else {
      console.log('[Memory] ✅ Successfully saved to Supabase');
    }
  } catch (dbError: any) {
    console.error('[Supabase] Exception during memory insert:', dbError.message);
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

    // Load Data Context
    const teamData = await loadData();
    const memoryContext = buildMemoryContext(teamData?.memory || []);
    const systemContext = `
    ROL: Eres el Asistente Técnico Inteligente (DT IA) del equipo "Tránsito de Girón" en el Torneo CEA Fútbol 6 (6ta Edición 2026).
    OBJETIVO: Ayudar al DT a tomar decisiones basadas EXCLUSIVAMENTE en los datos del equipo y del torneo.
    
    DATOS DEL EQUIPO (NO INVENTES JUGADORES):
    ${JSON.stringify(teamData?.roster || {}, null, 2)}
    
    RESULTADOS RECIENTES:
    ${JSON.stringify(teamData?.results || {}, null, 2)}
    
    REGLAMENTO Y FIXTURE DEL TORNEO:
    ${JSON.stringify(teamData?.tournament || {}, null, 2)}
    ${memoryContext}
    INSTRUCCIONES CLAVE:
    1. Responde de forma técnica pero motivadora.
    2. Usa los NOMBRES EXACTOS de los jugadores en el JSON.
    3. ALINEACIONES: Cuando sugieras una alineación, SOLO lista Posición: Nombre. Hazlo simple y directo.
    4. Futbol 6: 6 jugadores (incluye portero). Veterano de 40+ años obligatorio. Sustituciones ILIMITADAS.
    5. Partidos: 2 tiempos de 20 minutos. Mínimo 4 jugadores en cancha.
    6. Si preguntan sobre reglas, fixture, equipos rivales o costos de tarjetas, usa el REGLAMENTO DEL TORNEO.
    7. Responde breve y claro.
    `;

    // Prepend System Message
    const refinedMessages = [
        { role: 'system', content: systemContext },
        ...messages.filter((m: any) => m.role !== 'system')
    ];

    const lastUserMessage = [...messages].reverse().find((m: any) => m.role === 'user')?.content || '';

    const respond = async (text: string, modelLabel: string, extraNote?: string) => {
        const finalText = extraNote ? `${text}

${extraNote}` : text;
        await addMemoryEntry(lastUserMessage, text, teamData?.roster);
        return new Response(JSON.stringify({ content: finalText, modelUsed: modelLabel }), { status: 200 });
    };

    // 1. Define Keys & Helpers
    const geminiKey = apiKey || import.meta.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY;
    const requestedProvider = (provider || 'groq').toLowerCase();

    // Helper: Groq
    const runGroq = async (msgs: any[], userKey?: string) => {
        const gKey = userKey || import.meta.env.GROQ_API_KEY || process.env.GROQ_API_KEY;
        if (!gKey) throw new Error("Missing GROQ_API_KEY");
        
        const groq = new Groq({ apiKey: gKey });
        // Use confirmed working model
        const finalModel = "llama-3.3-70b-versatile"; 
        modelUsed = finalModel;
        
        const completion = await groq.chat.completions.create({
            messages: msgs,
            model: finalModel,
        });
        return completion.choices[0]?.message?.content || "";
    };

    // Helper: Gemini
    const runGemini = async (modelName: string) => {
        if (!geminiKey) throw new Error("No Gemini Key");
        // @ts-ignore
        const genAI = new GoogleGenerativeAI(geminiKey);
        modelUsed = modelName;
        
        const geminiModel = genAI.getGenerativeModel({
            model: modelName,
            systemInstruction: systemContext,
        });

        // Convert history for Gemini (strict user/model roles)
        const conversation = messages.filter((m: any) => m.role !== 'system').map((m: any) => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }]
        }));

        // Start chat with history
        const chat = geminiModel.startChat({ history: conversation.slice(0, -1) });
        const lastMessage = conversation[conversation.length - 1].parts[0].text;
        const result = await chat.sendMessage(lastMessage);
        return result.response.text();
    };

    // ... (Ollama / Groq handlers remain same)

    // 3. Gemini Handler
    // ...

    // 3. Provider routing
    if (requestedProvider === 'groq') {
        const text = await runGroq(refinedMessages, apiKey);
        return await respond(text, `Groq (${modelUsed})`);
    }

    // Default to Gemini with Groq fallback
    try {
        if (!geminiKey) throw new Error("No Gemini Key");

        const geminiCandidates = [
            (model && model.includes('gemini')) ? model : null,
            'gemini-1.5-flash',
            'gemini-1.5-pro',
            'gemini-2.0-flash'
        ].filter(Boolean) as string[];

        let lastError: any = null;
        for (const useModel of geminiCandidates) {
            try {
                const text = await runGemini(useModel);
                return await respond(text, `Gemini (${useModel})`);
            } catch (e: any) {
                lastError = e;
                console.warn(`Gemini model failed (${useModel})`, e.message);
            }
        }

        throw new Error("Gemini models exhausted: " + (lastError?.message || "unknown error"));
    } catch (geminiFinalError: any) {
        console.warn("All Gemini attempts failed. Trying Groq fallback...", geminiFinalError.message);
        try {
            const text = await runGroq(refinedMessages, apiKey);
            return await respond(text, `Groq Fallback (${modelUsed})`, 'Respuesta generada via Groq por fallo en Gemini');
        } catch (groqError: any) {
            return new Response(JSON.stringify({ error: `All providers failed. Gemini: ${geminiFinalError.message}. Groq: ${groqError.message}` }), { status: 500 });
        }
    }


  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
