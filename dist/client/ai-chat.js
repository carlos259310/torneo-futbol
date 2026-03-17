/**
 * AI Chat Assistant for Football Team Management
 * Handles communication with OpenAI/Gemini and injects game context.
 */

class AIChat {
    constructor() {
        this.messages = [];
        this.maxHistory = 10;  // Conversation context
        this.isTyping  = false;
        this.apiKey    = '';
        this.model     = 'gemini-2.0-flash'; // Default: Gemini (con fallback automático a openrouter/free)
        this.init();
    }

    async init() {
        // UI Elements
        this.toggleBtn = document.getElementById('ai-chat-toggle');
        this.closeBtn = document.getElementById('ai-chat-close');
        this.configBtn = document.getElementById('ai-chat-config');
        this.chatWindow = document.getElementById('ai-chat-window');
        this.sendBtn = document.getElementById('ai-chat-send');
        this.inputField = document.getElementById('ai-chat-input');
        this.messagesContainer = document.getElementById('ai-chat-messages');
        this.configModal = document.getElementById('ai-config-modal');
        this.saveConfigBtn = document.getElementById('save-ai-config');
        this.closeConfigBtn = document.getElementById('close-config-modal');
        
        // Event Listeners
        if (this.toggleBtn) this.toggleBtn.onclick = () => this.toggleChat();
        if (this.closeBtn) this.closeBtn.onclick = () => this.toggleChat(false);
        if (this.configBtn) this.configBtn.onclick = () => this.toggleConfig(true);
        if (this.closeConfigBtn) this.closeConfigBtn.onclick = () => this.toggleConfig(false);
        if (this.saveConfigBtn) this.saveConfigBtn.onclick = () => this.saveConfig();
        if (this.sendBtn) this.sendBtn.onclick = () => this.handleSendMessage();
        
        if (this.inputField) {
            this.inputField.onkeydown = (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.handleSendMessage();
                }
            };
        }

        // Load config: window.AI_CONFIG takes precedence, then localStorage
        if (window.AI_CONFIG) {
            this.apiKey = window.AI_CONFIG.ai_api_key || '';
            this.model  = window.AI_CONFIG.ai_model   || 'gemini-2.0-flash';
        } else {
            this.apiKey = localStorage.getItem('ai_api_key') || '';
            this.model  = localStorage.getItem('ai_model')   || 'gemini-2.0-flash';
        }

        // Apply config to modal fields
        const keyEl = document.getElementById('ai-api-key');
        if (keyEl) keyEl.value = this.apiKey;

