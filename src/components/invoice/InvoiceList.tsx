import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { DataTable } from '../common/DataTable';
import { SearchBar } from '../common/SearchBar';
import { Modal } from '../common/Modal';
import { invoke } from '@tauri-apps/api/tauri';
import { toast } from 'react-hot-toast';

interface Invoice {
  id: number;
  invoice_no: string;
  customer_id: number;
  store_id: number;
  order_datetime: string;
  delivery_datetime: string;
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
  const [newStatus, setNewStatus] = useState('');
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
    if (!selectedInvoice || !newStatus) return;

    try {
      await invoke('update_invoice_status', {
        invoiceId: selectedInvoice.id,
        status: newStatus,
      });

      toast.success('Invoice status updated successfully');
      setShowStatusModal(false);
      setSelectedInvoice(null);
      setNewStatus('');
      loadInvoices();
    } catch (error) {
      console.error('Failed to update status:', error);
      toast.error('Failed to update invoice status');
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

  const generatePDF = async (invoice: Invoice, format: 'a4' | 'a5' | 'thermal') => {
    try {
      const result = await invoke<string>(`generate_invoice_pdf_${format}`, {
        invoiceId: invoice.id,
      });
      toast.success(`PDF generated: ${result}`);
    } catch (error) {
      console.error('Failed to generate PDF:', error);
      toast.error('Failed to generate PDF');
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
              setShowStatusModal(true);
            }}
            title="Update Status"
          >
            ✏️
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => generatePDF(invoice, 'a5')}
            title="Generate PDF"
          >
            📄
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
        title="Update Invoice Status"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Invoice: {selectedInvoice?.invoice_no}
            </label>
            <label className="block text-sm font-medium mb-2">
              New Status
            </label>
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

          <div className="flex justify-end space-x-2">
            <Button
              onClick={() => setShowStatusModal(false)}
              variant="outline"
            >
              Cancel
            </Button>
            <Button onClick={handleStatusUpdate}>
              Update Status
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
    </div>
  );
};