'use client';

import { useState, useEffect } from 'react';
import { api, Product, CategoryStock, CategoryStockLog } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import {
  Layers,
  Save,
  History,
  CheckCircle,
  AlertTriangle,
  XCircle,
  User,
  Clock,
  Sparkles,
  Search,
  Package,
  Minus,
  Plus,
  ChevronDown,
  ChevronUp,
  Tag
} from 'lucide-react';

type StatusFilter = 'all' | 'in_stock' | 'low_stock' | 'out_of_stock';

export default function StockPage() {
  const { store, user } = useAuthStore();
  const [categoriesStock, setCategoriesStock] = useState<CategoryStock[]>([]);
  const [logs, setLogs] = useState<CategoryStockLog[]>([]);

  // Local quantity inputs state
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState<string | null>(null);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  // Load category stock and logs
  const loadData = async () => {
    if (!store) return;
    try {
      const catStockData = await api.getCategoryStockByStore(store.id);
      setCategoriesStock(catStockData);

      const logData = await api.getCategoryStockLogs(store.id);
      setLogs(logData);

      // Pre-populate input values
      const initialQtys: Record<string, number> = {};
      catStockData.forEach(item => {
        initialQtys[item.category] = item.quantity;
      });
      setQuantities(initialQtys);
    } catch (err) {
      console.error("Failed to load category stock data", err);
    }
  };

  useEffect(() => {
    loadData();
  }, [store]);

  // Subscribe to realtime stock updates
  useEffect(() => {
    if (!store) return;
    const handleSync = () => {
      loadData();
    };
    window.addEventListener('lbn_realtime_category_stock', handleSync);
    window.addEventListener('lbn_realtime_stock', handleSync);
    return () => {
      window.removeEventListener('lbn_realtime_category_stock', handleSync);
      window.removeEventListener('lbn_realtime_stock', handleSync);
    };
  }, [store]);

  // Handle quantity changes
  const handleQtyChange = (categoryName: string, val: string) => {
    const num = parseInt(val) || 0;
    setQuantities(prev => ({ ...prev, [categoryName]: Math.max(0, num) }));
  };

  // Increment / Decrement helpers
  const handleIncrement = (categoryName: string) => {
    setQuantities(prev => ({ ...prev, [categoryName]: (prev[categoryName] || 0) + 1 }));
  };
  const handleDecrement = (categoryName: string) => {
    setQuantities(prev => ({ ...prev, [categoryName]: Math.max(0, (prev[categoryName] || 0) - 1) }));
  };

  const toggleExpand = (categoryName: string) => {
    setExpandedCategories(prev => ({ ...prev, [categoryName]: !prev[categoryName] }));
  };

  // Save stock changes
  const handleSaveStock = async (categoryName: string, qty: number, defaultStatus?: CategoryStock['status']) => {
    if (!store || !user) return;
    setIsUpdating(categoryName);

    try {
      let status: CategoryStock['status'] = defaultStatus || 'in_stock';
      if (!defaultStatus) {
        if (qty === 0) status = 'out_of_stock';
        else if (qty < 10) status = 'low_stock';
      }

      await api.updateCategoryStockQuantity(
        store.id,
        categoryName,
        qty,
        status,
        user.id,
        user.name
      );

      setIsSuccess(categoryName);
      setTimeout(() => setIsSuccess(null), 1500);

      await loadData();
    } catch (err) {
      console.error("Failed to update category stock", err);
    } finally {
      setIsUpdating(null);
    }
  };

  // Toggle between In Stock and Out of Stock
  const handleToggleStatus = async (categoryName: string, currentStatus: CategoryStock['status'], currentQty: number) => {
    let newStatus: CategoryStock['status'] = 'in_stock';
    let newQty = currentQty;

    if (currentStatus === 'in_stock' || currentStatus === 'low_stock') {
      newStatus = 'out_of_stock';
      newQty = 0;
    } else {
      newStatus = 'in_stock';
      newQty = Math.max(50, currentQty); // Reset to healthy default when restocked
    }

    await handleSaveStock(categoryName, newQty, newStatus);
  };

  // Metrics calculations
  const totalCategories = categoriesStock.length;
  const inStockCount = categoriesStock.filter(s => s.status === 'in_stock').length;
  const lowStockCount = categoriesStock.filter(s => s.status === 'low_stock').length;
  const outOfStockCount = categoriesStock.filter(s => s.status === 'out_of_stock').length;

  // Filtered categories
  const filteredCategories = categoriesStock.filter(item => {
    const matchesSearch = item.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (item.products && item.products.some(p => p.name.toLowerCase().includes(searchQuery.toLowerCase())));
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
          <Layers className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
          <span>Category Inventory Stock</span>
        </h2>
        <p className="text-[10px] sm:text-xs font-semibold text-text-muted mt-1">
          Update available stock category-wise. All products in a category share the same stock pool during billing.
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
            <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-primary transition-colors">Categories</span>
            <h3 className="font-display text-lg sm:text-2xl font-black text-slate-800 mt-0.5">{totalCategories}</h3>
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
          placeholder="Search by category name or product name..."
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

        {/* LEFT COLUMN: CATEGORY STOCK CONTROLLER */}
        <div className="xl:col-span-2 space-y-4">

          <div className="rounded-3xl bg-white border border-slate-100 p-5 sm:p-6 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between mb-6 px-1">
              <div className="flex items-center space-x-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary-dark text-white shadow-md shadow-primary/20">
                  <Layers className="h-4.5 w-4.5 stroke-[2.5px]" />
                </div>
                <div>
                  <h3 className="font-display text-base font-black text-slate-800">
                    Category Stock Controller
                  </h3>
                  <p className="text-[9px] font-bold text-slate-400 mt-0.5">
                    Adjust quantity once per category — automatically shared by all products in it
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-black text-primary bg-primary/5 px-3 py-1 rounded-xl border border-primary/10">
                {filteredCategories.length} categor{filteredCategories.length !== 1 ? 'ies' : 'y'}
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredCategories.map((item) => {
                const qtyVal = quantities[item.category] ?? item.quantity;
                const isPending = isUpdating === item.category;
                const isDone = isSuccess === item.category;
                const badge = getStatusBadge(item.status);
                const isExpanded = !!expandedCategories[item.category];

                const fillPercent = Math.min(100, (qtyVal / 100) * 100);
                const barColor = item.status === 'out_of_stock' ? 'bg-red-400' : item.status === 'low_stock' ? 'bg-amber-400' : 'bg-emerald-400';

                return (
                  <div
                    key={item.category}
                    className={`group relative rounded-2xl border bg-white p-4 transition-all duration-300 hover:shadow-lg hover:shadow-slate-100/50 ${
                      isDone ? 'border-emerald-200 bg-emerald-50/20' : 'border-slate-100 hover:border-primary/20'
                    }`}
                  >
                    {isDone && (
                      <div className="absolute inset-0 bg-emerald-500/5 rounded-2xl pointer-events-none animate-fade-in" />
                    )}

                    {/* Top: Category Title & Status */}
                    <div className="flex items-center space-x-3.5 mb-3.5">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h4 className="font-black text-[14px] text-slate-800 tracking-tight truncate group-hover:text-primary transition-colors">
                            {item.category}
                          </h4>
                          <span className={`rounded-lg px-2 py-0.5 text-[8px] font-black uppercase tracking-widest border ${badge.bg}`}>
                            {badge.label}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className="rounded-lg bg-blue-50 text-primary text-[9px] font-black tracking-wider px-2 py-0.5 flex items-center space-x-1">
                            <Tag className="h-3 w-3 inline" />
                            <span>{item.product_count} product{item.product_count !== 1 ? 's' : ''} under category</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Stock Level Visual Bar */}
                    <div className="mb-3.5">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Available Pool</span>
                        <span className="font-mono text-xs font-black text-slate-700">{qtyVal} <span className="text-[9px] font-semibold text-slate-400">units</span></span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                          style={{ width: `${fillPercent}%` }}
                        />
                      </div>
                    </div>

                    {/* Controls Row */}
                    <div className="flex items-center justify-between pt-3 border-t border-slate-50">
                      {/* Quantity Stepper */}
                      <div className="flex items-center space-x-1.5 bg-slate-50/80 p-1 rounded-xl border border-slate-100">
                        <button
                          onClick={() => handleDecrement(item.category)}
                          className="flex h-7 w-7 items-center justify-center rounded-lg bg-white hover:bg-primary hover:text-white transition-all active:scale-90 shadow-sm cursor-pointer text-slate-500 border border-slate-100"
                        >
                          <Minus className="h-3 w-3 stroke-[2.5px]" />
                        </button>
                        <input
                          type="number"
                          value={qtyVal}
                          onChange={(e) => handleQtyChange(item.category, e.target.value)}
                          className="w-14 text-center rounded-lg border border-slate-200 bg-white py-1 font-mono text-xs font-black text-slate-800 focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none"
                        />
                        <button
                          onClick={() => handleIncrement(item.category)}
                          className="flex h-7 w-7 items-center justify-center rounded-lg bg-white hover:bg-primary hover:text-white transition-all active:scale-90 shadow-sm cursor-pointer text-slate-500 border border-slate-100"
                        >
                          <Plus className="h-3 w-3 stroke-[2.5px]" />
                        </button>
                        <button
                          onClick={() => handleSaveStock(item.category, qtyVal)}
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

                      {/* Toggle Quick Action Button */}
                      <button
                        onClick={() => handleToggleStatus(item.category, item.status, item.quantity)}
                        className={`rounded-xl px-3.5 py-2 text-[9px] font-black uppercase tracking-widest transition-all active:scale-[0.96] cursor-pointer shadow-sm ${
                          item.status === 'out_of_stock'
                            ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-emerald-500/15 hover:shadow-emerald-500/25'
                            : 'bg-white border border-red-100 text-red-500 hover:bg-red-50 hover:border-red-200 hover:text-red-600'
                        }`}
                      >
                        {item.status === 'out_of_stock' ? '✓ Restock' : '✕ Mark Empty'}
                      </button>
                    </div>

                    {/* Expandable Included Products Accordion */}
                    {item.products && item.products.length > 0 && (
                      <div className="mt-3 pt-2.5 border-t border-slate-50/80">
                        <button
                          onClick={() => toggleExpand(item.category)}
                          className="w-full flex items-center justify-between text-[10px] font-black text-slate-500 hover:text-primary transition-colors py-1 cursor-pointer"
                        >
                          <span>{isExpanded ? 'Hide products' : `View ${item.products.length} product${item.products.length !== 1 ? 's' : ''} in this category`}</span>
                          {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                        </button>

                        {isExpanded && (
                          <div className="mt-2 space-y-1.5 max-h-36 overflow-y-auto pr-1 scrollbar-thin">
                            {item.products.map(prod => (
                              <div
                                key={prod.id}
                                className="flex items-center justify-between rounded-xl bg-slate-50/70 px-2.5 py-1.5 text-[11px]"
                              >
                                <span className="font-bold text-slate-700 truncate">{prod.name}</span>
                                <span className="font-mono font-black text-slate-500 text-[10px] shrink-0 ml-2">₹{prod.price}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {filteredCategories.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50 mb-4 border border-slate-100">
                  <Package className="h-8 w-8 text-slate-200" />
                </div>
                <p className="text-sm font-black text-slate-400">No categories match your search</p>
                <p className="text-[10px] text-slate-400 mt-1">Try adjusting the search or status filter above.</p>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: CATEGORY AUDIT LOG HISTORY */}
        <div className="rounded-3xl bg-white border border-slate-100 p-4 sm:p-6 shadow-sm flex flex-col max-h-[550px] overflow-hidden">

          <div className="flex items-center space-x-2.5 mb-5">
            <History className="h-5 w-5 text-primary" />
            <div>
              <h3 className="font-display text-sm font-black text-text-primary">
                Category Stock Logs
              </h3>
              <p className="text-[9px] font-bold text-slate-400">Audit trail of category adjustments</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-1 scrollbar-thin">
            {logs.length === 0 ? (
              <div className="flex h-48 flex-col items-center justify-center text-center p-4">
                <Clock className="h-8 w-8 text-gray-200 mb-2" />
                <span className="text-xs font-semibold text-text-muted">No category logs yet.</span>
                <span className="text-[10px] text-text-muted/70 mt-1">Updates to category quantities appear here.</span>
              </div>
            ) : (
              logs.map((log) => (
                <div
                  key={log.id}
                  className="rounded-2xl border border-slate-100 bg-slate-50/40 p-3 sm:p-3.5 space-y-2 hover:border-blue-100 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-black text-xs text-text-primary line-clamp-1">
                      {log.category}
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

