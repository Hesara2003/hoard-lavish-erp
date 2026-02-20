import React, { useMemo, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { DollarSign, ShoppingBag, TrendingUp, CreditCard, Wallet, Calendar, Trophy, Award, FileDown, BookOpen } from 'lucide-react';
import { useStore } from '../context/StoreContext';

type FilterMode = 'daily' | 'monthly';

const Dashboard: React.FC = () => {
  const { salesHistory, products, expenses, supplierTransactions } = useStore();

  // --- Filter State ---
  const today = new Date();
  const [filterMode, setFilterMode] = useState<FilterMode>('daily');
  const [selectedDate, setSelectedDate] = useState(today.toISOString().split('T')[0]); // YYYY-MM-DD
  const [selectedMonth, setSelectedMonth] = useState(
    `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}` // YYYY-MM
  );

  // --- Helpers ---
  const matchesDate = (dateString: string, targetDate: string) => {
    return dateString.startsWith(targetDate);
  };

  const matchesMonth = (dateString: string, targetMonth: string) => {
    return dateString.startsWith(targetMonth);
  };

  // --- Filtered Sales (used by overview, top performers, chart, and ledger) ---
  const filteredSales = useMemo(() => {
    if (filterMode === 'daily') {
      return salesHistory.filter(s => matchesDate(s.date, selectedDate));
    } else {
      return salesHistory.filter(s => matchesMonth(s.date, selectedMonth));
    }
  }, [salesHistory, filterMode, selectedDate, selectedMonth]);

  // --- Calculate Metrics ---
  const revenue = filteredSales.reduce((sum, s) => sum + s.totalAmount, 0);
  const cost = filteredSales.reduce((sum, s) => sum + (s.totalCost || 0), 0);
  const profit = revenue - cost;
  const txCount = filteredSales.length;

  // Inventory Stats
  const lowStockCount = products.filter(p => p.stock < 5).length;

  // --- Display Labels ---
  const periodLabel = useMemo(() => {
    if (filterMode === 'daily') {
      const d = new Date(selectedDate + 'T00:00:00');
      return d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    } else {
      const [year, month] = selectedMonth.split('-');
      const d = new Date(Number(year), Number(month) - 1, 1);
      return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
    }
  }, [filterMode, selectedDate, selectedMonth]);

  // Top Performers (KPIs)
  const topPerformers = useMemo(() => {
    const stats = new Map<string, { name: string, revenue: number, quantity: number }>();

    filteredSales.forEach(sale => {
      sale.items.forEach(item => {
        const current = stats.get(item.id) || { name: item.name, revenue: 0, quantity: 0 };
        stats.set(item.id, {
          name: item.name,
          revenue: current.revenue + (item.price * item.quantity),
          quantity: current.quantity + item.quantity
        });
      });
    });

    let bestRev = { name: 'No Sales Yet', value: 0 };
    let bestQty = { name: 'No Sales Yet', value: 0 };

    stats.forEach(val => {
      if (val.revenue > bestRev.value) bestRev = { name: val.name, value: val.revenue };
      if (val.quantity > bestQty.value) bestQty = { name: val.name, value: val.quantity };
    });

    return { bestRev, bestQty };
  }, [filteredSales]);

  // Chart Data
  const chartData = useMemo(() => {
    if (filterMode === 'daily') {
      // Show last 7 days ending at selectedDate
      const days = 7;
      const data = [];
      const endDate = new Date(selectedDate + 'T00:00:00');

      for (let i = days - 1; i >= 0; i--) {
        const d = new Date(endDate);
        d.setDate(endDate.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];

        const daysSales = salesHistory.filter(s => s.date.startsWith(dateStr));
        const rev = daysSales.reduce((sum, s) => sum + s.totalAmount, 0);
        const cst = daysSales.reduce((sum, s) => sum + (s.totalCost || 0), 0);

        data.push({
          name: d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' }),
          revenue: rev,
          profit: rev - cst
        });
      }
      return data;
    } else {
      // Show daily breakdown for the selected month
      const [year, month] = selectedMonth.split('-').map(Number);
      const daysInMonth = new Date(year, month, 0).getDate();
      const data = [];

      for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const daysSales = salesHistory.filter(s => s.date.startsWith(dateStr));
        const rev = daysSales.reduce((sum, s) => sum + s.totalAmount, 0);
        const cst = daysSales.reduce((sum, s) => sum + (s.totalCost || 0), 0);

        data.push({
          name: `${day}`,
          revenue: rev,
          profit: rev - cst
        });
      }
      return data;
    }
  }, [salesHistory, filterMode, selectedDate, selectedMonth]);

  // --- Unified Ledger ---
  const filteredExpenses = useMemo(() => {
    if (filterMode === 'daily') {
      return expenses.filter(e => matchesDate(e.date, selectedDate));
    } else {
      return expenses.filter(e => matchesMonth(e.date, selectedMonth));
    }
  }, [expenses, filterMode, selectedDate, selectedMonth]);

  const filteredSupplierTx = useMemo(() => {
    if (filterMode === 'daily') {
      return supplierTransactions.filter(t => t.type === 'PAYMENT' && matchesDate(t.date, selectedDate));
    } else {
      return supplierTransactions.filter(t => t.type === 'PAYMENT' && matchesMonth(t.date, selectedMonth));
    }
  }, [supplierTransactions, filterMode, selectedDate, selectedMonth]);

  const ledger = useMemo(() => {
    const all = [
      ...filteredSales.map(s => ({
        id: s.id, date: s.date, desc: `Sale #${s.invoiceNumber}`, amount: s.totalAmount, type: 'IN' as const, category: 'Sales'
      })),
      ...filteredExpenses.map(e => ({
        id: e.id, date: e.date, desc: e.description, amount: e.amount, type: 'OUT' as const, category: e.category
      })),
      ...filteredSupplierTx.map(t => ({
        id: t.id, date: t.date, desc: `Supplier: ${t.supplierName}`, amount: t.amount, type: 'OUT' as const, category: 'Inventory'
      }))
    ];
    return all.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [filteredSales, filteredExpenses, filteredSupplierTx]);

  // --- Report Generation ---
  const generateReport = () => {
    const lines: string[] = [];
    lines.push('='.repeat(60));
    lines.push(`  HOARD LAVISH — ${filterMode === 'daily' ? 'Daily' : 'Monthly'} Analysis Report`);
    lines.push(`  Period: ${periodLabel}`);
    lines.push(`  Generated: ${new Date().toLocaleString()}`);
    lines.push('='.repeat(60));
    lines.push('');

    lines.push('--- SUMMARY ---');
    lines.push(`Total Revenue:      $${revenue.toFixed(2)}`);
    lines.push(`Total Cost (COGS):  $${cost.toFixed(2)}`);
    lines.push(`Net Profit:         $${profit.toFixed(2)}`);
    lines.push(`Profit Margin:      ${revenue ? ((profit / revenue) * 100).toFixed(1) : 0}%`);
    lines.push(`Transactions:       ${txCount}`);
    lines.push('');

    lines.push('--- TOP PERFORMERS ---');
    lines.push(`Top Revenue Product:  ${topPerformers.bestRev.name} ($${topPerformers.bestRev.value.toFixed(2)})`);
    lines.push(`Most Sold Product:    ${topPerformers.bestQty.name} (${topPerformers.bestQty.value} units)`);
    lines.push('');

    if (ledger.length > 0) {
      lines.push('--- TRANSACTION LEDGER ---');
      lines.push(`${'Date'.padEnd(14)} ${'Type'.padEnd(6)} ${'Category'.padEnd(14)} ${'Amount'.padStart(12)}  Description`);
      lines.push('-'.repeat(80));
      ledger.forEach(item => {
        const date = new Date(item.date).toLocaleDateString();
        const sign = item.type === 'OUT' ? '-' : '+';
        lines.push(`${date.padEnd(14)} ${item.type.padEnd(6)} ${item.category.padEnd(14)} ${(sign + '$' + item.amount.toFixed(2)).padStart(12)}  ${item.desc}`);
      });
      lines.push('');
    }

    lines.push('='.repeat(60));
    lines.push('  End of Report');
    lines.push('='.repeat(60));

    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const filename = filterMode === 'daily'
      ? `report_${selectedDate}.txt`
      : `report_${selectedMonth}.txt`;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // --- Reusable Components ---
  const StatCard = ({ title, value, subtext, icon: Icon, colorClass }: any) => (
    <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 flex items-start gap-4 hover:shadow-md transition-shadow">
      <div className={`p-3 rounded-lg ${colorClass} text-white`}>
        <Icon size={24} />
      </div>
      <div>
        <p className="text-slate-500 text-sm font-medium">{title}</p>
        <h3 className="text-2xl font-bold text-slate-900 mt-1">{value}</h3>
        {subtext && <p className="text-xs text-slate-400 mt-1">{subtext}</p>}
      </div>
    </div>
  );

  // --- Filter Controls Component ---
  const FilterControls = () => (
    <div className="flex items-center gap-2">
      {/* Mode Toggle */}
      <div className="flex bg-slate-100 rounded-lg p-1">
        <button
          onClick={() => setFilterMode('daily')}
          className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${filterMode === 'daily' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'
            }`}
        >
          Daily
        </button>
        <button
          onClick={() => setFilterMode('monthly')}
          className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${filterMode === 'monthly' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'
            }`}
        >
          Monthly
        </button>
      </div>

      {/* Date / Month Picker */}
      <div className="relative">
        {filterMode === 'daily' ? (
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-slate-300 cursor-pointer"
          />
        ) : (
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-slate-300 cursor-pointer"
          />
        )}
      </div>

      {/* Generate Report Button */}
      <button
        onClick={generateReport}
        className="flex items-center gap-1.5 bg-slate-900 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-slate-800 transition-colors shadow-sm"
        title="Download analysis report"
      >
        <FileDown size={14} />
        Report
      </button>
    </div>
  );

  return (
    <div className="flex-1 bg-slate-50 p-6 md:p-8 overflow-y-auto">
      {/* PAGE HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Dashboard</h2>
          <p className="text-slate-500 text-sm">Real-time overview of business performance.</p>
        </div>
        <FilterControls />
      </div>

      {/* OVERVIEW STATS */}
      <div className="mb-2">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            {filterMode === 'daily' ? 'Daily' : 'Monthly'} Overview
          </h3>
          <span className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
            <Calendar size={13} />
            {periodLabel}
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            title="Revenue"
            value={`$${revenue.toFixed(2)}`}
            subtext={`${txCount} transactions`}
            icon={DollarSign}
            colorClass="bg-emerald-500"
          />
          <StatCard
            title="Expenses (COGS)"
            value={`$${cost.toFixed(2)}`}
            subtext="Cost of Goods Sold"
            icon={CreditCard}
            colorClass="bg-rose-500"
          />
          <StatCard
            title="Net Profit"
            value={`$${profit.toFixed(2)}`}
            subtext={`Margin: ${revenue ? ((profit / revenue) * 100).toFixed(1) : 0}%`}
            icon={Wallet}
            colorClass="bg-amber-500"
          />
          <StatCard
            title="Pending Actions"
            value={lowStockCount}
            subtext="Low stock alerts"
            icon={ShoppingBag}
            colorClass="bg-blue-500"
          />
        </div>
      </div>

      {/* TOP PERFORMERS */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <Trophy size={16} className="text-amber-500" />
            Top Performers
          </h3>
          <span className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
            <Calendar size={13} />
            {periodLabel}
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 uppercase font-bold mb-1">Top Revenue Product</p>
              <h4 className="font-bold text-slate-800 text-lg line-clamp-1" title={topPerformers.bestRev.name}>{topPerformers.bestRev.name}</h4>
              <p className="text-emerald-600 font-bold text-sm mt-1 flex items-center gap-1">
                <DollarSign size={14} /> {topPerformers.bestRev.value.toFixed(2)}
              </p>
            </div>
            <div className="bg-emerald-50 p-3 rounded-full text-emerald-600">
              <Award size={24} />
            </div>
          </div>
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 uppercase font-bold mb-1">Most Sold Product</p>
              <h4 className="font-bold text-slate-800 text-lg line-clamp-1" title={topPerformers.bestQty.name}>{topPerformers.bestQty.name}</h4>
              <p className="text-indigo-600 font-bold text-sm mt-1 flex items-center gap-1">
                <ShoppingBag size={14} /> {topPerformers.bestQty.value} units
              </p>
            </div>
            <div className="bg-indigo-50 p-3 rounded-full text-indigo-600">
              <Trophy size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* CHARTS */}
      <div className="grid grid-cols-1 gap-8 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="font-bold text-slate-800">Revenue vs Profit</h3>
              <p className="text-xs text-slate-400">
                {filterMode === 'daily' ? 'Last 7 days performance' : `Daily breakdown for ${periodLabel}`}
              </p>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} />
                <Tooltip
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  cursor={{ fill: '#f8fafc' }}
                />
                <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" name="Revenue" />
                <Area type="monotone" dataKey="profit" stroke="#f59e0b" strokeWidth={3} fillOpacity={1} fill="url(#colorProfit)" name="Profit" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* UNIFIED LEDGER */}
      <div className="mb-8">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-100 rounded-lg text-slate-600">
                <BookOpen size={18} />
              </div>
              <div>
                <h3 className="font-bold text-slate-800">Unified Ledger</h3>
                <p className="text-xs text-slate-400">Combined view of all financial transactions — {periodLabel}</p>
              </div>
            </div>
            <span className="text-xs text-slate-400 font-medium bg-slate-50 px-3 py-1 rounded-full">{ledger.length} entries</span>
          </div>
          {ledger.length > 0 ? (
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 uppercase text-xs">
                <tr>
                  <th className="p-4">Date</th>
                  <th className="p-4">Description</th>
                  <th className="p-4">Category</th>
                  <th className="p-4 text-right">Amount</th>
                  <th className="p-4 text-center">Type</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ledger.slice(0, 15).map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="p-4 text-slate-500 whitespace-nowrap">{new Date(item.date).toLocaleDateString()}</td>
                    <td className="p-4 font-medium text-slate-900">{item.desc}</td>
                    <td className="p-4">
                      <span className="bg-slate-100 px-2 py-1 rounded text-xs font-medium text-slate-600">{item.category}</span>
                    </td>
                    <td className={`p-4 text-right font-bold ${item.type === 'IN' ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {item.type === 'OUT' ? '-' : '+'}${item.amount.toFixed(2)}
                    </td>
                    <td className="p-4 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${item.type === 'IN' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                        {item.type === 'IN' ? 'Income' : 'Expense'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-12 text-center text-slate-400">
              <BookOpen size={32} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">No transactions found for this period.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;