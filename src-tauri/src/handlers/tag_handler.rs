use crate::database::DatabaseManager;
use crate::models::{
    ClothingTag, TagSettings, CreateTagSettingsRequest, UpdateTagSettingsRequest,
    TagPrintRequest, TagPrintResponse, InvoiceTagSummary, TagData
};
use crate::services::{TagGeneratorService, TemplateEngine};
use tauri::{State, AppHandle, Manager};
use anyhow::{Result, Context};
use sqlx::Row;
use std::sync::Arc;

#[tauri::command]
pub async fn generate_invoice_tags(
    app_handle: AppHandle,
    invoice_id: i64,
) -> Result<Vec<ClothingTag>, String> {
    let state = app_handle.state::<crate::AppState>();

    TagGeneratorService::generate_tags_for_invoice(&state.db, invoice_id)
        .await
        .map_err(|e| {
            log::error!("Failed to generate tags for invoice {}: {}", invoice_id, e);
            format!("Failed to generate tags: {}", e)
        })
}

#[tauri::command]
pub async fn print_invoice_tags(
    app_handle: AppHandle,
    request: TagPrintRequest,
) -> Result<TagPrintResponse, String> {
    let state = app_handle.state::<crate::AppState>();

    // Get tag data for printing
    let mut tag_data = TagGeneratorService::get_tag_data_for_printing(
        &state.db,
        request.invoice_id,
        request.item_ids.clone(),
    )
    .await
    .map_err(|e| {
        log::error!("Failed to get tag data for invoice {}: {}", request.invoice_id, e);
        format!("Failed to get tag data: {}", e)
    })?;

    // If no tags exist, try to generate them first
    if tag_data.is_empty() {
        log::info!("No tags found for invoice {}, attempting to generate them", request.invoice_id);

        match TagGeneratorService::generate_tags_for_invoice(&state.db, request.invoice_id).await {
            Ok(_) => {
                // Try to get tag data again after generation
                tag_data = TagGeneratorService::get_tag_data_for_printing(
                    &state.db,
                    request.invoice_id,
                    request.item_ids.clone(),
                )
                .await
                .map_err(|e| {
                    log::error!("Failed to get tag data after generation for invoice {}: {}", request.invoice_id, e);
                    format!("Failed to get tag data after generation: {}", e)
                })?;
            },
            Err(e) => {
                log::error!("Failed to generate tags for invoice {}: {}", request.invoice_id, e);
                return Ok(TagPrintResponse {
                    success: false,
                    message: format!("No tags exist and generation failed: {}", e),
                    tags_printed: 0,
                });
            }
        }
    }

    // If still no tags after generation attempt
    if tag_data.is_empty() {
        return Ok(TagPrintResponse {
            success: false,
            message: "No tags found for printing and none could be generated".to_string(),
            tags_printed: 0,
        });
    }

    // Get tag settings
    let settings = get_tag_settings_internal(&state.db, None).await.map_err(|e| {
        log::error!("Failed to get tag settings: {}", e);
        format!("Failed to get tag settings: {}", e)
    })?;

    // Generate HTML for printing
    let html_content = generate_tags_html(&app_handle, &tag_data, &settings.roll_width).await.map_err(|e| {
        log::error!("Failed to generate tags HTML: {}", e);
        format!("Failed to generate tags HTML: {}", e)
    })?;
    // Print the tags (using the existing HTML print mechanism)
    match print_tags_html(&app_handle, &html_content).await {
        Ok(_) => {
            // Mark tags as printed
            let printed_count = TagGeneratorService::mark_tags_as_printed(
                &state.db,
                request.invoice_id,
                request.item_ids,
                Some("system".to_string()),
            )
            .await
            .map_err(|e| {
                log::error!("Failed to mark tags as printed: {}", e);
                format!("Failed to mark tags as printed: {}", e)
            })?;

            Ok(TagPrintResponse {
                success: true,
                message: format!("Successfully printed {} tags", printed_count),
                tags_printed: printed_count,
            })
        }
        Err(e) => {
            log::error!("Failed to print tags: {}", e);
            Ok(TagPrintResponse {
                success: false,
                message: format!("Failed to print tags: {}", e),
                tags_printed: 0,
            })
        }
    }
}

