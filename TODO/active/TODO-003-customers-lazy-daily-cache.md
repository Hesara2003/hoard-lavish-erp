# TODO-003: Customers — lazy load + daily cache (drop from fetch-all)

- **ID:** 003
- **Priority:** P2
- **Status:** TODO

## Description

`fetchCustomers` runs on mount in the fetch-all and on every poll/realtime event,
but customers are only needed in two places. Make them **lazy + cached for the
day** instead:

- **Not fetched on mount.** Remove `fetchCustomers` from `loadAll()`, from
  `refreshFromSupabase()`, and remove the `customers` realtime subscription.
- **POS checkout:** the **first time** the customer picker is opened, fetch all
  customers once and **cache for the entire day**. Every subsequent checkout reads
  customers from the cache (no refetch).
- **Customers page:** loads from the cache (so it does **not** refetch on every
  visit); add a **Refresh button** that force-fetches and replaces the cache.
- **On writes** (`addCustomer` / `updateCustomer` / `deleteCustomer`): update the
  cache so it stays correct without a refetch.

### Verified usage (so lazy loading is safe)

- **Dashboard does NOT use the `customers` array** — it only reads
  `sale.customerName` / `sale.customerId` denormalized on each sale
  ([Dashboard/index.tsx:198](../../components/Dashboard/index.tsx#L198),
  [742](../../components/Dashboard/index.tsx#L742),
  [1429](../../components/Dashboard/index.tsx#L1429)). The `customers` entry in its
  `useStore()` destructure ([line 19](../../components/Dashboard/index.tsx#L19)) is
  unused — **remove it**. Dashboard output is unaffected by this task.
- **POS** uses customers only in the checkout picker
  ([POS/index.tsx:438-445](../../components/POS/index.tsx#L438-L445)) and
  `completeSale` does `customers.find(c => c.id === customerId)` to stamp
  `customerName` (~[StoreContext.tsx:998](../../context/StoreContext.tsx#L998)) —
  so the selected customer **must** be present in the cached `customers` state.
- **Customers page** uses the list + CRUD
  ([Customers.tsx:22](../../components/Customers.tsx#L22)).

Pattern to mirror: the daily-cache approach in
[TODO-002](TODO-002-products-realtime-qty-cache.md) and the electron-store helper
[services/localSettings.ts](../../services/localSettings.ts). Background:
[docs/EGRESS_OPTIMIZATION.md](../../docs/EGRESS_OPTIMIZATION.md).

## Steps

1. **Create `services/localCustomers.ts`** (mirror `localSettings.ts`:
   electron-store + in-memory fallback when `NODE_ENV==='test'`). Persist the
   customer list plus a `cachedDate` (YYYY-MM-DD). Exports:
   `loadCachedCustomers()`, `saveCachedCustomers(customers, date)`,
   `upsertCachedCustomer(customer)`, `removeCachedCustomer(id)`,
   `isCacheFresh()` (cachedDate === today).
2. **StoreContext — lazy load actions:**
   - Add `loadCustomers()`: if `isCacheFresh()`, hydrate `customers` state from
     cache (no network); else `await db.fetchCustomers()`, set state, and
     `saveCachedCustomers(..., today)`. Make it idempotent / guarded so repeated
     calls in a session don't refetch.
   - Add `refreshCustomers()`: force `db.fetchCustomers()`, set state, and
     overwrite the cache with today's date (for the Customers page button).
   - Expose both via the context value + `StoreContextType`.
3. **Remove customers from the fetch-all:**
   - Delete `db.fetchCustomers()` + `setCustomers(customersData)` from `loadAll()`.
   - Delete `db.fetchCustomers()` + `setCustomers` from `refreshFromSupabase()`.
   - Remove the `.on('postgres_changes', { table: 'customers' }, onEvent)` line in
     the realtime effect.
4. **Writes update the cache:** in `addCustomer` / `updateCustomer` /
   `deleteCustomer`, after the optimistic `setCustomers`, also call
   `upsertCachedCustomer` / `removeCachedCustomer` so the cache matches state.
5. **POS checkout:** call `loadCustomers()` the first time the customer picker is
   opened (lazy). Keep the local filter on the cached `customers`. Ensure a
   selected customer remains in state so `completeSale` can stamp `customerName`.
6. **Customers page:** call `loadCustomers()` on mount (uses cache if fresh, so no
   refetch on revisit) and add a **Refresh** button wired to `refreshCustomers()`
   (with a spinner/disabled state while loading).
7. **Write the completion verification test** (see Acceptance) and get it passing
   before finalizing step 3.

## Files likely involved

- `services/localCustomers.ts` — **new** day-cache helper
- `context/StoreContext.tsx` — add `loadCustomers`/`refreshCustomers`, remove
  customers from `loadAll` + `refreshFromSupabase` + realtime, cache-sync the writes
- `components/POS/index.tsx` — lazy `loadCustomers()` on picker open
- `components/Customers.tsx` — `loadCustomers()` on mount + Refresh button
- `components/Dashboard/index.tsx` — remove unused `customers` from destructure
- `tests/` — new completion test mirroring existing style

## Acceptance criteria

- [ ] **Completion verification test** (this task only — run with
      `npx vitest run <this-test-file>`, not the whole suite; in-memory cache,
      `NODE_ENV=test`; mock `db`/realtime). It must prove the lazy+cache method
      matches the old fetch-all across every customer consumer, and that
      writes/refresh propagate:

      **Plumbing assertions:**
      - `loadAll()` does **not** call `db.fetchCustomers` (spy → 0 calls on mount);
        `refreshFromSupabase()` does not either; the `customers` realtime sub is gone.
      - First `loadCustomers()` call fetches once and writes the cache with today's
        date; a second call the same day hydrates from cache with **0** further
        `db.fetchCustomers` calls.

      **Scenario A — Parity (same output as fetch-all):** seed the cache with the
      same customers `fetchCustomers` would return, then assert each consumer's
      output matches both ways:
      | Consumer | Output to compare |
      | --- | --- |
      | POS picker | `customers.filter(customerSearch)` results |
      | Customers page | `filteredCustomers` list |
      | `completeSale` | `customers.find(id)` → stamped `customerName` |
      | Dashboard | unaffected (uses `sale.customerName`, not the array) |

      **Scenario B — Change shows changed output:** `addCustomer` (and
      `updateCustomer`/`deleteCustomer`) → assert state **and** cache update, and
      the POS picker + Customers list reflect the change without a refetch.

      **Scenario C — Refetch/reload shows correct cached output:** revisiting the
      Customers page same-day uses the cache (no `db.fetchCustomers`); clicking
      **Refresh** (`refreshCustomers()`) calls `db.fetchCustomers` once and the
      consumers show the refreshed list.
- [ ] App runs; attaching a customer at checkout and the Customers page (with the
      new Refresh button) work.
