import fs from 'node:fs';
import nodePath from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenAI } from '@google/genai';
export { renderers } from '../../renderers.mjs';

const players = {"1":{"name":"Fernando (Nuevo)","number":"99","veteran":false,"rating":4.5,"strengths":["Buenos reflejos","Buenas atajadas","Reacción rápida"],"improvements":["Salida con los pies","A veces mide mal las salidas"]},"2":{"name":"Gregorio","number":"17","veteran":true,"rating":4,"strengths":["Visión de juego","Equilibrio","Buena marca"],"improvements":["Estado físico","Constancia en el juego"]},"3":{"name":"Carlos Daniel","number":"15","veteran":false,"rating":4.2,"strengths":["Anticipación","Corte de balón","Marca fuerte"],"improvements":["Salida limpia","Juego asociativo","Estado físico"]},"4":{"name":"Fredual Guevara","number":"2","veteran":false,"rating":3.8,"strengths":["Juego asociativo","Ubicación en ataque"],"improvements":["Constancia en el juego","Agresividad en marca"]},"5":{"name":"Fernando (Señor)","number":"7","veteran":true,"rating":3.6,"strengths":["Inteligencia táctica","Liderazgo"],"improvements":["Precisión en pases","Estado físico"]},"6":{"name":"Javier","number":"27","veteran":false,"rating":4.4,"strengths":["Creatividad","Pase filtrado","Definición"],"improvements":["Intensidad en marca","Apoyo defensivo"]},"7":{"name":"Harold Charris","number":"9","veteran":false,"rating":4.4,"strengths":["Liderazgo","Organización","Pase filtrado"],"improvements":["Control emocional","Trato con los compañeros","A veces no suelta el balón"]},"8":{"name":"Jhon Vill","number":"22","veteran":false,"rating":4.3,"strengths":["Presión alta","Buena marca","Solidaridad defensiva"],"improvements":["Definición","Juego asociativo en ataque"]},"9":{"name":"Carlos Medina","number":"94","veteran":false,"rating":3.9,"strengths":["Visión de juego","Juego asociativo"],"improvements":["Definición","Intensidad en marca"]},"10":{"name":"Juan Duarte","number":"10","veteran":false,"rating":3.9,"strengths":["Cambio de ritmo","Regate","Remate media distancia"],"improvements":["Juego asociativo","Recuperación tras pérdida","Compromiso en marca"]},"11":{"name":"Cristian","number":"4","veteran":false,"rating":3.8,"strengths":["Marca intensa","Recuperación de balón"],"improvements":["Toma de decisiones","Estado físico"]},"12":{"name":"Ronal","number":"19","veteran":true,"rating":3.9,"strengths":["Remate Fuerte media distancia","Buena definición","Juego asociativo ofensivo"],"improvements":["Marca presion en salida","Estado físico"]},"13":{"name":"Juan (SENA)","number":"23","veteran":false,"rating":3.7,"strengths":["Desmarque","Juego en corto"],"improvements":["Definición","Control de balón","Compromiso en marca"]}};
const positions = {"porteros":[{"id":"1","priority":"high-priority"},{"id":"2","priority":"medium-priority"},{"id":"3","priority":"medium-priority"},{"id":"4","priority":"low-priority"},{"id":"7","priority":"low-priority"}],"defensas":[{"id":"3","priority":"high-priority"},{"id":"2","priority":"medium-priority"},{"id":"11","priority":"medium-priority"},{"id":"4","priority":"low-priority"},{"id":"5","priority":"low-priority"},{"id":"6","priority":"low-priority"}],"medio":[{"id":"7","priority":"high-priority"},{"id":"8","priority":"high-priority"},{"id":"6","priority":"medium-priority"},{"id":"9","priority":"medium-priority"},{"id":"2","priority":"medium-priority"},{"id":"3","priority":"low-priority"},{"id":"13","priority":"medium-priority"}],"delanteros":[{"id":"10","priority":"high-priority"},{"id":"8","priority":"medium-priority"},{"id":"7","priority":"low-priority"},{"id":"13","priority":"high-priority"},{"id":"12","priority":"high-priority"}]};
const captains = [{"order":1,"id":"7"},{"order":2,"id":"3"},{"order":3,"id":"8"},{"order":4,"id":"1"}];
const dt = {"id":"5"};
const field = [{"class":"goalkeeper","id":"1","side":"left"},{"class":"defender-1","id":"2"},{"class":"defender-2","id":"3"},{"class":"midfielder-1","id":"6"},{"class":"midfielder-2","id":"7"},{"class":"forward","id":"8"}];
const rosterSeed = {
  players,
  positions,
  captains,
  dt,
  field,
};