#[tauri::command]
pub async fn get_invoice_tags(
    app_handle: AppHandle,
    invoice_id: i64,
) -> Result<Vec<ClothingTag>, String> {
    let state = app_handle.state::<crate::AppState>();

    TagGeneratorService::get_tags_by_invoice_id(&state.db, invoice_id)
        .await
        .map_err(|e| {
            log::error!("Failed to get tags for invoice {}: {}", invoice_id, e);
            format!("Failed to get tags: {}", e)
        })
}

#[tauri::command]
pub async fn get_invoice_tag_summary(
    app_handle: AppHandle,
    invoice_id: i64,
) -> Result<InvoiceTagSummary, String> {
    let state = app_handle.state::<crate::AppState>();

    TagGeneratorService::get_invoice_tag_summary(&state.db, invoice_id)
        .await
        .map_err(|e| {
            log::error!("Failed to get tag summary for invoice {}: {}", invoice_id, e);
            format!("Failed to get tag summary: {}", e)
        })
}

#[tauri::command]
pub async fn get_tag_settings(
    app_handle: AppHandle,
    store_id: Option<i64>,
) -> Result<TagSettings, String> {
    let state = app_handle.state::<crate::AppState>();

    get_tag_settings_internal(&state.db, store_id)
        .await
        .map_err(|e| {
            log::error!("Failed to get tag settings: {}", e);
            format!("Failed to get tag settings: {}", e)
        })
}

#[tauri::command]
pub async fn save_tag_settings(
    app_handle: AppHandle,
    store_id: Option<i64>,
    request: UpdateTagSettingsRequest,
) -> Result<TagSettings, String> {
    let state = app_handle.state::<crate::AppState>();

    // Check if settings actually exist in the database
    let settings_exist = check_tag_settings_exist(&state.db, store_id).await.map_err(|e| {
        log::error!("Failed to check tag settings existence: {}", e);
        format!("Failed to check tag settings existence: {}", e)
    })?;

    if settings_exist {
        // Get existing settings to get the ID for update
        let existing = get_tag_settings_internal(&state.db, store_id).await.map_err(|e| {
            log::error!("Failed to get existing tag settings: {}", e);
            format!("Failed to get existing tag settings: {}", e)
        })?;

        // Update existing settings
        update_tag_settings_internal(&state.db, existing.id, &request)
            .await
            .map_err(|e| {
                log::error!("Failed to update tag settings: {}", e);
                format!("Failed to update tag settings: {}", e)
            })?;
    } else {
        // Create new settings
        create_tag_settings_internal(&state.db, store_id, &request)
            .await
            .map_err(|e| {
                log::error!("Failed to create tag settings: {}", e);
                format!("Failed to create tag settings: {}", e)
            })?;
    }

    // Return updated settings
    get_tag_settings_internal(&state.db, store_id)
        .await
        .map_err(|e| {
            log::error!("Failed to get updated tag settings: {}", e);
            format!("Failed to get updated tag settings: {}", e)
        })
}

#[tauri::command]
pub async fn get_tag_preview(
    app_handle: AppHandle,
    invoice_id: i64,
    roll_width: Option<String>,
) -> Result<String, String> {
    let state = app_handle.state::<crate::AppState>();

    // Get tag data for preview
    let tag_data = TagGeneratorService::get_tag_data_for_printing(
        &state.db,
        invoice_id,
        None,
    )
    .await
    .map_err(|e| {
        log::error!("Failed to get tag data for preview: {}", e);
        format!("Failed to get tag data: {}", e)
    })?;

    let width = roll_width.unwrap_or_else(|| "40mm".to_string());

    generate_tags_html(&app_handle, &tag_data, &width)
        .await
        .map_err(|e| {
            log::error!("Failed to generate preview HTML: {}", e);
            format!("Failed to generate preview: {}", e)
        })
}

// Internal helper functions

async fn check_tag_settings_exist(
    db: &DatabaseManager,
    store_id: Option<i64>,
) -> Result<bool> {
    let query = if let Some(store_id) = store_id {
        "SELECT COUNT(*) as count FROM tag_settings WHERE store_id = ?"
    } else {
        "SELECT COUNT(*) as count FROM tag_settings WHERE store_id IS NULL"
    };

    let result = if let Some(store_id) = store_id {
        sqlx::query(query).bind(store_id).fetch_one(db.get_pool()).await
    } else {
        sqlx::query(query).fetch_one(db.get_pool()).await
    };

    match result {
        Ok(row) => {
            let count: i64 = row.get("count");
            Ok(count > 0)
        }
        Err(e) => {
            log::error!("Database query failed: {}", e);
            Err(anyhow::anyhow!("Failed to check tag settings existence: {}", e))
        }
    }
}

