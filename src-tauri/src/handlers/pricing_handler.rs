use crate::database::DatabaseManager;
use crate::models::{Service, ServiceVariant, ServiceAddon, ApiResult, ApiError};
use crate::services::pricing_engine::{PricingEngine, PricingRequest, PricingResult, GstCalculation};
use sqlx::Row;
use tauri::State;

#[tauri::command]
pub async fn calculate_service_pricing(
    state: State<'_, crate::AppState>,
    request: PricingRequest,
) -> ApiResult<PricingResult> {
    let pool = {
        let db = state.db.lock().unwrap();
        db.get_pool_cloned()
    };

    // Validate the pricing request
    PricingEngine::validate_pricing_request(&request)?;

    // Get service details
    let service = sqlx::query_as::<_, Service>("SELECT * FROM services WHERE id = ? AND is_active = 1")
        .bind(request.service_id)
        .fetch_optional(&pool)
        .await
        .map_err(|e| ApiError {
            message: format!("Database error: {}", e),
            code: Some("DATABASE_ERROR".to_string()),
        })?
        .ok_or_else(|| ApiError {
            message: "Service not found or inactive".to_string(),
            code: Some("SERVICE_NOT_FOUND".to_string()),
        })?;

    // Get variant if specified
    let variant = if let Some(variant_id) = request.variant_id {
        let v = sqlx::query_as::<_, ServiceVariant>(
            "SELECT * FROM service_variants WHERE id = ? AND service_id = ? AND is_active = 1"
        )
        .bind(variant_id)
        .bind(request.service_id)
        .fetch_optional(&pool)
        .await
        .map_err(|e| ApiError {
            message: format!("Database error: {}", e),
            code: Some("DATABASE_ERROR".to_string()),
        })?;

        if v.is_none() {
            return Err(ApiError {
                message: "Service variant not found or inactive".to_string(),
                code: Some("VARIANT_NOT_FOUND".to_string()),
            });
        }
        v
    } else {
        None
    };

    // Get addons
    let mut addons = Vec::new();
    for addon_request in &request.addons {
        let addon = sqlx::query_as::<_, ServiceAddon>(
            "SELECT * FROM service_addons WHERE id = ? AND service_id = ? AND is_active = 1"
        )
        .bind(addon_request.addon_id)
        .bind(request.service_id)
        .fetch_optional(&pool)
        .await
        .map_err(|e| ApiError {
            message: format!("Database error: {}", e),
            code: Some("DATABASE_ERROR".to_string()),
        })?
        .ok_or_else(|| ApiError {
            message: format!("Addon with ID {} not found or inactive", addon_request.addon_id),
            code: Some("ADDON_NOT_FOUND".to_string()),
        })?;

        addons.push(addon);
    }

    // Calculate pricing
    PricingEngine::calculate_item_pricing(&service, variant.as_ref(), &addons, &request)
}

#[tauri::command]
pub async fn calculate_gst_only(
    amount: f64,
    gst_rate: f64,
    is_inclusive: bool,
) -> ApiResult<GstCalculation> {
    PricingEngine::calculate_gst(amount, gst_rate, is_inclusive)
}

#[tauri::command]
pub async fn calculate_express_delivery_charge(
    base_amount: f64,
    express_rate: Option<f64>,
) -> ApiResult<f64> {
    let rate = express_rate.unwrap_or(50.0); // Default 50% surcharge

    if rate < 0.0 {
        return Err(ApiError {
            message: "Express rate cannot be negative".to_string(),
            code: Some("INVALID_EXPRESS_RATE".to_string()),
        });
    }

    Ok(PricingEngine::calculate_express_charge(base_amount, rate))
}

#[tauri::command]
pub async fn calculate_loyalty_discount_amount(
    base_amount: f64,
    customer_tier: String,
) -> ApiResult<f64> {
    Ok(PricingEngine::calculate_loyalty_discount(base_amount, &customer_tier))
}

#[tauri::command]
pub async fn get_service_price_preview(
    state: State<'_, crate::AppState>,
    service_id: i64,
    variant_id: Option<i64>,
    quantity: f64,
) -> ApiResult<ServicePricePreview> {
    let pool = {
        let db = state.db.lock().unwrap();
        db.get_pool_cloned()
    };

    // Get service details
    let service = sqlx::query_as::<_, Service>("SELECT * FROM services WHERE id = ? AND is_active = 1")
        .bind(service_id)
        .fetch_optional(&pool)
        .await
        .map_err(|e| ApiError {
            message: format!("Database error: {}", e),
            code: Some("DATABASE_ERROR".to_string()),
        })?
        .ok_or_else(|| ApiError {
            message: "Service not found or inactive".to_string(),
            code: Some("SERVICE_NOT_FOUND".to_string()),
        })?;

    // Get variant if specified
    let variant = if let Some(variant_id) = variant_id {
        sqlx::query_as::<_, ServiceVariant>(
            "SELECT * FROM service_variants WHERE id = ? AND service_id = ? AND is_active = 1"
        )
        .bind(variant_id)
        .bind(service_id)
        .fetch_optional(&pool)
        .await
        .map_err(|e| ApiError {
            message: format!("Database error: {}", e),
            code: Some("DATABASE_ERROR".to_string()),
        })?
    } else {
        None
    };

    let base_price = service.base_price;
    let price_multiplier = variant.as_ref().map(|v| v.price_multiplier).unwrap_or(1.0);
    let effective_rate = base_price * price_multiplier;
    let amount = effective_rate * quantity;

    // Calculate GST (assuming exclusive by default for preview)
    let gst_calc = PricingEngine::calculate_gst(amount, service.gst_rate, false)?;

    Ok(ServicePricePreview {
        service_id,
        service_name: service.name,
        variant_id,
        variant_name: variant.map(|v| v.name),
        base_price,
        price_multiplier,
        effective_rate,
        quantity,
        unit: service.unit,
        amount,
        gst_rate: service.gst_rate,
        gst_amount: gst_calc.total_gst,
        total_with_gst: gst_calc.total_with_gst,
        min_quantity: service.min_quantity,
        is_below_minimum: quantity < service.min_quantity as f64,
    })
}

#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct ServicePricePreview {
    pub service_id: i64,
    pub service_name: String,
    pub variant_id: Option<i64>,
    pub variant_name: Option<String>,
    pub base_price: f64,
    pub price_multiplier: f64,
    pub effective_rate: f64,
    pub quantity: f64,
    pub unit: String,
    pub amount: f64,
    pub gst_rate: f64,
    pub gst_amount: f64,
    pub total_with_gst: f64,
    pub min_quantity: i64,
    pub is_below_minimum: bool,
}

#[tauri::command]
pub async fn validate_pricing_request_api(
    request: PricingRequest,
) -> ApiResult<String> {
    PricingEngine::validate_pricing_request(&request)?;
    Ok("Pricing request is valid".to_string())
}