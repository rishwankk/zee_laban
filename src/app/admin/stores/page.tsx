'use client';

import { useState, useEffect } from 'react';
import { api, Store } from '@/lib/supabase';
import { 
  Building, 
  MapPin, 
  Phone, 
  Plus, 
  UserCheck, 
  X,
  CheckCircle,
  Mail,
  Lock,
  Compass,
  Edit,
  ShoppingBag,
  TrendingUp
} from 'lucide-react';

export default function AdminStoresPage() {
  const [stores, setStores] = useState<Store[]>([]);
  const [notification, setNotification] = useState<string | null>(null);
  
  // Modal states
  const [showAddStore, setShowAddStore] = useState(false);
  const [newStoreName, setNewStoreName] = useState('');
  const [newOwnerName, setNewOwnerName] = useState('');
  const [newOwnerMobile, setNewOwnerMobile] = useState('');
  const [newOwnerEmail, setNewOwnerEmail] = useState('');
  const [newOwnerPassword, setNewOwnerPassword] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [newPincode, setNewPincode] = useState('');

  // Edit Modal states
  const [showEditStore, setShowEditStore] = useState(false);
  const [editingStoreId, setEditingStoreId] = useState<string | null>(null);
  const [editStoreName, setEditStoreName] = useState('');
  const [editOwnerName, setEditOwnerName] = useState('');
  const [editOwnerMobile, setEditOwnerMobile] = useState('');
  const [editOwnerEmail, setEditOwnerEmail] = useState('');
  const [editOwnerPassword, setEditOwnerPassword] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editPincode, setEditPincode] = useState('');

  // Store-wise Sales Modal States
  const [selectedStoreForSales, setSelectedStoreForSales] = useState<Store | null>(null);
  const [storeSalesItems, setStoreSalesItems] = useState<{ name: string; category: string; quantity: number; revenue: number }[]>([]);
  const [storeSalesLoading, setStoreSalesLoading] = useState(false);

  const handleOpenStoreSales = async (st: Store) => {
    setSelectedStoreForSales(st);
    setStoreSalesLoading(true);
    try {
      const bills = await api.getBillsByStore(st.id);
      
      const allItems = await api.getAllBillItems();
      
      const billIds = new Set(bills.map(b => b.id));
      const storeItems = allItems.filter((item: any) => billIds.has(item.bill_id));
      
      const productMap: Record<string, { name: string; category: string; quantity: number; revenue: number }> = {};
      const prods = await api.getProducts();
      
      storeItems.forEach((item: any) => {
        const prod = prods.find(p => p.id === item.product_id);
        const category = prod ? prod.category : 'Dessert';
        
        if (!productMap[item.product_id]) {
          productMap[item.product_id] = {
            name: item.product_name,
            category,
            quantity: 0,
            revenue: 0
          };
        }
        
        productMap[item.product_id].quantity += item.quantity;
        productMap[item.product_id].revenue += item.total_price;
      });
      
      const salesArray = Object.values(productMap).sort((a, b) => b.quantity - a.quantity);
      setStoreSalesItems(salesArray);
    } catch (err) {
      console.error("Failed to load store sales items", err);
    } finally {
      setStoreSalesLoading(false);
    }
  };

  const loadData = async () => {
    try {
      const sData = await api.getStores();
      setStores(sData);
    } catch (err) {
      console.error("Failed to load stores listings", err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddStore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !newStoreName || 
      !newOwnerName || 
      !newOwnerMobile || 
      !newOwnerEmail || 
      !newOwnerPassword || 
      !newLocation || 
      !newPincode
    ) {
      return;
    }

    try {
      await api.addStore({
        name: newStoreName,
        owner_name: newOwnerName,
        owner_mobile: newOwnerMobile,
        owner_email: newOwnerEmail,
        owner_password: newOwnerPassword,
        location: newLocation,
        pincode: newPincode
      });

      setShowAddStore(false);
      setNewStoreName('');
      setNewOwnerName('');
      setNewOwnerMobile('');
      setNewOwnerEmail('');
      setNewOwnerPassword('');
      setNewLocation('');
      setNewPincode('');
      
      setNotification("Store registered and Store Account created successfully! 🏪");
      setTimeout(() => setNotification(null), 3000);
      await loadData();
    } catch (err) {
      console.error("Failed to add store outlet", err);
    }
  };

  const handleOpenEditStore = (st: Store) => {
    setEditingStoreId(st.id);
    setEditStoreName(st.name);
    setEditOwnerName(st.owner_name);
    setEditOwnerMobile(st.owner_mobile);
    setEditOwnerEmail(st.owner_email);
    setEditOwnerPassword(st.owner_password || '');
    setEditLocation(st.location);
    setEditPincode(st.pincode);
    setShowEditStore(true);
  };

  const handleEditStoreSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !editingStoreId ||
      !editStoreName ||
      !editOwnerName ||
      !editOwnerMobile ||
      !editOwnerEmail ||
      !editOwnerPassword ||
      !editLocation ||
      !editPincode
    ) {
      return;
    }

    try {
      await api.updateStore(editingStoreId, {
        name: editStoreName,
        owner_name: editOwnerName,
        owner_mobile: editOwnerMobile,
        owner_email: editOwnerEmail,
        owner_password: editOwnerPassword,
        location: editLocation,
        pincode: editPincode
      });

      setShowEditStore(false);
      setEditingStoreId(null);
      setNotification("Store details updated successfully! 📝");
      setTimeout(() => setNotification(null), 3000);
      await loadData();
    } catch (err) {
      console.error("Failed to update store details", err);
    }
  };

  const handleDeactivateStore = async (id: string) => {
    if (!confirm("Are you sure you want to suspend this store outlet? This locks counter terminals.")) return;
    try {
      await api.updateStore(id, { is_active: false });
      await loadData();
    } catch (err) {
      console.error("Failed to suspend store", err);
    }
  };

  return (
    <div className="space-y-8 select-none animate-fade-in relative">
      
      {/* Dynamic Toast Alert */}
      {notification && (
        <div className="fixed top-24 right-8 z-40 bg-primary text-white rounded-2xl p-4 shadow-lg border border-blue-50/15 flex items-center space-x-3 select-none animate-slide-down">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-white">
            <CheckCircle className="h-5 w-5 stroke-[2.5px]" />
          </div>
          <span className="text-xs font-black tracking-wide pr-2">{notification}</span>
        </div>
      )}

      {/* HEADER SECTION */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-black text-text-primary">
            Store Footprint Registry
          </h2>
          <p className="text-xs font-semibold text-text-muted mt-1">
            Create, audit, and configure ZEE LABAN physical dessert store outlets and their login accounts.
          </p>
        </div>

        <button
          onClick={() => setShowAddStore(true)}
          className="flex items-center space-x-2 rounded-xl bg-primary hover:bg-primary-dark px-4 py-3 text-xs font-bold text-white shadow-lg shadow-primary/10 transition-all active:scale-95 cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>Add New Store</span>
        </button>
      </div>

      {/* STORES CARD LIST */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {stores.map((st) => (
          <div 
            key={st.id} 
            onClick={() => handleOpenStoreSales(st)}
            className="flex flex-col justify-between overflow-hidden rounded-3xl bg-white border border-gray-100 p-6 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 hover:border-primary/20 group cursor-pointer select-none"
            title="Click to view detailed dessert preparation ledger"
          >
            <div>
              {/* Status Tag */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary-light text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                  <Building className="h-5 w-5" />
                </div>
                <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-emerald-800">
                  Active Outlet
                </span>
              </div>

              <h3 className="font-display text-base font-black text-text-primary leading-tight group-hover:text-primary transition-colors mb-4">
                {st.name}
              </h3>

              {/* Details */}
              <div className="space-y-3 font-semibold text-xs text-text-muted mb-6">
                <div className="flex items-start space-x-2">
                  <MapPin className="h-4.5 w-4.5 text-primary mt-0.5 shrink-0" />
                  <span className="leading-relaxed">{st.location}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Compass className="h-4.5 w-4.5 text-primary shrink-0" />
                  <span>PIN: {st.pincode}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Phone className="h-4.5 w-4.5 text-primary shrink-0" />
                  <span>{st.owner_mobile}</span>
                </div>
                <div className="flex items-center space-x-2 pt-2 border-t border-dashed border-gray-100/70">
                  <UserCheck className="h-4.5 w-4.5 text-primary shrink-0" />
                  <span className="truncate">
                    Owner: <strong className="text-text-primary">{st.owner_name}</strong>
                  </span>
                </div>
                <div className="text-[10px] text-text-muted/80 pt-1 flex items-center space-x-1.5">
                  <Mail className="h-3 w-3 text-primary" />
                  <span className="font-mono">{st.owner_email}</span>
                </div>
              </div>
            </div>

            {/* Store Actions side-by-side */}
            <div className="flex items-center space-x-2 pt-3 border-t border-gray-50/50">
              <button
                onClick={(e) => { e.stopPropagation(); handleOpenEditStore(st); }}
                className="flex-1 flex items-center justify-center space-x-1.5 rounded-xl bg-sky-50 hover:bg-primary py-2.5 text-xs font-bold text-primary hover:text-white transition-colors cursor-pointer text-center"
              >
                <Edit className="h-3.5 w-3.5" />
                <span>Edit Store</span>
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); handleDeactivateStore(st.id); }}
                className="rounded-xl bg-red-50 hover:bg-danger px-3 py-2.5 text-xs font-bold text-danger hover:text-white transition-colors cursor-pointer text-center animate-fade-in"
              >
                Suspend
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* ======================================================== */}
      {/* MODAL: ADD STORE */}
      {/* ======================================================== */}
      {showAddStore && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl animate-scale-up border border-gray-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-sm font-black text-text-primary uppercase tracking-wide">
                Register New ZEE LABAN Store
              </h3>
              <button onClick={() => setShowAddStore(false)} className="rounded-lg p-1 hover:bg-gray-50 text-text-muted">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleAddStore} className="space-y-4">
              
              {/* Store Details Section */}
              <div className="bg-gray-50/50 p-4 rounded-2xl border border-gray-100 space-y-4">
                <h4 className="text-[11px] font-black uppercase tracking-wider text-primary border-b border-primary/10 pb-1">
                  1. Outlet Details
                </h4>
                
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-text-muted mb-1">Store Outlet Name</label>
                  <input
                    type="text"
                    required
                    value={newStoreName}
                    onChange={(e) => setNewStoreName(e.target.value)}
                    placeholder="E.g., Zee Laban Calicut Junction"
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-xs outline-none focus:border-primary"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-text-muted mb-1">Store Location</label>
                    <input
                      type="text"
                      required
                      value={newLocation}
                      onChange={(e) => setNewLocation(e.target.value)}
                      placeholder="E.g., Palayam Junction, Kozhikode, Kerala"
                      className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-xs outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-text-muted mb-1">Pincode</label>
                    <input
                      type="text"
                      required
                      value={newPincode}
                      onChange={(e) => setNewPincode(e.target.value)}
                      placeholder="673001"
                      className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-xs outline-none focus:border-primary"
                    />
                  </div>
                </div>
              </div>

              {/* Owner Credentials Section */}
              <div className="bg-gray-50/50 p-4 rounded-2xl border border-gray-100 space-y-4">
                <h4 className="text-[11px] font-black uppercase tracking-wider text-primary border-b border-primary/10 pb-1">
                  2. Owner & Store Login Credentials
                </h4>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-text-muted mb-1">Owner Name</label>
                    <input
                      type="text"
                      required
                      value={newOwnerName}
                      onChange={(e) => setNewOwnerName(e.target.value)}
                      placeholder="E.g., Arshad Khan"
                      className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-xs outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-text-muted mb-1">Mobile Number</label>
                    <input
                      type="tel"
                      required
                      value={newOwnerMobile}
                      onChange={(e) => setNewOwnerMobile(e.target.value)}
                      placeholder="E.g., +91 7994776519"
                      className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-xs outline-none focus:border-primary"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-text-muted mb-1">Email Address</label>
                    <input
                      type="email"
                      required
                      value={newOwnerEmail}
                      onChange={(e) => setNewOwnerEmail(e.target.value)}
                      placeholder="E.g., calicut@zeelaban.com"
                      className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-xs outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-text-muted mb-1">Login Password</label>
                    <input
                      type="password"
                      required
                      value={newOwnerPassword}
                      onChange={(e) => setNewOwnerPassword(e.target.value)}
                      placeholder="Password for store account"
                      className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-xs outline-none focus:border-primary"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-gray-50">
                <button
                  type="button"
                  onClick={() => setShowAddStore(false)}
                  className="rounded-xl border border-gray-200 px-4 py-2.5 text-xs font-bold text-text-muted hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-primary hover:bg-primary-dark px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-primary/10 transition-colors"
                >
                  Save Store & Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: EDIT STORE */}
      {/* ======================================================== */}
      {showEditStore && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl animate-scale-up border border-gray-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-sm font-black text-text-primary uppercase tracking-wide">
                Modify ZEE LABAN Store Details
              </h3>
              <button onClick={() => { setShowEditStore(false); setEditingStoreId(null); }} className="rounded-lg p-1 hover:bg-gray-50 text-text-muted">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleEditStoreSubmit} className="space-y-4">
              
              {/* Store Details Section */}
              <div className="bg-gray-50/50 p-4 rounded-2xl border border-gray-100 space-y-4 font-semibold">
                <h4 className="text-[11px] font-black uppercase tracking-wider text-primary border-b border-primary/10 pb-1">
                  1. Outlet Details
                </h4>
                
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-text-muted mb-1">Store Outlet Name</label>
                  <input
                    type="text"
                    required
                    value={editStoreName}
                    onChange={(e) => setEditStoreName(e.target.value)}
                    placeholder="E.g., Zee Laban Calicut Junction"
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-xs outline-none focus:border-primary font-semibold"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-text-muted mb-1">Store Location</label>
                    <input
                      type="text"
                      required
                      value={editLocation}
                      onChange={(e) => setEditLocation(e.target.value)}
                      placeholder="E.g., Palayam Junction, Kozhikode, Kerala"
                      className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-xs outline-none focus:border-primary font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-text-muted mb-1">Pincode</label>
                    <input
                      type="text"
                      required
                      value={editPincode}
                      onChange={(e) => setEditPincode(e.target.value)}
                      placeholder="673001"
                      className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-xs outline-none focus:border-primary font-semibold"
                    />
                  </div>
                </div>
              </div>

              {/* Owner Credentials Section */}
              <div className="bg-gray-50/50 p-4 rounded-2xl border border-gray-100 space-y-4 font-semibold">
                <h4 className="text-[11px] font-black uppercase tracking-wider text-primary border-b border-primary/10 pb-1">
                  2. Owner & Store Login Credentials
                </h4>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-text-muted mb-1">Owner Name</label>
                    <input
                      type="text"
                      required
                      value={editOwnerName}
                      onChange={(e) => setEditOwnerName(e.target.value)}
                      placeholder="E.g., Arshad Khan"
                      className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-xs outline-none focus:border-primary font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-text-muted mb-1">Mobile Number</label>
                    <input
                      type="tel"
                      required
                      value={editOwnerMobile}
                      onChange={(e) => setEditOwnerMobile(e.target.value)}
                      placeholder="E.g., +91 7994776519"
                      className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-xs outline-none focus:border-primary font-semibold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-text-muted mb-1">Email Address</label>
                    <input
                      type="email"
                      required
                      value={editOwnerEmail}
                      onChange={(e) => setEditOwnerEmail(e.target.value)}
                      placeholder="E.g., calicut@zeelaban.com"
                      className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-xs outline-none focus:border-primary font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-text-muted mb-1">Login Password</label>
                    <input
                      type="password"
                      required
                      value={editOwnerPassword}
                      onChange={(e) => setEditOwnerPassword(e.target.value)}
                      placeholder="Password for store account"
                      className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-xs outline-none focus:border-primary font-semibold"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-gray-50">
                <button
                  type="button"
                  onClick={() => { setShowEditStore(false); setEditingStoreId(null); }}
                  className="rounded-xl border border-gray-200 px-4 py-2.5 text-xs font-bold text-text-muted hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-primary hover:bg-primary-dark px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-primary/10 transition-colors"
                >
                  Update Store & Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: STORE SALES DETAIL */}
      {/* ======================================================== */}
      {selectedStoreForSales && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in">
          <div className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl animate-scale-up border border-gray-100 max-h-[85vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between mb-4 shrink-0">
              <div className="flex items-center space-x-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-light text-primary">
                  <ShoppingBag className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h3 className="font-display text-sm font-black text-text-primary uppercase tracking-wide">
                    Dessert Sales Ledger
                  </h3>
                  <p className="text-[10px] font-bold text-text-muted mt-0.5">
                    {selectedStoreForSales.name} &bull; {selectedStoreForSales.location}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => { setSelectedStoreForSales(null); setStoreSalesItems([]); }} 
                className="rounded-lg p-1.5 hover:bg-gray-50 text-text-muted transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Sales Table with beautiful fonts & lag-free layout */}
            <div className="flex-1 overflow-y-auto pr-1 py-2 font-sans antialiased text-slate-600 font-medium">
              {storeSalesLoading ? (
                <div className="flex flex-col items-center justify-center h-48 space-y-3">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                  <span className="text-xs font-bold text-text-muted">Aggregating checkout metrics...</span>
                </div>
              ) : storeSalesItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-center bg-slate-50 rounded-2xl p-6 border border-slate-100/50">
                  <TrendingUp className="h-8 w-8 text-slate-350 mb-2 stroke-[1.8px]" />
                  <span className="text-xs font-bold text-text-muted">No sales items recorded yet.</span>
                  <p className="text-[10px] text-text-muted/80 mt-1 max-w-[280px]">As soon as checkout registers are finalized on counter terminals, their sales logs will populate here.</p>
                </div>
              ) : (
                <div className="border border-slate-100 rounded-2xl overflow-hidden shadow-inner bg-slate-50/20">
                  <table className="w-full text-left border-collapse text-xs font-sans">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        <th className="py-3 px-4">Dessert Item Name</th>
                        <th className="py-3 px-3 text-center">Category</th>
                        <th className="py-3 px-3 text-center">Preparation Qty</th>
                        <th className="py-3 px-4 text-right">Aggregate Sales</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                      {storeSalesItems.map((item, idx) => (
                        <tr key={idx} className="hover:bg-white transition-colors">
                          <td className="py-3 px-4 font-bold text-slate-800">{item.name}</td>
                          <td className="py-3 px-3 text-center">
                            <span className="inline-flex rounded-full bg-blue-50 text-primary-dark px-2 py-0.5 text-[9px] font-bold uppercase">
                              {item.category}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center font-bold text-slate-500 font-mono">{item.quantity}</td>
                          <td className="py-3 px-4 text-right font-bold text-primary font-mono">₹{item.revenue.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => { setSelectedStoreForSales(null); setStoreSalesItems([]); }}
                className="rounded-xl bg-slate-100 hover:bg-slate-200 px-5 py-2.5 text-xs font-bold text-slate-600 transition-colors cursor-pointer"
              >
                Close Ledger
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
