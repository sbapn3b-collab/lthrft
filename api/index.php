<?php

require_once __DIR__ . '/../config.php';

if (session_status() === PHP_SESSION_NONE) session_start();

$method = $_SERVER['REQUEST_METHOD'];
$path   = trim($_GET['endpoint'] ?? '', '/');

// Handle CORS preflight
if ($method === 'OPTIONS') { http_response_code(204); exit; }

// ── ROUTE DISPATCH ────────────────────────────────────────────────────────────
match(true) {
    // AUTH
    $path === 'auth/register'      && $method === 'POST' => authRegister(),
    $path === 'auth/login'         && $method === 'POST' => authLogin(),
    $path === 'auth/logout'        && $method === 'POST' => authLogout(),
    $path === 'auth/me'            && $method === 'GET'  => authMe(),
    $path === 'auth/reset-request' && $method === 'POST' => authResetRequest(),
    $path === 'auth/profile'       && $method === 'GET'  => authGetProfile(),
    $path === 'auth/profile'       && $method === 'PUT'  => authUpdateProfile(),
    $path === 'auth/password'      && $method === 'PUT'  => authChangePassword(),
    $path === 'auth/account'       && $method === 'DELETE' => authDeleteAccount(),

    // PRODUCTS
    $path === 'products'           && $method === 'GET'  => getProducts(),
    $path === 'products'           && $method === 'POST' => adminCreateProduct(),
    preg_match('#^products/(\d+)$#', $path, $m) && $method === 'PUT'    => adminUpdateProduct((int)$m[1]),
    preg_match('#^products/(\d+)$#', $path, $m) && $method === 'DELETE' => adminDeleteProduct((int)$m[1]),
    preg_match('#^products/(\d+)/stock$#', $path, $m) && $method === 'PUT' => adminUpdateStock((int)$m[1]),

    // CART
    $path === 'cart'               && $method === 'GET'  => getCart(),
    $path === 'cart'               && $method === 'POST' => addToCart(),
    preg_match('#^cart/(\d+)$#', $path, $m) && $method === 'DELETE' => removeFromCart((int)$m[1]),

    // ORDERS
    $path === 'orders'             && $method === 'GET'  => getOrders(),
    $path === 'orders'             && $method === 'POST' => placeOrder(),
    $path === 'orders/direct'      && $method === 'POST' => directPlaceOrder(),
    preg_match('#^orders/(\d+)/cancel$#',  $path, $m) && $method === 'PUT'  => cancelOrder((int)$m[1]),
    preg_match('#^orders/(\d+)/ship$#',    $path, $m) && $method === 'PUT'  => shipOrder((int)$m[1]),
    preg_match('#^orders/(\d+)/deliver$#', $path, $m) && $method === 'PUT'  => deliverOrder((int)$m[1]),
    preg_match('#^orders/(\d+)/status$#', $path, $m) && $method === 'PUT'  => updateOrderStatus((int)$m[1]),

    // ADMIN — ALL ORDERS
    $path === 'admin/orders'       && $method === 'GET'  => adminGetOrders(),

    // AUCTIONS
    $path === 'auctions'                                   && $method === 'GET'  => getAuctions(),
    $path === 'admin/auctions'                             && $method === 'GET'  => adminGetAuctions(),
    $path === 'admin/auctions'                             && $method === 'POST' => adminCreateAuction(),
    preg_match('#^admin/auctions/(\d+)$#', $path, $m)         && $method === 'PUT'    => adminUpdateAuction((int)$m[1]),
    preg_match('#^admin/auctions/(\d+)$#', $path, $m)         && $method === 'DELETE' => adminDeleteAuction((int)$m[1]),
    preg_match('#^admin/auctions/(\d+)/publish$#', $path, $m) && $method === 'PUT'    => adminPublishAuction((int)$m[1]),
    preg_match('#^admin/auctions/(\d+)/unpublish$#', $path, $m) && $method === 'PUT'  => adminUnpublishAuction((int)$m[1]),
    preg_match('#^auctions/(\d+)/bids$#', $path, $m) && $method === 'GET'  => getAuctionBids((int)$m[1]),
    preg_match('#^auctions/(\d+)/bids$#', $path, $m) && $method === 'POST' => placeBid((int)$m[1]),

    // CHAT
    $path === 'chat/messages'  && $method === 'GET'  => getChatMessages(),
    $path === 'chat/messages'  && $method === 'POST' => sendChatMessage(),
    $path === 'chat/unread'    && $method === 'GET'  => getChatUnread(),
    $path === 'admin/chat'     && $method === 'GET'  => adminGetChats(),
    preg_match('#^admin/chat/(\d+)$#', $path, $m) && $method === 'GET'  => adminGetUserChat((int)$m[1]),
    preg_match('#^admin/chat/(\d+)$#', $path, $m) && $method === 'POST' => adminReplyChat((int)$m[1]),

    // ANALYTICS
    $path === 'analytics/dashboard' && $method === 'GET' => analyticsDashboard(),
    $path === 'analytics/customers' && $method === 'GET' => analyticsCustomers(),

    default => jsonResponse(['error' => 'Not found'], 404),
};

// ============================================================
// AUTH HANDLERS
// ============================================================

