use crate::database::DatabaseManager;
use crate::models::{Store, CreateStoreRequest, UpdateStoreRequest, StoreWithStats, ApiResult, ApiError};
use sqlx::Row;
use tauri::State;

#[tauri::command]
pub async fn create_store(
    state: State<'_, crate::AppState>,
    request: CreateStoreRequest,
) -> ApiResult<Store> {
    let pool = {
        let db = state.db.lock().unwrap();
        db.get_pool_cloned()
    };

    // Validate input
    if request.name.trim().is_empty() {
        return Err(ApiError {
            message: "Store name is required".to_string(),
            code: Some("VALIDATION_ERROR".to_string()),
        });
    }

    if request.address.trim().is_empty() {
        return Err(ApiError {
            message: "Store address is required".to_string(),
            code: Some("VALIDATION_ERROR".to_string()),
        });
    }

    // Check for duplicate GSTIN if provided
    if let Some(gstin) = &request.gstin {
        if !gstin.trim().is_empty() {
            let existing = sqlx::query("SELECT id FROM stores WHERE gstin = ?")
                .bind(gstin)
                .fetch_optional(&pool)
                .await
                .map_err(|e| ApiError {
                    message: format!("Database error: {}", e),
                    code: Some("DATABASE_ERROR".to_string()),
                })?;

            if existing.is_some() {
                return Err(ApiError {
                    message: "Store with this GSTIN already exists".to_string(),
                    code: Some("DUPLICATE_GSTIN".to_string()),
                });
            }
        }
    }

    // Insert new store
    let result = sqlx::query(
        "INSERT INTO stores (name, address, city, state, pincode, phone, email, gstin, pan_number, owner_name, is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
         RETURNING id, name, address, city, state, pincode, phone, email, gstin, pan_number, owner_name, is_active, created_at, updated_at"
    )
    .bind(&request.name)
    .bind(&request.address)
    .bind(&request.city)
    .bind(&request.state)
    .bind(&request.pincode)
    .bind(&request.phone)
    .bind(&request.email)
    .bind(&request.gstin)
    .bind(&request.pan_number)
    .bind(&request.owner_name)
    .bind(if request.is_active.unwrap_or(true) { 1 } else { 0 })
    .fetch_one(pool)
    .await
    .map_err(|e| ApiError {
        message: format!("Failed to create store: {}", e),
        code: Some("DATABASE_ERROR".to_string()),
    })?;

    Ok(Store {
        id: result.get("id"),
        name: result.get("name"),
        address: result.get("address"),
        city: result.get("city"),
        state: result.get("state"),
        pincode: result.get("pincode"),
        phone: result.get("phone"),
        email: result.get("email"),
        gstin: result.get("gstin"),
        pan_number: result.get("pan_number"),
        owner_name: result.get("owner_name"),
        is_active: result.get("is_active"),
        created_at: result.get("created_at"),
        updated_at: result.get("updated_at"),
    })
}

#[tauri::command]
pub async fn get_store_by_id(
    state: State<'_, crate::AppState>,
    store_id: i64,
) -> ApiResult<Store> {
    let pool = {
        let db = state.db.lock().unwrap();
        db.get_pool_cloned()
    };

    let store = sqlx::query_as::<_, Store>("SELECT * FROM stores WHERE id = ?")
        .bind(store_id)
        .fetch_optional(&pool)
        .await
        .map_err(|e| ApiError {
            message: format!("Database error: {}", e),
            code: Some("DATABASE_ERROR".to_string()),
        })?;

    store.ok_or_else(|| ApiError {
        message: "Store not found".to_string(),
        code: Some("NOT_FOUND".to_string()),
    })
}

