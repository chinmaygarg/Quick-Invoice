use crate::database::DatabaseManager;
use crate::models::{ApiResult, ApiError};
use sqlx::Row;
use tauri::State;
use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc, NaiveDate};

#[derive(Debug, Serialize)]
pub struct SalesSummary {
    pub total_invoices: i64,
    pub total_revenue: f64,
    pub total_tax: f64,
    pub total_discount: f64,
    pub average_invoice_value: f64,
    pub payment_summary: PaymentSummary,
    pub status_breakdown: Vec<StatusCount>,
    pub daily_sales: Vec<DailySale>,
}

#[derive(Debug, Serialize)]
pub struct PaymentSummary {
    pub cash: f64,
    pub card: f64,
    pub upi: f64,
    pub bank_transfer: f64,
    pub credit: f64,
    pub partial: f64,
    pub total_paid: f64,
    pub total_pending: f64,
}

#[derive(Debug, Serialize)]
pub struct StatusCount {
    pub status: String,
    pub count: i64,
    pub total_amount: f64,
}

#[derive(Debug, Serialize)]
pub struct DailySale {
    pub date: String,
    pub invoice_count: i64,
    pub total_amount: f64,
    pub tax_amount: f64,
}

#[derive(Debug, Serialize)]
pub struct GstSummary {
    pub period_start: String,
    pub period_end: String,
    pub total_taxable_amount: f64,
    pub total_sgst: f64,
    pub total_cgst: f64,
    pub total_igst: f64,
    pub total_tax_collected: f64,
    pub gst_rate_breakdown: Vec<GstRateBreakdown>,
    pub monthly_gst: Vec<MonthlyGst>,
}

#[derive(Debug, Serialize)]
pub struct GstRateBreakdown {
    pub gst_rate: f64,
    pub taxable_amount: f64,
    pub sgst_amount: f64,
    pub cgst_amount: f64,
    pub igst_amount: f64,
    pub total_tax: f64,
    pub invoice_count: i64,
}

#[derive(Debug, Serialize)]
pub struct MonthlyGst {
    pub month: String,
    pub taxable_amount: f64,
    pub total_tax: f64,
    pub invoice_count: i64,
}

#[derive(Debug, Serialize)]
pub struct CustomerSummary {
    pub customer_id: i64,
    pub customer_name: String,
    pub customer_phone: Option<String>,
    pub total_invoices: i64,
    pub total_spent: f64,
    pub average_invoice_value: f64,
    pub last_order_date: Option<String>,
    pub first_order_date: Option<String>,
    pub favorite_services: Vec<ServiceUsage>,
    pub payment_preference: String,
    pub outstanding_amount: f64,
}

#[derive(Debug, Serialize)]
pub struct ServiceUsage {
    pub service_name: String,
    pub times_ordered: i64,
    pub total_amount: f64,
}

#[derive(Debug, Serialize)]
pub struct ServicePopularity {
    pub service_id: i64,
    pub service_name: String,
    pub category: String,
    pub times_ordered: i64,
    pub total_revenue: f64,
    pub average_price: f64,
    pub growth_percentage: f64,
}

#[derive(Debug, Deserialize)]
pub struct ReportDateRange {
    pub start_date: String,
    pub end_date: String,
}

