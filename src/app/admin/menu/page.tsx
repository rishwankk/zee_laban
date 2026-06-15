'use client';

import { useState, useEffect } from 'react';
import { api, Product, Category } from '@/lib/supabase';
import { 
  Plus, 
  Lock, 
  Unlock, 
  Trash2, 
  Menu as MenuIcon, 
  Layers,
  Sparkles,
  X,
  CheckCircle,
  HelpCircle,
  FolderOpen,
  Edit2,
  Check
} from 'lucide-react';

export default function AdminMenuPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categoriesList, setCategoriesList] = useState<Category[]>([]);
  
  // Modal states
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [name, setName] = useState('');
  const [category, setCategory] = useState<string>('');
  const [price, setPrice] = useState('');
  const [gstRate, setGstRate] = useState('5');
  const [gstInclusive, setGstInclusive] = useState(true);
  const [description, setDescription] = useState('');

  // Category management states
  const [showManageCategories, setShowManageCategories] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editCategoryName, setEditCategoryName] = useState('');

  // Product edit states
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editProductName, setEditProductName] = useState('');
  const [editProductPrice, setEditProductPrice] = useState('');
  const [editProductDesc, setEditProductDesc] = useState('');

  // Notifications
  const [notification, setNotification] = useState<string | null>(null);

  const loadCatalog = async () => {
    try {
      const pData = await api.getProducts();
      setProducts(pData);

      const cData = await api.getCategories();
      setCategoriesList(cData);
      if (cData.length > 0 && !category) {
        setCategory(cData[0].name);
      }
    } catch (err) {
      console.error("Failed to load catalog menu", err);
    }
  };

  useEffect(() => {
    loadCatalog();
  }, []);

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !price || !category) return;

    try {
      await api.addProduct({
        name,
        category,
        price: parseFloat(price) || 0,
        gst_rate: parseFloat(gstRate) || 5,
        gst_inclusive: gstInclusive,
        description,
        price_locked: true // Default locked by admin
      });

      setShowAddProduct(false);
      setName('');
      setPrice('');
      setGstRate('5');
      setGstInclusive(true);
      setDescription('');
      
      setNotification("Product created and stock distributed! 🍮");
      setTimeout(() => setNotification(null), 3000);
      await loadCatalog();
    } catch (err) {
      console.error("Failed to add product", err);
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;

    try {
      await api.addCategory(newCategoryName.trim());
      const cData = await api.getCategories();
      setCategoriesList(cData);
      
      // Auto select the new category
      setCategory(newCategoryName.trim());
      setNewCategoryName('');
      
      setNotification("New category registered successfully! 📁");
      setTimeout(() => setNotification(null), 2500);
    } catch (err) {
      console.error("Failed to add category", err);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm("Are you sure you want to delete this category?")) return;
    try {
      await api.deleteCategory(id);
      setCategoriesList(await api.getCategories());
      setNotification("Category removed! 🗑️");
      setTimeout(() => setNotification(null), 2500);
    } catch (err) {
      console.error("Failed to delete category", err);
    }
  };

  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;

    try {
      await api.updateProduct(editingProduct.id, {
        name: editProductName,
        price: parseFloat(editProductPrice) || 0,
        description: editProductDesc
      });
      setEditingProduct(null);
      await loadCatalog();
      setNotification("Product updated successfully! ✨");
      setTimeout(() => setNotification(null), 2500);
    } catch (err) {
      console.error("Failed to update product", err);
    }
  };

  const handleUpdateCategory = async (id: string) => {
    if (!editCategoryName.trim()) return;
    try {
      await api.updateCategory(id, editCategoryName.trim());
      setCategoriesList(await api.getCategories());
      setEditingCategory(null);
      setNotification("Category updated! ✨");
      setTimeout(() => setNotification(null), 2500);
    } catch (err) {
      console.error("Failed to update category", err);
    }
  };

  const handlePriceChange = async (product: Product, newPrice: string) => {
    const val = parseFloat(newPrice);
    if (isNaN(val) || val === product.price) return;
    try {
      await api.updateProduct(product.id, { price: val });
      setNotification(`Price for ${product.name} updated to ₹${val.toFixed(2)}`);
      setTimeout(() => setNotification(null), 2000);
      await loadCatalog();
    } catch (err) {
      console.error("Failed to update price", err);
    }
  };

  // Toggle Price Lock inline
  const handleTogglePriceLock = async (product: Product) => {
    const nextLock = !product.price_locked;
    try {
      await api.updateProduct(product.id, { price_locked: nextLock });
      
      setNotification(`Price for "${product.name}" ${nextLock ? 'LOCKED' : 'UNLOCKED'} globally!`);
      setTimeout(() => setNotification(null), 2500);
      await loadCatalog();
    } catch (err) {
      console.error("Lock toggle failed", err);
    }
  };

  // Delete product
  const handleDeleteProduct = async (id: string) => {
    if (!confirm("Are you sure you want to deactivate this product from the master catalog?")) return;
    try {
      await api.deleteProduct(id);
      await loadCatalog();
    } catch (err) {
      console.error("Failed to delete product", err);
    }
  };



  return (
    <div className="space-y-8 select-none animate-fade-in relative">
      
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-black text-text-primary">
            Master Catalog Center
          </h2>
          <p className="text-xs font-semibold text-text-muted mt-1">
            Publish products globally, modify tax brackets, lock prices, and configure brand categories.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowManageCategories(true)}
            className="flex items-center space-x-2 rounded-xl bg-sky-50 hover:bg-sky-100 px-4 py-3 text-xs font-bold text-primary border border-sky-100 transition-all active:scale-95 cursor-pointer"
          >
            <Layers className="h-4.5 w-4.5" />
            <span>Manage Categories</span>
          </button>
          
          <button
            onClick={() => setShowAddProduct(true)}
            className="flex items-center space-x-2 rounded-xl bg-primary hover:bg-primary-dark px-4 py-3 text-xs font-bold text-white shadow-lg shadow-primary/10 transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Add Product</span>
          </button>
        </div>
      </div>

      {/* PRODUCTS TABLE */}
      <div className="rounded-3xl bg-white border border-gray-100 p-6 shadow-sm overflow-hidden">
        <div className="flex items-center space-x-2.5 mb-6">
          <MenuIcon className="h-5 w-5 text-primary" />
          <h3 className="font-display text-sm font-black text-text-primary">Brand Catalog Listings</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-50 text-[10px] font-bold uppercase tracking-widest text-text-muted">
                <th className="pb-3 pl-2">Product</th>
                <th className="pb-3 pl-4">Details Description</th>
                <th className="pb-3 text-right">Unit Price</th>
                <th className="pb-3 text-center">GST rate</th>
                <th className="pb-3 text-center">Price locked</th>
                <th className="pb-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50/50 text-xs font-semibold text-text-primary">
              {products.map((product) => (
                <tr key={product.id} className="hover:bg-blue-50/10 transition-colors">
                  
                  {/* Info */}
                  <td className="py-4 pl-2">
                    <div className="flex items-center space-x-3.5">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-light text-primary font-display font-black text-xs select-none">
                        {product.name[0]}
                      </div>
                      <div>
                        <span className="block font-black text-text-primary">{product.name}</span>
                        <span className="rounded bg-sky-50 text-primary text-[8px] font-bold tracking-wider px-1.5 py-0.5 mt-1 inline-block uppercase">
                          {product.category}
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* Description details */}
                  <td className="py-4 pl-4 text-xs font-semibold text-text-muted/95 max-w-xs truncate">
                    {product.description || "Fresh Zee Laban brand recipe."}
                  </td>

                  {/* Price */}
                  <td className="py-4 text-right">
                    <div className="flex justify-end items-center space-x-1">
                      <span className="text-text-muted font-bold text-[10px]">₹</span>
                      <input 
                        type="number" 
                        defaultValue={product.price}
                        disabled={product.price_locked}
                        onBlur={(e) => handlePriceChange(product, e.target.value)}
                        className={`w-16 text-right font-mono font-black text-sm outline-none rounded p-1 transition-colors ${
                          product.price_locked 
                            ? 'bg-transparent text-primary-dark opacity-80 cursor-not-allowed' 
                            : 'bg-white border border-blue-200 text-blue-700 shadow-inner focus:border-primary focus:ring-1 focus:ring-primary'
                        }`}
                      />
                    </div>
                  </td>

                  {/* Tax */}
                  <td className="py-4 text-center">
                    <span className="font-mono">{product.gst_rate}%</span>
                    <span className="text-[8px] font-black text-text-muted uppercase ml-1 bg-gray-100 px-1 rounded-sm">
                      {product.gst_inclusive ? 'Incl' : 'Excl'}
                    </span>
                  </td>

                  {/* Price Lock Action Toggle */}
                  <td className="py-4 text-center">
                    <button
                      onClick={() => handleTogglePriceLock(product)}
                      className={`inline-flex items-center space-x-1 rounded-xl px-3 py-1.5 text-[9px] font-black uppercase tracking-wider border transition-colors cursor-pointer ${
                        product.price_locked
                          ? 'bg-red-50 text-danger border-transparent'
                          : 'bg-emerald-50 text-emerald-800 border-transparent'
                      }`}
                    >
                      {product.price_locked ? (
                        <>
                          <Lock className="h-3 w-3" />
                          <span>Locked</span>
                        </>
                      ) : (
                        <>
                          <Unlock className="h-3 w-3 animate-pulse" />
                          <span>Editable</span>
                        </>
                      )}
                    </button>
                  </td>

                  {/* Actions */}
                  <td className="py-4 text-center">
                    <div className="flex justify-center items-center space-x-1">
                      <button
                        onClick={() => {
                          setEditingProduct(product);
                          setEditProductName(product.name);
                          setEditProductPrice(product.price.toString());
                          setEditProductDesc(product.description || '');
                        }}
                        className="text-text-muted/50 hover:text-blue-500 p-1.5 rounded-lg hover:bg-blue-50/60 transition-colors cursor-pointer"
                        title="Edit Product"
                      >
                        <Edit2 className="h-4.5 w-4.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteProduct(product.id)}
                        className="text-text-muted/50 hover:text-danger p-1.5 rounded-lg hover:bg-red-50/60 transition-colors cursor-pointer"
                        title="Delete Product"
                      >
                        <Trash2 className="h-4.5 w-4.5" />
                      </button>
                    </div>
                  </td>

                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ======================================================== */}
      {/* MODAL: ADD PRODUCT */}
      {/* ======================================================== */}
      {showAddProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-md rounded-[24px] bg-white p-7 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.25)] animate-slide-up border border-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-sm font-black text-text-primary uppercase tracking-wide">
                Publish Master Product
              </h3>
              <button onClick={() => setShowAddProduct(false)} className="rounded-lg p-1 hover:bg-gray-50 text-text-muted">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleAddProduct} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-text-muted mb-1.5">Product Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="E.g., Laban Classic Sweet"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-3 text-xs outline-none focus:border-primary focus:bg-white font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-text-muted mb-1.5">Category</label>
                  <select
                    value={category}
                    required
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-3 text-xs outline-none focus:border-primary focus:bg-white bg-white font-semibold"
                  >
                    {categoriesList.length === 0 ? (
                      <option value="">-- No Categories --</option>
                    ) : (
                      categoriesList.map(c => (
                        <option key={c.id} value={c.name}>{c.name}</option>
                      ))
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-text-muted mb-1.5">Unit Price (INR)</label>
                  <input
                    type="number"
                    required
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="E.g., 120"
                    className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-3 text-xs outline-none focus:border-primary focus:bg-white font-mono font-bold text-primary-dark"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-text-muted mb-1.5">GST Rate (%)</label>
                  <select
                    value={gstRate}
                    onChange={(e) => setGstRate(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-3 text-xs outline-none focus:border-primary focus:bg-white bg-white font-semibold"
                  >
                    <option value="5">5% (Standard)</option>
                    <option value="12">12%</option>
                    <option value="18">18%</option>
                    <option value="28">28%</option>
                  </select>
                </div>

                <div className="flex flex-col justify-center">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-text-muted mb-1.5">GST Collection</label>
                  <div className="flex items-center space-x-2 py-2">
                    <input
                      type="checkbox"
                      id="inclusive"
                      checked={gstInclusive}
                      onChange={(e) => setGstInclusive(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <label htmlFor="inclusive" className="text-xs font-bold text-text-primary select-none cursor-pointer">
                      GST-Inclusive
                    </label>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-text-muted mb-1.5">Product Details / Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Enter premium ingredients or recipe descriptions..."
                  rows={3}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-3 text-xs outline-none focus:border-primary focus:bg-white resize-none font-semibold"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-gray-50">
                <button
                  type="button"
                  onClick={() => setShowAddProduct(false)}
                  className="rounded-xl border border-gray-200 px-4 py-2.5 text-xs font-bold text-text-muted hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-primary hover:bg-primary-dark px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-primary/10 transition-colors"
                >
                  Publish Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: MANAGE CATEGORIES */}
      {/* ======================================================== */}
      {showManageCategories && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-sm rounded-[24px] bg-white p-7 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.25)] animate-slide-up border border-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-sm font-black text-text-primary uppercase tracking-wide flex items-center space-x-2">
                <FolderOpen className="h-4.5 w-4.5 text-primary" />
                <span>Dynamic Categories</span>
              </h3>
              <button onClick={() => setShowManageCategories(false)} className="rounded-lg p-1 hover:bg-gray-50 text-text-muted">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            {/* Create Category inline Form */}
            <form onSubmit={handleAddCategory} className="mb-6 pb-4 border-b border-gray-100 space-y-3">
              <div>
                <label className="block text-[9px] font-black uppercase tracking-wider text-text-muted mb-1.5">New Category Name</label>
                <input
                  type="text"
                  required
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="E.g., Special Shakes, Falooda Combo"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3.5 py-2.5 text-xs outline-none focus:border-primary focus:bg-white font-semibold"
                />
              </div>
              <button
                type="submit"
                className="w-full rounded-xl bg-primary hover:bg-primary-dark py-2.5 text-xs font-black text-white shadow-md shadow-primary/15 transition-colors cursor-pointer"
              >
                Create Brand Category
              </button>
            </form>

            {/* List Active Brand Categories */}
            <div className="space-y-2.5">
              <h4 className="text-[10px] font-black uppercase tracking-wider text-text-muted">Registered Categories</h4>
              <div className="max-h-48 overflow-y-auto space-y-2 pr-1.5 custom-scrollbar">
                {categoriesList.map(c => (
                  <div key={c.id} className="flex items-center justify-between bg-white border border-gray-100 shadow-sm px-3 py-2.5 rounded-xl text-xs font-bold text-text-primary transition-all hover:border-blue-100">
                    {editingCategory === c.id ? (
                      <div className="flex items-center w-full space-x-2">
                        <input
                          type="text"
                          value={editCategoryName}
                          onChange={(e) => setEditCategoryName(e.target.value)}
                          className="flex-1 text-xs border border-blue-200 rounded px-2 py-1 outline-none focus:ring-1 focus:ring-blue-500"
                          autoFocus
                        />
                        <button onClick={() => handleUpdateCategory(c.id)} className="text-emerald-500 hover:text-emerald-600 bg-emerald-50 p-1 rounded-md">
                          <Check className="h-4 w-4" />
                        </button>
                        <button onClick={() => setEditingCategory(null)} className="text-slate-400 hover:text-slate-600 bg-slate-100 p-1 rounded-md">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <span>{c.name}</span>
                        <div className="flex items-center space-x-1">
                          <button 
                            onClick={() => {
                              setEditingCategory(c.id);
                              setEditCategoryName(c.name);
                            }}
                            className="p-1.5 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button 
                            onClick={() => handleDeleteCategory(c.id)}
                            className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-5 mt-4 border-t border-gray-50">
              <button
                onClick={() => setShowManageCategories(false)}
                className="rounded-xl bg-gray-100 hover:bg-gray-200 px-4 py-2 text-xs font-bold text-text-muted transition-colors cursor-pointer"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: EDIT PRODUCT */}
      {/* ======================================================== */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-md rounded-[24px] bg-white p-7 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.25)] animate-slide-up border border-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-sm font-black text-text-primary uppercase tracking-wide">
                Edit Product
              </h3>
              <button 
                onClick={() => setEditingProduct(null)}
                className="rounded-full bg-slate-100 p-1.5 text-slate-500 hover:bg-slate-200 hover:text-slate-800 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateProduct} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-text-muted mb-1.5 ml-1">Product Name</label>
                <input
                  required
                  autoFocus
                  type="text"
                  value={editProductName}
                  onChange={e => setEditProductName(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-3 text-xs font-bold text-text-primary outline-none focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/10 transition-all placeholder:text-gray-300"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-text-muted mb-1.5 ml-1">Price (₹)</label>
                <input
                  required
                  type="number"
                  min="0"
                  step="0.01"
                  value={editProductPrice}
                  onChange={e => setEditProductPrice(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-3 text-xs font-bold text-text-primary outline-none focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/10 transition-all placeholder:text-gray-300"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-text-muted mb-1.5 ml-1">Kitchen Description</label>
                <textarea
                  rows={2}
                  value={editProductDesc}
                  onChange={e => setEditProductDesc(e.target.value)}
                  placeholder="Optional notes for kitchen..."
                  className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-3 text-xs font-semibold text-text-primary outline-none focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/10 transition-all placeholder:text-gray-300 resize-none"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full rounded-xl bg-slate-800 hover:bg-slate-900 py-3.5 text-xs font-black text-white shadow-lg shadow-slate-800/20 transition-all active:scale-[0.98]"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
