use serde::{Deserialize, Serialize};
use crate::models::{Invoice, Customer, Store, InvoiceItem, ApiResult, ApiError};
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InvoiceHtmlData {
    pub invoice: Invoice,
    pub customer: Customer,
    pub store: Store,
    pub items: Vec<InvoiceItemWithDetails>,
    pub totals: HtmlTotals,
    pub settings: HtmlSettings,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InvoiceItemWithDetails {
    pub item: InvoiceItem,
    pub service_name: String,
    pub variant_name: Option<String>,
    pub unit: String,
    pub addons: Vec<InvoiceAddonDetail>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InvoiceAddonDetail {
    pub addon_name: String,
    pub quantity: f64,
    pub rate: f64,
    pub amount: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HtmlTotals {
    pub subtotal: f64,
    pub discount_amount: f64,
    pub express_charge: f64,
    pub base_amount: f64,
    pub sgst_amount: f64,
    pub cgst_amount: f64,
    pub total_gst: f64,
    pub total_amount: f64,
    pub amount_in_words: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HtmlSettings {
    pub paper_size: PaperSize,
    pub layout: LayoutSettings,
    pub branding: BrandingSettings,
    pub footer: FooterSettings,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum PaperSize {
    A4,
    A5,
    Thermal80mm,
    Custom { width_mm: f64, height_mm: f64 },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LayoutSettings {
    pub margin_top: f64,
    pub margin_bottom: f64,
    pub margin_left: f64,
    pub margin_right: f64,
    pub font_size_normal: f64,
    pub font_size_small: f64,
    pub font_size_large: f64,
    pub line_height: f64,
    pub section_spacing: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BrandingSettings {
    pub logo_path: Option<String>,
    pub business_name: String,
    pub business_tagline: Option<String>,
    pub primary_color: String,
    pub secondary_color: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FooterSettings {
    pub terms_conditions: Vec<String>,
    pub thank_you_message: Option<String>,
    pub contact_info: Vec<String>,
}

pub struct HtmlGenerator;

impl HtmlGenerator {
    /// Generate A5-optimized invoice HTML
    pub fn generate_a5_invoice(data: &InvoiceHtmlData) -> ApiResult<String> {
        let settings = Self::get_a5_settings(&data.store);
        Self::generate_invoice_html(data, &settings)
    }

    /// Generate A4-optimized invoice HTML
    pub fn generate_a4_invoice(data: &InvoiceHtmlData) -> ApiResult<String> {
        let settings = Self::get_a4_settings(&data.store);
        Self::generate_invoice_html(data, &settings)
    }

    /// Generate thermal-optimized invoice HTML
    pub fn generate_thermal_invoice(data: &InvoiceHtmlData) -> ApiResult<String> {
        let settings = Self::get_thermal_settings(&data.store);
        Self::generate_invoice_html(data, &settings)
    }

    /// Save HTML to file and return file path
    pub fn save_invoice_html(
        data: &InvoiceHtmlData,
        settings: &HtmlSettings,
        output_dir: &PathBuf,
        format: &str,
    ) -> ApiResult<String> {
        // Generate HTML content
        let html = Self::generate_invoice_html(data, settings)?;

        // Create filename
        let filename = format!("invoice_{}_{}.html", data.invoice.invoice_no, format);
        let file_path = output_dir.join(&filename);

        // Ensure directory exists
        if let Some(parent) = file_path.parent() {
            std::fs::create_dir_all(parent).map_err(|e| ApiError {
                message: format!("Failed to create output directory: {}", e),
                code: Some("DIRECTORY_CREATE_ERROR".to_string()),
            })?;
        }

        // Write HTML file
        std::fs::write(&file_path, &html).map_err(|e| ApiError {
            message: format!("Failed to save HTML file: {}", e),
            code: Some("HTML_SAVE_ERROR".to_string()),
        })?;

        log::info!("HTML file saved at: {}", file_path.display());

        Ok(file_path.to_string_lossy().to_string())
    }

    /// Get A5 settings
    pub fn get_a5_settings(store: &Store) -> HtmlSettings {
        HtmlSettings {
            paper_size: PaperSize::A5,
            layout: LayoutSettings {
                margin_top: 5.0,
                margin_bottom: 5.0,
                margin_left: 5.0,
                margin_right: 5.0,
                font_size_normal: 9.0,
                font_size_small: 7.0,
                font_size_large: 12.0,
                line_height: 1.2,
                section_spacing: 3.0,
            },
            branding: BrandingSettings {
                logo_path: None,
                business_name: store.name.clone(),
                business_tagline: Some("Professional Laundry & Dry Cleaning Services".to_string()),
                primary_color: "#2563eb".to_string(),
                secondary_color: "#64748b".to_string(),
            },
            footer: FooterSettings {
                terms_conditions: vec![
                    "Items will be ready within the specified time frame".to_string(),
                    "Claims for damages or loss must be made within 7 days".to_string(),
                    "We are not responsible for color bleeding or shrinkage".to_string(),
                    "Payment due on delivery unless otherwise arranged".to_string(),
                ],
                thank_you_message: Some("Thank you for choosing our services!".to_string()),
                contact_info: vec![
                    "For any queries, please call us or visit our store".to_string(),
                    "Follow us on social media for updates and offers".to_string(),
                ],
            },
        }
    }

    /// Get A4 settings
    pub fn get_a4_settings(store: &Store) -> HtmlSettings {
        let mut settings = Self::get_a5_settings(store);
        settings.paper_size = PaperSize::A4;
        settings.layout.margin_top = 8.0;
        settings.layout.margin_bottom = 8.0;
        settings.layout.margin_left = 8.0;
        settings.layout.margin_right = 8.0;
        settings.layout.font_size_normal = 10.0;
        settings.layout.font_size_small = 8.0;
        settings.layout.font_size_large = 14.0;
        settings
    }

    /// Get thermal settings
    pub fn get_thermal_settings(store: &Store) -> HtmlSettings {
        let mut settings = Self::get_a5_settings(store);
        settings.paper_size = PaperSize::Thermal80mm;
        settings.layout.margin_top = 2.0;
        settings.layout.margin_bottom = 2.0;
        settings.layout.margin_left = 2.0;
        settings.layout.margin_right = 2.0;
        settings.layout.font_size_normal = 8.0;
        settings.layout.font_size_small = 6.0;
        settings.layout.font_size_large = 10.0;
        settings
    }

    /// Core HTML generation function
    fn generate_invoice_html(data: &InvoiceHtmlData, settings: &HtmlSettings) -> ApiResult<String> {
        let css = Self::generate_css_styles(settings)?;
        let header = Self::generate_header_section(data, settings)?;
        let customer_info = Self::generate_customer_section(data)?;
        let items_table = Self::generate_items_table(data)?;
        let totals_section = Self::generate_totals_section(data)?;
        let footer = Self::generate_footer_section(data, settings)?;

        let auto_print_script = if matches!(settings.paper_size, PaperSize::A4 | PaperSize::A5 | PaperSize::Thermal80mm) {
            r#"
<script>
// Auto-open print dialog when opened in browser
window.addEventListener('load', () => {
    // Small delay to ensure content is fully rendered
    setTimeout(() => {
        window.print();
    }, 500);
});
</script>"#
        } else {
            ""
        };

        let html = format!(r#"<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Invoice {}</title>
    {}
</head>
<body>
    <div class="invoice-container">
        {}
        {}
        {}
        {}
        {}
    </div>
    {}
</body>
</html>"#,
            data.invoice.invoice_no,
            css,
            header,
            customer_info,
            items_table,
            totals_section,
            footer,
            auto_print_script
        );

        Ok(html)
    }

    /// Generate CSS styles
    fn generate_css_styles(settings: &HtmlSettings) -> ApiResult<String> {
        let layout = &settings.layout;
        let branding = &settings.branding;
        let paper_size = match &settings.paper_size {
            PaperSize::A4 => "A4",
            PaperSize::A5 => "A5",
            PaperSize::Thermal80mm => "80mm 200mm",
            PaperSize::Custom { width_mm, height_mm } => return Ok(format!("<style>@page {{ size: {}mm {}mm; margin: {}mm; }}</style>", width_mm, height_mm, layout.margin_top)),
        };

        Ok(format!(r#"
<style>
    @page {{
        size: {paper_size};
        margin: {margin_top}mm {margin_right}mm {margin_bottom}mm {margin_left}mm;
    }}

    * {{
        margin: 0;
        padding: 0;
        box-sizing: border-box;
    }}

    body {{
        font-family: 'Arial', sans-serif;
        font-size: {font_normal}pt;
        line-height: {line_height};
        color: #333;
        background: white;
    }}

    .invoice-container {{
        width: 100%;
        max-width: 100%;
        margin: 0 auto;
        padding: {section_spacing}mm;
    }}

    .header {{
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: {section_spacing}mm;
        padding-bottom: {section_spacing}mm;
        border-bottom: 2px solid {primary_color};
    }}

    .business-info {{
        flex: 1;
    }}

    .business-name {{
        font-size: {font_large}pt;
        font-weight: bold;
        color: {primary_color};
        margin-bottom: 2mm;
    }}

    .business-tagline {{
        font-size: {font_small}pt;
        color: {secondary_color};
        margin-bottom: 3mm;
    }}

    .invoice-info {{
        text-align: right;
        flex: 1;
    }}

    .invoice-title {{
        font-size: {font_large}pt;
        font-weight: bold;
        color: {primary_color};
        margin-bottom: 2mm;
    }}

    .bill-to {{
        display: flex;
        justify-content: space-between;
        margin-bottom: {section_spacing}mm;
        padding: {section_spacing}mm;
        background-color: #f8f9fa;
        border-radius: 2mm;
    }}

    .customer-info {{
        flex: 1;
    }}

    .delivery-info {{
        flex: 1;
        margin-left: 5mm;
    }}

    .section-title {{
        font-weight: bold;
        color: {primary_color};
        margin-bottom: 2mm;
        font-size: {font_normal}pt;
    }}

    .items-table {{
        width: 100%;
        border-collapse: collapse;
        margin-bottom: {section_spacing}mm;
        font-size: {font_small}pt;
    }}

    .items-table th,
    .items-table td {{
        border: 1px solid #ddd;
        padding: 2mm;
        text-align: left;
    }}

    .items-table th {{
        background-color: {primary_color};
        color: white;
        font-weight: bold;
        text-align: center;
    }}

    .items-table .numeric {{
        text-align: right;
    }}

    .totals-section {{
        display: flex;
        justify-content: flex-end;
        margin-bottom: {section_spacing}mm;
    }}

    .totals-table {{
        width: 50%;
        min-width: 60mm;
    }}

    .totals-table td {{
        padding: 1mm 3mm;
        border: none;
    }}

    .totals-table .total-row {{
        font-weight: bold;
        border-top: 2px solid {primary_color};
        background-color: #f8f9fa;
    }}

    .amount-words {{
        margin-bottom: {section_spacing}mm;
        padding: {section_spacing}mm;
        background-color: #f8f9fa;
        border-radius: 2mm;
        font-weight: bold;
        color: {primary_color};
    }}

    .footer {{
        margin-top: {section_spacing}mm;
        padding-top: {section_spacing}mm;
        border-top: 1px solid #ddd;
    }}

    .terms {{
        margin-bottom: {section_spacing}mm;
    }}

    .terms h4 {{
        color: {primary_color};
        margin-bottom: 2mm;
    }}

    .terms ol {{
        padding-left: 5mm;
    }}

    .thank-you {{
        text-align: center;
        font-weight: bold;
        color: {primary_color};
        margin: 3mm 0;
    }}

    .contact-info {{
        text-align: center;
        color: {secondary_color};
    }}

    /* Print-specific styles */
    @media print {{
        body {{
            -webkit-print-color-adjust: exact;
            color-adjust: exact;
            print-color-adjust: exact;
        }}

        .invoice-container {{
            width: 100%;
            max-width: none;
            margin: 0;
            padding: 0;
        }}

        .items-table {{
            font-size: 7pt;
        }}

        .items-table th,
        .items-table td {{
            padding: 1mm;
        }}
    }}

    /* A5 specific optimizations */
    @media print and (max-width: 148mm) {{
        .invoice-container {{
            width: 148mm;
            max-width: 148mm;
        }}

        .items-table {{
            font-size: 6pt;
        }}
    }}

    /* Thermal printer optimizations */
    .thermal {{
        width: 72mm;
        font-size: 8pt;
    }}

    .thermal .header {{
        flex-direction: column;
        text-align: center;
    }}

    .thermal .bill-to {{
        flex-direction: column;
    }}

    .thermal .items-table {{
        font-size: 6pt;
    }}
</style>
        "#,
        paper_size = paper_size,
        margin_top = layout.margin_top,
        margin_right = layout.margin_right,
        margin_bottom = layout.margin_bottom,
        margin_left = layout.margin_left,
        font_normal = layout.font_size_normal,
        font_small = layout.font_size_small,
        font_large = layout.font_size_large,
        line_height = layout.line_height,
        section_spacing = layout.section_spacing,
        primary_color = branding.primary_color,
        secondary_color = branding.secondary_color,
        ))
    }

    /// Generate header section
    fn generate_header_section(data: &InvoiceHtmlData, settings: &HtmlSettings) -> ApiResult<String> {
        let business_name = &settings.branding.business_name;
        let tagline = settings.branding.business_tagline.as_deref().unwrap_or("");

        Ok(format!(r#"
<div class="header">
    <div class="business-info">
        <div class="business-name">{}</div>
        <div class="business-tagline">{}</div>
        <div style="margin-top: 3mm; font-size: 8pt;">
            {}<br>
            {}<br>
            Phone: {}<br>
            Email: {}<br>
            GSTIN: {}
        </div>
    </div>
    <div class="invoice-info">
        <div class="invoice-title">INVOICE</div>
        <div><strong>Invoice No:</strong> {}</div>
        <div><strong>Date:</strong> {}</div>
        <div><strong>Order Source:</strong> {}</div>
        {}
    </div>
</div>
        "#,
            business_name,
            tagline,
            data.store.address.as_str(),
            data.store.city.as_deref().unwrap_or(""),
            data.store.phone.as_deref().unwrap_or(""),
            data.store.email.as_deref().unwrap_or(""),
            data.store.gstin.as_deref().unwrap_or(""),
            data.invoice.invoice_no,
            data.invoice.order_datetime,
            data.invoice.order_source.as_str(),
            "" // Due date not available in current Invoice model
        ))
    }

    /// Generate customer section
    fn generate_customer_section(data: &InvoiceHtmlData) -> ApiResult<String> {
        Ok(format!(r#"
<div class="bill-to">
    <div class="customer-info">
        <div class="section-title">Bill To:</div>
        <div><strong>{}</strong></div>
        <div>{}</div>
        <div>Phone: {}</div>
        <div>Email: {}</div>
    </div>
    <div class="delivery-info">
        <div class="section-title">Delivery Info:</div>
        <div><strong>Pickup Date:</strong> {}</div>
        <div><strong>Delivery Date:</strong> {}</div>
        <div><strong>Status:</strong> {}</div>
        {}
    </div>
</div>
        "#,
            data.customer.name,
            data.customer.address.as_deref().unwrap_or(""),
            data.customer.phone.as_deref().unwrap_or(""),
            data.customer.email.as_deref().unwrap_or(""),
            data.invoice.pickup_datetime.as_ref().unwrap_or(&"N/A".to_string()),
            data.invoice.delivery_datetime.as_ref().unwrap_or(&"N/A".to_string()),
            data.invoice.status,
            "" // Special instructions not available in current Invoice model
        ))
    }

    /// Generate items table
    fn generate_items_table(data: &InvoiceHtmlData) -> ApiResult<String> {
        let mut rows = String::new();

        for item_detail in &data.items {
            let variant_name = item_detail.variant_name.as_deref().unwrap_or("");
            let variant_display = if variant_name.is_empty() {
                String::new()
            } else {
                format!(" ({})", variant_name)
            };

            rows.push_str(&format!(r#"
        <tr>
            <td>{}{}</td>
            <td class="numeric">{:.2}</td>
            <td>{}</td>
            <td class="numeric">₹{:.2}</td>
            <td class="numeric">₹{:.2}</td>
        </tr>"#,
                item_detail.service_name,
                variant_display,
                item_detail.item.qty,
                item_detail.unit,
                item_detail.item.rate,
                item_detail.item.amount
            ));

            // Add addons if any
            for addon in &item_detail.addons {
                rows.push_str(&format!(r#"
        <tr style="background-color: #f8f9fa;">
            <td style="padding-left: 5mm;">+ {}</td>
            <td class="numeric">{:.2}</td>
            <td>addon</td>
            <td class="numeric">₹{:.2}</td>
            <td class="numeric">₹{:.2}</td>
        </tr>"#,
                    addon.addon_name,
                    addon.quantity,
                    addon.rate,
                    addon.amount
                ));
            }
        }

        Ok(format!(r#"
<table class="items-table">
    <thead>
        <tr>
            <th>Service</th>
            <th>Qty</th>
            <th>Unit</th>
            <th>Rate</th>
            <th>Amount</th>
        </tr>
    </thead>
    <tbody>
        {}
    </tbody>
</table>
        "#, rows))
    }

    /// Generate totals section
    fn generate_totals_section(data: &InvoiceHtmlData) -> ApiResult<String> {
        let totals = &data.totals;

        Ok(format!(r#"
<div class="totals-section">
    <table class="totals-table">
        <tr>
            <td>Subtotal:</td>
            <td class="numeric">₹{:.2}</td>
        </tr>
        {}
        {}
        <tr>
            <td>Base Amount:</td>
            <td class="numeric">₹{:.2}</td>
        </tr>
        <tr>
            <td>SGST ({:.1}%):</td>
            <td class="numeric">₹{:.2}</td>
        </tr>
        <tr>
            <td>CGST ({:.1}%):</td>
            <td class="numeric">₹{:.2}</td>
        </tr>
        <tr class="total-row">
            <td><strong>Total Amount:</strong></td>
            <td class="numeric"><strong>₹{:.2}</strong></td>
        </tr>
    </table>
</div>

<div class="amount-words">
    <strong>Amount in Words:</strong> {}
</div>
        "#,
            totals.subtotal,
            if totals.discount_amount > 0.0 {
                format!("<tr><td>Discount:</td><td class=\"numeric\">-₹{:.2}</td></tr>", totals.discount_amount)
            } else {
                String::new()
            },
            if totals.express_charge > 0.0 {
                format!("<tr><td>Express Charge:</td><td class=\"numeric\">₹{:.2}</td></tr>", totals.express_charge)
            } else {
                String::new()
            },
            totals.base_amount,
            9.0, // SGST rate
            totals.sgst_amount,
            9.0, // CGST rate
            totals.cgst_amount,
            totals.total_amount,
            totals.amount_in_words
        ))
    }

    /// Generate footer section
    fn generate_footer_section(_data: &InvoiceHtmlData, settings: &HtmlSettings) -> ApiResult<String> {
        let footer = &settings.footer;

        let terms_list = footer.terms_conditions.iter()
            .enumerate()
            .map(|(i, term)| format!("<li>{}</li>", term))
            .collect::<Vec<_>>()
            .join("\n            ");

        let thank_you = footer.thank_you_message.as_deref().unwrap_or("");

        let contact_list = footer.contact_info.iter()
            .map(|info| format!("<div>{}</div>", info))
            .collect::<Vec<_>>()
            .join("\n        ");

        Ok(format!(r#"
<div class="footer">
    <div class="terms">
        <h4>Terms & Conditions:</h4>
        <ol>
            {}
        </ol>
    </div>

    <div class="thank-you">{}</div>

    <div class="contact-info">
        {}
    </div>
</div>
        "#, terms_list, thank_you, contact_list))
    }

    /// Convert amount to words
    pub fn amount_to_words(amount: f64) -> String {
        if amount == 0.0 {
            return "Zero Rupees Only".to_string();
        }

        fn convert_group(mut num: u64) -> String {
            let ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"];
            let teens = ["Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
            let tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

            let mut result = String::new();

            if num >= 100 {
                result.push_str(ones[(num / 100) as usize]);
                result.push_str(" Hundred ");
                num %= 100;
            }

            if num >= 20 {
                result.push_str(tens[(num / 10) as usize]);
                result.push(' ');
                num %= 10;
            } else if num >= 10 {
                result.push_str(teens[(num - 10) as usize]);
                result.push(' ');
                return result.trim().to_string();
            }

            if num > 0 {
                result.push_str(ones[num as usize]);
                result.push(' ');
            }

            result.trim().to_string()
        }

        let rupees = amount as u64;
        let paise = ((amount - rupees as f64) * 100.0).round() as u64;

        if rupees > 0 {
            let crores = rupees / 10_000_000;
            let lakhs = (rupees % 10_000_000) / 100_000;
            let thousands = (rupees % 100_000) / 1_000;
            let remainder = rupees % 1_000;

            let mut result = String::new();

            if crores > 0 {
                result.push_str(&convert_group(crores));
                result.push_str(" Crore ");
            }

            if lakhs > 0 {
                result.push_str(&convert_group(lakhs));
                result.push_str(" Lakh ");
            }

            if thousands > 0 {
                result.push_str(&convert_group(thousands));
                result.push_str(" Thousand ");
            }

            if remainder > 0 {
                result.push_str(&convert_group(remainder));
            }

            result.push_str(" Rupees");

            if paise > 0 {
                result.push_str(" and ");
                result.push_str(&convert_group(paise));
                result.push_str(" Paise");
            }

            result.push_str(" Only");

            result.trim().to_string()
        } else {
            "Zero Rupees Only".to_string()
        }
    }
}