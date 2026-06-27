'use client';

import { useState, useEffect } from 'react';
import { Megaphone, Users, CheckCircle, Smartphone, Send, Search, Loader2 } from 'lucide-react';
import { api, CustomerProfile } from '@/lib/supabase';

export default function MarketingPage() {
  const [customers, setCustomers] = useState<CustomerProfile[]>([]);
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    try {
      const data = await api.getCustomerDirectory();
      const mappedData = data.map(c => ({
        ...c,
        id: c.mobile
      }));
      setCustomers(mappedData);
    } catch (e) {
      console.error(e);
    }
  };

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3500);
  };

  const filteredCustomers = customers.filter(c =>
    (c.name || '').toLowerCase().includes(search.toLowerCase()) ||
    c.mobile.includes(search)
  );

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredCustomers.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredCustomers.map(c => c.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const handleSendCampaign = async () => {
    if (!message.trim() || selectedIds.size === 0) return;

    const selectedNumbers = customers
      .filter(c => selectedIds.has(c.id))
      .map(c => c.mobile);

    setIsSending(true);
    try {
      const res = await fetch('/api/whatsapp/send-marketing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, numbers: selectedNumbers })
      });
      const data = await res.json();
      if (res.ok) {
        showNotification('success', 'Marketing campaign started! Messages are sending in the background.');
        setMessage('');
        setSelectedIds(new Set());
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      showNotification('error', err.message || 'Failed to start campaign');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-8 select-none animate-fade-in relative max-w-5xl mx-auto">
      {notification && (
        <div className={`fixed top-24 right-8 z-40 text-white rounded-2xl p-4 shadow-lg border flex items-center space-x-3 select-none animate-slide-down ${notification.type === 'success' ? 'bg-emerald-500 border-emerald-400' : 'bg-red-500 border-red-400'}`}>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 text-white">
            <CheckCircle className="h-5 w-5 stroke-[2.5px]" />
          </div>
          <span className="text-xs font-black tracking-wide pr-2">{notification.message}</span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-black text-text-primary">WhatsApp Marketing</h2>
          <p className="text-xs font-semibold text-text-muted mt-1">Send promotional messages to your customers.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Customer Selection Column */}
        <div className="lg:col-span-1 flex flex-col h-[500px] bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-50 bg-slate-50/50">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search customers..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div className="flex justify-between items-center mt-3 px-1">
              <span className="text-[10px] font-bold text-slate-500">{filteredCustomers.length} Customers</span>
              <button onClick={toggleSelectAll} className="text-[10px] font-bold text-primary hover:text-primary-dark cursor-pointer">
                {selectedIds.size === filteredCustomers.length && filteredCustomers.length > 0 ? 'Deselect All' : 'Select All'}
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {filteredCustomers.map(c => (
              <label key={c.id} className="flex items-center space-x-3 p-3 hover:bg-slate-50 rounded-xl cursor-pointer group">
                <div className="relative flex items-center justify-center">
                  <input type="checkbox" className="peer sr-only" checked={selectedIds.has(c.id)} onChange={() => toggleSelect(c.id)} />
                  <div className="h-4 w-4 border-2 border-slate-300 rounded peer-checked:bg-primary peer-checked:border-primary transition-colors flex items-center justify-center">
                    <CheckCircle className="h-3 w-3 text-white opacity-0 peer-checked:opacity-100" />
                  </div>
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-700">{c.name || 'Unknown'}</div>
                  <div className="text-[10px] font-semibold text-slate-400">{c.mobile}</div>
                </div>
              </label>
            ))}
            {filteredCustomers.length === 0 && (
              <div className="text-center py-10 text-slate-400 text-xs font-semibold">No customers found.</div>
            )}
          </div>
        </div>

        {/* Campaign Draft Column */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-100 shadow-sm p-6 flex flex-col">
          <div className="flex items-center space-x-3 mb-6">
            <div className="h-10 w-10 bg-primary-light text-primary rounded-xl flex items-center justify-center">
              <Megaphone className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-display font-black text-lg text-slate-800">Draft Campaign</h3>
              <p className="text-[10px] font-bold text-slate-400">Selected {selectedIds.size} recipients</p>
            </div>
          </div>

          <div className="flex-1 flex flex-col mb-6">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Message Body</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Hi there! Get 10% off on your next visit..."
              className="flex-1 w-full border border-slate-200 bg-slate-50/50 rounded-2xl p-4 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
            />
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-100">
            <button
              onClick={handleSendCampaign}
              disabled={isSending || selectedIds.size === 0 || !message.trim()}
              className="flex items-center space-x-2 bg-primary hover:bg-primary-dark text-white font-bold text-xs px-6 py-3 rounded-xl transition-all shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              <span>{isSending ? 'Starting...' : 'Send Campaign'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
