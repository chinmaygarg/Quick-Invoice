use crate::database::migration_trigger::MigrationTriggerSystem;
use crate::database::version_manager::{DatabaseVersionInfo, MigrationStatus};
use crate::models::{ApiResult, ApiError};
use tauri::{AppHandle, State, Manager};
use serde::{Serialize, Deserialize};
use std::path::PathBuf;

/// Migration dialog data for frontend
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MigrationDialogData {
    pub current_version: i32,
    pub required_version: i32,
    pub is_legacy: bool,
    pub pending_migrations: Vec<MigrationInfo>,
    pub backup_path: Option<String>,
    pub trigger_source: String,
}

/// Simplified migration info for UI
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MigrationInfo {
    pub version: i32,
    pub name: String,
    pub description: String,
}

/// Migration progress update
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MigrationProgress {
    pub current_step: i32,
    pub total_steps: i32,
    pub current_migration: String,
    pub status: String,
}

/// Check migration status on app startup
#[tauri::command]
pub async fn check_migration_on_startup(
    app_handle: AppHandle,
    state: State<'_, crate::AppState>,
) -> ApiResult<Option<MigrationDialogData>> {
    log::info!("Checking migration status on app startup");

    let trigger_system = MigrationTriggerSystem::new(state.db.get_pool().clone());
    let result = trigger_system.on_app_startup().await.map_err(|e| ApiError {
        message: format!("Failed to check migration status: {}", e),
        code: Some("MIGRATION_CHECK_ERROR".to_string()),
    })?;

    match result.status {
        MigrationStatus::Current { version } => {
            log::info!("Database is current at version {}", version);
            Ok(None)
        }
        MigrationStatus::RequiresUpgrade {
            current_version,
            required_version,
            pending_migrations,
        } => {
            log::info!(
                "Database upgrade required: v{} -> v{}",
                current_version,
                required_version
            );

            let dialog_data = MigrationDialogData {
                current_version,
                required_version,
                is_legacy: current_version == 0,
                pending_migrations: pending_migrations
                    .into_iter()
                    .map(|m| MigrationInfo {
                        version: m.version,
                        name: m.name,
                        description: m.description,
                    })
                    .collect(),
                backup_path: result.backup_created.map(|p| p.to_string_lossy().to_string()),
                trigger_source: "app_startup".to_string(),
            };

            Ok(Some(dialog_data))
        }
        MigrationStatus::RequiresConsent { info } => {
            let dialog_data = MigrationDialogData {
                current_version: info.current_version,
                required_version: info.required_version,
                is_legacy: info.is_legacy,
                pending_migrations: info.pending_migrations
                    .into_iter()
                    .map(|m| MigrationInfo {
                        version: m.version,
                        name: m.name,
                        description: m.description,
                    })
                    .collect(),
                backup_path: result.backup_created.map(|p| p.to_string_lossy().to_string()),
                trigger_source: "app_startup".to_string(),
            };

            Ok(Some(dialog_data))
        }
    }
}

/// Check migration after database restore
#[tauri::command]
pub async fn check_migration_after_restore(
    app_handle: AppHandle,
    state: State<'_, crate::AppState>,
    backup_path: String,
) -> ApiResult<Option<MigrationDialogData>> {
    log::info!("Checking migration status after restore from: {}", backup_path);

    let trigger_system = MigrationTriggerSystem::new(state.db.get_pool().clone());
    let result = trigger_system
        .on_database_restore(PathBuf::from(&backup_path))
        .await
        .map_err(|e| ApiError {
            message: format!("Failed to check migration after restore: {}", e),
            code: Some("POST_RESTORE_CHECK_ERROR".to_string()),
        })?;

    match result.status {
        MigrationStatus::Current { version } => {
            log::info!("Restored database is current at version {}", version);
            Ok(None)
        }
        MigrationStatus::RequiresUpgrade {
            current_version,
            required_version,
            pending_migrations,
        } => {
            log::info!(
                "Restored database needs upgrade: v{} -> v{}",
                current_version,
                required_version
            );

            let dialog_data = MigrationDialogData {
                current_version,
                required_version,
                is_legacy: current_version == 0,
                pending_migrations: pending_migrations
                    .into_iter()
                    .map(|m| MigrationInfo {
                        version: m.version,
                        name: m.name,
                        description: m.description,
                    })
                    .collect(),
                backup_path: result.backup_created.map(|p| p.to_string_lossy().to_string()),
                trigger_source: "database_restore".to_string(),
            };

            Ok(Some(dialog_data))
        }
        _ => Ok(None),
    }
}

