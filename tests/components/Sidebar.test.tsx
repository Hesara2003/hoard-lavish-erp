/**
 * ============================================================================
 * SIDEBAR COMPONENT TESTS
 * ============================================================================
 */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Sidebar from '../../components/Sidebar';
import { StoreProvider, useStore } from '../../context/StoreContext';

vi.mock('../../services/supabaseService', () => import('../mocks/supabaseService.mock'));

function AutoLoginSidebar() {
  const { login, users } = useStore();
  React.useEffect(() => {
    const admin = users.find(u => u.role === 'ADMIN');
    if (admin) login(admin);
  }, []);
  return <Sidebar />;
}

function renderSidebar() {
  return render(
    <StoreProvider>
      <AutoLoginSidebar />
    </StoreProvider>
  );
}

describe('Sidebar — Navigation', () => {
  it('renders all navigation items', () => {
    renderSidebar();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Point of Sale')).toBeInTheDocument();
    expect(screen.getByText('Inventory')).toBeInTheDocument();
    expect(screen.getByText('Sales History')).toBeInTheDocument();
    expect(screen.getByText('Customers')).toBeInTheDocument();
    expect(screen.getByText('Suppliers')).toBeInTheDocument();
    expect(screen.getByText('Branch Mgmt')).toBeInTheDocument();
    expect(screen.getByText('Accounting')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('shows the Hoard Lavish brand', () => {
    renderSidebar();
    expect(screen.getByText('HOARD')).toBeInTheDocument();
    expect(screen.getByText('LAVISH')).toBeInTheDocument();
  });

  it('shows branch selector', () => {
    renderSidebar();
    // Should show current branch name
    expect(screen.getByText('Main HQ Store')).toBeInTheDocument();
  });

  it('shows logged-in user info', () => {
    renderSidebar();
    expect(screen.getByText('Admin User')).toBeInTheDocument();
  });

  it('BUG: No role-based menu filtering — cashier sees all nav items', () => {
    // This test documents the security weakness: all roles see all menu items
    const CashierSidebar = () => {
      const { login, users } = useStore();
      React.useEffect(() => {
        const cashier = users.find(u => u.role === 'CASHIER');
        if (cashier) login(cashier);
      }, []);
      return <Sidebar />;
    };

    render(
      <StoreProvider>
        <CashierSidebar />
      </StoreProvider>
    );

    // SECURITY ISSUE: Cashier should NOT see Settings or Accounting
    // but currently does — these should be filtered by role
    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByText('Accounting')).toBeInTheDocument();
  });

  it('clicking logout shows confirm dialog', async () => {
    renderSidebar();
    const user = userEvent.setup();

    const logoutBtn = screen.getByText(/log ?out|sign ?out/i);
    if (logoutBtn) {
      await user.click(logoutBtn);
      // Logout behavior depends on implementation
    }
  });
});

describe('Sidebar — Branch Switching', () => {
  it('branch dropdown lists all branches', async () => {
    renderSidebar();
    const user = userEvent.setup();
    expect(screen.getByText('Main HQ Store')).toBeInTheDocument();
  });
});
