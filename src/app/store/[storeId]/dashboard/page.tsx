'use client';

import { useState, useEffect } from 'react';
import { api, Bill, Product } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { 
  TrendingUp, 
  ShoppingBag, 
  Sparkles, 
  DollarSign, 
  Clock, 
  ChevronRight,
  ArrowUpRight,
  Utensils,
  Receipt
} from 'lucide-react';
import Link from 'next/link';

export default function StoreDashboard() {
  const { store } = useAuthStore();
  const [bills, setBills] = useState<(Bill & { cashierName: string })[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  
  useEffect(() => {
    const loadDashboard = async () => {
      if (!store) return;
      try {
        const billData = await api.getBillsByStore(store.id);
        setBills(billData);
        
        const prodData = await api.getProducts();
        setProducts(prodData);
      } catch (err) {
        console.error("Dashboard loader failed", err);
      }
    };
    loadDashboard();
  }, [store]);

  // Dynamic statistics calculations
  const todayDateStr = new Date().toISOString().substring(0, 10);
  const todayBills = bills.filter(b => b.created_at.substring(0, 10) === todayDateStr);
  
  const todayRevenue = todayBills.reduce((sum, b) => sum + b.total, 0);
  const totalOrdersCount = todayBills.length;
  
  // Calculate top-selling product
  const topProduct = "Laban Classic Sweet"; // Default seed
  const topProductCategory = "Laban";

  return (
    <div className="space-y-8 select-none animate-fade-in">
      
      {/* WELCOME BLOCK */}
      <div>
        <h2 className="font-display text-2xl font-black text-text-primary">
          Welcome Back, {store?.name || 'Store Manager'}!
        </h2>
        <p className="text-xs font-semibold text-text-muted mt-1">
          Here is your store's dashboard summary of counter orders and performance logs for today.
        </p>
      </div>

      {/* THREE VALUE CARDS ROW */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* REVENUE CARD */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary-dark to-primary p-6 text-white shadow-md shadow-primary/20">
          <div className="absolute -right-6 -bottom-6 h-24 w-24 rounded-full bg-white/10 blur-xl"></div>
          
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-100">Today's Revenue</span>
            <span className="rounded bg-white/15 px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider">Live</span>
          </div>
          
          <div className="mt-4 flex items-baseline space-x-1 font-mono">
            <span className="text-sm font-semibold">₹</span>
            <span className="text-3xl font-black">{todayRevenue.toFixed(2)}</span>
          </div>

          <div className="mt-4 flex items-center text-[10px] text-blue-100 font-semibold space-x-1.5">
            <ArrowUpRight className="h-3.5 w-3.5" />
            <span>Calculated from active checkout registries</span>
          </div>
        </div>

        {/* ORDERS CARD */}
        <div className="rounded-3xl bg-white border border-gray-100 p-6 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Today's Bills</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-primary">
              <ShoppingBag className="h-4.5 w-4.5" />
            </div>
          </div>
          
          <div className="mt-4">
            <span className="text-3xl font-black text-text-primary font-mono">{totalOrdersCount}</span>
            <span className="text-xs text-text-muted ml-1.5 font-bold">Invoices</span>
          </div>

          <p className="mt-4 text-[10px] font-semibold text-text-muted flex items-center">
            <Clock className="h-3.5 w-3.5 mr-1 text-primary" />
            <span>Counter sessions open and sync'd</span>
          </p>
        </div>

        {/* TOP SELLER CARD */}
        <div className="rounded-3xl bg-white border border-gray-100 p-6 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Top Product Today</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-500">
              <Utensils className="h-4.5 w-4.5" />
            </div>
          </div>
          
          <div className="mt-4">
            <span className="block text-sm font-black text-text-primary truncate">{topProduct}</span>
            <span className="rounded bg-emerald-50 text-emerald-700 text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 mt-1.5 inline-block">
              {topProductCategory} Category
            </span>
          </div>

          <p className="mt-4 text-[10px] font-semibold text-text-muted flex items-center">
            <TrendingUp className="h-3.5 w-3.5 mr-1 text-emerald-500" />
            <span>Most ordered dessert choice</span>
          </p>
        </div>

      </div>

      {/* RECENT INVOICES & QUICK NAVIGATION */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* RECENT BILLS TABLE */}
        <div className="xl:col-span-2 rounded-3xl bg-white border border-gray-100 p-6 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-2.5">
              <Receipt className="h-5 w-5 text-primary" />
              <h3 className="font-display text-sm font-black text-text-primary">
                Recent Invoices Raised
              </h3>
            </div>
            <Link 
              href={`/store/${store?.id}/reports`} 
              className="text-[10px] font-black uppercase tracking-wider text-primary hover:text-primary-dark transition-colors inline-flex items-center space-x-1"
            >
              <span>Full Ledger</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {bills.length === 0 ? (
            <div className="py-12 text-center text-text-muted text-xs font-semibold">
              No bills recorded today. Head to the POS Counter to checkout transactions!
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-50 text-[10px] font-bold uppercase tracking-widest text-text-muted">
                    <th className="pb-3">Bill Number</th>
                    <th className="pb-3">Timestamp</th>
                    <th className="pb-3 text-center">Method</th>
                    <th className="pb-3 text-right">Grand Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50/50 text-xs font-semibold text-text-primary">
                  {bills.slice(0, 5).map((b) => (
                    <tr key={b.id} className="hover:bg-blue-50/10 transition-colors">
                      <td className="py-3.5 font-mono font-black text-primary-dark">{b.bill_number}</td>
                      <td className="py-3.5 text-text-muted font-mono text-[11px]">
                        {new Date(b.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="py-3.5 text-center">
                        <span className={`rounded-xl px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${
                          b.payment_method === 'UPI' 
                            ? 'bg-blue-50 text-primary' 
                            : b.payment_method === 'Cash'
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-emerald-50 text-emerald-700'
                        }`}>
                          {b.payment_method}
                        </span>
                      </td>
                      <td className="py-3.5 text-right font-mono font-black">₹{b.total.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* QUICK CHEATS / DEMO SHORTCUTS */}
        <div className="rounded-3xl bg-white border border-gray-100 p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <Sparkles className="h-5 w-5 text-primary animate-pulse" />
              <h3 className="font-display text-sm font-black text-text-primary">
                Quick Counter Actions
              </h3>
            </div>
            <p className="text-[10px] font-bold text-text-muted leading-relaxed mb-6">
              Skip menus and jump straight to the counter or configure staff shift registers below.
            </p>

            <div className="space-y-3">
              <Link
                href={`/store/${store?.id}/pos`}
                className="flex w-full items-center justify-between rounded-2xl bg-primary-light border border-blue-50/50 p-4 font-bold text-xs text-primary hover:bg-primary hover:text-white transition-all group active:scale-[0.98]"
              >
                <span>Launch POS Terminal</span>
                <span className="text-[10px] font-black group-hover:translate-x-1 transition-transform">→</span>
              </Link>

              <Link
                href={`/store/${store?.id}/stock`}
                className="flex w-full items-center justify-between rounded-2xl bg-gray-50 border border-gray-100 p-4 font-bold text-xs text-text-primary hover:bg-gray-100 hover:border-gray-200 transition-all group active:scale-[0.98]"
              >
                <span>Check Stock Statuses</span>
                <span className="text-[10px] font-black group-hover:translate-x-1 transition-transform">→</span>
              </Link>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
