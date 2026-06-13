'use client';

import { useState, useEffect } from 'react';
import { api, Product, Stock, StockLog } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import {
  Layers,
  Save,
  History,
  CheckCircle,
  AlertTriangle,
  XCircle,
  TrendingUp,
  User,
  Clock,
  Sparkles,
  Search,
  Filter,
  Package,
  ArrowUpDown,
  Minus,
  Plus
} from 'lucide-react';

type StatusFilter = 'all' | 'in_stock' | 'low_stock' | 'out_of_stock';

export default function StockPage() {
  const { store, user } = useAuthStore();
  const [stockItems, setStockItems] = useState<(Stock & { product: Product })[]>([]);
  const [logs, setLogs] = useState<(StockLog & { product: Product })[]>([]);

  // Local quantity inputs state
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState<string | null>(null);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  // Load stock and logs
  const loadData = async () => {
    if (!store) return;
    try {
      const stockData = await api.getStockByStore(store.id);
      setStockItems(stockData);

      const logData = await api.getStockLogs(store.id);
      setLogs(logData);

      // Pre-populate input values
      const initialQtys: Record<string, number> = {};
      stockData.forEach(item => {
        initialQtys[item.product_id] = item.quantity;
      });
      setQuantities(initialQtys);
    } catch (err) {
      console.error("Failed to load stock data", err);
    }
  };

  useEffect(() => {
    loadData();
  }, [store]);

  // Handle quantity changes
  const handleQtyChange = (productId: string, val: string) => {
    const num = parseInt(val) || 0;
    setQuantities(prev => ({ ...prev, [productId]: Math.max(0, num) }));
  };

  // Increment / Decrement helpers for mobile cards
  const handleIncrement = (productId: string) => {
    setQuantities(prev => ({ ...prev, [productId]: (prev[productId] || 0) + 1 }));
  };
  const handleDecrement = (productId: string) => {
    setQuantities(prev => ({ ...prev, [productId]: Math.max(0, (prev[productId] || 0) - 1) }));
  };

  // Save stock changes (updates quantity and decides status)
  const handleSaveStock = async (productId: string, qty: number, defaultStatus?: Stock['status']) => {
    if (!store || !user) return;
    setIsUpdating(productId);

    try {
      // Determine status based on quantity if not forced
      let status: Stock['status'] = defaultStatus || 'in_stock';
      if (!defaultStatus) {
        if (qty === 0) status = 'out_of_stock';
        else if (qty < 10) status = 'low_stock';
      }

      await api.updateStockQuantity(
        store.id,
        productId,
        qty,
        status,
        user.id,
        user.name
      );

      setIsSuccess(productId);
      setTimeout(() => setIsSuccess(null), 1500);

      // Reload
      await loadData();
    } catch (err) {
      console.error("Failed to update stock", err);
    } finally {
      setIsUpdating(null);
    }
  };

  // Direct toggle between In Stock and Out of Stock
  const handleToggleStatus = async (productId: string, currentStatus: Stock['status'], currentQty: number) => {
    let newStatus: Stock['status'] = 'in_stock';
    let newQty = currentQty;

    if (currentStatus === 'in_stock' || currentStatus === 'low_stock') {
      newStatus = 'out_of_stock';
      newQty = 0;
    } else {
      newStatus = 'in_stock';
      newQty = Math.max(25, currentQty); // Reset to a healthy default if they toggle back online
    }

    await handleSaveStock(productId, newQty, newStatus);
  };

  // Metrics calculations
  const totalItems = stockItems.length;
  const inStockCount = stockItems.filter(s => s.status === 'in_stock').length;
  const lowStockCount = stockItems.filter(s => s.status === 'low_stock').length;
  const outOfStockCount = stockItems.filter(s => s.status === 'out_of_stock').length;

  // Filtered items
  const filteredItems = stockItems.filter(item => {
    const matchesSearch = item.product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          item.product.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = statusFilter === 'all' || item.status === statusFilter;
    return matchesSearch && matchesFilter;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'in_stock':
        return { bg: 'bg-emerald-50 text-emerald-600 border-emerald-100/50', label: 'In Stock' };
      case 'low_stock':
        return { bg: 'bg-amber-50 text-amber-600 border-amber-100/50', label: 'Low Stock' };
      case 'out_of_stock':
        return { bg: 'bg-red-50 text-red-600 border-red-100/50', label: 'Out of Stock' };
      default:
        return { bg: 'bg-slate-50 text-slate-600 border-slate-100/50', label: status };
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 select-none animate-fade-in">

      {/* HEADER SECTION */}
      <div>
        <h2 className="font-display text-xl sm:text-2xl font-black text-text-primary flex items-center space-x-2">
          <Package className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
          <span>Store Inventory</span>
        </h2>
        <p className="text-[10px] sm:text-xs font-semibold text-text-muted mt-1">
          Manage stock levels, track availability, and inspect audit logs.
        </p>
      </div>

      {/* METRIC CARD BAR */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-5">

        <button
          onClick={() => setStatusFilter('all')}
          className={`rounded-2xl sm:rounded-3xl bg-white border p-3.5 sm:p-5 shadow-sm hover:shadow-md transition-all flex items-center justify-between group cursor-pointer ${
            statusFilter === 'all' ? 'border-primary ring-2 ring-primary/10' : 'border-slate-100'
          }`}
        >
          <div className="text-left">
            <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-primary transition-colors">Total</span>
            <h3 className="font-display text-lg sm:text-2xl font-black text-slate-800 mt-0.5">{totalItems}</h3>
          </div>
          <div className="flex h-9 w-9 sm:h-12 sm:w-12 items-center justify-center rounded-xl sm:rounded-2xl bg-blue-50 text-primary border border-blue-100/50">
            <Layers className="h-4 w-4 sm:h-6 sm:w-6 stroke-[2.5px]" />
          </div>
        </button>

        <button
          onClick={() => setStatusFilter('in_stock')}
          className={`rounded-2xl sm:rounded-3xl bg-white border p-3.5 sm:p-5 shadow-sm hover:shadow-md transition-all flex items-center justify-between group cursor-pointer ${
            statusFilter === 'in_stock' ? 'border-emerald-400 ring-2 ring-emerald-400/10' : 'border-emerald-50'
          }`}
        >
          <div className="text-left">
            <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-emerald-500">In Stock</span>
            <h3 className="font-display text-lg sm:text-2xl font-black text-emerald-700 mt-0.5">{inStockCount}</h3>
          </div>
          <div className="flex h-9 w-9 sm:h-12 sm:w-12 items-center justify-center rounded-xl sm:rounded-2xl bg-emerald-50 text-emerald-500 border border-emerald-100/50">
            <CheckCircle className="h-4 w-4 sm:h-6 sm:w-6 stroke-[2.5px]" />
          </div>
        </button>

        <button
          onClick={() => setStatusFilter('low_stock')}
          className={`rounded-2xl sm:rounded-3xl bg-white border p-3.5 sm:p-5 shadow-sm hover:shadow-md transition-all flex items-center justify-between group cursor-pointer ${
            statusFilter === 'low_stock' ? 'border-amber-400 ring-2 ring-amber-400/10' : 'border-amber-50'
          }`}
        >
          <div className="text-left">
            <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-amber-500">Low Stock</span>
            <h3 className="font-display text-lg sm:text-2xl font-black text-amber-700 mt-0.5">{lowStockCount}</h3>
          </div>
          <div className="flex h-9 w-9 sm:h-12 sm:w-12 items-center justify-center rounded-xl sm:rounded-2xl bg-amber-50 text-amber-500 border border-amber-100/50">
            <AlertTriangle className="h-4 w-4 sm:h-6 sm:w-6 stroke-[2.5px]" />
          </div>
        </button>

        <button
          onClick={() => setStatusFilter('out_of_stock')}
          className={`rounded-2xl sm:rounded-3xl bg-white border p-3.5 sm:p-5 shadow-sm hover:shadow-md transition-all flex items-center justify-between group cursor-pointer ${
            statusFilter === 'out_of_stock' ? 'border-red-400 ring-2 ring-red-400/10' : 'border-red-50'
          }`}
        >
          <div className="text-left">
            <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-red-500">Empty</span>
            <h3 className="font-display text-lg sm:text-2xl font-black text-red-700 mt-0.5">{outOfStockCount}</h3>
          </div>
          <div className="flex h-9 w-9 sm:h-12 sm:w-12 items-center justify-center rounded-xl sm:rounded-2xl bg-red-50 text-red-500 border border-red-100/50">
            <XCircle className="h-4 w-4 sm:h-6 sm:w-6 stroke-[2.5px]" />
          </div>
        </button>

      </div>

      {/* SEARCH BAR */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search products by name or category..."
          className="w-full rounded-2xl border border-slate-100 bg-white py-3 pl-11 pr-4 text-xs font-semibold outline-none shadow-sm transition-all focus:border-primary focus:ring-4 focus:ring-primary/5"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500 cursor-pointer text-[10px] font-black"
          >
            Clear
          </button>
        )}
      </div>

      {/* CORE CONTENT LAYOUT */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* LEFT COLUMN: STOCK EDITOR */}
        <div className="xl:col-span-2 space-y-0">

          {/* Desktop Card Grid View */}
          <div className="hidden md:block rounded-3xl bg-white border border-slate-100 p-5 sm:p-6 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between mb-6 px-1">
              <div className="flex items-center space-x-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary-dark text-white shadow-md shadow-primary/20">
                  <Package className="h-4.5 w-4.5 stroke-[2.5px]" />
                </div>
                <div>
                  <h3 className="font-display text-base font-black text-slate-800">
                    Availability Controller
                  </h3>
                  <p className="text-[9px] font-bold text-slate-400 mt-0.5">Manage product quantities and availability status</p>
                </div>
              </div>
              <span className="text-[10px] font-black text-primary bg-primary/5 px-3 py-1 rounded-xl border border-primary/10">
                {filteredItems.length} product{filteredItems.length !== 1 ? 's' : ''}
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredItems.map((item) => {
                const qtyVal = quantities[item.product_id] ?? item.quantity;
                const isPending = isUpdating === item.product_id;
                const isDone = isSuccess === item.product_id;
                const badge = getStatusBadge(item.status);

                // Progress bar percentage (max 100 units for visual)
                const fillPercent = Math.min(100, (qtyVal / 100) * 100);
                const barColor = item.status === 'out_of_stock' ? 'bg-red-400' : item.status === 'low_stock' ? 'bg-amber-400' : 'bg-emerald-400';

                return (
                  <div
                    key={item.id}
                    className={`group relative rounded-2xl border bg-white p-4 transition-all duration-300 hover:shadow-lg hover:shadow-slate-100/50 ${
                      isDone ? 'border-emerald-200 bg-emerald-50/20' : 'border-slate-100 hover:border-primary/20'
                    }`}
                  >
                    {/* Success flash overlay */}
                    {isDone && (
                      <div className="absolute inset-0 bg-emerald-500/5 rounded-2xl pointer-events-none animate-fade-in" />
                    )}

                    {/* Top: Product Info Row */}
                    <div className="flex items-center space-x-3.5 mb-3.5">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-black text-[13px] text-slate-800 truncate group-hover:text-primary transition-colors">
                          {item.product.name}
                        </h4>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className="rounded-lg bg-slate-100 text-slate-500 text-[8px] font-black tracking-wider px-1.5 py-0.5 uppercase">
                            {item.product.category}
                          </span>
                          <span className={`rounded-lg px-2 py-0.5 text-[8px] font-black uppercase tracking-widest border ${badge.bg}`}>
                            {badge.label}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Stock Level Visual Bar */}
                    <div className="mb-3.5">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Stock Level</span>
                        <span className="font-mono text-xs font-black text-slate-700">{qtyVal} <span className="text-[9px] font-semibold text-slate-400">units</span></span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                          style={{ width: `${fillPercent}%` }}
                        />
                      </div>
                    </div>

                    {/* Bottom: Controls Row */}
                    <div className="flex items-center justify-between pt-3 border-t border-slate-50">
                      {/* Quantity Stepper */}
                      <div className="flex items-center space-x-1.5 bg-slate-50/80 p-1 rounded-xl border border-slate-100">
                        <button
                          onClick={() => handleDecrement(item.product_id)}
                          className="flex h-7 w-7 items-center justify-center rounded-lg bg-white hover:bg-primary hover:text-white transition-all active:scale-90 shadow-sm cursor-pointer text-slate-500 border border-slate-100"
                        >
                          <Minus className="h-3 w-3 stroke-[2.5px]" />
                        </button>
                        <input
                          type="number"
                          value={qtyVal}
                          onChange={(e) => handleQtyChange(item.product_id, e.target.value)}
                          className="w-14 text-center rounded-lg border border-slate-200 bg-white py-1 font-mono text-xs font-black text-slate-800 focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none"
                        />
                        <button
                          onClick={() => handleIncrement(item.product_id)}
                          className="flex h-7 w-7 items-center justify-center rounded-lg bg-white hover:bg-primary hover:text-white transition-all active:scale-90 shadow-sm cursor-pointer text-slate-500 border border-slate-100"
                        >
                          <Plus className="h-3 w-3 stroke-[2.5px]" />
                        </button>
                        <button
                          onClick={() => handleSaveStock(item.product_id, qtyVal)}
                          disabled={isPending || item.quantity === qtyVal}
                          className={`rounded-lg p-1.5 transition-all active:scale-95 cursor-pointer shadow-sm ${
                            isDone
                              ? 'bg-success text-white'
                              : 'bg-white border border-slate-200 text-primary hover:bg-primary hover:text-white hover:border-transparent'
                          } disabled:opacity-30 disabled:cursor-not-allowed`}
                        >
                          {isDone ? <CheckCircle className="h-4 w-4" /> : <Save className="h-4 w-4 stroke-[2.5px]" />}
                        </button>
                      </div>

                      {/* Toggle Button */}
                      <button
                        onClick={() => handleToggleStatus(item.product_id, item.status, item.quantity)}
                        className={`rounded-xl px-3.5 py-2 text-[9px] font-black uppercase tracking-widest transition-all active:scale-[0.96] cursor-pointer shadow-sm ${
                          item.status === 'out_of_stock'
                            ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-emerald-500/15 hover:shadow-emerald-500/25'
                            : 'bg-white border border-red-100 text-red-500 hover:bg-red-50 hover:border-red-200 hover:text-red-600'
                        }`}
                      >
                        {item.status === 'out_of_stock' ? '✓ Restock' : '✕ Mark Empty'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {filteredItems.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50 mb-4 border border-slate-100">
                  <Package className="h-8 w-8 text-slate-200" />
                </div>
                <p className="text-sm font-black text-slate-400">No products match your filter</p>
                <p className="text-[10px] text-slate-400 mt-1">Try adjusting the search or status filter above.</p>
              </div>
            )}
          </div>

          {/* ── MOBILE CARD VIEW ── */}
          <div className="md:hidden space-y-3">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center space-x-2">
                <Sparkles className="h-4 w-4 text-primary animate-pulse" />
                <h3 className="font-display text-sm font-black text-slate-800">Stock Items</h3>
              </div>
              <span className="text-[9px] font-bold text-slate-400 bg-white px-2 py-0.5 rounded-lg border border-slate-100">
                {filteredItems.length} items
              </span>
            </div>

            {filteredItems.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-center bg-white rounded-2xl border border-slate-100">
                <Package className="h-10 w-10 text-slate-200 mb-3" />
                <p className="text-sm font-bold text-slate-400">No products found</p>
              </div>
            )}

            {filteredItems.map((item) => {
              const qtyVal = quantities[item.product_id] ?? item.quantity;
              const isPending = isUpdating === item.product_id;
              const isDone = isSuccess === item.product_id;
              const badge = getStatusBadge(item.status);

              return (
                <div
                  key={item.id}
                  className="rounded-2xl bg-white border border-slate-100 p-4 shadow-sm hover:shadow-md transition-all space-y-3"
                >
                  {/* Top row: Name + Status */}
                  <div className="flex items-start space-x-3">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-black text-sm text-slate-800 truncate">{item.product.name}</h4>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="rounded-lg bg-primary/10 text-primary text-[8px] font-black tracking-wider px-1.5 py-0.5 uppercase">
                          {item.product.category}
                        </span>
                        <span className={`rounded-lg px-2 py-0.5 text-[8px] font-black uppercase tracking-widest border ${badge.bg}`}>
                          {badge.label}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Bottom row: Qty controls + Action */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-50">
                    {/* Quantity Stepper */}
                    <div className="flex items-center space-x-2 bg-slate-50 p-1 rounded-xl border border-slate-100">
                      <button
                        onClick={() => handleDecrement(item.product_id)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg bg-white hover:bg-primary hover:text-white transition-all active:scale-90 shadow-sm cursor-pointer text-slate-600 border border-slate-100"
                      >
                        <Minus className="h-3.5 w-3.5 stroke-[2.5px]" />
                      </button>
                      <input
                        type="number"
                        value={qtyVal}
                        onChange={(e) => handleQtyChange(item.product_id, e.target.value)}
                        className="w-14 text-center rounded-lg border border-slate-200 bg-white py-1.5 font-mono text-sm font-black text-slate-800 focus:border-primary outline-none"
                      />
                      <button
                        onClick={() => handleIncrement(item.product_id)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg bg-white hover:bg-primary hover:text-white transition-all active:scale-90 shadow-sm cursor-pointer text-slate-600 border border-slate-100"
                      >
                        <Plus className="h-3.5 w-3.5 stroke-[2.5px]" />
                      </button>
                      <button
                        onClick={() => handleSaveStock(item.product_id, qtyVal)}
                        disabled={isPending || item.quantity === qtyVal}
                        className={`rounded-lg p-2 transition-all active:scale-95 cursor-pointer shadow-sm ml-1 ${
                          isDone
                            ? 'bg-success text-white'
                            : 'bg-white border border-slate-200 text-primary hover:bg-primary hover:text-white'
                        } disabled:opacity-40 disabled:cursor-not-allowed`}
                      >
                        {isDone ? <CheckCircle className="h-4 w-4" /> : <Save className="h-4 w-4 stroke-[2.5px]" />}
                      </button>
                    </div>

                    {/* Toggle Button */}
                    <button
                      onClick={() => handleToggleStatus(item.product_id, item.status, item.quantity)}
                      className={`rounded-xl px-3 py-2 text-[9px] font-black uppercase tracking-widest transition-all active:scale-[0.96] cursor-pointer shadow-sm ${
                        item.status === 'out_of_stock'
                          ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white'
                          : 'bg-white border border-red-100 text-red-600 hover:bg-red-50'
                      }`}
                    >
                      {item.status === 'out_of_stock' ? 'Restock' : 'Empty'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT COLUMN: STOCK AUDIT LOG HISTORY */}
        <div className="rounded-3xl bg-white border border-slate-100 p-4 sm:p-6 shadow-sm flex flex-col max-h-[450px] sm:max-h-[550px] overflow-hidden">

          <div className="flex items-center space-x-2.5 mb-5">
            <History className="h-5 w-5 text-primary" />
            <h3 className="font-display text-sm font-black text-text-primary">
              Audit Log
            </h3>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-1 scrollbar-thin">
            {logs.length === 0 ? (
              <div className="flex h-48 flex-col items-center justify-center text-center p-4">
                <Clock className="h-8 w-8 text-gray-200 mb-2" />
                <span className="text-xs font-semibold text-text-muted">No stock history yet.</span>
                <span className="text-[10px] text-text-muted/70 mt-1">Changes are audited here.</span>
              </div>
            ) : (
              logs.map((log) => (
                <div
                  key={log.id}
                  className="rounded-2xl border border-slate-100 bg-slate-50/40 p-3 sm:p-3.5 space-y-2 hover:border-blue-100 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-black text-xs text-text-primary line-clamp-1">
                      {log.product.name}
                    </span>
                    <span className="text-[8px] font-bold text-text-muted whitespace-nowrap bg-white px-2 py-0.5 rounded border border-gray-100 shrink-0">
                      {new Date(log.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[10px] font-bold">
                    <div className="flex items-center space-x-1.5 text-text-muted">
                      <User className="h-3 w-3 text-primary" />
                      <span>{log.updated_by}</span>
                    </div>

                    <div className="font-mono text-primary flex items-center space-x-1.5">
                      <span className="line-through text-text-muted/60">
                        {log.old_quantity ?? '0'}
                      </span>
                      <span>→</span>
                      <span className="font-black">
                        {log.new_quantity}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-dashed border-gray-200/60">
                    <span className="text-[9px] font-black text-text-muted uppercase">Status</span>
                    <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-md uppercase ${
                      log.new_status === 'in_stock'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {log.new_status.replace('_', ' ')}
                    </span>
                  </div>

                </div>
              ))
            )}
          </div>

        </div>

      </div>

    </div>
  );
}
