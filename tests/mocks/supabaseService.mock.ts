/**
 * Supabase Service Mock — for unit/component tests
 *
 * Provides vi.fn() stubs for every export in services/supabaseService.ts so that
 * component and context tests never hit the real database.
 */
import { vi } from 'vitest';
import type { Branch, Product, Customer, SalesRecord, StockMovement, Supplier, SupplierTransaction, Expense, User, AppSettings } from '../types';

// ---- Branches ----
export const fetchBranches = vi.fn<() => Promise<Branch[]>>().mockResolvedValue([]);
export const insertBranch = vi.fn<(b: any) => Promise<Branch>>().mockResolvedValue({ id: 'b-new', name: '', address: '', phone: '' });
export const updateBranch = vi.fn<(id: string, u: any) => Promise<void>>().mockResolvedValue(undefined);

// ---- Products ----
export const fetchProductsWithStock = vi.fn<() => Promise<Product[]>>().mockResolvedValue([]);
export const insertProduct = vi.fn<(p: Product, b: Branch[]) => Promise<void>>().mockResolvedValue(undefined);
export const updateProduct = vi.fn<(id: string, u: any) => Promise<void>>().mockResolvedValue(undefined);
export const deleteProduct = vi.fn<(id: string) => Promise<void>>().mockResolvedValue(undefined);

// ---- Customers ----
export const fetchCustomers = vi.fn<() => Promise<Customer[]>>().mockResolvedValue([]);
export const insertCustomer = vi.fn<(c: Customer) => Promise<Customer>>().mockResolvedValue({ id: 'c-new', name: '', phone: '', email: '', loyaltyPoints: 0, totalSpent: 0 });
export const updateCustomer = vi.fn<(id: string, u: any) => Promise<void>>().mockResolvedValue(undefined);
export const deleteCustomer = vi.fn<(id: string) => Promise<void>>().mockResolvedValue(undefined);

// ---- Sales ----
export const completeSaleRPC = vi.fn<(sale: SalesRecord) => Promise<string>>().mockResolvedValue('sale-uuid');
export const fetchSales = vi.fn<() => Promise<SalesRecord[]>>().mockResolvedValue([]);

// ---- Stock ----
export const fetchStockMovements = vi.fn<() => Promise<StockMovement[]>>().mockResolvedValue([]);
export const insertStockMovement = vi.fn<(m: StockMovement) => Promise<void>>().mockResolvedValue(undefined);
export const upsertBranchStock = vi.fn<(pid: string, bid: string, qty: number) => Promise<void>>().mockResolvedValue(undefined);

// ---- Suppliers ----
export const fetchSuppliers = vi.fn<() => Promise<Supplier[]>>().mockResolvedValue([]);
export const insertSupplier = vi.fn<(s: Supplier) => Promise<Supplier>>().mockResolvedValue({ id: 's-new', name: '', contactPerson: '', phone: '', email: '', address: '' });
export const updateSupplier = vi.fn<(id: string, u: any) => Promise<void>>().mockResolvedValue(undefined);
export const deleteSupplier = vi.fn<(id: string) => Promise<void>>().mockResolvedValue(undefined);

// ---- Supplier Transactions ----
export const fetchSupplierTransactions = vi.fn<() => Promise<SupplierTransaction[]>>().mockResolvedValue([]);
export const insertSupplierTransaction = vi.fn<(t: SupplierTransaction) => Promise<void>>().mockResolvedValue(undefined);

// ---- Expenses ----
export const fetchExpenses = vi.fn<() => Promise<Expense[]>>().mockResolvedValue([]);
export const insertExpense = vi.fn<(e: Expense) => Promise<Expense>>().mockResolvedValue({ id: 'e-new', description: '', amount: 0, category: '', date: '', branchId: '', branchName: '' });
export const deleteExpense = vi.fn<(id: string) => Promise<void>>().mockResolvedValue(undefined);

// ---- Users ----
export const fetchUsers = vi.fn<() => Promise<User[]>>().mockResolvedValue([]);
export const insertUser = vi.fn<(u: User) => Promise<User>>().mockResolvedValue({ id: 'u-new', name: '', role: 'CASHIER', pin: '0000' });
export const updateUser = vi.fn<(id: string, u: any) => Promise<void>>().mockResolvedValue(undefined);
export const deleteUser = vi.fn<(id: string) => Promise<void>>().mockResolvedValue(undefined);

// ---- Settings ----
export const fetchSettings = vi.fn<() => Promise<AppSettings>>().mockResolvedValue({ storeName: 'Test', currencySymbol: '$', taxRate: 0.08, enableLowStockAlerts: true });
export const updateSettings = vi.fn<(u: any) => Promise<void>>().mockResolvedValue(undefined);

// ---- Categories / Brands ----
export const fetchCategories = vi.fn<() => Promise<string[]>>().mockResolvedValue([]);
export const insertCategory = vi.fn<(n: string) => Promise<void>>().mockResolvedValue(undefined);
export const deleteCategory = vi.fn<(n: string) => Promise<void>>().mockResolvedValue(undefined);
export const fetchBrands = vi.fn<() => Promise<string[]>>().mockResolvedValue([]);
export const insertBrand = vi.fn<(n: string) => Promise<void>>().mockResolvedValue(undefined);
export const deleteBrand = vi.fn<(n: string) => Promise<void>>().mockResolvedValue(undefined);

// ---- Misc ----
export const initializeBranchStock = vi.fn<(bid: string, pids: string[]) => Promise<void>>().mockResolvedValue(undefined);
