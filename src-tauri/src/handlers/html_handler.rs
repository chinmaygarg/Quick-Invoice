use crate::models::{Invoice, Customer, Store, InvoiceItem, ApiResult, ApiError};
use crate::services::html_generator::{
    HtmlGenerator, InvoiceHtmlData, InvoiceItemWithDetails, InvoiceAddonDetail, HtmlTotals
};
use sqlx::Row;
use tauri::{State, AppHandle, Manager, api::shell};
use std::process::Command;
use std::fs;
use std::path::PathBuf;

#[tauri::command]
pub async fn save_invoice_html_a5(
    app_handle: AppHandle,
    state: State<'_, crate::AppState>,
    invoice_id: i64,
) -> ApiResult<String> {
    let html_data = get_invoice_html_data(state.clone(), invoice_id).await?;
    let settings = HtmlGenerator::get_a5_settings(&html_data.store);
    let output_dir = get_invoice_output_dir(&app_handle)?;

    HtmlGenerator::save_invoice_html(&html_data, &settings, &output_dir, "a5")
}

#[tauri::command]
pub async fn save_invoice_html_a4(
    app_handle: AppHandle,
    state: State<'_, crate::AppState>,
    invoice_id: i64,
) -> ApiResult<String> {
    let html_data = get_invoice_html_data(state.clone(), invoice_id).await?;
    let settings = HtmlGenerator::get_a4_settings(&html_data.store);
    let output_dir = get_invoice_output_dir(&app_handle)?;

    HtmlGenerator::save_invoice_html(&html_data, &settings, &output_dir, "a4")
}

#[tauri::command]
pub async fn save_invoice_html_thermal(
    app_handle: AppHandle,
    state: State<'_, crate::AppState>,
    invoice_id: i64,
) -> ApiResult<String> {
    let html_data = get_invoice_html_data(state.clone(), invoice_id).await?;
    let settings = HtmlGenerator::get_thermal_settings(&html_data.store);
    let output_dir = get_invoice_output_dir(&app_handle)?;

    HtmlGenerator::save_invoice_html(&html_data, &settings, &output_dir, "thermal")
}

#[tauri::command]
pub async fn save_and_open_invoice_html(
    app_handle: AppHandle,
    state: State<'_, crate::AppState>,
    invoice_id: i64,
    format: String,
) -> ApiResult<String> {
    // Save HTML file first
    let file_path = match format.as_str() {
        "a4" => save_invoice_html_a4(app_handle.clone(), state, invoice_id).await?,
        "a5" => save_invoice_html_a5(app_handle.clone(), state, invoice_id).await?,
        "thermal" => save_invoice_html_thermal(app_handle.clone(), state, invoice_id).await?,
        _ => return Err(ApiError {
            message: format!("Invalid format: {}. Supported formats: a4, a5, thermal", format),
            code: Some("INVALID_FORMAT".to_string()),
        }),
    };

    log::info!("Attempting to open HTML file: {}", file_path);

    // Try shell::open first with direct path
    match shell::open(&app_handle.shell_scope(), file_path.clone(), None) {
        Ok(_) => {
            log::info!("Successfully opened file with shell::open: {}", file_path);
        }
        Err(e) => {
            log::warn!("shell::open failed: {}, trying system open command", e);

            // Fallback to system open command on macOS
            Command::new("open")
                .arg(&file_path)
                .spawn()
                .map_err(|cmd_err| ApiError {
                    message: format!("Failed to open HTML file. shell::open error: {}, open command error: {}", e, cmd_err),
                    code: Some("BROWSER_OPEN_ERROR".to_string()),
                })?;

            log::info!("Successfully opened file with system open command: {}", file_path);
        }
    }

    log::info!("HTML file opened in browser: {}", file_path);
    Ok(file_path)
}

