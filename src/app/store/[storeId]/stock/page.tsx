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
  Tag,
  Lock,
  ShieldCheck,
  X,
  AlertCircle
} from 'lucide-react';

type StatusFilter = 'all' | 'in_stock' | 'low_stock' | 'out_of_stock';

export default function StockPage() {
  const { store, user } = useAuthStore();

  // Authentication & Security Lock State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingLock, setIsCheckingLock] = useState(true);
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState('');
  const [lockTimer, setLockTimer] = useState<number>(0);

  // Change Password Modal State
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [pwChangeError, setPwChangeError] = useState('');
  const [pwChangeSuccess, setPwChangeSuccess] = useState('');

  // Stock Data States
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

      // Load lock timer
      const savedTimer = await api.getStockLockTime(store.id);
      setLockTimer(savedTimer);
    } catch (err) {
      console.error("Failed to load category stock data", err);
    } finally {
      setIsCheckingLock(false);
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

  // Auto-lock idle timer logic
  useEffect(() => {
    if (!isAuthenticated || lockTimer === 0) return;

    let timeout: NodeJS.Timeout;
    const resetTimer = () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        setIsAuthenticated(false);
      }, lockTimer * 60 * 1000);
    };

    window.addEventListener('mousemove', resetTimer);
    window.addEventListener('keypress', resetTimer);
    window.addEventListener('click', resetTimer);
    window.addEventListener('scroll', resetTimer, true);

    resetTimer();

    return () => {
      clearTimeout(timeout);
      window.removeEventListener('mousemove', resetTimer);
      window.removeEventListener('keypress', resetTimer);
      window.removeEventListener('click', resetTimer);
      window.removeEventListener('scroll', resetTimer, true);
    };
  }, [isAuthenticated, lockTimer]);

  // Handle Authentication Unlock
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!store) return;
    const savedPw = await api.getStockPassword(store.id);
    const validPw = savedPw !== null ? savedPw : '1234';
    if (passwordInput === validPw) {
      setIsAuthenticated(true);
      setPasswordInput('');
      setAuthError('');
    } else {
      setAuthError('Incorrect password');
    }
  };

  // Handle Changing Master PIN
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!store) return;
    const savedPw = await api.getStockPassword(store.id);
    const validPw = savedPw !== null ? savedPw : '1234';
    if (currentPw !== validPw) {
      setPwChangeError('Current password is incorrect');
      return;
    }
    if (newPw.length < 4) {
      setPwChangeError('New PIN must be at least 4 characters');
      return;
    }
    await api.setStockPassword(store.id, newPw);
    setPwChangeSuccess('Stock PIN changed successfully!');
    setPwChangeError('');
    setCurrentPw('');
    setNewPw('');
    setTimeout(() => {
      setShowChangePassword(false);
      setPwChangeSuccess('');
    }, 2000);
  };

  // Handle quantity changes
  const handleQtyChange = (categoryName: string, val: string) => {
    if (!isAuthenticated) return;
    const num = parseInt(val) || 0;
    setQuantities(prev => ({ ...prev, [categoryName]: Math.max(0, num) }));
  };

  // Increment / Decrement helpers
  const handleIncrement = (categoryName: string) => {
    if (!isAuthenticated) return;
    setQuantities(prev => ({ ...prev, [categoryName]: (prev[categoryName] || 0) + 1 }));
  };

  const handleDecrement = (categoryName: string) => {
    if (!isAuthenticated) return;
    setQuantities(prev => ({ ...prev, [categoryName]: Math.max(0, (prev[categoryName] || 0) - 1) }));
  };

  const toggleExpand = (categoryName: string) => {
    setExpandedCategories(prev => ({ ...prev, [categoryName]: !prev[categoryName] }));
  };

  // Save stock changes (Protected by password)
  const handleSaveStock = async (categoryName: string, qty: number, defaultStatus?: CategoryStock['status']) => {
    if (!isAuthenticated || !store || !user) return;
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
      alert('Could not update category stock.');
    } finally {
      setIsUpdating(null);
    }
  };

  // Toggle between In Stock and Out of Stock
  const handleToggleStatus = async (categoryName: string, currentStatus: CategoryStock['status'], currentQty: number) => {
    if (!isAuthenticated) return;
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

  // ─── LOADING SCREEN ───
  if (isCheckingLock) {
    return (
      <div className="flex h-full min-h-[60vh] items-center justify-center p-4">
        <div className="flex flex-col items-center space-y-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="text-sm font-semibold text-slate-400">Verifying Stock Access...</p>
        </div>
      </div>
    );
  }

  // ─── AUTHENTICATION GATE SCREEN ───
  if (!isAuthenticated) {
    return (
      <div className="flex h-full min-h-[65vh] items-center justify-center p-4 animate-fade-in">
        <div className="w-full max-w-sm rounded-3xl bg-white p-8 shadow-sm border border-slate-100 text-center animate-scale-up">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-6">
            <Lock className="h-8 w-8 stroke-[2px]" />
          </div>
          <h2 className="font-display text-2xl font-black text-slate-800 mb-2">Stock Control Access</h2>
          <p className="text-xs font-semibold text-slate-400 mb-8">
            Enter the master PIN to manage and modify store inventory stock levels.
          </p>

          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <input
                type="password"
                required
                autoFocus
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="PIN (default: 1234)"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-center font-mono text-xl font-black tracking-widest text-slate-800 outline-none focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/5 transition-all"
              />
              {authError && <p className="text-xs font-bold text-red-500 mt-2 animate-shake">{authError}</p>}
            </div>
            <button
              type="submit"
              className="w-full rounded-2xl bg-primary hover:bg-primary-dark py-4 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-primary/20 transition-all active:scale-[0.98] cursor-pointer"
            >
              Unlock Stock Control
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ─── UNLOCKED STOCK HUB ───
  return (
    <div className="space-y-6 sm:space-y-8 select-none animate-fade-in">

      {/* HEADER SECTION WITH LOCK CONTROLS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-xl sm:text-2xl font-black text-text-primary flex items-center space-x-2">
            <Layers className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            <span>Category Inventory Stock</span>
          </h2>
          <p className="text-[10px] sm:text-xs font-semibold text-text-muted mt-1">
            Protected stock control. All products in a category share the same stock pool during billing.
          </p>
        </div>

        {/* Security Controls */}
        <div className="flex items-center space-x-2">
          {/* Lock Timer Selector */}
          <div className="flex items-center space-x-1.5 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 shadow-sm">
            <Clock className="h-3.5 w-3.5 text-slate-400 ml-0.5" />
            <select
              value={lockTimer}
              onChange={async (e) => {
                const val = parseInt(e.target.value, 10);
                setLockTimer(val);
                if (store) await api.setStockLockTime(store.id, val);
              }}
              className="bg-transparent text-[10px] font-black uppercase tracking-wider text-slate-600 outline-none cursor-pointer pr-1"
            >
              <option value={0}>Never Lock</option>
              <option value={1}>Lock 1 Min</option>
              <option value={5}>Lock 5 Mins</option>
              <option value={15}>Lock 15 Mins</option>
            </select>
          </div>

          {/* Lock Immediately Button */}
          <button
            onClick={() => setIsAuthenticated(false)}
            className="flex items-center space-x-1.5 rounded-xl bg-slate-800 hover:bg-slate-900 px-3.5 py-2 text-[10px] font-black uppercase tracking-wider text-white transition-all active:scale-95 cursor-pointer shadow-sm"
          >
            <Lock className="h-3.5 w-3.5 text-slate-300" />
            <span>Lock Hub</span>
          </button>

          {/* Change PIN Button */}
          <button
            onClick={() => setShowChangePassword(true)}
            className="rounded-xl bg-white border border-slate-200 hover:bg-slate-50 p-2 text-slate-600 transition-all active:scale-95 cursor-pointer shadow-sm"
            title="Change Stock PIN"
          >
            <ShieldCheck className="h-4 w-4 text-slate-500" />
          </button>
        </div>
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

      {/* WORKSPACE & LOGS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">

        {/* LEFT COLUMN: STOCK MANAGEMENT LIST (2 Cols) */}
        <div className="lg:col-span-2 space-y-4">
          
          {/* SEARCH BAR */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search category or contained product..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-2xl border border-slate-200/80 bg-white py-3 pl-11 pr-4 text-xs font-bold text-slate-800 placeholder-slate-400 shadow-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all"
            />
          </div>

          {/* CATEGORIES CARD LIST */}
          <div className="space-y-3">
            {filteredCategories.length === 0 ? (
              <div className="rounded-3xl bg-white border border-slate-100 p-12 text-center shadow-sm">
                <Package className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                <h4 className="font-display text-sm font-black text-slate-700">No matching categories found</h4>
                <p className="text-xs text-slate-400 font-semibold mt-1">Try refining your search terms or active filters.</p>
              </div>
            ) : (
              filteredCategories.map((item) => {
                const badge = getStatusBadge(item.status);
                const isExpanded = expandedCategories[item.category];
                const currentQty = quantities[item.category] ?? item.quantity;
                const isCurrentlyUpdating = isUpdating === item.category;
                const isRecentlySuccess = isSuccess === item.category;

                return (
                  <div
                    key={item.category}
                    className="rounded-2xl sm:rounded-3xl bg-white border border-slate-100 p-4 sm:p-5 shadow-sm hover:shadow-md transition-all space-y-4"
                  >
                    {/* Top Row: Category Info & Status Toggle */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="font-display text-base font-black text-slate-800">{item.category}</h3>
                          <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border ${badge.bg}`}>
                            {badge.label}
                          </span>
                        </div>
                        <p className="text-[10px] font-bold text-slate-400 mt-0.5">
                          Controls pool of {item.product_count} linked items
                        </p>
                      </div>

                      {/* Quick Status Pill Toggle */}
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleToggleStatus(item.category, item.status, currentQty)}
                          className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer border ${
                            item.status === 'out_of_stock'
                              ? 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100'
                              : 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100'
                          }`}
                        >
                          {item.status === 'out_of_stock' ? 'Mark Available' : 'Mark Out of Stock'}
                        </button>

                        <button
                          onClick={() => toggleExpand(item.category)}
                          className="p-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-500 transition-all cursor-pointer"
                          title="View Category Items"
                        >
                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Quantity Stepper & Save Row */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-50">
                      <div className="flex items-center space-x-2 w-full sm:w-auto">
                        <button
                          onClick={() => handleDecrement(item.category)}
                          className="h-10 w-10 rounded-xl border border-slate-200 hover:bg-slate-50 flex items-center justify-center text-slate-600 active:scale-95 transition-all cursor-pointer shrink-0"
                        >
                          <Minus className="h-4 w-4" />
                        </button>

                        <div className="relative flex-1 sm:w-28">
                          <input
                            type="number"
                            min="0"
                            value={currentQty}
                            onChange={(e) => handleQtyChange(item.category, e.target.value)}
                            className="w-full text-center font-mono text-base font-black text-slate-800 rounded-xl border border-slate-200 py-2 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
                          />
                        </div>

                        <button
                          onClick={() => handleIncrement(item.category)}
                          className="h-10 w-10 rounded-xl border border-slate-200 hover:bg-slate-50 flex items-center justify-center text-slate-600 active:scale-95 transition-all cursor-pointer shrink-0"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>

                      {/* Save Button */}
                      <button
                        onClick={() => handleSaveStock(item.category, currentQty)}
                        disabled={isCurrentlyUpdating}
                        className={`w-full sm:w-auto px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center space-x-2 transition-all cursor-pointer active:scale-95 shadow-sm ${
                          isRecentlySuccess
                            ? 'bg-emerald-600 text-white'
                            : 'bg-primary hover:bg-primary-dark text-white shadow-primary/20'
                        }`}
                      >
                        {isRecentlySuccess ? (
                          <>
                            <CheckCircle className="h-4 w-4" />
                            <span>Updated!</span>
                          </>
                        ) : (
                          <>
                            <Save className="h-4 w-4" />
                            <span>{isCurrentlyUpdating ? 'Saving...' : 'Update Stock'}</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Expandable Product List */}
                    {isExpanded && item.products && (
                      <div className="pt-3 border-t border-slate-100 space-y-2">
                        <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">
                          Included Products in this Category:
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {item.products.map(prod => (
                            <div
                              key={prod.id}
                              className="rounded-xl border border-slate-100 bg-slate-50/50 p-2.5 flex items-center justify-between text-xs"
                            >
                              <span className="font-bold text-slate-700 truncate pr-2">{prod.name}</span>
                              <span className="font-mono font-black text-slate-900 shrink-0">₹{prod.price}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                  </div>
                );
              })
            )}
          </div>

        </div>

        {/* RIGHT COLUMN: RECENT STOCK LOGS (1 Col) */}
        <div className="rounded-3xl bg-white border border-slate-100 p-5 sm:p-6 shadow-sm flex flex-col max-h-[750px]">
          <div className="flex items-center space-x-2 mb-4 pb-3 border-b border-slate-100">
            <History className="h-5 w-5 text-primary" />
            <div>
              <h3 className="font-display text-sm font-black text-slate-800">Stock Update Log</h3>
              <p className="text-[10px] font-semibold text-slate-400">History of stock changes made in this outlet</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-1 scrollbar-thin">
            {logs.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-12 italic">No stock update logs recorded yet.</p>
            ) : (
              logs.map((log) => (
                <div
                  key={log.id}
                  className="rounded-2xl border border-slate-100 bg-slate-50/60 p-3.5 space-y-2 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-black text-xs text-slate-800">{log.category}</span>
                    <span className="font-mono text-[9px] font-bold text-slate-400">
                      {new Date(log.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span className="text-slate-500 font-bold">Qty Change:</span>
                    <div className="flex items-center space-x-1 font-bold text-slate-700">
                      <span>{log.old_quantity ?? '—'}</span>
                      <span>→</span>
                      <span className="font-black text-primary-dark">{log.new_quantity}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-dashed border-slate-200">
                    <span className="text-[9px] font-bold text-slate-400 uppercase">Status</span>
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase ${
                      log.new_status === 'in_stock'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                        : 'bg-red-50 text-red-700 border border-red-100'
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

      {/* ─── MODAL: CHANGE PIN ─── */}
      {showChangePassword && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl animate-scale-up border border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-sm font-black text-slate-800 uppercase tracking-wide flex items-center space-x-2">
                <ShieldCheck className="h-4.5 w-4.5 text-primary" />
                <span>Change Stock PIN</span>
              </h3>
              <button
                onClick={() => setShowChangePassword(false)}
                className="rounded-lg p-1.5 hover:bg-slate-100 text-slate-400 transition-all cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {pwChangeError && (
              <div className="rounded-xl bg-red-50 text-red-600 p-3 mb-4 text-xs font-bold border border-red-100 flex items-center space-x-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{pwChangeError}</span>
              </div>
            )}
            {pwChangeSuccess && (
              <div className="rounded-xl bg-emerald-50 text-emerald-700 p-3 mb-4 text-xs font-bold border border-emerald-100 flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 shrink-0" />
                <span>{pwChangeSuccess}</span>
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1.5">
                  Current PIN
                </label>
                <input
                  type="password"
                  required
                  value={currentPw}
                  onChange={(e) => setCurrentPw(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-xs outline-none focus:border-primary font-mono font-bold text-slate-800"
                />
              </div>
              <div>
                <label className="block text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1.5">
                  New PIN (Min 4 chars)
                </label>
                <input
                  type="password"
                  required
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-xs outline-none focus:border-primary font-mono font-bold text-slate-800"
                />
              </div>
              <button
                type="submit"
                className="w-full rounded-xl bg-primary hover:bg-primary-dark py-3.5 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-primary/20 transition-all active:scale-[0.98] mt-2 cursor-pointer"
              >
                Update PIN
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
