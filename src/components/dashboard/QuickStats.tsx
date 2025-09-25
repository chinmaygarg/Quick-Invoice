import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import { Customer, Invoice } from '@/types';

interface Stats {
  todaysInvoices: number;
  todaysRevenue: number;
  pendingInvoices: number;
  totalCustomers: number;
}

interface SalesSummary {
  total_invoices: number;
  total_revenue: number;
}

export function QuickStats() {
  const [stats, setStats] = useState<Stats>({
    todaysInvoices: 0,
    todaysRevenue: 0,
    pendingInvoices: 0,
    totalCustomers: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setIsLoading(true);

      // Get today's date range
      const today = new Date();
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
      const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();

      // Fetch stats in parallel
      const [salesSummary, customers, pendingInvoices] = await Promise.all([
        invoke<SalesSummary>('get_sales_summary', {
          dateRange: {
            start_date: todayStart,
            end_date: todayEnd,
          }
        }).catch(() => ({ total_invoices: 0, total_revenue: 0 })),
        invoke<Customer[]>('search_customers', { query: null, limit: 1000 }).catch(() => []),
        invoke<Invoice[]>('search_invoices', {
          query: {
            status: 'pending',
            limit: 100
          }
        }).catch((error) => {
          console.error('Error fetching pending invoices:', error);
          return [];
        }),
      ]);


      setStats({
        todaysInvoices: salesSummary.total_invoices || 0,
        todaysRevenue: salesSummary.total_revenue || 0,
        pendingInvoices: Array.isArray(pendingInvoices) ? pendingInvoices.length : 0,
        totalCustomers: Array.isArray(customers) ? customers.length : 0,
      });
    } catch (error) {
      console.error('Failed to load stats:', error);
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

  const statItems = [
    {
      title: "Today's Invoices",
      value: stats.todaysInvoices,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      testId: 'stat-todays-invoices',
    },
    {
      title: "Today's Revenue",
      value: formatCurrency(stats.todaysRevenue),
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
        </svg>
      ),
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      testId: 'stat-todays-revenue',
    },
    {
      title: 'Pending Invoices',
      value: stats.pendingInvoices,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
      testId: 'stat-pending-invoices',
    },
    {
      title: 'Total Customers',
      value: stats.totalCustomers,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
      testId: 'stat-total-customers',
    },
  ];

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Stats</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statItems.map((item) => (
          <div
            key={item.title}
            data-testid={item.testId}
            className="bg-white rounded-xl shadow-soft p-6 border border-gray-200"
          >
            <div className="flex items-center">
              <div className={`flex-shrink-0 p-3 rounded-lg ${item.bgColor}`}>
                <div className={item.color}>
                  {item.icon}
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">{item.title}</p>
                <div className="text-2xl font-bold text-gray-900">
                  {isLoading ? (
                    <div className="animate-pulse bg-gray-200 h-8 w-16 rounded"></div>
                  ) : (
                    item.value
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}