# Test Plan — Hoard Lavish ERP

> Created: 2026-02-21 | Branch: `test`

---

## 1. Unit Tests

Test individual functions and logic in isolation.

- Currency formatting (`fmtCurrency`)
- Cart calculations (subtotal, tax, discount, total)
- Stock level checks (prevent overselling)
- Data mappers in `supabaseService.ts` (DB row → typed object)
- Role-based permission logic (`ADMIN` / `MANAGER` / `CASHIER`)
- Invoice number generation
- Import/export JSON serialization (`exportData` / `importData`)

**Tools:** Vitest or Jest

---

## 2. Component Tests

Render individual React components and assert behavior.

- **POS:** Add/remove items from cart, quantity limits vs stock, barcode scanning, customer selection, payment method toggle, discount input, invoice modal
- **Inventory:** Product CRUD, stock adjustment, low-stock alerts, category/brand filtering
- **Customers:** Add/edit/delete, loyalty points display
- **LoginPage:** PIN entry, role-based redirect
- **Sidebar:** Navigation, role-based menu visibility
- **Settings:** Tax rate/store name updates

**Tools:** React Testing Library + Vitest

---

## 3. Integration Tests

Test how modules work together (context + services + components).

- `completeSale` flow: cart → sale record + stock deduction + customer loyalty update + sales history entry
- `adjustStock`: stock movement recorded, branch stock updated, low-stock alert triggered
- `addSupplierTransaction`: supplier balance updated correctly
- Branch switching: products/stock filter properly per branch
- Login → view access based on role
- Supabase service calls succeed and map data correctly (mocked client or Supabase local dev)

**Tools:** Vitest + MSW (Mock Service Worker) for Supabase API mocking

---

## 4. End-to-End (E2E) Tests

Full user workflows through the actual UI.

- **Sale workflow:** Login → scan/search product → add to cart → apply discount → select customer → choose payment → complete sale → verify invoice → check sales history
- **Inventory workflow:** Add product → assign stock to branch → sell product → verify stock deducted → record damaged goods
- **Multi-branch:** Switch branch → verify stock isolation → transfer reasoning
- **Customer workflow:** Create customer → make purchase → verify loyalty points and total spent
- **Accounting:** Record expense → verify it shows in reports
- **Data management:** Export data → clear → import data → verify restored

**Tools:** Playwright or Cypress (Playwright recommended for Electron support)

---

## 5. API / Database Tests

Validate Supabase interactions directly.

- CRUD operations for all tables (branches, products, customers, sales, suppliers, expenses, damaged_goods)
- `v_products_with_stock` view returns correctly aggregated branch stock
- Row-level security policies (if implemented)
- Cascading deletes / foreign key constraints
- Concurrent stock updates don't cause race conditions

**Tools:** Vitest + Supabase local (via `supabase start`) or a test project

---

## 6. Authorization / Security Tests

- `CASHIER` cannot access Settings, Branches, or user management
- `MANAGER` vs `ADMIN` permission boundaries
- PIN validation (no bypasses, brute-force resilience)
- Supabase anon key only allows intended operations (RLS)
- No sensitive data leaks in the client bundle

---

## 7. Edge Case / Boundary Tests

- Selling when stock = 0
- Negative discount or discount > subtotal
- Empty cart checkout attempt
- Duplicate SKU/barcode creation
- Very long product names / descriptions
- Customer with no email/phone
- Sale with 100+ line items (performance)
- Branch with no products

---

## 8. Electron Desktop Tests

- App launches and renders correctly
- Window management (minimize, maximize, close)
- Offline behavior (Supabase unreachable)
- Print/invoice functionality via Electron APIs
- Auto-update mechanism

**Tools:** Playwright Electron support or Spectron

---

## Priority Order

| Priority | Type | Reason |
|----------|------|--------|
| 1 | Unit Tests | Fast feedback, catch calculation bugs early |
| 2 | Component Tests | Verify POS UI logic (core feature) |
| 3 | Integration Tests | Ensure `completeSale` and stock flows work end-to-end |
| 4 | E2E Tests | Validate critical user journeys |
| 5 | Edge Case Tests | Prevent data corruption from bad inputs |
| 6 | Auth/Security Tests | Protect multi-role access and Supabase RLS |
| 7 | API/DB Tests | Guard against schema/migration regressions |
| 8 | Electron Tests | Only if actively shipping desktop builds |
