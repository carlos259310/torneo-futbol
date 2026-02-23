/**
 * AI Chat Assistant for Football Team Management
 * Handles communication with OpenAI/Gemini and injects game context.
 */

class AIChat {
    constructor() {
        this.messages = [];
        this.maxHistory = 10;
        this.isTyping = false;
        
        // Default values (strictly fallback to 1.5)
        this.apiKey = '';
        this.provider = 'groq';
        this.model = 'llama-3.3-70b-versatile';
        
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

        // Load Configuration (Priority: window.AI_CONFIG is KING)
        if (window.AI_CONFIG) {
            this.apiKey = window.AI_CONFIG.ai_api_key || '';
            this.provider = window.AI_CONFIG.ai_provider || 'gemini';
            this.model = window.AI_CONFIG.ai_model || 'gemini-1.5-flash';
            console.log('IA: Usando configuración de config.js ->', this.model);
        } else {
            // Minimal fallback for local dev
            this.apiKey = localStorage.getItem('ai_api_key') || '';
            this.provider = localStorage.getItem('ai_provider') || 'groq';
            this.model = localStorage.getItem('ai_model') || 'llama-3.3-70b-versatile'; // Load model from localStorage
        }

        // Apply to modal fields
        if (document.getElementById('ai-api-key')) document.getElementById('ai-api-key').value = this.apiKey;
        
        const providerSelect = document.getElementById('ai-provider');
        if (providerSelect) {
            providerSelect.value = this.provider;
            providerSelect.onchange = () => this.updateModelSelector();
        }
        
        this.updateModelSelector();
    }

    updateModelSelector() {
        const provider = document.getElementById('ai-provider').value;
        const modelSelect = document.getElementById('ai-model');
        if (!modelSelect) return;

        const models = {
            'gemini': [
                { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash (Gratis)' },
                { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro' },
                { id: 'gemini-2.0-flash-exp', name: 'Gemini 2.0 Flash' }
            ],
            'deepseek': [
                { id: 'deepseek-chat', name: 'DeepSeek Chat (V3)' },
                { id: 'deepseek-reasoner', name: 'DeepSeek Reasoner (R1)' }
            ],
            'groq': [
                { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B (Gratis)' },
                { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B (Gratis)' }
            ],
            'ollama': [
                { id: 'llama3', name: 'Llama 3 (Local)' },
                { id: 'mistral', name: 'Mistral (Local)' }
            ]
        };

        modelSelect.innerHTML = '';
        (models[provider] || []).forEach(m => {
            const opt = document.createElement('option');
            opt.value = m.id;
            opt.textContent = m.name;
            modelSelect.appendChild(opt);
        });

        // Restore saved model if it belongs to this provider
        const savedModel = localStorage.getItem('ai_model');
        if (savedModel && models[provider]?.some(m => m.id === savedModel)) {
            modelSelect.value = savedModel;
            this.model = savedModel;
        } else if (models[provider]?.length > 0) {
            // If no saved model or saved model not in current provider's list,
            // default to the first model for the current provider.
            modelSelect.value = models[provider][0].id;
            this.model = models[provider][0].id;
        } else {
            // No models available for this provider
            this.model = '';
        }
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
        const key = document.getElementById('ai-api-key').value.trim();
        const provider = document.getElementById('ai-provider').value;
        const model = document.getElementById('ai-model').value;
        
        this.apiKey = key;
        this.provider = provider;
        this.model = model;

        localStorage.setItem('ai_api_key', key);
        localStorage.setItem('ai_provider', provider);
        localStorage.setItem('ai_model', model);
        
        this.toggleConfig(false);
        const keyMsg = key ? '(usando tu API Key)' : '(usando configuración del servidor)';
        this.addMessage('assistant', `¡Configuración guardada! Usando **${provider}** con el modelo **${model}** ${keyMsg}.`, true);
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
        // Send full history + new message to server
        const messages = [
            { role: 'system', content: this.getSystemPrompt() },
            ...this.messages
        ];

        const provider = this.provider || 'gemini'; // 'gemini' or 'ollama'
        
        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: messages,
                    provider: provider,
                    model: this.model,
                    apiKey: this.apiKey
                })
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
