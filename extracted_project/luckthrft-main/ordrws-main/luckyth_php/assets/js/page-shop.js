// assets/js/page-shop.js — Storefront / Catalog page
let _allProducts = [];

document.addEventListener('pageReady', renderShop);

async function renderShop() {
    try {
        const data   = await API.getProducts();
        _allProducts = data.products;
        renderGrid(_allProducts);
    } catch(e) {
        document.getElementById('storefront-grid').innerHTML =
            `<p class="col-span-full text-center text-red-400 font-bold py-10">Could not load products. Is the PHP server running?</p>`;
    }
}

function renderGrid(products) {
    const grid = document.getElementById('storefront-grid');
    if (!grid) return;
    if (products.length === 0) {
        grid.innerHTML = `<div class="col-span-full text-center py-10 text-slate-400 font-bold">No items match your search.</div>`;
        return;
    }
    grid.innerHTML = products.map(productCard).join('');
    lucide.createIcons();
}

function productCard(p) {
    const img = p.images?.[0] || '';
    return `
    <a href="/products/product-${p.id}.html"
       class="bg-white rounded-[2rem] overflow-hidden border-2 border-slate-100 hover:border-orange transition-all duration-300 group block">
        <div class="aspect-[4/5] relative overflow-hidden bg-slate-100">
            <img src="${img}" alt="${p.name}" loading="lazy" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500">
            ${p.stock === 0 ? '<div class="absolute inset-0 bg-navy/70 backdrop-blur-[2px] flex items-center justify-center text-white font-black uppercase tracking-widest text-sm">Sold Out</div>' : ''}
            ${p.stock === 1 ? '<div class="absolute top-4 left-4 bg-orange text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider shadow-md">Last One!</div>' : ''}
            ${p.images?.length > 1 ? `<div class="absolute bottom-3 right-3 bg-black/40 text-white text-[10px] font-black px-2 py-1 rounded-full">+${p.images.length - 1} photos</div>` : ''}
        </div>
        <div class="p-6">
            <h3 class="font-bold text-navy mb-3 h-12 overflow-hidden leading-tight">${p.name}</h3>
            <div class="flex items-center justify-between">
                <span class="text-xl font-black text-navy">₱${p.price}</span>
                <span class="bg-slate-100 text-navy px-3 py-2 rounded-lg text-xs font-bold group-hover:bg-orange group-hover:text-white transition-colors">View</span>
            </div>
        </div>
    </a>`;
}

function applyFilters() {
    const kw  = (document.getElementById('search-input')?.value || '').toLowerCase();
    const cat = document.getElementById('category-select')?.value || '';
    renderGrid(_allProducts.filter(p => {
        const matchesName = p.name.toLowerCase().includes(kw);
        const matchesCat  = !cat || (p.category || 'Other') === cat;
        return matchesName && matchesCat;
    }));
}

function handleSearch()         { applyFilters(); }
function handleCategoryChange() { applyFilters(); }
