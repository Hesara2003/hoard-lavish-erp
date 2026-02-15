import React, { createContext, useContext, useState, useEffect } from 'react';
import { Product, CartItem, SalesRecord, ViewState, Customer, StockMovement, Branch, Supplier, SupplierTransaction, Expense, User, AppSettings } from '../types';
import { INITIAL_PRODUCTS, INITIAL_CUSTOMERS, INITIAL_CATEGORIES, INITIAL_BRANDS, INITIAL_BRANCHES, INITIAL_SUPPLIERS, INITIAL_EXPENSES, INITIAL_USERS, INITIAL_SETTINGS } from '../constants';

interface StoreContextType {
  products: Product[];
  customers: Customer[];
  cart: CartItem[];
  salesHistory: SalesRecord[];
  stockHistory: StockMovement[];
  categories: string[];
  brands: string[];
  branches: Branch[];
  suppliers: Supplier[];
  supplierTransactions: SupplierTransaction[];
  expenses: Expense[];
  users: User[];
  settings: AppSettings;
  currentBranch: Branch;
  currentView: ViewState;
  
  // Actions
  setBranch: (branchId: string) => void;
  addBranch: (branch: Branch) => void;
  updateBranch: (id: string, updates: Partial<Branch>) => void;

  addProduct: (product: Product) => void;
  updateProduct: (id: string, updates: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  
  addCustomer: (customer: Customer) => void;
  updateCustomer: (id: string, updates: Partial<Customer>) => void;
  deleteCustomer: (id: string) => void;
  
  addToCart: (product: Product) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
  
  completeSale: (paymentMethod: SalesRecord['paymentMethod'], discount: number, customerId?: string) => SalesRecord;
  adjustStock: (productId: string, quantity: number, type: 'IN' | 'OUT' | 'ADJUSTMENT', reason: string) => void;
  
  addCategory: (category: string) => void;
  removeCategory: (category: string) => void;
  addBrand: (brand: string) => void;
  removeBrand: (brand: string) => void;
  
  addSupplier: (supplier: Supplier) => void;
  updateSupplier: (id: string, updates: Partial<Supplier>) => void;
  deleteSupplier: (id: string) => void;
  addSupplierTransaction: (transaction: SupplierTransaction) => void;

  addExpense: (expense: Expense) => void;
  deleteExpense: (id: string) => void;

  addUser: (user: User) => void;
  updateUser: (id: string, updates: Partial<User>) => void;
  deleteUser: (id: string) => void;

  updateSettings: (settings: Partial<AppSettings>) => void;
  
  exportData: () => string;
  importData: (jsonData: string) => boolean;

  setView: (view: ViewState) => void;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [branches, setBranches] = useState<Branch[]>(INITIAL_BRANCHES);
  const [currentBranch, setCurrentBranch] = useState<Branch>(INITIAL_BRANCHES[0]);
  
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [customers, setCustomers] = useState<Customer[]>(INITIAL_CUSTOMERS);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [salesHistory, setSalesHistory] = useState<SalesRecord[]>([]);
  const [stockHistory, setStockHistory] = useState<StockMovement[]>([]);
  const [categories, setCategories] = useState<string[]>(INITIAL_CATEGORIES);
  const [brands, setBrands] = useState<string[]>(INITIAL_BRANDS);
  const [suppliers, setSuppliers] = useState<Supplier[]>(INITIAL_SUPPLIERS);
  const [supplierTransactions, setSupplierTransactions] = useState<SupplierTransaction[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>(INITIAL_EXPENSES);
  const [users, setUsers] = useState<User[]>(INITIAL_USERS);
  const [settings, setSettings] = useState<AppSettings>(INITIAL_SETTINGS);

  const [currentView, setCurrentView] = useState<ViewState>('DASHBOARD');

  // Load persistence
  useEffect(() => {
    const saved = localStorage.getItem('hoard_data_v2');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        if (data.branches) setBranches(data.branches);
        if (data.salesHistory) setSalesHistory(data.salesHistory);
        if (data.customers) setCustomers(data.customers);
        if (data.products) setProducts(data.products);
        if (data.categories) setCategories(data.categories);
        if (data.brands) setBrands(data.brands);
        if (data.stockHistory) setStockHistory(data.stockHistory);
        if (data.suppliers) setSuppliers(data.suppliers);
        if (data.supplierTransactions) setSupplierTransactions(data.supplierTransactions);
        if (data.expenses) setExpenses(data.expenses);
        if (data.users) setUsers(data.users);
        if (data.settings) setSettings(data.settings);
      } catch (e) {
        console.error("Failed to load saved data", e);
      }
    }
  }, []);

  // Save persistence
  useEffect(() => {
    const data = {
      branches,
      salesHistory,
      customers,
      products,
      categories,
      brands,
      stockHistory,
      suppliers,
      supplierTransactions,
      expenses,
      users,
      settings
    };
    localStorage.setItem('hoard_data_v2', JSON.stringify(data));
  }, [branches, salesHistory, customers, products, categories, brands, stockHistory, suppliers, supplierTransactions, expenses, users, settings]);

