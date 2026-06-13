'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import Sidebar from '@/components/layout/Sidebar';
import TopBar from '@/components/layout/TopBar';

export default function StoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const params = useParams();
  const storeId = params.storeId as string;
  
  const { user, initializeAuth, changeStore, isLoading, isMobileSidebarOpen, toggleMobileSidebar } = useAuthStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const init = async () => {
      setMounted(true);
      await initializeAuth();
    };
    init();
  }, [initializeAuth]);

  // Adjust active store context in Zustand whenever storeId changes
  useEffect(() => {
    if (storeId) {
      changeStore(storeId);
    }
  }, [storeId, changeStore]);

  useEffect(() => {
    if (!mounted || isLoading) return;

    if (!user) {
      router.push('/login');
    } else {
      // Admin has access to all stores, let them enter!
      if (user.role === 'admin') return;

      // Cashiers and Managers are locked to their assigned store
      if (user.store_id !== storeId) {
        // Mismatched store redirection
        router.push(`/store/${user.store_id}/pos`);
      }
    }
  }, [user, isLoading, mounted, storeId, router]);

  const hasAccess = user && (user.role === 'admin' || user.store_id === storeId);

  if (!mounted || isLoading || !hasAccess) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center space-y-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="font-sans text-sm font-medium text-text-muted">Loading Store Workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-gray-50 font-sans relative print:h-auto print:w-auto print:overflow-visible print:bg-white">
      {/* Click-away mobile backdrop overlay shield */}
      {isMobileSidebarOpen && (
        <div 
          onClick={() => toggleMobileSidebar(false)}
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[3px] transition-opacity lg:hidden animate-fade-in"
        />
      )}

      {/* Role-Aware Sidebar */}
      <Sidebar storeId={storeId} />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden w-full print:overflow-visible print:w-full print:block">
        {/* Top Header */}
        <TopBar />
        
        {/* Scrollable Page Viewport */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-8 print:overflow-visible print:p-0 print:m-0 print:block">
          {children}
        </main>
      </div>
    </div>
  );
}