async fn get_tag_settings_internal(
    db: &DatabaseManager,
    store_id: Option<i64>,
) -> Result<TagSettings> {
    let query = if let Some(store_id) = store_id {
        "SELECT * FROM tag_settings WHERE store_id = ? OR store_id IS NULL ORDER BY store_id DESC LIMIT 1"
    } else {
        "SELECT * FROM tag_settings WHERE store_id IS NULL LIMIT 1"
    };

    let result = if let Some(store_id) = store_id {
        sqlx::query(query).bind(store_id).fetch_optional(db.get_pool()).await
    } else {
        sqlx::query(query).fetch_optional(db.get_pool()).await
    };

    match result? {
        Some(row) => Ok(TagSettings {
            id: row.get("id"),
            store_id: row.get("store_id"),
            roll_width: row.get("roll_width"),
            auto_print: row.get("auto_print"),
            printer_name: row.get("printer_name"),
            template_style: row.get("template_style"),
            include_barcode: row.get("include_barcode"),
            created_at: row.get("created_at"),
            updated_at: row.get("updated_at"),
        }),
        None => {
            // Return default settings
            Ok(TagSettings {
                id: 0,
                store_id,
                roll_width: "40mm".to_string(),
                auto_print: 0,
                printer_name: None,
                template_style: "standard".to_string(),
                include_barcode: 1,
                created_at: "".to_string(),
                updated_at: "".to_string(),
            })
        }
    }
}

async fn create_tag_settings_internal(
    db: &DatabaseManager,
    store_id: Option<i64>,
    request: &UpdateTagSettingsRequest,
) -> Result<()> {
    let query = r#"
        INSERT INTO tag_settings (
            store_id, roll_width, auto_print, printer_name,
            template_style, include_barcode
        ) VALUES (?, ?, ?, ?, ?, ?)
    "#;

    sqlx::query(query)
        .bind(store_id)
        .bind(&request.roll_width)
        .bind(if request.auto_print { 1 } else { 0 })
        .bind(&request.printer_name)
        .bind(&request.template_style)
        .bind(if request.include_barcode { 1 } else { 0 })
        .execute(db.get_pool())
        .await
        .context("Failed to create tag settings")?;

    Ok(())
}

async fn update_tag_settings_internal(
    db: &DatabaseManager,
    settings_id: i64,
    request: &UpdateTagSettingsRequest,
) -> Result<()> {
    let query = r#"
        UPDATE tag_settings SET
            roll_width = ?,
            auto_print = ?,
            printer_name = ?,
            template_style = ?,
            include_barcode = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    "#;

    sqlx::query(query)
        .bind(&request.roll_width)
        .bind(if request.auto_print { 1 } else { 0 })
        .bind(&request.printer_name)
        .bind(&request.template_style)
        .bind(if request.include_barcode { 1 } else { 0 })
        .bind(settings_id)
        .execute(db.get_pool())
        .await
        .context("Failed to update tag settings")?;

    Ok(())
}

