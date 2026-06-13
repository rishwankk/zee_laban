import { supabase } from './supabase';
import {
  Store,
  User,
  Category,
  Product,
  Staff,
  StaffAdvance,
  ShiftLog,
  Stock,
  StockLog,
  Bill,
  BillItem
} from './db';

const isClient = () => typeof window !== 'undefined';

export const supabaseAPI = {
  // ---------------------------------------------------------
  // STORES
  // ---------------------------------------------------------
  getStores: async (): Promise<Store[]> => {
    const { data, error } = await supabase!.from('stores').select('*').order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return data as Store[];
  },

  addStore: async (store: Omit<Store, 'id' | 'is_active' | 'created_at'>): Promise<Store> => {
    const { data, error } = await supabase!.from('stores').insert({
      id: `str-${Date.now()}`,
      ...store,
      is_active: true,
      created_at: new Date().toISOString()
    }).select().single();
    if (error) throw new Error(error.message);
    return data as Store;
  },

  updateStore: async (id: string, updates: Partial<Store>): Promise<Store> => {
    const { data, error } = await supabase!.from('stores').update(updates).eq('id', id).select().single();
    if (error) throw new Error(error.message);
    return data as Store;
  },

  deleteStore: async (id: string): Promise<void> => {
    const { error } = await supabase!.from('stores').update({ is_active: false }).eq('id', id);
    if (error) throw new Error(error.message);
  },

  // ---------------------------------------------------------
  // USERS
  // ---------------------------------------------------------
  getUsers: async (): Promise<User[]> => {
    const { data, error } = await supabase!.from('users').select('*');
    if (error) throw new Error(error.message);
    return data as User[];
  },

  getUserByEmail: async (email: string): Promise<User | null> => {
    const { data, error } = await supabase!.from('users').select('*').ilike('email', email).maybeSingle();
    if (error) throw new Error(error.message);
    return data as User | null;
  },

  // ---------------------------------------------------------
  // CATEGORIES
  // ---------------------------------------------------------
  getCategories: async (): Promise<Category[]> => {
    const { data, error } = await supabase!.from('categories').select('*').order('created_at', { ascending: true });
    if (error) throw new Error(error.message);
    return data as Category[];
  },

  addCategory: async (name: string): Promise<Category> => {
    const { data, error } = await supabase!.from('categories').insert({
      id: `cat-${Date.now()}`,
      name,
      created_at: new Date().toISOString()
    }).select().single();
    if (error) throw new Error(error.message);
    return data as Category;
  },

  updateCategory: async (id: string, name: string): Promise<Category> => {
    const { data, error } = await supabase!.from('categories').update({ name }).eq('id', id).select().single();
    if (error) throw new Error(error.message);
    return data as Category;
  },

  deleteCategory: async (id: string): Promise<void> => {
    const { error } = await supabase!.from('categories').delete().eq('id', id);
    if (error) throw new Error(error.message);
  },

  // ---------------------------------------------------------
  // PRODUCTS
  // ---------------------------------------------------------
  getProducts: async (): Promise<Product[]> => {
    const { data, error } = await supabase!.from('products').select('*').eq('is_active', true).order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return data as Product[];
  },

  addProduct: async (product: Omit<Product, 'id' | 'is_active' | 'created_at'>): Promise<Product> => {
    const newProduct = {
      ...product,
      id: `prod-${Date.now()}`,
      is_active: true,
      created_at: new Date().toISOString()
    };
    const { data, error } = await supabase!.from('products').insert(newProduct).select().single();
    if (error) throw new Error(error.message);

    // After adding a product, add default stock for all stores
    const { data: stores } = await supabase!.from('stores').select('id');
    if (stores && stores.length > 0) {
      const stockEntries = stores.map(store => ({
        id: `stk-${store.id}-${newProduct.id}`,
        store_id: store.id,
        product_id: newProduct.id,
        quantity: 30,
        status: "in_stock",
        updated_at: new Date().toISOString()
      }));
      await supabase!.from('stock').insert(stockEntries);
    }

    return data as Product;
  },

  updateProduct: async (id: string, updates: Partial<Product>): Promise<Product> => {
    const { data, error } = await supabase!.from('products').update(updates).eq('id', id).select().single();
    if (error) throw new Error(error.message);
    return data as Product;
  },

  deleteProduct: async (id: string): Promise<void> => {
    const { error } = await supabase!.from('products').update({ is_active: false }).eq('id', id);
    if (error) throw new Error(error.message);
  },

  // ---------------------------------------------------------
  // STOCK
  // ---------------------------------------------------------
  getStockByStore: async (storeId: string): Promise<(Stock & { product: Product })[]> => {
    const { data, error } = await supabase!
      .from('stock')
      .select(`*, product:products(*)`)
      .eq('store_id', storeId);
    if (error) throw new Error(error.message);
    
    // Fallback if joined product is an array instead of single object
    return (data as any[]).map(s => ({
      ...s,
      product: Array.isArray(s.product) ? s.product[0] : s.product
    }));
  },

  updateStockQuantity: async (
    storeId: string,
    productId: string,
    newQuantity: number,
    newStatus: Stock['status'],
    updatedByUserId: string,
    updatedByName: string
  ): Promise<Stock> => {
    // 1. Get old stock
    const { data: oldStock, error: getErr } = await supabase!
      .from('stock')
      .select('*')
      .eq('store_id', storeId)
      .eq('product_id', productId)
      .single();
    if (getErr) throw new Error("Stock entry not found: " + getErr.message);

    // 2. Update stock
    const { data: newStock, error: upErr } = await supabase!
      .from('stock')
      .update({
        quantity: newQuantity,
        status: newStatus,
        updated_at: new Date().toISOString(),
        updated_by: updatedByUserId
      })
      .eq('store_id', storeId)
      .eq('product_id', productId)
      .select()
      .single();
    if (upErr) throw new Error(upErr.message);

    // 3. Log change
    await supabase!.from('stock_logs').insert({
      id: `log-${Date.now()}`,
      store_id: storeId,
      product_id: productId,
      old_status: oldStock.status,
      new_status: newStatus,
      old_quantity: oldStock.quantity,
      new_quantity: newQuantity,
      updated_by: updatedByName,
      updated_at: new Date().toISOString()
    });

    if (isClient()) {
      window.dispatchEvent(new CustomEvent('lbn_realtime_stock', {
        detail: { storeId, productId, quantity: newQuantity, status: newStatus }
      }));
    }

    return newStock as Stock;
  },

  getStockLogs: async (storeId: string): Promise<(StockLog & { product: Product })[]> => {
    const { data, error } = await supabase!
      .from('stock_logs')
      .select(`*, product:products(*)`)
      .eq('store_id', storeId)
      .order('updated_at', { ascending: false });
    if (error) throw new Error(error.message);
    
    return (data as any[]).map(l => ({
      ...l,
      product: Array.isArray(l.product) ? l.product[0] : l.product
    }));
  },

  // ---------------------------------------------------------
  // STAFF
  // ---------------------------------------------------------
  getStaffByStore: async (storeId: string): Promise<Staff[]> => {
    const { data, error } = await supabase!.from('staff').select('*').eq('store_id', storeId).eq('is_active', true);
    if (error) throw new Error(error.message);
    return data as Staff[];
  },

  addStaff: async (storeId: string, member: Omit<Staff, 'id' | 'store_id' | 'is_active' | 'created_at'>): Promise<Staff> => {
    const { data, error } = await supabase!.from('staff').insert({
      ...member,
      id: `stf-${Date.now()}`,
      store_id: storeId,
      is_active: true,
      created_at: new Date().toISOString()
    }).select().single();
    if (error) throw new Error(error.message);
    return data as Staff;
  },

  updateStaff: async (id: string, updates: Partial<Staff>): Promise<Staff> => {
    const { data, error } = await supabase!.from('staff').update(updates).eq('id', id).select().single();
    if (error) throw new Error(error.message);
    return data as Staff;
  },

  deactivateStaff: async (id: string): Promise<void> => {
    const { error } = await supabase!.from('staff').update({ is_active: false }).eq('id', id);
    if (error) throw new Error(error.message);
  },

  // ---------------------------------------------------------
  // SALAF (ADVANCES)
  // ---------------------------------------------------------
  getSalafLockState: async (storeId: string): Promise<boolean> => {
    const { data, error } = await supabase!
      .from('system_settings')
      .select('value')
      .eq('key', `salaf_locked_${storeId}`)
      .maybeSingle();
    if (error || !data) return true; // default locked
    return data.value === 'true';
  },

  setSalafLockState: async (storeId: string, isLocked: boolean): Promise<void> => {
    const { error } = await supabase!
      .from('system_settings')
      .upsert({ key: `salaf_locked_${storeId}`, value: isLocked ? 'true' : 'false' });
    if (error) throw new Error(error.message);
    if (isClient()) {
      window.dispatchEvent(new CustomEvent('lbn_realtime_salaf_lock', { detail: { storeId, isLocked } }));
    }
  },

  getAdvancesByStore: async (storeId: string): Promise<(StaffAdvance & { staff: Staff })[]> => {
    const { data, error } = await supabase!
      .from('staff_advances')
      .select(`*, staff:staff(*)`)
      .eq('store_id', storeId)
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    
    return (data as any[]).map(a => ({
      ...a,
      staff: Array.isArray(a.staff) ? a.staff[0] : a.staff
    }));
  },

  addAdvance: async (storeId: string, advance: Omit<StaffAdvance, 'id' | 'store_id' | 'status' | 'created_at'>): Promise<StaffAdvance> => {
    const isLocked = await supabaseAPI.getSalafLockState(storeId);
    if (isLocked) throw new Error("Salaf advances ledger is currently locked by the administrator.");

    const { data, error } = await supabase!.from('staff_advances').insert({
      ...advance,
      id: `adv-${Date.now()}`,
      store_id: storeId,
      status: 'pending',
      created_at: new Date().toISOString()
    }).select().single();
    if (error) throw new Error(error.message);
    return data as StaffAdvance;
  },

  updateAdvanceStatus: async (id: string, status: 'pending' | 'cleared'): Promise<StaffAdvance> => {
    const { data: adv } = await supabase!.from('staff_advances').select('store_id').eq('id', id).single();
    if (!adv) throw new Error("Advance not found");
    const isLocked = await supabaseAPI.getSalafLockState(adv.store_id);
    if (isLocked) throw new Error("Salaf advances ledger is currently locked by the administrator.");

    const { data, error } = await supabase!.from('staff_advances').update({ status }).eq('id', id).select().single();
    if (error) throw new Error(error.message);
    return data as StaffAdvance;
  },

  // ---------------------------------------------------------
  // SHIFT LOGS
  // ---------------------------------------------------------
  getShiftsByStore: async (storeId: string): Promise<(ShiftLog & { staff: Staff })[]> => {
    const { data, error } = await supabase!
      .from('shift_logs')
      .select(`*, staff:staff(*)`)
      .eq('store_id', storeId)
      .order('clock_in', { ascending: false });
    if (error) throw new Error(error.message);
    return (data as any[]).map(s => ({
      ...s,
      staff: Array.isArray(s.staff) ? s.staff[0] : s.staff
    }));
  },

  clockInStaff: async (storeId: string, staffId: string): Promise<ShiftLog> => {
    const { data: active } = await supabase!
      .from('shift_logs')
      .select('*')
      .eq('store_id', storeId)
      .eq('staff_id', staffId)
      .is('clock_out', null)
      .maybeSingle();
      
    if (active) return active as ShiftLog;

    const { data, error } = await supabase!.from('shift_logs').insert({
      id: `shf-${Date.now()}`,
      staff_id: staffId,
      store_id: storeId,
      clock_in: new Date().toISOString(),
      clock_out: null,
      duration_minutes: null,
      created_at: new Date().toISOString()
    }).select().single();
    if (error) throw new Error(error.message);
    return data as ShiftLog;
  },

  clockOutStaff: async (id: string): Promise<ShiftLog> => {
    const { data: shift, error: getErr } = await supabase!.from('shift_logs').select('*').eq('id', id).single();
    if (getErr) throw new Error("Active shift not found");

    const clockInTime = new Date(shift.clock_in).getTime();
    const clockOutTime = Date.now();
    const durationMins = Math.round((clockOutTime - clockInTime) / 60000);

    const { data, error } = await supabase!.from('shift_logs').update({
      clock_out: new Date(clockOutTime).toISOString(),
      duration_minutes: durationMins
    }).eq('id', id).select().single();
    if (error) throw new Error(error.message);
    return data as ShiftLog;
  },

  correctShift: async (id: string, clockIn: string, clockOut: string, managerId: string): Promise<ShiftLog> => {
    const inTime = new Date(clockIn).getTime();
    const outTime = new Date(clockOut).getTime();
    const durationMins = Math.round((outTime - inTime) / 60000);

    const { data, error } = await supabase!.from('shift_logs').update({
      clock_in: clockIn,
      clock_out: clockOut,
      duration_minutes: durationMins,
      corrected_by: managerId
    }).eq('id', id).select().single();
    if (error) throw new Error(error.message);
    return data as ShiftLog;
  },

  // ---------------------------------------------------------
  // STAFF PASSWORD
  // ---------------------------------------------------------
  getStaffPassword: async (storeId: string): Promise<string> => {
    const { data } = await supabase!.from('system_settings').select('value').eq('key', `staff_pw_${storeId}`).maybeSingle();
    return data ? data.value : '1234';
  },

  setStaffPassword: async (storeId: string, newPw: string): Promise<void> => {
    const { error } = await supabase!.from('system_settings').upsert({ key: `staff_pw_${storeId}`, value: newPw });
    if (error) throw new Error(error.message);
  },

  // ---------------------------------------------------------
  // BILLS & CHECKOUT
  // ---------------------------------------------------------
  getBillsByStore: async (storeId: string): Promise<(Bill & { cashierName: string })[]> => {
    const { data, error } = await supabase!
      .from('bills')
      .select(`*, cashier:users(name)`)
      .eq('store_id', storeId)
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    
    return (data as any[]).map(b => {
      const cashierName = b.cashier ? (Array.isArray(b.cashier) ? b.cashier[0].name : b.cashier.name) : "Store Desk";
      // Remove the nested cashier object to match local API return type
      const { cashier, ...billRest } = b;
      return {
        ...billRest,
        cashierName
      };
    });
  },

  getBillItems: async (billId: string): Promise<BillItem[]> => {
    const { data, error } = await supabase!.from('bill_items').select('*').eq('bill_id', billId);
    if (error) throw new Error(error.message);
    return data as BillItem[];
  },

  getAllBillItems: async (): Promise<BillItem[]> => {
    const { data, error } = await supabase!.from('bill_items').select('*');
    if (error) throw new Error(error.message);
    return data as BillItem[];
  },

  saveBill: async (
    storeId: string,
    cashierId: string,
    customerName: string,
    customerMobile: string,
    cartItems: { product: Product; quantity: number }[],
    paymentMethod: 'Cash' | 'UPI' | 'Card',
    totals: { subtotal: number; cgst: number; sgst: number; total: number },
    orderType: 'Dine-in' | 'Takeaway' | 'Delivery' = 'Takeaway'
  ): Promise<Bill> => {
    // 1. Generate Bill Number
    const { data: store } = await supabase!.from('stores').select('name').eq('id', storeId).single();
    const storeWords = (store?.name || "LBN").split(" ");
    const storeCode = storeWords.map((w: string) => w[0] || '').join('').toUpperCase().substring(0, 3) || "LBN";
    
    const year = new Date().getFullYear();
    const { count } = await supabase!.from('bills').select('*', { count: 'exact', head: true }).eq('store_id', storeId);
    const sequentialNum = String((count || 0) + 1).padStart(6, '0');
    const billNumber = `LBN-${storeCode}-${year}-${sequentialNum}`;

    const newBill: Bill = {
      id: `bill-${Date.now()}`,
      bill_number: billNumber,
      store_id: storeId,
      cashier_id: cashierId,
      customer_name: customerName || undefined,
      customer_mobile: customerMobile || undefined,
      subtotal: totals.subtotal,
      cgst: totals.cgst,
      sgst: totals.sgst,
      total: totals.total,
      payment_method: paymentMethod,
      order_type: orderType,
      created_at: new Date().toISOString()
    };

    // Insert Bill
    const { error: billErr } = await supabase!.from('bills').insert(newBill);
    if (billErr) throw new Error(billErr.message);

    // Prepare Items and Stock Updates
    const billItemsToInsert = [];
    for (const item of cartItems) {
      billItemsToInsert.push({
        id: `bi-${Date.now()}-${Math.random()}`,
        bill_id: newBill.id,
        product_id: item.product.id,
        product_name: item.product.name,
        quantity: item.quantity,
        unit_price: item.product.price,
        total_price: item.product.price * item.quantity
      });

      // Stock Decrement
      const { data: stk } = await supabase!.from('stock').select('quantity').eq('store_id', storeId).eq('product_id', item.product.id).single();
      if (stk) {
        const newQty = Math.max(0, stk.quantity - item.quantity);
        const newStatus = newQty === 0 ? "out_of_stock" : newQty < 10 ? "low_stock" : "in_stock";
        await supabase!.from('stock').update({ quantity: newQty, status: newStatus, updated_at: new Date().toISOString() })
          .eq('store_id', storeId).eq('product_id', item.product.id);
      }
    }

    const { error: itemsErr } = await supabase!.from('bill_items').insert(billItemsToInsert);
    if (itemsErr) throw new Error(itemsErr.message);

    if (isClient()) {
      window.dispatchEvent(new CustomEvent('lbn_realtime_bill_created', { detail: { billId: newBill.id } }));
    }

    return newBill;
  },

  deleteBill: async (billId: string): Promise<void> => {
    // Note: Due to foreign key constraints, delete items first
    await supabase!.from('bill_items').delete().eq('bill_id', billId);
    const { error } = await supabase!.from('bills').delete().eq('id', billId);
    if (error) throw new Error(error.message);
  },

  updateBill: async (billId: string, updates: Partial<Bill>): Promise<Bill> => {
    const { data, error } = await supabase!.from('bills').update(updates).eq('id', billId).select().single();
    if (error) throw new Error(error.message);
    return data as Bill;
  },

  updateBillAndItems: async (
    storeId: string,
    billId: string, 
    updates: Partial<Bill>,
    newItems: { product: Product; quantity: number }[],
    totals: { subtotal: number; cgst: number; sgst: number; total: number }
  ): Promise<Bill> => {
    // 1. Get existing items
    const { data: existingItems } = await supabase!.from('bill_items').select('*').eq('bill_id', billId);
    
    // 2. Restore all existing items stock
    if (existingItems) {
      for (const item of existingItems) {
        const { data: stk } = await supabase!.from('stock').select('quantity').eq('store_id', storeId).eq('product_id', item.product_id).single();
        if (stk) {
          await supabase!.from('stock').update({ quantity: stk.quantity + item.quantity }).eq('store_id', storeId).eq('product_id', item.product_id);
        }
      }
    }

    // 3. Delete existing items
    await supabase!.from('bill_items').delete().eq('bill_id', billId);

    // 4. Subtract new items stock and prepare inserts
    const billItemsToInsert = [];
    for (const item of newItems) {
      billItemsToInsert.push({
        id: `bi-${Date.now()}-${Math.random()}`,
        bill_id: billId,
        product_id: item.product.id,
        product_name: item.product.name,
        quantity: item.quantity,
        unit_price: item.product.price,
        total_price: item.product.price * item.quantity
      });

      const { data: stk } = await supabase!.from('stock').select('quantity').eq('store_id', storeId).eq('product_id', item.product.id).single();
      if (stk) {
        const newQty = Math.max(0, stk.quantity - item.quantity);
        const newStatus = newQty === 0 ? "out_of_stock" : newQty < 10 ? "low_stock" : "in_stock";
        await supabase!.from('stock').update({ quantity: newQty, status: newStatus, updated_at: new Date().toISOString() })
          .eq('store_id', storeId).eq('product_id', item.product.id);
      }
    }

    if (billItemsToInsert.length > 0) {
      await supabase!.from('bill_items').insert(billItemsToInsert);
    }

    // 5. Update bill
    const billUpdates = {
      ...updates,
      subtotal: totals.subtotal,
      cgst: totals.cgst,
      sgst: totals.sgst,
      total: totals.total
    };
    
    const { data, error } = await supabase!.from('bills').update(billUpdates).eq('id', billId).select().single();
    if (error) throw new Error(error.message);
    
    return data as Bill;
  },

  getCustomerDirectory: async (storeId?: string): Promise<{name: string, mobile: string, visits: number, spent: number}[]> => {
    let query = supabase!.from('bills').select('customer_mobile, customer_name, total');
    if (storeId) {
      query = query.eq('store_id', storeId);
    }
    const { data: bills, error } = await query;
    if (error) throw new Error(error.message);
    
    const directoryMap: Record<string, {name: string, mobile: string, visits: number, spent: number}> = {};
    
    bills.forEach(b => {
      if (b.customer_mobile && b.customer_mobile.trim()) {
        const key = b.customer_mobile.trim();
        const name = b.customer_name || 'Guest Customer';
        
        if (!directoryMap[key]) {
          directoryMap[key] = {
            name,
            mobile: key,
            visits: 0,
            spent: 0
          };
        }
        directoryMap[key].visits += 1;
        directoryMap[key].spent += Number(b.total);
        
        if (b.customer_name && directoryMap[key].name === 'Guest Customer') {
          directoryMap[key].name = b.customer_name;
        }
      }
    });
    
    return Object.values(directoryMap).sort((a, b) => b.spent - a.spent);
  },

  // ---------------------------------------------------------
  // GLOBAL ADMIN REPORTS
  // ---------------------------------------------------------
  getGlobalAdminReports: async () => {
    const { data: bills, error: bErr } = await supabase!.from('bills').select('total, cgst, sgst, store_id');
    const { data: stores, error: sErr } = await supabase!.from('stores').select('id, name');
    
    if (bErr) throw new Error(bErr.message);
    if (sErr) throw new Error(sErr.message);

    let totalRevenue = 0;
    let totalOrders = bills.length;
    let totalGst = 0;
    
    const storeBreakdownMap: Record<string, { name: string; revenue: number; orders: number; gst: number }> = {};
    stores.forEach(s => {
      storeBreakdownMap[s.id] = { name: s.name, revenue: 0, orders: 0, gst: 0 };
    });

    bills.forEach(b => {
      const tot = Number(b.total);
      const gst = Number(b.cgst) + Number(b.sgst);
      totalRevenue += tot;
      totalGst += gst;
      if (storeBreakdownMap[b.store_id]) {
        storeBreakdownMap[b.store_id].revenue += tot;
        storeBreakdownMap[b.store_id].orders += 1;
        storeBreakdownMap[b.store_id].gst += gst;
      }
    });

    return {
      totalRevenue,
      totalOrders,
      totalGst,
      storeWiseRevenue: Object.values(storeBreakdownMap)
    };
  },

  // ---------------------------------------------------------
  // ADMIN CREDENTIALS & AUTH
  // ---------------------------------------------------------
  getAdminEmailAsync: async (): Promise<string> => {
    const { data } = await supabase!.from('system_settings').select('value').eq('key', 'admin_email').maybeSingle();
    return data ? data.value : 'admin@laban.com';
  },

  getAdminPasswordAsync: async (): Promise<string> => {
    const { data } = await supabase!.from('system_settings').select('value').eq('key', 'admin_password').maybeSingle();
    return data ? data.value : 'admin123';
  },

  changeAdminPassword: async (currentPassword: string, newPassword: string): Promise<boolean> => {
    const storedPassword = await supabaseAPI.getAdminPasswordAsync();
    if (currentPassword !== storedPassword) {
      throw new Error('Current password is incorrect.');
    }
    if (newPassword.length < 6) {
      throw new Error('Password must be at least 6 characters.');
    }
    
    const { error } = await supabase!.from('system_settings').upsert({ key: 'admin_password', value: newPassword });
    if (error) throw new Error(error.message);
    return true;
  },

  changeAdminEmail: async (currentPassword: string, newEmail: string): Promise<boolean> => {
    const storedPassword = await supabaseAPI.getAdminPasswordAsync();
    if (currentPassword !== storedPassword) {
      throw new Error('Password verification failed.');
    }
    if (!newEmail || !newEmail.includes('@')) {
      throw new Error('Please enter a valid email address.');
    }
    
    const { error } = await supabase!.from('system_settings').upsert({ key: 'admin_email', value: newEmail });
    if (error) throw new Error(error.message);
    
    // Also update admin user record
    await supabase!.from('users').update({ email: newEmail }).eq('role', 'admin');
    
    return true;
  },

  changeStorePassword: async (storeId: string, currentPassword: string, newPassword: string): Promise<boolean> => {
    const { data: store } = await supabase!.from('stores').select('owner_password').eq('id', storeId).single();
    if (!store || currentPassword !== store.owner_password) {
      throw new Error('Current password is incorrect.');
    }
    const { error } = await supabase!.from('stores').update({ owner_password: newPassword }).eq('id', storeId);
    if (error) throw new Error(error.message);
    return true;
  },

  // Kept for synchronous signatures needed by some components before they fetch asynchronously, 
  // but they will fetch live soon. (Settings page relies on getAdminEmail returning a string sync).
  // Ideally, components should be updated to use async, but to avoid breaking existing UI:
  getAdminPassword: (): string => 'admin123',
  getAdminEmail: (): string => 'admin@laban.com',

  verifyCredentials: async (email: string, password: string): Promise<User | null> => {
    // 1. Check admin
    const adminEmail = await supabaseAPI.getAdminEmailAsync();
    const adminPassword = await supabaseAPI.getAdminPasswordAsync();
    
    if (email.toLowerCase() === adminEmail.toLowerCase()) {
      if (password !== adminPassword) {
        throw new Error('Incorrect password.');
      }
      const { data, error } = await supabase!.from('users').select('*').eq('role', 'admin').maybeSingle();
      if (error) throw new Error(error.message);
      return data as User | null;
    }

    // 2. Check store
    const { data: store, error: storeErr } = await supabase!.from('stores').select('*').ilike('owner_email', email).maybeSingle();
    if (storeErr) throw new Error(storeErr.message);
    if (store) {
      if (password !== store.owner_password) {
        throw new Error('Incorrect password.');
      }
      
      const { data: storeUser } = await supabase!.from('users').select('*').ilike('email', email).maybeSingle();
      if (storeUser) {
        return storeUser as User;
      } else {
        // Auto-create store user if missing
        const newUser = {
          id: `usr-d-${store.id}`,
          name: `${store.name} (Store Account)`,
          email: store.owner_email,
          role: 'store',
          store_id: store.id,
          created_at: new Date().toISOString()
        };
        const { data: created } = await supabase!.from('users').insert(newUser).select().single();
        return created as User;
      }
    }

    return null;
  }
};
