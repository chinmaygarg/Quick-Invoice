use crate::models::{ApiResult, ApiError};
use crate::services::html_generator::InvoiceHtmlData;
use tera::{Tera, Context};
use std::collections::HashMap;
use serde_json::json;

pub struct TemplateEngine {
    tera: Tera,
}

impl TemplateEngine {
    pub fn new() -> ApiResult<Self> {
        // Create Tera instance with embedded template
        let mut tera = Tera::new("").map_err(|e| ApiError {
            message: format!("Failed to create Tera instance: {}", e),
            code: Some("TEMPLATE_INIT_ERROR".to_string()),
        })?;

        // Add embedded template with inline CSS
        let template_content = Self::get_embedded_template();
        tera.add_raw_template("invoice/invoice_template.html", &template_content)
            .map_err(|e| ApiError {
                message: format!("Failed to add template: {}", e),
                code: Some("TEMPLATE_INIT_ERROR".to_string()),
            })?;

        // Add custom filters
        tera.register_filter("round", Self::round_filter);
        tera.register_filter("default", Self::default_filter);

        Ok(Self { tera })
    }

    fn get_embedded_template() -> String {
        r#"<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Invoice No.- {{ invoice.invoice_no }}</title>
    <style>
/* Professional Invoice Styles - A5 Format */
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: 'Arial', sans-serif;
    font-size: 9px;
    line-height: 1.2;
    color: #000;
    background: white;
}

.invoice-container {
    width: 148mm;
    min-height: 210mm;
    margin: 0 auto;
    padding: 6mm;
    background: white;
    position: relative;
    border: 1px solid #ddd;
}

/* Header Section */
.invoice-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 8px;
    border-bottom: 1px solid #333;
    padding-bottom: 6px;
}

.logo-section {
    flex: 1;
}

.logo {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
}

.logo-text {
    display: flex;
    align-items: center;
    margin-bottom: 1px;
}

.u-letter {
    background: #000;
    color: white;
    font-weight: bold;
    font-size: 14px;
    padding: 3px 6px;
    margin-right: 3px;
    border-radius: 2px;
}

.clean-text {
    font-weight: bold;
    font-size: 14px;
    color: #000;
}

.tagline {
    font-size: 7px;
    color: #666;
    font-weight: normal;
    margin-bottom: 1px;
    letter-spacing: 0.3px;
}

.website {
    font-size: 7px;
    color: #666;
}

.invoice-number {
    font-size: 10px;
    font-weight: bold;
    text-align: right;
    color: #000;
}

/* Details Section */
.details-section {
    display: flex;
    justify-content: space-between;
    margin-bottom: 8px;
    gap: 15px;
}

.customer-details,
.store-details {
    flex: 1;
}

.customer-details h3,
.store-details h3 {
    font-size: 10px;
    font-weight: bold;
    margin-bottom: 4px;
    color: #000;
    text-transform: uppercase;
    border-bottom: 1px solid #333;
    padding-bottom: 2px;
}

.detail-item {
    display: flex;
    margin-bottom: 2px;
    align-items: flex-start;
}

.detail-item .label {
    font-weight: bold;
    min-width: 50px;
    font-size: 9px;
    color: #000;
}

.detail-item .value {
    font-size: 9px;
    color: #000;
    flex: 1;
    word-wrap: break-word;
}

/* Order Details Section */
.order-details-section {
    margin-bottom: 8px;
    border-bottom: 1px solid #ccc;
    padding-bottom: 6px;
}

.order-details-section h3 {
    font-size: 10px;
    font-weight: bold;
    margin-bottom: 4px;
    color: #000;
    text-transform: uppercase;
}

.order-info {
    display: flex;
    justify-content: space-between;
    gap: 10px;
    font-size: 8px;
}

.order-info-item {
    flex: 1;
}

.info-label {
    font-size: 8px;
    font-weight: bold;
    color: #000;
    margin-bottom: 1px;
}

.info-value {
    font-size: 8px;
    color: #444;
}

/* Items Table */
.items-section {
    margin-bottom: 8px;
}

.items-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 8px;
    border: 1px solid #333;
}

.items-table th {
    background-color: #f0f0f0;
    font-weight: bold;
    padding: 3px 2px;
    text-align: center;
    border: 1px solid #333;
    font-size: 8px;
    color: #000;
    text-transform: uppercase;
}

