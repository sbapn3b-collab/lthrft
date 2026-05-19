// ============================================================
// assets/js/nav.js  — runs on EVERY page
// Loads shared nav/modal/toast includes, manages auth state.
// The loader is ALWAYS hidden at the end, even if errors occur.
// ============================================================

// Auto-detect base path so it works regardless of folder name
const BASE = (function() {
    const scripts = document.querySelectorAll('script[src]');
    for (const s of scripts) {
        const src = s.getAttribute('src');
        if (src && src.includes('nav.js')) {
            return src.replace(/assets\/js\/nav\.js.*/, '').replace(/\/$/, '') || '.';
        }
    }
    return '.';
})();

// Utility: load an HTML include into a target element
async function loadInclude(targetId, path) {
    const el = document.getElementById(targetId);
    if (!el) return;
    try {
        const res  = await fetch(path);
        const html = await res.text();
        el.innerHTML = html;
    } catch(e) { console.warn('Could not load include:', path, e); }
}

// Toast helper — available globally on every page
function showToast(msg, type = 'info') {
    const toast = document.getElementById('toast');
    const icon  = document.getElementById('toast-icon');
    if (!toast) return;
    document.getElementById('toast-msg').innerText = msg;
    if (icon) icon.setAttribute('data-lucide',
        type === 'error'   ? 'alert-circle' :
        type === 'success' ? 'check-circle' : 'info');
    lucide.createIcons();
    toast.classList.remove('translate-y-20', 'opacity-0');
    setTimeout(() => toast.classList.add('translate-y-20', 'opacity-0'), 3500);
}

// ── NAV object — auth + cart badge ────────────────────────────────────────────
const Nav = {
    user: null,   // { id, username, role } or null

    // Called after includes are injected
    init: async function() {
        try {
            const data = await API.me();
            this.user = data.user || null;
        } catch { this.user = null; }
        this.updateHeader();
        this.updateCartBadge();
        this.highlightActiveLink();
        lucide.createIcons();
    },

    updateHeader: function() {
        const show = (id, visible) => {
            const el = document.getElementById(id);
            if (el) el.style.display = visible ? (el.tagName === 'A' ? 'flex' : 'block') : 'none';
        };
        const loggedIn = !!this.user;
        show('auth-btn',    !loggedIn);
        show('logout-btn',   loggedIn);
        show('profile-btn',  loggedIn);

        const img = document.getElementById('profile-btn-avatar');
        const ico = document.getElementById('profile-btn-icon');
        if (img && ico) {
            if (loggedIn && this.user.avatar) {
                img.src = this.user.avatar;
                img.classList.remove('hidden');
                ico.classList.add('hidden');
            } else {
                img.classList.add('hidden');
                ico.classList.remove('hidden');
            }
        }
    },

    updateCartBadge: async function() {
        const badge = document.getElementById('cart-badge');
        if (!badge || !this.user || this.user.role === 'admin') {
            if (badge) badge.classList.add('hidden');
            return;
        }
        try {
            const data  = await API.getCart();
            const count = data.cart.length;
            badge.innerText = count;
            badge.classList.toggle('hidden', count === 0);
        } catch { badge.classList.add('hidden'); }
    },

    highlightActiveLink: function() {
        const page = document.body.dataset.page;
        document.querySelectorAll('.nav-link[data-page]').forEach(a => {
            const isActive = a.dataset.page === page;
            a.classList.toggle('text-orange', isActive);
            a.classList.toggle('text-navy',  !isActive);
        });
    },

    openAuth:  function() {
        const m = document.getElementById('auth-modal');
        if (m) { m.classList.remove('hidden'); m.classList.add('flex'); lucide.createIcons(); }
    },
    closeAuth: function() {
        const m = document.getElementById('auth-modal');
        if (m) { m.classList.add('hidden'); m.classList.remove('flex'); }
    },
    toggleAuthMode: function(mode) {
        document.getElementById('login-container')?.classList.toggle('hidden',  mode !== 'login');
        document.getElementById('login-container')?.classList.toggle('block',   mode === 'login');
        document.getElementById('signup-container')?.classList.toggle('hidden', mode !== 'signup');
        document.getElementById('signup-container')?.classList.toggle('block',  mode === 'signup');
    },

    // Login
    login: async function(e) {
        e.preventDefault();
        const uF = document.getElementById('login-username');
        const eF = document.getElementById('login-email');
        const pF = document.getElementById('login-password');
        try {
            const data = await API.login(
                uF.value.trim(),
                (eF?.value || '').trim(),
                pF.value.trim()
            );
            pF.value = ''; uF.value = ''; if (eF) eF.value = '';
            this.user = data.user;
            this.closeAuth();
            this.updateHeader();
            this.updateCartBadge();
            if (data.user.role === 'admin') {
                window.location.href = BASE + '/admin/dashboard.html';
            } else {
                showToast(`Welcome back, ${data.user.username}!`, 'success');
                // Reload page to reflect logged-in state
                setTimeout(() => window.location.reload(), 800);
            }
        } catch(err) {
            pF.value = '';
            showToast(err.message, 'error');
        }
    },

    // Register
    register: async function(e) {
        e.preventDefault();
        const uF = document.getElementById('reg-username');
        const pF = document.getElementById('reg-password');
        const eF = document.getElementById('reg-email');
        try {
            const data = await API.register(uF.value.trim(), pF.value.trim(), eF?.value.trim() || '');
            pF.value = ''; uF.value = '';
            this.user = data.user;
            this.closeAuth();
            this.updateHeader();
            showToast(`Account created! Welcome, ${data.user.username}!`, 'success');
            setTimeout(() => window.location.href = BASE + '/profile.html', 800);
        } catch(err) {
            pF.value = '';
            showToast(err.message, 'error');
        }
    },

    // Logout (with confirmation)
    logout: async function(skipConfirm = false) {
        if (!skipConfirm && !confirm('Sign out of LuckyThrift?')) return;
        await API.logout().catch(() => {});
        this.user = null;
        this.updateHeader();
        showToast('Logged out successfully.');
        setTimeout(() => window.location.href = BASE + '/index.html', 700);
    },
};

