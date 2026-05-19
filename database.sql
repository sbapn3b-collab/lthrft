-- ============================================================
-- LuckyThrift | OrderWise System — Database Schema
-- Import this file into phpMyAdmin to set up the database.
-- ============================================================

CREATE DATABASE IF NOT EXISTS luckyth_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE luckyth_db;

-- ------------------------------------------------------------
-- USERS  (Module: User Accounts & Security Access)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    username      VARCHAR(80)  NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role          ENUM('admin','customer') NOT NULL DEFAULT 'customer',
    email         VARCHAR(120) DEFAULT NULL,
    reset_token   VARCHAR(100) DEFAULT NULL,
    reset_expires DATETIME     DEFAULT NULL,
    created_at    DATETIME     DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Default admin (password: admin123)
INSERT INTO users (username, password_hash, role) VALUES
('admin', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin');
-- NOTE: The hash above is for 'password'. Re-hash 'admin123' on your server using:
-- php -r "echo password_hash('admin123', PASSWORD_BCRYPT);"

-- ------------------------------------------------------------
-- PRODUCTS  (Module: Inventory & Real-time Stock Tracker)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS products (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    name       VARCHAR(150) NOT NULL,
    price      DECIMAL(10,2) NOT NULL,
    stock      INT NOT NULL DEFAULT 0,
    description TEXT DEFAULT NULL,
    images     TEXT DEFAULT NULL,   -- JSON array of image URLs
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

INSERT INTO products (name, price, stock, description, images) VALUES
('90s Oversized Vintage Flannel', 450, 5, 'A cozy oversized flannel shirt from the 90s. Perfect for layering with a vintage aesthetic.', '["https://images.unsplash.com/photo-1578932750294-f5075e85f44a?q=80&w=800","https://images.unsplash.com/photo-1591047139829-d91aecb6caea?q=80&w=800","https://images.unsplash.com/photo-1603252109303-2751441dd157?q=80&w=800"]'),
('Retro Denim Trucker Jacket', 850, 4, 'Classic denim trucker jacket with authentic retro styling. A timeless wardrobe staple.', '["https://images.unsplash.com/photo-1551537482-f2075a1d41f2?q=80&w=800","https://images.unsplash.com/photo-1576871337622-98d48d1cf531?q=80&w=800","https://images.unsplash.com/photo-1548126032-079a0fb0099d?q=80&w=800"]'),
('Classic Corduroy Trousers', 600, 3, 'High-quality corduroy trousers with a straight-leg cut. Comfortable and stylish.', '["https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?q=80&w=800","https://images.unsplash.com/photo-1473966968600-fa801b869a1a?q=80&w=800","https://images.unsplash.com/photo-1602293589930-45aad59ba3ab?q=80&w=800"]'),
('Heavyweight Boxy Tee', 350, 12, 'A premium heavyweight tee with a relaxed boxy fit. Versatile and durable.', '["https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?q=80&w=800","https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?q=80&w=800","https://images.unsplash.com/photo-1562157873-818bc0726f68?q=80&w=800"]'),
('Utility Canvas Tote Bag', 250, 5, 'Durable canvas tote bag perfect for everyday use. Spacious and eco-friendly.', '["https://images.unsplash.com/photo-1544816153-12ad5d7133a1?q=80&w=800","https://images.unsplash.com/photo-1591561954557-26941169b49e?q=80&w=800","https://images.unsplash.com/photo-1622560480605-d83c853bc5c3?q=80&w=800"]'),
('High-Waist Mom Jeans', 750, 2, 'Flattering high-waist mom jeans with a vintage silhouette. Great for casual looks.', '["https://images.unsplash.com/photo-1541099649105-f69ad21f3246?q=80&w=800","https://images.unsplash.com/photo-1542272604-787c3835535d?q=80&w=800","https://images.unsplash.com/photo-1582418702059-97ebafb35d09?q=80&w=800"]');

-- ------------------------------------------------------------
-- CART  (Module: Online Order & User Entry Interface)
-- Stores items a user wants to order later (not yet checked out)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cart (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    user_id    INT NOT NULL,
    product_id INT NOT NULL,
    added_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id)    REFERENCES users(id)    ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- ORDERS  (Module: Sales Ledger & Order Status)
-- Created when a customer checks out cart items
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS orders (
    id             INT AUTO_INCREMENT PRIMARY KEY,
    user_id        INT NOT NULL,
    total_amount   DECIMAL(10,2) NOT NULL,
    status         ENUM('Pending','Processing','Shipped','Cancelled') NOT NULL DEFAULT 'Pending',
    delivery_addr  VARCHAR(255) DEFAULT NULL,
    payment_method VARCHAR(50)  DEFAULT NULL,
    ewallet_num    VARCHAR(30)  DEFAULT NULL,
    notes          TEXT         DEFAULT NULL,
    created_at     DATETIME     DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Sample order for Maria Clara (insert after her user exists)
-- You can add test data manually in phpMyAdmin.

-- ------------------------------------------------------------
-- ORDER ITEMS  (Line items per order)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS order_items (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    order_id   INT NOT NULL,
    product_id INT NOT NULL,
    name       VARCHAR(150) NOT NULL,
    price      DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (order_id)   REFERENCES orders(id)   ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- SALES LEDGER VIEW  (Module: Financial Dashboard)
-- A convenient view for the admin revenue report
-- ------------------------------------------------------------
CREATE OR REPLACE VIEW sales_ledger AS
SELECT
    o.id          AS order_id,
    u.username    AS customer,
    o.total_amount,
    o.status,
    o.payment_method,
    o.delivery_addr,
    o.created_at,
    GROUP_CONCAT(oi.name SEPARATOR ', ') AS items
FROM orders o
JOIN users u ON u.id = o.user_id
JOIN order_items oi ON oi.order_id = o.id
GROUP BY o.id;
