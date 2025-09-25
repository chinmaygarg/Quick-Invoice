import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useApp } from '@/contexts/AppContext';
import { appConfig } from '@/config/app.config';

interface NavItem {
  id: string;
  label: string;
  path: string;
  icon: React.ReactNode;
  testId: string;
  description: string;
}

const navigationItems: NavItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    path: '/',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v2H8V5z" />
      </svg>
    ),
    testId: 'nav-dashboard',
    description: 'Main dashboard with quick stats'
  },
  {
    id: 'new-invoice',
    label: 'New Invoice',
    path: '/invoice/new',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
      </svg>
    ),
    testId: 'new-invoice-button',
    description: 'Create new invoice'
  },
  {
    id: 'invoices',
    label: 'View Invoices',
    path: '/invoices',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    testId: 'view-invoices',
    description: 'Search and manage invoices'
  },
  {
    id: 'customers',
    label: 'Customers',
    path: '/customers',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
    testId: 'nav-customers',
    description: 'Manage customer database'
  },
  {
    id: 'services',
    label: 'Services & Pricing',
    path: '/services',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
      </svg>
    ),
    testId: 'nav-services',
    description: 'Configure services and pricing'
  },
  {
    id: 'stores',
    label: 'Stores',
    path: '/stores',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
    testId: 'nav-stores',
    description: 'Manage store locations'
  },
  {
    id: 'reports',
    label: 'Reports',
    path: '/reports',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    testId: 'nav-reports',
    description: 'Sales and GST reports'
  },
  {
    id: 'backup',
    label: 'Backup & Restore',
    path: '/settings',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3-3m0 0l-3 3m3-3v12" />
      </svg>
    ),
    testId: 'nav-backup',
    description: 'Database backup and settings'
  }
];

export function Navigation() {
  const location = useLocation();
  const { state } = useApp();

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <nav className="h-full flex flex-col">
      {/* Logo and Brand */}
      <div className="px-6 py-6 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-lg">U</span>
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">{appConfig.name}</h1>
            <p className="text-xs text-gray-500">{appConfig.app.shortTitle}</p>
          </div>
        </div>
      </div>

      {/* Current Store Info */}
      {state.currentStore && (
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <div className="text-xs text-gray-500 mb-1">Current Store</div>
          <div className="text-sm font-medium text-gray-900">
            {state.currentStore.name}
          </div>
          <div className="text-xs text-gray-500">
            GSTIN: {state.currentStore.gstin}
          </div>
        </div>
      )}

      {/* Navigation Items */}
      <div className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
        {navigationItems.map((item) => (
          <Link
            key={item.id}
            to={item.path}
            data-testid={item.testId}
            className={`nav-link group ${
              isActive(item.path) ? 'nav-link-active' : 'nav-link-inactive'
            }`}
            title={item.description}
          >
            <span className="flex-shrink-0">
              {item.icon}
            </span>
            <span className="ml-3 text-sm font-medium truncate">
              {item.label}
            </span>
          </Link>
        ))}
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-gray-200">
        <div className="text-xs text-gray-500 text-center">
          <div>Version {appConfig.version}</div>
          <div className="mt-1">
            <a
              href={appConfig.website.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-600 hover:text-primary-700"
            >
              {appConfig.website.displayUrl}
            </a>
          </div>
        </div>
      </div>
    </nav>
  );
}