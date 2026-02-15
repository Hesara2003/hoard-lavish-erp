import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Search, Plus, Minus, Trash2, CreditCard, Banknote, UserPlus, User, X, ScanBarcode, Printer, CheckCircle, Store } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { Product, Customer, SalesRecord } from '../types';

const POS: React.FC = () => {
  const { products, customers, cart, addToCart, removeFromCart, completeSale, clearCart, addCustomer, currentBranch } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  // Billing States
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '', email: '' });

  // Invoice Modal
  const [lastSale, setLastSale] = useState<SalesRecord | null>(null);
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);

  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // Focus barcode input on load
  useEffect(() => {
    barcodeInputRef.current?.focus();
  }, []);

  const categories = ['All', ...Array.from(new Set(products.map(p => p.category)))];

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchTerm, selectedCategory]);

  // Billing Calculations
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const tax = (subtotal - discountAmount) * 0.08;
  const total = Math.max(0, subtotal - discountAmount + tax);

  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const product = products.find(p => p.sku.toLowerCase() === barcodeInput.toLowerCase());
    if (product) {
      const branchStock = product.branchStock[currentBranch.id] || 0;
      if (branchStock > 0) {
        addToCart(product);
        setBarcodeInput('');
      } else {
        alert('Product out of stock in this branch');
      }
    } else {
      console.log('Product not found');
    }
  };

  const handleCheckout = (method: 'Cash' | 'Card') => {
    if (cart.length === 0) return;
    const sale = completeSale(method, discountAmount, selectedCustomer?.id);
    setLastSale(sale);
    setIsInvoiceOpen(true);
    // Reset local states
    setSelectedCustomer(null);
    setDiscountAmount(0);
  };

  const handleCreateCustomer = () => {
    if (newCustomer.name && newCustomer.phone) {
      const customer: Customer = {
        id: Math.random().toString(36).substr(2, 9),
        ...newCustomer,
        loyaltyPoints: 0,
        totalSpent: 0
      };
      addCustomer(customer);
      setSelectedCustomer(customer);
      setIsCustomerModalOpen(false);
      setNewCustomer({ name: '', phone: '', email: '' });
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex h-full bg-slate-50 overflow-hidden relative">
      {/* Product Grid Area */}
      <div className="flex-1 flex flex-col overflow-hidden transition-all duration-300">
        {/* Header / Search */}
        <div className="p-6 bg-white border-b border-slate-200">
          <div className="flex justify-between items-start mb-4">
            <div className="flex flex-col md:flex-row gap-4 items-center flex-1">
              {/* Barcode Scanner Input */}
              <form onSubmit={handleBarcodeSubmit} className="relative w-full md:w-64">
                <ScanBarcode className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input
                  ref={barcodeInputRef}
                  type="text"
                  placeholder="Scan Barcode / SKU"
                  className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 bg-slate-50 font-mono"
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                />
              </form>

              <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input
                  type="text"
                  placeholder="Search products..."
                  className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div className="ml-4 flex items-center gap-2 bg-slate-100 text-slate-600 px-3 py-2 rounded-lg text-xs font-bold whitespace-nowrap">
              <Store size={14} />
              {currentBranch.name}
            </div>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors
                  ${selectedCategory === cat
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredProducts.map(product => {
              const stock = product.branchStock[currentBranch.id] || 0;
              return (
                <div
                  key={product.id}
                  onClick={() => stock > 0 && addToCart(product)}
                  className={`bg-white p-4 rounded-xl border border-slate-200 shadow-sm transition-all group relative
                    ${stock > 0
                      ? 'hover:shadow-md cursor-pointer hover:border-amber-400'
                      : 'opacity-60 cursor-not-allowed grayscale'}`}
                >
                  {stock === 0 && (
                    <span className="absolute top-2 right-2 text-[10px] font-bold bg-red-100 text-red-600 px-2 py-0.5 rounded-full">Out of Stock</span>
                  )}
                  <h3 className="font-semibold text-slate-800 text-sm mb-1 truncate">{product.name}</h3>
                  <p className="text-xs text-slate-500 mb-2 font-mono">{product.sku}</p>
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-900">${product.price.toFixed(2)}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${stock > 5 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {stock} left
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Cart Sidebar */}
      <div className="w-96 bg-white border-l border-slate-200 flex flex-col shadow-2xl z-20">

        {/* Customer Selector */}
        <div className="p-4 border-b border-slate-200 bg-slate-50">
          {selectedCustomer ? (
            <div className="flex justify-between items-center bg-white p-3 rounded-lg border border-amber-200 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-bold">
                  {selectedCustomer.name.charAt(0)}
                </div>
                <div>
                  <p className="font-bold text-sm text-slate-900">{selectedCustomer.name}</p>
                  <p className="text-xs text-slate-500">Pts: {selectedCustomer.loyaltyPoints}</p>
                </div>
              </div>
              <button onClick={() => setSelectedCustomer(null)} className="text-slate-400 hover:text-red-500">
                <X size={18} />
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <div className="relative flex-1">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <select
                  className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 appearance-none bg-white"
                  onChange={(e) => {
                    const cust = customers.find(c => c.id === e.target.value);
                    if (cust) setSelectedCustomer(cust);
                  }}
                  value=""
                >
                  <option value="" disabled>Select Customer</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <button
                onClick={() => setIsCustomerModalOpen(true)}
                className="bg-slate-900 text-white p-2 rounded-lg hover:bg-slate-800 transition-colors"
                title="Add New Customer"
              >
                <UserPlus size={20} />
              </button>
            </div>
          )}
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-3">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center">
                <ScanBarcode className="w-8 h-8 opacity-40" />
              </div>
              <p>Scan items or select from grid</p>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.id} className="flex gap-3 items-start p-3 bg-white rounded-lg border border-slate-100 shadow-sm">
                <div className="w-10 h-10 bg-slate-100 rounded-md flex-shrink-0 flex items-center justify-center">
                  <span className="text-sm font-bold text-slate-400">{item.name.charAt(0)}</span>
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <h4 className="font-medium text-slate-900 text-sm line-clamp-1">{item.name}</h4>
                    <p className="text-slate-900 font-bold text-sm">${(item.price * item.quantity).toFixed(2)}</p>
                  </div>
                  <div className="flex items-center gap-3 mt-2">
                    <div className="flex items-center bg-slate-100 rounded-lg p-0.5">
                      <button
                        onClick={() => item.quantity > 1 ? addToCart({ ...item, quantity: -1 } as any) : removeFromCart(item.id)}
                        className="p-1 hover:bg-white rounded-md transition-colors"
                      >
                        <Minus size={12} className="text-slate-600" />
                      </button>
                      <span className="text-xs font-bold w-6 text-center">{item.quantity}</span>
                      <button
                        onClick={() => addToCart(item)}
                        className="p-1 hover:bg-white rounded-md transition-colors"
                      >
                        <Plus size={12} className="text-slate-600" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer / Calculations */}
        <div className="p-5 bg-white border-t border-slate-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
          <div className="space-y-2 mb-4">
            <div className="flex justify-between text-slate-500 text-sm">
              <span>Subtotal</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-slate-500 text-sm">
              <span>Discount</span>
              <div className="flex items-center gap-1">
                <span className="text-slate-400">- $</span>
                <input
                  type="number"
                  min="0"
                  className="w-16 text-right border-b border-slate-200 focus:border-amber-500 outline-none text-slate-700"
                  value={discountAmount}
                  onChange={(e) => setDiscountAmount(Number(e.target.value))}
                />
              </div>
            </div>
            <div className="flex justify-between text-slate-500 text-sm">
              <span>Tax (8%)</span>
              <span>${tax.toFixed(2)}</span>
            </div>
          </div>

          <div className="flex justify-between mb-6 items-end pt-2 border-t border-dashed border-slate-200">
            <span className="text-slate-900 font-bold text-lg">Total</span>
            <span className="text-3xl font-bold text-slate-900">${total.toFixed(2)}</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => handleCheckout('Cash')}
              disabled={cart.length === 0}
              className="flex items-center justify-center gap-2 py-3 bg-slate-100 text-slate-700 font-medium rounded-lg hover:bg-slate-200 disabled:opacity-50 transition-colors"
            >
              <Banknote size={18} /> Cash
            </button>
            <button
              onClick={() => handleCheckout('Card')}
              disabled={cart.length === 0}
              className="flex items-center justify-center gap-2 py-3 bg-slate-900 text-white font-medium rounded-lg hover:bg-slate-800 shadow-lg disabled:opacity-50 transition-colors"
            >
              <CreditCard size={18} /> Pay Now
            </button>
          </div>
        </div>
      </div>

      {/* Add Customer Modal */}
      {isCustomerModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-800">New Customer</h3>
              <button onClick={() => setIsCustomerModalOpen(false)}><X size={20} className="text-slate-400" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">Name</label>
                <input type="text" className="w-full mt-1 p-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-amber-500" value={newCustomer.name} onChange={e => setNewCustomer({ ...newCustomer, name: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">Phone</label>
                <input type="text" className="w-full mt-1 p-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-amber-500" value={newCustomer.phone} onChange={e => setNewCustomer({ ...newCustomer, phone: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">Email</label>
                <input type="email" className="w-full mt-1 p-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-amber-500" value={newCustomer.email} onChange={e => setNewCustomer({ ...newCustomer, email: e.target.value })} />
              </div>
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button onClick={handleCreateCustomer} className="bg-amber-500 hover:bg-amber-600 text-white px-6 py-2 rounded-lg font-medium transition-colors">
                Save Customer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Modal */}
      {isInvoiceOpen && lastSale && (
        <div className="fixed inset-0 bg-slate-900/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 bg-slate-900 text-white flex justify-between items-center">
              <div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="text-green-400" size={24} />
                  <h2 className="text-xl font-bold">Payment Successful</h2>
                </div>
                <p className="text-slate-400 text-sm mt-1">Invoice #{lastSale.invoiceNumber}</p>
              </div>
              <button onClick={() => setIsInvoiceOpen(false)} className="text-slate-400 hover:text-white transition-colors">
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 bg-slate-50 print:bg-white" id="invoice-preview">
              <div className="text-center mb-8">
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">HOARD LAVISH</h1>
                <p className="text-slate-500 text-sm mt-1">Luxury Fashion Retail</p>
                <p className="text-slate-400 text-xs mt-1">{new Date(lastSale.date).toLocaleString()}</p>
                <p className="text-slate-400 text-xs mt-1 font-bold">{lastSale.branchName}</p>
              </div>

              {lastSale.customerName && (
                <div className="mb-6 pb-6 border-b border-dashed border-slate-200">
                  <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Customer</p>
                  <p className="font-bold text-slate-900">{lastSale.customerName}</p>
                </div>
              )}

              <div className="space-y-3 mb-6">
                {lastSale.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-sm">
                    <div className="flex gap-2">
                      <span className="font-bold text-slate-700">{item.quantity}x</span>
                      <span className="text-slate-600">{item.name}</span>
                    </div>
                    <span className="font-medium text-slate-900">${(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div className="border-t border-slate-200 pt-4 space-y-2">
                <div className="flex justify-between text-sm text-slate-500">
                  <span>Subtotal</span>
                  <span>${lastSale.subtotal.toFixed(2)}</span>
                </div>
                {lastSale.discount > 0 && (
                  <div className="flex justify-between text-sm text-emerald-600">
                    <span>Discount</span>
                    <span>-${lastSale.discount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm text-slate-500">
                  <span>Tax (8%)</span>
                  <span>${lastSale.tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold text-slate-900 pt-2 border-t border-slate-200 mt-2">
                  <span>Total</span>
                  <span>${lastSale.totalAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs text-slate-400 mt-1">
                  <span>Payment Method</span>
                  <span>{lastSale.paymentMethod}</span>
                </div>
              </div>

              <div className="mt-8 text-center">
                <ScanBarcode className="w-full h-12 text-slate-200" />
                <p className="text-[10px] text-slate-400 mt-2">Thank you for shopping with us.</p>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 flex gap-3 bg-white">
              <button
                onClick={handlePrint}
                className="flex-1 flex items-center justify-center gap-2 bg-slate-900 text-white py-3 rounded-xl hover:bg-slate-800 transition-colors font-medium"
              >
                <Printer size={18} /> Print Receipt
              </button>
              <button
                onClick={() => setIsInvoiceOpen(false)}
                className="px-6 py-3 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 font-medium transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default POS;
