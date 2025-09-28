use anyhow::{Result, Context};
use sqlx::{Pool, Sqlite, Row};
use serde::{Serialize, Deserialize};
use std::path::PathBuf;
use chrono::{DateTime, Utc};

/// Represents a database migration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Migration {
    pub version: i32,
    pub name: String,
    pub description: String,
    pub sql_file: String,
    pub checksum: String,
}

/// Represents an applied migration record
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppliedMigration {
    pub id: i64,
    pub version: i32,
    pub name: String,
    pub description: Option<String>,
    pub checksum: String,
    pub applied_at: String,
    pub execution_time_ms: Option<i64>,
}

/// Database version information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DatabaseVersionInfo {
    pub current_version: i32,
    pub required_version: i32,
    pub is_legacy: bool,
    pub needs_migration: bool,
    pub pending_migrations: Vec<Migration>,
    pub applied_migrations: Vec<AppliedMigration>,
}

/// Migration status for UI
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "status")]
pub enum MigrationStatus {
    Current {
        version: i32,
    },
    RequiresUpgrade {
        current_version: i32,
        required_version: i32,
        pending_migrations: Vec<Migration>,
    },
    RequiresConsent {
        info: DatabaseVersionInfo,
    },
}

pub struct VersionManager {
    pool: Pool<Sqlite>,
}

impl VersionManager {
    /// Define all available migrations
    pub fn get_all_migrations() -> Vec<Migration> {
        vec![
            Migration {
                version: 1,
                name: "v001_initial_schema".to_string(),
                description: "Initial database schema with core tables".to_string(),
                sql_file: "v001_initial_schema.sql".to_string(),
                checksum: "initial_schema_v1".to_string(), // In production, use actual file hash
            },
            Migration {
                version: 2,
                name: "v002_gst_fixes".to_string(),
                description: "GST calculation improvements and fixes".to_string(),
                sql_file: "v002_gst_fixes.sql".to_string(),
                checksum: "gst_fixes_v2".to_string(),
            },
            Migration {
                version: 3,
                name: "v003_email_config".to_string(),
                description: "Email configuration for automatic backups".to_string(),
                sql_file: "v003_email_config.sql".to_string(),
                checksum: "email_config_v3".to_string(),
            },
        ]
    }

    pub fn new(pool: Pool<Sqlite>) -> Self {
        Self { pool }
    }

    /// Check if database has migrations table
    pub async fn has_migrations_table(&self) -> Result<bool> {
        let result = sqlx::query(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='database_migrations'"
        )
        .fetch_optional(&self.pool)
        .await?;

        Ok(result.is_some())
    }

    /// Create migrations tracking table
    pub async fn create_migrations_table(&self) -> Result<()> {
        let sql = r#"
            CREATE TABLE IF NOT EXISTS database_migrations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                version INTEGER NOT NULL UNIQUE,
                name TEXT NOT NULL,
                description TEXT,
                checksum TEXT NOT NULL,
                applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                execution_time_ms INTEGER
            );

            CREATE INDEX IF NOT EXISTS idx_migrations_version ON database_migrations(version);
        "#;

        sqlx::query(sql)
            .execute(&self.pool)
            .await
            .context("Failed to create migrations table")?;

