'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { usePrinterStore, PrinterType } from '@/store/usePrinterStore';
import { api } from '@/lib/supabase';
import UpiQrDisplay from '@/components/pos/UpiQrDisplay';
import {
  Printer,
  QrCode,
  CheckCircle,
  Settings,
  RefreshCw,
  Smartphone,
  Sparkles,
  Wifi,
  Usb,
  Cpu,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  UserCircle,
  AlertCircle,
  Bluetooth
} from 'lucide-react';

export default function StoreSettingsPage() {
  const { store, user, changeStore } = useAuthStore();
  const {
    isConnected,
    printerType,
    printerAddress,
    setPrinterConfig,
    checkPrinterStatus,
    connectHardware,
    testPrint
  } = usePrinterStore();

  // Printer inputs
  const [selectedType, setSelectedType] = useState<PrinterType>('Bluetooth');
  const [addressInput, setAddressInput] = useState('');
  const [isCheckingPrinter, setIsCheckingPrinter] = useState(false);
  const [isTestingPrinter, setIsTestingPrinter] = useState(false);
  const [printerNotification, setPrinterNotification] = useState<string | null>(null);

  // UPI inputs
  const [upiIdInput, setUpiIdInput] = useState('');
  const [upiNotification, setUpiNotification] = useState<string | null>(null);

  // Password change
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [passwordNotification, setPasswordNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Load values on mount
  useEffect(() => {
    if (store) {
      setUpiIdInput(store.upi_id || '');
    }
  }, [store]);

  useEffect(() => {
    setSelectedType(printerType);
    setAddressInput(printerAddress);
  }, [printerType, printerAddress]);

  // Handle printer save
  const handleSavePrinterConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addressInput.trim()) return;

    setPrinterConfig(selectedType, addressInput.trim());
    setPrinterNotification("Printer interface configured successfully! 🖨️");
    setTimeout(() => setPrinterNotification(null), 2500);
  };

  // Handle manual printer recheck
  const handleCheckPrinter = async () => {
    setIsCheckingPrinter(true);
    await checkPrinterStatus();
    setIsCheckingPrinter(false);
  };

  // Handle printer test receipt
  const handleTestPrint = async () => {
    setIsTestingPrinter(true);
    const success = await testPrint();
    setIsTestingPrinter(false);

    if (success) {
      setPrinterNotification("Test print dispatched to queue! 🧾");
    } else {
      setPrinterNotification("⚠️ Printer is offline. Check interface settings.");
    }
    setTimeout(() => setPrinterNotification(null), 3000);
  };

  // Handle UPI VPA update
  const handleUpdateUpiId = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!store || !upiIdInput.trim()) return;

    try {
      await api.updateStore(store.id, {
        upi_id: upiIdInput.trim()
      });

      // Sync the Zustand active store context immediately
      await changeStore(store.id);

      setUpiNotification("Merchant UPI ID updated successfully! 💳");
      setTimeout(() => setUpiNotification(null), 2500);
    } catch (err) {
      console.error("Failed to save UPI settings", err);
    }
  };

  // Handle password change
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!store) return;

    if (newPassword.length < 4) {
      setPasswordNotification({ type: 'error', message: 'New password must be at least 4 characters.' });
      setTimeout(() => setPasswordNotification(null), 3000);
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordNotification({ type: 'error', message: 'New password and confirm password do not match.' });
      setTimeout(() => setPasswordNotification(null), 3000);
      return;
    }

    setIsChangingPassword(true);
    try {
      await api.changeStorePassword(store.id, currentPassword, newPassword);
      setPasswordNotification({ type: 'success', message: 'Password changed successfully! 🔒' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPasswordNotification({ type: 'error', message: err.message || 'Failed to change password.' });
    } finally {
      setIsChangingPassword(false);
      setTimeout(() => setPasswordNotification(null), 3500);
    }
  };

  return (
    <div className="space-y-8 select-none animate-fade-in relative max-w-5xl">

      {/* Dynamic Toast Alerts */}
      {(printerNotification || upiNotification) && (
        <div className="fixed top-24 right-4 sm:right-8 z-40 bg-primary text-white rounded-2xl p-4 shadow-lg border border-blue-50/15 flex items-center space-x-3 select-none animate-slide-down max-w-[90vw]">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-white shrink-0">
            <CheckCircle className="h-5 w-5 stroke-[2.5px]" />
          </div>
          <span className="text-xs font-black tracking-wide pr-2">
            {printerNotification || upiNotification}
          </span>
        </div>
      )}

      {/* HEADER SECTION */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl sm:text-2xl font-black text-text-primary flex items-center space-x-2.5">
            <Settings className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            <span>System Settings</span>
          </h2>
          <p className="text-[10px] sm:text-xs font-semibold text-text-muted mt-1">
            Manage your account, printer setup, and payment gateway configurations.
          </p>
        </div>
      </div>

      {/* ─── ACCOUNT PROFILE SECTION ─── */}
      <div className="rounded-3xl bg-white border border-slate-100 p-5 sm:p-6 shadow-sm space-y-6">
        <div className="flex items-center space-x-2.5">
          <UserCircle className="h-5 w-5 text-primary" />
          <h3 className="font-display text-sm sm:text-base font-black text-slate-800">
            Account Profile
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Email Display */}
          <div className="rounded-2xl bg-slate-50/60 border border-slate-100 p-4 space-y-2">
            <div className="flex items-center space-x-2 text-slate-400">
              <Mail className="h-4 w-4" />
              <span className="text-[10px] font-black uppercase tracking-widest">Email Address</span>
            </div>
            <p className="font-mono text-sm font-bold text-slate-800 break-all">
              {user?.email || store?.owner_email || '—'}
            </p>
            <p className="text-[9px] font-semibold text-slate-400">This is your login credential and cannot be changed from here.</p>
          </div>

          {/* Store Owner Name */}
          <div className="rounded-2xl bg-slate-50/60 border border-slate-100 p-4 space-y-2">
            <div className="flex items-center space-x-2 text-slate-400">
              <UserCircle className="h-4 w-4" />
              <span className="text-[10px] font-black uppercase tracking-widest">Account Name</span>
            </div>
            <p className="font-mono text-sm font-bold text-slate-800">
              {user?.name || store?.owner_name || '—'}
            </p>
            <p className="text-[9px] font-semibold text-slate-400">Role: {user?.role === 'store' ? 'Store Manager' : 'Administrator'}</p>
          </div>
        </div>

        {/* Password Change Form */}
        <div className="border-t border-slate-100 pt-5">
          <div className="flex items-center space-x-2 mb-4">
            <ShieldCheck className="h-4.5 w-4.5 text-primary" />
            <h4 className="text-xs sm:text-sm font-black text-slate-800">Change Password</h4>
          </div>

          {/* Password notification */}
          {passwordNotification && (
            <div className={`rounded-xl p-3 mb-4 flex items-center space-x-2.5 text-xs font-bold animate-fade-in ${passwordNotification.type === 'success'
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                : 'bg-red-50 text-red-700 border border-red-100'
              }`}>
              {passwordNotification.type === 'success'
                ? <CheckCircle className="h-4 w-4 shrink-0" />
                : <AlertCircle className="h-4 w-4 shrink-0" />
              }
              <span>{passwordNotification.message}</span>
            </div>
          )}

          <form onSubmit={handleChangePassword} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Current Password */}
            <div className="relative">
              <label className="block text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Current Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type={showCurrentPw ? 'text' : 'password'}
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current"
                  className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-9 text-xs font-bold text-slate-800 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPw(!showCurrentPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-primary cursor-pointer"
                >
                  {showCurrentPw ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div className="relative">
              <label className="block text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1.5">New Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type={showNewPw ? 'text' : 'password'}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new"
                  className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-9 text-xs font-bold text-slate-800 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPw(!showNewPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-primary cursor-pointer"
                >
                  {showNewPw ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div className="relative">
              <label className="block text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new"
                  className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-xs font-bold text-slate-800 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
                />
              </div>
            </div>

            <div className="sm:col-span-3">
              <button
                type="submit"
                disabled={isChangingPassword || !currentPassword || !newPassword || !confirmPassword}
                className="w-full sm:w-auto rounded-xl bg-gradient-to-r from-primary to-primary-dark hover:from-primary-dark hover:to-primary py-2.5 px-8 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-primary/15 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {isChangingPassword ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* ─── PRINTER & UPI GRID ─── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">

        {/* COLUMN 1: THERMAL PRINTER HARDWARE CONFIG */}
        <div className="rounded-3xl bg-white border border-slate-100 p-5 sm:p-6 shadow-sm flex flex-col space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center space-x-2.5">
              <Printer className="h-5 w-5 text-primary" />
              <h3 className="font-display text-sm font-black text-text-primary">
                Thermal Printer (80mm)
              </h3>
            </div>

            {/* Online/Offline Badge */}
            <span className={`flex items-center space-x-1 rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-wider ${isConnected
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-red-100 text-red-700'
              }`}>
              <span className={`mr-1 h-1.5 w-1.5 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
              {isConnected ? 'Connected' : 'Offline'}
            </span>
          </div>

          <p className="text-[10px] sm:text-xs font-semibold text-text-muted leading-relaxed">
            Link your thermal printer via USB or Network LAN.
          </p>

          <form onSubmit={handleSavePrinterConfig} className="space-y-4 pt-2">

            {/* Interface selector */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-text-muted mb-2">
                Connection Interface
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'Bluetooth', label: 'Bluetooth', icon: Bluetooth },
                  { id: 'USB', label: 'USB Port', icon: Usb },
                  { id: 'Network', label: 'WiFi / LAN', icon: Wifi }
                ].map((iface) => (
                  <button
                    key={iface.id}
                    type="button"
                    onClick={() => setSelectedType(iface.id as PrinterType)}
                    className={`flex flex-col items-center justify-center py-2.5 rounded-xl border text-[10px] sm:text-xs font-bold transition-all cursor-pointer ${selectedType === iface.id
                        ? 'bg-primary text-white border-transparent shadow-md shadow-primary/10'
                        : 'bg-white text-text-primary border-gray-100 hover:border-primary/20'
                      }`}
                  >
                    <iface.icon className="h-4 w-4 mb-1" />
                    <span>{iface.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Conditional Interface Form */}
            {selectedType === 'Network' && !(isConnected && printerType === selectedType) && (
              <div className="mb-2">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-text-muted mb-2">
                  Printer LAN IP Address
                </label>
                <input
                  type="text"
                  required
                  value={addressInput}
                  onChange={(e) => setAddressInput(e.target.value)}
                  placeholder="E.g., http://192.168.1.150:9100"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-3 text-xs outline-none focus:border-primary focus:bg-white font-mono font-bold text-primary-dark"
                />
              </div>
            )}

            <div className="pt-2">
              {isConnected && printerType === selectedType ? (
                <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4 flex items-center justify-between shadow-sm">
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <CheckCircle className="h-4.5 w-4.5 text-emerald-500 shrink-0" />
                    <span className="text-xs font-black text-emerald-700 truncate">{printerAddress || 'Hardware Connected'}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      usePrinterStore.setState({ isConnected: false, printerAddress: '' });
                      setAddressInput('');
                    }}
                    className="ml-3 text-[9px] font-black uppercase tracking-widest text-emerald-600 hover:text-emerald-800 transition-colors cursor-pointer shrink-0"
                  >
                    Disconnect
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={async () => {
                    if (selectedType === 'Network') {
                      if (!addressInput) return;
                      handleSavePrinterConfig(new Event('submit') as any);
                    } else {
                      const success = await connectHardware();
                      if (success) {
                        const newAddr = usePrinterStore.getState().printerAddress;
                        setAddressInput(newAddr);
                        setPrinterConfig(selectedType, newAddr);
                      }
                    }
                  }}
                  disabled={selectedType === 'Network' && !addressInput}
                  className="w-full rounded-xl bg-slate-800 hover:bg-slate-900 disabled:opacity-50 disabled:hover:bg-slate-800 py-3.5 text-xs font-black text-white shadow-lg shadow-slate-800/10 transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center space-x-2"
                >
                  <Sparkles className="h-4 w-4" />
                  <span>{selectedType === 'Network' ? 'Ping & Connect IP' : 'Search & Connect Hardware'}</span>
                </button>
              )}
            </div>

          </form>

          {/* Test Operations */}
          <div className="border-t border-gray-100 pt-5 mt-2 flex flex-col space-y-3">
            <h4 className="text-[10px] font-black uppercase tracking-wider text-text-muted">
              Diagnostics
            </h4>
            <div className="flex items-center justify-between bg-gray-50 p-3 sm:p-4 rounded-2xl border border-gray-100 gap-3">
              <div className="min-w-0">
                <p className="text-xs font-bold text-text-primary">Test Receipt</p>
                <p className="text-[9px] font-semibold text-text-muted mt-0.5 truncate">Outputs a formatted hardware layout check.</p>
              </div>
              <button
                type="button"
                onClick={handleTestPrint}
                disabled={isTestingPrinter || !isConnected}
                className="rounded-xl bg-primary-light border border-blue-100 px-3 sm:px-4 py-2.5 text-[10px] sm:text-xs font-extrabold uppercase tracking-wider text-primary hover:bg-primary hover:text-white transition-all active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap shrink-0"
              >
                {isTestingPrinter ? 'Printing...' : 'Test Print'}
              </button>
            </div>
          </div>

        </div>

        {/* COLUMN 2: UPI PAYMENT GATEWAY CONFIG */}
        <div className="rounded-3xl bg-white border border-slate-100 p-5 sm:p-6 shadow-sm flex flex-col space-y-6">
          <div className="flex items-center space-x-2.5">
            <QrCode className="h-5 w-5 text-primary" />
            <h3 className="font-display text-sm font-black text-text-primary">
              Merchant UPI QR Gateway
            </h3>
          </div>

          <p className="text-[10px] sm:text-xs font-semibold text-text-muted leading-relaxed">
            Configure the Virtual Payment Address (VPA). The POS generates Paytm-compatible scan links and embeds them in printed bills.
          </p>

          <form onSubmit={handleUpdateUpiId} className="space-y-4 pt-2">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-text-muted mb-2">
                Merchant UPI ID (VPA)
              </label>
              <input
                type="text"
                required
                value={upiIdInput}
                onChange={(e) => setUpiIdInput(e.target.value)}
                placeholder="E.g. merchant@upi or yourname@paytm"
                className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-3 text-xs outline-none focus:border-primary focus:bg-white font-mono font-bold text-primary-dark"
              />
              <span className="block text-[9px] font-bold text-text-muted/80 mt-2 leading-relaxed">
                Adjusting this modifies payment targets on printed bills instantly.
              </span>
            </div>

            <button
              type="submit"
              className="w-full rounded-xl bg-primary hover:bg-primary-dark py-3 text-xs font-black text-white shadow-lg shadow-primary/10 transition-all active:scale-[0.98] cursor-pointer"
            >
              Update Store UPI ID
            </button>
          </form>

          {/* QR Verification Sandbox */}
          {store && (
            <div className="border-t border-gray-100 pt-5 mt-2 flex flex-col items-center">
              <h4 className="text-[10px] font-black uppercase tracking-wider text-text-muted mb-4 self-start">
                UPI QR Sandbox (₹1.00 Preview)
              </h4>
              <div className="w-full max-w-[280px]">
                <UpiQrDisplay
                  amount={1.00}
                  billNumber="SANDBOX-0001"
                  storeName={store.name}
                  upiId={store.upi_id}
                />
              </div>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
