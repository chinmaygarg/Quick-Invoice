import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { invoke } from '@tauri-apps/api/tauri';
import { useApp } from '@/contexts/AppContext';
import { CustomerSelector } from './CustomerSelector';
import { ServiceSelector } from './ServiceSelector';
import { InvoiceSummary } from './InvoiceSummary';
import { PaymentSection } from './PaymentSection';

interface InvoiceFormData {
  customerId: number | null;
  storeId: number;
  orderSource: string;
  deliveryDate: string;
  items: InvoiceItem[];
  discount: number;
  discountType: 'flat' | 'percent';
  expressCharge: number;
  gstInclusive: boolean;
  notes: string;
  paymentMethod?: string;
  paymentAmount?: number;
}

interface InvoiceItem {
  id?: number;
  serviceId: number;
  variantId?: number;
  serviceName: string;
  variantName?: string;
  description?: string;
  quantity: number;
  weight?: number;
  rate: number;
  amount: number;
  gstRate: number;
  addons: InvoiceItemAddon[];
}

interface InvoiceItemAddon {
  addonId: number;
  addonName: string;
  quantity: number;
  rate: number;
  amount: number;
}

export function InvoiceForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { state, showNotification, setLoading } = useApp();

  const [formData, setFormData] = useState<InvoiceFormData>({
    customerId: null,
    storeId: state.currentStore?.id || 1,
    orderSource: 'WALK-IN',
    deliveryDate: '',
    items: [],
    discount: 0,
    discountType: 'flat',
    expressCharge: 0,
    gstInclusive: false,
    notes: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Initialize form for editing
  useEffect(() => {
    if (id && id !== 'new') {
      loadInvoiceForEdit(parseInt(id));
    } else {
      // Check for quick-selected customer
      const quickCustomer = sessionStorage.getItem('quick-selected-customer');
      if (quickCustomer) {
        const customer = JSON.parse(quickCustomer);
        setFormData(prev => ({ ...prev, customerId: customer.id }));
        sessionStorage.removeItem('quick-selected-customer');
      }

      // Set default delivery date (day after tomorrow)
      const defaultDeliveryDate = new Date();
      defaultDeliveryDate.setDate(defaultDeliveryDate.getDate() + 2);
      setFormData(prev => ({
        ...prev,
        deliveryDate: defaultDeliveryDate.toISOString().split('T')[0],
      }));
    }
  }, [id]);

  const loadInvoiceForEdit = async (invoiceId: number) => {
    try {
      setLoading(true);
      const invoice = await invoke('get_invoice_by_id', { invoiceId });

      // Transform invoice data to form format
      setFormData({
        customerId: invoice.customer_id,
        storeId: invoice.store_id,
        orderSource: invoice.order_source,
        deliveryDate: invoice.delivery_datetime?.split('T')[0] || '',
        items: invoice.items || [],
        discount: invoice.discount || 0,
        discountType: invoice.discount_type || 'flat',
        expressCharge: invoice.express_charge || 0,
        gstInclusive: invoice.gst_inclusive === 1,
        notes: invoice.notes || '',
      });
    } catch (error) {
      showNotification({
        type: 'error',
        title: 'Load Failed',
        message: `Failed to load invoice: ${error}`,
      });
      navigate('/invoices');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = useCallback(() => {
    const errors: Record<string, string> = {};

    if (!formData.customerId) {
      errors.customer = 'Customer is required';
    }

    if (formData.items.length === 0) {
      errors.items = 'At least one service is required';
    }

    // Validate each item
    formData.items.forEach((item, index) => {
      if (item.quantity <= 0) {
        errors[`item_${index}_quantity`] = 'Quantity must be positive';
      }
      if (item.rate <= 0) {
        errors[`item_${index}_rate`] = 'Rate must be positive';
      }
    });

    if (formData.discount < 0) {
      errors.discount = 'Discount cannot be negative';
    }

    if (formData.discountType === 'percent' && formData.discount > 100) {
      errors.discount = 'Percentage discount cannot exceed 100%';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  }, [formData.customerId, formData.items, formData.discount, formData.discountType]);

  const calculateTotals = useMemo(() => {
    const subtotal = formData.items.reduce((sum, item) => {
      const itemTotal = item.amount + item.addons.reduce((addonSum, addon) => addonSum + addon.amount, 0);
      return sum + itemTotal;
    }, 0);

    const discountAmount = formData.discountType === 'percent'
      ? subtotal * (formData.discount / 100)
      : formData.discount;

    const baseAmount = subtotal - discountAmount + formData.expressCharge;

    let sgstAmount = 0;
    let cgstAmount = 0;
    let total = 0;

    if (formData.gstInclusive) {
      // GST is included in the prices
      total = baseAmount;
      const gstAmount = baseAmount - (baseAmount / 1.18); // Assuming 18% GST
      sgstAmount = gstAmount / 2;
      cgstAmount = gstAmount / 2;
    } else {
      // GST is exclusive
      const gstAmount = baseAmount * 0.18; // Assuming 18% GST
      sgstAmount = gstAmount / 2;
      cgstAmount = gstAmount / 2;
      total = baseAmount + gstAmount;
    }

    return {
      subtotal,
      discountAmount,
      baseAmount,
      sgstAmount,
      cgstAmount,
      total,
    };
  }, [formData.items, formData.discount, formData.discountType, formData.expressCharge, formData.gstInclusive]);

  const calculateTotal = useMemo(() => {
    return calculateTotals.total;
  }, [calculateTotals]);

  const isFormValid = useMemo(() => {
    if (!formData.customerId) return false;
    if (formData.items.length === 0) return false;

    // Check each item
    for (let i = 0; i < formData.items.length; i++) {
      const item = formData.items[i];
      if (item.quantity <= 0 || item.rate <= 0) return false;
    }

    if (formData.discount < 0) return false;
    if (formData.discountType === 'percent' && formData.discount > 100) return false;

    return true;
  }, [formData.customerId, formData.items, formData.discount, formData.discountType]);

  const handleSubmit = async () => {
    if (!validateForm()) {
      showNotification({
        type: 'error',
        title: 'Validation Error',
        message: 'Please fix the errors before submitting',
      });
      return;
    }

    try {
      setIsSubmitting(true);

      const totals = calculateTotals;

      const invoiceData = {
        customer_id: formData.customerId,
        store_id: formData.storeId,
        order_source: formData.orderSource,
        delivery_datetime: formData.deliveryDate ? `${formData.deliveryDate}T19:00:00` : null,
        items: formData.items.map(item => ({
          service_id: item.serviceId,
          variant_id: item.variantId,
          description: item.description,
          qty: item.quantity,
          weight_kg: item.weight,
          addons: item.addons.length > 0 ? item.addons.map(addon => ({
            addon_id: addon.addonId,
            qty: addon.quantity,
          })) : undefined,
        })),
        discount: formData.discount,
        discount_type: formData.discountType,
        express_charge: formData.expressCharge,
        gst_inclusive: formData.gstInclusive,
        notes: formData.notes,
      };

      let invoice;
      if (id && id !== 'new') {
        // Update existing invoice
        invoice = await invoke('update_invoice', {
          invoiceId: parseInt(id),
          request: invoiceData,
        });
      } else {
        // Create new invoice
        invoice = await invoke('create_invoice', { request: invoiceData });
      }

      showNotification({
        type: 'success',
        title: 'Invoice Saved',
        message: `Invoice ${invoice.invoice_no} has been ${id && id !== 'new' ? 'updated' : 'created'} successfully`,
      });

      // Navigate to invoice view or list
      navigate(`/invoices`);
    } catch (error) {
      showNotification({
        type: 'error',
        title: 'Save Failed',
        message: `Failed to save invoice: ${error}`,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddService = (serviceItem: Omit<InvoiceItem, 'id'>) => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { ...serviceItem, id: Date.now() }],
    }));
  };

  const handleUpdateService = (index: number, updatedItem: InvoiceItem) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map((item, i) => i === index ? updatedItem : item),
    }));
  };

  const handleRemoveService = (index: number) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const steps = [
    { id: 1, title: 'Customer & Store', component: 'customer' },
    { id: 2, title: 'Add Services', component: 'services' },
    { id: 3, title: 'Review & Payment', component: 'summary' },
  ];

  return (
    <div className="space-y-6" data-testid="invoice-form">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {id && id !== 'new' ? 'Edit Invoice' : 'Create New Invoice'}
          </h1>
          <p className="text-gray-600 mt-1">
            {id && id !== 'new' ? 'Update invoice details' : 'Generate a new invoice for your customer'}
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigate('/invoices')}
            className="btn btn-secondary btn-md"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !isFormValid}
            className="btn btn-primary btn-md"
            data-testid="generate-invoice"
          >
            {isSubmitting ? (
              <>
                <div className="spinner w-4 h-4 mr-2" />
                {id && id !== 'new' ? 'Updating...' : 'Creating...'}
              </>
            ) : (
              <>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                {id && id !== 'new' ? 'Update Invoice' : 'Generate Invoice'}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="bg-white rounded-xl shadow-soft p-6">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div
                className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                  currentStep >= step.id
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}
              >
                {step.id}
              </div>
              <span className={`ml-2 text-sm font-medium ${
                currentStep >= step.id ? 'text-primary-600' : 'text-gray-500'
              }`}>
                {step.title}
              </span>
              {index < steps.length - 1 && (
                <div className={`w-16 h-0.5 mx-4 ${
                  currentStep > step.id ? 'bg-primary-600' : 'bg-gray-200'
                }`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Form Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer Selection */}
          {(currentStep === 1 || currentStep === 2 || currentStep === 3) && (
            <CustomerSelector
              selectedCustomerId={formData.customerId}
              onCustomerSelect={(customerId) => {
                setFormData(prev => ({ ...prev, customerId }));
                if (currentStep === 1) setCurrentStep(2);
              }}
              orderSource={formData.orderSource}
              onOrderSourceChange={(orderSource) => setFormData(prev => ({ ...prev, orderSource }))}
              deliveryDate={formData.deliveryDate}
              onDeliveryDateChange={(deliveryDate) => setFormData(prev => ({ ...prev, deliveryDate }))}
              error={validationErrors.customer}
            />
          )}

          {/* Service Selection */}
          {(currentStep === 2 || currentStep === 3) && (
            <ServiceSelector
              items={formData.items}
              onAddService={handleAddService}
              onUpdateService={handleUpdateService}
              onRemoveService={handleRemoveService}
              gstInclusive={formData.gstInclusive}
              error={validationErrors.items}
            />
          )}

          {/* Payment Section */}
          {currentStep === 3 && (
            <PaymentSection
              totalAmount={calculateTotal}
              onPaymentUpdate={(payment) => setFormData(prev => ({
                ...prev,
                paymentMethod: payment.method,
                paymentAmount: payment.amount,
                notes: payment.notes
              }))}
              initialPayment={{
                method: formData.paymentMethod || 'cash',
                amount: formData.paymentAmount || calculateTotal,
                notes: formData.notes
              }}
            />
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between">
            <button
              onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
              disabled={currentStep === 1}
              className="btn btn-secondary btn-md"
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentStep(Math.min(3, currentStep + 1))}
              disabled={currentStep === 3}
              className="btn btn-primary btn-md"
            >
              Next
            </button>
          </div>
        </div>

        {/* Invoice Summary Sidebar */}
        <div className="lg:col-span-1">
          <InvoiceSummary
            items={formData.items}
            discount={formData.discount}
            discountType={formData.discountType}
            onDiscountChange={(discount) => setFormData(prev => ({ ...prev, discount }))}
            onDiscountTypeChange={(discountType) => setFormData(prev => ({ ...prev, discountType }))}
            expressCharge={formData.expressCharge}
            onExpressChargeChange={(expressCharge) => setFormData(prev => ({ ...prev, expressCharge }))}
            gstInclusive={formData.gstInclusive}
            onGstInclusiveChange={(gstInclusive) => setFormData(prev => ({ ...prev, gstInclusive }))}
            onAddService={handleAddService}
          />
        </div>
      </div>
    </div>
  );
}