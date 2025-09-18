import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { invoke } from '@tauri-apps/api/tauri';

interface RecentInvoice {
  id: number;
  invoice_no: string;
  customer_name: string;
  total: number;
  status: string;
  created_at: string;
}

export function RecentActivity() {
  const [recentInvoices, setRecentInvoices] = useState<RecentInvoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadRecentInvoices();
  }, []);

  const loadRecentInvoices = async () => {
    try {
      setIsLoading(true);
      const invoices = await invoke('search_invoices', {
        limit: 10,
        offset: 0,
      });

      if (Array.isArray(invoices)) {
        setRecentInvoices(invoices);
      }
    } catch (error) {
      console.error('Failed to load recent invoices:', error);
    } finally {
      setIsLoading(false);
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
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: string) => {
    const statusClasses = {
      pending: 'badge badge-warning',
      'in-progress': 'badge badge-primary',
      completed: 'badge badge-success',
      paid: 'badge badge-success',
      cancelled: 'badge badge-error',
    };

    return (
      <span className={statusClasses[status as keyof typeof statusClasses] || 'badge badge-secondary'}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
        <div className="bg-white rounded-xl shadow-soft p-6">
          <div className="animate-pulse space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <div className="bg-gray-200 h-4 w-24 rounded"></div>
                <div className="bg-gray-200 h-4 w-32 rounded"></div>
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
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
        <Link
          to="/invoices"
          className="text-sm text-primary-600 hover:text-primary-700 font-medium"
        >
          View all →
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-soft overflow-hidden">
        {recentInvoices.length === 0 ? (
          <div className="p-6 text-center">
            <svg
              className="w-12 h-12 text-gray-400 mx-auto mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <p className="text-gray-500 text-sm">No recent invoices found</p>
            <Link
              to="/invoice/new"
              className="btn btn-primary btn-sm mt-4"
              data-testid="create-first-invoice"
            >
              Create your first invoice
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table" data-testid="recent-activity-table">
              <thead className="table-header">
                <tr>
                  <th className="table-header-cell">Invoice No</th>
                  <th className="table-header-cell">Customer</th>
                  <th className="table-header-cell">Date</th>
                  <th className="table-header-cell">Total</th>
                  <th className="table-header-cell">Status</th>
                  <th className="table-header-cell">Actions</th>
                </tr>
              </thead>
              <tbody className="table-body">
                {recentInvoices.map((invoice) => (
                  <tr key={invoice.id} className="table-row" data-testid="invoice-row">
                    <td className="table-cell">
                      <div className="font-medium text-gray-900">
                        {invoice.invoice_no}
                      </div>
                    </td>
                    <td className="table-cell">
                      <div className="text-gray-900">
                        {invoice.customer_name || 'Unknown Customer'}
                      </div>
                    </td>
                    <td className="table-cell">
                      <div className="text-gray-500 text-xs">
                        {formatDate(invoice.created_at)}
                      </div>
                    </td>
                    <td className="table-cell">
                      <div className="font-medium text-gray-900">
                        {formatCurrency(invoice.total)}
                      </div>
                    </td>
                    <td className="table-cell">
                      {getStatusBadge(invoice.status)}
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center space-x-2">
                        <Link
                          to={`/invoice/edit/${invoice.id}`}
                          className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                          data-testid={`edit-invoice-${invoice.id}`}
                        >
                          View
                        </Link>
                        {invoice.status === 'completed' && (
                          <button
                            className="text-gray-600 hover:text-gray-700 text-sm font-medium"
                            data-testid={`print-invoice-${invoice.id}`}
                          >
                            Print
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}