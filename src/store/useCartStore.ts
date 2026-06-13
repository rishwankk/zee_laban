import { create } from 'zustand';
import { Product } from '@/lib/db';

export interface CartItem {
  product: Product;
  quantity: number;
}

interface CartTotals {
  subtotal: number;
  cgst: number;
  sgst: number;
  total: number;
}

interface CartState {
  cartItems: CartItem[];
  customerName: string;
  customerMobile: string;
  paymentMethod: 'Cash' | 'UPI' | 'Card';
  orderType: 'Dine In' | 'Take Away' | 'Delivery';
  
  // Actions
  addItem: (product: Product) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  setCustomerName: (name: string) => void;
  setCustomerMobile: (mobile: string) => void;
  setPaymentMethod: (method: 'Cash' | 'UPI' | 'Card') => void;
  setOrderType: (type: 'Dine In' | 'Take Away' | 'Delivery') => void;
  clearCart: () => void;
  getTotals: () => CartTotals;
}

export const useCartStore = create<CartState>((set, get) => ({
  cartItems: [],
  customerName: '',
  customerMobile: '',
  paymentMethod: 'Cash',
  orderType: 'Take Away',

  addItem: (product: Product) => {
    const { cartItems } = get();
    const existing = cartItems.find(item => item.product.id === product.id);
    
    if (existing) {
      set({
        cartItems: cartItems.map(item => 
          item.product.id === product.id 
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      });
    } else {
      set({ cartItems: [...cartItems, { product, quantity: 1 }] });
    }
  },

  removeItem: (productId: string) => {
    set({
      cartItems: get().cartItems.filter(item => item.product.id !== productId)
    });
  },

  updateQuantity: (productId: string, quantity: number) => {
    if (quantity <= 0) {
      get().removeItem(productId);
      return;
    }
    set({
      cartItems: get().cartItems.map(item => 
        item.product.id === productId 
          ? { ...item, quantity }
          : item
      )
    });
  },

  setCustomerName: (customerName: string) => set({ customerName }),

  setCustomerMobile: (customerMobile: string) => set({ customerMobile }),

  setPaymentMethod: (paymentMethod: 'Cash' | 'UPI' | 'Card') => set({ paymentMethod }),

  setOrderType: (orderType: 'Dine In' | 'Take Away' | 'Delivery') => set({ orderType }),

  clearCart: () => set({ cartItems: [], customerName: '', customerMobile: '', paymentMethod: 'Cash', orderType: 'Take Away' }),

  getTotals: () => {
    const { cartItems } = get();
    let totalSubtotal = 0;
    let totalCgst = 0;
    let totalSgst = 0;
    let grandTotal = 0;

    cartItems.forEach(item => {
      const { price, gst_rate, gst_inclusive } = item.product;
      const quantity = item.quantity;

      if (gst_inclusive) {
        // Price includes GST (e.g. Price is ₹120 with 5% GST included)
        // Base Price = 120 / 1.05 = 114.2857...
        // GST Amount = 120 - 114.2857 = 5.7142...
        const itemTotal = price * quantity;
        const basePrice = itemTotal / (1 + gst_rate / 100);
        const gstAmount = itemTotal - basePrice;
        const cgst = gstAmount / 2;
        const sgst = gstAmount / 2;

        totalSubtotal += basePrice;
        totalCgst += cgst;
        totalSgst += sgst;
        grandTotal += itemTotal;
      } else {
        // Price is base, GST is added on top (e.g. Price is ₹180 with 12% GST excluded)
        // Base Price = 180 * quantity
        // GST Amount = 180 * quantity * 0.12
        const itemSubtotal = price * quantity;
        const gstAmount = itemSubtotal * (gst_rate / 100);
        const cgst = gstAmount / 2;
        const sgst = gstAmount / 2;

        totalSubtotal += itemSubtotal;
        totalCgst += cgst;
        totalSgst += sgst;
        grandTotal += (itemSubtotal + gstAmount);
      }
    });

    // Precision Rounding to nearest 2 decimal places
    return {
      subtotal: Math.round(totalSubtotal * 100) / 100,
      cgst: Math.round(totalCgst * 100) / 100,
      sgst: Math.round(totalSgst * 100) / 100,
      total: Math.round(grandTotal * 100) / 100
    };
  }
}));
