/**
 * Test fixtures — reusable test data objects
 */
import type { Product, Branch, Customer, User, CartItem, SalesRecord, AppSettings } from '../../types';

// ---- BRANCHES ----
export const branchHQ: Branch = {
  id: 'b1',
  name: 'Main HQ Store',
  address: '123 Fashion Ave',
  phone: '212-555-0199',
};

export const branchDowntown: Branch = {
  id: 'b2',
  name: 'Downtown Boutique',
  address: '456 Soho St',
  phone: '212-555-0200',
};

export const allBranches: Branch[] = [branchHQ, branchDowntown];

// ---- PRODUCTS ----
export const productGown: Product = {
  id: 'p1',
  name: 'Midnight Velvet Gown',
  category: 'Clothing',
  brand: 'Hoard Lavish',
  price: 1250.0,
  costPrice: 600.0,
  stock: 12,
  branchStock: { b1: 8, b2: 4 },
  minStockLevel: 5,
  sku: 'DRS-001',
  description: 'A luxurious velvet gown.',
};

export const productLoafers: Product = {
  id: 'p2',
  name: 'Italian Leather Loafers',
  category: 'Footwear',
  brand: 'Gucci',
  price: 350.0,
  costPrice: 150.0,
  stock: 25,
  branchStock: { b1: 15, b2: 10 },
  minStockLevel: 10,
  sku: 'SHO-002',
  description: 'Handcrafted Italian leather loafers.',
};

export const productOutOfStock: Product = {
  id: 'p3',
  name: 'Rare Silk Scarf',
  category: 'Accessories',
  brand: 'Hermes',
  price: 180.0,
  costPrice: 60.0,
  stock: 0,
  branchStock: { b1: 0, b2: 0 },
  minStockLevel: 5,
  sku: 'ACC-003',
  description: 'Out of stock.',
};

export const productLowStock: Product = {
  id: 'p4',
  name: 'Cashmere Trench Coat',
  category: 'Clothing',
  brand: 'Hoard Lavish',
  price: 890.0,
  costPrice: 400.0,
  stock: 3,
  branchStock: { b1: 2, b2: 1 },
  minStockLevel: 5,
  sku: 'COT-004',
  description: 'Low stock item.',
};

export const allProducts: Product[] = [productGown, productLoafers, productOutOfStock, productLowStock];

// ---- CUSTOMERS ----
export const customerAlice: Customer = {
  id: 'c1',
  name: 'Alice Vandetta',
  phone: '555-0101',
  email: 'alice@example.com',
  loyaltyPoints: 120,
  totalSpent: 4500,
};

export const customerJulian: Customer = {
  id: 'c2',
  name: 'Julian Thorne',
  phone: '555-0102',
  email: 'j.thorne@example.com',
  loyaltyPoints: 45,
  totalSpent: 890,
};

export const allCustomers: Customer[] = [customerAlice, customerJulian];

// ---- USERS ----
export const userAdmin: User = { id: 'u1', name: 'Admin User', role: 'ADMIN', pin: '1234' };
export const userCashier: User = { id: 'u2', name: 'John Cashier', role: 'CASHIER', pin: '0000', branchId: 'b1' };
export const userManager: User = { id: 'u3', name: 'Sarah Manager', role: 'MANAGER', pin: '1111', branchId: 'b2' };
export const allUsers: User[] = [userAdmin, userCashier, userManager];

// ---- CART ITEMS ----
export const cartItemGown: CartItem = { ...productGown, quantity: 1 };
export const cartItemLoafers: CartItem = { ...productLoafers, quantity: 2 };

// ---- SETTINGS ----
export const defaultSettings: AppSettings = {
  storeName: 'Hoard Lavish',
  currencySymbol: '$',
  taxRate: 0.08,
  enableLowStockAlerts: true,
};

// ---- SALE RECORD ----
export function makeSale(overrides: Partial<SalesRecord> = {}): SalesRecord {
  return {
    id: 'sale-1',
    invoiceNumber: 'INV-100001',
    date: new Date().toISOString(),
    items: [cartItemGown],
    subtotal: 1250.0,
    discount: 0,
    tax: 100.0,
    totalAmount: 1350.0,
    totalCost: 600.0,
    paymentMethod: 'Cash',
    branchId: 'b1',
    branchName: 'Main HQ Store',
    ...overrides,
  };
}
