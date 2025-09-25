import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { invoke } from '@tauri-apps/api/tauri';
import { useApp } from '@/contexts/AppContext';

interface Store {
  id: number;
  name: string;
  address: string;
  phone?: string;
  email?: string;
  gstin?: string;
  is_active: boolean;
  total_invoices: number;
  monthly_revenue: number;
  created_at: string;
}

export function StoreList() {
  const { state, showNotification, setLoading } = useApp();
  const [stores, setStores] = useState<Store[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [showInactiveStores, setShowInactiveStores] = useState(false);
  const [selectedStores, setSelectedStores] = useState<number[]>([]);
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
    loadStores();
  }, [debouncedSearchQuery, showInactiveStores]);

  const loadStores = async () => {
    try {
      // Use isSearching for search operations, isLoading only for initial page load
      if (debouncedSearchQuery) {
        setIsSearching(true);
      } else {
        setIsLoading(true);
      }

      const result = await invoke('search_stores', {
        query: debouncedSearchQuery,
        includeInactive: showInactiveStores,
        limit: 50,
      });
      setStores(Array.isArray(result) ? result : []);
    } catch (error) {
      console.error('Failed to load stores:', error);
      showNotification({
        type: 'error',
        title: 'Load Failed',
        message: `Failed to load stores: ${error}`,
      });
    } finally {
      setIsLoading(false);
      setIsSearching(false);
    }
  };

  const handleToggleStoreStatus = async (storeId: number, isActive: boolean) => {
    try {
      await invoke('update_store_status', { storeId, isActive: !isActive });
      showNotification({
        type: 'success',
        title: 'Store Updated',
        message: `Store ${!isActive ? 'activated' : 'deactivated'} successfully`,
      });
      loadStores();
    } catch (error) {
      showNotification({
        type: 'error',
        title: 'Update Failed',
        message: `Failed to update store: ${error}`,
      });
    }
  };

  const handleSetCurrentStore = async (store: Store) => {
    try {
      // This would typically update the global app state
      showNotification({
        type: 'success',
        title: 'Store Selected',
        message: `${store.name} is now your active store`,
      });
    } catch (error) {
      showNotification({
        type: 'error',
        title: 'Update Failed',
        message: `Failed to set current store: ${error}`,
      });
    }
  };

  const handleDeleteStores = async () => {
    if (selectedStores.length === 0) return;

    try {
      setLoading(true);
      for (const storeId of selectedStores) {
        await invoke('delete_store', { storeId });
      }

      showNotification({
        type: 'success',
        title: 'Stores Deleted',
        message: `${selectedStores.length} store(s) deleted successfully`,
      });

      setSelectedStores([]);
      setShowDeleteModal(false);
      loadStores();
    } catch (error) {
      showNotification({
        type: 'error',
        title: 'Delete Failed',
        message: `Failed to delete stores: ${error}`,
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const toggleStoreSelection = (storeId: number) => {
    setSelectedStores(prev =>
      prev.includes(storeId)
        ? prev.filter(id => id !== storeId)
        : [...prev, storeId]
    );
  };

  // const toggleSelectAll = () => {
  //   if (selectedStores.length === stores.length) {
  //     setSelectedStores([]);
  //   } else {
  //     setSelectedStores(stores.map(s => s.id));
  //   }
  // };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Store Management</h1>
        </div>
        <div className="bg-white rounded-xl shadow-soft p-6">
          <div className="animate-pulse space-y-4">
            {[...Array(5)].map((_, i) => (
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
    <div className="space-y-6" data-testid="store-list">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Store Management</h1>
          <p className="text-gray-600 mt-1">
            Manage your store locations and business information
          </p>
        </div>
        <div className="flex items-center space-x-3">
          {selectedStores.length > 0 && (
            <button
              onClick={() => setShowDeleteModal(true)}
              className="btn btn-error btn-md"
              data-testid="delete-selected"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Delete ({selectedStores.length})
            </button>
          )}
          <Link to="/store/new" className="btn btn-primary btn-md">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Add Store
          </Link>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-xl shadow-soft p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="store-search" className="form-label">
              Search Stores
            </label>
            <div className="relative">
              <input
                ref={searchInputRef}
                id="store-search"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by store name or address..."
                className="form-input pl-10 pr-10"
                data-testid="store-search"
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
          <div className="flex items-end">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={showInactiveStores}
                onChange={(e) => setShowInactiveStores(e.target.checked)}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="ml-2 text-sm text-gray-700">Show inactive stores</span>
            </label>
          </div>
        </div>
      </div>

      {/* Current Store Info */}
      {state.currentStore && (
        <div className="bg-primary-50 border border-primary-200 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-primary-900">Current Active Store</h3>
              <p className="text-primary-700 mt-1">{state.currentStore.name}</p>
              <p className="text-sm text-primary-600 mt-1">
                📍 {state.currentStore.address}
              </p>
            </div>
            <div className="text-primary-600">
              <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        </div>
      )}

      {/* Store Grid/List */}
      {stores.length === 0 ? (
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
              d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
            />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No stores found</h3>
          <p className="text-gray-500 mb-6">
            {searchQuery ? 'Try adjusting your search criteria' : 'Get started by adding your first store location'}
          </p>
          <Link to="/store/new" className="btn btn-primary btn-md">
            Add First Store
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {stores.map((store) => (
            <div
              key={store.id}
              className={`bg-white rounded-xl shadow-soft overflow-hidden hover:shadow-md transition-shadow ${
                !store.is_active ? 'opacity-75' : ''
              }`}
              data-testid="store-card"
            >
              <div className="p-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start space-x-3">
                    <input
                      type="checkbox"
                      checked={selectedStores.includes(store.id)}
                      onChange={() => toggleStoreSelection(store.id)}
                      className="mt-1 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      data-testid={`select-store-${store.id}`}
                    />
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h3 className={`font-medium ${!store.is_active ? 'text-gray-500' : 'text-gray-900'}`}>
                          {store.name}
                        </h3>
                        {state.currentStore?.id === store.id && (
                          <span className="badge badge-success badge-sm">Current</span>
                        )}
                        {!store.is_active && (
                          <span className="badge badge-error badge-sm">Inactive</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                        📍 {store.address}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Contact Info */}
                <div className="space-y-2 mb-4">
                  {store.phone && (
                    <div className="flex items-center text-sm text-gray-600">
                      <span>📞 {store.phone}</span>
                    </div>
                  )}
                  {store.email && (
                    <div className="flex items-center text-sm text-gray-600">
                      <span>✉️ {store.email}</span>
                    </div>
                  )}
                  {store.gstin && (
                    <div className="flex items-center text-sm text-gray-600">
                      <span>🏢 GSTIN: {store.gstin}</span>
                    </div>
                  )}
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-4 py-4 border-t border-gray-200">
                  <div className="text-center">
                    <div className="font-medium text-gray-900">{store.total_invoices}</div>
                    <div className="text-xs text-gray-500">Total Invoices</div>
                  </div>
                  <div className="text-center">
                    <div className="font-medium text-gray-900">
                      {formatCurrency(store.monthly_revenue)}
                    </div>
                    <div className="text-xs text-gray-500">Monthly Revenue</div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                  <div className="flex items-center space-x-2">
                    {state.currentStore?.id !== store.id && store.is_active && (
                      <button
                        onClick={() => handleSetCurrentStore(store)}
                        className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                        data-testid={`set-current-${store.id}`}
                      >
                        Set Current
                      </button>
                    )}
                    <button
                      onClick={() => handleToggleStoreStatus(store.id, store.is_active)}
                      className={`text-sm font-medium ${
                        store.is_active
                          ? 'text-yellow-600 hover:text-yellow-700'
                          : 'text-green-600 hover:text-green-700'
                      }`}
                      data-testid={`toggle-store-${store.id}`}
                    >
                      {store.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                  <Link
                    to={`/store/edit/${store.id}`}
                    className="text-gray-600 hover:text-gray-700 text-sm font-medium"
                    data-testid={`edit-store-${store.id}`}
                  >
                    Edit
                  </Link>
                </div>

                {/* Created Date */}
                <div className="text-xs text-gray-500 mt-3 pt-3 border-t border-gray-200">
                  Added {formatDate(store.created_at)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-strong max-w-md w-full">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Delete Stores
              </h3>
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete {selectedStores.length} store(s)?
                This action cannot be undone and will also delete all associated data including invoices and reports.
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="btn btn-secondary btn-md flex-1"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteStores}
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