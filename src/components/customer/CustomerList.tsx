import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { invoke } from '@tauri-apps/api/tauri';
import { useApp } from '@/contexts/AppContext';

interface Customer {
  id: number;
  name: string;
  phone?: string;
  address?: string;
  email?: string;
  total_orders: number;
  total_spent: number;
  last_order_date?: string;
  created_at: string;
}

export function CustomerList() {
  const { showNotification, setLoading } = useApp();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [sortBy, setSortBy] = useState<'name' | 'total_spent' | 'last_order_date'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [selectedCustomers, setSelectedCustomers] = useState<number[]>([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Ref for search input to maintain focus
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Debounce search query to avoid triggering API calls on every keystroke
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 700);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    loadCustomers();
  }, [debouncedSearchQuery, sortBy, sortOrder]);

  const loadCustomers = async () => {
    try {
      // Use isSearching for search operations, isLoading only for initial page load
      if (debouncedSearchQuery) {
        setIsSearching(true);
      } else {
        setIsLoading(true);
      }

      const result = await invoke('search_customers', {
        query: debouncedSearchQuery,
        sortBy,
        sortOrder,
        limit: 100,
      });
      setCustomers(Array.isArray(result) ? result : []);
    } catch (error) {
      console.error('Failed to load customers:', error);
      showNotification({
        type: 'error',
        title: 'Load Failed',
        message: `Failed to load customers: ${error}`,
      });
    } finally {
      setIsLoading(false);
      setIsSearching(false);
    }
  };

  const handleDeleteCustomers = async () => {
    if (selectedCustomers.length === 0) return;

    try {
      setLoading(true);
      for (const customerId of selectedCustomers) {
        await invoke('delete_customer', { customerId });
      }

      showNotification({
        type: 'success',
        title: 'Customers Deleted',
        message: `${selectedCustomers.length} customer(s) deleted successfully`,
      });

      setSelectedCustomers([]);
      setShowDeleteModal(false);
      loadCustomers();
    } catch (error) {
      showNotification({
        type: 'error',
        title: 'Delete Failed',
        message: `Failed to delete customers: ${error}`,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleQuickInvoice = (customer: Customer) => {
    sessionStorage.setItem('quick-selected-customer', JSON.stringify(customer));
    window.location.href = '/invoice/new';
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const toggleCustomerSelection = (customerId: number) => {
    setSelectedCustomers(prev =>
      prev.includes(customerId)
        ? prev.filter(id => id !== customerId)
        : [...prev, customerId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedCustomers.length === customers.length) {
      setSelectedCustomers([]);
    } else {
      setSelectedCustomers(customers.map(c => c.id));
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Customer Management</h1>
        </div>
        <div className="bg-white rounded-xl shadow-soft p-6">
          <div className="animate-pulse space-y-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <div className="bg-gray-200 h-4 w-4 rounded"></div>
                <div className="bg-gray-200 h-4 w-32 rounded"></div>
                <div className="bg-gray-200 h-4 w-24 rounded"></div>
                <div className="bg-gray-200 h-4 w-20 rounded"></div>
                <div className="bg-gray-200 h-4 w-16 rounded"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="customer-list">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customer Management</h1>
          <p className="text-gray-600 mt-1">
            Manage your customer database and order history
          </p>
        </div>
        <div className="flex items-center space-x-3">
          {selectedCustomers.length > 0 && (
            <button
              onClick={() => setShowDeleteModal(true)}
              className="btn btn-error btn-md"
              data-testid="delete-selected"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Delete ({selectedCustomers.length})
            </button>
          )}
          <Link to="/customer/new" className="btn btn-primary btn-md">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Add Customer
          </Link>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-xl shadow-soft p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label htmlFor="customer-search" className="form-label">
              Search Customers
            </label>
            <div className="relative">
              <input
                ref={searchInputRef}
                id="customer-search"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, phone, or email..."
                className="form-input pl-10 pr-10"
                data-testid="customer-search"
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                {isSearching ? (
                  <div className="spinner w-4 h-4" />
                ) : null}
              </div>
            </div>
          </div>
          <div>
            <label htmlFor="sort-by" className="form-label">
              Sort By
            </label>
            <select
              id="sort-by"
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [field, order] = e.target.value.split('-');
                setSortBy(field as any);
                setSortOrder(order as any);
              }}
              className="form-input"
            >
              <option value="name-asc">Name (A-Z)</option>
              <option value="name-desc">Name (Z-A)</option>
              <option value="total_spent-desc">Highest Spent</option>
              <option value="total_spent-asc">Lowest Spent</option>
              <option value="last_order_date-desc">Recent Orders</option>
              <option value="last_order_date-asc">Oldest Orders</option>
            </select>
          </div>
        </div>
      </div>

      {/* Customer Table */}
      <div className="bg-white rounded-xl shadow-soft overflow-hidden">
        {customers.length === 0 ? (
          <div className="p-8 text-center">
            <svg
              className="w-16 h-16 text-gray-400 mx-auto mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No customers found</h3>
            <p className="text-gray-500 mb-6">
              {searchQuery ? 'Try adjusting your search criteria' : 'Get started by adding your first customer'}
            </p>
            <Link to="/customer/new" className="btn btn-primary btn-md">
              Add First Customer
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table" data-testid="customers-table">
              <thead className="table-header">
                <tr>
                  <th className="table-header-cell w-12">
                    <input
                      type="checkbox"
                      checked={selectedCustomers.length === customers.length && customers.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      data-testid="select-all-customers"
                    />
                  </th>
                  <th className="table-header-cell">Customer</th>
                  <th className="table-header-cell">Contact</th>
                  <th className="table-header-cell">Orders</th>
                  <th className="table-header-cell">Total Spent</th>
                  <th className="table-header-cell">Last Order</th>
                  <th className="table-header-cell">Actions</th>
                </tr>
              </thead>
              <tbody className="table-body">
                {customers.map((customer) => (
                  <tr key={customer.id} className="table-row" data-testid="customer-row">
                    <td className="table-cell">
                      <input
                        type="checkbox"
                        checked={selectedCustomers.includes(customer.id)}
                        onChange={() => toggleCustomerSelection(customer.id)}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        data-testid={`select-customer-${customer.id}`}
                      />
                    </td>
                    <td className="table-cell">
                      <div>
                        <div className="font-medium text-gray-900">{customer.name}</div>
                        {customer.address && (
                          <div className="text-sm text-gray-500 truncate max-w-xs">
                            📍 {customer.address}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="table-cell">
                      <div>
                        {customer.phone && (
                          <div className="text-sm text-gray-900">📞 {customer.phone}</div>
                        )}
                        {customer.email && (
                          <div className="text-sm text-gray-500">✉️ {customer.email}</div>
                        )}
                      </div>
                    </td>
                    <td className="table-cell">
                      <div className="text-center">
                        <div className="font-medium text-gray-900">{customer.total_orders}</div>
                        <div className="text-xs text-gray-500">orders</div>
                      </div>
                    </td>
                    <td className="table-cell">
                      <div className="font-medium text-gray-900">
                        {formatCurrency(customer.total_spent)}
                      </div>
                    </td>
                    <td className="table-cell">
                      <div className="text-sm text-gray-500">
                        {formatDate(customer.last_order_date)}
                      </div>
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleQuickInvoice(customer)}
                          className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                          data-testid={`quick-invoice-${customer.id}`}
                        >
                          Quick Invoice
                        </button>
                        <Link
                          to={`/customer/edit/${customer.id}`}
                          className="text-gray-600 hover:text-gray-700 text-sm font-medium"
                          data-testid={`edit-customer-${customer.id}`}
                        >
                          Edit
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-strong max-w-md w-full">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Delete Customers
              </h3>
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete {selectedCustomers.length} customer(s)?
                This action cannot be undone and will also delete all associated order history.
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="btn btn-secondary btn-md flex-1"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteCustomers}
                  className="btn btn-error btn-md flex-1"
                  data-testid="confirm-delete"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}