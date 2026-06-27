// TypeScript Database Schema
// Defines the strictly typed data models for the Zee Laban POS System.

export interface Store {
  id: string;
  name: string;
  owner_name: string;
  owner_mobile: string;
  owner_email: string;
  owner_password: string;
  location: string;
  pincode: string;
  upi_id?: string;
  gst_number?: string;
  is_active: boolean;
  created_at: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'store';
  store_id: string | null;
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  created_at: string;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  gst_rate: number;
  gst_inclusive: boolean;
  description?: string;
  image_url?: string;
  price_locked: boolean;
  is_active: boolean;
  created_at: string;
}

export interface Staff {
  id: string;
  store_id: string;
  name: string;
  phone: string;
  role: 'cashier' | 'helper' | 'delivery';
  joining_date: string;
  is_active: boolean;
  created_by?: string;
  created_at: string;
}

export interface StaffAdvance {
  id: string;
  staff_id: string;
  store_id: string;
  amount: number;
  date: string;
  notes: string;
  status: 'pending' | 'cleared';
  created_at: string;
}

export interface ShiftLog {
  id: string;
  staff_id: string;
  store_id: string;
  clock_in: string;
  clock_out: string | null;
  duration_minutes: number | null;
  corrected_by?: string;
  created_at: string;
}

export interface Stock {
  id: string;
  store_id: string;
  product_id: string;
  quantity: number;
  status: 'in_stock' | 'low_stock' | 'out_of_stock';
  updated_at: string;
  updated_by?: string;
}

export interface StockLog {
  id: string;
  store_id: string;
  product_id: string;
  old_status: 'in_stock' | 'low_stock' | 'out_of_stock' | null;
  new_status: 'in_stock' | 'low_stock' | 'out_of_stock';
  old_quantity: number | null;
  new_quantity: number;
  updated_by: string;
  updated_at: string;
}

export interface Bill {
  id: string;
  bill_number: string;
  store_id: string;
  cashier_id: string;
  customer_name?: string;
  customer_mobile?: string;
  subtotal: number;
  cgst: number;
  sgst: number;
  total: number;
  payment_method: 'Cash' | 'UPI' | 'Card';
  order_type?: 'Dine-in' | 'Takeaway' | 'Delivery';
  created_at: string;
}

export interface BillItem {
  id: string;
  bill_id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface CustomerProfile {
  id: string;
  name: string;
  mobile: string;
  visits: number;
  spent: number;
}

