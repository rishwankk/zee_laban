'use client';

import { useState, useMemo } from 'react';
import { useCartStore, CartItem } from '@/store/useCartStore';
import { usePrinterStore } from '@/store/usePrinterStore';
import { useAuthStore } from '@/store/useAuthStore';
import { api, Product, Stock } from '@/lib/supabase';

import PrinterStatus from './PrinterStatus';
import PrinterOfflineModal from './PrinterOfflineModal';
import {
  Trash2,
  Minus,
  Plus,
  User,
  CreditCard,
  Coins,
  QrCode,
  Receipt,
  FileMinus,
  Sparkles,
  AlertCircle,
  CheckCircle,
  Coffee,
  ShoppingBag,
  Bike
} from 'lucide-react';

interface CartPanelProps {
  onSuccess: (billNo: string) => void;
  stockList?: Stock[];
}

export default function CartPanel({ onSuccess, stockList = [] }: CartPanelProps) {
  const {
    cartItems,
    customerName,
    customerMobile,
    paymentMethod,
    orderType,
    addItem,
    removeItem,
    updateQuantity,
    setCustomerName,
    setCustomerMobile,
    setPaymentMethod,
    setOrderType,
    clearCart,
    getTotals
  } = useCartStore();

  const { isConnected, triggerPrint } = usePrinterStore();
  const { user, store } = useAuthStore();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeBillNo, setActiveBillNo] = useState<string>('');
  const [successBillDetails, setSuccessBillDetails] = useState<{ billNo: string; total: number } | null>(null);
  const [stockWarning, setStockWarning] = useState<string | null>(null);

  const triggerStockWarning = (productName: string) => {
    setStockWarning(productName);
    setTimeout(() => setStockWarning(null), 2500);
  };

  const handleIncreaseQuantity = (item: CartItem) => {
    const stockEntry = stockList.find(s => s.product_id === item.product.id);
    const isOut = stockEntry ? (stockEntry.status === 'out_of_stock' || stockEntry.quantity <= item.quantity) : false;

    if (isOut) {
      triggerStockWarning(item.product.name);
      return;
    }

    updateQuantity(item.product.id, item.quantity + 1);
  };

  // Calculate totals dynamically using our Zustand pricing engine
  const totals = useMemo(() => getTotals(), [cartItems, getTotals]);
  const isEmpty = cartItems.length === 0;

  // Render a high-fidelity 80mm styled thermal printer layout
  const buildReceiptHtml = (billNumber: string) => {
    const formattedDate = new Date().toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
    const formattedTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });

    let itemsRows = '';
    cartItems.forEach(item => {
      const itemPrice = item.product.price;
      const total = itemPrice * item.quantity;
      itemsRows += `
        <tr>
          <td>${item.product.name.substring(0, 18)}</td>
          <td class="center">${item.quantity}</td>
          <td class="right">₹${itemPrice.toFixed(2)}</td>
          <td class="right">₹${total.toFixed(2)}</td>
        </tr>
      `;
    });

    let kitchenItemsRows = '';
    cartItems.forEach(item => {
      kitchenItemsRows += `
        <tr>
          <td style="font-weight: bold; font-size: 12px; padding: 4px 0;">${item.product.name}</td>
          <td class="right" style="font-weight: bold; font-size: 13px; text-align: right; padding: 4px 0;">${item.quantity}</td>
        </tr>
      `;
    });

    const taxNote = cartItems.some(i => i.product.gst_inclusive)
      ? '*Prices inclusive of GST*'
      : '*Prices exclusive of GST*';

    const vpa = store?.upi_id;
    let upiQrSection = '';

    if (paymentMethod === 'UPI') {
      if (vpa && vpa.trim()) {
        const upiLink = `upi://pay?pa=${vpa}&am=${totals.total.toFixed(2)}&cu=INR&tn=Verified Merchant Account`;
        const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&margin=5&data=${encodeURIComponent(upiLink)}`;
        upiQrSection = `
          <div class="center" style="margin-top: 8px;">
            <div style="font-size: 10px; font-weight: bold; margin-bottom: 4px;">Scan to Pay via UPI</div>
            <img src="${qrCodeUrl}" style="width: 130px; height: 130px; display: block; margin: 0 auto;" />
            <div style="font-size: 8px; margin-top: 4px; font-family: monospace;">VPA: ${vpa}</div>
          </div>
          <div class="line" style="margin-top: 6px;"></div>
        `;
      } else {
        upiQrSection = `
          <div class="center" style="margin-top: 8px; color: #dc2626; font-size: 9px; font-weight: bold; border: 1px dashed #fca5a5; padding: 6px; border-radius: 6px; background: #fef2f2;">
            ⚠️ UPI payments not configured. Please set a UPI ID in Settings.
          </div>
          <div class="line" style="margin-top: 6px;"></div>
        `;
      }
    }

    // Customer Copy
    const customerInvoice = `
      <div class="center bold" style="font-size: 16px; margin-bottom: 4px; letter-spacing: 1.5px;">ZEE LABAN</div>
      <div class="center" style="font-size: 9px; margin-bottom: 2px;">${store?.name || 'Main Outlet'}</div>
      <div class="center" style="font-size: 9px; color: #333;">${store?.location || 'Calicut Junction'} | Ph: ${store?.owner_mobile || '+91 7994776519'}</div>
      ${store?.gst_number ? `<div class="center" style="font-size: 9px; font-weight: bold; margin-top: 2px;">GSTIN: ${store.gst_number}</div>` : ''}
      <div class="line"></div>
      <div class="center bold" style="font-size: 10px; margin-bottom: 6px; letter-spacing: 1px;">TAX INVOICE</div>
      <table style="margin-bottom: 6px; font-size: 9px;">
        <tr>
          <td>Bill No: <span class="bold">${billNumber}</span></td>
          <td class="right">Date: <span class="bold">${formattedDate}</span></td>
        </tr>
        <tr>
          <td>Type: <span class="bold">${orderType}</span></td>
          <td class="right">Time: <span class="bold">${formattedTime}</span></td>
        </tr>
        ${customerName ? `<tr><td colspan="2" style="padding-top: 4px;">Customer: <span class="bold">${customerName}</span> ${customerMobile ? `(${customerMobile})` : ''}</td></tr>` : ''}
      </table>
      <div class="line"></div>
      <table>
        <thead>
          <tr class="bold">
            <th class="left">ITEM</th>
            <th class="center" style="width: 15%;">QTY</th>
            <th class="right">RATE</th>
            <th class="right">AMT</th>
          </tr>
        </thead>
        <tbody>
          ${itemsRows}
        </tbody>
      </table>
      </table>
      <div class="line"></div>
      <table style="font-size: 9px; margin-top: 4px;">
        <tr>
          <td>Subtotal (excl. GST)</td>
          <td class="right">₹${totals.subtotal.toFixed(2)}</td>
        </tr>
        <tr>
          <td>CGST (2.5%)</td>
          <td class="right">₹${totals.cgst.toFixed(2)}</td>
        </tr>
        <tr>
          <td>SGST (2.5%)</td>
          <td class="right">₹${totals.sgst.toFixed(2)}</td>
        </tr>
        <tr class="bold" style="font-size: 13px;">
          <td style="padding-top: 6px;">GRAND TOTAL</td>
          <td class="right" style="padding-top: 6px;">₹${totals.total.toFixed(2)}</td>
        </tr>
      </table>
      <div class="line"></div>
      <div class="center bold" style="margin-bottom: 6px; font-size: 10px;">Payment: ${paymentMethod}</div>
      ${upiQrSection}
      <div class="center" style="font-size: 8px; margin-top: 6px;">${taxNote}</div>
      <div class="center bold" style="margin-top: 8px; font-size: 10px; letter-spacing: 0.5px;">Thank you! Visit Again 😊</div>
    `;

    // Kitchen Order Ticket (KOT)
    const kitchenCopy = `
      <div class="center bold" style="font-size: 15px; margin-bottom: 4px; letter-spacing: 1px;">KITCHEN COPY</div>
      <div class="center" style="font-size: 9px; margin-bottom: 6px;">${store?.name || 'Main Outlet'}</div>
      <div class="line"></div>
      <table style="margin-bottom: 6px; font-size: 10px;">
        <tr>
          <td>KOT: <span class="bold">${billNumber}</span></td>
          <td class="right">Time: <span class="bold">${formattedTime}</span></td>
        </tr>
        <tr>
          <td>Type: <span class="bold">${orderType}</span></td>
          <td class="right">Date: <span class="bold">${formattedDate}</span></td>
        </tr>
      </table>
      <div class="line"></div>
      <table>
        <thead>
          <tr class="bold">
            <th class="left">KITCHEN ITEM</th>
            <th class="right" style="width: 25%;">QTY</th>
          </tr>
        </thead>
        <tbody>
          ${kitchenItemsRows}
        </tbody>
      </table>
      <div class="line" style="margin-top: 8px;"></div>
      <div class="center bold" style="font-size: 11px; margin-top: 10px; letter-spacing: 1.5px;">*** END OF KOT ***</div>
    `;

    return `
      <div style="page-break-after: always; break-after: page; margin-bottom: 20px;">
        ${customerInvoice}
      </div>
      <div>
        ${kitchenCopy}
      </div>
    `;
  };

  // Perform invoice registration & printing trigger
  const handleCheckout = async () => {
    if (isEmpty || isSubmitting || !user || !store) return;
    setIsSubmitting(true);

    try {
      // 1. Save the completed record to Supabase / Production database FIRST
      const bill = await api.saveBill(
        store.id,
        user.id,
        customerName,
        customerMobile,
        cartItems,
        paymentMethod,
        totals
      );

      // 2. Establish the sequential bill registration layout details with real bill number
      const printBlockHtml = buildReceiptHtml(bill.bill_number);

      // 3. Dispatch printer socket check
      await triggerPrint({
        htmlContent: printBlockHtml,
        onComplete: async () => {
          setActiveBillNo(bill.bill_number);
          setSuccessBillDetails({ billNo: bill.bill_number, total: totals.total });
          onSuccess(bill.bill_number);

          // Clear Cart
          clearCart();
          setTimeout(() => setSuccessBillDetails(null), 6000); // dismiss after 6s
        }
      });

    } catch (err) {
      console.error("Failed to process transaction", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Callback to support in-cart unit price adjustments for unlocked catalog products
  const handlePriceUpdate = (productId: string, val: string) => {
    const numeric = parseFloat(val) || 0;
    if (numeric < 0) return;

    useCartStore.setState((state) => ({
      cartItems: state.cartItems.map(item =>
        item.product.id === productId
          ? { ...item, product: { ...item.product, price: numeric } }
          : item
      )
    }));
  };

  return (
    <div className="flex h-full flex-col bg-white rounded-3xl p-4 sm:p-5.5 shadow-md shadow-slate-100/40 border border-slate-100/60 select-none overflow-y-auto scrollbar-thin relative">

      {/* Dynamic Stock Warning alert banner */}
      {stockWarning && (
        <div className="absolute inset-x-4 top-4 z-40 bg-red-500 text-white rounded-2xl p-4 shadow-lg border border-red-400/20 flex items-center space-x-3 select-none animate-slide-down">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white">
            <AlertCircle className="h-5 w-5 stroke-[2.5px]" />
          </div>
          <div>
            <div className="text-xs font-black">Out of Stock!</div>
            <div className="text-[10px] opacity-90 mt-0.5">{stockWarning} is out of stock.</div>
          </div>
        </div>
      )}

      {/* FULL CHECKOUT SUCCESS PORTAL OVERLAY */}
      {successBillDetails && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-white/95 backdrop-blur-[4px] p-6 rounded-3xl animate-fade-in select-none">
          {/* Animated Success Check Circle */}
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50 border-4 border-emerald-100 text-emerald-500 shadow-lg shadow-emerald-500/10 mb-4 animate-scale-in">
            <CheckCircle className="h-10 w-10 stroke-[2.5px]" />
          </div>

          <h3 className="font-display text-base font-black text-text-primary text-center">
            Transaction Complete!
          </h3>
          <p className="text-[10px] font-semibold text-text-muted mt-1 text-center max-w-[200px] leading-relaxed">
            Invoice has been recorded in the performance ledger.
          </p>

          {/* Receipt InfoDocket */}
          <div className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 mt-6 space-y-3 font-mono text-[10px] font-semibold text-slate-500 shadow-inner">
            <div className="flex items-center justify-between">
              <span>Invoice No:</span>
              <span className="font-black text-primary-dark select-all">{successBillDetails.billNo}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Grand Total:</span>
              <span className="font-black text-text-primary text-xs">₹{successBillDetails.total.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Store Terminal:</span>
              <span className="font-black text-text-primary">{store?.name || 'Main Term'}</span>
            </div>
            <div className="h-[1px] w-full border-t border-dashed border-slate-200"></div>
            <div className="flex items-center space-x-1.5 text-[8.5px] font-bold text-emerald-600 justify-center">
              <Sparkles className="h-3 w-3 animate-pulse" />
              <span>Printed Customer & Kitchen copies</span>
            </div>
          </div>

          <button
            onClick={() => setSuccessBillDetails(null)}
            className="w-full rounded-2xl bg-primary hover:bg-primary-dark text-white font-display text-xs font-black uppercase tracking-widest py-3.5 mt-8 shadow-lg shadow-primary/20 transition-all active:scale-[0.98] cursor-pointer"
          >
            Start New Order
          </button>
        </div>
      )}

      {/* CUSTOMER PROFILE INFO */}
      <div className="grid grid-cols-2 gap-2.5 mb-4 shrink-0">
        <div className="relative group/input">
          <User className="absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400 group-focus-within/input:text-primary transition-colors" />
          <input
            type="text"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="Customer Name"
            className="w-full rounded-2xl border border-slate-100 bg-slate-50/50 py-3 pl-9.5 pr-2.5 text-[10px] sm:text-[11px] font-bold text-text-primary placeholder-slate-400 outline-none transition-all duration-300 focus:border-primary/45 focus:bg-white focus:ring-4 focus:ring-primary/5"
          />
        </div>

        <div className="relative group/input">
          <input
            type="tel"
            value={customerMobile}
            onChange={(e) => setCustomerMobile(e.target.value)}
            placeholder="Mobile Number"
            className="w-full rounded-2xl border border-slate-100 bg-slate-50/50 py-3 px-3.5 text-[10px] sm:text-[11px] font-bold text-text-primary placeholder-slate-400 outline-none transition-all duration-300 focus:border-primary/45 focus:bg-white focus:ring-4 focus:ring-primary/5"
          />
        </div>
      </div>

      {/* ORDER TYPE SELECTOR */}
      <div className="mb-4 shrink-0">
        <label className="block text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
          Order Type
        </label>
        <div className="grid grid-cols-3 gap-2.5">
          {[
            { id: 'Dine In', label: 'Dine In', icon: Coffee },
            { id: 'Take Away', label: 'Take Away', icon: ShoppingBag },
            { id: 'Delivery', label: 'Delivery', icon: Bike }
          ].map((type) => {
            const isActive = orderType === type.id;
            return (
              <button
                key={type.id}
                type="button"
                onClick={() => setOrderType(type.id as any)}
                className={`flex items-center justify-center space-x-1.5 py-2.5 rounded-2xl border text-[10px] sm:text-xs font-black transition-all duration-300 cursor-pointer active:scale-95 ${isActive
                  ? 'bg-primary-light/30 border-primary text-primary shadow-sm scale-[1.02] animate-scale-in'
                  : 'bg-slate-50 hover:bg-slate-100/70 border-slate-100 text-slate-500 hover:text-slate-700'
                  }`}
              >
                <type.icon className={`h-3.5 w-3.5 ${isActive ? 'text-primary' : 'text-slate-400'}`} />
                <span>{type.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* CART LINE ITEMS DISPLAY */}
      <div className="flex-1 overflow-y-auto mb-4 border-b border-slate-50 pr-1 min-h-[110px] max-h-[180px] sm:max-h-[240px] lg:max-h-[300px]">
        {isEmpty ? (
          <div className="flex h-full flex-col items-center justify-center text-center py-8">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-light text-primary mb-3 shadow-inner shadow-primary/5 animate-pulse">
              <FileMinus className="h-5 w-5 stroke-[1.8px]" />
            </div>
            <p className="text-xs font-black text-text-primary">Empty Checkout Deck</p>
            <p className="text-[10px] text-text-muted mt-1 leading-relaxed max-w-[180px] mx-auto">Select fresh dessert cups or drinks to build the customer invoice.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {cartItems.map((item) => (
              <div
                key={item.product.id}
                className="group/item flex items-center justify-between rounded-2xl bg-slate-50/40 hover:bg-slate-50/80 p-3 border border-slate-100/50 hover:border-primary/15 transition-all duration-300 shadow-sm hover:shadow-md hover:shadow-slate-100/30"
              >
                {/* Details */}
                <div className="flex-1 mr-3 min-w-0">
                  <h4 className="truncate text-xs font-extrabold text-text-primary group-hover/item:text-primary transition-colors">
                    {item.product.name}
                  </h4>

                  {/* Dynamic Pricing Engine: Readonly Plain Text vs Input Box */}
                  <div className="flex items-center space-x-1.5 mt-1">
                    {item.product.price_locked ? (
                      <span className="font-mono text-[10px] sm:text-[11px] font-black text-slate-500">
                        ₹{item.product.price.toFixed(2)}
                      </span>
                    ) : (
                      <div className="flex items-center space-x-1">
                        <span className="text-[8px] sm:text-[9px] font-black text-primary uppercase">₹</span>
                        <input
                          type="number"
                          value={item.product.price === 0 ? '' : item.product.price}
                          onChange={(e) => handlePriceUpdate(item.product.id, e.target.value)}
                          placeholder="Price"
                          className="w-14 sm:w-16 rounded-lg border border-blue-200 bg-white px-1.5 py-0.5 font-mono text-[10px] sm:text-[11px] font-bold text-primary outline-none focus:ring-4 focus:ring-primary/5"
                        />
                        <span className="rounded bg-primary-light px-1.5 py-0.5 text-[6px] sm:text-[7px] font-black uppercase text-primary tracking-wider scale-90 sm:scale-100">
                          Unlocked
                        </span>
                      </div>
                    )}
                    <span className="text-[9px] sm:text-[10px] font-bold text-slate-400">/ unit</span>
                  </div>
                </div>

                {/* Counter & Actions */}
                <div className="flex items-center space-x-2.5 sm:space-x-3.5">

                  {/* Quantity Control Pill */}
                  <div className="flex items-center space-x-2 bg-white border border-slate-100 rounded-xl p-0.5 shadow-sm">
                    <button
                      onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                      className="flex h-5 w-5 items-center justify-center rounded-lg bg-slate-50 hover:bg-primary hover:text-white transition-all duration-200 active:scale-90 cursor-pointer"
                    >
                      <Minus className="h-2.5 w-2.5 stroke-[2.8px]" />
                    </button>
                    <span className="font-mono text-xs font-black text-text-primary min-w-[14px] text-center">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => handleIncreaseQuantity(item)}
                      className="flex h-5 w-5 items-center justify-center rounded-lg bg-slate-50 hover:bg-primary hover:text-white transition-all duration-200 active:scale-90 cursor-pointer"
                    >
                      <Plus className="h-2.5 w-2.5 stroke-[2.8px]" />
                    </button>
                  </div>

                  {/* Remove Bin */}
                  <button
                    onClick={() => removeItem(item.product.id)}
                    className="text-slate-300 hover:text-danger p-1.5 rounded-xl hover:bg-red-50 transition-all active:scale-95 cursor-pointer"
                  >
                    <Trash2 className="h-4 w-4 stroke-[1.8px]" />
                  </button>

                </div>

              </div>
            ))}
          </div>
        )}
      </div>

      {/* BILL TOTALS SUMMARY */}
      <div className="space-y-2 bg-gradient-to-br from-slate-50/50 to-blue-50/20 rounded-2xl p-4 border border-slate-100/80 border-l-4 border-l-primary mb-4 font-mono text-[10px] sm:text-[11px] font-semibold text-slate-500 shrink-0 shadow-sm relative overflow-hidden">
        {/* Abstract design elements */}
        <div className="absolute -right-4 -top-4 w-12 h-12 rounded-full bg-primary/5 blur-xl pointer-events-none" />

        <div className="flex items-center justify-between">
          <span>Subtotal (excl. GST):</span>
          <span className="font-black text-text-primary">₹{totals.subtotal.toFixed(2)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span>CGST (2.5%):</span>
          <span className="font-black text-text-primary">₹{totals.cgst.toFixed(2)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span>SGST (2.5%):</span>
          <span className="font-black text-text-primary">₹{totals.sgst.toFixed(2)}</span>
        </div>
        <div className="h-[1px] w-full border-t border-dashed border-slate-200 my-1"></div>
        <div className="flex items-center justify-between text-[11px] sm:text-xs font-black text-primary">
          <span className="font-display uppercase tracking-wider">Grand Total:</span>
          <span className="text-sm sm:text-base font-mono">₹{totals.total.toFixed(2)}</span>
        </div>
      </div>

      {/* PAYMENT METHOD SELECTOR */}
      <div className="mb-4 shrink-0">
        <label className="block text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
          Payment Method
        </label>
        <div className="grid grid-cols-3 gap-2.5">
          {[
            { id: 'Cash', label: 'Cash Drawer', icon: Coins },
            { id: 'UPI', label: 'UPI QR Pay', icon: QrCode },
            { id: 'Card', label: 'POS Card', icon: CreditCard }
          ].map((method) => {
            const isActive = paymentMethod === method.id;
            return (
              <button
                key={method.id}
                type="button"
                onClick={() => setPaymentMethod(method.id as any)}
                disabled={isEmpty}
                className={`flex flex-col items-center justify-center py-3 rounded-2xl border text-[10px] sm:text-xs font-black transition-all duration-300 cursor-pointer active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${isActive
                  ? 'bg-gradient-to-br from-primary to-primary-dark border-transparent text-white shadow-md shadow-primary/20 scale-[1.02] animate-scale-in'
                  : 'bg-slate-50 hover:bg-slate-100/70 border-slate-100 text-slate-600 hover:text-slate-800 shadow-sm shadow-slate-100/10'
                  }`}
              >
                <method.icon className={`h-4.5 w-4.5 mb-1 transition-transform duration-300 ${isActive ? 'scale-110 text-white' : 'text-slate-400 hover:text-slate-600'}`} />
                <span>{method.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* CHECKOUT TRIGGERS */}
      <div className="grid grid-cols-4 gap-3 mt-auto pt-4 border-t border-slate-100 bg-white sticky bottom-0 z-10 shrink-0 pb-1 sm:pb-0">

        {/* Reset Counter Button */}
        <button
          onClick={clearCart}
          disabled={isEmpty}
          className="col-span-1 flex items-center justify-center rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-400 hover:text-danger transition-all duration-300 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-sm"
          title="Clear Checkout"
        >
          <Trash2 className="h-5 w-5 stroke-[1.8px]" />
        </button>

        {/* Print Invoice Button */}
        <button
          onClick={handleCheckout}
          disabled={isEmpty || isSubmitting}
          className="col-span-3 flex items-center justify-center space-x-2 rounded-2xl py-4 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-primary/20 transition-all duration-500 bg-gradient-to-r from-primary via-primary-dark to-primary bg-[size:200%_auto] hover:bg-[right_center] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {isSubmitting ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
          ) : (
            <>
              <Receipt className="h-4 w-4 stroke-[2px]" />
              <span>Checkout & Print</span>
            </>
          )}
        </button>

      </div>

    </div>
  );
}


