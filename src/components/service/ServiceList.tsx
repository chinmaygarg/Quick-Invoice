import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { invoke } from '@tauri-apps/api/tauri';
import { useApp } from '@/contexts/AppContext';

interface Service {
  id: number;
  name: string;
  category: string;
  description?: string;
  base_price: number;
  gst_rate: number;
  unit: string;
  min_quantity: number;
  variants_count: number;
  addons_count: number;
  is_active: boolean;
  created_at: string;
}

interface ServiceCategory {
  category: string;
  services: Service[];
  total_services: number;
}

export function ServiceList() {
  const { showNotification, setLoading } = useApp();
  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'category'>('category');
  const [showInactiveServices, setShowInactiveServices] = useState(false);
  const [selectedServices, setSelectedServices] = useState<number[]>([]);
  const [showBulkActions, setShowBulkActions] = useState(false);

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
    loadServices();
  }, [debouncedSearchQuery, selectedCategory, showInactiveServices]);

  const loadServices = async () => {
    try {
      // Use isSearching for search operations, isLoading only for initial page load
      if (debouncedSearchQuery || selectedCategory !== 'all') {
        setIsSearching(true);
      } else {
        setIsLoading(true);
      }

      const result = await invoke('search_services', {
        query: debouncedSearchQuery,
        category: selectedCategory === 'all' ? null : selectedCategory,
        include_inactive: showInactiveServices,
        limit: 100,
      });

      if (Array.isArray(result)) {
        setServices(result);
        groupServicesByCategory(result);
      }
    } catch (error) {
      console.error('Failed to load services:', error);
      showNotification({
        type: 'error',
        title: 'Load Failed',
        message: `Failed to load services: ${error}`,
      });
    } finally {
      setIsLoading(false);
      setIsSearching(false);
    }
  };

  const groupServicesByCategory = (serviceList: Service[]) => {
    const grouped = serviceList.reduce((acc, service) => {
      const category = service.category || 'Uncategorized';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(service);
      return acc;
    }, {} as Record<string, Service[]>);

    const categoryList = Object.entries(grouped).map(([category, services]) => ({
      category,
      services,
      total_services: services.length,
    }));

    setCategories(categoryList);
  };

  const handleToggleServiceStatus = async (serviceId: number, isActive: boolean) => {
    try {
      await invoke('update_service_status', { serviceId, isActive: !isActive });
      showNotification({
        type: 'success',
        title: 'Service Updated',
        message: `Service ${!isActive ? 'activated' : 'deactivated'} successfully`,
      });
      loadServices();
    } catch (error) {
      showNotification({
        type: 'error',
        title: 'Update Failed',
        message: `Failed to update service: ${error}`,
      });
    }
  };

  const handleBulkStatusUpdate = async (isActive: boolean) => {
    try {
      setLoading(true);
      for (const serviceId of selectedServices) {
        await invoke('update_service_status', { serviceId, isActive });
      }

      showNotification({
        type: 'success',
        title: 'Services Updated',
        message: `${selectedServices.length} service(s) ${isActive ? 'activated' : 'deactivated'} successfully`,
      });

      setSelectedServices([]);
      setShowBulkActions(false);
      loadServices();
    } catch (error) {
      showNotification({
        type: 'error',
        title: 'Update Failed',
        message: `Failed to update services: ${error}`,
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const toggleServiceSelection = (serviceId: number) => {
    setSelectedServices(prev =>
      prev.includes(serviceId)
        ? prev.filter(id => id !== serviceId)
        : [...prev, serviceId]
    );
  };

  const getUniqueCategories = () => {
    const categories = [...new Set(services.map(s => s.category || 'Uncategorized'))];
    return categories.sort();
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Service Management</h1>
        </div>
        <div className="bg-white rounded-xl shadow-soft p-6">
          <div className="animate-pulse space-y-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
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
    <div className="space-y-6" data-testid="service-list">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Service Management</h1>
          <p className="text-gray-600 mt-1">
            Manage your service catalog, pricing, and variants
          </p>
        </div>
        <div className="flex items-center space-x-3">
          {selectedServices.length > 0 && (
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handleBulkStatusUpdate(false)}
                className="btn btn-secondary btn-sm"
                data-testid="bulk-deactivate"
              >
                Deactivate ({selectedServices.length})
              </button>
              <button
                onClick={() => handleBulkStatusUpdate(true)}
                className="btn btn-primary btn-sm"
                data-testid="bulk-activate"
              >
                Activate ({selectedServices.length})
              </button>
            </div>
          )}
          <Link to="/service/new" className="btn btn-primary btn-md">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Add Service
          </Link>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-xl shadow-soft p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <label htmlFor="service-search" className="form-label">
              Search Services
            </label>
            <div className="relative">
              <input
                ref={searchInputRef}
                id="service-search"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by service name or description..."
                className="form-input pl-10 pr-10"
                data-testid="service-search"
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
            <label htmlFor="category-filter" className="form-label">
              Category
            </label>
            <select
              id="category-filter"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="form-input"
            >
              <option value="all">All Categories</option>
              {getUniqueCategories().map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="view-mode" className="form-label">
              View Mode
            </label>
            <select
              id="view-mode"
              value={viewMode}
              onChange={(e) => setViewMode(e.target.value as 'list' | 'category')}
              className="form-input"
            >
              <option value="category">By Category</option>
              <option value="list">List View</option>
            </select>
          </div>
        </div>

        <div className="flex items-center mt-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={showInactiveServices}
              onChange={(e) => setShowInactiveServices(e.target.checked)}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <span className="ml-2 text-sm text-gray-700">Show inactive services</span>
          </label>
        </div>
      </div>

      {/* Service Content */}
      {services.length === 0 ? (
        <div className="bg-white rounded-xl shadow-soft p-8 text-center">
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
              d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
            />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No services found</h3>
          <p className="text-gray-500 mb-6">
            {debouncedSearchQuery || selectedCategory !== 'all'
              ? 'Try adjusting your search criteria'
              : 'Get started by adding your first service'}
          </p>
          <Link to="/service/new" className="btn btn-primary btn-md">
            Add First Service
          </Link>
        </div>
      ) : viewMode === 'category' ? (
        // Category View
        <div className="space-y-6">
          {categories.map((categoryGroup) => (
            <div key={categoryGroup.category} className="bg-white rounded-xl shadow-soft overflow-hidden">
              <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900">
                    {categoryGroup.category}
                  </h3>
                  <span className="text-sm text-gray-500">
                    {categoryGroup.total_services} service{categoryGroup.total_services !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {categoryGroup.services.map((service) => (
                    <div
                      key={service.id}
                      className={`border rounded-lg p-4 hover:shadow-md transition-shadow ${
                        !service.is_active ? 'border-gray-200 bg-gray-50' : 'border-gray-200'
                      }`}
                      data-testid="service-card"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <input
                              type="checkbox"
                              checked={selectedServices.includes(service.id)}
                              onChange={() => toggleServiceSelection(service.id)}
                              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                              data-testid={`select-service-${service.id}`}
                            />
                            <h4 className={`font-medium ${!service.is_active ? 'text-gray-500' : 'text-gray-900'}`}>
                              {service.name}
                            </h4>
                            {!service.is_active && (
                              <span className="badge badge-error badge-sm">Inactive</span>
                            )}
                          </div>
                          {service.description && (
                            <p className="text-sm text-gray-600 mb-2">{service.description}</p>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Base Price:</span>
                          <span className="font-medium">{formatCurrency(service.base_price)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Unit:</span>
                          <span>{service.unit}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Min Qty:</span>
                          <span>{service.min_quantity}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">GST:</span>
                          <span>{service.gst_rate}%</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-200">
                        <div className="flex items-center space-x-2 text-xs text-gray-500">
                          {service.variants_count > 0 && (
                            <span>{service.variants_count} variant{service.variants_count !== 1 ? 's' : ''}</span>
                          )}
                          {service.addons_count > 0 && (
                            <span>{service.addons_count} addon{service.addons_count !== 1 ? 's' : ''}</span>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleToggleServiceStatus(service.id, service.is_active)}
                            className={`text-xs font-medium ${
                              service.is_active
                                ? 'text-yellow-600 hover:text-yellow-700'
                                : 'text-green-600 hover:text-green-700'
                            }`}
                            data-testid={`toggle-service-${service.id}`}
                          >
                            {service.is_active ? 'Deactivate' : 'Activate'}
                          </button>
                          <Link
                            to={`/service/edit/${service.id}`}
                            className="text-primary-600 hover:text-primary-700 text-xs font-medium"
                            data-testid={`edit-service-${service.id}`}
                          >
                            Edit
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        // List View
        <div className="bg-white rounded-xl shadow-soft overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table" data-testid="services-table">
              <thead className="table-header">
                <tr>
                  <th className="table-header-cell w-12">
                    <input
                      type="checkbox"
                      checked={selectedServices.length === services.length && services.length > 0}
                      onChange={() => {
                        if (selectedServices.length === services.length) {
                          setSelectedServices([]);
                        } else {
                          setSelectedServices(services.map(s => s.id));
                        }
                      }}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                  </th>
                  <th className="table-header-cell">Service</th>
                  <th className="table-header-cell">Category</th>
                  <th className="table-header-cell">Price</th>
                  <th className="table-header-cell">Unit</th>
                  <th className="table-header-cell">Variants</th>
                  <th className="table-header-cell">Status</th>
                  <th className="table-header-cell">Actions</th>
                </tr>
              </thead>
              <tbody className="table-body">
                {services.map((service) => (
                  <tr key={service.id} className="table-row" data-testid="service-row">
                    <td className="table-cell">
                      <input
                        type="checkbox"
                        checked={selectedServices.includes(service.id)}
                        onChange={() => toggleServiceSelection(service.id)}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                    </td>
                    <td className="table-cell">
                      <div>
                        <div className={`font-medium ${!service.is_active ? 'text-gray-500' : 'text-gray-900'}`}>
                          {service.name}
                        </div>
                        {service.description && (
                          <div className="text-sm text-gray-500 truncate max-w-xs">
                            {service.description}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="table-cell">
                      <span className="badge badge-secondary badge-sm">
                        {service.category || 'Uncategorized'}
                      </span>
                    </td>
                    <td className="table-cell">
                      <div className="font-medium text-gray-900">
                        {formatCurrency(service.base_price)}
                      </div>
                      <div className="text-xs text-gray-500">GST: {service.gst_rate}%</div>
                    </td>
                    <td className="table-cell">
                      <div>{service.unit}</div>
                      <div className="text-xs text-gray-500">Min: {service.min_quantity}</div>
                    </td>
                    <td className="table-cell">
                      <div className="text-center">
                        <div className="text-sm font-medium">{service.variants_count}</div>
                        <div className="text-xs text-gray-500">variants</div>
                      </div>
                    </td>
                    <td className="table-cell">
                      <span className={`badge ${service.is_active ? 'badge-success' : 'badge-error'} badge-sm`}>
                        {service.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleToggleServiceStatus(service.id, service.is_active)}
                          className={`text-sm font-medium ${
                            service.is_active
                              ? 'text-yellow-600 hover:text-yellow-700'
                              : 'text-green-600 hover:text-green-700'
                          }`}
                        >
                          {service.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                        <Link
                          to={`/service/edit/${service.id}`}
                          className="text-primary-600 hover:text-primary-700 text-sm font-medium"
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
        </div>
      )}
    </div>
  );
}