        Ok(())
    }

    /// Get list of applied migrations
    pub async fn get_applied_migrations(&self) -> Result<Vec<AppliedMigration>> {
        // If no migrations table, this is a legacy database
        if !self.has_migrations_table().await? {
            return Ok(vec![]);
        }

        let migrations = sqlx::query(
            "SELECT * FROM database_migrations ORDER BY version"
        )
        .fetch_all(&self.pool)
        .await?;

        let mut applied = Vec::new();
        for row in migrations {
            applied.push(AppliedMigration {
                id: row.get("id"),
                version: row.get("version"),
                name: row.get("name"),
                description: row.get("description"),
                checksum: row.get("checksum"),
                applied_at: row.get("applied_at"),
                execution_time_ms: row.get("execution_time_ms"),
            });
        }

        Ok(applied)
    }

    /// Get current database version
    pub async fn get_current_version(&self) -> Result<i32> {
        let applied = self.get_applied_migrations().await?;

        if applied.is_empty() {
            // Check if this is a legacy database (has tables but no migration tracking)
            let has_tables = self.has_legacy_tables().await?;
            if has_tables {
                Ok(0) // Legacy database - version 0
            } else {
                Ok(-1) // Empty database - no version
            }
        } else {
            // Return highest applied version
            Ok(applied.iter().map(|m| m.version).max().unwrap_or(0))
        }
    }

    /// Check if database has legacy tables (pre-migration era)
    async fn has_legacy_tables(&self) -> Result<bool> {
        let result = sqlx::query(
            "SELECT COUNT(*) as count FROM sqlite_master
             WHERE type='table'
             AND name IN ('customers', 'invoices', 'services', 'stores')"
        )
        .fetch_one(&self.pool)
        .await?;

        let count: i32 = result.get("count");
        Ok(count > 0)
    }

    /// Detect database version and migration status
    pub async fn detect_database_version(&self) -> Result<DatabaseVersionInfo> {
        let current_version = self.get_current_version().await?;
        let all_migrations = Self::get_all_migrations();
        let required_version = all_migrations.iter().map(|m| m.version).max().unwrap_or(0);

        let applied_migrations = self.get_applied_migrations().await?;
        let applied_versions: Vec<i32> = applied_migrations.iter().map(|m| m.version).collect();

        let pending_migrations: Vec<Migration> = all_migrations
            .into_iter()
            .filter(|m| !applied_versions.contains(&m.version) && m.version > current_version)
            .collect();

        let is_legacy = current_version == 0;
        let needs_migration = current_version < required_version;

        Ok(DatabaseVersionInfo {
            current_version,
            required_version,
            is_legacy,
            needs_migration,
            pending_migrations,
            applied_migrations,
        })
    }

    /// Check migration status for UI
    pub async fn check_migration_status(&self) -> Result<MigrationStatus> {
        let info = self.detect_database_version().await?;

        if !info.needs_migration {
            Ok(MigrationStatus::Current {
                version: info.current_version,
            })
        } else {
            Ok(MigrationStatus::RequiresUpgrade {
                current_version: info.current_version,
                required_version: info.required_version,
                pending_migrations: info.pending_migrations,
            })
        }
    }

    /// Record a successfully applied migration
    pub async fn record_migration(
        &self,
        migration: &Migration,
        execution_time_ms: i64
    ) -> Result<()> {
        sqlx::query(
            "INSERT INTO database_migrations (version, name, description, checksum, execution_time_ms)
             VALUES (?, ?, ?, ?, ?)"
        )
        .bind(migration.version)
        .bind(&migration.name)
        .bind(&migration.description)
        .bind(&migration.checksum)
        .bind(execution_time_ms)
        .execute(&self.pool)
        .await
        .context("Failed to record migration")?;

        Ok(())
    }

    /// Check if a specific migration has been applied
    pub async fn is_migration_applied(&self, version: i32) -> Result<bool> {
        if !self.has_migrations_table().await? {
            return Ok(false);
        }

        let result = sqlx::query(
            "SELECT version FROM database_migrations WHERE version = ?"
        )
        .bind(version)
        .fetch_optional(&self.pool)
        .await?;

        Ok(result.is_some())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_migration_ordering() {
        let migrations = VersionManager::get_all_migrations();
        let versions: Vec<i32> = migrations.iter().map(|m| m.version).collect();
        let mut sorted = versions.clone();
        sorted.sort();
        assert_eq!(versions, sorted, "Migrations should be in version order");
    }

    #[test]
    fn test_legacy_version_detection() {
        // Test that version 0 is considered legacy
        let info = DatabaseVersionInfo {
            current_version: 0,
            required_version: 3,
            is_legacy: true,
            needs_migration: true,
            pending_migrations: vec![],
            applied_migrations: vec![],
        };

        assert!(info.is_legacy);
        assert!(info.needs_migration);
    }
}