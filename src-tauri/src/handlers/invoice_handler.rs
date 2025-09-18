use crate::database::DatabaseManager;
use crate::models::{Invoice, InvoiceItem, Customer, Store, ApiResult, ApiError};
use crate::services::pricing_engine::PricingEngine;
use sqlx::Row;
use tauri::State;
use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};

#[derive(Debug, Deserialize)]
pub struct CreateInvoiceRequest {
    pub customer_id: i64,
    pub store_id: i64,
    pub items: Vec<CreateInvoiceItemRequest>,
    pub discount: f64,
    pub express_charge: f64,
    pub payment_method: Option<String>,
    pub payment_amount: Option<f64>,
    pub notes: Option<String>,
    pub gst_inclusive: bool,
}

#[derive(Debug, Deserialize)]
pub struct CreateInvoiceItemRequest {
    pub service_id: i64,
    pub variant_id: Option<i64>,
    pub description: String,
    pub qty: f64,
    pub weight_kg: Option<f64>,
    pub area_sqft: Option<f64>,
    pub addons: Vec<CreateInvoiceAddonRequest>,
}

#[derive(Debug, Deserialize)]
pub struct CreateInvoiceAddonRequest {
    pub addon_id: i64,
    pub qty: f64,
}

#[derive(Debug, Serialize)]
pub struct InvoiceResponse {
    pub invoice: Invoice,
    pub customer: Customer,
    pub store: Store,
    pub items: Vec<InvoiceItemWithDetails>,
}

#[derive(Debug, Serialize)]
pub struct InvoiceItemWithDetails {
    pub item: InvoiceItem,
    pub service_name: String,
    pub variant_name: Option<String>,
    pub unit: String,
    pub addons: Vec<InvoiceAddonDetail>,
}

#[derive(Debug, Serialize)]
pub struct InvoiceAddonDetail {
    pub addon_name: String,
    pub quantity: f64,
    pub rate: f64,
    pub amount: f64,
}

#[derive(Debug, Deserialize)]
pub struct InvoiceSearchQuery {
    pub query: Option<String>,
    pub customer_id: Option<i64>,
    pub store_id: Option<i64>,
    pub status: Option<String>,
    pub date_from: Option<String>,
    pub date_to: Option<String>,
    pub limit: Option<i64>,
    pub offset: Option<i64>,
}

