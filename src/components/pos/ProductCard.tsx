'use client';

import { Product } from '@/lib/db';
import { Plus, Check, AlertCircle } from 'lucide-react';
import { useState } from 'react';

interface ProductCardProps {
  product: Product;
  stockStatus: 'in_stock' | 'low_stock' | 'out_of_stock';
  onAdd: () => void;
}

// Capitalize product names nicely
const formatProductName = (name: string) => {
  if (!name) return '';
  return name
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

// Map categories to tailored, premium style configurations
const getCategoryStyles = (category: string) => {
  const cat = (category || '').toUpperCase();
  if (cat.includes('SWEET')) {
    return {
      bgGradient: 'from-rose-500/10 to-pink-500/5',
      badgeBg: 'bg-rose-100 text-rose-700 border border-rose-200/40',
      accentColor: 'text-rose-600',
      borderColor: 'hover:border-rose-300 hover:shadow-rose-500/5',
      textAccent: 'text-rose-700',
      btnBg: 'bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white shadow-md shadow-rose-500/10 hover:shadow-rose-500/20',
      btnAddedBg: 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20',
      priceText: 'text-rose-700',
    };
  }
  if (cat.includes('LABAN')) {
    return {
      bgGradient: 'from-sky-500/10 to-blue-500/5',
      badgeBg: 'bg-sky-100 text-sky-700 border border-sky-200/40',
      accentColor: 'text-sky-600',
      borderColor: 'hover:border-sky-300 hover:shadow-sky-500/5',
      textAccent: 'text-sky-700',
      btnBg: 'bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-600 hover:to-sky-700 text-white shadow-md shadow-sky-500/10 hover:shadow-sky-500/20',
      btnAddedBg: 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20',
      priceText: 'text-sky-700',
    };
  }
  if (cat.includes('DRINK') || cat.includes('BEVERAGE')) {
    return {
      bgGradient: 'from-emerald-500/10 to-teal-500/5',
      badgeBg: 'bg-emerald-100 text-emerald-700 border border-emerald-200/40',
      accentColor: 'text-emerald-600',
      borderColor: 'hover:border-emerald-300 hover:shadow-emerald-550/5',
      textAccent: 'text-emerald-700',
      btnBg: 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-md shadow-emerald-500/10 hover:shadow-emerald-500/20',
      btnAddedBg: 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20',
      priceText: 'text-emerald-700',
    };
  }
  if (cat.includes('SALANKATIA')) {
    return {
      bgGradient: 'from-amber-500/10 to-orange-500/5',
      badgeBg: 'bg-amber-100 text-amber-800 border border-amber-200/40',
      accentColor: 'text-amber-700',
      borderColor: 'hover:border-amber-300 hover:shadow-amber-500/5',
      textAccent: 'text-amber-800',
      btnBg: 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white shadow-md shadow-amber-500/10 hover:shadow-amber-500/20',
      btnAddedBg: 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20',
      priceText: 'text-amber-800',
    };
  }
  if (cat.includes('ADD-ON') || cat.includes('EXTRA')) {
    return {
      bgGradient: 'from-purple-500/10 to-indigo-500/5',
      badgeBg: 'bg-purple-100 text-purple-700 border border-purple-200/40',
      accentColor: 'text-purple-600',
      borderColor: 'hover:border-purple-300 hover:shadow-purple-500/5',
      textAccent: 'text-purple-700',
      btnBg: 'bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white shadow-md shadow-purple-500/10 hover:shadow-purple-500/20',
      btnAddedBg: 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20',
      priceText: 'text-purple-700',
    };
  }
  // Default: Brand Blue Theme
  return {
    bgGradient: 'from-sky-500/10 to-blue-500/5',
    badgeBg: 'bg-sky-100 text-sky-700 border border-sky-200/40',
    accentColor: 'text-sky-600',
    borderColor: 'hover:border-sky-300 hover:shadow-sky-500/5',
    textAccent: 'text-sky-700',
    btnBg: 'bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-600 hover:to-sky-700 text-white shadow-md shadow-sky-500/10 hover:shadow-sky-500/20',
    btnAddedBg: 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20',
    priceText: 'text-sky-700',
  };
};

export default function ProductCard({
  product,
  stockStatus,
  onAdd
}: ProductCardProps) {
  const isOutOfStock = stockStatus === 'out_of_stock';
  const isLowStock = stockStatus === 'low_stock';
  const [isAdded, setIsAdded] = useState(false);

  const handleAdd = () => {
    onAdd();
    if (!isOutOfStock) {
      setIsAdded(true);
      setTimeout(() => setIsAdded(false), 800);
    }
  };

  const styles = getCategoryStyles(product.category);

  return (
    <div 
      className={`group relative flex flex-col justify-between overflow-hidden rounded-2xl bg-white border border-slate-100 p-3 shadow-sm transition-all duration-300 ${
        isOutOfStock 
          ? 'opacity-65 border-red-100/50 hover:shadow-md' 
          : `hover:-translate-y-1 hover:shadow-lg ${styles.borderColor}`
      }`}
    >
      {/* Product Image / Visual Header Panel */}
      <div className={`relative h-24 sm:h-28 w-full overflow-hidden rounded-xl bg-gradient-to-br ${styles.bgGradient} mb-2.5 sm:mb-3 border border-slate-100/50`}>
        {product.image_url ? (
          <div className="absolute inset-0 w-full h-full overflow-hidden">
            <img 
              src={product.image_url} 
              alt={product.name} 
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/10" />
          </div>
        ) : (
          /* Central Logo Letter Monogram (Fallback) */
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex h-11 w-11 sm:h-14 sm:w-14 items-center justify-center rounded-2xl bg-white border border-slate-100 text-slate-800 font-display font-black text-sm sm:text-base shadow-sm group-hover:scale-105 group-hover:rotate-3 transition-all duration-300 select-none">
              <span className={styles.textAccent}>{product.name[0]?.toUpperCase()}</span>
            </div>
          </div>
        )}

        {/* Badges Overlay (Always on top) */}
        <div className="absolute inset-x-2 top-2 z-10 flex items-center justify-between pointer-events-none">
          {/* Low Stock Badge */}
          {isLowStock && !isOutOfStock ? (
            <span className="rounded bg-amber-500 px-1.5 py-0.5 text-[7px] sm:text-[8px] font-black uppercase tracking-wider text-white shadow-sm shadow-amber-500/20">
              Low Stock
            </span>
          ) : (
            <div />
          )}

          {/* Category Badge */}
          <span className={`rounded px-1.5 sm:px-2 py-0.5 text-[7px] sm:text-[8px] font-black uppercase tracking-wider select-none ${
            product.image_url 
              ? 'bg-black/60 text-white backdrop-blur-[2px]' 
              : styles.badgeBg
          }`}>
            {product.category}
          </span>
        </div>

        {/* Out of Stock Banner Overlay */}
        {isOutOfStock && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/45 backdrop-blur-[1px]">
            <span className="rounded-full bg-red-500 px-2.5 py-0.5 sm:px-3 sm:py-1 text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-white shadow-lg shadow-red-500/20">
              Out of Stock
            </span>
          </div>
        )}
      </div>

      {/* Product Info Block */}
      <div className="flex-1 px-0.5 flex flex-col justify-between">
        <div>
          <h4 className="font-display text-[11px] sm:text-xs font-black text-text-primary group-hover:text-primary transition-colors line-clamp-1">
            {formatProductName(product.name)}
          </h4>
          <p className="text-[9px] sm:text-[10px] font-semibold text-text-muted mt-1 leading-tight sm:leading-normal line-clamp-2 h-6 sm:h-8 overflow-hidden">
            {product.description || "Freshly made Zee Laban premium dessert."}
          </p>
        </div>

        {/* Price and GST details styled as invoice line */}
        <div className="mt-2.5 flex items-center justify-between pt-2 border-t border-dashed border-slate-100">
          <span className={`font-display text-xs sm:text-sm font-black ${styles.priceText}`}>
            ₹{product.price.toFixed(2)}
          </span>
          <span className="text-[8px] sm:text-[9px] font-bold text-slate-400 bg-slate-50 border border-slate-100 rounded px-1.5 py-0.5">
            GST {product.gst_rate}% {product.gst_inclusive ? 'Incl' : 'Excl'}
          </span>
        </div>
      </div>

      {/* Button Checkout Trigger */}
      <div className="mt-3">
        {isOutOfStock ? (
          <button
            onClick={handleAdd}
            disabled
            className="flex w-full items-center justify-center space-x-1 rounded-xl py-1.5 sm:py-2 text-[10px] sm:text-xs font-bold transition-all bg-slate-50 text-slate-400 border border-slate-200 cursor-not-allowed shadow-none"
          >
            <AlertCircle className="h-3.5 w-3.5" />
            <span>Out of Stock</span>
          </button>
        ) : (
          <button
            onClick={handleAdd}
            className={`flex w-full items-center justify-center space-x-1.5 rounded-xl py-1.5 sm:py-2 text-[10px] sm:text-xs font-black transition-all active:scale-[0.96] cursor-pointer shadow-md ${
              isAdded 
                ? `${styles.btnAddedBg} scale-[1.02] animate-scale-in` 
                : styles.btnBg
            }`}
          >
            {isAdded ? (
              <>
                <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4 stroke-[3.5px] animate-scale-in" />
                <span>Added!</span>
              </>
            ) : (
              <>
                <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4 stroke-[3.5px] transition-transform duration-350 group-hover:rotate-90" />
                <span>Add to Bill</span>
              </>
            )}
          </button>
        )}
      </div>

    </div>
  );
}