#[tauri::command]
pub async fn get_sales_summary(
    state: State<'_, crate::AppState>,
    date_range: ReportDateRange,
) -> ApiResult<SalesSummary> {
    let pool = state.db.get_pool_cloned();

    // Basic sales metrics
    let sales_row = sqlx::query(
        r#"
        SELECT
            COUNT(*) as total_invoices,
            CAST(COALESCE(SUM(total), 0.0) AS REAL) as total_revenue,
            CAST(COALESCE(SUM(sgst_amount + cgst_amount + igst_amount), 0.0) AS REAL) as total_tax,
            CAST(COALESCE(SUM(discount), 0.0) AS REAL) as total_discount,
            CAST(COALESCE(AVG(total), 0.0) AS REAL) as average_invoice_value
        FROM invoices
        WHERE DATE(order_datetime) >= ? AND DATE(order_datetime) <= ?
        "#
    )
    .bind(&date_range.start_date)
    .bind(&date_range.end_date)
    .fetch_one(&pool)
    .await
    .map_err(|e| ApiError {
        message: format!("Database error: {}", e),
        code: Some("DATABASE_ERROR".to_string()),
    })?;

    let total_invoices: i64 = sales_row.get("total_invoices");
    let total_revenue: f64 = sales_row.get("total_revenue");
    let total_tax: f64 = sales_row.get("total_tax");
    let total_discount: f64 = sales_row.get("total_discount");
    let average_invoice_value: f64 = sales_row.get("average_invoice_value");

    // Payment summary
    let payment_rows = sqlx::query(
        r#"
        SELECT
            COALESCE(payment_method, 'unknown') as payment_method,
            CAST(COALESCE(SUM(payment_amount), 0.0) AS REAL) as total_amount
        FROM invoices
        WHERE DATE(order_datetime) >= ? AND DATE(order_datetime) <= ?
        GROUP BY payment_method
        "#
    )
    .bind(&date_range.start_date)
    .bind(&date_range.end_date)
    .fetch_all(&pool)
    .await
    .map_err(|e| ApiError {
        message: format!("Database error: {}", e),
        code: Some("DATABASE_ERROR".to_string()),
    })?;

    let mut payment_summary = PaymentSummary {
        cash: 0.0,
        card: 0.0,
        upi: 0.0,
        bank_transfer: 0.0,
        credit: 0.0,
        partial: 0.0,
        total_paid: 0.0,
        total_pending: 0.0,
    };

    for row in payment_rows {
        let method: String = row.get("payment_method");
        let amount: f64 = row.get("total_amount");

        match method.as_str() {
            "cash" => payment_summary.cash = amount,
            "card" => payment_summary.card = amount,
            "upi" => payment_summary.upi = amount,
            "bank_transfer" => payment_summary.bank_transfer = amount,
            "credit" => payment_summary.credit = amount,
            "partial" => payment_summary.partial = amount,
            _ => {}
        }
        payment_summary.total_paid += amount;
    }

    payment_summary.total_pending = total_revenue - payment_summary.total_paid;

    // Status breakdown
    let status_rows = sqlx::query(
        r#"
        SELECT
            status,
            COUNT(*) as count,
            COALESCE(SUM(total), 0) as total_amount
        FROM invoices
        WHERE DATE(order_datetime) >= ? AND DATE(order_datetime) <= ?
        GROUP BY status
        ORDER BY count DESC
        "#
    )
    .bind(&date_range.start_date)
    .bind(&date_range.end_date)
    .fetch_all(&pool)
    .await
    .map_err(|e| ApiError {
        message: format!("Database error: {}", e),
        code: Some("DATABASE_ERROR".to_string()),
    })?;

    let status_breakdown = status_rows.into_iter().map(|row| {
        StatusCount {
            status: row.get("status"),
            count: row.get("count"),
            total_amount: row.get("total_amount"),
        }
    }).collect();

    // Daily sales
    let daily_rows = sqlx::query(
        r#"
        SELECT
            DATE(order_datetime) as date,
            COUNT(*) as invoice_count,
            COALESCE(SUM(total), 0) as total_amount,
            COALESCE(SUM(sgst_amount + cgst_amount + igst_amount), 0) as tax_amount
        FROM invoices
        WHERE DATE(order_datetime) >= ? AND DATE(order_datetime) <= ?
        GROUP BY DATE(order_datetime)
        ORDER BY date
        "#
    )
    .bind(&date_range.start_date)
    .bind(&date_range.end_date)
    .fetch_all(&pool)
    .await
    .map_err(|e| ApiError {
        message: format!("Database error: {}", e),
        code: Some("DATABASE_ERROR".to_string()),
    })?;

    let daily_sales = daily_rows.into_iter().map(|row| {
        DailySale {
            date: row.get("date"),
            invoice_count: row.get("invoice_count"),
            total_amount: row.get("total_amount"),
            tax_amount: row.get("tax_amount"),
        }
    }).collect();

    Ok(SalesSummary {
        total_invoices,
        total_revenue,
        total_tax,
        total_discount,
        average_invoice_value,
        payment_summary,
        status_breakdown,
        daily_sales,
    })
}