function authRegister(): void {
    $body = getBody();
    $username = trim($body['username'] ?? '');
    $password = trim($body['password'] ?? '');
    $email    = trim($body['email']    ?? '');

    if (strlen($username) < 3) jsonResponse(['error' => 'Username must be at least 3 characters.'], 422);
    if (strlen($password) < 6) jsonResponse(['error' => 'Password must be at least 6 characters.'], 422);

    $db = getDB();
    $stmt = $db->prepare('SELECT id FROM users WHERE username = ?');
    $stmt->execute([$username]);
    if ($stmt->fetch()) jsonResponse(['error' => 'Username already taken.'], 409);

    $hash = password_hash($password, PASSWORD_BCRYPT);
    $ins  = $db->prepare("INSERT INTO users (username, password_hash, role, email) VALUES (?, ?, 'customer', ?) RETURNING id");
    $ins->execute([$username, $hash, $email ?: null]);
    $row = $ins->fetch();
    $userId = (int)$row['id'];

    $_SESSION['user'] = ['id' => $userId, 'username' => $username, 'role' => 'customer'];
    jsonResponse(['success' => true, 'user' => $_SESSION['user']]);
}

function authLogin(): void {
    $body = getBody();
    $username = trim($body['username'] ?? '');
    $email    = strtolower(trim($body['email'] ?? ''));
    $password = trim($body['password'] ?? '');

    $db   = getDB();
    $stmt = $db->prepare('SELECT * FROM users WHERE username = ?');
    $stmt->execute([$username]);
    $user = $stmt->fetch();

    // Admin shortcut: accepts the seeded "admin" with admin123 and any non-empty email.
    $isAdminShortcut = ($username === 'admin' && $password === 'admin123' && $email !== '');

    $passwordOk = $user && (password_verify($password, $user['password_hash']) || $isAdminShortcut);
    if (!$passwordOk) jsonResponse(['error' => 'Invalid username, email, or password.'], 401);

    if (!$isAdminShortcut) {
        $accountEmail = strtolower(trim((string)($user['email'] ?? '')));
        if ($accountEmail !== '' && $accountEmail !== $email) {
            jsonResponse(['error' => 'Invalid username, email, or password.'], 401);
        }
    }

    $_SESSION['user'] = ['id' => $user['id'], 'username' => $user['username'], 'role' => $user['role']];
    jsonResponse(['success' => true, 'user' => $_SESSION['user']]);
}

function authLogout(): void {
    session_destroy();
    jsonResponse(['success' => true]);
}

function authMe(): void {
    $user = sessionUser();
    if (!$user) { jsonResponse(['user' => null]); }
    $stmt = getDB()->prepare('SELECT avatar FROM users WHERE id = ?');
    $stmt->execute([$user['id']]);
    $row = $stmt->fetch();
    $user['avatar'] = $row['avatar'] ?? null;
    jsonResponse(['user' => $user]);
}

function authGetProfile(): void {
    $user = requireAuth();
    $stmt = getDB()->prepare('SELECT id, username, role, email, full_name, phone, address, avatar, created_at FROM users WHERE id = ?');
    $stmt->execute([$user['id']]);
    $row = $stmt->fetch();
    if (!$row) jsonResponse(['error' => 'User not found.'], 404);
    jsonResponse(['profile' => $row]);
}

function authUpdateProfile(): void {
    $user = requireAuth();
    $body = getBody();
    $fullName = trim($body['full_name'] ?? '');
    $email    = trim($body['email']     ?? '');
    $phone    = trim($body['phone']     ?? '');
    $address  = trim($body['address']   ?? '');
    $avatar   = $body['avatar'] ?? null;

    if ($avatar !== null && $avatar !== '' && strlen($avatar) > 2_000_000) {
        jsonResponse(['error' => 'Profile picture is too large (max ~1.5 MB).'], 413);
    }

    $db = getDB();
    if ($avatar === null) {
        $db->prepare('UPDATE users SET full_name=?, email=?, phone=?, address=? WHERE id=?')
           ->execute([$fullName ?: null, $email ?: null, $phone ?: null, $address ?: null, $user['id']]);
    } else {
        $db->prepare('UPDATE users SET full_name=?, email=?, phone=?, address=?, avatar=? WHERE id=?')
           ->execute([$fullName ?: null, $email ?: null, $phone ?: null, $address ?: null, $avatar ?: null, $user['id']]);
    }

    $stmt = $db->prepare('SELECT id, username, role, email, full_name, phone, address, avatar FROM users WHERE id = ?');
    $stmt->execute([$user['id']]);
    jsonResponse(['success' => true, 'profile' => $stmt->fetch(), 'message' => 'Profile updated.']);
}

function authChangePassword(): void {
    $user = requireAuth();
    $body = getBody();
    $current = $body['current_password'] ?? '';
    $next    = $body['new_password']     ?? '';

    if (strlen($next) < 6) jsonResponse(['error' => 'New password must be at least 6 characters.'], 422);

    $db   = getDB();
    $stmt = $db->prepare('SELECT password_hash FROM users WHERE id = ?');
    $stmt->execute([$user['id']]);
    $row  = $stmt->fetch();
    if (!$row || !password_verify($current, $row['password_hash'])) {
        jsonResponse(['error' => 'Current password is incorrect.'], 401);
    }

    $hash = password_hash($next, PASSWORD_BCRYPT);
    $db->prepare('UPDATE users SET password_hash=? WHERE id=?')->execute([$hash, $user['id']]);
    jsonResponse(['success' => true, 'message' => 'Password changed.']);
}

function authDeleteAccount(): void {
    $user = requireAuth();
    if (($user['role'] ?? '') === 'admin') {
        jsonResponse(['error' => 'Admin accounts cannot be deleted from here.'], 403);
    }
    $body = getBody();
    $password = $body['password'] ?? '';

    $db   = getDB();
    $stmt = $db->prepare('SELECT password_hash FROM users WHERE id = ?');
    $stmt->execute([$user['id']]);
    $row  = $stmt->fetch();
    if (!$row || !password_verify($password, $row['password_hash'])) {
        jsonResponse(['error' => 'Password is incorrect.'], 401);
    }

    $db->prepare('DELETE FROM users WHERE id = ?')->execute([$user['id']]);
    session_destroy();
    jsonResponse(['success' => true, 'message' => 'Account deleted.']);
}

