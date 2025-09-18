UCLEAN




🔑 Common Structure in Both Invoices
	1.	Invoice Header
	•	Tax Invoice No.
	•	Challan ID (in one invoice)
	•	Date/Time (in Order details)
	2.	Customer Details
	•	Name
	•	Phone number
	•	Address
	3.	Store Details
	•	Store Code
	•	Store Name
	•	GSTIN
	•	Phone number
	•	Address
	4.	Order Details
	•	Order No. (with source: Walk-in, Pickup, etc.)
	•	Order Date & Time
	•	Pickup Date & Time
	•	Delivery Date & Time
	5.	Service/Items Table
	•	S.No.
	•	Service Name
	•	HSN/SAC code
	•	Item description
	•	Rate
	•	Quantity
	•	Weight (KG)
	•	Addons
	•	Amount
	6.	Totals & Charges
	•	Amount
	•	Addon charges
	•	Express charges
	•	Discount
	•	SGST
	•	CGST
	•	TOTAL
	7.	Additional Info
	•	Item details (like Saree, Dress, etc. in second invoice)
	•	Website link
	•	Contact info
	•	Terms & Conditions
——


Here’s how the services and pricing are structured:

⸻

🔑 Service Categories
	1.	Laundry by Weight
	•	Wash & Fold → ₹59/kg (min. 5 kg)
	•	Wash & Iron → ₹89/kg (min. 5 kg)
	•	Steam Iron → ₹10/piece (min. 5 kg)
	•	Premium Laundry → ₹159/kg (standard items, heavy dresses excluded)
	2.	Laundry Add-ons
	•	Moth Proofing → ₹20/kg
	•	Antiseptic → ₹10/kg
	•	Stain Removal → ₹30/stain
	•	Starch → ₹25/piece
	•	Softener → ₹5/kg
	•	Extra Soiled → ₹10/kg
	•	Shoe Laundry → ₹149/pair
	•	Hanger Packing → ₹30/piece
	•	Shirt Packing → ₹15/piece
	•	Shoe Polish → custom
	3.	Home Linen & Household Items
	•	Bath Mat → ₹39
	•	Bath Robe Small → ₹49 | Big → ₹69
	•	Bath Towel → ₹49
	•	Bed Sheet Single → ₹99 (Iron only: ₹49)
	•	Bed Sheet Double/King → ₹159 (Iron only: ₹79)
	•	Blanket Single → ₹279 | Double/King → ₹359
	•	Quilt Single → ₹359 | Double/King → ₹439
	•	Cushion Cover Small → ₹59 (Iron only: ₹29)
	•	Pillow Cover Cotton → ₹39 | Embroidered → ₹79
	•	Curtains (per panel) → Without Lining ₹189 | With Lining ₹279
	4.	Clothing – Women
	•	Blouse/Top → ₹29
	•	Dress (Cotton) → ₹99 | Heavy Dress → ₹239+
	•	Skirt → ₹35–₹89 depending on type
	•	Saree (Cotton/Synthetic) → ₹159
	•	Saree (Silk/Heavy) → ₹239–₹279
	•	Saree (Embroidered/Heavy) → ₹299+
	•	Lehenga Sets → ₹159–₹599 depending on type
	•	Dupatta/Stole/Scarf → ₹49–₹79
	•	Petticoat → ₹69
	5.	Clothing – Men
	•	Shirt → ₹49
	•	T-Shirt → ₹25
	•	Jeans/Trousers → ₹79–₹89
	•	Kurta Pajama → Light ₹119 | Heavy ₹159–₹229
	•	Sherwani / Achkan → ₹299
	•	Waist Coat → ₹119
	•	Suit (2 Pc) → ₹189 | 3 Pc → ₹239
	•	Jacket/Coat → ₹139–₹199
	•	Overcoat → ₹289
	6.	Clothing – Kids
	•	Frock → ₹49
	•	Kurta + Pants/Dress → ₹119–₹239
	•	Sweater/Cardigan → ₹45–₹99
	•	Shorts/T-Shirt → ₹19–₹25
	7.	Other Items
	•	Stuff Toys → Small ₹99 | Medium ₹159 | Big ₹249
	•	Sofa Cover (per seat) → ₹99
	•	Table Cloth → Small ₹69 | Big ₹119
	•	Table Runner (Fancy) → ₹139
	•	Pram → ₹319
	•	Suitcase → Small ₹199 | Medium ₹319 | Big ₹399
	•	Shoes: Kids → ₹199 | Adults → ₹299–₹399 (depending on material)
	•	Carpet Cleaning → ₹20/sq. ft.

