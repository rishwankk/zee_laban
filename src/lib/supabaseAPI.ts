import { supabase } from './supabase';
import {
  Store,
  User,
  Category,
  Product,
  Staff,
  StaffAttendance,
  ShopExpense,
  StaffAdvance,
  ShiftLog,
  Stock,
  StockLog,
  CategoryStock,
  CategoryStockLog,
  Bill,
  BillItem,
  AdminInventoryItem,
  AdminInventoryLog
} from './db';

const isClient = () => typeof window !== 'undefined';

export const supabaseAPI = {
  // ---------------------------------------------------------
  // STORES
  // ---------------------------------------------------------
  getStores: async (): Promise<Store[]> => {
    const { data, error } = await supabase!.from('stores').select('*').order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    const stores = data as Store[];

    // Load GST numbers from system_settings and merge into store objects
    const { data: gstSettings } = await supabase!.from('system_settings').select('key, value').like('key', 'gst_number_%');
    if (gstSettings) {
      stores.forEach(s => {
        const match = gstSettings.find(g => g.key === `gst_number_${s.id}`);
        if (match) s.gst_number = match.value;
      });
    }
    return stores;
  },

  addStore: async (store: Omit<Store, 'id' | 'is_active' | 'created_at'>): Promise<Store> => {
    const { gst_number, ...dbFields } = store as any;
    const storeId = `str-${Date.now()}`;
    const { data, error } = await supabase!.from('stores').insert({
      id: storeId,
      ...dbFields,
      is_active: true,
      created_at: new Date().toISOString()
    }).select().single();
    if (error) throw new Error(error.message);

    // Save GST number separately in system_settings
    if (gst_number) {
      await supabase!.from('system_settings').upsert({ key: `gst_number_${storeId}`, value: gst_number });
    }

    // Initialize stock entries for all active products for the new store
    const { data: products } = await supabase!.from('products').select('id').eq('is_active', true);
    if (products && products.length > 0) {
      const stockEntries = products.map((p: any) => ({
        id: `stk-${storeId}-${p.id}`,
        store_id: storeId,
        product_id: p.id,
        quantity: 0,
        status: "out_of_stock",
        updated_at: new Date().toISOString()
      }));
      await supabase!.from('stock').insert(stockEntries);
    }

    const result = data as Store;
    result.gst_number = gst_number || undefined;
    return result;
  },

  updateStore: async (id: string, updates: Partial<Store>): Promise<Store> => {
    const { gst_number, ...dbFields } = updates as any;

    // Update store fields (without gst_number)
    const { data, error } = await supabase!.from('stores').update(dbFields).eq('id', id).select().single();
    if (error) throw new Error(error.message);

    // Save or clear GST number in system_settings
    if (gst_number !== undefined) {
      if (gst_number) {
        await supabase!.from('system_settings').upsert({ key: `gst_number_${id}`, value: gst_number });
      } else {
        await supabase!.from('system_settings').delete().eq('key', `gst_number_${id}`);
      }
    }
    const result = data as Store;
    result.gst_number = gst_number || undefined;
    return result;
  },

  toggleStoreStatus: async (id: string, is_active: boolean): Promise<void> => {
    const { error } = await supabase!.from('stores').update({ is_active }).eq('id', id);
    if (error) throw new Error(error.message);
  },

  deleteStore: async (id: string): Promise<void> => {
    // 1. Delete bills and bill items
    const { data: bills } = await supabase!.from('bills').select('id').eq('store_id', id);
    if (bills && bills.length > 0) {
      const billIds = bills.map(b => b.id);
      // Delete in chunks if there are too many? Supabase supports up to 1000 in 'in' filter, but it's fine for now
      await supabase!.from('bill_items').delete().in('bill_id', billIds);
      await supabase!.from('bills').delete().eq('store_id', id);
    }
    
    // 2. Delete stock logs and stock
    await supabase!.from('stock_logs').delete().eq('store_id', id);
    await supabase!.from('stock').delete().eq('store_id', id);

    // 3. Delete shift logs & staff
    await supabase!.from('shift_logs').delete().eq('store_id', id);
    await supabase!.from('staff').delete().eq('store_id', id);

    // 4. Delete users assigned to this store
    await supabase!.from('users').delete().eq('store_id', id);

    // 5. Delete admin inventory logs related to this store
    await supabase!.from('admin_inventory_logs').delete().eq('store_id', id);

    // 6. Finally delete the store
    const { error } = await supabase!.from('stores').delete().eq('id', id);
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
      const stockEntries = stores.map((store: any) => ({
        id: `stk-${store.id}-${newProduct.id}`,
        store_id: store.id,
        product_id: newProduct.id,
        quantity: 0,
        status: "out_of_stock",
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
    // 1. Mark the product as inactive in the master catalog
    const { error } = await supabase!.from('products').update({ is_active: false }).eq('id', id);
    if (error) throw new Error(error.message);

    // 2. Delete the stock records for this product across all stores
    // This fully removes it from the store level (stock control)
    await supabase!.from('stock').delete().eq('product_id', id);
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

    // Fallback if joined product is an array instead of single object, and filter out inactive products
    return (data as any[])
      .map(s => ({
        ...s,
        product: Array.isArray(s.product) ? s.product[0] : s.product
      }))
      .filter(s => s.product && s.product.is_active !== false);
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
  // CATEGORY STOCK
  // ---------------------------------------------------------
  getCategoryStockByStore: async (storeId: string): Promise<CategoryStock[]> => {
    // 1. Get all categories and active products
    const { data: categoriesData } = await supabase!.from('categories').select('*').order('name');
    const { data: productsData } = await supabase!.from('products').select('*').eq('is_active', true);
    const { data: stockData } = await supabase!.from('stock').select('*').eq('store_id', storeId);

    const categories: Category[] = categoriesData || [];
    const products: Product[] = productsData || [];
    const stocks: Stock[] = stockData || [];

    // 2. Fetch category stock settings from system_settings
    const { data: catStockSetting } = await supabase!
      .from('system_settings')
      .select('value')
      .eq('key', `cat_stock_${storeId}`)
      .single();

    let catStockMap: Record<string, { quantity: number; status: CategoryStock['status']; updated_at?: string; updated_by?: string }> = {};
    if (catStockSetting && catStockSetting.value) {
      try {
        catStockMap = JSON.parse(catStockSetting.value);
      } catch (e) {
        catStockMap = {};
      }
    }

    // 3. Build comprehensive list of distinct category names
    const categoryNameSet = new Map<string, string>(); // normalizedKey -> displayName
    categories.forEach(c => {
      if (c.name) {
        const key = c.name.trim().toLowerCase();
        if (!categoryNameSet.has(key)) categoryNameSet.set(key, c.name.trim());
      }
    });
    products.forEach(p => {
      if (p.category) {
        const key = p.category.trim().toLowerCase();
        if (!categoryNameSet.has(key)) categoryNameSet.set(key, p.category.trim());
      }
    });

    const result: CategoryStock[] = [];

    categoryNameSet.forEach((displayName, normKey) => {
      const matchingProducts = products.filter(p => (p.category || '').trim().toLowerCase() === normKey);

      let entry = catStockMap[normKey];
      let quantity = 0;
      let status: CategoryStock['status'] = 'out_of_stock';
      let updatedAt = undefined;
      let updatedBy = undefined;

      if (entry !== undefined && entry.quantity !== undefined) {
        quantity = Number(entry.quantity) || 0;
        status = entry.status || (quantity === 0 ? 'out_of_stock' : quantity < 10 ? 'low_stock' : 'in_stock');
        updatedAt = entry.updated_at;
        updatedBy = entry.updated_by;
      } else {
        // Fallback: check if existing products in stock table have a balance
        const matchingProductIds = new Set(matchingProducts.map(p => p.id));
        const matchingStocks = stocks.filter(s => matchingProductIds.has(s.product_id));
        if (matchingStocks.length > 0) {
          const maxQty = Math.max(...matchingStocks.map(s => Number(s.quantity) || 0));
          quantity = maxQty;
          status = quantity === 0 ? 'out_of_stock' : quantity < 10 ? 'low_stock' : 'in_stock';
        }
      }

      result.push({
        store_id: storeId,
        category: displayName,
        quantity,
        status,
        product_count: matchingProducts.length,
        products: matchingProducts,
        updated_at: updatedAt,
        updated_by: updatedBy
      });
    });

    return result.sort((a, b) => a.category.localeCompare(b.category));
  },

  updateCategoryStockQuantity: async (
    storeId: string,
    categoryName: string,
    newQuantity: number,
    newStatus: CategoryStock['status'],
    updatedByUserId: string,
    updatedByName: string
  ): Promise<CategoryStock> => {
    const normKey = categoryName.trim().toLowerCase();

    // 1. Fetch current settings map
    const { data: catStockSetting } = await supabase!
      .from('system_settings')
      .select('value')
      .eq('key', `cat_stock_${storeId}`)
      .single();

    let catStockMap: Record<string, any> = {};
    if (catStockSetting && catStockSetting.value) {
      try {
        catStockMap = JSON.parse(catStockSetting.value);
      } catch (e) {
        catStockMap = {};
      }
    }

    const oldEntry = catStockMap[normKey] || { quantity: 0, status: 'out_of_stock' };
    const nowIso = new Date().toISOString();

    catStockMap[normKey] = {
      category: categoryName,
      quantity: newQuantity,
      status: newStatus,
      updated_at: nowIso,
      updated_by: updatedByName
    };

    // Save map to system_settings
    await supabase!.from('system_settings').upsert({
      key: `cat_stock_${storeId}`,
      value: JSON.stringify(catStockMap)
    });

    // 2. Fetch and append to category logs
    const { data: catLogsSetting } = await supabase!
      .from('system_settings')
      .select('value')
      .eq('key', `cat_logs_${storeId}`)
      .single();

    let logs: CategoryStockLog[] = [];
    if (catLogsSetting && catLogsSetting.value) {
      try {
        logs = JSON.parse(catLogsSetting.value);
      } catch (e) {
        logs = [];
      }
    }

    const newLog: CategoryStockLog = {
      id: `clog-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      store_id: storeId,
      category: categoryName,
      old_status: oldEntry.status || null,
      new_status: newStatus,
      old_quantity: oldEntry.quantity !== undefined ? oldEntry.quantity : null,
      new_quantity: newQuantity,
      updated_by: updatedByName,
      updated_at: nowIso
    };

    logs.unshift(newLog);
    if (logs.length > 100) logs = logs.slice(0, 100);

    await supabase!.from('system_settings').upsert({
      key: `cat_logs_${storeId}`,
      value: JSON.stringify(logs)
    });

    // 3. Sync all products under this category in the stock table
    const { data: products } = await supabase!.from('products').select('id, category');
    if (products) {
      const matchingIds = products
        .filter(p => (p.category || '').trim().toLowerCase() === normKey)
        .map(p => p.id);

      for (const prodId of matchingIds) {
        await supabase!.from('stock').upsert({
          id: `stk-${storeId}-${prodId}`,
          store_id: storeId,
          product_id: prodId,
          quantity: newQuantity,
          status: newStatus,
          updated_at: nowIso,
          updated_by: updatedByUserId
        });
      }
    }

    if (isClient()) {
      window.dispatchEvent(new CustomEvent('lbn_realtime_category_stock', {
        detail: { storeId, category: categoryName, quantity: newQuantity, status: newStatus }
      }));
      window.dispatchEvent(new CustomEvent('lbn_realtime_stock', {
        detail: { storeId }
      }));
    }

    return {
      store_id: storeId,
      category: categoryName,
      quantity: newQuantity,
      status: newStatus,
      product_count: 0,
      updated_at: nowIso,
      updated_by: updatedByName
    };
  },

  getCategoryStockLogs: async (storeId: string): Promise<CategoryStockLog[]> => {
    const { data } = await supabase!
      .from('system_settings')
      .select('value')
      .eq('key', `cat_logs_${storeId}`)
      .single();

    if (data && data.value) {
      try {
        return JSON.parse(data.value);
      } catch (e) {
        return [];
      }
    }
    return [];
  },

  // ---------------------------------------------------------
  // STAFF
  // ---------------------------------------------------------
  // STAFF & ATTENDANCE
  // ---------------------------------------------------------
  getStaffByStore: async (storeId: string): Promise<Staff[]> => {
    const { data, error } = await supabase!.from('staff').select('*').eq('store_id', storeId).eq('is_active', true);
    if (error) throw new Error(error.message);
    const staffList = (data || []) as Staff[];

    // Resilient fallback for monthly salary if column is not yet migrated in Supabase
    try {
      const { data: salarySetting } = await supabase!
        .from('system_settings')
        .select('value')
        .eq('key', `staff_salaries_${storeId}`)
        .maybeSingle();

      if (salarySetting && salarySetting.value) {
        const salaryMap: Record<string, number> = JSON.parse(salarySetting.value);
        staffList.forEach(s => {
          if (s.monthly_salary === undefined || s.monthly_salary === null) {
            s.monthly_salary = salaryMap[s.id] || 0;
          }
        });
      }
    } catch (e) {
      // Ignore fallback read failure
    }

    return staffList;
  },

  addStaff: async (storeId: string, member: Omit<Staff, 'id' | 'store_id' | 'is_active' | 'created_at'>): Promise<Staff> => {
    const newId = `stf-${Date.now()}`;
    const monthlySalary = member.monthly_salary !== undefined ? Number(member.monthly_salary) : 0;

    let inserted: Staff | null = null;
    // Attempt insert with monthly_salary
    const { data, error } = await supabase!.from('staff').insert({
      ...member,
      id: newId,
      store_id: storeId,
      monthly_salary: monthlySalary,
      is_active: true,
      created_at: new Date().toISOString()
    }).select().maybeSingle();

    if (error) {
      // If column doesn't exist yet, retry without monthly_salary and store in system_settings
      const { monthly_salary: _discard, ...withoutSalary } = member;
      const { data: fallbackData, error: fbError } = await supabase!.from('staff').insert({
        ...withoutSalary,
        id: newId,
        store_id: storeId,
        is_active: true,
        created_at: new Date().toISOString()
      }).select().single();

      if (fbError) throw new Error(fbError.message);
      inserted = { ...(fallbackData as Staff), monthly_salary: monthlySalary };
    } else {
      inserted = data as Staff;
    }

    // Always mirror to system_settings for resilience
    try {
      const { data: cur } = await supabase!.from('system_settings').select('value').eq('key', `staff_salaries_${storeId}`).maybeSingle();
      const map: Record<string, number> = cur?.value ? JSON.parse(cur.value) : {};
      map[newId] = monthlySalary;
      await supabase!.from('system_settings').upsert({ key: `staff_salaries_${storeId}`, value: JSON.stringify(map) });
    } catch (e) {}

    return inserted!;
  },

  updateStaff: async (id: string, updates: Partial<Staff>): Promise<Staff> => {
    let result: Staff | null = null;
    const { data, error } = await supabase!.from('staff').update(updates).eq('id', id).select().maybeSingle();

    if (error) {
      // If error is column monthly_salary not found
      const { monthly_salary: _discard, ...safeUpdates } = updates;
      const { data: safeData, error: safeErr } = await supabase!.from('staff').update(safeUpdates).eq('id', id).select().single();
      if (safeErr) throw new Error(safeErr.message);
      result = { ...(safeData as Staff), monthly_salary: updates.monthly_salary ?? 0 };
    } else {
      result = data as Staff;
    }

    if (updates.monthly_salary !== undefined && result && result.store_id) {
      try {
        const { data: cur } = await supabase!.from('system_settings').select('value').eq('key', `staff_salaries_${result.store_id}`).maybeSingle();
        const map: Record<string, number> = cur?.value ? JSON.parse(cur.value) : {};
        map[id] = Number(updates.monthly_salary);
        await supabase!.from('system_settings').upsert({ key: `staff_salaries_${result.store_id}`, value: JSON.stringify(map) });
      } catch (e) {}
    }

    return result!;
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
    if (error || !data) return false; // default unlocked
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

  getStaffLockTime: async (storeId: string): Promise<number> => {
    const { data, error } = await supabase!
      .from('system_settings')
      .select('value')
      .eq('key', `staff_lock_time_${storeId}`)
      .maybeSingle();
    if (error || !data) return 0; // 0 means no auto-lock
    return parseInt(data.value, 10) || 0;
  },

  setStaffLockTime: async (storeId: string, minutes: number): Promise<void> => {
    const { error } = await supabase!
      .from('system_settings')
      .upsert({ key: `staff_lock_time_${storeId}`, value: minutes.toString() });
    if (error) throw new Error(error.message);
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
  getStaffPassword: async (storeId: string): Promise<string | null> => {
    const { data } = await supabase!.from('system_settings').select('value').eq('key', `staff_pw_${storeId}`).maybeSingle();
    return data ? data.value : null;
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
      .select(`*`)
      .eq('store_id', storeId)
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);

    return (data as any[]).map(b => {
      return {
        ...b,
        cashierName: "Store Desk"
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

  getDailyBillCount: async (storeId: string): Promise<number> => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const { count } = await supabase!
      .from('bills')
      .select('*', { count: 'exact', head: true })
      .eq('store_id', storeId)
      .gte('created_at', todayStart.toISOString())
      .lte('created_at', todayEnd.toISOString());

    return (count || 0);
  },

  saveBill: async (
    storeId: string,
    cashierId: string,
    customerName: string,
    customerMobile: string,
    cartItems: { product: Product; quantity: number }[],
    paymentMethod: 'Cash' | 'UPI' | 'Card',
    totals: { subtotal: number; cgst: number; sgst: number; discountAmount?: number; total: number },
    orderType: 'Dine-in' | 'Takeaway' | 'Delivery' = 'Takeaway'
  ): Promise<Bill> => {
    // 1. Generate Bill Number
    const { data: store } = await supabase!.from('stores').select('name, discount_enabled, discount_name, discount_percentage').eq('id', storeId).single();
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
      discount_name: (store?.discount_enabled && totals.discountAmount) ? store.discount_name : undefined,
      discount_percentage: (store?.discount_enabled && totals.discountAmount) ? store.discount_percentage : undefined,
      discount_amount: totals.discountAmount,
      total: totals.total,
      payment_method: paymentMethod,
      order_type: orderType,
      created_at: new Date().toISOString()
    };

    // Insert Bill
    const { error: billErr } = await supabase!.from('bills').insert(newBill);
    if (billErr) throw new Error(billErr.message);

    // Prepare Items and Category-Wise Stock Updates
    const billItemsToInsert = [];
    const catDeductions: Record<string, { categoryName: string; quantity: number }> = {};

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

      const catRaw = item.product.category || 'General';
      const normKey = catRaw.trim().toLowerCase();
      if (!catDeductions[normKey]) {
        catDeductions[normKey] = { categoryName: catRaw, quantity: 0 };
      }
      catDeductions[normKey].quantity += item.quantity;
    }

    // Fetch category stock settings from system_settings
    const { data: catStockSetting } = await supabase!
      .from('system_settings')
      .select('value')
      .eq('key', `cat_stock_${storeId}`)
      .single();

    let catStockMap: Record<string, any> = {};
    if (catStockSetting && catStockSetting.value) {
      try {
        catStockMap = JSON.parse(catStockSetting.value);
      } catch (e) {
        catStockMap = {};
      }
    }

    // Get all products to sync stock table
    const { data: allProducts } = await supabase!.from('products').select('id, category');

    // Decrement stock for each category
    for (const [normKey, ded] of Object.entries(catDeductions)) {
      let currentQty = catStockMap[normKey]?.quantity;
      if (currentQty === undefined) {
        const matchingIds = allProducts
          ? allProducts.filter(p => (p.category || '').trim().toLowerCase() === normKey).map(p => p.id)
          : [];
        if (matchingIds.length > 0) {
          const { data: stks } = await supabase!.from('stock').select('quantity').eq('store_id', storeId).in('product_id', matchingIds);
          if (stks && stks.length > 0) {
            currentQty = Math.max(...stks.map(s => Number(s.quantity) || 0));
          }
        }
        if (currentQty === undefined) currentQty = 0;
      }

      const newQty = Math.max(0, currentQty - ded.quantity);
      const newStatus = newQty === 0 ? "out_of_stock" : newQty < 10 ? "low_stock" : "in_stock";

      catStockMap[normKey] = {
        category: ded.categoryName,
        quantity: newQty,
        status: newStatus,
        updated_at: new Date().toISOString()
      };

      // Sync stock table for all products in this category
      if (allProducts) {
        const matchingIds = allProducts
          .filter(p => (p.category || '').trim().toLowerCase() === normKey)
          .map(p => p.id);

        for (const prodId of matchingIds) {
          await supabase!.from('stock').update({
            quantity: newQty,
            status: newStatus,
            updated_at: new Date().toISOString()
          }).eq('store_id', storeId).eq('product_id', prodId);
        }
      }
    }

    // Save updated category stock map
    await supabase!.from('system_settings').upsert({
      key: `cat_stock_${storeId}`,
      value: JSON.stringify(catStockMap)
    });

    const { error: itemsErr } = await supabase!.from('bill_items').insert(billItemsToInsert);
    if (itemsErr) throw new Error(itemsErr.message);

    if (isClient()) {
      window.dispatchEvent(new CustomEvent('lbn_realtime_bill_created', { detail: { billId: newBill.id } }));
      window.dispatchEvent(new CustomEvent('lbn_realtime_stock', { detail: { storeId } }));
      window.dispatchEvent(new CustomEvent('lbn_realtime_category_stock', { detail: { storeId } }));
      try {
        new BroadcastChannel('zee_laban_sync').postMessage('REFRESH_REPORTS');
      } catch (e) {}
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
    totals: { subtotal: number; cgst: number; sgst: number; discountAmount?: number; total: number }
  ): Promise<Bill> => {
    // 1. Get existing items
    const { data: existingItems } = await supabase!.from('bill_items').select('*').eq('bill_id', billId);

    // Load category stock map
    const { data: catStockSetting } = await supabase!
      .from('system_settings')
      .select('value')
      .eq('key', `cat_stock_${storeId}`)
      .single();

    let catStockMap: Record<string, any> = {};
    if (catStockSetting && catStockSetting.value) {
      try {
        catStockMap = JSON.parse(catStockSetting.value);
      } catch (e) {
        catStockMap = {};
      }
    }

    const { data: allProducts } = await supabase!.from('products').select('id, category');

    // 2. Restore all existing items category stock
    if (existingItems && allProducts) {
      const prodMap = new Map(allProducts.map(p => [p.id, p]));
      for (const item of existingItems) {
        const prod = prodMap.get(item.product_id);
        const normKey = (prod?.category || 'General').trim().toLowerCase();
        if (catStockMap[normKey]) {
          catStockMap[normKey].quantity = (catStockMap[normKey].quantity || 0) + item.quantity;
          catStockMap[normKey].status = catStockMap[normKey].quantity === 0 ? "out_of_stock" : catStockMap[normKey].quantity < 10 ? "low_stock" : "in_stock";
        }
      }
    }

    // 3. Delete existing items
    await supabase!.from('bill_items').delete().eq('bill_id', billId);

    // 4. Subtract new items category stock and prepare inserts
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

      const normKey = (item.product.category || 'General').trim().toLowerCase();
      const currentQty = catStockMap[normKey]?.quantity ?? 0;
      const newQty = Math.max(0, currentQty - item.quantity);
      const newStatus = newQty === 0 ? "out_of_stock" : newQty < 10 ? "low_stock" : "in_stock";

      catStockMap[normKey] = {
        category: item.product.category || 'General',
        quantity: newQty,
        status: newStatus,
        updated_at: new Date().toISOString()
      };
    }

    // Save updated category stock map
    await supabase!.from('system_settings').upsert({
      key: `cat_stock_${storeId}`,
      value: JSON.stringify(catStockMap)
    });

    // Sync all products in stock table
    if (allProducts) {
      for (const [normKey, data] of Object.entries(catStockMap)) {
        const matchingIds = allProducts
          .filter(p => (p.category || '').trim().toLowerCase() === normKey)
          .map(p => p.id);

        for (const prodId of matchingIds) {
          await supabase!.from('stock').update({
            quantity: data.quantity,
            status: data.status,
            updated_at: new Date().toISOString()
          }).eq('store_id', storeId).eq('product_id', prodId);
        }
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
      discount_amount: totals.discountAmount,
      total: totals.total
    };

    const { data, error } = await supabase!.from('bills').update(billUpdates).eq('id', billId).select().single();
    if (error) throw new Error(error.message);

    return data as Bill;
  },

  getCustomerDirectory: async (storeId?: string): Promise<{ name: string, mobile: string, visits: number, spent: number }[]> => {
    let query = supabase!.from('bills').select('customer_mobile, customer_name, total');
    if (storeId) {
      query = query.eq('store_id', storeId);
    }
    const { data: bills, error } = await query;
    if (error) throw new Error(error.message);

    const directoryMap: Record<string, { name: string, mobile: string, visits: number, spent: number }> = {};

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
  },

  // ---------------------------------------------------------
  // ADMIN INVENTORY (Master Supplies)
  // ---------------------------------------------------------
  getAdminInventory: async (): Promise<AdminInventoryItem[]> => {
    const { data, error } = await supabase!.from('admin_inventory_items').select('*').order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return data as AdminInventoryItem[];
  },

  addAdminInventoryItem: async (name: string, quantity: number, unit_price: number = 0): Promise<AdminInventoryItem> => {
    const { data, error } = await supabase!.from('admin_inventory_items').insert({
      id: `inv-${Date.now()}`,
      name,
      quantity,
      unit_price,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }).select().single();
    if (error) throw new Error(error.message);
    return data as AdminInventoryItem;
  },

  updateAdminInventoryItem: async (id: string, quantity: number, unit_price?: number): Promise<AdminInventoryItem> => {
    const updates: any = { quantity, updated_at: new Date().toISOString() };
    if (unit_price !== undefined) updates.unit_price = unit_price;
    const { data, error } = await supabase!.from('admin_inventory_items').update(updates).eq('id', id).select().single();
    if (error) throw new Error(error.message);
    return data as AdminInventoryItem;
  },

  deleteAdminInventoryItem: async (id: string): Promise<void> => {
    const { error } = await supabase!.from('admin_inventory_items').delete().eq('id', id);
    if (error) throw new Error(error.message);
  },

  distributeInventory: async (itemId: string, storeId: string, quantityToGive: number): Promise<void> => {
    // 1. Get current item stock
    const { data: item, error: getErr } = await supabase!.from('admin_inventory_items').select('*').eq('id', itemId).single();
    if (getErr) throw new Error('Item not found');
    
    if (item.quantity < quantityToGive) {
      throw new Error(`Not enough stock available. Current balance: ${item.quantity}`);
    }

    // 2. Deduct from master stock
    const { error: upErr } = await supabase!.from('admin_inventory_items').update({
      quantity: item.quantity - quantityToGive,
      updated_at: new Date().toISOString()
    }).eq('id', itemId);
    if (upErr) throw new Error(upErr.message);

    const totalValue = (item.unit_price || 0) * quantityToGive;

    // 3. Log the distribution
    const { error: logErr } = await supabase!.from('admin_inventory_logs').insert({
      id: `invlog-${Date.now()}`,
      item_id: itemId,
      store_id: storeId,
      quantity_given: quantityToGive,
      total_value: totalValue,
      given_at: new Date().toISOString()
    });
    if (logErr) throw new Error(logErr.message);
  },

  deleteDistributionLog: async (logId: string): Promise<void> => {
    // 1. Get the log to find out how much was given and to which item
    const { data: log, error: logErr } = await supabase!.from('admin_inventory_logs').select('*').eq('id', logId).single();
    if (logErr || !log) throw new Error('Distribution log not found');

    // 2. Get the item to find current stock
    const { data: item, error: itemErr } = await supabase!.from('admin_inventory_items').select('quantity').eq('id', log.item_id).single();
    if (itemErr) throw new Error('Original item not found');

    // 3. Add the quantity back to the master stock
    const { error: upErr } = await supabase!.from('admin_inventory_items').update({
      quantity: item.quantity + log.quantity_given,
      updated_at: new Date().toISOString()
    }).eq('id', log.item_id);
    if (upErr) throw new Error(upErr.message);

    // 4. Delete the log entry
    const { error: delErr } = await supabase!.from('admin_inventory_logs').delete().eq('id', logId);
    if (delErr) throw new Error(delErr.message);
  },

  getAdminInventoryLogs: async (): Promise<(AdminInventoryLog & { item: AdminInventoryItem, store: Store })[]> => {
    const { data, error } = await supabase!
      .from('admin_inventory_logs')
      .select(`
        *,
        item:admin_inventory_items(*),
        store:stores(*)
      `)
      .order('given_at', { ascending: false });
    
    if (error) throw new Error(error.message);

    return (data as any[]).map(log => ({
      ...log,
      item: Array.isArray(log.item) ? log.item[0] : log.item,
      store: Array.isArray(log.store) ? log.store[0] : log.store
    }));
  },

  // ---------------------------------------------------------
  // STAFF ATTENDANCE (COME / NOT COME TRACKING)
  // ---------------------------------------------------------
  getStaffAttendanceByStore: async (storeId: string, monthPrefix?: string): Promise<StaffAttendance[]> => {
    try {
      let query = supabase!.from('staff_attendance').select('*').eq('store_id', storeId);
      if (monthPrefix) {
        query = query.gte('date', `${monthPrefix}-01`).lte('date', `${monthPrefix}-31`);
      }
      const { data, error } = await query;
      if (!error && data) {
        return data as StaffAttendance[];
      }
    } catch (e) {}

    // Resilient fallback from system_settings
    try {
      const { data: setting } = await supabase!
        .from('system_settings')
        .select('value')
        .eq('key', `staff_attendance_${storeId}`)
        .maybeSingle();

      if (setting && setting.value) {
        let list: StaffAttendance[] = JSON.parse(setting.value);
        if (monthPrefix) {
          list = list.filter(a => a.date.startsWith(monthPrefix));
        }
        return list;
      }
    } catch (e) {}

    return [];
  },

  setStaffAttendance: async (
    storeId: string,
    staffId: string,
    date: string,
    status: 'present' | 'absent',
    markedBy?: string,
    notes?: string
  ): Promise<StaffAttendance> => {
    const record: StaffAttendance = {
      id: `att-${staffId}-${date}`,
      staff_id: staffId,
      store_id: storeId,
      date,
      status,
      notes: notes || undefined,
      marked_by: markedBy || undefined,
      created_at: new Date().toISOString()
    };

    // Try database table upsert
    let dbSuccess = false;
    try {
      const { error } = await supabase!
        .from('staff_attendance')
        .upsert(record, { onConflict: 'staff_id,date' });
      if (!error) dbSuccess = true;
    } catch (e) {}

    // Mirror to system_settings as resilient backup
    try {
      const { data: cur } = await supabase!
        .from('system_settings')
        .select('value')
        .eq('key', `staff_attendance_${storeId}`)
        .maybeSingle();

      let list: StaffAttendance[] = cur?.value ? JSON.parse(cur.value) : [];
      const existingIdx = list.findIndex(a => a.staff_id === staffId && a.date === date);
      if (existingIdx >= 0) {
        list[existingIdx] = record;
      } else {
        list.push(record);
      }
      await supabase!.from('system_settings').upsert({
        key: `staff_attendance_${storeId}`,
        value: JSON.stringify(list)
      });
    } catch (e) {}

    if (isClient()) {
      window.dispatchEvent(new CustomEvent('zee_staff_attendance_updated', { detail: { storeId, record } }));
    }

    return record;
  },

  setBulkStaffAttendance: async (
    storeId: string,
    date: string,
    records: { staffId: string; status: 'present' | 'absent' }[],
    markedBy?: string
  ): Promise<StaffAttendance[]> => {
    const listToSave: StaffAttendance[] = records.map(r => ({
      id: `att-${r.staffId}-${date}`,
      staff_id: r.staffId,
      store_id: storeId,
      date,
      status: r.status,
      marked_by: markedBy,
      created_at: new Date().toISOString()
    }));

    // Try DB batch upsert
    try {
      await supabase!
        .from('staff_attendance')
        .upsert(listToSave, { onConflict: 'staff_id,date' });
    } catch (e) {}

    // Mirror to system_settings
    try {
      const { data: cur } = await supabase!
        .from('system_settings')
        .select('value')
        .eq('key', `staff_attendance_${storeId}`)
        .maybeSingle();

      let existing: StaffAttendance[] = cur?.value ? JSON.parse(cur.value) : [];
      listToSave.forEach(newItem => {
        const idx = existing.findIndex(e => e.staff_id === newItem.staff_id && e.date === newItem.date);
        if (idx >= 0) {
          existing[idx] = newItem;
        } else {
          existing.push(newItem);
        }
      });

      await supabase!.from('system_settings').upsert({
        key: `staff_attendance_${storeId}`,
        value: JSON.stringify(existing)
      });
    } catch (e) {}

    if (isClient()) {
      window.dispatchEvent(new CustomEvent('zee_staff_attendance_updated', { detail: { storeId, date } }));
    }

    return listToSave;
  },

  // ---------------------------------------------------------
  // SHOP EXPENSES (DAILY EXPENSES)
  // ---------------------------------------------------------
  getExpensesByStore: async (storeId: string, date?: string): Promise<ShopExpense[]> => {
    try {
      let query = supabase!
        .from('shop_expenses')
        .select('*')
        .eq('store_id', storeId)
        .order('created_at', { ascending: false });

      if (date) {
        query = query.eq('date', date);
      }

      const { data, error } = await query;
      if (!error && data) {
        return data as ShopExpense[];
      }
    } catch (e) {}

    // Resilient fallback from system_settings
    try {
      const { data: setting } = await supabase!
        .from('system_settings')
        .select('value')
        .eq('key', `shop_expenses_${storeId}`)
        .maybeSingle();

      if (setting && setting.value) {
        let list: ShopExpense[] = JSON.parse(setting.value);
        if (date) {
          list = list.filter(e => e.date === date);
        }
        return list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      }
    } catch (e) {}

    return [];
  },

  addExpense: async (
    storeId: string,
    expense: Omit<ShopExpense, 'id' | 'store_id' | 'created_at'>
  ): Promise<ShopExpense> => {
    const newRecord: ShopExpense = {
      ...expense,
      id: `exp-${Date.now()}`,
      store_id: storeId,
      amount: Number(expense.amount) || 0,
      created_at: new Date().toISOString()
    };

    // Try inserting into DB table
    try {
      await supabase!.from('shop_expenses').insert(newRecord);
    } catch (e) {}

    // Always mirror to system_settings for resilience
    try {
      const { data: cur } = await supabase!
        .from('system_settings')
        .select('value')
        .eq('key', `shop_expenses_${storeId}`)
        .maybeSingle();

      const list: ShopExpense[] = cur?.value ? JSON.parse(cur.value) : [];
      list.unshift(newRecord);
      await supabase!.from('system_settings').upsert({
        key: `shop_expenses_${storeId}`,
        value: JSON.stringify(list)
      });
    } catch (e) {}

    if (isClient()) {
      window.dispatchEvent(new CustomEvent('zee_expenses_updated', { detail: { storeId, expense: newRecord } }));
    }

    return newRecord;
  },

  deleteExpense: async (id: string, storeId: string): Promise<void> => {
    try {
      await supabase!.from('shop_expenses').delete().eq('id', id);
    } catch (e) {}

    try {
      const { data: cur } = await supabase!
        .from('system_settings')
        .select('value')
        .eq('key', `shop_expenses_${storeId}`)
        .maybeSingle();

      if (cur?.value) {
        let list: ShopExpense[] = JSON.parse(cur.value);
        list = list.filter(e => e.id !== id);
        await supabase!.from('system_settings').upsert({
          key: `shop_expenses_${storeId}`,
          value: JSON.stringify(list)
        });
      }
    } catch (e) {}

    if (isClient()) {
      window.dispatchEvent(new CustomEvent('zee_expenses_updated', { detail: { storeId, deletedId: id } }));
    }
  }
};
