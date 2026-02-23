import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import Dashboard from '../../components/Dashboard';
import { StoreProvider, useStore } from '../../context/StoreContext';

vi.mock('../../services/supabaseService', () => import('../mocks/supabaseService.mock'));

// Mock jsPDF - vi.hoisted ensures the mock is available when vi.mock runs
const { mockJsPDFInstance, mockJsPDFConstructor } = vi.hoisted(() => {
  const instance = {
    internal: {
      pageSize: {
        getWidth: () => 210,
        getHeight: () => 297
      }
    },
    save: vi.fn(),
    text: vi.fn(),
    setFillColor: vi.fn(),
    rect: vi.fn(),
    setTextColor: vi.fn(),
    setFontSize: vi.fn(),
    setFont: vi.fn(),
    setDrawColor: vi.fn(),
    line: vi.fn(),
    setPage: vi.fn(),
    getNumberOfPages: vi.fn().mockReturnValue(1)
  };
  return {
    mockJsPDFInstance: instance,
    mockJsPDFConstructor: vi.fn(() => instance)
  };
});

vi.mock('jspdf', () => ({
  jsPDF: mockJsPDFConstructor
}));

vi.mock('jspdf-autotable', () => ({
  default: vi.fn()
}));

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

  it('renders download report button', async () => {
    renderDashboard();
    await waitFor(() => {
      const downloadButton = screen.getByRole('button', { name: /report/i });
      expect(downloadButton).toBeInTheDocument();
    }, { timeout: 8000 });
  });

  it('creates PDF when download button is clicked', async () => {
    renderDashboard();
    
    await waitFor(() => {
      expect(screen.getAllByRole('button').length).toBeGreaterThan(0);
    }, { timeout: 8000 });

    const downloadButton = screen.getByRole('button', { name: /report/i });
    
    // Clicking should not throw an error - PDF generation works
    expect(() => fireEvent.click(downloadButton)).not.toThrow();
    
    // Verify jsPDF constructor was called (PDF was created)
    expect(mockJsPDFConstructor).toHaveBeenCalled();
  });

  it('displays daily/monthly filter toggle', async () => {
    renderDashboard();
    await waitFor(() => {
      expect(screen.getByText('Daily')).toBeInTheDocument();
      expect(screen.getByText('Monthly')).toBeInTheDocument();
    }, { timeout: 8000 });
  });
});
