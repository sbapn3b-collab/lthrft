// assets/js/page-profile.js
document.addEventListener('pageReady', initProfile);

let currentProfile = null;

async function initProfile() {
    if (!Nav.user) {
        document.getElementById('profile-content').innerHTML =
            `<div class="text-center py-20"><p class="text-slate-400 font-bold text-lg mb-4">You're not signed in.</p>
            <button onclick="Nav.openAuth()" class="btn-primary px-8 py-3 rounded-xl font-bold">Sign In</button></div>`;
        return;
    }

    try {
        const data = await API.getProfile();
        currentProfile = data.profile;
        renderProfile(currentProfile);
    } catch {
        Nav.toast?.('Could not load profile.', 'error');
    }

    wireProfileEditing();
    wireSettingsToggle();
    wireSettingsRows();
    wirePasswordChange();
    wireNotificationPrefs();
    wirePrivacyPrefs();
    wireSignOut();
    wireDeleteAccount();
    wireAvatarUpload();
    await renderOrderHistory();
}

function wireSettingsToggle() {
    const modal    = document.getElementById('settings-modal');
    const openBtn  = document.getElementById('settings-toggle-btn');
    const closeBtn = document.getElementById('settings-close-btn');
    if (!modal || !openBtn) return;

    const open = () => {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        document.body.style.overflow = 'hidden';
        if (window.lucide) lucide.createIcons();
    };
    const close = () => {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        document.body.style.overflow = '';
    };

    openBtn.onclick = open;
    if (closeBtn) closeBtn.onclick = close;
    modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !modal.classList.contains('hidden')) close();
    });
}

function wireSettingsRows() {
    document.querySelectorAll('[data-settings-toggle]').forEach(btn => {
        btn.onclick = () => {
            const id    = btn.getAttribute('data-settings-toggle');
            const panel = document.getElementById(id);
            const chev  = btn.querySelector('.settings-chevron');
            if (!panel) return;
            const opened = panel.classList.toggle('hidden') === false;
            if (chev) chev.style.transform = opened ? 'rotate(180deg)' : '';
        };
    });
}

function wireNotificationPrefs() {
    const KEY = 'luckyth.notif';
    const fields = ['notif-orders', 'notif-arrivals', 'notif-promos'];
    const stored = JSON.parse(localStorage.getItem(KEY) || '{"notif-orders":true,"notif-arrivals":true,"notif-promos":false}');
    fields.forEach(id => { const el = document.getElementById(id); if (el) el.checked = !!stored[id]; });
    document.getElementById('save-notif-btn').onclick = () => {
        const obj = {};
        fields.forEach(id => obj[id] = document.getElementById(id).checked);
        localStorage.setItem(KEY, JSON.stringify(obj));
        Nav.toast?.('Notification preferences saved.', 'success');
    };
}

function wirePrivacyPrefs() {
    const KEY = 'luckyth.privacy';
    const fields = ['priv-history', 'priv-saveaddr'];
    const stored = JSON.parse(localStorage.getItem(KEY) || '{"priv-history":true,"priv-saveaddr":true}');
    fields.forEach(id => { const el = document.getElementById(id); if (el) el.checked = !!stored[id]; });
    document.getElementById('save-privacy-btn').onclick = () => {
        const obj = {};
        fields.forEach(id => obj[id] = document.getElementById(id).checked);
        localStorage.setItem(KEY, JSON.stringify(obj));
        Nav.toast?.('Privacy preferences saved.', 'success');
    };
}

function wireSignOut() {
    document.getElementById('settings-signout').onclick = () => {
        Nav.logout();
    };
}

