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

// Main Layout Component handling the view switching
const Layout: React.FC = () => {
  const { currentView } = useStore();

  const renderView = () => {
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

const App: React.FC = () => {
  return (
    <StoreProvider>
      <Layout />
    </StoreProvider>
  );
};

export default App;
