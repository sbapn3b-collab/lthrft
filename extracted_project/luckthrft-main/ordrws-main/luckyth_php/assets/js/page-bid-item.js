// assets/js/page-bid-item.js — Single auction detail with live bidding
document.addEventListener('pageReady', initBidItem);

let _auction       = null;
let _imgIndex      = 0;
let _timerInterval = null;
let _pollInterval  = null;
let _auctionId     = null;

async function initBidItem() {
    _auctionId = new URLSearchParams(location.search).get('id');
    if (!_auctionId) { location.href = '/bids.html'; return; }

    await Promise.all([loadAuction(), loadHistory()]);
    // Poll every 8 s — refreshes bid totals, countdown, and history.
    _pollInterval = setInterval(async () => {
        await Promise.all([loadAuction(), loadHistory()]);
    }, 8_000);
}

async function loadAuction() {
    try {
        const data = await API.getAuctions();
        const a    = (data.auctions || []).find(x => x.id === parseInt(_auctionId));
        if (!a) { location.href = '/bids.html'; return; }
        _auction = a;
        renderDetail(a);
    } catch(e) { console.warn('Could not load auction', e); }
}

async function loadHistory() {
    try {
        const data = await API.getAuctionBids(parseInt(_auctionId));
        renderHistory(data.bids || []);
    } catch(e) { console.warn('Could not load bid history', e); }
}

// ── RENDER ────────────────────────────────────────────────────────────────────

function renderDetail(a) {
    document.title = `${a.name} | LuckyThrift`;
    document.getElementById('breadcrumb-name').textContent = a.name;
    document.getElementById('detail-category').textContent    = a.category;
    document.getElementById('detail-name').textContent        = a.name;
    document.getElementById('detail-description').textContent = a.description || 'No description provided.';

    // ── Images ──
    const imgs = a.images || [];
    _imgIndex  = Math.max(0, Math.min(_imgIndex, imgs.length - 1));
    const mainImg  = document.getElementById('main-img');
    mainImg.src    = imgs[_imgIndex] || '';
    mainImg.alt    = a.name;

    document.getElementById('img-prev').classList.toggle('hidden', imgs.length < 2);
    document.getElementById('img-next').classList.toggle('hidden', imgs.length < 2);
    document.getElementById('img-counter').classList.toggle('hidden', imgs.length < 2);
    if (imgs.length > 1)
        document.getElementById('img-counter').textContent = `${_imgIndex + 1} / ${imgs.length}`;

    document.getElementById('thumbnails').innerHTML = imgs.length > 1 ? imgs.map((src, i) =>
        `<button onclick="setImg(${i})" class="shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-colors ${i === _imgIndex ? 'border-orange' : 'border-slate-100 hover:border-slate-300'}">
            <img src="${src}" alt="" class="w-full h-full object-cover">
         </button>`
    ).join('') : '';

    // ── Status badge ──
    const badge = document.getElementById('status-badge');
    if (a.status === 'live')
        badge.innerHTML = `<div class="flex items-center gap-1.5 bg-green-500 text-white text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-wider shadow-md"><span class="w-1.5 h-1.5 rounded-full bg-white animate-pulse inline-block"></span> Live</div>`;
    else if (a.status === 'scheduled')
        badge.innerHTML = `<div class="bg-orange text-white text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-wider shadow-md">Coming Soon</div>`;
    else
        badge.innerHTML = `<div class="bg-slate-600 text-white text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-wider">Ended</div>`;

    // ── Bid panel header ──
    const bidLabel   = document.getElementById('bid-label');
    const bidDisplay = document.getElementById('current-bid-display');
    const incDisplay = document.getElementById('increment-display');

    if (a.current_bid !== null) {
        bidLabel.textContent   = 'Current Bid';
        bidDisplay.textContent = `₱${Number(a.current_bid).toLocaleString()}`;
    } else {
        bidLabel.textContent   = 'Starting Price';
        bidDisplay.textContent = `₱${Number(a.starting_price).toLocaleString()}`;
    }
    incDisplay.textContent = `+₱${Number(a.bid_increment).toLocaleString()} min. increment`;

    // ── Bid action area ──
    renderActionArea(a);

    // ── Countdown ──
    if (_timerInterval) clearInterval(_timerInterval);
    const timerBlock = document.getElementById('timer-block');
    if (a.status === 'live' && a.end_time) {
        timerBlock.classList.remove('hidden');
        document.getElementById('timer-label').textContent = 'Auction Ends In';
        startTimer(new Date(a.end_time.replace(' ', 'T')));
    } else if (a.status === 'scheduled' && a.start_time) {
        timerBlock.classList.remove('hidden');
        document.getElementById('timer-label').textContent = 'Bidding Opens In';
        startTimer(new Date(a.start_time.replace(' ', 'T')));
    } else {
        timerBlock.classList.add('hidden');
    }

    const loader = document.getElementById('global-loader');
    if (loader) loader.style.display = 'none';
    lucide.createIcons();
}

