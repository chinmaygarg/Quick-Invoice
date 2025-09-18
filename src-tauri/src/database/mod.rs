use anyhow::{Context, Result};
use sqlx::{sqlite::SqlitePool, Row, Sqlite, Transaction};
use std::path::Path;
use tokio::fs;

pub struct DatabaseManager {
    pool: SqlitePool,
}

impl DatabaseManager {
    pub async fn new() -> Result<Self> {
        let database_url = "sqlite:database.sqlite";

        let pool = SqlitePool::connect(database_url)
            .await
            .context("Failed to connect to database")?;

        Ok(Self { pool })
    }

    pub async fn new_with_url(database_url: &str) -> Result<Self> {
        let pool = SqlitePool::connect(database_url)
            .await
            .context("Failed to connect to database")?;

        Ok(Self { pool })
    }

    pub async fn initialize_schema(&self) -> Result<()> {
        // Read and execute schema file
        let schema = include_str!("schema.sql");
        sqlx::query(schema)
            .execute(&self.pool)
            .await
            .context("Failed to initialize database schema")?;

        // Insert seed data
        self.seed_data().await?;

        Ok(())
    }

    async fn seed_data(&self) -> Result<()> {
        let seed_sql = include_str!("seed.sql");
        sqlx::query(seed_sql)
            .execute(&self.pool)
            .await
            .context("Failed to seed database")?;

        Ok(())
    }

    pub async fn begin_transaction(&self) -> Result<Transaction<'_, Sqlite>> {
        self.pool
            .begin()
            .await
            .context("Failed to begin transaction")
    }

    pub fn get_pool(&self) -> &SqlitePool {
        &self.pool
    }

    pub fn get_pool_cloned(&self) -> SqlitePool {
        self.pool.clone()
    }

    pub async fn backup_to_file(&self, backup_path: &str) -> Result<()> {
        // Simple backup by copying the database file
        // In production, you might want to use SQLite's backup API
        let source_path = "database.sqlite";

        if Path::new(source_path).exists() {
            fs::copy(source_path, backup_path)
                .await
                .context("Failed to copy database file")?;
        }

        Ok(())
    }

    pub async fn restore_from_file(&self, backup_path: &str) -> Result<()> {
        // Close current connections and restore from backup
        self.pool.close().await;

        let target_path = "database.sqlite";
        fs::copy(backup_path, target_path)
            .await
            .context("Failed to restore database file")?;

        Ok(())
    }

    pub async fn close(&self) {
        self.pool.close().await;
    }
}