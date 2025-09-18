import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AppProvider } from '@/contexts/AppContext';
import { Layout } from '@/components/common/Layout';
import { Dashboard } from '@/components/dashboard/Dashboard';
import { InvoiceForm } from '@/components/invoice/InvoiceForm';
import { InvoiceList } from '@/components/invoice/InvoiceList';
import { CustomerList } from '@/components/customer/CustomerList';
import { StoreList } from '@/components/store/StoreList';
import { ServiceList } from '@/components/service/ServiceList';
import { Reports } from '@/components/reports/Reports';
import { Settings } from '@/components/common/Settings';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <Router>
          <Layout>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/invoice/new" element={<InvoiceForm />} />
              <Route path="/invoice/edit/:id" element={<InvoiceForm />} />
              <Route path="/invoices" element={<InvoiceList />} />
              <Route path="/customers" element={<CustomerList />} />
              <Route path="/stores" element={<StoreList />} />
              <Route path="/services" element={<ServiceList />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </Layout>
        </Router>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
            },
          }}
        />
      </AppProvider>
    </ErrorBoundary>
  );
}

export default App;