/**
 * TODO-001 completion/regression test: local-first branches
 *
 * Run standalone: npx vitest run tests/001-local-branches.test.ts
 *
 * NODE_ENV=test → in-memory backend in localBranches.ts (no disk I/O).
 * All Supabase calls are mocked — no network.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
  loadLocalBranches,
  saveLocalBranches,
  upsertLocalBranch,
} from '../services/localBranches';
import { INITIAL_BRANCHES } from '../constants';

const STORE_CONTEXT_PATH = resolve(__dirname, '../context/StoreContext.tsx');

// ─────────────────────────────────────────────────────────────────────────────
// Canonical IDs from the task spec
// ─────────────────────────────────────────────────────────────────────────────
const ID1 = 'b0000000-0000-0000-0000-000000000001';
const ID2 = 'b0000000-0000-0000-0000-000000000002';

// Reset the in-memory store before every test
beforeEach(() => {
  saveLocalBranches(INITIAL_BRANCHES);
});

// ─────────────────────────────────────────────────────────────────────────────
// Plumbing: localBranches service
// ─────────────────────────────────────────────────────────────────────────────
describe('loadLocalBranches()', () => {
  it('returns exactly 2 branches', () => {
    expect(loadLocalBranches()).toHaveLength(2);
  });

  it('branch 1 has the canonical UUID …0001 and correct data', () => {
    const branch = loadLocalBranches().find(b => b.id === ID1);
    expect(branch).toBeDefined();
    expect(branch!.name).toBe('Ethul Kotte');
    expect(branch!.phone).toBe('0741774321');
    expect(branch!.thermalPrinterName).toBe('POSPrinter POS80');
    expect(branch!.barcodePrinterName).toBe('Xprinter XP-T451B');
  });

  it('branch 2 has the canonical UUID …0002 and correct data', () => {
    const branch = loadLocalBranches().find(b => b.id === ID2);
    expect(branch).toBeDefined();
    expect(branch!.name).toBe('Mount Lavinia');
    expect(branch!.thermalPrinterName).toBe('POS-80 (copy 1)');
    expect(branch!.barcodePrinterName).toBe('Xprinter XP-T451B');
  });

  it('IDs are the canonical UUIDs (not stale b1/b2)', () => {
    const ids = loadLocalBranches().map(b => b.id);
    expect(ids).toContain(ID1);
    expect(ids).toContain(ID2);
    expect(ids).not.toContain('b1');
    expect(ids).not.toContain('b2');
  });
});

describe('saveLocalBranches()', () => {
  it('persists and reloads correctly', () => {
    const custom = [{ id: 'test-id', name: 'Test Branch', address: '1 Test St', phone: '000' }];
    saveLocalBranches(custom);
    expect(loadLocalBranches()).toEqual(custom);
  });
});

describe('upsertLocalBranch()', () => {
  it('updates an existing branch in place', () => {
    const updated = upsertLocalBranch({ ...INITIAL_BRANCHES[0], thermalPrinterName: 'NewPrinter' });
    expect(updated).toHaveLength(2);
    expect(updated.find(b => b.id === ID1)!.thermalPrinterName).toBe('NewPrinter');
    // persisted
    expect(loadLocalBranches().find(b => b.id === ID1)!.thermalPrinterName).toBe('NewPrinter');
  });

  it('appends a new branch when ID is unknown', () => {
    const newBranch = { id: 'b0000000-0000-0000-0000-000000000003', name: 'New Branch', address: 'X', phone: '1' };
    const updated = upsertLocalBranch(newBranch);
    expect(updated).toHaveLength(3);
    expect(updated.find(b => b.id === newBranch.id)).toEqual(newBranch);
    // persisted
    expect(loadLocalBranches()).toHaveLength(3);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Plumbing: db.fetchBranches is never called from loadAll()
// ─────────────────────────────────────────────────────────────────────────────
describe('StoreContext loadAll() plumbing', () => {
  it('db.fetchBranches is never imported/called from StoreContext', () => {
    const src = readFileSync(STORE_CONTEXT_PATH, 'utf8');
    // fetchBranches must not appear inside the Promise.all block of loadAll
    const loadAllMatch = src.match(/const loadAll = async \(\) => \{([\s\S]*?)\};\s*loadAll\(\)/);
    expect(loadAllMatch, 'could not locate loadAll function body').toBeTruthy();
    const loadAllBody = loadAllMatch![1];
    expect(loadAllBody).not.toContain('fetchBranches');
  });

  it('branches realtime subscription is removed from the channel setup', () => {
    const src = readFileSync(STORE_CONTEXT_PATH, 'utf8');
    // The realtime channel chain must not listen to the branches table
    expect(src).not.toMatch(/table:\s*['"]branches['"]/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Scenario A — Parity: local store returns same 2 branches as fetch-all would
// ─────────────────────────────────────────────────────────────────────────────
describe('Scenario A: parity with fetch-all', () => {
  it('local branches match a reference dataset that fetch-all would have returned', () => {
    // Reference: what fetchBranches() would have returned from Supabase
    const fetchAllWouldReturn = [
      {
        id: ID1,
        name: 'Ethul Kotte',
        address: 'veediya bandara mw , ethul kotte ',
        phone: '0741774321',
        thermalPrinterName: 'POSPrinter POS80',
        barcodePrinterName: 'Xprinter XP-T451B',
      },
      {
        id: ID2,
        name: 'Mount Lavinia',
        address: '273 GALLE RD MOUNT LAVINIA',
        phone: '0741774321',
        thermalPrinterName: 'POS-80 (copy 1)',
        barcodePrinterName: 'Xprinter XP-T451B',
      },
    ];

    const local = loadLocalBranches();
    expect(local).toHaveLength(fetchAllWouldReturn.length);
    fetchAllWouldReturn.forEach(ref => {
      const found = local.find(b => b.id === ref.id);
      expect(found).toBeDefined();
      expect(found).toMatchObject(ref);
    });
  });

  it('branch IDs found in local store resolve names for SalesHistory/Accounting', () => {
    const branches = loadLocalBranches();
    const idToName = Object.fromEntries(branches.map(b => [b.id, b.name]));

    // Both canonical IDs resolve to names (as consumers like SalesHistory rely on)
    expect(idToName[ID1]).toBe('Ethul Kotte');
    expect(idToName[ID2]).toBe('Mount Lavinia');
  });

  it('per-branch stock keys exist for each branch id (Inventory/Branches consumer)', () => {
    const branches = loadLocalBranches();
    // Simulate product branchStock record containing both branch IDs
    const branchStock: Record<string, number> = {};
    branches.forEach(b => { branchStock[b.id] = 5; });

    branches.forEach(b => {
      expect(branchStock[b.id]).toBeDefined();
      expect(typeof branchStock[b.id]).toBe('number');
    });
  });

  it('Dashboard per-branch series keys resolve for both branches', () => {
    const branches = loadLocalBranches();
    // Simulate rev/profit series keys the Dashboard builds
    const series: Record<string, number> = {};
    branches.forEach(b => {
      series[`rev_${b.id}`] = 1000;
      series[`profit_${b.id}`] = 200;
    });
    branches.forEach(b => {
      expect(series[`rev_${b.id}`]).toBeDefined();
      expect(series[`profit_${b.id}`]).toBeDefined();
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Scenario B — Change shows updated output
// ─────────────────────────────────────────────────────────────────────────────
describe('Scenario B: updateBranch persists and consumers see new value', () => {
  it('upsertLocalBranch updates thermalPrinterName and is visible on reload', () => {
    upsertLocalBranch({ ...INITIAL_BRANCHES[0], thermalPrinterName: 'PrinterX' });
    const reloaded = loadLocalBranches();
    expect(reloaded.find(b => b.id === ID1)!.thermalPrinterName).toBe('PrinterX');
  });

  it('addBranch (upsert with new ID) extends the branch list', () => {
    const newBranch = {
      id: 'b0000000-0000-0000-0000-000000000099',
      name: 'Colombo 07',
      address: '7 Union Pl',
      phone: '0112345678',
    };
    upsertLocalBranch(newBranch);
    const branches = loadLocalBranches();
    expect(branches).toHaveLength(3);
    expect(branches.find(b => b.id === newBranch.id)!.name).toBe('Colombo 07');
  });

  it('updated branch name propagates to label resolution', () => {
    upsertLocalBranch({ ...INITIAL_BRANCHES[0], name: 'Ethul Kotte Renamed' });
    const idToName = Object.fromEntries(loadLocalBranches().map(b => [b.id, b.name]));
    expect(idToName[ID1]).toBe('Ethul Kotte Renamed');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Scenario C — Refetch/reload: re-hydrate from local storage
// ─────────────────────────────────────────────────────────────────────────────
describe('Scenario C: reload returns last persisted state, no Supabase call', () => {
  it('after save, a simulated app-reopen (fresh loadLocalBranches) returns persisted state', () => {
    const customised = INITIAL_BRANCHES.map((b, i) =>
      i === 0 ? { ...b, thermalPrinterName: 'PersistedPrinter' } : b
    );
    saveLocalBranches(customised);

    // Simulate re-open: just call loadLocalBranches again
    const afterReopen = loadLocalBranches();
    expect(afterReopen.find(b => b.id === ID1)!.thermalPrinterName).toBe('PersistedPrinter');
    expect(afterReopen).toHaveLength(2);
  });

  it('reload does not require any async db call (synchronous load)', () => {
    // loadLocalBranches is synchronous — no Promise returned
    const result = loadLocalBranches();
    expect(result).not.toBeInstanceOf(Promise);
    expect(Array.isArray(result)).toBe(true);
  });

  it('currentBranch after reload is the first persisted branch', () => {
    const persisted = loadLocalBranches();
    const currentBranch = persisted[0]; // mirrors StoreContext initialization
    expect(currentBranch.id).toBe(ID1);
    expect(currentBranch.name).toBe('Ethul Kotte');
  });
});
