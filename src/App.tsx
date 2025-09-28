import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AppProvider } from '@/contexts/AppContext';
import { Layout } from '@/components/common/Layout';
import { Dashboard } from '@/components/dashboard/Dashboard';
import { InvoiceForm } from '@/components/invoice/InvoiceForm';
import { InvoiceList } from '@/components/invoice/InvoiceList';
import { CustomerList } from '@/components/customer/CustomerList';
import { CustomerForm } from '@/components/customer/CustomerForm';
import { StoreList } from '@/components/store/StoreList';
import { StoreForm } from '@/components/store/StoreForm';
import { ServiceList } from '@/components/service/ServiceList';
import { ServiceForm } from '@/components/service/ServiceForm';
import { Reports } from '@/components/reports/Reports';
import { Settings } from '@/components/common/Settings';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { useMigrationCheck } from '@/hooks/useMigrationCheck';
import MigrationDialog from '@/components/MigrationDialog';

function App() {
  const {
    migrationRequired,
    migrationData,
    isChecking,
    handleMigrationComplete,
    handleMigrationDismiss,
  } = useMigrationCheck();

  // Show loading while checking migration status
  if (isChecking) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Initializing database...</p>
        </div>
      </div>
    );
  }

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
              <Route path="/customer/new" element={<CustomerForm />} />
              <Route path="/customer/edit/:id" element={<CustomerForm />} />
              <Route path="/stores" element={<StoreList />} />
              <Route path="/store/new" element={<StoreForm />} />
              <Route path="/store/edit/:id" element={<StoreForm />} />
              <Route path="/services" element={<ServiceList />} />
              <Route path="/service/new" element={<ServiceForm />} />
              <Route path="/service/edit/:id" element={<ServiceForm />} />
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

        {/* Migration Dialog */}
        <MigrationDialog
          isOpen={migrationRequired}
          onClose={handleMigrationDismiss}
          onComplete={handleMigrationComplete}
          migrationData={migrationData}
        />
      </AppProvider>
    </ErrorBoundary>
  );
}

export default App;