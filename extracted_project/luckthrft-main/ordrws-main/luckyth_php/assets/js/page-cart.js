// assets/js/page-cart.js — Cart & Orders page

document.addEventListener('pageReady', initCart);

async function initCart() {
    await loadInclude('checkout-placeholder', '/includes/checkout-modal.html');
    lucide.createIcons();

    if (!Nav.user) {
        document.getElementById('cart-list').innerHTML =
            `<p class="text-center text-slate-400 font-bold py-10">Please <button onclick="Nav.openAuth()" class="text-orange underline font-black">Sign In</button> to view your cart.</p>`;
        document.getElementById('orders-list').innerHTML = '';
        document.getElementById('checkout-bar').classList.add('hidden');
        return;
    }
    await renderCartItems();
    await renderOrders();
}

// ── CART ITEMS ────────────────────────────────────────────────────────────────
async function renderCartItems() {
    const list = document.getElementById('cart-list');
    try {
        const data = await API.getCart();
        const cart = data.cart;

        if (cart.length === 0) {
            list.innerHTML = `
                <div class="text-center py-10">
                    <p class="text-slate-400 font-bold text-lg mb-2">Your cart is empty.</p>
                    <a href="/shop.html" class="text-orange font-bold underline">Browse the Storefront</a>
                </div>`;
            document.getElementById('checkout-bar').classList.add('hidden');
            return;
        }

        list.innerHTML = cart.map(item => `
            <div class="flex items-center gap-4 p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl hover:border-navy transition-colors">
                <input type="checkbox" class="cart-item-checkbox w-5 h-5 accent-orange cursor-pointer rounded"
                    data-cartid="${item.cart_id}" data-price="${item.price}" onchange="updateCheckoutBar()">
                <a href="/products/product-${item.product_id}.html">
                    <img src="${item.images?.[0] || ''}" class="w-14 h-14 rounded-xl object-cover shrink-0 hover:opacity-80 transition">
                </a>
                <div class="flex-1 min-w-0">
                    <a href="/products/product-${item.product_id}.html" class="font-black text-navy hover:text-orange transition-colors">${item.name}</a>
                    <p class="text-sm font-bold text-orange">₱${item.price}</p>
                    ${item.stock < 1 ? '<p class="text-xs font-bold text-red-400 mt-1">⚠ Now out of stock — remove before checkout</p>' : ''}
                </div>
                <button onclick="removeFromCart(${item.cart_id})" class="p-2 text-slate-300 hover:text-red-500 transition-colors shrink-0" title="Remove">
                    <i data-lucide="trash-2" class="w-5 h-5"></i>
                </button>
            </div>`).join('');

        document.getElementById('checkout-bar').classList.remove('hidden');
        updateCheckoutBar();
        lucide.createIcons();
    } catch(e) {
        list.innerHTML = `<p class="text-red-400 text-center font-bold py-6">Could not load cart.</p>`;
    }
}

async function removeFromCart(cartId) {
    if (!confirm('Remove this item from your cart?')) return;
    try {
        await API.removeFromCart(cartId);
        await Nav.updateCartBadge();
        await renderCartItems();
        showToast('Item removed from cart.');
    } catch(e) { showToast(e.message, 'error'); }
}

function updateCheckoutBar() {
    const checkboxes    = document.querySelectorAll('.cart-item-checkbox:checked');
    const total         = Array.from(checkboxes).reduce((s, cb) => s + parseFloat(cb.dataset.price), 0);
    const count         = checkboxes.length;
    document.getElementById('checkout-bar-count').innerText = count > 0
        ? `${count} item${count > 1 ? 's' : ''} selected` : 'Select items to checkout';
    document.getElementById('checkout-bar-total').innerText = count > 0 ? `₱${total.toLocaleString()}` : '';
    const btn = document.getElementById('checkout-bar-btn');
    btn.disabled  = count === 0;
    btn.className = count > 0
        ? 'btn-primary px-8 py-3 rounded-xl font-black text-sm flex items-center gap-2 shadow-lg'
        : 'bg-slate-200 text-slate-400 px-8 py-3 rounded-xl font-black text-sm flex items-center gap-2 cursor-not-allowed';
}

