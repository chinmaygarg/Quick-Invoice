// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::sync::{Arc, Mutex};
use tauri::State;

mod database;
mod models;
mod handlers;
mod services;
mod utils;

use database::DatabaseManager;
use handlers::{
    customer_handler,
    invoice_handler,
    service_handler,
    store_handler,
    report_handler,
    pricing_handler,
    pdf_handler,
};

// Application state
struct AppState {
    db: Arc<Mutex<DatabaseManager>>,
}

#[tokio::main]
async fn main() {
    env_logger::init();

    // Initialize database
    let db_manager = DatabaseManager::new().await.expect("Failed to initialize database");

    tauri::Builder::default()
        .manage(AppState {
            db: Arc::new(Mutex::new(db_manager)),
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

            // Invoice operations
            invoice_handler::create_invoice,
            invoice_handler::get_invoice_by_id,
            invoice_handler::search_invoices,
            invoice_handler::update_invoice,
            invoice_handler::update_invoice_status,
            invoice_handler::delete_invoice,

            // Pricing operations
            pricing_handler::calculate_service_pricing,
            pricing_handler::calculate_gst_only,
            pricing_handler::calculate_express_delivery_charge,
            pricing_handler::calculate_loyalty_discount_amount,
            pricing_handler::get_service_price_preview,
            pricing_handler::validate_pricing_request_api,

            // PDF operations
            pdf_handler::generate_invoice_pdf_a5,
            pdf_handler::generate_invoice_pdf_a4,
            pdf_handler::generate_invoice_pdf_thermal,
            pdf_handler::preview_invoice_html,
            pdf_handler::convert_amount_to_words,
            pdf_handler::validate_pdf_output_path,

            // Report operations
            report_handler::get_sales_summary,
            report_handler::get_gst_summary,
            report_handler::get_customer_summary,
            report_handler::get_service_popularity,
            report_handler::get_express_delivery_summary,

            // Utility operations
            initialize_database,
            backup_database,
            restore_database,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[tauri::command]
async fn initialize_database(state: State<'_, AppState>) -> Result<String, String> {
    let db_arc = state.db.clone();
    let db_manager = {
        let db = db_arc.lock().unwrap();
        db.get_pool_cloned()
    };

    // Execute initialization directly on the pool
    let schema = include_str!("database/schema.sql");
    match sqlx::query(schema).execute(&db_manager).await {
        Ok(_) => {
            // Execute seed data
            let seed_sql = include_str!("database/seed.sql");
            match sqlx::query(seed_sql).execute(&db_manager).await {
                Ok(_) => Ok("Database initialized successfully".to_string()),
                Err(e) => Err(format!("Failed to seed database: {}", e)),
            }
        },
        Err(e) => Err(format!("Failed to initialize database schema: {}", e)),
    }
}

#[tauri::command]
async fn backup_database(
    state: State<'_, AppState>,
    backup_path: String,
) -> Result<String, String> {
    use tokio::fs;
    use std::path::Path;

    // Simple backup by copying the database file
    let source_path = "database.sqlite";

    if Path::new(source_path).exists() {
        match fs::copy(source_path, &backup_path).await {
            Ok(_) => Ok("Database backed up successfully".to_string()),
            Err(e) => Err(format!("Failed to copy database file: {}", e)),
        }
    } else {
        Err("Database file not found".to_string())
    }
}

#[tauri::command]
async fn restore_database(
    state: State<'_, AppState>,
    backup_path: String,
) -> Result<String, String> {
    use tokio::fs;

    // Close current connections first
    let db_arc = state.db.clone();
    let close_result = {
        let db = db_arc.lock().unwrap();
        let pool_clone = db.get_pool_cloned();
        drop(db); // Drop the lock before awaiting
        pool_clone.close().await;
        Ok(())
    };

    let target_path = "database.sqlite";
    match fs::copy(&backup_path, target_path).await {
        Ok(_) => Ok("Database restored successfully".to_string()),
        Err(e) => Err(format!("Failed to restore database file: {}", e)),
    }
}