#[tauri::command]
pub async fn preview_invoice_html(
    state: State<'_, crate::AppState>,
    invoice_id: i64,
    paper_size: String,
) -> ApiResult<String> {
    let html_data = get_invoice_html_data(state.clone(), invoice_id).await?;

    // Generate HTML based on paper size
    let settings = match paper_size.as_str() {
        "A4" => HtmlGenerator::get_a4_settings(&html_data.store),
        "A5" => HtmlGenerator::get_a5_settings(&html_data.store),
        "thermal" => HtmlGenerator::get_thermal_settings(&html_data.store),
        _ => HtmlGenerator::get_a5_settings(&html_data.store), // Default to A5
    };

    // Generate and return HTML content
    match paper_size.as_str() {
        "A4" => HtmlGenerator::generate_a4_invoice(&html_data),
        "A5" => HtmlGenerator::generate_a5_invoice(&html_data),
        "thermal" => HtmlGenerator::generate_thermal_invoice(&html_data),
        _ => HtmlGenerator::generate_a5_invoice(&html_data), // Default to A5
    }
}

#[tauri::command]
pub async fn convert_amount_to_words(amount: f64) -> ApiResult<String> {
    Ok(HtmlGenerator::amount_to_words(amount))
}

#[tauri::command]
pub async fn validate_html_output_path(path: String) -> ApiResult<bool> {
    let path_buf = PathBuf::from(&path);

    // Check if path exists or can be created
    if let Some(parent) = path_buf.parent() {
        if !parent.exists() {
            fs::create_dir_all(parent).map_err(|e| ApiError {
                message: format!("Cannot create directory: {}", e),
                code: Some("DIRECTORY_CREATE_ERROR".to_string()),
            })?;
        }
    }

    // Check if we can write to this location
    match fs::File::create(&path_buf) {
        Ok(_) => {
            // Clean up test file
            let _ = fs::remove_file(&path_buf);
            Ok(true)
        },
        Err(e) => Err(ApiError {
            message: format!("Cannot write to path: {}", e),
            code: Some("PATH_NOT_WRITABLE".to_string()),
        }),
    }
}

#[tauri::command]
pub async fn open_html_file(file_path: String, app_handle: AppHandle) -> ApiResult<()> {
    log::info!("Attempting to open HTML file: {}", file_path);

    // Try shell::open first with direct path
    match shell::open(&app_handle.shell_scope(), file_path.clone(), None) {
        Ok(_) => {
            log::info!("Successfully opened file with shell::open: {}", file_path);
        }
        Err(e) => {
            log::warn!("shell::open failed: {}, trying system open command", e);

            // Fallback to system open command on macOS
            Command::new("open")
                .arg(&file_path)
                .spawn()
                .map_err(|cmd_err| ApiError {
                    message: format!("Failed to open HTML file. shell::open error: {}, open command error: {}", e, cmd_err),
                    code: Some("FILE_OPEN_ERROR".to_string()),
                })?;

            log::info!("Successfully opened file with system open command: {}", file_path);
        }
    }

    log::info!("HTML file opened: {}", file_path);
    Ok(())
}