// ── ORDERS ────────────────────────────────────────────────────────────────────
async function renderOrders() {
    const list = document.getElementById('orders-list');
    try {
        const data   = await API.getOrders();
        const orders = data.orders;
        if (!orders.length) {
            list.innerHTML = `<p class="text-slate-400 text-center font-bold py-6">No orders placed yet.</p>`;
            return;
        }
        list.innerHTML = orders.map(o => {
            const itemSummary = o.items.map(i => i.name).join(', ');
            const statusClass = { Pending:'bg-orange text-white', Processing:'bg-blue-500 text-white', Shipped:'bg-navy text-white', Delivered:'bg-green-500 text-white', Cancelled:'bg-slate-300 text-slate-600' }[o.status] || 'bg-slate-200';
            const canCancel   = o.status === 'Pending';
            return `
            <div class="flex items-center justify-between p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl hover:border-navy transition-colors" id="order-row-${o.id}">
                <div class="flex-1 min-w-0 mr-4">
                    <p class="font-black text-navy">${itemSummary}</p>
                    <p class="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">ORD-${o.id} · ₱${Number(o.total_amount).toLocaleString()}</p>
                    ${o.delivery_addr  ? `<p class="text-xs text-slate-400 mt-1 truncate">📍 ${o.delivery_addr}</p>` : ''}
                    ${o.payment_method ? `<p class="text-xs text-slate-400">💳 ${o.payment_method}${o.ewallet_num ? ` (${o.ewallet_num})` : ''}</p>` : ''}
                </div>
                <div class="flex flex-col items-end gap-2 shrink-0">
                    <span class="text-[10px] font-black uppercase px-3 py-1 rounded-full ${statusClass}">${o.status}</span>
                    <div class="flex gap-2">
                        ${canCancel ? `<button onclick="cancelOrder(${o.id})" class="text-red-400 border-2 border-red-300 px-3 py-1.5 rounded-xl text-xs font-bold hover:bg-red-50 flex items-center gap-1"><i data-lucide="x-circle" class="w-3 h-3"></i> Cancel</button>` : ''}
                        ${o.status !== 'Cancelled' ? `<button onclick="openTracking(${o.id})" class="text-navy border-2 border-navy px-3 py-1.5 rounded-xl text-xs font-bold hover:bg-navy hover:text-white flex items-center gap-1"><i data-lucide="map-pin" class="w-3 h-3"></i> Track</button>` : ''}
                    </div>
                </div>
            </div>`;
        }).join('');
        lucide.createIcons();
        // Store orders in memory for tracking
        window._orders = orders;
    } catch(e) {
        list.innerHTML = `<p class="text-red-400 text-center font-bold py-6">Could not load orders.</p>`;
    }
}

async function cancelOrder(orderId) {
    if (!confirm(`Cancel Order #${orderId}? Stock will be restored.`)) return;
    try {
        const result = await API.cancelOrder(orderId);
        showToast(result.message, 'success');
        await renderOrders();
        await renderCartItems(); // refresh stock warnings
    } catch(e) { showToast(e.message, 'error'); }
}

function openTracking(orderId) {
    const order = window._orders?.find(o => o.id === orderId);
    if (!order) return;
    const card = document.getElementById('tracking-card');
    document.getElementById('track-status').innerText = order.status;
    document.getElementById('track-id').innerText     = `ORD-${order.id}`;
    document.getElementById('track-item').innerText   = order.items.map(i => i.name).join(', ');

    const steps = [
        { label: 'Order Placed',         desc: 'Your order was received.',             active: true },
        { label: 'Processing',           desc: 'Admin is preparing your items.',       active: order.status !== 'Pending' },
        { label: 'Shipped / In Transit', desc: 'Handed to courier / logistics.',       active: ['Shipped','Delivered'].includes(order.status) },
        { label: 'Delivered',            desc: 'Package received by customer.',        active: order.status === 'Delivered' },
    ];
    document.getElementById('track-timeline').innerHTML = steps.map((s, i) => `
        <div class="relative ${!s.active && i > 0 ? 'opacity-30' : ''}">
            <div class="absolute -left-[23px] top-1 w-3 h-3 rounded-full ${s.active ? (i===3?'bg-green-500':i===2?'bg-navy animate-pulse':'bg-orange') : 'bg-slate-200'}"></div>
            <p class="font-bold text-navy text-sm">${s.label}</p>
            <p class="text-[10px] text-slate-400">${s.desc}</p>
        </div>`).join('<div class="mt-6"></div>');

    card.classList.remove('hidden');
    card.scrollIntoView({ behavior: 'smooth', block: 'end' });
    lucide.createIcons();
}

