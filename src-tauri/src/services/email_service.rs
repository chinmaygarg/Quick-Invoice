use anyhow::{Context, Result};
use base64::{Engine as _, engine::general_purpose};
use chrono::Utc;
use lettre::{
    message::{header::ContentType, Attachment, MultiPart, SinglePart},
    transport::smtp::authentication::Credentials,
    AsyncSmtpTransport, AsyncTransport, Message, Tokio1Executor,
};
use lettre::transport::smtp::client::{Tls, TlsParameters};
use std::path::Path;
use tokio::fs;

use crate::models::{EmailConfig, BackupEmailInfo, EmailTestRequest};

pub struct EmailService;

impl EmailService {
    /// Create a new email service instance
    pub fn new() -> Self {
        Self
    }

    /// Test SMTP connection with provided credentials
    pub async fn test_connection(request: &EmailTestRequest) -> Result<String> {
        log::info!("Testing SMTP connection to {}:{}", request.smtp_server, request.smtp_port);

        // Build transport
        let transport = Self::build_transport(
            &request.smtp_server,
            request.smtp_port,
            request.use_tls,
            request.use_starttls,
            &request.sender_email,
            &request.sender_password,
        ).await.context("Failed to build SMTP transport")?;

        // Test connection
        match transport.test_connection().await {
            Ok(true) => {
                log::info!("SMTP connection test successful");
                Ok("Connection successful".to_string())
            }
            Ok(false) => {
                log::warn!("SMTP connection test failed");
                Err(anyhow::anyhow!("Connection failed"))
            }
            Err(e) => {
                log::error!("SMTP connection test error: {}", e);
                Err(anyhow::anyhow!("Connection error: {}", e))
            }
        }
    }

    /// Send backup email with database attachment
    pub async fn send_backup_email(
        config: &EmailConfig,
        backup_path: &Path,
        backup_info: &BackupEmailInfo,
    ) -> Result<String> {
        log::info!("Sending backup email to {}", config.recipient_email);

        // Decrypt password
        let sender_password = Self::decrypt_password(&config.encrypted_password)?;

        // Build transport
        let transport = Self::build_transport(
            &config.smtp_server,
            config.smtp_port,
            config.use_tls == 1,
            config.use_starttls == 1,
            &config.sender_email,
            &sender_password,
        ).await.context("Failed to build SMTP transport")?;

        // Create email message
        let message = Self::create_backup_email(config, backup_path, backup_info).await
            .context("Failed to create backup email")?;

        // Send email
        match transport.send(message).await {
            Ok(_) => {
                log::info!("Backup email sent successfully");
                Ok("Backup email sent successfully".to_string())
            }
            Err(e) => {
                log::error!("Failed to send backup email: {}", e);
                Err(anyhow::anyhow!("Failed to send email: {}", e))
            }
        }
    }

    /// Create backup email message with attachment
    async fn create_backup_email(
        config: &EmailConfig,
        backup_path: &Path,
        backup_info: &BackupEmailInfo,
    ) -> Result<Message> {
        log::debug!("Creating backup email message");

        // Create subject line
        let subject = format!(
            "{} Backup - v{} - {}",
            backup_info.app_name,
            backup_info.app_version,
            backup_info.timestamp
        );

        // Create email body
        let body_text = format!(
            r#"Automatic Database Backup

Application: {}
Version: {}
Database Version: {}
Backup Date: {}
File Size: {} bytes

This is an automated backup of your UCLEAN database.
The backup was created when the application was closed.

Please keep this backup safe for data recovery purposes.

---
UCLEAN Invoice Generation System
"#,
            backup_info.app_name,
            backup_info.app_version,
            backup_info.db_version,
            backup_info.timestamp,
            backup_info.file_size
        );

        // Read backup file for attachment
        let backup_data = fs::read(backup_path).await
            .context("Failed to read backup file")?;

        // Create attachment
        let attachment = Attachment::new(backup_info.filename.clone())
            .body(backup_data, "application/x-sqlite3".parse().unwrap());

        // Build message
        let message = Message::builder()
            .from(config.sender_email.parse().context("Invalid sender email")?)
            .to(config.recipient_email.parse().context("Invalid recipient email")?)
            .subject(subject)
            .multipart(
                MultiPart::mixed()
                    .singlepart(SinglePart::builder()
                        .header(ContentType::TEXT_PLAIN)
                        .body(body_text))
                    .singlepart(attachment)
            )
            .context("Failed to build email message")?;

        Ok(message)
    }

