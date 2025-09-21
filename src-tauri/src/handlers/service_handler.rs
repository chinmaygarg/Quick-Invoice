use crate::database::DatabaseManager;
use crate::models::{
    Service, CreateServiceRequest, UpdateServiceRequest, ServiceWithDetails,
    ServiceVariant, CreateServiceVariantRequest, ServiceAddon, CreateServiceAddonRequest,
    ServiceCategory, ApiResult, ApiError
};
use sqlx::Row;
use tauri::State;

#[tauri::command]
pub async fn create_service(
    state: State<'_, crate::AppState>,
    request: CreateServiceRequest,
) -> ApiResult<Service> {
    let pool = state.db.get_pool_cloned();

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

    // Find category_id from category name
    let category_id = if let Some(category_name) = &request.category {
        let result = sqlx::query("SELECT id FROM service_categories WHERE name = ?")
            .bind(category_name)
            .fetch_optional(&pool)
            .await
            .map_err(|e| ApiError {
                message: format!("Failed to find category: {}", e),
                code: Some("DATABASE_ERROR".to_string()),
            })?;

        result.map(|row| row.get::<i64, _>("id"))
    } else {
        None
    };

    // Insert new service
    let service_result = sqlx::query(
        "INSERT INTO services (name, category_id, description, base_price, gst_rate, unit, min_quantity, is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
         RETURNING id, name, description, base_price, gst_rate, unit, min_quantity, is_active, created_at, updated_at"
    )
    .bind(&request.name)
    .bind(category_id)
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

    // Get the created service with category name
    let service_id: i64 = service_result.get("id");
    let created_service = get_service_by_id(state, service_id).await?;

    Ok(created_service)
}

