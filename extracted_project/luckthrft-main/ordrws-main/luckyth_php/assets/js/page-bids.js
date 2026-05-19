// assets/js/page-bids.js — Public auctions list page
document.addEventListener('pageReady', initBids);

let _auctionPollTimer = null;

async function initBids() {
    await loadBids();
    // Refresh the list every 30 seconds so countdowns and new auctions appear.
    _auctionPollTimer = setInterval(loadBids, 30_000);
}

async function loadBids() {
    try {
        const data = await API.getAuctions();
        renderBids(data.auctions || []);
    } catch(e) {
        console.warn('Could not load auctions', e);
    }
}

function renderBids(auctions) {
    const live      = auctions.filter(a => a.status === 'live');
    const scheduled = auctions.filter(a => a.status === 'scheduled');
    const ended     = auctions.filter(a => a.status === 'ended').slice(0, 6);
    const any       = live.length + scheduled.length + ended.length;

    document.getElementById('empty-state').classList.toggle('hidden', any > 0);

    renderSection('live',      live,      '#section-live',      '#grid-live');
    renderSection('scheduled', scheduled, '#section-scheduled', '#grid-scheduled');
    renderSection('ended',     ended,     '#section-ended',     '#grid-ended');

    if (live.length)
        document.getElementById('live-count').textContent =
            `${live.length} auction${live.length > 1 ? 's' : ''} happening now`;
    if (scheduled.length)
        document.getElementById('scheduled-count').textContent =
            `${scheduled.length} coming soon`;

    lucide.createIcons();
    startCountdownTickers();

    // Hide global loader
    const loader = document.getElementById('global-loader');
    if (loader) loader.style.display = 'none';
}

function renderSection(type, auctions, sectionSel, gridSel) {
    const section = document.querySelector(sectionSel);
    const grid    = document.querySelector(gridSel);
    if (!section || !grid) return;
    section.classList.toggle('hidden', auctions.length === 0);
    grid.innerHTML = auctions.map(a => auctionCard(a, type)).join('');
}

function auctionCard(a, type) {
    const img = a.images?.[0] || '';

    let badge = '';
    if (type === 'live')
        badge = `<div class="absolute top-4 left-4 flex items-center gap-1.5 bg-green-500 text-white text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-wider shadow-md">
                    <span class="w-1.5 h-1.5 rounded-full bg-white animate-pulse inline-block"></span> Live
                 </div>`;
    else if (type === 'scheduled')
        badge = `<div class="absolute top-4 left-4 bg-orange text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider shadow-md">Coming Soon</div>`;
    else
        badge = `<div class="absolute top-4 left-4 bg-slate-600 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider">Ended</div>`;

    const bidLine = a.current_bid !== null
        ? `<span class="text-xl font-black text-navy">₱${Number(a.current_bid).toLocaleString()}</span><span class="text-xs text-slate-400 font-bold ml-1">current bid</span>`
        : `<span class="text-xl font-black text-navy">₱${Number(a.starting_price).toLocaleString()}</span><span class="text-xs text-slate-400 font-bold ml-1">starting</span>`;

    let countdownHtml = '';
    if (type === 'live' && a.end_time) {
        countdownHtml = `<div class="mt-2 text-xs font-black text-slate-400 uppercase tracking-widest" data-ends="${a.end_time}" data-countdown="live">Ends in <span class="text-navy countdown-val">…</span></div>`;
    } else if (type === 'scheduled' && a.start_time) {
        countdownHtml = `<div class="mt-2 text-xs font-black text-slate-400 uppercase tracking-widest" data-starts="${a.start_time}" data-countdown="scheduled">Starts in <span class="text-navy countdown-val">…</span></div>`;
    }

    return `
    <a href="/bid-item.html?id=${a.id}"
       class="group block bg-white rounded-[2rem] overflow-hidden border-2 border-slate-100 hover:border-orange transition-all duration-300 shadow-sm hover:shadow-md">
        <div class="aspect-[4/5] relative overflow-hidden bg-slate-100">
            <img src="${img}" alt="${a.name}" loading="lazy"
                 class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500">
            ${badge}
            ${a.images?.length > 1 ? `<div class="absolute bottom-3 right-3 bg-black/40 text-white text-[10px] font-black px-2 py-1 rounded-full">+${a.images.length - 1}</div>` : ''}
        </div>
        <div class="p-6">
            <p class="text-xs font-black uppercase tracking-widest text-orange mb-1">${a.category}</p>
            <h3 class="font-black text-navy text-lg leading-tight mb-4">${a.name}</h3>
            <div class="flex items-baseline gap-1">
                ${bidLine}
            </div>
            ${countdownHtml}
        </div>
    </a>`;
}

function startCountdownTickers() {
    const els = document.querySelectorAll('[data-countdown]');
    els.forEach(el => {
        const type      = el.dataset.countdown;
        const target    = new Date((type === 'live' ? el.dataset.ends : el.dataset.starts).replace(' ', 'T'));
        const span      = el.querySelector('.countdown-val');
        if (!span) return;

        const tick = () => {
            const diff = target - Date.now();
            if (diff <= 0) {
                span.textContent = type === 'live' ? 'Ended' : 'Now';
                return;
            }
            const d = Math.floor(diff / 86400000);
            const h = Math.floor((diff % 86400000) / 3600000);
            const m = Math.floor((diff % 3600000) / 60000);
            const s = Math.floor((diff % 60000) / 1000);
            if (d > 0)      span.textContent = `${d}d ${h}h ${m}m`;
            else if (h > 0) span.textContent = `${h}h ${m}m ${s}s`;
            else            span.textContent = `${m}m ${s}s`;
        };
        tick();
        const id = setInterval(tick, 1000);
        el._tickerId = id;
    });
}
