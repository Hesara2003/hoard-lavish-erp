import React, { useState } from 'react';
import { Truck, Plus, Phone, Mail, MapPin, Edit2, Trash2, X, DollarSign, Calendar, FileText, Search } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { Supplier, SupplierTransaction } from '../types';

const Suppliers: React.FC = () => {
  const { suppliers, addSupplier, updateSupplier, deleteSupplier, supplierTransactions, addSupplierTransaction } = useStore();
  const [activeTab, setActiveTab] = useState<'LIST' | 'EXPENSE' | 'HISTORY'>('LIST');
  const [searchTerm, setSearchTerm] = useState('');

  // Modal State for Add/Edit Supplier
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Partial<Supplier>>({});

  // Form State for Expenses
  const [expenseForm, setExpenseForm] = useState({
    supplierId: '',
    amount: '',
    reference: '',
    notes: '',
    date: new Date().toISOString().split('T')[0]
  });

  // Derived State
  const filteredSuppliers = suppliers.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.contactPerson.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredTransactions = supplierTransactions.filter(t => 
    t.supplierName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.reference.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Handlers
  const handleSaveSupplier = () => {
    if (editingSupplier.name && editingSupplier.contactPerson) {
      if (editingSupplier.id) {
        updateSupplier(editingSupplier.id, editingSupplier);
      } else {
        addSupplier({
          ...editingSupplier,
          id: Math.random().toString(36).substr(2, 9),
        } as Supplier);
      }
      setIsModalOpen(false);
      setEditingSupplier({});
    }
  };

  const handleDeleteSupplier = (id: string) => {
    if (confirm('Are you sure you want to delete this supplier?')) {
      deleteSupplier(id);
    }
  };

  const handleSubmitExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const supplier = suppliers.find(s => s.id === expenseForm.supplierId);
    if (supplier && expenseForm.amount) {
      addSupplierTransaction({
        id: Math.random().toString(36).substr(2, 9),
        supplierId: supplier.id,
        supplierName: supplier.name,
        amount: Number(expenseForm.amount),
        date: new Date(expenseForm.date).toISOString(),
        type: 'PAYMENT',
        reference: expenseForm.reference,
        notes: expenseForm.notes
      });
      // Reset form
      setExpenseForm({
        supplierId: '',
        amount: '',
        reference: '',
        notes: '',
        date: new Date().toISOString().split('T')[0]
      });
      setActiveTab('HISTORY');
    }
  };

  return (
    <div className="flex-1 bg-slate-50 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex-shrink-0">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Supplier Management</h1>
            <p className="text-sm text-slate-500">Manage vendor profiles and purchase expenses.</p>
          </div>
          <button 
             onClick={() => { setEditingSupplier({}); setIsModalOpen(true); }}
             className="bg-slate-900 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-slate-800 transition-colors shadow-sm text-sm font-medium"
          >
            <Plus size={16} /> Add Supplier
          </button>
        </div>

        <div className="flex gap-4">
          <button 
            onClick={() => setActiveTab('LIST')}
            className={`px-4 py-2 border-b-2 font-medium text-sm transition-colors ${activeTab === 'LIST' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            Suppliers List
          </button>
          <button 
            onClick={() => setActiveTab('EXPENSE')}
            className={`px-4 py-2 border-b-2 font-medium text-sm transition-colors ${activeTab === 'EXPENSE' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            Record Expense
          </button>
          <button 
            onClick={() => setActiveTab('HISTORY')}
            className={`px-4 py-2 border-b-2 font-medium text-sm transition-colors ${activeTab === 'HISTORY' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            Expense History
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-6">
        
        {/* VIEW: LIST */}
        {activeTab === 'LIST' && (
          <>
            <div className="relative max-w-md mb-6">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="Search suppliers..." 
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-200"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredSuppliers.map(supplier => (
                <div key={supplier.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center text-blue-600">
                      <Truck size={20} />
                    </div>
                    <div className="flex gap-1">
                      <button 
                        onClick={() => { setEditingSupplier(supplier); setIsModalOpen(true); }}
                        className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => handleDeleteSupplier(supplier.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  
                  <h3 className="font-bold text-slate-900 text-lg mb-1">{supplier.name}</h3>
                  <p className="text-sm text-slate-500 mb-4">{supplier.contactPerson}</p>
                  
                  <div className="space-y-2 text-sm text-slate-600">
                    <div className="flex items-center gap-2">
                      <Phone size={14} className="text-slate-400" /> {supplier.phone}
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail size={14} className="text-slate-400" /> {supplier.email}
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin size={14} className="text-slate-400" /> {supplier.address}
                    </div>
                  </div>
                </div>
              ))}
              {filteredSuppliers.length === 0 && (
                <div className="col-span-full text-center py-12 text-slate-400">
                  No suppliers found. Add one to get started.
                </div>
              )}
            </div>
          </>
        )}

        {/* VIEW: EXPENSE ENTRY */}
        {activeTab === 'EXPENSE' && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-6 border-b border-slate-100 bg-slate-50">
                <h3 className="font-bold text-lg text-slate-800">Record Supplier Payment</h3>
                <p className="text-slate-500 text-sm">Log payments for stock purchases or services.</p>
              </div>
              <form onSubmit={handleSubmitExpense} className="p-6 space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Select Supplier</label>
                    <select 
                      required
                      className="w-full p-2.5 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-slate-900 bg-white"
                      value={expenseForm.supplierId}
                      onChange={e => setExpenseForm({...expenseForm, supplierId: e.target.value})}
                    >
                      <option value="">-- Choose Supplier --</option>
                      {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Amount ($)</label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input 
                        required
                        type="number"
                        min="0.01"
                        step="0.01"
                        className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-slate-900"
                        value={expenseForm.amount}
                        onChange={e => setExpenseForm({...expenseForm, amount: e.target.value})}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                    <input 
                      required
                      type="date"
                      className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-slate-900"
                      value={expenseForm.date}
                      onChange={e => setExpenseForm({...expenseForm, date: e.target.value})}
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Reference (Invoice #)</label>
                    <input 
                      type="text"
                      className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-slate-900"
                      placeholder="e.g. INV-2024-001"
                      value={expenseForm.reference}
                      onChange={e => setExpenseForm({...expenseForm, reference: e.target.value})}
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
                    <textarea 
                      className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-slate-900 h-24 resize-none"
                      placeholder="Additional details..."
                      value={expenseForm.notes}
                      onChange={e => setExpenseForm({...expenseForm, notes: e.target.value})}
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <button type="submit" className="bg-slate-900 text-white px-8 py-2.5 rounded-lg font-medium hover:bg-slate-800 transition-colors shadow-lg">
                    Record Payment
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* VIEW: EXPENSE HISTORY */}
        {activeTab === 'HISTORY' && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
             <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-bold text-slate-800">Transaction History</h3>
                <div className="relative max-w-xs">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                  <input 
                    type="text" 
                    placeholder="Search transactions..." 
                    className="w-full pl-9 pr-4 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                  />
                </div>
             </div>
             <table className="w-full text-left text-sm">
               <thead className="bg-slate-50 text-slate-500 uppercase text-xs">
                 <tr>
                   <th className="p-4">Date</th>
                   <th className="p-4">Supplier</th>
                   <th className="p-4">Reference</th>
                   <th className="p-4">Amount</th>
                   <th className="p-4">Notes</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-100">
                 {filteredTransactions.map(t => (
                   <tr key={t.id} className="hover:bg-slate-50">
                     <td className="p-4 text-slate-500">{new Date(t.date).toLocaleDateString()}</td>
                     <td className="p-4 font-medium text-slate-900">{t.supplierName}</td>
                     <td className="p-4 text-slate-600 font-mono">{t.reference || '-'}</td>
                     <td className="p-4 font-bold text-slate-900">${t.amount.toFixed(2)}</td>
                     <td className="p-4 text-slate-500 max-w-xs truncate">{t.notes}</td>
                   </tr>
                 ))}
                 {filteredTransactions.length === 0 && (
                   <tr>
                     <td colSpan={5} className="p-8 text-center text-slate-400">No transactions found.</td>
                   </tr>
                 )}
               </tbody>
             </table>
          </div>
        )}

      </div>

      {/* Modal: Add/Edit Supplier */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md shadow-2xl p-6 animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
              <h3 className="font-bold text-lg text-slate-800">{editingSupplier.id ? 'Edit Supplier' : 'New Supplier'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Company Name</label>
                <input 
                  type="text" 
                  className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-slate-900"
                  value={editingSupplier.name || ''}
                  onChange={e => setEditingSupplier({...editingSupplier, name: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Contact Person</label>
                <input 
                  type="text" 
                  className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-slate-900"
                  value={editingSupplier.contactPerson || ''}
                  onChange={e => setEditingSupplier({...editingSupplier, contactPerson: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                  <input 
                    type="text" 
                    className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-slate-900"
                    value={editingSupplier.phone || ''}
                    onChange={e => setEditingSupplier({...editingSupplier, phone: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                  <input 
                    type="email" 
                    className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-slate-900"
                    value={editingSupplier.email || ''}
                    onChange={e => setEditingSupplier({...editingSupplier, email: e.target.value})}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
                <input 
                  type="text" 
                  className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-slate-900"
                  value={editingSupplier.address || ''}
                  onChange={e => setEditingSupplier({...editingSupplier, address: e.target.value})}
                />
              </div>
            </div>

            <div className="mt-8 flex justify-end gap-3">
              <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium">Cancel</button>
              <button onClick={handleSaveSupplier} className="px-6 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 font-medium shadow-md">Save Supplier</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Suppliers;
