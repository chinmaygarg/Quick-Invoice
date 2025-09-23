-- Migration 001: Add piece count tracking columns
-- This migration adds the piece_count column to invoice_items and total_pieces to invoices,
-- along with the clothing_tags table for piece-based tag generation

-- Add piece_count column to invoice_items table
ALTER TABLE invoice_items ADD COLUMN piece_count INTEGER DEFAULT 0;

-- Add total_pieces column to invoices table
ALTER TABLE invoices ADD COLUMN total_pieces INTEGER DEFAULT 0;

-- Create clothing_tags table for piece-based tag generation
CREATE TABLE IF NOT EXISTS clothing_tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_id INTEGER NOT NULL REFERENCES invoices(id),
    invoice_item_id INTEGER NOT NULL REFERENCES invoice_items(id),
    tag_number INTEGER NOT NULL,
    total_quantity INTEGER NOT NULL,
    overall_piece_number INTEGER NOT NULL,
    total_invoice_pieces INTEGER NOT NULL,
    tag_code TEXT NOT NULL,
    printed_at TEXT,
    printed_by TEXT,
    reprint_count INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Create indices for clothing_tags
CREATE INDEX IF NOT EXISTS idx_clothing_tags_invoice_id ON clothing_tags(invoice_id);
CREATE INDEX IF NOT EXISTS idx_clothing_tags_invoice_item_id ON clothing_tags(invoice_item_id);
CREATE INDEX IF NOT EXISTS idx_clothing_tags_tag_code ON clothing_tags(tag_code);

-- Create tag_settings table for tag configuration
CREATE TABLE IF NOT EXISTS tag_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    store_id INTEGER REFERENCES stores(id),
    roll_width TEXT DEFAULT '62mm',
    auto_print INTEGER DEFAULT 0,
    printer_name TEXT,
    template_style TEXT DEFAULT 'basic',
    include_barcode INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Create trigger to update total_pieces in invoices when invoice_items are updated
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

-- Create trigger to update total_pieces when invoice_items are updated
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

-- Create trigger to update total_pieces when invoice_items are deleted
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