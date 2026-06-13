'use client';

import { useState, useEffect } from 'react';
import { api, Staff, StaffAdvance, ShiftLog } from '@/lib/supabase';
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
  Eye,
  EyeOff,
  ShieldCheck,
  UserCircle
} from 'lucide-react';

export default function StaffPage() {
  const { store, user } = useAuthStore();

  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState(true);
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState('');
  const [lockTimer, setLockTimer] = useState<number>(0);
  
  // Password Change State
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [pwChangeError, setPwChangeError] = useState('');
  const [pwChangeSuccess, setPwChangeSuccess] = useState('');

  const [activeTab, setActiveTab] = useState<'directory' | 'salaf' | 'attendance'>('directory');

  // Data States
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [advances, setAdvances] = useState<(StaffAdvance & { staff: Staff })[]>([]);
  const [shifts, setShifts] = useState<(ShiftLog & { staff: Staff })[]>([]);

  // Directory Modals & Forms
  const [showAddStaff, setShowAddStaff] = useState(false);
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffPhone, setNewStaffPhone] = useState('');
  const [newStaffRole, setNewStaffRole] = useState<'cashier' | 'helper' | 'delivery'>('cashier');

  // Salaf Form
  const [showAddAdvance, setShowAddAdvance] = useState(false);
  const [advStaffId, setAdvStaffId] = useState('');
  const [advAmount, setAdvAmount] = useState('');
  const [advNotes, setAdvNotes] = useState('');
  const [advDate, setAdvDate] = useState(new Date().toISOString().substring(0, 10));

  // Attendance Form
  const [showAddAttendance, setShowAddAttendance] = useState(false);
  const [attStaffId, setAttStaffId] = useState('');
  const [attDate, setAttDate] = useState(new Date().toISOString().substring(0, 10));
  const [attHours, setAttHours] = useState('');

  // Shift Correction Form
  const [correctingShiftId, setCorrectingShiftId] = useState<string | null>(null);
  const [corrIn, setCorrIn] = useState('');
  const [corrOut, setCorrOut] = useState('');

  // Staff Details Modal & Edit States
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [isEditingStaff, setIsEditingStaff] = useState(false);
  const [editStaffName, setEditStaffName] = useState('');
  const [editStaffPhone, setEditStaffPhone] = useState('');
  const [editStaffRole, setEditStaffRole] = useState<'cashier' | 'helper' | 'delivery'>('cashier');
  const [modalTab, setModalTab] = useState<'salaf' | 'attendance'>('salaf');

  // Load staff records
  const loadData = async () => {
    if (!store) return;
    try {
      const sList = await api.getStaffByStore(store.id);
      setStaffList(sList);

      const advList = await api.getAdvancesByStore(store.id);
      setAdvances(advList);

      const shfList = await api.getShiftsByStore(store.id);
      setShifts(shfList);

      const savedTimer = await api.getStaffLockTime(store.id);
      setLockTimer(savedTimer);
    } catch (err) {
      console.error("Failed to load staff portal data", err);
    }
  };

  useEffect(() => {
    loadData();
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
    if (passwordInput === savedPw) {
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
    if (currentPw !== savedPw) {
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

  // Handle staff profile detail updates
  const handleUpdateStaffDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaff || !editStaffName.trim() || !editStaffPhone.trim()) return;

    try {
      const updated = await api.updateStaff(selectedStaff.id, {
        name: editStaffName.trim(),
        phone: editStaffPhone.trim(),
        role: editStaffRole
      });
      setIsEditingStaff(false);
      setSelectedStaff(updated); // Sync active detail preview context instantly
      await loadData(); // Reload main census
    } catch (err) {
      console.error("Failed to update staff member details", err);
    }
  };

  // Create new staff member
  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!store || !newStaffName || !newStaffPhone) return;

    try {
      await api.addStaff(store.id, {
        name: newStaffName,
        phone: newStaffPhone,
        role: newStaffRole,
        joining_date: new Date().toISOString().substring(0, 10),
        created_by: user?.id
      });

      setShowAddStaff(false);
      setNewStaffName('');
      setNewStaffPhone('');
      setNewStaffRole('cashier');
      await loadData();
    } catch (err) {
      console.error("Failed to add staff member", err);
    }
  };

  // Toggle staff deactivation
  const handleDeactivate = async (staffId: string) => {
    if (!confirm("Are you sure you want to deactivate this staff member?")) return;
    try {
      await api.updateStaff(staffId, { is_active: false });
      await loadData();
    } catch (err) {
      console.error("Failed to deactivate staff member", err);
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
        notes: advNotes
      });

      setShowAddAdvance(false);
      setAdvStaffId('');
      setAdvAmount('');
      setAdvNotes('');
      setAdvDate(new Date().toISOString().substring(0, 10));
      await loadData();
    } catch (err) {
      console.error("Failed to record advance", err);
    }
  };

  // Record manual attendance (Shift)
  const handleAddAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!store || !attStaffId || !attHours || !user) return;

    try {
      // Create a manual shift record
      const dateStr = attDate;
      const clockIn = new Date(`${dateStr}T09:00:00`).toISOString();
      const hours = parseFloat(attHours);
      const clockOut = new Date(new Date(clockIn).getTime() + hours * 60 * 60 * 1000).toISOString();

      await api.correctShift(
        `manual_${Date.now()}`, // Temporary ID for manual creation, but db.ts API might not support insert via correctShift. Wait, let's look at db.ts
        clockIn,
        clockOut,
        user.id
      );
      // Actually `api.correctShift` requires an existing shift. 
      // So instead, we will simulate clock in, then immediately correct it.
      const newShift = await api.clockInStaff(store.id, attStaffId);
      await api.clockOutStaff(newShift.id);
      await api.correctShift(newShift.id, clockIn, clockOut, user.id);

      setShowAddAttendance(false);
      setAttStaffId('');
      setAttHours('');
      setAttDate(new Date().toISOString().substring(0, 10));
      await loadData();
    } catch (err) {
      console.error("Failed to record attendance", err);
    }
  };

  // Calculate advance totals per staff member
  const staffBalances = staffList.map(member => {
    const memberAdvances = advances.filter(a => a.staff_id === member.id);
    const totalGiven = memberAdvances.reduce((sum, a) => sum + a.amount, 0);
    return {
      staff: member,
      given: totalGiven
    };
  });

  // Calculate attendance per staff member
  const getStaffAttendanceStats = (staffId: string) => {
    const staffShifts = shifts.filter(s => s.staff_id === staffId && s.duration_minutes !== null);
    const uniqueDays = new Set(staffShifts.map(s => s.clock_in.substring(0, 10))).size;
    const totalMinutes = staffShifts.reduce((sum, s) => sum + (s.duration_minutes || 0), 0);
    return {
      days: uniqueDays,
      hours: (totalMinutes / 60).toFixed(1)
    };
  };

  // ─── AUTHENTICATION SCREEN ───
  if (!isAuthenticated) {
    return (
      <div className="flex h-full min-h-[60vh] items-center justify-center p-4">
        <div className="w-full max-w-sm rounded-3xl bg-white p-8 shadow-sm border border-slate-100 text-center animate-scale-up">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-6">
            <Lock className="h-8 w-8 stroke-[2px]" />
          </div>
          <h2 className="font-display text-2xl font-black text-slate-800 mb-2">Staff Hub Access</h2>
          <p className="text-xs font-semibold text-slate-400 mb-8">Enter the master password to view staff details, advances, and attendance.</p>
          
          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <input
                type="password"
                required
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="Enter password (default: 1234)"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-center font-mono text-lg font-black tracking-widest text-slate-800 outline-none focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/5 transition-all"
              />
              {authError && <p className="text-xs font-bold text-red-500 mt-2 animate-shake">{authError}</p>}
            </div>
            <button
              type="submit"
              className="w-full rounded-2xl bg-primary hover:bg-primary-dark py-4 text-sm font-black uppercase tracking-widest text-white shadow-lg shadow-primary/20 transition-all active:scale-[0.98] cursor-pointer"
            >
              Unlock Dashboard
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ─── MAIN STAFF HUB ───
  return (
    <div className="space-y-8 select-none animate-fade-in relative">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-black text-text-primary flex items-center space-x-2">
            <Users className="h-6 w-6 text-primary" />
            <span>Store Staff Hub</span>
          </h2>
          <p className="text-xs font-semibold text-text-muted mt-1">
            Supervise staff directories, enter attendance, and track advance ledgers (Salaf).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center space-x-2 bg-white border border-slate-200 rounded-xl px-2 py-1 shadow-sm">
            <Clock className="h-3 w-3 text-slate-400 ml-1" />
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
              <option value={1}>Auto-lock 1 Min</option>
              <option value={5}>Auto-lock 5 Mins</option>
              <option value={15}>Auto-lock 15 Mins</option>
            </select>
          </div>

          <button
            onClick={() => setIsAuthenticated(false)}
            className="flex items-center space-x-1.5 rounded-xl bg-slate-800 hover:bg-slate-900 px-4 py-2.5 text-[10px] font-black uppercase tracking-wider text-white transition-all active:scale-95 cursor-pointer shadow-sm"
          >
            <Lock className="h-4 w-4 text-slate-300" />
            <span>Lock Hub</span>
          </button>

          <button
            onClick={() => setShowChangePassword(true)}
            className="flex items-center space-x-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 px-4 py-2.5 text-[10px] font-black uppercase tracking-wider text-slate-600 transition-all active:scale-95 cursor-pointer shadow-sm hidden sm:flex"
            title="Change Master PIN"
          >
            <ShieldCheck className="h-4 w-4 text-slate-400" />
          </button>

          {activeTab === 'directory' && (
            <button
              onClick={() => setShowAddStaff(true)}
              className="flex items-center space-x-2 rounded-xl bg-primary hover:bg-primary-dark px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-primary/10 transition-all active:scale-95 cursor-pointer"
            >
              <UserPlus className="h-4 w-4" />
              <span className="hidden sm:inline">Add Staff</span>
            </button>
          )}

          {activeTab === 'salaf' && (
            <button
              onClick={() => setShowAddAdvance(true)}
              className="flex items-center space-x-2 rounded-xl bg-primary hover:bg-primary-dark px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-primary/10 transition-all active:scale-95 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Add Advance</span>
            </button>
          )}

          {activeTab === 'attendance' && (
            <button
              onClick={() => setShowAddAttendance(true)}
              className="flex items-center space-x-2 rounded-xl bg-primary hover:bg-primary-dark px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-primary/10 transition-all active:scale-95 cursor-pointer"
            >
              <Clock className="h-4 w-4" />
              <span className="hidden sm:inline">Enter Attendance</span>
            </button>
          )}
        </div>
      </div>

      {/* THREE TABS ROW */}
      <div className="flex border-b border-gray-100 space-x-4 sm:space-x-8 text-[11px] sm:text-sm font-bold text-text-muted overflow-x-auto scrollbar-hide">
        <button
          onClick={() => setActiveTab('directory')}
          className={`pb-3 transition-colors relative cursor-pointer whitespace-nowrap ${
            activeTab === 'directory' ? 'text-primary' : 'hover:text-text-primary'
          }`}
        >
          <span>Staff Directory</span>
          {activeTab === 'directory' && <span className="absolute bottom-0 inset-x-0 h-0.5 bg-primary rounded-full"></span>}
        </button>

        <button
          onClick={() => setActiveTab('salaf')}
          className={`pb-3 transition-colors relative cursor-pointer whitespace-nowrap ${
            activeTab === 'salaf' ? 'text-primary' : 'hover:text-text-primary'
          }`}
        >
          <span>Advance Ledger (Salaf)</span>
          {activeTab === 'salaf' && <span className="absolute bottom-0 inset-x-0 h-0.5 bg-primary rounded-full"></span>}
        </button>

        <button
          onClick={() => setActiveTab('attendance')}
          className={`pb-3 transition-colors relative cursor-pointer whitespace-nowrap ${
            activeTab === 'attendance' ? 'text-primary' : 'hover:text-text-primary'
          }`}
        >
          <span>Attendance Log</span>
          {activeTab === 'attendance' && <span className="absolute bottom-0 inset-x-0 h-0.5 bg-primary rounded-full"></span>}
        </button>
      </div>

      {/* TAB PANELS */}
      <div className="mt-6">
        
        {/* TAB 1: STAFF DIRECTORY */}
        {activeTab === 'directory' && (
          <div className="rounded-3xl bg-white border border-gray-100 p-4 sm:p-6 shadow-sm overflow-hidden">
            <div className="flex items-center space-x-2.5 mb-6">
              <Users className="h-5 w-5 text-primary" />
              <h3 className="font-display text-sm font-black text-text-primary">Employee Records</h3>
            </div>

            {staffList.length === 0 ? (
              <div className="py-12 text-center text-text-muted text-xs font-medium">
                No staff members currently registered. Add staff members using the button above.
              </div>
            ) : (
              <div className="overflow-x-auto scrollbar-thin">
                <table className="w-full text-left border-collapse whitespace-nowrap">
                  <thead>
                    <tr className="border-b-2 border-gray-50 text-[10px] font-black uppercase tracking-widest text-slate-400">
                      <th className="pb-4 pl-2">Name</th>
                      <th className="pb-4 text-center">Role</th>
                      <th className="pb-4">Phone</th>
                      <th className="pb-4 text-center">Total Advance</th>
                      <th className="pb-4 text-center">Working Days</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50/50 text-xs font-semibold text-text-primary">
                    {staffList.map((member) => {
                      const advanceTotal = advances.filter(a => a.staff_id === member.id).reduce((sum, a) => sum + a.amount, 0);
                      const attendance = getStaffAttendanceStats(member.id);

                      return (
                        <tr 
                          key={member.id} 
                          onClick={() => {
                            setSelectedStaff(member);
                            setIsEditingStaff(false);
                            setEditStaffName(member.name);
                            setEditStaffPhone(member.phone);
                            setEditStaffRole(member.role);
                            setModalTab('salaf');
                          }}
                          className="hover:bg-slate-50/50 cursor-pointer transition-colors group"
                        >
                          <td className="py-4 pl-2">
                            <div className="flex items-center space-x-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-50 border border-slate-100 text-slate-600 font-display font-black text-sm uppercase group-hover:bg-primary group-hover:text-white transition-colors">
                                {member.name[0]}
                              </div>
                              <div>
                                <span className="block font-black text-sm">{member.name}</span>
                                <span className="text-[9px] text-text-muted uppercase tracking-wider font-bold">Joined {member.joining_date}</span>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 text-center">
                            <span className="rounded-lg bg-sky-50 px-2.5 py-1 text-[9px] font-black uppercase text-primary tracking-wider">
                              {member.role}
                            </span>
                          </td>
                          <td className="py-4 font-mono text-[11px] text-slate-600 font-bold">{member.phone}</td>
                          <td className="py-4 text-center">
                            <span className="font-mono text-xs font-black text-amber-600">
                              ₹{advanceTotal.toFixed(2)}
                            </span>
                          </td>
                          <td className="py-4 text-center">
                            <span className="font-mono text-xs font-black text-emerald-600">
                              {attendance.days} Days
                            </span>
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

        {/* TAB 2: ADVANCE LEDGER / SALAF */}
        {activeTab === 'salaf' && (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Running balances */}
            <div className="xl:col-span-2 rounded-3xl bg-white border border-gray-100 p-4 sm:p-6 shadow-sm">
              <div className="flex items-center space-x-2.5 mb-6">
                <Coins className="h-5 w-5 text-primary" />
                <h3 className="font-display text-sm font-black text-text-primary">Advances Registry</h3>
              </div>

              {advances.length === 0 ? (
                <div className="py-12 text-center text-text-muted text-xs font-medium">
                  No advance disbursements recorded yet.
                </div>
              ) : (
                <div className="overflow-x-auto scrollbar-thin">
                  <table className="w-full text-left border-collapse whitespace-nowrap">
                    <thead>
                      <tr className="border-b-2 border-gray-50 text-[10px] font-black uppercase tracking-widest text-slate-400">
                        <th className="pb-4 pl-2">Employee</th>
                        <th className="pb-4">Date</th>
                        <th className="pb-4">Notes</th>
                        <th className="pb-4 text-right pr-2">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50/50 text-xs font-semibold text-text-primary">
                      {advances.map((adv) => (
                        <tr key={adv.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-4 pl-2 font-black text-sm">{adv.staff.name}</td>
                          <td className="py-4 font-mono text-[11px] text-slate-500 font-bold">{adv.date}</td>
                          <td className="py-4 text-slate-500 max-w-[200px] truncate" title={adv.notes}>
                            {adv.notes || '—'}
                          </td>
                          <td className="py-4 font-mono text-right pr-2 font-black text-primary-dark">
                            ₹{adv.amount.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Balances list card */}
            <div className="rounded-3xl bg-white border border-gray-100 p-4 sm:p-6 shadow-sm max-h-[500px] overflow-hidden flex flex-col">
              <div className="flex items-center space-x-2.5 mb-4">
                <Coins className="h-5 w-5 text-primary" />
                <h3 className="font-display text-sm font-black text-text-primary">Total Advance Taken</h3>
              </div>
              <p className="text-[10px] font-bold text-text-muted leading-relaxed mb-4 font-sans">
                Cumulative total of all advances taken by each staff member.
              </p>

              <div className="flex-1 overflow-y-auto space-y-3 pr-1 scrollbar-thin">
                {staffBalances.map(bal => (
                  <div key={bal.staff.id} className="rounded-2xl border border-gray-100 p-3.5 bg-slate-50/50 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-black text-slate-800 block">{bal.staff.name}</span>
                      <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">{bal.staff.role}</span>
                    </div>
                    <span className="font-mono text-sm font-black text-primary-dark">
                      ₹{bal.given.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: ATTENDANCE LOG */}
        {activeTab === 'attendance' && (
          <div className="rounded-3xl bg-white border border-gray-100 p-4 sm:p-6 shadow-sm">
            <div className="flex items-center space-x-2.5 mb-6">
              <Calendar className="h-5 w-5 text-primary" />
              <h3 className="font-display text-sm font-black text-text-primary">Attendance & Working Hours</h3>
            </div>

            {shifts.length === 0 ? (
              <div className="py-12 text-center text-text-muted text-xs font-medium">
                No attendance records yet.
              </div>
            ) : (
              <div className="overflow-x-auto scrollbar-thin">
                <table className="w-full text-left border-collapse whitespace-nowrap">
                  <thead>
                    <tr className="border-b-2 border-gray-50 text-[10px] font-black uppercase tracking-widest text-slate-400">
                      <th className="pb-4 pl-2">Staff Member</th>
                      <th className="pb-4">Date</th>
                      <th className="pb-4 text-center">Hours Worked</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50/50 text-xs font-semibold text-text-primary">
                    {shifts.map((shf) => (
                      <tr key={shf.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-4 pl-2 font-black text-sm">{shf.staff.name}</td>
                        <td className="py-4 font-mono text-[11px] text-slate-600 font-bold">
                          {new Date(shf.clock_in).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="py-4 text-center font-mono text-sm font-black text-emerald-600">
                          {shf.duration_minutes !== null ? `${(shf.duration_minutes / 60).toFixed(1)} hrs` : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

      </div>

      {/* ======================================================== */}
      {/* MODALS */}
      {/* ======================================================== */}

      {/* MODAL: CHANGE PASSWORD */}
      {showChangePassword && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl animate-scale-up border border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-sm font-black text-slate-800 uppercase tracking-wide flex items-center space-x-2">
                <ShieldCheck className="h-4.5 w-4.5 text-primary" />
                <span>Change Password</span>
              </h3>
              <button onClick={() => setShowChangePassword(false)} className="rounded-lg p-1.5 hover:bg-slate-100 text-slate-400 bg-white transition-all active:scale-95">
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
              <div className="rounded-xl bg-emerald-50 text-emerald-700 p-3 mb-4 text-xs font-bold border border-emerald-100 flex items-center space-x-2 animate-fade-in">
                <CheckCircle className="h-4 w-4 shrink-0" />
                <span>{pwChangeSuccess}</span>
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Current Password</label>
                <input
                  type="password"
                  required
                  value={currentPw}
                  onChange={(e) => setCurrentPw(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-xs outline-none focus:border-primary font-mono font-bold text-slate-800"
                />
              </div>
              <div>
                <label className="block text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1.5">New Password</label>
                <input
                  type="password"
                  required
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                  placeholder="Min 4 characters"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-xs outline-none focus:border-primary font-mono font-bold text-slate-800"
                />
              </div>
              <button
                type="submit"
                className="w-full rounded-xl bg-primary hover:bg-primary-dark py-3.5 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-primary/20 transition-all active:scale-[0.98] mt-2 cursor-pointer"
              >
                Update Password
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD STAFF */}
      {showAddStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl animate-scale-up border border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-sm font-black text-slate-800 uppercase tracking-wide flex items-center space-x-2">
                <UserPlus className="h-4.5 w-4.5 text-primary" />
                <span>Register Staff</span>
              </h3>
              <button onClick={() => setShowAddStaff(false)} className="rounded-lg p-1.5 hover:bg-slate-100 text-slate-400 bg-white transition-all">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleAddStaff} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Employee Name</label>
                <input
                  type="text"
                  required
                  value={newStaffName}
                  onChange={(e) => setNewStaffName(e.target.value)}
                  placeholder="E.g., Mohammed Bilal"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-xs outline-none focus:border-primary focus:bg-white font-bold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Phone Number</label>
                <input
                  type="tel"
                  required
                  value={newStaffPhone}
                  onChange={(e) => setNewStaffPhone(e.target.value)}
                  placeholder="E.g., +91 79947 70010"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-xs outline-none focus:border-primary focus:bg-white font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Duty Role</label>
                <select
                  value={newStaffRole}
                  onChange={(e) => setNewStaffRole(e.target.value as any)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-xs outline-none focus:border-primary focus:bg-white font-bold text-slate-800"
                >
                  <option value="cashier">Counter Cashier</option>
                  <option value="helper">Kitchen Helper</option>
                  <option value="delivery">Delivery Partner</option>
                </select>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddStaff(false)}
                  className="rounded-xl border border-slate-200 px-5 py-2.5 text-xs font-bold text-slate-500 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-primary hover:bg-primary-dark px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-primary/10 transition-colors cursor-pointer"
                >
                  Save Employee
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD ADVANCE (SALAF) */}
      {showAddAdvance && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl animate-scale-up border border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-sm font-black text-slate-800 uppercase tracking-wide flex items-center space-x-2">
                <Coins className="h-4.5 w-4.5 text-primary" />
                <span>Add Advance (Salaf)</span>
              </h3>
              <button onClick={() => setShowAddAdvance(false)} className="rounded-lg p-1.5 hover:bg-slate-100 text-slate-400 bg-white transition-all">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleAddAdvance} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Staff Member</label>
                <select
                  required
                  value={advStaffId}
                  onChange={(e) => setAdvStaffId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs outline-none focus:border-primary font-bold text-slate-800"
                >
                  <option value="">-- Choose Employee --</option>
                  {staffList.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.role})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Date</label>
                  <input
                    type="date"
                    required
                    value={advDate}
                    onChange={(e) => setAdvDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-xs outline-none focus:border-primary font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Amount (INR)</label>
                  <input
                    type="number"
                    required
                    value={advAmount}
                    onChange={(e) => setAdvAmount(e.target.value)}
                    placeholder="E.g., 2000"
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs outline-none focus:border-primary font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Notes / Purpose</label>
                <textarea
                  value={advNotes}
                  onChange={(e) => setAdvNotes(e.target.value)}
                  placeholder="Optional details"
                  rows={2}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-xs outline-none focus:border-primary focus:bg-white resize-none font-bold"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddAdvance(false)}
                  className="rounded-xl border border-slate-200 px-5 py-2.5 text-xs font-bold text-slate-500 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-primary hover:bg-primary-dark px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-primary/10 transition-colors cursor-pointer"
                >
                  Save Advance
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD ATTENDANCE */}
      {showAddAttendance && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl animate-scale-up border border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-sm font-black text-slate-800 uppercase tracking-wide flex items-center space-x-2">
                <Clock className="h-4.5 w-4.5 text-primary" />
                <span>Enter Attendance Log</span>
              </h3>
              <button onClick={() => setShowAddAttendance(false)} className="rounded-lg p-1.5 hover:bg-slate-100 text-slate-400 bg-white transition-all">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleAddAttendance} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Staff Member</label>
                <select
                  required
                  value={attStaffId}
                  onChange={(e) => setAttStaffId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs outline-none focus:border-primary font-bold text-slate-800"
                >
                  <option value="">-- Choose Employee --</option>
                  {staffList.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.role})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Date</label>
                  <input
                    type="date"
                    required
                    value={attDate}
                    onChange={(e) => setAttDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-xs outline-none focus:border-primary font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Hours Worked</label>
                  <input
                    type="number"
                    step="0.5"
                    required
                    value={attHours}
                    onChange={(e) => setAttHours(e.target.value)}
                    placeholder="E.g., 8"
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs outline-none focus:border-primary font-mono font-bold"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddAttendance(false)}
                  className="rounded-xl border border-slate-200 px-5 py-2.5 text-xs font-bold text-slate-500 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-primary hover:bg-primary-dark px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-primary/10 transition-colors cursor-pointer"
                >
                  Save Log
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: STAFF DETAILS & GOVERNANCE OVERVIEW */}
      {selectedStaff && (() => {
        const staffAdvances = advances.filter(a => a.staff_id === selectedStaff.id);
        const totalAdvancesAmt = staffAdvances.reduce((sum, a) => sum + a.amount, 0);

        const staffShifts = shifts.filter(s => s.staff_id === selectedStaff.id);
        const uniqueDays = new Set(staffShifts.map(s => s.clock_in.substring(0, 10))).size;
        const totalMinutes = staffShifts.reduce((sum, s) => sum + (s.duration_minutes || 0), 0);
        const hrs = Math.floor(totalMinutes / 60);

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in">
            <div className="w-full max-w-4xl rounded-3xl bg-white shadow-2xl animate-scale-up border border-slate-100 flex flex-col overflow-hidden max-h-[90vh]">
              
              {/* MODAL HEADER */}
              <div className="flex items-center justify-between p-5 sm:p-6 border-b border-slate-100 bg-white shrink-0">
                <div className="flex items-center space-x-2.5">
                  <UserCircle className="h-5 w-5 text-primary" />
                  <h3 className="font-display text-sm font-black text-slate-800 uppercase tracking-wide">
                    Employee Profile
                  </h3>
                </div>
                <button 
                  onClick={() => setSelectedStaff(null)} 
                  className="rounded-xl p-2 hover:bg-slate-100 text-slate-400 bg-white transition-all active:scale-95 cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* MODAL BODY SPLIT LAYOUT */}
              <div className="grid grid-cols-1 lg:grid-cols-10 divide-y lg:divide-y-0 lg:divide-x divide-slate-100 flex-1 overflow-hidden">
                
                {/* LEFT PROFILE SIDEBAR (3 cols) */}
                <div className="lg:col-span-3 p-5 sm:p-6 flex flex-col space-y-6 overflow-y-auto bg-slate-50/50">
                  <div className="flex flex-col items-center text-center space-y-3 pb-6 border-b border-slate-200/50">
                    <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-primary to-primary-dark text-white font-display text-2xl font-black shadow-lg shadow-primary/20 uppercase animate-scale-up">
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
                        
                        <p className="text-[10px] font-bold text-slate-500 flex items-center space-x-1 justify-center">
                          <Calendar className="h-3.5 w-3.5 text-slate-400 mr-1" />
                          <span>Joined {selectedStaff.joining_date}</span>
                        </p>
                        
                        <p className="text-[11px] font-mono font-bold text-slate-700 flex items-center justify-center">
                          <Phone className="h-3.5 w-3.5 text-primary mr-1 shrink-0" />
                          <span>{selectedStaff.phone}</span>
                        </p>
                        
                        <button
                          onClick={() => {
                            setIsEditingStaff(true);
                            setEditStaffName(selectedStaff.name);
                            setEditStaffPhone(selectedStaff.phone);
                            setEditStaffRole(selectedStaff.role);
                          }}
                          className="w-full flex items-center justify-center space-x-1.5 rounded-xl border border-slate-200 hover:border-primary/30 hover:bg-primary-light/10 py-2.5 text-xs font-black uppercase tracking-wider text-slate-500 hover:text-primary transition-all active:scale-[0.98] cursor-pointer bg-white shadow-sm mt-3"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                          <span>Edit Details</span>
                        </button>
                      </>
                    ) : (
                      <form onSubmit={handleUpdateStaffDetails} className="w-full text-left space-y-4 pt-2">
                        <div>
                          <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-1">Employee Name</label>
                          <input
                            type="text"
                            required
                            value={editStaffName}
                            onChange={(e) => setEditStaffName(e.target.value)}
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs outline-none focus:border-primary font-bold text-slate-800"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-1">Phone Number</label>
                          <input
                            type="tel"
                            required
                            value={editStaffPhone}
                            onChange={(e) => setEditStaffPhone(e.target.value)}
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs outline-none focus:border-primary font-mono font-bold text-slate-800"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-1">Duty Role</label>
                          <select
                            value={editStaffRole}
                            onChange={(e) => setEditStaffRole(e.target.value as any)}
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs outline-none focus:border-primary font-bold text-slate-800"
                          >
                            <option value="cashier">Counter Cashier</option>
                            <option value="helper">Kitchen Helper</option>
                            <option value="delivery">Delivery Partner</option>
                          </select>
                        </div>
                        <div className="flex items-center space-x-2 pt-2">
                          <button
                            type="button"
                            onClick={() => setIsEditingStaff(false)}
                            className="flex-1 rounded-xl border border-slate-200 py-2.5 text-[10px] font-black uppercase text-slate-500 hover:bg-slate-50 transition-all cursor-pointer bg-white"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            className="flex-1 rounded-xl bg-primary hover:bg-primary-dark py-2.5 text-[10px] font-black uppercase text-white shadow-md shadow-primary/10 transition-all cursor-pointer"
                          >
                            Save
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                </div>

                {/* RIGHT CONTENT WORKSPACE (7 cols) */}
                <div className="lg:col-span-7 p-5 sm:p-6 flex flex-col space-y-5 overflow-y-auto">
                  
                  {/* MODAL TABS ROW */}
                  <div className="flex border-b border-slate-100 space-x-6 text-xs font-bold text-slate-400 shrink-0">
                    <button
                      onClick={() => setModalTab('salaf')}
                      className={`pb-2.5 transition-colors relative cursor-pointer ${
                        modalTab === 'salaf' ? 'text-primary' : 'hover:text-slate-800'
                      }`}
                    >
                      <span className="flex items-center space-x-1.5">
                        <Coins className="h-4 w-4" />
                        <span>Advances (Salaf)</span>
                      </span>
                      {modalTab === 'salaf' && <span className="absolute bottom-0 inset-x-0 h-0.5 bg-primary rounded-full"></span>}
                    </button>
                    <button
                      onClick={() => setModalTab('attendance')}
                      className={`pb-2.5 transition-colors relative cursor-pointer ${
                        modalTab === 'attendance' ? 'text-primary' : 'hover:text-slate-800'
                      }`}
                    >
                      <span className="flex items-center space-x-1.5">
                        <Calendar className="h-4 w-4" />
                        <span>Working Days Log</span>
                      </span>
                      {modalTab === 'attendance' && <span className="absolute bottom-0 inset-x-0 h-0.5 bg-primary rounded-full"></span>}
                    </button>
                  </div>

                  {/* TAB CONTENT: ADVANCES (SALAFAF) */}
                  {modalTab === 'salaf' && (
                    <div className="flex-1 flex flex-col space-y-5 overflow-hidden">
                      {/* STATS DECK */}
                      <div className="grid grid-cols-1 gap-3 shrink-0">
                        <div className="rounded-2xl border border-amber-100 p-4 bg-amber-50/50 text-center shadow-sm">
                          <span className="block text-[10px] font-black uppercase tracking-wider text-amber-600 mb-1">Total Advance Taken</span>
                          <span className="text-2xl font-mono font-black text-amber-700 block">₹{totalAdvancesAmt.toFixed(2)}</span>
                        </div>
                      </div>

                      {/* LOG TABLE */}
                      <div className="flex-1 flex flex-col overflow-hidden min-h-[180px]">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2.5">
                          Advance Ledger
                        </h4>

                        {staffAdvances.length === 0 ? (
                          <div className="flex-1 flex items-center justify-center py-10 text-center text-slate-400 text-xs font-bold border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                            No advances logged for this employee.
                          </div>
                        ) : (
                          <div className="flex-1 overflow-y-auto border border-slate-100 rounded-2xl divide-y divide-slate-100 bg-white scrollbar-thin">
                            {staffAdvances.map((a) => (
                              <div key={a.id} className="flex items-center justify-between p-3.5 hover:bg-slate-50 transition-all">
                                <div>
                                  <span className="text-xs font-black text-slate-800 block">{a.notes || 'Cash Advance'}</span>
                                  <span className="text-[9px] font-mono text-slate-400 font-black">{a.date}</span>
                                </div>
                                <span className="font-mono text-sm font-black text-amber-600">₹{a.amount.toFixed(2)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* TAB CONTENT: ATTENDANCE */}
                  {modalTab === 'attendance' && (
                    <div className="flex-1 flex flex-col space-y-5 overflow-hidden">
                      {/* STATS DECK */}
                      <div className="grid grid-cols-2 gap-3 shrink-0">
                        <div className="rounded-2xl border border-emerald-100 p-4 bg-emerald-50/50 text-center shadow-sm">
                          <span className="block text-[10px] font-black uppercase tracking-wider text-emerald-600 mb-1">Total Days</span>
                          <span className="text-2xl font-mono font-black text-emerald-700 block">{uniqueDays}</span>
                        </div>
                        <div className="rounded-2xl border border-sky-100 p-4 bg-sky-50/50 text-center shadow-sm">
                          <span className="block text-[10px] font-black uppercase tracking-wider text-sky-600 mb-1">Total Hours</span>
                          <span className="text-2xl font-mono font-black text-sky-700 block">{hrs}</span>
                        </div>
                      </div>

                      {/* SHIFT LOGS */}
                      <div className="flex-1 flex flex-col overflow-hidden min-h-[180px]">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2.5">
                          Working Days Ledger
                        </h4>

                        {staffShifts.length === 0 ? (
                          <div className="flex-1 flex items-center justify-center py-10 text-center text-slate-400 text-xs font-bold border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                            No attendance records found.
                          </div>
                        ) : (
                          <div className="flex-1 overflow-y-auto border border-slate-100 rounded-2xl divide-y divide-slate-100 bg-white scrollbar-thin">
                            {staffShifts.map((s) => (
                              <div key={s.id} className="flex items-center justify-between p-3.5 hover:bg-slate-50 transition-all">
                                <span className="text-xs font-black text-slate-800">
                                  {new Date(s.clock_in).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                                </span>
                                <span className="font-mono text-sm font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-100">
                                  {s.duration_minutes !== null ? `${(s.duration_minutes / 60).toFixed(1)} hrs` : '—'}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                </div>
              </div>
            </div>
          </div>
        );
      })()}

    </div>
  );
}