const matches = [{"id":1,"date":"2026-02-08","homeTeam":"Tránsito de Girón","awayTeam":"Auto Aprender","homeScore":1,"awayScore":2,"status":"Finalizado","scorers":[{"playerId":"8","goals":1}],"strengths":["Buena Marca durante casi todo el partido","Al final se llego varias veces al arco rival","Se compitió durante todo el partido"],"improvements":["Falta de contundencia en la definición (Javier,Juan,Harold,Jhon)","Saque del portero(Fernando)","Marcar con menos fuerza para evitar faltas innecesarias(Carlos)","Mejorar la condición física para poder competir mejor(Todos)","Organización de la rotación para que todos jueguen pero no se pierda el orden del equipo(Todos)"]},{"id":2,"date":"2026-02-15","homeTeam":"Tránsito de Girón","awayTeam":"CDA Lebrija","homeScore":3,"awayScore":4,"status":"Finalizado","scorers":[{"playerId":"7","goals":3}],"strengths":["Se remonto un resultado adverso","Se mejoro la definicion","A pesar de recibir mas goles, se mejoraron aspectos defensivos","Se mejoro la rotacion y todos jugaron"],"improvements":["Continuar mejorando el orden defensivo y marca","Continuar mejorando la definicion","Salida con el balon (Carlos Daniel)","Mantener el marcador , si remontaron no pueden dejarse hacer mas goles","Mejorar la condición física para poder competir mejor(Todos)","Protestar mas con respecto a las decisiones arbitrales , con respeto pero no dejar que el arbitro influya en el partido"]},{"id":3,"date":"2026-02-22","homeTeam":"Tránsito de Girón","awayTeam":"Auto Girón","homeScore":3,"awayScore":1,"status":"Finalizado","scorers":[{"playerId":"8","goals":2},{"playerId":"13","goals":1}],"strengths":["Se mantuvo el orden defensivo durante casi todo el partido","Se mejoro la definicion","Todos los que entraron corrieron y aportaron al equipo","Todos jugaron y rotaron","El arquero tuvo una gran actuacion con voz de mando y atajando varias opciones claras de gol","Los delanteros estuvieron bien ubicados para hacer los goles Jhon y Juan Sena","Javier Arriba supo aguantar el balon al final del partido"],"improvements":["Por momentos sobretodo al principio se perdio el orden defensivo y se concedieron opciones claras de gol","Continuar mejorando la definicion ya que se fallaron opciones claras de gol para el 4-1","Por momentos se dejaron provocar por los jugadores rivales(Cristian y Carlos Daniel) y pudo generar amarillas o faltas en contra","Mejorar la condición física para poder competir mejor(Todos)"]},{"id":4,"date":"2026-03-01","homeTeam":"Tránsito de Girón","awayTeam":"Instructores","homeScore":4,"awayScore":1,"status":"Finalizado","scorers":[{"playerId":"8","goals":2},{"playerId":"6","goals":2}],"strengths":["Carlos Daniel y Gregorio destacaron defensivamente con buena marca, recuperación de balón y solidez en el juego aéreo.","En el segundo tiempo se mejoró la definición y se concretaron varias opciones de gol.","El orden defensivo se mantuvo durante casi todo el partido.","Todos los jugadores corrieron y aportaron al equipo.","El arquero tuvo una gran actuación, mostrando liderazgo, seguridad en el juego aéreo y atajando varias opciones claras de gol.","A pesar de contar con un solo cambio, el equipo se mantuvo competitivo durante todo el partido."],"improvements":["Solo asistieron 7 de los 12 jugadores, lo que dejó al equipo con un único cambio. Es necesario mayor responsabilidad para no perjudicar al grupo.","Seguir trabajando en la definición, ya que en el primer tiempo se desperdiciaron muchas opciones de gol.","El gol del rival llegó por un error defensivo de Carlos Daniel, quien subió en un córner y no bajó a tiempo para marcar en la contra. Es el segundo gol en el torneo que recibimos de forma similar, por lo que hay que estar más atentos en esas situaciones.","Mejorar la condición física para competir con más intensidad. En especial Juan, quien entraba como cambio y pedía salir nuevamente al poco tiempo."]},{"id":5,"date":"2026-03-15","homeTeam":"Tránsito de Girón","awayTeam":"Gestoria Bga","homeScore":2,"awayScore":1,"status":"Finalizado","scorers":[{"playerId":"4","goals":1},{"playerId":"10","goals":1}],"strengths":["Juan y Fredual estuvieron bien ubicados para marcar los goles.","Javier Hizo dos asistencias y junto a Harold aportarón con creacion de juego y tenencia de balon.","Todos los jugadores corrieron y aportaron al equipo.","El arquero tuvo una gran actuación, mostrando liderazgo, seguridad y atajando varias opciones claras de gol.","El equipo mostró resistencia y compromiso en el campo a pesar de los momentos adversos.","Carlos Daniel tuvo una buena actuación defensiva con buena marca y recuperación de balón."],"improvements":["Ante la ausencia de Gregorio por lesión el equipo se desordeno mucho defensivamente, eso genero el gol del rival.","Seguir trabajando en la definición, ya que se desperdiciaron muchas opciones de gol.","El equipo debe organizarse mejor con Ronal quien aunque no tuvo su mejor desempeño, aportó en el juego y tiene potencial en la ofensiva.","Mejorar la condición física para competir con más intensidad.","Carlos Daniel hizo una falta innesesaria por la que le sacaron amarilla. Es importante mantener la calma, el resto del partido si marco bien y sin faltas."]}];
const resultsSeed = {
  matches,
};