⸻

💡 Pricing Rules & Conditions
	•	Minimum load: 5 kg for weight-based laundry.
	•	Express/Urgent Delivery: +50% extra.
	•	Designer/High-end Fabrics: Case-by-case pricing.
	•	Damages: Limited liability (10× service charge or ₹3000, whichever lower).

⸻

👉 This structure means your app needs:
	1.	Categories (Laundry by Kg, Add-ons, Women/Men/Kids clothing, Household, Shoes/Bags, etc.)
	2.	Pricing Rules (per kg, per piece, min. load, surcharge for express, discounts).
	3.	Dynamic Items (Sarees, Dresses, Suits with different rates by type).

⸻


📱 App Flow (UI Mock)
	1.	Customer/Order Entry
	•	Enter or select existing customer
	•	Auto-fill store details
	2.	Add Services
	•	Select category (Laundry, Household, Clothing – Men/Women/Kids, Add-ons)
	•	Choose service item (e.g., “Wash & Fold”, “Saree Embroidered”)
	•	Enter qty / weight
	•	Auto-calc amount from price list
	3.	Add Add-ons
	•	(Optional) Select extras like stain removal, softener, express delivery
	4.	Charges & Summary
	•	Show subtotal
	•	Apply discount % or flat value
	•	Add GST (SGST + CGST auto-calculated)
	•	Show final total
	5.	Invoice Generation
	•	Generate PDF/print with:
	•	Customer details
	•	Store details
	•	Order + service table
	•	Charges, taxes, and total
	•	Terms & conditions

⸻

👉 With this setup:
	•	You can update service prices dynamically from the DB.
	•	The app automatically applies minimum loads (e.g. 5 kg rule).
	•	Add-ons and express delivery can be optional checkboxes.


—

Great question 👌 Since you want to handle all service types, pricing rules, discounts, add-ons, and invoices, we need a schema that is:
	•	Flexible (can handle by-weight, by-piece, or by-area pricing)
	•	Extensible (e.g. future services like bag cleaning, subscription plans)
	•	Audit-friendly (no overwriting old invoices, GST compliance)

Got it 👍 If you want to use SQLite (lightweight, file-based DB), the schema and calculation logic remain the same — we just adapt it for SQLite syntax.

Perfect 👍 let’s finalize a complete SQLite database schema for UCLEAN, updated with everything from invoices, services, add-ons, discounts, GST rules, audit-proofing, and extensibility.

Here’s the full schema:

⸻

Perfect ✅ Let’s do a fully finalized UCLEAN SQLite schema with:
	•	HSN/SAC codes in services
	•	Pre-populated service_variants for dynamic pricing (Sarees, Dresses, Lehenga Sets, etc.)
	•	Notes for subtotal/discount/add-on/express/total calculations
	•	Audit-friendly and GST-compliant

Here’s the complete schema + seed data:

⸻

🗄️ UCLEAN Finalized SQLite Schema

-- 1. Customers
CREATE TABLE customers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  phone TEXT,
  address TEXT
);

-- 2. Stores
CREATE TABLE stores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT UNIQUE,
  name TEXT,
  gstin TEXT,
  phone TEXT,
  address TEXT
);

