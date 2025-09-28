/// Embedded migration SQL files for production builds
/// This ensures migrations work without filesystem access

pub const V001_INITIAL_SCHEMA: &str = include_str!("migrations/v001_initial_schema.sql");
pub const V002_GST_FIXES: &str = include_str!("migrations/v002_gst_fixes.sql");
pub const V003_EMAIL_CONFIG: &str = include_str!("migrations/v003_email_config.sql");

// Additional migrations added by us
pub const V001_EMAIL_CONFIG_NEW: &str = r#"
-- Migration v001: Email Configuration
-- Adds support for email backup functionality

-- Create email_configs table
CREATE TABLE IF NOT EXISTS email_configs (
    id INTEGER PRIMARY KEY,
    store_id INTEGER NOT NULL,
    smtp_host TEXT NOT NULL,
    smtp_port INTEGER NOT NULL,
    smtp_username TEXT NOT NULL,
    smtp_password TEXT NOT NULL,
    from_email TEXT NOT NULL,
    to_email TEXT NOT NULL,
    backup_enabled BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (store_id) REFERENCES stores(id)
);

-- Create index on store_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_email_configs_store_id ON email_configs(store_id);
"#;

pub const V002_TAG_SETTINGS_NEW: &str = r#"
-- Migration v002: Tag Settings
-- Adds support for invoice tag printing settings

-- Create tag_settings table if not exists (might already be in initial schema)
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
"#;

pub const V003_ADDITIONAL_INDEXES: &str = r#"
-- Migration v003: Performance Indexes
-- Adds additional indexes for improved query performance

-- Indexes for invoice queries
CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON invoices(created_at);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_customer_store ON invoices(customer_id, store_id);

-- Indexes for invoice items queries
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_service_id ON invoice_items(service_id);

-- Indexes for customers queries
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status);

-- Indexes for services queries
CREATE INDEX IF NOT EXISTS idx_services_category ON services(category);
CREATE INDEX IF NOT EXISTS idx_services_status ON services(status);
CREATE INDEX IF NOT EXISTS idx_services_store_id ON services(store_id);
"#;

/// Get migration SQL by version and filename
pub fn get_migration_sql(version: i32, sql_file: &str) -> Option<&'static str> {
    match (version, sql_file) {
        (1, "v001_initial_schema.sql") => Some(V001_INITIAL_SCHEMA),
        (2, "v002_gst_fixes.sql") => Some(V002_GST_FIXES),
        (3, "v003_email_config.sql") => Some(V003_EMAIL_CONFIG),
        // Fallback migrations if files don't exist
        (1, "v001_email_config.sql") => Some(V001_EMAIL_CONFIG_NEW),
        (2, "v002_tag_settings.sql") => Some(V002_TAG_SETTINGS_NEW),
        (3, "v003_additional_indexes.sql") => Some(V003_ADDITIONAL_INDEXES),
        _ => None,
    }
}