#[tauri::command]
pub async fn create_invoice(
    state: State<'_, crate::AppState>,
    request: CreateInvoiceRequest,
) -> ApiResult<InvoiceResponse> {
    let pool = {
        let db = state.db.lock().unwrap();
        db.get_pool_cloned()
    };

    // Start transaction
    let mut tx = pool.begin().await.map_err(|e| ApiError {
        message: format!("Database error: {}", e),
        code: Some("DATABASE_ERROR".to_string()),
    })?;

    // Generate invoice number
    let invoice_no = generate_invoice_number(&pool).await?;

    // Create invoice record
    let invoice_id = sqlx::query(
        r#"
        INSERT INTO invoices (
            invoice_no, customer_id, store_id, order_datetime, delivery_datetime,
            subtotal, discount, express_charge, sgst_amount, cgst_amount, igst_amount,
            total, gst_inclusive, payment_method, payment_amount, status, notes
        ) VALUES (?, ?, ?, ?, ?, 0, ?, ?, 0, 0, 0, 0, ?, ?, ?, 'pending', ?)
        "#
    )
    .bind(&invoice_no)
    .bind(request.customer_id)
    .bind(request.store_id)
    .bind(Utc::now().to_rfc3339())
    .bind(Utc::now().to_rfc3339()) // Default delivery time
    .bind(request.discount)
    .bind(request.express_charge)
    .bind(request.gst_inclusive)
    .bind(request.payment_method)
    .bind(request.payment_amount)
    .bind(request.notes)
    .execute(&mut *tx)
    .await
    .map_err(|e| ApiError {
        message: format!("Failed to create invoice: {}", e),
        code: Some("CREATE_INVOICE_ERROR".to_string()),
    })?
    .last_insert_rowid();

    let mut subtotal = 0.0;
    let mut total_sgst = 0.0;
    let mut total_cgst = 0.0;

    // Process each invoice item
    for item_request in request.items {
        // Get service details for pricing
        let service_row = sqlx::query(
            "SELECT * FROM services WHERE id = ?"
        )
        .bind(item_request.service_id)
        .fetch_optional(&mut *tx)
        .await
        .map_err(|e| ApiError {
            message: format!("Database error: {}", e),
            code: Some("DATABASE_ERROR".to_string()),
        })?
        .ok_or_else(|| ApiError {
            message: "Service not found".to_string(),
            code: Some("SERVICE_NOT_FOUND".to_string()),
        })?;

        let base_rate: f64 = service_row.get("base_price");
        let gst_rate: f64 = service_row.get("gst_rate");

        // Calculate variant rate if applicable
        let variant_rate = if let Some(variant_id) = item_request.variant_id {
            let variant_row = sqlx::query(
                "SELECT price_multiplier FROM service_variants WHERE id = ? AND service_id = ?"
            )
            .bind(variant_id)
            .bind(item_request.service_id)
            .fetch_optional(&mut *tx)
            .await
            .map_err(|e| ApiError {
                message: format!("Database error: {}", e),
                code: Some("DATABASE_ERROR".to_string()),
            })?
            .map(|row| {
                let multiplier: f64 = row.get("price_multiplier");
                base_rate * multiplier
            })
            .unwrap_or(base_rate)
        } else {
            base_rate
        };

        // Calculate item pricing
        let pricing = PricingEngine::calculate_service_pricing(
            variant_rate,
            item_request.qty,
            item_request.weight_kg,
            item_request.area_sqft,
            gst_rate,
            request.gst_inclusive,
        )?;

        // Insert invoice item
        let item_id = sqlx::query(
            r#"
            INSERT INTO invoice_items (
                invoice_id, service_id, variant_id, description, qty, weight_kg, area_sqft,
                rate, amount, gst_rate, sgst, cgst
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            "#
        )
        .bind(invoice_id)
        .bind(item_request.service_id)
        .bind(item_request.variant_id)
        .bind(&item_request.description)
        .bind(item_request.qty)
        .bind(item_request.weight_kg)
        .bind(item_request.area_sqft)
        .bind(variant_rate)
        .bind(pricing.line_total)
        .bind(gst_rate)
        .bind(pricing.sgst_amount)
        .bind(pricing.cgst_amount)
        .execute(&mut *tx)
        .await
        .map_err(|e| ApiError {
            message: format!("Failed to create invoice item: {}", e),
            code: Some("CREATE_ITEM_ERROR".to_string()),
        })?
        .last_insert_rowid();

        subtotal += pricing.subtotal;
        total_sgst += pricing.sgst_amount;
        total_cgst += pricing.cgst_amount;

        // Process addons for this item
        for addon_request in item_request.addons {
            let addon_row = sqlx::query(
                "SELECT * FROM service_addons WHERE id = ?"
            )
            .bind(addon_request.addon_id)
            .fetch_optional(&mut *tx)
            .await
            .map_err(|e| ApiError {
                message: format!("Database error: {}", e),
                code: Some("DATABASE_ERROR".to_string()),
            })?
            .ok_or_else(|| ApiError {
                message: "Addon not found".to_string(),
                code: Some("ADDON_NOT_FOUND".to_string()),
            })?;

            let addon_rate: f64 = addon_row.get("price");
            let addon_gst_rate: f64 = addon_row.get("gst_rate");

            let addon_pricing = PricingEngine::calculate_service_pricing(
                addon_rate,
                addon_request.qty,
                None,
                None,
                addon_gst_rate,
                request.gst_inclusive,
            )?;

            // Insert addon
            sqlx::query(
                r#"
                INSERT INTO invoice_item_addons (
                    invoice_item_id, addon_id, qty, rate, amount, gst_rate, sgst, cgst
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                "#
            )
            .bind(item_id)
            .bind(addon_request.addon_id)
            .bind(addon_request.qty)
            .bind(addon_rate)
            .bind(addon_pricing.line_total)
            .bind(addon_gst_rate)
            .bind(addon_pricing.sgst_amount)
            .bind(addon_pricing.cgst_amount)
            .execute(&mut *tx)
            .await
            .map_err(|e| ApiError {
                message: format!("Failed to create addon: {}", e),
                code: Some("CREATE_ADDON_ERROR".to_string()),
            })?;

            subtotal += addon_pricing.subtotal;
            total_sgst += addon_pricing.sgst_amount;
            total_cgst += addon_pricing.cgst_amount;
        }
    }

    // Calculate final totals
    let final_total = subtotal - request.discount + request.express_charge + total_sgst + total_cgst;

    // Update invoice with calculated totals
    sqlx::query(
        r#"
        UPDATE invoices SET
            subtotal = ?,
            sgst_amount = ?,
            cgst_amount = ?,
            total = ?
        WHERE id = ?
        "#
    )
    .bind(subtotal)
    .bind(total_sgst)
    .bind(total_cgst)
    .bind(final_total)
    .bind(invoice_id)
    .execute(&mut *tx)
    .await
    .map_err(|e| ApiError {
        message: format!("Failed to update invoice totals: {}", e),
        code: Some("UPDATE_TOTALS_ERROR".to_string()),
    })?;

    // Commit transaction
    tx.commit().await.map_err(|e| ApiError {
        message: format!("Transaction commit failed: {}", e),
        code: Some("COMMIT_ERROR".to_string()),
    })?;

    // Return the created invoice with full details
    get_invoice_by_id(state, invoice_id).await
}

#[tauri::command]
pub async fn get_invoice_by_id(
    state: State<'_, crate::AppState>,
    invoice_id: i64,
) -> ApiResult<InvoiceResponse> {
    let pool = {
        let db = state.db.lock().unwrap();
        db.get_pool_cloned()
    };

    // Get invoice
    let invoice = sqlx::query_as::<_, Invoice>("SELECT * FROM invoices WHERE id = ?")
        .bind(invoice_id)
        .fetch_optional(&pool)
        .await
        .map_err(|e| ApiError {
            message: format!("Database error: {}", e),
            code: Some("DATABASE_ERROR".to_string()),
        })?
        .ok_or_else(|| ApiError {
            message: "Invoice not found".to_string(),
            code: Some("INVOICE_NOT_FOUND".to_string()),
        })?;

    // Get customer
    let customer = sqlx::query_as::<_, Customer>("SELECT * FROM customers WHERE id = ?")
        .bind(invoice.customer_id)
        .fetch_optional(&pool)
        .await
        .map_err(|e| ApiError {
            message: format!("Database error: {}", e),
            code: Some("DATABASE_ERROR".to_string()),
        })?
        .ok_or_else(|| ApiError {
            message: "Customer not found".to_string(),
            code: Some("CUSTOMER_NOT_FOUND".to_string()),
        })?;

    // Get store
    let store = sqlx::query_as::<_, Store>("SELECT * FROM stores WHERE id = ?")
        .bind(invoice.store_id)
        .fetch_optional(&pool)
        .await
        .map_err(|e| ApiError {
            message: format!("Database error: {}", e),
            code: Some("DATABASE_ERROR".to_string()),
        })?
        .ok_or_else(|| ApiError {
            message: "Store not found".to_string(),
            code: Some("STORE_NOT_FOUND".to_string()),
        })?;

    // Get invoice items with service details
    let items_raw = sqlx::query(
        r#"
        SELECT
            ii.*,
            s.name as service_name,
            s.unit,
            sv.name as variant_name
        FROM invoice_items ii
        JOIN services s ON ii.service_id = s.id
        LEFT JOIN service_variants sv ON ii.variant_id = sv.id
        WHERE ii.invoice_id = ?
        ORDER BY ii.id
        "#
    )
    .bind(invoice_id)
    .fetch_all(&pool)
    .await
    .map_err(|e| ApiError {
        message: format!("Database error: {}", e),
        code: Some("DATABASE_ERROR".to_string()),
    })?;

    let mut items = Vec::new();
    for row in items_raw {
        let item = InvoiceItem {
            id: row.get("id"),
            invoice_id: row.get("invoice_id"),
            service_id: row.get("service_id"),
            variant_id: row.get("variant_id"),
            description: row.get("description"),
            qty: row.get("qty"),
            weight_kg: row.get("weight_kg"),
            area_sqft: row.get("area_sqft"),
            rate: row.get("rate"),
            amount: row.get("amount"),
            gst_rate: row.get("gst_rate"),
            sgst: row.get("sgst"),
            cgst: row.get("cgst"),
            created_at: row.get("created_at"),
        };

        // Get addons for this item
        let addons_raw = sqlx::query(
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
        .fetch_all(&pool)
        .await
        .map_err(|e| ApiError {
            message: format!("Database error: {}", e),
            code: Some("DATABASE_ERROR".to_string()),
        })?;

        let addons = addons_raw.into_iter().map(|addon_row| {
            InvoiceAddonDetail {
                addon_name: addon_row.get("addon_name"),
                quantity: addon_row.get("qty"),
                rate: addon_row.get("price"),
                amount: addon_row.get("amount"),
            }
        }).collect();

        items.push(InvoiceItemWithDetails {
            item,
            service_name: row.get("service_name"),
            variant_name: row.get("variant_name"),
            unit: row.get("unit"),
            addons,
        });
    }

    Ok(InvoiceResponse {
        invoice,
        customer,
        store,
        items,
    })
}

#[tauri::command]
pub async fn search_invoices(
    state: State<'_, crate::AppState>,
    query: InvoiceSearchQuery,
) -> ApiResult<Vec<Invoice>> {
    let pool = {
        let db = state.db.lock().unwrap();
        db.get_pool_cloned()
    };

    let mut sql = "SELECT * FROM invoices WHERE 1=1".to_string();
    let mut params = Vec::new();

    if let Some(search_query) = &query.query {
        sql.push_str(" AND (invoice_no LIKE ? OR notes LIKE ?)");
        let search_pattern = format!("%{}%", search_query);
        params.push(search_pattern.clone());
        params.push(search_pattern);
    }

    if let Some(customer_id) = query.customer_id {
        sql.push_str(" AND customer_id = ?");
        params.push(customer_id.to_string());
    }

    if let Some(store_id) = query.store_id {
        sql.push_str(" AND store_id = ?");
        params.push(store_id.to_string());
    }

    if let Some(status) = &query.status {
        sql.push_str(" AND status = ?");
        params.push(status.clone());
    }

    if let Some(date_from) = &query.date_from {
        sql.push_str(" AND DATE(order_datetime) >= ?");
        params.push(date_from.clone());
    }

    if let Some(date_to) = &query.date_to {
        sql.push_str(" AND DATE(order_datetime) <= ?");
        params.push(date_to.clone());
    }

    sql.push_str(" ORDER BY order_datetime DESC");

    if let Some(limit) = query.limit {
        sql.push_str(" LIMIT ?");
        params.push(limit.to_string());
    }

    if let Some(offset) = query.offset {
        sql.push_str(" OFFSET ?");
        params.push(offset.to_string());
    }

    let mut query_builder = sqlx::query_as::<_, Invoice>(&sql);
    for param in params {
        query_builder = query_builder.bind(param);
    }

    let invoices = query_builder
        .fetch_all(&pool)
        .await
        .map_err(|e| ApiError {
            message: format!("Database error: {}", e),
            code: Some("DATABASE_ERROR".to_string()),
        })?;

    Ok(invoices)
}

#[tauri::command]
pub async fn update_invoice(
    state: State<'_, crate::AppState>,
    invoice_id: i64,
    update_data: serde_json::Value,
) -> ApiResult<Invoice> {
    let pool = {
        let db = state.db.lock().unwrap();
        db.get_pool_cloned()
    };

    // For now, just update basic fields like status, payment info, notes
    let mut sql = "UPDATE invoices SET ".to_string();
    let mut updates = Vec::new();
    let mut params = Vec::new();

    if let Some(status) = update_data.get("status").and_then(|v| v.as_str()) {
        updates.push("status = ?");
        params.push(status.to_string());
    }

    if let Some(payment_method) = update_data.get("payment_method").and_then(|v| v.as_str()) {
        updates.push("payment_method = ?");
        params.push(payment_method.to_string());
    }

    if let Some(payment_amount) = update_data.get("payment_amount").and_then(|v| v.as_f64()) {
        updates.push("payment_amount = ?");
        params.push(payment_amount.to_string());
    }

    if let Some(notes) = update_data.get("notes").and_then(|v| v.as_str()) {
        updates.push("notes = ?");
        params.push(notes.to_string());
    }

    if updates.is_empty() {
        return Err(ApiError {
            message: "No valid fields to update".to_string(),
            code: Some("NO_UPDATE_FIELDS".to_string()),
        });
    }

    sql.push_str(&updates.join(", "));
    sql.push_str(" WHERE id = ?");
    params.push(invoice_id.to_string());

    let mut query_builder = sqlx::query(&sql);
    for param in params {
        query_builder = query_builder.bind(param);
    }

    query_builder
        .execute(&pool)
        .await
        .map_err(|e| ApiError {
            message: format!("Failed to update invoice: {}", e),
            code: Some("UPDATE_ERROR".to_string()),
        })?;

    // Return updated invoice
    let invoice = sqlx::query_as::<_, Invoice>("SELECT * FROM invoices WHERE id = ?")
        .bind(invoice_id)
        .fetch_optional(&pool)
        .await
        .map_err(|e| ApiError {
            message: format!("Database error: {}", e),
            code: Some("DATABASE_ERROR".to_string()),
        })?
        .ok_or_else(|| ApiError {
            message: "Invoice not found".to_string(),
            code: Some("INVOICE_NOT_FOUND".to_string()),
        })?;

    Ok(invoice)
}

#[tauri::command]
pub async fn update_invoice_status(
    state: State<'_, crate::AppState>,
    invoice_id: i64,
    status: String,
) -> ApiResult<Invoice> {
    let pool = {
        let db = state.db.lock().unwrap();
        db.get_pool_cloned()
    };

    sqlx::query("UPDATE invoices SET status = ? WHERE id = ?")
        .bind(&status)
        .bind(invoice_id)
        .execute(&pool)
        .await
        .map_err(|e| ApiError {
            message: format!("Failed to update invoice status: {}", e),
            code: Some("UPDATE_STATUS_ERROR".to_string()),
        })?;

    let invoice = sqlx::query_as::<_, Invoice>("SELECT * FROM invoices WHERE id = ?")
        .bind(invoice_id)
        .fetch_optional(&pool)
        .await
        .map_err(|e| ApiError {
            message: format!("Database error: {}", e),
            code: Some("DATABASE_ERROR".to_string()),
        })?
        .ok_or_else(|| ApiError {
            message: "Invoice not found".to_string(),
            code: Some("INVOICE_NOT_FOUND".to_string()),
        })?;

    Ok(invoice)
}

#[tauri::command]
pub async fn delete_invoice(
    state: State<'_, crate::AppState>,
    invoice_id: i64,
) -> ApiResult<String> {
    let pool = {
        let db = state.db.lock().unwrap();
        db.get_pool_cloned()
    };

    // Start transaction to delete invoice and all related data
    let mut tx = pool.begin().await.map_err(|e| ApiError {
        message: format!("Database error: {}", e),
        code: Some("DATABASE_ERROR".to_string()),
    })?;

    // Delete addons first (foreign key constraint)
    sqlx::query(
        "DELETE FROM invoice_item_addons WHERE invoice_item_id IN (SELECT id FROM invoice_items WHERE invoice_id = ?)"
    )
    .bind(invoice_id)
    .execute(&mut *tx)
    .await
    .map_err(|e| ApiError {
        message: format!("Failed to delete invoice addons: {}", e),
        code: Some("DELETE_ADDONS_ERROR".to_string()),
    })?;

    // Delete items
    sqlx::query("DELETE FROM invoice_items WHERE invoice_id = ?")
        .bind(invoice_id)
        .execute(&mut *tx)
        .await
        .map_err(|e| ApiError {
            message: format!("Failed to delete invoice items: {}", e),
            code: Some("DELETE_ITEMS_ERROR".to_string()),
        })?;

    // Delete invoice
    let result = sqlx::query("DELETE FROM invoices WHERE id = ?")
        .bind(invoice_id)
        .execute(&mut *tx)
        .await
        .map_err(|e| ApiError {
            message: format!("Failed to delete invoice: {}", e),
            code: Some("DELETE_INVOICE_ERROR".to_string()),
        })?;

    if result.rows_affected() == 0 {
        return Err(ApiError {
            message: "Invoice not found".to_string(),
            code: Some("INVOICE_NOT_FOUND".to_string()),
        });
    }

    tx.commit().await.map_err(|e| ApiError {
        message: format!("Transaction commit failed: {}", e),
        code: Some("COMMIT_ERROR".to_string()),
    })?;

    Ok("Invoice deleted successfully".to_string())
}

// Helper function to generate unique invoice numbers
async fn generate_invoice_number(pool: &sqlx::SqlitePool) -> ApiResult<String> {
    let now = Utc::now();
    let year = now.format("%y").to_string();
    let month = now.format("%m").to_string();

    // Get the last invoice number for this month
    let last_number = sqlx::query(
        "SELECT invoice_no FROM invoices WHERE invoice_no LIKE ? ORDER BY invoice_no DESC LIMIT 1"
    )
    .bind(format!("INV{}{}__%", year, month))
    .fetch_optional(&pool)
    .await
    .map_err(|e| ApiError {
        message: format!("Database error: {}", e),
        code: Some("DATABASE_ERROR".to_string()),
    })?;

    let sequence = if let Some(row) = last_number {
        let invoice_no: String = row.get("invoice_no");
        // Extract sequence number from format INV2501__001
        let parts: Vec<&str> = invoice_no.split("__").collect();
        if parts.len() == 2 {
            parts[1].parse::<i32>().unwrap_or(0) + 1
        } else {
            1
        }
    } else {
        1
    };

    let invoice_no = format!("INV{}{}__{:03}", year, month, sequence);
    Ok(invoice_no)
}