  const setBranch = (branchId: string) => {
    const branch = branches.find(b => b.id === branchId);
    if (branch) {
      setCurrentBranch(branch);
      clearCart(); // Clear cart when switching branches to avoid stock conflicts
    }
  };

  const addBranch = (branch: Branch) => {
    setBranches(prev => [...prev, branch]);
    // Initialize stock for new branch as 0 for all products
    setProducts(prev => prev.map(p => ({
      ...p,
      branchStock: { ...p.branchStock, [branch.id]: 0 }
    })));
  };

  const updateBranch = (id: string, updates: Partial<Branch>) => {
    setBranches(prev => prev.map(b => b.id === id ? { ...b, ...updates } : b));
    if (currentBranch.id === id) {
      setCurrentBranch(prev => ({ ...prev, ...updates }));
    }
  };

  const addProduct = (product: Product) => {
    // Ensure product has entries for all branches
    const branchStock = { ...product.branchStock };
    branches.forEach(b => {
      if (branchStock[b.id] === undefined) branchStock[b.id] = 0;
    });
    const totalStock = Object.values(branchStock).reduce((a, b) => a + b, 0);

    setProducts(prev => [...prev, { ...product, branchStock, stock: totalStock }]);
  };

  const updateProduct = (id: string, updates: Partial<Product>) => {
    setProducts(prev => prev.map(p => {
      if (p.id === id) {
        const updated = { ...p, ...updates };
        // Recalculate total stock if branchStock changed
        if (updates.branchStock) {
          updated.stock = Object.values(updated.branchStock).reduce((a, b) => a + b, 0);
        }
        return updated;
      }
      return p;
    }));
  };

  const deleteProduct = (id: string) => {
    setProducts(prev => prev.filter(p => p.id !== id));
  };

  const addCustomer = (customer: Customer) => {
    setCustomers(prev => [...prev, customer]);
  };

  const updateCustomer = (id: string, updates: Partial<Customer>) => {
    setCustomers(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  const deleteCustomer = (id: string) => {
    setCustomers(prev => prev.filter(c => c.id !== id));
  };

  const addToCart = (product: Product) => {
    // Check current branch stock
    const currentStock = product.branchStock[currentBranch.id] || 0;
    const cartItem = cart.find(item => item.id === product.id);
    const currentQty = cartItem ? cartItem.quantity : 0;

    if (currentQty + 1 > currentStock) {
      alert(`Insufficient stock in ${currentBranch.name}. Available: ${currentStock}`);
      return;
    }

    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.id !== productId));
  };

  const clearCart = () => setCart([]);

  const completeSale = (paymentMethod: SalesRecord['paymentMethod'], discount: number, customerId?: string): SalesRecord => {
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const tax = (subtotal - discount) * settings.taxRate; // Use dynamic tax rate
    const totalAmount = subtotal - discount + tax;
    const totalCost = cart.reduce((sum, item) => sum + (item.costPrice * item.quantity), 0);
    
    const customer = customers.find(c => c.id === customerId);

    const newSale: SalesRecord = {
      id: Math.random().toString(36).substr(2, 9),
      invoiceNumber: `INV-${Date.now().toString().substr(-6)}`,
      date: new Date().toISOString(),
      items: [...cart],
      subtotal,
      discount,
      tax,
      totalAmount,
      totalCost,
      paymentMethod,
      customerId,
      customerName: customer ? customer.name : undefined,
      branchId: currentBranch.id,
      branchName: currentBranch.name
    };

    // Deduct stock and log movements
    const newStockLogs: StockMovement[] = [];
    const newProducts = products.map(p => {
      const cartItem = cart.find(c => c.id === p.id);
      if (cartItem) {
        newStockLogs.push({
          id: Math.random().toString(36).substr(2, 9),
          productId: p.id,
          productName: p.name,
          branchId: currentBranch.id,
          branchName: currentBranch.name,
          type: 'OUT',
          quantity: cartItem.quantity,
          reason: `Sale #${newSale.invoiceNumber}`,
          date: new Date().toISOString()
        });
        
        const currentBranchStock = p.branchStock[currentBranch.id] || 0;
        const newBranchStock = Math.max(0, currentBranchStock - cartItem.quantity);
        const updatedBranchStock = { ...p.branchStock, [currentBranch.id]: newBranchStock };
        const newTotalStock = Object.values(updatedBranchStock).reduce((a, b) => a + b, 0);

        return { ...p, branchStock: updatedBranchStock, stock: newTotalStock };
      }
      return p;
    });

    if (customer) {
      setCustomers(prev => prev.map(c => 
        c.id === customerId 
          ? { ...c, totalSpent: c.totalSpent + totalAmount, loyaltyPoints: c.loyaltyPoints + Math.floor(totalAmount / 10) } 
          : c
      ));
    }

    setStockHistory(prev => [...newStockLogs, ...prev]);
    setProducts(newProducts);
    setSalesHistory(prev => [newSale, ...prev]);
    clearCart();
    
    return newSale;
  };

