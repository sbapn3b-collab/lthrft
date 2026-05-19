const API_BASE = '/api/index.php?endpoint=';

async function apiFetch(endpoint, method = 'GET', body = null) {
    const opts = {
        method,
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
    };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(API_BASE + endpoint, opts);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
}

const API = {
    // ── AUTH ──────────────────────────────────────────────────────────────────
    register:     (username, password, email = '') =>
        apiFetch('auth/register', 'POST', { username, password, email }),
    login:        (username, email, password) =>
        apiFetch('auth/login', 'POST', { username, email, password }),
    logout:       () => apiFetch('auth/logout', 'POST'),
    me:           () => apiFetch('auth/me'),
    resetRequest: (email) =>
        apiFetch('auth/reset-request', 'POST', { email }),
    getProfile:    () => apiFetch('auth/profile'),
    updateProfile: (data) => apiFetch('auth/profile', 'PUT', data),
    changePassword: (current_password, new_password) =>
        apiFetch('auth/password', 'PUT', { current_password, new_password }),
    deleteAccount:  (password) => apiFetch('auth/account', 'DELETE', { password }),

    // ── PRODUCTS ──────────────────────────────────────────────────────────────
    getProducts:   () => apiFetch('products'),
    updateStock:   (id, stock) => apiFetch(`products/${id}/stock`, 'PUT', { stock }),
    createProduct: (data) => apiFetch('products', 'POST', data),
    updateProduct: (id, data) => apiFetch(`products/${id}`, 'PUT', data),

    // ── CART ──────────────────────────────────────────────────────────────────
    getCart:        () => apiFetch('cart'),
    addToCart:      (product_id) => apiFetch('cart', 'POST', { product_id }),
    removeFromCart: (cart_id) => apiFetch(`cart/${cart_id}`, 'DELETE'),

    // ── ORDERS ────────────────────────────────────────────────────────────────
    getOrders: () => apiFetch('orders'),
    placeOrder: (cartIds, barangay, address, payment, ewalletNum = '') =>
        apiFetch('orders', 'POST', {
            cart_ids: cartIds, barangay, address, payment, ewallet_num: ewalletNum
        }),
    directOrder:  (product_id, barangay, address, payment, ewalletNum = '') =>
        apiFetch('orders/direct', 'POST', { product_id, barangay, address, payment, ewallet_num: ewalletNum }),
    cancelOrder:  (orderId) => apiFetch(`orders/${orderId}/cancel`,  'PUT'),
    shipOrder:    (orderId) => apiFetch(`orders/${orderId}/ship`,    'PUT'),
    deliverOrder: (orderId) => apiFetch(`orders/${orderId}/deliver`, 'PUT'),

    // ── ADMIN ─────────────────────────────────────────────────────────────────
    adminGetOrders: () => apiFetch('admin/orders'),

    // ── AUCTIONS ──────────────────────────────────────────────────────────────
    getAuctions:          () => apiFetch('auctions'),
    adminGetAuctions:     () => apiFetch('admin/auctions'),
    adminCreateAuction:   (data) => apiFetch('admin/auctions', 'POST', data),
    adminUpdateAuction:   (id, data) => apiFetch(`admin/auctions/${id}`, 'PUT', data),
    adminDeleteAuction:   (id) => apiFetch(`admin/auctions/${id}`, 'DELETE'),
    adminPublishAuction:  (id) => apiFetch(`admin/auctions/${id}/publish`,   'PUT'),
    adminUnpublishAuction:(id) => apiFetch(`admin/auctions/${id}/unpublish`, 'PUT'),
    getAuctionBids:       (id) => apiFetch(`auctions/${id}/bids`),
    placeBid:             (id, amount) => apiFetch(`auctions/${id}/bids`, 'POST', { amount }),

    // ── CHAT ──────────────────────────────────────────────────────────────────
    getChatMessages:  () => apiFetch('chat/messages'),
    getChatUnread:    () => apiFetch('chat/unread'),
    sendChatMessage:  (content) => apiFetch('chat/messages', 'POST', { content }),
    adminGetChats:    () => apiFetch('admin/chat'),
    adminGetUserChat: (userId) => apiFetch(`admin/chat/${userId}`),
    adminReplyChat:   (userId, content) => apiFetch(`admin/chat/${userId}`, 'POST', { content }),

    // ── ANALYTICS ─────────────────────────────────────────────────────────────
    getDashboard:    () => apiFetch('analytics/dashboard'),
    getCustomers:    () => apiFetch('analytics/customers'),
};