-- 3. Invoices
CREATE TABLE invoices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_no TEXT UNIQUE NOT NULL,
  challan_id TEXT,
  customer_id INTEGER REFERENCES customers(id),
  store_id INTEGER REFERENCES stores(id),
  order_no TEXT,
  order_source TEXT, -- Walk-in, Pickup, Delivery
  order_datetime TEXT DEFAULT CURRENT_TIMESTAMP,
  pickup_datetime TEXT,
  delivery_datetime TEXT,
  discount REAL DEFAULT 0,
  discount_type TEXT DEFAULT 'flat', -- flat / percent
  express_charge REAL DEFAULT 0,
  subtotal REAL DEFAULT 0,
  sgst_amount REAL DEFAULT 0,
  cgst_amount REAL DEFAULT 0,
  igst_amount REAL DEFAULT 0,
  total REAL DEFAULT 0,
  gst_inclusive INTEGER DEFAULT 0, -- 0=Exclusive, 1=Inclusive
  status TEXT DEFAULT 'pending',
  notes TEXT
);

-- 4. Service Categories (hierarchical)
CREATE TABLE service_categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  parent_id INTEGER REFERENCES service_categories(id)
);

-- 5. Services (master price list)
CREATE TABLE services (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category_id INTEGER REFERENCES service_categories(id),
  name TEXT NOT NULL,
  description TEXT,
  hsn_sac_code TEXT,
  unit TEXT NOT NULL,        -- kg, piece, set, sqft, pair, stain
  base_price REAL NOT NULL,
  min_qty REAL DEFAULT 0,    -- e.g. 5kg rule
  gst_rate REAL DEFAULT 18.0,
  is_dynamic INTEGER DEFAULT 0,  -- 1=prices vary by type (e.g. Saree Heavy)
  is_active INTEGER DEFAULT 1
);

-- 6. Service Variants (for dynamic pricing)
CREATE TABLE service_variants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  service_id INTEGER REFERENCES services(id),
  variant_name TEXT NOT NULL,
  base_price REAL NOT NULL,
  gst_rate REAL DEFAULT 18.0,
  is_active INTEGER DEFAULT 1
);

-- 7. Invoice Items
CREATE TABLE invoice_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_id INTEGER REFERENCES invoices(id),
  service_id INTEGER REFERENCES services(id),
  variant_id INTEGER REFERENCES service_variants(id), -- optional
  description TEXT,
  qty REAL DEFAULT 1,
  weight_kg REAL,
  area_sqft REAL,
  rate REAL,             -- snapshot rate at invoice time
  amount REAL,           -- snapshot amount at invoice time
  gst_rate REAL DEFAULT 18.0,
  sgst REAL DEFAULT 0,
  cgst REAL DEFAULT 0
);

-- 8. Add-ons Master
CREATE TABLE addons (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  unit TEXT,
  price REAL NOT NULL,
  gst_rate REAL DEFAULT 18.0,
  is_active INTEGER DEFAULT 1
);

-- 9. Invoice Item Add-ons
CREATE TABLE invoice_item_addons (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_item_id INTEGER REFERENCES invoice_items(id),
  addon_id INTEGER REFERENCES addons(id),
  qty REAL DEFAULT 1,
  rate REAL,
  amount REAL
);

-- 10. Payments
CREATE TABLE payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_id INTEGER REFERENCES invoices(id),
  amount REAL NOT NULL,
  method TEXT,            -- cash, card, UPI, wallet
  txn_id TEXT,            -- reference/UTR number
  paid_on TEXT DEFAULT CURRENT_TIMESTAMP,
  status TEXT DEFAULT 'success' -- success/failed/pending
);

-- 11. Terms & Conditions
CREATE TABLE terms_conditions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  store_id INTEGER REFERENCES stores(id),
  content TEXT NOT NULL,
  is_active INTEGER DEFAULT 1
);

-- 12. Audit Log (immutable)
CREATE TABLE audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity TEXT NOT NULL,        -- invoice, payment, service
  entity_id INTEGER NOT NULL,
  action TEXT NOT NULL,        -- insert, update, delete
  old_value TEXT,
  new_value TEXT,
  changed_on TEXT DEFAULT CURRENT_TIMESTAMP
);


⸻

🧮 Triggers (unchanged logic but column names aligned)

