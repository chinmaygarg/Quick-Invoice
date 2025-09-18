use crate::database::DatabaseManager;
use crate::models::{
    Service, CreateServiceRequest, UpdateServiceRequest, ServiceWithDetails,
    ServiceVariant, CreateServiceVariantRequest, ServiceAddon, CreateServiceAddonRequest,
    ApiResult, ApiError
};
use sqlx::Row;
use tauri::State;

#[tauri::command]
pub async fn create_service(
    state: State<'_, crate::AppState>,
    request: CreateServiceRequest,
) -> ApiResult<Service> {
    let pool = {
        let db = state.db.lock().unwrap();
        db.get_pool_cloned()
    };

    // Validate input
    if request.name.trim().is_empty() {
        return Err(ApiError {
            message: "Service name is required".to_string(),
            code: Some("VALIDATION_ERROR".to_string()),
        });
    }

    if request.base_price <= 0.0 {
        return Err(ApiError {
            message: "Base price must be greater than 0".to_string(),
            code: Some("VALIDATION_ERROR".to_string()),
        });
    }

    // Start transaction
    let mut tx = pool.begin().await.map_err(|e| ApiError {
        message: format!("Failed to start transaction: {}", e),
        code: Some("DATABASE_ERROR".to_string()),
    })?;

    // Insert new service
    let service_result = sqlx::query(
        "INSERT INTO services (name, category, description, base_price, gst_rate, unit, min_quantity, is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
         RETURNING id, name, category, description, base_price, gst_rate, unit, min_quantity, is_active, created_at, updated_at"
    )
    .bind(&request.name)
    .bind(&request.category)
    .bind(&request.description)
    .bind(request.base_price)
    .bind(request.gst_rate)
    .bind(&request.unit)
    .bind(request.min_quantity)
    .bind(if request.is_active.unwrap_or(true) { 1 } else { 0 })
    .fetch_one(&mut *tx)
    .await
    .map_err(|e| ApiError {
        message: format!("Failed to create service: {}", e),
        code: Some("DATABASE_ERROR".to_string()),
    })?;

    let service_id: i64 = service_result.get("id");

    // Create variants if provided
    if let Some(variants) = &request.variants {
        for variant in variants {
            sqlx::query(
                "INSERT INTO service_variants (service_id, name, description, price_multiplier, is_active, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))"
            )
            .bind(service_id)
            .bind(&variant.name)
            .bind(&variant.description)
            .bind(variant.price_multiplier)
            .bind(if variant.is_active.unwrap_or(true) { 1 } else { 0 })
            .execute(&mut *tx)
            .await
            .map_err(|e| ApiError {
                message: format!("Failed to create service variant: {}", e),
                code: Some("DATABASE_ERROR".to_string()),
            })?;
        }
    }

    // Create addons if provided
    if let Some(addons) = &request.addons {
        for addon in addons {
            sqlx::query(
                "INSERT INTO service_addons (service_id, name, description, price, unit, is_active, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))"
            )
            .bind(service_id)
            .bind(&addon.name)
            .bind(&addon.description)
            .bind(addon.price)
            .bind(&addon.unit)
            .bind(if addon.is_active.unwrap_or(true) { 1 } else { 0 })
            .execute(&mut *tx)
            .await
            .map_err(|e| ApiError {
                message: format!("Failed to create service addon: {}", e),
                code: Some("DATABASE_ERROR".to_string()),
            })?;
        }
    }

    // Commit transaction
    tx.commit().await.map_err(|e| ApiError {
        message: format!("Failed to commit transaction: {}", e),
        code: Some("DATABASE_ERROR".to_string()),
    })?;

    Ok(Service {
        id: service_result.get("id"),
        name: service_result.get("name"),
        category: service_result.get("category"),
        description: service_result.get("description"),
        base_price: service_result.get("base_price"),
        gst_rate: service_result.get("gst_rate"),
        unit: service_result.get("unit"),
        min_quantity: service_result.get("min_quantity"),
        is_active: service_result.get("is_active"),
        created_at: service_result.get("created_at"),
        updated_at: service_result.get("updated_at"),
    })
}

