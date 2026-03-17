/**
 * AI Chat Assistant - Tránsito de Girón
 * Toda la lógica de contexto (roster, partidos, torneo) la maneja el servidor (/api/chat).
 */

class AIChat {
    constructor() {
        this.messages   = [];
        this.maxHistory = 10;
        this.isTyping   = false;
        this.model      = 'gemini-2.5-flash';
        this.init();
    }

    init() {
        this.toggleBtn         = document.getElementById('ai-chat-toggle');
        this.closeBtn          = document.getElementById('ai-chat-close');
        this.chatWindow        = document.getElementById('ai-chat-window');
        this.sendBtn           = document.getElementById('ai-chat-send');
        this.inputField        = document.getElementById('ai-chat-input');
        this.messagesContainer = document.getElementById('ai-chat-messages');

        if (this.toggleBtn) this.toggleBtn.onclick = () => this.toggleChat();
        if (this.closeBtn)  this.closeBtn.onclick  = () => this.toggleChat(false);
        if (this.sendBtn)   this.sendBtn.onclick    = () => this.handleSendMessage();

        if (this.inputField) {
            this.inputField.onkeydown = (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.handleSendMessage();
                }
            };
        }
    }

    toggleChat(show) {
        const isHidden  = this.chatWindow.classList.contains('hidden');
        const shouldShow = show !== undefined ? show : isHidden;
        if (shouldShow) {
            this.chatWindow.classList.remove('hidden');
            this.inputField.focus();
        } else {
            this.chatWindow.classList.add('hidden');
        }
    }

    addMessage(role, text, skipHistory = false) {
        const msgDiv = document.createElement('div');
        msgDiv.className = `message ${role}`;
        msgDiv.innerHTML = role === 'assistant' ? text : '';
        if (role !== 'assistant') msgDiv.textContent = text;
        this.messagesContainer.appendChild(msgDiv);
        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;

        if (!skipHistory) {
            this.messages.push({ role, content: text });
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
            const data    = await this.fetchAIResponse();
            const content = data?.content || '';
            const mdContent = (window.marked && typeof window.marked.parse === 'function')
                ? window.marked.parse(content)
                : content;
            this.addMessage('assistant', mdContent);
        } catch (error) {
            console.error('AI Error:', error.message);
            this.addMessage('assistant', '⚠️ Sin conexión con el servidor. Intenta de nuevo.', true);
        } finally {
            this.removeTypingIndicator();
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

    async fetchAIResponse() {
        const response = await fetch('/api/chat', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ messages: this.messages.slice(-6), model: this.model }),
            signal:  AbortSignal.timeout(30000),
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.error || `Error ${response.status}`);
        }

        return response.json();
    }
}

// Auto-expand textarea
document.addEventListener('input', function(e) {
    if (e.target.id === 'ai-chat-input') {
        e.target.style.height = 'auto';
        e.target.style.height = (e.target.scrollHeight) + 'px';
    }
});

document.addEventListener('DOMContentLoaded', () => {
    window.aiChat = new AIChat();
});