.items-table td {
    padding: 3px 2px;
    border: 1px solid #333;
    vertical-align: top;
    font-size: 8px;
}

.items-table tbody tr:nth-child(even) {
    background-color: #f9f9f9;
}

/* Column Widths */
.col-sno { width: 6%; text-align: center; }
.col-service { width: 14%; text-align: left; }
.col-hsn { width: 8%; text-align: center; }
.col-items { width: 28%; text-align: left; }
.col-rate { width: 10%; text-align: right; }
.col-qty { width: 6%; text-align: center; }
.col-weight { width: 8%; text-align: center; }
.col-addons { width: 8%; text-align: center; }
.col-amount { width: 12%; text-align: right; }

.item-list {
    font-size: 7px;
    line-height: 1.3;
}

.item-list ul {
    list-style-type: none;
    padding: 0;
    margin: 0;
}

.item-list li {
    margin-bottom: 1px;
}

.item-list li:before {
    content: "• ";
    font-weight: bold;
}

/* Totals Section */
.totals-section {
    margin-bottom: 15px;
    display: flex;
    justify-content: flex-end;
    border-top: 1px solid #333;
    padding-top: 4px;
}

.totals-table {
    min-width: 200px;
    border: 1px solid #333;
}

.total-row {
    display: flex;
    justify-content: space-between;
    padding: 2px 4px;
    border-bottom: 1px solid #ddd;
}

.total-row.final-total {
    border-bottom: 2px solid #333;
    border-top: 1px solid #333;
    font-weight: bold;
    padding: 4px;
    background-color: #f0f0f0;
}

.total-label {
    font-size: 9px;
    color: #000;
    font-weight: normal;
}

.total-value {
    font-size: 9px;
    color: #000;
    font-weight: normal;
    text-align: right;
}

.final-total .total-label,
.final-total .total-value {
    font-weight: bold;
    font-size: 10px;
}

/* Footer */
.invoice-footer {
    position: absolute;
    bottom: 6mm;
    left: 6mm;
    right: 6mm;
    text-align: center;
    border-top: 1px solid #ccc;
    padding-top: 6px;
}

.footer-line {
    margin-bottom: 2px;
}

.footer-line .website {
    font-size: 8px;
    font-weight: bold;
    color: #000;
}

.footer-line .disclaimer {
    font-size: 7px;
    color: #666;
    font-style: italic;
}

.footer-line .contact {
    font-size: 7px;
    color: #444;
}
    </style>
