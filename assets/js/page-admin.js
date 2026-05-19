// assets/js/page-admin.js
// Shared across all admin/*.html pages.
// Guards against non-admin access, handles sidebar active state.

document.addEventListener('DOMContentLoaded', () => setTimeout(initAdmin, 500));

async function initAdmin() {
    // Guard: must be logged in as admin
    if (!Nav.user || Nav.user.role !== 'admin') {
        window.location.href = '/index.html';
        return;
    }
    // Highlight active sidebar link
    const page = document.body.dataset.adminPage;
    document.querySelectorAll('.admin-nav-btn').forEach(btn => {
        const isActive = btn.dataset.page === page;
        btn.classList.toggle('active',       isActive);
        btn.classList.toggle('text-slate-300', !isActive);
    });
    // Poll for unread customer messages on all admin pages (updates sidebar badge)
    await pollAdminUnread();
    setInterval(pollAdminUnread, 15000);
}

async function pollAdminUnread() {
    try {
        const data  = await API.adminGetChats();
        const convs = data.conversations || [];
        const total = convs.reduce((s, c) => s + (c.unread || 0), 0);
        const badge = document.getElementById('sidebar-msg-badge');
        if (!badge) return;
        badge.textContent = total > 9 ? '9+' : total;
        badge.classList.toggle('hidden', total === 0);
    } catch(e) {}
}

async function adminLogout() {
    await API.logout().catch(() => {});
    window.location.href = '/index.html';
}

// Shared admin sidebar HTML (injected via loadInclude or just copied into each page)
// Stats helpers
async function loadDashboardStats() {
    try {
        const data = await API.getDashboard();
        setText('stat-revenue',   '₱' + Number(data.revenue).toLocaleString());
        setText('stat-pending',   data.pending);
        setText('stat-products',  data.products);
        setText('stat-customers', data.customers);

        const topEl = document.getElementById('stat-top-products');
        if (topEl) topEl.innerHTML = (data.top_products || []).map((p, i) => `
            <div class="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                <div class="flex items-center gap-3">
                    <span class="w-7 h-7 bg-navy text-white rounded-full flex items-center justify-center text-xs font-black">${i+1}</span>
                    <span class="font-bold text-navy text-sm">${p.name}</span>
                </div>
                <span class="bg-orange/10 text-orange font-black text-sm px-3 py-1 rounded-full">${p.sold} sold</span>
            </div>`).join('');
    } catch(e) { showToast('Error loading stats.', 'error'); }
}

function setText(id, val) {
    const el = document.getElementById(id);
    if (el) el.innerText = val;
}