-- Recalculate totals on INSERT, UPDATE, DELETE for invoice_items
-- subtotal = sum of (rate * qty)
-- SGST/CGST = (subtotal * gst_rate / 200)
-- total = subtotal + SGST + CGST + express_charge - discount
-- Note: discount & express_charge handled in app layer for flexibility

CREATE TRIGGER trg_invoice_items_insert
AFTER INSERT ON invoice_items
FOR EACH ROW
BEGIN
  UPDATE invoices
  SET subtotal = (SELECT IFNULL(SUM(rate * qty),0) FROM invoice_items WHERE invoice_id = NEW.invoice_id),
      sgst_amount = (SELECT IFNULL(SUM((rate * qty) * (gst_rate / 200.0)),0) FROM invoice_items WHERE invoice_id = NEW.invoice_id),
      cgst_amount = (SELECT IFNULL(SUM((rate * qty) * (gst_rate / 200.0)),0) FROM invoice_items WHERE invoice_id = NEW.invoice_id),
      total = (SELECT IFNULL(SUM(amount),0) FROM invoice_items WHERE invoice_id = NEW.invoice_id)
  WHERE id = NEW.invoice_id;
END;

CREATE TRIGGER trg_invoice_items_update
AFTER UPDATE ON invoice_items
FOR EACH ROW
BEGIN
  UPDATE invoices
  SET subtotal = (SELECT IFNULL(SUM(rate * qty),0) FROM invoice_items WHERE invoice_id = NEW.invoice_id),
      sgst_amount = (SELECT IFNULL(SUM((rate * qty) * (gst_rate / 200.0)),0) FROM invoice_items WHERE invoice_id = NEW.invoice_id),
      cgst_amount = (SELECT IFNULL(SUM((rate * qty) * (gst_rate / 200.0)),0) FROM invoice_items WHERE invoice_id = NEW.invoice_id),
      total = (SELECT IFNULL(SUM(amount),0) FROM invoice_items WHERE invoice_id = NEW.invoice_id)
  WHERE id = NEW.invoice_id;
END;

CREATE TRIGGER trg_invoice_items_delete
AFTER DELETE ON invoice_items
FOR EACH ROW
BEGIN
  UPDATE invoices
  SET subtotal = (SELECT IFNULL(SUM(rate * qty),0) FROM invoice_items WHERE invoice_id = OLD.invoice_id),
      sgst_amount = (SELECT IFNULL(SUM((rate * qty) * (gst_rate / 200.0)),0) FROM invoice_items WHERE invoice_id = OLD.invoice_id),
      cgst_amount = (SELECT IFNULL(SUM((rate * qty) * (gst_rate / 200.0)),0) FROM invoice_items WHERE invoice_id = OLD.invoice_id),
      total = (SELECT IFNULL(SUM(amount),0) FROM invoice_items WHERE invoice_id = OLD.invoice_id)
  WHERE id = OLD.invoice_id;
END;




⚡ Notes for App Calculation Logic
	1.	Subtotal / Discounts / Express / Add-ons / GST
	•	Subtotal = sum of invoice_items.amount + invoice_item_addons.amount
	•	Apply discount (flat or %) and add express charges
	•	Calculate GST:
	•	Exclusive: (subtotal - discount + express) * gst_rate/100
	•	Inclusive: Back out GST from total
	•	Store sgst and cgst per line item in invoice_items and sum in invoices.
	2.	Minimum Quantity Enforcement
	•	For weight-based services, enforce qty >= min_qty in app before invoice creation.
	3.	Dynamic Pricing
	•	Select variant_id for dynamic items, auto-set rate = service_variants.base_price at invoice time.
	4.	HSN/SAC
	•	Display hsn_sac_code in invoice for GST compliance.

⸻

⸻

⸻

