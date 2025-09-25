// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::sync::Arc;
use tauri::{State, Manager};

mod database;
mod models;
mod handlers;
mod services;
mod utils;
mod version;

use database::{DatabaseManager, migrations::MigrationRunner};
use version::VersionInfo;
use handlers::{
    customer_handler,
    invoice_handler,
    service_handler,
    store_handler,
    report_handler,
    pricing_handler,
    html_handler,
    tag_handler,
    email_handler,
};

// Application state
struct AppState {
    db: Arc<DatabaseManager>,
}

#[tokio::main]
async fn main() {
    env_logger::init();

    tauri::Builder::default()
        .setup(|app| {
            // Initialize database with app handle
            let app_handle = app.handle();
            tauri::async_runtime::spawn(async move {
                match DatabaseManager::new(&app_handle).await {
                    Ok(db_manager) => {
                        app_handle.manage(AppState {
                            db: Arc::new(db_manager),
                        });

                        // Run database migrations
                        if let Some(state) = app_handle.try_state::<AppState>() {
                            let version_info = VersionInfo::new();
                            let migration_runner = MigrationRunner::new(state.db.get_pool_cloned());

                            // Check if database needs migration
                            match migration_runner.needs_migration(&version_info.app_version, version_info.required_db_version).await {
                                Ok(needs_migration) => {
                                    if needs_migration {
                                        log::info!("Database migration required. Running migrations...");
                                        if let Err(e) = migration_runner.migrate().await {
                                            log::error!("Failed to run database migrations: {}", e);
                                            std::process::exit(1);
                                        }
                                        log::info!("Database migrations completed successfully");
                                    } else {
                                        log::info!("Database is up to date");
                                    }
                                }
                                Err(e) => {
                                    log::error!("Failed to check migration status: {}", e);
                                    // Try to initialize schema for new databases
                                    if let Err(e) = state.db.initialize_schema().await {
                                        log::error!("Failed to initialize database schema: {}", e);
                                        std::process::exit(1);
                                    }
                                }
                            }
                        }
                    },
                    Err(e) => {
                        log::error!("Failed to initialize database: {}", e);
                        std::process::exit(1);
                    }
                }
            });
            Ok(())
        })
        .on_window_event(|event| {
            if let tauri::WindowEvent::CloseRequested { .. } = event.event() {
                log::info!("Application close requested - email backup feature will be triggered on next app start");

                // Note: Due to Rust lifetime constraints with event handlers,
                // we cannot easily implement the backup-on-close feature here.
                // As an alternative, the backup can be triggered manually from the settings
                // or on app startup to backup the previous session.
            }
        })
        .invoke_handler(tauri::generate_handler![
            // Customer operations
            customer_handler::create_customer,
            customer_handler::get_customer_by_id,
            customer_handler::search_customers,
            customer_handler::update_customer,
            customer_handler::delete_customer,
            customer_handler::get_customers_with_stats,
            customer_handler::update_customer_status,

            // Store operations
            store_handler::create_store,
            store_handler::get_store_by_id,
            store_handler::search_stores,
            store_handler::update_store,
            store_handler::update_store_status,
            store_handler::delete_store,
            store_handler::get_active_stores,

            // Service operations
            service_handler::create_service,
            service_handler::get_service_by_id,
            service_handler::search_services,
            service_handler::update_service,
            service_handler::update_service_status,
            service_handler::get_service_variants,
            service_handler::get_service_addons,
            service_handler::get_service_categories,
            service_handler::get_services_by_category,
            service_handler::get_addons,

            // Invoice operations
            invoice_handler::create_invoice,
            invoice_handler::get_invoice_by_id,
            invoice_handler::search_invoices,
            invoice_handler::update_invoice,
            invoice_handler::update_invoice_status,
            invoice_handler::update_invoice_details,
            invoice_handler::delete_invoice,

            // Pricing operations
            pricing_handler::calculate_service_pricing,
            pricing_handler::calculate_gst_only,
            pricing_handler::calculate_express_delivery_charge,
            pricing_handler::calculate_loyalty_discount_amount,
            pricing_handler::get_service_price_preview,
            pricing_handler::validate_pricing_request_api,

            // HTML operations
            html_handler::save_invoice_html_a5,
            html_handler::save_invoice_html_a4,
            html_handler::save_invoice_html_thermal,
            html_handler::save_and_open_invoice_html,
            html_handler::preview_invoice_html,
            html_handler::convert_amount_to_words,
            html_handler::validate_html_output_path,
            html_handler::open_html_file,

            // Report operations
            report_handler::get_sales_summary,
            report_handler::get_gst_summary,
            report_handler::get_customer_summary,
            report_handler::get_service_popularity,
            report_handler::get_express_delivery_summary,

            // Tag operations
            tag_handler::generate_invoice_tags,
            tag_handler::print_invoice_tags,
            tag_handler::get_invoice_tags,
            tag_handler::get_invoice_tag_summary,
            tag_handler::get_tag_settings,
            tag_handler::save_tag_settings,
            tag_handler::get_tag_preview,

            // Email operations
            email_handler::save_email_config,
            email_handler::get_email_config,
            email_handler::test_email_connection,
            email_handler::send_backup_email,
            email_handler::get_smtp_presets,
            email_handler::update_email_config,
            email_handler::delete_email_config,

            // Utility operations
            initialize_database,
            backup_database,
            restore_database,
            get_database_path,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[tauri::command]
async fn initialize_database(state: State<'_, AppState>) -> Result<String, String> {
    let pool = state.db.get_pool_cloned();

    // Execute initialization directly on the pool
    let schema = include_str!("database/schema.sql");
    match sqlx::query(schema).execute(&pool).await {
        Ok(_) => {
            // Execute seed data
            let seed_sql = include_str!("database/seed.sql");
            match sqlx::query(seed_sql).execute(&pool).await {
                Ok(_) => Ok("Database initialized successfully".to_string()),
                Err(e) => Err(format!("Failed to seed database: {}", e)),
            }
        },
        Err(e) => Err(format!("Failed to initialize database schema: {}", e)),
    }
}

#[tauri::command]
async fn backup_database(
    app_handle: tauri::AppHandle,
    state: State<'_, AppState>,
    backup_path: String,
) -> Result<String, String> {
    match state.db.backup_to_file(&app_handle, &backup_path).await {
        Ok(_) => Ok("Database backed up successfully".to_string()),
        Err(e) => Err(format!("Failed to backup database: {}", e)),
    }
}

#[tauri::command]
async fn restore_database(
    app_handle: tauri::AppHandle,
    state: State<'_, AppState>,
    backup_path: String,
) -> Result<String, String> {
    match state.db.restore_from_file(&app_handle, &backup_path).await {
        Ok(_) => Ok("Database restored successfully".to_string()),
        Err(e) => Err(format!("Failed to restore database: {}", e)),
    }
}

#[tauri::command]
async fn get_database_path(app_handle: tauri::AppHandle) -> Result<String, String> {
    match DatabaseManager::get_database_path(&app_handle) {
        Ok(path) => Ok(path.to_string_lossy().to_string()),
        Err(e) => Err(format!("Failed to get database path: {}", e)),
    }
}