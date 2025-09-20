use crate::database::DatabaseManager;
use crate::models::{Customer, CreateCustomerRequest, UpdateCustomerRequest, CustomerWithStats, ApiResult, ApiError};
use sqlx::Row;
use tauri::State;

#[tauri::command]
pub async fn create_customer(
    state: State<'_, crate::AppState>,
    request: CreateCustomerRequest,
) -> ApiResult<Customer> {
    let pool = state.db.get_pool_cloned();

    // Validate input
    if request.name.trim().is_empty() {
        return Err(ApiError {
            message: "Customer name is required".to_string(),
            code: Some("VALIDATION_ERROR".to_string()),
        });
    }

    // Check if customer with same phone already exists
    if let Some(phone) = &request.phone {
        if !phone.trim().is_empty() {
            let existing = sqlx::query("SELECT id FROM customers WHERE phone = ?")
                .bind(phone)
                .fetch_optional(&pool)
                .await
                .map_err(|e| ApiError {
                    message: format!("Database error: {}", e),
                    code: Some("DATABASE_ERROR".to_string()),
                })?;

            if existing.is_some() {
                return Err(ApiError {
                    message: "Customer with this phone number already exists".to_string(),
                    code: Some("DUPLICATE_PHONE".to_string()),
                });
            }
        }
    }

    // Insert new customer
    let result = sqlx::query(
        "INSERT INTO customers (name, phone, email, address, notes, is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 1, datetime('now'), datetime('now'))
         RETURNING id, name, phone, email, address, notes, is_active, created_at, updated_at"
    )
    .bind(&request.name)
    .bind(&request.phone)
    .bind(&request.email)
    .bind(&request.address)
    .bind(&request.notes)
    .fetch_one(&pool)
    .await
    .map_err(|e| ApiError {
        message: format!("Failed to create customer: {}", e),
        code: Some("DATABASE_ERROR".to_string()),
    })?;

    Ok(Customer {
        id: result.get("id"),
        name: result.get("name"),
        phone: result.get("phone"),
        email: result.get("email"),
        address: result.get("address"),
        notes: result.get("notes"),
        is_active: result.get("is_active"),
        created_at: result.get("created_at"),
        updated_at: result.get("updated_at"),
    })
}

#[tauri::command]
pub async fn get_customer_by_id(
    state: State<'_, crate::AppState>,
    customer_id: i64,
) -> ApiResult<Customer> {
    let pool = state.db.get_pool_cloned();

    let customer = sqlx::query_as::<_, Customer>("SELECT * FROM customers WHERE id = ?")
        .bind(customer_id)
        .fetch_optional(&pool)
        .await
        .map_err(|e| ApiError {
            message: format!("Database error: {}", e),
            code: Some("DATABASE_ERROR".to_string()),
        })?;

    customer.ok_or_else(|| ApiError {
        message: "Customer not found".to_string(),
        code: Some("NOT_FOUND".to_string()),
    })
}

#[tauri::command]
pub async fn search_customers(
    state: State<'_, crate::AppState>,
    query: Option<String>,
    limit: Option<i64>,
) -> ApiResult<Vec<Customer>> {
    let pool = state.db.get_pool_cloned();

    let limit = limit.unwrap_or(50);

    let customers = if let Some(search_query) = query {
        if search_query.trim().is_empty() {
            // Return recent customers if no search query
            sqlx::query_as::<_, Customer>(
                "SELECT * FROM customers ORDER BY updated_at DESC LIMIT ?"
            )
            .bind(limit)
            .fetch_all(&pool)
            .await
        } else {
            // Search by name or phone
            let search_pattern = format!("%{}%", search_query.trim());
            sqlx::query_as::<_, Customer>(
                "SELECT * FROM customers
                 WHERE name LIKE ? OR phone LIKE ?
                 ORDER BY
                    CASE
                        WHEN name LIKE ? THEN 1
                        WHEN phone LIKE ? THEN 2
                        ELSE 3
                    END,
                    updated_at DESC
                 LIMIT ?"
            )
            .bind(&search_pattern)
            .bind(&search_pattern)
            .bind(format!("{}%", search_query.trim())) // Exact match priority
            .bind(format!("{}%", search_query.trim()))
            .bind(limit)
            .fetch_all(&pool)
            .await
        }
    } else {
        // Return recent customers
        sqlx::query_as::<_, Customer>(
            "SELECT * FROM customers ORDER BY updated_at DESC LIMIT ?"
        )
        .bind(limit)
        .fetch_all(&pool)
        .await
    };

    customers.map_err(|e| ApiError {
        message: format!("Failed to search customers: {}", e),
        code: Some("DATABASE_ERROR".to_string()),
    })
}

