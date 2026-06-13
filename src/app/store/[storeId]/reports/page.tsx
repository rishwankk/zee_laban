'use client';

import { useState, useEffect, useMemo } from 'react';
import { api, Bill, Product, BillItem } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { usePrinterStore } from '@/store/usePrinterStore';
import UpiQrDisplay from '@/components/pos/UpiQrDisplay';
import { 
  BarChart3, 
  Calendar, 
  FileDown, 
  RefreshCw, 
  Coins, 
  ShoppingBag,
  Search,
  Users,
  Smartphone,
  Sparkles,
  QrCode,
  CheckCircle,
  CreditCard,
  ChevronDown,
  TrendingUp,
  X,
  Edit2,
  Trash2,
  Printer,
  AlertTriangle,
  Plus,
  Minus
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

export default function ReportsPage() {
  const { store, changeStore } = useAuthStore();
  const { triggerPrint } = usePrinterStore();
  const [activeTab, setActiveTab] = useState<'today' | 'history' | 'product_sales' | 'customers' | 'upi_settings'>('today');
  
  // Data States
  const [bills, setBills] = useState<(Bill & { cashierName: string })[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [allBillItems, setAllBillItems] = useState<BillItem[]>([]);
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [loading, setLoading] = useState(false);

  // Filters
  const [dateRangePreset, setDateRangePreset] = useState<'today' | 'week' | 'month' | 'custom'>('today');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [cashierFilter, setCashierFilter] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');
  const [todayPaymentFilter, setTodayPaymentFilter] = useState<string | null>(null);
  
  // UPI configuration state
  const [upiIdInput, setUpiIdInput] = useState('');
  const [notification, setNotification] = useState<string | null>(null);
  
  // Customer Search Query
  const [customerSearch, setCustomerSearch] = useState('');

  // Lazy loading limits
  const [historyLimit, setHistoryLimit] = useState(25);
  const [productLimit, setProductLimit] = useState(20);

  // Print GST State
  const [isPrintingGST, setIsPrintingGST] = useState(false);

  // Bill Detail Modal State
  const [selectedBill, setSelectedBill] = useState<(Bill & { cashierName: string }) | null>(null);
  const [selectedBillItems, setSelectedBillItems] = useState<BillItem[]>([]);
  const [isBillModalOpen, setIsBillModalOpen] = useState(false);
  
  // Bill Edit & Delete State
  const [isEditMode, setIsEditMode] = useState(false);
  const [editPaymentMethod, setEditPaymentMethod] = useState<'Cash' | 'UPI' | 'Card'>('Cash');
  const [editCustomerName, setEditCustomerName] = useState('');
  const [editCustomerMobile, setEditCustomerMobile] = useState('');
  const [editBillItems, setEditBillItems] = useState<{product: Product, quantity: number}[]>([]);
  const [productToAdd, setProductToAdd] = useState<string>('');
  
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const loadData = async () => {
    if (!store) return;
    setLoading(true);
    try {
      const bList = await api.getBillsByStore(store.id);
      setBills(bList);
      
      const pList = await api.getProducts();
      setProducts(pList);

      // Load bill items
      const items = await api.getAllBillItems();
      setAllBillItems(items);

      const cList = await api.getCustomerDirectory(store.id);
      setCustomers(cList);
    } catch (err) {
      console.error("Failed to load reports ledger", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [store]);

  useEffect(() => {
    if (store) {
      setUpiIdInput(store.upi_id || '');
    }
  }, [store]);

  const handleUpdateUpiId = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!store || !upiIdInput.trim()) return;

    try {
      await api.updateStore(store.id, {
        upi_id: upiIdInput.trim()
      });
      
      // Update the Zustand active store context immediately
      await changeStore(store.id);
      
      setNotification("Store UPI ID updated successfully! 💳");
      setTimeout(() => setNotification(null), 2500);
    } catch (err) {
      console.error("Failed to update UPI ID", err);
    }
  };

  const todayStr = new Date().toISOString().substring(0, 10);

  // 1. TODAY'S SALES SUB-CALCULATIONS
  const todayBills = useMemo(() => bills.filter(b => b.created_at.substring(0, 10) === todayStr), [bills, todayStr]);
  const todayRevenue = todayBills.reduce((sum, b) => sum + b.total, 0);
  const todayOrders = todayBills.length;
  const todayAvgBill = todayOrders > 0 ? todayRevenue / todayOrders : 0;

  // Today's payment breakdown
  const todayPaymentBreakdown = useMemo(() => {
    const cash = todayBills.filter(b => b.payment_method === 'Cash');
    const upi = todayBills.filter(b => b.payment_method === 'UPI');
    const card = todayBills.filter(b => b.payment_method === 'Card');
    return {
      cash: { count: cash.length, revenue: cash.reduce((s, b) => s + b.total, 0) },
      upi: { count: upi.length, revenue: upi.reduce((s, b) => s + b.total, 0) },
      card: { count: card.length, revenue: card.reduce((s, b) => s + b.total, 0) }
    };
  }, [todayBills]);

  const filteredTodayBills = useMemo(() => {
    if (!todayPaymentFilter) return todayBills;
    return todayBills.filter(b => b.payment_method === todayPaymentFilter);
  }, [todayBills, todayPaymentFilter]);

  // Hourly Breakdown (Simulating hours from 09:00 to 22:00)
  const hours = Array.from({ length: 14 }, (_, i) => i + 9);
  const hourlyData = useMemo(() => hours.map(h => {
    const hourBills = todayBills.filter(b => {
      const billHour = new Date(b.created_at).getHours();
      return billHour === h;
    });
    const rev = hourBills.reduce((sum, b) => sum + b.total, 0);
    const count = hourBills.length;
    return { hourLabel: `${h > 12 ? h - 12 : h} ${h >= 12 ? 'PM' : 'AM'}`, revenue: rev, count };
  }), [todayBills]);

  // 2. HISTORY DATE FILTER ENGINE
  const filteredHistoryBills = useMemo(() => bills.filter(b => {
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

    if (cashierFilter && !b.cashierName?.toLowerCase().includes(cashierFilter.toLowerCase())) return false;
    if (paymentFilter && b.payment_method !== paymentFilter) return false;

    return true;
  }), [bills, dateRangePreset, customStartDate, customEndDate, cashierFilter, paymentFilter, todayStr]);

  const historyRevenue = filteredHistoryBills.reduce((sum, b) => sum + b.total, 0);
  const historyOrders = filteredHistoryBills.length;
  const historyCGST = filteredHistoryBills.reduce((sum, b) => sum + b.cgst, 0);
  const historySGST = filteredHistoryBills.reduce((sum, b) => sum + b.sgst, 0);
  const historyTax = historyCGST + historySGST;

  // History payment breakdown
  const historyPaymentBreakdown = useMemo(() => {
    const cash = filteredHistoryBills.filter(b => b.payment_method === 'Cash');
    const upi = filteredHistoryBills.filter(b => b.payment_method === 'UPI');
    const card = filteredHistoryBills.filter(b => b.payment_method === 'Card');
    return {
      cash: { count: cash.length, revenue: cash.reduce((s, b) => s + b.total, 0) },
      upi: { count: upi.length, revenue: upi.reduce((s, b) => s + b.total, 0) },
      card: { count: card.length, revenue: card.reduce((s, b) => s + b.total, 0) }
    };
  }, [filteredHistoryBills]);

  // 3. PRODUCT SALES PERFORMANCE (actual bill items, not estimates)
  const productSalesSummary = useMemo(() => {
    const filteredBillIds = new Set(filteredHistoryBills.map(b => b.id));
    const relevantItems = allBillItems.filter((item: any) => filteredBillIds.has(item.bill_id));

    const productMap: Record<string, ProductSalesEntry> = {};

    relevantItems.forEach((item: any) => {
      const prod = products.find(p => p.id === item.product_id);
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
  }, [filteredHistoryBills, allBillItems, products]);

  // Category summary derived from actual product sales
  const categorySummary = useMemo(() => {
    const catMap: Record<string, { category: string; qtySold: number; revenue: number }> = {};
    
    productSalesSummary.forEach(p => {
      const cat = p.category || 'Other';
      if (!catMap[cat]) {
        catMap[cat] = { category: cat, qtySold: 0, revenue: 0 };
      }
      catMap[cat].qtySold += p.quantity;
      catMap[cat].revenue += p.revenue;
    });

    return Object.values(catMap).sort((a, b) => b.revenue - a.revenue);
  }, [productSalesSummary]);

  // 4. CUSTOMER SEARCH FILTERING
  const filteredCustomers = customers.filter(c => {
    const q = customerSearch.toLowerCase();
    return c.name?.toLowerCase().includes(q) || c.mobile?.includes(q);
  });

  const handleExportPDF = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  // EXPORT CUSTOMERS TO CSV DYNAMIC TRIGGERS
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
    link.setAttribute("download", `zee_laban_${store?.name.replace(/\s+/g, '_') || 'store'}_customers.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Lazy-loaded slices
  const visibleHistoryBills = filteredHistoryBills.slice(0, historyLimit);
  const hasMoreHistory = filteredHistoryBills.length > historyLimit;
  const visibleProducts = productSalesSummary.slice(0, productLimit);
  const hasMoreProducts = productSalesSummary.length > productLimit;

  // Bill Modal Handlers
  const handleOpenBillModal = async (bill: Bill & { cashierName: string }) => {
    setSelectedBill(bill);
    setIsEditMode(false);
    setIsDeleteConfirmOpen(false);
    setEditPaymentMethod(bill.payment_method);
    setEditCustomerName(bill.customer_name || '');
    setEditCustomerMobile(bill.customer_mobile || '');
    setIsBillModalOpen(true);
    
    try {
      const items = await api.getBillItems(bill.id);
      setSelectedBillItems(items);
      
      const pList = await api.getProducts();
      setProducts(pList); // ensure products are fresh
      const editable = items.map(item => {
        const prod = pList.find(p => p.id === item.product_id);
        return {
          product: prod || { id: item.product_id, name: item.product_name, price: item.unit_price, gst_inclusive: false } as Product,
          quantity: item.quantity
        };
      });
      setEditBillItems(editable);
    } catch (err) {
      console.error("Failed to load bill items", err);
    }
  };

  const handleCloseBillModal = () => {
    setIsBillModalOpen(false);
    setTimeout(() => {
      setSelectedBill(null);
      setSelectedBillItems([]);
    }, 200);
  };

  const handleDeleteBill = async () => {
    if (!selectedBill) return;
    setIsDeleting(true);
    try {
      await api.deleteBill(selectedBill.id);
      setBills(prev => prev.filter(b => b.id !== selectedBill.id));
      setNotification("Bill deleted successfully");
      setTimeout(() => setNotification(null), 2500);
      handleCloseBillModal();
    } catch (err) {
      console.error("Failed to delete bill", err);
    } finally {
      setIsDeleting(false);
    }
  };

  const generateAndPrintReceipt = (billToPrint: Bill, itemsToPrint: BillItem[]) => {
    const formattedDate = new Date(billToPrint.created_at).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
    const formattedTime = new Date(billToPrint.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    const orderType = billToPrint.order_type || 'Takeaway';
    
    let itemsRows = '';
    itemsToPrint.forEach(item => {
      itemsRows += `
        <tr>
          <td style="text-align: left; padding: 2px 0;">${(item.product_name || 'Item').substring(0, 18)}</td>
          <td style="text-align: center; padding: 2px 0;">${item.quantity}</td>
          <td style="text-align: right; padding: 2px 0;">₹${item.unit_price.toFixed(2)}</td>
          <td style="text-align: right; padding: 2px 0;">₹${item.total_price.toFixed(2)}</td>
        </tr>
      `;
    });

    let kitchenItemsRows = '';
    itemsToPrint.forEach(item => {
      kitchenItemsRows += `
        <tr>
          <td style="text-align: left; padding: 2px 0; font-weight: bold;">${item.product_name || 'Item'}</td>
          <td style="text-align: right; padding: 2px 0; font-weight: bold;">${item.quantity}</td>
        </tr>
      `;
    });

    const vpa = store?.upi_id;
    let upiQrSection = '';

    if (billToPrint.payment_method === 'UPI') {
      if (vpa && vpa.trim()) {
        const upiLink = `upi://pay?pa=${vpa}&am=${billToPrint.total.toFixed(2)}&cu=INR&tn=Verified Merchant Account`;
        const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&margin=5&data=${encodeURIComponent(upiLink)}`;
        upiQrSection = `
          <div style="text-align: center; margin-top: 8px;">
            <div style="font-size: 10px; font-weight: bold; margin-bottom: 4px;">Scan to Pay via UPI</div>
            <img src="${qrCodeUrl}" style="width: 130px; height: 130px; display: block; margin: 0 auto;" />
            <div style="font-size: 8px; margin-top: 4px; font-family: monospace;">VPA: ${vpa}</div>
          </div>
          <div class="line" style="border-bottom: 1px dashed #000; margin: 6px 0;"></div>
        `;
      }
    }

    const customerInvoice = `
      <div style="text-align: center; font-weight: bold; font-size: 14px;">ZEE LABAN</div>
      <div style="text-align: center;">${store?.name || 'Main Outlet'}</div>
      <div style="text-align: center;">${store?.location || 'Calicut Junction'}</div>
      <div style="text-align: center;">Phone: ${store?.owner_mobile || '+91 7994776519'}</div>
      <div class="line" style="border-bottom: 1px dashed #000; margin: 8px 0;"></div>
      <div>Bill No: ${billToPrint.bill_number}</div>
      <div>Date: ${formattedDate} &nbsp; Time: ${formattedTime}</div>
      <div style="font-weight: bold; font-size: 13px; margin: 4px 0;">Order: ${orderType}</div>
      ${billToPrint.customer_name ? `<div>Customer: ${billToPrint.customer_name}</div>` : ''}
      ${billToPrint.customer_mobile ? `<div>Mobile: ${billToPrint.customer_mobile}</div>` : ''}
      <div class="line" style="border-bottom: 1px dashed #000; margin: 8px 0;"></div>
      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr class="bold" style="font-weight: bold; border-bottom: 1px dashed #000;">
            <th style="text-align: left; width: 45%; padding-bottom: 4px;">Item</th>
            <th style="text-align: center; width: 15%; padding-bottom: 4px;">Qty</th>
            <th style="text-align: right; width: 20%; padding-bottom: 4px;">Rate</th>
            <th style="text-align: right; width: 20%; padding-bottom: 4px;">Amt</th>
          </tr>
        </thead>
        <tbody>
          ${itemsRows}
        </tbody>
      </table>
      <div class="line" style="border-bottom: 1px dashed #000; margin: 8px 0;"></div>
      <table style="width: 100%; font-size: 11px;">
        <tr>
          <td style="text-align: left; padding: 2px 0;">Subtotal:</td>
          <td style="text-align: right; padding: 2px 0;">₹${billToPrint.subtotal.toFixed(2)}</td>
        </tr>
        <tr>
          <td style="text-align: left; padding: 2px 0;">CGST (2.5%):</td>
          <td style="text-align: right; padding: 2px 0;">₹${billToPrint.cgst.toFixed(2)}</td>
        </tr>
        <tr>
          <td style="text-align: left; padding: 2px 0;">SGST (2.5%):</td>
          <td style="text-align: right; padding: 2px 0;">₹${billToPrint.sgst.toFixed(2)}</td>
        </tr>
        <tr class="bold" style="font-weight: bold; font-size: 12px;">
          <td style="text-align: left; padding: 4px 0;">GRAND TOTAL:</td>
          <td style="text-align: right; padding: 4px 0;">₹${billToPrint.total.toFixed(2)}</td>
        </tr>
      </table>
      <div class="line" style="border-bottom: 1px dashed #000; margin: 8px 0;"></div>
      <div style="text-align: center; font-weight: bold;">Payment: ${billToPrint.payment_method}</div>
      ${upiQrSection}
      <div style="text-align: center; font-weight: bold; margin-top: 8px;">Thank you! Visit Again 😊</div>
    `;

    const kitchenCopy = `
      <div style="text-align: center; font-weight: bold; font-size: 13px;">ZEE LABAN - KITCHEN COPY</div>
      <div style="text-align: center; font-size: 10px;">${store?.name || 'Main Outlet'}</div>
      <div class="line" style="border-bottom: 1px dashed #000; margin: 8px 0;"></div>
      <div>KOT Ref: ${billToPrint.bill_number}</div>
      <div>Time: ${formattedDate} ${formattedTime}</div>
      <div style="font-weight: bold; font-size: 12px; margin: 4px 0;">Type: ${orderType}</div>
      ${billToPrint.customer_name ? `<div>Customer: ${billToPrint.customer_name}</div>` : ''}
      <div class="line" style="border-bottom: 1px dashed #000; margin: 8px 0;"></div>
      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr class="bold" style="font-weight: bold; border-bottom: 1px dashed #000;">
            <th style="text-align: left; width: 80%; padding-bottom: 4px;">Kitchen Item</th>
            <th style="text-align: right; width: 20%; padding-bottom: 4px;">Qty</th>
          </tr>
        </thead>
        <tbody>
          ${kitchenItemsRows}
        </tbody>
      </table>
      <div class="line" style="border-bottom: 1px dashed #000; margin: 8px 0;"></div>
      <div style="text-align: center; font-weight: bold; font-size: 11px; margin-top: 8px; letter-spacing: 2px;">*** KITCHEN COPY ***</div>
    `;

    const printBlockHtml = `
      <div>
        ${customerInvoice}
        <div style="text-align: center; margin: 35px 0 25px 0; border-top: 2px dashed #000; padding-top: 10px; font-family: monospace; font-size: 9px; font-weight: bold; color: #000; text-transform: uppercase; letter-spacing: 1.5px;">
          - - - - TEAR LINE (KITCHEN COPY) - - - -
        </div>
        ${kitchenCopy}
      </div>
    `;
    
    triggerPrint({ htmlContent: printBlockHtml, onComplete: () => {} });
  };

  const handleExportGSTCSV = () => {
    if (filteredHistoryBills.length === 0) return;
    
    let periodStr: string = dateRangePreset;
    if (dateRangePreset === 'today') periodStr = new Date().toISOString().substring(0, 10);
    if (dateRangePreset === 'custom') periodStr = `${customStartDate || 'start'}_to_${customEndDate || 'end'}`;

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += `GST Sales Report\nPeriod: ${periodStr}\n\n`;
    csvContent += "Date,Bill Number,Payment Method,Net Amount (INR),CGST 2.5% (INR),SGST 2.5% (INR),Total Amount (INR)\n";
    
    filteredHistoryBills.forEach(b => {
      const net = b.total - (b.cgst + b.sgst);
      csvContent += `"${b.created_at.substring(0,10)}","${b.bill_number}","${b.payment_method}",${net.toFixed(2)},${b.cgst.toFixed(2)},${b.sgst.toFixed(2)},${b.total.toFixed(2)}\n`;
    });
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `store_gst_report_${periodStr}.csv`);
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

  const handleSaveAndPrintBillEdit = async () => {
    if (!selectedBill) return;
    setIsSavingEdit(true);
    try {
      const updates = {
        payment_method: editPaymentMethod,
        customer_name: editCustomerName,
        customer_mobile: editCustomerMobile
      };
      
      let finalBill: Bill & { cashierName: string } = { ...selectedBill, ...updates };

      // Calculate totals for items
      let subtotal = 0;
      let gstMultiplier = 0.05; // 5% total tax

      editBillItems.forEach(item => {
        if (item.product.gst_inclusive) {
          const preTax = item.product.price / (1 + gstMultiplier);
          subtotal += preTax * item.quantity;
        } else {
          subtotal += item.product.price * item.quantity;
        }
      });
      
      const cgst = subtotal * 0.025;
      const sgst = subtotal * 0.025;
      const total = subtotal + cgst + sgst;
      const computedTotals = { subtotal, cgst, sgst, total };
      
      if (store) {
        finalBill = await api.updateBillAndItems(
          store.id,
          selectedBill.id, 
          updates, 
          editBillItems, 
          computedTotals
        ) as Bill & { cashierName: string };
      }
      
      // Update local state
      setBills(prev => prev.map(b => b.id === selectedBill.id ? { ...b, ...finalBill } : b));
      setSelectedBill(finalBill);
      
      const updatedItems = await api.getBillItems(selectedBill.id);
      setSelectedBillItems(updatedItems);
      
      setNotification("Bill updated successfully. Triggering print...");
      setTimeout(() => setNotification(null), 2500);
      setIsEditMode(false);
      
      // Trigger print after save
      setTimeout(() => {
        generateAndPrintReceipt(finalBill, updatedItems);
      }, 500);
      
    } catch (err: any) {
      console.error("Failed to update bill", err);
      alert(err.message || "Failed to update bill due to insufficient stock or error.");
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleEditItemQuantity = (idx: number, delta: number) => {
    setEditBillItems(prev => {
      const copy = [...prev];
      if (copy[idx].quantity + delta <= 0) {
        copy.splice(idx, 1);
      } else {
        copy[idx].quantity += delta;
      }
      return copy;
    });
  };

  const handleAddNewItem = () => {
    if (!productToAdd) return;
    const prod = products.find(p => p.id === productToAdd);
    if (!prod) return;
    setEditBillItems(prev => {
      const existingIdx = prev.findIndex(i => i.product.id === prod.id);
      if (existingIdx >= 0) {
        const copy = [...prev];
        copy[existingIdx].quantity += 1;
        return copy;
      }
      return [...prev, { product: prod, quantity: 1 }];
    });
    setProductToAdd('');
  };

  return (
    <>
      <div className={`space-y-8 select-none animate-fade-in print:p-6 print:bg-white relative font-sans antialiased ${isPrintingGST ? 'hidden' : 'block'}`}>
        
        {/* PROFESSIONAL PRINT HEADER (Hidden on Screen) */}
      <div className="hidden print:block text-center border-b-2 border-gray-900 pb-6 mb-8 mt-4">
        <h1 className="text-3xl font-black text-gray-900 uppercase tracking-widest">{store?.name || 'ZEE LABAN OUTLET'}</h1>
        <h2 className="text-xl font-bold text-gray-700 mt-2">Official Store Sales & Reports Ledger</h2>
        <p className="text-sm font-semibold text-gray-500 mt-1">Generated on: {new Date().toLocaleString()}</p>
        <p className="text-sm font-bold text-gray-600 mt-1">{store?.location || ''}</p>
      </div>

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
      <div className="flex items-center justify-between print:hidden">
        <div>
          <h2 className="font-display text-2xl font-black text-text-primary tracking-tight">
            Store Performance Ledger
          </h2>
          <p className="text-xs font-semibold text-text-muted mt-1 leading-relaxed">
            Analyze hourly summaries, filter chronological dates, and extract customer directories.
          </p>
        </div>

        <button
          onClick={loadData}
          disabled={loading}
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-white border border-gray-100 hover:bg-gray-50 text-text-muted shadow-sm transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw className={`h-4.5 w-4.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* TABS ROW */}
      <div className="flex border-b border-gray-100 space-x-6 text-sm font-bold text-text-muted print:hidden overflow-x-auto scrollbar-none">
        <button
          onClick={() => setActiveTab('today')}
          className={`pb-3 transition-colors relative cursor-pointer whitespace-nowrap ${
            activeTab === 'today' ? 'text-primary' : 'hover:text-text-primary'
          }`}
        >
          <span>Today&apos;s Counter</span>
          {activeTab === 'today' && <span className="absolute bottom-0 inset-x-0 h-0.5 bg-primary rounded-full"></span>}
        </button>

        <button
          onClick={() => { setActiveTab('history'); setHistoryLimit(25); }}
          className={`pb-3 transition-colors relative cursor-pointer whitespace-nowrap ${
            activeTab === 'history' ? 'text-primary' : 'hover:text-text-primary'
          }`}
        >
          <span>All Sales History</span>
          {activeTab === 'history' && <span className="absolute bottom-0 inset-x-0 h-0.5 bg-primary rounded-full"></span>}
        </button>

        <button
          onClick={() => { setActiveTab('product_sales'); setProductLimit(20); }}
          className={`pb-3 transition-colors relative cursor-pointer whitespace-nowrap ${
            activeTab === 'product_sales' ? 'text-primary' : 'hover:text-text-primary'
          }`}
        >
          <span className="flex items-center space-x-1">
            <span>Product Sales &amp; Categories</span>
            <span className="rounded-full bg-emerald-50 text-emerald-600 text-[9px] px-1.5 py-0.5 font-bold">
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
            <span>Customer Directory</span>
            <span className="rounded-full bg-primary-light text-primary text-[9px] px-1.5 py-0.5 font-bold">
              Extract
            </span>
          </span>
          {activeTab === 'customers' && <span className="absolute bottom-0 inset-x-0 h-0.5 bg-primary rounded-full"></span>}
        </button>

        <button
          onClick={() => setActiveTab('upi_settings')}
          className={`pb-3 transition-colors relative cursor-pointer whitespace-nowrap ${
            activeTab === 'upi_settings' ? 'text-primary' : 'hover:text-text-primary'
          }`}
        >
          <span className="flex items-center space-x-1">
            <span>UPI Settings</span>
            <span className="rounded-full bg-amber-55 text-warning text-[9px] px-1.5 py-0.5 font-bold">
              QR
            </span>
          </span>
          {activeTab === 'upi_settings' && <span className="absolute bottom-0 inset-x-0 h-0.5 bg-primary rounded-full"></span>}
        </button>
      </div>

      {/* TAB 1: TODAY'S SALES */}
      {activeTab === 'today' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="rounded-3xl bg-white border border-gray-100 p-6 shadow-sm flex flex-col justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Today&apos;s Total Sales</span>
              <h3 className="font-display text-2xl font-black text-primary mt-2 font-mono tracking-tight">₹{todayRevenue.toFixed(2)}</h3>
              <span className="text-[9px] font-semibold text-emerald-500 mt-2">Active cash drawer balance</span>
            </div>

            <div className="rounded-3xl bg-white border border-gray-100 p-6 shadow-sm flex flex-col justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Total Orders Raised</span>
              <h3 className="font-display text-2xl font-black text-text-primary mt-2 font-mono tracking-tight">{todayOrders}</h3>
              <span className="text-[9px] font-semibold text-text-muted mt-2">Sequential checks generated</span>
            </div>

            <div className="rounded-3xl bg-white border border-gray-100 p-6 shadow-sm flex flex-col justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Average Ticket Value</span>
              <h3 className="font-display text-2xl font-black text-primary-dark mt-2 font-mono tracking-tight">₹{todayAvgBill.toFixed(2)}</h3>
              <span className="text-[9px] font-semibold text-text-muted mt-2">Ticket sizes average value</span>
            </div>
          </div>

          {/* Today's Payment Type Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div 
              onClick={() => setTodayPaymentFilter(prev => prev === 'Cash' ? null : 'Cash')}
              className={`rounded-2xl p-4 shadow-sm flex items-center space-x-3 cursor-pointer transition-all active:scale-95 ${
                todayPaymentFilter === 'Cash' 
                  ? 'bg-emerald-100 border-2 border-emerald-400' 
                  : 'bg-gradient-to-br from-emerald-50 to-green-50/50 border border-emerald-100/60 hover:border-emerald-300'
              }`}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 shrink-0">
                <Coins className="h-4.5 w-4.5 stroke-[2px]" />
              </div>
              <div className="min-w-0">
                <p className="text-[9px] font-bold uppercase tracking-wider text-emerald-600/80">Cash</p>
                <p className="font-mono text-base font-black text-emerald-700 tracking-tight">₹{todayPaymentBreakdown.cash.revenue.toFixed(2)}</p>
                <p className="text-[9px] font-bold text-emerald-500">{todayPaymentBreakdown.cash.count} txn{todayPaymentBreakdown.cash.count !== 1 ? 's' : ''}</p>
              </div>
            </div>
            
            <div 
              onClick={() => setTodayPaymentFilter(prev => prev === 'UPI' ? null : 'UPI')}
              className={`rounded-2xl p-4 shadow-sm flex items-center space-x-3 cursor-pointer transition-all active:scale-95 ${
                todayPaymentFilter === 'UPI' 
                  ? 'bg-violet-100 border-2 border-violet-400' 
                  : 'bg-gradient-to-br from-violet-50 to-purple-50/50 border border-violet-100/60 hover:border-violet-300'
              }`}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-600 shrink-0">
                <QrCode className="h-4.5 w-4.5 stroke-[2px]" />
              </div>
              <div className="min-w-0">
                <p className="text-[9px] font-bold uppercase tracking-wider text-violet-600/80">UPI QR</p>
                <p className="font-mono text-base font-black text-violet-700 tracking-tight">₹{todayPaymentBreakdown.upi.revenue.toFixed(2)}</p>
                <p className="text-[9px] font-bold text-violet-500">{todayPaymentBreakdown.upi.count} txn{todayPaymentBreakdown.upi.count !== 1 ? 's' : ''}</p>
              </div>
            </div>
            
            <div 
              onClick={() => setTodayPaymentFilter(prev => prev === 'Card' ? null : 'Card')}
              className={`rounded-2xl p-4 shadow-sm flex items-center space-x-3 cursor-pointer transition-all active:scale-95 ${
                todayPaymentFilter === 'Card' 
                  ? 'bg-amber-100 border-2 border-amber-400' 
                  : 'bg-gradient-to-br from-amber-50 to-orange-50/50 border border-amber-100/60 hover:border-amber-300'
              }`}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-600 shrink-0">
                <CreditCard className="h-4.5 w-4.5 stroke-[2px]" />
              </div>
              <div className="min-w-0">
                <p className="text-[9px] font-bold uppercase tracking-wider text-amber-600/80">Card</p>
                <p className="font-mono text-base font-black text-amber-700 tracking-tight">₹{todayPaymentBreakdown.card.revenue.toFixed(2)}</p>
                <p className="text-[9px] font-bold text-amber-500">{todayPaymentBreakdown.card.count} txn{todayPaymentBreakdown.card.count !== 1 ? 's' : ''}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2 rounded-3xl bg-white border border-gray-100 p-6 shadow-sm flex flex-col">
              <div className="flex items-center space-x-2 mb-6">
                <ShoppingBag className="h-5 w-5 text-primary" />
                <h3 className="font-display text-sm font-black text-text-primary">Today&apos;s Chronological Invoices</h3>
              </div>

              {filteredTodayBills.length === 0 ? (
                <div className="py-12 text-center text-text-muted text-xs font-semibold">
                  No billing transactions performed yet today for this filter.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-gray-50 text-[10px] font-bold uppercase tracking-widest text-text-muted">
                        <th className="pb-3">Bill No</th>
                        <th className="pb-3">Time</th>
                        <th className="pb-3 text-center">Payment</th>
                        <th className="pb-3 text-right">Grand Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50/50 text-xs font-semibold text-text-primary">
                      {filteredTodayBills.map((b) => (
                        <tr 
                          key={b.id} 
                          onClick={() => handleOpenBillModal(b)}
                          className="hover:bg-slate-50 transition-colors cursor-pointer"
                        >
                          <td className="py-3.5 font-mono font-black text-primary-dark">{b.bill_number}</td>
                          <td className="py-3.5 text-text-muted font-mono text-[11px]">
                            {new Date(b.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="py-3.5 text-center">
                            <span className={`rounded-full text-[8px] font-black tracking-wider px-2.5 py-1 uppercase ${
                              b.payment_method === 'Cash' ? 'bg-emerald-50 text-emerald-600' :
                              b.payment_method === 'UPI' ? 'bg-violet-50 text-violet-600' :
                              'bg-amber-50 text-amber-600'
                            }`}>
                              {b.payment_method}
                            </span>
                          </td>
                          <td className="py-3.5 text-right font-mono font-black">₹{b.total.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="rounded-3xl bg-white border border-gray-100 p-6 shadow-sm flex flex-col max-h-[450px] overflow-hidden">
              <div className="flex items-center space-x-2 mb-4">
                <BarChart3 className="h-5 w-5 text-primary" />
                <h3 className="font-display text-sm font-black text-text-primary">Hourly Distribution</h3>
              </div>
              <p className="text-[10px] font-bold text-text-muted leading-relaxed mb-4">
                Sales sums and invoice densities broken down by outlet business hour.
              </p>

              <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                {hourlyData.map(h => (
                  <div key={h.hourLabel} className="flex items-center justify-between rounded-xl bg-gray-50/50 border border-gray-50 p-3">
                    <span className="text-xs font-black text-text-primary">{h.hourLabel}</span>
                    <div className="flex items-center space-x-4">
                      <span className="text-[10px] font-bold text-text-muted">{h.count} Bills</span>
                      <span className="font-mono text-xs font-black text-primary">₹{h.revenue.toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: GENERAL HISTORY */}
      {activeTab === 'history' && (
        <div className="space-y-6">
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

              <div className="flex items-center space-x-2">
                <button
                  onClick={handleExportGSTCSV}
                  className="flex items-center space-x-2 rounded-xl bg-violet-500 hover:bg-violet-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-violet-500/10 transition-all active:scale-95 cursor-pointer"
                >
                  <FileDown className="h-4.5 w-4.5" />
                  <span>GST (CSV)</span>
                </button>
                <button
                  onClick={handleExportGSTPDF}
                  className="flex items-center space-x-2 rounded-xl bg-indigo-500 hover:bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-500/10 transition-all active:scale-95 cursor-pointer"
                >
                  <FileDown className="h-4.5 w-4.5" />
                  <span>GST (PDF)</span>
                </button>
                <button
                  onClick={handleExportPDF}
                  className="flex items-center space-x-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-500/10 transition-all active:scale-95 cursor-pointer"
                >
                  <FileDown className="h-4.5 w-4.5" />
                  <span>Save as PDF</span>
                </button>
              </div>
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                <input
                  type="text"
                  value={cashierFilter}
                  onChange={(e) => setCashierFilter(e.target.value)}
                  placeholder="Filter by cashier/store name..."
                  className="w-full rounded-xl border border-gray-150 py-2.5 pl-9 pr-3 text-xs outline-none focus:border-primary/50 focus:bg-white focus:ring-2 focus:ring-primary/5 font-medium"
                />
              </div>

              <select
                value={paymentFilter}
                onChange={(e) => setPaymentFilter(e.target.value)}
                className="w-full rounded-xl border border-gray-150 py-2.5 px-3 text-xs outline-none bg-white focus:border-primary/50 font-bold text-text-muted cursor-pointer"
              >
                <option value="">All Payment Methods</option>
                <option value="Cash">💵 Cash</option>
                <option value="UPI">📱 UPI QR</option>
                <option value="Card">💳 Card</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="rounded-3xl bg-white border border-gray-100 p-6 shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Filtered Revenue</span>
              <h3 className="font-display text-2xl font-black text-primary mt-2 font-mono tracking-tight">₹{historyRevenue.toFixed(2)}</h3>
            </div>
            <div className="rounded-3xl bg-white border border-gray-100 p-6 shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Filtered Invoices</span>
              <h3 className="font-display text-2xl font-black text-text-primary mt-2 font-mono tracking-tight">{historyOrders}</h3>
            </div>
            <div className="rounded-3xl bg-white border border-gray-100 p-6 shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">GST Tax Collected</span>
              <h3 className="font-display text-2xl font-black text-primary-dark mt-2 font-mono tracking-tight">₹{historyTax.toFixed(2)}</h3>
            </div>
          </div>

          {/* Payment Breakdown for Filtered Period */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div 
              onClick={() => setPaymentFilter(paymentFilter === 'Cash' ? '' : 'Cash')}
              className={`rounded-2xl bg-gradient-to-br from-emerald-50 to-green-50/50 border p-4 shadow-sm flex items-center space-x-3 cursor-pointer transition-all hover:shadow-md ${paymentFilter === 'Cash' ? 'border-emerald-400 ring-2 ring-emerald-400/20' : 'border-emerald-100/60'}`}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 shrink-0">
                <Coins className="h-4.5 w-4.5 stroke-[2px]" />
              </div>
              <div className="min-w-0">
                <p className="text-[9px] font-bold uppercase tracking-wider text-emerald-600/80">Cash</p>
                <p className="font-mono text-base font-black text-emerald-700 tracking-tight">₹{historyPaymentBreakdown.cash.revenue.toFixed(2)}</p>
                <p className="text-[9px] font-bold text-emerald-500">{historyPaymentBreakdown.cash.count} txn{historyPaymentBreakdown.cash.count !== 1 ? 's' : ''}</p>
              </div>
            </div>
            <div 
              onClick={() => setPaymentFilter(paymentFilter === 'UPI' ? '' : 'UPI')}
              className={`rounded-2xl bg-gradient-to-br from-violet-50 to-purple-50/50 border p-4 shadow-sm flex items-center space-x-3 cursor-pointer transition-all hover:shadow-md ${paymentFilter === 'UPI' ? 'border-violet-400 ring-2 ring-violet-400/20' : 'border-violet-100/60'}`}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-600 shrink-0">
                <QrCode className="h-4.5 w-4.5 stroke-[2px]" />
              </div>
              <div className="min-w-0">
                <p className="text-[9px] font-bold uppercase tracking-wider text-violet-600/80">UPI QR</p>
                <p className="font-mono text-base font-black text-violet-700 tracking-tight">₹{historyPaymentBreakdown.upi.revenue.toFixed(2)}</p>
                <p className="text-[9px] font-bold text-violet-500">{historyPaymentBreakdown.upi.count} txn{historyPaymentBreakdown.upi.count !== 1 ? 's' : ''}</p>
              </div>
            </div>
            <div 
              onClick={() => setPaymentFilter(paymentFilter === 'Card' ? '' : 'Card')}
              className={`rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50/50 border p-4 shadow-sm flex items-center space-x-3 cursor-pointer transition-all hover:shadow-md ${paymentFilter === 'Card' ? 'border-amber-400 ring-2 ring-amber-400/20' : 'border-amber-100/60'}`}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-600 shrink-0">
                <CreditCard className="h-4.5 w-4.5 stroke-[2px]" />
              </div>
              <div className="min-w-0">
                <p className="text-[9px] font-bold uppercase tracking-wider text-amber-600/80">Card</p>
                <p className="font-mono text-base font-black text-amber-700 tracking-tight">₹{historyPaymentBreakdown.card.revenue.toFixed(2)}</p>
                <p className="text-[9px] font-bold text-amber-500">{historyPaymentBreakdown.card.count} txn{historyPaymentBreakdown.card.count !== 1 ? 's' : ''}</p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl bg-white border border-gray-100 p-6 shadow-sm">
            <h3 className="font-display text-sm font-black text-text-primary mb-6">Historical Orders Log</h3>

            {filteredHistoryBills.length === 0 ? (
              <div className="py-12 text-center text-text-muted text-xs font-semibold">
                No orders match your filter combinations.
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-gray-50 text-[10px] font-bold uppercase tracking-widest text-text-muted">
                        <th className="pb-3 pl-2">Bill No</th>
                        <th className="pb-3">Timestamp</th>
                        <th className="pb-3 text-center">Payment</th>
                        <th className="pb-3 text-right">Tax (CGST+SGST)</th>
                        <th className="pb-3 text-right">Grand Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50/50 text-xs font-semibold text-text-primary">
                      {visibleHistoryBills.map((b) => (
                        <tr 
                          key={b.id} 
                          onClick={() => handleOpenBillModal(b)}
                          className="hover:bg-sky-50/50 transition-colors cursor-pointer group"
                        >
                          <td className="py-3.5 font-mono font-black text-primary-dark pl-2 group-hover:text-primary transition-colors">{b.bill_number}</td>
                          <td className="py-3.5 text-text-muted font-mono text-[11px]">
                            {new Date(b.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                          </td>
                          <td className="py-3.5 text-center">
                            <span className={`rounded-full text-[8px] font-black tracking-wider px-2.5 py-1 uppercase ${
                              b.payment_method === 'Cash' ? 'bg-emerald-50 text-emerald-600' :
                              b.payment_method === 'UPI' ? 'bg-violet-50 text-violet-600' :
                              'bg-amber-50 text-amber-600'
                            }`}>
                              {b.payment_method}
                            </span>
                          </td>
                          <td className="py-3.5 text-right font-mono text-[11px] text-text-muted">
                            ₹{(b.cgst + b.sgst).toFixed(2)}
                          </td>
                          <td className="py-3.5 text-right font-mono font-black">₹{b.total.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Lazy Load More Button */}
                {hasMoreHistory && (
                  <div className="flex justify-center mt-5">
                    <button
                      onClick={() => setHistoryLimit(prev => prev + 25)}
                      className="flex items-center space-x-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 px-5 py-2.5 text-xs font-bold text-slate-600 transition-all active:scale-95 cursor-pointer"
                    >
                      <ChevronDown className="h-4 w-4" />
                      <span>Load More Transactions ({filteredHistoryBills.length - historyLimit} remaining)</span>
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: PRODUCT SALES & CATEGORIES */}
      {activeTab === 'product_sales' && (
        <div className="space-y-6 animate-fade-in">
          {/* Date + Payment Controls (shared with history) */}
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

          {/* Category Summary Cards */}
          <div className="rounded-3xl bg-white border border-gray-100 p-6 shadow-sm">
            <div className="flex items-center space-x-2.5 mb-6">
              <BarChart3 className="h-5 w-5 text-primary" />
              <h3 className="font-display text-sm font-black text-text-primary">Category Sales Summary</h3>
            </div>

            {categorySummary.length === 0 ? (
              <div className="py-8 text-center text-text-muted text-xs font-semibold">
                No category data available for this period.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-50 text-[10px] font-bold uppercase tracking-widest text-text-muted">
                      <th className="pb-3 pl-2">Category</th>
                      <th className="pb-3 text-center">Items Sold</th>
                      <th className="pb-3 text-right">Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50/50 text-xs font-semibold text-text-primary">
                    {categorySummary.map((cat) => (
                      <tr key={cat.category} className="hover:bg-sky-50/5 transition-colors">
                        <td className="py-4 pl-2 font-black text-text-primary uppercase tracking-wider">{cat.category}</td>
                        <td className="py-4 text-center font-mono font-black text-text-muted">{cat.qtySold}</td>
                        <td className="py-4 text-right font-mono font-black text-primary">₹{cat.revenue.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Detailed Product Sales Table with Lazy Loading */}
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

      {/* TAB 4: CUSTOMER DIRECTORY (DATA EXTRACTION WORKFLOW) */}
      {activeTab === 'customers' && (
        <div className="space-y-6 animate-fade-in print:hidden">
          
          {/* Search and extraction action bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white border border-gray-100 rounded-3xl p-5 shadow-sm">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                placeholder="Search customers by mobile or name..."
                className="w-full rounded-xl border border-gray-150 bg-gray-50/20 py-2.5 pl-11 pr-3 text-xs outline-none focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/5 font-semibold"
              />
            </div>
            
            <button
              onClick={handleExportCustomersCSV}
              disabled={filteredCustomers.length === 0}
              className="flex items-center justify-center space-x-2 rounded-xl bg-primary hover:bg-primary-dark px-5 py-3 text-xs font-black text-white shadow-lg shadow-primary/20 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <FileDown className="h-4.5 w-4.5 text-primary-light" />
              <span>Export Customer Directory (CSV)</span>
            </button>
          </div>

          {/* Customer aggregate directory table */}
          <div className="rounded-3xl bg-white border border-gray-100 p-6 shadow-sm">
            <div className="flex items-center space-x-2 mb-6">
              <Users className="h-5 w-5 text-primary" />
              <h3 className="font-display text-sm font-black text-text-primary">
                Customer Base Records
              </h3>
            </div>

            {filteredCustomers.length === 0 ? (
              <div className="py-12 text-center text-text-muted text-xs font-semibold">
                No customer records found matching your filters.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-50 text-[10px] font-bold uppercase tracking-widest text-text-muted">
                      <th className="pb-3 pl-2">Customer Profile Name</th>
                      <th className="pb-3 text-center">Mobile Number</th>
                      <th className="pb-3 text-center">Total Visits</th>
                      <th className="pb-3 text-right">Total Spent (INR)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50/50 text-xs font-semibold text-text-primary">
                    {filteredCustomers.map((cust) => (
                      <tr key={cust.mobile} className="hover:bg-sky-50/10 transition-colors">
                        <td className="py-4 pl-2 font-black text-text-primary">
                          {cust.name}
                        </td>
                        <td className="py-4 text-center font-mono text-text-muted">
                          <span className="inline-flex items-center space-x-1">
                            <Smartphone className="h-3 w-3 text-primary/45" />
                            <span>{cust.mobile}</span>
                          </span>
                        </td>
                        <td className="py-4 text-center font-mono font-black text-text-muted">
                          {cust.visits}
                        </td>
                        <td className="py-4 text-right font-mono font-black text-primary">
                          ₹{cust.spent.toFixed(2)}
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

      {/* TAB 5: UPI QR CONFIGURATION SETTINGS */}
      {activeTab === 'upi_settings' && store && (
        <div className="space-y-6 animate-fade-in print:hidden max-w-lg">
          
          <div className="rounded-3xl bg-white border border-gray-100 p-6 shadow-sm space-y-6">
            <div className="flex items-center space-x-2.5">
              <QrCode className="h-5 w-5 text-primary animate-pulse" />
              <h3 className="font-display text-sm font-black text-text-primary">
                Store Dynamic UPI Configuration
              </h3>
            </div>

            <p className="text-xs font-semibold text-text-muted leading-relaxed">
              Configure the Virtual Payment Address (VPA) / UPI ID used for dynamic customer QR code generation at the POS counter dockets.
            </p>

            <form onSubmit={handleUpdateUpiId} className="space-y-4 pt-2">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-text-muted mb-2">
                  Merchant UPI ID (VPA)
                </label>
                <input
                  type="text"
                  required
                  value={upiIdInput}
                  onChange={(e) => setUpiIdInput(e.target.value)}
                  placeholder="E.g., merchant@upi or yourname@paytm"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-3 text-xs outline-none focus:border-primary focus:bg-white font-mono font-bold text-primary-dark"
                />
                <span className="block text-[9px] font-bold text-text-muted/80 mt-1.5 leading-relaxed">
                  Enter your merchant Virtual Payment Address (VPA). Changing this updates the checkout QR on the POS counter screen instantly.
                </span>
              </div>

              <button
                type="submit"
                className="w-full rounded-xl bg-primary hover:bg-primary-dark py-3 text-xs font-black text-white shadow-lg shadow-primary/10 transition-all active:scale-[0.98] cursor-pointer"
              >
                Update Store UPI ID
              </button>
            </form>
          </div>

          {/* Quick Preview Card */}
          <div className="rounded-3xl bg-gray-50 border border-gray-100 p-6 flex flex-col items-center">
            <h4 className="text-[10px] font-black uppercase tracking-wider text-text-muted mb-4">
              Real-time checkout QR preview (₹1.00 Test)
            </h4>
            <UpiQrDisplay 
              amount={1.00}
              billNumber="TEST-0001"
              storeName={store.name}
              upiId={store.upi_id}
            />
          </div>

        </div>
      )}

      {/* BILL DETAIL & EDIT MODAL */}
      {isBillModalOpen && selectedBill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in print:hidden">
          <div 
            className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-gray-100"
            style={{ maxHeight: '90vh' }}
          >
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-gray-50 flex items-center justify-between bg-white relative z-10">
              <div className="flex items-center space-x-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <FileDown className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-display font-black text-text-primary text-base">
                    Invoice Details
                  </h3>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted mt-0.5 font-mono">
                    {selectedBill.bill_number}
                  </p>
                </div>
              </div>
              <button 
                onClick={handleCloseBillModal}
                className="rounded-full p-2 hover:bg-gray-100 text-gray-400 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 bg-gray-50/30">
              
              {/* Delete Confirmation Overlay inside Body */}
              {isDeleteConfirmOpen && (
                <div className="mb-6 p-5 rounded-2xl bg-red-50 border border-red-100 animate-slide-down">
                  <div className="flex items-start space-x-3">
                    <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-black text-red-700">Delete this Invoice?</h4>
                      <p className="text-xs font-semibold text-red-600/80 mt-1 leading-relaxed">
                        Are you absolutely sure you want to delete invoice {selectedBill.bill_number}? This action cannot be undone and will permanently remove this transaction from the reports.
                      </p>
                      <div className="flex space-x-3 mt-4">
                        <button 
                          onClick={handleDeleteBill}
                          disabled={isDeleting}
                          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-black rounded-xl transition-all shadow-sm disabled:opacity-50"
                        >
                          {isDeleting ? 'Deleting...' : 'Yes, Delete Invoice'}
                        </button>
                        <button 
                          onClick={() => setIsDeleteConfirmOpen(false)}
                          disabled={isDeleting}
                          className="px-4 py-2 bg-white border border-red-200 hover:bg-red-50 text-red-700 text-xs font-bold rounded-xl transition-all"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Edit Mode Content */}
              {isEditMode ? (
                <div className="space-y-5 mb-6 p-5 rounded-2xl bg-white border border-gray-100 shadow-sm animate-fade-in">
                  <div className="flex items-center space-x-2 mb-2">
                    <Edit2 className="h-4 w-4 text-primary" />
                    <h4 className="text-xs font-black text-text-primary uppercase tracking-wider">Edit Invoice Details</h4>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2 sm:col-span-1">
                      <label className="block text-[10px] font-bold text-text-muted uppercase mb-1.5">Customer Name</label>
                      <input 
                        type="text" 
                        value={editCustomerName}
                        onChange={e => setEditCustomerName(e.target.value)}
                        placeholder="Optional"
                        className="w-full text-xs font-semibold px-3 py-2.5 rounded-xl border border-gray-200 outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                      />
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <label className="block text-[10px] font-bold text-text-muted uppercase mb-1.5">Customer Mobile</label>
                      <input 
                        type="text" 
                        value={editCustomerMobile}
                        onChange={e => setEditCustomerMobile(e.target.value)}
                        placeholder="Optional"
                        className="w-full text-xs font-semibold px-3 py-2.5 rounded-xl border border-gray-200 outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-[10px] font-bold text-text-muted uppercase mb-2">Payment Method</label>
                      <div className="grid grid-cols-3 gap-2">
                        {['Cash', 'UPI', 'Card'].map(pm => (
                          <button
                            key={pm}
                            onClick={() => setEditPaymentMethod(pm as any)}
                            className={`py-2 text-xs font-black rounded-xl border transition-all ${
                              editPaymentMethod === pm 
                                ? 'bg-primary border-primary text-white shadow-sm' 
                                : 'bg-gray-50 border-gray-200 text-text-muted hover:bg-gray-100'
                            }`}
                          >
                            {pm}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                    <span className="text-[9px] font-bold uppercase text-text-muted">Customer Name</span>
                    <p className="text-sm font-black text-text-primary mt-0.5">{selectedBill.customer_name || 'Walk-in Guest'}</p>
                  </div>
                  <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                    <span className="text-[9px] font-bold uppercase text-text-muted">Mobile Number</span>
                    <p className="text-sm font-black text-text-primary mt-0.5">{selectedBill.customer_mobile || 'Not Provided'}</p>
                  </div>
                  <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                    <span className="text-[9px] font-bold uppercase text-text-muted">Payment Type</span>
                    <p className={`text-sm font-black mt-0.5 ${
                      selectedBill.payment_method === 'Cash' ? 'text-emerald-600' :
                      selectedBill.payment_method === 'UPI' ? 'text-violet-600' : 'text-amber-600'
                    }`}>
                      {selectedBill.payment_method}
                    </p>
                  </div>
                  <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                    <span className="text-[9px] font-bold uppercase text-text-muted">Cashier</span>
                    <p className="text-sm font-black text-text-primary mt-0.5">{selectedBill.cashierName}</p>
                  </div>
                </div>
              )}

              {/* Items List */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-6">
                <div className="px-4 py-3 border-b border-gray-50 bg-gray-50/50 flex items-center justify-between">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Purchased Items</h4>
                </div>
                {selectedBillItems.length === 0 ? (
                  <div className="p-8 text-center text-xs font-semibold text-text-muted">
                    Loading items...
                  </div>
                ) : isEditMode ? (
                  <div className="divide-y divide-gray-50 p-4">
                    {editBillItems.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center py-3">
                        <div>
                          <p className="text-xs font-black text-text-primary">{item.product.name}</p>
                          <p className="text-[10px] font-semibold text-text-muted mt-0.5 font-mono">
                            ₹{item.product.price.toFixed(2)}
                          </p>
                        </div>
                        <div className="flex items-center space-x-3">
                          <button onClick={() => handleEditItemQuantity(idx, -1)} className="p-1 rounded bg-gray-100 text-gray-500 hover:bg-gray-200">
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="font-mono text-xs font-black w-4 text-center">{item.quantity}</span>
                          <button onClick={() => handleEditItemQuantity(idx, 1)} className="p-1 rounded bg-gray-100 text-gray-500 hover:bg-gray-200">
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                    <div className="flex items-center space-x-2 pt-4">
                      <select 
                        value={productToAdd} 
                        onChange={e => setProductToAdd(e.target.value)}
                        className="flex-1 text-xs border border-gray-200 rounded-lg p-2 outline-none focus:border-primary"
                      >
                        <option value="">-- Add Product --</option>
                        {products.filter(p => p.is_active).map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                      <button 
                        onClick={handleAddNewItem}
                        className="p-2 bg-primary text-white rounded-lg hover:bg-primary-dark"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {selectedBillItems.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center px-4 py-3">
                        <div>
                          <p className="text-xs font-black text-text-primary">{item.product_name || 'Item'}</p>
                          <p className="text-[10px] font-semibold text-text-muted mt-0.5 font-mono">
                            {item.quantity} x ₹{item.unit_price.toFixed(2)}
                          </p>
                        </div>
                        <p className="text-xs font-black font-mono text-primary-dark">
                          ₹{item.total_price.toFixed(2)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Totals Footer */}
                <div className="bg-gray-50/80 p-4 border-t border-gray-100 space-y-2">
                  <div className="flex justify-between text-xs font-semibold text-text-muted">
                    <span>Subtotal</span>
                    <span className="font-mono">₹{selectedBill.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-[10px] font-bold text-text-muted">
                    <span>CGST + SGST</span>
                    <span className="font-mono">₹{(selectedBill.cgst + selectedBill.sgst).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 mt-2 border-t border-gray-200/60">
                    <span className="text-xs font-black text-text-primary uppercase tracking-wider">Grand Total</span>
                    <span className="text-lg font-black text-primary font-mono tracking-tight">₹{selectedBill.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-5 border-t border-gray-50 bg-white flex flex-wrap gap-3">
              {isEditMode ? (
                <>
                  <button 
                    onClick={handleSaveAndPrintBillEdit}
                    disabled={isSavingEdit}
                    className="flex-1 flex items-center justify-center space-x-2 bg-primary hover:bg-primary-dark text-white rounded-xl py-3 text-xs font-black transition-all active:scale-[0.98] shadow-md shadow-primary/10 disabled:opacity-50"
                  >
                    <Printer className="h-4 w-4" />
                    <span>{isSavingEdit ? 'Saving...' : 'Save & Print Invoice'}</span>
                  </button>
                  <button 
                    onClick={() => setIsEditMode(false)}
                    disabled={isSavingEdit}
                    className="flex-1 bg-white border border-gray-200 hover:bg-gray-50 text-text-muted rounded-xl py-3 text-xs font-bold transition-all"
                  >
                    Cancel Edit
                  </button>
                </>
              ) : (
                <>
                  <button 
                    onClick={() => setIsEditMode(true)}
                    className="flex-1 flex items-center justify-center space-x-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-xl py-3 text-xs font-black transition-all"
                  >
                    <Edit2 className="h-4 w-4" />
                    <span>Edit Invoice</span>
                  </button>
                  
                  <button 
                    onClick={() => setIsDeleteConfirmOpen(true)}
                    className="flex-1 flex items-center justify-center space-x-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl py-3 text-xs font-black transition-all"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>Delete</span>
                  </button>
                  
                  <button 
                    onClick={() => {
                      if (selectedBill) generateAndPrintReceipt(selectedBill, selectedBillItems);
                    }}
                    className="flex-none flex items-center justify-center bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl px-5 py-3 transition-all"
                    title="Print Invoice"
                  >
                    <Printer className="h-5 w-5" />
                  </button>
                </>
              )}
            </div>
            
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteConfirmOpen && selectedBill && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm print:hidden">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl animate-scale-in text-center">
            <div className="mx-auto w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mb-4">
              <Trash2 className="h-8 w-8" />
            </div>
            <h3 className="text-xl font-black text-text-primary mb-2">Delete Invoice?</h3>
            <p className="text-sm font-semibold text-text-muted mb-6">
              Are you sure you want to delete invoice <span className="text-primary font-mono">{selectedBill.bill_number}</span>? This action cannot be undone.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => setIsDeleteConfirmOpen(false)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteBill}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-3 rounded-xl shadow-md shadow-red-500/20 transition-all active:scale-95"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
      </div>


      {isPrintingGST && (
        <div className="w-full bg-white text-black p-8 font-sans animate-fade-in min-h-screen">
          <div className="text-center border-b-2 border-gray-900 pb-6 mb-8 mt-4">
            <h1 className="text-3xl font-black text-gray-900 uppercase tracking-widest">{store?.name || 'ZEE LABAN OUTLET'}</h1>
            <h2 className="text-xl font-bold text-gray-700 mt-2">Official Store GST Tax Report</h2>
            <p className="text-sm font-semibold text-gray-500 mt-1">Generated on: {new Date().toLocaleString()}</p>
            <p className="text-sm font-bold text-gray-800 mt-2 uppercase tracking-wider bg-gray-100 inline-block px-3 py-1 rounded-md">Period: {getPeriodDisplayString()}</p>
            <p className="text-sm font-bold text-gray-600 mt-2">{store?.location || ''}</p>
          </div>
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b-2 border-gray-900 font-bold uppercase text-gray-800">
                <th className="py-3 px-2">Date</th>
                <th className="py-3 px-2">Bill Number</th>
                <th className="py-3 px-2">Payment</th>
                <th className="py-3 px-2 text-right">Net Amt</th>
                <th className="py-3 px-2 text-right">CGST (2.5%)</th>
                <th className="py-3 px-2 text-right">SGST (2.5%)</th>
                <th className="py-3 px-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-300">
              {filteredHistoryBills.map(b => {
                const net = b.total - (b.cgst + b.sgst);
                return (
                  <tr key={b.id}>
                    <td className="py-3 px-2">{b.created_at.substring(0,10)}</td>
                    <td className="py-3 px-2 font-mono">{b.bill_number}</td>
                    <td className="py-3 px-2">{b.payment_method}</td>
                    <td className="py-3 px-2 text-right">₹{net.toFixed(2)}</td>
                    <td className="py-3 px-2 text-right">₹{b.cgst.toFixed(2)}</td>
                    <td className="py-3 px-2 text-right">₹{b.sgst.toFixed(2)}</td>
                    <td className="py-3 px-2 text-right font-bold">₹{b.total.toFixed(2)}</td>
                  </tr>
                );
              })}
              <tr className="border-t-2 border-gray-900 bg-gray-50 font-bold text-sm">
                <td colSpan={3} className="py-4 px-2 text-right">TOTALS:</td>
                <td className="py-4 px-2 text-right">₹{filteredHistoryBills.reduce((s,b)=>s+(b.total-(b.cgst+b.sgst)), 0).toFixed(2)}</td>
                <td className="py-4 px-2 text-right">₹{filteredHistoryBills.reduce((s,b)=>s+b.cgst, 0).toFixed(2)}</td>
                <td className="py-4 px-2 text-right">₹{filteredHistoryBills.reduce((s,b)=>s+b.sgst, 0).toFixed(2)}</td>
                <td className="py-4 px-2 text-right text-black">₹{filteredHistoryBills.reduce((s,b)=>s+b.total, 0).toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
