'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';

export default function RootPage() {
  const router = useRouter();
  const { user, initializeAuth, isLoading } = useAuthStore();

  useEffect(() => {
    const checkSession = async () => {
      await initializeAuth();
    };
    checkSession();
  }, [initializeAuth]);

  useEffect(() => {
    if (isLoading) return;

    if (!user) {
      router.push('/login');
    } else {
      if (user.role === 'admin') {
        router.push('/admin/dashboard');
      } else if (user.role === 'store' && user.store_id) {
        router.push(`/store/${user.store_id}/pos`);
      } else {
        router.push('/login');
      }
    }
  }, [user, isLoading, router]);

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center space-y-4">
        {/* Sleek Loader */}
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        <p className="font-sans text-sm font-medium text-text-muted">Loading Laban POS System...</p>
      </div>
    </div>
  );
}