function renderActionArea(a) {
    const area = document.getElementById('bid-action-area');
    const user = typeof Nav !== 'undefined' ? Nav.user : null;

    if (a.status === 'live') {
        const minBid = Math.ceil(((a.current_bid ?? a.starting_price) + a.bid_increment) * 100) / 100;

        if (!user) {
            // Not signed in
            area.innerHTML = `
                <div class="mt-2 space-y-3">
                    <div class="p-4 bg-slate-50 rounded-xl text-center border-2 border-dashed border-slate-200">
                        <p class="text-sm font-bold text-slate-500 mb-1">Sign in to place a bid</p>
                        <p class="text-xs text-slate-400">Min next bid: <strong class="text-navy">₱${Number(minBid).toLocaleString()}</strong></p>
                    </div>
                    <button onclick="Nav.openAuth()"
                        class="w-full bg-orange hover:bg-orange/90 text-white font-black py-3.5 rounded-2xl transition-colors shadow-sm text-sm uppercase tracking-widest">
                        Sign In to Bid
                    </button>
                </div>`;
        } else {
            // Signed in — show bid form
            area.innerHTML = `
                <div class="mt-2 space-y-3">
                    <div class="flex items-center gap-3">
                        <div class="relative flex-1">
                            <span class="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-400 text-lg">₱</span>
                            <input id="bid-input" type="number" min="${minBid}" step="${a.bid_increment}"
                                value="${minBid}"
                                class="w-full pl-9 pr-4 py-3.5 border-2 border-slate-200 rounded-2xl font-black text-navy text-lg focus:border-orange focus:outline-none transition-colors">
                        </div>
                        <button onclick="submitBid()"
                            class="bg-orange hover:bg-orange/90 text-white font-black px-6 py-3.5 rounded-2xl transition-colors shadow-sm uppercase tracking-wider text-sm whitespace-nowrap">
                            Place Bid
                        </button>
                    </div>
                    <p class="text-xs text-slate-400 font-medium text-center">
                        Min bid: <strong class="text-navy">₱${Number(minBid).toLocaleString()}</strong>
                        · Increment: <strong class="text-navy">₱${Number(a.bid_increment).toLocaleString()}</strong>
                    </p>
                </div>`;
        }
    } else if (a.status === 'scheduled') {
        area.innerHTML = `
            <div class="mt-2 p-4 bg-slate-50 rounded-xl text-center">
                <p class="text-sm font-bold text-slate-400">Bidding hasn't opened yet.</p>
                <p class="text-xs text-slate-300 mt-1">Come back when it goes live!</p>
            </div>`;
    } else {
        const user       = typeof Nav !== 'undefined' ? Nav.user : null;
        const isWinner   = user && a.winner_id && user.id === a.winner_id;
        const hasBids    = !!a.current_bid;
        const finalBid   = hasBids
            ? `<p class="text-xs text-slate-400 mt-1">Final bid: <strong class="text-navy">₱${Number(a.current_bid).toLocaleString()}</strong></p>`
            : `<p class="text-xs text-slate-300 mt-1">No bids were placed.</p>`;

        if (isWinner) {
            area.innerHTML = `
                <div class="mt-2 space-y-3">
                    <div class="p-4 bg-green-50 rounded-2xl border-2 border-green-200 text-center">
                        <p class="font-black text-green-700 text-base mb-1">🎉 You won this auction!</p>
                        <p class="text-xs text-green-600 font-medium">Winning bid: <strong>₱${Number(a.current_bid).toLocaleString()}</strong></p>
                        <p class="text-xs text-green-600 font-medium mt-0.5">Your order has been created — check your orders for next steps.</p>
                    </div>
                    <a href="/profile.html"
                        class="flex items-center justify-center gap-2 w-full bg-navy hover:bg-slate-800 text-white font-black py-3.5 rounded-2xl transition-colors text-sm uppercase tracking-widest">
                        View My Orders
                    </a>
                </div>`;
        } else {
            area.innerHTML = `
                <div class="mt-2 p-4 bg-slate-50 rounded-xl text-center">
                    <p class="text-sm font-bold text-slate-500">This auction has ended.</p>
                    ${finalBid}
                    ${hasBids && a.winner_username
                        ? `<p class="text-xs text-slate-400 mt-1">Won by <strong class="text-navy">${a.winner_username}</strong></p>`
                        : ''}
                </div>`;
        }
    }
}

