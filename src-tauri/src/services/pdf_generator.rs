use serde::{Deserialize, Serialize};
use crate::models::{Invoice, Customer, Store, InvoiceItem, ApiResult, ApiError};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InvoicePdfData {
    pub invoice: Invoice,
    pub customer: Customer,
    pub store: Store,
    pub items: Vec<InvoiceItemWithDetails>,
    pub totals: PdfTotals,
    pub settings: PdfSettings,
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
pub struct PdfTotals {
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
pub struct PdfSettings {
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

pub struct PdfGenerator;

impl PdfGenerator {
    /// Generate A5-optimized invoice PDF
    pub fn generate_a5_invoice(data: &InvoicePdfData) -> ApiResult<Vec<u8>> {
        let settings = Self::get_a5_settings(&data.store);
        Self::generate_invoice_pdf(data, &settings)
    }

    /// Generate standard A4 invoice PDF
    pub fn generate_a4_invoice(data: &InvoicePdfData) -> ApiResult<Vec<u8>> {
        let settings = Self::get_a4_settings(&data.store);
        Self::generate_invoice_pdf(data, &settings)
    }

    /// Generate thermal printer PDF (80mm width)
    pub fn generate_thermal_invoice(data: &InvoicePdfData) -> ApiResult<Vec<u8>> {
        let settings = Self::get_thermal_settings(&data.store);
        Self::generate_invoice_pdf(data, &settings)
    }

    /// Core PDF generation logic
    fn generate_invoice_pdf(data: &InvoicePdfData, settings: &PdfSettings) -> ApiResult<Vec<u8>> {
        // For now, we'll generate an HTML representation that can be converted to PDF
        // In a real implementation, you'd use a PDF library like printpdf or wkhtmltopdf
        let html = Self::generate_html_invoice(data, settings)?;

        // Convert HTML to PDF (placeholder - would use actual PDF generation library)
        let pdf_bytes = Self::html_to_pdf(&html, settings)?;

        Ok(pdf_bytes)
    }

    /// Generate HTML representation of the invoice
    fn generate_html_invoice(data: &InvoicePdfData, settings: &PdfSettings) -> ApiResult<String> {
        let mut html = String::new();

        // HTML Document structure
        html.push_str("<!DOCTYPE html>\n");
        html.push_str("<html>\n");
        html.push_str("<head>\n");
        html.push_str("<meta charset='UTF-8'>\n");
        html.push_str("<meta name='viewport' content='width=device-width, initial-scale=1.0'>\n");
        html.push_str("<title>Invoice</title>\n");

        // Add CSS styles optimized for the paper size
        html.push_str(&Self::generate_css_styles(settings));

        html.push_str("</head>\n");
        html.push_str("<body>\n");
        html.push_str("<div class='invoice-container'>\n");

        // Header section
        html.push_str(&Self::generate_header_section(data, settings)?);

        // Bill to section
        html.push_str(&Self::generate_bill_to_section(data)?);

        // Invoice details
        html.push_str(&Self::generate_invoice_details_section(data)?);

        // Items table
        html.push_str(&Self::generate_items_table(data, settings)?);

        // Totals section
        html.push_str(&Self::generate_totals_section(data)?);

        // Footer section
        html.push_str(&Self::generate_footer_section(data, settings)?);

        html.push_str("</div>\n");
        html.push_str("</body>\n");
        html.push_str("</html>\n");

        Ok(html)
    }

    /// Generate CSS styles optimized for different paper sizes
    fn generate_css_styles(settings: &PdfSettings) -> String {
        let layout = &settings.layout;
        let branding = &settings.branding;

        format!(r#"
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
    }}

    .header {{
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: {section_spacing}mm;
        border-bottom: 2px solid {primary_color};
        padding-bottom: 5mm;
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
        font-style: italic;
    }}

    .invoice-info {{
        text-align: right;
        flex: 1;
    }}

    .invoice-title {{
        font-size: {font_large}pt;
        font-weight: bold;
        color: {primary_color};
        margin-bottom: 3mm;
    }}

    .bill-to {{
        display: flex;
        justify-content: space-between;
        margin-bottom: {section_spacing}mm;
    }}

    .customer-info, .store-info {{
        flex: 1;
    }}

    .section-title {{
        font-size: {font_normal}pt;
        font-weight: bold;
        margin-bottom: 2mm;
        color: {primary_color};
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
        font-size: {font_small}pt;
    }}

    .items-table .text-right {{
        text-align: right;
    }}

    .items-table .text-center {{
        text-align: center;
    }}

    .addon-row {{
        background-color: #f8f9fa;
        font-style: italic;
    }}

    .totals-section {{
        margin-top: {section_spacing}mm;
        border-top: 1px solid #ddd;
        padding-top: 3mm;
    }}

    .totals-table {{
        width: 50%;
        margin-left: auto;
        font-size: {font_normal}pt;
    }}

    .totals-table td {{
        padding: 1mm 3mm;
        border: none;
    }}

    .total-row {{
        font-weight: bold;
        font-size: {font_normal}pt;
        border-top: 2px solid {primary_color};
    }}

    .amount-words {{
        margin-top: 3mm;
        font-style: italic;
        color: {secondary_color};
    }}

    .footer {{
        margin-top: {section_spacing}mm;
        border-top: 1px solid #ddd;
        padding-top: 3mm;
        font-size: {font_small}pt;
    }}

    .terms {{
        margin-bottom: 3mm;
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

    /* A5 specific optimizations */
    @media print {{
        .invoice-container {{
            width: 148mm;
            max-width: 148mm;
        }}

        .items-table {{
            font-size: 7pt;
        }}

        .items-table th,
        .items-table td {{
            padding: 1mm;
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
        font-size: 7pt;
    }}
</style>
        "#,
        paper_size = match settings.paper_size {
            PaperSize::A4 => "A4",
            PaperSize::A5 => "A5",
            PaperSize::Thermal80mm => "80mm 200mm",
            PaperSize::Custom { width_mm, height_mm } => &format!("{}mm {}mm", width_mm, height_mm),
        },
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
        )
    }

    /// Generate header section with business info and invoice details
    fn generate_header_section(data: &InvoicePdfData, settings: &PdfSettings) -> ApiResult<String> {
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
        data.store.address,
        format!("{}, {} {}",
            data.store.city.as_deref().unwrap_or(""),
            data.store.state.as_deref().unwrap_or(""),
            data.store.pincode.as_deref().unwrap_or("")
        ),
        data.store.phone.as_deref().unwrap_or("N/A"),
        data.store.email.as_deref().unwrap_or("N/A"),
        data.store.gstin.as_deref().unwrap_or("N/A"),
        data.invoice.invoice_no,
        data.invoice.order_datetime.split('T').next().unwrap_or(&data.invoice.order_datetime),
        data.invoice.order_source,
        if let Some(delivery) = &data.invoice.delivery_datetime {
            format!("<div><strong>Delivery Date:</strong> {}</div>", delivery.split('T').next().unwrap_or(delivery))
        } else {
            String::new()
        }
        ))
    }

    /// Generate bill-to section
    fn generate_bill_to_section(data: &InvoicePdfData) -> ApiResult<String> {
        Ok(format!(r#"
<div class="bill-to">
    <div class="customer-info">
        <div class="section-title">Bill To:</div>
        <div><strong>{}</strong></div>
        {}
        {}
        {}
    </div>
    <div class="store-info">
        <div class="section-title">Bill From:</div>
        <div><strong>{}</strong></div>
        <div>{}</div>
    </div>
</div>
        "#,
        data.customer.name,
        if let Some(phone) = &data.customer.phone {
            format!("<div>Phone: {}</div>", phone)
        } else { String::new() },
        if let Some(email) = &data.customer.email {
            format!("<div>Email: {}</div>", email)
        } else { String::new() },
        if let Some(address) = &data.customer.address {
            format!("<div>{}</div>", address)
        } else { String::new() },
        data.store.name,
        data.store.address,
        ))
    }

    /// Generate invoice details section
    fn generate_invoice_details_section(data: &InvoicePdfData) -> ApiResult<String> {
        Ok(format!(r#"
<div style="margin-bottom: 8mm;">
    <div style="display: flex; justify-content: space-between; align-items: center;">
        <div><strong>Status:</strong> <span style="color: #28a745;">{}</span></div>
        <div><strong>GST Mode:</strong> {}</div>
    </div>
</div>
        "#,
        data.invoice.status.to_uppercase(),
        if data.invoice.gst_inclusive == 1 { "GST Inclusive" } else { "GST Exclusive" }
        ))
    }

    /// Generate items table
    fn generate_items_table(data: &InvoicePdfData, _settings: &PdfSettings) -> ApiResult<String> {
        let mut html = String::new();

        html.push_str(r#"
<table class="items-table">
    <thead>
        <tr>
            <th style="width: 5%;">#</th>
            <th style="width: 35%;">Description</th>
            <th style="width: 10%;">Qty</th>
            <th style="width: 15%;">Rate</th>
            <th style="width: 15%;">Amount</th>
            <th style="width: 10%;">GST%</th>
            <th style="width: 10%;">GST Amt</th>
        </tr>
    </thead>
    <tbody>
        "#);

        for (index, item_detail) in data.items.iter().enumerate() {
            let item = &item_detail.item;

            // Main service row
            html.push_str(&format!(r#"
        <tr>
            <td class="text-center">{}</td>
            <td>
                <div><strong>{}</strong></div>
                {}
                {}
            </td>
            <td class="text-center">{} {}</td>
            <td class="text-right">₹{:.2}</td>
            <td class="text-right">₹{:.2}</td>
            <td class="text-center">{:.1}%</td>
            <td class="text-right">₹{:.2}</td>
        </tr>
            "#,
            index + 1,
            item_detail.service_name,
            if let Some(variant) = &item_detail.variant_name {
                format!("<div style='font-size: 7pt; color: #666;'>Variant: {}</div>", variant)
            } else { String::new() },
            if let Some(desc) = &item.description {
                format!("<div style='font-size: 7pt; color: #666;'>{}</div>", desc)
            } else { String::new() },
            item.qty,
            item_detail.unit,
            item.rate,
            item.amount,
            item.gst_rate,
            item.sgst + item.cgst
            ));

            // Addon rows
            for addon in &item_detail.addons {
                html.push_str(&format!(r#"
        <tr class="addon-row">
            <td></td>
            <td style="padding-left: 5mm;">+ {}</td>
            <td class="text-center">{}</td>
            <td class="text-right">₹{:.2}</td>
            <td class="text-right">₹{:.2}</td>
            <td></td>
            <td></td>
        </tr>
                "#,
                addon.addon_name,
                addon.quantity,
                addon.rate,
                addon.amount
                ));
            }
        }

        html.push_str(r#"
    </tbody>
</table>
        "#);

        Ok(html)
    }

    /// Generate totals section
    fn generate_totals_section(data: &InvoicePdfData) -> ApiResult<String> {
        let totals = &data.totals;

        let mut html = String::new();
        html.push_str(r#"<div class="totals-section">"#);
        html.push_str(r#"<table class="totals-table">"#);

        html.push_str(&format!(r#"<tr><td>Subtotal:</td><td class="text-right">₹{:.2}</td></tr>"#, totals.subtotal));

        if totals.discount_amount > 0.0 {
            html.push_str(&format!(r#"<tr><td>Discount:</td><td class="text-right">-₹{:.2}</td></tr>"#, totals.discount_amount));
        }

        if totals.express_charge > 0.0 {
            html.push_str(&format!(r#"<tr><td>Express Charge:</td><td class="text-right">₹{:.2}</td></tr>"#, totals.express_charge));
        }

        html.push_str(&format!(r#"<tr><td>SGST (9%):</td><td class="text-right">₹{:.2}</td></tr>"#, totals.sgst_amount));
        html.push_str(&format!(r#"<tr><td>CGST (9%):</td><td class="text-right">₹{:.2}</td></tr>"#, totals.cgst_amount));
        html.push_str(&format!(r#"<tr class="total-row"><td><strong>Total:</strong></td><td class="text-right"><strong>₹{:.2}</strong></td></tr>"#, totals.total_amount));

        html.push_str(r#"</table>"#);
        html.push_str(&format!(r#"<div class="amount-words"><strong>Amount in Words:</strong> {}</div>"#, totals.amount_in_words));
        html.push_str(r#"</div>"#);

        Ok(html)
    }

    /// Generate footer section
    fn generate_footer_section(data: &InvoicePdfData, settings: &PdfSettings) -> ApiResult<String> {
        let footer = &settings.footer;
        let mut html = String::new();

        html.push_str(r#"<div class="footer">"#);

        if !footer.terms_conditions.is_empty() {
            html.push_str(r#"<div class="terms">"#);
            html.push_str(r#"<div class="section-title">Terms & Conditions:</div>"#);
            html.push_str(r#"<ol>"#);
            for term in &footer.terms_conditions {
                html.push_str(&format!(r#"<li>{}</li>"#, term));
            }
            html.push_str(r#"</ol>"#);
            html.push_str(r#"</div>"#);
        }

        if let Some(thank_you) = &footer.thank_you_message {
            html.push_str(&format!(r#"<div class="thank-you">{}</div>"#, thank_you));
        }

        if !footer.contact_info.is_empty() {
            html.push_str(r#"<div class="contact-info">"#);
            for info in &footer.contact_info {
                html.push_str(&format!(r#"<div>{}</div>"#, info));
            }
            html.push_str(r#"</div>"#);
        }

        html.push_str(r#"</div>"#);

        Ok(html)
    }

    /// Convert HTML to PDF (placeholder implementation)
    fn html_to_pdf(html: &str, _settings: &PdfSettings) -> ApiResult<Vec<u8>> {
        // In a real implementation, you would use:
        // - wkhtmltopdf via Command
        // - puppeteer/chromium headless
        // - printpdf library
        // - or another PDF generation library

        // For now, return the HTML as bytes (in real app, this would be actual PDF bytes)
        Ok(html.as_bytes().to_vec())
    }

    /// Get optimized settings for A5 paper
    pub fn get_a5_settings(store: &Store) -> PdfSettings {
        PdfSettings {
            paper_size: PaperSize::A5,
            layout: LayoutSettings {
                margin_top: 8.0,
                margin_bottom: 8.0,
                margin_left: 6.0,
                margin_right: 6.0,
                font_size_normal: 9.0,
                font_size_small: 7.0,
                font_size_large: 12.0,
                line_height: 1.2,
                section_spacing: 4.0,
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

    /// Get optimized settings for A4 paper
    pub fn get_a4_settings(store: &Store) -> PdfSettings {
        let mut settings = Self::get_a5_settings(store);
        settings.paper_size = PaperSize::A4;
        settings.layout.font_size_normal = 11.0;
        settings.layout.font_size_small = 9.0;
        settings.layout.font_size_large = 16.0;
        settings.layout.margin_top = 15.0;
        settings.layout.margin_bottom = 15.0;
        settings.layout.margin_left = 15.0;
        settings.layout.margin_right = 15.0;
        settings.layout.section_spacing = 8.0;
        settings
    }

    /// Get optimized settings for thermal printer
    pub fn get_thermal_settings(store: &Store) -> PdfSettings {
        let mut settings = Self::get_a5_settings(store);
        settings.paper_size = PaperSize::Thermal80mm;
        settings.layout.font_size_normal = 8.0;
        settings.layout.font_size_small = 6.0;
        settings.layout.font_size_large = 10.0;
        settings.layout.margin_top = 2.0;
        settings.layout.margin_bottom = 2.0;
        settings.layout.margin_left = 2.0;
        settings.layout.margin_right = 2.0;
        settings.layout.section_spacing = 2.0;
        settings
    }

    /// Convert number to words (Indian format)
    pub fn amount_to_words(amount: f64) -> String {
        if amount == 0.0 {
            return "Zero Rupees Only".to_string();
        }

        let ones = [
            "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
            "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
            "Seventeen", "Eighteen", "Nineteen"
        ];

        let tens = [
            "", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"
        ];

        fn convert_hundreds(num: u64) -> String {
            let mut result = String::new();

            if num >= 100 {
                result.push_str(&format!("{} Hundred ", ones[(num / 100) as usize]));
            }

            let remainder = num % 100;
            if remainder >= 20 {
                result.push_str(&format!("{} ", tens[(remainder / 10) as usize]));
                if remainder % 10 != 0 {
                    result.push_str(&format!("{} ", ones[(remainder % 10) as usize]));
                }
            } else if remainder > 0 {
                result.push_str(&format!("{} ", ones[remainder as usize]));
            }

            result.trim().to_string()
        }

        let rupees = amount.floor() as u64;
        let paise = ((amount - rupees as f64) * 100.0).round() as u64;

        let mut result = String::new();

        if rupees >= 10000000 {
            let crores = rupees / 10000000;
            result.push_str(&format!("{} Crore ", convert_hundreds(crores)));
            let remainder = rupees % 10000000;
            if remainder > 0 {
                if remainder >= 100000 {
                    let lakhs = remainder / 100000;
                    result.push_str(&format!("{} Lakh ", convert_hundreds(lakhs)));
                    let remainder = remainder % 100000;
                    if remainder > 0 {
                        result.push_str(&format!("{} ", convert_hundreds(remainder)));
                    }
                } else {
                    result.push_str(&format!("{} ", convert_hundreds(remainder)));
                }
            }
        } else if rupees >= 100000 {
            let lakhs = rupees / 100000;
            result.push_str(&format!("{} Lakh ", convert_hundreds(lakhs)));
            let remainder = rupees % 100000;
            if remainder > 0 {
                result.push_str(&format!("{} ", convert_hundreds(remainder)));
            }
        } else {
            result.push_str(&format!("{} ", convert_hundreds(rupees)));
        }

        result.push_str("Rupees");

        if paise > 0 {
            result.push_str(&format!(" and {} Paise", convert_hundreds(paise)));
        }

        result.push_str(" Only");
        result
    }
}