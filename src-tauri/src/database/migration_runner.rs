use anyhow::{Result, Context, bail};
use sqlx::{Pool, Sqlite, Transaction};
use std::path::PathBuf;
use std::time::Instant;
use super::version_manager::{Migration, VersionManager};
use super::embedded_migrations;

pub struct MigrationRunner {
    pool: Pool<Sqlite>,
    version_manager: VersionManager,
    migrations_dir: PathBuf,
}

impl MigrationRunner {
    pub fn new(pool: Pool<Sqlite>) -> Self {
        let version_manager = VersionManager::new(pool.clone());

        // Get migrations directory path
        let migrations_dir = PathBuf::from("src/database/migrations");

        Self {
            pool,
            version_manager,
            migrations_dir,
        }
    }

    /// Set custom migrations directory (useful for production builds)
    pub fn with_migrations_dir(mut self, dir: PathBuf) -> Self {
        self.migrations_dir = dir;
        self
    }

    /// Load migration SQL from embedded resources
    async fn load_migration_sql(&self, migration: &Migration) -> Result<String> {
        log::info!("Loading migration SQL for v{}: {} from file: {}",
            migration.version, migration.name, migration.sql_file);

        // Use embedded SQL instead of reading from filesystem
        let sql = embedded_migrations::get_migration_sql(migration.version, &migration.sql_file)
            .ok_or_else(|| {
                anyhow::anyhow!("Migration SQL not found for v{}: {} (file: {})",
                    migration.version, migration.name, migration.sql_file)
            })?;

        Ok(sql.to_string())
    }

    /// Validate migration SQL (basic checks)
    fn validate_migration_sql(&self, sql: &str, migration: &Migration) -> Result<()> {
        if sql.trim().is_empty() {
            bail!("Migration {} has empty SQL", migration.name);
        }

        // Check for dangerous operations in automated migrations
        let dangerous_keywords = ["DROP TABLE", "DROP DATABASE", "DELETE FROM"];
        for keyword in dangerous_keywords {
            if sql.to_uppercase().contains(keyword) {
                log::warn!(
                    "Migration {} contains potentially dangerous operation: {}",
                    migration.name,
                    keyword
                );
            }
        }

        Ok(())
    }

    /// Apply a single migration
    pub async fn apply_migration(&self, migration: &Migration) -> Result<()> {
        log::info!("Applying migration v{}: {}", migration.version, migration.name);

        // Check if already applied
        if self.version_manager.is_migration_applied(migration.version).await? {
            log::info!("Migration v{} already applied, skipping", migration.version);
            return Ok(());
        }

        // Load migration SQL
        let sql = self.load_migration_sql(migration).await?;

        // Validate SQL
        self.validate_migration_sql(&sql, migration)?;

        // Start timing
        let start = Instant::now();

        // Begin transaction for atomic migration
        let mut tx = self.pool.begin().await?;

        // Execute migration SQL
        self.execute_migration_sql(&mut tx, &sql, migration).await?;

        // Record migration
        let execution_time_ms = start.elapsed().as_millis() as i64;
        self.record_migration_in_tx(&mut tx, migration, execution_time_ms).await?;

        // Commit transaction
        tx.commit()
            .await
            .context("Failed to commit migration transaction")?;

        log::info!(
            "Migration v{} applied successfully in {}ms",
            migration.version,
            execution_time_ms
        );

        Ok(())
    }

    /// Execute migration SQL within a transaction
    async fn execute_migration_sql(
        &self,
        tx: &mut Transaction<'_, Sqlite>,
        sql: &str,
        migration: &Migration,
    ) -> Result<()> {
        log::debug!("Executing migration v{}: {}", migration.version, migration.name);

        // For SQLite, we can execute the entire SQL as one batch
        // SQLite handles multiple statements properly when executed this way
        match sqlx::query(sql)
            .execute(&mut **tx)
            .await
        {
            Ok(_) => {
                log::info!("Successfully executed migration v{}: {}",
                    migration.version, migration.name);
                Ok(())
            }
            Err(e) => {
                log::error!("Failed to execute migration v{}: {}\nError: {:?}",
                    migration.version, migration.name, e);
                Err(e).with_context(|| {
                    format!("Failed to execute migration v{}: {}",
                        migration.version, migration.name)
                })
            }
        }
    }

    /// Record migration in transaction
    async fn record_migration_in_tx(
        &self,
        tx: &mut Transaction<'_, Sqlite>,
        migration: &Migration,
        execution_time_ms: i64,
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
        .execute(&mut **tx)
        .await
        .context("Failed to record migration")?;

        Ok(())
    }

    /// Apply all pending migrations
    pub async fn apply_pending_migrations(&self) -> Result<Vec<Migration>> {
        // Ensure migrations table exists
        self.version_manager.create_migrations_table().await?;

        // Get version info
        let version_info = self.version_manager.detect_database_version().await?;

        if version_info.pending_migrations.is_empty() {
            log::info!("No pending migrations to apply");
            return Ok(vec![]);
        }

        log::info!(
            "Found {} pending migrations to apply",
            version_info.pending_migrations.len()
        );

        let mut applied = Vec::new();

        for migration in &version_info.pending_migrations {
            self.apply_migration(migration).await?;
            applied.push(migration.clone());
        }

        log::info!("Successfully applied {} migrations", applied.len());

        Ok(applied)
    }

    /// Rollback support (for future implementation)
    pub async fn rollback_migration(&self, version: i32) -> Result<()> {
        // This would require DOWN migrations to be defined
        // For now, we don't support rollback
        bail!("Migration rollback not yet implemented for version {}", version);
    }

    /// Check if migrations are needed without applying them
    pub async fn check_pending_migrations(&self) -> Result<Vec<Migration>> {
        let version_info = self.version_manager.detect_database_version().await?;
        Ok(version_info.pending_migrations)
    }

    /// Initialize database with latest schema (for fresh installs)
    pub async fn initialize_database(&self) -> Result<()> {
        log::info!("Initializing fresh database with latest schema");

        // Create migrations table
        self.version_manager.create_migrations_table().await?;

        // Apply all migrations in order
        let all_migrations = VersionManager::get_all_migrations();

        for migration in &all_migrations {
            self.apply_migration(migration).await?;
        }

        log::info!("Database initialized with version {}", all_migrations.len());

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_sql_statement_splitting() {
        let sql = r#"
            CREATE TABLE test1 (id INTEGER);
            -- This is a comment
            CREATE TABLE test2 (id INTEGER);

            CREATE INDEX idx_test ON test1(id);
        "#;

        let statements: Vec<&str> = sql
            .split(';')
            .map(|s| s.trim())
            .filter(|s| !s.is_empty() && !s.starts_with("--"))
            .collect();

        assert_eq!(statements.len(), 3);
    }

    #[test]
    fn test_dangerous_sql_detection() {
        let runner = MigrationRunner::new(todo!());

        let migration = Migration {
            version: 1,
            name: "test".to_string(),
            description: "test".to_string(),
            sql_file: "test.sql".to_string(),
            checksum: "test".to_string(),
        };

        let dangerous_sql = "DROP TABLE users; DELETE FROM customers;";

        // Should not error, just warn
        assert!(runner.validate_migration_sql(dangerous_sql, &migration).is_ok());
    }
}