'use client';

import { useState, useEffect, useTransition } from 'react';
import { api, Product, Stock } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { useCartStore } from '@/store/useCartStore';
import CategoryTabs from '@/components/pos/CategoryTabs';
import ProductCard from '@/components/pos/ProductCard';
import CartPanel from '@/components/pos/CartPanel';
import { Search, Sparkles, Receipt, CheckCircle, ShoppingBag, AlertCircle } from 'lucide-react';

export default function POSPage() {
  const { store, user } = useAuthStore();
  const { addItem, cartItems, getTotals } = useCartStore();
  
  const [products, setProducts] = useState<Product[]>([]);
  const [stockList, setStockList] = useState<Stock[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [successBillNo, setSuccessBillNo] = useState<string | null>(null);
  const [activeMobileTab, setActiveMobileTab] = useState<'menu' | 'cart'>('menu');

  const [catalogStockWarning, setCatalogStockWarning] = useState<string | null>(null);
  const [categories, setCategories] = useState<string[]>(['ALL']);

  // Calculate cart stats for responsive pill & tabs
  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const grandTotal = getTotals().total;

  const loadCatalog = async () => {
    if (!store) return;
    try {
      const prodData = await api.getProducts();
      setProducts(prodData);
      
      const stockData = await api.getStockByStore(store.id);
      setStockList(stockData);

      const catData = await api.getCategories();
      setCategories(['ALL', ...catData.map(c => c.name)]);
    } catch (err) {
      console.error("Failed to load catalog data", err);
    }
  };

  // Load products & stock levels on mount
  useEffect(() => {
    loadCatalog();
  }, [store]);

  // Subscribe to simulated real-time stock update events
  useEffect(() => {
    if (!store) return;
    
    const handleRealtimeStock = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail.storeId === store.id) {
        setStockList(current => 
          current.map(s => 
            s.product_id === detail.productId
              ? { ...s, quantity: detail.quantity, status: detail.status }
              : s
          )
        );
      }
    };

    window.addEventListener('lbn_realtime_stock', handleRealtimeStock);
    return () => window.removeEventListener('lbn_realtime_stock', handleRealtimeStock);
  }, [store]);

  const filteredProducts = products.filter(prod => {
    const matchesCategory = activeCategory === 'ALL' || (prod.category || '').toLowerCase() === activeCategory.toLowerCase();
    const matchesSearch = (prod.name || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const getStockStatus = (productId: string) => {
    const entry = stockList.find(s => s.product_id === productId);
    return entry ? entry.status : 'in_stock';
  };

  const handleAddItemWithStockCheck = (product: Product) => {
    const status = getStockStatus(product.id);
    
    // Also check if we already have all available quantity in cart
    const stockEntry = stockList.find(s => s.product_id === product.id);
    const existingCartItem = cartItems.find(item => item.product.id === product.id);
    const currentCartQty = existingCartItem ? existingCartItem.quantity : 0;
    
    const isOut = status === 'out_of_stock' || (stockEntry && stockEntry.quantity <= currentCartQty);
    
    if (isOut) {
      setCatalogStockWarning(product.name);
      setTimeout(() => setCatalogStockWarning(null), 2500);
      return;
    }
    addItem(product);
  };

  const handleCheckoutSuccess = (billNo: string) => {
    setSuccessBillNo(billNo);
    setTimeout(() => setSuccessBillNo(null), 4000); // Auto hide after 4s
    // Auto switch back to catalog menu on mobile after successful checkout
    setActiveMobileTab('menu');
    // Reload catalog stock levels
    loadCatalog();
  };

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-130px)] gap-6 select-none overflow-hidden animate-fade-in relative pb-16 lg:pb-0">
      
      {/* Mobile Tab Switcher */}
      <div className="flex lg:hidden rounded-2xl bg-gray-100 p-1 mb-2 select-none shrink-0">
        <button
          onClick={() => setActiveMobileTab('menu')}
          className={`flex-1 flex items-center justify-center space-x-2 py-3 rounded-xl text-xs font-bold transition-all ${
            activeMobileTab === 'menu'
              ? 'bg-primary text-white shadow-md'
              : 'text-text-muted hover:text-text-primary'
          }`}
        >
          <span>🍮 Dessert Menu</span>
        </button>
        <button
          onClick={() => setActiveMobileTab('cart')}
          className={`flex-1 flex items-center justify-center space-x-2 py-3 rounded-xl text-xs font-bold transition-all relative ${
            activeMobileTab === 'cart'
              ? 'bg-primary text-white shadow-md'
              : 'text-text-muted hover:text-text-primary'
          }`}
        >
          <span>🛒 Active Cart</span>
          {totalItems > 0 && (
            <span className={`inline-flex items-center justify-center px-2 py-0.5 text-[9px] font-black rounded-full leading-none ml-1 transition-all duration-300 ${
              activeMobileTab === 'cart' ? 'bg-white text-primary' : 'bg-primary text-white'
            }`}>
              {totalItems}
            </span>
          )}
        </button>
      </div>

      {/* LEFT PANEL: PRODUCT CATALOG */}
      <div className={`flex-[1.6] flex-col h-full overflow-hidden relative ${
        activeMobileTab === 'menu' ? 'flex' : 'hidden lg:flex'
      }`}>
        
        {/* Dynamic Out of Stock Warning Toast */}
        {catalogStockWarning && (
          <div className="absolute inset-x-0 top-0 z-50 bg-red-500 text-white rounded-2xl p-4 shadow-lg border border-red-400/20 flex items-center space-x-3 select-none animate-slide-down">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white">
              <AlertCircle className="h-5 w-5 stroke-[2.5px]" />
            </div>
            <div>
              <div className="text-xs font-black">Out of Stock!</div>
              <div className="text-[10px] opacity-90 mt-0.5">{catalogStockWarning} is out of stock.</div>
            </div>
          </div>
        )}
        
        {/* TOP CONTROLS: SEARCH & CATEGORIES */}
        <div className="mb-4 space-y-3 select-none shrink-0">
          
          {/* Real-time Search input */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-text-muted/70" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search desserts, drinks, or toppings..."
              className="w-full rounded-2xl border border-gray-100 bg-white py-3.5 pl-12 pr-4 text-xs font-semibold outline-none shadow-sm transition-all focus:border-primary focus:ring-4 focus:ring-primary/5"
            />
          </div>

          {/* Category Tabs */}
          <CategoryTabs
            categories={categories}
            activeCategory={activeCategory}
            onSelectCategory={setActiveCategory}
          />

        </div>

        {/* SCROLLABLE PRODUCT GRID */}
        <div className="flex-1 overflow-y-auto pr-1 pb-6">
          {filteredProducts.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center rounded-3xl bg-white border border-gray-100 text-center p-6 shadow-sm">
              <Sparkles className="h-10 w-10 text-primary-light animate-pulse mb-3" />
              <p className="text-sm font-bold text-text-primary">No Products Found</p>
              <p className="text-xs text-text-muted mt-1">Try tweaking your search terms or choosing another category.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  stockStatus={getStockStatus(product.id)}
                  onAdd={() => handleAddItemWithStockCheck(product)}
                />
              ))}
            </div>
          )}
        </div>

      </div>

      {/* RIGHT PANEL: BILL & CART DECK */}
      <div className={`flex-[1] h-full overflow-hidden relative ${
        activeMobileTab === 'cart' ? 'block' : 'hidden lg:block'
      }`}>
        
        {/* Dynamic Success Alert Banner */}
        {successBillNo && (
          <div className="absolute inset-x-0 -top-1 z-30 bg-emerald-500 text-white rounded-2xl p-4 shadow-lg border border-emerald-400/20 flex items-center space-x-3 select-none animate-slide-down">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white">
              <CheckCircle className="h-6 w-6 stroke-[2.5px]" />
            </div>
            <div>
              <div className="text-xs font-black">Transaction Success!</div>
              <div className="font-mono text-[9px] opacity-90 mt-0.5">Invoice: {successBillNo} registered</div>
            </div>
          </div>
        )}

        <CartPanel onSuccess={handleCheckoutSuccess} stockList={stockList} />
      </div>

      {/* Floating Checkout Action Pill for Mobile */}
      {activeMobileTab === 'menu' && totalItems > 0 && (
        <div className="fixed bottom-6 inset-x-4 z-30 lg:hidden flex justify-center animate-slide-up">
          <button
            onClick={() => setActiveMobileTab('cart')}
            className="flex items-center justify-between w-full max-w-md bg-primary hover:bg-primary-dark text-white px-5 py-4 rounded-2xl shadow-xl shadow-primary/20 transition-all active:scale-[0.98] border border-white/10"
          >
            <div className="flex items-center space-x-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/20 text-white">
                <ShoppingBag className="h-4.5 w-4.5" />
              </div>
              <div className="text-left">
                <p className="text-[10px] font-semibold opacity-90 leading-none">Checkout Cart</p>
                <p className="text-xs font-black mt-0.5">{totalItems} Item{totalItems > 1 ? 's' : ''} added</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <span className="font-mono text-sm font-bold">₹{grandTotal.toFixed(2)}</span>
              <span className="text-[10px] font-bold bg-white/20 px-2 py-1 rounded-lg">View Cart &rarr;</span>
            </div>
          </button>
        </div>
      )}

    </div>
  );
}
