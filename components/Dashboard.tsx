import React, { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { DollarSign, ShoppingBag, TrendingUp, CreditCard, Wallet, Calendar, Trophy, Award } from 'lucide-react';
import { useStore } from '../context/StoreContext';

const Dashboard: React.FC = () => {
  const { salesHistory, products } = useStore();

  // Helper to check dates
  const isToday = (dateString: string) => {
    const today = new Date();
    const date = new Date(dateString);
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  };

  const isThisMonth = (dateString: string) => {
    const today = new Date();
    const date = new Date(dateString);
    return date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  };

  // --- Calculate Metrics ---
  
  // Today
  const todaySales = salesHistory.filter(s => isToday(s.date));
  const todayRevenue = todaySales.reduce((sum, s) => sum + s.totalAmount, 0);
  const todayCost = todaySales.reduce((sum, s) => sum + (s.totalCost || 0), 0);
  const todayProfit = todayRevenue - todayCost;
  const todayTxCount = todaySales.length;

  // Month
  const monthSales = salesHistory.filter(s => isThisMonth(s.date));
  const monthRevenue = monthSales.reduce((sum, s) => sum + s.totalAmount, 0);
  const monthCost = monthSales.reduce((sum, s) => sum + (s.totalCost || 0), 0);
  const monthProfit = monthRevenue - monthCost;
  const monthTxCount = monthSales.length;

  // Inventory Stats
  const lowStockCount = products.filter(p => p.stock < 5).length;
  const totalStockValue = products.reduce((sum, p) => sum + (p.price * p.stock), 0);

  // Top Performers (KPIs)
  const topPerformers = useMemo(() => {
    const stats = new Map<string, { name: string, revenue: number, quantity: number }>();
    
    monthSales.forEach(sale => {
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
  }, [monthSales]);
  
  // Chart Data: Last 7 days
  const chartData = useMemo(() => {
    const days = 7;
    const data = [];
    const today = new Date();
    
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      
      const daysSales = salesHistory.filter(s => s.date.startsWith(dateStr));
      const rev = daysSales.reduce((sum, s) => sum + s.totalAmount, 0);
      const cost = daysSales.reduce((sum, s) => sum + (s.totalCost || 0), 0);
      
      data.push({
        name: d.toLocaleDateString('en-US', { weekday: 'short' }),
        revenue: rev,
        profit: rev - cost
      });
    }
    return data;
  }, [salesHistory]);

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

  return (
    <div className="flex-1 bg-slate-50 p-6 md:p-8 overflow-y-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Dashboard</h2>
          <p className="text-slate-500 text-sm">Real-time overview of business performance.</p>
        </div>
        <div className="bg-white px-4 py-2 rounded-lg border border-slate-200 text-slate-600 text-sm font-medium flex items-center gap-2">
          <Calendar size={16} className="text-slate-400" />
          {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>

      {/* TODAY'S STATS */}
      <div className="mb-2">
        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          Today's Overview
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard 
            title="Today's Sales" 
            value={`$${todayRevenue.toFixed(2)}`} 
            subtext={`${todayTxCount} transactions`}
            icon={DollarSign} 
            colorClass="bg-emerald-500" 
          />
          <StatCard 
            title="Today's Expenses" 
            value={`$${todayCost.toFixed(2)}`} 
            subtext="Cost of Goods Sold"
            icon={CreditCard} 
            colorClass="bg-rose-500" 
          />
          <StatCard 
            title="Today's Profit" 
            value={`$${todayProfit.toFixed(2)}`} 
            subtext={`Margin: ${todayRevenue ? ((todayProfit/todayRevenue)*100).toFixed(1) : 0}%`}
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

      {/* MONTHLY STATS */}
      <div className="mb-8">
        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Monthly Overview</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-6 rounded-xl border border-slate-200">
             <div className="flex justify-between items-center mb-2">
               <span className="text-slate-500 text-sm">Total Revenue</span>
               <TrendingUp size={16} className="text-emerald-500" />
             </div>
             <div className="text-3xl font-bold text-slate-800">${monthRevenue.toFixed(2)}</div>
             <div className="mt-2 w-full bg-slate-100 rounded-full h-1.5">
               <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: '70%' }}></div>
             </div>
          </div>
          <div className="bg-white p-6 rounded-xl border border-slate-200">
             <div className="flex justify-between items-center mb-2">
               <span className="text-slate-500 text-sm">Total Expenses</span>
               <TrendingUp size={16} className="text-rose-500 rotate-180" />
             </div>
             <div className="text-3xl font-bold text-slate-800">${monthCost.toFixed(2)}</div>
             <div className="mt-2 w-full bg-slate-100 rounded-full h-1.5">
               <div className="bg-rose-500 h-1.5 rounded-full" style={{ width: '45%' }}></div>
             </div>
          </div>
          <div className="bg-white p-6 rounded-xl border border-slate-200">
             <div className="flex justify-between items-center mb-2">
               <span className="text-slate-500 text-sm">Net Profit</span>
               <Wallet size={16} className="text-amber-500" />
             </div>
             <div className="text-3xl font-bold text-slate-800">${monthProfit.toFixed(2)}</div>
             <div className="mt-2 w-full bg-slate-100 rounded-full h-1.5">
               <div className="bg-amber-500 h-1.5 rounded-full" style={{ width: '60%' }}></div>
             </div>
          </div>
        </div>
      </div>

      {/* KPI SECTION */}
      <div className="mb-8">
        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Trophy size={16} className="text-amber-500" />
            Top Performers (This Month)
        </h3>
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
        {/* Revenue vs Profit Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="font-bold text-slate-800">Revenue vs Profit</h3>
              <p className="text-xs text-slate-400">Last 7 days performance</p>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
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
    </div>
  );
};

export default Dashboard;