use crate::database::DatabaseManager;
use crate::models::{Invoice, Customer, Store, InvoiceItem, ApiResult, ApiError};
use crate::services::pdf_generator::{
    PdfGenerator, InvoicePdfData, InvoiceItemWithDetails, InvoiceAddonDetail, PdfTotals, PaperSize
};
use sqlx::Row;
use tauri::State;
use std::fs;
use std::path::Path;

#[tauri::command]
pub async fn generate_invoice_pdf_a5(
    state: State<'_, crate::AppState>,
    invoice_id: i64,
    output_path: Option<String>,
) -> ApiResult<String> {
    let pdf_data = get_invoice_pdf_data(state.clone(), invoice_id).await?;
    let pdf_bytes = PdfGenerator::generate_a5_invoice(&pdf_data)?;

    let file_path = if let Some(path) = output_path {
        path
    } else {
        format!("invoice_{}_a5.pdf", pdf_data.invoice.invoice_no)
    };

    save_pdf_to_file(&pdf_bytes, &file_path)?;
    Ok(file_path)
}

#[tauri::command]
pub async fn generate_invoice_pdf_a4(
    state: State<'_, crate::AppState>,
    invoice_id: i64,
    output_path: Option<String>,
) -> ApiResult<String> {
    let pdf_data = get_invoice_pdf_data(state.clone(), invoice_id).await?;
    let pdf_bytes = PdfGenerator::generate_a4_invoice(&pdf_data)?;

    let file_path = if let Some(path) = output_path {
        path
    } else {
        format!("invoice_{}_a4.pdf", pdf_data.invoice.invoice_no)
    };

    save_pdf_to_file(&pdf_bytes, &file_path)?;
    Ok(file_path)
}

#[tauri::command]
pub async fn generate_invoice_pdf_thermal(
    state: State<'_, crate::AppState>,
    invoice_id: i64,
    output_path: Option<String>,
) -> ApiResult<String> {
    let pdf_data = get_invoice_pdf_data(state.clone(), invoice_id).await?;
    let pdf_bytes = PdfGenerator::generate_thermal_invoice(&pdf_data)?;

    let file_path = if let Some(path) = output_path {
        path
    } else {
        format!("invoice_{}_thermal.pdf", pdf_data.invoice.invoice_no)
    };

    save_pdf_to_file(&pdf_bytes, &file_path)?;
    Ok(file_path)
}

#[tauri::command]
pub async fn preview_invoice_html(
    state: State<'_, crate::AppState>,
    invoice_id: i64,
    paper_size: String,
) -> ApiResult<String> {
    let pdf_data = get_invoice_pdf_data(state.clone(), invoice_id).await?;

    // Generate HTML based on paper size
    let settings = match paper_size.as_str() {
        "A4" => PdfGenerator::get_a4_settings(&pdf_data.store),
        "A5" => PdfGenerator::get_a5_settings(&pdf_data.store),
        "thermal" => PdfGenerator::get_thermal_settings(&pdf_data.store),
        _ => PdfGenerator::get_a5_settings(&pdf_data.store), // Default to A5
    };

    // For preview, we'll return the HTML instead of converting to PDF
    let html = generate_html_invoice(&pdf_data, &settings)?;
    Ok(html)
}

#[tauri::command]
pub async fn convert_amount_to_words(amount: f64) -> ApiResult<String> {
    Ok(PdfGenerator::amount_to_words(amount))
}

#[tauri::command]
pub async fn validate_pdf_output_path(file_path: String) -> ApiResult<bool> {
    let path = Path::new(&file_path);

    // Check if parent directory exists
    if let Some(parent) = path.parent() {
        if !parent.exists() {
            return Err(ApiError {
                message: "Output directory does not exist".to_string(),
                code: Some("INVALID_PATH".to_string()),
            });
        }
    }

    // Check if we can write to the location
    match path.extension().and_then(|ext| ext.to_str()) {
        Some("pdf") => Ok(true),
        Some(_) => Err(ApiError {
            message: "File must have .pdf extension".to_string(),
            code: Some("INVALID_EXTENSION".to_string()),
        }),
        None => Err(ApiError {
            message: "File must have .pdf extension".to_string(),
            code: Some("MISSING_EXTENSION".to_string()),
        }),
    }
}

