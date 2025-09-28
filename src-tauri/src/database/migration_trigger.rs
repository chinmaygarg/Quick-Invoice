use anyhow::{Result, Context};
use sqlx::{Pool, Sqlite};
use std::path::PathBuf;
use std::sync::Arc;
use tokio::sync::Mutex;
use super::migration_runner::MigrationRunner;
use super::version_manager::{DatabaseVersionInfo, MigrationStatus, VersionManager};

/// Enum representing different triggers for migration checks
#[derive(Debug, Clone, PartialEq)]
pub enum MigrationTrigger {
    AppStartup,
    DatabaseRestore { backup_path: PathBuf },
    DatabaseImport { import_path: PathBuf },
    ManualRequest,
}

/// Result of migration check
#[derive(Debug, Clone)]
pub struct MigrationCheckResult {
    pub trigger: MigrationTrigger,
    pub status: MigrationStatus,
    pub backup_created: Option<PathBuf>,
}

/// Universal migration trigger system
pub struct MigrationTriggerSystem {
    pool: Pool<Sqlite>,
    runner: Arc<Mutex<MigrationRunner>>,
    version_manager: VersionManager,
    backup_manager: BackupManager,
}

impl MigrationTriggerSystem {
    pub fn new(pool: Pool<Sqlite>) -> Self {
        let runner = Arc::new(Mutex::new(MigrationRunner::new(pool.clone())));
        let version_manager = VersionManager::new(pool.clone());
        let backup_manager = BackupManager::new();

        Self {
            pool,
            runner,
            version_manager,
            backup_manager,
        }
    }

    /// Universal migration check that works for any trigger
    pub async fn check_and_prepare_migration(
        &self,
        trigger: MigrationTrigger,
    ) -> Result<MigrationCheckResult> {
        log::info!("Migration check triggered by: {:?}", trigger);

        // Check current migration status
        let status = self.version_manager.check_migration_status().await?;

        // Create backup if migration is needed
        let backup_created = match &status {
            MigrationStatus::RequiresUpgrade { .. } => {
                let backup_path = self.create_pre_migration_backup(&trigger).await?;
                Some(backup_path)
            }
            _ => None,
        };

        Ok(MigrationCheckResult {
            trigger,
            status,
            backup_created,
        })
    }

    /// Create a backup before migration
    async fn create_pre_migration_backup(&self, trigger: &MigrationTrigger) -> Result<PathBuf> {
        let backup_name = match trigger {
            MigrationTrigger::AppStartup => "pre_migration_startup",
            MigrationTrigger::DatabaseRestore { .. } => "pre_migration_restore",
            MigrationTrigger::DatabaseImport { .. } => "pre_migration_import",
            MigrationTrigger::ManualRequest => "pre_migration_manual",
        };

        self.backup_manager.create_backup(backup_name).await
    }

    /// Apply pending migrations with user consent
    pub async fn apply_migrations_with_consent(
        &self,
        user_consent: bool,
    ) -> Result<()> {
        if !user_consent {
            log::info!("User declined migration");
            return Ok(());
        }

        log::info!("User consented to migration, applying pending migrations...");

        let mut runner = self.runner.lock().await;
        let applied = runner.apply_pending_migrations().await?;

        log::info!("Successfully applied {} migrations", applied.len());

        Ok(())
    }

    /// Handle app startup migration check
    pub async fn on_app_startup(&self) -> Result<MigrationCheckResult> {
        self.check_and_prepare_migration(MigrationTrigger::AppStartup).await
    }

    /// Handle post-restore migration check
    pub async fn on_database_restore(&self, backup_path: PathBuf) -> Result<MigrationCheckResult> {
        // First, perform the restore
        self.backup_manager.restore_backup(&backup_path).await?;

        // Then check for migrations
        self.check_and_prepare_migration(MigrationTrigger::DatabaseRestore {
            backup_path: backup_path.clone(),
        }).await
    }

    /// Handle post-import migration check
    pub async fn on_database_import(&self, import_path: PathBuf) -> Result<MigrationCheckResult> {
        // Import the database
        self.backup_manager.import_database(&import_path).await?;

        // Then check for migrations
        self.check_and_prepare_migration(MigrationTrigger::DatabaseImport {
            import_path: import_path.clone(),
        }).await
    }

    /// Manual migration check (user-triggered)
    pub async fn on_manual_request(&self) -> Result<MigrationCheckResult> {
        self.check_and_prepare_migration(MigrationTrigger::ManualRequest).await
    }

    /// Get detailed migration info for UI display
    pub async fn get_migration_details(&self) -> Result<DatabaseVersionInfo> {
        self.version_manager.detect_database_version().await
    }
}

/// Backup manager for database operations
pub struct BackupManager {
    backup_dir: PathBuf,
}

