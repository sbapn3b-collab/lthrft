# LuckyThrift | OrderWise

A vintage thrift store e-commerce web app with cart, checkout, live auctions, and admin dashboard.

## Run & Operate

- **Start**: `php -S 0.0.0.0:5000 -t luckyth_php`
- **Required env vars**: `PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER`, `PGPASSWORD` (set automatically by Replit PostgreSQL)

## Stack

- **Frontend**: Multi-page HTML, Tailwind CSS (CDN), Lucide icons, vanilla JS
- **Backend**: PHP 8.2 built-in server (REST API + static file serving)
- **Database**: PostgreSQL 16 via PDO pdo_pgsql
- **Runtime**: Port 5000

## Where things live

- `luckyth_php/api/index.php` — Central PHP API router (all endpoints)
- `luckyth_php/config.php` — DB config + helper functions
- `luckyth_php/assets/js/api.js` — Frontend API client
- `luckyth_php/assets/js/nav.js` — Shared nav/auth + chat widget injection
- `luckyth_php/assets/css/style.css` — Global styles

## Architecture decisions

- PHP built-in server serves both static HTML and the API from the same origin — no CORS issues
- Originally MySQL; migrated to PostgreSQL — uses `string_agg()`, `RETURNING id`, positional `?` PDO placeholders
- `deriveAuctionStatus()` computes live/scheduled/ended from timestamps; stored `status` is source of truth for draft/cancelled
- `finalizeEndedAuctions()` auto-creates winner orders on every `getAuctions()` call
- Chat widget injected by `nav.js` on all non-admin pages (admin pages use `data-admin-page` body attribute to suppress it)

## Product

- Browse & purchase vintage items via cart + checkout
- Live auction bidding with countdown timers, anti-snipe protection, winner banners
- Floating chat widget: customers message admin, admin replies from Messages page
- Admin dashboard: orders, inventory, analytics, customers, auctions, messages

## Default Credentials

| Role | Username | Password |
|------|----------|----------|
| Admin | admin | admin123 |
| Customer | Register via Sign Up |

## Gotchas

- Admin login requires a non-empty email field (any value) due to the admin shortcut logic
- `order_items.product_id` is nullable — auction-win orders have NULL product_id
- Chat polling: 5s when widget open, 30s unread check when closed

## Pointers

- DB schema: `luckyth_php/database.sql` (MySQL reference; actual schema applied via PostgreSQL)
- API routes: `luckyth_php/api/index.php` lines 17-76
