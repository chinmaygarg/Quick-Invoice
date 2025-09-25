use anyhow::{Context, Result};
use sqlx::{sqlite::SqlitePool, Sqlite, Transaction};
use std::path::PathBuf;
use tokio::fs::{self, File};
use tauri::AppHandle;

pub mod migrations;

pub struct DatabaseManager {
    pool: SqlitePool,
}

impl DatabaseManager {
    pub async fn new(app_handle: &AppHandle) -> Result<Self> {
        let database_path = Self::get_database_path(app_handle)?;

        // Create the app data directory if it doesn't exist
        if let Some(parent) = database_path.parent() {
            fs::create_dir_all(parent)
                .await
                .context("Failed to create app data directory")?;
        }

        // Create the database file if it doesn't exist
        if !database_path.exists() {
            File::create(&database_path)
                .await
                .context("Failed to create database file")?;
        }

        let database_url = format!("sqlite:{}", database_path.display());

        let pool = SqlitePool::connect(&database_url)
            .await
            .context("Failed to connect to database")?;

        Ok(Self { pool })
    }

    pub fn get_database_path(app_handle: &AppHandle) -> Result<PathBuf> {
        let app_data_dir = app_handle
            .path_resolver()
            .app_data_dir()
            .context("Failed to get app data directory")?;

        Ok(app_data_dir.join("database.sqlite"))
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

    pub async fn backup_to_file(&self, app_handle: &AppHandle, backup_path: &str) -> Result<()> {
        // Simple backup by copying the database file
        // In production, you might want to use SQLite's backup API
        let source_path = Self::get_database_path(app_handle)?;

        if source_path.exists() {
            fs::copy(&source_path, backup_path)
                .await
                .context("Failed to copy database file")?;
        }

        Ok(())
    }

    pub async fn restore_from_file(&self, app_handle: &AppHandle, backup_path: &str) -> Result<()> {
        // Close current connections and restore from backup
        self.pool.close().await;

        let target_path = Self::get_database_path(app_handle)?;
        fs::copy(backup_path, &target_path)
            .await
            .context("Failed to restore database file")?;

        Ok(())
    }

    pub async fn close(&self) {
        self.pool.close().await;
    }
}