use anyhow::{Context, Result};
use sqlx::{Row, SqlitePool};
use std::collections::HashMap;
use chrono::{DateTime, Utc};
use log::{info, warn};

#[derive(Debug, Clone)]
pub struct Migration {
    pub version: i32,
    pub name: String,
    pub up_sql: String,
    pub down_sql: Option<String>,
    pub checksum: String,
}

#[derive(Debug)]
pub struct AppliedMigration {
    pub version: i32,
    pub name: String,
    pub checksum: String,
    pub applied_at: DateTime<Utc>,
}

pub struct MigrationRunner {
    pool: SqlitePool,
    migrations: HashMap<i32, Migration>,
}

impl MigrationRunner {
    pub fn new(pool: SqlitePool) -> Self {
        let mut runner = Self {
            pool,
            migrations: HashMap::new(),
        };

        runner.register_migrations();
        runner
    }

    fn register_migrations(&mut self) {
        // Register all available migrations
        self.register_migration(Migration {
            version: 1,
            name: "initial_schema".to_string(),
            up_sql: include_str!("migrations/v001_initial_schema.sql").to_string(),
            down_sql: None, // Initial migration cannot be rolled back
            checksum: self.calculate_checksum(include_str!("migrations/v001_initial_schema.sql")),
        });

        // Register GST calculation fixes migration
        self.register_migration(Migration {
            version: 2,
            name: "gst_calculation_fixes".to_string(),
            up_sql: include_str!("migrations/v002_gst_fixes.sql").to_string(),
            down_sql: None, // GST fixes are not reversible as they correct data integrity
            checksum: self.calculate_checksum(include_str!("migrations/v002_gst_fixes.sql")),
        });

        // Register email configuration migration
        self.register_migration(Migration {
            version: 3,
            name: "email_configuration".to_string(),
            up_sql: include_str!("migrations/v003_email_config.sql").to_string(),
            down_sql: None, // Email config is not reversible
            checksum: self.calculate_checksum(include_str!("migrations/v003_email_config.sql")),
        });
    }

    fn register_migration(&mut self, migration: Migration) {
        self.migrations.insert(migration.version, migration);
    }

    fn calculate_checksum(&self, content: &str) -> String {
        use std::collections::hash_map::DefaultHasher;
        use std::hash::{Hash, Hasher};

        let mut hasher = DefaultHasher::new();
        content.hash(&mut hasher);
        format!("{:x}", hasher.finish())
    }

    /// Initialize the migration system tables if they don't exist
    pub async fn initialize(&self) -> Result<()> {
        info!("Initializing migration system tables");

        // Create schema_migrations table
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS schema_migrations (
                version INTEGER PRIMARY KEY,
                name TEXT NOT NULL,
                checksum TEXT NOT NULL,
                applied_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
            "#,
        )
        .execute(&self.pool)
        .await
        .context("Failed to create schema_migrations table")?;

        // Create app_metadata table
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS app_metadata (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
            "#,
        )
        .execute(&self.pool)
        .await
        .context("Failed to create app_metadata table")?;

        Ok(())
    }

    /// Get the current database schema version
    pub async fn get_current_version(&self) -> Result<Option<i32>> {
        let row = sqlx::query("SELECT MAX(version) as max_version FROM schema_migrations")
            .fetch_optional(&self.pool)
            .await
            .context("Failed to query current schema version")?;

        match row {
            Some(row) => {
                let version: Option<i32> = row.get("max_version");
                Ok(version)
            }
            None => Ok(None),
        }
    }

    /// Get all applied migrations
    pub async fn get_applied_migrations(&self) -> Result<Vec<AppliedMigration>> {
        let rows = sqlx::query(
            r#"
            SELECT version, name, checksum, applied_at
            FROM schema_migrations
            ORDER BY version ASC
            "#,
        )
        .fetch_all(&self.pool)
        .await
        .context("Failed to fetch applied migrations")?;

        let mut applied = Vec::new();
        for row in rows {
            let applied_at_str: String = row.get("applied_at");
            let applied_at = DateTime::parse_from_rfc3339(&format!("{}Z", applied_at_str))
                .or_else(|_| DateTime::parse_from_str(&applied_at_str, "%Y-%m-%d %H:%M:%S"))
                .unwrap_or_else(|_| Utc::now().into())
                .with_timezone(&Utc);

            applied.push(AppliedMigration {
                version: row.get("version"),
                name: row.get("name"),
                checksum: row.get("checksum"),
                applied_at,
            });
        }

        Ok(applied)
    }

    /// Get pending migrations that need to be applied
    pub async fn get_pending_migrations(&self) -> Result<Vec<&Migration>> {
        let applied = self.get_applied_migrations().await?;
        let applied_versions: std::collections::HashSet<i32> =
            applied.iter().map(|m| m.version).collect();

        let mut pending: Vec<&Migration> = self.migrations
            .values()
            .filter(|m| !applied_versions.contains(&m.version))
            .collect();

        // Sort by version
        pending.sort_by_key(|m| m.version);

        Ok(pending)
    }