// Helper function to get invoice data for HTML generation
async fn get_invoice_html_data(
    state: State<'_, crate::AppState>,
    invoice_id: i64,
) -> ApiResult<InvoiceHtmlData> {
    // Get invoice
    let invoice = sqlx::query_as::<_, Invoice>(
        "SELECT * FROM invoices WHERE id = ?"
    )
    .bind(invoice_id)
    .fetch_one(state.db.get_pool())
    .await
    .map_err(|e| ApiError {
        message: format!("Failed to fetch invoice: {}", e),
        code: Some("INVOICE_NOT_FOUND".to_string()),
    })?;


    // Get customer
    let customer = sqlx::query_as::<_, Customer>(
        "SELECT * FROM customers WHERE id = ?"
    )
    .bind(invoice.customer_id)
    .fetch_one(state.db.get_pool())
    .await
    .map_err(|e| ApiError {
        message: format!("Failed to fetch customer: {}", e),
        code: Some("CUSTOMER_NOT_FOUND".to_string()),
    })?;


    // Get store
    let store = sqlx::query_as::<_, Store>(
        "SELECT * FROM stores WHERE id = ?"
    )
    .bind(invoice.store_id)
    .fetch_one(state.db.get_pool())
    .await
    .map_err(|e| ApiError {
        message: format!("Failed to fetch store: {}", e),
        code: Some("STORE_NOT_FOUND".to_string()),
    })?;


    // Get invoice items with details
    let item_rows = sqlx::query(
        r#"
        SELECT
            ii.*,
            s.name as service_name,
            sv.name as variant_name,
            s.unit
        FROM invoice_items ii
        JOIN services s ON ii.service_id = s.id
        LEFT JOIN service_variants sv ON ii.variant_id = sv.id
        WHERE ii.invoice_id = ?
        ORDER BY ii.id
        "#
    )
    .bind(invoice_id)
    .fetch_all(state.db.get_pool())
    .await
    .map_err(|e| ApiError {
        message: format!("Failed to fetch invoice items: {}", e),
        code: Some("ITEMS_FETCH_ERROR".to_string()),
    })?;

    let mut items = Vec::new();
    for item_row in item_rows {
        let item = InvoiceItem {
            id: item_row.get("id"),
            invoice_id: item_row.get("invoice_id"),
            service_id: item_row.get("service_id"),
            variant_id: item_row.get("variant_id"),
            description: item_row.get("description"),
            qty: item_row.get("qty"),
            weight_kg: item_row.get("weight_kg"),
            area_sqft: item_row.get("area_sqft"),
            rate: item_row.get("rate"),
            amount: item_row.get("amount"),
            gst_rate: item_row.get("gst_rate"),
            sgst: item_row.get("sgst"),
            cgst: item_row.get("cgst"),
            created_at: item_row.get("created_at"),
        };

        // Get addons for this item
        let addon_rows = sqlx::query(
            r#"
            SELECT
                iia.*,
                sa.name as addon_name
            FROM invoice_item_addons iia
            JOIN service_addons sa ON iia.addon_id = sa.id
            WHERE iia.invoice_item_id = ?
            "#
        )
        .bind(item.id)
        .fetch_all(state.db.get_pool())
        .await
        .map_err(|e| ApiError {
            message: format!("Failed to fetch item addons: {}", e),
            code: Some("ADDONS_FETCH_ERROR".to_string()),
        })?;

        let addons: Vec<InvoiceAddonDetail> = addon_rows
            .into_iter()
            .map(|addon_row| InvoiceAddonDetail {
                addon_name: addon_row.get("addon_name"),
                quantity: addon_row.get("qty"),
                rate: addon_row.get("rate"),
                amount: addon_row.get("amount"),
            })
            .collect();

        items.push(InvoiceItemWithDetails {
            item,
            service_name: item_row.get("service_name"),
            variant_name: item_row.get("variant_name"),
            unit: item_row.get("unit"),
            addons,
        });
    }

    // Calculate totals
    let base_amount = invoice.subtotal - invoice.discount + invoice.express_charge;
    let sgst_amount = invoice.sgst_amount;
    let cgst_amount = invoice.cgst_amount;
    let amount_in_words = HtmlGenerator::amount_to_words(invoice.total);

    let totals = HtmlTotals {
        subtotal: invoice.subtotal,
        discount_amount: invoice.discount,
        express_charge: invoice.express_charge,
        base_amount,
        sgst_amount,
        cgst_amount,
        total_gst: invoice.sgst_amount + invoice.cgst_amount,
        total_amount: invoice.total,
        amount_in_words,
    };

    Ok(InvoiceHtmlData {
        invoice,
        customer,
        store: store.clone(),
        items,
        totals,
        settings: HtmlGenerator::get_a5_settings(&store), // Default settings
    })
}

// Helper function to get invoice output directory
fn get_invoice_output_dir(app_handle: &AppHandle) -> ApiResult<PathBuf> {
    let app_data_dir = app_handle
        .path_resolver()
        .app_data_dir()
        .ok_or_else(|| ApiError {
            message: "Failed to get app data directory".to_string(),
            code: Some("APP_DATA_DIR_ERROR".to_string()),
        })?;

    let invoices_dir = app_data_dir.join("UCLEAN").join("Invoices");

    if !invoices_dir.exists() {
        std::fs::create_dir_all(&invoices_dir).map_err(|e| ApiError {
            message: format!("Failed to create invoices directory: {}", e),
            code: Some("DIRECTORY_CREATE_ERROR".to_string()),
        })?;
    }

    log::info!("Invoice output directory: {}", invoices_dir.display());
    Ok(invoices_dir)
}