#[tauri::command]
pub async fn update_customer(
    state: State<'_, crate::AppState>,
    customer_id: i64,
    request: UpdateCustomerRequest,
) -> ApiResult<Customer> {
    let pool = state.db.get_pool_cloned();

    // Check if customer exists
    let existing = get_customer_by_id(state.clone(), customer_id).await?;

    // Check for phone number conflicts (if phone is being updated)
    if let Some(new_phone) = &request.phone {
        if !new_phone.trim().is_empty() && Some(new_phone) != existing.phone.as_ref() {
            let conflict = sqlx::query("SELECT id FROM customers WHERE phone = ? AND id != ?")
                .bind(new_phone)
                .bind(customer_id)
                .fetch_optional(&pool)
                .await
                .map_err(|e| ApiError {
                    message: format!("Database error: {}", e),
                    code: Some("DATABASE_ERROR".to_string()),
                })?;

            if conflict.is_some() {
                return Err(ApiError {
                    message: "Another customer with this phone number already exists".to_string(),
                    code: Some("DUPLICATE_PHONE".to_string()),
                });
            }
        }
    }

    // Simplified update - just update all fields
    let name = if request.name.trim().is_empty() { &existing.name } else { &request.name };
    let phone = request.phone.as_ref().or(existing.phone.as_ref());
    let email = request.email.as_ref().or(existing.email.as_ref());
    let address = request.address.as_ref().or(existing.address.as_ref());
    let notes = request.notes.as_ref().or(existing.notes.as_ref());

    let result = sqlx::query(
        "UPDATE customers SET name = ?, phone = ?, email = ?, address = ?, notes = ?, updated_at = datetime('now')
         WHERE id = ?
         RETURNING id, name, phone, email, address, notes, is_active, created_at, updated_at"
    )
    .bind(name)
    .bind(phone)
    .bind(email)
    .bind(address)
    .bind(notes)
    .bind(customer_id)
    .fetch_one(&pool)
    .await
    .map_err(|e| ApiError {
        message: format!("Failed to update customer: {}", e),
        code: Some("DATABASE_ERROR".to_string()),
    })?;

    Ok(Customer {
        id: result.get("id"),
        name: result.get("name"),
        phone: result.get("phone"),
        email: result.get("email"),
        address: result.get("address"),
        notes: result.get("notes"),
        is_active: result.get("is_active"),
        created_at: result.get("created_at"),
        updated_at: result.get("updated_at"),
    })
}

#[tauri::command]
pub async fn delete_customer(
    state: State<'_, crate::AppState>,
    customer_id: i64,
) -> ApiResult<String> {
    let pool = state.db.get_pool_cloned();

    // Check if customer exists
    get_customer_by_id(state.clone(), customer_id).await?;

    // Check if customer has any invoices
    let invoice_count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM invoices WHERE customer_id = ?")
        .bind(customer_id)
        .fetch_one(&pool)
        .await
        .map_err(|e| ApiError {
            message: format!("Database error: {}", e),
            code: Some("DATABASE_ERROR".to_string()),
        })?;

    if invoice_count > 0 {
        return Err(ApiError {
            message: "Cannot delete customer with existing invoices".to_string(),
            code: Some("HAS_INVOICES".to_string()),
        });
    }

    // Delete customer
    let rows_affected = sqlx::query("DELETE FROM customers WHERE id = ?")
        .bind(customer_id)
        .execute(&pool)
        .await
        .map_err(|e| ApiError {
            message: format!("Failed to delete customer: {}", e),
            code: Some("DATABASE_ERROR".to_string()),
        })?
        .rows_affected();

    if rows_affected == 0 {
        return Err(ApiError {
            message: "Customer not found".to_string(),
            code: Some("NOT_FOUND".to_string()),
        });
    }

    Ok("Customer deleted successfully".to_string())
}

