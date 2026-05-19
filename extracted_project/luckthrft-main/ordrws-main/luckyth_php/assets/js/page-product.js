// assets/js/page-product.js
// Reads data-product-id from <body> and loads that product.
// Each product-N.html sets <body data-product-id="N">

let _product = null;
let _imgIdx  = 0;

// Load the Order Now modal include as soon as the DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    await loadInclude('order-now-placeholder', '/includes/order-now-modal.html');
    lucide.createIcons();
    // Wire up payment option radio buttons
    document.querySelectorAll('.on-payment-option').forEach(opt => {
        const radio = opt.querySelector('input');
        const card  = opt.querySelector('.on-payment-card');
        radio?.addEventListener('change', function() {
            document.querySelectorAll('.on-payment-card').forEach(c => {
                c.classList.remove('border-navy','bg-navy/5'); c.classList.add('border-slate-100');
            });
            card.classList.add('border-navy','bg-navy/5'); card.classList.remove('border-slate-100');
            document.getElementById('on-ewallet-input').classList.toggle('hidden',
                radio.value !== 'GCash' && radio.value !== 'Maya');
        });
    });
});

document.addEventListener('pageReady', () => {
    const productId = parseInt(document.body.dataset.productId);
    if (productId) loadProduct(productId);
});

async function loadProduct(id) {
    try {
        const data = await API.getProducts();
        _product   = data.products.find(p => p.id === id);
        if (!_product) {
            document.getElementById('product-content').innerHTML =
                `<p class="text-red-400 font-bold text-center py-20">Product not found.</p>`;
            return;
        }
        renderProduct(_product);
    } catch(e) {
        document.getElementById('product-content').innerHTML =
            `<p class="text-red-400 font-bold text-center py-20">Could not load product.</p>`;
    }
}

function renderProduct(p) {
    document.title = `${p.name} | LuckyThrift`;
    setImage(0);

    document.getElementById('prod-name').innerText  = p.name;
    document.getElementById('prod-price').innerText = `₱${p.price}`;
    document.getElementById('prod-desc').innerText  = p.description || 'Premium vintage piece from the LuckyThrift collection.';

    // Stock badge
    const badge = document.getElementById('prod-stock-badge');
    if (p.stock <= 0) {
        badge.innerText = 'Sold Out';
        badge.className = 'inline-block bg-navy text-white text-xs font-black px-4 py-2 rounded-full uppercase tracking-wider';
    } else if (p.stock === 1) {
        badge.innerText = 'Last One!';
        badge.className = 'inline-block bg-orange text-white text-xs font-black px-4 py-2 rounded-full uppercase tracking-wider';
    } else {
        badge.innerText = `In Stock (${p.stock})`;
        badge.className = 'inline-block bg-green-500 text-white text-xs font-black px-4 py-2 rounded-full uppercase tracking-wider';
    }

    // Add to Cart button
    const btn = document.getElementById('add-to-cart-btn');
    // Order Now button
    const onBtn = document.getElementById('order-now-btn');

    if (p.stock <= 0) {
        btn.disabled  = true;
        btn.className = 'w-full bg-slate-200 text-slate-400 py-4 rounded-2xl font-black text-lg flex items-center justify-center gap-2 cursor-not-allowed';
        btn.innerHTML = `<i data-lucide="lock" class="w-5 h-5"></i> Out of Stock`;
        if (onBtn) {
            onBtn.disabled  = true;
            onBtn.className = 'mt-6 w-full bg-slate-200 text-slate-400 py-3.5 rounded-2xl font-black text-base flex items-center justify-center gap-2 cursor-not-allowed';
            onBtn.innerHTML = `<i data-lucide="lock" class="w-5 h-5"></i> Out of Stock`;
        }
    } else {
        btn.disabled  = false;
        btn.className = 'w-full btn-primary py-4 rounded-2xl font-black text-lg flex items-center justify-center gap-2';
        btn.innerHTML = `<i data-lucide="shopping-cart" class="w-5 h-5"></i> Add to Cart`;
        btn.onclick   = () => addToCart(p.id);
        if (onBtn) {
            onBtn.disabled  = false;
            onBtn.className = 'mt-6 w-full bg-navy text-white hover:bg-orange transition-colors py-3.5 rounded-2xl font-black text-base flex items-center justify-center gap-2';
            onBtn.innerHTML = `<i data-lucide="zap" class="w-5 h-5"></i> Order Now`;
            onBtn.onclick   = () => DirectOrder.open(p);
        }
    }

    // Thumbnails
    const thumbs = document.getElementById('prod-thumbs');
    if (p.images?.length > 1) {
        thumbs.innerHTML = p.images.map((img, i) => `
            <button onclick="setImage(${i})" id="thumb-${i}"
                class="w-16 h-16 rounded-xl overflow-hidden border-2 transition-all shrink-0 ${i === 0 ? 'border-orange' : 'border-slate-200'} hover:border-orange">
                <img src="${img}" class="w-full h-full object-cover">
            </button>`).join('');
    } else {
        thumbs.classList.add('hidden');
    }

    const showArrows = p.images?.length > 1;
    document.getElementById('prev-btn').classList.toggle('hidden', !showArrows);
    document.getElementById('next-btn').classList.toggle('hidden', !showArrows);

    lucide.createIcons();
}