✅   in This Schema
	•	discount_type → supports both flat and % discounts.
	•	subtotal column in invoices → keeps snapshot before tax/discount.
	•	is_dynamic in services → handles variable pricing (e.g. Saree Cotton vs. Saree Embroidered).
	•	payments table → supports multiple payment modes and part-payments.
	•	terms_conditions table → configurable per store (different branches may have different T&C).
	•	audit_log table → ensures GST/audit compliance (no silent overwrites).
	•	notes field in invoices → optional remarks.

⸻

👉 This schema is audit-friendly, GST-compliant, and extensible (can handle new services, subscription plans, loyalty points, etc.).

⸻Got it 👍
Since you are building an invoice generation app with services and GST handling, here’s a complete SQL seed data script with INSERT statements for all core tables (services, customers, invoices, invoice_items, taxes).

This is compatible with SQLite.

Perfect 👍
Since you’re using SQLite, we can use a trigger to automatically recalculate invoices.total_amount whenever items are inserted, updated, or deleted in invoice_items.



⚡ How this works:
	1.	Insert new item → trigger adds its total to invoices.total_amount.
	2.	Update item → trigger recalculates invoice total.
	3.	Delete item → trigger recalculates invoice total without the deleted item.

⸻



🧮 GST Calculation in SQLite

SQLite doesn’t support stored procedures like PostgreSQL, so you’ll calculate GST in your application code (Python, Node.js, Flutter, etc.) using the algorithm:

Case A: GST Exclusive

-- pseudo query
SELECT 
  (subtotal - discount + express_charge) AS base_amount,
  ROUND(((subtotal - discount + express_charge) * gst_rate / 100) / 2, 2) AS sgst,
  ROUND(((subtotal - discount + express_charge) * gst_rate / 100) / 2, 2) AS cgst,
  ROUND((subtotal - discount + express_charge) * (1 + gst_rate/100), 2) AS total

Case B: GST Inclusive

-- pseudo query
SELECT 
  ROUND((gross_amount - discount + express_charge) / (1 + gst_rate/100), 2) AS base_amount,
  ROUND(((gross_amount - discount + express_charge) - ((gross_amount - discount + express_charge) / (1 + gst_rate/100))) / 2, 2) AS sgst,
  ROUND(((gross_amount - discount + express_charge) - ((gross_amount - discount + express_charge) / (1 + gst_rate/100))) / 2, 2) AS cgst,
  (gross_amount - discount + express_charge) AS total


⸻

⚡ Key Notes
	•	Store gst_inclusive as 0/1 flag in invoices.
	•	Do GST math in app code (Python, Java, Flutter, etc.), not inside SQLite (to avoid complexity).
	•	Always store final snapshot values (rate, sgst, cgst, total) in invoice_items + invoices, even if prices change later.



⸻

🔹 3. UI Design Suggestion

When creating invoice in app:
	•	Show a toggle:
	•	Prices exclude GST (add GST separately)
	•	Prices include GST (GST auto-backed out)

App calculates accordingly and shows a GST breakup (mandatory under GST laws).

⸻

🔹 4. Compliance Note
	•	Invoices must always show tax split (SGST/CGST), even if GST is “inclusive”.
	•	So your PDF should show:
	•	Item subtotal
	•	SGST + CGST
	•	Grand total (same as gross if inclusive).

⸻

 Let’s define the calculation algorithm for both GST Exclusive and GST Inclusive cases.


🖥️ UI Flow

When creating invoice → User selects:
	•	Exclude GST (add separately)
	•	Include GST (already in price)

Backend calls function or runs logic accordingly → Invoice generated with SGST + CGST split.

⸻


Awesome 🚀 Let’s prepare SQLite seed data for the Mussoorie Road price list you shared.

I’ll give you SQL INSERT scripts that you can run directly in your SQLite DB after creating the schema we finalized.

Perfect! I’ve reviewed your seed data and can now provide a complete, fully structured seed script for SQLite including:
	•	service_categories
	•	services (all categories: Laundry, Premium Laundry, Laundry Add-ons, Men/Women/Kids Dry Cleaning, Household, Shoes & Bags, Carpet & Sofa)
	•	service_variants for dynamic pricing items like Sarees, Dresses, Lehenga, Kurta Pajama sets

