# TODO-008: Suppliers — lazy fetch on page open + local-first cache, drop `fetchSuppliers` from the fetch-all

- **ID:** 008
- **Priority:** P1
- **Status:** TODO

## Description

The master `suppliers` list (≤10 rows, rarely changing) is pulled on every
`loadAll` and every `refreshFromSupabase` (30s poll / realtime), and the
`suppliers` table is subscribed for realtime — all wasted egress for a list that
is read on **exactly one page**. Migrate it to **lazy fetch when the Suppliers
page opens**, backed by a **local-first cache** (electron-store, `userData`) for
instant paint + offline, then remove `fetchSuppliers` from both fetch-all paths
and drop the `suppliers` realtime subscription.

`suppliers` (the master list) is read in **only one place** — verified by grep,
nothing else destructures it from `useStore()`:

| Consumer | Site | Reads `suppliers` for |
| --- | --- | --- |
| **Suppliers page** | [Suppliers.tsx:82](../../components/Suppliers.tsx#L82), list [:126](../../components/Suppliers.tsx#L126), `find` lookups [:181](../../components/Suppliers.tsx#L181) / [:237](../../components/Suppliers.tsx#L237) / [:297](../../components/Suppliers.tsx#L297), dropdowns [:438](../../components/Suppliers.tsx#L438) / [:632](../../components/Suppliers.tsx#L632) / [:756](../../components/Suppliers.tsx#L756) | the supplier list + the supplier `<select>` options in the transaction / expense / damaged-goods forms |

Accounting and Dashboard reference suppliers **only via `supplierTransactions`**
(which carries a denormalized `supplierName`), **not** the master list — so
removing `suppliers` from the fetch-all affects nothing outside the Suppliers page.

Background + broader egress effort: [docs/EGRESS_OPTIMIZATION.md](../../docs/EGRESS_OPTIMIZATION.md).
Pattern to mirror: [services/localSettings.ts](../../services/localSettings.ts) and
the sibling local task [TODO-001](TODO-001-local-branches.md) (branches).

## Why local-first, not local-only (key decision)

Suppliers are **shared business data**, unlike branches. Branch printer names are
per-machine, so TODO-001 stores them local-**only**. Suppliers are written to
Supabase today and feed purchase / expense / damaged-goods flows that affect
accounting on **both** branch machines — so a supplier added on one machine **must**
appear on the other. Therefore **Supabase stays the source of truth**; the local
store is only a cache for instant paint + offline. CRUD still writes through to
Supabase so the two machines stay consistent.

- **Mount:** hydrate `suppliers` from `loadLocalSuppliers()` instantly (no fetch).
- **Suppliers page open:** revalidate once with `db.fetchSuppliers()` →
  `setSuppliers(...)` + `saveLocalSuppliers(...)` (stale-while-revalidate). A
  **Refresh** button re-pulls on demand (cross-device path).
- **CRUD:** keep the optimistic `setSuppliers` updates **and** the existing
  write-through to Supabase via `executeWithOfflineQueue`
  ([StoreContext.tsx:1687-1700](../../context/StoreContext.tsx#L1687-L1700)); also
  `saveLocalSuppliers` so the cache matches.

> **Out of scope — `supplierTransactions`.** That is a *separate*, unbounded,
> growing ledger consumed by Accounting + Dashboard. It must **not** go to local
> storage; it needs its own scoped-fetch task later. This task is the ~10-row master
> `suppliers` list **only**. Leave `fetchSupplierTransactions` in the fetch-all here.

## The fetch-all wiring to change (after the page is migrated)

- `loadAll` — remove `db.fetchSuppliers()` [StoreContext.tsx:492](../../context/StoreContext.tsx#L492) and `setSuppliers(suppliersData)` [:535](../../context/StoreContext.tsx#L535); seed `suppliers` from `loadLocalSuppliers()` instead.
- `refreshFromSupabase` — remove `db.fetchSuppliers()` [:584](../../context/StoreContext.tsx#L584) and `setSuppliers(...)` [:602](../../context/StoreContext.tsx#L602).
- Remove the `suppliers` realtime subscription [:659](../../context/StoreContext.tsx#L659) so supplier edits no longer trigger a full refetch.
- Keep `db.fetchSupplierTransactions()` and its `setSupplierTransactions` exactly as-is (out of scope).

## Steps

1. **Create `services/localSuppliers.ts`** mirroring `services/localSettings.ts`
   (and TODO-001's `localBranches.ts`):
   - `electron-store` with a `try/require` guard + in-memory fallback when
     `process.env.NODE_ENV === 'test'` or electron-store is unavailable (copy the
     pattern exactly so tests don't touch disk).
   - Store name `app_suppliers`, key `suppliers`, `defaults: { suppliers: [] }`
     (**no seed data** — unlike branches, there is no canonical list; empty until
     the first revalidate populates it).
   - Export `loadLocalSuppliers(): Supplier[]`, `saveLocalSuppliers(s: Supplier[]): void`.
2. **Wire `StoreContext`:**
   - On init, seed `suppliers` from `loadLocalSuppliers()` (instant) instead of from
     the fetch-all.
   - Remove `db.fetchSuppliers()` / `setSuppliers` from `loadAll` **and**
     `refreshFromSupabase`; remove the `suppliers` realtime subscription.
   - In `addSupplier` / `updateSupplier` / `deleteSupplier`, keep the optimistic
     `setSuppliers` + the `executeWithOfflineQueue` Supabase write-through, and add
     a `saveLocalSuppliers(...)` so the local cache stays in sync.
   - Add a way for the page to trigger a revalidate (e.g. expose a
     `refreshSuppliers()` that calls `db.fetchSuppliers()` → `setSuppliers` +
     `saveLocalSuppliers`).
3. **Suppliers page** ([components/Suppliers.tsx](../../components/Suppliers.tsx)):
   call `refreshSuppliers()` once on mount (revalidate), rendering the cached list
   immediately; add a **Refresh** button. No other change — it keeps reading
   `suppliers` from `useStore()`.
4. **Do not** remove `db.fetchSuppliers` / `insertSupplier` / `updateSupplier` /
   `deleteSupplier` from the service layer — they are still used by the revalidate
   and CRUD write-through. Clean up only genuinely unused imports.
5. **Write the completion/regression test** (see Acceptance) and get it passing
   **before** finalizing the fetch-all removal.

## Files likely involved

- `services/localSuppliers.ts` — **new**, electron-store-backed cache (no seed)
- `context/StoreContext.tsx` — seed from local, drop `fetchSuppliers` from `loadAll`
  + `refreshFromSupabase`, drop `suppliers` realtime sub, add `refreshSuppliers`,
  write-through cache in supplier CRUD
- `components/Suppliers.tsx` — revalidate on open + Refresh button
- `services/db/suppliers.ts` — reference (reuse `fetchSuppliers` / CRUD; no change expected)
- `tests/` — new completion test (colocated, mirrors `utils/revenue.test.ts`)

## Acceptance criteria

- [ ] **Completion verification test** (this task only — `npx vitest run <this-test-file>`,
      not the whole suite; `NODE_ENV=test` in-memory fallback, no disk/network; mock
      `db`/realtime). It must prove the new lazy + local-first method behaves the
      **same** as the old fetch-all for every place suppliers are read, with no
      difference before/after:

      **Plumbing assertions:**
      - `loadAll()` and `refreshFromSupabase()` do **not** call `db.fetchSuppliers`
        (spy → 0 calls); the `suppliers` realtime subscription is removed.
      - `db.fetchSuppliers` is called when the Suppliers page revalidates
        (`refreshSuppliers()` / page mount), **not** before.
      - `fetchSupplierTransactions` is still called in the fetch-all (untouched).

      **Scenario A — Parity (same output as the old fetch-all):** seed the local
      store and a reference dataset where `db.fetchSuppliers` *would* have returned
      the same suppliers, then assert the Suppliers page derives identical output
      under both — **the checks before and after must match in every fetched area**:
      | Area in Suppliers.tsx | Output to compare |
      | --- | --- |
      | Supplier list (`filteredSuppliers`) | same rows/order for a given search |
      | Transaction form dropdown [:438] | same `<option>` set (id → name) |
      | Expense form dropdown [:632] | same `<option>` set |
      | Damaged-goods dropdown [:756] | same `<option>` set |
      | `find` lookups [:181/:237/:297] | resolve the same supplier by id |

      **Scenario B — Change shows changed output + cross-machine safety:**
      `addSupplier` / `updateSupplier` / `deleteSupplier` → assert the optimistic
      `setSuppliers` updates the list/dropdowns, the local cache is written
      (`saveLocalSuppliers`), **and** the Supabase write-through (`db.insert/update/
      deleteSupplier`) still fires (so the other machine will see it on its next
      revalidate). A pure-local-only approach would skip the Supabase write — assert
      it is **not** skipped.

      **Scenario C — Reload/offline shows correct cached output:** simulate app
      reopen → `suppliers` hydrate from `loadLocalSuppliers()` with **no**
      `db.fetchSuppliers` call (instant paint, survives app update); then a
      `refreshSuppliers()` revalidate merges fresh rows and persists them. With the
      network unavailable, the cached list still renders.
- [ ] No component reads suppliers from the global fetch-all path; the Suppliers
      page populates via hydrate-then-revalidate.
- [ ] App runs; the Suppliers page list and all three supplier dropdowns show the
      correct suppliers, adding/editing/deleting a supplier still persists to
      Supabase and survives an app restart/update via the local cache.