#[tauri::command]
pub async fn search_stores(
    state: State<'_, crate::AppState>,
    query: Option<String>,
    include_inactive: Option<bool>,
    limit: Option<i64>,
    offset: Option<i64>,
) -> ApiResult<Vec<StoreWithStats>> {
    let pool = {
        let db = state.db.lock().unwrap();
        db.get_pool_cloned()
    };

    let limit = limit.unwrap_or(50);
    let offset = offset.unwrap_or(0);
    let include_inactive = include_inactive.unwrap_or(false);

    let mut base_query = r#"
        SELECT
            s.id, s.name, s.address, s.city, s.state, s.pincode, s.phone, s.email,
            s.gstin, s.pan_number, s.owner_name, s.is_active, s.created_at, s.updated_at,
            COALESCE(stats.total_invoices, 0) as total_invoices,
            COALESCE(stats.monthly_revenue, 0.0) as monthly_revenue
        FROM stores s
        LEFT JOIN (
            SELECT
                store_id,
                COUNT(*) as total_invoices,
                SUM(CASE WHEN created_at >= date('now', 'start of month') THEN total ELSE 0 END) as monthly_revenue
            FROM invoices
            WHERE status != 'cancelled'
            GROUP BY store_id
        ) stats ON s.id = stats.store_id
    "#.to_string();

    let mut conditions = Vec::new();
    let mut params: Vec<Box<dyn sqlx::Encode<sqlx::Sqlite> + Send + Sync>> = Vec::new();

    if !include_inactive {
        conditions.push("s.is_active = 1");
    }

    if let Some(search_query) = query {
        if !search_query.trim().is_empty() {
            conditions.push("(s.name LIKE ? OR s.address LIKE ?)");
            let search_pattern = format!("%{}%", search_query.trim());
            params.push(Box::new(search_pattern.clone()));
            params.push(Box::new(search_pattern));
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
            message: format!("Failed to search stores: {}", e),
            code: Some("DATABASE_ERROR".to_string()),
        })?;

    let stores = rows.into_iter().map(|row| StoreWithStats {
        id: row.get("id"),
        name: row.get("name"),
        address: row.get("address"),
        city: row.get("city"),
        state: row.get("state"),
        pincode: row.get("pincode"),
        phone: row.get("phone"),
        email: row.get("email"),
        gstin: row.get("gstin"),
        pan_number: row.get("pan_number"),
        owner_name: row.get("owner_name"),
        is_active: row.get("is_active"),
        total_invoices: row.get("total_invoices"),
        monthly_revenue: row.get("monthly_revenue"),
        created_at: row.get("created_at"),
        updated_at: row.get("updated_at"),
    }).collect();

    Ok(stores)
}

#[tauri::command]
pub async fn update_store(
    state: State<'_, crate::AppState>,
    store_id: i64,
    request: UpdateStoreRequest,
) -> ApiResult<Store> {
    let pool = {
        let db = state.db.lock().unwrap();
        db.get_pool_cloned()
    };

    // Validate input
    if request.name.trim().is_empty() {
        return Err(ApiError {
            message: "Store name is required".to_string(),
            code: Some("VALIDATION_ERROR".to_string()),
        });
    }

    // Check if store exists
    let _existing = get_store_by_id(state.clone(), store_id).await?;

    // Check for GSTIN conflicts (if GSTIN is being updated)
    if let Some(new_gstin) = &request.gstin {
        if !new_gstin.trim().is_empty() {
            let conflict = sqlx::query("SELECT id FROM stores WHERE gstin = ? AND id != ?")
                .bind(new_gstin)
                .bind(store_id)
                .fetch_optional(&pool)
                .await
                .map_err(|e| ApiError {
                    message: format!("Database error: {}", e),
                    code: Some("DATABASE_ERROR".to_string()),
                })?;

            if conflict.is_some() {
                return Err(ApiError {
                    message: "Another store with this GSTIN already exists".to_string(),
                    code: Some("DUPLICATE_GSTIN".to_string()),
                });
            }
        }
    }

    // Update store
    let result = sqlx::query(
        "UPDATE stores
         SET name = ?, address = ?, city = ?, state = ?, pincode = ?, phone = ?, email = ?,
             gstin = ?, pan_number = ?, owner_name = ?, is_active = ?, updated_at = datetime('now')
         WHERE id = ?
         RETURNING id, name, address, city, state, pincode, phone, email, gstin, pan_number, owner_name, is_active, created_at, updated_at"
    )
    .bind(&request.name)
    .bind(&request.address)
    .bind(&request.city)
    .bind(&request.state)
    .bind(&request.pincode)
    .bind(&request.phone)
    .bind(&request.email)
    .bind(&request.gstin)
    .bind(&request.pan_number)
    .bind(&request.owner_name)
    .bind(if request.is_active.unwrap_or(true) { 1 } else { 0 })
    .bind(store_id)
    .fetch_one(pool)
    .await
    .map_err(|e| ApiError {
        message: format!("Failed to update store: {}", e),
        code: Some("DATABASE_ERROR".to_string()),
    })?;

    Ok(Store {
        id: result.get("id"),
        name: result.get("name"),
        address: result.get("address"),
        city: result.get("city"),
        state: result.get("state"),
        pincode: result.get("pincode"),
        phone: result.get("phone"),
        email: result.get("email"),
        gstin: result.get("gstin"),
        pan_number: result.get("pan_number"),
        owner_name: result.get("owner_name"),
        is_active: result.get("is_active"),
        created_at: result.get("created_at"),
        updated_at: result.get("updated_at"),
    })
}