// ── CHECKOUT ──────────────────────────────────────────────────────────────────
const Checkout = {
    _cartIds: [],

    open: function() {
        const checkboxes   = document.querySelectorAll('.cart-item-checkbox:checked');
        if (!checkboxes.length) { showToast('Please select at least one item.'); return; }
        this._cartIds = Array.from(checkboxes).map(cb => parseInt(cb.dataset.cartid));

        // Build summary in modal
        const prices = Array.from(checkboxes).map(cb => parseFloat(cb.dataset.price));
        const total  = prices.reduce((s, p) => s + p, 0);

        // Get item names from the DOM
        const names = Array.from(checkboxes).map(cb => {
            const row = cb.closest('[data-cartid]') || cb.parentElement.parentElement;
            return cb.closest('.flex')?.querySelector('a')?.innerText || 'Item';
        });

        document.getElementById('checkout-item-name').innerText  =
            checkboxes.length === 1 ? (checkboxes[0].closest('.flex')?.querySelector('a')?.innerText || 'Item') : `${checkboxes.length} items`;
        document.getElementById('checkout-item-price').innerText = `₱${total.toLocaleString()}`;

        const breakdown = document.getElementById('checkout-item-breakdown');
        if (checkboxes.length > 1) {
            breakdown.innerHTML = Array.from(checkboxes).map(cb => `
                <div class="flex justify-between text-xs font-bold text-slate-500 py-1 border-b border-slate-100 last:border-0">
                    <span>${cb.closest('.flex')?.querySelector('a')?.innerText || 'Item'}</span>
                    <span class="text-navy">₱${cb.dataset.price}</span>
                </div>`).join('');
            breakdown.classList.remove('hidden');
        } else {
            breakdown.classList.add('hidden');
        }

        // Reset fields
        document.getElementById('checkout-barangay').value = '';
        document.getElementById('checkout-address').value  = '';
        document.getElementById('checkout-ewallet-num').value = '';
        document.getElementById('ewallet-input').classList.add('hidden');
        document.querySelectorAll('.payment-option').forEach(opt => {
            const clone = opt.cloneNode(true);
            opt.parentNode.replaceChild(clone, opt);
        });
        document.querySelectorAll('.payment-card').forEach(c => {
            c.classList.remove('border-navy', 'bg-navy/5'); c.classList.add('border-slate-100');
        });
        document.querySelectorAll('input[name="payment"]').forEach(r => r.checked = false);
        document.querySelectorAll('.payment-option').forEach(opt => {
            const radio = opt.querySelector('input');
            const card  = opt.querySelector('.payment-card');
            radio?.addEventListener('change', function() {
                document.querySelectorAll('.payment-card').forEach(c => {
                    c.classList.remove('border-navy','bg-navy/5'); c.classList.add('border-slate-100');
                });
                card.classList.add('border-navy','bg-navy/5'); card.classList.remove('border-slate-100');
                document.getElementById('ewallet-input').classList.toggle('hidden',
                    radio.value !== 'GCash' && radio.value !== 'Maya');
            });
        });

        const modal = document.getElementById('checkout-modal');
        modal.classList.remove('hidden'); modal.classList.add('flex');
        lucide.createIcons();
    },

    close: function() {
        const modal = document.getElementById('checkout-modal');
        modal.classList.add('hidden'); modal.classList.remove('flex');
        this._cartIds = [];
    },

    placeOrder: async function() {
        const address    = document.getElementById('checkout-address').value.trim();
        const payment    = document.querySelector('input[name="payment"]:checked');
        const ewalletNum = document.getElementById('checkout-ewallet-num').value.trim();

        if (!this._cartIds.length) { showToast('No items selected.'); return; }
        if (!address || address.length < 10) { showToast('Please enter your full delivery address.'); return; }
        if (!payment)  { showToast('Please select a payment method.'); return; }
        // Province field is no longer used; pass empty string for backward compat with API.
        const barangay = '';
        if ((payment.value === 'GCash' || payment.value === 'Maya') && !ewalletNum) {
            showToast(`Please enter your ${payment.value} number.`); return;
        }

        const itemCount = this._cartIds.length;
        if (!confirm(`Place this order for ${itemCount} item${itemCount > 1 ? 's' : ''} using ${payment.value}?`)) return;

        const btn = document.getElementById('place-order-btn');
        btn.disabled = true; btn.innerText = 'Placing Order…';

        try {
            const result = await API.placeOrder(this._cartIds, barangay, address, payment.value, ewalletNum);
            this.close();
            await Nav.updateCartBadge();
            showToast(result.message || `✅ Order #${result.order_id} placed!`, 'success');
            await renderCartItems();
            await renderOrders();
        } catch(e) {
            showToast(e.message, 'error');
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<i data-lucide="check-circle" class="w-5 h-5"></i> Place Order';
            lucide.createIcons();
        }
    },
};
