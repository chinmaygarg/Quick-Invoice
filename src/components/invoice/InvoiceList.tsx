import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { DataTable } from '../common/DataTable';
import { SearchBar } from '../common/SearchBar';
import { Modal } from '../common/Modal';
import { InvoiceHTMLPreview } from './InvoiceHTMLPreview';
import { invoke } from '@tauri-apps/api/tauri';
import { open } from '@tauri-apps/api/shell';
import { toast } from 'react-hot-toast';

interface Invoice {
  id: number;
  invoice_no: string;
  customer_id: number;
  store_id: number;
  order_datetime: string;
  delivery_datetime?: string;
  subtotal: number;
  discount: number;
  express_charge: number;
  sgst_amount: number;
  cgst_amount: number;
  igst_amount: number;
  total: number;
  gst_inclusive: boolean;
  payment_method?: string;
  payment_amount?: number;
  status: string;
  notes?: string;
  created_at: string;
}

interface InvoiceSearchQuery {
  query?: string;
  customer_id?: number;
  store_id?: number;
  status?: string;
  date_from?: string;
  date_to?: string;
  limit?: number;
  offset?: number;
}

interface Customer {
  id: number;
  name: string;
  phone?: string;
}

interface Store {
  id: number;
  name: string;
  gstin?: string;
}

const STATUS_OPTIONS = [
  { value: '', label: 'All Status' },
  { value: 'pending', label: 'Pending', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'processing', label: 'Processing', color: 'bg-blue-100 text-blue-800' },
  { value: 'ready', label: 'Ready', color: 'bg-purple-100 text-purple-800' },
  { value: 'delivered', label: 'Delivered', color: 'bg-green-100 text-green-800' },
  { value: 'cancelled', label: 'Cancelled', color: 'bg-red-100 text-red-800' },
];

const PAYMENT_STATUS_COLORS = {
  paid: 'bg-green-100 text-green-800',
  partial: 'bg-yellow-100 text-yellow-800',
  pending: 'bg-red-100 text-red-800',
  credit: 'bg-blue-100 text-blue-800',
};

const PAYMENT_METHODS = [
  { value: '', label: 'Select Payment Method' },
  { value: 'cash', label: 'Cash' },
  { value: 'card', label: 'Card' },
  { value: 'upi', label: 'UPI' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'credit', label: 'Credit' },
];

