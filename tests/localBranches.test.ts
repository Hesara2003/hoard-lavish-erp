import { describe, it, expect, beforeEach } from 'vitest';
import {
  loadLocalBranches,
  saveLocalBranches,
  upsertLocalBranch,
} from '../services/localBranches';
import { INITIAL_BRANCHES } from '../constants';
import type { Branch } from '../types';

const BRANCH_1_ID = 'b0000000-0000-0000-0000-000000000001';
const BRANCH_2_ID = 'b0000000-0000-0000-0000-000000000002';

// Reset to canonical defaults before each test (in-memory backend is module-level)
beforeEach(() => {
  saveLocalBranches(INITIAL_BRANCHES);
});

describe('localBranches — unit', () => {
  it('loads the 2 canonical branches with correct UUIDs and printer names', () => {
    const branches = loadLocalBranches();
    expect(branches).toHaveLength(2);

    const b1 = branches.find(b => b.id === BRANCH_1_ID);
    expect(b1).toBeDefined();
    expect(b1!.name).toBe('Ethul Kotte');
    expect(b1!.thermalPrinterName).toBe('POSPrinter POS80');
    expect(b1!.barcodePrinterName).toBe('Xprinter XP-T451B');

    const b2 = branches.find(b => b.id === BRANCH_2_ID);
    expect(b2).toBeDefined();
    expect(b2!.name).toBe('Mount Lavinia');
    expect(b2!.thermalPrinterName).toBe('POS-80 (copy 1)');
    expect(b2!.barcodePrinterName).toBe('Xprinter XP-T451B');
  });

  it('saveLocalBranches persists and loadLocalBranches returns the saved list', () => {
    const custom: Branch[] = [
      {
        id: BRANCH_1_ID,
        name: 'Ethul Kotte Updated',
        address: 'new address',
        phone: '0000000000',
        thermalPrinterName: 'NewPrinter',
        barcodePrinterName: 'NewBarcode',
      },
    ];
    saveLocalBranches(custom);
    const loaded = loadLocalBranches();
    expect(loaded).toHaveLength(1);
    expect(loaded[0].name).toBe('Ethul Kotte Updated');
    expect(loaded[0].thermalPrinterName).toBe('NewPrinter');
  });

  it('upsertLocalBranch — updates existing branch by id', () => {
    const updated: Branch = {
      id: BRANCH_1_ID,
      name: 'Ethul Kotte',
      address: 'veediya bandara mw , ethul kotte ',
      phone: '0741774321',
      thermalPrinterName: 'New POS Printer',
      barcodePrinterName: 'Xprinter XP-T451B',
    };
    const result = upsertLocalBranch(updated);
    expect(result).toHaveLength(2);
    const b1 = result.find(b => b.id === BRANCH_1_ID)!;
    expect(b1.thermalPrinterName).toBe('New POS Printer');
    // Other branch unchanged
    const b2 = result.find(b => b.id === BRANCH_2_ID)!;
    expect(b2.thermalPrinterName).toBe('POS-80 (copy 1)');
  });

  it('upsertLocalBranch — appends new branch if id not found', () => {
    const newBranch: Branch = {
      id: 'b0000000-0000-0000-0000-000000000003',
      name: 'Colombo City',
      address: '100 Galle Face Rd',
      phone: '0112345678',
    };
    const result = upsertLocalBranch(newBranch);
    expect(result).toHaveLength(3);
    expect(result[2].name).toBe('Colombo City');
  });
});

