import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { invoke } from '@tauri-apps/api/tauri';
import { useApp } from '@/contexts/AppContext';
import { Customer } from '@/types';

interface CustomerFormData {
  name: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
}

interface ValidationErrors {
  name?: string;
  phone?: string;
  email?: string;
  address?: string;
}

export function CustomerForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { showNotification, setLoading } = useApp();

  const [formData, setFormData] = useState<CustomerFormData>({
    name: '',
    phone: '',
    email: '',
    address: '',
    notes: '',
  });

  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (id && id !== 'new') {
      loadCustomer(parseInt(id));
    }
  }, [id]);

  const loadCustomer = async (customerId: number) => {
    try {
      setLoading(true);
      const customer = await invoke<Customer>('get_customer_by_id', { customerId });
      setFormData({
        name: customer.name || '',
        phone: customer.phone || '',
        email: customer.email || '',
        address: customer.address || '',
        notes: customer.notes || '',
      });
    } catch (error) {
      showNotification({
        type: 'error',
        title: 'Load Failed',
        message: `Failed to load customer: ${error}`,
      });
      navigate('/customers');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const errors: ValidationErrors = {};

    // Name validation
    if (!formData.name.trim()) {
      errors.name = 'Customer name is required';
    } else if (formData.name.trim().length < 2) {
      errors.name = 'Customer name must be at least 2 characters';
    } else if (formData.name.trim().length > 100) {
      errors.name = 'Customer name must be less than 100 characters';
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

    // Address validation
    if (formData.address.trim() && formData.address.trim().length > 500) {
      errors.address = 'Address must be less than 500 characters';
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

      const customerData = {
        name: formData.name.trim(),
        phone: formData.phone.trim() || null,
        email: formData.email.trim() || null,
        address: formData.address.trim() || null,
        notes: formData.notes.trim() || null,
      };

      let customer: Customer;
      if (id && id !== 'new') {
        // Update existing customer
        customer = await invoke<Customer>('update_customer', {
          customerId: parseInt(id),
          request: customerData,
        });
      } else {
        // Create new customer
        customer = await invoke<Customer>('create_customer', {
          request: customerData,
        });
      }

      showNotification({
        type: 'success',
        title: 'Customer Saved',
        message: `${customer.name} has been ${id && id !== 'new' ? 'updated' : 'created'} successfully`,
      });

      navigate('/customers');
    } catch (error) {
      showNotification({
        type: 'error',
        title: 'Save Failed',
        message: `Failed to save customer: ${error}`,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof CustomerFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    // Clear validation error when user starts typing
    if (validationErrors[field as keyof ValidationErrors]) {
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

  return (
    <div className="space-y-6" data-testid="customer-form">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {id && id !== 'new' ? 'Edit Customer' : 'Add New Customer'}
          </h1>
          <p className="text-gray-600 mt-1">
            {id && id !== 'new' ? 'Update customer information' : 'Add a new customer to your database'}
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigate('/customers')}
            className="btn btn-secondary btn-md"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="btn btn-primary btn-md"
            data-testid="save-customer"
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
                {id && id !== 'new' ? 'Update Customer' : 'Save Customer'}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Form */}
      <div className="bg-white rounded-xl shadow-soft">
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Information */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label htmlFor="customer-name" className="form-label">
                  Customer Name *
                </label>
                <input
                  id="customer-name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className={`form-input ${validationErrors.name ? 'border-error-500' : ''}`}
                  placeholder="Enter customer full name"
                  data-testid="customer-name-input"
                />
                {validationErrors.name && (
                  <p className="form-error" data-testid="name-error">{validationErrors.name}</p>
                )}
              </div>

              <div>
                <label htmlFor="customer-phone" className="form-label">
                  Phone Number
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 text-sm">+91</span>
                  </div>
                  <input
                    id="customer-phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', formatPhoneNumber(e.target.value))}
                    className={`form-input pl-12 ${validationErrors.phone ? 'border-error-500' : ''}`}
                    placeholder="10-digit mobile number"
                    data-testid="customer-phone-input"
                  />
                </div>
                {validationErrors.phone && (
                  <p className="form-error" data-testid="phone-error">{validationErrors.phone}</p>
                )}
              </div>

              <div>
                <label htmlFor="customer-email" className="form-label">
                  Email Address
                </label>
                <input
                  id="customer-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className={`form-input ${validationErrors.email ? 'border-error-500' : ''}`}
                  placeholder="customer@example.com"
                  data-testid="customer-email-input"
                />
                {validationErrors.email && (
                  <p className="form-error" data-testid="email-error">{validationErrors.email}</p>
                )}
              </div>
            </div>
          </div>

          {/* Address Information */}
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Address Information</h3>
            <div>
              <label htmlFor="customer-address" className="form-label">
                Full Address
              </label>
              <textarea
                id="customer-address"
                value={formData.address}
                onChange={(e) => handleInputChange('address', e.target.value)}
                className={`form-input ${validationErrors.address ? 'border-error-500' : ''}`}
                rows={4}
                placeholder="Enter complete address with landmarks"
                data-testid="customer-address-input"
              />
              {validationErrors.address && (
                <p className="form-error" data-testid="address-error">{validationErrors.address}</p>
              )}
            </div>
          </div>

          {/* Additional Notes */}
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Additional Notes</h3>
            <div>
              <label htmlFor="customer-notes" className="form-label">
                Notes & Special Instructions
              </label>
              <textarea
                id="customer-notes"
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                className="form-input"
                rows={3}
                placeholder="Any special notes about the customer, preferences, or instructions"
                data-testid="customer-notes-input"
              />
              <p className="text-xs text-gray-500 mt-1">
                Optional: Add any special instructions or preferences for this customer
              </p>
            </div>
          </div>

          {/* Form Actions */}
          <div className="border-t border-gray-200 pt-6">
            <div className="flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={() => navigate('/customers')}
                className="btn btn-secondary btn-md"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn btn-primary btn-md"
                data-testid="submit-customer-form"
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
                    {id && id !== 'new' ? 'Update Customer' : 'Save Customer'}
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
            <h3 className="text-sm font-medium text-blue-800">Tips for Customer Management</h3>
            <div className="mt-2 text-sm text-blue-700">
              <ul className="list-disc pl-5 space-y-1">
                <li>Customer name is the only required field</li>
                <li>Phone number will be used for SMS notifications if available</li>
                <li>Email will be used for invoice delivery if provided</li>
                <li>Complete address helps with pickup and delivery services</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}