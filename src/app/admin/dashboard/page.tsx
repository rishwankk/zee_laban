'use client';

import { useState, useEffect } from 'react';
import { api, Bill, Store, Product } from '@/lib/supabase';
import { 
  Building, 
  ShoppingBag, 
  Coins, 
  Sparkles, 
  Receipt,
  MapPin,
  TrendingUp,
  X,
  Calendar,
  FileText,
  Flame,
  Award
} from 'lucide-react';
import Link from 'next/link';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid 
} from 'recharts';

export default function AdminDashboard() {
  const [stores, setStores] = useState<Store[]>([]);
  const [allBills, setAllBills] = useState<Bill[]>([]);
  
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [storeBills, setStoreBills] = useState<Bill[]>([]);
  
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [billItems, setBillItems] = useState<any[]>([]);
  const [trendingProducts, setTrendingProducts] = useState<any[]>([]);

  const [chartTimeframe, setChartTimeframe] = useState<number>(7);

  const loadDashboard = async () => {
    try {
      const sData = await api.getStores();
      setStores(sData);

      // Fetch bills from all stores
      const billsAccumulator: Bill[] = [];
      for (const st of sData) {
        const storeBills = await api.getBillsByStore(st.id);
        billsAccumulator.push(...storeBills);
      }
      const pData = await api.getProducts();

      // Fetch all bill items to calculate trending fast across all bills
      const items = await api.getAllBillItems();
      if (items && items.length > 0) {
        const qtyMap = new Map<string, number>();
        items.forEach((item: any) => {
          qtyMap.set(item.product_id, (qtyMap.get(item.product_id) || 0) + item.quantity);
        });
        
        const trending = Array.from(qtyMap.entries())
          .map(([productId, quantity]) => {
            const p = pData.find(prod => prod.id === productId);
            return {
              id: productId,
              name: p?.name || 'Unknown',
              category: p?.category || 'General',
              quantity,
            };
          })
          .sort((a, b) => b.quantity - a.quantity)
          .slice(0, 5); // top 5
          
        setTrendingProducts(trending);
      }

      setAllBills(billsAccumulator.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
    } catch (err) {
      console.error("Failed to load admin stats", err);
    }
  };

  useEffect(() => {
    loadDashboard();

    // Zero-cost realtime optimistic updates
    window.addEventListener('lbn_realtime_bill_created', loadDashboard);
    return () => {
      window.removeEventListener('lbn_realtime_bill_created', loadDashboard);
    };
  }, []);

  const handleStoreClick = (st: Store) => {
    setSelectedStore(st);
    setStoreBills(allBills.filter(b => b.store_id === st.id));
  };

  const handleBillClick = async (bill: Bill) => {
    setSelectedBill(bill);
    const items = await api.getBillItems(bill.id);
    setBillItems(items);
  };

  // Global Aggregates
  const totalRevenue = allBills.reduce((sum, b) => sum + b.total, 0);
  const totalOrders = allBills.length;
  const activeOutlets = stores.filter(s => s.is_active).length;
  
  // Calculate average order value
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  // Store-wise distributions
  const storeStats = stores.map(st => {
    const storeBills = allBills.filter(b => b.store_id === st.id);
    const rev = storeBills.reduce((sum, b) => sum + b.total, 0);
    const count = storeBills.length;
    return { name: st.name, revenue: rev, count };
  });

  // Generate dynamic chart data based on timeframe
  const chartData = Array.from({ length: chartTimeframe }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (chartTimeframe - 1 - i));
    const dateStr = d.toISOString().split('T')[0];
    
    const dayBills = allBills.filter(b => b.created_at.startsWith(dateStr));
    const revenue = dayBills.reduce((sum, b) => sum + b.total, 0);
    
    let nameFormat;
    if (chartTimeframe === 1) nameFormat = 'Today';
    else if (chartTimeframe > 7) nameFormat = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    else nameFormat = d.toLocaleDateString('en-US', { weekday: 'short' });
    
    return {
      name: nameFormat,
      revenue,
      fullDate: dateStr
    };
  });

  return (
    <div className="space-y-8 select-none animate-fade-in">
      
      {/* HEADER SECTION */}
      <div>
        <h2 className="font-display text-2xl font-black text-text-primary">
          Global Operations Desk
        </h2>
        <p className="text-xs font-semibold text-text-muted mt-1">
          Monitor consolidated sales performances, active store footprints, and master catalog statistics.
        </p>
      </div>

      {/* FOUR VALUE CARDS ROW */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        
        <div className="rounded-3xl bg-white border border-gray-100 p-6 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Global Revenue</span>
            <h3 className="font-display text-xl font-black text-primary mt-1 font-mono">₹{totalRevenue.toFixed(2)}</h3>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-primary">
            <Coins className="h-5 w-5" />
          </div>
        </div>

        <div className="rounded-3xl bg-white border border-gray-100 p-6 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Total Orders</span>
            <h3 className="font-display text-xl font-black text-text-primary mt-1 font-mono">{totalOrders}</h3>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-primary">
            <ShoppingBag className="h-5 w-5" />
          </div>
        </div>

        <div className="rounded-3xl bg-white border border-gray-100 p-6 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Active Outlets</span>
            <h3 className="font-display text-xl font-black text-emerald-700 mt-1 font-mono">{activeOutlets}</h3>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-500">
            <Building className="h-5 w-5" />
          </div>
        </div>

        <div className="rounded-3xl bg-white border border-gray-100 p-6 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Average Ticket Size</span>
            <h3 className="font-display text-xl font-black text-primary-dark mt-1 font-mono">₹{avgOrderValue.toFixed(2)}</h3>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-primary animate-pulse">
            <Sparkles className="h-5 w-5" />
          </div>
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* DYNAMIC REVENUE TREND GRAPH */}
        <div className="lg:col-span-2 rounded-3xl bg-white border border-gray-100 p-6 shadow-sm flex flex-col">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <h3 className="font-display text-sm font-black text-text-primary">
              Brand Revenue Trend
            </h3>
          </div>
          
          {/* Timeframe Selector */}
          <select 
            value={chartTimeframe}
            onChange={(e) => setChartTimeframe(Number(e.target.value))}
            className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-bold text-text-primary outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer"
          >
            <option value={1}>Today</option>
            <option value={7}>Last 7 Days</option>
            <option value={10}>Last 10 Days</option>
            <option value={30}>Last 30 Days</option>
          </select>
        </div>
        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 'bold' }} 
                dy={10} 
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 'bold' }} 
                tickFormatter={(value) => `₹${value}`} 
              />
              <Tooltip 
                contentStyle={{ borderRadius: '16px', border: '1px solid #f1f5f9', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                itemStyle={{ color: '#0ea5e9', fontWeight: 'bold', fontSize: '12px' }}
                labelStyle={{ color: '#64748b', fontWeight: 'bold', fontSize: '10px', marginBottom: '4px' }}
                formatter={(value: any) => [`₹${Number(value).toFixed(2)}`, 'Revenue']}
              />
              <Area 
                type="monotone" 
                dataKey="revenue" 
                stroke="#0ea5e9" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorRevenue)" 
                activeDot={{ r: 6, strokeWidth: 0, fill: '#0284c7' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        </div>

        {/* TOP TRENDING PRODUCTS */}
        <div className="rounded-3xl bg-gradient-to-b from-white to-sky-50/30 border border-gray-100 p-6 shadow-sm flex flex-col relative overflow-hidden group">
          {/* Decorative background glow */}
          <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors duration-700 pointer-events-none"></div>
          
          <div className="flex items-center space-x-2 mb-6 relative z-10">
            <div className="p-2 bg-orange-50 rounded-xl text-orange-500">
              <Flame className="h-5 w-5" />
            </div>
            <h3 className="font-display text-sm font-black text-text-primary">
              Global Trending Items
            </h3>
          </div>

          <div className="flex-1 flex flex-col justify-between space-y-4 relative z-10">
            {trendingProducts.length === 0 ? (
              <div className="text-xs text-text-muted text-center py-8">No trending data available</div>
            ) : (
              trendingProducts.map((tp, idx) => (
                <div key={tp.id} className="group/item relative flex items-center p-3 rounded-2xl hover:bg-white border border-transparent hover:border-gray-100 transition-all hover:shadow-md hover:shadow-primary/5 cursor-default">
                  
                  {/* Rank Badge */}
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-black mr-3 shadow-sm ${
                    idx === 0 ? 'bg-gradient-to-br from-yellow-300 to-yellow-500 text-yellow-900 shadow-yellow-500/30' :
                    idx === 1 ? 'bg-gradient-to-br from-slate-200 to-slate-400 text-slate-800 shadow-slate-400/30' :
                    idx === 2 ? 'bg-gradient-to-br from-amber-600 to-amber-800 text-amber-50 shadow-amber-700/30' :
                    'bg-gray-100 text-gray-500'
                  }`}>
                    #{idx + 1}
                  </div>
                  
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-black text-text-primary truncate">{tp.name}</p>
                    <p className="text-[10px] font-bold text-text-muted mt-0.5 uppercase tracking-wider truncate">{tp.category}</p>
                  </div>
                  
                  {/* Quantity */}
                  <div className="text-right ml-2 flex flex-col items-end">
                    <span className="text-xs font-black text-primary bg-primary/5 px-2 py-1 rounded-lg">
                      {tp.quantity} sold
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* OUTLET FOOTPRINT & RECENT GLOBAL BILLS */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* OUTLET COMPARISON LIST */}
        <div className="xl:col-span-2 rounded-3xl bg-white border border-gray-100 p-6 shadow-sm flex flex-col">
          <div className="flex items-center space-x-2 mb-6">
            <Building className="h-5 w-5 text-primary" />
            <h3 className="font-display text-sm font-black text-text-primary">
              Outlet Revenue Distribution
            </h3>
          </div>

          <div className="space-y-4">
            {storeStats.map((st) => {
              // Calculate percent of total revenue
              const pct = totalRevenue > 0 ? (st.revenue / totalRevenue) * 100 : 0;
              
              return (
                <div 
                  key={st.name} 
                  onClick={() => {
                    const store = stores.find(s => s.name === st.name);
                    if (store) handleStoreClick(store);
                  }}
                  className="space-y-2 rounded-2xl bg-gray-50/50 p-4 border border-gray-50 cursor-pointer hover:bg-gray-100/50 hover:border-primary/20 transition-all active:scale-[0.98]"
                >
                  <div className="flex items-center justify-between text-xs font-black">
                    <span className="text-text-primary">{st.name}</span>
                    <div className="flex items-center space-x-4">
                      <span className="text-text-muted text-[10px] font-bold">{st.count} Invoices</span>
                      <span className="font-mono text-primary">₹{st.revenue.toFixed(2)}</span>
                    </div>
                  </div>
                  
                  {/* Custom progress bar */}
                  <div className="h-2 w-full rounded-full bg-gray-200 overflow-hidden">
                    <div 
                      className="h-full rounded-full bg-primary transition-all duration-500" 
                      style={{ width: `${Math.max(4, pct)}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* RECENT GLOBAL TRANSACTIONS */}
        <div className="rounded-3xl bg-white border border-gray-100 p-6 shadow-sm flex flex-col max-h-[450px] overflow-hidden">
          <div className="flex items-center space-x-2.5 mb-4">
            <Receipt className="h-5 w-5 text-primary" />
            <h3 className="font-display text-sm font-black text-text-primary">
              Live Invoices Stream
            </h3>
          </div>
          <p className="text-[10px] font-bold text-text-muted leading-relaxed mb-4">
            Real-time feed of billing checkouts raised across all outlets.
          </p>

          <div className="flex-1 overflow-y-auto space-y-3.5 pr-1">
            {allBills.length === 0 ? (
              <div className="py-8 text-center text-xs text-text-muted font-semibold">
                No invoices issued across the brand yet.
              </div>
            ) : (
              allBills.slice(0, 8).map((b) => {
                const outlet = stores.find(s => s.id === b.store_id);
                return (
                  <div 
                    key={b.id} 
                    onClick={() => handleBillClick(b)}
                    className="rounded-2xl border border-gray-100 bg-gray-50/40 p-3 cursor-pointer hover:border-blue-300 hover:shadow-sm hover:bg-white transition-all active:scale-[0.98]"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="block font-mono font-black text-[11px] text-primary-dark">
                          {b.bill_number}
                        </span>
                        <span className="text-[8px] font-black uppercase text-text-muted bg-white px-1.5 py-0.5 rounded border border-gray-50 inline-block mt-1">
                          {outlet ? outlet.name : 'Unknown Outlet'}
                        </span>
                      </div>
                      <span className="font-mono text-xs font-black text-text-primary">
                        ₹{b.total.toFixed(2)}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

      {/* STORE BILLS MODAL */}
      {selectedStore && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-2xl rounded-3xl bg-white shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between bg-gray-50 px-6 py-4 border-b border-gray-100">
              <div className="flex items-center space-x-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-primary">
                  <Building className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-display text-lg font-black text-text-primary">{selectedStore.name}</h3>
                  <p className="text-xs font-bold text-text-muted">{storeBills.length} Total Invoices</p>
                </div>
              </div>
              <button onClick={() => setSelectedStore(null)} className="rounded-full p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-3 bg-slate-50/30">
              {storeBills.length === 0 ? (
                <div className="text-center py-10 text-sm font-semibold text-slate-400">No invoices found for this outlet.</div>
              ) : (
                storeBills.map(b => (
                  <div key={b.id} onClick={() => handleBillClick(b)} className="flex items-center justify-between rounded-2xl bg-white border border-gray-100 p-4 shadow-sm cursor-pointer hover:border-primary/30 transition-colors active:scale-[0.99]">
                    <div className="flex items-center space-x-4">
                      <div className="h-10 w-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400">
                        <Receipt className="h-4.5 w-4.5" />
                      </div>
                      <div>
                        <p className="font-mono text-xs font-black text-primary-dark">{b.bill_number}</p>
                        <p className="text-[10px] font-bold text-text-muted mt-0.5">{new Date(b.created_at).toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-sm font-black text-text-primary">₹{b.total.toFixed(2)}</p>
                      <p className="text-[9px] font-bold uppercase text-emerald-500">{b.payment_method}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* BILL DETAILS MODAL */}
      {selectedBill && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 backdrop-blur-md p-4 animate-fade-in">
          <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between bg-primary px-6 py-5">
              <div>
                <p className="text-[10px] font-bold text-white/80 uppercase tracking-widest mb-1">Invoice Details</p>
                <h3 className="font-mono text-lg font-black text-white">{selectedBill.bill_number}</h3>
              </div>
              <button onClick={() => setSelectedBill(null)} className="rounded-full p-2 bg-white/10 text-white hover:bg-white/20 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="rounded-2xl bg-white border border-gray-100 p-3 shadow-sm">
                  <p className="text-[9px] font-bold text-slate-400 uppercase">Order Type</p>
                  <p className="text-xs font-black text-slate-700 mt-1">{selectedBill.order_type || 'Takeaway'}</p>
                </div>
                <div className="rounded-2xl bg-white border border-gray-100 p-3 shadow-sm">
                  <p className="text-[9px] font-bold text-slate-400 uppercase">Payment</p>
                  <p className="text-xs font-black text-slate-700 mt-1">{selectedBill.payment_method}</p>
                </div>
                <div className="rounded-2xl bg-white border border-gray-100 p-3 shadow-sm col-span-2 flex items-center space-x-3">
                  <Calendar className="h-4 w-4 text-slate-400" />
                  <div>
                    <p className="text-[9px] font-bold text-slate-400 uppercase">Timestamp</p>
                    <p className="text-xs font-bold text-slate-700">{new Date(selectedBill.created_at).toLocaleString()}</p>
                  </div>
                </div>
              </div>

              <h4 className="text-xs font-black text-text-primary uppercase tracking-wider mb-3 flex items-center">
                <ShoppingBag className="h-3.5 w-3.5 mr-1.5 text-primary" />
                Purchased Items
              </h4>
              
              <div className="space-y-2 mb-6">
                {billItems.map(item => (
                  <div key={item.id} className="flex items-center justify-between rounded-xl bg-white border border-gray-100 p-3 shadow-sm">
                    <div>
                      <p className="text-xs font-bold text-text-primary">{item.product_name}</p>
                      <p className="text-[10px] font-semibold text-slate-400 mt-0.5">{item.quantity} × ₹{item.unit_price.toFixed(2)}</p>
                    </div>
                    <p className="font-mono text-xs font-black text-text-primary">₹{item.total_price.toFixed(2)}</p>
                  </div>
                ))}
              </div>

              <div className="rounded-2xl bg-gradient-to-br from-primary/5 to-blue-50/50 border border-primary/10 p-4 font-mono text-xs font-semibold text-slate-600">
                <div className="flex justify-between mb-1.5"><span>Subtotal</span><span>₹{selectedBill.subtotal.toFixed(2)}</span></div>
                <div className="flex justify-between mb-1.5"><span>CGST</span><span>₹{selectedBill.cgst.toFixed(2)}</span></div>
                <div className="flex justify-between mb-3"><span>SGST</span><span>₹{selectedBill.sgst.toFixed(2)}</span></div>
                <div className="flex justify-between pt-3 border-t border-dashed border-primary/20 text-sm font-black text-primary-dark">
                  <span>GRAND TOTAL</span><span>₹{selectedBill.total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
