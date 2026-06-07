# Egress Optimization — Decoupling the Monolithic Refetch

## Problem

The app consumes **>1 GB/day of Supabase egress**. Root cause is in
[`context/StoreContext.tsx`](../context/StoreContext.tsx): a single
`refreshFromSupabase()` re-downloads **12 tables** (the entire dataset), and it
is triggered constantly by two mechanisms:

1. **30-second polling loop** ([StoreContext.tsx:690-693](../context/StoreContext.tsx#L690-L693))
   — fires unconditionally every 30s = ~2,880 full-DB dumps/day **per open tab**,
   regardless of whether anything changed.
2. **Realtime subscriptions on 16 tables** ([StoreContext.tsx:646-664](../context/StoreContext.tsx#L646-L664))
   — every change on **any** table calls the same `onEvent → debouncedRefresh →
   refreshFromSupabase()`, i.e. another full-DB dump.

The two biggest payloads are `fetchSales` (full history with nested `sale_items`
+ joined `products`) and `fetchStockMovements` (an append log that grows with
every sale, transfer, and adjustment). Both are called with **no `limit` and no
date filter**, even though that plumbing already exists.

**Goal:** replace the one monolithic refetch with per-slice fetchers, drive
realtime per-table, bound the large queries, and stop the redundant poll.

---

## A. The 15 fetchers — table, state slice, consumers

| Fetcher | Supabase table(s) | State slice | In `refreshFromSupabase`? | Consumed by (views) | Growth risk |
|---|---|---|---|---|---|
| `fetchBranches` | `branches` | `branches` | ❌ (loadAll only) | almost every view + Sidebar | tiny/static |
| `fetchProductsWithStock` | `products` + `product_branch_stock` | `products` | ✅ | POS, Inventory, Dashboard, Suppliers, SalesHistory, Branches, Settings | medium |
| `fetchCustomers` | `customers` | `customers` | ✅ | POS, Customers, Dashboard | medium |
| `fetchSales` | `sales` + `sale_items` + `products`(join) | `salesHistory` | ✅ | Dashboard, POS, Accounting, Customers, SalesHistory, Branches | 🔴 unbounded — biggest payload |
| `fetchStockMovements` | `stock_movements` | `stockHistory` | ✅ | Dashboard (activity feed), Inventory | 🔴 unbounded — append log |
| `fetchSuppliers` | `suppliers` | `suppliers` | ✅ | Suppliers | small |
| `fetchSupplierTransactions` | `supplier_transactions` | `supplierTransactions` | ✅ | Suppliers, Dashboard, Accounting | medium |
| `fetchExpenses` | `expenses` | `expenses` | ✅ | Dashboard, Accounting | medium |
| `fetchUsers` | `users` | `users` | ❌ (loadAll only) | LoginPage, Settings | tiny |
| `fetchSettings` | `app_settings` | `settings` | ❌ (loadAll only) | POS, Inventory, Settings | tiny |
| `fetchCategories` | `categories` | `categories` | ✅ | Inventory | tiny |
| `fetchBrands` | `brands` | `brands` | ✅ | Inventory | tiny |
| `fetchDamagedGoods` | `damaged_goods` | `damagedGoods` | ✅ | Suppliers | small |
| `fetchExchanges` | `exchanges` + `exchange_items` | `exchangeHistory` | ✅ | Dashboard, POS, Accounting, SalesHistory | medium |
| `fetchStockTransfers` | `stock_transfers` | `stockTransfers` | ✅ | Inventory, Dashboard, Accounting | small/medium |

> `branches`, `users`, `settings` are already excluded from the recurring
> refetch — they are the model to follow for the rest.

---

## B. Realtime events → the targeted fetch that should replace the full refetch

Today **all 16 subscriptions** call `refreshFromSupabase()` (whole DB). Each
table should map to exactly **one** refresher. The realtime payload carries
`payload.table`, so a single `onEvent(payload)` can dispatch to the right one.

| Realtime table ([StoreContext.tsx:648-663](../context/StoreContext.tsx#L648-L663)) | Should refresh only |
|---|---|
| `products` | `fetchProductsWithStock` |
| `product_branch_stock` | `fetchProductsWithStock` |
| `customers` | `fetchCustomers` |
| `sales` | `fetchSales` |
| `sale_items` | `fetchSales` |
| `exchanges` | `fetchExchanges` |
| `exchange_items` | `fetchExchanges` |
| `stock_movements` | `fetchStockMovements` |
| `stock_transfers` | `fetchStockTransfers` |
| `categories` | `fetchCategories` |
| `brands` | `fetchBrands` |
| `suppliers` | `fetchSuppliers` |
| `supplier_transactions` | `fetchSupplierTransactions` |
| `expenses` | `fetchExpenses` |
| `damaged_goods` | `fetchDamagedGoods` |
| `branches` | `fetchBranches` |

---

## C. CRUD actions → tables written → slices to refresh

Every action **already does an optimistic local update**, so a refetch is only
needed for cross-device sync. Use this to make each mutation refresh only its
affected slices instead of calling the full refetch.

| Action | Writes to | Slices affected |
|---|---|---|
| `completeSale` / `updateSale` (`completeSaleRPC`) | sales, sale_items, product_branch_stock, stock_movements, customers | salesHistory, products, stockHistory, customers |
| `deleteSale` (`voidSaleRPC`) — *currently calls full refresh* | sales, sale_items, product_branch_stock, stock_movements, customers | salesHistory, products, stockHistory, customers |
| `completeExchange` | exchanges, exchange_items, product_branch_stock, stock_movements, customers | exchangeHistory, products, stockHistory, customers |
| `adjustStock` | product_branch_stock, stock_movements | products, stockHistory |
| `transferStock` | product_branch_stock, stock_movements, stock_transfers | products, stockHistory, stockTransfers |
| `deleteTransfer` | product_branch_stock | products, stockTransfers |
| `addProduct` / `updateProduct` | products | products |
| `deleteProduct` — *currently calls full refresh* | products (+ maybe sales) | products, salesHistory |
| `addCustomer` / `updateCustomer` / `deleteCustomer` | customers | customers |
| `recordSupplierExpense` | supplier_transactions, product_branch_stock, stock_movements | supplierTransactions, products, stockHistory |
| `addSupplierTransaction` / `update…` / `delete…` | supplier_transactions | supplierTransactions |
| `addSupplier` / `updateSupplier` / `deleteSupplier` | suppliers | suppliers |
| `addExpense` / `deleteExpense` | expenses | expenses |
| `addDamagedGood` / `deleteDamagedGood` | damaged_goods, product_branch_stock, stock_movements | damagedGoods, products, stockHistory |
| `addCategory` / `removeCategory` | categories | categories |
| `addBrand` / `removeBrand` | brands | brands |
| `addUser` / `updateUser` / `deleteUser` | users | users |
| `updateSettings` | app_settings | settings |
| `addBranch` | branches, product_branch_stock | branches, products |
| `updateBranch` | branches | branches |

---

## D. View → data slices consumed

Reference for lazy/per-view loading (load on entering a view rather than all
upfront).

| View | Slices consumed |
|---|---|
| Dashboard | salesHistory, products, expenses, supplierTransactions, stockHistory, stockTransfers, exchangeHistory, customers, branches |
| POS | products, customers, salesHistory, exchangeHistory, settings |
| Inventory | products, categories, brands, stockHistory, branches, stockTransfers, settings |
| Accounting | salesHistory, expenses, supplierTransactions, stockTransfers, exchangeHistory, branches |
| Customers | customers, salesHistory |
| SalesHistory | salesHistory, exchangeHistory, branches, products |
| Suppliers | suppliers, products, supplierTransactions, damagedGoods |
| Branches | branches, products, salesHistory |
| Settings | settings, users, branches, products |
| LoginPage | users |
| Sidebar | branches, offlineQueue (+ status) |

---

## E. Suggested refactor shape

Replace the single `refreshFromSupabase` with **per-slice refreshers** + a
table→slice dispatcher:

```ts
const refreshers = {
  products:    async () => setProducts(await db.fetchProductsWithStock()),
  customers:   async () => setCustomers(await db.fetchCustomers()),
  sales:       async () => setSalesHistory(await db.fetchSales({ /* bounded */ })),
  stock:       async () => setStockHistory(await db.fetchStockMovements({ /* bounded */ })),
  // ... one per slice
};
```

Then:
- **Realtime** calls `refreshers[mapTableToSlice(payload.table)]()` — one slice, not all.
- **`deleteSale` / `deleteProduct`** call only their affected refreshers (per § C).
- **`fetchSales` / `fetchStockMovements`** get a default bound (`dateFrom` = last
  ~90 days, or `limit`) — the option fields already exist on
  `FetchSalesOptions` / `FetchStockMovementsOptions`.

---

## F. Recommended order (lowest risk → highest payoff)

Each row is a candidate TODO.

1. **Kill / gate the 30s poll** — remove it or only run when
   `realtimeStatus !== 'SUBSCRIBED'`, and at ~5 min. Biggest single win, no
   behavior change. ([StoreContext.tsx:690](../context/StoreContext.tsx#L690))
2. **Split out `fetchSales` + bound it** — biggest payload.
3. **Split out `fetchStockMovements` + bound it** — append log.
4. **Convert realtime to per-table refresh** (§ B) — stop full-DB dumps on every event.
5. **Migrate remaining slices** to per-slice refreshers (§ A).
6. **Point `deleteSale` / `deleteProduct` at targeted refreshers** instead of the full refetch (§ C).
7. **(Optional) Lazy per-view loading** (§ D) — defer non-critical slices until their view opens.

---

## Reference: key source locations

- Monolithic refetch: [`refreshFromSupabase`](../context/StoreContext.tsx#L564-L620)
- Initial load: [`loadAll`](../context/StoreContext.tsx#L468-L557)
- Realtime subscriptions: [StoreContext.tsx:642-703](../context/StoreContext.tsx#L642-L703)
- 30s poll: [StoreContext.tsx:690-693](../context/StoreContext.tsx#L690-L693)
- Fetchers: [`services/db/`](../services/db/) (re-exported via [`services/supabaseService.ts`](../services/supabaseService.ts))
- `fetchSales` + options: [services/db/sales.ts:106-127](../services/db/sales.ts#L106-L127)
- `fetchStockMovements` + options: [services/db/stockMovements.ts:16-39](../services/db/stockMovements.ts#L16-L39)
