// assets/js/page-home.js — Home page (New Releases — infinite loop slider)
document.addEventListener('pageReady', renderHome);

let _featured = [];

async function renderHome() {
    const slider = document.getElementById('home-slider');
    if (!slider) return;
    try {
        const data = await API.getProducts();
        // Only show "real" products (skip empty placeholders the admin hasn't filled in yet),
        // then take the most recent 5 as the New Releases.
        const real = data.products.filter(p => (p.name || '').trim() !== '');
        _featured  = real.slice(-5).reverse();

        if (_featured.length === 0) {
            slider.innerHTML = `<p class="w-full text-center text-slate-400 font-bold py-10">No new releases yet.</p>`;
            return;
        }

        // Render THREE copies of the list back-to-back so we can teleport silently
        // between them, giving the illusion of an infinite loop in either direction.
        const trio = [..._featured, ..._featured, ..._featured];
        slider.innerHTML = trio.map(productCard).join('');
        lucide.createIcons();
        wireSlider();
    } catch(e) {
        console.warn('Could not load home products', e);
        slider.innerHTML = `<p class="w-full text-center text-red-400 font-bold py-10">Could not load products.</p>`;
    }
}

function productCard(p) {
    const img = fixImgUrl(p.images?.[0] || '');
    return `
    <a href="/products/product.html?id=${p.id}"
       class="snap-start shrink-0 w-[80%] sm:w-[45%] lg:w-[23%] bg-white rounded-[2rem] overflow-hidden border-2 border-slate-100 hover:border-orange transition-all duration-300 group block">
        <div class="aspect-[4/5] relative overflow-hidden bg-slate-100">
            <img src="${img}" alt="${p.name}" loading="lazy" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500">
            ${p.stock === 0 ? '<div class="absolute inset-0 bg-navy/70 backdrop-blur-[2px] flex items-center justify-center text-white font-black uppercase tracking-widest text-sm">Sold Out</div>' : ''}
            ${p.stock === 1 ? '<div class="absolute top-4 left-4 bg-orange text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider shadow-md">Last One!</div>' : ''}
            ${p.images?.length > 1 ? `<div class="absolute bottom-3 right-3 bg-black/40 text-white text-[10px] font-black px-2 py-1 rounded-full">+${p.images.length - 1} photos</div>` : ''}
        </div>
        <div class="p-6">
            <h3 class="font-bold text-navy mb-3 leading-tight">${p.name}</h3>
            <div class="flex items-center justify-between">
                <span class="text-xl font-black text-navy">₱${p.price}</span>
                <span class="bg-slate-100 text-navy px-3 py-2 rounded-lg text-xs font-bold group-hover:bg-orange group-hover:text-white transition-colors">View</span>
            </div>
        </div>
    </a>`;
}

function wireSlider() {
    const slider = document.getElementById('home-slider');
    const prev   = document.getElementById('slider-prev');
    const next   = document.getElementById('slider-next');
    if (!slider) return;

    // Width of ONE copy of the list — we teleport by this distance to loop.
    const copyWidth = () => slider.scrollWidth / 3;

    // Distance to slide on each arrow press (one card + the flex gap of 24px).
    const step = () => {
        const card = slider.querySelector('a, div.snap-start');
        if (!card) return slider.clientWidth * 0.9;
        return card.getBoundingClientRect().width + 24;
    };

    // Start in the MIDDLE copy so the user can scroll left or right freely.
    const recenter = (smooth = false) => {
        slider.scrollTo({
            left: copyWidth(),
            behavior: smooth ? 'smooth' : 'instant',
        });
    };
    // Two RAFs to make sure layout has settled before measuring.
    requestAnimationFrame(() => requestAnimationFrame(() => recenter(false)));

    if (prev) {
        prev.disabled = false;
        prev.onclick = () => slider.scrollBy({ left: -step(), behavior: 'smooth' });
    }
    if (next) {
        next.disabled = false;
        next.onclick = () => slider.scrollBy({ left:  step(), behavior: 'smooth' });
    }

    // The teleport: when the user scrolls past one full copy in either direction,
    // jump silently to the equivalent position in the middle copy. Because the
    // content is identical, the user can't see the jump.
    let teleporting = false;
    const onScroll = () => {
        if (teleporting) return;
        const w  = copyWidth();
        const x  = slider.scrollLeft;
        if (x < w * 0.25) {
            teleporting = true;
            slider.scrollTo({ left: x + w, behavior: 'instant' });
            requestAnimationFrame(() => { teleporting = false; });
        } else if (x > w * 1.75) {
            teleporting = true;
            slider.scrollTo({ left: x - w, behavior: 'instant' });
            requestAnimationFrame(() => { teleporting = false; });
        }
    };
    slider.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', () => recenter(false));
}
