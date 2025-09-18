use serde::{Deserialize, Serialize};
use crate::models::{Service, ServiceVariant, ServiceAddon, ApiResult, ApiError};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PricingRequest {
    pub service_id: i64,
    pub variant_id: Option<i64>,
    pub quantity: f64,
    pub weight_kg: Option<f64>,
    pub area_sqft: Option<f64>,
    pub addons: Vec<AddonPricingRequest>,
    pub discount: Option<f64>,
    pub discount_type: Option<String>, // "flat" or "percent"
    pub express_charge: Option<f64>,
    pub gst_inclusive: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AddonPricingRequest {
    pub addon_id: i64,
    pub quantity: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PricingResult {
    pub service_calculation: ServicePricing,
    pub addon_calculations: Vec<AddonPricing>,
    pub totals: PricingTotals,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServicePricing {
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
    pub taxable_amount: f64,
    pub sgst_amount: f64,
    pub cgst_amount: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AddonPricing {
    pub addon_id: i64,
    pub addon_name: String,
    pub unit_price: f64,
    pub quantity: f64,
    pub unit: String,
    pub amount: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PricingTotals {
    pub subtotal: f64,
    pub discount_amount: f64,
    pub express_charge: f64,
    pub base_amount: f64,
    pub total_gst_amount: f64,
    pub sgst_amount: f64,
    pub cgst_amount: f64,
    pub total_amount: f64,
    pub gst_inclusive: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GstCalculation {
    pub base_amount: f64,
    pub gst_rate: f64,
    pub sgst_rate: f64,
    pub cgst_rate: f64,
    pub sgst_amount: f64,
    pub cgst_amount: f64,
    pub total_gst: f64,
    pub total_with_gst: f64,
    pub is_inclusive: bool,
}

pub struct PricingEngine;

impl PricingEngine {
    /// Calculate pricing for a complete invoice item
    pub fn calculate_item_pricing(
        service: &Service,
        variant: Option<&ServiceVariant>,
        addons: &[ServiceAddon],
        request: &PricingRequest,
    ) -> ApiResult<PricingResult> {
        // Validate quantity
        if request.quantity <= 0.0 {
            return Err(ApiError {
                message: "Quantity must be greater than 0".to_string(),
                code: Some("INVALID_QUANTITY".to_string()),
            });
        }

        // Check minimum quantity
        if request.quantity < service.min_quantity as f64 {
            return Err(ApiError {
                message: format!("Minimum quantity for {} is {}", service.name, service.min_quantity),
                code: Some("BELOW_MIN_QUANTITY".to_string()),
            });
        }

        // Calculate service pricing
        let service_pricing = Self::calculate_service_pricing(service, variant, request)?;

        // Calculate addon pricing
        let addon_calculations = Self::calculate_addon_pricing(addons, request)?;

        // Calculate totals
        let totals = Self::calculate_totals(&service_pricing, &addon_calculations, request)?;

        Ok(PricingResult {
            service_calculation: service_pricing,
            addon_calculations,
            totals,
        })
    }

    /// Calculate pricing for the main service
    fn calculate_service_pricing(
        service: &Service,
        variant: Option<&ServiceVariant>,
        request: &PricingRequest,
    ) -> ApiResult<ServicePricing> {
        let base_price = service.base_price;
        let price_multiplier = variant.map(|v| v.price_multiplier).unwrap_or(1.0);
        let effective_rate = base_price * price_multiplier;

        let amount = effective_rate * request.quantity;

        // Calculate GST
        let gst_calculation = Self::calculate_gst(amount, service.gst_rate, request.gst_inclusive)?;

        Ok(ServicePricing {
            service_id: service.id,
            service_name: service.name.clone(),
            variant_id: variant.map(|v| v.id),
            variant_name: variant.map(|v| v.name.clone()),
            base_price,
            price_multiplier,
            effective_rate,
            quantity: request.quantity,
            unit: service.unit.clone(),
            amount,
            gst_rate: service.gst_rate,
            taxable_amount: gst_calculation.base_amount,
            sgst_amount: gst_calculation.sgst_amount,
            cgst_amount: gst_calculation.cgst_amount,
        })
    }

    /// Calculate pricing for addons
    fn calculate_addon_pricing(
        addons: &[ServiceAddon],
        request: &PricingRequest,
    ) -> ApiResult<Vec<AddonPricing>> {
        let mut addon_calculations = Vec::new();

        for addon_request in &request.addons {
            if let Some(addon) = addons.iter().find(|a| a.id == addon_request.addon_id) {
                if addon_request.quantity <= 0.0 {
                    return Err(ApiError {
                        message: format!("Addon quantity for {} must be greater than 0", addon.name),
                        code: Some("INVALID_ADDON_QUANTITY".to_string()),
                    });
                }

                let amount = addon.price * addon_request.quantity;

                addon_calculations.push(AddonPricing {
                    addon_id: addon.id,
                    addon_name: addon.name.clone(),
                    unit_price: addon.price,
                    quantity: addon_request.quantity,
                    unit: addon.unit.clone(),
                    amount,
                });
            } else {
                return Err(ApiError {
                    message: format!("Addon with ID {} not found", addon_request.addon_id),
                    code: Some("ADDON_NOT_FOUND".to_string()),
                });
            }
        }

        Ok(addon_calculations)
    }

    /// Calculate final totals including discounts and taxes
    fn calculate_totals(
        service_pricing: &ServicePricing,
        addon_calculations: &[AddonPricing],
        request: &PricingRequest,
    ) -> ApiResult<PricingTotals> {
        // Calculate subtotal (service + addons)
        let service_amount = service_pricing.amount;
        let addon_total = addon_calculations.iter().map(|a| a.amount).sum::<f64>();
        let subtotal = service_amount + addon_total;

        // Calculate discount
        let discount_amount = match request.discount_type.as_deref() {
            Some("percent") => {
                let discount_rate = request.discount.unwrap_or(0.0);
                if discount_rate > 100.0 {
                    return Err(ApiError {
                        message: "Discount percentage cannot exceed 100%".to_string(),
                        code: Some("INVALID_DISCOUNT".to_string()),
                    });
                }
                subtotal * (discount_rate / 100.0)
            }
            _ => request.discount.unwrap_or(0.0), // flat discount
        };

        // Apply express charge
        let express_charge = request.express_charge.unwrap_or(0.0);

        // Calculate base amount after discount and express charge
        let base_amount = subtotal - discount_amount + express_charge;

        if base_amount < 0.0 {
            return Err(ApiError {
                message: "Total amount cannot be negative after discount".to_string(),
                code: Some("NEGATIVE_AMOUNT".to_string()),
            });
        }

        // Calculate GST on the base amount
        let gst_calculation = Self::calculate_gst(base_amount, service_pricing.gst_rate, request.gst_inclusive)?;

        Ok(PricingTotals {
            subtotal,
            discount_amount,
            express_charge,
            base_amount: gst_calculation.base_amount,
            total_gst_amount: gst_calculation.total_gst,
            sgst_amount: gst_calculation.sgst_amount,
            cgst_amount: gst_calculation.cgst_amount,
            total_amount: gst_calculation.total_with_gst,
            gst_inclusive: request.gst_inclusive,
        })
    }

    /// Calculate GST amounts based on inclusive/exclusive mode
    pub fn calculate_gst(amount: f64, gst_rate: f64, is_inclusive: bool) -> ApiResult<GstCalculation> {
        if gst_rate < 0.0 || gst_rate > 100.0 {
            return Err(ApiError {
                message: "GST rate must be between 0% and 100%".to_string(),
                code: Some("INVALID_GST_RATE".to_string()),
            });
        }

        let sgst_rate = gst_rate / 2.0;
        let cgst_rate = gst_rate / 2.0;

        let (base_amount, sgst_amount, cgst_amount, total_with_gst) = if is_inclusive {
            // GST is included in the amount
            let base_amount = amount / (1.0 + gst_rate / 100.0);
            let total_gst = amount - base_amount;
            let sgst_amount = total_gst / 2.0;
            let cgst_amount = total_gst / 2.0;
            (base_amount, sgst_amount, cgst_amount, amount)
        } else {
            // GST is exclusive - calculate on top of amount
            let sgst_amount = amount * (sgst_rate / 100.0);
            let cgst_amount = amount * (cgst_rate / 100.0);
            let total_with_gst = amount + sgst_amount + cgst_amount;
            (amount, sgst_amount, cgst_amount, total_with_gst)
        };

        let total_gst = sgst_amount + cgst_amount;

        Ok(GstCalculation {
            base_amount,
            gst_rate,
            sgst_rate,
            cgst_rate,
            sgst_amount,
            cgst_amount,
            total_gst,
            total_with_gst,
            is_inclusive,
        })
    }

    /// Calculate bulk pricing for multiple items (useful for invoice totals)
    pub fn calculate_bulk_pricing(
        item_results: &[PricingResult],
        global_discount: Option<f64>,
        global_discount_type: Option<String>,
        global_express_charge: Option<f64>,
    ) -> ApiResult<PricingTotals> {
        if item_results.is_empty() {
            return Err(ApiError {
                message: "Cannot calculate bulk pricing for empty items".to_string(),
                code: Some("EMPTY_ITEMS".to_string()),
            });
        }

        // Sum up all item totals
        let subtotal = item_results.iter()
            .map(|r| r.totals.subtotal)
            .sum::<f64>();

        // Calculate global discount
        let discount_amount = match global_discount_type.as_deref() {
            Some("percent") => {
                let discount_rate = global_discount.unwrap_or(0.0);
                if discount_rate > 100.0 {
                    return Err(ApiError {
                        message: "Discount percentage cannot exceed 100%".to_string(),
                        code: Some("INVALID_DISCOUNT".to_string()),
                    });
                }
                subtotal * (discount_rate / 100.0)
            }
            _ => global_discount.unwrap_or(0.0), // flat discount
        };

        let express_charge = global_express_charge.unwrap_or(0.0);
        let base_amount = subtotal - discount_amount + express_charge;

        if base_amount < 0.0 {
            return Err(ApiError {
                message: "Total amount cannot be negative after discount".to_string(),
                code: Some("NEGATIVE_AMOUNT".to_string()),
            });
        }

        // For bulk calculations, we assume all items have the same GST treatment
        let gst_inclusive = item_results[0].totals.gst_inclusive;
        let avg_gst_rate = item_results.iter()
            .map(|r| r.service_calculation.gst_rate)
            .sum::<f64>() / item_results.len() as f64;

        let gst_calculation = Self::calculate_gst(base_amount, avg_gst_rate, gst_inclusive)?;

        Ok(PricingTotals {
            subtotal,
            discount_amount,
            express_charge,
            base_amount: gst_calculation.base_amount,
            total_gst_amount: gst_calculation.total_gst,
            sgst_amount: gst_calculation.sgst_amount,
            cgst_amount: gst_calculation.cgst_amount,
            total_amount: gst_calculation.total_with_gst,
            gst_inclusive,
        })
    }

    /// Calculate express delivery surcharge (typically 50% extra)
    pub fn calculate_express_charge(base_amount: f64, express_rate: f64) -> f64 {
        base_amount * (express_rate / 100.0)
    }

    /// Calculate loyalty discount based on customer tier
    pub fn calculate_loyalty_discount(base_amount: f64, customer_tier: &str) -> f64 {
        let discount_rate = match customer_tier {
            "PREMIUM" => 10.0,
            "GOLD" => 7.5,
            "SILVER" => 5.0,
            "BRONZE" => 2.5,
            _ => 0.0,
        };
        base_amount * (discount_rate / 100.0)
    }

    /// Validate pricing request
    pub fn validate_pricing_request(request: &PricingRequest) -> ApiResult<()> {
        if request.quantity <= 0.0 {
            return Err(ApiError {
                message: "Quantity must be greater than 0".to_string(),
                code: Some("INVALID_QUANTITY".to_string()),
            });
        }

        if let Some(discount) = request.discount {
            if discount < 0.0 {
                return Err(ApiError {
                    message: "Discount cannot be negative".to_string(),
                    code: Some("INVALID_DISCOUNT".to_string()),
                });
            }

            if request.discount_type.as_deref() == Some("percent") && discount > 100.0 {
                return Err(ApiError {
                    message: "Percentage discount cannot exceed 100%".to_string(),
                    code: Some("INVALID_DISCOUNT".to_string()),
                });
            }
        }

        if let Some(express) = request.express_charge {
            if express < 0.0 {
                return Err(ApiError {
                    message: "Express charge cannot be negative".to_string(),
                    code: Some("INVALID_EXPRESS_CHARGE".to_string()),
                });
            }
        }

        for addon in &request.addons {
            if addon.quantity <= 0.0 {
                return Err(ApiError {
                    message: "Addon quantity must be greater than 0".to_string(),
                    code: Some("INVALID_ADDON_QUANTITY".to_string()),
                });
            }
        }

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_gst_exclusive_calculation() {
        let result = PricingEngine::calculate_gst(100.0, 18.0, false).unwrap();

        assert_eq!(result.base_amount, 100.0);
        assert_eq!(result.sgst_amount, 9.0);
        assert_eq!(result.cgst_amount, 9.0);
        assert_eq!(result.total_gst, 18.0);
        assert_eq!(result.total_with_gst, 118.0);
    }

    #[test]
    fn test_gst_inclusive_calculation() {
        let result = PricingEngine::calculate_gst(118.0, 18.0, true).unwrap();

        // Base amount should be approximately 100.0
        assert!((result.base_amount - 100.0).abs() < 0.01);
        assert!((result.sgst_amount - 9.0).abs() < 0.01);
        assert!((result.cgst_amount - 9.0).abs() < 0.01);
        assert!((result.total_gst - 18.0).abs() < 0.01);
        assert_eq!(result.total_with_gst, 118.0);
    }

    #[test]
    fn test_express_charge_calculation() {
        let result = PricingEngine::calculate_express_charge(100.0, 50.0);
        assert_eq!(result, 50.0);
    }

    #[test]
    fn test_loyalty_discount_calculation() {
        let result = PricingEngine::calculate_loyalty_discount(100.0, "PREMIUM");
        assert_eq!(result, 10.0);

        let result = PricingEngine::calculate_loyalty_discount(100.0, "UNKNOWN");
        assert_eq!(result, 0.0);
    }
}