Here’s the full seed data you can run directly in SQLite:

⸻

🗂️ 1. Service Categories

INSERT INTO service_categories (name) VALUES
('Laundry'),
('Premium Laundry'),
('Laundry Add-ons'),
('Dry Cleaning - Men'),
('Dry Cleaning - Women'),
('Dry Cleaning - Kids'),
('Household Items'),
('Shoes & Bags'),
('Carpet & Sofa Cleaning');


⸻

🧺 2. Laundry Services

INSERT INTO services (category_id, name, unit, base_price, min_qty, gst_rate) VALUES
(1, 'Wash & Fold', 'kg', 59, 5, 18),
(1, 'Wash & Iron', 'kg', 89, 5, 18),
(1, 'Steam Iron', 'piece', 10, 5, 18),
(2, 'Premium Laundry', 'kg', 159, 0, 18);


⸻

➕ 3. Laundry Add-ons

INSERT INTO services (category_id, name, unit, base_price, gst_rate) VALUES
(3, 'Moth Proofing', 'kg', 20, 18),
(3, 'Antiseptic', 'kg', 10, 18),
(3, 'Stain Removal', 'stain', 30, 18),
(3, 'Starch', 'piece', 25, 18),
(3, 'Softener', 'kg', 5, 18),
(3, 'Extra Soiled', 'kg', 10, 18),
(3, 'Shoe Laundry', 'pair', 149, 18),
(3, 'Hanger Packing', 'piece', 30, 18),
(3, 'Shirt Packing', 'piece', 15, 18),
(3, 'Shoe Polish', 'pair', 0, 18); -- price on demand


⸻

🏠 4. Household Items

INSERT INTO services (category_id, name, unit, base_price, gst_rate) VALUES
(7, 'Bath Mat', 'piece', 39, 18),
(7, 'Bath Robe Small', 'piece', 49, 18),
(7, 'Bath Robe Big', 'piece', 69, 18),
(7, 'Bath Towel', 'piece', 49, 18),
(7, 'Bed Sheet Single', 'piece', 99, 18),
(7, 'Bed Sheet Double/King', 'piece', 159, 18),
(7, 'Blanket Single', 'piece', 279, 18),
(7, 'Blanket Double/King', 'piece', 359, 18),
(7, 'Quilt Single', 'piece', 359, 18),
(7, 'Quilt Double/King', 'piece', 439, 18),
(7, 'Curtain Without Lining (per panel)', 'piece', 189, 18),
(7, 'Curtain With Lining (per panel)', 'piece', 279, 18),
(7, 'Sofa Cover Per Seat', 'piece', 99, 18),
(7, 'Carpet Cleaning', 'sqft', 20, 18);


⸻

👔 5. Men’s Dry Cleaning

INSERT INTO services (category_id, name, unit, base_price, gst_rate) VALUES
(4, 'Shirt', 'piece', 49, 18),
(4, 'T-Shirt', 'piece', 25, 18),
(4, 'Jeans / Pants', 'piece', 79, 18),
(4, 'Kurta Pajama (Light)', 'set', 119, 18),
(4, 'Kurta Pajama (Heavy)', 'set', 159, 18),
(4, 'Suit 2 Pc', 'set', 189, 18),
(4, 'Suit 3 Pc', 'set', 239, 18),
(4, 'Sherwani / Achkan', 'piece', 299, 18),
(4, 'Overcoat', 'piece', 289, 18);


⸻

👗 6. Women’s Dry Cleaning

INSERT INTO services (category_id, name, unit, base_price, gst_rate, is_dynamic) VALUES
(5, 'Blouse/Top', 'piece', 29, 18, 0),
(5, 'Dress (Cotton)', 'piece', 99, 18, 0),
(5, 'Dress (Heavy)', 'piece', 239, 18, 1),
(5, 'Saree', 'piece', 159, 18, 1),
(5, 'Lehenga + Dupatta', 'set', 599, 18, 1),
(5, 'Dupatta / Scarf', 'piece', 49, 18, 0);


⸻

