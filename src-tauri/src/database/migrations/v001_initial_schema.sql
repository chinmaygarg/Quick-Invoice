-- UCLEAN Database Schema v001
-- Initial schema migration
-- SQLite database for invoice generation system

-- Enable foreign key constraints
PRAGMA foreign_keys = ON;

-- 1. Customers table
CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    address TEXT,
    notes TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 2. Stores table
CREATE TABLE IF NOT EXISTS stores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT,
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    city TEXT,
    state TEXT,
    pincode TEXT,
    phone TEXT,
    email TEXT,
    gstin TEXT,
    pan_number TEXT,
    owner_name TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 3. Service categories table (hierarchical)
CREATE TABLE IF NOT EXISTS service_categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    parent_id INTEGER REFERENCES service_categories(id),
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 4. Services table (master price list)
CREATE TABLE IF NOT EXISTS services (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category TEXT,
    category_id INTEGER REFERENCES service_categories(id),
    description TEXT,
    base_price REAL NOT NULL,
    gst_rate REAL DEFAULT 18.0,
    unit TEXT NOT NULL, -- kg, piece, set, sqft, pair, stain
    min_quantity INTEGER DEFAULT 1, -- minimum quantity (e.g., 5kg rule)
    hsn_sac_code TEXT,
    is_dynamic INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 5. Service variants table (for dynamic pricing)
CREATE TABLE IF NOT EXISTS service_variants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    service_id INTEGER NOT NULL REFERENCES services(id),
    name TEXT NOT NULL,
    description TEXT,
    price_multiplier REAL NOT NULL DEFAULT 1.0,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 6. Service add-ons table
CREATE TABLE IF NOT EXISTS service_addons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    service_id INTEGER NOT NULL REFERENCES services(id),
    name TEXT NOT NULL,
    description TEXT,
    price REAL NOT NULL,
    unit TEXT NOT NULL, -- kg, piece, stain, order
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 7. Invoices table
CREATE TABLE IF NOT EXISTS invoices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_no TEXT UNIQUE NOT NULL,
    challan_id TEXT,
    customer_id INTEGER NOT NULL REFERENCES customers(id),
    store_id INTEGER NOT NULL REFERENCES stores(id),
    order_no TEXT,
    order_source TEXT DEFAULT 'WALK-IN', -- WALK-IN, PICKUP, DELIVERY
    order_datetime TEXT DEFAULT CURRENT_TIMESTAMP,
    pickup_datetime TEXT,
    delivery_datetime TEXT,

    -- Financial calculations
    subtotal REAL DEFAULT 0,
    discount REAL DEFAULT 0,
    discount_type TEXT DEFAULT 'flat', -- flat, percent
    express_charge REAL DEFAULT 0,
    sgst_amount REAL DEFAULT 0,
    cgst_amount REAL DEFAULT 0,
    igst_amount REAL DEFAULT 0,
    total REAL DEFAULT 0,

    -- GST settings
    gst_inclusive INTEGER DEFAULT 0, -- 0=Exclusive, 1=Inclusive

    -- Payment tracking
    payment_method TEXT, -- cash, card, upi, bank_transfer, credit, partial
    payment_amount REAL DEFAULT 0,

    -- Piece tracking
    total_pieces INTEGER DEFAULT 0,

    -- Status and tracking
    status TEXT DEFAULT 'pending', -- pending, in-progress, completed, paid, cancelled
    notes TEXT,

    -- Audit fields
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 8. Invoice items table
CREATE TABLE IF NOT EXISTS invoice_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_id INTEGER NOT NULL REFERENCES invoices(id),
    service_id INTEGER NOT NULL REFERENCES services(id),
    variant_id INTEGER REFERENCES service_variants(id), -- optional for dynamic services
    description TEXT,
    qty REAL DEFAULT 1,
    piece_count INTEGER DEFAULT 0, -- number of individual pieces/garments
    weight_kg REAL,
    area_sqft REAL,
    rate REAL NOT NULL, -- snapshot rate at invoice time
    amount REAL NOT NULL, -- snapshot amount at invoice time
    gst_rate REAL DEFAULT 18.0,
    sgst REAL DEFAULT 0,
    cgst REAL DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 9. Invoice item add-ons table
CREATE TABLE IF NOT EXISTS invoice_item_addons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_item_id INTEGER NOT NULL REFERENCES invoice_items(id),
    addon_id INTEGER NOT NULL REFERENCES service_addons(id),
    qty REAL DEFAULT 1,
    rate REAL NOT NULL,
    amount REAL NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 10. Payments table
CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_id INTEGER NOT NULL REFERENCES invoices(id),
    amount REAL NOT NULL,
    method TEXT, -- cash, card, upi, wallet
    txn_id TEXT, -- transaction/reference number
    paid_on TEXT DEFAULT CURRENT_TIMESTAMP,
    status TEXT DEFAULT 'success', -- success, failed, pending
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 11. Terms & conditions table
CREATE TABLE IF NOT EXISTS terms_conditions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    store_id INTEGER NOT NULL REFERENCES stores(id),
    content TEXT NOT NULL,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 12. Audit log table (immutable)
CREATE TABLE IF NOT EXISTS audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entity TEXT NOT NULL, -- invoice, payment, service, etc.
    entity_id INTEGER NOT NULL,
    action TEXT NOT NULL, -- insert, update, delete
    old_value TEXT,
    new_value TEXT,
    changed_on TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 13. Clothing tags table
CREATE TABLE IF NOT EXISTS clothing_tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_id INTEGER NOT NULL REFERENCES invoices(id),
    invoice_item_id INTEGER NOT NULL REFERENCES invoice_items(id),
    tag_number INTEGER NOT NULL, -- Service-level piece number (1 of 12)
    total_quantity INTEGER NOT NULL, -- Total pieces for this service item
    overall_piece_number INTEGER NOT NULL, -- Overall invoice piece number (1 of 30)
    total_invoice_pieces INTEGER NOT NULL, -- Total pieces in entire invoice
    tag_code TEXT NOT NULL, -- Unique tag identifier (UC634-0136-1-3)
    printed_at TEXT,
    printed_by TEXT,
    reprint_count INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(invoice_item_id, tag_number)
);

