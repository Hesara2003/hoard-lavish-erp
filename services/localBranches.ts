// Electron-store-backed branch persistence.
// In NODE_ENV=test or when electron-store is unavailable, uses an in-memory
// fallback so tests never touch disk.
/* eslint-disable @typescript-eslint/no-var-requires */
import type { Branch } from '../types';
import { INITIAL_BRANCHES } from '../constants';

let Store: any;
try {
  // @ts-ignore
  Store = require('electron-store');
} catch (e) {
  Store = undefined;
}

type Backend = { get: (k: string, def?: any) => any; set: (k: string, v: any) => void };
let backend: Backend;

if (process.env.NODE_ENV === 'test' || !Store) {
  const mem: Record<string, any> = { branches: INITIAL_BRANCHES };
  backend = {
    get: (k: string, def?: any) => (mem[k] === undefined ? def : mem[k]),
    set: (k: string, v: any) => { mem[k] = v; }
  };
} else {
  backend = new Store({ name: 'app_branches', defaults: { branches: INITIAL_BRANCHES } });
}

export const loadLocalBranches = (): Branch[] => backend.get('branches', INITIAL_BRANCHES);

export const saveLocalBranches = (branches: Branch[]): void => {
  backend.set('branches', branches);
};

export const upsertLocalBranch = (branch: Branch): Branch[] => {
  const current = loadLocalBranches();
  const idx = current.findIndex(b => b.id === branch.id);
  const updated = idx >= 0
    ? current.map(b => b.id === branch.id ? branch : b)
    : [...current, branch];
  saveLocalBranches(updated);
  return updated;
};

export default { loadLocalBranches, saveLocalBranches, upsertLocalBranch };
