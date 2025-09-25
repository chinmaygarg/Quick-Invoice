// Core entity types
export interface Customer {
  id: number;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Store {
  id: number;
  name: string;
  address: string;
  phone: string;
  email?: string;
  gstin?: string;
  logo_url?: string;
  state?: string;
  state_code?: string;
  city?: string;
  pincode?: string;
  bank_details?: string;
  pan_number?: string;
  owner_name?: string;
  is_active?: boolean;
  created_at: string;
  updated_at: string;
}

export interface ServiceCategory {
  id: number;
  name: string;
  description?: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Service {
  id: number;
  category_id: number;
  name: string;
  description?: string;
  base_price: number;
  gst_rate: number;
  unit: string;
  min_quantity?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // UI-specific optional properties
  is_dynamic?: boolean;
  category?: string;
}

export interface ServiceVariant {
  id: number;
  service_id: number;
  name: string;
  price_modifier: number;
  is_percentage: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // UI-specific optional properties
  base_price?: number;
  gst_rate?: number;
  variant_name?: string;
  description?: string;
  priceMultiplier?: number;
  isActive?: boolean;
}

export interface ServiceAddon {
  id: number;
  service_id: number;
  name: string;
  price: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // UI-specific optional properties
  unit?: string;
  description?: string;
  isActive?: boolean;
}

export interface Invoice {
  id: number;
  invoice_no: string;
  customer_id: number;
  store_id: number;
  delivery_date?: string;
  delivery_time?: string;
  delivery_datetime?: string;
  order_source?: string;
  discount_type?: 'flat' | 'percent';
  subtotal: number;
  discount: number;
  express_charge: number;
  sgst_amount: number;
  cgst_amount: number;
  total: number;
  gst_inclusive: boolean;
  payment_status: string;
  notes?: string;
  items?: InvoiceItem[];
  created_at: string;
  updated_at: string;
}

export interface InvoiceItem {
  id?: number;
  invoice_id?: number;
  service_id?: number;
  serviceId?: number;
  variant_id?: number;
  description: string;
  qty: number;
  piece_count?: number;
  pieceCount?: number;
  weight_kg?: number;
  area_sqft?: number;
  rate: number;
  amount: number;
  gst_rate?: number;
  gstRate?: number;
  sgst: number;
  cgst: number;
  created_at?: string;
  // UI-specific optional properties
  serviceName?: string;
  variantName?: string;
  variantId?: number;
  quantity?: number;
  originalQuantity?: number;
  addons?: Array<{
    addonId: number;
    addonName: string;
    quantity: number;
    rate: number;
    amount: number;
  }>;
}

export interface InvoiceItemAddon {
  id: number;
  invoice_item_id: number;
  addon_id: number;
  qty: number;
  rate: number;
  amount: number;
}

// API Response types
export interface ApiResponse<T> {
  data?: T;
  error?: {
    message: string;
    code?: string;
  };
}

// Form data types
export interface CreateCustomerRequest {
  name: string;
  phone: string;
  email?: string;
  address?: string;
  notes?: string;
}

export interface UpdateCustomerRequest extends CreateCustomerRequest {
  id: number;
}

export interface CreateStoreRequest {
  name: string;
  address: string;
  phone: string;
  email?: string;
  gstin?: string;
  logo_url?: string;
  state_code?: string;
  city?: string;
  pincode?: string;
  bank_details?: string;
}

export interface UpdateStoreRequest extends CreateStoreRequest {
  id: number;
}

export interface CreateServiceRequest {
  category_id: number;
  name: string;
  description?: string;
  base_price: number;
  gst_rate: number;
  unit: string;
  min_quantity?: number;
  is_active: boolean;
}

export interface UpdateServiceRequest extends CreateServiceRequest {
  id: number;
}

// Utility types
export type PaymentStatus = 'PENDING' | 'PARTIAL' | 'PAID' | 'CANCELLED';

// Component prop types
export interface NotificationProps {
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
}

// Addon type for forms
export interface Addon {
  id: number;
  service_id: number;
  name: string;
  price: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // UI-specific optional properties
  unit?: string;
}

// Sales summary for dashboard
export interface SalesSummary {
  total_revenue: number;
  total_invoices: number;
  pending_invoices: number;
  completed_invoices: number;
}

// Service with extended data for selectors
export interface ServiceWithDetails extends Omit<Service, 'category'> {
  category?: ServiceCategory;
  variants?: ServiceVariant[];
  addons?: ServiceAddon[];
}

// Re-export email types
export * from './email';