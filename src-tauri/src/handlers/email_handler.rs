use anyhow::{Context, Result};
use sqlx::Row;
use std::path::PathBuf;
use tauri::{State, AppHandle};

use crate::{
    models::{
        EmailConfig, CreateEmailConfigRequest, UpdateEmailConfigRequest,
        EmailConfigResponse, EmailTestRequest
    },
    services::{EmailService},
    version::VersionInfo,
    AppState,
};

/// Save or update email configuration
#[tauri::command]
pub async fn save_email_config(
    state: State<'_, AppState>,
    request: CreateEmailConfigRequest,
) -> Result<EmailConfigResponse, String> {
    log::info!("Saving email configuration for sender: {}", request.sender_email);

    let pool = state.db.get_pool();

    // Validate email addresses
    if !EmailService::is_valid_email(&request.sender_email) {
        return Err("Invalid sender email address".to_string());
    }

    if !EmailService::is_valid_email(&request.recipient_email) {
        return Err("Invalid recipient email address".to_string());
    }

    // Encrypt password
    let encrypted_password = EmailService::encrypt_password(&request.sender_password);

    // Check if config already exists
    let existing_config = sqlx::query("SELECT id FROM email_configs LIMIT 1")
        .fetch_optional(pool)
        .await
        .map_err(|e| format!("Database error: {}", e))?;

    let result = if let Some(row) = existing_config {
        // Update existing config
        let id = row.get::<i64, _>("id");
        sqlx::query(
            r#"
            UPDATE email_configs
            SET sender_email = ?, encrypted_password = ?, recipient_email = ?,
                smtp_server = ?, smtp_port = ?, use_tls = ?, use_starttls = ?,
                auto_backup_enabled = ?, updated_at = datetime('now')
            WHERE id = ?
            "#,
        )
        .bind(&request.sender_email)
        .bind(&encrypted_password)
        .bind(&request.recipient_email)
        .bind(&request.smtp_server)
        .bind(request.smtp_port)
        .bind(request.use_tls as i64)
        .bind(request.use_starttls as i64)
        .bind(request.auto_backup_enabled as i64)
        .bind(id)
        .execute(pool)
        .await
        .map_err(|e| format!("Failed to update email config: {}", e))?;

        // Return updated config
        get_email_config_by_id(pool, id).await
            .map_err(|e| format!("Failed to fetch updated config: {}", e))?
    } else {
        // Insert new config
        let result = sqlx::query(
            r#"
            INSERT INTO email_configs (
                sender_email, encrypted_password, recipient_email,
                smtp_server, smtp_port, use_tls, use_starttls,
                auto_backup_enabled, created_at, updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
            "#,
        )
        .bind(&request.sender_email)
        .bind(&encrypted_password)
        .bind(&request.recipient_email)
        .bind(&request.smtp_server)
        .bind(request.smtp_port)
        .bind(request.use_tls as i64)
        .bind(request.use_starttls as i64)
        .bind(request.auto_backup_enabled as i64)
        .execute(pool)
        .await
        .map_err(|e| format!("Failed to save email config: {}", e))?;

        // Return new config
        get_email_config_by_id(pool, result.last_insert_rowid()).await
            .map_err(|e| format!("Failed to fetch saved config: {}", e))?
    };

    log::info!("Email configuration saved successfully");
    Ok(result)
}

/// Get email configuration (without password)
#[tauri::command]
pub async fn get_email_config(
    state: State<'_, AppState>,
) -> Result<Option<EmailConfigResponse>, String> {
    log::debug!("Fetching email configuration");

    let pool = state.db.get_pool();

    let config = sqlx::query_as::<_, EmailConfig>(
        "SELECT * FROM email_configs ORDER BY created_at DESC LIMIT 1"
    )
    .fetch_optional(pool)
    .await
    .map_err(|e| format!("Failed to fetch email config: {}", e))?;

    match config {
        Some(config) => Ok(Some(convert_to_response(config))),
        None => Ok(None),
    }
}

/// Test email connection
#[tauri::command]
pub async fn test_email_connection(
    request: EmailTestRequest,
) -> Result<String, String> {
    log::info!("Testing email connection to {}", request.smtp_server);

    // Validate email address
    if !EmailService::is_valid_email(&request.sender_email) {
        return Err("Invalid sender email address".to_string());
    }

    // Test connection
    EmailService::test_connection(&request)
        .await
        .map_err(|e| format!("Connection test failed: {}", e))
}

/// Send backup email manually
#[tauri::command]
pub async fn send_backup_email(
    app_handle: AppHandle,
    state: State<'_, AppState>,
) -> Result<String, String> {
    log::info!("Manual backup email requested");

    // Get email configuration
    let pool = state.db.get_pool();
    let config = sqlx::query_as::<_, EmailConfig>(
        "SELECT * FROM email_configs WHERE auto_backup_enabled = 1 ORDER BY created_at DESC LIMIT 1"
    )
    .fetch_optional(pool)
    .await
    .map_err(|e| format!("Failed to fetch email config: {}", e))?;

    let config = config.ok_or_else(|| "No email configuration found or backup disabled".to_string())?;

    // Create temporary backup
    let backup_path = create_temporary_backup(&app_handle, &state).await?;

    // Get version info
    let version_info = VersionInfo::new();
    let backup_info = EmailService::create_backup_info(
        &backup_path,
        &version_info.app_version,
        version_info.required_db_version,
    ).map_err(|e| format!("Failed to create backup info: {}", e))?;

    // Send email
    let result = EmailService::send_backup_email(&config, &backup_path, &backup_info)
        .await
        .map_err(|e| format!("Failed to send backup email: {}", e));

    // Clean up temporary file
    if let Err(e) = tokio::fs::remove_file(&backup_path).await {
        log::warn!("Failed to clean up temporary backup file: {}", e);
    }

    result
}

/// Get SMTP presets for common email providers
#[tauri::command]
pub async fn get_smtp_presets() -> Result<Vec<(String, String, i32, bool, bool)>, String> {
    Ok(EmailService::get_smtp_presets())
}

/// Update email configuration
#[tauri::command]
pub async fn update_email_config(
    state: State<'_, AppState>,
    request: UpdateEmailConfigRequest,
) -> Result<EmailConfigResponse, String> {
    log::info!("Updating email configuration for sender: {}", request.sender_email);

    let pool = state.db.get_pool();

    // Validate email addresses
    if !EmailService::is_valid_email(&request.sender_email) {
        return Err("Invalid sender email address".to_string());
    }

    if !EmailService::is_valid_email(&request.recipient_email) {
        return Err("Invalid recipient email address".to_string());
    }

    // Get existing config
    let existing_config = sqlx::query_as::<_, EmailConfig>(
        "SELECT * FROM email_configs ORDER BY created_at DESC LIMIT 1"
    )
    .fetch_optional(pool)
    .await
    .map_err(|e| format!("Database error: {}", e))?;

    let config = existing_config.ok_or_else(|| "No existing email configuration found".to_string())?;

    // Use existing password if new one not provided
    let encrypted_password = if let Some(new_password) = request.sender_password {
        EmailService::encrypt_password(&new_password)
    } else {
        config.encrypted_password
    };

    // Update config
    sqlx::query(
        r#"
        UPDATE email_configs
        SET sender_email = ?, encrypted_password = ?, recipient_email = ?,
            smtp_server = ?, smtp_port = ?, use_tls = ?, use_starttls = ?,
            auto_backup_enabled = ?, updated_at = datetime('now')
        WHERE id = ?
        "#,
    )
    .bind(&request.sender_email)
    .bind(&encrypted_password)
    .bind(&request.recipient_email)
    .bind(&request.smtp_server)
    .bind(request.smtp_port)
    .bind(request.use_tls as i64)
    .bind(request.use_starttls as i64)
    .bind(request.auto_backup_enabled as i64)
    .bind(config.id)
    .execute(pool)
    .await
    .map_err(|e| format!("Failed to update email config: {}", e))?;

    // Return updated config
    let updated_config = get_email_config_by_id(pool, config.id).await
        .map_err(|e| format!("Failed to fetch updated config: {}", e))?;

    log::info!("Email configuration updated successfully");
    Ok(updated_config)
}

/// Delete email configuration
#[tauri::command]
pub async fn delete_email_config(
    state: State<'_, AppState>,
) -> Result<String, String> {
    log::info!("Deleting email configuration");

    let pool = state.db.get_pool();

    let result = sqlx::query("DELETE FROM email_configs")
        .execute(pool)
        .await
        .map_err(|e| format!("Failed to delete email config: {}", e))?;

    if result.rows_affected() > 0 {
        log::info!("Email configuration deleted successfully");
        Ok("Email configuration deleted successfully".to_string())
    } else {
        Ok("No email configuration found to delete".to_string())
    }
}

// Helper functions

/// Create temporary backup file
pub async fn create_temporary_backup(
    app_handle: &AppHandle,
    state: &AppState,
) -> Result<PathBuf, String> {
    let timestamp = chrono::Utc::now().format("%Y%m%d_%H%M%S").to_string();
    let backup_filename = format!("uclean_backup_{}.sqlite", timestamp);

    // Create temp directory path
    let temp_dir = std::env::temp_dir();
    let backup_path = temp_dir.join(&backup_filename);

    // Create backup
    state.db.backup_to_file(app_handle, &backup_path.to_string_lossy())
        .await
        .map_err(|e| format!("Failed to create backup: {}", e))?;

    Ok(backup_path)
}

/// Send automatic backup on app close
pub async fn send_automatic_backup(
    app_handle: &AppHandle,
    state: &AppState,
) -> Result<(), String> {
    log::info!("Sending automatic backup on app close");

    // Get email configuration
    let pool = state.db.get_pool();
    let config = sqlx::query_as::<_, EmailConfig>(
        "SELECT * FROM email_configs WHERE auto_backup_enabled = 1 ORDER BY created_at DESC LIMIT 1"
    )
    .fetch_optional(pool)
    .await
    .map_err(|e| format!("Failed to fetch email config: {}", e))?;

    if let Some(config) = config {
        log::info!("Auto-backup enabled, creating backup...");

        // Create temporary backup
        let backup_path = create_temporary_backup(app_handle, state).await?;

        // Check file size limit
        let file_size = tokio::fs::metadata(&backup_path).await
            .map_err(|e| format!("Failed to get backup file size: {}", e))?
            .len() as usize;

        if file_size > EmailService::get_max_attachment_size() {
            log::warn!(
                "Backup file size ({} bytes) exceeds maximum attachment size ({} bytes)",
                file_size,
                EmailService::get_max_attachment_size()
            );
            // Clean up and return warning
            let _ = tokio::fs::remove_file(&backup_path).await;
            return Err("Backup file too large for email attachment".to_string());
        }

        // Get version info
        let version_info = VersionInfo::new();
        let backup_info = EmailService::create_backup_info(
            &backup_path,
            &version_info.app_version,
            version_info.required_db_version,
        ).map_err(|e| format!("Failed to create backup info: {}", e))?;

        // Send email
        let result = EmailService::send_backup_email(&config, &backup_path, &backup_info).await;

        // Clean up temporary file
        if let Err(e) = tokio::fs::remove_file(&backup_path).await {
            log::warn!("Failed to clean up temporary backup file: {}", e);
        }

        match result {
            Ok(_) => {
                log::info!("Automatic backup email sent successfully");
                Ok(())
            }
            Err(e) => {
                log::error!("Failed to send automatic backup: {}", e);
                Err(format!("Failed to send automatic backup: {}", e))
            }
        }
    } else {
        log::debug!("Auto-backup not enabled or no email configuration found");
        Ok(())
    }
}

/// Get email config by ID and convert to response
async fn get_email_config_by_id(
    pool: &sqlx::SqlitePool,
    id: i64,
) -> Result<EmailConfigResponse> {
    let config = sqlx::query_as::<_, EmailConfig>(
        "SELECT * FROM email_configs WHERE id = ?"
    )
    .bind(id)
    .fetch_one(pool)
    .await
    .context("Failed to fetch email config by ID")?;

    Ok(convert_to_response(config))
}

/// Convert EmailConfig to EmailConfigResponse (without password)
fn convert_to_response(config: EmailConfig) -> EmailConfigResponse {
    EmailConfigResponse {
        id: config.id,
        sender_email: config.sender_email,
        recipient_email: config.recipient_email,
        smtp_server: config.smtp_server,
        smtp_port: config.smtp_port,
        use_tls: config.use_tls == 1,
        use_starttls: config.use_starttls == 1,
        auto_backup_enabled: config.auto_backup_enabled == 1,
        created_at: config.created_at,
        updated_at: config.updated_at,
    }
}