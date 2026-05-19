<?php
// ============================================================
// config.php — Database connection settings (PostgreSQL)
// ============================================================

define('DB_HOST',    getenv('PGHOST')     ?: 'localhost');
define('DB_PORT',    getenv('PGPORT')     ?: '5432');
define('DB_NAME',    getenv('PGDATABASE') ?: 'heliumdb');
define('DB_USER',    getenv('PGUSER')     ?: 'postgres');
define('DB_PASS',    getenv('PGPASSWORD') ?: '');

// Session secret (change this to a random string)
define('SESSION_SECRET', 'luckyth_orderwise_2025');

// App base URL (no trailing slash)
define('APP_URL', 'http://localhost:5000');

function getDB(): PDO {
    static $pdo = null;
    if ($pdo === null) {
        $dsn = "pgsql:host=" . DB_HOST . ";port=" . DB_PORT . ";dbname=" . DB_NAME;
        $pdo = new PDO($dsn, DB_USER, DB_PASS, [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ]);
    }
    return $pdo;
}

function jsonResponse(array $data, int $status = 200): void {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');
    echo json_encode($data);
    exit;
}

function getBody(): array {
    $raw = file_get_contents('php://input');
    return json_decode($raw, true) ?? [];
}

function sessionUser(): ?array {
    if (session_status() === PHP_SESSION_NONE) session_start();
    return $_SESSION['user'] ?? null;
}

function requireAuth(): array {
    $user = sessionUser();
    if (!$user) jsonResponse(['error' => 'Unauthorized'], 401);
    return $user;
}

function requireAdmin(): array {
    $user = requireAuth();
    if ($user['role'] !== 'admin') jsonResponse(['error' => 'Forbidden'], 403);
    return $user;
}