const tournament = {"name":"Torneo CEA Fútbol 6 - 6ta Edición 2026","format":"Fútbol 6 (6 jugadores por equipo incluyendo portero)","team":"Tránsito de Girón","team_number":4,"location":"Cancha La Picadely","schedule":"Domingos de 3pm a 8pm"};
const tournament_structure = {"total_teams":10,"total_dates":9,"phase_1":"Todos contra todos (9 fechas)","phase_2":"Clasifican 5 ganadores y 3 perdedores con mejor ubicación. Luego sorteo para tercera, cuarta y quinta fase","teams":["1. CNT Principal","2. Gestorías BGA","3. Auto Aprender","4. Tránsito de Girón","5. Gestores","6. Instructores F.C","7. CMR Lebrija","8. CDA La 27 Tecnofull","9. Aprender","10. Auto Girón"]};
const match_rules = {"players_per_match":"6 vs 6","veteran_requirement":"Al menos 1 jugador veterano de 40 años cumplidos obligatorio","goalkeeper":"Portero libre de edad y labor","match_duration":"2 tiempos de 20 minutos","substitutions":"ILIMITADAS (jugadores pueden salir y ingresar de manera ilimitada)","minimum_players":"Mínimo 4 en cancha para iniciar partido","ball":"Balón #4"};
const registration = {"roster_modification":"Se puede modificar planilla hasta la tercera fecha","post_deadline":"Después no se pueden ingresar jugadores (solo por enfermedad o fuerza mayor)","uniform_requirement":"Todos los equipos deben estar completamente uniformados hasta la 3ra fecha. De lo contrario no podrá jugar","carnet_requirement":"Todos los jugadores deben tener el carnet sellado y laminado, de lo contrario no podrá hacer parte del juego"};
const points_system = {"win":3,"draw":1,"loss":0,"tiebreaker":["Diferencia de goles","Goles a favor","Enfrentamiento directo"]};
const discipline = {"yellow_card_cost":"$5,000","blue_card_cost":"$8,000","red_card_cost":"$12,000","red_card_suspension":"Toda tarjeta roja tiene suspensión de 1 fecha y podrá aumentar dependiendo de la gravedad. Será revisada por el comité de delegados (no participan los delegados de los equipos implicados)","two_walkover_penalty":"Equipo que pierda dos partidos por W.O quedará expulsado del torneo","walkover_arbitration":"Equipo que pierda por W.O deberá cancelar para la siguiente fecha el valor del arbitraje","protests":"Solo el capitán puede reclamar al árbitro"};
const arbitration = {"cost":"$55,000 pesos por equipo después de las 6pm","after_6pm":"$60,000 pesos","includes":"Cancha, árbitro, plantillero, balón y petos"};
const special_rules = {"holiday_schedule":"En puentes festivos no se programará fecha, en caso de necesidad de aplazar un partido deberá hacerse con una semana de anticipación","punctuality":"Llegada tardía de más de 10 minutos = partido perdido por W.O."};
const tournamentInfo = {
  tournament,
  tournament_structure,
  match_rules,
  registration,
  points_system,
  discipline,
  arbitration,
  special_rules,
};