// Helper function to get complete invoice data for PDF generation
async fn get_invoice_pdf_data(
    state: State<'_, crate::AppState>,
    invoice_id: i64,
) -> ApiResult<InvoicePdfData> {
    let pool = state.db.get_pool_cloned();

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

        // Get addons for this item (if any)
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
                rate: addon_row.get("rate"),
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

    // Calculate totals
    let totals = PdfTotals {
        subtotal: invoice.subtotal,
        discount_amount: invoice.discount,
        express_charge: invoice.express_charge,
        base_amount: invoice.subtotal - invoice.discount + invoice.express_charge,
        sgst_amount: invoice.sgst_amount,
        cgst_amount: invoice.cgst_amount,
        total_gst: invoice.sgst_amount + invoice.cgst_amount + invoice.igst_amount,
        total_amount: invoice.total,
        amount_in_words: PdfGenerator::amount_to_words(invoice.total),
    };

    Ok(InvoicePdfData {
        invoice,
        customer,
        store: store.clone(),
        items,
        totals,
        settings: PdfGenerator::get_a5_settings(&store), // Default settings
    })
}

// Helper function to save PDF bytes to file
fn save_pdf_to_file(pdf_bytes: &[u8], file_path: &str) -> ApiResult<()> {
    fs::write(file_path, pdf_bytes).map_err(|e| ApiError {
        message: format!("Failed to save PDF file: {}", e),
        code: Some("FILE_WRITE_ERROR".to_string()),
    })?;

    Ok(())
}

// Helper function to generate HTML (exposing internal logic for preview)
fn generate_html_invoice(
    data: &InvoicePdfData,
    settings: &crate::services::pdf_generator::PdfSettings,
) -> ApiResult<String> {
    // This would call the internal HTML generation method from PdfGenerator
    // For now, we'll create a simplified version
    Ok(format!(r#"
<!DOCTYPE html>
<html>
<head>
    <meta charset='UTF-8'>
    <title>Invoice Preview - {}</title>
    <style>
        body {{ font-family: Arial, sans-serif; margin: 20px; }}
        .header {{ border-bottom: 2px solid #2563eb; padding-bottom: 10px; margin-bottom: 20px; }}
        .invoice-title {{ font-size: 24px; font-weight: bold; color: #2563eb; }}
        .business-name {{ font-size: 18px; font-weight: bold; margin-bottom: 10px; }}
        .customer-info {{ margin: 20px 0; }}
        .items-table {{ width: 100%; border-collapse: collapse; margin: 20px 0; }}
        .items-table th, .items-table td {{ border: 1px solid #ddd; padding: 8px; text-align: left; }}
        .items-table th {{ background-color: #2563eb; color: white; }}
        .totals {{ margin-top: 20px; text-align: right; }}
        .total-amount {{ font-size: 18px; font-weight: bold; }}
    </style>
</head>
<body>
    <div class="header">
        <div class="business-name">{}</div>
        <div class="invoice-title">INVOICE</div>
        <div><strong>Invoice No:</strong> {}</div>
        <div><strong>Date:</strong> {}</div>
    </div>

    <div class="customer-info">
        <h3>Bill To:</h3>
        <div><strong>{}</strong></div>
        <div>{}</div>
        <div>{}</div>
    </div>

    <table class="items-table">
        <thead>
            <tr>
                <th>Description</th>
                <th>Qty</th>
                <th>Rate</th>
                <th>Amount</th>
            </tr>
        </thead>
        <tbody>
            {}
        </tbody>
    </table>

    <div class="totals">
        <div>Subtotal: ₹{:.2}</div>
        <div>SGST: ₹{:.2}</div>
        <div>CGST: ₹{:.2}</div>
        <div class="total-amount">Total: ₹{:.2}</div>
        <div style="margin-top: 10px; font-style: italic;">
            <strong>Amount in Words:</strong> {}
        </div>
    </div>
</body>
</html>
    "#,
        data.invoice.invoice_no,
        data.store.name,
        data.invoice.invoice_no,
        data.invoice.order_datetime.split('T').next().unwrap_or(&data.invoice.order_datetime),
        data.customer.name,
        data.customer.phone.as_deref().unwrap_or(""),
        data.customer.address.as_deref().unwrap_or(""),
        data.items.iter().map(|item| {
            format!("<tr><td>{}</td><td>{}</td><td>₹{:.2}</td><td>₹{:.2}</td></tr>",
                item.service_name,
                item.item.qty,
                item.item.rate,
                item.item.amount
            )
        }).collect::<Vec<_>>().join(""),
        data.totals.subtotal,
        data.totals.sgst_amount,
        data.totals.cgst_amount,
        data.totals.total_amount,
        data.totals.amount_in_words
    ))
}