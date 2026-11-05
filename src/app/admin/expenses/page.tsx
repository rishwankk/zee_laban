'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { api, Store, Bill, ShopExpense } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import {
  Receipt,
  Plus,
  Calendar,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Coins,
  Wallet,
  Trash2,
  Edit2,
  X,
  CreditCard,
  Smartphone,
  Banknote,
  Search,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Store as StoreIcon,
  Building,
  FileDown,
  Percent,
  MapPin
} from 'lucide-react';

export const EXPENSE_CATEGORIES = [
  'Milk & Dairy',
  'Ice Supply',
  'Packaging & Disposables',
  'Cleaning & Sanitation',
  'Electricity & Utilities',
  'Equipment & Maintenance',
  'Tea & Refreshments',
  'Transportation & Fuel',
  'Miscellaneous'
];

export default function AdminExpensesPage() {
  const { user } = useAuthStore();

  // Helper date strings
  const getTodayStr = () => new Date().toISOString().substring(0, 10);
  const getYesterdayStr = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().substring(0, 10);
  };
  const getPast7DaysStr = () => {
    const d = new Date();
    d.setDate(d.getDate() - 6);
    return d.toISOString().substring(0, 10);
  };
  const getMonthStartStr = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
  };

  // State: Data
  const [stores, setStores] = useState<Store[]>([]);
  const [allExpenses, setAllExpenses] = useState<ShopExpense[]>([]);
  const [allBills, setAllBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // State: Outlet Filtering
  // 'all' or specific store ID
  const [selectedStoreId, setSelectedStoreId] = useState<string>('all');
  const [comparisonViewMode, setComparisonViewMode] = useState<'cards' | 'table'>('cards');

  // State: Date Filtering
  const [datePreset, setDatePreset] = useState<'today' | 'yesterday' | 'week' | 'month' | 'custom'>('today');
  const [singleDate, setSingleDate] = useState<string>(getTodayStr());
  const [customStartDate, setCustomStartDate] = useState<string>(getMonthStartStr());
  const [customEndDate, setCustomEndDate] = useState<string>(getTodayStr());

  // State: Search & Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('all');

  // State: Add Expense Modal
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [addStoreId, setAddStoreId] = useState<string>('');
  const [addTitle, setAddTitle] = useState<string>('');
  const [addAmount, setAddAmount] = useState<string>('');
  const [addCategory, setAddCategory] = useState<string>('Milk & Dairy');
  const [addDate, setAddDate] = useState<string>(getTodayStr());
  const [addPaymentMethod, setAddPaymentMethod] = useState<'Cash' | 'UPI' | 'Card' | 'Other'>('Cash');
  const [addNotes, setAddNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // State: Edit Expense Modal
  const [editingExpense, setEditingExpense] = useState<ShopExpense | null>(null);
  const [editStoreId, setEditStoreId] = useState<string>('');
  const [editTitle, setEditTitle] = useState<string>('');
  const [editAmount, setEditAmount] = useState<string>('');
  const [editCategory, setEditCategory] = useState<string>('Milk & Dairy');
  const [editDate, setEditDate] = useState<string>(getTodayStr());
  const [editPaymentMethod, setEditPaymentMethod] = useState<'Cash' | 'UPI' | 'Card' | 'Other'>('Cash');
  const [editNotes, setEditNotes] = useState<string>('');
  const [isUpdating, setIsUpdating] = useState<boolean>(false);

  // State: Deletion
  const [deletingExpense, setDeletingExpense] = useState<ShopExpense | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Reload stores, expenses, and bills
  const reloadData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const storeList = await api.getStores();
      setStores(storeList);
      if (storeList.length > 0) {
        setAddStoreId(prev => prev || storeList[0].id);
      }

      const billsAccumulator: Bill[] = [];
      for (const st of storeList) {
        const storeBills = await api.getBillsByStore(st.id);
        billsAccumulator.push(...storeBills);
      }
      setAllBills(billsAccumulator);

      const expenseList = await api.getAllExpenses();
      setAllExpenses(expenseList);
    } catch (err) {
      console.error('Failed to reload admin expenses data:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    let ignore = false;
    const fetchInitial = async () => {
      try {
        const storeList = await api.getStores();
        if (ignore) return;
        setStores(storeList);
        if (storeList.length > 0) {
          setAddStoreId(prev => prev || storeList[0].id);
        }

        const billsAccumulator: Bill[] = [];
        for (const st of storeList) {
          const storeBills = await api.getBillsByStore(st.id);
          billsAccumulator.push(...storeBills);
        }
        if (ignore) return;
        setAllBills(billsAccumulator);

        const expenseList = await api.getAllExpenses();
        if (ignore) return;
        setAllExpenses(expenseList);
      } catch (err) {
        console.error('Failed to load admin expenses data:', err);
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    fetchInitial();

    return () => {
      ignore = true;
    };
  }, []);

  // Listen for real-time synchronization events
  useEffect(() => {
    const handleSync = () => reloadData(true);
    window.addEventListener('zee_expenses_updated', handleSync);
    return () => window.removeEventListener('zee_expenses_updated', handleSync);
  }, [reloadData]);

  // Compute effective date bounds [startDate, endDate] (inclusive strings YYYY-MM-DD)
  const dateRange = useMemo<{ start: string; end: string }>(() => {
    if (datePreset === 'today') {
      return { start: singleDate, end: singleDate };
    }
    if (datePreset === 'yesterday') {
      const yest = getYesterdayStr();
      return { start: yest, end: yest };
    }
    if (datePreset === 'week') {
      return { start: getPast7DaysStr(), end: getTodayStr() };
    }
    if (datePreset === 'month') {
      return { start: getMonthStartStr(), end: getTodayStr() };
    }
    return {
      start: customStartDate || getTodayStr(),
      end: customEndDate || getTodayStr()
    };
  }, [datePreset, singleDate, customStartDate, customEndDate]);

  // Single date stepper for 'today' preset navigation
  const stepDate = (days: number) => {
    try {
      const parts = singleDate.split('-');
      const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      d.setDate(d.getDate() + days);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      setSingleDate(`${year}-${month}-${day}`);
    } catch {}
  };

  const formatDateDisplay = (dateStr: string) => {
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        return d.toLocaleDateString(undefined, {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        });
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  // Helper map for store info lookup by ID
  const storeMap = useMemo(() => {
    const map = new Map<string, Store>();
    stores.forEach(s => map.set(s.id, s));
    return map;
  }, [stores]);

  // Filtered bills by date range and selected store
  const filteredBills = useMemo(() => {
    return allBills.filter(b => {
      // Store filter
      if (selectedStoreId !== 'all' && b.store_id !== selectedStoreId) {
        return false;
      }
      // Date filter
      const bDate = b.created_at ? b.created_at.substring(0, 10) : '';
      if (!bDate) return false;
      return bDate >= dateRange.start && bDate <= dateRange.end;
    });
  }, [allBills, selectedStoreId, dateRange]);

  // Total Revenue for current filter
  const totalRevenue = useMemo(() => {
    return filteredBills.reduce((sum, b) => sum + (Number(b.total) || 0), 0);
  }, [filteredBills]);

  // Revenue breakdown by payment method
  const revenueBreakdown = useMemo(() => {
    const cash = filteredBills.filter(b => b.payment_method === 'Cash').reduce((s, b) => s + (Number(b.total) || 0), 0);
    const upi = filteredBills.filter(b => b.payment_method === 'UPI').reduce((s, b) => s + (Number(b.total) || 0), 0);
    const card = filteredBills.filter(b => b.payment_method === 'Card').reduce((s, b) => s + (Number(b.total) || 0), 0);
    return { cash, upi, card, count: filteredBills.length };
  }, [filteredBills]);

  // Filtered expenses by date range and selected store
  const dateAndStoreFilteredExpenses = useMemo(() => {
    return allExpenses.filter(e => {
      // Store filter
      if (selectedStoreId !== 'all' && e.store_id !== selectedStoreId) {
        return false;
      }
      // Date filter
      const eDate = e.date || (e.created_at ? e.created_at.substring(0, 10) : '');
      if (!eDate) return false;
      return eDate >= dateRange.start && eDate <= dateRange.end;
    });
  }, [allExpenses, selectedStoreId, dateRange]);

  // Final expenses displayed after search, category, and payment method filters
  const displayedExpenses = useMemo(() => {
    return dateAndStoreFilteredExpenses.filter(e => {
      // Category filter
      if (selectedCategory !== 'all' && e.category !== selectedCategory) {
        return false;
      }
      // Payment method filter
      if (selectedPaymentMethod !== 'all' && e.payment_method !== selectedPaymentMethod) {
        return false;
      }
      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const storeName = storeMap.get(e.store_id)?.name.toLowerCase() || '';
        const title = (e.title || '').toLowerCase();
        const category = (e.category || '').toLowerCase();
        const notes = (e.notes || '').toLowerCase();
        const createdBy = (e.created_by || '').toLowerCase();

        if (
          !title.includes(q) &&
          !notes.includes(q) &&
          !category.includes(q) &&
          !storeName.includes(q) &&
          !createdBy.includes(q)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [dateAndStoreFilteredExpenses, selectedCategory, selectedPaymentMethod, searchQuery, storeMap]);

  // Aggregate Total Expenses in current range & store
  const totalExpenseAmount = useMemo(() => {
    return dateAndStoreFilteredExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  }, [dateAndStoreFilteredExpenses]);

  // Expense breakdown by payment method
  const expensePaymentBreakdown = useMemo(() => {
    const cash = dateAndStoreFilteredExpenses.filter(e => e.payment_method === 'Cash').reduce((s, e) => s + (Number(e.amount) || 0), 0);
    const upi = dateAndStoreFilteredExpenses.filter(e => e.payment_method === 'UPI').reduce((s, e) => s + (Number(e.amount) || 0), 0);
    const card = dateAndStoreFilteredExpenses.filter(e => e.payment_method === 'Card').reduce((s, e) => s + (Number(e.amount) || 0), 0);
    const other = dateAndStoreFilteredExpenses.filter(e => e.payment_method === 'Other').reduce((s, e) => s + (Number(e.amount) || 0), 0);
    return { cash, upi, card, other, count: dateAndStoreFilteredExpenses.length };
  }, [dateAndStoreFilteredExpenses]);

  // Net Profit / Balance = Revenue - Expense
  const netBalance = totalRevenue - totalExpenseAmount;
  const expenseToRevenueRatio = totalRevenue > 0 ? (totalExpenseAmount / totalRevenue) * 100 : 0;

  // Category distribution calculation
  const categoryBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    dateAndStoreFilteredExpenses.forEach(e => {
      map[e.category] = (map[e.category] || 0) + (Number(e.amount) || 0);
    });
    return Object.entries(map)
      .map(([cat, amount]) => ({
        category: cat,
        amount,
        percent: totalExpenseAmount > 0 ? (amount / totalExpenseAmount) * 100 : 0
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [dateAndStoreFilteredExpenses, totalExpenseAmount]);

  // Outlet-wise Performance Summary (comparison of all stores for the selected timeframe)
  const storeWiseSummary = useMemo(() => {
    return stores.map(st => {
      // Store bills in range
      const sBills = allBills.filter(b => {
        if (b.store_id !== st.id) return false;
        const bDate = b.created_at ? b.created_at.substring(0, 10) : '';
        return bDate >= dateRange.start && bDate <= dateRange.end;
      });
      const rev = sBills.reduce((sum, b) => sum + (Number(b.total) || 0), 0);

      // Store expenses in range
      const sExpenses = allExpenses.filter(e => {
        if (e.store_id !== st.id) return false;
        const eDate = e.date || (e.created_at ? e.created_at.substring(0, 10) : '');
        return eDate >= dateRange.start && eDate <= dateRange.end;
      });
      const exp = sExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
      const net = rev - exp;
      const ratio = rev > 0 ? (exp / rev) * 100 : exp > 0 ? 100 : 0;

      return {
        store: st,
        revenue: rev,
        expenses: exp,
        expenseCount: sExpenses.length,
        billCount: sBills.length,
        netBalance: net,
        ratio
      };
    });
  }, [stores, allBills, allExpenses, dateRange]);

  // Handle Add Expense
  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addStoreId || !addTitle.trim() || !addAmount) {
      alert('Please select a store, title, and valid amount.');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.addExpense(addStoreId, {
        title: addTitle.trim(),
        category: addCategory,
        amount: parseFloat(addAmount) || 0,
        date: addDate,
        payment_method: addPaymentMethod,
        notes: addNotes.trim() || undefined,
        created_by: user?.name ? `${user.name} (Admin)` : 'Super Admin'
      });

      setShowAddModal(false);
      setAddTitle('');
      setAddAmount('');
      setAddNotes('');
      setAddCategory('Milk & Dairy');
      setAddPaymentMethod('Cash');
      await reloadData(true);
    } catch (err) {
      console.error('Failed to add expense:', err);
      alert('Failed to save expense. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Edit Modal
  const openEditModal = (exp: ShopExpense) => {
    setEditingExpense(exp);
    setEditStoreId(exp.store_id);
    setEditTitle(exp.title);
    setEditAmount(String(exp.amount));
    setEditCategory(exp.category);
    setEditDate(exp.date || getTodayStr());
    setEditPaymentMethod(exp.payment_method);
    setEditNotes(exp.notes || '');
  };

  // Handle Edit Expense Submit
  const handleUpdateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingExpense || !editStoreId || !editTitle.trim() || !editAmount) return;

    setIsUpdating(true);
    try {
      await api.updateExpense(editingExpense.id, editingExpense.store_id, {
        store_id: editStoreId,
        title: editTitle.trim(),
        category: editCategory,
        amount: parseFloat(editAmount) || 0,
        date: editDate,
        payment_method: editPaymentMethod,
        notes: editNotes.trim() || undefined
      });

      setEditingExpense(null);
      await reloadData(true);
    } catch (err) {
      console.error('Failed to update expense:', err);
      alert('Failed to update expense.');
    } finally {
      setIsUpdating(false);
    }
  };

  // Handle Delete Expense
  const confirmDeleteExpense = async () => {
    if (!deletingExpense) return;
    setIsDeleting(true);
    try {
      await api.deleteExpense(deletingExpense.id, deletingExpense.store_id);
      setDeletingExpense(null);
      await reloadData(true);
    } catch (err) {
      console.error('Failed to delete expense:', err);
      alert('Failed to delete expense.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (displayedExpenses.length === 0) {
      alert('No expense records available to export.');
      return;
    }

    const headers = ['Date', 'Store Name', 'Expense Title', 'Category', 'Payment Method', 'Amount (INR)', 'Recorded By', 'Notes'];
    const rows = displayedExpenses.map(e => [
      `"${e.date || ''}"`,
      `"${(storeMap.get(e.store_id)?.name || e.store_id).replace(/"/g, '""')}"`,
      `"${(e.title || '').replace(/"/g, '""')}"`,
      `"${(e.category || '').replace(/"/g, '""')}"`,
      `"${e.payment_method || ''}"`,
      e.amount,
      `"${(e.created_by || '').replace(/"/g, '""')}"`,
      `"${(e.notes || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Zee_Laban_Expenses_${selectedStoreId}_${dateRange.start}_to_${dateRange.end}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const activeStoreObj = selectedStoreId !== 'all' ? storeMap.get(selectedStoreId) : null;

  return (
    <div className="space-y-6 sm:space-y-8 select-none animate-fade-in pb-16 max-w-7xl mx-auto">
      {/* ─── HEADER & ACTIONS BAR ─── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-white shadow-lg shadow-primary/25">
              <Receipt className="h-6 w-6 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="font-display text-2xl sm:text-3xl font-black text-text-primary tracking-tight">
                  Shop Expenses
                </h1>
                <span className="rounded-full bg-primary/10 text-primary text-[10px] font-bold px-2.5 py-0.5 uppercase tracking-wider">
                  Admin Master
                </span>
              </div>
              <p className="text-xs sm:text-sm font-semibold text-text-muted mt-0.5">
                Multi-outlet expense ledger, shop-wise comparison, and cash outflow control across all branches.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full lg:w-auto">
          <button
            onClick={() => reloadData(false)}
            className="flex-1 sm:flex-initial flex items-center justify-center space-x-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-3.5 py-2.5 text-xs font-bold text-slate-700 transition-all active:scale-95 shadow-sm cursor-pointer whitespace-nowrap"
            title="Refresh Ledger"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-primary' : 'text-slate-400'}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="flex-1 sm:flex-initial flex items-center justify-center space-x-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-3.5 py-2.5 text-xs font-bold text-slate-700 shadow-sm transition-all active:scale-95 cursor-pointer whitespace-nowrap"
          >
            <FileDown className="h-4 w-4 text-emerald-600" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={() => {
              if (selectedStoreId !== 'all') {
                setAddStoreId(selectedStoreId);
              } else if (stores.length > 0) {
                setAddStoreId(stores[0].id);
              }
              setAddDate(singleDate || getTodayStr());
              setShowAddModal(true);
            }}
            className="w-full sm:w-auto flex items-center justify-center space-x-2 rounded-xl bg-primary hover:bg-primary-dark px-4 sm:px-5 py-2.5 text-xs font-black uppercase tracking-wider text-white shadow-lg shadow-primary/20 transition-all active:scale-95 cursor-pointer whitespace-nowrap"
          >
            <Plus className="h-4 w-4 stroke-[3px]" />
            <span>Add Shop Expense</span>
          </button>
        </div>
      </div>

      {/* ─── SHOPWISE VIEW SELECTOR (OUTLETS PILLS) ─── */}
      <div className="rounded-3xl bg-white border border-slate-100 p-4 sm:p-5 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
          <div className="flex items-center space-x-2">
            <Building className="h-4 w-4 text-primary shrink-0" />
            <span className="text-xs font-black uppercase tracking-wider text-text-primary">
              Shopwise View Selector
            </span>
          </div>
          <span className="text-[11px] font-bold text-text-muted truncate">
            {selectedStoreId === 'all'
              ? `Showing Consolidated View (${stores.length} Outlets)`
              : `Filtered to: ${activeStoreObj?.name || 'Selected Outlet'}`}
          </span>
        </div>

        {/* Scrollable Store Buttons */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none w-full">
          {/* All Outlets Pill */}
          <button
            onClick={() => setSelectedStoreId('all')}
            className={`flex items-center space-x-2.5 px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer shrink-0 ${
              selectedStoreId === 'all'
                ? 'bg-primary text-white shadow-md shadow-primary/25 border border-primary'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/80'
            }`}
          >
            <StoreIcon className="h-4 w-4" />
            <span>All Outlets (Combined)</span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                selectedStoreId === 'all' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
              }`}
            >
              {allExpenses.length}
            </span>
          </button>

          {/* Individual Store Pills */}
          {stores.map(st => {
            const isSelected = selectedStoreId === st.id;
            // Count expenses for this store in all expenses
            const storeExpCount = allExpenses.filter(e => e.store_id === st.id).length;
            return (
              <button
                key={st.id}
                onClick={() => setSelectedStoreId(st.id)}
                className={`flex items-center space-x-2.5 px-4 py-2.5 rounded-2xl text-xs font-black tracking-wide transition-all whitespace-nowrap cursor-pointer shrink-0 ${
                  isSelected
                    ? 'bg-primary text-white shadow-md shadow-primary/25 border border-primary'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/80'
                }`}
              >
                <MapPin className={`h-3.5 w-3.5 ${isSelected ? 'text-primary-light' : 'text-slate-400'}`} />
                <span>{st.name}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {storeExpCount}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── DATE CONTROLS & TIMEFRAME PRESETS ─── */}
      <div className="rounded-3xl bg-white border border-slate-100 p-4 sm:p-5 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Preset Selector */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none w-full md:w-auto">
          {[
            { id: 'today', label: 'Today' },
            { id: 'yesterday', label: 'Yesterday' },
            { id: 'week', label: 'Past 7 Days' },
            { id: 'month', label: 'This Month' },
            { id: 'custom', label: 'Custom Range' }
          ].map(item => (
            <button
              key={item.id}
              onClick={() => setDatePreset(item.id as 'today' | 'yesterday' | 'week' | 'month' | 'custom')}
              className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                datePreset === item.id
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200/60'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Date Navigator or Custom Range Pickers */}
        {datePreset === 'today' ? (
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full md:w-auto justify-between md:justify-end">
            <div className="flex items-center space-x-1 bg-slate-50 border border-slate-200/80 rounded-2xl p-1 flex-1 sm:flex-initial justify-between">
              <button
                onClick={() => stepDate(-1)}
                className="p-2 rounded-xl hover:bg-white text-slate-600 hover:text-slate-900 transition-all cursor-pointer active:scale-90"
                title="Previous Day"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <div className="flex items-center space-x-2 px-2 sm:px-3 py-1">
                <Calendar className="h-4 w-4 text-primary shrink-0" />
                <span className="font-display text-xs sm:text-sm font-black text-slate-800 whitespace-nowrap">
                  {formatDateDisplay(singleDate)}
                </span>
              </div>

              <button
                onClick={() => stepDate(1)}
                className="p-2 rounded-xl hover:bg-white text-slate-600 hover:text-slate-900 transition-all cursor-pointer active:scale-90"
                title="Next Day"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {singleDate !== getTodayStr() && (
              <button
                onClick={() => setSingleDate(getTodayStr())}
                className="px-3 py-2 text-xs font-bold text-primary bg-primary/10 hover:bg-primary/20 rounded-xl transition-all cursor-pointer whitespace-nowrap"
              >
                Jump to Today
              </button>
            )}
          </div>
        ) : datePreset === 'custom' ? (
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full md:w-auto">
            <div className="flex-1 sm:flex-initial">
              <span className="block text-[9px] font-bold text-slate-400 uppercase">From</span>
              <input
                type="date"
                value={customStartDate}
                onChange={e => setCustomStartDate(e.target.value)}
                className="w-full sm:w-auto rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 outline-none focus:border-primary"
              />
            </div>
            <div className="flex-1 sm:flex-initial">
              <span className="block text-[9px] font-bold text-slate-400 uppercase">To</span>
              <input
                type="date"
                value={customEndDate}
                onChange={e => setCustomEndDate(e.target.value)}
                className="w-full sm:w-auto rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 outline-none focus:border-primary"
              />
            </div>
          </div>
        ) : (
          <div className="flex items-center space-x-2 text-xs font-bold text-slate-500 bg-slate-50 px-3.5 py-2 rounded-xl border border-slate-200/60 justify-center">
            <Calendar className="h-4 w-4 text-primary shrink-0" />
            <span className="whitespace-nowrap">
              {formatDateDisplay(dateRange.start)} — {formatDateDisplay(dateRange.end)}
            </span>
          </div>
        )}
      </div>

      {/* ─── METRIC CARDS ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* Total Expenses */}
        <div className="rounded-3xl bg-white border border-rose-100 p-5 sm:p-6 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 transform translate-x-3 -translate-y-3 opacity-5 pointer-events-none">
            <TrendingDown className="h-28 w-28 text-rose-500" />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-rose-600">
              Total Expenses
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
              <TrendingDown className="h-4 w-4 stroke-[2.5]" />
            </div>
          </div>
          <h3 className="font-display text-2xl sm:text-3xl font-black text-slate-900 mt-2 font-mono tracking-tight">
            ₹{totalExpenseAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </h3>
          <div className="mt-3 flex items-center gap-2 flex-wrap text-[10px] font-bold text-slate-500">
            <span className="px-2 py-0.5 rounded-md bg-slate-100">💵 Cash ₹{expensePaymentBreakdown.cash.toFixed(0)}</span>
            <span className="px-2 py-0.5 rounded-md bg-slate-100">📱 UPI ₹{expensePaymentBreakdown.upi.toFixed(0)}</span>
            {expensePaymentBreakdown.card > 0 && (
              <span className="px-2 py-0.5 rounded-md bg-slate-100">💳 Card ₹{expensePaymentBreakdown.card.toFixed(0)}</span>
            )}
          </div>
        </div>

        {/* Total Revenue */}
        <div className="rounded-3xl bg-white border border-emerald-100 p-5 sm:p-6 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 transform translate-x-3 -translate-y-3 opacity-5 pointer-events-none">
            <TrendingUp className="h-28 w-28 text-emerald-500" />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-emerald-600">
              Store Sales Revenue
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <Coins className="h-4 w-4 stroke-[2.5]" />
            </div>
          </div>
          <h3 className="font-display text-2xl sm:text-3xl font-black text-slate-900 mt-2 font-mono tracking-tight">
            ₹{totalRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </h3>
          <div className="mt-3 flex items-center gap-2 flex-wrap text-[10px] font-bold text-slate-500">
            <span className="px-2 py-0.5 rounded-md bg-slate-100">{revenueBreakdown.count} Paid Orders</span>
            <span className="px-2 py-0.5 rounded-md bg-slate-100">UPI: ₹{revenueBreakdown.upi.toFixed(0)}</span>
          </div>
        </div>

        {/* Net Cash Balance (Surplus/Deficit) */}
        <div
          className={`rounded-3xl bg-white border p-5 sm:p-6 shadow-sm relative overflow-hidden ${
            netBalance >= 0 ? 'border-blue-100' : 'border-amber-100'
          }`}
        >
          <div className="flex items-center justify-between">
            <span
              className={`text-[11px] font-black uppercase tracking-wider ${
                netBalance >= 0 ? 'text-blue-600' : 'text-amber-600'
              }`}
            >
              Net Operating Balance
            </span>
            <div
              className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                netBalance >= 0 ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600'
              }`}
            >
              <Wallet className="h-4 w-4 stroke-[2.5]" />
            </div>
          </div>
          <h3
            className={`font-display text-2xl sm:text-3xl font-black mt-2 font-mono tracking-tight ${
              netBalance >= 0 ? 'text-blue-600' : 'text-rose-600'
            }`}
          >
            ₹{netBalance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </h3>
          <div className="mt-3 flex items-center space-x-1.5 text-[10px] font-bold">
            {netBalance >= 0 ? (
              <span className="inline-flex items-center text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                <ArrowUpRight className="h-3 w-3 mr-0.5" /> Cash Surplus
              </span>
            ) : (
              <span className="inline-flex items-center text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md">
                <ArrowDownRight className="h-3 w-3 mr-0.5" /> Cash Deficit
              </span>
            )}
            <span className="text-slate-400">· Net Profit Margin</span>
          </div>
        </div>

        {/* Expense to Revenue Ratio */}
        <div className="rounded-3xl bg-white border border-slate-100 p-5 sm:p-6 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-600">
              Cost-To-Revenue Ratio
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 text-slate-700">
              <Percent className="h-4 w-4 stroke-[2.5]" />
            </div>
          </div>
          <h3 className="font-display text-2xl sm:text-3xl font-black text-slate-900 mt-2 font-mono tracking-tight">
            {expenseToRevenueRatio.toFixed(1)}%
          </h3>
          <div className="mt-3">
            <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${
                  expenseToRevenueRatio > 60
                    ? 'bg-rose-500'
                    : expenseToRevenueRatio > 35
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(expenseToRevenueRatio, 100)}%` }}
              />
            </div>
            <span className="text-[10px] font-bold text-slate-400 mt-1 block">
              {displayedExpenses.length} expense entries recorded
            </span>
          </div>
        </div>
      </div>

      {/* ─── OUTLET COMPARISON SECTION (WHEN "ALL OUTLETS" IS ACTIVE) ─── */}
      {selectedStoreId === 'all' && stores.length > 0 && (
        <div className="rounded-3xl bg-white border border-slate-100 p-5 sm:p-7 shadow-sm space-y-6">
          {/* Section Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div className="flex items-center space-x-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary shrink-0">
                <StoreIcon className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-display text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                  Outlet-Wise Expense & Margin Comparison
                </h2>
                <p className="text-xs font-semibold text-slate-500 mt-0.5">
                  Direct comparative view of each outlet&apos;s revenue, expense burden, and net operating cash flow.
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2.5 self-start sm:self-auto">
              <div className="inline-flex rounded-xl bg-slate-100 p-1 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setComparisonViewMode('cards')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    comparisonViewMode === 'cards'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  Cards View
                </button>
                <button
                  type="button"
                  onClick={() => setComparisonViewMode('table')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    comparisonViewMode === 'table'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  Table View
                </button>
              </div>
              <span className="text-xs font-black text-primary bg-primary/10 px-3 py-1.5 rounded-xl whitespace-nowrap">
                {stores.length} Outlets Tracked
              </span>
            </div>
          </div>

          {comparisonViewMode === 'cards' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {storeWiseSummary.map(item => {
                const isProfitable = item.netBalance >= 0;
                return (
                  <div
                    key={item.store.id}
                    className="rounded-3xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-sm hover:shadow-xl hover:border-primary/40 transition-all flex flex-col justify-between space-y-4 group relative overflow-hidden"
                  >
                    {/* Top Status Accent Bar */}
                    <div
                      className={`absolute top-0 inset-x-0 h-1.5 ${
                        isProfitable ? 'bg-emerald-500' : 'bg-rose-500'
                      }`}
                    />

                    {/* Store Title & Badges */}
                    <div className="flex items-start justify-between gap-3 pt-1">
                      <div className="flex items-start space-x-3 min-w-0">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 group-hover:bg-primary group-hover:text-white transition-all shadow-sm">
                          <StoreIcon className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-display font-black text-base text-slate-900 truncate">
                            {item.store.name}
                          </h3>
                          <p className="text-xs font-semibold text-slate-500 flex items-center space-x-1 mt-0.5">
                            <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                            <span className="truncate">{item.store.location || 'Branch Outlet'}</span>
                          </p>
                        </div>
                      </div>

                      {/* Profit/Deficit Pill */}
                      <span
                        className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider shrink-0 ${
                          isProfitable
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                            : 'bg-rose-50 text-rose-700 border border-rose-100'
                        }`}
                      >
                        {isProfitable ? (
                          <>
                            <ArrowUpRight className="h-3 w-3" />
                            <span>Surplus</span>
                          </>
                        ) : (
                          <>
                            <ArrowDownRight className="h-3 w-3" />
                            <span>Deficit</span>
                          </>
                        )}
                      </span>
                    </div>

                    {/* Revenue & Expenses 2-Box Grid */}
                    <div className="grid grid-cols-2 gap-3">
                      {/* Revenue Tile */}
                      <div className="rounded-2xl bg-emerald-50/50 border border-emerald-100/80 p-3 space-y-1">
                        <div className="flex items-center space-x-1 text-emerald-800">
                          <Coins className="h-3 w-3" />
                          <span className="text-[10px] font-black uppercase tracking-wider">Revenue</span>
                        </div>
                        <p className="font-mono text-base sm:text-lg font-black text-emerald-700 tracking-tight">
                          ₹{item.revenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </p>
                        <p className="text-[10px] font-bold text-emerald-600/80">
                          {item.billCount} Paid Orders
                        </p>
                      </div>

                      {/* Expenses Tile */}
                      <div className="rounded-2xl bg-rose-50/50 border border-rose-100/80 p-3 space-y-1">
                        <div className="flex items-center space-x-1 text-rose-800">
                          <TrendingDown className="h-3 w-3" />
                          <span className="text-[10px] font-black uppercase tracking-wider">Expenses</span>
                        </div>
                        <p className="font-mono text-base sm:text-lg font-black text-rose-600 tracking-tight">
                          ₹{item.expenses.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </p>
                        <p className="text-[10px] font-bold text-rose-600/80">
                          {item.expenseCount} Recorded
                        </p>
                      </div>
                    </div>

                    {/* Net Margin Box with Progress Bar */}
                    <div className="rounded-2xl bg-slate-50 border border-slate-100 p-3.5 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                          Net Operating Margin
                        </span>
                        <span
                          className={`font-mono text-base font-black ${
                            isProfitable ? 'text-emerald-700' : 'text-rose-600'
                          }`}
                        >
                          {isProfitable ? '+' : '-'}₹
                          {Math.abs(item.netBalance).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </span>
                      </div>

                      {/* Cost vs Revenue Progress Bar */}
                      <div className="space-y-1">
                        <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                          <div
                            className={`h-full transition-all duration-500 rounded-full ${
                              item.ratio > 50
                                ? 'bg-rose-500'
                                : item.ratio > 25
                                ? 'bg-amber-500'
                                : 'bg-emerald-500'
                            }`}
                            style={{ width: `${Math.min(item.ratio, 100)}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-[10px] font-bold text-slate-500">
                          <span>
                            {item.revenue > 0
                              ? `Cost burden: ${item.ratio.toFixed(0)}%`
                              : item.expenses > 0
                              ? 'Deficit (Zero sales)'
                              : 'No activity'}
                          </span>
                          <span className="font-mono text-slate-400">
                            {item.revenue > 0 ? `${((item.netBalance / item.revenue) * 100).toFixed(0)}% profit margin` : ''}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Action Button */}
                    <button
                      type="button"
                      onClick={() => setSelectedStoreId(item.store.id)}
                      className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-primary text-white text-xs font-black uppercase tracking-wider flex items-center justify-center space-x-2 transition-all active:scale-[0.98] cursor-pointer shadow-sm"
                    >
                      <span>View Outlet Expenses</span>
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Table View */
            <div className="overflow-x-auto rounded-2xl border border-slate-100">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className="bg-slate-50/80 border-b border-slate-100 text-[10px] font-black uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="py-3 px-4">Store Outlet</th>
                    <th className="py-3 px-4">Location</th>
                    <th className="py-3 px-4 text-center">Orders</th>
                    <th className="py-3 px-4 text-right">Revenue</th>
                    <th className="py-3 px-4 text-center">Expenses Count</th>
                    <th className="py-3 px-4 text-right">Total Expenses</th>
                    <th className="py-3 px-4 text-right">Net Margin</th>
                    <th className="py-3 px-4 text-center">Cost Ratio</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                  {storeWiseSummary.map(item => {
                    const isProfitable = item.netBalance >= 0;
                    return (
                      <tr key={item.store.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-slate-900 flex items-center space-x-2">
                          <StoreIcon className="h-4 w-4 text-primary" />
                          <span>{item.store.name}</span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-500">{item.store.location || '—'}</td>
                        <td className="py-3.5 px-4 text-center font-mono">{item.billCount}</td>
                        <td className="py-3.5 px-4 text-right font-mono font-black text-emerald-600">
                          ₹{item.revenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </td>
                        <td className="py-3.5 px-4 text-center font-mono">{item.expenseCount}</td>
                        <td className="py-3.5 px-4 text-right font-mono font-black text-rose-600">
                          ₹{item.expenses.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </td>
                        <td
                          className={`py-3.5 px-4 text-right font-mono font-black ${
                            isProfitable ? 'text-emerald-700' : 'text-rose-600'
                          }`}
                        >
                          {isProfitable ? '+' : '-'}₹
                          {Math.abs(item.netBalance).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              item.ratio > 50
                                ? 'bg-rose-50 text-rose-700'
                                : item.ratio > 25
                                ? 'bg-amber-50 text-amber-700'
                                : 'bg-emerald-50 text-emerald-700'
                            }`}
                          >
                            {item.ratio.toFixed(0)}%
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => setSelectedStoreId(item.store.id)}
                            className="text-xs font-black text-primary hover:text-primary-dark bg-primary/10 hover:bg-primary/20 px-3 py-1.5 rounded-xl transition-all cursor-pointer"
                          >
                            Filter Store →
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ─── CATEGORY BREAKDOWN ─── */}
      {categoryBreakdown.length > 0 && (
        <div className="rounded-3xl bg-white border border-slate-100 p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-base font-black text-slate-900">
                Expense Category Distribution
              </h2>
              <p className="text-xs font-semibold text-slate-500">
                Breakdown of where funds are allocated across supply, utilities, and daily operations.
              </p>
            </div>
            <span className="text-xs font-bold text-slate-400 font-mono">
              {categoryBreakdown.length} Categories Active
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {categoryBreakdown.map(cat => (
              <div
                key={cat.category}
                onClick={() => setSelectedCategory(selectedCategory === cat.category ? 'all' : cat.category)}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                  selectedCategory === cat.category
                    ? 'border-primary bg-primary/5 shadow-sm'
                    : 'border-slate-100 bg-slate-50/60 hover:bg-slate-100/60'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-800">{cat.category}</span>
                  <span className="font-mono text-slate-900 font-black">
                    ₹{cat.amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-slate-200 mt-2 overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(cat.percent, 100)}%` }}
                  />
                </div>
                <div className="flex justify-between items-center mt-1 text-[10px] text-slate-400 font-bold">
                  <span>{cat.percent.toFixed(1)}% of total</span>
                  {selectedCategory === cat.category && (
                    <span className="text-primary font-black uppercase text-[9px]">Filtered</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── DETAILED EXPENSE LEDGER / DATA TABLE ─── */}
      <div className="rounded-3xl bg-white border border-slate-100 shadow-sm overflow-hidden">
        {/* Table Filter Controls Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 bg-white flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search expenses by title, notes, or staff..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 pl-10 pr-4 py-2.5 text-xs font-semibold text-slate-800 outline-none focus:border-primary focus:bg-white transition-all"
            />
          </div>

          {/* Filter Dropdowns */}
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {/* Store Dropdown (if viewing all or switching) */}
            <select
              value={selectedStoreId}
              onChange={e => setSelectedStoreId(e.target.value)}
              className="flex-1 sm:flex-initial rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:border-primary cursor-pointer"
            >
              <option value="all">🏢 All Outlets</option>
              {stores.map(s => (
                <option key={s.id} value={s.id}>
                  📍 {s.name}
                </option>
              ))}
            </select>

            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              className="flex-1 sm:flex-initial rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:border-primary cursor-pointer"
            >
              <option value="all">📁 All Categories</option>
              {EXPENSE_CATEGORIES.map(c => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            {/* Payment Method Filter */}
            <select
              value={selectedPaymentMethod}
              onChange={e => setSelectedPaymentMethod(e.target.value)}
              className="flex-1 sm:flex-initial rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:border-primary cursor-pointer"
            >
              <option value="all">💳 All Payments</option>
              <option value="Cash">💵 Cash Only</option>
              <option value="UPI">📱 UPI Only</option>
              <option value="Card">💳 Card Only</option>
              <option value="Other">🪙 Other</option>
            </select>

            {(selectedCategory !== 'all' || selectedPaymentMethod !== 'all' || searchQuery.trim() !== '') && (
              <button
                onClick={() => {
                  setSelectedCategory('all');
                  setSelectedPaymentMethod('all');
                  setSearchQuery('');
                }}
                className="w-full sm:w-auto text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-3 py-2 rounded-xl transition-all cursor-pointer text-center"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Ledger Table */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <RefreshCw className="h-8 w-8 text-primary animate-spin" />
            <p className="text-xs font-bold text-slate-400 mt-3">Loading Expenses Ledger...</p>
          </div>
        ) : displayedExpenses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-slate-100 text-slate-400">
              <Receipt className="h-7 w-7" />
            </div>
            <h3 className="font-display font-black text-slate-800 text-base mt-4">
              No Expense Records Found
            </h3>
            <p className="text-xs font-semibold text-slate-500 max-w-sm mt-1">
              There are no expenses matching the selected outlet, date range, or search criteria.
            </p>
            <button
              onClick={() => {
                if (selectedStoreId !== 'all') {
                  setAddStoreId(selectedStoreId);
                } else if (stores.length > 0) {
                  setAddStoreId(stores[0].id);
                }
                setShowAddModal(true);
              }}
              className="mt-4 flex items-center space-x-2 rounded-xl bg-primary hover:bg-primary-dark px-4 py-2.5 text-xs font-bold text-white shadow-md transition-all active:scale-95 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Record First Expense</span>
            </button>
          </div>
        ) : (
          <>
            {/* Mobile Card List (< md screens) */}
            <div className="md:hidden divide-y divide-slate-100">
              {displayedExpenses.map(exp => {
                const s = storeMap.get(exp.store_id);
                return (
                  <div key={exp.id} className="p-4 space-y-2.5 hover:bg-slate-50/70 transition-colors">
                    {/* Top Row: Store Badge + Category + Amount */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-lg bg-slate-100 text-slate-800 font-bold text-[10px]">
                          <StoreIcon className="h-3 w-3 text-primary shrink-0" />
                          <span className="truncate max-w-[120px]">{s?.name || exp.store_id}</span>
                        </span>
                        <span className="px-2 py-0.5 rounded-lg bg-primary/10 text-primary font-bold text-[10px] uppercase tracking-wide">
                          {exp.category}
                        </span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-mono font-black text-slate-900 text-sm">
                          ₹{Number(exp.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>

                    {/* Middle: Title & Notes */}
                    <div>
                      <p className="font-bold text-slate-900 text-xs">{exp.title}</p>
                      {exp.notes && (
                        <p className="text-[11px] font-normal text-slate-500 mt-0.5">{exp.notes}</p>
                      )}
                    </div>

                    {/* Bottom Row: Date, Payment, User, and Actions */}
                    <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[10px] text-slate-500 font-bold">
                      <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                        <span className="font-mono text-slate-600">
                          {exp.date || (exp.created_at ? exp.created_at.substring(0, 10) : '—')}
                        </span>
                        <span
                          className={`inline-flex items-center space-x-0.5 px-2 py-0.5 rounded-md text-[9px] font-bold ${
                            exp.payment_method === 'Cash'
                              ? 'bg-amber-50 text-amber-700'
                              : exp.payment_method === 'UPI'
                              ? 'bg-blue-50 text-blue-700'
                              : exp.payment_method === 'Card'
                              ? 'bg-purple-50 text-purple-700'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {exp.payment_method}
                        </span>
                        {exp.created_by && (
                          <span className="text-slate-400">by {exp.created_by}</span>
                        )}
                      </div>

                      <div className="flex items-center space-x-1 shrink-0 ml-2">
                        <button
                          onClick={() => openEditModal(exp)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-primary hover:bg-primary/10 transition-all cursor-pointer"
                          title="Edit"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setDeletingExpense(exp)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all cursor-pointer"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Table (>= md screens) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 border-b border-slate-100 text-[10px] font-black uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="py-3.5 px-4 sm:px-6">Date</th>
                    <th className="py-3.5 px-4">Store Outlet</th>
                    <th className="py-3.5 px-4">Expense Details</th>
                    <th className="py-3.5 px-4">Category</th>
                    <th className="py-3.5 px-4">Payment</th>
                    <th className="py-3.5 px-4 text-right">Amount</th>
                    <th className="py-3.5 px-4">Recorded By</th>
                    <th className="py-3.5 px-4 sm:px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                  {displayedExpenses.map(exp => {
                    const s = storeMap.get(exp.store_id);
                    return (
                      <tr key={exp.id} className="hover:bg-slate-50/70 transition-colors">
                        {/* Date */}
                        <td className="py-3.5 px-4 sm:px-6 font-mono text-slate-600 whitespace-nowrap">
                          {exp.date || (exp.created_at ? exp.created_at.substring(0, 10) : '—')}
                        </td>

                        {/* Store */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-xl bg-slate-100 text-slate-800 font-bold text-[11px]">
                            <StoreIcon className="h-3 w-3 text-primary" />
                            <span>{s?.name || exp.store_id}</span>
                          </span>
                        </td>

                        {/* Title & Notes */}
                        <td className="py-3.5 px-4 max-w-xs">
                          <p className="font-bold text-slate-900 truncate">{exp.title}</p>
                          {exp.notes && (
                            <p className="text-[11px] font-normal text-slate-400 line-clamp-1 mt-0.5">
                              {exp.notes}
                            </p>
                          )}
                        </td>

                        {/* Category */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="px-2.5 py-1 rounded-lg bg-primary/10 text-primary font-bold text-[10px] uppercase tracking-wide">
                            {exp.category}
                          </span>
                        </td>

                        {/* Payment Method */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-[10px] font-bold ${
                              exp.payment_method === 'Cash'
                                ? 'bg-amber-50 text-amber-700'
                                : exp.payment_method === 'UPI'
                                ? 'bg-blue-50 text-blue-700'
                                : exp.payment_method === 'Card'
                                ? 'bg-purple-50 text-purple-700'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {exp.payment_method === 'Cash' && <Banknote className="h-3 w-3" />}
                            {exp.payment_method === 'UPI' && <Smartphone className="h-3 w-3" />}
                            {exp.payment_method === 'Card' && <CreditCard className="h-3 w-3" />}
                            <span>{exp.payment_method}</span>
                          </span>
                        </td>

                        {/* Amount */}
                        <td className="py-3.5 px-4 text-right font-mono font-black text-slate-900 text-sm whitespace-nowrap">
                          ₹{Number(exp.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>

                        {/* Recorded By */}
                        <td className="py-3.5 px-4 whitespace-nowrap text-[11px] text-slate-500">
                          {exp.created_by || 'Admin'}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 sm:px-6 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end space-x-1.5">
                            <button
                              onClick={() => openEditModal(exp)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-primary hover:bg-primary/10 transition-all cursor-pointer"
                              title="Edit Expense"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => setDeletingExpense(exp)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all cursor-pointer"
                              title="Delete Expense"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Table Footer with Summary */}
        <div className="p-4 sm:p-5 bg-slate-50/80 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between text-xs font-bold text-slate-500 gap-2">
          <span>
            Showing {displayedExpenses.length} of {dateAndStoreFilteredExpenses.length} expense entries
          </span>
          <div className="flex items-center space-x-3 font-mono">
            <span>Filtered Outflow:</span>
            <span className="font-black text-rose-600 text-sm">
              ₹
              {displayedExpenses
                .reduce((s, e) => s + (Number(e.amount) || 0), 0)
                .toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>

      {/* ─── ADD EXPENSE MODAL (ADMIN) ─── */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg rounded-2xl sm:rounded-3xl bg-white p-5 sm:p-7 shadow-2xl space-y-4 sm:space-y-5 animate-scale-up border border-slate-100 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Receipt className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-display font-black text-base sm:text-lg text-slate-900">
                    Add Shop Expense
                  </h3>
                  <p className="text-[11px] font-semibold text-slate-500">
                    Record day-to-day outlet cash outflows directly from admin console.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddExpense} className="space-y-4">
              {/* Store Outlet Selector */}
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-600 mb-1.5">
                  Target Store Outlet *
                </label>
                <select
                  value={addStoreId}
                  onChange={e => setAddStoreId(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-primary"
                  required
                >
                  {stores.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.location || 'Store Outlet'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Title */}
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-600 mb-1.5">
                  Expense Description / Item *
                </label>
                <input
                  type="text"
                  placeholder="e.g. 50 Litres Cow Milk, Ice Blocks, Parcel Bags"
                  value={addTitle}
                  onChange={e => setAddTitle(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-primary"
                  required
                />
              </div>

              {/* Amount and Category Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-600 mb-1.5">
                    Amount (₹) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={addAmount}
                    onChange={e => setAddAmount(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-mono font-black text-slate-900 outline-none focus:border-primary"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-600 mb-1.5">
                    Category *
                  </label>
                  <select
                    value={addCategory}
                    onChange={e => setAddCategory(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-primary"
                  >
                    {EXPENSE_CATEGORIES.map(c => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Date and Payment Method Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-600 mb-1.5">
                    Date *
                  </label>
                  <input
                    type="date"
                    value={addDate}
                    onChange={e => setAddDate(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-primary"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-600 mb-1.5">
                    Payment Method
                  </label>
                  <select
                    value={addPaymentMethod}
                    onChange={e => setAddPaymentMethod(e.target.value as 'Cash' | 'UPI' | 'Card' | 'Other')}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-primary"
                  >
                    <option value="Cash">💵 Cash</option>
                    <option value="UPI">📱 UPI / QR</option>
                    <option value="Card">💳 Card</option>
                    <option value="Other">🪙 Other</option>
                  </select>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-600 mb-1.5">
                  Notes / Receipt Reference (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Vendor name, bill #, reason, etc."
                  value={addNotes}
                  onChange={e => setAddNotes(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-primary resize-none"
                />
              </div>

              <div className="flex items-center justify-end space-x-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-dark text-xs font-black uppercase tracking-wider text-white shadow-md shadow-primary/20 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                  <span>{isSubmitting ? 'Saving...' : 'Save Expense'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── EDIT EXPENSE MODAL ─── */}
      {editingExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg rounded-2xl sm:rounded-3xl bg-white p-5 sm:p-7 shadow-2xl space-y-4 sm:space-y-5 animate-scale-up border border-slate-100 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Edit2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-display font-black text-base sm:text-lg text-slate-900">
                    Edit Shop Expense
                  </h3>
                  <p className="text-[11px] font-semibold text-slate-500">
                    Modify expense record, outlet allocation, or amount.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingExpense(null)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateExpense} className="space-y-4">
              {/* Target Store Outlet */}
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-600 mb-1.5">
                  Store Outlet *
                </label>
                <select
                  value={editStoreId}
                  onChange={e => setEditStoreId(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-primary"
                  required
                >
                  {stores.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.location || 'Store Outlet'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Title */}
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-600 mb-1.5">
                  Expense Description *
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={e => setEditTitle(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-primary"
                  required
                />
              </div>

              {/* Amount and Category Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-600 mb-1.5">
                    Amount (₹) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={editAmount}
                    onChange={e => setEditAmount(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-mono font-black text-slate-900 outline-none focus:border-primary"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-600 mb-1.5">
                    Category *
                  </label>
                  <select
                    value={editCategory}
                    onChange={e => setEditCategory(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-primary"
                  >
                    {EXPENSE_CATEGORIES.map(c => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Date and Payment Method Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-600 mb-1.5">
                    Date *
                  </label>
                  <input
                    type="date"
                    value={editDate}
                    onChange={e => setEditDate(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-primary"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-600 mb-1.5">
                    Payment Method
                  </label>
                  <select
                    value={editPaymentMethod}
                    onChange={e => setEditPaymentMethod(e.target.value as 'Cash' | 'UPI' | 'Card' | 'Other')}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-primary"
                  >
                    <option value="Cash">💵 Cash</option>
                    <option value="UPI">📱 UPI / QR</option>
                    <option value="Card">💳 Card</option>
                    <option value="Other">🪙 Other</option>
                  </select>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-600 mb-1.5">
                  Notes / Receipt Reference (Optional)
                </label>
                <textarea
                  rows={2}
                  value={editNotes}
                  onChange={e => setEditNotes(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-primary resize-none"
                />
              </div>

              <div className="flex items-center justify-end space-x-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingExpense(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-dark text-xs font-black uppercase tracking-wider text-white shadow-md shadow-primary/20 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  {isUpdating && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                  <span>{isUpdating ? 'Updating...' : 'Save Changes'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── DELETE EXPENSE CONFIRMATION MODAL ─── */}
      {deletingExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl space-y-4 animate-scale-up border border-slate-100 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
              <Trash2 className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-display font-black text-base text-slate-900">Delete Expense Record</h3>
              <p className="text-xs font-semibold text-slate-500 mt-1">
                Are you sure you want to delete <span className="font-bold text-slate-800 font-mono">&ldquo;{deletingExpense.title}&rdquo;</span> (₹{deletingExpense.amount})? This cannot be undone.
              </p>
            </div>
            <div className="flex items-center justify-center space-x-2.5 pt-2">
              <button
                onClick={() => setDeletingExpense(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteExpense}
                disabled={isDeleting}
                className="flex items-center space-x-1.5 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-xs font-black text-white shadow-md shadow-rose-600/20 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
              >
                {isDeleting && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                <span>{isDeleting ? 'Deleting...' : 'Confirm Delete'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