// Hide the global loader — ALWAYS called
function hideLoader() {
    const loader = document.getElementById('global-loader');
    if (loader) {
        loader.style.transition = 'opacity 0.3s';
        loader.style.opacity = '0';
        setTimeout(() => loader.style.display = 'none', 300);
    }
}

// ── Page bootstrap ────────────────────────────────────────────────────────────
async function bootPage() {
    // Hard safety net: hide loader after 5s no matter what
    const safetyTimeout = setTimeout(hideLoader, 5000);
    try {
        // Load includes — allSettled means one failure won't block others
        await Promise.allSettled([
            loadInclude('nav-placeholder',   BASE + '/includes/nav.html'),
            loadInclude('auth-placeholder',  BASE + '/includes/auth-modal.html'),
            loadInclude('toast-placeholder', BASE + '/includes/toast.html'),
        ]);
        // Try to restore session — timeout after 4s if PHP not responding
        try {
            const data = await Promise.race([
                API.me(),
                new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 4000))
            ]);
            Nav.user = data.user || null;
        } catch {
            Nav.user = null; // PHP not running or not logged in — that's fine
        }
        Nav.updateHeader();
        Nav.highlightActiveLink();
        Nav.updateCartBadge().catch(() => {});
        lucide.createIcons();
    } catch(e) {
        console.error('bootPage error:', e);
    } finally {
        clearTimeout(safetyTimeout);
        hideLoader(); // ALWAYS runs
        // Inject chat widget on all public (non-admin) pages
        const isAdminPage = document.body.hasAttribute('data-admin-page');
        if (!isAdminPage) {
            const chatRoot = document.createElement('div');
            chatRoot.id = 'chat-widget-root';
            document.body.appendChild(chatRoot);
            await loadInclude('chat-widget-root', BASE + '/includes/chat-widget.html');
            if (typeof initChatWidget === 'function') initChatWidget();
        }
        // Signal all page scripts that nav + auth are ready
        document.dispatchEvent(new CustomEvent('pageReady', { detail: { user: Nav.user } }));
    }
}

document.addEventListener('DOMContentLoaded', bootPage);
