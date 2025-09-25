-- Migration v003: Add email configuration table for automatic backup functionality
-- This table stores SMTP settings for sending automatic database backups via email

CREATE TABLE IF NOT EXISTS email_configs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sender_email TEXT NOT NULL,
    encrypted_password TEXT NOT NULL,  -- Base64 encoded password (in production, use proper encryption)
    recipient_email TEXT NOT NULL,
    smtp_server TEXT NOT NULL,
    smtp_port INTEGER NOT NULL DEFAULT 587,
    use_tls INTEGER NOT NULL DEFAULT 0,  -- 1 for true, 0 for false
    use_starttls INTEGER NOT NULL DEFAULT 1,  -- 1 for true, 0 for false
    auto_backup_enabled INTEGER NOT NULL DEFAULT 1,  -- 1 for true, 0 for false
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create index on sender_email for faster lookups
CREATE INDEX IF NOT EXISTS idx_email_configs_sender ON email_configs(sender_email);

-- Create index on auto_backup_enabled for filtering active configs
CREATE INDEX IF NOT EXISTS idx_email_configs_auto_backup ON email_configs(auto_backup_enabled);

-- Only allow one email configuration at a time (business rule)
-- This is enforced at the application level, but we can add a unique constraint if needed