#[tauri::command]
pub async fn get_service_by_id(
    state: State<'_, crate::AppState>,
    service_id: i64,
) -> ApiResult<Service> {
    let pool = state.db.get_pool_cloned();

    let service = sqlx::query_as::<_, Service>(
        "SELECT
            s.id, s.name, COALESCE(sc.name, 'Uncategorized') as category,
            s.description, s.base_price, s.gst_rate, s.unit, s.min_quantity,
            s.is_active, s.created_at, s.updated_at
         FROM services s
         LEFT JOIN service_categories sc ON s.category_id = sc.id
         WHERE s.id = ?"
    )
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
    let pool = state.db.get_pool_cloned();

    let limit = limit.unwrap_or(50);
    let offset = offset.unwrap_or(0);
    let include_inactive = include_inactive.unwrap_or(false);

    let mut base_query = r#"
        SELECT
            s.id, s.name, COALESCE(sc.name, 'Uncategorized') as category, s.description, s.base_price, s.gst_rate,
            s.unit, s.min_quantity, s.is_active, s.created_at, s.updated_at,
            COALESCE(v.variants_count, 0) as variants_count,
            COALESCE(a.addons_count, 0) as addons_count
        FROM services s
        LEFT JOIN service_categories sc ON s.category_id = sc.id
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

    // Build query based on filters
    let active_filter = if include_inactive { "1=1" } else { "s.is_active = 1" };

    let (query_str, services) = if let Some(search_query) = &query {
        if !search_query.trim().is_empty() {
            if let Some(cat) = &category {
                if !cat.trim().is_empty() {
                    // Both search and category
                    let query_sql = format!("{} WHERE {} AND sc.name = ? AND (s.name LIKE ? OR s.description LIKE ?) ORDER BY s.name ASC LIMIT ? OFFSET ?", base_query, active_filter);
                    let search_pattern = format!("%{}%", search_query.trim());
                    let rows = sqlx::query(&query_sql)
                        .bind(cat)
                        .bind(&search_pattern)
                        .bind(&search_pattern)
                        .bind(limit)
                        .bind(offset)
                        .fetch_all(&pool)
                        .await
                        .map_err(|e| ApiError {
                            message: format!("Failed to search services: {}", e),
                            code: Some("DATABASE_ERROR".to_string()),
                        })?;
                    (query_sql, rows)
                } else {
                    // Search only
                    let query_sql = format!("{} WHERE {} AND (s.name LIKE ? OR s.description LIKE ?) ORDER BY s.name ASC LIMIT ? OFFSET ?", base_query, active_filter);
                    let search_pattern = format!("%{}%", search_query.trim());
                    let rows = sqlx::query(&query_sql)
                        .bind(&search_pattern)
                        .bind(&search_pattern)
                        .bind(limit)
                        .bind(offset)
                        .fetch_all(&pool)
                        .await
                        .map_err(|e| ApiError {
                            message: format!("Failed to search services: {}", e),
                            code: Some("DATABASE_ERROR".to_string()),
                        })?;
                    (query_sql, rows)
                }
            } else {
                // Search only
                let query_sql = format!("{} WHERE {} AND (s.name LIKE ? OR s.description LIKE ?) ORDER BY s.name ASC LIMIT ? OFFSET ?", base_query, active_filter);
                let search_pattern = format!("%{}%", search_query.trim());
                let rows = sqlx::query(&query_sql)
                    .bind(&search_pattern)
                    .bind(&search_pattern)
                    .bind(limit)
                    .bind(offset)
                    .fetch_all(&pool)
                    .await
                    .map_err(|e| ApiError {
                        message: format!("Failed to search services: {}", e),
                        code: Some("DATABASE_ERROR".to_string()),
                    })?;
                (query_sql, rows)
            }
        } else {
            // No search, maybe category
            if let Some(cat) = &category {
                if !cat.trim().is_empty() {
                    let query_sql = format!("{} WHERE {} AND sc.name = ? ORDER BY s.name ASC LIMIT ? OFFSET ?", base_query, active_filter);
                    let rows = sqlx::query(&query_sql)
                        .bind(cat)
                        .bind(limit)
                        .bind(offset)
                        .fetch_all(&pool)
                        .await
                        .map_err(|e| ApiError {
                            message: format!("Failed to search services: {}", e),
                            code: Some("DATABASE_ERROR".to_string()),
                        })?;
                    (query_sql, rows)
                } else {
                    // No filters
                    let query_sql = format!("{} WHERE {} ORDER BY s.name ASC LIMIT ? OFFSET ?", base_query, active_filter);
                    let rows = sqlx::query(&query_sql)
                        .bind(limit)
                        .bind(offset)
                        .fetch_all(&pool)
                        .await
                        .map_err(|e| ApiError {
                            message: format!("Failed to search services: {}", e),
                            code: Some("DATABASE_ERROR".to_string()),
                        })?;
                    (query_sql, rows)
                }
            } else {
                // No filters
                let query_sql = format!("{} WHERE s.is_active = ? ORDER BY s.name ASC LIMIT ? OFFSET ?", base_query);
                let rows = sqlx::query(&query_sql)
                    .bind(1)
                    .bind(limit)
                    .bind(offset)
                    .fetch_all(&pool)
                    .await
                    .map_err(|e| ApiError {
                        message: format!("Failed to search services: {}", e),
                        code: Some("DATABASE_ERROR".to_string()),
                    })?;
                (query_sql, rows)
            }
        }
    } else {
        // No search query
        if let Some(cat) = &category {
            if !cat.trim().is_empty() {
                let query_sql = format!("{} WHERE {} AND s.category = ? ORDER BY s.name ASC LIMIT ? OFFSET ?", base_query, active_filter);
                let rows = sqlx::query(&query_sql)
                    .bind(cat)
                    .bind(limit)
                    .bind(offset)
                    .fetch_all(&pool)
                    .await
                    .map_err(|e| ApiError {
                        message: format!("Failed to search services: {}", e),
                        code: Some("DATABASE_ERROR".to_string()),
                    })?;
                (query_sql, rows)
            } else {
                // No filters
                let query_sql = format!("{} WHERE {} ORDER BY s.name ASC LIMIT ? OFFSET ?", base_query, active_filter);
                let rows = sqlx::query(&query_sql)
                    .bind(limit)
                    .bind(offset)
                    .fetch_all(&pool)
                    .await
                    .map_err(|e| ApiError {
                        message: format!("Failed to search services: {}", e),
                        code: Some("DATABASE_ERROR".to_string()),
                    })?;
                (query_sql, rows)
            }
        } else {
            // No filters
            let query_sql = format!("{} WHERE {} ORDER BY s.name ASC LIMIT ? OFFSET ?", base_query, active_filter);
            let rows = sqlx::query(&query_sql)
                .bind(limit)
                .bind(offset)
                .fetch_all(&pool)
                .await
                .map_err(|e| ApiError {
                    message: format!("Failed to search services: {}", e),
                    code: Some("DATABASE_ERROR".to_string()),
                })?;
            (query_sql, rows)
        }
    };

    let rows = services;

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
    let pool = state.db.get_pool_cloned();

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

    // Find category_id from category name
    let category_id = if let Some(category_name) = &request.category {
        let result = sqlx::query("SELECT id FROM service_categories WHERE name = ?")
            .bind(category_name)
            .fetch_optional(&pool)
            .await
            .map_err(|e| ApiError {
                message: format!("Failed to find category: {}", e),
                code: Some("DATABASE_ERROR".to_string()),
            })?;

        result.map(|row| row.get::<i64, _>("id"))
    } else {
        None
    };

    // Update service
    let service_result = sqlx::query(
        "UPDATE services
         SET name = ?, category_id = ?, description = ?, base_price = ?, gst_rate = ?,
             unit = ?, min_quantity = ?, is_active = ?, updated_at = datetime('now')
         WHERE id = ?
         RETURNING id, name, description, base_price, gst_rate, unit, min_quantity, is_active, created_at, updated_at"
    )
    .bind(&request.name)
    .bind(category_id)
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

    // Get the updated service with category name
    let updated_service = get_service_by_id(state, service_id).await?;

    Ok(updated_service)
}