#[tauri::command]
pub async fn get_service_by_id(
    state: State<'_, crate::AppState>,
    service_id: i64,
) -> ApiResult<Service> {
    let pool = {
        let db = state.db.lock().unwrap();
        db.get_pool_cloned()
    };

    let service = sqlx::query_as::<_, Service>("SELECT * FROM services WHERE id = ?")
        .bind(service_id)
        .fetch_optional(&pool)
        .await
        .map_err(|e| ApiError {
            message: format!("Database error: {}", e),
            code: Some("DATABASE_ERROR".to_string()),
        })?;

    service.ok_or_else(|| ApiError {
        message: "Service not found".to_string(),
        code: Some("NOT_FOUND".to_string()),
    })
}

#[tauri::command]
pub async fn search_services(
    state: State<'_, crate::AppState>,
    query: Option<String>,
    category: Option<String>,
    include_inactive: Option<bool>,
    limit: Option<i64>,
    offset: Option<i64>,
) -> ApiResult<Vec<ServiceWithDetails>> {
    let pool = {
        let db = state.db.lock().unwrap();
        db.get_pool_cloned()
    };

    let limit = limit.unwrap_or(50);
    let offset = offset.unwrap_or(0);
    let include_inactive = include_inactive.unwrap_or(false);

    let mut base_query = r#"
        SELECT
            s.id, s.name, s.category, s.description, s.base_price, s.gst_rate,
            s.unit, s.min_quantity, s.is_active, s.created_at, s.updated_at,
            COALESCE(v.variants_count, 0) as variants_count,
            COALESCE(a.addons_count, 0) as addons_count
        FROM services s
        LEFT JOIN (
            SELECT service_id, COUNT(*) as variants_count
            FROM service_variants
            WHERE is_active = 1
            GROUP BY service_id
        ) v ON s.id = v.service_id
        LEFT JOIN (
            SELECT service_id, COUNT(*) as addons_count
            FROM service_addons
            WHERE is_active = 1
            GROUP BY service_id
        ) a ON s.id = a.service_id
    "#.to_string();

    let mut conditions = Vec::new();
    let mut params: Vec<Box<dyn sqlx::Encode<sqlx::Sqlite> + Send + Sync>> = Vec::new();

    if !include_inactive {
        conditions.push("s.is_active = 1");
    }

    if let Some(search_query) = query {
        if !search_query.trim().is_empty() {
            conditions.push("(s.name LIKE ? OR s.description LIKE ?)");
            let search_pattern = format!("%{}%", search_query.trim());
            params.push(Box::new(search_pattern.clone()));
            params.push(Box::new(search_pattern));
        }
    }

    if let Some(cat) = category {
        if !cat.trim().is_empty() {
            conditions.push("s.category = ?");
            params.push(Box::new(cat));
        }
    }

    if !conditions.is_empty() {
        base_query.push_str(" WHERE ");
        base_query.push_str(&conditions.join(" AND "));
    }

    base_query.push_str(" ORDER BY s.name ASC LIMIT ? OFFSET ?");
    params.push(Box::new(limit));
    params.push(Box::new(offset));

    let mut query = sqlx::query(&base_query);
    for param in params {
        query = query.bind(param);
    }

    let rows = query
        .fetch_all(&pool)
        .await
        .map_err(|e| ApiError {
            message: format!("Failed to search services: {}", e),
            code: Some("DATABASE_ERROR".to_string()),
        })?;

    let services = rows.into_iter().map(|row| ServiceWithDetails {
        id: row.get("id"),
        name: row.get("name"),
        category: row.get("category"),
        description: row.get("description"),
        base_price: row.get("base_price"),
        gst_rate: row.get("gst_rate"),
        unit: row.get("unit"),
        min_quantity: row.get("min_quantity"),
        is_active: row.get("is_active"),
        variants_count: row.get("variants_count"),
        addons_count: row.get("addons_count"),
        created_at: row.get("created_at"),
        updated_at: row.get("updated_at"),
    }).collect();

    Ok(services)
}

