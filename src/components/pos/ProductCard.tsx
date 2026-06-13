'use client';

import { Product } from '@/lib/db';
import { Plus, Check, AlertCircle } from 'lucide-react';
import Image from 'next/image';
import { useState } from 'react';

interface ProductCardProps {
  product: Product;
  stockStatus: 'in_stock' | 'low_stock' | 'out_of_stock';
  onAdd: () => void;
}

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

  return (
    <div 
      className={`group relative flex flex-col justify-between overflow-hidden rounded-2xl bg-white border border-slate-100/80 p-2.5 sm:p-3 shadow-sm transition-all duration-300 ${
        isOutOfStock 
          ? 'opacity-65 border-red-100/50 hover:-translate-y-0.5 hover:shadow-md' 
          : 'hover:-translate-y-1 hover:shadow-lg hover:shadow-slate-100/60 hover:border-primary/30'
      }`}
    >
      {/* Typographic Product Header Panel */}
      <div className="relative h-20 sm:h-28 w-full overflow-hidden rounded-xl bg-gradient-to-br from-primary-light to-blue-50/50 mb-2 sm:mb-3 flex flex-col justify-between p-2 sm:p-3.5 border border-blue-50/20">
        
        {/* Category & Stock Badges */}
        <div className="flex items-center justify-between w-full">
          {/* Low Stock Badge */}
          {isLowStock && !isOutOfStock ? (
            <span className="rounded bg-warning px-1.5 py-0.5 text-[7px] sm:text-[8px] font-black uppercase tracking-wider text-white shadow-sm shadow-warning/10">
              Low Stock
            </span>
          ) : (
            <div />
          )}

          {/* Category Badge */}
          <span className="rounded bg-primary/15 text-primary px-1.5 sm:px-2 py-0.5 text-[7px] sm:text-[8px] font-black uppercase tracking-wider select-none">
            {product.category}
          </span>
        </div>

        {/* Central Logo Letter */}
        <div className="flex items-center justify-center">
          <div className="flex h-8 w-8 sm:h-11 sm:w-11 items-center justify-center rounded-xl sm:rounded-2xl bg-white border border-blue-100/30 text-primary font-display font-black text-xs sm:text-sm shadow-sm group-hover:scale-105 group-hover:rotate-3 transition-all duration-300 select-none">
            {product.name[0]}
          </div>
        </div>

        {/* Small spacer for spacing */}
        <div className="h-0.5 sm:h-1" />

        {/* Out of Stock Banner Overlay */}
        {isOutOfStock && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/45 backdrop-blur-[1px]">
            <span className="rounded-full bg-danger px-2.5 py-0.5 sm:px-3 sm:py-1 text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-white shadow-lg shadow-danger/20">
              Out of Stock
            </span>
          </div>
        )}
      </div>

      {/* Product Info Block */}
      <div className="flex-1 px-0.5 flex flex-col justify-between">
        <div>
          <h4 className="font-display text-[11px] sm:text-xs font-black text-text-primary group-hover:text-primary transition-colors line-clamp-1">
            {product.name}
          </h4>
          <p className="text-[9px] sm:text-[10px] font-semibold text-text-muted mt-0.5 sm:mt-1 leading-tight sm:leading-normal line-clamp-2 h-6 sm:h-8 overflow-hidden">
            {product.description || "Freshly made Zee Laban premium dessert."}
          </p>
        </div>
        <div className="mt-2 sm:mt-2.5 flex items-baseline justify-between pt-1.5 sm:pt-2 border-t border-dashed border-slate-100">
          <span className="font-mono text-[10px] sm:text-xs font-black text-primary-dark">
            ₹{product.price.toFixed(2)}
          </span>
          <span className="text-[8px] sm:text-[9px] font-bold text-slate-400">
            GST {product.gst_rate}% {product.gst_inclusive ? 'Incl' : 'Excl'}
          </span>
        </div>
      </div>

      {/* Button Checkout Trigger */}
      <div className="mt-2.5">
        {isOutOfStock ? (
          <button
            onClick={handleAdd}
            className="flex w-full items-center justify-center space-x-1 rounded-xl py-1.5 sm:py-2.5 text-[10px] sm:text-xs font-bold transition-all active:scale-[0.96] cursor-pointer bg-red-50 hover:bg-red-100 text-red-600 border border-red-150 shadow-sm"
          >
            <AlertCircle className="h-3.5 w-3.5 stroke-[3px]" />
            <span>Out of Stock</span>
          </button>
        ) : (
          <button
            onClick={handleAdd}
            className={`flex w-full items-center justify-center space-x-1 rounded-xl py-1.5 sm:py-2.5 text-[10px] sm:text-xs font-bold transition-all active:scale-[0.96] cursor-pointer shadow-md ${
              isAdded 
                ? 'bg-success text-white shadow-success/20 scale-[1.02] animate-scale-in' 
                : 'bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-600 hover:to-sky-700 text-white shadow-sky-500/10 hover:shadow-sky-500/20'
            }`}
          >
            {isAdded ? (
              <>
                <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4 stroke-[3px]" />
                <span>Added!</span>
              </>
            ) : (
              <>
                <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4 stroke-[3px]" />
                <span>Add to Bill</span>
              </>
            )}
          </button>
        )}
      </div>

    </div>
  );
}
