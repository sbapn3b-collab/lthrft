# LuckyThrift | OrderWise — Multi-Page Setup Guide

## 📁 Full File Structure

```
luckyth_php/
│
├── index.html              ← Home / Landing page
├── shop.html               ← Full product catalog
├── cart.html               ← Cart + Orders + Tracking
├── profile.html            ← Customer profile & order history
│
├── products/               ← ONE FILE PER PRODUCT
│   ├── product-1.html      ← 90s Oversized Vintage Flannel
│   ├── product-2.html      ← Retro Denim Trucker Jacket
│   ├── product-3.html      ← Classic Corduroy Trousers
│   ├── product-4.html      ← Heavyweight Boxy Tee
│   ├── product-5.html      ← Utility Canvas Tote Bag
│   ├── product-6.html      ← High-Waist Mom Jeans
│   └── product-7.html      ← (add more products here!)
│
├── admin/                  ← ONE FILE PER ADMIN SECTION
│   ├── dashboard.html      ← Revenue stats + top products
│   ├── inventory.html      ← Stock management
│   ├── orders.html         ← Fulfillment / ship orders
│   ├── analytics.html      ← Financial dashboard
│   └── customers.html      ← Customer insights
│
├── includes/               ← Shared HTML pieces (loaded on every page)
│   ├── nav.html            ← Navigation bar
│   ├── auth-modal.html     ← Login / Sign-up popup
│   ├── checkout-modal.html ← Checkout popup (cart page only)
│   ├── admin-sidebar.html  ← Admin left sidebar
│   └── toast.html          ← Toast notification
│
├── assets/
│   ├── css/style.css
│   └── js/
│       ├── api.js           ← PHP API fetch client
│       ├── nav.js           ← Shared: loads includes, auth, cart badge
│       ├── page-home.js     ← Home page logic
│       ├── page-shop.js     ← Shop page logic
│       ├── page-product.js  ← Product page logic (used by ALL product files)
│       ├── page-cart.js     ← Cart + orders + checkout logic
│       ├── page-profile.js  ← Profile page logic
│       └── page-admin.js    ← Shared admin logic
│
├── api/index.php            ← PHP backend (all API endpoints)
├── config.php               ← Database credentials
├── database.sql             ← Import into phpMyAdmin
└── .htaccess                ← Apache URL routing
```

---

## ➕ How to Add a New Product

### Step 1 — Add to the database
Open **phpMyAdmin** → `luckyth_db` → `products` table → Insert:

| Field       | Example value |
|-------------|---------------|
| name        | Vintage Polo Shirt |
| price       | 380 |
| stock       | 8 |
| description | A classic vintage polo in excellent condition. |
| images      | `["https://images.unsplash.com/photo-XXX?w=800","https://...","https://..."]` |

Note the new row's **id** (e.g. `7`).

### Step 2 — Create the product HTML page
Copy any existing product file and rename it:

```
products/product-6.html  →  copy as  products/product-7.html
```

Open `product-7.html` and change **one line** only:

```html
<!-- Change this: -->
<body ... data-product-id="6">

<!-- To this: -->
<body ... data-product-id="7">
```

That's it! The page automatically loads the correct product from the database.

---

## ⚙️ Initial Setup

### 1. Import Database
phpMyAdmin → Import → choose `database.sql` → Go

### 2. Edit config.php
```php
define('DB_HOST', 'localhost');
define('DB_NAME', 'luckyth_db');
define('DB_USER', 'root');   // your MySQL username
define('DB_PASS', '');       // your MySQL password
```

### 3. Place in web server root
- **XAMPP**: `C:/xampp/htdocs/luckyth_php/`
- **WAMP**:  `C:/wamp64/www/luckyth_php/`
- Open:     `http://localhost/luckyth_php/`

### 4. Fix the admin password (optional for production)
```bash
php -r "echo password_hash('admin123', PASSWORD_BCRYPT);"
```
Paste output into phpMyAdmin → `users` table → admin row → `password_hash`.

---

## 🔐 Default Login
| Role     | Username | Password |
|----------|----------|----------|
| Admin    | admin    | admin123 |
| Customer | register via Sign Up |

---

## 🌐 Page Navigation Flow

```
index.html (Home)
    └─► shop.html (Catalog)
            └─► products/product-N.html (Item detail + Add to Cart)
                        └─► cart.html (Cart → Checkout → Orders → Track)
                                    └─► profile.html (Order history)

[Admin login] → admin/dashboard.html
                admin/inventory.html
                admin/orders.html  (Ship orders)
                admin/analytics.html
                admin/customers.html
```