function wireDeleteAccount() {
    const form = document.getElementById('delete-form');
    form.onsubmit = async (e) => {
        e.preventDefault();
        const pw = document.getElementById('del-password').value;
        if (!pw) return Nav.toast?.('Please enter your password.', 'error');
        if (!confirm('This will permanently delete your account, cart, and order history. Continue?')) return;
        try {
            await API.deleteAccount(pw);
            Nav.toast?.('Account deleted.', 'success');
            setTimeout(() => window.location.href = '/index.html', 800);
        } catch (err) {
            Nav.toast?.(err.message || 'Could not delete account.', 'error');
        }
    };
}

function renderProfile(p) {
    document.getElementById('profile-username').innerText = p.username;
    document.getElementById('profile-fullname-display').innerText = p.full_name || '';

    document.getElementById('view-fullname').innerText = p.full_name || '—';
    document.getElementById('view-email').innerText    = p.email     || '—';
    document.getElementById('view-phone').innerText    = p.phone     || '—';
    document.getElementById('view-username').innerText = p.username  || '—';
    document.getElementById('view-address').innerText  = p.address   || '—';

    const img = document.getElementById('avatar-img');
    const ico = document.getElementById('avatar-icon');
    const rm  = document.getElementById('avatar-remove-btn');
    if (p.avatar) {
        img.src = p.avatar;
        img.classList.remove('hidden');
        ico.classList.add('hidden');
        if (rm) rm.classList.remove('hidden');
    } else {
        img.classList.add('hidden');
        ico.classList.remove('hidden');
        if (rm) rm.classList.add('hidden');
    }

    if (window.lucide) lucide.createIcons();
}

function wireProfileEditing() {
    const view = document.getElementById('profile-view');
    const form = document.getElementById('profile-form');
    const editBtn = document.getElementById('edit-profile-btn');
    const cancelBtn = document.getElementById('cancel-profile-btn');

    function fillForm() {
        document.getElementById('f-fullname').value = currentProfile.full_name || '';
        document.getElementById('f-email').value    = currentProfile.email     || '';
        document.getElementById('f-phone').value    = currentProfile.phone     || '';
        document.getElementById('f-username').value = currentProfile.username  || '';
        document.getElementById('f-address').value  = currentProfile.address   || '';
    }

    editBtn.onclick = () => {
        fillForm();
        view.classList.add('hidden');
        form.classList.remove('hidden');
        editBtn.classList.add('hidden');
    };

    cancelBtn.onclick = () => {
        form.classList.add('hidden');
        view.classList.remove('hidden');
        editBtn.classList.remove('hidden');
    };

    form.onsubmit = async (e) => {
        e.preventDefault();
        const btn = document.getElementById('save-profile-btn');
        btn.disabled = true;
        const orig = btn.innerHTML;
        btn.innerHTML = 'Saving…';
        try {
            const payload = {
                full_name: document.getElementById('f-fullname').value.trim(),
                email:     document.getElementById('f-email').value.trim(),
                phone:     document.getElementById('f-phone').value.trim(),
                address:   document.getElementById('f-address').value.trim(),
            };
            const data = await API.updateProfile(payload);
            currentProfile = { ...currentProfile, ...data.profile };
            renderProfile(currentProfile);
            form.classList.add('hidden');
            view.classList.remove('hidden');
            editBtn.classList.remove('hidden');
            Nav.toast?.('Profile updated.', 'success');
        } catch (err) {
            Nav.toast?.(err.message || 'Update failed.', 'error');
        } finally {
            btn.disabled = false;
            btn.innerHTML = orig;
            if (window.lucide) lucide.createIcons();
        }
    };
}

function wirePasswordChange() {
    const form = document.getElementById('password-form');
    if (!form) return;
    form.onsubmit = async (e) => {
        e.preventDefault();
        const cur = document.getElementById('pw-current').value;
        const nw  = document.getElementById('pw-new').value;
        const cf  = document.getElementById('pw-confirm').value;
        if (nw.length < 6) return Nav.toast?.('New password must be at least 6 characters.', 'error');
        if (nw !== cf)     return Nav.toast?.('New passwords do not match.', 'error');
        try {
            await API.changePassword(cur, nw);
            form.reset();
            Nav.toast?.('Password changed.', 'success');
        } catch (err) {
            Nav.toast?.(err.message || 'Could not change password.', 'error');
        }
    };
}