</head>
<body>
    <div class="invoice-container">
        <!-- Header with Logo and Invoice Number -->
        <header class="invoice-header">
            <div class="logo-section">
                <div class="logo">
                    <div class="logo-text">
                        <span class="u-letter">U</span>
                        <span class="clean-text">CLEAN</span>
                    </div>
                    <div class="tagline">WE ❤ LAUNDRY</div>
                    <div class="website">www.ucleanlaundry.com</div>
                </div>
            </div>
            <div class="invoice-number">
                <strong>Tax Invoice No. - {{ invoice.invoice_no }}</strong>
            </div>
        </header>

        <!-- Customer and Store Details Section -->
        <div class="details-section">
            <div class="customer-details">
                <h3>CUSTOMER DETAILS</h3>
                <div class="detail-item">
                    <span class="label">Name:</span>
                    <span class="value">{{ customer.name }}</span>
                </div>
                <div class="detail-item">
                    <span class="label">Ph No.:</span>
                    <span class="value">{{ customer.phone | default(value="") }}</span>
                </div>
                <div class="detail-item">
                    <span class="label">Address:</span>
                    <span class="value">{{ customer.address | default(value="") }}</span>
                </div>
            </div>

            <div class="store-details">
                <h3>STORE DETAILS</h3>
                <div class="detail-item">
                    <span class="label">Code:</span>
                    <span class="value">{{ store.code | default(value="UC001") }}</span>
                </div>
                <div class="detail-item">
                    <span class="label">Name:</span>
                    <span class="value">{{ store.name }}</span>
                </div>
                <div class="detail-item">
                    <span class="label">GSTIN:</span>
                    <span class="value">{{ store.gstin | default(value="") }}</span>
                </div>
                <div class="detail-item">
                    <span class="label">Ph No.:</span>
                    <span class="value">{{ store.phone | default(value="") }}</span>
                </div>
                <div class="detail-item">
                    <span class="label">Address:</span>
                    <span class="value">{{ store.address | default(value="") }}</span>
                </div>
            </div>
        </div>

        <!-- Order Details Section -->
        <div class="order-details-section">
            <h3>ORDER DETAILS</h3>
            <div class="order-info">
                <div class="order-info-item">
                    <div class="info-label">ORDER NO. - {{ invoice.order_no | default(value=invoice.invoice_no) }} (WALK-IN)</div>
                    <div class="info-value">{{ invoice.order_datetime }}</div>
                </div>
                <div class="order-info-item">
                    <div class="info-label">PICKUP DONE DATE & TIME</div>
                    <div class="info-value">{{ invoice.pickup_datetime | default(value="0000-00-00") }}</div>
                </div>
                <div class="order-info-item">
                    <div class="info-label">DELIVERY DATE & TIME</div>
                    <div class="info-value">{{ invoice.delivery_datetime | default(value="") }}</div>
                </div>
            </div>
        </div>

        <!-- Items Table -->
        <div class="items-section">
            <table class="items-table">
                <thead>
                    <tr>
                        <th class="col-sno">S.NO.</th>
                        <th class="col-service">SERVICE</th>
                        <th class="col-hsn">HSN/SAC</th>
                        <th class="col-items">ITEMS</th>
                        <th class="col-rate">RATE</th>
                        <th class="col-qty">QTY.</th>
                        <th class="col-weight">WT./KG</th>
                        <th class="col-addons">ADDONS</th>
                        <th class="col-amount">AMOUNT</th>
                    </tr>
                </thead>
                <tbody>
                    {% for item in items %}
                    {% if loop.first %}
                    <tr>
                        <td class="col-sno" rowspan="{{ items | length }}">1.</td>
                        <td class="col-service" rowspan="{{ items | length }}">{{ item.service_name }}</td>
                        <td class="col-hsn" rowspan="{{ items | length }}">999712</td>
                        <td class="col-items">
                            <div class="item-list">
                                <ul>
                                    {% for service_item in items %}
                                    <li>{{ service_item.item.description | default(value=service_item.service_name) }}</li>
                                    {% endfor %}
                                </ul>
                            </div>
                        </td>
                        <td class="col-rate">
                            {% for service_item in items %}
                            {{ service_item.item.rate | round(precision=2) }}<br>
                            {% endfor %}
                        </td>
                        <td class="col-qty">
                            {% for service_item in items %}
                            {{ service_item.item.qty }}<br>
                            {% endfor %}
                        </td>
                        <td class="col-weight">
                            {% for service_item in items %}
                            {{ service_item.item.weight_kg | default(value="-") }}<br>
                            {% endfor %}
                        </td>
                        <td class="col-addons">
                            {% for service_item in items %}
                            {{ service_item.item.area_sqft | default(value="0.00") }}<br>
                            {% endfor %}
                        </td>
                        <td class="col-amount" rowspan="{{ items | length }}">{{ totals.subtotal | round(precision=2) }}</td>
                    </tr>
                    {% endif %}
                    {% endfor %}
                </tbody>
            </table>
        </div>

        <!-- Totals Section -->
        <div class="totals-section">
            <div class="totals-table">
                <div class="total-row">
                    <span class="total-label">Amount:</span>
                    <span class="total-value">₹ {{ totals.subtotal | round(precision=2) }}</span>
                </div>
                <div class="total-row">
                    <span class="total-label">Addon:</span>
                    <span class="total-value">₹ {{ totals.addon_amount | default(value="0.00") | round(precision=2) }}</span>
                </div>
                <div class="total-row">
                    <span class="total-label">Express Amount:</span>
                    <span class="total-value">₹ {{ totals.express_charge | round(precision=2) }}</span>
                </div>
                <div class="total-row">
                    <span class="total-label">Discount:</span>
                    <span class="total-value">₹ {{ totals.discount_amount | round(precision=2) }}</span>
                </div>
                <div class="total-row">
                    <span class="total-label">SGST:</span>
                    <span class="total-value">{{ totals.sgst_amount | round(precision=2) }}</span>
                </div>
                <div class="total-row">
                    <span class="total-label">CGST:</span>
                    <span class="total-value">{{ totals.cgst_amount | round(precision=2) }}</span>
                </div>
                <div class="total-row final-total">
                    <span class="total-label">TOTAL</span>
                    <span class="total-value">₹ {{ totals.total_amount | round(precision=2) }}</span>
                </div>
            </div>
        </div>

        <!-- Footer -->
        <footer class="invoice-footer">
            <div class="footer-line">
                <span class="website">www.ucleanlaundry.com</span>
            </div>
            <div class="footer-line">
                <span class="disclaimer">Disclaimer: I hereby acknowledge that I accept the service terms & conditions*</span>
            </div>
            <div class="footer-line">
                <span class="contact">Contact Support: {{ store.support_phone | default(value="9999759911") }} {{ store.support_email | default(value="support@uclean.in") }}</span>
            </div>
        </footer>
    </div>