-- 14. Tag settings table
CREATE TABLE IF NOT EXISTS tag_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    store_id INTEGER REFERENCES stores(id),
    roll_width TEXT DEFAULT '40mm', -- 32mm, 40mm, 50mm
    auto_print INTEGER DEFAULT 0,
    printer_name TEXT,
    template_style TEXT DEFAULT 'standard', -- standard, compact
    include_barcode INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);

CREATE INDEX IF NOT EXISTS idx_invoices_customer_id ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_store_id ON invoices(store_id);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_no ON invoices(invoice_no);
CREATE INDEX IF NOT EXISTS idx_invoices_order_datetime ON invoices(order_datetime);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);

CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_service_id ON invoice_items(service_id);

CREATE INDEX IF NOT EXISTS idx_payments_invoice_id ON payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_paid_on ON payments(paid_on);

CREATE INDEX IF NOT EXISTS idx_services_category ON services(category);
CREATE INDEX IF NOT EXISTS idx_services_active ON services(is_active);

CREATE INDEX IF NOT EXISTS idx_service_variants_service_id ON service_variants(service_id);

CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON audit_log(entity, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_changed_on ON audit_log(changed_on);

CREATE INDEX IF NOT EXISTS idx_clothing_tags_invoice_id ON clothing_tags(invoice_id);
CREATE INDEX IF NOT EXISTS idx_clothing_tags_invoice_item_id ON clothing_tags(invoice_item_id);
CREATE INDEX IF NOT EXISTS idx_clothing_tags_tag_code ON clothing_tags(tag_code);
CREATE INDEX IF NOT EXISTS idx_clothing_tags_printed_at ON clothing_tags(printed_at);

CREATE INDEX IF NOT EXISTS idx_tag_settings_store_id ON tag_settings(store_id);

-- Triggers for automatic invoice calculation
CREATE TRIGGER IF NOT EXISTS trg_invoice_items_insert
AFTER INSERT ON invoice_items
FOR EACH ROW
BEGIN
    UPDATE invoices
    SET
        subtotal = (
            SELECT COALESCE(SUM(amount), 0)
            FROM invoice_items
            WHERE invoice_id = NEW.invoice_id
        ),
        sgst_amount = (
            SELECT COALESCE(SUM(sgst), 0)
            FROM invoice_items
            WHERE invoice_id = NEW.invoice_id
        ),
        cgst_amount = (
            SELECT COALESCE(SUM(cgst), 0)
            FROM invoice_items
            WHERE invoice_id = NEW.invoice_id
        ),
        total = (
            SELECT COALESCE(SUM(amount), 0) + COALESCE(SUM(sgst), 0) + COALESCE(SUM(cgst), 0)
            FROM invoice_items
            WHERE invoice_id = NEW.invoice_id
        ) + COALESCE(express_charge, 0) - COALESCE(discount, 0),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.invoice_id;
END;

CREATE TRIGGER IF NOT EXISTS trg_invoice_items_update
AFTER UPDATE ON invoice_items
FOR EACH ROW
BEGIN
    UPDATE invoices
    SET
        subtotal = (
            SELECT COALESCE(SUM(amount), 0)
            FROM invoice_items
            WHERE invoice_id = NEW.invoice_id
        ),
        sgst_amount = (
            SELECT COALESCE(SUM(sgst), 0)
            FROM invoice_items
            WHERE invoice_id = NEW.invoice_id
        ),
        cgst_amount = (
            SELECT COALESCE(SUM(cgst), 0)
            FROM invoice_items
            WHERE invoice_id = NEW.invoice_id
        ),
        total = (
            SELECT COALESCE(SUM(amount), 0) + COALESCE(SUM(sgst), 0) + COALESCE(SUM(cgst), 0)
            FROM invoice_items
            WHERE invoice_id = NEW.invoice_id
        ) + COALESCE(express_charge, 0) - COALESCE(discount, 0),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.invoice_id;
END;

CREATE TRIGGER IF NOT EXISTS trg_invoice_items_delete
AFTER DELETE ON invoice_items
FOR EACH ROW
BEGIN
    UPDATE invoices
    SET
        subtotal = (
            SELECT COALESCE(SUM(amount), 0)
            FROM invoice_items
            WHERE invoice_id = OLD.invoice_id
        ),
        sgst_amount = (
            SELECT COALESCE(SUM(sgst), 0)
            FROM invoice_items
            WHERE invoice_id = OLD.invoice_id
        ),
        cgst_amount = (
            SELECT COALESCE(SUM(cgst), 0)
            FROM invoice_items
            WHERE invoice_id = OLD.invoice_id
        ),
        total = (
            SELECT COALESCE(SUM(amount), 0) + COALESCE(SUM(sgst), 0) + COALESCE(SUM(cgst), 0)
            FROM invoice_items
            WHERE invoice_id = OLD.invoice_id
        ) + COALESCE(express_charge, 0) - COALESCE(discount, 0),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = OLD.invoice_id;
END;

-- Audit triggers
CREATE TRIGGER IF NOT EXISTS trg_audit_customers_update
AFTER UPDATE ON customers
FOR EACH ROW
BEGIN
    INSERT INTO audit_log (entity, entity_id, action, old_value, new_value)
    VALUES ('customer', NEW.id, 'update',
            json_object('name', OLD.name, 'phone', OLD.phone, 'address', OLD.address),
            json_object('name', NEW.name, 'phone', NEW.phone, 'address', NEW.address)
    );
END;

CREATE TRIGGER IF NOT EXISTS trg_audit_invoices_update
AFTER UPDATE ON invoices
FOR EACH ROW
BEGIN
    INSERT INTO audit_log (entity, entity_id, action, old_value, new_value)
    VALUES ('invoice', NEW.id, 'update',
            json_object('status', OLD.status, 'total', OLD.total),
            json_object('status', NEW.status, 'total', NEW.total)
    );
END;

-- Triggers for updating total_pieces in invoices
CREATE TRIGGER IF NOT EXISTS trg_update_invoice_total_pieces
AFTER INSERT ON invoice_items
FOR EACH ROW
BEGIN
    UPDATE invoices
    SET total_pieces = (
        SELECT COALESCE(SUM(piece_count), 0)
        FROM invoice_items
        WHERE invoice_id = NEW.invoice_id
    )
    WHERE id = NEW.invoice_id;
END;

CREATE TRIGGER IF NOT EXISTS trg_update_invoice_total_pieces_on_update
AFTER UPDATE ON invoice_items
FOR EACH ROW
BEGIN
    UPDATE invoices
    SET total_pieces = (
        SELECT COALESCE(SUM(piece_count), 0)
        FROM invoice_items
        WHERE invoice_id = NEW.invoice_id
    )
    WHERE id = NEW.invoice_id;
END;

CREATE TRIGGER IF NOT EXISTS trg_update_invoice_total_pieces_on_delete
AFTER DELETE ON invoice_items
FOR EACH ROW
BEGIN
    UPDATE invoices
    SET total_pieces = (
        SELECT COALESCE(SUM(piece_count), 0)
        FROM invoice_items
        WHERE invoice_id = OLD.invoice_id
    )
    WHERE id = OLD.invoice_id;
END;