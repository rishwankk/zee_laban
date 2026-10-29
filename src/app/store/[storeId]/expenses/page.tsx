'use client';

import { useState, useEffect, useMemo } from 'react';
import { api, Bill, ShopExpense } from '@/lib/supabase';
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
  X,
  CreditCard,
  Smartphone,
  Banknote,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  ShoppingBag,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw
} from 'lucide-react';

const EXPENSE_CATEGORIES = [
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

export default function ShopExpensesPage() {
  const { store, user } = useAuthStore();

  // Selected date defaults to today in YYYY-MM-DD
  const getTodayStr = () => new Date().toISOString().substring(0, 10);
  const [selectedDate, setSelectedDate] = useState<string>(getTodayStr());

  // Active view: 'daily' or 'all_month'
  const [activeView, setActiveView] = useState<'daily' | 'month'>('daily');

  // Data states
  const [expenses, setExpenses] = useState<ShopExpense[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);

  // Add Expense Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [expTitle, setExpTitle] = useState('');
  const [expAmount, setExpAmount] = useState('');
  const [expCategory, setExpCategory] = useState('Milk & Dairy');
  const [expDate, setExpDate] = useState(getTodayStr());
  const [expPaymentMethod, setExpPaymentMethod] = useState<'Cash' | 'UPI' | 'Card' | 'Other'>('Cash');
  const [expNotes, setExpNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter / Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');

  // Deletion confirm
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Load store data
  const loadData = async (silent = false) => {
    if (!store) return;
    if (!silent) setLoading(true);
    try {
      // 1. Fetch bills to calculate revenue
      const bList = await api.getBillsByStore(store.id);
      setBills(bList);

      // 2. Fetch expenses
      const eList = await api.getExpensesByStore(store.id);
      setExpenses(eList);
    } catch (err) {
      console.error('Failed to load expenses or bills:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [store]);

  // Real-time synchronization event listener
  useEffect(() => {
    const handleSync = () => loadData(true);
    window.addEventListener('zee_expenses_updated', handleSync);
    return () => window.removeEventListener('zee_expenses_updated', handleSync);
  }, [store]);

  // Format date helper
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

  // Date step helpers
  const stepDate = (days: number) => {
    try {
      const parts = selectedDate.split('-');
      const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      d.setDate(d.getDate() + days);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      setSelectedDate(`${year}-${month}-${day}`);
    } catch {}
  };

  const isToday = selectedDate === getTodayStr();

  // Daily bills for the selected date
  const dailyBills = useMemo(() => {
    return bills.filter(b => {
      // Normalize bill date YYYY-MM-DD
      const billDateStr = b.created_at ? b.created_at.substring(0, 10) : '';
      return billDateStr === selectedDate;
    });
  }, [bills, selectedDate]);

  // Daily revenue calculation
  const dailyRevenue = useMemo(() => {
    return dailyBills.reduce((sum, b) => sum + (Number(b.total) || 0), 0);
  }, [dailyBills]);

  // Daily revenue breakdown by payment method
  const revenueBreakdown = useMemo(() => {
    const cash = dailyBills.filter(b => b.payment_method === 'Cash').reduce((s, b) => s + (Number(b.total) || 0), 0);
    const upi = dailyBills.filter(b => b.payment_method === 'UPI').reduce((s, b) => s + (Number(b.total) || 0), 0);
    const card = dailyBills.filter(b => b.payment_method === 'Card').reduce((s, b) => s + (Number(b.total) || 0), 0);
    return { cash, upi, card, count: dailyBills.length };
  }, [dailyBills]);

  // Expenses filtered for the selected date
  const dailyExpenses = useMemo(() => {
    return expenses.filter(e => e.date === selectedDate);
  }, [expenses, selectedDate]);

  // Daily total expense calculation
  const totalDailyExpense = useMemo(() => {
    return dailyExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  }, [dailyExpenses]);

  // Daily net balance (Revenue - Expense)
  const netDailyBalance = dailyRevenue - totalDailyExpense;

  // Monthly stats (current month of selectedDate)
  const currentMonthPrefix = selectedDate.substring(0, 7); // "YYYY-MM"
  const monthlyBills = useMemo(() => {
    return bills.filter(b => (b.created_at ? b.created_at.startsWith(currentMonthPrefix) : false));
  }, [bills, currentMonthPrefix]);

  const monthlyExpenses = useMemo(() => {
    return expenses.filter(e => e.date && e.date.startsWith(currentMonthPrefix));
  }, [expenses, currentMonthPrefix]);

  const monthlyRevenue = useMemo(() => {
    return monthlyBills.reduce((sum, b) => sum + (Number(b.total) || 0), 0);
  }, [monthlyBills]);

  const totalMonthlyExpense = useMemo(() => {
    return monthlyExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  }, [monthlyExpenses]);

  // Displayed expenses based on active view and filters
  const displayedExpenses = useMemo(() => {
    let list = activeView === 'daily' ? dailyExpenses : monthlyExpenses;

    if (selectedCategoryFilter !== 'all') {
      list = list.filter(e => e.category === selectedCategoryFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        e =>
          e.title.toLowerCase().includes(q) ||
          (e.notes && e.notes.toLowerCase().includes(q)) ||
          e.category.toLowerCase().includes(q)
      );
    }

    return list;
  }, [activeView, dailyExpenses, monthlyExpenses, selectedCategoryFilter, searchQuery]);

  // Expense categories breakdown for chart / list
  const categoryBreakdown = useMemo(() => {
    const targetList = activeView === 'daily' ? dailyExpenses : monthlyExpenses;
    const map: Record<string, number> = {};
    targetList.forEach(e => {
      map[e.category] = (map[e.category] || 0) + Number(e.amount || 0);
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [activeView, dailyExpenses, monthlyExpenses]);

  // Handle Add Expense
  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!store || !expTitle.trim() || !expAmount) return;

    setIsSubmitting(true);
    try {
      await api.addExpense(store.id, {
        title: expTitle.trim(),
        category: expCategory,
        amount: parseFloat(expAmount) || 0,
        date: expDate,
        payment_method: expPaymentMethod,
        notes: expNotes.trim() || undefined,
        created_by: user?.name || user?.email
      });

      setShowAddModal(false);
      setExpTitle('');
      setExpAmount('');
      setExpNotes('');
      setExpCategory('Milk & Dairy');
      setExpPaymentMethod('Cash');
      await loadData(true);
    } catch (err) {
      console.error('Failed to add expense:', err);
      alert('Failed to save expense. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Delete Expense
  const handleDeleteExpense = async (id: string) => {
    if (!store) return;
    try {
      await api.deleteExpense(id, store.id);
      setDeletingId(null);
      await loadData(true);
    } catch (err) {
      console.error('Failed to delete expense:', err);
      alert('Failed to delete expense.');
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 select-none animate-fade-in pb-12 max-w-7xl mx-auto">
      {/* ─── TOP HEADER & ACTIONS ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Receipt className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-display text-xl sm:text-2xl font-black text-text-primary tracking-tight">
                Daily Shop Expenses
              </h1>
              <p className="text-xs font-semibold text-text-muted mt-0.5">
                Monitor day-to-day store expenses, compare with daily revenue, and track profit cash flow.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
          <button
            onClick={() => loadData(false)}
            className="flex items-center space-x-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-3.5 py-2.5 text-xs font-bold text-slate-600 transition-all active:scale-95 shadow-sm cursor-pointer"
            title="Refresh Data"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-primary' : 'text-slate-400'}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            onClick={() => {
              setExpDate(selectedDate);
              setShowAddModal(true);
            }}
            className="flex items-center space-x-2 rounded-xl bg-primary hover:bg-primary-dark px-4 sm:px-5 py-2.5 text-xs font-black uppercase tracking-wider text-white shadow-lg shadow-primary/20 transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="h-4 w-4 stroke-[3px]" />
            <span>Add Expense</span>
          </button>
        </div>
      </div>

      {/* ─── DATE CONTROLS BAR ─── */}
      <div className="rounded-3xl bg-white border border-slate-100 p-4 sm:p-5 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Date Selector Navigation */}
        <div className="flex items-center space-x-2 w-full md:w-auto justify-between md:justify-start">
          <div className="flex items-center space-x-1 bg-slate-50 border border-slate-200/80 rounded-2xl p-1">
            <button
              onClick={() => stepDate(-1)}
              className="p-2 rounded-xl hover:bg-white text-slate-600 hover:text-slate-900 transition-all cursor-pointer active:scale-90"
              title="Previous Day"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <div className="relative flex items-center px-2">
              <Calendar className="h-4 w-4 text-primary mr-2 shrink-0 pointer-events-none" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  if (e.target.value) setSelectedDate(e.target.value);
                }}
                className="bg-transparent font-mono text-xs sm:text-sm font-black text-slate-800 outline-none cursor-pointer"
              />
            </div>

            <button
              onClick={() => stepDate(1)}
              disabled={isToday}
              className={`p-2 rounded-xl transition-all cursor-pointer ${
                isToday
                  ? 'opacity-40 cursor-not-allowed text-slate-400'
                  : 'hover:bg-white text-slate-600 hover:text-slate-900 active:scale-90'
              }`}
              title="Next Day"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Quick Date Pills */}
          <div className="flex items-center space-x-1.5">
            <button
              onClick={() => setSelectedDate(getTodayStr())}
              className={`px-3 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                isToday
                  ? 'bg-primary text-white shadow-md shadow-primary/20'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/60'
              }`}
            >
              Today
            </button>
            <button
              onClick={() => {
                const y = new Date();
                y.setDate(y.getDate() - 1);
                setSelectedDate(y.toISOString().substring(0, 10));
              }}
              className={`px-3 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                selectedDate ===
                new Date(Date.now() - 86400000).toISOString().substring(0, 10)
                  ? 'bg-primary text-white shadow-md shadow-primary/20'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/60'
              }`}
            >
              Yesterday
            </button>
          </div>
        </div>

        {/* View Toggle (Daily vs Month Total) */}
        <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-2xl w-full md:w-auto justify-center">
          <button
            onClick={() => setActiveView('daily')}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
              activeView === 'daily'
                ? 'bg-white text-primary shadow-sm'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Daily Sheet
          </button>
          <button
            onClick={() => setActiveView('month')}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
              activeView === 'month'
                ? 'bg-white text-primary shadow-sm'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Month Summary
          </button>
        </div>
      </div>

      {/* ─── 3 FINANCIAL COMPARISON TILES ─── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
        {/* TILE 1: DAILY REVENUE */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 to-indigo-700 p-6 text-white shadow-xl shadow-blue-500/10">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-blue-200">
              {activeView === 'daily' ? 'Daily Revenue (Sales)' : 'Month Total Revenue'}
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm text-white">
              <TrendingUp className="h-4.5 w-4.5" />
            </div>
          </div>

          <div className="mt-4 flex items-baseline space-x-2">
            <span className="font-mono text-3xl sm:text-4xl font-black tracking-tight">
              ₹{(activeView === 'daily' ? dailyRevenue : monthlyRevenue).toLocaleString('en-IN', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
              })}
            </span>
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3 text-[11px] font-bold text-blue-100">
            <span>
              {activeView === 'daily' ? `${revenueBreakdown.count} bills generated` : `${monthlyBills.length} total orders`}
            </span>
            {activeView === 'daily' && (
              <span className="font-mono text-[10px] opacity-90">
                Cash: ₹{revenueBreakdown.cash.toFixed(0)} | UPI: ₹{revenueBreakdown.upi.toFixed(0)}
              </span>
            )}
          </div>
        </div>

        {/* TILE 2: DAILY EXPENSES */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-rose-500 to-red-600 p-6 text-white shadow-xl shadow-rose-500/10">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-rose-100">
              {activeView === 'daily' ? 'Daily Expenses' : 'Month Total Expenses'}
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm text-white">
              <TrendingDown className="h-4.5 w-4.5" />
            </div>
          </div>

          <div className="mt-4 flex items-baseline space-x-2">
            <span className="font-mono text-3xl sm:text-4xl font-black tracking-tight">
              ₹{(activeView === 'daily' ? totalDailyExpense : totalMonthlyExpense).toLocaleString('en-IN', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
              })}
            </span>
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3 text-[11px] font-bold text-rose-100">
            <span>
              {activeView === 'daily'
                ? `${dailyExpenses.length} expense items`
                : `${monthlyExpenses.length} entries in ${currentMonthPrefix}`}
            </span>
            <button
              onClick={() => {
                setExpDate(selectedDate);
                setShowAddModal(true);
              }}
              className="underline text-[10px] font-black uppercase tracking-wider hover:text-white cursor-pointer"
            >
              + Quick Add
            </button>
          </div>
        </div>

        {/* TILE 3: NET DAILY PROFIT / BALANCE */}
        {(() => {
          const rev = activeView === 'daily' ? dailyRevenue : monthlyRevenue;
          const exp = activeView === 'daily' ? totalDailyExpense : totalMonthlyExpense;
          const net = rev - exp;
          const isProfitable = net >= 0;

          return (
            <div
              className={`relative overflow-hidden rounded-3xl p-6 text-white shadow-xl ${
                isProfitable
                  ? 'bg-gradient-to-br from-emerald-600 to-teal-700 shadow-emerald-500/10'
                  : 'bg-gradient-to-br from-amber-600 to-orange-700 shadow-amber-500/10'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-white/90">
                  {activeView === 'daily' ? 'Net Daily Cash Flow' : 'Month Net Margin'}
                </span>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm text-white">
                  {isProfitable ? <ArrowUpRight className="h-4.5 w-4.5" /> : <ArrowDownRight className="h-4.5 w-4.5" />}
                </div>
              </div>

              <div className="mt-4 flex items-baseline space-x-2">
                <span className="font-mono text-3xl sm:text-4xl font-black tracking-tight">
                  {isProfitable ? '+' : ''}₹{net.toLocaleString('en-IN', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })}
                </span>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3 text-[11px] font-bold text-white/90">
                <span>{isProfitable ? 'Positive Surplus' : 'Deficit (Expenses exceed revenue)'}</span>
                {rev > 0 && (
                  <span className="font-mono font-black text-[10px] bg-white/20 px-2 py-0.5 rounded-lg">
                    {((net / rev) * 100).toFixed(1)}% Margin
                  </span>
                )}
              </div>
            </div>
          );
        })()}
      </div>

      {/* ─── MAIN EXPENSE SECTION ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT (2 COLS): EXPENSES TABLE & SEARCH */}
        <div className="lg:col-span-2 rounded-3xl bg-white border border-slate-100 p-4 sm:p-6 shadow-sm flex flex-col">
          {/* Table Header and Filters */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
            <div>
              <h3 className="font-display text-base font-black text-slate-800 flex items-center space-x-2">
                <Receipt className="h-4.5 w-4.5 text-primary" />
                <span>
                  {activeView === 'daily'
                    ? `Expenses on ${formatDateDisplay(selectedDate)}`
                    : `Expenses for ${currentMonthPrefix}`}
                </span>
              </h3>
              <p className="text-[11px] font-bold text-slate-400 mt-0.5">
                Total ₹{(activeView === 'daily' ? totalDailyExpense : totalMonthlyExpense).toFixed(2)} recorded
              </p>
            </div>

            {/* Search & Category Filter */}
            <div className="flex items-center space-x-2">
              <div className="relative flex-1 sm:w-48">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search item..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-8 pr-3 py-2 text-xs font-bold text-slate-700 outline-none focus:border-primary focus:bg-white"
                />
              </div>

              <select
                value={selectedCategoryFilter}
                onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                className="rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:border-primary cursor-pointer"
              >
                <option value="all">All Categories</option>
                {EXPENSE_CATEGORIES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Expenses List */}
          {displayedExpenses.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-16 text-center border border-dashed border-slate-200 rounded-2xl bg-slate-50/30 p-6">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 mb-3">
                <Receipt className="h-7 w-7" />
              </div>
              <h4 className="font-display text-sm font-black text-slate-700">No Expenses Recorded</h4>
              <p className="text-xs font-semibold text-slate-400 mt-1 max-w-xs">
                {activeView === 'daily'
                  ? `No shop expenses logged on ${formatDateDisplay(selectedDate)}.`
                  : `No expenses logged for ${currentMonthPrefix}.`}
              </p>
              <button
                onClick={() => {
                  setExpDate(selectedDate);
                  setShowAddModal(true);
                }}
                className="mt-4 flex items-center space-x-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-black uppercase text-white shadow-md shadow-primary/20 hover:bg-primary-dark transition-all cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                <span>Add First Expense</span>
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full min-w-[600px] text-left border-collapse whitespace-nowrap">
                <thead>
                  <tr className="border-b-2 border-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    <th className="pb-3.5 pl-2">Item / Description</th>
                    <th className="pb-3.5">Category</th>
                    <th className="pb-3.5">Date</th>
                    <th className="pb-3.5 text-center">Payment</th>
                    <th className="pb-3.5 text-right">Amount</th>
                    <th className="pb-3.5 text-center pr-2">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50/80 text-xs font-semibold text-slate-700">
                  {displayedExpenses.map((exp) => (
                    <tr key={exp.id} className="hover:bg-slate-50/60 transition-colors group">
                      <td className="py-3.5 pl-2">
                        <div className="max-w-[220px]">
                          <span className="block font-black text-sm text-slate-800 truncate" title={exp.title}>
                            {exp.title}
                          </span>
                          {exp.notes && (
                            <span className="text-[10px] text-slate-400 truncate block font-normal" title={exp.notes}>
                              {exp.notes}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5">
                        <span className="rounded-lg bg-slate-100 text-slate-600 px-2.5 py-1 text-[10px] font-bold">
                          {exp.category}
                        </span>
                      </td>

                      <td className="py-3.5 font-mono text-[11px] text-slate-500 font-bold">
                        {exp.date}
                      </td>

                      <td className="py-3.5 text-center">
                        <span className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                          exp.payment_method === 'Cash'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                            : exp.payment_method === 'UPI'
                            ? 'bg-blue-50 text-blue-700 border border-blue-100'
                            : 'bg-purple-50 text-purple-700 border border-purple-100'
                        }`}>
                          {exp.payment_method === 'Cash' && <Banknote className="h-3 w-3" />}
                          {exp.payment_method === 'UPI' && <Smartphone className="h-3 w-3" />}
                          {exp.payment_method === 'Card' && <CreditCard className="h-3 w-3" />}
                          <span>{exp.payment_method}</span>
                        </span>
                      </td>

                      <td className="py-3.5 text-right font-mono text-sm font-black text-rose-600">
                        ₹{Number(exp.amount).toFixed(2)}
                      </td>

                      <td className="py-3.5 text-center pr-2">
                        <button
                          onClick={() => setDeletingId(exp.id)}
                          className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all cursor-pointer opacity-80 group-hover:opacity-100"
                          title="Delete Expense"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* RIGHT (1 COL): BREAKDOWN & QUICK INSIGHTS */}
        <div className="space-y-6">
          {/* Category Breakdown Card */}
          <div className="rounded-3xl bg-white border border-slate-100 p-5 sm:p-6 shadow-sm">
            <h3 className="font-display text-sm font-black text-slate-800 mb-1 flex items-center space-x-2">
              <Coins className="h-4 w-4 text-primary" />
              <span>Category Spending</span>
            </h3>
            <p className="text-[10px] font-bold text-slate-400 mb-4">
              Breakdown of expenses by category for {activeView === 'daily' ? 'selected date' : 'this month'}.
            </p>

            {categoryBreakdown.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center italic">No expenses recorded yet.</p>
            ) : (
              <div className="space-y-3.5">
                {categoryBreakdown.map(([cat, amt]) => {
                  const total = activeView === 'daily' ? totalDailyExpense : totalMonthlyExpense;
                  const pct = total > 0 ? (amt / total) * 100 : 0;

                  return (
                    <div key={cat} className="space-y-1">
                      <div className="flex justify-between text-xs font-bold">
                        <span className="text-slate-700 truncate pr-2">{cat}</span>
                        <span className="font-mono font-black text-slate-900 shrink-0">₹{amt.toFixed(2)}</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary transition-all duration-500"
                          style={{ width: `${Math.min(100, Math.max(5, pct))}%` }}
                        />
                      </div>
                      <span className="text-[9px] font-bold text-slate-400 block text-right font-mono">
                        {pct.toFixed(0)}% of expenses
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quick Insights Banner */}
          <div className="rounded-3xl border border-slate-200/80 bg-slate-50 p-5 shadow-sm space-y-3">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">
              Store Accounting Note
            </span>
            <p className="text-xs font-semibold text-slate-600 leading-relaxed">
              Recording daily shop expenses here ensures your net daily revenue and profit calculations are 100% accurate without affecting your POS counter bills or master inventory.
            </p>
            <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[11px] font-mono font-bold text-slate-500">
              <span>Date: {selectedDate}</span>
              <span className="text-primary font-black uppercase">{store?.name || 'Active Store'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── MODAL: ADD EXPENSE ─── */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 sm:p-7 shadow-2xl animate-scale-up border border-slate-100 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5 pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Receipt className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-display text-base font-black text-slate-800">Record Shop Expense</h3>
                  <p className="text-[10px] font-bold text-slate-400">Enter a manual store expense for accounting</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="rounded-xl p-2 hover:bg-slate-100 text-slate-400 transition-all cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddExpense} className="space-y-4">
              {/* Amount */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                  Amount (INR) *
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-mono font-black text-slate-400">
                    ₹
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    required
                    autoFocus
                    placeholder="0.00"
                    value={expAmount}
                    onChange={(e) => setExpAmount(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 pl-9 pr-4 py-3.5 font-mono text-xl font-black text-slate-900 outline-none focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10 transition-all"
                  />
                </div>
              </div>

              {/* Title / Description */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                  Item / Description *
                </label>
                <input
                  type="text"
                  required
                  placeholder="E.g., 20L Milk packets, Ice bags, Cleaning fluid..."
                  value={expTitle}
                  onChange={(e) => setExpTitle(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-xs font-bold text-slate-800 outline-none focus:border-primary focus:bg-white transition-all"
                />
              </div>

              {/* Date & Payment Method */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                    Expense Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={expDate}
                    onChange={(e) => setExpDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 font-mono text-xs font-bold text-slate-800 outline-none focus:border-primary cursor-pointer"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                    Payment Method
                  </label>
                  <select
                    value={expPaymentMethod}
                    onChange={(e) => setExpPaymentMethod(e.target.value as any)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-xs font-bold text-slate-800 outline-none focus:border-primary cursor-pointer"
                  >
                    <option value="Cash">Cash Counter</option>
                    <option value="UPI">UPI / Google Pay</option>
                    <option value="Card">Debit / Credit Card</option>
                    <option value="Other">Bank / Other</option>
                  </select>
                </div>
              </div>

              {/* Category Quick Chips */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-2">
                  Category
                </label>
                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-1">
                  {EXPENSE_CATEGORIES.map(cat => (
                    <button
                      type="button"
                      key={cat}
                      onClick={() => setExpCategory(cat)}
                      className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                        expCategory === cat
                          ? 'bg-primary text-white shadow-sm'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                  Optional Notes / Reference
                </label>
                <textarea
                  rows={2}
                  placeholder="Receipt number, supplier name, etc..."
                  value={expNotes}
                  onChange={(e) => setExpNotes(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-xs font-semibold text-slate-800 outline-none focus:border-primary focus:bg-white resize-none"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end space-x-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="rounded-xl border border-slate-200 px-5 py-2.5 text-xs font-bold text-slate-500 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center space-x-1.5 rounded-xl bg-primary hover:bg-primary-dark px-6 py-2.5 text-xs font-black uppercase tracking-wider text-white shadow-lg shadow-primary/20 transition-all active:scale-95 cursor-pointer disabled:opacity-60"
                >
                  {isSubmitting ? (
                    <span>Saving...</span>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Save Expense</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: DELETE CONFIRMATION ─── */}
      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl animate-scale-up border border-slate-100 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-500 mb-4">
              <Trash2 className="h-7 w-7" />
            </div>
            <h3 className="font-display text-base font-black text-slate-800">Delete Expense Entry?</h3>
            <p className="text-xs font-semibold text-slate-400 mt-1">
              Are you sure you want to delete this expense record? This action cannot be undone.
            </p>

            <div className="flex space-x-2.5 mt-6">
              <button
                type="button"
                onClick={() => setDeletingId(null)}
                className="flex-1 rounded-xl border border-slate-200 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDeleteExpense(deletingId)}
                className="flex-1 rounded-xl bg-rose-600 hover:bg-rose-700 py-2.5 text-xs font-black uppercase tracking-wider text-white shadow-md shadow-rose-500/20 transition-all cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
