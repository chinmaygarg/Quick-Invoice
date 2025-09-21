use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Customer {
    pub id: i64,
    pub name: String,
    pub phone: Option<String>,
    pub email: Option<String>,
    pub address: Option<String>,
    pub notes: Option<String>,
    pub is_active: Option<i64>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateCustomerRequest {
    pub name: String,
    pub phone: Option<String>,
    pub email: Option<String>,
    pub address: Option<String>,
    pub notes: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateCustomerRequest {
    pub name: String,
    pub phone: Option<String>,
    pub email: Option<String>,
    pub address: Option<String>,
    pub notes: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CustomerWithStats {
    pub id: i64,
    pub name: String,
    pub phone: Option<String>,
    pub email: Option<String>,
    pub address: Option<String>,
    pub notes: Option<String>,
    pub is_active: Option<i64>,
    pub total_orders: i64,
    pub total_spent: f64,
    pub last_order_date: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Store {
    pub id: i64,
    pub name: String,
    pub address: String,
    pub city: Option<String>,
    pub state: Option<String>,
    pub pincode: Option<String>,
    pub phone: Option<String>,
    pub email: Option<String>,
    pub gstin: Option<String>,
    pub pan_number: Option<String>,
    pub owner_name: Option<String>,
    pub is_active: Option<i64>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateStoreRequest {
    pub name: String,
    pub address: String,
    pub city: Option<String>,
    pub state: Option<String>,
    pub pincode: Option<String>,
    pub phone: Option<String>,
    pub email: Option<String>,
    pub gstin: Option<String>,
    pub pan_number: Option<String>,
    pub owner_name: Option<String>,
    pub is_active: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateStoreRequest {
    pub name: String,
    pub address: String,
    pub city: Option<String>,
    pub state: Option<String>,
    pub pincode: Option<String>,
    pub phone: Option<String>,
    pub email: Option<String>,
    pub gstin: Option<String>,
    pub pan_number: Option<String>,
    pub owner_name: Option<String>,
    pub is_active: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StoreWithStats {
    pub id: i64,
    pub name: String,
    pub address: String,
    pub city: Option<String>,
    pub state: Option<String>,
    pub pincode: Option<String>,
    pub phone: Option<String>,
    pub email: Option<String>,
    pub gstin: Option<String>,
    pub pan_number: Option<String>,
    pub owner_name: Option<String>,
    pub is_active: Option<i64>,
    pub total_invoices: i64,
    pub monthly_revenue: f64,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct ServiceCategory {
    pub id: i64,
    pub name: String,
    pub parent_id: Option<i64>,
    pub is_active: i64,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Service {
    pub id: i64,
    pub name: String,
    pub category: Option<String>,
    pub description: Option<String>,
    pub base_price: f64,
    pub gst_rate: f64,
    pub unit: String,
    pub min_quantity: i64,
    pub is_active: Option<i64>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateServiceRequest {
    pub name: String,
    pub category: Option<String>,
    pub description: Option<String>,
    pub base_price: f64,
    pub gst_rate: f64,
    pub unit: String,
    pub min_quantity: i64,
    pub is_active: Option<bool>,
    pub variants: Option<Vec<CreateServiceVariantRequest>>,
    pub addons: Option<Vec<CreateServiceAddonRequest>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateServiceRequest {
    pub name: String,
    pub category: Option<String>,
    pub description: Option<String>,
    pub base_price: f64,
    pub gst_rate: f64,
    pub unit: String,
    pub min_quantity: i64,
    pub is_active: Option<bool>,
    pub variants: Option<Vec<CreateServiceVariantRequest>>,
    pub addons: Option<Vec<CreateServiceAddonRequest>>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct ServiceVariant {
    pub id: i64,
    pub service_id: i64,
    pub name: String,
    pub description: Option<String>,
    pub price_multiplier: f64,
    pub is_active: Option<i64>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateServiceVariantRequest {
    pub name: String,
    pub description: Option<String>,
    pub price_multiplier: f64,
    pub is_active: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct ServiceAddon {
    pub id: i64,
    pub service_id: i64,
    pub name: String,
    pub description: Option<String>,
    pub price: f64,
    pub unit: String,
    pub is_active: Option<i64>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateServiceAddonRequest {
    pub name: String,
    pub description: Option<String>,
    pub price: f64,
    pub unit: String,
    pub is_active: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServiceWithDetails {
    pub id: i64,
    pub name: String,
    pub category: Option<String>,
    pub description: Option<String>,
    pub base_price: f64,
    pub gst_rate: f64,
    pub unit: String,
    pub min_quantity: i64,
    pub is_active: i64,
    pub variants_count: i64,
    pub addons_count: i64,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Invoice {
    pub id: i64,
    pub invoice_no: String,
    pub challan_id: Option<String>,
    pub customer_id: i64,
    pub store_id: i64,
    pub order_no: Option<String>,
    pub order_source: String,
    pub order_datetime: String,
    pub pickup_datetime: Option<String>,
    pub delivery_datetime: Option<String>,
    pub subtotal: f64,
    pub discount: f64,
    pub discount_type: String,
    pub express_charge: f64,
    pub sgst_amount: f64,
    pub cgst_amount: f64,
    pub igst_amount: f64,
    pub total: f64,
    pub gst_inclusive: i64,
    pub payment_method: Option<String>,
    pub payment_amount: Option<f64>,
    pub status: String,
    pub notes: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateInvoiceRequest {
    pub customer_id: i64,
    pub store_id: i64,
    pub order_source: Option<String>,
    pub pickup_datetime: Option<String>,
    pub delivery_datetime: Option<String>,
    pub items: Vec<CreateInvoiceItemRequest>,
    pub discount: Option<f64>,
    pub discount_type: Option<String>,
    pub express_charge: Option<f64>,
    pub gst_inclusive: Option<bool>,
    pub payment_method: Option<String>,
    pub payment_amount: Option<f64>,
    pub notes: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateInvoiceItemRequest {
    pub service_id: i64,
    pub variant_id: Option<i64>,
    pub description: Option<String>,
    pub qty: f64,
    pub weight_kg: Option<f64>,
    pub area_sqft: Option<f64>,
    pub addons: Option<Vec<CreateInvoiceItemAddonRequest>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateInvoiceItemAddonRequest {
    pub addon_id: i64,
    pub qty: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct InvoiceItem {
    pub id: i64,
    pub invoice_id: i64,
    pub service_id: i64,
    pub variant_id: Option<i64>,
    pub description: Option<String>,
    pub qty: f64,
    pub weight_kg: Option<f64>,
    pub area_sqft: Option<f64>,
    pub rate: f64,
    pub amount: f64,
    pub gst_rate: f64,
    pub sgst: f64,
    pub cgst: f64,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct InvoiceItemAddon {
    pub id: i64,
    pub invoice_item_id: i64,
    pub addon_id: i64,
    pub qty: f64,
    pub rate: f64,
    pub amount: f64,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Payment {
    pub id: i64,
    pub invoice_id: i64,
    pub amount: f64,
    pub method: Option<String>,
    pub txn_id: Option<String>,
    pub paid_on: String,
    pub status: String,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreatePaymentRequest {
    pub invoice_id: i64,
    pub amount: f64,
    pub method: Option<String>,
    pub txn_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InvoiceSearchRequest {
    pub customer_name: Option<String>,
    pub invoice_no: Option<String>,
    pub date_from: Option<String>,
    pub date_to: Option<String>,
    pub status: Option<String>,
    pub limit: Option<i64>,
    pub offset: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateInvoiceDetailsRequest {
    pub status: Option<String>,
    pub payment_method: Option<String>,
    pub payment_amount: Option<f64>,
    pub delivery_datetime: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InvoiceWithDetails {
    pub invoice: Invoice,
    pub customer: Customer,
    pub store: Store,
    pub items: Vec<InvoiceItemWithDetails>,
    pub payments: Vec<Payment>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InvoiceItemWithDetails {
    pub item: InvoiceItem,
    pub service: Service,
    pub variant: Option<ServiceVariant>,
    pub addons: Vec<InvoiceItemAddonWithDetails>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InvoiceItemAddonWithDetails {
    pub addon_item: InvoiceItemAddon,
    pub addon: ServiceAddon,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PricingCalculation {
    pub base_amount: f64,
    pub discount_amount: f64,
    pub express_charge: f64,
    pub taxable_amount: f64,
    pub sgst_amount: f64,
    pub cgst_amount: f64,
    pub igst_amount: f64,
    pub total_amount: f64,
    pub gst_inclusive: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SalesSummary {
    pub total_invoices: i64,
    pub total_amount: f64,
    pub total_gst: f64,
    pub paid_amount: f64,
    pub pending_amount: f64,
    pub date_from: String,
    pub date_to: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GstSummary {
    pub total_sgst: f64,
    pub total_cgst: f64,
    pub total_igst: f64,
    pub total_gst: f64,
    pub taxable_amount: f64,
    pub date_from: String,
    pub date_to: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CustomerSummary {
    pub customer: Customer,
    pub total_invoices: i64,
    pub total_amount: f64,
    pub last_order_date: Option<String>,
}

// Error types
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApiError {
    pub message: String,
    pub code: Option<String>,
}

impl std::fmt::Display for ApiError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.message)
    }
}

impl std::error::Error for ApiError {}

// Result type alias
pub type ApiResult<T> = Result<T, ApiError>;