#[tauri::command]
pub async fn update_service(
    state: State<'_, crate::AppState>,
    service_id: i64,
    request: UpdateServiceRequest,
) -> ApiResult<Service> {
    let pool = {
        let db = state.db.lock().unwrap();
        db.get_pool_cloned()
    };

    // Validate input
    if request.name.trim().is_empty() {
        return Err(ApiError {
            message: "Service name is required".to_string(),
            code: Some("VALIDATION_ERROR".to_string()),
        });
    }

    // Check if service exists
    let _existing = get_service_by_id(state.clone(), service_id).await?;

    // Start transaction
    let mut tx = pool.begin().await.map_err(|e| ApiError {
        message: format!("Failed to start transaction: {}", e),
        code: Some("DATABASE_ERROR".to_string()),
    })?;

    // Update service
    let service_result = sqlx::query(
        "UPDATE services
         SET name = ?, category = ?, description = ?, base_price = ?, gst_rate = ?,
             unit = ?, min_quantity = ?, is_active = ?, updated_at = datetime('now')
         WHERE id = ?
         RETURNING id, name, category, description, base_price, gst_rate, unit, min_quantity, is_active, created_at, updated_at"
    )
    .bind(&request.name)
    .bind(&request.category)
    .bind(&request.description)
    .bind(request.base_price)
    .bind(request.gst_rate)
    .bind(&request.unit)
    .bind(request.min_quantity)
    .bind(if request.is_active.unwrap_or(true) { 1 } else { 0 })
    .bind(service_id)
    .fetch_one(&mut *tx)
    .await
    .map_err(|e| ApiError {
        message: format!("Failed to update service: {}", e),
        code: Some("DATABASE_ERROR".to_string()),
    })?;

    // Delete existing variants and addons
    sqlx::query("DELETE FROM service_variants WHERE service_id = ?")
        .bind(service_id)
        .execute(&mut *tx)
        .await
        .map_err(|e| ApiError {
            message: format!("Failed to delete existing variants: {}", e),
            code: Some("DATABASE_ERROR".to_string()),
        })?;

    sqlx::query("DELETE FROM service_addons WHERE service_id = ?")
        .bind(service_id)
        .execute(&mut *tx)
        .await
        .map_err(|e| ApiError {
            message: format!("Failed to delete existing addons: {}", e),
            code: Some("DATABASE_ERROR".to_string()),
        })?;

    // Create new variants if provided
    if let Some(variants) = &request.variants {
        for variant in variants {
            sqlx::query(
                "INSERT INTO service_variants (service_id, name, description, price_multiplier, is_active, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))"
            )
            .bind(service_id)
            .bind(&variant.name)
            .bind(&variant.description)
            .bind(variant.price_multiplier)
            .bind(if variant.is_active.unwrap_or(true) { 1 } else { 0 })
            .execute(&mut *tx)
            .await
            .map_err(|e| ApiError {
                message: format!("Failed to create service variant: {}", e),
                code: Some("DATABASE_ERROR".to_string()),
            })?;
        }
    }

    // Create new addons if provided
    if let Some(addons) = &request.addons {
        for addon in addons {
            sqlx::query(
                "INSERT INTO service_addons (service_id, name, description, price, unit, is_active, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))"
            )
            .bind(service_id)
            .bind(&addon.name)
            .bind(&addon.description)
            .bind(addon.price)
            .bind(&addon.unit)
            .bind(if addon.is_active.unwrap_or(true) { 1 } else { 0 })
            .execute(&mut *tx)
            .await
            .map_err(|e| ApiError {
                message: format!("Failed to create service addon: {}", e),
                code: Some("DATABASE_ERROR".to_string()),
            })?;
        }
    }

    // Commit transaction
    tx.commit().await.map_err(|e| ApiError {
        message: format!("Failed to commit transaction: {}", e),
        code: Some("DATABASE_ERROR".to_string()),
    })?;

    Ok(Service {
        id: service_result.get("id"),
        name: service_result.get("name"),
        category: service_result.get("category"),
        description: service_result.get("description"),
        base_price: service_result.get("base_price"),
        gst_rate: service_result.get("gst_rate"),
        unit: service_result.get("unit"),
        min_quantity: service_result.get("min_quantity"),
        is_active: service_result.get("is_active"),
        created_at: service_result.get("created_at"),
        updated_at: service_result.get("updated_at"),
    })
}