    /// Validate applied migrations against registered migrations
    pub async fn validate_migrations(&self) -> Result<()> {
        let applied = self.get_applied_migrations().await?;

        for applied_migration in applied {
            if let Some(registered_migration) = self.migrations.get(&applied_migration.version) {
                if applied_migration.checksum != registered_migration.checksum {
                    return Err(anyhow::anyhow!(
                        "Migration {} has been modified after being applied. Expected checksum: {}, Found: {}",
                        applied_migration.name,
                        applied_migration.checksum,
                        registered_migration.checksum
                    ));
                }
            } else {
                warn!(
                    "Applied migration {} (version {}) is not registered in the current codebase",
                    applied_migration.name,
                    applied_migration.version
                );
            }
        }

        Ok(())
    }

    /// Create a backup of the database before running migrations
    pub async fn create_backup(&self, backup_path: &str) -> Result<()> {
        info!("Creating database backup at: {}", backup_path);

        // This would use SQLite's backup API in production
        // For now, we'll implement a simple backup strategy
        let backup_sql = r#"
            VACUUM INTO ?
        "#;

        sqlx::query(backup_sql)
            .bind(backup_path)
            .execute(&self.pool)
            .await
            .context("Failed to create database backup")?;

        info!("Database backup created successfully");
        Ok(())
    }

    /// Run a single migration
    pub async fn run_migration(&self, migration: &Migration) -> Result<()> {
        info!("Running migration: {} (version {})", migration.name, migration.version);

        // Start transaction
        let mut tx = self.pool.begin().await
            .context("Failed to start migration transaction")?;

        // Execute the migration SQL
        for statement in migration.up_sql.split(';') {
            let statement = statement.trim();
            if !statement.is_empty() {
                sqlx::query(statement)
                    .execute(&mut *tx)
                    .await
                    .with_context(|| format!("Failed to execute migration statement: {}", statement))?;
            }
        }

        // Record the migration as applied
        sqlx::query(
            r#"
            INSERT INTO schema_migrations (version, name, checksum, applied_at)
            VALUES (?, ?, ?, CURRENT_TIMESTAMP)
            "#,
        )
        .bind(migration.version)
        .bind(&migration.name)
        .bind(&migration.checksum)
        .execute(&mut *tx)
        .await
        .context("Failed to record migration")?;

        // Commit transaction
        tx.commit().await
            .context("Failed to commit migration transaction")?;

        info!("Migration {} completed successfully", migration.name);
        Ok(())
    }

    /// Run all pending migrations
    pub async fn migrate(&self) -> Result<()> {
        // Initialize migration tables if needed
        self.initialize().await?;

        // Validate existing migrations
        self.validate_migrations().await?;

        // Get pending migrations
        let pending = self.get_pending_migrations().await?;

        if pending.is_empty() {
            info!("Database is up to date, no migrations needed");
            return Ok(());
        }

        info!("Found {} pending migration(s)", pending.len());

        // Create backup before running migrations
        let backup_path = format!("database_backup_{}.sqlite",
            chrono::Utc::now().format("%Y%m%d_%H%M%S"));

        if let Err(e) = self.create_backup(&backup_path).await {
            warn!("Failed to create backup: {}. Continuing with migration...", e);
        }

        // Run each migration
        for migration in pending {
            self.run_migration(migration).await
                .with_context(|| format!("Failed to run migration: {}", migration.name))?;
        }

        // Update app metadata with current version
        let latest_version = self.get_current_version().await?
            .unwrap_or(0);

        self.set_app_metadata("db_version", &latest_version.to_string()).await?;

        info!("All migrations completed successfully. Database is now at version {}", latest_version);
        Ok(())
    }

    /// Set application metadata
    pub async fn set_app_metadata(&self, key: &str, value: &str) -> Result<()> {
        sqlx::query(
            r#"
            INSERT OR REPLACE INTO app_metadata (key, value, updated_at)
            VALUES (?, ?, CURRENT_TIMESTAMP)
            "#,
        )
        .bind(key)
        .bind(value)
        .execute(&self.pool)
        .await
        .context("Failed to set app metadata")?;

        Ok(())
    }

    /// Get application metadata
    pub async fn get_app_metadata(&self, key: &str) -> Result<Option<String>> {
        let row = sqlx::query("SELECT value FROM app_metadata WHERE key = ?")
            .bind(key)
            .fetch_optional(&self.pool)
            .await
            .context("Failed to get app metadata")?;

        Ok(row.map(|r| r.get("value")))
    }

    /// Check if database needs migration for the current app version
    pub async fn needs_migration(&self, current_app_version: &str, required_db_version: i32) -> Result<bool> {
        let current_db_version = self.get_current_version().await?.unwrap_or(0);

        info!("App version: {}, Current DB version: {}, Required DB version: {}",
            current_app_version, current_db_version, required_db_version);

        Ok(current_db_version < required_db_version)
    }
}