function authResetRequest(): void {
    $body  = getBody();
    $email = trim($body['email'] ?? '');
    $db    = getDB();
    $stmt  = $db->prepare('SELECT id FROM users WHERE email = ?');
    $stmt->execute([$email]);
    $user  = $stmt->fetch();
    if ($user) {
        $token   = bin2hex(random_bytes(32));
        $expires = date('Y-m-d H:i:s', strtotime('+1 hour'));
        $db->prepare('UPDATE users SET reset_token=?, reset_expires=? WHERE id=?')
           ->execute([$token, $expires, $user['id']]);
    }
    jsonResponse(['success' => true, 'message' => 'If that email exists, a reset link was sent.']);
}

// ============================================================
// PRODUCT HANDLERS
// ============================================================

function getProducts(): void {
    $db   = getDB();
    $rows = $db->query('SELECT * FROM products ORDER BY id ASC')->fetchAll();
    foreach ($rows as &$r) {
        $r['images']   = json_decode($r['images'] ?? '[]', true);
        $r['price']    = (float)$r['price'];
        $r['stock']    = (int)$r['stock'];
        $r['category'] = $r['category'] ?? 'Other';
    }
    jsonResponse(['products' => $rows]);
}

function adminCreateProduct(): void {
    requireAdmin();
    $body = getBody();
    $db   = getDB();
    $stmt = $db->prepare('INSERT INTO products (name, price, stock, description, images, category) VALUES (?,?,?,?,?,?) RETURNING id');
    $stmt->execute([
        $body['name']        ?? '',
        $body['price']       ?? 0,
        $body['stock']       ?? 0,
        $body['description'] ?? '',
        json_encode($body['images'] ?? []),
        $body['category']    ?: 'Other',
    ]);
    $row = $stmt->fetch();
    jsonResponse(['success' => true, 'id' => (int)$row['id']]);
}

function adminUpdateProduct(int $id): void {
    requireAdmin();
    $body = getBody();
    $db   = getDB();
    $db->prepare('UPDATE products SET name=?, price=?, description=?, images=?, category=? WHERE id=?')
       ->execute([
           $body['name']        ?? '',
           $body['price']       ?? 0,
           $body['description'] ?? '',
           json_encode($body['images'] ?? []),
           $body['category']    ?: 'Other',
           $id,
       ]);
    jsonResponse(['success' => true]);
}

function adminDeleteProduct(int $id): void {
    requireAdmin();
    $db = getDB();
    // Nullify order_items references so history is preserved
    $db->prepare('UPDATE order_items SET product_id = NULL WHERE product_id = ?')->execute([$id]);
    $db->prepare('DELETE FROM cart WHERE product_id = ?')->execute([$id]);
    $db->prepare('DELETE FROM products WHERE id = ?')->execute([$id]);
    jsonResponse(['success' => true]);
}

function adminUpdateStock(int $id): void {
    requireAdmin();
    $body  = getBody();
    $stock = (int)($body['stock'] ?? 0);
    getDB()->prepare('UPDATE products SET stock=? WHERE id=?')->execute([$stock, $id]);
    jsonResponse(['success' => true]);
}

// ============================================================
// CART HANDLERS
// ============================================================

function getCart(): void {
    $user = requireAuth();
    $db   = getDB();
    $stmt = $db->prepare(
        'SELECT c.id AS cart_id, p.id AS product_id, p.name, p.price, p.images, p.stock
         FROM cart c JOIN products p ON p.id = c.product_id
         WHERE c.user_id = ? ORDER BY c.added_at DESC'
    );
    $stmt->execute([$user['id']]);
    $rows = $stmt->fetchAll();
    foreach ($rows as &$r) {
        $r['images'] = json_decode($r['images'] ?? '[]', true);
        $r['price']  = (float)$r['price'];
        $r['stock']  = (int)$r['stock'];
    }
    jsonResponse(['cart' => $rows]);
}

function addToCart(): void {
    $user       = requireAuth();
    $body       = getBody();
    $productId  = (int)($body['product_id'] ?? 0);
    $db         = getDB();

    $stmt = $db->prepare('SELECT stock FROM products WHERE id = ?');
    $stmt->execute([$productId]);
    $product = $stmt->fetch();
    if (!$product || $product['stock'] < 1) jsonResponse(['error' => 'Out of stock.'], 409);

    $stmt = $db->prepare('INSERT INTO cart (user_id, product_id) VALUES (?, ?) RETURNING id');
    $stmt->execute([$user['id'], $productId]);
    $row = $stmt->fetch();
    jsonResponse(['success' => true, 'cart_id' => (int)$row['id']]);
}

function removeFromCart(int $cartId): void {
    $user = requireAuth();
    getDB()->prepare('DELETE FROM cart WHERE id = ? AND user_id = ?')->execute([$cartId, $user['id']]);
    jsonResponse(['success' => true]);
}

// ============================================================
// ORDER HANDLERS
// ============================================================

function getOrders(): void {
    $user = requireAuth();
    $db   = getDB();
    $stmt = $db->prepare(
        "SELECT o.*,
                string_agg(oi.name, '|||' ORDER BY oi.id) AS item_names,
                string_agg(CAST(oi.price AS TEXT), '|||' ORDER BY oi.id) AS item_prices,
                string_agg(CAST(oi.product_id AS TEXT), '|||' ORDER BY oi.id) AS item_product_ids
         FROM orders o JOIN order_items oi ON oi.order_id = o.id
         WHERE o.user_id = ? GROUP BY o.id ORDER BY o.created_at DESC"
    );
    $stmt->execute([$user['id']]);
    jsonResponse(['orders' => formatOrders($stmt->fetchAll())]);
}