#[tauri::command]
pub async fn get_customers_with_stats(
    state: State<'_, crate::AppState>,
    query: Option<String>,
    sort_by: Option<String>,
    sort_order: Option<String>,
    limit: Option<i64>,
    offset: Option<i64>,
) -> ApiResult<Vec<CustomerWithStats>> {
    let pool = state.db.get_pool_cloned();

    let limit = limit.unwrap_or(50);
    let offset = offset.unwrap_or(0);

    // Use a more complex query with LEFT JOIN to calculate statistics
    let mut base_query = r#"
        SELECT
            c.id,
            c.name,
            c.phone,
            c.email,
            c.address,
            c.notes,
            c.is_active,
            c.created_at,
            c.updated_at,
            COALESCE(COUNT(i.id), 0) as total_orders,
            COALESCE(SUM(i.total), 0.0) as total_spent,
            MAX(i.order_datetime) as last_order_date
        FROM customers c
        LEFT JOIN invoices i ON c.id = i.customer_id
    "#.to_string();

    // Add search filter if provided
    if let Some(ref search_query) = query {
        if !search_query.trim().is_empty() {
            base_query.push_str(" WHERE (c.name LIKE ? OR c.phone LIKE ? OR c.email LIKE ?)");
        }
    }

    base_query.push_str(" GROUP BY c.id, c.name, c.phone, c.email, c.address, c.notes, c.is_active, c.created_at, c.updated_at");

    // Add sorting
    let sort_field = sort_by.as_deref().unwrap_or("name");
    let sort_direction = sort_order.as_deref().unwrap_or("asc");

    match sort_field {
        "total_spent" => base_query.push_str(&format!(" ORDER BY total_spent {}", sort_direction)),
        "last_order_date" => base_query.push_str(&format!(" ORDER BY last_order_date {} NULLS LAST", sort_direction)),
        _ => base_query.push_str(&format!(" ORDER BY c.name {}", sort_direction)),
    }

    base_query.push_str(" LIMIT ? OFFSET ?");

    let rows = if let Some(ref search_query) = query {
        if !search_query.trim().is_empty() {
            let search_pattern = format!("%{}%", search_query.trim());
            sqlx::query(&base_query)
                .bind(&search_pattern)
                .bind(&search_pattern)
                .bind(&search_pattern)
                .bind(limit)
                .bind(offset)
                .fetch_all(&pool)
                .await
        } else {
            sqlx::query(&base_query)
                .bind(limit)
                .bind(offset)
                .fetch_all(&pool)
                .await
        }
    } else {
        sqlx::query(&base_query)
            .bind(limit)
            .bind(offset)
            .fetch_all(&pool)
            .await
    }
    .map_err(|e| ApiError {
        message: format!("Failed to fetch customers with stats: {}", e),
        code: Some("DATABASE_ERROR".to_string()),
    })?;

    let customers: Vec<CustomerWithStats> = rows.into_iter().map(|row| {
        CustomerWithStats {
            id: row.get("id"),
            name: row.get("name"),
            phone: row.get("phone"),
            email: row.get("email"),
            address: row.get("address"),
            notes: row.get("notes"),
            is_active: row.get("is_active"),
            total_orders: row.get("total_orders"),
            total_spent: row.get("total_spent"),
            last_order_date: row.get("last_order_date"),
            created_at: row.get("created_at"),
            updated_at: row.get("updated_at"),
        }
    }).collect();

    Ok(customers)
}

#[tauri::command]
pub async fn update_customer_status(
    state: State<'_, crate::AppState>,
    customer_id: i64,
    is_active: bool,
) -> ApiResult<String> {
    let pool = state.db.get_pool_cloned();

    let rows_affected = sqlx::query(
        "UPDATE customers SET is_active = ?, updated_at = datetime('now') WHERE id = ?"
    )
    .bind(if is_active { 1 } else { 0 })
    .bind(customer_id)
    .execute(&pool)
    .await
    .map_err(|e| ApiError {
        message: format!("Failed to update customer status: {}", e),
        code: Some("DATABASE_ERROR".to_string()),
    })?
    .rows_affected();

    if rows_affected == 0 {
        return Err(ApiError {
            message: "Customer not found".to_string(),
            code: Some("NOT_FOUND".to_string()),
        });
    }

    Ok(format!("Customer {} successfully", if is_active { "activated" } else { "deactivated" }))
}