function wireAvatarUpload() {
    const btn   = document.getElementById('avatar-btn');
    const rm    = document.getElementById('avatar-remove-btn');
    const input = document.getElementById('avatar-input');

    if (rm) rm.onclick = async () => {
        if (!confirm('Remove your profile picture?')) return;
        try {
            const data = await API.updateProfile({
                full_name: currentProfile.full_name || '',
                email:     currentProfile.email     || '',
                phone:     currentProfile.phone     || '',
                address:   currentProfile.address   || '',
                avatar:    '',
            });
            currentProfile = { ...currentProfile, ...data.profile };
            renderProfile(currentProfile);
            Nav.toast?.('Profile picture removed.', 'success');
        } catch (err) {
            Nav.toast?.(err.message || 'Could not remove photo.', 'error');
        }
    };

    btn.onclick = () => input.click();
    input.onchange = async () => {
        const file = input.files?.[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) return Nav.toast?.('Please choose an image file.', 'error');
        if (file.size > 1.5 * 1024 * 1024)   return Nav.toast?.('Image too large (max 1.5 MB).', 'error');

        try {
            const dataUrl = await resizeImage(file, 400);
            const data = await API.updateProfile({
                full_name: currentProfile.full_name || '',
                email:     currentProfile.email     || '',
                phone:     currentProfile.phone     || '',
                address:   currentProfile.address   || '',
                avatar:    dataUrl,
            });
            currentProfile = { ...currentProfile, ...data.profile };
            renderProfile(currentProfile);
            Nav.toast?.('Profile picture updated.', 'success');
        } catch (err) {
            Nav.toast?.(err.message || 'Upload failed.', 'error');
        } finally {
            input.value = '';
        }
    };
}

function resizeImage(file, maxSize) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const img = new Image();
            img.onload = () => {
                let { width, height } = img;
                if (width > height && width > maxSize) {
                    height = Math.round(height * (maxSize / width)); width = maxSize;
                } else if (height > maxSize) {
                    width = Math.round(width * (maxSize / height)); height = maxSize;
                }
                const canvas = document.createElement('canvas');
                canvas.width = width; canvas.height = height;
                canvas.getContext('2d').drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', 0.85));
            };
            img.onerror = reject;
            img.src = reader.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

async function renderOrderHistory() {
    const list = document.getElementById('profile-history');
    try {
        const data = await API.getOrders();
        if (!data.orders.length) {
            list.innerHTML = `<p class="text-slate-500 italic text-sm">No orders yet.</p>`;
            return;
        }
        list.innerHTML = data.orders.map(o => {
            const sc = {
                Pending:'bg-orange text-white', Shipped:'bg-navy text-white',
                Delivered:'bg-emerald-500 text-white', Cancelled:'bg-slate-300 text-slate-600',
                Processing:'bg-blue-500 text-white'
            }[o.status] || '';
            return `
            <div class="flex justify-between items-center py-3 border-b border-slate-100 last:border-0">
                <div>
                    <p class="font-bold text-navy">${o.items.map(i=>i.name).join(', ')}</p>
                    <p class="text-xs text-slate-400 font-mono mt-1">ORD-${o.id} | ₱${Number(o.total_amount).toLocaleString()}</p>
                    ${o.delivery_addr ? `<p class="text-xs text-slate-400 truncate">📍 ${o.delivery_addr}</p>` : ''}
                </div>
                <span class="text-[10px] font-black uppercase px-3 py-1 rounded-full ${sc} ml-3 shrink-0">${o.status}</span>
            </div>`;
        }).join('');
    } catch {
        list.innerHTML = `<p class="text-red-400 text-sm">Could not load orders.</p>`;
    }
}