/// Apply pending migrations with user consent
#[tauri::command]
pub async fn apply_pending_migrations(
    app_handle: AppHandle,
    state: State<'_, crate::AppState>,
    user_consent: bool,
) -> ApiResult<bool> {
    log::info!("Applying pending migrations with consent: {}", user_consent);

    if !user_consent {
        return Ok(false);
    }

    let trigger_system = MigrationTriggerSystem::new(state.db.get_pool().clone());

    // Send progress updates to frontend
    let app_handle_clone = app_handle.clone();

    // Apply migrations with detailed error logging
    match trigger_system
        .apply_migrations_with_consent(user_consent)
        .await
    {
        Ok(_) => {
            log::info!("Successfully applied all migrations");
        }
        Err(e) => {
            log::error!("Migration failed with error: {:?}", e);
            log::error!("Error chain: {:#}", e);

            // Try to provide more specific error information
            let error_msg = if e.to_string().contains("no such file") {
                format!("Migration files not found. This may be a packaging issue: {}", e)
            } else if e.to_string().contains("syntax") {
                format!("SQL syntax error in migration: {}", e)
            } else if e.to_string().contains("already exists") {
                format!("Database object already exists. Database may be partially migrated: {}", e)
            } else {
                format!("Migration failed: {}", e)
            };

            return Err(ApiError {
                message: error_msg,
                code: Some("MIGRATION_APPLY_ERROR".to_string()),
            });
        }
    }

    // Emit completion event
    app_handle
        .emit_all("migration-complete", serde_json::json!({
            "success": true,
            "message": "All migrations applied successfully"
        }))
        .ok();

    Ok(true)
}

/// Get detailed migration information
#[tauri::command]
pub async fn get_migration_details(
    app_handle: AppHandle,
    state: State<'_, crate::AppState>,
) -> ApiResult<DatabaseVersionInfo> {
    let trigger_system = MigrationTriggerSystem::new(state.db.get_pool().clone());

    trigger_system
        .get_migration_details()
        .await
        .map_err(|e| ApiError {
            message: format!("Failed to get migration details: {}", e),
            code: Some("MIGRATION_DETAILS_ERROR".to_string()),
        })
}

/// Manually trigger migration check
#[tauri::command]
pub async fn trigger_manual_migration_check(
    app_handle: AppHandle,
    state: State<'_, crate::AppState>,
) -> ApiResult<Option<MigrationDialogData>> {
    log::info!("Manual migration check triggered by user");

    let trigger_system = MigrationTriggerSystem::new(state.db.get_pool().clone());
    let result = trigger_system.on_manual_request().await.map_err(|e| ApiError {
        message: format!("Failed to check migration: {}", e),
        code: Some("MANUAL_CHECK_ERROR".to_string()),
    })?;

    match result.status {
        MigrationStatus::Current { version } => {
            log::info!("Database is current at version {}", version);
            Ok(None)
        }
        MigrationStatus::RequiresUpgrade {
            current_version,
            required_version,
            pending_migrations,
        } => {
            let dialog_data = MigrationDialogData {
                current_version,
                required_version,
                is_legacy: current_version == 0,
                pending_migrations: pending_migrations
                    .into_iter()
                    .map(|m| MigrationInfo {
                        version: m.version,
                        name: m.name,
                        description: m.description,
                    })
                    .collect(),
                backup_path: result.backup_created.map(|p| p.to_string_lossy().to_string()),
                trigger_source: "manual_request".to_string(),
            };

            Ok(Some(dialog_data))
        }
        _ => Ok(None),
    }
}

/// List available database backups
#[tauri::command]
pub async fn list_database_backups(
    app_handle: AppHandle,
    state: State<'_, crate::AppState>,
) -> ApiResult<Vec<BackupFileInfo>> {
    use crate::database::migration_trigger::BackupManager;

    let backup_manager = BackupManager::new();
    let backups = backup_manager.list_backups().await.map_err(|e| ApiError {
        message: format!("Failed to list backups: {}", e),
        code: Some("BACKUP_LIST_ERROR".to_string()),
    })?;

    let backup_infos: Vec<BackupFileInfo> = backups
        .into_iter()
        .map(|b| BackupFileInfo {
            file_name: b.file_name,
            path: b.path.to_string_lossy().to_string(),
            size_mb: (b.size_bytes as f64 / 1_048_576.0),
            created_at: b.created_at,
        })
        .collect();

    Ok(backup_infos)
}

/// Backup file information for UI
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BackupFileInfo {
    pub file_name: String,
    pub path: String,
    pub size_mb: f64,
    pub created_at: Option<u64>,
}

/// Clean up old backups
#[tauri::command]
pub async fn cleanup_old_backups(
    app_handle: AppHandle,
    state: State<'_, crate::AppState>,
    keep_count: usize,
) -> ApiResult<()> {
    use crate::database::migration_trigger::BackupManager;

    let backup_manager = BackupManager::new();
    backup_manager.cleanup_old_backups(keep_count).await.map_err(|e| ApiError {
        message: format!("Failed to cleanup backups: {}", e),
        code: Some("BACKUP_CLEANUP_ERROR".to_string()),
    })?;

    Ok(())
}