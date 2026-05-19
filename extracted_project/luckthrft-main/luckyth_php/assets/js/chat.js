// assets/js/chat.js — Floating chat widget for customers
const ChatWidget = {
    isOpen:      false,
    pollTimer:   null,
    unreadTimer: null,

    toggle() {
        this.isOpen = !this.isOpen;
        const panel     = document.getElementById('chat-panel');
        const iconOpen  = document.getElementById('chat-icon-open');
        const iconClose = document.getElementById('chat-icon-close');
        if (!panel) return;

        panel.classList.toggle('hidden', !this.isOpen);
        panel.classList.toggle('flex',   this.isOpen);
        iconOpen?.classList.toggle('hidden', this.isOpen);
        iconClose?.classList.toggle('hidden', !this.isOpen);

        if (this.isOpen) {
            this.renderInputArea();
            this.loadMessages();
            this.pollTimer = setInterval(() => this.loadMessages(), 5000);
            // Hide unread badge while open
            const badge = document.getElementById('chat-unread-badge');
            if (badge) badge.classList.add('hidden');
        } else {
            clearInterval(this.pollTimer);
        }
    },

    async loadMessages() {
        if (!Nav.user) { this.renderGuest(); return; }
        try {
            const data = await API.getChatMessages();
            this.renderMessages(data.messages || []);
        } catch(e) { console.warn('chat poll error', e); }
    },

    renderGuest() {
        const msgs = document.getElementById('chat-messages');
        if (!msgs) return;
        msgs.innerHTML = `
            <div class="text-center py-10">
                <div class="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <i data-lucide="lock" class="w-5 h-5 text-slate-300"></i>
                </div>
                <p class="text-sm font-bold text-slate-500 mb-1">Sign in to chat with us</p>
                <p class="text-xs text-slate-400">We're here to help!</p>
            </div>`;
        lucide.createIcons();

        const area = document.getElementById('chat-input-area');
        if (area) area.innerHTML = `
            <button onclick="Nav.openAuth()"
                class="w-full bg-navy text-white font-bold py-3 rounded-xl text-sm hover:bg-slate-800 transition-colors">
                Sign In to Chat
            </button>`;
    },

    renderMessages(msgs) {
        const el = document.getElementById('chat-messages');
        if (!el) return;
        if (!msgs.length) {
            el.innerHTML = `
                <div class="text-center py-10">
                    <p class="text-sm font-bold text-slate-400">No messages yet</p>
                    <p class="text-xs text-slate-300 mt-1">Say hello — we'd love to help!</p>
                </div>`;
            return;
        }
        el.innerHTML = msgs.map(m => {
            const isMe = !m.from_admin;
            const time = new Date(m.created_at.replace(' ', 'T'))
                .toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
            const safe = m.content.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
            return `
            <div class="flex ${isMe ? 'justify-end' : 'justify-start'}">
                <div class="max-w-[78%]">
                    <div class="px-3 py-2 rounded-2xl text-sm font-medium leading-snug
                        ${isMe
                            ? 'bg-navy text-white rounded-br-sm'
                            : 'bg-white text-slate-700 border border-slate-100 shadow-sm rounded-bl-sm'}">
                        ${safe}
                    </div>
                    <div class="text-[10px] text-slate-400 mt-0.5 ${isMe ? 'text-right' : ''}">${time}</div>
                </div>
            </div>`;
        }).join('');
        el.scrollTop = el.scrollHeight;
    },

    renderInputArea() {
        const area = document.getElementById('chat-input-area');
        if (!area) return;
        if (!Nav.user) { this.renderGuest(); return; }
        area.innerHTML = `
            <div class="flex gap-2">
                <input id="chat-msg-input" type="text" placeholder="Type a message…" maxlength="500"
                    class="flex-1 px-3 py-2.5 border-2 border-slate-200 rounded-xl text-sm font-medium focus:border-navy focus:outline-none transition-colors"
                    onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();ChatWidget.send();}">
                <button onclick="ChatWidget.send()"
                    class="w-10 h-10 bg-orange hover:bg-orange/90 text-white rounded-xl flex items-center justify-center transition-colors shrink-0">
                    <i data-lucide="send" class="w-4 h-4"></i>
                </button>
            </div>`;
        lucide.createIcons();
        document.getElementById('chat-msg-input')?.focus();
    },

    async send() {
        const input = document.getElementById('chat-msg-input');
        if (!input) return;
        const content = input.value.trim();
        if (!content) return;
        input.value = '';
        input.disabled = true;
        try {
            await API.sendChatMessage(content);
            await this.loadMessages();
        } catch(e) {
            showToast(e.message, 'error');
        } finally {
            input.disabled = false;
            input.focus();
        }
    },

    async checkUnread() {
        if (!Nav.user || Nav.user.role === 'admin' || this.isOpen) return;
        try {
            const data  = await API.getChatUnread();
            const count = data.unread || 0;
            const badge = document.getElementById('chat-unread-badge');
            if (!badge) return;
            badge.textContent = count > 9 ? '9+' : count;
            badge.classList.toggle('hidden', count === 0);
        } catch(e) {}
    },
};

function initChatWidget() {
    lucide.createIcons();
    // Poll for unread admin replies every 30s even when widget is closed
    ChatWidget.unreadTimer = setInterval(() => ChatWidget.checkUnread(), 30_000);
    ChatWidget.checkUnread();
}