async fn generate_tags_html(app_handle: &AppHandle, tag_data: &[TagData], roll_width: &str) -> Result<String> {
    let resource_dir = app_handle.path_resolver().resource_dir().ok_or_else(|| {
        anyhow::anyhow!("Failed to get resource directory")
    })?;

    let template_file_name = match roll_width {
        "32mm" => "tag_32mm.html",
        "40mm" => "tag_40mm.html",
        "50mm" => "tag_50mm.html",
        _ => "tag_40mm.html", // Default
    };

    let template_path = if cfg!(debug_assertions) {
        // In development, read directly from the source directory
        std::env::current_dir().unwrap().join("src-tauri").join("src").join("templates").join("tags").join(template_file_name)
    } else {
        // In production, read from the bundled resources
        resource_dir.join("templates").join("tags").join(template_file_name)
    };

    let mut html_content = String::new();

    // Read template
    let template_content = tokio::fs::read_to_string(template_path.clone())
        .await
        .context(format!("Failed to read tag template from: {}", template_path.display()))?;

    // Generate HTML for each tag
    for (index, tag) in tag_data.iter().enumerate() {
        let mut tag_html = template_content.clone();

        // Replace template variables
        tag_html = tag_html.replace("{{invoice_no}}", &tag.invoice_no);
        tag_html = tag_html.replace("{{customer_name}}", &tag.customer_name);
        tag_html = tag_html.replace("{{service_name}}", &tag.service_name);
        tag_html = tag_html.replace("{{tag_number}}", &tag.tag_number.to_string());
        tag_html = tag_html.replace("{{total_quantity}}", &tag.total_quantity.to_string());
        tag_html = tag_html.replace("{{overall_piece_number}}", &tag.overall_piece_number.to_string());
        tag_html = tag_html.replace("{{total_invoice_pieces}}", &tag.total_invoice_pieces.to_string());
        tag_html = tag_html.replace("{{tag_code}}", &tag.tag_code);

        if let Some(delivery_date) = &tag.delivery_date {
            tag_html = tag_html.replace("{{delivery_date}}", delivery_date);
            // For 32mm, create shorter version
            let short_date = delivery_date.split_whitespace().take(2).collect::<Vec<_>>().join(" ");
            tag_html = tag_html.replace("{{delivery_date_short}}", &short_date);
        } else {
            tag_html = tag_html.replace("{{delivery_date}}", "");
            tag_html = tag_html.replace("{{delivery_date_short}}", "");
        }

        // For 32mm, create shorter service name
        let service_name_short = if tag.service_name.len() > 15 {
            format!("{}...", &tag.service_name[..12])
        } else {
            tag.service_name.clone()
        };
        tag_html = tag_html.replace("{{service_name_short}}", &service_name_short);

        // Handle addons section
        if let Some(addons) = &tag.addons {
            tag_html = tag_html.replace("{{#if addons}}", "");
            tag_html = tag_html.replace("{{addons}}", addons);
            tag_html = tag_html.replace("{{/if}}", "");
        } else {
            // Remove addons section
            if let Some(start) = tag_html.find("{{#if addons}}") {
                if let Some(end) = tag_html.find("{{/if}}") {
                    let end_pos = end + 7; // Length of "{{/if}}"
                    tag_html.replace_range(start..end_pos, "");
                }
            }
        }

        // Handle barcode inclusion
        if tag.include_barcode {
            tag_html = tag_html.replace("{{#if include_barcode}}", "");
            tag_html = tag_html.replace("{{/if}}", "");
        } else {
            // Remove barcode section
            if let Some(start) = tag_html.find("{{#if include_barcode}}") {
                if let Some(end) = tag_html.find("{{/if}}") {
                    tag_html.replace_range(start..end + 7, "");
                }
            }
        }

        html_content.push_str(&tag_html);
    }

    Ok(html_content)
}

async fn print_tags_html(app_handle: &AppHandle, html_content: &str) -> Result<()> {
    use tauri::api::path;
    use std::fs;

    // Create temporary HTML file for tags
    let app_data_dir = path::app_data_dir(&app_handle.config()).ok_or_else(|| {
        anyhow::anyhow!("Failed to get app data directory")
    })?;

    let output_dir = app_data_dir.join("output");
    if !output_dir.exists() {
        fs::create_dir_all(&output_dir)?;
    }

    let timestamp = chrono::Utc::now().format("%Y%m%d_%H%M%S");
    let file_name = format!("tags_{}.html", timestamp);
    let file_path = output_dir.join(&file_name);

    // Write HTML content to file
    fs::write(&file_path, html_content)?;

    // Open the file in browser for printing using system command
    let file_path_str = file_path.to_string_lossy().to_string();

    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("cmd")
            .arg("/C")
            .arg("start")
            .arg(&file_path_str)
            .spawn()
            .map_err(|e| anyhow::anyhow!("Failed to open tags HTML for printing: {}", e))?;
    }

    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(&file_path_str)
            .spawn()
            .map_err(|e| anyhow::anyhow!("Failed to open tags HTML for printing: {}", e))?;
    }
    log::info!("Successfully opened tags HTML for printing: {}", file_path_str);

    Ok(())
}