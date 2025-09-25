-- UCLEAN Database Schema v002
-- GST Calculation Fixes Migration
-- Fixes existing data to comply with Indian GST law

-- Recalculate GST amounts for all existing invoices with proper proportional distribution

-- Step 1: Add a temporary column to track original amounts
ALTER TABLE invoice_items ADD COLUMN original_sgst REAL;
ALTER TABLE invoice_items ADD COLUMN original_cgst REAL;

-- Step 2: Store original GST amounts
UPDATE invoice_items SET
    original_sgst = sgst,
    original_cgst = cgst;

-- Step 3: Recalculate GST for GST exclusive invoices
-- This fixes the discrepancy where discounts and express charges weren't properly distributed

UPDATE invoice_items SET
    sgst = ROUND(
        CASE
            WHEN i.gst_inclusive = 0 THEN
                -- For GST exclusive: apply proportional adjustment
                (original_sgst *
                 CASE WHEN i.subtotal > 0
                      THEN (i.subtotal - i.discount + i.express_charge) / i.subtotal
                      ELSE 1.0
                 END)
            ELSE
                -- For GST inclusive: keep original
                original_sgst
        END, 2),
    cgst = ROUND(
        CASE
            WHEN i.gst_inclusive = 0 THEN
                -- For GST exclusive: apply proportional adjustment
                (original_cgst *
                 CASE WHEN i.subtotal > 0
                      THEN (i.subtotal - i.discount + i.express_charge) / i.subtotal
                      ELSE 1.0
                 END)
            ELSE
                -- For GST inclusive: keep original
                original_cgst
        END, 2)
FROM invoices i
WHERE invoice_items.invoice_id = i.id;

-- Step 4: Recalculate invoice-level GST totals
UPDATE invoices SET
    sgst_amount = (
        SELECT COALESCE(SUM(sgst), 0)
        FROM invoice_items
        WHERE invoice_id = invoices.id
    ),
    cgst_amount = (
        SELECT COALESCE(SUM(cgst), 0)
        FROM invoice_items
        WHERE invoice_id = invoices.id
    );

-- Step 5: Recalculate invoice totals with proper GST compliance
UPDATE invoices SET
    total = CASE
        WHEN gst_inclusive = 1 THEN
            -- For GST inclusive: total includes GST
            subtotal - discount + express_charge
        ELSE
            -- For GST exclusive: add GST to taxable amount
            (subtotal - discount + express_charge) + sgst_amount + cgst_amount
    END;

-- Step 6: Clean up temporary columns
ALTER TABLE invoice_items DROP COLUMN original_sgst;
ALTER TABLE invoice_items DROP COLUMN original_cgst;

-- Step 7: Update database triggers to use the new GST calculation logic
-- Drop existing triggers
DROP TRIGGER IF EXISTS trg_invoice_items_insert;
DROP TRIGGER IF EXISTS trg_invoice_items_update;
DROP TRIGGER IF EXISTS trg_invoice_items_delete;

-- Create new triggers with improved GST calculation
CREATE TRIGGER IF NOT EXISTS trg_invoice_items_insert_v2
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
        total = CASE
            WHEN gst_inclusive = 1 THEN
                (SELECT COALESCE(SUM(amount), 0) FROM invoice_items WHERE invoice_id = NEW.invoice_id)
                - COALESCE(discount, 0) + COALESCE(express_charge, 0)
            ELSE
                (SELECT COALESCE(SUM(amount), 0) FROM invoice_items WHERE invoice_id = NEW.invoice_id)
                - COALESCE(discount, 0) + COALESCE(express_charge, 0)
                + (SELECT COALESCE(SUM(sgst), 0) FROM invoice_items WHERE invoice_id = NEW.invoice_id)
                + (SELECT COALESCE(SUM(cgst), 0) FROM invoice_items WHERE invoice_id = NEW.invoice_id)
        END,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.invoice_id;
END;

CREATE TRIGGER IF NOT EXISTS trg_invoice_items_update_v2
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
        total = CASE
            WHEN gst_inclusive = 1 THEN
                (SELECT COALESCE(SUM(amount), 0) FROM invoice_items WHERE invoice_id = NEW.invoice_id)
                - COALESCE(discount, 0) + COALESCE(express_charge, 0)
            ELSE
                (SELECT COALESCE(SUM(amount), 0) FROM invoice_items WHERE invoice_id = NEW.invoice_id)
                - COALESCE(discount, 0) + COALESCE(express_charge, 0)
                + (SELECT COALESCE(SUM(sgst), 0) FROM invoice_items WHERE invoice_id = NEW.invoice_id)
                + (SELECT COALESCE(SUM(cgst), 0) FROM invoice_items WHERE invoice_id = NEW.invoice_id)
        END,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.invoice_id;
END;

CREATE TRIGGER IF NOT EXISTS trg_invoice_items_delete_v2
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
        total = CASE
            WHEN gst_inclusive = 1 THEN
                (SELECT COALESCE(SUM(amount), 0) FROM invoice_items WHERE invoice_id = OLD.invoice_id)
                - COALESCE(discount, 0) + COALESCE(express_charge, 0)
            ELSE
                (SELECT COALESCE(SUM(amount), 0) FROM invoice_items WHERE invoice_id = OLD.invoice_id)
                - COALESCE(discount, 0) + COALESCE(express_charge, 0)
                + (SELECT COALESCE(SUM(sgst), 0) FROM invoice_items WHERE invoice_id = OLD.invoice_id)
                + (SELECT COALESCE(SUM(cgst), 0) FROM invoice_items WHERE invoice_id = OLD.invoice_id)
        END,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = OLD.invoice_id;
END;

-- Step 8: Add index for better performance on GST calculations
CREATE INDEX IF NOT EXISTS idx_invoices_gst_inclusive ON invoices(gst_inclusive);
CREATE INDEX IF NOT EXISTS idx_invoice_items_gst ON invoice_items(invoice_id, sgst, cgst);