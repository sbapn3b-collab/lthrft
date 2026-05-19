# LuckyThrift | OrderWise

A vintage thrift store e-commerce web app built with PHP (backend API) and vanilla HTML/CSS/JS (frontend).

## Architecture

- **Frontend**: Multi-page HTML app using Tailwind CSS + Lucide icons
- **Backend**: PHP 8.2 built-in server serving both static HTML files and a REST API
- **Database**: PostgreSQL (Replit-managed, accessed via PDO with `pgsql` driver)
- **Server**: PHP built-in development server on port 5000

## Key Files

- `luckyth_php/api/index.php` — Central PHP API router (all endpoints)
- `luckyth_php/config.php` — Database config (reads from env vars PGHOST, PGPORT, etc.)
- `luckyth_php/assets/js/api.js` — Frontend API client
- `luckyth_php/assets/js/nav.js` — Shared nav/auth logic + chat widget injection
- `luckyth_php/assets/js/chat.js` — Floating chat widget logic (ChatWidget object)
- `luckyth_php/includes/chat-widget.html` — Chat widget HTML (injected on all public pages)

## Pages

- `/` → `index.html` — Home/landing page
- `/shop.html` — Product catalog
- `/cart.html` — Cart, checkout, order tracking
- `/profile.html` — Customer profile & order history
- `/products/product-N.html` — Individual product pages (6 products)
- `/bids.html` — Public auction listings
- `/bid-item.html?id=N` — Single auction detail, live bidding, winner banner
- `/admin/dashboard.html` — Admin: revenue stats
- `/admin/inventory.html` — Admin: stock management
- `/admin/orders.html` — Admin: order fulfillment
- `/admin/analytics.html` — Admin: financial dashboard
- `/admin/customers.html` — Admin: customer insights
- `/admin/auctions.html` — Admin: auction CRUD, draft/publish, ended winner display
- `/admin/messages.html` — Admin: customer chat conversations + replies

## Default Credentials

| Role | Username | Password |
|------|----------|----------|
| Admin | admin | admin123 |
| Customer | Register via Sign Up |

## Database

Tables: `users`, `products`, `cart`, `orders`, `order_items`, `auctions`, `bids`, `chat_messages`.

- `order_items.product_id` is nullable — auction-win orders have NULL product_id
- `chat_messages(id, user_id, content, from_admin bool, read_at, created_at)` — per-user threads
- Connection uses env vars: `PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER`, `PGPASSWORD`

## Running

Workflow: `php -S 0.0.0.0:5000 -t luckyth_php`

## Architecture Decisions

- Originally MySQL; migrated to PostgreSQL — use `string_agg()` not `GROUP_CONCAT`, `RETURNING id` not `lastInsertId()`, positional `?` placeholders work with PDO pgsql
- `deriveAuctionStatus(row)` computes live/scheduled/ended from timestamps at query time; stored `status` column is source of truth for draft/cancelled
- `finalizeEndedAuctions()` is called on every `getAuctions()` + `adminGetAuctions()` request — auto-creates winner orders when `end_time` passes
- Chat widget is injected into `document.body` by `nav.js` on all non-admin pages (detected via `data-admin-page` attribute on `<body>`)
- Admin pages use `data-admin-page` body attribute to suppress the customer chat widget

## Product

- Browse & purchase vintage items via cart + checkout
- Live auction bidding with countdown timers, bid history, anti-snipe protection
- Winners get an auto-created "Auction Win" order; "🎉 You won!" banner appears on the item page
- Floating chat widget on all public pages — customers message admin; admin replies from Messages page
- Unread badge on chat button when admin replies; 5s polling while widget open, 30s unread check when closed
- Admin sidebar unread badge shows total unread customer messages
