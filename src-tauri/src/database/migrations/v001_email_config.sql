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