#[tauri::command]
pub async fn update_service_status(
    state: State<'_, crate::AppState>,
    service_id: i64,
    is_active: bool,
) -> ApiResult<String> {
    let pool = state.db.get_pool_cloned();

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
    let pool = state.db.get_pool_cloned();

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
    let pool = state.db.get_pool_cloned();

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
pub async fn get_services_by_category(
    state: State<'_, crate::AppState>,
    category_id: i64,
) -> ApiResult<Vec<Service>> {
    let pool = state.db.get_pool_cloned();

    let services = sqlx::query_as::<_, Service>(
        "SELECT id, name, category, description, base_price, gst_rate, unit, min_quantity, is_active, created_at, updated_at
         FROM services WHERE category_id = ? AND is_active = 1 ORDER BY name ASC"
    )
    .bind(category_id)
    .fetch_all(&pool)
    .await
    .map_err(|e| ApiError {
        message: format!("Failed to get services by category: {}", e),
        code: Some("DATABASE_ERROR".to_string()),
    })?;

    Ok(services)
}

#[tauri::command]
pub async fn get_addons(
    state: State<'_, crate::AppState>,
) -> ApiResult<Vec<ServiceAddon>> {
    let pool = state.db.get_pool_cloned();

    let addons = sqlx::query_as::<_, ServiceAddon>(
        "SELECT * FROM service_addons WHERE is_active = 1 ORDER BY name ASC"
    )
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
) -> ApiResult<Vec<ServiceCategory>> {
    let pool = state.db.get_pool_cloned();

    let categories = sqlx::query_as::<_, ServiceCategory>(
        "SELECT id, name, parent_id, is_active, created_at FROM service_categories WHERE is_active = 1 ORDER BY name ASC"
    )
    .fetch_all(&pool)
    .await
    .map_err(|e| ApiError {
        message: format!("Failed to get service categories: {}", e),
        code: Some("DATABASE_ERROR".to_string()),
    })?;

    Ok(categories)
}