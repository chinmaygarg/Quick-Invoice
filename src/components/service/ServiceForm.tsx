import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { invoke } from '@tauri-apps/api/tauri';
import { useApp } from '@/contexts/AppContext';
import { Service, ServiceCategory, ServiceVariant, ServiceAddon } from '@/types';

interface ServiceFormData {
  name: string;
  category: string;
  description: string;
  basePrice: number;
  gstRate: number;
  unit: string;
  minQuantity: number;
  isActive: boolean;
  variants: ServiceVariant[];
  addons: ServiceAddon[];
}

interface ValidationErrors {
  name?: string;
  category?: string;
  basePrice?: string;
  gstRate?: string;
  unit?: string;
  minQuantity?: string;
  variants?: Record<number, Record<string, string>>;
  addons?: Record<number, Record<string, string>>;
}

const COMMON_UNITS = [
  'piece',
  'kg',
  'pair',
  'set',
  'meter',
  'sq ft',
  'item',
];

const GST_RATES = [0, 5, 12, 18, 28];

export function ServiceForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { showNotification } = useApp();

  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [formData, setFormData] = useState<ServiceFormData>({
    name: '',
    category: '',
    description: '',
    basePrice: 0,
    gstRate: 18,
    unit: 'piece',
    minQuantity: 1,
    isActive: true,
    variants: [],
    addons: [],
  });

  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'basic' | 'variants' | 'addons'>('basic');
  const [loading, setLoadingLocal] = useState(true);

  // Load categories and service data together
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoadingLocal(true);

        // Load categories first
        const categoriesData = await invoke<ServiceCategory[]>('get_service_categories');
        setCategories(categoriesData);

        // Then load service if editing
        if (id && id !== 'new') {
          const serviceId = parseInt(id);
          if (isNaN(serviceId)) {
            throw new Error('Invalid service ID');
          }

          const [service, variants, addons] = await Promise.all([
            invoke<Service>('get_service_by_id', { serviceId }),
            invoke<ServiceVariant[]>('get_service_variants', { serviceId }),
            invoke<ServiceAddon[]>('get_service_addons', { serviceId })
          ]);

          if (!service) {
            throw new Error('Service not found');
          }

          setFormData({
            name: service.name || '',
            category: service.category || (categoriesData.length > 0 ? categoriesData[0].name : ''),
            description: service.description || '',
            basePrice: service.base_price || 0,
            gstRate: service.gst_rate || 18,
            unit: service.unit || 'piece',
            minQuantity: service.min_quantity || 1,
            isActive: Boolean(service.is_active),
            variants: (variants || []).map(v => ({
              ...v,
              isActive: Boolean(v.is_active)
            })),
            addons: (addons || []).map(a => ({
              ...a,
              isActive: Boolean(a.is_active)
            })),
          });
        } else if (categoriesData.length > 0) {
          // New service - set default category
          setFormData(prev => ({ ...prev, category: categoriesData[0].name }));
        }
      } catch (error) {
        console.error('Failed to load data:', error);
        showNotification({
          type: 'error',
          title: 'Load Failed',
          message: `Failed to load data: ${error}`,
        });
        if (id && id !== 'new') {
          navigate('/services');
        }
      } finally {
        setLoadingLocal(false);
      }
    };

    loadData();
  }, [id, showNotification, navigate]);


  const validateForm = (): boolean => {
    const errors: ValidationErrors = {};

    // Basic validation
    if (!formData.name.trim()) {
      errors.name = 'Service name is required';
    } else if (formData.name.trim().length < 3) {
      errors.name = 'Service name must be at least 3 characters';
    }

    if (!formData.category.trim()) {
      errors.category = 'Category is required';
    }

    if (formData.basePrice <= 0) {
      errors.basePrice = 'Base price must be greater than 0';
    } else if (formData.basePrice > 100000) {
      errors.basePrice = 'Base price cannot exceed ₹1,00,000';
    }

    if (!GST_RATES.includes(formData.gstRate)) {
      errors.gstRate = 'Please select a valid GST rate';
    }

    if (!formData.unit.trim()) {
      errors.unit = 'Unit is required';
    }

    if (formData.minQuantity < 1 || formData.minQuantity > 100) {
      errors.minQuantity = 'Minimum quantity must be between 1 and 100';
    }

    // Variant validation
    const variantErrors: Record<number, Record<string, string>> = {};
    formData.variants.forEach((variant, index) => {
      const variantError: Record<string, string> = {};

      if (!variant.name.trim()) {
        variantError.name = 'Variant name is required';
      }

      if ((variant.priceMultiplier || 0) <= 0 || (variant.priceMultiplier || 0) > 10) {
        variantError.priceMultiplier = 'Price multiplier must be between 0.1 and 10';
      }

      if (Object.keys(variantError).length > 0) {
        variantErrors[index] = variantError;
      }
    });

    if (Object.keys(variantErrors).length > 0) {
      errors.variants = variantErrors;
    }

    // Addon validation
    const addonErrors: Record<number, Record<string, string>> = {};
    formData.addons.forEach((addon, index) => {
      const addonError: Record<string, string> = {};

      if (!addon.name.trim()) {
        addonError.name = 'Addon name is required';
      }

      if (addon.price <= 0) {
        addonError.price = 'Price must be greater than 0';
      }

      if (!(addon.unit || '').trim()) {
        addonError.unit = 'Unit is required';
      }

      if (Object.keys(addonError).length > 0) {
        addonErrors[index] = addonError;
      }
    });

    if (Object.keys(addonErrors).length > 0) {
      errors.addons = addonErrors;
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

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

      const serviceData = {
        name: formData.name.trim(),
        category: formData.category.trim(),
        description: formData.description.trim() || null,
        base_price: formData.basePrice,
        gst_rate: formData.gstRate,
        unit: formData.unit.trim(),
        min_quantity: formData.minQuantity,
        is_active: formData.isActive,
        variants: formData.variants.map(v => ({
          name: v.name.trim(),
          description: (v.description || '').trim() || null,
          price_multiplier: v.priceMultiplier,
          is_active: v.isActive,
        })),
        addons: formData.addons.map(a => ({
          name: a.name.trim(),
          description: (a.description || '').trim() || null,
          price: a.price,
          unit: (a.unit || '').trim(),
          is_active: a.isActive,
        })),
      };

      let service: Service;
      if (id && id !== 'new') {
        service = await invoke<Service>('update_service', {
          serviceId: parseInt(id),
          request: serviceData,
        });
      } else {
        service = await invoke<Service>('create_service', {
          request: serviceData,
        });
      }

      showNotification({
        type: 'success',
        title: 'Service Saved',
        message: `${service.name} has been ${id && id !== 'new' ? 'updated' : 'created'} successfully`,
      });

      navigate('/services');
    } catch (error) {
      showNotification({
        type: 'error',
        title: 'Save Failed',
        message: `Failed to save service: ${error}`,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const addVariant = () => {
    const newVariant: ServiceVariant = {
      id: 0,
      service_id: 0,
      name: '',
      description: '',
      priceMultiplier: 1,
      price_modifier: 1,
      is_percentage: false,
      is_active: true,
      isActive: true,
      created_at: '',
      updated_at: '',
    };

    setFormData(prev => ({
      ...prev,
      variants: [...prev.variants, newVariant],
    }));
    setActiveTab('variants');
  };

  const removeVariant = (index: number) => {
    setFormData(prev => ({
      ...prev,
      variants: prev.variants.filter((_, i) => i !== index),
    }));
  };

  const updateVariant = (index: number, field: keyof ServiceVariant, value: any) => {
    setFormData(prev => ({
      ...prev,
      variants: prev.variants.map((variant, i) =>
        i === index ? { ...variant, [field]: value } : variant
      ),
    }));
  };

  const addAddon = () => {
    const newAddon: ServiceAddon = {
      id: 0,
      service_id: 0,
      name: '',
      description: '',
      price: 0,
      unit: 'piece',
      is_active: true,
      isActive: true,
      created_at: '',
      updated_at: '',
    };

    setFormData(prev => ({
      ...prev,
      addons: [...prev.addons, newAddon],
    }));
    setActiveTab('addons');
  };

  const removeAddon = (index: number) => {
    setFormData(prev => ({
      ...prev,
      addons: prev.addons.filter((_, i) => i !== index),
    }));
  };

  const updateAddon = (index: number, field: keyof ServiceAddon, value: any) => {
    setFormData(prev => ({
      ...prev,
      addons: prev.addons.map((addon, i) =>
        i === index ? { ...addon, [field]: value } : addon
      ),
    }));
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (loading || categories.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">
            {id && id !== 'new' ? 'Edit Service' : 'Add New Service'}
          </h1>
        </div>
        <div className="bg-white rounded-xl shadow-soft p-6">
          <div className="animate-pulse space-y-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <div className="bg-gray-200 h-4 w-32 rounded"></div>
                <div className="bg-gray-200 h-4 w-24 rounded"></div>
                <div className="bg-gray-200 h-4 w-20 rounded"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="service-form">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {id && id !== 'new' ? 'Edit Service' : 'Add New Service'}
          </h1>
          <p className="text-gray-600 mt-1">
            {id && id !== 'new' ? 'Update service details and pricing' : 'Create a new service for your catalog'}
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigate('/services')}
            className="btn btn-secondary btn-md"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="btn btn-primary btn-md"
            data-testid="save-service"
          >
            {isSubmitting ? (
              <>
                <div className="spinner w-4 h-4 mr-2" />
                {id && id !== 'new' ? 'Updating...' : 'Creating...'}
              </>
            ) : (
              <>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {id && id !== 'new' ? 'Update Service' : 'Save Service'}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-soft overflow-hidden">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'basic', label: 'Basic Details', count: null },
              { id: 'variants', label: 'Variants', count: formData.variants.length },
              { id: 'addons', label: 'Add-ons', count: formData.addons.length },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
                data-testid={`tab-${tab.id}`}
              >
                {tab.label}
                {tab.count !== null && tab.count > 0 && (
                  <span className="ml-2 bg-gray-100 text-gray-600 py-0.5 px-2 rounded-full text-xs">
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'basic' && (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label htmlFor="service-name" className="form-label">
                    Service Name *
                  </label>
                  <input
                    id="service-name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className={`form-input ${validationErrors.name ? 'border-error-500' : ''}`}
                    placeholder="e.g., Shirt Dry Clean, Saree Wash & Fold"
                    data-testid="service-name-input"
                  />
                  {validationErrors.name && (
                    <p className="form-error" data-testid="name-error">{validationErrors.name}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="service-category" className="form-label">
                    Category *
                  </label>
                  <select
                    id="service-category"
                    value={formData.category}
                    onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                    className={`form-input ${validationErrors.category ? 'border-error-500' : ''}`}
                    data-testid="service-category-select"
                  >
                    {categories.map(category => (
                      <option key={category.id} value={category.name}>{category.name}</option>
                    ))}
                  </select>
                  {validationErrors.category && (
                    <p className="form-error">{validationErrors.category}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="service-unit" className="form-label">
                    Unit *
                  </label>
                  <select
                    id="service-unit"
                    value={formData.unit}
                    onChange={(e) => setFormData(prev => ({ ...prev, unit: e.target.value }))}
                    className={`form-input ${validationErrors.unit ? 'border-error-500' : ''}`}
                    data-testid="service-unit-select"
                  >
                    {COMMON_UNITS.map(unit => (
                      <option key={unit} value={unit}>{unit}</option>
                    ))}
                  </select>
                  {validationErrors.unit && (
                    <p className="form-error">{validationErrors.unit}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="base-price" className="form-label">
                    Base Price (₹) *
                  </label>
                  <input
                    id="base-price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.basePrice}
                    onChange={(e) => setFormData(prev => ({ ...prev, basePrice: parseFloat(e.target.value) || 0 }))}
                    className={`form-input ${validationErrors.basePrice ? 'border-error-500' : ''}`}
                    placeholder="0.00"
                    data-testid="base-price-input"
                  />
                  {validationErrors.basePrice && (
                    <p className="form-error">{validationErrors.basePrice}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="gst-rate" className="form-label">
                    GST Rate (%) *
                  </label>
                  <select
                    id="gst-rate"
                    value={formData.gstRate}
                    onChange={(e) => setFormData(prev => ({ ...prev, gstRate: parseInt(e.target.value) }))}
                    className={`form-input ${validationErrors.gstRate ? 'border-error-500' : ''}`}
                    data-testid="gst-rate-select"
                  >
                    {GST_RATES.map(rate => (
                      <option key={rate} value={rate}>{rate}%</option>
                    ))}
                  </select>
                  {validationErrors.gstRate && (
                    <p className="form-error">{validationErrors.gstRate}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="min-quantity" className="form-label">
                    Minimum Quantity *
                  </label>
                  <input
                    id="min-quantity"
                    type="number"
                    min="1"
                    max="100"
                    value={formData.minQuantity}
                    onChange={(e) => setFormData(prev => ({ ...prev, minQuantity: parseInt(e.target.value) || 1 }))}
                    className={`form-input ${validationErrors.minQuantity ? 'border-error-500' : ''}`}
                    data-testid="min-quantity-input"
                  />
                  {validationErrors.minQuantity && (
                    <p className="form-error">{validationErrors.minQuantity}</p>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label htmlFor="service-description" className="form-label">
                    Description
                  </label>
                  <textarea
                    id="service-description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    className="form-input"
                    rows={3}
                    placeholder="Brief description of the service"
                    data-testid="service-description-input"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      data-testid="service-active-checkbox"
                    />
                    <span className="ml-2 text-sm text-gray-700">Service is active and available for booking</span>
                  </label>
                </div>
              </div>

              {/* Preview */}
              {formData.name && formData.basePrice > 0 && (
                <div className="border-t border-gray-200 pt-6">
                  <h3 className="text-sm font-medium text-gray-900 mb-3">Preview</h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900">{formData.name}</h4>
                        <p className="text-sm text-gray-600">{formData.category}</p>
                        {formData.description && (
                          <p className="text-sm text-gray-500 mt-1">{formData.description}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-gray-900">{formatCurrency(formData.basePrice)}</div>
                        <div className="text-sm text-gray-500">per {formData.unit}</div>
                        <div className="text-xs text-gray-500">GST: {formData.gstRate}%</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </form>
          )}

          {activeTab === 'variants' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Service Variants</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Create different pricing for material types, sizes, or service levels
                  </p>
                </div>
                <button
                  onClick={addVariant}
                  className="btn btn-primary btn-sm"
                  data-testid="add-variant"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Add Variant
                </button>
              </div>

              {formData.variants.length === 0 ? (
                <div className="text-center py-8">
                  <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  <h3 className="text-sm font-medium text-gray-900 mb-2">No variants added</h3>
                  <p className="text-sm text-gray-500 mb-4">
                    Add variants to offer different pricing for material types or service levels
                  </p>
                  <button
                    onClick={addVariant}
                    className="btn btn-primary btn-sm"
                  >
                    Add First Variant
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {formData.variants.map((variant, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4" data-testid="variant-item">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                          <label className="form-label">Variant Name *</label>
                          <input
                            type="text"
                            value={variant.name}
                            onChange={(e) => updateVariant(index, 'name', e.target.value)}
                            className={`form-input ${validationErrors.variants?.[index]?.name ? 'border-error-500' : ''}`}
                            placeholder="e.g., Cotton, Silk"
                          />
                          {validationErrors.variants?.[index]?.name && (
                            <p className="form-error">{validationErrors.variants[index].name}</p>
                          )}
                        </div>
                        <div>
                          <label className="form-label">Price Multiplier *</label>
                          <input
                            type="number"
                            min="0.1"
                            max="10"
                            step="0.1"
                            value={variant.priceMultiplier}
                            onChange={(e) => updateVariant(index, 'priceMultiplier', parseFloat(e.target.value) || 1)}
                            className={`form-input ${validationErrors.variants?.[index]?.priceMultiplier ? 'border-error-500' : ''}`}
                          />
                          {validationErrors.variants?.[index]?.priceMultiplier && (
                            <p className="form-error">{validationErrors.variants[index].priceMultiplier}</p>
                          )}
                        </div>
                        <div>
                          <label className="form-label">Final Price</label>
                          <div className="form-input bg-gray-50 font-medium">
                            {formatCurrency(formData.basePrice * (variant.priceMultiplier || 1))}
                          </div>
                        </div>
                        <div className="flex items-end space-x-2">
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={variant.isActive}
                              onChange={(e) => updateVariant(index, 'isActive', e.target.checked)}
                              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                            />
                            <span className="ml-2 text-sm text-gray-700">Active</span>
                          </label>
                          <button
                            onClick={() => removeVariant(index)}
                            className="btn btn-error btn-sm"
                            data-testid={`remove-variant-${index}`}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                      <div className="mt-4">
                        <label className="form-label">Description</label>
                        <input
                          type="text"
                          value={variant.description}
                          onChange={(e) => updateVariant(index, 'description', e.target.value)}
                          className="form-input"
                          placeholder="Brief description of this variant"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'addons' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Service Add-ons</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Optional services that can be added to enhance the main service
                  </p>
                </div>
                <button
                  onClick={addAddon}
                  className="btn btn-primary btn-sm"
                  data-testid="add-addon"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Add Add-on
                </button>
              </div>

              {formData.addons.length === 0 ? (
                <div className="text-center py-8">
                  <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  <h3 className="text-sm font-medium text-gray-900 mb-2">No add-ons available</h3>
                  <p className="text-sm text-gray-500 mb-4">
                    Add optional services like stain removal, express delivery, or special care
                  </p>
                  <button
                    onClick={addAddon}
                    className="btn btn-primary btn-sm"
                  >
                    Add First Add-on
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {formData.addons.map((addon, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4" data-testid="addon-item">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                          <label className="form-label">Add-on Name *</label>
                          <input
                            type="text"
                            value={addon.name}
                            onChange={(e) => updateAddon(index, 'name', e.target.value)}
                            className={`form-input ${validationErrors.addons?.[index]?.name ? 'border-error-500' : ''}`}
                            placeholder="e.g., Stain Removal"
                          />
                          {validationErrors.addons?.[index]?.name && (
                            <p className="form-error">{validationErrors.addons[index].name}</p>
                          )}
                        </div>
                        <div>
                          <label className="form-label">Price (₹) *</label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={addon.price}
                            onChange={(e) => updateAddon(index, 'price', parseFloat(e.target.value) || 0)}
                            className={`form-input ${validationErrors.addons?.[index]?.price ? 'border-error-500' : ''}`}
                          />
                          {validationErrors.addons?.[index]?.price && (
                            <p className="form-error">{validationErrors.addons[index].price}</p>
                          )}
                        </div>
                        <div>
                          <label className="form-label">Unit *</label>
                          <select
                            value={addon.unit}
                            onChange={(e) => updateAddon(index, 'unit', e.target.value)}
                            className={`form-input ${validationErrors.addons?.[index]?.unit ? 'border-error-500' : ''}`}
                          >
                            {COMMON_UNITS.map(unit => (
                              <option key={unit} value={unit}>{unit}</option>
                            ))}
                          </select>
                          {validationErrors.addons?.[index]?.unit && (
                            <p className="form-error">{validationErrors.addons[index].unit}</p>
                          )}
                        </div>
                        <div className="flex items-end space-x-2">
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={addon.isActive}
                              onChange={(e) => updateAddon(index, 'isActive', e.target.checked)}
                              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                            />
                            <span className="ml-2 text-sm text-gray-700">Active</span>
                          </label>
                          <button
                            onClick={() => removeAddon(index)}
                            className="btn btn-error btn-sm"
                            data-testid={`remove-addon-${index}`}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                      <div className="mt-4">
                        <label className="form-label">Description</label>
                        <input
                          type="text"
                          value={addon.description}
                          onChange={(e) => updateAddon(index, 'description', e.target.value)}
                          className="form-input"
                          placeholder="Brief description of this add-on service"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Quick Tips */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="w-5 h-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">Service Setup Tips</h3>
            <div className="mt-2 text-sm text-blue-700">
              <ul className="list-disc pl-5 space-y-1">
                <li>Use variants for different material types (Cotton, Silk, Synthetic)</li>
                <li>Add-ons are perfect for optional services like stain removal or express delivery</li>
                <li>Set competitive base prices and use multipliers for premium variants</li>
                <li>Minimum quantity helps manage operational efficiency</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}