#[tauri::command]
pub async fn get_gst_summary(
    state: State<'_, crate::AppState>,
    date_range: ReportDateRange,
) -> ApiResult<GstSummary> {
    let pool = state.db.get_pool_cloned();

    // Total GST summary
    let gst_total_row = sqlx::query(
        r#"
        SELECT
            COALESCE(SUM(subtotal - discount + express_charge), 0) as total_taxable_amount,
            COALESCE(SUM(sgst_amount), 0) as total_sgst,
            COALESCE(SUM(cgst_amount), 0) as total_cgst,
            COALESCE(SUM(igst_amount), 0) as total_igst
        FROM invoices
        WHERE DATE(order_datetime) >= ? AND DATE(order_datetime) <= ?
        "#
    )
    .bind(&date_range.start_date)
    .bind(&date_range.end_date)
    .fetch_one(&pool)
    .await
    .map_err(|e| ApiError {
        message: format!("Database error: {}", e),
        code: Some("DATABASE_ERROR".to_string()),
    })?;

    let total_taxable_amount: f64 = gst_total_row.get("total_taxable_amount");
    let total_sgst: f64 = gst_total_row.get("total_sgst");
    let total_cgst: f64 = gst_total_row.get("total_cgst");
    let total_igst: f64 = gst_total_row.get("total_igst");
    let total_tax_collected = total_sgst + total_cgst + total_igst;

    // GST rate breakdown
    let gst_rate_rows = sqlx::query(
        r#"
        SELECT
            ii.gst_rate,
            COUNT(DISTINCT i.id) as invoice_count,
            COALESCE(SUM(ii.amount - (ii.sgst + ii.cgst)), 0) as taxable_amount,
            COALESCE(SUM(ii.sgst), 0) as sgst_amount,
            COALESCE(SUM(ii.cgst), 0) as cgst_amount,
            0 as igst_amount
        FROM invoice_items ii
        JOIN invoices i ON ii.invoice_id = i.id
        WHERE DATE(i.order_datetime) >= ? AND DATE(i.order_datetime) <= ?
        GROUP BY ii.gst_rate
        ORDER BY ii.gst_rate
        "#
    )
    .bind(&date_range.start_date)
    .bind(&date_range.end_date)
    .fetch_all(&pool)
    .await
    .map_err(|e| ApiError {
        message: format!("Database error: {}", e),
        code: Some("DATABASE_ERROR".to_string()),
    })?;

    let gst_rate_breakdown = gst_rate_rows.into_iter().map(|row| {
        let taxable_amount: f64 = row.get("taxable_amount");
        let sgst_amount: f64 = row.get("sgst_amount");
        let cgst_amount: f64 = row.get("cgst_amount");
        let igst_amount: f64 = row.get("igst_amount");

        GstRateBreakdown {
            gst_rate: row.get("gst_rate"),
            taxable_amount,
            sgst_amount,
            cgst_amount,
            igst_amount,
            total_tax: sgst_amount + cgst_amount + igst_amount,
            invoice_count: row.get("invoice_count"),
        }
    }).collect();

    // Monthly GST breakdown
    let monthly_rows = sqlx::query(
        r#"
        SELECT
            strftime('%Y-%m', order_datetime) as month,
            COALESCE(SUM(subtotal - discount + express_charge), 0) as taxable_amount,
            COALESCE(SUM(sgst_amount + cgst_amount + igst_amount), 0) as total_tax,
            COUNT(*) as invoice_count
        FROM invoices
        WHERE DATE(order_datetime) >= ? AND DATE(order_datetime) <= ?
        GROUP BY strftime('%Y-%m', order_datetime)
        ORDER BY month
        "#
    )
    .bind(&date_range.start_date)
    .bind(&date_range.end_date)
    .fetch_all(&pool)
    .await
    .map_err(|e| ApiError {
        message: format!("Database error: {}", e),
        code: Some("DATABASE_ERROR".to_string()),
    })?;

    let monthly_gst = monthly_rows.into_iter().map(|row| {
        MonthlyGst {
            month: row.get("month"),
            taxable_amount: row.get("taxable_amount"),
            total_tax: row.get("total_tax"),
            invoice_count: row.get("invoice_count"),
        }
    }).collect();

    Ok(GstSummary {
        period_start: date_range.start_date,
        period_end: date_range.end_date,
        total_taxable_amount,
        total_sgst,
        total_cgst,
        total_igst,
        total_tax_collected,
        gst_rate_breakdown,
        monthly_gst,
    })
}

