import React, { useState, useMemo } from 'react';
import { Plus, Edit2, AlertCircle, Trash2, Search, Filter, History, Box, Tag, ArrowUpRight, ArrowDownRight, Save, X, Building2 } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { Product } from '../types';

type InventoryTab = 'ALL' | 'LOW_STOCK' | 'ADJUSTMENTS' | 'CATEGORIES';

const Inventory: React.FC = () => {
  const { 
    products, categories, brands, stockHistory, currentBranch,
    addProduct, updateProduct, deleteProduct, adjustStock,
    addCategory, removeCategory, addBrand, removeBrand 
  } = useStore();

  const [activeTab, setActiveTab] = useState<InventoryTab>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');

  // Modal States
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);
  
  // Stock Adjustment State
  const [adjustingProduct, setAdjustingProduct] = useState<Product | null>(null);
  const [adjustmentType, setAdjustmentType] = useState<'IN' | 'OUT' | 'ADJUSTMENT'>('IN');
  const [adjustmentQty, setAdjustmentQty] = useState<number>(0);
  const [adjustmentReason, setAdjustmentReason] = useState('');

  // Filtering
  const filteredProducts = useMemo(() => {
    let result = products;
    if (activeTab === 'LOW_STOCK') {
      result = result.filter(p => (p.branchStock[currentBranch.id] || 0) <= p.minStockLevel);
    }
    
    if (filterCategory !== 'All') {
      result = result.filter(p => p.category === filterCategory);
    }

    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(p => 
        p.name.toLowerCase().includes(lower) || 
        p.sku.toLowerCase().includes(lower) ||
        p.brand.toLowerCase().includes(lower)
      );
    }
    return result;
  }, [products, activeTab, filterCategory, searchTerm, currentBranch]);

  // Handlers
  const handleOpenAdd = () => {
    setEditingProduct({
      category: categories[0] || 'Uncategorized',
      brand: brands[0] || 'Generic',
      minStockLevel: 5,
      branchStock: { [currentBranch.id]: 0 }
    });
    setIsProductModalOpen(true);
  };

  const handleOpenEdit = (product: Product) => {
    setEditingProduct({ ...product });
    setIsProductModalOpen(true);
  };

  const handleSaveProduct = () => {
    if (!editingProduct?.name || !editingProduct?.price) return;

    const productData = {
      ...editingProduct,
      price: Number(editingProduct.price),
      costPrice: Number(editingProduct.costPrice),
      minStockLevel: Number(editingProduct.minStockLevel),
      // Stock handled via adjustments mostly, but init for new product
      branchStock: editingProduct.branchStock || {}
    } as Product;

    if (productData.id) {
      updateProduct(productData.id, productData);
    } else {
      addProduct({
        ...productData,
        id: Math.random().toString(36).substr(2, 9),
        imageUrl: productData.imageUrl || `https://picsum.photos/400/400?random=${Math.floor(Math.random() * 1000)}`
      });
    }
    setIsProductModalOpen(false);
    setEditingProduct(null);
  };

  const handleOpenAdjustment = (product: Product) => {
    setAdjustingProduct(product);
    setAdjustmentType('IN');
    setAdjustmentQty(0);
    setAdjustmentReason('');
    setIsStockModalOpen(true);
  };

  const handleSubmitAdjustment = () => {
    if (adjustingProduct && adjustmentQty > 0) {
      adjustStock(adjustingProduct.id, adjustmentQty, adjustmentType, adjustmentReason || 'Manual Adjustment');
      setIsStockModalOpen(false);
      setAdjustingProduct(null);
    }
  };

  // Render Helpers
  const TabButton = ({ id, label, icon: Icon }: { id: InventoryTab, label: string, icon: any }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`flex items-center gap-2 px-4 py-2 border-b-2 font-medium text-sm transition-colors
        ${activeTab === id 
          ? 'border-slate-900 text-slate-900' 
          : 'border-transparent text-slate-500 hover:text-slate-700'}`}
    >
      <Icon size={16} />
      {label}
      {id === 'LOW_STOCK' && (
        <span className="ml-1 px-1.5 py-0.5 bg-red-100 text-red-600 rounded-full text-xs">
          {products.filter(p => (p.branchStock[currentBranch.id] || 0) <= p.minStockLevel).length}
        </span>
      )}
    </button>
  );

  return (
    <div className="flex-1 bg-slate-50 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex-shrink-0">
        <div className="flex justify-between items-center mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-xl font-bold text-slate-900">Inventory Management</h1>
              <span className="bg-indigo-50 text-indigo-700 text-xs px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                <Building2 size={12} /> {currentBranch.name}
              </span>
            </div>
            <p className="text-sm text-slate-500">Manage products and stock levels for this branch.</p>
          </div>
          <button 
            onClick={handleOpenAdd}
            className="bg-slate-900 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-slate-800 transition-colors shadow-sm text-sm font-medium"
          >
            <Plus size={16} /> Add Product
          </button>
        </div>
        
        <div className="flex gap-4 overflow-x-auto">
          <TabButton id="ALL" label="All Products" icon={Box} />
          <TabButton id="LOW_STOCK" label="Low Stock Alerts" icon={AlertCircle} />
          <TabButton id="ADJUSTMENTS" label="Stock History" icon={History} />
          <TabButton id="CATEGORIES" label="Categories & Brands" icon={Tag} />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-6">
        
        {/* FILTERS for Lists */}
        {(activeTab === 'ALL' || activeTab === 'LOW_STOCK') && (
          <div className="flex gap-4 mb-6">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="Search by name, SKU, or brand..." 
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-200"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <select 
              className="px-4 py-2 border border-slate-200 rounded-lg focus:outline-none bg-white text-slate-600"
              value={filterCategory}
              onChange={e => setFilterCategory(e.target.value)}
            >
              <option value="All">All Categories</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        )}

        {/* PRODUCTS TABLE */}
        {(activeTab === 'ALL' || activeTab === 'LOW_STOCK') && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-medium">
                <tr>
                  <th className="p-4">Product</th>
                  <th className="p-4">SKU / Brand</th>
                  <th className="p-4">Category</th>
                  <th className="p-4 text-right">Cost</th>
                  <th className="p-4 text-right">Price</th>
                  <th className="p-4 text-center">Stock ({currentBranch.name})</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredProducts.map(p => {
                  const branchStock = p.branchStock[currentBranch.id] || 0;
                  return (
                    <tr key={p.id} className="hover:bg-slate-50 group">
                      <td className="p-4 flex items-center gap-3">
                        <img src={p.imageUrl} className="w-10 h-10 rounded object-cover bg-slate-100" />
                        <div>
                          <div className="font-medium text-slate-900">{p.name}</div>
                          {branchStock <= p.minStockLevel && (
                            <span className="text-[10px] text-red-600 font-bold bg-red-50 px-1.5 py-0.5 rounded">Low Stock</span>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-slate-600">
                        <div>{p.sku}</div>
                        <div className="text-xs text-slate-400">{p.brand}</div>
                      </td>
                      <td className="p-4 text-slate-600">{p.category}</td>
                      <td className="p-4 text-right text-slate-500">${p.costPrice.toFixed(2)}</td>
                      <td className="p-4 text-right font-medium text-slate-900">${p.price.toFixed(2)}</td>
                      <td className="p-4 text-center">
                        <div className="flex flex-col items-center">
                          <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            branchStock === 0 ? 'bg-red-100 text-red-700' :
                            branchStock <= p.minStockLevel ? 'bg-amber-100 text-amber-700' :
                            'bg-green-100 text-green-700'
                          }`}>
                            {branchStock}
                          </div>
                          <span className="text-[10px] text-slate-400 mt-1">Total: {p.stock}</span>
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => handleOpenAdjustment(p)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded" 
                            title="Adjust Stock"
                          >
                            <History size={16} />
                          </button>
                          <button 
                            onClick={() => handleOpenEdit(p)}
                            className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded"
                            title="Edit"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button 
                            onClick={() => deleteProduct(p.id)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filteredProducts.length === 0 && (
              <div className="p-8 text-center text-slate-400">No products found matching your criteria.</div>
            )}
          </div>
        )}

        {/* STOCK HISTORY TAB */}
        {activeTab === 'ADJUSTMENTS' && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 uppercase text-xs">
                <tr>
                  <th className="p-4">Date</th>
                  <th className="p-4">Product</th>
                  <th className="p-4">Branch</th>
                  <th className="p-4">Type</th>
                  <th className="p-4 text-right">Quantity</th>
                  <th className="p-4">Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stockHistory.filter(h => h.branchId === currentBranch.id).map(log => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="p-4 text-slate-500 whitespace-nowrap">
                      {new Date(log.date).toLocaleString()}
                    </td>
                    <td className="p-4 font-medium text-slate-900">{log.productName}</td>
                    <td className="p-4 text-slate-600 text-xs">{log.branchName}</td>
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-bold
                        ${log.type === 'IN' ? 'bg-green-100 text-green-700' : 
                          log.type === 'OUT' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                        {log.type === 'IN' && <ArrowDownRight size={12} />}
                        {log.type === 'OUT' && <ArrowUpRight size={12} />}
                        {log.type}
                      </span>
                    </td>
                    <td className="p-4 text-right font-mono">{log.quantity}</td>
                    <td className="p-4 text-slate-600">{log.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {stockHistory.filter(h => h.branchId === currentBranch.id).length === 0 && (
              <div className="p-8 text-center text-slate-400">No stock movement history available for this branch.</div>
            )}
          </div>
        )}

        {/* CATEGORIES & BRANDS TAB (Shared across branches, no changes needed really) */}
        {activeTab === 'CATEGORIES' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Categories */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <h3 className="font-bold text-lg mb-4 text-slate-800">Product Categories</h3>
              <div className="flex gap-2 mb-4">
                <input id="newCat" type="text" placeholder="New Category" className="flex-1 p-2 border border-slate-200 rounded-lg text-sm" />
                <button 
                  onClick={() => {
                    const input = document.getElementById('newCat') as HTMLInputElement;
                    if(input.value) { addCategory(input.value); input.value = ''; }
                  }}
                  className="bg-slate-900 text-white px-4 rounded-lg text-sm"
                >Add</button>
              </div>
              <div className="flex flex-wrap gap-2">
                {categories.map(cat => (
                  <div key={cat} className="group flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-full text-sm text-slate-700">
                    {cat}
                    <button onClick={() => removeCategory(cat)} className="text-slate-400 hover:text-red-500"><X size={14} /></button>
                  </div>
                ))}
              </div>
            </div>

            {/* Brands */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <h3 className="font-bold text-lg mb-4 text-slate-800">Brands</h3>
              <div className="flex gap-2 mb-4">
                <input id="newBrand" type="text" placeholder="New Brand" className="flex-1 p-2 border border-slate-200 rounded-lg text-sm" />
                <button 
                  onClick={() => {
                    const input = document.getElementById('newBrand') as HTMLInputElement;
                    if(input.value) { addBrand(input.value); input.value = ''; }
                  }}
                  className="bg-slate-900 text-white px-4 rounded-lg text-sm"
                >Add</button>
              </div>
              <div className="flex flex-wrap gap-2">
                {brands.map(brand => (
                  <div key={brand} className="group flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-full text-sm text-slate-700">
                    {brand}
                    <button onClick={() => removeBrand(brand)} className="text-slate-400 hover:text-red-500"><X size={14} /></button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MODAL: ADD / EDIT PRODUCT */}
      {isProductModalOpen && editingProduct && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-800">{editingProduct.id ? 'Edit Product' : 'New Product'}</h3>
              <button onClick={() => setIsProductModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Product Name</label>
                <input 
                  type="text" 
                  className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 outline-none"
                  value={editingProduct.name || ''}
                  onChange={e => setEditingProduct({...editingProduct, name: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">SKU</label>
                <input 
                  type="text" 
                  className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 outline-none"
                  value={editingProduct.sku || ''}
                  onChange={e => setEditingProduct({...editingProduct, sku: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Brand</label>
                <select 
                  className="w-full p-2 border border-slate-200 rounded-lg outline-none bg-white"
                  value={editingProduct.brand}
                  onChange={e => setEditingProduct({...editingProduct, brand: e.target.value})}
                >
                   {brands.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Category</label>
                <select 
                  className="w-full p-2 border border-slate-200 rounded-lg outline-none bg-white"
                  value={editingProduct.category}
                  onChange={e => setEditingProduct({...editingProduct, category: e.target.value})}
                >
                   {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              {/* Note: Editing stock directly here is now removed/simplified because we have multi-branch stock. 
                  Users should use Adjustment or we could add a per-branch stock input list here. 
                  For now, let's keep it simple: Initial stock setup is 0, then use adjustments.
                  Or show current branch stock read-only. */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Stock ({currentBranch.name})</label>
                <input 
                  type="number" 
                  className="w-full p-2 border border-slate-200 rounded-lg outline-none bg-slate-100 text-slate-500"
                  disabled
                  value={editingProduct.branchStock?.[currentBranch.id] || 0}
                />
                <p className="text-[10px] text-slate-400 mt-1">Use 'Adjust Stock' to change inventory.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Cost Price ($)</label>
                <input 
                  type="number" 
                  className="w-full p-2 border border-slate-200 rounded-lg outline-none"
                  value={editingProduct.costPrice || 0}
                  onChange={e => setEditingProduct({...editingProduct, costPrice: Number(e.target.value)})}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Selling Price ($)</label>
                <input 
                  type="number" 
                  className="w-full p-2 border border-slate-200 rounded-lg outline-none"
                  value={editingProduct.price || 0}
                  onChange={e => setEditingProduct({...editingProduct, price: Number(e.target.value)})}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Min Stock Alert</label>
                <input 
                  type="number" 
                  className="w-full p-2 border border-slate-200 rounded-lg outline-none"
                  value={editingProduct.minStockLevel || 5}
                  onChange={e => setEditingProduct({...editingProduct, minStockLevel: Number(e.target.value)})}
                />
              </div>

              <div className="col-span-2">
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Description</label>
                <textarea 
                  className="w-full p-2 border border-slate-200 rounded-lg outline-none h-20 resize-none"
                  value={editingProduct.description || ''}
                  onChange={e => setEditingProduct({...editingProduct, description: e.target.value})}
                />
              </div>
            </div>

            <div className="p-5 border-t border-slate-100 flex justify-end gap-3 bg-slate-50">
              <button onClick={() => setIsProductModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg">Cancel</button>
              <button onClick={handleSaveProduct} className="px-6 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800">Save Product</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: STOCK ADJUSTMENT */}
      {isStockModalOpen && adjustingProduct && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md shadow-2xl overflow-hidden">
             <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-800">Adjust Stock</h3>
              <button onClick={() => setIsStockModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <p className="text-xs text-slate-500 uppercase font-bold mb-1">Product</p>
                <p className="font-bold text-slate-900">{adjustingProduct.name}</p>
                <div className="flex justify-between mt-1">
                   <p className="text-xs text-slate-500">Branch: <span className="font-bold text-slate-700">{currentBranch.name}</span></p>
                   <p className="text-xs text-slate-500">Current: <span className="font-bold text-slate-700">{adjustingProduct.branchStock[currentBranch.id] || 0}</span></p>
                </div>
              </div>

              <div>
                 <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Adjustment Type</label>
                 <div className="grid grid-cols-3 gap-2">
                   {['IN', 'OUT', 'ADJUSTMENT'].map((type) => (
                     <button
                       key={type}
                       onClick={() => setAdjustmentType(type as any)}
                       className={`py-2 text-xs font-bold rounded-lg border ${
                         adjustmentType === type 
                           ? 'bg-slate-900 text-white border-slate-900' 
                           : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                       }`}
                     >
                       {type === 'IN' ? 'Restock (+)' : type === 'OUT' ? 'Damage/Loss (-)' : 'Set Count (=)'}
                     </button>
                   ))}
                 </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Quantity</label>
                <input 
                  type="number" 
                  min="0"
                  className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-slate-900"
                  value={adjustmentQty}
                  onChange={e => setAdjustmentQty(Number(e.target.value))}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Reason / Note</label>
                <input 
                  type="text" 
                  placeholder="e.g. Monthly Supplier Delivery"
                  className="w-full p-2 border border-slate-200 rounded-lg outline-none"
                  value={adjustmentReason}
                  onChange={e => setAdjustmentReason(e.target.value)}
                />
              </div>
            </div>
            <div className="p-5 border-t border-slate-100 flex justify-end gap-3 bg-slate-50">
              <button onClick={() => setIsStockModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg">Cancel</button>
              <button onClick={handleSubmitAdjustment} className="px-6 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800">Confirm Adjustment</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Inventory;