🧒 7. Kids’ Dry Cleaning

INSERT INTO services (category_id, name, unit, base_price, gst_rate) VALUES
(6, 'Frock', 'piece', 49, 18),
(6, 'Kurta + Pants/Salwar/Churidar + Dupatta', 'set', 119, 18),
(6, 'Sweater (Sleeveless)', 'piece', 45, 18),
(6, 'Sweater (Full Sleeves)', 'piece', 49, 18),
(6, 'T-Shirt', 'piece', 25, 18),
(6, 'Shorts', 'piece', 19, 18);


⸻

👟 8. Shoes & Bags

INSERT INTO services (category_id, name, unit, base_price, gst_rate) VALUES
(8, 'Shoes (Kids)', 'pair', 199, 18),
(8, 'Shoes (Adult - Cotton/Synthetic)', 'pair', 299, 18),
(8, 'Shoes (Adult - Silk/Velvet/Jute)', 'pair', 399, 18),
(8, 'Suitcase Small', 'piece', 199, 18),
(8, 'Suitcase Medium', 'piece', 319, 18),
(8, 'Suitcase Big', 'piece', 399, 18),
(8, 'Bag Cleaning', 'piece', 0, 18); -- case-to-case


⸻

🧵 9. Dynamic Variants (Women’s Saree / Dress / Lehenga)

-- Saree Variants
INSERT INTO service_variants (service_id, variant_name, base_price, gst_rate) VALUES
((SELECT id FROM services WHERE name='Saree'),'Cotton/Synthetic',159,18),
((SELECT id FROM services WHERE name='Saree'),'Silk/Chiffon/Georgette',239,18),
((SELECT id FROM services WHERE name='Saree'),'Embroidered/Heavy',299,18);

-- Dress Variants
INSERT INTO service_variants (service_id, variant_name, base_price, gst_rate) VALUES
((SELECT id FROM services WHERE name='Dress (Heavy)'),'Cotton',239,18),
((SELECT id FROM services WHERE name='Dress (Heavy)'),'Silk/Velvet',299,18);

-- Lehenga Variants
INSERT INTO service_variants (service_id, variant_name, base_price, gst_rate) VALUES
((SELECT id FROM services WHERE name='Lehenga + Dupatta'),'Regular',599,18),
((SELECT id FROM services WHERE name='Lehenga + Dupatta'),'Designer/Heavy',799,18);


⸻Option A: Tauri (Recommended)
	•	Frontend: React / Next.js
	•	Backend: Rust (Tauri API)
	•	Database: rusqlite
	•	How it works:
	1.	Rust handles SQLite DB directly on your filesystem.
	2.	React UI calls Rust functions via Tauri API (like invoke("insert_invoice", {...})).
	3.	All data is persisted locally — you can copy the .sqlite file for backups.
	4.	Runs as a lightweight desktop app, but can also open in a browser within the Tauri window.

✅ Pros: native filesystem access, lightweight, secure, no separate server required.

=======




Perfect! Since you want a desktop + browser-like local app for UCLEAN, I’ve drafted a full UI/UX flow with screens optimized for your invoice generation, services, add-ons, and GST handling. The flow works for Tauri + React + rusqlite (local SQLite DB).

⸻

UCLEAN Desktop/Browser App – UI Flow & Screens

⸻

1️⃣ Login / Authentication Screen

Purpose: Secure access to the app (optional for single-user).
Fields & Actions:
	•	Username / Password
	•	Login button
	•	Remember me checkbox
	•	Forgot password link (optional)

Notes: Can be skipped for single-machine deployment; add later for multi-user security.

⸻

2️⃣ Dashboard / Home Screen

Purpose: Overview of app functions.
Sections:
	•	Quick action buttons:
	•	New Invoice
	•	View Invoices
	•	Customers
	•	Stores
	•	Services & Pricing
	•	Reports & Analytics
	•	Backup & Restore DB
	•	Recent activity table (last 5–10 invoices)
	•	Notifications / Alerts (e.g., express deliveries, pending payments)

