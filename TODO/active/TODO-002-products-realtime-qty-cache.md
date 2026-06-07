# TODO-002: Products — realtime qty deltas + daily catalog cache (drop from fetch-all/poll)

- **ID:** 002
- **Priority:** P1
- **Status:** TODO

## Description

`fetchProductsWithStock` (products table + `product_branch_stock` join) is one of
the largest recurring payloads, and it is re-pulled in full on every 30s poll and
every realtime event. Replace that with a cache + qty-delta model:

- **Catalog** (name, sku, price, cost, category, etc.) changes rarely → fetch
  **once per day** and persist in a local cache.
- **Quantities** (`product_branch_stock`) churn constantly → on each app
  mount, reconcile via the **lightweight** `fetchBranchStock()` (returns only
  `{ productId, branchId, quantity }`), and during the session keep them live via
  **realtime deltas** on the `product_branch_stock` table — each event carries
  only the single changed `{ product_id, branch_id, quantity }` row, which is
  patched directly into the local cache (no refetch).
- **Remove `fetchProductsWithStock` from the full refetch/poll path** so products
  no longer ride the recurring full-DB dumps.

Existing plumbing to reuse:
- `fetchProductsWithStock()` — [services/db/products.ts:24](../../services/db/products.ts#L24) (full catalog+stock; use for the daily catalog load)
- `fetchBranchStock()` — [services/db/stockMovements.ts:52](../../services/db/stockMovements.ts#L52) (qty-only; use for per-mount reconcile)
- Local-cache pattern to mirror: [services/localSettings.ts](../../services/localSettings.ts) (electron-store) and the existing `localStorage` fallbacks in `StoreContext`.

Background + where products is consumed (verified):
[docs/EGRESS_OPTIMIZATION.md](../../docs/EGRESS_OPTIMIZATION.md).

### Where `products` is consumed (so the mount/cache covers everything)

| View | Use | Needs live qty | Needs catalog |
| --- | --- | --- | --- |
| POS | product grid + oversell check in `addToCart` | **yes (critical)** | yes |
| Inventory | full product/stock editor | yes | yes |
| Dashboard | **low-stock alerts only** (top sellers come from `salesHistory`, not products) | yes | name |
| Branches | per-branch `totalStock` / `stockValue` (qty × price) | yes | price |
| Suppliers | item-picker dropdown for purchases / damaged goods | no | yes |
| SalesHistory | `productCategoryById` map (id → category) | no | category |
| Settings | `addProduct` (import) | no | no |

## Steps

1. **Create a products cache module** (`services/localProducts.ts`), mirroring
   `localSettings.ts` (electron-store with in-memory fallback when
   `NODE_ENV==='test'`). Persist the catalog plus a `cachedDate` (YYYY-MM-DD).
   Exports: `loadCachedProducts()`, `saveCachedProducts(products, date)`,
   `applyStockDelta(productId, branchId, quantity)` (patches one cell and
   recomputes that product's total `stock`), `mergeBranchStock(stockRows)`.
2. **Mount/load flow in `StoreContext`:**
   - On load, if cache exists and `cachedDate === today`, hydrate `products` from
     cache **immediately** (no catalog fetch); otherwise call
     `fetchProductsWithStock()`, set state, and `saveCachedProducts(..., today)`.
   - **Always** call `fetchBranchStock()` on mount and merge the fresh quantities
     into the (cached or fetched) catalog, so stock is correct even if the app was
     closed while changes happened. Persist the merged result back to cache.
3. **Realtime — qty deltas:**
   - Give `product_branch_stock` its own handler (not the shared full-refresh
     `onEvent`). On `INSERT`/`UPDATE`, read `payload.new`
     (`{ product_id, branch_id, quantity }`) and call `applyStockDelta` to update
     both React state and the persisted cache. On `DELETE`, treat as qty 0 for
     that branch.
   - For the `products` table itself (catalog edits — rare), patch the single
     product from `payload.new` (or refetch just that row); do **not** trigger a
     full refresh.
   - On realtime (re)subscribe/reconnect, run a `fetchBranchStock()` reconcile to
     catch any deltas missed while disconnected.
4. **Remove products from the full refetch:** delete `fetchProductsWithStock`
   (and `setProducts`) from `refreshFromSupabase()`
   ([StoreContext.tsx:564-620](../../context/StoreContext.tsx#L564-L620)) so the
   poll/manual sync no longer re-pulls the whole catalog. Keep the existing
   optimistic local `setProducts` updates in `completeSale`, `adjustStock`,
   `transferStock`, etc. untouched.
5. **Keep oversell protection intact:** POS `addToCart` must still read the live
   cached `branchStock[currentBranch.id]`. Verify a sale on one client reflects on
   another via the qty-delta path within a second or two.
6. **Write the regression test** (see Acceptance) and get it passing before
   finalizing step 4.

## Files likely involved

- `services/localProducts.ts` — **new** cache (catalog + qty patching)
- `context/StoreContext.tsx` — mount hydrate + qty reconcile, dedicated
  `product_branch_stock` realtime handler, remove products from `refreshFromSupabase`
- `services/db/products.ts`, `services/db/stockMovements.ts` — reference (reuse
  `fetchProductsWithStock` / `fetchBranchStock`; add a catalog-only fetch if a
  lighter daily load is wanted)
- `tests/` — new test mirroring existing test style

## Acceptance criteria

- [ ] On mount, products hydrate from the daily cache when present; otherwise a
      single `fetchProductsWithStock()` populates and persists it.
- [ ] `fetchBranchStock()` runs on every mount and reconciles quantities into the
      cache (correct stock after an app reopen).
- [ ] A `product_branch_stock` change on another client updates **only** the
      affected product's qty locally via `payload.new` — no full products refetch,
      and the persisted cache reflects the new qty.
- [ ] `fetchProductsWithStock` is no longer called from `refreshFromSupabase()`
      / the 30s poll.
- [ ] POS still blocks overselling using the live cached branch qty; Inventory,
      Dashboard low-stock, and Branches stock value all read correct numbers.
- [ ] **Completion verification test** (this task only — run with
      `npx vitest run <this-test-file>`, not the whole suite; in-memory cache,
      `NODE_ENV=test`; mock `db`/realtime). It must prove the cache + qty-delta
      method behaves the same as the old fetch-all across **every** product
      consumer, and that deltas/reloads propagate correctly.

      **Plumbing assertions:**
      - A `product_branch_stock` realtime `payload.new` patch updates **only** the
        affected product's `branchStock[branchId]` and recomputes its `stock` — no
        full refetch.
      - `fetchProductsWithStock` is **not** called from `refreshFromSupabase()`
        (spy → 0 calls on poll/refresh).

      **Scenario A — Parity (same output as fetch-all):** seed the cache with the
      same products a `fetchProductsWithStock` would return, then assert each
      consumer derives identical output under both:
      | Consumer | Output to compare |
      | --- | --- |
      | POS | product grid items + `branchStock[currentBranch.id]` used for the oversell check |
      | Inventory | product rows with per-branch stock |
      | Dashboard | `lowStockProducts` (qty ≤ `minStockLevel`) count/list |
      | Branches | per-branch `totalStock` and `stockValue` (Σ qty, Σ qty×price) |
      | Suppliers | item-picker options (`id`, `name`, `sku`) |
      | SalesHistory | `productCategoryById` (id → category) |

      **Scenario B — Change shows changed output:** apply a single
      `product_branch_stock` delta (e.g. a sale drops qty) → assert it patches the
      cache and the affected consumers reflect it: POS available qty, Dashboard
      low-stock, Inventory row, Branches `stockValue`. Confirm **no** other product
      is touched.

      **Scenario C — Refetch/reload shows correct cached output:** simulate app
      reopen → same-day cache hydrates the catalog (no `fetchProductsWithStock`
      call) and a `fetchBranchStock` reconcile merges fresh quantities; assert all
      consumer outputs match the reconciled cache (catalog fields preserved, qty
      from the reconcile).