#[tauri::command]
pub async fn update_service_status(
    state: State<'_, crate::AppState>,
    service_id: i64,
    is_active: bool,
) -> ApiResult<String> {
    let pool = {
        let db = state.db.lock().unwrap();
        db.get_pool_cloned()
    };

    let rows_affected = sqlx::query(
        "UPDATE services SET is_active = ?, updated_at = datetime('now') WHERE id = ?"
    )
    .bind(if is_active { 1 } else { 0 })
    .bind(service_id)
    .execute(&pool)
    .await
    .map_err(|e| ApiError {
        message: format!("Failed to update service status: {}", e),
        code: Some("DATABASE_ERROR".to_string()),
    })?
    .rows_affected();

    if rows_affected == 0 {
        return Err(ApiError {
            message: "Service not found".to_string(),
            code: Some("NOT_FOUND".to_string()),
        });
    }

    Ok(format!("Service {} successfully", if is_active { "activated" } else { "deactivated" }))
}

#[tauri::command]
pub async fn get_service_variants(
    state: State<'_, crate::AppState>,
    service_id: i64,
) -> ApiResult<Vec<ServiceVariant>> {
    let pool = {
        let db = state.db.lock().unwrap();
        db.get_pool_cloned()
    };

    let variants = sqlx::query_as::<_, ServiceVariant>(
        "SELECT * FROM service_variants WHERE service_id = ? ORDER BY name ASC"
    )
    .bind(service_id)
    .fetch_all(&pool)
    .await
    .map_err(|e| ApiError {
        message: format!("Failed to get service variants: {}", e),
        code: Some("DATABASE_ERROR".to_string()),
    })?;

    Ok(variants)
}

#[tauri::command]
pub async fn get_service_addons(
    state: State<'_, crate::AppState>,
    service_id: i64,
) -> ApiResult<Vec<ServiceAddon>> {
    let pool = {
        let db = state.db.lock().unwrap();
        db.get_pool_cloned()
    };

    let addons = sqlx::query_as::<_, ServiceAddon>(
        "SELECT * FROM service_addons WHERE service_id = ? ORDER BY name ASC"
    )
    .bind(service_id)
    .fetch_all(&pool)
    .await
    .map_err(|e| ApiError {
        message: format!("Failed to get service addons: {}", e),
        code: Some("DATABASE_ERROR".to_string()),
    })?;

    Ok(addons)
}

#[tauri::command]
pub async fn get_service_categories(
    state: State<'_, crate::AppState>,
) -> ApiResult<Vec<String>> {
    let pool = {
        let db = state.db.lock().unwrap();
        db.get_pool_cloned()
    };

    let categories: Vec<String> = sqlx::query_scalar(
        "SELECT DISTINCT category FROM services WHERE category IS NOT NULL ORDER BY category ASC"
    )
    .fetch_all(&pool)
    .await
    .map_err(|e| ApiError {
        message: format!("Failed to get service categories: {}", e),
        code: Some("DATABASE_ERROR".to_string()),
    })?;

    Ok(categories)
}