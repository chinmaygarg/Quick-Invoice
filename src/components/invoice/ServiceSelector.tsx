import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import { useApp } from '@/contexts/AppContext';

interface Service {
  id: number;
  name: string;
  unit: string;
  base_price: number;
  min_qty: number;
  gst_rate: number;
  is_dynamic: number;
  hsn_sac_code?: string;
}

interface ServiceVariant {
  id: number;
  service_id: number;
  variant_name: string;
  base_price: number;
  gst_rate: number;
}

interface ServiceCategory {
  id: number;
  name: string;
}

interface Addon {
  id: number;
  name: string;
  unit?: string;
  price: number;
  gst_rate: number;
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

interface ServiceSelectorProps {
  items: InvoiceItem[];
  onAddService: (item: Omit<InvoiceItem, 'id'>) => void;
  onUpdateService: (index: number, item: InvoiceItem) => void;
  onRemoveService: (index: number) => void;
  gstInclusive: boolean;
  error?: string;
}

export function ServiceSelector({
  items,
  onAddService,
  onUpdateService,
  onRemoveService,
  gstInclusive,
  error,
}: ServiceSelectorProps) {
  const { showNotification } = useApp();
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [variants, setVariants] = useState<Record<number, ServiceVariant[]>>({});
  const [addons, setAddons] = useState<Addon[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<ServiceVariant | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [selectedAddons, setSelectedAddons] = useState<Record<number, number>>({});
  const [showAddService, setShowAddService] = useState(false);

  useEffect(() => {
    loadCategories();
    loadAddons();
  }, []);

  useEffect(() => {
    if (selectedCategory) {
      loadServicesByCategory(selectedCategory);
    }
  }, [selectedCategory]);

  useEffect(() => {
    if (selectedService && selectedService.is_dynamic) {
      loadServiceVariants(selectedService.id);
    }
  }, [selectedService]);

  const loadCategories = async () => {
    try {
      const categoriesData = await invoke('get_service_categories');
      setCategories(categoriesData);
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  };

  const loadServicesByCategory = async (categoryId: number) => {
    try {
      const servicesData = await invoke('get_services_by_category', { categoryId });
      setServices(servicesData);
    } catch (error) {
      console.error('Failed to load services:', error);
    }
  };

  const loadServiceVariants = async (serviceId: number) => {
    try {
      const variantsData = await invoke('get_service_variants', { serviceId });
      setVariants(prev => ({ ...prev, [serviceId]: variantsData }));
    } catch (error) {
      console.error('Failed to load variants:', error);
    }
  };

  const loadAddons = async () => {
    try {
      const addonsData = await invoke('get_addons');
      setAddons(addonsData);
    } catch (error) {
      console.error('Failed to load addons:', error);
    }
  };

  const getCurrentRate = () => {
    if (selectedVariant) {
      return selectedVariant.base_price;
    }
    if (selectedService) {
      return selectedService.base_price;
    }
    return 0;
  };

  const getCurrentGstRate = () => {
    if (selectedVariant) {
      return selectedVariant.gst_rate;
    }
    if (selectedService) {
      return selectedService.gst_rate;
    }
    return 18;
  };

  const calculateAmount = () => {
    const rate = getCurrentRate();
    const effectiveQuantity = selectedService && quantity < selectedService.min_qty
      ? selectedService.min_qty
      : quantity;
    return rate * effectiveQuantity;
  };

  const getSelectedAddonsData = () => {
    return Object.entries(selectedAddons)
      .filter(([_, qty]) => qty > 0)
      .map(([addonId, qty]) => {
        const addon = addons.find(a => a.id === parseInt(addonId));
        if (!addon) return null;
        return {
          addonId: addon.id,
          addonName: addon.name,
          quantity: qty,
          rate: addon.price,
          amount: addon.price * qty,
        };
      })
      .filter(Boolean) as InvoiceItemAddon[];
  };

  const handleAddToInvoice = () => {
    if (!selectedService) {
      showNotification({
        type: 'error',
        title: 'Validation Error',
        message: 'Please select a service',
      });
      return;
    }

    if (quantity <= 0) {
      showNotification({
        type: 'error',
        title: 'Validation Error',
        message: 'Quantity must be positive',
      });
      return;
    }

    if (selectedService.is_dynamic && !selectedVariant) {
      showNotification({
        type: 'error',
        title: 'Validation Error',
        message: 'Please select a variant for this service',
      });
      return;
    }

    const item: Omit<InvoiceItem, 'id'> = {
      serviceId: selectedService.id,
      variantId: selectedVariant?.id,
      serviceName: selectedService.name,
      variantName: selectedVariant?.variant_name,
      quantity,
      rate: getCurrentRate(),
      amount: calculateAmount(),
      gstRate: getCurrentGstRate(),
      addons: getSelectedAddonsData(),
    };

    onAddService(item);

    // Reset form
    setSelectedService(null);
    setSelectedVariant(null);
    setQuantity(1);
    setSelectedAddons({});
    setShowAddService(false);

    showNotification({
      type: 'success',
      title: 'Service Added',
      message: `${item.serviceName} has been added to the invoice`,
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="card">
      <div className="card-header">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Services</h3>
            <p className="text-sm text-gray-600 mt-1">
              Add services to the invoice
            </p>
          </div>
          <button
            onClick={() => setShowAddService(true)}
            className="btn btn-primary btn-md"
            data-testid="add-service-button"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Add Service
          </button>
        </div>
      </div>

      <div className="card-body space-y-4">
        {/* Error Message */}
        {error && (
          <div className="bg-error-50 border border-error-200 rounded-lg p-3">
            <p className="text-sm text-error-700" data-testid="error-services-required">
              {error}
            </p>
          </div>
        )}

        {/* Added Services List */}
        {items.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-3">Added Services</h4>
            <div className="space-y-3">
              {items.map((item, index) => (
                <div
                  key={item.id || index}
                  className="border border-gray-200 rounded-lg p-4"
                  data-testid="service-item"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h5 className="font-medium text-gray-900">
                        {item.serviceName}
                        {item.variantName && (
                          <span className="text-gray-600"> ({item.variantName})</span>
                        )}
                      </h5>
                      <div className="mt-1 text-sm text-gray-600">
                        <span data-testid={`service-quantity-${index}`}>
                          Quantity: {item.quantity}
                        </span>
                        <span className="mx-2">•</span>
                        <span>Rate: {formatCurrency(item.rate)}</span>
                        <span className="mx-2">•</span>
                        <span data-testid={`line-total-${index}`}>
                          Total: {formatCurrency(item.amount)}
                        </span>
                      </div>
                      {item.addons.length > 0 && (
                        <div className="mt-2 pl-3 border-l-2 border-gray-200">
                          <p className="text-xs text-gray-500 mb-1">Add-ons:</p>
                          {item.addons.map((addon, addonIndex) => (
                            <p key={addonIndex} className="text-xs text-gray-600">
                              {addon.addonName} ({addon.quantity} × {formatCurrency(addon.rate)}) = {formatCurrency(addon.amount)}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => onRemoveService(index)}
                      className="text-error-600 hover:text-error-700 p-1"
                      title="Remove service"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Add Service Modal */}
        {showAddService && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-strong max-w-2xl w-full max-h-screen overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">Add Service</h3>
                  <button
                    onClick={() => setShowAddService(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="space-y-6">
                  {/* Category Selection */}
                  <div>
                    <label htmlFor="service-category" className="form-label">
                      Service Category
                    </label>
                    <select
                      id="service-category"
                      value={selectedCategory || ''}
                      onChange={(e) => setSelectedCategory(Number(e.target.value))}
                      className="form-input"
                      data-testid="service-category"
                    >
                      <option value="">Select a category</option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Service Selection */}
                  {selectedCategory && (
                    <div>
                      <label className="form-label">Select Service</label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-48 overflow-y-auto">
                        {services.map((service) => (
                          <button
                            key={service.id}
                            onClick={() => setSelectedService(service)}
                            className={`text-left p-3 rounded-lg border transition-all duration-200 ${
                              selectedService?.id === service.id
                                ? 'border-primary-500 bg-primary-50'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                            data-testid={`service-${service.name.toLowerCase().replace(/\s+/g, '-')}`}
                          >
                            <p className="font-medium text-gray-900">{service.name}</p>
                            <p className="text-sm text-gray-600">
                              {formatCurrency(service.base_price)} per {service.unit}
                            </p>
                            {service.min_qty > 0 && (
                              <p className="text-xs text-orange-600">
                                Min: {service.min_qty} {service.unit}
                              </p>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Variant Selection */}
                  {selectedService && selectedService.is_dynamic && variants[selectedService.id] && (
                    <div>
                      <label className="form-label">Select Variant</label>
                      <div className="space-y-2">
                        {variants[selectedService.id].map((variant) => (
                          <label
                            key={variant.id}
                            className="flex items-center p-3 rounded-lg border border-gray-200 hover:border-gray-300 cursor-pointer"
                          >
                            <input
                              type="radio"
                              name="variant"
                              value={variant.id}
                              checked={selectedVariant?.id === variant.id}
                              onChange={() => setSelectedVariant(variant)}
                              className="mr-3"
                              data-testid={`${selectedService.name.toLowerCase()}-variant`}
                            />
                            <div className="flex-1">
                              <p className="font-medium text-gray-900">{variant.variant_name}</p>
                              <p className="text-sm text-gray-600">
                                {formatCurrency(variant.base_price)} per {selectedService.unit}
                              </p>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Quantity Input */}
                  {selectedService && (
                    <div>
                      <label htmlFor="service-quantity" className="form-label">
                        Quantity ({selectedService.unit})
                      </label>
                      <input
                        id="service-quantity"
                        type="number"
                        min="0.1"
                        step={selectedService.unit === 'piece' ? '1' : '0.1'}
                        value={quantity}
                        onChange={(e) => setQuantity(Number(e.target.value))}
                        className="form-input"
                        data-testid="service-quantity"
                      />
                      {selectedService.min_qty > 0 && quantity < selectedService.min_qty && (
                        <p className="form-help text-orange-600" data-testid="min-quantity-warning">
                          Minimum quantity is {selectedService.min_qty}{selectedService.unit}. You will be charged for {selectedService.min_qty}{selectedService.unit}.
                        </p>
                      )}
                    </div>
                  )}

                  {/* Add-ons Selection */}
                  {addons.length > 0 && selectedService && (
                    <div>
                      <label className="form-label">Add-ons (Optional)</label>
                      <div className="space-y-2 max-h-32 overflow-y-auto">
                        {addons.map((addon) => (
                          <div key={addon.id} className="flex items-center justify-between p-2 border border-gray-200 rounded">
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-900">{addon.name}</p>
                              <p className="text-xs text-gray-600">
                                {formatCurrency(addon.price)} per {addon.unit || 'item'}
                              </p>
                            </div>
                            <input
                              type="number"
                              min="0"
                              value={selectedAddons[addon.id] || 0}
                              onChange={(e) => setSelectedAddons(prev => ({
                                ...prev,
                                [addon.id]: Number(e.target.value)
                              }))}
                              className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
                              data-testid={`addon-quantity-${addon.name.toLowerCase().replace(/\s+/g, '-')}`}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Price Preview */}
                  {selectedService && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="text-sm font-medium text-gray-900 mb-2">Price Calculation</h4>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span>Base Amount:</span>
                          <span>{formatCurrency(calculateAmount())}</span>
                        </div>
                        {Object.entries(selectedAddons).some(([_, qty]) => qty > 0) && (
                          <div className="flex justify-between">
                            <span>Add-ons:</span>
                            <span>
                              {formatCurrency(
                                Object.entries(selectedAddons)
                                  .reduce((sum, [addonId, qty]) => {
                                    const addon = addons.find(a => a.id === parseInt(addonId));
                                    return sum + (addon ? addon.price * qty : 0);
                                  }, 0)
                              )}
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between font-medium pt-1 border-t border-gray-200">
                          <span>Total:</span>
                          <span>
                            {formatCurrency(
                              calculateAmount() +
                              Object.entries(selectedAddons)
                                .reduce((sum, [addonId, qty]) => {
                                  const addon = addons.find(a => a.id === parseInt(addonId));
                                  return sum + (addon ? addon.price * qty : 0);
                                }, 0)
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex space-x-3 mt-6">
                  <button
                    onClick={() => setShowAddService(false)}
                    className="btn btn-secondary btn-md flex-1"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddToInvoice}
                    disabled={!selectedService}
                    className="btn btn-primary btn-md flex-1"
                    data-testid="add-to-invoice"
                  >
                    Add to Invoice
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}