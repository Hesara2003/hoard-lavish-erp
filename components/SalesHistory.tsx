import React, { useState } from 'react';
import { Search, FileText, ChevronRight, User, Calendar, DollarSign, X } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { SalesRecord } from '../types';

const SalesHistory: React.FC = () => {
  const { salesHistory } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSale, setSelectedSale] = useState<SalesRecord | null>(null);

  const filteredSales = salesHistory.filter(sale => 
    sale.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (sale.customerName && sale.customerName.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="flex h-full bg-slate-50 overflow-hidden">
      {/* List Section */}
      <div className={`${selectedSale ? 'w-1/2' : 'w-full'} flex flex-col transition-all duration-300 border-r border-slate-200`}>
        <div className="p-6 bg-white border-b border-slate-200">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-slate-900">Sales History</h2>
            <div className="bg-slate-100 px-3 py-1 rounded-full text-xs font-medium text-slate-600">
              {filteredSales.length} Records
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input 
              type="text"
              placeholder="Search by Invoice # or Customer..."
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {filteredSales.map(sale => (
            <div 
              key={sale.id}
              onClick={() => setSelectedSale(sale)}
              className={`p-4 rounded-xl border cursor-pointer transition-all hover:shadow-md
                ${selectedSale?.id === sale.id 
                  ? 'bg-slate-900 text-white border-slate-900' 
                  : 'bg-white border-slate-100 text-slate-900 hover:border-amber-200'}`}
            >
              <div className="flex justify-between items-start mb-2">
                <span className={`font-mono text-sm ${selectedSale?.id === sale.id ? 'text-amber-400' : 'text-slate-500'}`}>
                  {sale.invoiceNumber}
                </span>
                <span className={`font-bold ${selectedSale?.id === sale.id ? 'text-white' : 'text-slate-900'}`}>
                  ${sale.totalAmount.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <div className="flex items-center gap-2 opacity-80">
                  <User size={14} />
                  <span>{sale.customerName || 'Walk-in Customer'}</span>
                </div>
                <div className="flex items-center gap-2 opacity-60 text-xs">
                  <Calendar size={12} />
                  <span>{new Date(sale.date).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          ))}
          {filteredSales.length === 0 && (
            <div className="text-center py-10 text-slate-400">
              No records found.
            </div>
          )}
        </div>
      </div>

      {/* Detail Section */}
      {selectedSale && (
        <div className="w-1/2 bg-white flex flex-col h-full animate-in slide-in-from-right duration-300">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
            <div>
              <h3 className="font-bold text-lg text-slate-800">Invoice Details</h3>
              <p className="text-xs text-slate-400 font-mono">{selectedSale.invoiceNumber}</p>
            </div>
            <button 
              onClick={() => setSelectedSale(null)}
              className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500"
            >
              <X size={20} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-8">
            {/* Header Status */}
            <div className="flex justify-between items-center mb-8">
               <div className="flex items-center gap-3">
                 <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-green-600">
                   <DollarSign size={24} />
                 </div>
                 <div>
                   <p className="text-sm text-slate-500">Total Amount</p>
                   <p className="text-2xl font-bold text-slate-900">${selectedSale.totalAmount.toFixed(2)}</p>
                 </div>
               </div>
               <div className="text-right">
                 <span className="inline-block px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold uppercase">
                   Paid via {selectedSale.paymentMethod}
                 </span>
                 <p className="text-xs text-slate-400 mt-2">{new Date(selectedSale.date).toLocaleString()}</p>
               </div>
            </div>

            {/* Customer Info */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mb-6">
              <h4 className="text-xs font-bold text-slate-400 uppercase mb-3">Customer Information</h4>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white border border-slate-200 rounded-full flex items-center justify-center text-slate-400">
                  <User size={20} />
                </div>
                <div>
                  <p className="font-bold text-slate-900">{selectedSale.customerName || 'Walk-in Customer'}</p>
                  <p className="text-xs text-slate-500">ID: {selectedSale.customerId || 'N/A'}</p>
                </div>
              </div>
            </div>

            {/* Items Table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden mb-6">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="p-3 font-medium">Item</th>
                    <th className="p-3 font-medium text-right">Qty</th>
                    <th className="p-3 font-medium text-right">Price</th>
                    <th className="p-3 font-medium text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedSale.items.map((item, idx) => (
                    <tr key={idx}>
                      <td className="p-3 text-slate-900">{item.name}</td>
                      <td className="p-3 text-right text-slate-600">{item.quantity}</td>
                      <td className="p-3 text-right text-slate-600">${item.price.toFixed(2)}</td>
                      <td className="p-3 text-right font-medium text-slate-900">${(item.price * item.quantity).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="space-y-2 max-w-xs ml-auto">
              <div className="flex justify-between text-slate-500 text-sm">
                <span>Subtotal</span>
                <span>${selectedSale.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-500 text-sm">
                <span>Discount</span>
                <span>-${selectedSale.discount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-500 text-sm">
                <span>Tax</span>
                <span>${selectedSale.tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-900 font-bold text-lg pt-2 border-t border-slate-200">
                <span>Grand Total</span>
                <span>${selectedSale.totalAmount.toFixed(2)}</span>
              </div>
            </div>
          </div>
          
          <div className="p-6 border-t border-slate-100 flex justify-end">
            <button 
              onClick={() => window.print()}
              className="flex items-center gap-2 px-6 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium shadow-sm"
            >
              <FileText size={18} /> Print Invoice
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesHistory;