function setImage(idx) {
    if (!_product?.images?.length) return;
    _imgIdx = idx;
    document.getElementById('prod-main-img').src = _product.images[idx];
    document.querySelectorAll('[id^="thumb-"]').forEach((el, i) => {
        el.classList.toggle('border-orange',    i === idx);
        el.classList.toggle('border-slate-200', i !== idx);
    });
}

function prevImage() {
    if (!_product) return;
    setImage((_imgIdx - 1 + _product.images.length) % _product.images.length);
}
function nextImage() {
    if (!_product) return;
    setImage((_imgIdx + 1) % _product.images.length);
}

async function addToCart(productId) {
    if (!Nav.user) { showToast('Please Sign In to add items to cart.'); Nav.openAuth(); return; }
    const btn = document.getElementById('add-to-cart-btn');
    btn.disabled = true;
    btn.innerHTML = `<i data-lucide="loader" class="w-5 h-5 animate-spin"></i> Adding…`;
    lucide.createIcons();
    try {
        await API.addToCart(productId);
        await Nav.updateCartBadge();
        showToast(`Added to cart: ${_product.name}`, 'success');
        btn.innerHTML = `<i data-lucide="check" class="w-5 h-5"></i> Added!`;
        lucide.createIcons();
        setTimeout(() => {
            btn.disabled  = false;
            btn.innerHTML = `<i data-lucide="shopping-cart" class="w-5 h-5"></i> Add to Cart`;
            lucide.createIcons();
        }, 1500);
    } catch(e) {
        showToast(e.message, 'error');
        btn.disabled  = false;
        btn.innerHTML = `<i data-lucide="shopping-cart" class="w-5 h-5"></i> Add to Cart`;
        lucide.createIcons();
    }
}

// ── DIRECT ORDER (Order Now) ──────────────────────────────────────────────────
const DirectOrder = {
    _productId: null,

    open: function(product) {
        if (!Nav.user) { showToast('Please Sign In to place an order.'); Nav.openAuth(); return; }
        this._productId = product.id;

        document.getElementById('on-item-name').innerText  = product.name;
        document.getElementById('on-item-price').innerText = `₱${product.price}`;

        // Reset fields
        document.getElementById('on-province').value    = '';
        document.getElementById('on-address').value     = '';
        document.getElementById('on-ewallet-num').value = '';
        document.getElementById('on-ewallet-input').classList.add('hidden');
        document.querySelectorAll('.on-payment-card').forEach(c => {
            c.classList.remove('border-navy','bg-navy/5'); c.classList.add('border-slate-100');
        });
        document.querySelectorAll('input[name="on-payment"]').forEach(r => r.checked = false);

        const modal = document.getElementById('order-now-modal');
        modal.classList.remove('hidden'); modal.classList.add('flex');
        lucide.createIcons();
    },

    close: function() {
        const modal = document.getElementById('order-now-modal');
        modal.classList.add('hidden'); modal.classList.remove('flex');
        this._productId = null;
    },

    placeOrder: async function() {
        const address    = document.getElementById('on-address-full').value.trim();
        const payment    = document.querySelector('input[name="on-payment"]:checked');
        const ewalletNum = document.getElementById('on-ewallet-num').value.trim();

        if (!this._productId)    { showToast('Product error. Please try again.', 'error'); return; }
        if (!address || address.length < 10) { showToast('Please enter your full delivery address.'); return; }
        if (!payment)            { showToast('Please select a payment method.'); return; }
        // Province no longer used.
        const province = '';
        if ((payment.value === 'GCash' || payment.value === 'Maya') && !ewalletNum) {
            showToast(`Please enter your ${payment.value} number.`); return;
        }

        if (!confirm(`Place this order using ${payment.value}?`)) return;

        const btn = document.getElementById('on-place-btn');
        btn.disabled = true;
        btn.innerHTML = `<i data-lucide="loader" class="w-5 h-5 animate-spin"></i> Placing Order…`;
        lucide.createIcons();

        try {
            const result = await API.directOrder(this._productId, province, address, payment.value, ewalletNum);
            this.close();
            await Nav.updateCartBadge();
            showToast(result.message || `Order #${result.order_id} placed!`, 'success');
            // Update stock badge on the page
            if (_product) {
                _product.stock = Math.max(0, _product.stock - 1);
                renderProduct(_product);
            }
        } catch(e) {
            showToast(e.message, 'error');
        } finally {
            btn.disabled = false;
            btn.innerHTML = `<i data-lucide="zap" class="w-5 h-5"></i> Place Order Now`;
            lucide.createIcons();
        }
    },
};