  const adjustStock = (productId: string, quantity: number, type: 'IN' | 'OUT' | 'ADJUSTMENT', reason: string) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    const currentBranchStock = product.branchStock[currentBranch.id] || 0;
    let newBranchStock = currentBranchStock;

    if (type === 'IN') newBranchStock += quantity;
    if (type === 'OUT') newBranchStock -= quantity;
    if (type === 'ADJUSTMENT') newBranchStock = quantity;

    newBranchStock = Math.max(0, newBranchStock);

    const logQty = type === 'ADJUSTMENT' ? Math.abs(newBranchStock - currentBranchStock) : quantity;

    const updatedBranchStock = { ...product.branchStock, [currentBranch.id]: newBranchStock };
    const newTotalStock = Object.values(updatedBranchStock).reduce((a, b) => a + b, 0);

    setProducts(prev => prev.map(p => p.id === productId ? { 
      ...p, 
      branchStock: updatedBranchStock,
      stock: newTotalStock
    } : p));
    
    setStockHistory(prev => [{
      id: Math.random().toString(36).substr(2, 9),
      productId,
      productName: product.name,
      branchId: currentBranch.id,
      branchName: currentBranch.name,
      type,
      quantity: logQty,
      reason: `${reason} (${currentBranch.name})`,
      date: new Date().toISOString()
    }, ...prev]);
  };

  const addCategory = (category: string) => {
    if (!categories.includes(category)) setCategories([...categories, category]);
  };
  const removeCategory = (category: string) => {
    setCategories(categories.filter(c => c !== category));
  };
  const addBrand = (brand: string) => {
    if (!brands.includes(brand)) setBrands([...brands, brand]);
  };
  const removeBrand = (brand: string) => {
    setBrands(brands.filter(b => b !== brand));
  };

  // Supplier Actions
  const addSupplier = (supplier: Supplier) => {
    setSuppliers(prev => [...prev, supplier]);
  };

  const updateSupplier = (id: string, updates: Partial<Supplier>) => {
    setSuppliers(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const deleteSupplier = (id: string) => {
    setSuppliers(prev => prev.filter(s => s.id !== id));
  };

  const addSupplierTransaction = (transaction: SupplierTransaction) => {
    setSupplierTransactions(prev => [transaction, ...prev]);
  };

  // Expense Actions
  const addExpense = (expense: Expense) => {
    setExpenses(prev => [expense, ...prev]);
  };

  const deleteExpense = (id: string) => {
    setExpenses(prev => prev.filter(e => e.id !== id));
  };

  // User Actions
  const addUser = (user: User) => setUsers(prev => [...prev, user]);
  const updateUser = (id: string, updates: Partial<User>) => setUsers(prev => prev.map(u => u.id === id ? { ...u, ...updates } : u));
  const deleteUser = (id: string) => setUsers(prev => prev.filter(u => u.id !== id));

  // Settings Actions
  const updateSettings = (updates: Partial<AppSettings>) => setSettings(prev => ({ ...prev, ...updates }));

  // Import/Export
  const exportData = () => {
    const data = {
      branches,
      salesHistory,
      customers,
      products,
      categories,
      brands,
      stockHistory,
      suppliers,
      supplierTransactions,
      expenses,
      users,
      settings
    };
    return JSON.stringify(data, null, 2);
  };

  const importData = (jsonData: string): boolean => {
    try {
      const data = JSON.parse(jsonData);
      // Basic validation
      if (data.products && Array.isArray(data.products)) {
        if (data.branches) setBranches(data.branches);
        if (data.salesHistory) setSalesHistory(data.salesHistory);
        if (data.customers) setCustomers(data.customers);
        if (data.products) setProducts(data.products);
        if (data.categories) setCategories(data.categories);
        if (data.brands) setBrands(data.brands);
        if (data.stockHistory) setStockHistory(data.stockHistory);
        if (data.suppliers) setSuppliers(data.suppliers);
        if (data.supplierTransactions) setSupplierTransactions(data.supplierTransactions);
        if (data.expenses) setExpenses(data.expenses);
        if (data.users) setUsers(data.users);
        if (data.settings) setSettings(data.settings);
        return true;
      }
      return false;
    } catch (e) {
      console.error("Import failed", e);
      return false;
    }
  };

  const setView = (view: ViewState) => setCurrentView(view);

  return (
    <StoreContext.Provider value={{
      products, customers, cart, salesHistory, stockHistory, categories, brands, branches, suppliers, supplierTransactions, expenses, users, settings,
      currentBranch, currentView,
      setBranch, addBranch, updateBranch,
      addProduct, updateProduct, deleteProduct,
      addCustomer, updateCustomer, deleteCustomer,
      addToCart, removeFromCart, clearCart,
      completeSale, adjustStock,
      addCategory, removeCategory, addBrand, removeBrand,
      addSupplier, updateSupplier, deleteSupplier, addSupplierTransaction,
      addExpense, deleteExpense,
      addUser, updateUser, deleteUser,
      updateSettings, exportData, importData,
      setView
    }}>
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (context === undefined) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
};
