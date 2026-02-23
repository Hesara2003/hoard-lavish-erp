import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import Dashboard from '../../components/Dashboard';
import { StoreProvider, useStore } from '../../context/StoreContext';

vi.mock('../../services/supabaseService', () => import('../mocks/supabaseService.mock'));

function AutoLoginDashboard() {
  const { login, users, isLoading } = useStore();
  React.useEffect(() => {
    if (!isLoading && users.length > 0) {
      const admin = users.find(u => u.role === 'ADMIN');
      if (admin) login(admin);
    }
  }, [isLoading, users]);
  return <Dashboard />;
}

function renderDashboard() {
  return render(
    <StoreProvider>
      <AutoLoginDashboard />
    </StoreProvider>
  );
}

describe('Dashboard Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('displays content after loading', async () => {
    renderDashboard();
    await waitFor(() => {
      expect(screen.getAllByRole('button').length).toBeGreaterThan(0);
    }, { timeout: 8000 });
  });
});