#[tauri::command]
pub async fn get_customer_summary(
    state: State<'_, crate::AppState>,
    customer_id: i64,
) -> ApiResult<CustomerSummary> {
    let pool = state.db.get_pool_cloned();

    // Get customer basic info
    let customer_row = sqlx::query(
        "SELECT name, phone FROM customers WHERE id = ?"
    )
    .bind(customer_id)
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

    let customer_name: String = customer_row.get("name");
    let customer_phone: Option<String> = customer_row.get("phone");

    // Get customer invoice summary
    let summary_row = sqlx::query(
        r#"
        SELECT
            COUNT(*) as total_invoices,
            COALESCE(SUM(total), 0) as total_spent,
            COALESCE(AVG(total), 0) as average_invoice_value,
            MIN(order_datetime) as first_order_date,
            MAX(order_datetime) as last_order_date,
            COALESCE(SUM(CASE WHEN payment_amount < total THEN total - payment_amount ELSE 0 END), 0) as outstanding_amount
        FROM invoices
        WHERE customer_id = ?
        "#
    )
    .bind(customer_id)
    .fetch_one(&pool)
    .await
    .map_err(|e| ApiError {
        message: format!("Database error: {}", e),
        code: Some("DATABASE_ERROR".to_string()),
    })?;

    let total_invoices: i64 = summary_row.get("total_invoices");
    let total_spent: f64 = summary_row.get("total_spent");
    let average_invoice_value: f64 = summary_row.get("average_invoice_value");
    let first_order_date: Option<String> = summary_row.get("first_order_date");
    let last_order_date: Option<String> = summary_row.get("last_order_date");
    let outstanding_amount: f64 = summary_row.get("outstanding_amount");

    // Get favorite services
    let service_rows = sqlx::query(
        r#"
        SELECT
            s.name as service_name,
            COUNT(*) as times_ordered,
            COALESCE(SUM(ii.amount), 0) as total_amount
        FROM invoice_items ii
        JOIN invoices i ON ii.invoice_id = i.id
        JOIN services s ON ii.service_id = s.id
        WHERE i.customer_id = ?
        GROUP BY s.id, s.name
        ORDER BY times_ordered DESC, total_amount DESC
        LIMIT 5
        "#
    )
    .bind(customer_id)
    .fetch_all(&pool)
    .await
    .map_err(|e| ApiError {
        message: format!("Database error: {}", e),
        code: Some("DATABASE_ERROR".to_string()),
    })?;

    let favorite_services = service_rows.into_iter().map(|row| {
        ServiceUsage {
            service_name: row.get("service_name"),
            times_ordered: row.get("times_ordered"),
            total_amount: row.get("total_amount"),
        }
    }).collect();

    // Get payment preference
    let payment_row = sqlx::query(
        r#"
        SELECT
            COALESCE(payment_method, 'unknown') as payment_method,
            COUNT(*) as count
        FROM invoices
        WHERE customer_id = ? AND payment_method IS NOT NULL
        GROUP BY payment_method
        ORDER BY count DESC
        LIMIT 1
        "#
    )
    .bind(customer_id)
    .fetch_optional(&pool)
    .await
    .map_err(|e| ApiError {
        message: format!("Database error: {}", e),
        code: Some("DATABASE_ERROR".to_string()),
    })?;

    let payment_preference = payment_row
        .map(|row| row.get::<String, _>("payment_method"))
        .unwrap_or_else(|| "unknown".to_string());

    Ok(CustomerSummary {
        customer_id,
        customer_name,
        customer_phone,
        total_invoices,
        total_spent,
        average_invoice_value,
        last_order_date,
        first_order_date,
        favorite_services,
        payment_preference,
        outstanding_amount,
    })
}

