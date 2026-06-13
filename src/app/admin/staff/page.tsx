'use client';

import { useState, useEffect } from 'react';
import { api, Store, Staff } from '@/lib/supabase';
import { 
  ShieldAlert, 
  Users, 
  Building,
  UserCheck,
  UserMinus,
  Sparkles,
  Info
} from 'lucide-react';

export default function AdminStaffPage() {
  const [stores, setStores] = useState<Store[]>([]);
  const [allStaff, setAllStaff] = useState<Staff[]>([]);

  useEffect(() => {
    const loadOverview = async () => {
      try {
        const sData = await api.getStores();
        setStores(sData);

        const staffAccumulator: Staff[] = [];
        for (const st of sData) {
          const storeStaff = await api.getStaffByStore(st.id);
          staffAccumulator.push(...storeStaff);
        }
        setAllStaff(staffAccumulator);
      } catch (err) {
        console.error("Failed to load staff aggregates", err);
      }
    };
    loadOverview();
  }, []);

  return (
    <div className="space-y-8 select-none animate-fade-in">
      
      {/* HEADER SECTION */}
      <div>
        <h2 className="font-display text-2xl font-black text-text-primary">
          Global Staffing Ledger
        </h2>
        <p className="text-xs font-semibold text-text-muted mt-1">
          Review staff aggregations across all outlets. Staff governance is delegated strictly to outlet managers.
        </p>
      </div>

      {/* DELEGATION POLICY NOTICE BANNER */}
      <div className="rounded-3xl bg-blue-50 border border-blue-100 p-6 flex items-start space-x-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-primary shadow-sm shrink-0">
          <Info className="h-6 w-6" />
        </div>
        <div>
          <h4 className="text-xs font-black text-primary uppercase tracking-wide">
            Administrative Governance Policy
          </h4>
          <p className="mt-2 text-xs font-medium text-primary-dark leading-relaxed">
            In compliance with our role-security protocols, Super Admins **do not manage store-level staff**. All hires, suspensions, shift logs corrections, and Salaf (salary advance) dispersals are restricted to and managed independently by their respective store managers. This screen provides a read-only census.
          </p>
        </div>
      </div>

      {/* FOOTPRINT SUMMARIES */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {stores.map((st) => {
          const storeStaff = allStaff.filter(s => s.store_id === st.id);
          const activeHires = storeStaff.filter(s => s.is_active).length;
          
          const cashiersCount = storeStaff.filter(s => s.role === 'cashier').length;
          const helpersCount = storeStaff.filter(s => s.role === 'helper').length;
          const deliveryCount = storeStaff.filter(s => s.role === 'delivery').length;

          return (
            <div key={st.id} className="rounded-3xl bg-white border border-gray-100 p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition-all duration-300">
              
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary-light text-primary">
                    <Building className="h-5 w-5" />
                  </div>
                  <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-emerald-800">
                    {activeHires} Staff Members
                  </span>
                </div>

                <h3 className="font-display text-sm font-black text-text-primary mb-6">
                  {st.name} Census
                </h3>

                {/* Census rows */}
                <div className="space-y-3 font-semibold text-xs text-text-muted">
                  <div className="flex items-center justify-between py-2 border-b border-gray-50">
                    <span>Counter Cashiers</span>
                    <strong className="text-text-primary font-mono">{cashiersCount}</strong>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-gray-50">
                    <span>Kitchen Helpers</span>
                    <strong className="text-text-primary font-mono">{helpersCount}</strong>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-gray-50">
                    <span>Delivery partners</span>
                    <strong className="text-text-primary font-mono">{deliveryCount}</strong>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-center space-x-1.5 text-[9px] font-black uppercase text-text-muted/60 tracking-wider">
                <Users className="h-4 w-4" />
                <span>Manager Governance Active</span>
              </div>

            </div>
          );
        })}
      </div>

    </div>
  );
}
