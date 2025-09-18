import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { invoke } from '@tauri-apps/api/tauri';
import { toast } from 'react-hot-toast';

interface SalesSummary {
  total_invoices: number;
  total_revenue: number;
  total_tax: number;
  total_discount: number;
  average_invoice_value: number;
  payment_summary: PaymentSummary;
  status_breakdown: StatusCount[];
  daily_sales: DailySale[];
}

interface PaymentSummary {
  cash: number;
  card: number;
  upi: number;
  bank_transfer: number;
  credit: number;
  partial: number;
  total_paid: number;
  total_pending: number;
}

interface StatusCount {
  status: string;
  count: number;
  total_amount: number;
}

interface DailySale {
  date: string;
  invoice_count: number;
  total_amount: number;
  tax_amount: number;
}

interface GstSummary {
  period_start: string;
  period_end: string;
  total_taxable_amount: number;
  total_sgst: number;
  total_cgst: number;
  total_igst: number;
  total_tax_collected: number;
  gst_rate_breakdown: GstRateBreakdown[];
  monthly_gst: MonthlyGst[];
}

interface GstRateBreakdown {
  gst_rate: number;
  taxable_amount: number;
  sgst_amount: number;
  cgst_amount: number;
  igst_amount: number;
  total_tax: number;
  invoice_count: number;
}

interface MonthlyGst {
  month: string;
  taxable_amount: number;
  total_tax: number;
  invoice_count: number;
}

interface ServicePopularity {
  service_id: number;
  service_name: string;
  category: string;
  times_ordered: number;
  total_revenue: number;
  average_price: number;
  growth_percentage: number;
}

const REPORT_TYPES = [
  { value: 'sales', label: 'Sales Summary', icon: '📊' },
  { value: 'gst', label: 'GST Report', icon: '🧾' },
  { value: 'services', label: 'Service Analytics', icon: '⚙️' },
  { value: 'express', label: 'Express Delivery', icon: '🚀' },
];