function placeOrder(): void {
    $user = requireAuth();
    $body = getBody();
    $db   = getDB();

    $cartIds   = $body['cart_ids']      ?? [];
    $barangay  = trim($body['barangay'] ?? '');
    $address   = trim($body['address']  ?? '');
    $payment   = trim($body['payment']  ?? '');
    $eNum      = trim($body['ewallet_num'] ?? '');

    if (empty($cartIds))  jsonResponse(['error' => 'No items selected.'], 422);
    if (!$address)        jsonResponse(['error' => 'Please enter your delivery address.'], 422);
    if (strlen($address) < 5) jsonResponse(['error' => 'Please enter a complete delivery address.'], 422);
    if (!$payment)        jsonResponse(['error' => 'Please select a payment method.'], 422);

    // Fetch selected cart items with product info
    $placeholders = implode(',', array_fill(0, count($cartIds), '?'));
    $stmt = $db->prepare(
        "SELECT c.id AS cart_id, p.id AS product_id, p.name, p.price, p.stock
         FROM cart c JOIN products p ON p.id = c.product_id
         WHERE c.id IN ($placeholders) AND c.user_id = ?"
    );
    $stmt->execute([...$cartIds, $user['id']]);
    $items = $stmt->fetchAll();

    if (empty($items)) jsonResponse(['error' => 'Cart items not found.'], 404);

    // Deduct stock, skip out-of-stock items
    $confirmed = [];
    $failed    = [];
    foreach ($items as $item) {
        $upd = $db->prepare('UPDATE products SET stock = stock - 1 WHERE id = ? AND stock > 0');
        $upd->execute([$item['product_id']]);
        if ($upd->rowCount() > 0) $confirmed[] = $item;
        else $failed[] = $item['name'];
    }

    if (empty($confirmed)) jsonResponse(['error' => 'All selected items are out of stock.'], 409);

    $total = array_sum(array_column($confirmed, 'price'));

    $stmt = $db->prepare(
        'INSERT INTO orders (user_id, total_amount, delivery_addr, payment_method, ewallet_num)
         VALUES (?, ?, ?, ?, ?) RETURNING id'
    );
    $fullAddr = $barangay ? "$address, $barangay" : $address;
    $stmt->execute([$user['id'], $total, $fullAddr, $payment, $eNum ?: null]);
    $orderId = (int)$stmt->fetch()['id'];

    $ins = $db->prepare('INSERT INTO order_items (order_id, product_id, name, price) VALUES (?,?,?,?)');
    foreach ($confirmed as $item) {
        $ins->execute([$orderId, $item['product_id'], $item['name'], $item['price']]);
    }

    $confirmedCartIds = array_column($confirmed, 'cart_id');
    $ph = implode(',', array_fill(0, count($confirmedCartIds), '?'));
    $db->prepare("DELETE FROM cart WHERE id IN ($ph)")->execute($confirmedCartIds);

    jsonResponse([
        'success'  => true,
        'order_id' => $orderId,
        'failed'   => $failed,
        'message'  => empty($failed)
            ? "Order #$orderId placed successfully!"
            : "Order #$orderId placed. Out of stock: " . implode(', ', $failed),
    ]);
}

function directPlaceOrder(): void {
    $user = requireAuth();
    $body = getBody();
    $db   = getDB();

    $productId = (int)($body['product_id']   ?? 0);
    $barangay  = trim($body['barangay']      ?? '');
    $address   = trim($body['address']       ?? '');
    $payment   = trim($body['payment']       ?? '');
    $eNum      = trim($body['ewallet_num']   ?? '');

    if (!$productId) jsonResponse(['error' => 'Invalid product.'], 422);
    if (!$address)   jsonResponse(['error' => 'Please enter your delivery address.'], 422);
    if (strlen($address) < 5) jsonResponse(['error' => 'Please enter a complete delivery address.'], 422);
    if (!$payment)   jsonResponse(['error' => 'Please select a payment method.'], 422);

    $stmt = $db->prepare('SELECT * FROM products WHERE id = ?');
    $stmt->execute([$productId]);
    $product = $stmt->fetch();

    if (!$product)             jsonResponse(['error' => 'Product not found.'], 404);
    if ($product['stock'] <= 0) jsonResponse(['error' => 'This item is out of stock.'], 409);

    $upd = $db->prepare('UPDATE products SET stock = stock - 1 WHERE id = ? AND stock > 0');
    $upd->execute([$productId]);
    if ($upd->rowCount() === 0) jsonResponse(['error' => 'Item just went out of stock.'], 409);

    $stmt = $db->prepare(
        'INSERT INTO orders (user_id, total_amount, delivery_addr, payment_method, ewallet_num)
         VALUES (?, ?, ?, ?, ?) RETURNING id'
    );
    $fullAddr = $barangay ? "$address, $barangay" : $address;
    $stmt->execute([$user['id'], $product['price'], $fullAddr, $payment, $eNum ?: null]);
    $orderId = (int)$stmt->fetch()['id'];

    $db->prepare('INSERT INTO order_items (order_id, product_id, name, price) VALUES (?,?,?,?)')
       ->execute([$orderId, $productId, $product['name'], $product['price']]);

    jsonResponse(['success' => true, 'order_id' => $orderId, 'message' => "Order #$orderId placed successfully!"]);
}