export const InvoiceList: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [customerFilter, setCustomerFilter] = useState('');
  const [storeFilter, setStoreFilter] = useState('');
  const [dateFromFilter, setDateFromFilter] = useState('');
  const [dateToFilter, setDateToFilter] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showHTMLPreview, setShowHTMLPreview] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [newPaymentMethod, setNewPaymentMethod] = useState('');
  const [newPaymentAmount, setNewPaymentAmount] = useState<number>(0);
  const [newDeliveryDate, setNewDeliveryDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 20;

  useEffect(() => {
    loadInvoices();
    loadCustomers();
    loadStores();
  }, [currentPage, searchQuery, statusFilter, customerFilter, storeFilter, dateFromFilter, dateToFilter]);

  const loadInvoices = async () => {
    try {
      setLoading(true);
      const query: InvoiceSearchQuery = {
        limit: itemsPerPage,
        offset: (currentPage - 1) * itemsPerPage,
      };

      if (searchQuery) query.query = searchQuery;
      if (statusFilter) query.status = statusFilter;
      if (customerFilter) query.customer_id = parseInt(customerFilter);
      if (storeFilter) query.store_id = parseInt(storeFilter);
      if (dateFromFilter) query.date_from = dateFromFilter;
      if (dateToFilter) query.date_to = dateToFilter;

      const result = await invoke<Invoice[]>('search_invoices', { query });
      setInvoices(result);

      // Calculate total pages (this is a simplified approach)
      setTotalPages(Math.ceil(result.length / itemsPerPage));
    } catch (error) {
      console.error('Failed to load invoices:', error);
      toast.error('Failed to load invoices');
    } finally {
      setLoading(false);
    }
  };

  const loadCustomers = async () => {
    try {
      const result = await invoke<Customer[]>('get_customers_with_stats');
      setCustomers(result);
    } catch (error) {
      console.error('Failed to load customers:', error);
    }
  };

  const loadStores = async () => {
    try {
      const result = await invoke<Store[]>('get_active_stores');
      setStores(result);
    } catch (error) {
      console.error('Failed to load stores:', error);
    }
  };

  const handleStatusUpdate = async () => {
    if (!selectedInvoice) return;

    try {
      // Build update request with only the fields that have changed
      const updateRequest: any = {};

      if (newStatus && newStatus !== selectedInvoice.status) {
        updateRequest.status = newStatus;
      }

      if (newPaymentMethod && newPaymentMethod !== (selectedInvoice.payment_method || '')) {
        updateRequest.payment_method = newPaymentMethod;
      }

      if (newPaymentAmount !== (selectedInvoice.payment_amount || 0)) {
        updateRequest.payment_amount = newPaymentAmount;
      }

      if (newDeliveryDate && newDeliveryDate !== (selectedInvoice.delivery_datetime?.split('T')[0] || '')) {
        updateRequest.delivery_datetime = newDeliveryDate ? `${newDeliveryDate}T19:00:00` : null;
      }

      // Only update if there are changes
      if (Object.keys(updateRequest).length === 0) {
        toast.error('No changes to update');
        return;
      }

      await invoke('update_invoice_details', {
        invoiceId: selectedInvoice.id,
        request: updateRequest,
      });

      toast.success('Invoice updated successfully');
      setShowStatusModal(false);
      setSelectedInvoice(null);
      setNewStatus('');
      setNewPaymentMethod('');
      setNewPaymentAmount(0);
      setNewDeliveryDate('');
      loadInvoices();
    } catch (error) {
      console.error('Failed to update invoice:', error);
      toast.error('Failed to update invoice');
    }
  };

  const handleDeleteInvoice = async () => {
    if (!selectedInvoice) return;

    try {
      await invoke('delete_invoice', { invoiceId: selectedInvoice.id });
      toast.success('Invoice deleted successfully');
      setShowDeleteModal(false);
      setSelectedInvoice(null);
      loadInvoices();
    } catch (error) {
      console.error('Failed to delete invoice:', error);
      toast.error('Failed to delete invoice');
    }
  };

  const generateInvoice = async (invoice: Invoice, format: 'a4' | 'a5' | 'thermal') => {
    try {
      const filePath = await invoke<string>('save_and_open_invoice_html', {
        invoiceId: invoice.id,
        format: format,
      });

      toast.success(`Invoice opened in browser for printing: ${filePath.split('/').pop()}`);
    } catch (error) {
      console.error('Failed to generate invoice:', error);
      toast.error('Failed to generate invoice');
    }
  };

  const getPaymentStatus = (invoice: Invoice): string => {
    if (!invoice.payment_amount) return 'pending';
    if (invoice.payment_amount >= invoice.total) return 'paid';
    if (invoice.payment_amount > 0) return 'partial';
    if (invoice.payment_method === 'credit') return 'credit';
    return 'pending';
  };

  const getStatusColor = (status: string): string => {
    const option = STATUS_OPTIONS.find(opt => opt.value === status);
    return option?.color || 'bg-gray-100 text-gray-800';
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const formatDateTime = (dateString: string): string => {
    return new Date(dateString).toLocaleString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getCustomerName = (customerId: number): string => {
    const customer = customers.find(c => c.id === customerId);
    return customer?.name || 'Unknown Customer';
  };

  const getStoreName = (storeId: number): string => {
    const store = stores.find(s => s.id === storeId);
    return store?.name || 'Unknown Store';
  };

  const columns = [
    {
      key: 'invoice_no',
      header: 'Invoice No.',
      render: (invoice: Invoice) => (
        <div className="font-medium text-blue-600">{invoice.invoice_no}</div>
      ),
    },
    {
      key: 'customer',
      header: 'Customer',
      render: (invoice: Invoice) => (
        <div>
          <div className="font-medium">{getCustomerName(invoice.customer_id)}</div>
          <div className="text-sm text-gray-500">{formatDate(invoice.order_datetime)}</div>
        </div>
      ),
    },
    {
      key: 'store',
      header: 'Store',
      render: (invoice: Invoice) => (
        <div className="text-sm">{getStoreName(invoice.store_id)}</div>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      render: (invoice: Invoice) => (
        <div className="text-right">
          <div className="font-medium">₹{invoice.total.toFixed(2)}</div>
          {invoice.discount > 0 && (
            <div className="text-sm text-green-600">-₹{invoice.discount.toFixed(2)} disc</div>
          )}
        </div>
      ),
    },
    {
      key: 'payment',
      header: 'Payment',
      render: (invoice: Invoice) => {
        const status = getPaymentStatus(invoice);
        return (
          <div>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${PAYMENT_STATUS_COLORS[status as keyof typeof PAYMENT_STATUS_COLORS]}`}>
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </span>
            {invoice.payment_amount && invoice.payment_amount > 0 && (
              <div className="text-xs text-gray-500 mt-1">
                ₹{invoice.payment_amount.toFixed(2)}
              </div>
            )}
          </div>
        );
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (invoice: Invoice) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(invoice.status)}`}>
          {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (invoice: Invoice) => (
        <div className="flex space-x-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setSelectedInvoice(invoice);
              setNewStatus(invoice.status);
              setNewPaymentMethod(invoice.payment_method || '');
              setNewPaymentAmount(invoice.payment_amount || 0);
              setNewDeliveryDate(invoice.delivery_datetime?.split('T')[0] || '');
              setShowStatusModal(true);
            }}
            title="Update Status"
          >
            ✏️
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => generateInvoice(invoice, 'a5')}
            title="Print Invoice"
          >
            🖨️
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setSelectedInvoice(invoice);
              setShowHTMLPreview(true);
            }}
            title="View HTML"
          >
            👁️
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setSelectedInvoice(invoice);
              setShowDeleteModal(true);
            }}
            className="text-red-600 hover:text-red-800"
            title="Delete Invoice"
          >
            🗑️
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Invoice Management</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Search and Filters */}
          <div className="space-y-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <SearchBar
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Search invoice number, notes..."
              />

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              <select
                value={customerFilter}
                onChange={(e) => setCustomerFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Customers</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <select
                value={storeFilter}
                onChange={(e) => setStoreFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Stores</option>
                {stores.map((store) => (
                  <option key={store.id} value={store.id}>
                    {store.name}
                  </option>
                ))}
              </select>

              <Input
                type="date"
                value={dateFromFilter}
                onChange={(e) => setDateFromFilter(e.target.value)}
                placeholder="From Date"
              />

              <Input
                type="date"
                value={dateToFilter}
                onChange={(e) => setDateToFilter(e.target.value)}
                placeholder="To Date"
              />
            </div>

            <div className="flex justify-between items-center">
              <Button
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('');
                  setCustomerFilter('');
                  setStoreFilter('');
                  setDateFromFilter('');
                  setDateToFilter('');
                }}
                variant="outline"
              >
                Clear Filters
              </Button>

              <div className="text-sm text-gray-500">
                Total: {invoices.length} invoices
              </div>
            </div>
          </div>

          {/* Invoice Table */}
          <DataTable
            data={invoices}
            columns={columns}
            loading={loading}
            emptyMessage="No invoices found"
          />

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center space-x-2 mt-6">
              <Button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                variant="outline"
                size="sm"
              >
                Previous
              </Button>

              <span className="text-sm text-gray-600">
                Page {currentPage} of {totalPages}
              </span>

              <Button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                variant="outline"
                size="sm"
              >
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Status Update Modal */}
      <Modal
        isOpen={showStatusModal}
        onClose={() => setShowStatusModal(false)}
        title="Update Invoice Details"
      >
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-3 text-gray-700">
              Invoice: <span className="font-bold">{selectedInvoice?.invoice_no}</span>
            </label>
          </div>

          {/* Order Status Section */}
          <div className="border rounded-lg p-4 space-y-3">
            <h3 className="text-md font-medium text-gray-800">Order Status</h3>
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {STATUS_OPTIONS.slice(1).map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Payment Details Section */}
          <div className="border rounded-lg p-4 space-y-3">
            <h3 className="text-md font-medium text-gray-800">Payment Details</h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-600">
                  Payment Method
                </label>
                <select
                  value={newPaymentMethod}
                  onChange={(e) => setNewPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {PAYMENT_METHODS.map((method) => (
                    <option key={method.value} value={method.value}>
                      {method.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-gray-600">
                  Payment Amount (₹)
                </label>
                <input
                  type="number"
                  value={newPaymentAmount}
                  onChange={(e) => setNewPaymentAmount(Number(e.target.value))}
                  min="0"
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Quick Payment Actions */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setNewPaymentAmount(selectedInvoice?.total || 0)}
                className="px-3 py-1 text-xs bg-green-100 text-green-700 rounded-full hover:bg-green-200"
              >
                Mark as Fully Paid
              </button>
              <button
                onClick={() => {
                  setNewPaymentAmount(0);
                  setNewPaymentMethod('');
                }}
                className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200"
              >
                Clear Payment
              </button>
            </div>
          </div>

          {/* Delivery Details Section */}
          <div className="border rounded-lg p-4 space-y-3">
            <h3 className="text-md font-medium text-gray-800">Delivery Details</h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-600">
                  Delivery Date
                </label>
                <input
                  type="date"
                  value={newDeliveryDate}
                  onChange={(e) => setNewDeliveryDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-end">
                <button
                  onClick={() => {
                    const today = new Date().toISOString().split('T')[0];
                    setNewDeliveryDate(today);
                    setNewStatus('delivered');
                  }}
                  className="px-3 py-2 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200"
                >
                  Mark as Delivered Now
                </button>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button
              onClick={() => setShowStatusModal(false)}
              variant="outline"
            >
              Cancel
            </Button>
            <Button onClick={handleStatusUpdate}>
              Update Invoice
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Invoice"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Are you sure you want to delete invoice <strong>{selectedInvoice?.invoice_no}</strong>?
            This action cannot be undone.
          </p>

          <div className="flex justify-end space-x-2">
            <Button
              onClick={() => setShowDeleteModal(false)}
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              onClick={handleDeleteInvoice}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete Invoice
            </Button>
          </div>
        </div>
      </Modal>

      {/* HTML Preview Modal */}
      {selectedInvoice && (
        <InvoiceHTMLPreview
          isOpen={showHTMLPreview}
          onClose={() => {
            setShowHTMLPreview(false);
            setSelectedInvoice(null);
          }}
          invoiceId={selectedInvoice.id}
          invoiceNo={selectedInvoice.invoice_no}
        />
      )}
    </div>
  );
};