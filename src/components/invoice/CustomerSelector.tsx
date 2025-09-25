import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import { useApp } from '@/contexts/AppContext';
import { Customer } from '@/types';

interface CustomerSelectorProps {
  selectedCustomerId: number | null;
  onCustomerSelect: (customerId: number) => void;
  orderSource: string;
  onOrderSourceChange: (orderSource: string) => void;
  deliveryDate: string;
  onDeliveryDateChange: (deliveryDate: string) => void;
  error?: string;
}

export function CustomerSelector({
  selectedCustomerId,
  onCustomerSelect,
  orderSource,
  onOrderSourceChange,
  deliveryDate,
  onDeliveryDateChange,
  error,
}: CustomerSelectorProps) {
  const { state, showNotification } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    phone: '',
    address: '',
  });

  // Load selected customer details
  useEffect(() => {
    if (selectedCustomerId && !selectedCustomer) {
      loadCustomerDetails(selectedCustomerId);
    }
  }, [selectedCustomerId]);

  // Load recent customers on mount
  useEffect(() => {
    if (state.recentCustomers && state.recentCustomers.length > 0) {
      setSearchResults(state.recentCustomers.slice(0, 5));
    }
  }, [state.recentCustomers]);

  const loadCustomerDetails = async (customerId: number) => {
    try {
      const customer = await invoke<Customer>('get_customer_by_id', { customerId });
      setSelectedCustomer(customer);
    } catch (error) {
      console.error('Failed to load customer details:', error);
    }
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);

    if (query.trim().length < 2) {
      setSearchResults(state.recentCustomers?.slice(0, 5) || []);
      return;
    }

    try {
      setIsSearching(true);
      const results = await invoke<Customer[]>('search_customers', {
        query: query.trim(),
        limit: 10,
      });
      setSearchResults(results);
    } catch (error) {
      console.error('Failed to search customers:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleCustomerSelect = (customer: Customer) => {
    setSelectedCustomer(customer);
    onCustomerSelect(customer.id);
    setSearchQuery('');
    setSearchResults(state.recentCustomers?.slice(0, 5) || []);
  };

  const handleCreateNewCustomer = async () => {
    if (!newCustomer.name.trim()) {
      showNotification({
        type: 'error',
        title: 'Validation Error',
        message: 'Customer name is required',
      });
      return;
    }

    try {
      const customer = await invoke<Customer>('create_customer', {
        request: {
          name: newCustomer.name.trim(),
          phone: newCustomer.phone.trim() || null,
          address: newCustomer.address.trim() || null,
        },
      });

      handleCustomerSelect(customer);
      setShowNewCustomerForm(false);
      setNewCustomer({ name: '', phone: '', address: '' });

      showNotification({
        type: 'success',
        title: 'Customer Created',
        message: `${customer.name} has been added to your customer database`,
      });
    } catch (error) {
      showNotification({
        type: 'error',
        title: 'Creation Failed',
        message: `Failed to create customer: ${error}`,
      });
    }
  };

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="text-lg font-semibold text-gray-900">Customer & Order Details</h3>
        <p className="text-sm text-gray-600 mt-1">
          Select a customer and configure order details
        </p>
      </div>

      <div className="card-body space-y-6">
        {/* Selected Customer Display */}
        {selectedCustomer ? (
          <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-lg font-medium text-primary-900" data-testid="customer-name">
                  {selectedCustomer.name}
                </h4>
                {selectedCustomer.phone && (
                  <p className="text-sm text-primary-700" data-testid="customer-phone">
                    📞 {selectedCustomer.phone}
                  </p>
                )}
                {selectedCustomer.address && (
                  <p className="text-sm text-primary-700 mt-1">
                    📍 {selectedCustomer.address}
                  </p>
                )}
              </div>
              <button
                onClick={() => {
                  setSelectedCustomer(null);
                  onCustomerSelect(0);
                }}
                className="text-primary-600 hover:text-primary-700 text-sm font-medium"
              >
                Change
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Customer Search */}
            <div>
              <label htmlFor="customer-search" className="form-label">
                Search Customer
              </label>
              <div className="relative">
                <input
                  id="customer-search"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  placeholder="Start typing customer name or phone..."
                  className={`form-input pr-10 ${error ? 'border-error-500' : ''}`}
                  data-testid="customer-search"
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                  {isSearching ? (
                    <div className="spinner w-4 h-4" />
                  ) : (
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  )}
                </div>
              </div>
              {error && <p className="form-error" data-testid="error-customer-required">{error}</p>}
            </div>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">
                  {searchQuery.trim() ? 'Search Results' : 'Recent Customers'}
                </h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {searchResults.map((customer) => (
                    <button
                      key={customer.id}
                      onClick={() => handleCustomerSelect(customer)}
                      className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-primary-300 hover:bg-primary-50 transition-all duration-200"
                      data-testid={`customer-suggestion-${customer.name}`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">{customer.name}</p>
                          {customer.phone && (
                            <p className="text-sm text-gray-600">{customer.phone}</p>
                          )}
                        </div>
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* New Customer Button */}
            <div className="border-t border-gray-200 pt-4">
              <button
                onClick={() => setShowNewCustomerForm(true)}
                className="btn btn-secondary btn-md w-full"
                data-testid="add-new-customer"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Add New Customer
              </button>
            </div>
          </>
        )}

        {/* New Customer Form Modal */}
        {showNewCustomerForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-strong max-w-md w-full">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Add New Customer</h3>

                <div className="space-y-4">
                  <div>
                    <label htmlFor="new-customer-name" className="form-label">
                      Customer Name *
                    </label>
                    <input
                      id="new-customer-name"
                      type="text"
                      value={newCustomer.name}
                      onChange={(e) => setNewCustomer(prev => ({ ...prev, name: e.target.value }))}
                      className="form-input"
                      placeholder="Enter customer name"
                      data-testid="new-customer-name"
                    />
                  </div>

                  <div>
                    <label htmlFor="new-customer-phone" className="form-label">
                      Phone Number
                    </label>
                    <input
                      id="new-customer-phone"
                      type="tel"
                      value={newCustomer.phone}
                      onChange={(e) => setNewCustomer(prev => ({ ...prev, phone: e.target.value }))}
                      className="form-input"
                      placeholder="Enter phone number"
                      data-testid="new-customer-phone"
                    />
                  </div>

                  <div>
                    <label htmlFor="new-customer-address" className="form-label">
                      Address
                    </label>
                    <textarea
                      id="new-customer-address"
                      value={newCustomer.address}
                      onChange={(e) => setNewCustomer(prev => ({ ...prev, address: e.target.value }))}
                      className="form-input"
                      rows={3}
                      placeholder="Enter customer address"
                      data-testid="new-customer-address"
                    />
                  </div>
                </div>

                <div className="flex space-x-3 mt-6">
                  <button
                    onClick={() => setShowNewCustomerForm(false)}
                    className="btn btn-secondary btn-md flex-1"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateNewCustomer}
                    className="btn btn-primary btn-md flex-1"
                    data-testid="save-customer"
                  >
                    Save Customer
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Order Details */}
        <div className="border-t border-gray-200 pt-6">
          <h4 className="text-sm font-medium text-gray-900 mb-4">Order Details</h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="order-source" className="form-label">
                Order Source
              </label>
              <select
                id="order-source"
                value={orderSource}
                onChange={(e) => onOrderSourceChange(e.target.value)}
                className="form-input"
              >
                <option value="WALK-IN">Walk-in</option>
                <option value="PICKUP">Pickup</option>
                <option value="DELIVERY">Delivery</option>
              </select>
            </div>

            <div>
              <label htmlFor="delivery-datetime" className="form-label">
                Delivery Date & Time
              </label>
              <input
                id="delivery-datetime"
                type="datetime-local"
                value={deliveryDate}
                onChange={(e) => onDeliveryDateChange(e.target.value)}
                className="form-input"
                data-testid="delivery-datetime"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}