#[tauri::command]
pub async fn update_store_status(
    state: State<'_, crate::AppState>,
    store_id: i64,
    is_active: bool,
) -> ApiResult<String> {
    let pool = {
        let db = state.db.lock().unwrap();
        db.get_pool_cloned()
    };

    let rows_affected = sqlx::query(
        "UPDATE stores SET is_active = ?, updated_at = datetime('now') WHERE id = ?"
    )
    .bind(if is_active { 1 } else { 0 })
    .bind(store_id)
    .execute(&pool)
    .await
    .map_err(|e| ApiError {
        message: format!("Failed to update store status: {}", e),
        code: Some("DATABASE_ERROR".to_string()),
    })?
    .rows_affected();

    if rows_affected == 0 {
        return Err(ApiError {
            message: "Store not found".to_string(),
            code: Some("NOT_FOUND".to_string()),
        });
    }

    Ok(format!("Store {} successfully", if is_active { "activated" } else { "deactivated" }))
}

#[tauri::command]
pub async fn delete_store(
    state: State<'_, crate::AppState>,
    store_id: i64,
) -> ApiResult<String> {
    let pool = {
        let db = state.db.lock().unwrap();
        db.get_pool_cloned()
    };

    // Check if store exists
    get_store_by_id(state.clone(), store_id).await?;

    // Check if store has any invoices
    let invoice_count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM invoices WHERE store_id = ?")
        .bind(store_id)
        .fetch_one(pool)
        .await
        .map_err(|e| ApiError {
            message: format!("Database error: {}", e),
            code: Some("DATABASE_ERROR".to_string()),
        })?;

    if invoice_count > 0 {
        return Err(ApiError {
            message: "Cannot delete store with existing invoices".to_string(),
            code: Some("HAS_INVOICES".to_string()),
        });
    }

    // Delete store
    let rows_affected = sqlx::query("DELETE FROM stores WHERE id = ?")
        .bind(store_id)
        .execute(&pool)
        .await
        .map_err(|e| ApiError {
            message: format!("Failed to delete store: {}", e),
            code: Some("DATABASE_ERROR".to_string()),
        })?
        .rows_affected();

    if rows_affected == 0 {
        return Err(ApiError {
            message: "Store not found".to_string(),
            code: Some("NOT_FOUND".to_string()),
        });
    }

    Ok("Store deleted successfully".to_string())
}

#[tauri::command]
pub async fn get_active_stores(
    state: State<'_, crate::AppState>,
) -> ApiResult<Vec<Store>> {
    let pool = {
        let db = state.db.lock().unwrap();
        db.get_pool_cloned()
    };

    let stores = sqlx::query_as::<_, Store>(
        "SELECT * FROM stores WHERE is_active = 1 ORDER BY name ASC"
    )
    .fetch_all(&pool)
    .await
    .map_err(|e| ApiError {
        message: format!("Failed to get active stores: {}", e),
        code: Some("DATABASE_ERROR".to_string()),
    })?;

    Ok(stores)
}