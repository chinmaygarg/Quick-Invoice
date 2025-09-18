import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { invoke } from '@tauri-apps/api/tauri';
import { useApp } from '@/contexts/AppContext';
import { QuickStats } from './QuickStats';
import { RecentActivity } from './RecentActivity';

interface DashboardAction {
  id: string;
  title: string;
  description: string;
  path: string;
  icon: React.ReactNode;
  color: string;
  testId: string;
}

const dashboardActions: DashboardAction[] = [
  {
    id: 'new-invoice',
    title: 'New Invoice',
    description: 'Create a new invoice for a customer',
    path: '/invoice/new',
    color: 'bg-primary-600 hover:bg-primary-700',
    testId: 'new-invoice-button',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
      </svg>
    )
  },
  {
    id: 'view-invoices',
    title: 'View Invoices',
    description: 'Search and manage existing invoices',
    path: '/invoices',
    color: 'bg-blue-600 hover:bg-blue-700',
    testId: 'view-invoices',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    )
  },
  {
    id: 'customers',
    title: 'Customers',
    description: 'Manage customer database',
    path: '/customers',
    color: 'bg-green-600 hover:bg-green-700',
    testId: 'nav-customers',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    )
  },
  {
    id: 'stores',
    title: 'Stores',
    description: 'Manage store locations and settings',
    path: '/stores',
    color: 'bg-purple-600 hover:bg-purple-700',
    testId: 'nav-stores',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    )
  },
  {
    id: 'services',
    title: 'Services & Pricing',
    description: 'Configure services and pricing',
    path: '/services',
    color: 'bg-orange-600 hover:bg-orange-700',
    testId: 'nav-services',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
      </svg>
    )
  },
  {
    id: 'backup',
    title: 'Backup & Restore',
    description: 'Database backup and restore',
    path: '/settings',
    color: 'bg-gray-600 hover:bg-gray-700',
    testId: 'nav-backup',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3-3m0 0l-3 3m3-3v12" />
      </svg>
    )
  }
];

export function Dashboard() {
  const { state, showNotification } = useApp();
  const [recentCustomers, setRecentCustomers] = useState<any[]>([]);

  useEffect(() => {
    // Set recent customers from app state
    if (state.recentCustomers) {
      setRecentCustomers(state.recentCustomers.slice(0, 6));
    }
  }, [state.recentCustomers]);

  const handleQuickCustomerSelect = (customer: any) => {
    // Store selected customer in session storage for quick access
    sessionStorage.setItem('quick-selected-customer', JSON.stringify(customer));
    showNotification({
      type: 'info',
      title: 'Customer Selected',
      message: `${customer.name} selected for quick invoice creation`
    });
  };

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-white rounded-xl shadow-soft p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Welcome to UCLEAN
            </h1>
            <p className="text-gray-600 mt-1">
              Professional invoice generation for laundry and dry cleaning services
            </p>
          </div>
          {state.currentStore && (
            <div className="text-right">
              <div className="text-sm text-gray-500">Current Store</div>
              <div className="text-lg font-semibold text-gray-900">
                {state.currentStore.name}
              </div>
              <div className="text-sm text-gray-500">
                {state.currentStore.code}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      <QuickStats />

      {/* Main Action Cards */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {dashboardActions.map((action) => (
            <Link
              key={action.id}
              to={action.path}
              data-testid={action.testId}
              className="group block"
            >
              <div className="bg-white rounded-xl shadow-soft hover:shadow-medium transition-all duration-200 p-6 border border-gray-200 hover:border-gray-300">
                <div className="flex items-center">
                  <div className={`flex-shrink-0 p-3 rounded-lg text-white ${action.color} group-hover:scale-105 transition-transform duration-200`}>
                    {action.icon}
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-semibold text-gray-900 group-hover:text-primary-600 transition-colors">
                      {action.title}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      {action.description}
                    </p>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Customers for Quick Access */}
      {recentCustomers.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Customers</h2>
          <div className="bg-white rounded-xl shadow-soft p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {recentCustomers.map((customer) => (
                <button
                  key={customer.id}
                  data-testid={`recent-customer-${customer.name}`}
                  onClick={() => handleQuickCustomerSelect(customer)}
                  className="text-left p-3 rounded-lg border border-gray-200 hover:border-primary-300 hover:bg-primary-50 transition-all duration-200 group"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center group-hover:bg-primary-200 transition-colors">
                      <span className="text-sm font-medium text-primary-700">
                        {customer.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {customer.name}
                      </p>
                      {customer.phone && (
                        <p className="text-xs text-gray-500 truncate">
                          {customer.phone}
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-gray-200">
              <Link
                to="/customers"
                className="text-sm text-primary-600 hover:text-primary-700 font-medium"
              >
                View all customers →
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Recent Activity */}
      <RecentActivity />
    </div>
  );
}