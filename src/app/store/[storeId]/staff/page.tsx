'use client';

import { useState, useEffect, useMemo } from 'react';
import { api, Staff, StaffAdvance, StaffAttendance, ShiftLog } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import {
  Users,
  Coins,
  Clock,
  Plus,
  UserPlus,
  Check,
  X,
  CheckCircle,
  Phone,
  Calendar,
  AlertCircle,
  Edit2,
  Lock,
  Unlock,
  Sparkles,
  ShieldCheck,
  UserCircle,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Wallet,
  Banknote,
  TrendingUp,
  RefreshCw,
  Search,
  ArrowRight,
  Trash2
} from 'lucide-react';

export default function StaffPage() {
  const { store, user } = useAuthStore();

  // Authentication & Security Lock State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingLock, setIsCheckingLock] = useState(true);
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState('');
  const [lockTimer, setLockTimer] = useState<number>(0);
  const [hasPassword, setHasPassword] = useState(false);
  const [showSetupPassword, setShowSetupPassword] = useState(false);
  const [setupPassword, setSetupPassword] = useState('');
  const [setupConfirm, setSetupConfirm] = useState('');
  const [setupError, setSetupError] = useState('');

  // Password Change State
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [pwChangeError, setPwChangeError] = useState('');
  const [pwChangeSuccess, setPwChangeSuccess] = useState('');

  // Active navigation tab
  const [activeTab, setActiveTab] = useState<'directory' | 'attendance' | 'salaf'>('directory');

  // Month selector for payroll & salary calculations (YYYY-MM)
  const getTodayStr = () => new Date().toISOString().substring(0, 10);
  const getCurrentMonthStr = () => new Date().toISOString().substring(0, 7);
  const [selectedMonth, setSelectedMonth] = useState<string>(getCurrentMonthStr());

  // Attendance date selector (defaults to today, allows past dates)
  const [selectedAttDate, setSelectedAttDate] = useState<string>(getTodayStr());

  // Data States
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [advances, setAdvances] = useState<(StaffAdvance & { staff: Staff })[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<StaffAttendance[]>([]);
  const [shifts, setShifts] = useState<(ShiftLog & { staff: Staff })[]>([]);
  const [loading, setLoading] = useState(false);

  // Directory Modals & Forms
  const [showAddStaff, setShowAddStaff] = useState(false);
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffPhone, setNewStaffPhone] = useState('');
  const [newStaffRole, setNewStaffRole] = useState<'cashier' | 'helper' | 'delivery'>('cashier');
  const [newStaffSalary, setNewStaffSalary] = useState('');

  // Salaf Form
  const [showAddAdvance, setShowAddAdvance] = useState(false);
  const [advStaffId, setAdvStaffId] = useState('');
  const [advAmount, setAdvAmount] = useState('');
  const [advNotes, setAdvNotes] = useState('');
  const [advDate, setAdvDate] = useState(getTodayStr());

  // Edit Advance State
  const [editingAdvance, setEditingAdvance] = useState<(StaffAdvance & { staff?: Staff }) | null>(null);
  const [editAdvStaffId, setEditAdvStaffId] = useState('');
  const [editAdvAmount, setEditAdvAmount] = useState('');
  const [editAdvNotes, setEditAdvNotes] = useState('');
  const [editAdvDate, setEditAdvDate] = useState(getTodayStr());

  // Delete Advance State
  const [deletingAdvance, setDeletingAdvance] = useState<(StaffAdvance & { staff?: Staff }) | null>(null);
  const [isDeletingAdv, setIsDeletingAdv] = useState(false);

  // Staff Details Modal & Edit States
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [isEditingStaff, setIsEditingStaff] = useState(false);
  const [editStaffName, setEditStaffName] = useState('');
  const [editStaffPhone, setEditStaffPhone] = useState('');
  const [editStaffRole, setEditStaffRole] = useState<'cashier' | 'helper' | 'delivery'>('cashier');
  const [editStaffSalary, setEditStaffSalary] = useState('');
  const [modalTab, setModalTab] = useState<'salary' | 'attendance' | 'salaf'>('salary');

  // Directory Search Filter
  const [staffSearchQuery, setStaffSearchQuery] = useState('');

  // Attendance saving status indicator
  const [attSavingId, setAttSavingId] = useState<string | null>(null);

  // Load all staff hub data
  const loadData = async (silent = false) => {
    if (!store) return;
    if (!silent) setLoading(true);
    try {
      const sList = await api.getStaffByStore(store.id);
      setStaffList(sList);

      const advList = await api.getAdvancesByStore(store.id);
      setAdvances(advList);

      const attList = await api.getStaffAttendanceByStore(store.id);
      setAttendanceRecords(attList);

      const shfList = await api.getShiftsByStore(store.id);
      setShifts(shfList);

      const savedTimer = await api.getStaffLockTime(store.id);
      setLockTimer(savedTimer);

      const savedPw = await api.getStaffPassword(store.id);
      setHasPassword(savedPw !== null);
    } catch (err) {
      console.error('Failed to load staff portal data', err);
    } finally {
      setIsCheckingLock(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [store]);

  // Real-time synchronization event listener
  useEffect(() => {
    const handleSync = () => loadData(true);
    window.addEventListener('zee_staff_attendance_updated', handleSync);
    return () => window.removeEventListener('zee_staff_attendance_updated', handleSync);
  }, [store]);

  // Auto-lock timer logic
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

  // Handle Authentication
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!store) return;
    const savedPw = await api.getStaffPassword(store.id);
    const validPw = savedPw !== null ? savedPw : '1234';
    if (passwordInput === validPw) {
      setIsAuthenticated(true);
      setPasswordInput('');
      setAuthError('');
    } else {
      setAuthError('Incorrect password');
    }
  };

  // Handle Password Change
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!store) return;
    const savedPw = await api.getStaffPassword(store.id);
    const validPw = savedPw !== null ? savedPw : '1234';
    if (currentPw !== validPw) {
      setPwChangeError('Current password is incorrect');
      return;
    }
    if (newPw.length < 4) {
      setPwChangeError('New password must be at least 4 characters');
      return;
    }
    await api.setStaffPassword(store.id, newPw);
    setPwChangeSuccess('Password changed successfully!');
    setPwChangeError('');
    setCurrentPw('');
    setNewPw('');
    setTimeout(() => {
      setShowChangePassword(false);
      setPwChangeSuccess('');
    }, 2000);
  };

  // ─── SALARY & ATTENDANCE CALCULATIONS ───
  // Calculate days in the selected payroll month (e.g. 31 days in October, 30 in November)
  const daysInSelectedMonth = useMemo(() => {
    try {
      const [yearStr, monthStr] = selectedMonth.split('-');
      const year = parseInt(yearStr);
      const month = parseInt(monthStr);
      return new Date(year, month, 0).getDate();
    } catch {
      return 30;
    }
  }, [selectedMonth]);

  // Compute stats per staff member for the selected month
  const staffPayrollStats = useMemo(() => {
    return staffList.map((member) => {
      const monthlySalary = Number(member.monthly_salary) || 0;
      const perDaySalary = daysInSelectedMonth > 0 ? monthlySalary / daysInSelectedMonth : 0;

      // Attended dates in selected month
      const attendedDatesSet = new Set<string>();

      // 1. Explicit attendance records
      attendanceRecords.forEach((att) => {
        if (att.staff_id === member.id && att.date.startsWith(selectedMonth)) {
          if (att.status === 'present') {
            attendedDatesSet.add(att.date);
          }
        }
      });

      // 2. Legacy shift logs fallback (if no explicit record for that day)
      shifts.forEach((shf) => {
        if (shf.staff_id === member.id) {
          const shiftDate = shf.clock_in ? shf.clock_in.substring(0, 10) : '';
          if (shiftDate.startsWith(selectedMonth)) {
            const hasExplicit = attendanceRecords.some(
              (a) => a.staff_id === member.id && a.date === shiftDate
            );
            if (!hasExplicit) {
              attendedDatesSet.add(shiftDate);
            }
          }
        }
      });

      const daysPresent = attendedDatesSet.size;
      const earnedSalary = daysPresent * perDaySalary;

      // Advances in selected month (or total pending advances)
      const memberMonthAdvances = advances.filter(
        (a) => a.staff_id === member.id && a.date.startsWith(selectedMonth)
      );
      const totalAdvanceInMonth = memberMonthAdvances.reduce((sum, a) => sum + (Number(a.amount) || 0), 0);

      // Cumulative all-time advance taken
      const totalAllTimeAdvance = advances
        .filter((a) => a.staff_id === member.id)
        .reduce((sum, a) => sum + (Number(a.amount) || 0), 0);

      // Net Pending Balance = Earned Salary - Advance taken in month
      const pendingBalance = earnedSalary - totalAdvanceInMonth;

      return {
        member,
        monthlySalary,
        perDaySalary,
        daysPresent,
        daysInMonth: daysInSelectedMonth,
        earnedSalary,
        totalAdvanceInMonth,
        totalAllTimeAdvance,
        pendingBalance,
        attendedDates: Array.from(attendedDatesSet).sort()
      };
    });
  }, [staffList, attendanceRecords, shifts, advances, selectedMonth, daysInSelectedMonth]);

  // Grand totals across all staff for the selected month
  const totalPayrollSummary = useMemo(() => {
    let totalSalaries = 0;
    let totalEarned = 0;
    let totalAdvances = 0;
    let totalPending = 0;

    staffPayrollStats.forEach((stat) => {
      totalSalaries += stat.monthlySalary;
      totalEarned += stat.earnedSalary;
      totalAdvances += stat.totalAdvanceInMonth;
      totalPending += stat.pendingBalance;
    });

    return { totalSalaries, totalEarned, totalAdvances, totalPending };
  }, [staffPayrollStats]);

  // ─── ATTENDANCE SHEET FOR SELECTED DATE ───
  // Helper to get status of a staff member on the currently selected attendance date
  const getAttendanceStatusOnDate = (staffId: string, dateStr: string): 'present' | 'absent' | 'unmarked' => {
    const record = attendanceRecords.find((a) => a.staff_id === staffId && a.date === dateStr);
    if (record) return record.status;

    // Check shift logs fallback
    const shift = shifts.find(
      (s) => s.staff_id === staffId && s.clock_in && s.clock_in.substring(0, 10) === dateStr
    );
    if (shift) return 'present';

    return 'unmarked';
  };

  // Toggle or set attendance for a staff member on the selected date
  const handleToggleAttendance = async (staffId: string, targetStatus: 'present' | 'absent') => {
    if (!store) return;
    setAttSavingId(staffId);
    try {
      await api.setStaffAttendance(
        store.id,
        staffId,
        selectedAttDate,
        targetStatus,
        user?.name || user?.email
      );
      await loadData(true);
    } catch (err) {
      console.error('Failed to update attendance:', err);
      alert('Could not update attendance.');
    } finally {
      setAttSavingId(null);
    }
  };

  // Mark all active staff as "Come" (Present) for the selected date
  const handleMarkAllCome = async () => {
    if (!store || staffList.length === 0) return;
    setLoading(true);
    try {
      const records = staffList.map((s) => ({
        staffId: s.id,
        status: 'present' as const
      }));
      await api.setBulkStaffAttendance(store.id, selectedAttDate, records, user?.name || user?.email);
      await loadData(true);
    } catch (err) {
      console.error('Failed to bulk mark attendance:', err);
    } finally {
      setLoading(false);
    }
  };

  // Step attendance date by days
  const stepAttDate = (days: number) => {
    try {
      const parts = selectedAttDate.split('-');
      const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      d.setDate(d.getDate() + days);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      setSelectedAttDate(`${year}-${month}-${day}`);
    } catch {}
  };

  // Step payroll month
  const stepPayrollMonth = (delta: number) => {
    try {
      const [yStr, mStr] = selectedMonth.split('-');
      let year = parseInt(yStr);
      let month = parseInt(mStr) + delta;
      if (month < 1) {
        month = 12;
        year -= 1;
      } else if (month > 12) {
        month = 1;
        year += 1;
      }
      setSelectedMonth(`${year}-${String(month).padStart(2, '0')}`);
    } catch {}
  };

  // ─── HANDLERS FOR STAFF & ADVANCES ───
  // Add new staff member with monthly salary
  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!store || !newStaffName.trim() || !newStaffPhone.trim()) return;

    try {
      await api.addStaff(store.id, {
        name: newStaffName.trim(),
        phone: newStaffPhone.trim(),
        role: newStaffRole,
        monthly_salary: parseFloat(newStaffSalary) || 0,
        joining_date: getTodayStr(),
        created_by: user?.id
      });

      setShowAddStaff(false);
      setNewStaffName('');
      setNewStaffPhone('');
      setNewStaffSalary('');
      setNewStaffRole('cashier');
      await loadData(true);
    } catch (err) {
      console.error('Failed to add staff member', err);
      alert('Failed to register staff member.');
    }
  };

  // Update staff details including salary
  const handleUpdateStaffDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaff || !editStaffName.trim() || !editStaffPhone.trim()) return;

    try {
      const salaryNum = parseFloat(editStaffSalary) || 0;
      const updated = await api.updateStaff(selectedStaff.id, {
        name: editStaffName.trim(),
        phone: editStaffPhone.trim(),
        role: editStaffRole,
        monthly_salary: salaryNum
      });

      setIsEditingStaff(false);
      setSelectedStaff(updated);
      await loadData(true);
    } catch (err) {
      console.error('Failed to update staff member details', err);
      alert('Failed to update staff details.');
    }
  };

  // Record a salary advance payout (Salaf)
  const handleAddAdvance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!store || !advStaffId || !advAmount) return;

    try {
      await api.addAdvance(store.id, {
        staff_id: advStaffId,
        amount: parseFloat(advAmount) || 0,
        date: advDate,
        notes: advNotes.trim()
      });

      setShowAddAdvance(false);
      setAdvStaffId('');
      setAdvAmount('');
      setAdvNotes('');
      setAdvDate(getTodayStr());
      await loadData(true);
    } catch (err) {
      console.error('Failed to record advance', err);
      alert('Failed to record advance.');
    }
  };

  // Start editing advance
  const handleStartEditAdvance = (adv: StaffAdvance & { staff?: Staff }) => {
    setEditingAdvance(adv);
    setEditAdvStaffId(adv.staff_id);
    setEditAdvAmount(String(adv.amount));
    setEditAdvDate(adv.date);
    setEditAdvNotes(adv.notes || '');
  };

  // Save edited advance
  const handleUpdateAdvance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAdvance || !editAdvStaffId || !editAdvAmount) return;

    try {
      await api.updateAdvance(editingAdvance.id, {
        staff_id: editAdvStaffId,
        amount: parseFloat(editAdvAmount) || 0,
        date: editAdvDate,
        notes: editAdvNotes.trim()
      });

      setEditingAdvance(null);
      await loadData(true);
    } catch (err) {
      console.error('Failed to update advance', err);
      alert('Failed to update advance.');
    }
  };

  // Confirm delete advance
  const handleDeleteAdvance = async () => {
    if (!deletingAdvance) return;
    setIsDeletingAdv(true);
    try {
      await api.deleteAdvance(deletingAdvance.id);
      setDeletingAdvance(null);
      await loadData(true);
    } catch (err) {
      console.error('Failed to delete advance', err);
      alert('Failed to delete advance.');
    } finally {
      setIsDeletingAdv(false);
    }
  };

  // Filtered staff list for search query
  const filteredPayrollStats = useMemo(() => {
    if (!staffSearchQuery.trim()) return staffPayrollStats;
    const q = staffSearchQuery.toLowerCase();
    return staffPayrollStats.filter(
      (item) =>
        item.member.name.toLowerCase().includes(q) ||
        item.member.phone.toLowerCase().includes(q) ||
        item.member.role.toLowerCase().includes(q)
    );
  }, [staffPayrollStats, staffSearchQuery]);

  // ─── LOADING SCREEN ───
  if (isCheckingLock) {
    return (
      <div className="flex h-full min-h-[60vh] items-center justify-center p-4">
        <div className="flex flex-col items-center space-y-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="text-sm font-semibold text-slate-400">Verifying Hub Access...</p>
        </div>
      </div>
    );
  }

  // ─── AUTHENTICATION SCREEN ───
  if (!isAuthenticated) {
    return (
      <div className="flex h-full min-h-[60vh] items-center justify-center p-4">
        <div className="w-full max-w-sm rounded-3xl bg-white p-8 shadow-sm border border-slate-100 text-center animate-scale-up">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-6">
            <Lock className="h-8 w-8 stroke-[2px]" />
          </div>
          <h2 className="font-display text-2xl font-black text-slate-800 mb-2">Staff Hub Access</h2>
          <p className="text-xs font-semibold text-slate-400 mb-8">
            Enter the master PIN to manage employee salaries, daily attendance, and advances.
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
              Unlock Hub
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ─── MAIN STAFF HUB VIEW ───
  return (
    <div className="space-y-6 sm:space-y-8 select-none animate-fade-in relative pb-12 max-w-7xl mx-auto">
      {/* ─── HEADER SECTION ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-display text-xl sm:text-2xl font-black text-text-primary tracking-tight">
                Store Staff & Payroll Hub
              </h1>
              <p className="text-xs font-semibold text-text-muted mt-0.5">
                Manage monthly salaries, mark daily attendance (Come / Not Come), and track advance deductions.
              </p>
            </div>
          </div>
        </div>

        {/* Top Control Bar */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Lock Timer */}
          <div className="flex items-center space-x-1.5 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 shadow-sm">
            <Clock className="h-3.5 w-3.5 text-slate-400 ml-0.5" />
            <select
              value={lockTimer}
              onChange={async (e) => {
                const val = parseInt(e.target.value, 10);
                setLockTimer(val);
                if (store) await api.setStaffLockTime(store.id, val);
              }}
              className="bg-transparent text-[10px] font-black uppercase tracking-wider text-slate-600 outline-none cursor-pointer pr-1"
            >
              <option value={0}>Never Lock</option>
              <option value={1}>Lock 1 Min</option>
              <option value={5}>Lock 5 Mins</option>
              <option value={15}>Lock 15 Mins</option>
            </select>
          </div>

          <button
            onClick={() => setIsAuthenticated(false)}
            className="flex items-center space-x-1.5 rounded-xl bg-slate-800 hover:bg-slate-900 px-3.5 py-2 text-[10px] font-black uppercase tracking-wider text-white transition-all active:scale-95 cursor-pointer shadow-sm"
          >
            <Lock className="h-3.5 w-3.5 text-slate-300" />
            <span className="hidden sm:inline">Lock</span>
          </button>

          <button
            onClick={() => setShowChangePassword(true)}
            className="rounded-xl bg-white border border-slate-200 hover:bg-slate-50 p-2 text-slate-600 transition-all active:scale-95 cursor-pointer shadow-sm"
            title="Change PIN"
          >
            <ShieldCheck className="h-4 w-4 text-slate-500" />
          </button>

          {/* Action buttons based on tab */}
          {activeTab === 'directory' && (
            <button
              onClick={() => setShowAddStaff(true)}
              className="flex items-center space-x-2 rounded-xl bg-primary hover:bg-primary-dark px-4 py-2.5 text-xs font-black uppercase tracking-wider text-white shadow-lg shadow-primary/20 transition-all active:scale-95 cursor-pointer"
            >
              <UserPlus className="h-4 w-4 stroke-[3px]" />
              <span>Add Staff</span>
            </button>
          )}

          {activeTab === 'salaf' && (
            <button
              onClick={() => setShowAddAdvance(true)}
              className="flex items-center space-x-2 rounded-xl bg-primary hover:bg-primary-dark px-4 py-2.5 text-xs font-black uppercase tracking-wider text-white shadow-lg shadow-primary/20 transition-all active:scale-95 cursor-pointer"
            >
              <Plus className="h-4 w-4 stroke-[3px]" />
              <span>Add Advance (Salaf)</span>
            </button>
          )}
        </div>
      </div>

      {/* ─── NAVIGATION TABS & MONTH SELECTOR ─── */}
      <div className="rounded-3xl bg-white border border-slate-100 p-2 sm:p-3 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Main Tab Switcher */}
        <div className="flex space-x-1 w-full md:w-auto">
          <button
            onClick={() => setActiveTab('directory')}
            className={`flex-1 md:flex-none flex items-center justify-center space-x-2 px-4 sm:px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'directory'
                ? 'bg-primary text-white shadow-md shadow-primary/20'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Users className="h-4 w-4" />
            <span>Staff & Payroll</span>
          </button>

          <button
            onClick={() => setActiveTab('attendance')}
            className={`flex-1 md:flex-none flex items-center justify-center space-x-2 px-4 sm:px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'attendance'
                ? 'bg-primary text-white shadow-md shadow-primary/20'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Calendar className="h-4 w-4" />
            <span>Daily Attendance</span>
          </button>

          <button
            onClick={() => setActiveTab('salaf')}
            className={`flex-1 md:flex-none flex items-center justify-center space-x-2 px-4 sm:px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'salaf'
                ? 'bg-primary text-white shadow-md shadow-primary/20'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Coins className="h-4 w-4" />
            <span>Advances (Salaf)</span>
          </button>
        </div>

        {/* Month Selector for Payroll View */}
        <div className="flex items-center space-x-2 bg-slate-50 border border-slate-200/80 rounded-2xl px-3 py-1.5 w-full md:w-auto justify-between">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
            Payroll Month:
          </span>
          <div className="flex items-center space-x-1">
            <button
              onClick={() => stepPayrollMonth(-1)}
              className="p-1 rounded-lg hover:bg-white text-slate-500 hover:text-slate-900 transition-all cursor-pointer"
              title="Previous Month"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => {
                if (e.target.value) setSelectedMonth(e.target.value);
              }}
              className="bg-transparent font-mono text-xs font-black text-slate-800 outline-none cursor-pointer"
            />
            <button
              onClick={() => stepPayrollMonth(1)}
              className="p-1 rounded-lg hover:bg-white text-slate-500 hover:text-slate-900 transition-all cursor-pointer"
              title="Next Month"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ─── TAB 1: STAFF DIRECTORY & PAYROLL BALANCE ─── */}
      {activeTab === 'directory' && (
        <div className="space-y-6">
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-3xl bg-white border border-slate-100 p-5 shadow-sm">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                Active Staff
              </span>
              <div className="flex items-baseline justify-between">
                <span className="font-mono text-2xl sm:text-3xl font-black text-slate-800">
                  {staffList.length}
                </span>
                <span className="text-[10px] font-bold text-slate-500">
                  {daysInSelectedMonth} days in {selectedMonth}
                </span>
              </div>
            </div>

            <div className="rounded-3xl bg-white border border-slate-100 p-5 shadow-sm">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                Total Month Salaries
              </span>
              <div className="flex items-baseline justify-between">
                <span className="font-mono text-2xl sm:text-3xl font-black text-blue-600">
                  ₹{totalPayrollSummary.totalSalaries.toFixed(0)}
                </span>
                <span className="text-[10px] font-bold text-blue-500">Base total</span>
              </div>
            </div>

            <div className="rounded-3xl bg-white border border-slate-100 p-5 shadow-sm">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                Earned (Attendance)
              </span>
              <div className="flex items-baseline justify-between">
                <span className="font-mono text-2xl sm:text-3xl font-black text-emerald-600">
                  ₹{totalPayrollSummary.totalEarned.toFixed(0)}
                </span>
                <span className="text-[10px] font-bold text-emerald-500">Days worked</span>
              </div>
            </div>

            <div className="rounded-3xl bg-gradient-to-br from-amber-500 to-amber-600 p-5 text-white shadow-lg shadow-amber-500/10">
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-100 block mb-1">
                Net Pending Balance
              </span>
              <div className="flex items-baseline justify-between">
                <span className="font-mono text-2xl sm:text-3xl font-black">
                  ₹{totalPayrollSummary.totalPending.toFixed(0)}
                </span>
                <span className="text-[10px] font-bold text-amber-100">
                  Less ₹{totalPayrollSummary.totalAdvances.toFixed(0)} adv
                </span>
              </div>
            </div>
          </div>

          {/* Search & Staff Table Card */}
          <div className="rounded-3xl bg-white border border-slate-100 p-4 sm:p-6 shadow-sm overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
              <div>
                <h3 className="font-display text-base font-black text-slate-800 flex items-center space-x-2">
                  <Users className="h-4.5 w-4.5 text-primary" />
                  <span>Employee Payroll Ledger ({selectedMonth})</span>
                </h3>
                <p className="text-[11px] font-bold text-slate-400 mt-0.5">
                  Calculated using actual month days ({daysInSelectedMonth} days) × days attended − advances
                </p>
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search staff name or phone..."
                  value={staffSearchQuery}
                  onChange={(e) => setStaffSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-8 pr-3 py-2 text-xs font-bold text-slate-700 outline-none focus:border-primary focus:bg-white"
                />
              </div>
            </div>

            {staffList.length === 0 ? (
              <div className="py-16 text-center text-slate-400 text-xs font-medium border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                No staff members currently registered. Add employees using the button above.
              </div>
            ) : (
              <div className="overflow-x-auto scrollbar-thin">
                <table className="w-full min-w-[750px] text-left border-collapse whitespace-nowrap">
                  <thead>
                    <tr className="border-b-2 border-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-400">
                      <th className="pb-3.5 pl-2">Employee</th>
                      <th className="pb-3.5 text-center">Monthly Salary</th>
                      <th className="pb-3.5 text-center">Days Come</th>
                      <th className="pb-3.5 text-center">Earned Salary</th>
                      <th className="pb-3.5 text-center">Advance Taken</th>
                      <th className="pb-3.5 text-right pr-2">Pending Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50/80 text-xs font-semibold text-slate-700">
                    {filteredPayrollStats.map((stat) => (
                      <tr
                        key={stat.member.id}
                        onClick={() => {
                          setSelectedStaff(stat.member);
                          setIsEditingStaff(false);
                          setEditStaffName(stat.member.name);
                          setEditStaffPhone(stat.member.phone);
                          setEditStaffRole(stat.member.role);
                          setEditStaffSalary(String(stat.member.monthly_salary || ''));
                          setModalTab('salary');
                        }}
                        className="hover:bg-slate-50/70 cursor-pointer transition-colors group"
                      >
                        <td className="py-4 pl-2">
                          <div className="flex items-center space-x-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 font-display font-black text-sm uppercase group-hover:bg-primary group-hover:text-white transition-colors">
                              {stat.member.name[0]}
                            </div>
                            <div>
                              <span className="block font-black text-sm text-slate-800">{stat.member.name}</span>
                              <div className="flex items-center space-x-2 mt-0.5">
                                <span className="rounded bg-sky-50 px-1.5 py-0.5 text-[9px] font-bold uppercase text-primary">
                                  {stat.member.role}
                                </span>
                                <span className="text-[10px] font-mono text-slate-400 font-bold">{stat.member.phone}</span>
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="py-4 text-center">
                          <span className="font-mono text-xs font-black text-slate-900">
                            {stat.monthlySalary > 0 ? `₹${stat.monthlySalary.toFixed(0)}` : 'Not Set'}
                          </span>
                          <span className="block text-[9px] font-mono text-slate-400">
                            (₹{stat.perDaySalary.toFixed(1)}/day)
                          </span>
                        </td>

                        <td className="py-4 text-center">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100 font-mono text-xs font-black">
                            {stat.daysPresent} / {stat.daysInMonth} Days
                          </span>
                        </td>

                        <td className="py-4 text-center">
                          <span className="font-mono text-xs font-black text-emerald-600">
                            ₹{stat.earnedSalary.toFixed(2)}
                          </span>
                        </td>

                        <td className="py-4 text-center">
                          <span className="font-mono text-xs font-black text-rose-500">
                            {stat.totalAdvanceInMonth > 0 ? `-₹${stat.totalAdvanceInMonth.toFixed(2)}` : '₹0.00'}
                          </span>
                          {stat.totalAllTimeAdvance > stat.totalAdvanceInMonth && (
                            <span className="block text-[9px] font-mono text-slate-400" title="All-time cumulative advance">
                              Total: ₹{stat.totalAllTimeAdvance.toFixed(0)}
                            </span>
                          )}
                        </td>

                        <td className="py-4 text-right pr-2">
                          <div className="inline-flex flex-col items-end">
                            <span
                              className={`px-3 py-1.5 rounded-xl font-mono text-sm font-black shadow-sm ${
                                stat.pendingBalance >= 0
                                  ? 'bg-emerald-500 text-white shadow-emerald-500/20'
                                  : 'bg-rose-500 text-white shadow-rose-500/20'
                              }`}
                            >
                              ₹{stat.pendingBalance.toFixed(2)}
                            </span>
                            <span className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-wider">
                              {stat.pendingBalance >= 0 ? 'Payable' : 'Advance Exceeds'}
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── TAB 2: DAILY ATTENDANCE (COME / NOT COME SHEET) ─── */}
      {activeTab === 'attendance' && (
        <div className="space-y-6">
          {/* Attendance Date Control Card */}
          <div className="rounded-3xl bg-white border border-slate-100 p-4 sm:p-5 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center space-x-1 bg-slate-50 border border-slate-200/80 rounded-2xl p-1">
                <button
                  onClick={() => stepAttDate(-1)}
                  className="p-2 rounded-xl hover:bg-white text-slate-600 hover:text-slate-900 transition-all cursor-pointer active:scale-90"
                  title="Previous Day"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>

                <div className="relative flex items-center px-2">
                  <Calendar className="h-4 w-4 text-primary mr-2 shrink-0 pointer-events-none" />
                  <input
                    type="date"
                    value={selectedAttDate}
                    onChange={(e) => {
                      if (e.target.value) setSelectedAttDate(e.target.value);
                    }}
                    className="bg-transparent font-mono text-xs sm:text-sm font-black text-slate-800 outline-none cursor-pointer"
                  />
                </div>

                <button
                  onClick={() => stepAttDate(1)}
                  className="p-2 rounded-xl hover:bg-white text-slate-600 hover:text-slate-900 transition-all cursor-pointer active:scale-90"
                  title="Next Day"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              {/* Quick Preset Buttons */}
              <button
                onClick={() => setSelectedAttDate(getTodayStr())}
                className={`px-3 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                  selectedAttDate === getTodayStr()
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
                  setSelectedAttDate(y.toISOString().substring(0, 10));
                }}
                className={`px-3 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                  selectedAttDate === new Date(Date.now() - 86400000).toISOString().substring(0, 10)
                    ? 'bg-primary text-white shadow-md shadow-primary/20'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/60'
                }`}
              >
                Yesterday
              </button>
            </div>

            {/* Quick Bulk Action */}
            <div className="flex items-center space-x-3 w-full md:w-auto justify-end">
              <button
                onClick={handleMarkAllCome}
                className="flex items-center space-x-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-2.5 text-xs font-black uppercase tracking-wider text-white shadow-md shadow-emerald-500/20 transition-all active:scale-95 cursor-pointer"
              >
                <CheckCircle2 className="h-4 w-4 stroke-[3px]" />
                <span>Mark All as Come</span>
              </button>
            </div>
          </div>

          {/* Daily Attendance Sheet */}
          <div className="rounded-3xl bg-white border border-slate-100 p-4 sm:p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6 pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-display text-base font-black text-slate-800 flex items-center space-x-2">
                  <Calendar className="h-4.5 w-4.5 text-primary" />
                  <span>Attendance Sheet for {selectedAttDate}</span>
                </h3>
                <p className="text-[11px] font-bold text-slate-400 mt-0.5">
                  Simply mark whether each employee came or not. If any previous day was missed, pick that date and mark it here.
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <span className="text-xs font-black text-emerald-600 bg-emerald-50 border border-emerald-100 px-3 py-1 rounded-xl font-mono">
                  {staffList.filter((s) => getAttendanceStatusOnDate(s.id, selectedAttDate) === 'present').length} Present
                </span>
                <span className="text-xs font-black text-rose-500 bg-rose-50 border border-rose-100 px-3 py-1 rounded-xl font-mono">
                  {staffList.filter((s) => getAttendanceStatusOnDate(s.id, selectedAttDate) === 'absent').length} Absent
                </span>
              </div>
            </div>

            {staffList.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs font-medium">
                No staff members registered.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {staffList.map((member) => {
                  const status = getAttendanceStatusOnDate(member.id, selectedAttDate);
                  const isSaving = attSavingId === member.id;

                  return (
                    <div
                      key={member.id}
                      className={`rounded-2xl border p-4 flex items-center justify-between transition-all ${
                        status === 'present'
                          ? 'border-emerald-200 bg-emerald-50/40 shadow-sm'
                          : status === 'absent'
                          ? 'border-rose-200 bg-rose-50/40'
                          : 'border-slate-100 bg-slate-50/60'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div
                          className={`flex h-11 w-11 items-center justify-center rounded-2xl font-display font-black text-sm uppercase shadow-sm ${
                            status === 'present'
                              ? 'bg-emerald-600 text-white'
                              : status === 'absent'
                              ? 'bg-rose-500 text-white'
                              : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          {member.name[0]}
                        </div>
                        <div>
                          <span className="block font-black text-sm text-slate-800">{member.name}</span>
                          <div className="flex items-center space-x-2 mt-0.5">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                              {member.role}
                            </span>
                            {member.monthly_salary ? (
                              <span className="text-[10px] font-mono font-bold text-slate-500">
                                ₹{member.monthly_salary.toFixed(0)}/mo
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons: Come (Present) / Not Come (Absent) */}
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleToggleAttendance(member.id, 'present')}
                          disabled={isSaving}
                          className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                            status === 'present'
                              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20 scale-105'
                              : 'bg-white border border-slate-200 text-slate-600 hover:border-emerald-500 hover:text-emerald-600 active:scale-95'
                          }`}
                        >
                          <Check className="h-3.5 w-3.5 stroke-[3px]" />
                          <span>Come</span>
                        </button>

                        <button
                          onClick={() => handleToggleAttendance(member.id, 'absent')}
                          disabled={isSaving}
                          className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                            status === 'absent'
                              ? 'bg-rose-600 text-white shadow-md shadow-rose-500/20 scale-105'
                              : 'bg-white border border-slate-200 text-slate-600 hover:border-rose-500 hover:text-rose-600 active:scale-95'
                          }`}
                        >
                          <X className="h-3.5 w-3.5 stroke-[3px]" />
                          <span>Not Come</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── TAB 3: SALAF (ADVANCE LEDGER) ─── */}
      {activeTab === 'salaf' && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Main Advance Records Table */}
          <div className="xl:col-span-2 rounded-3xl bg-white border border-slate-100 p-4 sm:p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-2.5">
                <Coins className="h-5 w-5 text-primary" />
                <h3 className="font-display text-sm font-black text-slate-800">Advance Ledger (Salaf)</h3>
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Total ₹{advances.reduce((s, a) => s + (Number(a.amount) || 0), 0).toFixed(2)} Given
              </span>
            </div>

            {advances.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs font-medium border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                No salary advance payouts recorded yet.
              </div>
            ) : (
              <div className="overflow-x-auto scrollbar-thin">
                <table className="w-full min-w-[650px] text-left border-collapse whitespace-nowrap">
                  <thead>
                    <tr className="border-b-2 border-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-400">
                      <th className="pb-3.5 pl-2">Employee</th>
                      <th className="pb-3.5">Date</th>
                      <th className="pb-3.5">Notes</th>
                      <th className="pb-3.5 text-right">Advance Amount</th>
                      <th className="pb-3.5 text-center pr-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50/80 text-xs font-semibold text-slate-700">
                    {advances.map((adv) => (
                      <tr key={adv.id} className="hover:bg-slate-50/60 transition-colors group">
                        <td className="py-3.5 pl-2 font-black text-sm text-slate-800">{adv.staff?.name || 'Staff Member'}</td>
                        <td className="py-3.5 font-mono text-[11px] text-slate-500 font-bold">{adv.date}</td>
                        <td className="py-3.5 text-slate-500 max-w-[200px] truncate" title={adv.notes}>
                          {adv.notes || 'Cash Advance'}
                        </td>
                        <td className="py-3.5 font-mono text-right font-black text-rose-600">
                          ₹{Number(adv.amount).toFixed(2)}
                        </td>
                        <td className="py-3.5 text-center pr-2">
                          <div className="flex items-center justify-center space-x-1">
                            <button
                              onClick={() => handleStartEditAdvance(adv)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-primary hover:bg-primary/5 transition-all cursor-pointer"
                              title="Edit Advance"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => setDeletingAdvance(adv)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all cursor-pointer"
                              title="Delete Advance"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Running Balance Sidebar Card */}
          <div className="rounded-3xl bg-white border border-slate-100 p-5 sm:p-6 shadow-sm flex flex-col max-h-[550px]">
            <h3 className="font-display text-sm font-black text-slate-800 mb-1 flex items-center space-x-2">
              <Wallet className="h-4 w-4 text-primary" />
              <span>Cumulative Advances</span>
            </h3>
            <p className="text-[10px] font-bold text-slate-400 mb-4">
              All advances taken by each staff member that will be deducted from their pending balance.
            </p>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1 scrollbar-thin">
              {staffList.map((member) => {
                const totalAdv = advances
                  .filter((a) => a.staff_id === member.id)
                  .reduce((sum, a) => sum + (Number(a.amount) || 0), 0);

                return (
                  <div
                    key={member.id}
                    className="rounded-2xl border border-slate-100 p-3.5 bg-slate-50/60 flex items-center justify-between"
                  >
                    <div>
                      <span className="text-xs font-black text-slate-800 block">{member.name}</span>
                      <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                        {member.role}
                      </span>
                    </div>
                    <span className="font-mono text-sm font-black text-rose-600">₹{totalAdv.toFixed(2)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: ADD STAFF MEMBER ─── */}
      {showAddStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 sm:p-7 shadow-2xl animate-scale-up border border-slate-100">
            <div className="flex items-center justify-between mb-5 pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <UserPlus className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-display text-base font-black text-slate-800">Register Employee</h3>
                  <p className="text-[10px] font-bold text-slate-400">Add staff member with monthly salary</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddStaff(false)}
                className="rounded-xl p-2 hover:bg-slate-100 text-slate-400 transition-all cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddStaff} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Employee Full Name *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="E.g., Mohammed Bilal"
                  value={newStaffName}
                  onChange={(e) => setNewStaffName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-xs font-bold text-slate-800 outline-none focus:border-primary focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  required
                  placeholder="E.g., 9668858858"
                  value={newStaffPhone}
                  onChange={(e) => setNewStaffPhone(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-xs font-mono font-bold text-slate-800 outline-none focus:border-primary focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Duty Role
                  </label>
                  <select
                    value={newStaffRole}
                    onChange={(e) => setNewStaffRole(e.target.value as any)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-3 text-xs font-bold text-slate-800 outline-none focus:border-primary cursor-pointer"
                  >
                    <option value="cashier">Counter Cashier</option>
                    <option value="helper">Kitchen Helper</option>
                    <option value="delivery">Delivery Partner</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Monthly Salary (INR) *
                  </label>
                  <input
                    type="number"
                    step="100"
                    placeholder="E.g., 20000"
                    value={newStaffSalary}
                    onChange={(e) => setNewStaffSalary(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-3 font-mono text-xs font-black text-slate-900 outline-none focus:border-primary focus:bg-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddStaff(false)}
                  className="rounded-xl border border-slate-200 px-5 py-2.5 text-xs font-bold text-slate-500 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-primary hover:bg-primary-dark px-6 py-2.5 text-xs font-black uppercase tracking-wider text-white shadow-lg shadow-primary/20 transition-all active:scale-95 cursor-pointer"
                >
                  Save Employee
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: ADD ADVANCE (SALAF) ─── */}
      {showAddAdvance && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 sm:p-7 shadow-2xl animate-scale-up border border-slate-100">
            <div className="flex items-center justify-between mb-5 pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Coins className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-display text-base font-black text-slate-800">Add Advance (Salaf)</h3>
                  <p className="text-[10px] font-bold text-slate-400">Record a salary payout advance</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddAdvance(false)}
                className="rounded-xl p-2 hover:bg-slate-100 text-slate-400 transition-all cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddAdvance} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Staff Member *
                </label>
                <select
                  required
                  value={advStaffId}
                  onChange={(e) => setAdvStaffId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-bold text-slate-800 outline-none focus:border-primary cursor-pointer"
                >
                  <option value="">-- Choose Employee --</option>
                  {staffList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.role}) {s.monthly_salary ? `— ₹${s.monthly_salary}/mo` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Advance Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={advDate}
                    onChange={(e) => setAdvDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 font-mono text-xs font-bold text-slate-800 outline-none focus:border-primary cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Amount (INR) *
                  </label>
                  <input
                    type="number"
                    step="50"
                    required
                    placeholder="E.g., 2000"
                    value={advAmount}
                    onChange={(e) => setAdvAmount(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 font-mono text-xs font-black text-slate-900 outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Notes / Reason
                </label>
                <textarea
                  rows={2}
                  placeholder="Optional details..."
                  value={advNotes}
                  onChange={(e) => setAdvNotes(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-xs font-semibold text-slate-800 outline-none focus:border-primary resize-none"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddAdvance(false)}
                  className="rounded-xl border border-slate-200 px-5 py-2.5 text-xs font-bold text-slate-500 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-primary hover:bg-primary-dark px-6 py-2.5 text-xs font-black uppercase tracking-wider text-white shadow-lg shadow-primary/20 transition-all active:scale-95 cursor-pointer"
                >
                  Save Advance
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: EDIT ADVANCE (SALAF) ─── */}
      {editingAdvance && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 sm:p-7 shadow-2xl animate-scale-up border border-slate-100">
            <div className="flex items-center justify-between mb-5 pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Edit2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-display text-base font-black text-slate-800">Edit Advance Entry</h3>
                  <p className="text-[10px] font-bold text-slate-400">Modify payout amount, date, or notes</p>
                </div>
              </div>
              <button
                onClick={() => setEditingAdvance(null)}
                className="rounded-xl p-2 hover:bg-slate-100 text-slate-400 transition-all cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateAdvance} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Staff Member *
                </label>
                <select
                  required
                  value={editAdvStaffId}
                  onChange={(e) => setEditAdvStaffId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-bold text-slate-800 outline-none focus:border-primary cursor-pointer"
                >
                  {staffList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.role}) {s.monthly_salary ? `— ₹${s.monthly_salary}/mo` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Advance Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={editAdvDate}
                    onChange={(e) => setEditAdvDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 font-mono text-xs font-bold text-slate-800 outline-none focus:border-primary cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Amount (INR) *
                  </label>
                  <input
                    type="number"
                    step="50"
                    required
                    placeholder="E.g., 2000"
                    value={editAdvAmount}
                    onChange={(e) => setEditAdvAmount(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 font-mono text-xs font-black text-slate-900 outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Notes / Reason
                </label>
                <textarea
                  rows={2}
                  placeholder="Optional details..."
                  value={editAdvNotes}
                  onChange={(e) => setEditAdvNotes(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-xs font-semibold text-slate-800 outline-none focus:border-primary resize-none"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingAdvance(null)}
                  className="rounded-xl border border-slate-200 px-5 py-2.5 text-xs font-bold text-slate-500 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-primary hover:bg-primary-dark px-6 py-2.5 text-xs font-black uppercase tracking-wider text-white shadow-lg shadow-primary/20 transition-all active:scale-95 cursor-pointer"
                >
                  Update Advance
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: DELETE ADVANCE CONFIRMATION ─── */}
      {deletingAdvance && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl animate-scale-up border border-slate-100 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-500 mb-4">
              <Trash2 className="h-7 w-7" />
            </div>
            <h3 className="font-display text-base font-black text-slate-800">Delete Advance Entry?</h3>
            <p className="text-xs font-semibold text-slate-400 mt-2">
              Are you sure you want to delete this advance of{' '}
              <strong className="text-slate-800 font-mono">₹{deletingAdvance.amount}</strong>? This will restore the employee&apos;s pending balance.
            </p>

            <div className="flex space-x-2.5 mt-6">
              <button
                type="button"
                onClick={() => setDeletingAdvance(null)}
                className="flex-1 rounded-xl border border-slate-200 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeletingAdv}
                onClick={handleDeleteAdvance}
                className="flex-1 rounded-xl bg-rose-600 hover:bg-rose-700 py-2.5 text-xs font-black uppercase tracking-wider text-white shadow-md shadow-rose-500/20 transition-all cursor-pointer disabled:opacity-60"
              >
                {isDeletingAdv ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: EMPLOYEE PROFILE & BREAKDOWN ─── */}
      {selectedStaff && (() => {
        const stats = staffPayrollStats.find((s) => s.member.id === selectedStaff.id);
        const memberAdvances = advances.filter((a) => a.staff_id === selectedStaff.id);

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in">
            <div className="w-full max-w-4xl rounded-3xl bg-white shadow-2xl animate-scale-up border border-slate-100 flex flex-col overflow-hidden max-h-[90vh]">
              {/* Modal Top Header */}
              <div className="flex items-center justify-between p-5 sm:p-6 border-b border-slate-100 bg-white shrink-0">
                <div className="flex items-center space-x-2.5">
                  <UserCircle className="h-5 w-5 text-primary" />
                  <h3 className="font-display text-sm font-black text-slate-800 uppercase tracking-wide">
                    Employee Profile & Payroll
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedStaff(null)}
                  className="rounded-xl p-2 hover:bg-slate-100 text-slate-400 transition-all cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Body Split */}
              <div className="grid grid-cols-1 lg:grid-cols-10 divide-y lg:divide-y-0 lg:divide-x divide-slate-100 flex-1 overflow-hidden">
                {/* Left Profile Sidebar (3 cols) */}
                <div className="lg:col-span-3 p-5 sm:p-6 flex flex-col space-y-5 overflow-y-auto bg-slate-50/50">
                  <div className="flex flex-col items-center text-center space-y-3 pb-6 border-b border-slate-200/50">
                    <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-primary to-primary-dark text-white font-display text-2xl font-black shadow-lg shadow-primary/20 uppercase">
                      {selectedStaff.name[0]}
                    </div>

                    {!isEditingStaff ? (
                      <>
                        <div className="space-y-1">
                          <h3 className="font-display text-base font-black text-slate-800 tracking-tight leading-snug">
                            {selectedStaff.name}
                          </h3>
                          <span className="inline-block rounded-full bg-sky-100 px-3 py-1 text-[9px] font-black uppercase text-primary tracking-widest">
                            {selectedStaff.role}
                          </span>
                        </div>

                        <div className="rounded-2xl bg-white border border-slate-200/60 p-3 w-full text-left space-y-1.5 shadow-sm">
                          <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">
                            Salary Package
                          </span>
                          <span className="text-base font-mono font-black text-slate-900 block">
                            {selectedStaff.monthly_salary ? `₹${selectedStaff.monthly_salary.toFixed(0)}` : 'Not Set'}
                          </span>
                          <span className="text-[10px] text-slate-500 font-semibold block">per calendar month</span>
                        </div>

                        <p className="text-[10px] font-bold text-slate-500 flex items-center justify-center">
                          <Calendar className="h-3.5 w-3.5 text-slate-400 mr-1" />
                          <span>Joined {selectedStaff.joining_date}</span>
                        </p>

                        <p className="text-[11px] font-mono font-bold text-slate-700 flex items-center justify-center">
                          <Phone className="h-3.5 w-3.5 text-primary mr-1" />
                          <span>{selectedStaff.phone}</span>
                        </p>

                        <button
                          onClick={() => {
                            setIsEditingStaff(true);
                            setEditStaffName(selectedStaff.name);
                            setEditStaffPhone(selectedStaff.phone);
                            setEditStaffRole(selectedStaff.role);
                            setEditStaffSalary(String(selectedStaff.monthly_salary || ''));
                          }}
                          className="w-full flex items-center justify-center space-x-1.5 rounded-xl border border-slate-200 hover:border-primary/30 hover:bg-primary/5 py-2.5 text-xs font-black uppercase tracking-wider text-slate-600 hover:text-primary transition-all cursor-pointer bg-white shadow-sm mt-2"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                          <span>Edit Details</span>
                        </button>
                      </>
                    ) : (
                      <form onSubmit={handleUpdateStaffDetails} className="w-full text-left space-y-3 pt-1">
                        <div>
                          <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                            Name
                          </label>
                          <input
                            type="text"
                            required
                            value={editStaffName}
                            onChange={(e) => setEditStaffName(e.target.value)}
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-primary"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                            Phone
                          </label>
                          <input
                            type="tel"
                            required
                            value={editStaffPhone}
                            onChange={(e) => setEditStaffPhone(e.target.value)}
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-mono font-bold text-slate-800 outline-none focus:border-primary"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                            Role
                          </label>
                          <select
                            value={editStaffRole}
                            onChange={(e) => setEditStaffRole(e.target.value as any)}
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-primary cursor-pointer"
                          >
                            <option value="cashier">Counter Cashier</option>
                            <option value="helper">Kitchen Helper</option>
                            <option value="delivery">Delivery Partner</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                            Monthly Salary (INR)
                          </label>
                          <input
                            type="number"
                            step="100"
                            value={editStaffSalary}
                            onChange={(e) => setEditStaffSalary(e.target.value)}
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 font-mono text-xs font-black text-slate-900 outline-none focus:border-primary"
                          />
                        </div>

                        <div className="flex items-center space-x-2 pt-2">
                          <button
                            type="button"
                            onClick={() => setIsEditingStaff(false)}
                            className="flex-1 rounded-xl border border-slate-200 py-2 text-[10px] font-black uppercase text-slate-500 hover:bg-slate-50 cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            className="flex-1 rounded-xl bg-primary hover:bg-primary-dark py-2 text-[10px] font-black uppercase text-white shadow-md shadow-primary/10 cursor-pointer"
                          >
                            Save
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                </div>

                {/* Right Workspace (7 cols) */}
                <div className="lg:col-span-7 p-5 sm:p-6 flex flex-col space-y-5 overflow-y-auto">
                  {/* Modal Tabs */}
                  <div className="flex border-b border-slate-100 space-x-6 text-xs font-bold text-slate-400 shrink-0">
                    <button
                      onClick={() => setModalTab('salary')}
                      className={`pb-2.5 transition-colors relative cursor-pointer ${
                        modalTab === 'salary' ? 'text-primary' : 'hover:text-slate-800'
                      }`}
                    >
                      <span className="flex items-center space-x-1.5">
                        <Banknote className="h-4 w-4" />
                        <span>Salary & Balance</span>
                      </span>
                      {modalTab === 'salary' && (
                        <span className="absolute bottom-0 inset-x-0 h-0.5 bg-primary rounded-full"></span>
                      )}
                    </button>

                    <button
                      onClick={() => setModalTab('attendance')}
                      className={`pb-2.5 transition-colors relative cursor-pointer ${
                        modalTab === 'attendance' ? 'text-primary' : 'hover:text-slate-800'
                      }`}
                    >
                      <span className="flex items-center space-x-1.5">
                        <Calendar className="h-4 w-4" />
                        <span>Attended Days ({stats?.daysPresent || 0})</span>
                      </span>
                      {modalTab === 'attendance' && (
                        <span className="absolute bottom-0 inset-x-0 h-0.5 bg-primary rounded-full"></span>
                      )}
                    </button>

                    <button
                      onClick={() => setModalTab('salaf')}
                      className={`pb-2.5 transition-colors relative cursor-pointer ${
                        modalTab === 'salaf' ? 'text-primary' : 'hover:text-slate-800'
                      }`}
                    >
                      <span className="flex items-center space-x-1.5">
                        <Coins className="h-4 w-4" />
                        <span>Advances ({memberAdvances.length})</span>
                      </span>
                      {modalTab === 'salaf' && (
                        <span className="absolute bottom-0 inset-x-0 h-0.5 bg-primary rounded-full"></span>
                      )}
                    </button>
                  </div>

                  {/* TAB: SALARY & PENDING BALANCE */}
                  {modalTab === 'salary' && stats && (
                    <div className="space-y-5">
                      {/* Formula Visual Breakdown Card */}
                      <div className="rounded-3xl bg-slate-50 border border-slate-200/70 p-5 space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                            Calculation for {selectedMonth} ({stats.daysInMonth} Days)
                          </span>
                          <span className="text-xs font-mono font-bold text-slate-600">
                            Rate: ₹{stats.perDaySalary.toFixed(2)}/day
                          </span>
                        </div>

                        {/* Equation Badges */}
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-center">
                          <div className="rounded-2xl bg-white p-3 border border-slate-200/50 shadow-sm">
                            <span className="text-[9px] font-black uppercase text-slate-400 block mb-1">Monthly Salary</span>
                            <span className="font-mono text-sm font-black text-slate-800">
                              ₹{stats.monthlySalary.toFixed(0)}
                            </span>
                          </div>

                          <div className="rounded-2xl bg-white p-3 border border-slate-200/50 shadow-sm">
                            <span className="text-[9px] font-black uppercase text-emerald-600 block mb-1">Days Come</span>
                            <span className="font-mono text-sm font-black text-emerald-600">
                              {stats.daysPresent} Days
                            </span>
                          </div>

                          <div className="rounded-2xl bg-white p-3 border border-slate-200/50 shadow-sm">
                            <span className="text-[9px] font-black uppercase text-blue-600 block mb-1">Earned</span>
                            <span className="font-mono text-sm font-black text-blue-600">
                              ₹{stats.earnedSalary.toFixed(0)}
                            </span>
                          </div>

                          <div className="rounded-2xl bg-white p-3 border border-slate-200/50 shadow-sm">
                            <span className="text-[9px] font-black uppercase text-rose-500 block mb-1">Advance Deducted</span>
                            <span className="font-mono text-sm font-black text-rose-500">
                              -₹{stats.totalAdvanceInMonth.toFixed(0)}
                            </span>
                          </div>
                        </div>

                        {/* Grand Pending Balance Banner */}
                        <div className="rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 p-5 text-white flex items-center justify-between shadow-lg shadow-emerald-500/10">
                          <div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-200 block">
                              Pending Balance to Pay
                            </span>
                            <span className="font-mono text-3xl font-black">
                              ₹{stats.pendingBalance.toFixed(2)}
                            </span>
                          </div>
                          <span className="text-xs font-bold bg-white/20 px-3 py-1.5 rounded-xl backdrop-blur-sm">
                            {stats.daysPresent} of {stats.daysInMonth} days worked
                          </span>
                        </div>
                      </div>

                      {/* Explanation note */}
                      <p className="text-[11px] font-semibold text-slate-400 leading-relaxed">
                        Per request: The employee pending balance reflects exactly the days they came to work (e.g., {stats.daysPresent} days × daily rate) minus any advances taken during this period.
                      </p>
                    </div>
                  )}

                  {/* TAB: ATTENDANCE DAYS */}
                  {modalTab === 'attendance' && stats && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                          Attended Dates in {selectedMonth}
                        </span>
                        <span className="text-xs font-mono font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-xl">
                          Total: {stats.daysPresent} Days Come
                        </span>
                      </div>

                      {stats.attendedDates.length === 0 ? (
                        <div className="py-12 text-center text-slate-400 text-xs font-bold border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                          No attendance marked as &quot;Come&quot; in this month yet.
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-[300px] overflow-y-auto pr-1">
                          {stats.attendedDates.map((dateStr) => (
                            <div
                              key={dateStr}
                              className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-2.5 flex items-center justify-between text-xs font-mono font-bold text-emerald-800"
                            >
                              <span>{dateStr}</span>
                              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB: ADVANCES */}
                  {modalTab === 'salaf' && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                          Advances Ledger
                        </span>
                        <span className="text-xs font-mono font-bold text-rose-600 bg-rose-50 px-2.5 py-1 rounded-xl">
                          Total: ₹{memberAdvances.reduce((s, a) => s + (Number(a.amount) || 0), 0).toFixed(2)}
                        </span>
                      </div>

                      {memberAdvances.length === 0 ? (
                        <div className="py-12 text-center text-slate-400 text-xs font-bold border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                          No advances taken by this staff member.
                        </div>
                      ) : (
                        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                          {memberAdvances.map((adv) => (
                            <div
                              key={adv.id}
                              className="rounded-2xl border border-slate-100 p-3.5 bg-slate-50 flex items-center justify-between group hover:bg-slate-100/60 transition-colors"
                            >
                              <div>
                                <span className="text-xs font-black text-slate-800 block">
                                  {adv.notes || 'Cash Advance'}
                                </span>
                                <span className="text-[10px] font-mono font-bold text-slate-400">{adv.date}</span>
                              </div>
                              <div className="flex items-center space-x-3">
                                <span className="font-mono text-sm font-black text-rose-600">
                                  ₹{Number(adv.amount).toFixed(2)}
                                </span>
                                <div className="flex items-center space-x-1 pl-2 border-l border-slate-200">
                                  <button
                                    onClick={() => handleStartEditAdvance(adv)}
                                    className="p-1 rounded-lg text-slate-400 hover:text-primary hover:bg-white transition-all cursor-pointer"
                                    title="Edit Advance"
                                  >
                                    <Edit2 className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    onClick={() => setDeletingAdvance(adv)}
                                    className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-white transition-all cursor-pointer"
                                    title="Delete Advance"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ─── MODAL: CHANGE PIN ─── */}
      {showChangePassword && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl animate-scale-up border border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-sm font-black text-slate-800 uppercase tracking-wide flex items-center space-x-2">
                <ShieldCheck className="h-4.5 w-4.5 text-primary" />
                <span>Change Hub PIN</span>
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