#[tauri::command]
pub async fn get_service_popularity(
    state: State<'_, crate::AppState>,
    date_range: ReportDateRange,
) -> ApiResult<Vec<ServicePopularity>> {
    let pool = state.db.get_pool_cloned();

    let service_rows = sqlx::query(
        r#"
        SELECT
            s.id as service_id,
            s.name as service_name,
            sc.name as category,
            COUNT(ii.id) as times_ordered,
            COALESCE(SUM(ii.amount), 0) as total_revenue,
            COALESCE(AVG(ii.amount), 0) as average_price
        FROM services s
        LEFT JOIN service_categories sc ON s.category_id = sc.id
        LEFT JOIN invoice_items ii ON s.id = ii.service_id
        LEFT JOIN invoices i ON ii.invoice_id = i.id
        WHERE i.id IS NULL OR (DATE(i.order_datetime) >= ? AND DATE(i.order_datetime) <= ?)
        GROUP BY s.id, s.name, sc.name
        HAVING times_ordered > 0
        ORDER BY times_ordered DESC, total_revenue DESC
        "#
    )
    .bind(&date_range.start_date)
    .bind(&date_range.end_date)
    .fetch_all(&pool)
    .await
    .map_err(|e| ApiError {
        message: format!("Database error: {}", e),
        code: Some("DATABASE_ERROR".to_string()),
    })?;

    let service_popularity = service_rows.into_iter().map(|row| {
        ServicePopularity {
            service_id: row.get("service_id"),
            service_name: row.get("service_name"),
            category: row.get::<Option<String>, _>("category").unwrap_or_else(|| "Uncategorized".to_string()),
            times_ordered: row.get("times_ordered"),
            total_revenue: row.get("total_revenue"),
            average_price: row.get("average_price"),
            growth_percentage: 0.0, // TODO: Calculate growth compared to previous period
        }
    }).collect();

    Ok(service_popularity)
}

#[tauri::command]
pub async fn get_express_delivery_summary(
    state: State<'_, crate::AppState>,
    date_range: ReportDateRange,
) -> ApiResult<serde_json::Value> {
    let pool = state.db.get_pool_cloned();

    let express_row = sqlx::query(
        r#"
        SELECT
            COUNT(*) as total_express_orders,
            COALESCE(SUM(express_charge), 0) as total_express_revenue,
            COALESCE(AVG(express_charge), 0) as average_express_charge,
            COUNT(*) * 100.0 / (SELECT COUNT(*) FROM invoices WHERE DATE(order_datetime) >= ? AND DATE(order_datetime) <= ?) as express_percentage
        FROM invoices
        WHERE express_charge > 0
        AND DATE(order_datetime) >= ? AND DATE(order_datetime) <= ?
        "#
    )
    .bind(&date_range.start_date)
    .bind(&date_range.end_date)
    .bind(&date_range.start_date)
    .bind(&date_range.end_date)
    .fetch_one(&pool)
    .await
    .map_err(|e| ApiError {
        message: format!("Database error: {}", e),
        code: Some("DATABASE_ERROR".to_string()),
    })?;

    Ok(serde_json::json!({
        "total_express_orders": express_row.get::<i64, _>("total_express_orders"),
        "total_express_revenue": express_row.get::<f64, _>("total_express_revenue"),
        "average_express_charge": express_row.get::<f64, _>("average_express_charge"),
        "express_percentage": express_row.get::<f64, _>("express_percentage"),
        "period_start": date_range.start_date,
        "period_end": date_range.end_date,
    }))
}