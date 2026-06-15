'use client';

import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/useAuthStore';
import {
  LayoutDashboard,
  Store,
  Menu as MenuIcon,
  BarChart3,
  Users,
  ShoppingBag,
  Layers,
  LogOut,
  Sparkles,
  ClipboardList,
  X,
  Settings as SettingsIcon
} from 'lucide-react';

interface SidebarProps {
  storeId?: string;
}

export default function Sidebar({ storeId }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, isMobileSidebarOpen, toggleMobileSidebar } = useAuthStore();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  if (!user) return null;

  const isAdmin = user.role === 'admin';

  // Navigation configurations
  const adminLinks = [
    { name: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
    { name: 'Store Outlets', href: '/admin/stores', icon: Store },
    { name: 'Master Menu', href: '/admin/menu', icon: MenuIcon },
    { name: 'Global Reports', href: '/admin/reports', icon: BarChart3 },
    { name: 'System Settings', href: '/admin/settings', icon: SettingsIcon },
  ];

  const storeLinks = [
    { name: 'POS Counter', href: `/store/${storeId}/pos`, icon: ShoppingBag },
    { name: 'Stock Control', href: `/store/${storeId}/stock`, icon: Layers },
    { name: 'Staff Hub', href: `/store/${storeId}/staff`, icon: Users },
    { name: 'Sales Reports', href: `/store/${storeId}/reports`, icon: BarChart3 },
    { name: 'System Settings', href: `/store/${storeId}/settings`, icon: SettingsIcon },
  ];

  const links = isAdmin ? adminLinks : storeLinks;

  return (
    <aside className={`fixed inset-y-0 left-0 z-50 flex h-screen w-72 flex-col bg-primary-dark text-white border-r border-blue-900/50 select-none transition-transform duration-300 ease-out lg:static lg:w-64 lg:translate-x-0 print:hidden ${isMobileSidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
      }`}>
      {/* Brand Header */}
      <div className="flex h-20 items-center justify-between px-6 border-b border-blue-900/30 bg-primary-dark/40">
        <div className="flex items-center space-x-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white shadow-md shadow-primary/20">
            <Sparkles className="h-5 w-5 text-primary-light" />
          </div>
          <div>
            <h2 className="font-display font-black text-sm tracking-widest text-primary-light uppercase">
              ZEE LABAN
            </h2>
            <span className="text-[10px] font-bold text-blue-300 uppercase tracking-widest">
              {user.role === 'admin' ? 'Super Portal' : 'Store Portal'}
            </span>
          </div>
        </div>

        {/* Mobile Close Button */}
        <button
          onClick={() => toggleMobileSidebar(false)}
          className="flex lg:hidden items-center justify-center p-1.5 rounded-lg text-blue-300 hover:bg-blue-900/30 hover:text-white transition-all active:scale-95"
          aria-label="Close Sidebar"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 space-y-1.5 px-4 py-6 overflow-y-auto">
        {links.map((link) => {
          const isActive = pathname === link.href;
          const Icon = link.icon;

          return (
            <Link
              key={link.name}
              href={link.href}
              onClick={() => toggleMobileSidebar(false)}
              className={`flex items-center space-x-3.5 rounded-xl px-4 py-3.5 text-sm font-semibold tracking-wide transition-all ${isActive
                ? 'bg-primary text-white shadow-lg shadow-primary/20 scale-[1.02]'
                : 'text-blue-100/70 hover:bg-blue-900/30 hover:text-white'
                }`}
            >
              <Icon className={`h-5 w-5 ${isActive ? 'text-white' : 'text-blue-300/60'}`} />
              <span>{link.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer / User Profile & Logout */}
      <div className="p-4 border-t border-blue-900/30 bg-primary-dark/30">
        <div className="flex items-center justify-between rounded-2xl bg-primary-dark/50 p-3.5 border border-blue-900/40 mb-3">
          <div className="overflow-hidden">
            {user.role === 'admin' ? (
              <h4 className="truncate text-sm font-bold leading-tight mt-1">Admin Account</h4>
            ) : (
              <>
                <h4 className="truncate text-xs font-bold leading-tight">{user.name}</h4>
                <p className="truncate text-[10px] font-medium text-blue-300/80 capitalize mt-0.5">
                  {user.role} {user.store_id ? `(${user.store_id.toUpperCase().substring(4, 7)})` : ''}
                </p>
              </>
            )}
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="flex w-full items-center justify-center space-x-2 rounded-xl bg-danger/10 hover:bg-danger py-3 text-xs font-bold text-danger hover:text-white transition-all border border-danger/15 hover:border-transparent active:scale-[0.98]"
        >
          <LogOut className="h-4 w-4" />
          <span>Exit System</span>
        </button>
      </div>
    </aside>
  );
}
