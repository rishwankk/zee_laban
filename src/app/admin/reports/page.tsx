'use client';

import { useState, useEffect, useMemo } from 'react';
import { api, Bill, Store, BillItem, Product } from '@/lib/supabase';
import { 
  BarChart3, 
  Building, 
  FileDown, 
  Coins, 
  ShoppingBag,
  RefreshCw,
  Search,
  Users,
  Smartphone,
  Sparkles,
  CreditCard,
  QrCode,
  ChevronDown,
  TrendingUp
} from 'lucide-react';

interface CustomerRecord {
  name: string;
  mobile: string;
  visits: number;
  spent: number;
}

interface ProductSalesEntry {
  productId: string;
  name: string;
  category: string;
  quantity: number;
  revenue: number;
}

export default function AdminReportsPage() {
  const [stores, setStores] = useState<Store[]>([]);
  const [allBills, setAllBills] = useState<Bill[]>([]);
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [loading, setLoading] = useState(false);

  // Product sales data
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [allBillItems, setAllBillItems] = useState<BillItem[]>([]);

  const [activeTab, setActiveTab] = useState<'consolidated' | 'product_sales' | 'customers'>('consolidated');

  // Filters
  const [dateRangePreset, setDateRangePreset] = useState<'today' | 'week' | 'month' | 'custom'>('today');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');
  
  // Customer Search Filter
  const [customerSearch, setCustomerSearch] = useState('');

  // Lazy loading limits
  const [productLimit, setProductLimit] = useState(20);

  // Print GST State
  const [isPrintingGST, setIsPrintingGST] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const sData = await api.getStores();
      setStores(sData);

      const billsAccumulator: Bill[] = [];
      for (const st of sData) {
        const storeBills = await api.getBillsByStore(st.id);
        billsAccumulator.push(...storeBills);
      }
      setAllBills(billsAccumulator);

      // Load products
      const pData = await api.getProducts();
      setAllProducts(pData);

      // Load all bill items
      const items = await api.getAllBillItems();
      setAllBillItems(items);

      // Load all brand customers
      const cData = await api.getCustomerDirectory();
      setCustomers(cData);
    } catch (err) {
      console.error("Failed to load global reports data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const todayStr = new Date().toISOString().substring(0, 10);

  // Filter bills globally by selected date range and payment method
  const filteredBills = useMemo(() => allBills.filter(b => {
    const bDate = new Date(b.created_at);
    const bDateStr = b.created_at.substring(0, 10);

    if (dateRangePreset === 'today') {
      if (bDateStr !== todayStr) return false;
    } else if (dateRangePreset === 'week') {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      if (bDate < sevenDaysAgo) return false;
    } else if (dateRangePreset === 'month') {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      if (bDate < thirtyDaysAgo) return false;
    } else if (dateRangePreset === 'custom' && customStartDate && customEndDate) {
      const start = new Date(customStartDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(customEndDate);
      end.setHours(23, 59, 59, 999);
      if (bDate < start || bDate > end) return false;
    }

    if (paymentFilter && b.payment_method !== paymentFilter) return false;

    return true;
  }), [allBills, dateRangePreset, customStartDate, customEndDate, paymentFilter, todayStr]);

  // Calculate store-wise breakdowns
  const storeLedger = useMemo(() => stores.map(st => {
    const storeBills = filteredBills.filter(b => b.store_id === st.id);
    const revenue = storeBills.reduce((sum, b) => sum + b.total, 0);
    const orders = storeBills.length;
    const cgst = storeBills.reduce((sum, b) => sum + b.cgst, 0);
    const sgst = storeBills.reduce((sum, b) => sum + b.sgst, 0);
    const tax = cgst + sgst;

    return {
      id: st.id,
      name: st.name,
      address: st.location,
      orders,
      revenue,
      tax
    };
  }), [stores, filteredBills]);

  // Payment type breakdown
  const paymentBreakdown = useMemo(() => {
    const cashBills = filteredBills.filter(b => b.payment_method === 'Cash');
    const upiBills = filteredBills.filter(b => b.payment_method === 'UPI');
    const cardBills = filteredBills.filter(b => b.payment_method === 'Card');

    return {
      cash: { count: cashBills.length, revenue: cashBills.reduce((s, b) => s + b.total, 0) },
      upi: { count: upiBills.length, revenue: upiBills.reduce((s, b) => s + b.total, 0) },
      card: { count: cardBills.length, revenue: cardBills.reduce((s, b) => s + b.total, 0) }
    };
  }, [filteredBills]);

  const globalRevenue = storeLedger.reduce((sum, s) => sum + s.revenue, 0);
  const globalOrders = storeLedger.reduce((sum, s) => sum + s.orders, 0);
  const globalTax = storeLedger.reduce((sum, s) => sum + s.tax, 0);

  // Product Sales Performance (actual bill item data)
  const productSalesSummary = useMemo(() => {
    const filteredBillIds = new Set(filteredBills.map(b => b.id));
    const relevantItems = allBillItems.filter((item: any) => filteredBillIds.has(item.bill_id));

    const productMap: Record<string, ProductSalesEntry> = {};

    relevantItems.forEach((item: any) => {
      const prod = allProducts.find(p => p.id === item.product_id);
      const category = prod ? prod.category : 'Dessert';

      if (!productMap[item.product_id]) {
        productMap[item.product_id] = {
          productId: item.product_id,
          name: item.product_name || 'Unknown Product',
          category,
          quantity: 0,
          revenue: 0
        };
      }

      productMap[item.product_id].quantity += item.quantity;
      productMap[item.product_id].revenue += item.total_price;
    });

    return Object.values(productMap).sort((a, b) => b.quantity - a.quantity);
  }, [filteredBills, allBillItems, allProducts]);

  // Search filtered customers
  const filteredCustomers = customers.filter(c => {
    const q = customerSearch.toLowerCase();
    return c.name?.toLowerCase().includes(q) || c.mobile?.includes(q);
  });

  const handleExportPDF = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  // GST CSV Exporter
  const handleExportGSTCSV = () => {
    if (filteredBills.length === 0) return;
    
    let periodStr: string = dateRangePreset;
    if (dateRangePreset === 'today') periodStr = new Date().toISOString().substring(0, 10);
    if (dateRangePreset === 'custom') periodStr = `${customStartDate || 'start'}_to_${customEndDate || 'end'}`;

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += `GST Sales Report\nPeriod: ${periodStr}\n\n`;
    csvContent += "Date,Bill Number,Store Name,Payment Method,Net Amount (INR),CGST (INR),SGST (INR),Total Amount (INR)\n";
    
    filteredBills.forEach(b => {
      const net = b.total - (b.cgst + b.sgst);
      const storeName = stores.find(s => s.id === b.store_id)?.name || 'Unknown Store';
      const escapedStoreName = storeName.replace(/"/g, '""');
      
      csvContent += `"${b.created_at.substring(0,10)}","${b.bill_number}","${escapedStoreName}","${b.payment_method}",${net.toFixed(2)},${b.cgst.toFixed(2)},${b.sgst.toFixed(2)},${b.total.toFixed(2)}\n`;
    });
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `gst_sales_report_${periodStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportGSTPDF = () => {
    setIsPrintingGST(true);
    setTimeout(() => {
      window.print();
      setIsPrintingGST(false);
    }, 250);
  };

  const getPeriodDisplayString = () => {
    if (dateRangePreset === 'today') return `Today (${new Date().toLocaleDateString()})`;
    if (dateRangePreset === 'custom') {
      return `${customStartDate || 'Start'} to ${customEndDate || 'End'}`;
    }
    if (dateRangePreset === 'week') return 'Last 7 Days';
    if (dateRangePreset === 'month') return 'Last 30 Days';
    return dateRangePreset;
  };

  // CSV Exporter for Super Admins
  const handleExportCustomersCSV = () => {
    if (customers.length === 0) return;
    
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Customer Name,Mobile Number,Total Visits,Total Spent (INR)\n";
    
    filteredCustomers.forEach(c => {
      const escapedName = c.name.replace(/"/g, '""');
      csvContent += `"${escapedName}","${c.mobile}",${c.visits},${c.spent.toFixed(2)}\n`;
    });
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "zee_laban_global_customers.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Lazy-loaded product sales slice
  const visibleProducts = productSalesSummary.slice(0, productLimit);
  const hasMoreProducts = productSalesSummary.length > productLimit;

  return (
    <>
      <div className={`space-y-8 select-none animate-fade-in print:p-6 print:bg-white font-sans antialiased ${isPrintingGST ? 'hidden' : 'block'}`}>
        
        {/* PROFESSIONAL PRINT HEADER (Hidden on Screen) */}
      <div className="hidden print:block text-center border-b-2 border-gray-900 pb-6 mb-8">
        <h1 className="text-3xl font-black text-gray-900 uppercase tracking-widest">ZEE LABAN DESSERTS</h1>
        <h2 className="text-xl font-bold text-gray-700 mt-2">Consolidated Global Sales Ledger</h2>
        <p className="text-sm font-semibold text-gray-500 mt-1">Generated on: {new Date().toLocaleString()}</p>
      </div>

      {/* HEADER SECTION */}
      <div className="flex items-center justify-between print:hidden">
        <div>
          <h2 className="font-display text-2xl font-black text-text-primary tracking-tight">
            Consolidated Brand Ledger
          </h2>
          <p className="text-xs font-semibold text-text-muted mt-1 leading-relaxed">
            Audit multi-store cash draws, aggregate orders, and extract brand-wide customer directories.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={loadData}
            disabled={loading}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-white border border-gray-100 hover:bg-gray-50 text-text-muted shadow-sm transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`h-4.5 w-4.5 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {activeTab === 'consolidated' && (
            <div className="flex items-center space-x-2">
              <button
                onClick={handleExportGSTCSV}
                className="flex items-center space-x-2 rounded-xl bg-violet-500 hover:bg-violet-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-violet-500/10 transition-all active:scale-95 cursor-pointer"
              >
                <FileDown className="h-4.5 w-4.5" />
                <span>GST (CSV)</span>
              </button>
              <button
                onClick={handleExportGSTPDF}
                className="flex items-center space-x-2 rounded-xl bg-indigo-500 hover:bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-indigo-500/10 transition-all active:scale-95 cursor-pointer"
              >
                <FileDown className="h-4.5 w-4.5" />
                <span>GST (PDF)</span>
              </button>
              <button
                onClick={handleExportPDF}
                className="flex items-center space-x-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-emerald-500/10 transition-all active:scale-95 cursor-pointer"
              >
                <FileDown className="h-4.5 w-4.5" />
                <span>Save as PDF</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* SUB TABS FOR ADMIN AUDIT */}
      <div className="flex border-b border-gray-100 space-x-6 text-sm font-bold text-text-muted print:hidden overflow-x-auto scrollbar-none">
        <button
          onClick={() => setActiveTab('consolidated')}
          className={`pb-3 transition-colors relative cursor-pointer whitespace-nowrap ${
            activeTab === 'consolidated' ? 'text-primary' : 'hover:text-text-primary'
          }`}
        >
          <span>Consolidated Store Sales</span>
          {activeTab === 'consolidated' && <span className="absolute bottom-0 inset-x-0 h-0.5 bg-primary rounded-full"></span>}
        </button>

        <button
          onClick={() => { setActiveTab('product_sales'); setProductLimit(20); }}
          className={`pb-3 transition-colors relative cursor-pointer whitespace-nowrap ${
            activeTab === 'product_sales' ? 'text-primary' : 'hover:text-text-primary'
          }`}
        >
          <span className="flex items-center space-x-1">
            <span>Product Sales Performance</span>
            <span className="rounded-full bg-emerald-50 text-emerald-600 text-[9px] px-1.5 py-0.5 font-bold font-sans">
              Live
            </span>
          </span>
          {activeTab === 'product_sales' && <span className="absolute bottom-0 inset-x-0 h-0.5 bg-primary rounded-full"></span>}
        </button>

        <button
          onClick={() => setActiveTab('customers')}
          className={`pb-3 transition-colors relative cursor-pointer whitespace-nowrap ${
            activeTab === 'customers' ? 'text-primary' : 'hover:text-text-primary'
          }`}
        >
          <span className="flex items-center space-x-1">
            <span>Customer directory extract</span>
            <span className="rounded-full bg-primary-light text-primary text-[9px] px-1.5 py-0.5 font-bold font-sans">
              Extract
            </span>
          </span>
          {activeTab === 'customers' && <span className="absolute bottom-0 inset-x-0 h-0.5 bg-primary rounded-full"></span>}
        </button>
      </div>

      {/* TAB 1: CONSOLIDATED STORE SALES */}
      {activeTab === 'consolidated' && (
        <div className="space-y-6">
          {/* Controls Bar */}
          <div className="rounded-3xl bg-white border border-gray-100 p-6 shadow-sm space-y-4 print:hidden">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex flex-wrap gap-2">
                {['today', 'week', 'month', 'custom'].map((preset) => (
                  <button
                    key={preset}
                    onClick={() => setDateRangePreset(preset as any)}
                    className={`rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-wider border cursor-pointer transition-all ${
                      dateRangePreset === preset
                        ? 'bg-primary border-transparent text-white shadow-sm'
                        : 'bg-white border-gray-100 hover:bg-gray-50 text-text-muted'
                    }`}
                  >
                    {preset === 'week' ? 'Past 7 Days' : preset === 'month' ? 'Past Month' : preset}
                  </button>
                ))}
              </div>

              <select
                value={paymentFilter}
                onChange={(e) => setPaymentFilter(e.target.value)}
                className="rounded-xl border border-gray-150 py-2.5 px-3 text-xs outline-none bg-white focus:border-primary/50 font-bold text-text-muted cursor-pointer max-w-[200px]"
              >
                <option value="">All Payments</option>
                <option value="Cash">💵 Cash Only</option>
                <option value="UPI">📱 UPI Only</option>
                <option value="Card">💳 Card Only</option>
              </select>
            </div>

            {dateRangePreset === 'custom' && (
              <div className="grid grid-cols-2 gap-4 max-w-md pt-2 animate-slide-down">
                <div>
                  <label className="block text-[8px] font-bold uppercase text-text-muted mb-1">Start Date</label>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs outline-none focus:border-primary font-medium"
                  />
                </div>
                <div>
                  <label className="block text-[8px] font-bold uppercase text-text-muted mb-1">End Date</label>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs outline-none focus:border-primary font-medium"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Sum Ledgers */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="rounded-3xl bg-white border border-gray-100 p-6 shadow-sm text-left">
              <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Collective Revenue</span>
              <h3 className="font-display text-2xl font-black text-primary mt-2 font-mono tracking-tight">₹{globalRevenue.toFixed(2)}</h3>
            </div>
            <div className="rounded-3xl bg-white border border-gray-100 p-6 shadow-sm text-left">
              <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Collective Orders</span>
              <h3 className="font-display text-2xl font-black text-text-primary mt-2 font-mono tracking-tight">{globalOrders}</h3>
            </div>
            <div className="rounded-3xl bg-white border border-gray-100 p-6 shadow-sm text-left">
              <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Collective GST Collections</span>
              <h3 className="font-display text-2xl font-black text-primary-dark mt-2 font-mono tracking-tight">₹{globalTax.toFixed(2)}</h3>
            </div>
          </div>

          {/* Payment Type Breakdown Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-2xl bg-gradient-to-br from-emerald-50 to-green-50/50 border border-emerald-100/60 p-5 shadow-sm flex items-center space-x-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 shrink-0">
                <Coins className="h-5 w-5 stroke-[2px]" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600/80">Cash Payments</p>
                <p className="font-mono text-lg font-black text-emerald-700 tracking-tight mt-0.5">₹{paymentBreakdown.cash.revenue.toFixed(2)}</p>
                <p className="text-[10px] font-bold text-emerald-500 mt-0.5">{paymentBreakdown.cash.count} transaction{paymentBreakdown.cash.count !== 1 ? 's' : ''}</p>
              </div>
            </div>

            <div className="rounded-2xl bg-gradient-to-br from-violet-50 to-purple-50/50 border border-violet-100/60 p-5 shadow-sm flex items-center space-x-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-100 text-violet-600 shrink-0">
                <QrCode className="h-5 w-5 stroke-[2px]" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-violet-600/80">UPI QR Payments</p>
                <p className="font-mono text-lg font-black text-violet-700 tracking-tight mt-0.5">₹{paymentBreakdown.upi.revenue.toFixed(2)}</p>
                <p className="text-[10px] font-bold text-violet-500 mt-0.5">{paymentBreakdown.upi.count} transaction{paymentBreakdown.upi.count !== 1 ? 's' : ''}</p>
              </div>
            </div>

            <div className="rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50/50 border border-amber-100/60 p-5 shadow-sm flex items-center space-x-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-100 text-amber-600 shrink-0">
                <CreditCard className="h-5 w-5 stroke-[2px]" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600/80">Card Payments</p>
                <p className="font-mono text-lg font-black text-amber-700 tracking-tight mt-0.5">₹{paymentBreakdown.card.revenue.toFixed(2)}</p>
                <p className="text-[10px] font-bold text-amber-500 mt-0.5">{paymentBreakdown.card.count} transaction{paymentBreakdown.card.count !== 1 ? 's' : ''}</p>
              </div>
            </div>
          </div>

          {/* Consolidated Master Grid */}
          <div className="rounded-3xl bg-white border border-gray-100 p-6 shadow-sm">
            <div className="flex items-center space-x-2.5 mb-6">
              <Building className="h-5 w-5 text-primary" />
              <h3 className="font-display text-sm font-black text-text-primary">Multi-Store Consolidated Table</h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-50 text-[10px] font-bold uppercase tracking-widest text-text-muted">
                    <th className="pb-3 pl-2">Store Outlet</th>
                    <th className="pb-3 text-center">Orders sum</th>
                    <th className="pb-3 text-right">GST Collected</th>
                    <th className="pb-3 text-right">Total Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50/50 text-xs font-semibold text-text-primary">
                  {storeLedger.map((s) => (
                    <tr key={s.id} className="hover:bg-sky-50/5 transition-colors">
                      <td className="py-4 pl-2">
                        <span className="block font-black text-text-primary">{s.name}</span>
                        <span className="text-[10px] text-text-muted">{s.address}</span>
                      </td>
                      <td className="py-4 text-center font-mono text-text-muted">{s.orders}</td>
                      <td className="py-4 text-right font-mono text-text-muted">₹{s.tax.toFixed(2)}</td>
                      <td className="py-4 text-right font-mono font-black text-primary">₹{s.revenue.toFixed(2)}</td>
                    </tr>
                  ))}
                  
                  {/* BRAND GLOBAL TOTALS FOOTER ROW */}
                  <tr className="bg-primary-light/40 border-t-2 border-primary/20">
                    <td className="py-4 pl-3.5 font-display font-black text-primary-dark">
                      GLOBAL BRAND TOTALS
                    </td>
                    <td className="py-4 text-center font-mono font-black text-primary-dark">
                      {globalOrders}
                    </td>
                    <td className="py-4 text-right font-mono font-black text-primary-dark">
                      ₹{globalTax.toFixed(2)}
                    </td>
                    <td className="py-4 text-right font-mono font-black text-primary">
                      ₹{globalRevenue.toFixed(2)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PRODUCT SALES PERFORMANCE */}
      {activeTab === 'product_sales' && (
        <div className="space-y-6 animate-fade-in">
          {/* Date + Payment Controls */}
          <div className="rounded-3xl bg-white border border-gray-100 p-6 shadow-sm space-y-4 print:hidden">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex flex-wrap gap-2">
                {['today', 'week', 'month', 'custom'].map((preset) => (
                  <button
                    key={preset}
                    onClick={() => setDateRangePreset(preset as any)}
                    className={`rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-wider border cursor-pointer transition-all ${
                      dateRangePreset === preset
                        ? 'bg-primary border-transparent text-white shadow-sm'
                        : 'bg-white border-gray-100 hover:bg-gray-50 text-text-muted'
                    }`}
                  >
                    {preset === 'week' ? 'Past 7 Days' : preset === 'month' ? 'Past Month' : preset}
                  </button>
                ))}
              </div>

              <select
                value={paymentFilter}
                onChange={(e) => setPaymentFilter(e.target.value)}
                className="rounded-xl border border-gray-150 py-2.5 px-3 text-xs outline-none bg-white focus:border-primary/50 font-bold text-text-muted cursor-pointer max-w-[200px]"
              >
                <option value="">All Payments</option>
                <option value="Cash">💵 Cash Only</option>
                <option value="UPI">📱 UPI Only</option>
                <option value="Card">💳 Card Only</option>
              </select>
            </div>

            {dateRangePreset === 'custom' && (
              <div className="grid grid-cols-2 gap-4 max-w-md pt-2 animate-slide-down">
                <div>
                  <label className="block text-[8px] font-bold uppercase text-text-muted mb-1">Start Date</label>
                  <input type="date" value={customStartDate} onChange={(e) => setCustomStartDate(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs outline-none focus:border-primary font-medium" />
                </div>
                <div>
                  <label className="block text-[8px] font-bold uppercase text-text-muted mb-1">End Date</label>
                  <input type="date" value={customEndDate} onChange={(e) => setCustomEndDate(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs outline-none focus:border-primary font-medium" />
                </div>
              </div>
            )}
          </div>

          {/* Product Sales Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="rounded-3xl bg-white border border-gray-100 p-6 shadow-sm text-left">
              <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Unique Products Sold</span>
              <h3 className="font-display text-2xl font-black text-primary mt-2 font-mono tracking-tight">{productSalesSummary.length}</h3>
            </div>
            <div className="rounded-3xl bg-white border border-gray-100 p-6 shadow-sm text-left">
              <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Total Items Prepared</span>
              <h3 className="font-display text-2xl font-black text-text-primary mt-2 font-mono tracking-tight">
                {productSalesSummary.reduce((s, p) => s + p.quantity, 0)}
              </h3>
            </div>
            <div className="rounded-3xl bg-white border border-gray-100 p-6 shadow-sm text-left">
              <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Total Product Revenue</span>
              <h3 className="font-display text-2xl font-black text-primary-dark mt-2 font-mono tracking-tight">
                ₹{productSalesSummary.reduce((s, p) => s + p.revenue, 0).toFixed(2)}
              </h3>
            </div>
          </div>

          {/* Product Sales Table with Lazy Loading */}
          <div className="rounded-3xl bg-white border border-gray-100 p-6 shadow-sm">
            <div className="flex items-center space-x-2.5 mb-6">
              <TrendingUp className="h-5 w-5 text-primary" />
              <h3 className="font-display text-sm font-black text-text-primary">Detailed Product Sales Breakdown</h3>
              <span className="rounded-full bg-slate-100 text-slate-500 text-[9px] px-2 py-0.5 font-bold">
                {productSalesSummary.length} products
              </span>
            </div>

            {productSalesSummary.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-center">
                <ShoppingBag className="h-8 w-8 text-slate-300 mb-2 stroke-[1.5px]" />
                <span className="text-xs font-bold text-text-muted">No product sales within the selected date range.</span>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto border border-slate-100 rounded-2xl shadow-inner bg-slate-50/20">
                  <table className="w-full text-left border-collapse text-xs font-sans">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        <th className="py-3 px-4">Product Name</th>
                        <th className="py-3 px-3 text-center">Category</th>
                        <th className="py-3 px-3 text-center">Qty Sold</th>
                        <th className="py-3 px-4 text-right">Revenue</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                      {visibleProducts.map((item) => (
                        <tr key={item.productId} className="hover:bg-white transition-colors">
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

                {/* Lazy Load More Button */}
                {hasMoreProducts && (
                  <div className="flex justify-center mt-5">
                    <button
                      onClick={() => setProductLimit(prev => prev + 20)}
                      className="flex items-center space-x-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 px-5 py-2.5 text-xs font-bold text-slate-600 transition-all active:scale-95 cursor-pointer"
                    >
                      <ChevronDown className="h-4 w-4" />
                      <span>Load More Products ({productSalesSummary.length - productLimit} remaining)</span>
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: GLOBAL CUSTOMER DIRECTORY */}
      {activeTab === 'customers' && (
        <div className="space-y-6 animate-fade-in print:hidden">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white border border-gray-100 rounded-3xl p-5 shadow-sm">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                placeholder="Search brand customer base by mobile or name..."
                className="w-full rounded-xl border border-gray-150 bg-gray-50/20 py-2.5 pl-11 pr-3 text-xs outline-none focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/5 font-semibold"
              />
            </div>
            
            <button
              onClick={handleExportCustomersCSV}
              disabled={filteredCustomers.length === 0}
              className="flex items-center justify-center space-x-2 rounded-xl bg-primary hover:bg-primary-dark px-5 py-3 text-xs font-black text-white shadow-lg shadow-primary/20 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <FileDown className="h-4.5 w-4.5 text-primary-light" />
              <span>Export Customer Base (CSV)</span>
            </button>
          </div>

          <div className="rounded-3xl bg-white border border-gray-100 p-6 shadow-sm">
            <div className="flex items-center space-x-2 mb-6">
              <Users className="h-5 w-5 text-primary" />
              <h3 className="font-display text-sm font-black text-text-primary">Global Contact Directory</h3>
            </div>

            {filteredCustomers.length === 0 ? (
              <div className="py-12 text-center text-text-muted text-xs font-semibold">
                No customer directories match your filter combinations.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-50 text-[10px] font-bold uppercase tracking-widest text-text-muted">
                      <th className="pb-3 pl-2">Customer Name</th>
                      <th className="pb-3 text-center">Mobile Number</th>
                      <th className="pb-3 text-center">Total Invoices</th>
                      <th className="pb-3 text-right">Total Brand Spend (INR)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50/50 text-xs font-semibold text-text-primary">
                    {filteredCustomers.map((cust) => (
                      <tr key={cust.mobile} className="hover:bg-sky-50/10 transition-colors">
                        <td className="py-4 pl-2 font-black text-text-primary">{cust.name}</td>
                        <td className="py-4 text-center font-mono text-text-muted">
                          <span className="inline-flex items-center space-x-1">
                            <Smartphone className="h-3 w-3 text-primary/45" />
                            <span>{cust.mobile}</span>
                          </span>
                        </td>
                        <td className="py-4 text-center font-mono font-black text-text-muted">{cust.visits}</td>
                        <td className="py-4 text-right font-mono font-black text-primary">₹{cust.spent.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
      </div>

      {isPrintingGST && (
        <div className="w-full bg-white text-black p-8 font-sans animate-fade-in min-h-screen">
          <div className="text-center border-b-2 border-gray-900 pb-6 mb-8">
            <h1 className="text-3xl font-black text-gray-900 uppercase tracking-widest">ZEE LABAN DESSERTS</h1>
            <h2 className="text-xl font-bold text-gray-700 mt-2">Official GST Tax Report</h2>
            <p className="text-sm font-semibold text-gray-500 mt-1">Generated on: {new Date().toLocaleString()}</p>
            <p className="text-sm font-bold text-gray-800 mt-1 uppercase tracking-wider bg-gray-100 inline-block px-3 py-1 rounded-md">Period: {getPeriodDisplayString()}</p>
          </div>
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b-2 border-gray-900 font-bold uppercase text-gray-800">
                <th className="py-3 px-2">Date</th>
                <th className="py-3 px-2">Bill Number</th>
                <th className="py-3 px-2">Store</th>
                <th className="py-3 px-2">Payment</th>
                <th className="py-3 px-2 text-right">Net Amt</th>
                <th className="py-3 px-2 text-right">CGST (2.5%)</th>
                <th className="py-3 px-2 text-right">SGST (2.5%)</th>
                <th className="py-3 px-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-300">
              {filteredBills.map(b => {
                const net = b.total - (b.cgst + b.sgst);
                const storeName = stores.find(s => s.id === b.store_id)?.name || 'Unknown';
                return (
                  <tr key={b.id}>
                    <td className="py-3 px-2">{b.created_at.substring(0,10)}</td>
                    <td className="py-3 px-2 font-mono">{b.bill_number}</td>
                    <td className="py-3 px-2 font-semibold">{storeName}</td>
                    <td className="py-3 px-2">{b.payment_method}</td>
                    <td className="py-3 px-2 text-right">₹{net.toFixed(2)}</td>
                    <td className="py-3 px-2 text-right">₹{b.cgst.toFixed(2)}</td>
                    <td className="py-3 px-2 text-right">₹{b.sgst.toFixed(2)}</td>
                    <td className="py-3 px-2 text-right font-bold">₹{b.total.toFixed(2)}</td>
                  </tr>
                );
              })}
              <tr className="border-t-2 border-gray-900 bg-gray-50 font-bold text-sm">
                <td colSpan={4} className="py-4 px-2 text-right">TOTALS:</td>
                <td className="py-4 px-2 text-right">₹{filteredBills.reduce((s,b)=>s+(b.total-(b.cgst+b.sgst)), 0).toFixed(2)}</td>
                <td className="py-4 px-2 text-right">₹{filteredBills.reduce((s,b)=>s+b.cgst, 0).toFixed(2)}</td>
                <td className="py-4 px-2 text-right">₹{filteredBills.reduce((s,b)=>s+b.sgst, 0).toFixed(2)}</td>
                <td className="py-4 px-2 text-right text-black">₹{filteredBills.reduce((s,b)=>s+b.total, 0).toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