Notes: Use cards for each module; lightweight and responsive.

⸻

3️⃣ Customers Screen

Purpose: Manage customer master data.
Features:
	•	Customer List Table: Name, Phone, Address
	•	Search / Filter by name / phone
	•	Add/Edit Customer Modal:
	•	Name
	•	Phone
	•	Address
	•	Delete customer (with confirmation)

⸻

4️⃣ Stores Screen

Purpose: Manage store/branch info.
Fields:
	•	Store Code
	•	Store Name
	•	GSTIN
	•	Phone
	•	Address
	•	T&C (link to terms_conditions table)

Actions: Add / Edit / Delete store

⸻

5️⃣ Services & Pricing Screen

Purpose: Master list of services, categories, and dynamic variants.
Components:
	•	Category Sidebar (Laundry, Add-ons, Men/Women/Kids, Household, Shoes/Bags, Carpet/Sofa)
	•	Service List Table:
	•	Service Name
	•	Unit (kg, piece, set)
	•	Base Price
	•	Min Qty
	•	GST (%)
	•	Dynamic (Yes/No)
	•	Edit / Delete service
	•	Add Service Modal
	•	Manage Variants Modal (for dynamic services like Saree)

⸻

6️⃣ Add-ons Screen

Purpose: Manage laundry add-ons.
Fields:
	•	Name
	•	Unit
	•	Price
	•	GST
	•	Active/Inactive
Actions: Add/Edit/Delete

⸻

7️⃣ New Invoice Screen

Purpose: Create new invoice with service items, add-ons, and charges.

Sections & Flow:

Step 1: Select Customer & Store
	•	Select existing customer or add new
	•	Select store branch (auto-fill GSTIN & address)
	•	Show order source: Walk-in / Pickup / Delivery
	•	Order DateTime, Pickup DateTime, Delivery DateTime

⸻

Step 2: Add Services
	•	Select category → service list appears
	•	Choose service
	•	Input quantity / weight / area
	•	For dynamic service → select variant
	•	Add multiple services
	•	Auto-calc line item amount & GST snapshot

⸻

Step 3: Add Add-ons (Optional)
	•	Select applicable add-ons
	•	Enter quantity
	•	Auto-calc add-on amount & GST

⸻

Step 4: Charges & Summary
	•	Display table:
	•	Subtotal (services + add-ons)
	•	Express charge (if selected)
	•	Discount → Flat or % (toggle)
	•	GST → SGST + CGST (auto-calculated)
	•	Total
	•	Toggle: GST Inclusive / Exclusive
	•	Notes field for invoice remarks

⸻

Step 5: Payment & Finalize
	•	Payment section:
	•	Amount paid
	•	Payment method (Cash, Card, UPI, Wallet)
	•	Transaction reference (optional)
	•	Save & Generate Invoice → Creates PDF & stores snapshot in SQLite

⸻

8️⃣ Invoice List / Search Screen

Purpose: View past invoices and perform operations.
	•	Table columns: Invoice No, Customer, Date, Total, Status
	•	Search by invoice number / customer / date
	•	Actions per invoice:
	•	View PDF / Print
	•	Edit (if allowed)
	•	Delete
	•	Filter by pending/paid

⸻

9️⃣ Reports / Analytics Screen

Purpose: Quick metrics & charts.
	•	Total sales by day/week/month
	•	GST summary (SGST, CGST, IGST)
	•	Express delivery summary
	•	Customer-wise revenue

⸻

🔟 Backup & Restore DB Screen

Purpose: Ensure filesystem persistence & backup.
	•	Backup button → Save .sqlite DB file anywhere
	•	Restore button → Load .sqlite file
	•	Auto-backup option (daily/weekly)

⸻

UI Notes
	•	Use React + Tailwind CSS for responsive, clean interface
	•	Tauri window → lightweight desktop wrapper
	•	PDF generation → jsPDF or pdf-lib
	•	Local SQLite → rusqlite (Rust) for persistent DB
	•	All CRUD operations via Tauri invoke API

⸻