        this.updateModelSelector();
    }

    updateModelSelector() {
        const modelSelect = document.getElementById('ai-model');
        if (!modelSelect) return;

        // Modelos disponibles
        const models = [
            { id: 'openrouter/free',                        name: '🆓 Free Router (gratis, recomendado)' },
            { id: 'gemini-2.0-flash',                       name: '✨ Gemini 2.0 Flash (rápido)' },
            { id: 'gemini-2.5-flash-preview-04-17',         name: '🧠 Gemini 2.5 Flash Preview (avanzado)' },
            { id: 'openrouter/auto',                        name: '⚡ Auto OpenRouter (mejor disponible)' },
            { id: 'mistralai/mistral-7b-instruct:free',     name: 'Mistral 7B (gratis)' },
            { id: 'google/gemma-2-9b-it:free',              name: 'Gemma 2 9B (gratis)' },
            { id: 'meta-llama/llama-3.2-3b-instruct:free',  name: 'Llama 3.2 3B (gratis, ultrarrápido)' },
            { id: 'qwen/qwen-2.5-7b-instruct:free',         name: 'Qwen 2.5 7B (gratis)' }
        ];

        modelSelect.innerHTML = '';
        models.forEach(m => {
            const opt = document.createElement('option');
            opt.value       = m.id;
            opt.textContent = m.name;
            modelSelect.appendChild(opt);
        });

        const saved = localStorage.getItem('ai_model');
        const match = saved && models.some(m => m.id === saved);
        const selected    = match ? saved : 'gemini-2.0-flash';
        modelSelect.value = selected;
        this.model        = selected;
    }

    toggleChat(show) {
        const isHidden = this.chatWindow.classList.contains('hidden');
        const shouldShow = show !== undefined ? show : isHidden;
        
        if (shouldShow) {
            this.chatWindow.classList.remove('hidden');
            this.inputField.focus();
        } else {
            this.chatWindow.classList.add('hidden');
        }
    }

    toggleConfig(show) {
        if (show) {
            this.configModal.classList.remove('hidden');
        } else {
            this.configModal.classList.add('hidden');
        }
    }

    saveConfig() {
        const key   = document.getElementById('ai-api-key')?.value.trim() || '';
        const model = document.getElementById('ai-model')?.value || this.model;

        this.apiKey = key;
        this.model  = model;

        localStorage.setItem('ai_api_key', key);
        localStorage.setItem('ai_model',   model);

        this.toggleConfig(false);
        const keyMsg = key ? '(usando tu API Key)' : '(usando clave del servidor)';
        this.addMessage('assistant', `¡Configuración guardada! Modelo: **${model}** ${keyMsg}.`, true);
    }

    addMessage(role, text, skipHistory = false) {
        const msgDiv = document.createElement('div');
        msgDiv.className = `message ${role}`;
        if (role === 'assistant') {
            msgDiv.innerHTML = text;
        } else {
            msgDiv.textContent = text;
        }
        this.messagesContainer.appendChild(msgDiv);
        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
        
        // Store in history
        if (!skipHistory) {
            this.messages.push({ role, content: text });
            
            // Pruning: Keep only last N messages to save tokens
            if (this.messages.length > this.maxHistory) {
                this.messages = this.messages.slice(-this.maxHistory);
            }
        }
    }

    async handleSendMessage() {
        const text = this.inputField.value.trim();
        if (!text || this.isTyping) return;



        this.addMessage('user', text);
        this.inputField.value = '';
        this.inputField.style.height = 'auto';

        this.isTyping = true;
        this.showTypingIndicator();

        try {
            const data = await this.fetchAIResponse(text);
            this.removeTypingIndicator();
            if (data.content) {
            // Render MD (fallback to plain text if marked is not loaded)
            const mdContent = (window.marked && typeof window.marked.parse === 'function')
                ? window.marked.parse(data.content)
                : data.content;
            this.addMessage('assistant', mdContent);
            }
        } catch (error) {
            this.removeTypingIndicator();
            this.addMessage('assistant', `❌ Error: ${error.message}. Por favor verifica la consola (F12) para más detalles.`, true);
            console.error('AI Error Detailed:', error);
        } finally {
            this.isTyping = false;
        }
    }

    showTypingIndicator() {
        const typingDiv = document.createElement('div');
        typingDiv.className = 'message assistant typing-indicator';
        typingDiv.id = 'typing-indicator';
        typingDiv.innerHTML = '<i class="fas fa-ellipsis-h fa-beat"></i>';
        this.messagesContainer.appendChild(typingDiv);
        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    }

    removeTypingIndicator() {
        const indicator = document.getElementById('typing-indicator');
        if (indicator) indicator.remove();
    }

    getSystemPrompt() {
        // Prepare context from game data
        const players = window.rosterData ? window.rosterData.players : {};
        const results = window.matchResults || [];
        
        // 1. Contexto de Jugadores (Roster)
        let playerContext = "LISTA OFICIAL DE JUGADORES (roster.json):\n";
        for (let id in players) {
            const p = players[id];
            playerContext += `- ${p.name} (N° ${p.number}, Rating: ${p.rating}, Veterano: ${p.veteran ? 'Sí' : 'No'})\n`;
            if (p.strengths) playerContext += `  Fortalezas: ${p.strengths.join(', ')}\n`;
            if (p.improvements) playerContext += `  A mejorar: ${p.improvements.join(', ')}\n`;
        }

        // 2. Contexto de Resultados
        let resultsContext = "HISTORIAL DE PARTIDOS (results.json):\n";
        if (results.length > 0) {
            results.forEach(m => {
                resultsContext += `- Fecha: ${m.date}, Rival: ${m.awayTeam}, Resultado: ${m.homeScore}-${m.awayScore} (${m.status})\n`;
                if (m.strengths) resultsContext += `  Fortalezas detectadas: ${m.strengths.join(', ')}\n`;
                if (m.improvements) resultsContext += `  Mejoras necesarias: ${m.improvements.join(', ')}\n`;
            });
        } else {
            resultsContext += "No hay resultados registrados aún.\n";
        }

        return `Eres el asistente técnico de "Equipo de futbol Tránsito de Girón Torneo CEA". 
USA SOLO ESTOS DATOS:
JUGADORES:
${playerContext}
RESULTADOS:
${resultsContext}

REGLAS:
1. Responde SOLO sobre el equipo y fútbol.
2. Si preguntan fuera de contexto, di: "Equipo de futbol Tránsito de Girón Torneo CEA".
3. Sé muy breve. No inventes datos.`;
    }

    async fetchAIResponse(userText) {
        // Only send last 6 messages to the server (matches server-side limit)
        const history = this.messages.slice(-6);
        const messages = [
            { role: 'system', content: `Eres el DT IA del equipo Tránsito de Girón. Responde en español, breve y técnico.` },
            ...history,
        ];

        try {
            const response = await fetch('/api/chat', {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify({ messages, model: this.model, apiKey: this.apiKey })
            });

            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                throw new Error(err.error || `Error ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            return data;

        } catch (error) {
            console.error('AI Request Failed:', error);
            throw error;
        }
    }

    // Deprecated methods removed (callOpenAI, callGemini)

}

// Auto-expand textarea
document.addEventListener('input', function(e) {
    if (e.target.id === 'ai-chat-input') {
        e.target.style.height = 'auto';
        e.target.style.height = (e.target.scrollHeight) + 'px';
    }
});

// Initialize chat when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.aiChat = new AIChat();
});
