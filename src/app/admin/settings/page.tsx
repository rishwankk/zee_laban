'use client';

import { useState, useEffect } from 'react';
import { KeyRound, ShieldCheck, CheckCircle, Mail, User, Crown, AtSign } from 'lucide-react';
import { api } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';

export default function AdminSettingsPage() {
  // Password change
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Email change
  const [emailPassword, setEmailPassword] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);

  // Admin info
  const [adminEmail, setAdminEmail] = useState('');
  const { user } = useAuthStore();

  // Notifications
  const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setAdminEmail(api.getAdminEmail());
    }
  }, []);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3500);
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotification(null);

    if (newPassword !== confirmPassword) {
      showNotification('error', 'New passwords do not match.');
      return;
    }

    setPasswordLoading(true);
    try {
      await api.changeAdminPassword(currentPassword, newPassword);
      showNotification('success', 'Admin password successfully changed!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      showNotification('error', err.message || 'Failed to change password.');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleEmailChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotification(null);

    if (!newEmail || !newEmail.includes('@')) {
      showNotification('error', 'Please enter a valid email address.');
      return;
    }

    setEmailLoading(true);
    try {
      await api.changeAdminEmail(emailPassword, newEmail);
      setAdminEmail(newEmail);
      showNotification('success', 'Admin login email updated successfully!');
      setEmailPassword('');
      setNewEmail('');
    } catch (err: any) {
      showNotification('error', err.message || 'Failed to change email.');
    } finally {
      setEmailLoading(false);
    }
  };

  return (
    <div className="space-y-8 select-none animate-fade-in relative max-w-5xl mx-auto">
      
      {/* Dynamic Toast Alert */}
      {notification && (
        <div className={`fixed top-24 right-8 z-40 text-white rounded-2xl p-4 shadow-lg border flex items-center space-x-3 select-none animate-slide-down ${
          notification.type === 'success' ? 'bg-primary border-blue-50/15' : 'bg-danger border-red-50/15'
        }`}>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 text-white">
            <CheckCircle className="h-5 w-5 stroke-[2.5px]" />
          </div>
          <span className="text-xs font-black tracking-wide pr-2">{notification.message}</span>
        </div>
      )}

      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-black text-text-primary">
            System Settings
          </h2>
          <p className="text-xs font-semibold text-text-muted mt-1">
            Manage your admin account credentials and security preferences.
          </p>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* ADMIN ACCOUNT INFO CARD */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <div className="rounded-3xl bg-gradient-to-br from-primary-dark via-[#0a3d6b] to-primary overflow-hidden shadow-xl relative">
        {/* Decorative glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-20 -mt-20 blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-accent/10 rounded-full -ml-10 -mb-10 blur-2xl pointer-events-none"></div>
        
        <div className="relative z-10 p-8 flex flex-col sm:flex-row items-start sm:items-center gap-6">
          {/* Avatar */}
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white/10 border-2 border-white/20 shadow-lg shadow-black/10 shrink-0">
            <span className="text-3xl font-black text-primary-light select-none">
              {user?.name?.[0] || 'R'}
            </span>
          </div>

          {/* Account Details */}
          <div className="flex-1 text-white">
            <div className="flex items-center space-x-2.5 mb-1">
              <h3 className="font-display text-xl font-black tracking-tight">
                {user?.name || 'Super Admin'}
              </h3>
              <span className="inline-flex items-center space-x-1 rounded-full bg-accent/20 border border-accent/30 px-2.5 py-0.5 text-[9px] font-black text-accent uppercase tracking-wider">
                <Crown className="h-3 w-3" />
                <span>Super Admin</span>
              </span>
            </div>

            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex items-center space-x-2.5 text-blue-200 text-xs font-semibold">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10">
                  <AtSign className="h-4 w-4 text-primary-light" />
                </div>
                <div>
                  <span className="block text-[9px] uppercase tracking-wider text-blue-300/70 font-bold">Login Email</span>
                  <span className="font-mono font-bold text-white">{adminEmail}</span>
                </div>
              </div>

              <div className="flex items-center space-x-2.5 text-blue-200 text-xs font-semibold">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10">
                  <User className="h-4 w-4 text-primary-light" />
                </div>
                <div>
                  <span className="block text-[9px] uppercase tracking-wider text-blue-300/70 font-bold">Account Role</span>
                  <span className="font-bold text-white">Administrator</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* PASSWORD & EMAIL CHANGE FORMS */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* PASSWORD CHANGE */}
        <div className="rounded-3xl bg-white border border-gray-100 shadow-sm overflow-hidden">
          <div className="border-b border-gray-50 px-6 py-5 bg-gray-50/30 flex items-center space-x-3">
            <div className="h-10 w-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-display text-sm font-black text-text-primary">Change Password</h3>
              <p className="text-[10px] text-text-muted font-bold">Update your super admin login password</p>
            </div>
          </div>

          <form onSubmit={handlePasswordChange} className="p-6 space-y-5">
            
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-text-muted mb-1.5">
                Current Password
              </label>
              <div className="relative">
                <KeyRound className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50/50 py-3 pl-10 pr-4 text-xs outline-none transition-all focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20 font-semibold"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-text-muted mb-1.5">
                New Password
              </label>
              <div className="relative">
                <KeyRound className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" />
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="w-full rounded-xl border border-blue-100 bg-blue-50/30 py-3 pl-10 pr-4 text-xs outline-none transition-all focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20 font-semibold text-primary-dark"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-text-muted mb-1.5">
                Confirm New Password
              </label>
              <div className="relative">
                <KeyRound className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" />
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-type new password"
                  className="w-full rounded-xl border border-blue-100 bg-blue-50/30 py-3 pl-10 pr-4 text-xs outline-none transition-all focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20 font-semibold text-primary-dark"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-gray-50 flex justify-end">
              <button
                type="submit"
                disabled={passwordLoading}
                className="rounded-xl bg-primary hover:bg-primary-dark px-6 py-3 text-xs font-bold text-white shadow-lg shadow-primary/20 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center space-x-2 cursor-pointer"
              >
                {passwordLoading ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                ) : (
                  <ShieldCheck className="h-4 w-4" />
                )}
                <span>{passwordLoading ? 'Updating...' : 'Update Password'}</span>
              </button>
            </div>

          </form>
        </div>

        {/* EMAIL/USERNAME CHANGE */}
        <div className="rounded-3xl bg-white border border-gray-100 shadow-sm overflow-hidden">
          <div className="border-b border-gray-50 px-6 py-5 bg-gray-50/30 flex items-center space-x-3">
            <div className="h-10 w-10 bg-violet-500/10 rounded-xl flex items-center justify-center text-violet-500">
              <Mail className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-display text-sm font-black text-text-primary">Change Login Email</h3>
              <p className="text-[10px] text-text-muted font-bold">Update your admin login email address</p>
            </div>
          </div>

          <form onSubmit={handleEmailChange} className="p-6 space-y-5">
            
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-text-muted mb-1.5">
                Current Login Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                <input
                  type="email"
                  disabled
                  value={adminEmail}
                  className="w-full rounded-xl border border-gray-200 bg-gray-100/60 py-3 pl-10 pr-4 text-xs outline-none font-semibold text-text-muted cursor-not-allowed"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-text-muted mb-1.5">
                New Email Address
              </label>
              <div className="relative">
                <AtSign className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-violet-500" />
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="Enter new email address"
                  className="w-full rounded-xl border border-violet-100 bg-violet-50/30 py-3 pl-10 pr-4 text-xs outline-none transition-all focus:border-violet-400 focus:bg-white focus:ring-2 focus:ring-violet-200/50 font-semibold text-violet-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-text-muted mb-1.5">
                Confirm with Current Password
              </label>
              <div className="relative">
                <KeyRound className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                <input
                  type="password"
                  required
                  value={emailPassword}
                  onChange={(e) => setEmailPassword(e.target.value)}
                  placeholder="Enter current password to confirm"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50/50 py-3 pl-10 pr-4 text-xs outline-none transition-all focus:border-violet-400 focus:bg-white focus:ring-2 focus:ring-violet-200/50 font-semibold"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-gray-50 flex justify-end">
              <button
                type="submit"
                disabled={emailLoading}
                className="rounded-xl bg-violet-500 hover:bg-violet-600 px-6 py-3 text-xs font-bold text-white shadow-lg shadow-violet-500/20 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center space-x-2 cursor-pointer"
              >
                {emailLoading ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                ) : (
                  <Mail className="h-4 w-4" />
                )}
                <span>{emailLoading ? 'Updating...' : 'Update Email'}</span>
              </button>
            </div>

          </form>
        </div>
      </div>

      {/* Security Tips Card */}
      <div className="rounded-3xl bg-gradient-to-br from-primary-dark to-primary p-6 shadow-lg text-white max-w-2xl">
        <h3 className="font-display font-black text-lg mb-2 flex items-center space-x-2">
          <ShieldCheck className="h-5 w-5" />
          <span>Security Tips</span>
        </h3>
        <p className="text-xs text-blue-100 font-semibold mb-4 leading-relaxed">
          As a Super Admin, your account has global access to all ZEE LABAN stores and financial reports. Keep your credentials secure.
        </p>
        <ul className="space-y-3 text-[10px] font-bold text-blue-50">
          <li className="flex items-start space-x-2">
            <CheckCircle className="h-3.5 w-3.5 text-accent shrink-0 mt-0.5" />
            <span>Use a minimum of 8 characters for stronger security.</span>
          </li>
          <li className="flex items-start space-x-2">
            <CheckCircle className="h-3.5 w-3.5 text-accent shrink-0 mt-0.5" />
            <span>Avoid using common words or dictionary terms.</span>
          </li>
          <li className="flex items-start space-x-2">
            <CheckCircle className="h-3.5 w-3.5 text-accent shrink-0 mt-0.5" />
            <span>Do not share your Super Admin password with store managers.</span>
          </li>
        </ul>
      </div>

    </div>
  );
}