</body>
</html>"#.to_string()
    }

    pub fn render_invoice(&self, data: &InvoiceHtmlData) -> ApiResult<String> {
        let mut context = Context::new();

        // Add invoice data to context
        context.insert("invoice", &data.invoice);
        context.insert("customer", &data.customer);
        context.insert("store", &data.store);
        context.insert("items", &data.items);
        context.insert("totals", &data.totals);

        // Render the template
        self.tera
            .render("invoice/invoice_template.html", &context)
            .map_err(|e| ApiError {
                message: format!("Failed to render invoice template: {}", e),
                code: Some("TEMPLATE_RENDER_ERROR".to_string()),
            })
    }

    pub fn render_invoice_with_custom_template(
        &self,
        data: &InvoiceHtmlData,
        template_name: &str,
    ) -> ApiResult<String> {
        let mut context = Context::new();

        // Add invoice data to context
        context.insert("invoice", &data.invoice);
        context.insert("customer", &data.customer);
        context.insert("store", &data.store);
        context.insert("items", &data.items);
        context.insert("totals", &data.totals);

        // Render the custom template
        self.tera
            .render(template_name, &context)
            .map_err(|e| ApiError {
                message: format!("Failed to render custom template '{}': {}", template_name, e),
                code: Some("TEMPLATE_RENDER_ERROR".to_string()),
            })
    }

    pub fn get_available_templates(&self) -> Vec<String> {
        self.tera
            .get_template_names()
            .filter(|name| name.starts_with("invoice/"))
            .map(|name| name.to_string())
            .collect()
    }

    // Custom filter for rounding numbers
    fn round_filter(
        value: &tera::Value,
        args: &HashMap<String, tera::Value>,
    ) -> tera::Result<tera::Value> {
        let precision = args
            .get("precision")
            .and_then(|v| v.as_u64())
            .unwrap_or(2) as usize;

        match value {
            tera::Value::Number(n) => {
                if let Some(f) = n.as_f64() {
                    let multiplier = 10_f64.powi(precision as i32);
                    let rounded = (f * multiplier).round() / multiplier;
                    Ok(tera::Value::Number(serde_json::Number::from_f64(rounded).unwrap()))
                } else {
                    Ok(value.clone())
                }
            }
            _ => Ok(value.clone()),
        }
    }

    // Custom filter for default values
    fn default_filter(
        value: &tera::Value,
        args: &HashMap<String, tera::Value>,
    ) -> tera::Result<tera::Value> {
        let default_value = args
            .get("value")
            .cloned()
            .unwrap_or_else(|| tera::Value::String("".to_string()));

        match value {
            tera::Value::Null => Ok(default_value),
            tera::Value::String(s) if s.is_empty() => Ok(default_value),
            _ => Ok(value.clone()),
        }
    }
}

// Configuration structure for customizable templates
#[derive(serde::Serialize, serde::Deserialize, Debug, Clone)]
pub struct TemplateConfig {
    pub name: String,
    pub display_name: String,
    pub template_file: String,
    pub css_file: String,
    pub paper_size: PaperSize,
    pub settings: TemplateSettings,
}

#[derive(serde::Serialize, serde::Deserialize, Debug, Clone)]
pub enum PaperSize {
    A4,
    A5,
    Thermal,
    Custom { width_mm: f32, height_mm: f32 },
}

