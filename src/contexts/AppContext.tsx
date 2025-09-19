import React, { createContext, useContext, useReducer, useEffect, useCallback, useMemo } from 'react';
import { invoke } from '@tauri-apps/api/tauri';

// Types
interface AppState {
  isLoading: boolean;
  error: string | null;
  stores: Store[];
  currentStore: Store | null;
  recentCustomers: Customer[];
  notifications: Notification[];
}

interface Store {
  id: number;
  code: string;
  name: string;
  gstin: string;
  phone?: string;
  address?: string;
}

interface Customer {
  id: number;
  name: string;
  phone?: string;
  address?: string;
  created_at: string;
  updated_at: string;
}

interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: Date;
  autoClose?: boolean;
}

type AppAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_STORES'; payload: Store[] }
  | { type: 'SET_CURRENT_STORE'; payload: Store }
  | { type: 'SET_RECENT_CUSTOMERS'; payload: Customer[] }
  | { type: 'ADD_NOTIFICATION'; payload: Notification }
  | { type: 'REMOVE_NOTIFICATION'; payload: string }
  | { type: 'CLEAR_NOTIFICATIONS' };

interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  // Helper functions
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  showNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => void;
  clearError: () => void;
  refreshStores: () => Promise<void>;
  refreshRecentCustomers: () => Promise<void>;
  selectStore: (store: Store) => void;
}

const initialState: AppState = {
  isLoading: false,
  error: null,
  stores: [],
  currentStore: null,
  recentCustomers: [],
  notifications: [],
};

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false };
    case 'SET_STORES':
      return { ...state, stores: action.payload };
    case 'SET_CURRENT_STORE':
      return { ...state, currentStore: action.payload };
    case 'SET_RECENT_CUSTOMERS':
      return { ...state, recentCustomers: action.payload };
    case 'ADD_NOTIFICATION':
      return {
        ...state,
        notifications: [...state.notifications, action.payload],
      };
    case 'REMOVE_NOTIFICATION':
      return {
        ...state,
        notifications: state.notifications.filter(n => n.id !== action.payload),
      };
    case 'CLEAR_NOTIFICATIONS':
      return { ...state, notifications: [] };
    default:
      return state;
  }
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Helper functions
  const setLoading = useCallback((loading: boolean) => {
    dispatch({ type: 'SET_LOADING', payload: loading });
  }, []);

  const setError = useCallback((error: string | null) => {
    dispatch({ type: 'SET_ERROR', payload: error });
  }, []);

  const clearError = useCallback(() => {
    dispatch({ type: 'SET_ERROR', payload: null });
  }, []);

  const showNotification = useCallback((notification: Omit<Notification, 'id' | 'timestamp'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    const fullNotification: Notification = {
      ...notification,
      id,
      timestamp: new Date(),
      autoClose: notification.autoClose ?? true,
    };

    dispatch({ type: 'ADD_NOTIFICATION', payload: fullNotification });

    // Auto-remove success and info notifications
    if (fullNotification.autoClose && (fullNotification.type === 'success' || fullNotification.type === 'info')) {
      setTimeout(() => {
        dispatch({ type: 'REMOVE_NOTIFICATION', payload: id });
      }, 5000);
    }
  }, []);

  const refreshStores = useCallback(async (skipLoading = false) => {
    try {
      if (!skipLoading) {
        setLoading(true);
      }
      const stores = await invoke<Store[]>('get_stores');
      dispatch({ type: 'SET_STORES', payload: stores });

      // Set default store only during initialization
      if (stores.length > 0 && skipLoading) {
        dispatch({ type: 'SET_CURRENT_STORE', payload: stores[0] });
      }
    } catch (error) {
      setError(`Failed to load stores: ${error}`);
    } finally {
      if (!skipLoading) {
        setLoading(false);
      }
    }
  }, [setLoading, setError]);

  const refreshRecentCustomers = useCallback(async () => {
    try {
      const customers = await invoke<Customer[]>('search_customers', {
        query: null,
        limit: 10,
      });
      dispatch({ type: 'SET_RECENT_CUSTOMERS', payload: customers });
    } catch (error) {
      console.error('Failed to load recent customers:', error);
    }
  }, []);

  const selectStore = useCallback((store: Store) => {
    dispatch({ type: 'SET_CURRENT_STORE', payload: store });
  }, []);

  // Initialize app data
  useEffect(() => {
    const initializeApp = async () => {
      try {
        setLoading(true);
        // Use skipLoading=true to prevent nested loading state updates
        await Promise.all([
          refreshStores(true),
          refreshRecentCustomers(),
        ]);
      } catch (error) {
        setError(`Failed to initialize app: ${error}`);
      } finally {
        setLoading(false);
      }
    };

    initializeApp();
  }, []); // Empty dependency array is correct - we only want this to run once on mount

  const contextValue: AppContextType = useMemo(() => ({
    state,
    dispatch,
    setLoading,
    setError,
    showNotification,
    clearError,
    refreshStores,
    refreshRecentCustomers,
    selectStore,
  }), [state, setLoading, setError, showNotification, clearError, refreshStores, refreshRecentCustomers, selectStore]);

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}

// Export types
export type { Store, Customer, Notification, AppState };