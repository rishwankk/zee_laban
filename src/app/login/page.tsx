'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { KeyRound, Mail, Sparkles } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { login, user, error, isLoading, initializeAuth } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    initializeAuth();
  }, [initializeAuth]);

  useEffect(() => {
    if (user) {
      redirectUser(user);
    }
  }, [user]);

  const redirectUser = (u: any) => {
    if (u.role === 'admin') {
      router.push('/admin/dashboard');
    } else if (u.role === 'store' && u.store_id) {
      router.push(`/store/${u.store_id}/pos`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    const loggedUser = await login(email, password);
    if (loggedUser) {
      redirectUser(loggedUser);
    }
  };

  if (!mounted) return null;

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center bg-gradient-to-tr from-primary-dark via-primary to-accent p-4 overflow-hidden">
      {/* Decorative Blur Spheres */}
      <div className="absolute -top-40 -left-40 h-80 w-80 rounded-full bg-white/10 blur-3xl animate-pulse"></div>
      <div className="absolute -bottom-40 -right-40 h-80 w-80 rounded-full bg-white/10 blur-3xl animate-pulse delay-700"></div>

      <div className="z-10 w-full max-w-md">
        {/* Main Card */}
        <div className="overflow-hidden rounded-3xl bg-white p-8 shadow-2xl transition-all duration-300 hover:shadow-primary-dark/20 border border-blue-50/20">
          
          {/* Logo & Header */}
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-light text-primary">
              <Sparkles className="h-7 w-7 animate-bounce" />
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-primary-dark select-none">
              ZEE LABAN
            </h1>
            <p className="mt-2 text-sm text-text-muted font-medium select-none">
              Multi-Store POS & Billing System
            </p>
          </div>

          {/* Form Error Alert */}
          {error && (
            <div className="mb-6 rounded-xl bg-danger/10 p-4 border border-danger/20">
              <p className="text-xs font-semibold text-danger">{error}</p>
            </div>
          )}

          {/* Core Login Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-text-primary mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-text-muted" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your account email"
                  required
                  className="w-full rounded-xl border border-gray-200 bg-gray-50/50 py-3.5 pl-11 pr-4 text-sm outline-none transition-all focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-text-primary mb-2">
                Password
              </label>
              <div className="relative">
                <KeyRound className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-text-muted" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full rounded-xl border border-gray-200 bg-gray-50/50 py-3.5 pl-11 pr-4 text-sm outline-none transition-all focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="relative w-full overflow-hidden rounded-xl bg-primary py-3.5 font-bold text-white shadow-lg shadow-primary/25 transition-all hover:bg-primary-dark active:scale-[0.98] disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? (
                <div className="mx-auto h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
              ) : (
                "Sign In to POS"
              )}
            </button>
          </form>

          {/* Footer branding */}
          <div className="mt-8 text-center">
            <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted/50 select-none">
              Powered by ZEE LABAN POS
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
