use crate::models::{ClothingTag, CreateClothingTagRequest, TagData, InvoiceWithDetails, TagSettings};
use crate::database::DatabaseManager;
use anyhow::{Result, Context};
use sqlx::{Row, Arguments, Sqlite};
use chrono::Timelike;

pub struct TagGeneratorService;

impl TagGeneratorService {
    pub async fn generate_tags_for_invoice(
        db: &DatabaseManager,
        invoice_id: i64,
    ) -> Result<Vec<ClothingTag>> {
        // First check if tags already exist for this invoice
        let existing_tags = Self::get_tags_by_invoice_id(db, invoice_id).await?;
        if !existing_tags.is_empty() {
            return Ok(existing_tags);
        }

        // Get invoice with details
        let invoice_details = Self::get_invoice_with_details(db, invoice_id).await?;

        let mut tags = Vec::new();
        let mut overall_piece_number = 1i64;

        for item in &invoice_details.items {
            let total_quantity = item.item.piece_count as i64;

            for tag_number in 1..=total_quantity {
                let tag_code = Self::format_tag_code(
                    &invoice_details.invoice.invoice_no,
                    item.item.id,
                    tag_number,
                )?;

                let tag_request = CreateClothingTagRequest {
                    invoice_id,
                    invoice_item_id: item.item.id,
                    tag_number,
                    total_quantity,
                    overall_piece_number,
                    total_invoice_pieces: invoice_details.invoice.total_pieces as i64,
                    tag_code: tag_code.clone(),
                };

                let tag = Self::create_clothing_tag(db, &tag_request).await?;
                tags.push(tag);

                overall_piece_number += 1;
            }
        }

        Ok(tags)
    }