function renderHistory(bids) {
    const el = document.getElementById('bid-history');
    if (!bids.length) {
        el.innerHTML = `<p class="text-slate-300 font-bold text-center py-4">No bids yet — be the first!</p>`;
        return;
    }
    el.innerHTML = bids.map((b, i) => {
        const when = new Date(b.created_at.replace(' ', 'T')).toLocaleString([], {
            month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
        });
        const isTop = i === 0;
        return `
        <div class="flex items-center justify-between py-2.5 px-3 rounded-xl ${isTop ? 'bg-green-50 border border-green-100' : 'hover:bg-slate-50'}">
            <div class="flex items-center gap-2">
                ${isTop ? '<span class="w-2 h-2 rounded-full bg-green-500 shrink-0"></span>' : '<span class="w-2 h-2 rounded-full bg-slate-200 shrink-0"></span>'}
                <span class="font-bold text-navy text-sm">${b.username}</span>
                <span class="text-slate-400 text-xs">${when}</span>
            </div>
            <span class="font-black text-sm ${isTop ? 'text-green-600' : 'text-slate-600'}">₱${Number(b.amount).toLocaleString()}</span>
        </div>`;
    }).join('');
}

// ── BID SUBMISSION ─────────────────────────────────────────────────────────────

async function submitBid() {
    const input  = document.getElementById('bid-input');
    if (!input) return;
    const amount = parseFloat(input.value);
    const a      = _auction;
    if (!a) return;

    const minBid = Math.ceil(((a.current_bid ?? a.starting_price) + a.bid_increment) * 100) / 100;
    if (isNaN(amount) || amount < minBid) {
        showToast(`Minimum bid is ₱${Number(minBid).toLocaleString()}`, 'error');
        return;
    }

    if (!confirm(`Confirm your bid of ₱${Number(amount).toLocaleString()} on "${a.name}"? Bids cannot be retracted.`)) return;

    const btn = document.querySelector('#bid-action-area button:last-child');
    if (btn) { btn.disabled = true; btn.textContent = 'Placing…'; }

    try {
        const res = await API.placeBid(a.id, amount);
        showToast(res.message, 'success');
        // Immediately refresh both auction state and history.
        await Promise.all([loadAuction(), loadHistory()]);
    } catch(e) {
        showToast(e.message, 'error');
        if (btn) { btn.disabled = false; btn.textContent = 'Place Bid'; }
    }
}

// ── TIMER ─────────────────────────────────────────────────────────────────────

function startTimer(target) {
    const tick = () => {
        const diff = target - Date.now();
        if (diff <= 0) {
            ['t-days','t-hours','t-mins','t-secs'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.textContent = '00';
            });
            clearInterval(_timerInterval);
            return;
        }
        const d = Math.floor(diff / 86400000);
        const h = Math.floor((diff % 86400000) / 3600000);
        const m = Math.floor((diff % 3600000)  / 60000);
        const s = Math.floor((diff % 60000)    / 1000);
        document.getElementById('t-days').textContent  = String(d).padStart(2,'0');
        document.getElementById('t-hours').textContent = String(h).padStart(2,'0');
        document.getElementById('t-mins').textContent  = String(m).padStart(2,'0');
        document.getElementById('t-secs').textContent  = String(s).padStart(2,'0');
    };
    tick();
    _timerInterval = setInterval(tick, 1000);
}

// ── IMAGE GALLERY ─────────────────────────────────────────────────────────────

function setImg(i) {
    const imgs = _auction?.images || [];
    _imgIndex  = Math.max(0, Math.min(i, imgs.length - 1));
    document.getElementById('main-img').src = imgs[_imgIndex] || '';
    if (imgs.length > 1)
        document.getElementById('img-counter').textContent = `${_imgIndex + 1} / ${imgs.length}`;
    document.querySelectorAll('#thumbnails button').forEach((b, idx) => {
        b.classList.toggle('border-orange', idx === _imgIndex);
        b.classList.toggle('border-slate-100', idx !== _imgIndex);
    });
}

function shiftImg(dir) {
    const len = (_auction?.images || []).length;
    setImg((_imgIndex + dir + len) % len);
}