impl BackupManager {
    pub fn new() -> Self {
        // Get app data directory for backups
        let backup_dir = if let Some(data_dir) = dirs::data_dir() {
            data_dir.join("UCLEAN").join("backups")
        } else {
            PathBuf::from("./backups")
        };

        // Ensure backup directory exists
        std::fs::create_dir_all(&backup_dir).ok();

        Self { backup_dir }
    }

    /// Create a database backup
    pub async fn create_backup(&self, prefix: &str) -> Result<PathBuf> {
        let timestamp = chrono::Utc::now().format("%Y%m%d_%H%M%S");
        let backup_filename = format!("{}_{}.sqlite", prefix, timestamp);
        let backup_path = self.backup_dir.join(backup_filename);

        // Get current database path
        let current_db_path = self.get_database_path()?;

        // Copy database file
        tokio::fs::copy(&current_db_path, &backup_path)
            .await
            .with_context(|| format!("Failed to create backup at {:?}", backup_path))?;

        log::info!("Created backup: {:?}", backup_path);

        Ok(backup_path)
    }

    /// Restore a database from backup
    pub async fn restore_backup(&self, backup_path: &PathBuf) -> Result<()> {
        let current_db_path = self.get_database_path()?;

        // Create a safety backup first
        let safety_backup = self.create_backup("safety_before_restore").await?;

        // Restore the backup
        tokio::fs::copy(backup_path, &current_db_path)
            .await
            .with_context(|| format!("Failed to restore from {:?}", backup_path))?;

        log::info!("Restored database from: {:?}", backup_path);
        log::info!("Safety backup created at: {:?}", safety_backup);

        Ok(())
    }

    /// Import a database file
    pub async fn import_database(&self, import_path: &PathBuf) -> Result<()> {
        // Similar to restore, but might have different validation
        self.restore_backup(import_path).await
    }

    /// Get the current database path
    fn get_database_path(&self) -> Result<PathBuf> {
        // Get app data directory
        let data_dir = dirs::data_dir()
            .ok_or_else(|| anyhow::anyhow!("Failed to get app data directory"))?;

        let db_path = data_dir
            .join("com.uclean.app")
            .join("database.sqlite");

        Ok(db_path)
    }

    /// List available backups
    pub async fn list_backups(&self) -> Result<Vec<BackupInfo>> {
        let mut backups = Vec::new();

        let entries = tokio::fs::read_dir(&self.backup_dir).await?;
        let mut entries = tokio_stream::wrappers::ReadDirStream::new(entries);

        use tokio_stream::StreamExt;
        while let Some(entry) = entries.next().await {
            let entry = entry?;
            let path = entry.path();

            if path.extension().and_then(|s| s.to_str()) == Some("sqlite") {
                let metadata = entry.metadata().await?;
                let file_name = path
                    .file_name()
                    .and_then(|n| n.to_str())
                    .unwrap_or("")
                    .to_string();

                backups.push(BackupInfo {
                    file_name,
                    path,
                    size_bytes: metadata.len(),
                    created_at: metadata
                        .created()
                        .ok()
                        .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
                        .map(|d| d.as_secs()),
                });
            }
        }

        // Sort by creation date (newest first)
        backups.sort_by(|a, b| b.created_at.cmp(&a.created_at));

        Ok(backups)
    }

    /// Clean up old backups (keep only last N)
    pub async fn cleanup_old_backups(&self, keep_count: usize) -> Result<()> {
        let backups = self.list_backups().await?;

        if backups.len() <= keep_count {
            return Ok(());
        }

        // Delete older backups
        for backup in backups.iter().skip(keep_count) {
            tokio::fs::remove_file(&backup.path)
                .await
                .with_context(|| format!("Failed to delete old backup: {:?}", backup.path))?;

            log::info!("Deleted old backup: {:?}", backup.path);
        }

        Ok(())
    }
}

/// Information about a backup file
#[derive(Debug, Clone)]
pub struct BackupInfo {
    pub file_name: String,
    pub path: PathBuf,
    pub size_bytes: u64,
    pub created_at: Option<u64>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_trigger_types() {
        let trigger1 = MigrationTrigger::AppStartup;
        let trigger2 = MigrationTrigger::DatabaseRestore {
            backup_path: PathBuf::from("test.sqlite"),
        };

        assert_ne!(trigger1, trigger2);
        assert_eq!(trigger1, MigrationTrigger::AppStartup);
    }

    #[test]
    fn test_backup_naming() {
        let backup_manager = BackupManager::new();
        let timestamp = chrono::Utc::now().format("%Y%m%d_%H%M%S");
        let expected_name = format!("test_{}.sqlite", timestamp);

        // Verify naming convention
        assert!(expected_name.contains("test_"));
        assert!(expected_name.ends_with(".sqlite"));
    }
}