describe('Scenario A — Parity: loadLocalBranches returns same data a fetchBranches would', () => {
  it('branch list matches canonical seed exactly', () => {
    const branches = loadLocalBranches();
    // Canonical data that Supabase branches table contains
    const expected = [
      {
        id: BRANCH_1_ID,
        name: 'Ethul Kotte',
        address: 'veediya bandara mw , ethul kotte ',
        phone: '0741774321',
        thermalPrinterName: 'POSPrinter POS80',
        barcodePrinterName: 'Xprinter XP-T451B',
      },
      {
        id: BRANCH_2_ID,
        name: 'Mount Lavinia',
        address: '273 GALLE RD MOUNT LAVINIA',
        phone: '0741774321',
        thermalPrinterName: 'POS-80 (copy 1)',
        barcodePrinterName: 'Xprinter XP-T451B',
      },
    ];
    expect(branches).toEqual(expected);
  });

  it('currentBranch resolves to first branch — same as branchesData[0] would have been', () => {
    const branches = loadLocalBranches();
    const currentBranch = branches[0];
    expect(currentBranch.id).toBe(BRANCH_1_ID);
    expect(currentBranch.name).toBe('Ethul Kotte');
  });

  it('per-branch ids exist for both branches — Inventory/Branches/Dashboard consumers can look up branch', () => {
    const branches = loadLocalBranches();
    const branchIds = branches.map(b => b.id);
    expect(branchIds).toContain(BRANCH_1_ID);
    expect(branchIds).toContain(BRANCH_2_ID);
  });
});

describe('Scenario B — Change shows changed output', () => {
  it('updateBranch: upsertLocalBranch updates printer name and persists', () => {
    const updated = upsertLocalBranch({
      id: BRANCH_1_ID,
      name: 'Ethul Kotte',
      address: 'veediya bandara mw , ethul kotte ',
      phone: '0741774321',
      thermalPrinterName: 'UPDATED-PRINTER',
      barcodePrinterName: 'Xprinter XP-T451B',
    });
    // In-memory store is updated
    const reloaded = loadLocalBranches();
    const b1 = reloaded.find(b => b.id === BRANCH_1_ID)!;
    expect(b1.thermalPrinterName).toBe('UPDATED-PRINTER');
    // Branch 2 is unaffected
    const b2 = reloaded.find(b => b.id === BRANCH_2_ID)!;
    expect(b2.thermalPrinterName).toBe('POS-80 (copy 1)');
  });

  it('addBranch: saveLocalBranches with new branch and then load returns updated list', () => {
    const current = loadLocalBranches();
    const newBranch: Branch = {
      id: 'b0000000-0000-0000-0000-000000000099',
      name: 'New Branch',
      address: '99 Test St',
      phone: '0000000099',
    };
    saveLocalBranches([...current, newBranch]);
    const loaded = loadLocalBranches();
    expect(loaded).toHaveLength(3);
    expect(loaded.find(b => b.id === 'b0000000-0000-0000-0000-000000000099')).toBeDefined();
  });
});

describe('Scenario C — Refetch/reload shows correct cached output', () => {
  it('after saving custom branches, re-hydrating (simulated app reopen) returns last persisted state', () => {
    // Simulate a change during session
    const modified = upsertLocalBranch({
      id: BRANCH_2_ID,
      name: 'Mount Lavinia',
      address: '273 GALLE RD MOUNT LAVINIA',
      phone: '0741774321',
      thermalPrinterName: 'BARCODE-UPDATED',
      barcodePrinterName: 'NewBarcode2',
    });
    expect(modified.find(b => b.id === BRANCH_2_ID)!.thermalPrinterName).toBe('BARCODE-UPDATED');

    // Simulate app reopen by calling loadLocalBranches again (in-memory backend persists within process)
    const rehydrated = loadLocalBranches();
    expect(rehydrated).toHaveLength(2);
    const b2 = rehydrated.find(b => b.id === BRANCH_2_ID)!;
    expect(b2.thermalPrinterName).toBe('BARCODE-UPDATED');
    expect(b2.barcodePrinterName).toBe('NewBarcode2');
    // Branch 1 is unchanged
    const b1 = rehydrated.find(b => b.id === BRANCH_1_ID)!;
    expect(b1.thermalPrinterName).toBe('POSPrinter POS80');
  });

  it('no Supabase call needed — local cache satisfies all consumers', () => {
    // The in-memory backend does not require any network call.
    // loadLocalBranches always returns synchronously from memory.
    const start = Date.now();
    const branches = loadLocalBranches();
    const elapsed = Date.now() - start;
    expect(branches).toHaveLength(2);
    // Synchronous — well under 5ms
    expect(elapsed).toBeLessThan(5);
  });
});