#[derive(serde::Serialize, serde::Deserialize, Debug, Clone)]
pub struct TemplateSettings {
    pub show_logo: bool,
    pub show_terms: bool,
    pub show_addons: bool,
    pub show_weight: bool,
    pub currency_symbol: String,
    pub date_format: String,
    pub font_family: String,
    pub font_size: u8,
    pub margins: Margins,
}

#[derive(serde::Serialize, serde::Deserialize, Debug, Clone)]
pub struct Margins {
    pub top: f32,
    pub right: f32,
    pub bottom: f32,
    pub left: f32,
}

impl Default for TemplateConfig {
    fn default() -> Self {
        Self {
            name: "default".to_string(),
            display_name: "Default UCLEAN Template".to_string(),
            template_file: "invoice/invoice_template.html".to_string(),
            css_file: "assets/invoice_styles.css".to_string(),
            paper_size: PaperSize::A5,
            settings: TemplateSettings::default(),
        }
    }
}

impl Default for TemplateSettings {
    fn default() -> Self {
        Self {
            show_logo: true,
            show_terms: true,
            show_addons: true,
            show_weight: true,
            currency_symbol: "₹".to_string(),
            date_format: "%Y-%m-%d %H:%M:%S".to_string(),
            font_family: "Arial".to_string(),
            font_size: 11,
            margins: Margins::default(),
        }
    }
}

impl Default for Margins {
    fn default() -> Self {
        Self {
            top: 8.0,
            right: 8.0,
            bottom: 8.0,
            left: 8.0,
        }
    }
}

pub struct TemplateManager {
    pub configs: Vec<TemplateConfig>,
    pub engine: TemplateEngine,
}

impl TemplateManager {
    pub fn new() -> ApiResult<Self> {
        let engine = TemplateEngine::new()?;
        let configs = Self::load_template_configs()?;

        Ok(Self { configs, engine })
    }

    pub fn get_template_config(&self, name: &str) -> Option<&TemplateConfig> {
        self.configs.iter().find(|config| config.name == name)
    }

    pub fn render_with_config(
        &self,
        data: &InvoiceHtmlData,
        config_name: &str,
    ) -> ApiResult<String> {
        let config = self
            .get_template_config(config_name)
            .ok_or_else(|| ApiError {
                message: format!("Template config '{}' not found", config_name),
                code: Some("TEMPLATE_CONFIG_NOT_FOUND".to_string()),
            })?;

        self.engine
            .render_invoice_with_custom_template(data, &config.template_file)
    }

    fn load_template_configs() -> ApiResult<Vec<TemplateConfig>> {
        // For now, return default configuration
        // In the future, this could load from a JSON file or database
        Ok(vec![
            TemplateConfig::default(),
            TemplateConfig {
                name: "a4".to_string(),
                display_name: "A4 UCLEAN Template".to_string(),
                template_file: "invoice/invoice_template.html".to_string(),
                css_file: "assets/invoice_styles.css".to_string(),
                paper_size: PaperSize::A4,
                settings: TemplateSettings {
                    font_size: 12,
                    margins: Margins {
                        top: 15.0,
                        right: 15.0,
                        bottom: 15.0,
                        left: 15.0,
                    },
                    ..Default::default()
                },
            },
            TemplateConfig {
                name: "thermal".to_string(),
                display_name: "Thermal Receipt Template".to_string(),
                template_file: "invoice/invoice_template.html".to_string(),
                css_file: "assets/invoice_styles.css".to_string(),
                paper_size: PaperSize::Thermal,
                settings: TemplateSettings {
                    font_size: 9,
                    show_weight: false,
                    margins: Margins {
                        top: 3.0,
                        right: 3.0,
                        bottom: 3.0,
                        left: 3.0,
                    },
                    ..Default::default()
                },
            },
        ])
    }

    pub fn save_template_config(&mut self, config: TemplateConfig) -> ApiResult<()> {
        // Remove existing config with same name
        self.configs.retain(|c| c.name != config.name);

        // Add new config
        self.configs.push(config);

        // In the future, this would save to a file or database
        Ok(())
    }

    pub fn list_templates(&self) -> &[TemplateConfig] {
        &self.configs
    }
}