const prerender = false;
const DEFAULT_MODEL = "openrouter/free";
const MAX_TOKENS = 500;
const TEMPERATURE = 0.3;
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MEMORY_LIMIT = 5;
const MEMORY_CHARS = 300;
const MEMORY_TIMEOUT = 800;
const FREE_MODELS = [
  "openrouter/free",
  "qwen/qwen-2.5-7b-instruct:free",
  "meta-llama/llama-3.2-3b-instruct:free"
];
let _sb = null;
const getSupabase = () => {
  if (_sb) return _sb;
  const url = "https://wkvpqmladoihgguklriu.supabase.co";
  const key = "sb_publishable_itCCxq_0ZRuy-T4QhGtHeg_1pM2_jp9";
  _sb = createClient(url, key);
  return _sb;
};
let _data = null;
const getData = () => {
  if (_data) return _data;
  try {
    const dir = nodePath.join(process.cwd(), "public", "data");
    const read = (f, seed) => {
      const p = nodePath.join(dir, f);
      return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, "utf-8")) : seed;
    };
    _data = {
      roster: read("roster.json", rosterSeed || {}),
      results: read("results.json", resultsSeed || {}),
      tournament: read("tournament_info.json", tournamentInfo || {})
    };
  } catch {
    _data = { roster: rosterSeed || {}, results: resultsSeed || {}, tournament: tournamentInfo || {} };
  }
  return _data;
};
const normalize = (s) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const trimText = (s, max = MEMORY_CHARS) => s.replace(/\s+/g, " ").trim().slice(0, max);
const extractPlayers = (text, roster) => {
  if (!text || !roster?.players) return [];
  const t = normalize(text);
  const found = /* @__PURE__ */ new Set();
  for (const p of Object.values(roster.players)) {
    if (!p?.name) continue;
    const norm = normalize(p.name);
    const first = norm.split(" ")[0];
    if (t.includes(norm) || first.length > 3 && t.includes(first)) found.add(p.name);
  }
  return [...found];
};
const KEYWORDS = [
  "jugador",
  "partido",
  "resultado",
  "rating",
  "portero",
  "defensa",
  "mediocampo",
  "delantero",
  "convocatoria",
  "tactica",
  "formacion",
  "rival",
  "torneo",
  "gol",
  "tarjeta",
  "alineacion",
  "veterano",
  "capitan",
  "fortaleza",
  "mejora",
  "arquero",
  "leonardo",
  "fernando",
  "gregorio",
  "jhon",
  "alexander",
  "julian",
  "julio",
  "henry",
  "edgar",
  "cesar",
  "diego",
  "duvan",
  "manuel",
  "yeison",
  "vladimir",
  "oscar",
  "pedro",
  "sergio",
  "wilmer",
  "javier",
  "harold",
  "carlos",
  "fredual",
  "juan"
];
const SKIP = ["hola", "buenos", "gracias", "ok", "bien", "perfecto", "entendido", "test", "prueba"];
const isRelevant = (text) => {
  if (!text || text.trim().length < 6) return false;
  const t = normalize(text);
  if (SKIP.some((k) => t.includes(k)) && text.trim().length < 40) return false;
  return KEYWORDS.some((k) => t.includes(k));
};
const fetchMemory = async (query, roster) => {
  if (!isRelevant(query)) return "";
  const sb = getSupabase();
  if (!sb) return "";
  try {
    const players = extractPlayers(query, roster);
    const base = sb.from("ai_memory").select("user_query,ai_response");
    const q = players.length ? base.overlaps("players", players).order("created_at", { ascending: false }).limit(MEMORY_LIMIT) : base.order("created_at", { ascending: false }).limit(MEMORY_LIMIT);
    const { data } = await Promise.race([
      q,
      new Promise((r) => setTimeout(() => r({ data: null }), MEMORY_TIMEOUT))
    ]);
    if (!data?.length) return "";
    const lines = [...data].reverse().map((m) => `P:${m.user_query} R:${m.ai_response}`);
    return `
CONTEXTO PREVIO:
${lines.join("\n")}`;
  } catch {
    return "";
  }
};
const saveMemory = (userText, aiText, roster) => {
  if (!isRelevant(userText) && !isRelevant(aiText)) return;
  const sb = getSupabase();
  if (!sb) return;
  sb.from("ai_memory").insert([{
    user_query: trimText(userText),
    ai_response: trimText(aiText),
    players: extractPlayers(`${userText} ${aiText}`, roster)
  }]).then(({ error }) => {
    if (error) console.error("[Memory] insert failed:", error.message);
    else console.log("[Memory] ✅ saved");
  });
};
const rosterSummary = (roster) => {
  const players = roster?.players || {};
  const positions = roster?.positions || {};
  const captains = (roster?.captains || []).sort((a, b) => a.order - b.order);
  const dtId = roster?.dt?.id;
  const posLabel = { porteros: "POR", defensas: "DEF", medio: "MED", delanteros: "DEL" };
  const playerPos = {};
  for (const [pos, list] of Object.entries(positions)) {
    for (const item of list) {
      if (!playerPos[item.id] || item.priority === "high-priority") {
        playerPos[item.id] = posLabel[pos] || pos;
      }
    }
  }
  const capOrder = {};
  captains.forEach((c) => {
    capOrder[c.id] = c.order;
  });
  return Object.entries(players).map(([id, p]) => {
    const tags = [
      p.veteran ? "VET" : "",
      capOrder[id] ? `C${capOrder[id]}` : "",
      id === dtId ? "DT" : ""
    ].filter(Boolean).join(",");
    const fort = (p.strengths || []).slice(0, 2).join(",");
    const mej = (p.improvements || []).slice(0, 1).join(",");
    return `#${p.number} ${p.name}${tags ? " [" + tags + "]" : ""} ${playerPos[id] || ""} ★${p.rating} | +${fort} | ~${mej}`;
  }).join("\n");
};
const matchSummary = (results, roster) => {
  const matches = results?.matches || [];
  if (!matches.length) return "Sin partidos aún.";
  const players = roster?.players || {};
  let wins = 0, draws = 0, losses = 0, gf = 0, gc = 0;
  const lines = matches.map((m) => {
    const icon = m.homeScore > m.awayScore ? "✅" : m.homeScore === m.awayScore ? "🟡" : "❌";
    if (m.homeScore > m.awayScore) wins++;
    else if (m.homeScore === m.awayScore) draws++;
    else losses++;
    gf += m.homeScore;
    gc += m.awayScore;
    const scorers = (m.scorers || []).map((s) => `${players[s.playerId]?.name || s.playerId} ${s.goals}gol`).join(", ");
    const fort = (m.strengths || []).slice(0, 1).join("");
    const mej = (m.improvements || []).slice(0, 1).join("");
    return `F${m.id} ${m.date} vs ${m.awayTeam} ${m.homeScore}-${m.awayScore}${icon}${scorers ? " | " + scorers : ""}${fort ? " | +" + fort.slice(0, 60) : ""}${mej ? " | ~" + mej.slice(0, 60) : ""}`;
  });
  lines.push(`BALANCE: ${wins}V ${draws}E ${losses}D | GF:${gf} GC:${gc}`);
  return lines.join("\n");
};
const tournamentSummary = (t) => {
  const tr = t?.tournament || {};
  const ts = t?.tournament_structure || {};
  const d = t?.discipline || {};
  const r = t?.match_rules || {};
  t?.special_rules || {};
  return [
    `${tr.name} | Equipo#${tr.team_number} | ${tr.location} | ${tr.schedule}`,
    `${ts.total_teams || 10} equipos, ${ts.total_dates || 9} fechas | Clasif: 5 ganadores + 3 mejores perdedores`,
    `Puntos: V=3 E=1 D=0 | Desempate: dif.goles > goles.favor > directo`,
    `Reglas: ${r.veteran_requirement || "1 veterano 40+"} | susts.${r.substitutions?.includes("ILIM") ? "ilimitadas" : r.substitutions} | ${r.match_duration || "2×20min"} | mín.${r.minimum_players || 4}`,
    `Tarjetas: amarilla ${d.yellow_card_cost} | azul ${d.blue_card_cost} | roja ${d.red_card_cost}+1fecha susp`,
    `WO: >10min tarde=partido perdido | 2 WO=expulsión torneo`,
    `Planilla: modificable hasta F3 | Carnet sellado obligatorio | Solo capitán reclama al árbitro`
  ].join("\n");
};
const callOpenRouter = async (model, system, history, orKey) => {
  const models = model === "openrouter/free" ? FREE_MODELS : [model];
  for (const m of models) {
    try {
      const res = await fetch(OPENROUTER_URL, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${orKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://torneo-futbol.vercel.app",
          "X-Title": "Torneo CEA Fútbol 6"
        },
        body: JSON.stringify({ model: m, messages: [{ role: "system", content: system }, ...history], temperature: TEMPERATURE, max_tokens: MAX_TOKENS }),
        signal: AbortSignal.timeout(18e3)
      });
      if (!res.ok) {
        const body = await res.text();
        if (res.status === 429) {
          console.warn(`[OR] ${m} rate-limited, trying next`);
          continue;
        }
        throw new Error(`OpenRouter ${res.status}: ${body.slice(0, 150)}`);
      }
      const data = await res.json();
      const text = data.choices?.[0]?.message?.content || data.choices?.[0]?.message?.reasoning || "";
      if (!text) {
        console.warn(`[OR] ${m} empty response, trying next`);
        continue;
      }
      console.log(`[OR] ✅ ${m}`);
      return text;
    } catch (e) {
      if (e.name === "AbortError" || e.name === "TimeoutError") {
        console.warn(`[OR] ${m} timeout, trying next`);
        continue;
      }
      throw e;
    }
  }
  throw new Error("Todos los modelos fallaron. Intenta en un momento.");
};
const GEMINI_MODELS = [
  "gemini-2.5-flash",
  // ~1s, más rápido
  "gemini-flash-latest"
  // ~2s, backup
];
const callGemini = async (model, system, history, geminiKey) => {
  const ai = new GoogleGenAI({ apiKey: geminiKey });
  const contents = history.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content || "" }]
  }));
  const models = GEMINI_MODELS.includes(model) ? GEMINI_MODELS : [model, ...GEMINI_MODELS];
  for (const m of models) {
    try {
      const result = await Promise.race([
        ai.models.generateContent({ model: m, contents, config: { systemInstruction: system, maxOutputTokens: MAX_TOKENS, temperature: TEMPERATURE } }),
        new Promise((_, rej) => setTimeout(() => rej(new Error("Gemini timeout")), 15e3))
      ]);
      const text = result.text || "";
      if (!text) {
        console.warn(`[Gemini] ${m} empty, trying next`);
        continue;
      }
      console.log(`[Gemini] ✅ ${m}`);
      return text;
    } catch (e) {
      const msg = e.message || "";
      if (msg.includes('"code":503') || msg.includes('"code":429') || msg.includes("timeout")) {
        console.warn(`[Gemini] ${m} → ${msg.includes("timeout") ? "timeout" : msg.includes("503") ? "sobrecarga" : "cuota"}, trying next`);
        continue;
      }
      throw e;
    }
  }
  throw new Error("Todos los modelos Gemini no disponibles. Intenta en un momento.");
};
const POST = async ({ request }) => {
  try {
    const { messages, model, apiKey } = await request.json();
    const useModel = model || DEFAULT_MODEL;
    const isGemini = useModel.startsWith("gemini-");
    const orKey = apiKey || "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";
    const geminiKey = "AIzaSyDzgV-dI2canbjcfrIycOTkubysCO3i1SY";
    const { roster, results, tournament } = getData();
    const userMsg = [...messages].reverse().find((m) => m.role === "user")?.content || "";
    const memCtx = await fetchMemory(userMsg, roster);
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
    const history = messages.filter((m) => m.role !== "system").slice(-8);
    console.log(`[Chat] model:${useModel} msgs:${history.length} mem:${!!memCtx}`);
    let aiText;
    let provider;
    if (isGemini && geminiKey) {
      try {
        aiText = await callGemini(useModel, system, history, geminiKey);
        provider = "Gemini";
      } catch (e) {
        console.warn(`[Chat] Gemini → fallback OpenRouter (${e.message?.slice(0, 50)})`);
        if (!orKey) ;
        aiText = await callOpenRouter("openrouter/free", system, history, orKey);
        provider = "OpenRouter";
      }
    } else {
      if (!orKey) ;
      aiText = await callOpenRouter(useModel, system, history, orKey);
      provider = "OpenRouter";
    }
    saveMemory(userMsg, aiText, roster);
    return new Response(
      JSON.stringify({ content: aiText, modelUsed: `${provider} (${useModel})` }),
      { status: 200 }
    );
  } catch (error) {
    console.error("[Chat] Error:", error.message);
    return new Response(
      JSON.stringify({ content: `Lo siento, no pude obtener respuesta: ${error.message}`, modelUsed: "error" }),
      { status: 200 }
    );
  }
};

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  POST,
  prerender
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
