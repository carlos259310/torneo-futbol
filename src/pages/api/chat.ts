export const prerender = false;

import fs from 'node:fs';
import path from 'node:path';
import type { APIRoute } from 'astro';
import { GoogleGenerativeAI } from '@google/generative-ai';
import Groq from 'groq-sdk';
import rosterSeed from '../../data/roster.json';
import resultsSeed from '../../data/results.json';

// Helper to load data
const loadData = () => {
  try {
    const dataDir = path.join(process.cwd(), 'public', 'data');
    const rosterPath = path.join(dataDir, 'roster.json');
    const resultsPath = path.join(dataDir, 'results.json');

    const roster = fs.existsSync(rosterPath) ? JSON.parse(fs.readFileSync(rosterPath, 'utf-8')) : (rosterSeed || {});
    const results = fs.existsSync(resultsPath) ? JSON.parse(fs.readFileSync(resultsPath, 'utf-8')) : (resultsSeed || {});
    const memoryPath = path.join(dataDir, 'ai_memory.json');
    const memory = fs.existsSync(memoryPath) ? JSON.parse(fs.readFileSync(memoryPath, 'utf-8')) : [];
    
    return { roster, results, memory };
  } catch (e) {
    console.error("Error loading data:", e);
    return { roster: rosterSeed || {}, results: resultsSeed || {}, memory: [] };
  }
};

const MEMORY_LIMIT = 200;
const MEMORY_CONTEXT_LIMIT = 20;
const MEMORY_MAX_CHARS = 280;

const readMemory = () => {
  try {
    const memoryPath = path.join(process.cwd(), 'public', 'data', 'ai_memory.json');
    if (!fs.existsSync(memoryPath)) return [];
    const raw = fs.readFileSync(memoryPath, 'utf-8');
    return JSON.parse(raw || '[]');
  } catch {
    return [];
  }
};

const writeMemory = (entries: any[]) => {
  try {
    const memoryPath = path.join(process.cwd(), 'public', 'data', 'ai_memory.json');
    fs.writeFileSync(memoryPath, JSON.stringify(entries, null, 2), 'utf-8');
  } catch (e) {
    console.warn('Memory write failed:', e);
  }
};

const normalizeText = (s: string) => s.toLowerCase();

const shouldStoreMemory = (text: string) => {
  if (!text || text.trim().length < 6) return false;
  const t = normalizeText(text);
  const keywords = [
    'alineacion','alineacion','jugador','jugadores','partido','resultado','fortalezas','mejoras',
    'rating','portero','defensa','defensas','mediocampo','medio','delantero','convocatoria',
    'capitan','capit?n','dt','director tecnico','director t?cnico'
  ];
  return keywords.some(k => t.includes(k));
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

const addMemoryEntry = (userText: string, assistantText: string, roster: any) => {
  if (!shouldStoreMemory(userText)) return;
  const entries = readMemory();
  const entry = {
    id: Date.now().toString(),
    ts: new Date().toISOString(),
    q: trimForMemory(userText),
    a: trimForMemory(assistantText),
    players: extractPlayers(userText + ' ' + assistantText, roster)
  };
  entries.push(entry);
  if (entries.length > MEMORY_LIMIT) {
    entries.splice(0, entries.length - MEMORY_LIMIT);
  }
  writeMemory(entries);
};

const buildMemoryContext = (memory: any[]) => {
  if (!Array.isArray(memory) || memory.length === 0) return '';
  const recent = memory.slice(-MEMORY_CONTEXT_LIMIT);
  const lines = recent.map((m: any) => {
    const date = (m.ts || '').slice(0, 10);
    const players = (m.players && m.players.length) ? ` (jugadores: ${m.players.join(', ')})` : '';
    return `- [${date}] Q: ${m.q} | A: ${m.a}${players}`;
  });
  return `\nMEMORIA (notas relevantes):\n${lines.join('\n')}\n`;
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    let { messages, provider, model, apiKey } = body;
    let modelUsed = model;

    // Load Data Context
    const teamData = loadData();
    const memoryContext = buildMemoryContext(teamData?.memory || []);
    const systemContext = `
    ROL: Eres el Asistente Técnico Inteligente (DT IA) del equipo de fútbol "Tránsito de Girón".
    OBJETIVO: Ayudar al DT a tomar decisiones basadas EXCLUSIVAMENTE en los datos del equipo.
    
    DATOS DEL EQUIPO (NO INVENTES JUGADORES):
    ${JSON.stringify(teamData?.roster || {}, null, 2)}
    
    RESULTADOS RECIENTES:
    ${JSON.stringify(teamData?.results || {}, null, 2)}
    ${memoryContext}
    INSTRUCCIONES CLAVE:
    1. Responde de forma técnica pero motivadora.
    2. Usa los NOMBRES EXACTOS de los jugadores en el JSON.
    3. ALINEACIONES: Cuando sugieras una alineación, SOLO lista Posición: Nombre. NO agregues descripción ni explicación en cada jugador.
       Ejemplo:
       - Portero: Fernando
       - Defensa: Gregorio
       (Hazlo simple y directo en la lista).
    4. Menciona las fortalezas y mejoras de los partidos pasados solo si te preguntan por analisis.
    5. Este equipo juega Futbol 6: una alineacion completa tiene 6 jugadores (incluye portero).
    6. Responde breve y claro. Si no te preguntan por alineacion, no la propongas.
    7. NO hables de otros equipos o temas generales de futbol a menos que sirvan de ejemplo tactico.
    `;

    // Prepend System Message
    const refinedMessages = [
        { role: 'system', content: systemContext },
        ...messages.filter((m: any) => m.role !== 'system')
    ];

    const lastUserMessage = [...messages].reverse().find((m: any) => m.role === 'user')?.content || '';

    const respond = (text: string, modelLabel: string, extraNote?: string) => {
        const finalText = extraNote ? `${text}

${extraNote}` : text;
        addMemoryEntry(lastUserMessage, text, teamData?.roster);
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
        return respond(text, `Groq (${modelUsed})`);
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
                return respond(text, `Gemini (${useModel})`);
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
            return respond(text, `Groq Fallback (${modelUsed})`, 'Respuesta generada via Groq por fallo en Gemini');
        } catch (groqError: any) {
            return new Response(JSON.stringify({ error: `All providers failed. Gemini: ${geminiFinalError.message}. Groq: ${groqError.message}` }), { status: 500 });
        }
    }


  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
