import React from 'react';
import { StoreProvider, useStore } from './context/StoreContext';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import POS from './components/POS';
import Inventory from './components/Inventory';
import SalesHistory from './components/SalesHistory';
import Branches from './components/Branches';
import Suppliers from './components/Suppliers';
import Accounting from './components/Accounting';
import Customers from './components/Customers';
import Settings from './components/Settings';
import LoginPage from './components/LoginPage';
import UpdateNotification from './components/UpdateNotification';

// Database Error Banner
const DbErrorBanner: React.FC = () => {
  const { dbError, dismissDbError, syncData } = useStore();
  const [syncing, setSyncing] = React.useState(false);

  if (!dbError) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-red-600 text-white px-4 py-2 flex items-center justify-between shadow-lg">
      <div className="flex items-center gap-2 text-sm">
        <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span><strong>Database Error:</strong> {dbError}</span>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={async () => { setSyncing(true); await syncData(); setSyncing(false); }}
          className="px-3 py-1 text-xs font-medium bg-white/20 hover:bg-white/30 rounded transition-colors"
        >
          {syncing ? 'Syncing...' : 'Retry Sync'}
        </button>
        <button
          onClick={dismissDbError}
          className="px-2 py-1 text-xs font-medium bg-white/20 hover:bg-white/30 rounded transition-colors"
        >
          ✕
        </button>
      </div>
    </div>
  );
};

// Main Layout Component handling the view switching
const Layout: React.FC = () => {
  const { currentView, currentUser } = useStore();
  const role = currentUser?.role || 'CASHIER';

  const renderView = () => {
    // Role-based view guards
    if (currentView === 'SETTINGS' && role !== 'ADMIN') return <Dashboard />;
    if (currentView === 'BRANCHES' && role !== 'ADMIN') return <Dashboard />;
    if (currentView === 'SUPPLIERS' && role === 'CASHIER') return <Dashboard />;
    if (currentView === 'ACCOUNTING' && role === 'CASHIER') return <Dashboard />;

    switch (currentView) {
      case 'DASHBOARD':
        return <Dashboard />;
      case 'POS':
        return <POS />;
      case 'INVENTORY':
        return <Inventory />;
      case 'CUSTOMERS':
        return <Customers />;
      case 'SUPPLIERS':
        return <Suppliers />;
      case 'ACCOUNTING':
        return <Accounting />;
      case 'HISTORY':
        return <SalesHistory />;
      case 'BRANCHES':
        return <Branches />;
      case 'SETTINGS':
        return <Settings />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="flex h-screen w-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 flex overflow-hidden relative">
        {renderView()}
      </main>
    </div>
  );
};

const AppContent: React.FC = () => {
  const { currentUser } = useStore();

  if (!currentUser) {
    return <LoginPage />;
  }

  return <Layout />;
};

const App: React.FC = () => {
  return (
    <StoreProvider>
      <DbErrorBanner />
      <AppContent />
      <UpdateNotification />
    </StoreProvider>
  );
};

export default App;