    pub async fn create_clothing_tag(
        db: &DatabaseManager,
        request: &CreateClothingTagRequest,
    ) -> Result<ClothingTag> {
        let query = r#"
            INSERT INTO clothing_tags (
                invoice_id, invoice_item_id, tag_number, total_quantity,
                overall_piece_number, total_invoice_pieces, tag_code
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
            RETURNING id, invoice_id, invoice_item_id, tag_number, total_quantity,
                     overall_piece_number, total_invoice_pieces, tag_code,
                     printed_at, printed_by, reprint_count, created_at
        "#;

        let row = sqlx::query(query)
            .bind(request.invoice_id)
            .bind(request.invoice_item_id)
            .bind(request.tag_number)
            .bind(request.total_quantity)
            .bind(request.overall_piece_number)
            .bind(request.total_invoice_pieces)
            .bind(&request.tag_code)
            .fetch_one(db.get_pool())
            .await
            .context("Failed to create clothing tag")?;

        Ok(ClothingTag {
            id: row.get("id"),
            invoice_id: row.get("invoice_id"),
            invoice_item_id: row.get("invoice_item_id"),
            tag_number: row.get("tag_number"),
            total_quantity: row.get("total_quantity"),
            overall_piece_number: row.get("overall_piece_number"),
            total_invoice_pieces: row.get("total_invoice_pieces"),
            tag_code: row.get("tag_code"),
            printed_at: row.get("printed_at"),
            printed_by: row.get("printed_by"),
            reprint_count: row.get("reprint_count"),
            created_at: row.get("created_at"),
        })
    }

    pub async fn get_tags_by_invoice_id(
        db: &DatabaseManager,
        invoice_id: i64,
    ) -> Result<Vec<ClothingTag>> {
        let query = r#"
            SELECT id, invoice_id, invoice_item_id, tag_number, total_quantity,
                   overall_piece_number, total_invoice_pieces, tag_code,
                   printed_at, printed_by, reprint_count, created_at
            FROM clothing_tags
            WHERE invoice_id = ?
            ORDER BY invoice_item_id, tag_number
        "#;

        let rows = sqlx::query(query)
            .bind(invoice_id)
            .fetch_all(db.get_pool())
            .await
            .map_err(|e| {
                log::error!("Database error in get_tags_by_invoice_id for invoice {}: {}", invoice_id, e);
                anyhow::anyhow!("Failed to fetch clothing tags: {}", e)
            })?;

        let mut tags = Vec::new();
        for row in rows {
            tags.push(ClothingTag {
                id: row.get("id"),
                invoice_id: row.get("invoice_id"),
                invoice_item_id: row.get("invoice_item_id"),
                tag_number: row.get("tag_number"),
                total_quantity: row.get("total_quantity"),
                overall_piece_number: row.get("overall_piece_number"),
                total_invoice_pieces: row.get("total_invoice_pieces"),
                tag_code: row.get("tag_code"),
                printed_at: row.get("printed_at"),
                printed_by: row.get("printed_by"),
                reprint_count: row.get("reprint_count"),
                created_at: row.get("created_at"),
            });
        }

        Ok(tags)
    }

    pub async fn get_tag_data_for_printing(
        db: &DatabaseManager,
        invoice_id: i64,
        item_ids: Option<Vec<i64>>,
    ) -> Result<Vec<TagData>> {
        let mut tag_data = Vec::new();

        // Get invoice with details
        let invoice_details = Self::get_invoice_with_details(db, invoice_id).await?;

        // Get tag settings for formatting
        let settings = Self::get_tag_settings(db, Some(invoice_details.invoice.store_id)).await?;

        // Get tags for this invoice
        let tags = Self::get_tags_by_invoice_id(db, invoice_id).await?;

        for tag in tags {
            // If item_ids specified, filter by those items
            if let Some(ref filter_items) = item_ids {
                if !filter_items.contains(&tag.invoice_item_id) {
                    continue;
                }
            }

            // Find the corresponding invoice item details
            if let Some(item_details) = invoice_details.items.iter()
                .find(|item| item.item.id == tag.invoice_item_id) {

                let (service_name, addons) = {
                    let base_name = if let Some(variant) = &item_details.variant {
                        format!("{} - {}", item_details.service.name, variant.name)
                    } else {
                        item_details.service.name.clone()
                    };

                    let addon_text = if !item_details.addons.is_empty() {
                        let addon_names: Vec<String> = item_details.addons.iter()
                            .map(|addon| addon.addon.name.clone())
                            .collect();
                        Some(addon_names.join(", "))
                    } else {
                        None
                    };

                    (base_name, addon_text)
                };

                let formatted_delivery_date = invoice_details.invoice.delivery_datetime
                    .as_ref()
                    .map(|dt| Self::format_delivery_date(dt));

                tag_data.push(TagData {
                    invoice_no: invoice_details.invoice.invoice_no.clone(),
                    customer_name: invoice_details.customer.name.clone(),
                    service_name,
                    addons,
                    tag_number: tag.tag_number,
                    total_quantity: tag.total_quantity,
                    overall_piece_number: tag.overall_piece_number,
                    total_invoice_pieces: tag.total_invoice_pieces,
                    delivery_date: formatted_delivery_date,
                    tag_code: tag.tag_code.clone(),
                    include_barcode: settings.include_barcode == 1,
                });
            }
        }

        Ok(tag_data)
    }

    pub async fn mark_tags_as_printed(
        db: &DatabaseManager,
        invoice_id: i64,
        item_ids: Option<Vec<i64>>,
        printed_by: Option<String>,
    ) -> Result<i64> {
        let now = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();

        let result = if let Some(items) = item_ids {
            let placeholders = items.iter().map(|_| "?").collect::<Vec<_>>().join(",");
            let query = format!(
                "UPDATE clothing_tags SET printed_at = ?, printed_by = ?, reprint_count = reprint_count + 1
                 WHERE invoice_id = ? AND invoice_item_id IN ({})",
                placeholders
            );

            let mut query_builder = sqlx::query(&query)
                .bind(&now)
                .bind(&printed_by)
                .bind(invoice_id);

            for item_id in items {
                query_builder = query_builder.bind(item_id);
            }

            query_builder.execute(db.get_pool()).await
        } else {
            sqlx::query("UPDATE clothing_tags SET printed_at = ?, printed_by = ?, reprint_count = reprint_count + 1 WHERE invoice_id = ?")
                .bind(&now)
                .bind(&printed_by)
                .bind(invoice_id)
                .execute(db.get_pool())
                .await
        };

        let result = result.context("Failed to mark tags as printed")?;

        Ok(result.rows_affected() as i64)
    }

    fn format_tag_code(invoice_no: &str, item_id: i64, tag_number: i64) -> Result<String> {
        Ok(format!("{}-{}-{}", invoice_no, item_id, tag_number))
    }

    fn format_delivery_date(datetime_str: &str) -> String {
        // Parse and format delivery date for tag display
        // Expected formats: 2025-09-24T19:30:00 or 2025-09-24 19:30:00 -> 24/09/2025 07:30 PM

        // Try ISO format with T separator first
        let datetime = if let Ok(dt) = chrono::NaiveDateTime::parse_from_str(datetime_str, "%Y-%m-%dT%H:%M:%S") {
            dt
        } else if let Ok(dt) = chrono::NaiveDateTime::parse_from_str(datetime_str, "%Y-%m-%d %H:%M:%S") {
            dt
        } else {
            // Fallback to original string if neither format works
            return datetime_str.to_string();
        };

        let date_part = datetime.format("%d/%m/%Y").to_string();
        let hour = datetime.hour();
        let minute = datetime.minute();

        let (hour_12, period) = if hour == 0 {
            (12, "AM")
        } else if hour < 12 {
            (hour, "AM")
        } else if hour == 12 {
            (12, "PM")
        } else {
            (hour - 12, "PM")
        };

        format!("{} {:02}:{:02} {}", date_part, hour_12, minute, period)
    }

    async fn get_invoice_with_details(
        db: &DatabaseManager,
        invoice_id: i64,
    ) -> Result<InvoiceWithDetails> {
        // This should call the existing invoice handler method
        // For now, we'll implement a basic version
        let query = r#"
            SELECT i.*, c.name as customer_name, s.name as store_name
            FROM invoices i
            JOIN customers c ON i.customer_id = c.id
            JOIN stores s ON i.store_id = s.id
            WHERE i.id = ?
        "#;

        let row = sqlx::query(query)
            .bind(invoice_id)
            .fetch_one(db.get_pool())
            .await
            .context("Failed to fetch invoice details")?;

        // Get invoice items with service details
        let items_query = r#"
            SELECT ii.*, s.name as service_name, sv.name as variant_name
            FROM invoice_items ii
            JOIN services s ON ii.service_id = s.id
            LEFT JOIN service_variants sv ON ii.variant_id = sv.id
            WHERE ii.invoice_id = ?
            ORDER BY ii.id
        "#;

        let item_rows = sqlx::query(items_query)
            .bind(invoice_id)
            .fetch_all(db.get_pool())
            .await
            .context("Failed to fetch invoice items")?;

        // Convert to proper structs (simplified for now)
        // In a real implementation, this would use the existing invoice handler logic

        Ok(InvoiceWithDetails {
            invoice: crate::models::Invoice {
                id: row.get("id"),
                invoice_no: row.get("invoice_no"),
                challan_id: row.get("challan_id"),
                customer_id: row.get("customer_id"),
                store_id: row.get("store_id"),
                order_no: row.get("order_no"),
                order_source: row.get("order_source"),
                order_datetime: row.get("order_datetime"),
                pickup_datetime: row.get("pickup_datetime"),
                delivery_datetime: row.get("delivery_datetime"),
                subtotal: row.get("subtotal"),
                discount: row.get("discount"),
                discount_type: row.get("discount_type"),
                express_charge: row.get("express_charge"),
                sgst_amount: row.get("sgst_amount"),
                cgst_amount: row.get("cgst_amount"),
                igst_amount: row.get("igst_amount"),
                total: row.get("total"),
                gst_inclusive: row.get("gst_inclusive"),
                payment_method: row.get("payment_method"),
                payment_amount: row.get("payment_amount"),
                total_pieces: row.get("total_pieces"),
                status: row.get("status"),
                notes: row.get("notes"),
                created_at: row.get("created_at"),
                updated_at: row.get("updated_at"),
            },
            customer: crate::models::Customer {
                id: row.get("customer_id"),
                name: row.get("customer_name"),
                phone: None,
                email: None,
                address: None,
                notes: None,
                is_active: Some(1),
                created_at: "".to_string(),
                updated_at: "".to_string(),
            },
            store: crate::models::Store {
                id: row.get("store_id"),
                name: row.get("store_name"),
                address: "".to_string(),
                city: None,
                state: None,
                pincode: None,
                phone: None,
                email: None,
                gstin: None,
                pan_number: None,
                owner_name: None,
                is_active: Some(1),
                created_at: "".to_string(),
                updated_at: "".to_string(),
            },
            items: {
                let mut items = Vec::new();
                for item_row in item_rows {
                    let item_id: i64 = item_row.get("id");

                    // Fetch addons for this item
                    let addon_rows = sqlx::query(
                        r#"
                        SELECT
                            iia.*,
                            sa.name as addon_name,
                            sa.id as service_addon_id,
                            sa.service_id as service_addon_service_id,
                            sa.name as service_addon_name,
                            sa.description as service_addon_description,
                            sa.price as service_addon_price,
                            sa.unit as service_addon_unit,
                            sa.is_active as service_addon_is_active,
                            sa.created_at as service_addon_created_at,
                            sa.updated_at as service_addon_updated_at
                        FROM invoice_item_addons iia
                        JOIN service_addons sa ON iia.addon_id = sa.id
                        WHERE iia.invoice_item_id = ?
                        "#
                    )
                    .bind(item_id)
                    .fetch_all(db.get_pool())
                    .await
                    .unwrap_or_else(|e| {
                        log::warn!("Failed to fetch addons for item {}: {}", item_id, e);
                        vec![]
                    });

                    let addons: Vec<crate::models::InvoiceItemAddonWithDetails> = addon_rows
                        .into_iter()
                        .map(|addon_row| crate::models::InvoiceItemAddonWithDetails {
                            addon_item: crate::models::InvoiceItemAddon {
                                id: addon_row.get("id"),
                                invoice_item_id: addon_row.get("invoice_item_id"),
                                addon_id: addon_row.get("addon_id"),
                                qty: addon_row.get("qty"),
                                rate: addon_row.get("rate"),
                                amount: addon_row.get("amount"),
                                created_at: addon_row.get("created_at"),
                            },
                            addon: crate::models::ServiceAddon {
                                id: addon_row.get("service_addon_id"),
                                service_id: addon_row.get("service_addon_service_id"),
                                name: addon_row.get("service_addon_name"),
                                description: addon_row.get("service_addon_description"),
                                price: addon_row.get("service_addon_price"),
                                unit: addon_row.get("service_addon_unit"),
                                is_active: addon_row.get("service_addon_is_active"),
                                created_at: addon_row.get("service_addon_created_at"),
                                updated_at: addon_row.get("service_addon_updated_at"),
                            },
                        })
                        .collect();

                    items.push(crate::models::InvoiceItemWithDetails {
                        item: crate::models::InvoiceItem {
                            id: item_row.get("id"),
                            invoice_id: item_row.get("invoice_id"),
                            service_id: item_row.get("service_id"),
                            variant_id: item_row.get("variant_id"),
                            description: item_row.get("description"),
                            qty: item_row.get("qty"),
                            piece_count: item_row.get("piece_count"),
                            weight_kg: item_row.get("weight_kg"),
                            area_sqft: item_row.get("area_sqft"),
                            rate: item_row.get("rate"),
                            amount: item_row.get("amount"),
                            gst_rate: item_row.get("gst_rate"),
                            sgst: item_row.get("sgst"),
                            cgst: item_row.get("cgst"),
                            created_at: item_row.get("created_at"),
                        },
                        service: crate::models::Service {
                            id: item_row.get("service_id"),
                            name: item_row.get("service_name"),
                            category: None,
                            description: None,
                            base_price: 0.0,
                            gst_rate: 18.0,
                            unit: "piece".to_string(),
                            min_quantity: 1,
                            is_active: Some(1),
                            created_at: "".to_string(),
                            updated_at: "".to_string(),
                        },
                        variant: item_row.get::<Option<String>, _>("variant_name").map(|name| {
                            crate::models::ServiceVariant {
                                id: item_row.get::<Option<i64>, _>("variant_id").unwrap_or(0),
                                service_id: item_row.get("service_id"),
                                name,
                                description: None,
                                price_multiplier: 1.0,
                                is_active: Some(1),
                                created_at: "".to_string(),
                                updated_at: "".to_string(),
                            }
                        }),
                        addons,
                    });
                }
                items
            },
            payments: vec![], // Simplified for now
        })
    }

    async fn get_tag_settings(
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

    pub async fn get_invoice_tag_summary(
        db: &DatabaseManager,
        invoice_id: i64,
    ) -> Result<crate::models::InvoiceTagSummary> {
        let query = r#"
            SELECT
                i.id as invoice_id,
                i.invoice_no,
                COUNT(ct.id) as total_tags,
                COUNT(CASE WHEN ct.printed_at IS NOT NULL THEN 1 END) as printed_tags,
                COUNT(CASE WHEN ct.printed_at IS NULL THEN 1 END) as pending_tags,
                MAX(ct.printed_at) as last_printed_at
            FROM invoices i
            LEFT JOIN clothing_tags ct ON i.id = ct.invoice_id
            WHERE i.id = ?
            GROUP BY i.id, i.invoice_no
        "#;

        let row = sqlx::query(query)
            .bind(invoice_id)
            .fetch_one(db.get_pool())
            .await
            .context("Failed to fetch invoice tag summary")?;

        Ok(crate::models::InvoiceTagSummary {
            invoice_id: row.get("invoice_id"),
            invoice_no: row.get("invoice_no"),
            total_tags: row.get("total_tags"),
            printed_tags: row.get("printed_tags"),
            pending_tags: row.get("pending_tags"),
            last_printed_at: row.get("last_printed_at"),
        })
    }
}