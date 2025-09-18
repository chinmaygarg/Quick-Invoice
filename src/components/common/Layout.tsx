import React from 'react';
import { Navigation } from './Navigation';
import { NotificationCenter } from './NotificationCenter';
import { LoadingSpinner } from './LoadingSpinner';
import { useApp } from '@/contexts/AppContext';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { state } = useApp();

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar Navigation */}
      <div className="w-64 bg-white shadow-soft border-r border-gray-200 flex-shrink-0">
        <Navigation />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {/* Store Selector */}
              {state.currentStore && (
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-success-500 rounded-full"></div>
                  <span className="text-sm font-medium text-gray-700">
                    {state.currentStore.name}
                  </span>
                  <span className="text-xs text-gray-500">
                    ({state.currentStore.code})
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center space-x-4">
              {/* Quick Actions */}
              <button
                data-testid="quick-backup"
                className="btn btn-ghost btn-sm"
                title="Quick Backup (Ctrl+B)"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                Backup
              </button>

              {/* Connection Status */}
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-success-500 rounded-full"></div>
                <span className="text-xs text-gray-500">Online</span>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 p-6 overflow-auto">
          {state.isLoading ? (
            <div className="flex items-center justify-center h-64">
              <LoadingSpinner size="lg" />
            </div>
          ) : (
            children
          )}
        </main>
      </div>

      {/* Notification Center */}
      <NotificationCenter />
    </div>
  );
}