    /// Build SMTP transport with configuration
    async fn build_transport(
        smtp_server: &str,
        smtp_port: i32,
        use_tls: bool,
        use_starttls: bool,
        username: &str,
        password: &str,
    ) -> Result<AsyncSmtpTransport<Tokio1Executor>> {
        log::debug!("Building SMTP transport for {}:{}", smtp_server, smtp_port);

        let mut builder = AsyncSmtpTransport::<Tokio1Executor>::builder_dangerous(smtp_server)
            .port(smtp_port as u16)
            .credentials(Credentials::new(username.to_string(), password.to_string()));

        // Configure TLS/STARTTLS
        if use_tls {
            let tls_parameters = TlsParameters::new(smtp_server.to_string())
                .context("Failed to create TLS parameters")?;
            builder = builder.tls(Tls::Wrapper(tls_parameters));
        } else if use_starttls {
            let tls_parameters = TlsParameters::new(smtp_server.to_string())
                .context("Failed to create TLS parameters")?;
            builder = builder.tls(Tls::Required(tls_parameters));
        }

        Ok(builder.build())
    }

    /// Encrypt password for storage (simple base64 encoding - in production, use proper encryption)
    pub fn encrypt_password(password: &str) -> String {
        general_purpose::STANDARD.encode(password.as_bytes())
    }

    /// Decrypt password from storage (simple base64 decoding - in production, use proper decryption)
    pub fn decrypt_password(encrypted_password: &str) -> Result<String> {
        let decoded = general_purpose::STANDARD.decode(encrypted_password)
            .context("Failed to decode password")?;
        String::from_utf8(decoded)
            .context("Invalid UTF-8 in password")
    }

    /// Create backup info from current app state
    pub fn create_backup_info(
        backup_path: &Path,
        app_version: &str,
        db_version: i32,
    ) -> Result<BackupEmailInfo> {
        let filename = backup_path.file_name()
            .and_then(|name| name.to_str())
            .unwrap_or("backup.sqlite")
            .to_string();

        let timestamp = Utc::now().format("%Y-%m-%d %H:%M:%S UTC").to_string();

        // Get file size
        let file_size = std::fs::metadata(backup_path)
            .context("Failed to get backup file metadata")?
            .len();

        Ok(BackupEmailInfo {
            filename,
            app_name: "UCLEAN".to_string(),
            app_version: app_version.to_string(),
            db_version,
            timestamp,
            file_size,
        })
    }

    /// Get common SMTP presets for popular email providers
    pub fn get_smtp_presets() -> Vec<(String, String, i32, bool, bool)> {
        vec![
            // (Provider, Host, Port, use_tls, use_starttls)
            ("Gmail".to_string(), "smtp.gmail.com".to_string(), 587, false, true),
            ("Gmail (TLS)".to_string(), "smtp.gmail.com".to_string(), 465, true, false),
            ("Outlook/Hotmail".to_string(), "smtp-mail.outlook.com".to_string(), 587, false, true),
            ("Yahoo Mail".to_string(), "smtp.mail.yahoo.com".to_string(), 587, false, true),
            ("Yahoo Mail (TLS)".to_string(), "smtp.mail.yahoo.com".to_string(), 465, true, false),
            ("Custom SMTP".to_string(), "".to_string(), 587, false, true),
        ]
    }

    /// Validate email address format
    pub fn is_valid_email(email: &str) -> bool {
        email.parse::<lettre::Address>().is_ok()
    }

    /// Get maximum attachment size (in bytes) - typically 25MB for most providers
    pub fn get_max_attachment_size() -> usize {
        25 * 1024 * 1024 // 25 MB
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_password_encryption_decryption() {
        let password = "test_password_123";
        let encrypted = EmailService::encrypt_password(password);
        let decrypted = EmailService::decrypt_password(&encrypted).unwrap();
        assert_eq!(password, decrypted);
    }

    #[test]
    fn test_email_validation() {
        assert!(EmailService::is_valid_email("test@example.com"));
        assert!(EmailService::is_valid_email("user.name+tag@domain.co.uk"));
        assert!(!EmailService::is_valid_email("invalid-email"));
        assert!(!EmailService::is_valid_email("@domain.com"));
        assert!(!EmailService::is_valid_email("user@"));
    }

    #[test]
    fn test_smtp_presets() {
        let presets = EmailService::get_smtp_presets();
        assert!(!presets.is_empty());

        // Check Gmail preset exists
        let gmail_preset = presets.iter().find(|(name, _, _, _, _)| name == "Gmail");
        assert!(gmail_preset.is_some());

        let (_, host, port, use_tls, use_starttls) = gmail_preset.unwrap();
        assert_eq!(host, "smtp.gmail.com");
        assert_eq!(*port, 587);
        assert_eq!(*use_tls, false);
        assert_eq!(*use_starttls, true);
    }

    #[tokio::test]
    async fn test_backup_info_creation() {
        let temp_file = tempfile::NamedTempFile::new().unwrap();
        let backup_path = temp_file.path();

        // Write some test data
        std::fs::write(backup_path, b"test data").unwrap();

        let backup_info = EmailService::create_backup_info(
            backup_path,
            "1.0.0",
            1
        ).unwrap();

        assert_eq!(backup_info.app_name, "UCLEAN");
        assert_eq!(backup_info.app_version, "1.0.0");
        assert_eq!(backup_info.db_version, 1);
        assert_eq!(backup_info.file_size, 9); // "test data" is 9 bytes
        assert!(backup_info.filename.contains("tmp") || backup_info.filename.contains("temp"));
    }
}