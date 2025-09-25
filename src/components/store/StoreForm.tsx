import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { invoke } from '@tauri-apps/api/tauri';
import { useApp } from '@/contexts/AppContext';
import { Store } from '@/types';

interface StoreFormData {
  name: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  email: string;
  gstin: string;
  panNumber: string;
  ownerName: string;
  isActive: boolean;
}

interface ValidationErrors {
  name?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  phone?: string;
  email?: string;
  gstin?: string;
  panNumber?: string;
  ownerName?: string;
}

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry'
];

export function StoreForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { showNotification, setLoading } = useApp();

  const [formData, setFormData] = useState<StoreFormData>({
    name: '',
    address: '',
    city: '',
    state: INDIAN_STATES[0],
    pincode: '',
    phone: '',
    email: '',
    gstin: '',
    panNumber: '',
    ownerName: '',
    isActive: true,
  });

  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (id && id !== 'new') {
      loadStore(parseInt(id));
    }
  }, [id]);

  const loadStore = async (storeId: number) => {
    try {
      setLoading(true);
      const store = await invoke<Store>('get_store_by_id', { storeId });
      setFormData({
        name: store.name || '',
        address: store.address || '',
        city: store.city || '',
        state: store.state || INDIAN_STATES[0],
        pincode: store.pincode || '',
        phone: store.phone || '',
        email: store.email || '',
        gstin: store.gstin || '',
        panNumber: store.pan_number || '',
        ownerName: store.owner_name || '',
        isActive: store.is_active !== false,
      });
    } catch (error) {
      showNotification({
        type: 'error',
        title: 'Load Failed',
        message: `Failed to load store: ${error}`,
      });
      navigate('/stores');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const errors: ValidationErrors = {};

    // Name validation
    if (!formData.name.trim()) {
      errors.name = 'Store name is required';
    } else if (formData.name.trim().length < 3) {
      errors.name = 'Store name must be at least 3 characters';
    } else if (formData.name.trim().length > 100) {
      errors.name = 'Store name must be less than 100 characters';
    }

    // Address validation
    if (!formData.address.trim()) {
      errors.address = 'Address is required';
    } else if (formData.address.trim().length < 10) {
      errors.address = 'Please provide a complete address';
    }

    // City validation
    if (!formData.city.trim()) {
      errors.city = 'City is required';
    }

    // State validation
    if (!formData.state.trim()) {
      errors.state = 'State is required';
    }

    // Pincode validation
    if (!formData.pincode.trim()) {
      errors.pincode = 'Pincode is required';
    } else if (!/^[1-9][0-9]{5}$/.test(formData.pincode)) {
      errors.pincode = 'Please enter a valid 6-digit pincode';
    }

    // Phone validation
    if (formData.phone.trim()) {
      const phoneRegex = /^[6-9]\d{9}$/;
      if (!phoneRegex.test(formData.phone.replace(/\s+/g, ''))) {
        errors.phone = 'Please enter a valid 10-digit Indian mobile number';
      }
    }

    // Email validation
    if (formData.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        errors.email = 'Please enter a valid email address';
      }
    }

    // GSTIN validation
    if (formData.gstin.trim()) {
      const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
      if (!gstinRegex.test(formData.gstin.toUpperCase())) {
        errors.gstin = 'Please enter a valid 15-character GSTIN';
      }
    }

    // PAN validation
    if (formData.panNumber.trim()) {
      const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
      if (!panRegex.test(formData.panNumber.toUpperCase())) {
        errors.panNumber = 'Please enter a valid 10-character PAN number';
      }
    }

    // Owner name validation
    if (formData.ownerName.trim() && formData.ownerName.trim().length < 2) {
      errors.ownerName = 'Owner name must be at least 2 characters';
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

      const storeData = {
        name: formData.name.trim(),
        address: formData.address.trim(),
        city: formData.city.trim(),
        state: formData.state.trim(),
        pincode: formData.pincode.trim(),
        phone: formData.phone.trim() || null,
        email: formData.email.trim() || null,
        gstin: formData.gstin.trim().toUpperCase() || null,
        pan_number: formData.panNumber.trim().toUpperCase() || null,
        owner_name: formData.ownerName.trim() || null,
        is_active: formData.isActive,
      };

      let store: Store;
      if (id && id !== 'new') {
        store = await invoke<Store>('update_store', {
          storeId: parseInt(id),
          request: storeData,
        });
      } else {
        store = await invoke<Store>('create_store', {
          request: storeData,
        });
      }

      showNotification({
        type: 'success',
        title: 'Store Saved',
        message: `${store.name} has been ${id && id !== 'new' ? 'updated' : 'created'} successfully`,
      });

      navigate('/stores');
    } catch (error) {
      showNotification({
        type: 'error',
        title: 'Save Failed',
        message: `Failed to save store: ${error}`,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof StoreFormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    // Clear validation error when user starts typing
    if (typeof value === 'string' && validationErrors[field as keyof ValidationErrors]) {
      setValidationErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const formatPhoneNumber = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 10) {
      return numbers;
    }
    return numbers.slice(0, 10);
  };

  const formatPincode = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 6) {
      return numbers;
    }
    return numbers.slice(0, 6);
  };

  return (
    <div className="space-y-6" data-testid="store-form">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {id && id !== 'new' ? 'Edit Store' : 'Add New Store'}
          </h1>
          <p className="text-gray-600 mt-1">
            {id && id !== 'new' ? 'Update store information and settings' : 'Add a new store location to your business'}
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigate('/stores')}
            className="btn btn-secondary btn-md"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="btn btn-primary btn-md"
            data-testid="save-store"
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
                {id && id !== 'new' ? 'Update Store' : 'Save Store'}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Form */}
      <div className="bg-white rounded-xl shadow-soft">
        <form onSubmit={handleSubmit} className="p-6 space-y-8">
          {/* Basic Information */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label htmlFor="store-name" className="form-label">
                  Store Name *
                </label>
                <input
                  id="store-name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className={`form-input ${validationErrors.name ? 'border-error-500' : ''}`}
                  placeholder="e.g., UClean Express - Downtown"
                  data-testid="store-name-input"
                />
                {validationErrors.name && (
                  <p className="form-error" data-testid="name-error">{validationErrors.name}</p>
                )}
              </div>

              <div>
                <label htmlFor="owner-name" className="form-label">
                  Owner Name
                </label>
                <input
                  id="owner-name"
                  type="text"
                  value={formData.ownerName}
                  onChange={(e) => handleInputChange('ownerName', e.target.value)}
                  className={`form-input ${validationErrors.ownerName ? 'border-error-500' : ''}`}
                  placeholder="Store owner's full name"
                  data-testid="owner-name-input"
                />
                {validationErrors.ownerName && (
                  <p className="form-error">{validationErrors.ownerName}</p>
                )}
              </div>

              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => handleInputChange('isActive', e.target.checked)}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    data-testid="store-active-checkbox"
                  />
                  <span className="ml-2 text-sm text-gray-700">Store is active and operational</span>
                </label>
              </div>
            </div>
          </div>

          {/* Address Information */}
          <div className="border-t border-gray-200 pt-8">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Address Information</h3>
            <div className="grid grid-cols-1 gap-6">
              <div>
                <label htmlFor="store-address" className="form-label">
                  Street Address *
                </label>
                <textarea
                  id="store-address"
                  value={formData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  className={`form-input ${validationErrors.address ? 'border-error-500' : ''}`}
                  rows={3}
                  placeholder="Complete street address with building number, street name, landmarks"
                  data-testid="store-address-input"
                />
                {validationErrors.address && (
                  <p className="form-error" data-testid="address-error">{validationErrors.address}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label htmlFor="store-city" className="form-label">
                    City *
                  </label>
                  <input
                    id="store-city"
                    type="text"
                    value={formData.city}
                    onChange={(e) => handleInputChange('city', e.target.value)}
                    className={`form-input ${validationErrors.city ? 'border-error-500' : ''}`}
                    placeholder="City name"
                    data-testid="store-city-input"
                  />
                  {validationErrors.city && (
                    <p className="form-error">{validationErrors.city}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="store-state" className="form-label">
                    State *
                  </label>
                  <select
                    id="store-state"
                    value={formData.state}
                    onChange={(e) => handleInputChange('state', e.target.value)}
                    className={`form-input ${validationErrors.state ? 'border-error-500' : ''}`}
                    data-testid="store-state-select"
                  >
                    {INDIAN_STATES.map(state => (
                      <option key={state} value={state}>{state}</option>
                    ))}
                  </select>
                  {validationErrors.state && (
                    <p className="form-error">{validationErrors.state}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="store-pincode" className="form-label">
                    Pincode *
                  </label>
                  <input
                    id="store-pincode"
                    type="text"
                    value={formData.pincode}
                    onChange={(e) => handleInputChange('pincode', formatPincode(e.target.value))}
                    className={`form-input ${validationErrors.pincode ? 'border-error-500' : ''}`}
                    placeholder="6-digit pincode"
                    data-testid="store-pincode-input"
                  />
                  {validationErrors.pincode && (
                    <p className="form-error">{validationErrors.pincode}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="border-t border-gray-200 pt-8">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Contact Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="store-phone" className="form-label">
                  Phone Number
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 text-sm">+91</span>
                  </div>
                  <input
                    id="store-phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', formatPhoneNumber(e.target.value))}
                    className={`form-input pl-12 ${validationErrors.phone ? 'border-error-500' : ''}`}
                    placeholder="10-digit mobile number"
                    data-testid="store-phone-input"
                  />
                </div>
                {validationErrors.phone && (
                  <p className="form-error">{validationErrors.phone}</p>
                )}
              </div>

              <div>
                <label htmlFor="store-email" className="form-label">
                  Email Address
                </label>
                <input
                  id="store-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className={`form-input ${validationErrors.email ? 'border-error-500' : ''}`}
                  placeholder="store@example.com"
                  data-testid="store-email-input"
                />
                {validationErrors.email && (
                  <p className="form-error">{validationErrors.email}</p>
                )}
              </div>
            </div>
          </div>

          {/* Business Information */}
          <div className="border-t border-gray-200 pt-8">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Business Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="store-gstin" className="form-label">
                  GSTIN
                </label>
                <input
                  id="store-gstin"
                  type="text"
                  value={formData.gstin}
                  onChange={(e) => handleInputChange('gstin', e.target.value.toUpperCase())}
                  className={`form-input font-mono ${validationErrors.gstin ? 'border-error-500' : ''}`}
                  placeholder="15-character GSTIN"
                  maxLength={15}
                  data-testid="store-gstin-input"
                />
                {validationErrors.gstin && (
                  <p className="form-error">{validationErrors.gstin}</p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  Format: 22AAAAA0000A1Z5 (Optional for unregistered businesses)
                </p>
              </div>

              <div>
                <label htmlFor="store-pan" className="form-label">
                  PAN Number
                </label>
                <input
                  id="store-pan"
                  type="text"
                  value={formData.panNumber}
                  onChange={(e) => handleInputChange('panNumber', e.target.value.toUpperCase())}
                  className={`form-input font-mono ${validationErrors.panNumber ? 'border-error-500' : ''}`}
                  placeholder="10-character PAN"
                  maxLength={10}
                  data-testid="store-pan-input"
                />
                {validationErrors.panNumber && (
                  <p className="form-error">{validationErrors.panNumber}</p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  Format: ABCDE1234F
                </p>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="border-t border-gray-200 pt-8">
            <div className="flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={() => navigate('/stores')}
                className="btn btn-secondary btn-md"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn btn-primary btn-md"
                data-testid="submit-store-form"
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
                    {id && id !== 'new' ? 'Update Store' : 'Save Store'}
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Help Tips */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="w-5 h-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">Store Setup Tips</h3>
            <div className="mt-2 text-sm text-blue-700">
              <ul className="list-disc pl-5 space-y-1">
                <li>Only store name and complete address are required fields</li>
                <li>GSTIN is required for GST-registered businesses to generate valid invoices</li>
                <li>Phone and email will be used for customer communication</li>
                <li>Multiple stores can share the same GSTIN if they are branches of the same business</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}