export const Reports: React.FC = () => {
  const [activeReport, setActiveReport] = useState('sales');
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30); // Default to last 30 days
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [loading, setLoading] = useState(false);
  const [salesData, setSalesData] = useState<SalesSummary | null>(null);
  const [gstData, setGstData] = useState<GstSummary | null>(null);
  const [servicesData, setServicesData] = useState<ServicePopularity[]>([]);
  const [expressData, setExpressData] = useState<any>(null);

  useEffect(() => {
    loadReportData();
  }, [activeReport, startDate, endDate]);

  const loadReportData = async () => {
    if (!startDate || !endDate) return;

    setLoading(true);
    try {
      const dateRange = { start_date: startDate, end_date: endDate };

      switch (activeReport) {
        case 'sales':
          const sales = await invoke<SalesSummary>('get_sales_summary', { dateRange });
          setSalesData(sales);
          break;

        case 'gst':
          const gst = await invoke<GstSummary>('get_gst_summary', { dateRange });
          setGstData(gst);
          break;

        case 'services':
          const services = await invoke<ServicePopularity[]>('get_service_popularity', { dateRange });
          setServicesData(services);
          break;

        case 'express':
          const express = await invoke<any>('get_express_delivery_summary', { dateRange });
          setExpressData(express);
          break;
      }
    } catch (error) {
      console.error('Failed to load report data:', error);
      toast.error('Failed to load report data');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number): string => {
    return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-IN');
  };

  const exportReport = async () => {
    try {
      // This would implement export functionality
      toast.success('Report export functionality coming soon');
    } catch (error) {
      toast.error('Failed to export report');
    }
  };

  const renderSalesReport = () => {
    if (!salesData) return null;

    return (
      <div className="space-y-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-blue-600">
                {salesData.total_invoices}
              </div>
              <div className="text-sm text-gray-600">Total Invoices</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(salesData.total_revenue)}
              </div>
              <div className="text-sm text-gray-600">Total Revenue</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-purple-600">
                {formatCurrency(salesData.average_invoice_value)}
              </div>
              <div className="text-sm text-gray-600">Avg Invoice Value</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-orange-600">
                {formatCurrency(salesData.total_tax)}
              </div>
              <div className="text-sm text-gray-600">Total Tax</div>
            </CardContent>
          </Card>
        </div>

        {/* Payment Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Payment Method Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-lg font-semibold">{formatCurrency(salesData.payment_summary.cash)}</div>
                <div className="text-sm text-gray-600">Cash</div>
              </div>
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <div className="text-lg font-semibold">{formatCurrency(salesData.payment_summary.card)}</div>
                <div className="text-sm text-gray-600">Card</div>
              </div>
              <div className="text-center p-3 bg-purple-50 rounded-lg">
                <div className="text-lg font-semibold">{formatCurrency(salesData.payment_summary.upi)}</div>
                <div className="text-sm text-gray-600">UPI</div>
              </div>
              <div className="text-center p-3 bg-yellow-50 rounded-lg">
                <div className="text-lg font-semibold">{formatCurrency(salesData.payment_summary.credit)}</div>
                <div className="text-sm text-gray-600">Credit</div>
              </div>
              <div className="text-center p-3 bg-red-50 rounded-lg">
                <div className="text-lg font-semibold">{formatCurrency(salesData.payment_summary.total_pending)}</div>
                <div className="text-sm text-gray-600">Pending</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Status Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Invoice Status Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Status</th>
                    <th className="text-right p-2">Count</th>
                    <th className="text-right p-2">Total Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {salesData.status_breakdown.map((status) => (
                    <tr key={status.status} className="border-b">
                      <td className="p-2 font-medium capitalize">{status.status}</td>
                      <td className="p-2 text-right">{status.count}</td>
                      <td className="p-2 text-right">{formatCurrency(status.total_amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Daily Sales Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Daily Sales Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Date</th>
                    <th className="text-right p-2">Invoices</th>
                    <th className="text-right p-2">Revenue</th>
                    <th className="text-right p-2">Tax</th>
                  </tr>
                </thead>
                <tbody>
                  {salesData.daily_sales.slice(-10).map((day) => (
                    <tr key={day.date} className="border-b">
                      <td className="p-2">{formatDate(day.date)}</td>
                      <td className="p-2 text-right">{day.invoice_count}</td>
                      <td className="p-2 text-right">{formatCurrency(day.total_amount)}</td>
                      <td className="p-2 text-right">{formatCurrency(day.tax_amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderGstReport = () => {
    if (!gstData) return null;

    return (
      <div className="space-y-6">
        {/* GST Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-blue-600">
                {formatCurrency(gstData.total_taxable_amount)}
              </div>
              <div className="text-sm text-gray-600">Taxable Amount</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(gstData.total_sgst)}
              </div>
              <div className="text-sm text-gray-600">Total SGST</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-purple-600">
                {formatCurrency(gstData.total_cgst)}
              </div>
              <div className="text-sm text-gray-600">Total CGST</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-orange-600">
                {formatCurrency(gstData.total_tax_collected)}
              </div>
              <div className="text-sm text-gray-600">Total Tax Collected</div>
            </CardContent>
          </Card>
        </div>

        {/* GST Rate Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>GST Rate Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">GST Rate</th>
                    <th className="text-right p-2">Invoices</th>
                    <th className="text-right p-2">Taxable Amount</th>
                    <th className="text-right p-2">SGST</th>
                    <th className="text-right p-2">CGST</th>
                    <th className="text-right p-2">Total Tax</th>
                  </tr>
                </thead>
                <tbody>
                  {gstData.gst_rate_breakdown.map((rate) => (
                    <tr key={rate.gst_rate} className="border-b">
                      <td className="p-2 font-medium">{rate.gst_rate}%</td>
                      <td className="p-2 text-right">{rate.invoice_count}</td>
                      <td className="p-2 text-right">{formatCurrency(rate.taxable_amount)}</td>
                      <td className="p-2 text-right">{formatCurrency(rate.sgst_amount)}</td>
                      <td className="p-2 text-right">{formatCurrency(rate.cgst_amount)}</td>
                      <td className="p-2 text-right">{formatCurrency(rate.total_tax)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Monthly GST */}
        <Card>
          <CardHeader>
            <CardTitle>Monthly GST Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Month</th>
                    <th className="text-right p-2">Invoices</th>
                    <th className="text-right p-2">Taxable Amount</th>
                    <th className="text-right p-2">Total Tax</th>
                  </tr>
                </thead>
                <tbody>
                  {gstData.monthly_gst.map((month) => (
                    <tr key={month.month} className="border-b">
                      <td className="p-2 font-medium">{month.month}</td>
                      <td className="p-2 text-right">{month.invoice_count}</td>
                      <td className="p-2 text-right">{formatCurrency(month.taxable_amount)}</td>
                      <td className="p-2 text-right">{formatCurrency(month.total_tax)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderServicesReport = () => {
    if (!servicesData || servicesData.length === 0) return null;

    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Service Popularity & Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Service</th>
                    <th className="text-left p-2">Category</th>
                    <th className="text-right p-2">Orders</th>
                    <th className="text-right p-2">Revenue</th>
                    <th className="text-right p-2">Avg Price</th>
                  </tr>
                </thead>
                <tbody>
                  {servicesData.map((service) => (
                    <tr key={service.service_id} className="border-b">
                      <td className="p-2 font-medium">{service.service_name}</td>
                      <td className="p-2 text-gray-600">{service.category}</td>
                      <td className="p-2 text-right">{service.times_ordered}</td>
                      <td className="p-2 text-right">{formatCurrency(service.total_revenue)}</td>
                      <td className="p-2 text-right">{formatCurrency(service.average_price)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderExpressReport = () => {
    if (!expressData) return null;

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-blue-600">
                {expressData.total_express_orders}
              </div>
              <div className="text-sm text-gray-600">Express Orders</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(expressData.total_express_revenue)}
              </div>
              <div className="text-sm text-gray-600">Express Revenue</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-purple-600">
                {formatCurrency(expressData.average_express_charge)}
              </div>
              <div className="text-sm text-gray-600">Avg Express Charge</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-orange-600">
                {expressData.express_percentage.toFixed(1)}%
              </div>
              <div className="text-sm text-gray-600">Express Orders %</div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold">Reports & Analytics</h1>
        <div className="flex items-center space-x-2">
          <Button onClick={exportReport} variant="outline">
            📊 Export
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-4 sm:space-y-0 sm:space-x-4">
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium">From:</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-auto"
              />
            </div>
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium">To:</label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-auto"
              />
            </div>
            <Button
              onClick={loadReportData}
              disabled={loading}
              className="ml-auto"
            >
              {loading ? 'Loading...' : 'Refresh'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Report Type Selection */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {REPORT_TYPES.map((type) => (
              <button
                key={type.value}
                onClick={() => setActiveReport(type.value)}
                className={`
                  p-3 rounded-lg border text-sm font-medium transition-colors
                  flex items-center justify-center space-x-2
                  ${activeReport === type.value
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                  }
                `}
              >
                <span className="text-base">{type.icon}</span>
                <span>{type.label}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Report Content */}
      {loading ? (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="text-gray-500">Loading report data...</div>
          </CardContent>
        </Card>
      ) : (
        <>
          {activeReport === 'sales' && renderSalesReport()}
          {activeReport === 'gst' && renderGstReport()}
          {activeReport === 'services' && renderServicesReport()}
          {activeReport === 'express' && renderExpressReport()}
        </>
      )}
    </div>
  );
};