function cancelOrder(int $orderId): void {
    $user = requireAuth();
    $db   = getDB();

    $stmt = $db->prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?');
    $stmt->execute([$orderId, $user['id']]);
    $order = $stmt->fetch();

    if (!$order) jsonResponse(['error' => 'Order not found.'], 404);
    if ($order['status'] !== 'Pending') jsonResponse(['error' => 'Only Pending orders can be cancelled.'], 409);

    $items = $db->prepare('SELECT product_id FROM order_items WHERE order_id = ?');
    $items->execute([$orderId]);
    $restoreStmt = $db->prepare('UPDATE products SET stock = stock + 1 WHERE id = ?');
    foreach ($items->fetchAll() as $item) {
        $restoreStmt->execute([$item['product_id']]);
    }

    $db->prepare("UPDATE orders SET status = 'Cancelled' WHERE id = ?")->execute([$orderId]);
    jsonResponse(['success' => true, 'message' => "Order #$orderId has been cancelled and stock restored."]);
}

function shipOrder(int $orderId): void {
    requireAdmin();
    getDB()->prepare("UPDATE orders SET status = 'Shipped' WHERE id = ?")->execute([$orderId]);
    jsonResponse(['success' => true]);
}

function deliverOrder(int $orderId): void {
    requireAdmin();
    $db   = getDB();
    $stmt = $db->prepare("UPDATE orders SET status = 'Delivered' WHERE id = ? AND status = 'Shipped'");
    $stmt->execute([$orderId]);
    if ($stmt->rowCount() === 0) jsonResponse(['error' => 'Order not found or not yet Shipped.'], 400);
    jsonResponse(['success' => true, 'message' => "Order #$orderId marked as Delivered."]);
}

function updateOrderStatus(int $orderId): void {
    requireAdmin();
    $body   = getBody();
    $status = $body['status'] ?? 'Pending';
    getDB()->prepare('UPDATE orders SET status = ? WHERE id = ?')->execute([$status, $orderId]);
    jsonResponse(['success' => true]);
}

function adminGetOrders(): void {
    requireAdmin();
    $db   = getDB();
    $stmt = $db->query(
        "SELECT o.*, u.username AS customer,
                string_agg(oi.name, '|||' ORDER BY oi.id) AS item_names,
                string_agg(CAST(oi.price AS TEXT), '|||' ORDER BY oi.id) AS item_prices,
                string_agg(CAST(oi.product_id AS TEXT), '|||' ORDER BY oi.id) AS item_product_ids
         FROM orders o
         JOIN users u ON u.id = o.user_id
         JOIN order_items oi ON oi.order_id = o.id
         GROUP BY o.id, u.username ORDER BY o.created_at DESC"
    );
    jsonResponse(['orders' => formatOrders($stmt->fetchAll())]);
}

// ============================================================
// ANALYTICS HANDLERS
// ============================================================

function analyticsDashboard(): void {
    requireAdmin();
    $db = getDB();

    $revenue     = $db->query("SELECT COALESCE(SUM(total_amount),0) AS rev FROM orders WHERE status != 'Cancelled'")->fetch()['rev'];
    $pending     = $db->query("SELECT COUNT(*) AS c FROM orders WHERE status = 'Pending'")->fetch()['c'];
    $totalOrders = $db->query("SELECT COUNT(*) AS c FROM orders")->fetch()['c'];
    $products    = $db->query("SELECT COUNT(*) AS c FROM products")->fetch()['c'];
    $customers   = $db->query("SELECT COUNT(*) AS c FROM users WHERE role = 'customer'")->fetch()['c'];
    $topProducts = $db->query(
        "SELECT oi.name, COUNT(*) AS sold FROM order_items oi
         JOIN orders o ON o.id = oi.order_id WHERE o.status != 'Cancelled'
         GROUP BY oi.name ORDER BY sold DESC LIMIT 5"
    )->fetchAll();

    jsonResponse([
        'revenue'      => (float)$revenue,
        'pending'      => (int)$pending,
        'total_orders' => (int)$totalOrders,
        'products'     => (int)$products,
        'customers'    => (int)$customers,
        'top_products' => $topProducts,
    ]);
}

function analyticsCustomers(): void {
    requireAdmin();
    $db   = getDB();
    $stmt = $db->query(
        "SELECT u.username, COUNT(o.id) AS orders, COALESCE(SUM(o.total_amount),0) AS spent
         FROM users u LEFT JOIN orders o ON o.user_id = u.id AND o.status != 'Cancelled'
         WHERE u.role = 'customer' GROUP BY u.id, u.username ORDER BY spent DESC"
    );
    jsonResponse(['customers' => $stmt->fetchAll()]);
}

/** Compute the runtime status of an auction based on stored status + current time. */
function deriveAuctionStatus(array $row): string {
    $stored = $row['status'] ?? 'draft';
    if ($stored === 'draft' || $stored === 'cancelled' || $stored === 'ended') return $stored;
    $now   = time();
    $start = !empty($row['start_time']) ? strtotime($row['start_time']) : null;
    $end   = !empty($row['end_time'])   ? strtotime($row['end_time'])   : null;
    if ($end && $now >= $end)     return 'ended';
    if ($start && $now < $start)  return 'scheduled';
    return 'live';
}

function formatAuction(array $r): array {
    return [
        'id'              => (int)$r['id'],
        'name'            => $r['name'],
        'description'     => $r['description'],
        'images'          => json_decode($r['images'] ?? '[]', true),
        'category'        => $r['category'] ?? 'Other',
        'starting_price'  => (float)$r['starting_price'],
        'bid_increment'   => (float)$r['bid_increment'],
        'current_bid'     => $r['current_bid'] !== null ? (float)$r['current_bid'] : null,
        'current_bidder_id' => $r['current_bidder_id'] !== null ? (int)$r['current_bidder_id'] : null,
        'start_time'      => $r['start_time'],
        'end_time'        => $r['end_time'],
        'status'          => deriveAuctionStatus($r),
        'stored_status'   => $r['status'],
        'winner_id'        => $r['winner_id'] !== null ? (int)$r['winner_id'] : null,
        'winner_username'  => $r['winner_username'] ?? null,
        'winning_order_id' => $r['winning_order_id'] !== null ? (int)$r['winning_order_id'] : null,
        'created_at'       => $r['created_at'] ?? null,
    ];
}

