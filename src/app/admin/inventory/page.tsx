'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/supabase';
import { AdminInventoryItem, AdminInventoryLog, Store } from '@/lib/db';
import {
  ClipboardList, Plus, History, Package,
  Building, CheckCircle, AlertTriangle, Send, X, Edit2, Trash2, Filter
} from 'lucide-react';

export default function AdminInventoryPage() {
  const [items, setItems] = useState<AdminInventoryItem[]>([]);
  const [logs, setLogs] = useState<(AdminInventoryLog & { item: AdminInventoryItem, store: Store })[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [activeTab, setActiveTab] = useState<'inventory' | 'history'>('inventory');
  
  // Modals
  const [showAddItem, setShowAddItem] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemQty, setNewItemQty] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');
  
  const [editItem, setEditItem] = useState<AdminInventoryItem | null>(null);
  const [editQty, setEditQty] = useState('');
  const [editPrice, setEditPrice] = useState('');
  
  const [allocateItem, setAllocateItem] = useState<AdminInventoryItem | null>(null);
  const [allocateStore, setAllocateStore] = useState('');
  const [allocateQty, setAllocateQty] = useState('');
  
  // Filters
  const [filterStore, setFilterStore] = useState<string>('all');
  const [filterStartDate, setFilterStartDate] = useState<string>('');
  const [filterEndDate, setFilterEndDate] = useState<string>('');
  
  const [notification, setNotification] = useState<{message: string, isError: boolean} | null>(null);

  const loadData = async () => {
    try {
      setItems(await api.getAdminInventory());
      setLogs(await api.getAdminInventoryLogs());
      setStores(await api.getStores());
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => { loadData(); }, []);

  const notify = (msg: string, isError = false) => {
    setNotification({ message: msg, isError });
    setTimeout(() => setNotification(null), 3500);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.addAdminInventoryItem(newItemName, parseInt(newItemQty) || 0, parseFloat(newItemPrice) || 0);
      setShowAddItem(false);
      setNewItemName('');
      setNewItemQty('');
      setNewItemPrice('');
      notify("Item added successfully");
      loadData();
    } catch (err: any) {
      notify(err.message, true);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editItem) return;
    try {
      await api.updateAdminInventoryItem(editItem.id, parseInt(editQty) || 0, parseFloat(editPrice) || 0);
      setEditItem(null);
      notify("Item updated");
      loadData();
    } catch (err: any) {
      notify(err.message, true);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this inventory item?")) return;
    try {
      await api.deleteAdminInventoryItem(id);
      notify("Item deleted successfully");
      loadData();
    } catch (err: any) {
      notify("Failed to delete (might be linked to distribution history).", true);
    }
  };

  const handleAllocate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!allocateItem || !allocateStore || !allocateQty) return;
    
    try {
      await api.distributeInventory(allocateItem.id, allocateStore, parseInt(allocateQty) || 0);
      setAllocateItem(null);
      setAllocateStore('');
      setAllocateQty('');
      notify(`Stock allocated to store successfully!`);
      loadData();
    } catch (err: any) {
      notify(err.message, true); // This will show the "Not enough stock" error
    }
  };

  const handleDeleteLog = async (logId: string) => {
    if (!confirm("Are you sure you want to delete this distribution? The items will be returned to the main inventory.")) return;
    try {
      await api.deleteDistributionLog(logId);
      notify("Distribution deleted and stock restored");
      loadData();
    } catch (err: any) {
      notify(err.message, true);
    }
  };

  const filteredLogs = logs.filter(log => {
    if (filterStore !== 'all' && log.store_id !== filterStore) return false;
    
    if (filterStartDate) {
      const logDate = new Date(log.given_at).setHours(0,0,0,0);
      const startDate = new Date(filterStartDate).setHours(0,0,0,0);
      if (logDate < startDate) return false;
    }
    
    if (filterEndDate) {
      const logDate = new Date(log.given_at).setHours(0,0,0,0);
      const endDate = new Date(filterEndDate).setHours(0,0,0,0);
      if (logDate > endDate) return false;
    }

    return true;
  });

  const totalFilteredQuantity = filteredLogs.reduce((sum, log) => sum + log.quantity_given, 0);
  const totalFilteredValue = filteredLogs.reduce((sum, log) => sum + (log.total_value || 0), 0);

  return (
    <div className="space-y-8 select-none animate-fade-in relative">
      {/* Notifications */}
      {notification && (
        <div className={`fixed top-24 right-8 z-50 rounded-2xl p-4 shadow-lg border flex items-center space-x-3 animate-slide-down ${
          notification.isError ? 'bg-red-50 border-red-200 text-red-700' : 'bg-primary text-white border-blue-50/15'
        }`}>
          <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${
            notification.isError ? 'bg-red-100 text-red-500' : 'bg-white/10 text-white'
          }`}>
            {notification.isError ? <AlertTriangle className="h-5 w-5 stroke-[2.5px]" /> : <CheckCircle className="h-5 w-5 stroke-[2.5px]" />}
          </div>
          <span className="text-xs font-black tracking-wide pr-2">{notification.message}</span>
        </div>
      )}

      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-black text-text-primary">
            Master Inventory & Supplies
          </h2>
          <p className="text-xs font-semibold text-text-muted mt-1">
            Manage central supplies (like packing covers) and distribute them to store outlets.
          </p>
        </div>

        <button
          onClick={() => setShowAddItem(true)}
          className="flex items-center space-x-2 rounded-xl bg-primary hover:bg-primary-dark px-4 py-3 text-xs font-bold text-white shadow-lg shadow-primary/10 transition-all active:scale-95 cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>Add New Item</span>
        </button>
      </div>

      {/* TABS */}
      <div className="flex border-b border-gray-100 space-x-8 text-sm font-bold text-text-muted">
        <button
          onClick={() => setActiveTab('inventory')}
          className={`pb-3 transition-colors relative cursor-pointer ${
            activeTab === 'inventory' ? 'text-primary' : 'hover:text-text-primary'
          }`}
        >
          <span className="flex items-center space-x-2"><Package className="h-4 w-4"/> <span>Master Stock</span></span>
          {activeTab === 'inventory' && <span className="absolute bottom-0 inset-x-0 h-0.5 bg-primary rounded-full"></span>}
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`pb-3 transition-colors relative cursor-pointer ${
            activeTab === 'history' ? 'text-primary' : 'hover:text-text-primary'
          }`}
        >
          <span className="flex items-center space-x-2"><History className="h-4 w-4"/> <span>Distribution Log</span></span>
          {activeTab === 'history' && <span className="absolute bottom-0 inset-x-0 h-0.5 bg-primary rounded-full"></span>}
        </button>
      </div>

      {/* CONTENT */}
      {activeTab === 'inventory' && (
        <div className="rounded-3xl bg-white border border-gray-100 p-6 shadow-sm overflow-hidden">
          {items.length === 0 ? (
            <div className="py-12 text-center text-text-muted text-sm font-medium">
              No inventory items found. Add some supplies first.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {items.map(item => (
                <div key={item.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-5 flex flex-col justify-between hover:shadow-md transition-all">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-black text-slate-800 text-lg">{item.name}</h3>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">
                        Stock • ₹{item.unit_price?.toFixed(2) || '0.00'} / unit
                      </p>
                    </div>
                    <div className="bg-white px-3 py-1.5 rounded-xl border border-slate-200">
                      <span className="font-mono text-xl font-black text-primary-dark">{item.quantity}</span>
                    </div>
                  </div>
                  
                  <div className="flex space-x-2 mt-4 pt-4 border-t border-slate-200">
                    <button
                      onClick={() => { setAllocateItem(item); setAllocateStore(''); setAllocateQty(''); }}
                      className="flex-1 bg-primary text-white py-2 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-primary-dark transition-colors cursor-pointer flex justify-center items-center space-x-1"
                    >
                      <Send className="h-3 w-3" />
                      <span>Give to Store</span>
                    </button>
                    <button
                      onClick={() => { setEditItem(item); setEditQty(item.quantity.toString()); setEditPrice(item.unit_price?.toString() || '0'); }}
                      className="p-2 bg-white border border-slate-200 text-slate-500 rounded-xl hover:text-blue-600 hover:border-blue-200 transition-colors cursor-pointer"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="p-2 bg-white border border-slate-200 text-slate-500 rounded-xl hover:text-red-500 hover:border-red-200 transition-colors cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'history' && (
        <div className="space-y-4">
          {/* Summary and Filters */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            
            {/* Filters */}
            <div className="xl:col-span-2 rounded-3xl bg-white border border-gray-100 p-6 shadow-sm flex flex-col justify-center">
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-800 mb-4 flex items-center gap-2">
                <Filter className="h-4 w-4 text-primary" /> 
                <span>Filter Distribution Logs</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-text-muted mb-2">Store</label>
                  <select
                    value={filterStore}
                    onChange={(e) => setFilterStore(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-3 text-xs outline-none focus:border-primary focus:bg-white font-semibold text-slate-800 appearance-none"
                    style={{ backgroundImage: 'url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%2364748b\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3e%3cpolyline points=\'6 9 12 15 18 9\'/%3e%3c/svg%3e")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center', backgroundSize: '1em' }}
                  >
                    <option value="all">All Stores</option>
                    {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-text-muted mb-2">Start Date</label>
                  <input
                    type="date"
                    value={filterStartDate}
                    onChange={(e) => setFilterStartDate(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-3 text-xs outline-none focus:border-primary focus:bg-white font-semibold text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-text-muted mb-2">End Date</label>
                  <input
                    type="date"
                    value={filterEndDate}
                    onChange={(e) => setFilterEndDate(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-3 text-xs outline-none focus:border-primary focus:bg-white font-semibold text-slate-800"
                  />
                </div>
              </div>
            </div>

            {/* Summary Card */}
            <div className="rounded-3xl bg-slate-800 border border-slate-700 p-6 shadow-sm text-white flex flex-col justify-center relative overflow-hidden">
              <div className="absolute right-0 bottom-0 opacity-10 translate-x-1/4 translate-y-1/4 pointer-events-none">
                <Package className="h-32 w-32" />
              </div>
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-3 relative z-10">Total Value Distributed</h4>
              <div className="relative z-10">
                <p className="text-3xl font-black font-mono">₹{totalFilteredValue.toFixed(2)}</p>
                <div className="flex items-center space-x-2 mt-2">
                  <span className="bg-white/10 px-2 py-1 rounded-md text-xs font-bold text-white shadow-sm">
                    {totalFilteredQuantity} Items
                  </span>
                  <span className="text-xs font-medium text-slate-300">Given Total</span>
                </div>
              </div>
            </div>
            
          </div>

          <div className="rounded-3xl bg-white border border-gray-100 p-6 shadow-sm overflow-hidden">
            {filteredLogs.length === 0 ? (
              <div className="py-12 text-center text-text-muted text-sm font-medium">
                No distribution history yet for the selected filters.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px] text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-50 text-[10px] font-bold uppercase tracking-widest text-text-muted">
                      <th className="pb-3 pl-2">Date</th>
                      <th className="pb-3">Store</th>
                      <th className="pb-3">Item</th>
                      <th className="pb-3 text-right">Quantity</th>
                      <th className="pb-3 text-right">Total Value</th>
                      <th className="pb-3 pr-2"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50/50 text-xs font-semibold text-text-primary">
                    {filteredLogs.map(log => (
                      <tr key={log.id} className="hover:bg-blue-50/10 transition-colors">
                        <td className="py-4 pl-2 font-mono text-slate-500 text-[10px]">
                          {new Date(log.given_at).toLocaleString()}
                        </td>
                        <td className="py-4">
                          <div className="flex items-center space-x-2">
                            <Building className="h-4 w-4 text-primary opacity-50" />
                            <span className="font-bold text-slate-700">{log.store.name}</span>
                          </div>
                        </td>
                        <td className="py-4 font-bold text-slate-800">{log.item?.name || 'Unknown Item'}</td>
                        <td className="py-4 text-right">
                          <span className="font-mono text-sm font-black text-emerald-600">
                            +{log.quantity_given}
                          </span>
                        </td>
                        <td className="py-4 text-right">
                          <span className="font-mono text-sm font-black text-slate-700">
                            ₹{log.total_value?.toFixed(2) || '0.00'}
                          </span>
                        </td>
                        <td className="py-4 text-right pr-2">
                          <button
                            onClick={() => handleDeleteLog(log.id)}
                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            title="Delete and Restore Stock"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- MODALS --- */}

      {/* Add Item Modal */}
      {showAddItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-sm rounded-[24px] bg-white p-7 shadow-2xl animate-slide-up border border-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-sm font-black text-text-primary uppercase tracking-wide">
                Add Inventory Item
              </h3>
              <button onClick={() => setShowAddItem(false)} className="rounded-lg p-1 hover:bg-gray-50 text-text-muted cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-text-muted mb-1.5">Item Name</label>
                <input
                  type="text" required value={newItemName} onChange={e => setNewItemName(e.target.value)}
                  placeholder="e.g. Packing Cover"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-3 text-xs outline-none focus:border-primary focus:bg-white font-semibold"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-text-muted mb-1.5">Quantity</label>
                  <input
                    type="number" required min="0" value={newItemQty} onChange={e => setNewItemQty(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-3 text-xs outline-none focus:border-primary focus:bg-white font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-text-muted mb-1.5">Per Piece Price (₹)</label>
                  <input
                    type="number" required min="0" step="0.01" value={newItemPrice} onChange={e => setNewItemPrice(e.target.value)}
                    placeholder="0.00"
                    className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-3 text-xs outline-none focus:border-primary focus:bg-white font-mono font-bold"
                  />
                </div>
              </div>
              <button type="submit" className="w-full rounded-xl bg-primary hover:bg-primary-dark py-3 text-xs font-bold text-white shadow-lg shadow-primary/10 transition-colors mt-2 cursor-pointer">
                Save Item
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Edit Item Modal */}
      {editItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-sm rounded-[24px] bg-white p-7 shadow-2xl animate-slide-up border border-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-sm font-black text-text-primary uppercase tracking-wide">
                Update Quantity: {editItem.name}
              </h3>
              <button onClick={() => setEditItem(null)} className="rounded-lg p-1 hover:bg-gray-50 text-text-muted cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleUpdate} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-text-muted mb-1.5">Quantity</label>
                  <input
                    type="number" required min="0" value={editQty} onChange={e => setEditQty(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-3 text-xs outline-none focus:border-primary focus:bg-white font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-text-muted mb-1.5">Price (₹)</label>
                  <input
                    type="number" required min="0" step="0.01" value={editPrice} onChange={e => setEditPrice(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-3 text-xs outline-none focus:border-primary focus:bg-white font-mono font-bold"
                  />
                </div>
              </div>
              <button type="submit" className="w-full rounded-xl bg-primary hover:bg-primary-dark py-3 text-xs font-bold text-white shadow-lg shadow-primary/10 transition-colors mt-2 cursor-pointer">
                Update Stock
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Allocate to Store Modal */}
      {allocateItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-sm rounded-[24px] bg-white p-7 shadow-2xl animate-slide-up border border-white">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-display text-sm font-black text-text-primary uppercase tracking-wide flex items-center space-x-2">
                <Send className="h-4 w-4 text-primary" />
                <span>Distribute Item</span>
              </h3>
              <button onClick={() => setAllocateItem(null)} className="rounded-lg p-1 hover:bg-gray-50 text-text-muted cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="bg-primary/5 border border-primary/10 rounded-xl p-3 mb-4 text-center">
              <p className="text-[10px] font-bold text-primary uppercase tracking-wider mb-0.5">{allocateItem.name}</p>
              <p className="font-mono text-sm font-black text-primary-dark">{allocateItem.quantity} Available in Master Stock</p>
            </div>

            <form onSubmit={handleAllocate} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-text-muted mb-1.5">Select Store</label>
                <select
                  required value={allocateStore} onChange={e => setAllocateStore(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-3 text-xs outline-none focus:border-primary focus:bg-white font-semibold text-slate-800"
                >
                  <option value="">-- Choose Store --</option>
                  {stores.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-text-muted mb-1.5">Quantity to Give</label>
                <input
                  type="number" required min="1" max={allocateItem.quantity} value={allocateQty} onChange={e => setAllocateQty(e.target.value)}
                  placeholder="e.g. 50"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-3 text-xs outline-none focus:border-primary focus:bg-white font-mono font-bold"
                />
              </div>
              <button type="submit" className="w-full rounded-xl bg-emerald-500 hover:bg-emerald-600 py-3 text-xs font-bold text-white shadow-lg shadow-emerald-500/20 transition-colors mt-2 cursor-pointer flex justify-center items-center space-x-2">
                <CheckCircle className="h-4 w-4" />
                <span>Confirm Distribution</span>
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
