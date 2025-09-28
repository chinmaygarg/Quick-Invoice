-- Migration v002: Tag Settings
-- Adds support for invoice tag printing settings

-- Create tag_settings table
CREATE TABLE IF NOT EXISTS tag_settings (
    id INTEGER PRIMARY KEY,
    store_id INTEGER NOT NULL,
    tag_width REAL DEFAULT 50,
    tag_height REAL DEFAULT 25,
    font_size INTEGER DEFAULT 10,
    margin_top REAL DEFAULT 5,
    margin_right REAL DEFAULT 5,
    margin_bottom REAL DEFAULT 5,
    margin_left REAL DEFAULT 5,
    tags_per_row INTEGER DEFAULT 4,
    tags_per_page INTEGER DEFAULT 40,
    show_customer_name BOOLEAN DEFAULT 1,
    show_service_name BOOLEAN DEFAULT 1,
    show_invoice_number BOOLEAN DEFAULT 1,
    show_date BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (store_id) REFERENCES stores(id)
);

-- Create index on store_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_tag_settings_store_id ON tag_settings(store_id);