/** Public: only published (non-draft, non-cancelled) auctions. */
function getAuctions(): void {
    finalizeEndedAuctions();
    $db   = getDB();
    $rows = $db->query(
        "SELECT a.*, u.username AS winner_username
         FROM auctions a LEFT JOIN users u ON u.id = a.winner_id
         WHERE a.status NOT IN ('draft','cancelled')
         ORDER BY a.end_time ASC NULLS LAST, a.id DESC"
    )->fetchAll();
    jsonResponse(['auctions' => array_map('formatAuction', $rows)]);
}

/** Admin: every auction including drafts. */
function adminGetAuctions(): void {
    requireAdmin();
    finalizeEndedAuctions();
    $rows = getDB()->query(
        "SELECT a.*, u.username AS winner_username
         FROM auctions a LEFT JOIN users u ON u.id = a.winner_id
         ORDER BY a.id DESC"
    )->fetchAll();
    jsonResponse(['auctions' => array_map('formatAuction', $rows)]);
}

function adminCreateAuction(): void {
    requireAdmin();
    $body = getBody();
    $db   = getDB();
    $stmt = $db->prepare(
        'INSERT INTO auctions
            (name, description, images, category, starting_price, bid_increment, start_time, end_time, status)
         VALUES (?,?,?,?,?,?,?,?, \'draft\')
         RETURNING id'
    );
    $stmt->execute([
        $body['name']           ?? '',
        $body['description']    ?? '',
        json_encode($body['images'] ?? []),
        ($body['category']      ?? '') ?: 'Other',
        (float)($body['starting_price'] ?? 0),
        (float)($body['bid_increment']  ?? 20),
        ($body['start_time']    ?? '') ?: null,
        ($body['end_time']      ?? '') ?: null,
    ]);
    jsonResponse(['success' => true, 'id' => (int)$stmt->fetch()['id']]);
}

function adminUpdateAuction(int $id): void {
    requireAdmin();
    $body = getBody();
    $db   = getDB();

    // Check current state — can't edit core fields once anyone has bid on it.
    $stmt = $db->prepare('SELECT * FROM auctions WHERE id = ?');
    $stmt->execute([$id]);
    $existing = $stmt->fetch();
    if (!$existing) jsonResponse(['error' => 'Auction not found.'], 404);

    $hasBids = (int)$db->query("SELECT COUNT(*) AS c FROM bids WHERE auction_id = $id")->fetch()['c'] > 0;
    if ($hasBids && in_array($existing['status'], ['live','ended'], true)) {
        jsonResponse(['error' => 'Cannot edit an auction that already has bids.'], 409);
    }

    $db->prepare(
        'UPDATE auctions
            SET name=?, description=?, images=?, category=?, starting_price=?, bid_increment=?,
                start_time=?, end_time=?, updated_at=CURRENT_TIMESTAMP
            WHERE id=?'
    )->execute([
        $body['name']           ?? '',
        $body['description']    ?? '',
        json_encode($body['images'] ?? []),
        ($body['category']      ?? '') ?: 'Other',
        (float)($body['starting_price'] ?? 0),
        (float)($body['bid_increment']  ?? 20),
        ($body['start_time']    ?? '') ?: null,
        ($body['end_time']      ?? '') ?: null,
        $id,
    ]);
    jsonResponse(['success' => true]);
}

function adminDeleteAuction(int $id): void {
    requireAdmin();
    $db   = getDB();
    $stmt = $db->prepare('SELECT status FROM auctions WHERE id = ?');
    $stmt->execute([$id]);
    $row  = $stmt->fetch();
    if (!$row) jsonResponse(['error' => 'Auction not found.'], 404);
    if ($row['status'] !== 'draft') {
        jsonResponse(['error' => 'Only drafts can be deleted. Cancel published auctions instead.'], 409);
    }
    $db->prepare('DELETE FROM auctions WHERE id = ?')->execute([$id]);
    jsonResponse(['success' => true]);
}

function adminPublishAuction(int $id): void {
    requireAdmin();
    $db   = getDB();
    $stmt = $db->prepare('SELECT * FROM auctions WHERE id = ?');
    $stmt->execute([$id]);
    $a = $stmt->fetch();
    if (!$a) jsonResponse(['error' => 'Auction not found.'], 404);
    if ($a['status'] !== 'draft') jsonResponse(['error' => 'Auction is already published.'], 409);

    // Validation gate before going live.
    $errors = [];
    if (trim($a['name']) === '')                   $errors[] = 'Name is required.';
    if ((float)$a['starting_price'] <= 0)          $errors[] = 'Starting price must be greater than 0.';
    if ((float)$a['bid_increment']  <= 0)          $errors[] = 'Bid increment must be greater than 0.';
    if (empty($a['start_time']))                   $errors[] = 'Start time is required.';
    if (empty($a['end_time']))                     $errors[] = 'End time is required.';
    $imgs = json_decode($a['images'] ?? '[]', true);
    if (empty($imgs))                              $errors[] = 'At least one image is required.';

    if (!empty($a['start_time']) && !empty($a['end_time'])) {
        $start = strtotime($a['start_time']);
        $end   = strtotime($a['end_time']);
        $now   = time();
        if ($end <= $start)            $errors[] = 'End time must be after start time.';
        if ($end < $now)               $errors[] = 'End time must be in the future.';
        if (($end - $start) < 3600)    $errors[] = 'Auction must run for at least 1 hour.';
        if (($end - $start) > 1209600) $errors[] = 'Auction cannot run longer than 14 days.';
    }

    if (!empty($errors)) jsonResponse(['error' => implode(' ', $errors)], 422);

    // Decide initial status based on start_time.
    $now    = time();
    $start  = strtotime($a['start_time']);
    $newSt  = ($now >= $start) ? 'live' : 'scheduled';

    $db->prepare('UPDATE auctions SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
       ->execute([$newSt, $id]);
    jsonResponse(['success' => true, 'status' => $newSt]);
}

function adminUnpublishAuction(int $id): void {
    requireAdmin();
    $db   = getDB();
    $stmt = $db->prepare('SELECT status FROM auctions WHERE id = ?');
    $stmt->execute([$id]);
    $row  = $stmt->fetch();
    if (!$row) jsonResponse(['error' => 'Auction not found.'], 404);
    if ($row['status'] !== 'scheduled') {
        jsonResponse(['error' => 'Only scheduled auctions can be moved back to draft.'], 409);
    }
    $hasBids = (int)$db->query("SELECT COUNT(*) AS c FROM bids WHERE auction_id = $id")->fetch()['c'] > 0;
    if ($hasBids) jsonResponse(['error' => 'Cannot unpublish — bids already exist.'], 409);

    $db->prepare("UPDATE auctions SET status = 'draft', updated_at = CURRENT_TIMESTAMP WHERE id = ?")
       ->execute([$id]);
    jsonResponse(['success' => true]);
}

// ── AUCTION FINALIZER ──────────────────────────────────────────────────────────
function finalizeEndedAuctions(): void {
    $db   = getDB();
    $stmt = $db->query(
        "SELECT * FROM auctions
         WHERE status IN ('live','scheduled')
           AND end_time IS NOT NULL
           AND end_time < CURRENT_TIMESTAMP"
    );
    $toEnd = $stmt->fetchAll();
    foreach ($toEnd as $a) {
        $db->beginTransaction();
        try {
            if ($a['current_bidder_id']) {
                $ins = $db->prepare(
                    "INSERT INTO orders (user_id, total_amount, delivery_addr, payment_method, status)
                     VALUES (?, ?, 'Auction Win — Awaiting Address', 'Auction Win', 'Pending')
                     RETURNING id"
                );
                $ins->execute([$a['current_bidder_id'], $a['current_bid']]);
                $orderId = (int)$ins->fetch()['id'];

                $db->prepare("INSERT INTO order_items (order_id, name, price) VALUES (?, ?, ?)")
                   ->execute([$orderId, $a['name'] . ' (Auction Win)', $a['current_bid']]);

                $db->prepare(
                    "UPDATE auctions SET status='ended', winner_id=?, winning_order_id=?, updated_at=CURRENT_TIMESTAMP WHERE id=?"
                )->execute([$a['current_bidder_id'], $orderId, $a['id']]);
            } else {
                $db->prepare("UPDATE auctions SET status='ended', updated_at=CURRENT_TIMESTAMP WHERE id=?")
                   ->execute([$a['id']]);
            }
            $db->commit();
        } catch (\Throwable $e) {
            $db->rollBack();
        }
    }
}

// ── CHAT HANDLERS ─────────────────────────────────────────────────────────────
function getChatMessages(): void {
    $user = requireAuth();
    $db   = getDB();
    $stmt = $db->prepare("SELECT * FROM chat_messages WHERE user_id = ? ORDER BY created_at ASC");
    $stmt->execute([$user['id']]);
    $rows = $stmt->fetchAll();
    // Mark admin replies as read
    $db->prepare("UPDATE chat_messages SET read_at=CURRENT_TIMESTAMP
                  WHERE user_id=? AND from_admin=TRUE AND read_at IS NULL")
       ->execute([$user['id']]);
    jsonResponse(['messages' => array_map(fn($r) => [
        'id'         => (int)$r['id'],
        'content'    => $r['content'],
        'from_admin' => (bool)$r['from_admin'],
        'created_at' => $r['created_at'],
    ], $rows)]);
}

function getChatUnread(): void {
    $user = requireAuth();
    $stmt = getDB()->prepare(
        "SELECT COUNT(*) AS c FROM chat_messages WHERE user_id=? AND from_admin=TRUE AND read_at IS NULL"
    );
    $stmt->execute([$user['id']]);
    jsonResponse(['unread' => (int)$stmt->fetch()['c']]);
}

function sendChatMessage(): void {
    $user = requireAuth();
    if (($user['role'] ?? '') === 'admin') jsonResponse(['error' => 'Admins use the admin reply endpoint.'], 403);
    $body    = getBody();
    $content = trim($body['content'] ?? '');
    if (!$content)           jsonResponse(['error' => 'Message cannot be empty.'], 422);
    if (strlen($content) > 2000) jsonResponse(['error' => 'Message too long (max 2000 chars).'], 422);
    getDB()->prepare("INSERT INTO chat_messages (user_id, content, from_admin) VALUES (?, ?, FALSE)")
           ->execute([$user['id'], $content]);
    jsonResponse(['success' => true]);
}

function adminGetChats(): void {
    requireAdmin();
    $db   = getDB();
    $rows = $db->query(
        "SELECT u.id, u.username,
                MAX(m.created_at) AS last_at,
                (SELECT content FROM chat_messages WHERE user_id = u.id ORDER BY created_at DESC LIMIT 1) AS preview,
                COUNT(CASE WHEN m.from_admin=FALSE AND m.read_at IS NULL THEN 1 END) AS unread
         FROM users u
         JOIN chat_messages m ON m.user_id = u.id
         GROUP BY u.id, u.username
         ORDER BY last_at DESC"
    )->fetchAll();
    jsonResponse(['conversations' => array_map(fn($r) => [
        'user_id'  => (int)$r['id'],
        'username' => $r['username'],
        'preview'  => $r['preview'],
        'last_at'  => $r['last_at'],
        'unread'   => (int)$r['unread'],
    ], $rows)]);
}

function adminGetUserChat(int $userId): void {
    requireAdmin();
    $db   = getDB();
    $stmt = $db->prepare("SELECT * FROM chat_messages WHERE user_id=? ORDER BY created_at ASC");
    $stmt->execute([$userId]);
    $rows = $stmt->fetchAll();
    // Mark customer messages read
    $db->prepare("UPDATE chat_messages SET read_at=CURRENT_TIMESTAMP
                  WHERE user_id=? AND from_admin=FALSE AND read_at IS NULL")
       ->execute([$userId]);
    $u = $db->prepare("SELECT username FROM users WHERE id=?");
    $u->execute([$userId]);
    $row = $u->fetch();
    jsonResponse([
        'username' => $row['username'] ?? 'Unknown',
        'messages' => array_map(fn($r) => [
            'id'         => (int)$r['id'],
            'content'    => $r['content'],
            'from_admin' => (bool)$r['from_admin'],
            'created_at' => $r['created_at'],
        ], $rows),
    ]);
}

function adminReplyChat(int $userId): void {
    requireAdmin();
    $body    = getBody();
    $content = trim($body['content'] ?? '');
    if (!$content) jsonResponse(['error' => 'Reply cannot be empty.'], 422);
    $db   = getDB();
    $chk  = $db->prepare("SELECT id FROM users WHERE id=?");
    $chk->execute([$userId]);
    if (!$chk->fetch()) jsonResponse(['error' => 'User not found.'], 404);
    $db->prepare("INSERT INTO chat_messages (user_id, content, from_admin) VALUES (?, ?, TRUE)")
       ->execute([$userId, $content]);
    jsonResponse(['success' => true]);
}

function getAuctionBids(int $id): void {
    $db   = getDB();
    $stmt = $db->prepare(
        "SELECT b.id, b.amount, b.created_at,
                u.username,
                CONCAT(LEFT(u.username, 2), REPEAT('*', GREATEST(LENGTH(u.username)-4,2)), RIGHT(u.username, 2)) AS masked
         FROM bids b JOIN users u ON u.id = b.user_id
         WHERE b.auction_id = ?
         ORDER BY b.amount DESC, b.created_at DESC"
    );
    $stmt->execute([$id]);
    $rows = $stmt->fetchAll();

    // Reveal full username only to the bidder themselves.
    $meId = sessionUser()['id'] ?? null;
    $out  = array_map(function($r) use ($meId) {
        return [
            'id'         => (int)$r['id'],
            'amount'     => (float)$r['amount'],
            'username'   => $meId && (int)$r['id'] ? $r['masked'] : $r['masked'],
            'created_at' => $r['created_at'],
        ];
    }, $rows);

    jsonResponse(['bids' => $out]);
}

function placeBid(int $auctionId): void {
    $user   = requireAuth();
    $body   = getBody();
    $amount = (float)($body['amount'] ?? 0);
    $db     = getDB();

    // Lock the auction row for the duration of this transaction.
    $db->beginTransaction();
    try {
        $stmt = $db->prepare('SELECT * FROM auctions WHERE id = ? FOR UPDATE');
        $stmt->execute([$auctionId]);
        $a = $stmt->fetch();

        if (!$a) {
            $db->rollBack();
            jsonResponse(['error' => 'Auction not found.'], 404);
        }

        // Re-derive live status inside the transaction.
        $derived = deriveAuctionStatus($a);
        if ($derived !== 'live') {
            $db->rollBack();
            jsonResponse(['error' => 'This auction is not currently accepting bids.'], 409);
        }

        $minBid = (($a['current_bid'] !== null) ? (float)$a['current_bid'] : (float)$a['starting_price'])
                  + (float)$a['bid_increment'];

        if ($amount < $minBid) {
            $db->rollBack();
            jsonResponse(['error' => "Your bid must be at least ₱" . number_format($minBid, 2) . "."], 422);
        }

        // Insert bid record.
        $db->prepare('INSERT INTO bids (auction_id, user_id, amount) VALUES (?, ?, ?)')
           ->execute([$auctionId, $user['id'], $amount]);

        // Update auction's current bid.
        $db->prepare('UPDATE auctions SET current_bid = ?, current_bidder_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
           ->execute([$amount, $user['id'], $auctionId]);

        $db->commit();
        jsonResponse(['success' => true, 'message' => "Bid of ₱" . number_format($amount, 2) . " placed!", 'current_bid' => $amount]);

    } catch (\Throwable $e) {
        $db->rollBack();
        jsonResponse(['error' => 'Could not place bid. Please try again.'], 500);
    }
}

function formatOrders(array $rows): array {
    return array_map(function($o) {
        $names    = explode('|||', $o['item_names']    ?? '');
        $prices   = explode('|||', $o['item_prices']   ?? '');
        $pIds     = explode('|||', $o['item_product_ids'] ?? '');
        $items    = [];
        foreach ($names as $i => $name) {
            $items[] = ['name' => $name, 'price' => (float)($prices[$i] ?? 0), 'product_id' => (int)($pIds[$i] ?? 0)];
        }
        return [
            'id'             => (int)$o['id'],
            'customer'       => $o['customer'] ?? null,
            'user_id'        => (int)$o['user_id'],
            'total_amount'   => (float)$o['total_amount'],
            'status'         => $o['status'],
            'delivery_addr'  => $o['delivery_addr'],
            'payment_method' => $o['payment_method'],
            'ewallet_num'    => $o['ewallet_num'],
            'created_at'     => $o['created_at'],
            'items'          => $items,
        ];
    }, $rows);
}
