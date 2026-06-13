'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { Calendar, Clock, MapPin, Sparkles, Menu as MenuIcon } from 'lucide-react';

export default function TopBar() {
  const { user, store, toggleMobileSidebar } = useAuthStore();
  const [time, setTime] = useState<string>('');
  const [date, setDate] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setDate(now.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  if (!user) return null;

  return (
    <header className="flex h-20 w-full items-center justify-between bg-white px-4 sm:px-8 shadow-sm border-b border-gray-100 select-none print:hidden">

      {/* Mobile Hamburger toggle */}
      <button
        onClick={() => toggleMobileSidebar(true)}
        className="flex lg:hidden items-center justify-center p-2 rounded-xl text-text-muted hover:bg-gray-100 hover:text-text-primary transition-all active:scale-95 mr-2"
        aria-label="Toggle Sidebar"
      >
        <MenuIcon className="h-6 w-6" />
      </button>

      {/* Outlet Context */}
      <div className="flex items-center space-x-3">
        {store ? (
          <>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-light text-primary">
              <MapPin className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-display font-extrabold text-base text-text-primary leading-tight">
                {store.name}
              </h1>
              <p className="text-[10px] font-bold text-text-muted mt-0.5 flex items-center">
                <span>{store.location}</span>
              </p>
            </div>
          </>
        ) : (
          <>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-primary">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-display font-extrabold text-base text-text-primary leading-tight">
                Zee Laban
              </h1>
              <p className="text-[10px] font-bold text-text-muted mt-0.5">
                Consolidated Main HQ Panel
              </p>
            </div>
          </>
        )}
      </div>

      {/* Date, Time, and Session */}
      <div className="flex items-center space-x-6">

        {/* Monospace Clock & Calendar */}
        <div className="hidden md:flex items-center space-x-4 border-r border-gray-100 pr-6">
          <div className="flex items-center space-x-2 text-text-muted">
            <Calendar className="h-4 w-4 text-primary" />
            <span className="text-xs font-semibold">{date}</span>
          </div>
          <div className="flex items-center space-x-2 bg-primary-light/50 px-3 py-1.5 rounded-lg border border-primary-light">
            <Clock className="h-4 w-4 text-primary" />
            <span className="font-mono text-xs font-bold text-primary tracking-wider">{time}</span>
          </div>
        </div>

        {/* User Card */}
        <div className="flex items-center space-x-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white font-display font-bold text-sm shadow-md shadow-primary/10">
            {user.role === 'admin' ? 'AD' : user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
          </div>
          <div className="text-left">
            {user.role === 'admin' ? (
              <div className="text-sm font-bold text-text-primary leading-tight">Admin Account</div>
            ) : (
              <>
                <div className="text-xs font-bold text-text-primary leading-tight">{user.name}</div>
                <div className="text-[10px] font-semibold text-primary capitalize mt-0.5 tracking-wide">
                  {user.role} Account
                </div>
              </>
            )}
          </div>
        </div>

      </div>

    </header>
  );
}
