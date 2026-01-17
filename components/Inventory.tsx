
import React, { useState } from 'react';
import { Search, Plus, PackagePlus, X, Eye, Edit, ClipboardCheck, History, BarChart3, Infinity, Loader2, TrendingUp, Trash2, Download } from 'lucide-react';
import { Product, Branch, Supplier, StockInRecord, Role } from '../types';
import { useOutletContext } from 'react-router-dom';
import { User as UserType } from '../types';
import ProductModal from './ProductModal';
import { API_BASE_URL } from '../App';

type ProductMode = 'CREATE' | 'EDIT' | 'VIEW';

interface InventoryContext {
  user: UserType;
  categories: string[];
  brands: string[];
  products: Product[];
  branches: Branch[];
  suppliers: Supplier[];
  refreshProducts: () => void;
  isProductsLoading: boolean;
  saveProduct: (product: Product) => Promise<boolean>;
  deleteProduct: (id: string) => Promise<boolean>;
  saveStockInRecord: (record: StockInRecord) => Promise<boolean>;
  authToken?: string | null;
}

const escapeCsv = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

const categoryColorClasses = [
  'bg-blue-100 text-blue-700',
  'bg-emerald-100 text-emerald-700',
  'bg-amber-100 text-amber-700',
  'bg-violet-100 text-violet-700',
  'bg-rose-100 text-rose-700'
];

const getCategoryClasses = (category: string | undefined) => {
  if (!category) return 'bg-slate-100 text-slate-600';
  let sum = 0;
  for (let i = 0; i < category.length; i++) {
    sum += category.charCodeAt(i);
  }
  const idx = sum % categoryColorClasses.length;
  return categoryColorClasses[idx];
};

const Inventory: React.FC = () => {
  const { user, categories, brands, products, branches, suppliers, refreshProducts, isProductsLoading, saveProduct, deleteProduct, saveStockInRecord, authToken } = useOutletContext<InventoryContext>();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedBrand, setSelectedBrand] = useState('All');
  
  // Selection State
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set());

  // Modals state
  const [productModal, setProductModal] = useState<{isOpen: boolean; mode: ProductMode; product?: Product}>({
    isOpen: false, mode: 'CREATE'
  });
  const [showStockInModal, setShowStockInModal] = useState(false);
  const [showStockTakeModal, setShowStockTakeModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showBatchAnalysisModal, setShowBatchAnalysisModal] = useState(false);
  
  const [historyProduct, setHistoryProduct] = useState<Product | null>(null);
  const [historyMovements, setHistoryMovements] = useState<any[]>([]);
  const [salesAnalytics, setSalesAnalytics] = useState<{[key: string]: number}>({});
  const [, setIsLoadingHistory] = useState(false);
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(false);
  type StockInItem = { productId: string; quantity: number; unitCost: number };
  const [stockInForm, setStockInForm] = useState<{ productId: string; supplierId: string; supplierDocNo: string; quantity: number; unitCost: number }>({
    productId: '',
    supplierId: '',
    supplierDocNo: '',
    quantity: 1,
    unitCost: 0
  });
  const [stockInItems, setStockInItems] = useState<StockInItem[]>([]);
  const [stockInProductSearch, setStockInProductSearch] = useState('');
  const [stockInFilterCategory, setStockInFilterCategory] = useState('All');
  const [stockInFilterBrand, setStockInFilterBrand] = useState('All');
  const [stockInSelectedProductIdsBulk, setStockInSelectedProductIdsBulk] = useState<string[]>([]);
  const [stockTakeCounts, setStockTakeCounts] = useState<Record<string, number>>({});

  const fetchHistory = async (productId: string) => {
    setIsLoadingHistory(true);
    try {
      const response = await fetch(`${API_BASE_URL}/get_product_history.php?productId=${productId}`, {
        headers: authToken ? { 'X-Auth-Token': authToken } : undefined,
      });
      const data = await response.json();
      if (Array.isArray(data)) {
        setHistoryMovements(data);
      }
    } catch (e) {
      console.error("Fetch History Failed", e);
      setHistoryMovements([]);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const fetchAnalytics = async (productIds: string[]) => {
      setIsLoadingAnalytics(true);
      try {
          const response = await fetch(`${API_BASE_URL}/get_sales_analytics.php?ids=${productIds.join(',')}`, {
            headers: authToken ? { 'X-Auth-Token': authToken } : undefined,
          });
          const data = await response.json();
          setSalesAnalytics(data);
      } catch (e) {
          console.error("Fetch Analytics Failed", e);
      } finally {
          setIsLoadingAnalytics(false);
      }
  };

  const handleOpenHistory = (product: Product) => {
    setHistoryProduct(product);
    setShowHistoryModal(true);
    fetchHistory(product.id);
  };

  const handleSaveProduct = async (product: Product) => {
    const success = await saveProduct(product);
    if (success) {
        setProductModal({ ...productModal, isOpen: false });
    }
  };

  const handleDeleteProduct = async (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete '${name}'? This action cannot be undone.`)) {
        await deleteProduct(id);
    }
  };

  const addStockInSelectedProducts = () => {
    if (stockInSelectedProductIdsBulk.length === 0) return;
    setStockInItems(prev => {
      let next = [...prev];
      stockInSelectedProductIdsBulk.forEach(id => {
        const product = products.find(p => p.id === id);
        if (!product) return;
        const idx = next.findIndex(it => it.productId === id && it.unitCost === stockInForm.unitCost);
        if (idx >= 0) {
          next[idx] = { ...next[idx], quantity: next[idx].quantity + stockInForm.quantity };
        } else {
          next.push({ productId: id, quantity: stockInForm.quantity, unitCost: stockInForm.unitCost });
        }
      });
      return next;
    });
    setStockInSelectedProductIdsBulk([]);
    setStockInForm(prev => ({ ...prev, quantity: 1 }));
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.sku.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
    const matchesBrand = selectedBrand === 'All' || p.brand === selectedBrand;
    return matchesSearch && matchesCategory && matchesBrand;
  });

  // Selection Logic
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.checked) {
          const ids = filteredProducts.map(p => p.id);
          setSelectedProductIds(new Set(ids));
      } else {
          setSelectedProductIds(new Set());
      }
  };

  const handleSelectOne = (id: string) => {
      const newSet = new Set(selectedProductIds);
      if (newSet.has(id)) {
          newSet.delete(id);
      } else {
          newSet.add(id);
      }
      setSelectedProductIds(newSet);
  };

  const selectedCount = selectedProductIds.size;
  const isAllSelected = filteredProducts.length > 0 && selectedCount === filteredProducts.length;

  const canExport = user.role === Role.ADMIN || user.role === Role.MANAGER;

  const handleExportCsv = () => {
    if (!canExport) {
      window.alert('只有經理或ADMIN可以匯出商品');
      return;
    }
    const baseList = filteredProducts.filter(p => selectedProductIds.size === 0 || selectedProductIds.has(p.id));
    if (baseList.length === 0) {
      window.alert('沒有可導出的商品');
      return;
    }

    const headers = [
      'ID',
      'SKU',
      'Barcode',
      'EAN',
      '名稱',
      'WEB NAME',
      '品牌',
      '分類',
      '描述',
      '成本',
      '售價',
      'Web售價',
      '建議售價',
      'L/T',
      '追蹤庫存',
      ...branches.map(b => `${b.code}庫存`)
    ];

    const lines = baseList.map(p => {
      const cells: unknown[] = [
        p.id,
        p.sku,
        p.barcode,
        p.ean ?? '',
        p.name,
        p.webName ?? '',
        p.brand,
        p.category,
        p.description,
        p.cost,
        p.price,
        p.webPrice ?? '',
        p.srp,
        p.lowStockThreshold,
        p.trackStock ? 'Yes' : 'No',
        ...branches.map(b => p.stock[b.id] ?? 0)
      ];
      return cells.map(escapeCsv).join(',');
    });

    const csvBody = [headers.map(escapeCsv).join(','), ...lines].join('\r\n');
    const csvContent = '\uFEFF' + csvBody;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const timestamp = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const fileName = `products_${timestamp.getFullYear()}${pad(timestamp.getMonth() + 1)}${pad(timestamp.getDate())}_${pad(timestamp.getHours())}${pad(timestamp.getMinutes())}${pad(timestamp.getSeconds())}.csv`;
    link.href = url;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-8 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-800">商品庫存 (Product Inventory)</h1>
            <button 
                onClick={refreshProducts} 
                className="p-1.5 rounded-full hover:bg-slate-200 text-slate-500 transition-colors"
                title="重新整理 (Refresh from DB)"
            >
                <Loader2 size={16} className={isProductsLoading ? 'animate-spin' : ''} />
            </button>
          </div>
          <div className="flex gap-3">
             {selectedCount > 0 && (
                <button 
                  onClick={() => {
                      setShowBatchAnalysisModal(true);
                      fetchAnalytics(Array.from(selectedProductIds));
                  }}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all animate-in fade-in zoom-in-95"
                >
                  <BarChart3 size={18} /> 批量分析 ({selectedCount})
                </button>
             )}
             <button 
               onClick={() => setShowStockTakeModal(true)}
               className="bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-400"
             >
               <ClipboardCheck size={18} /> 盤點 (Stock Take)
             </button>
            {canExport && (
              <button 
                onClick={handleExportCsv}
                className="bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-400"
              >
                <Download size={18} /> 導出商品CSV
              </button>
            )}
            <button 
              onClick={() => {
                const baseList = selectedProductIds.size > 0 ? products.filter(p => selectedProductIds.has(p.id)) : products;
                const firstId = baseList.length > 0 ? baseList[0].id : '';
                setStockInForm(prev => ({ ...prev, productId: firstId }));
                setStockInProductSearch('');
                setStockInFilterCategory('All');
                setStockInFilterBrand('All');
                setStockInSelectedProductIdsBulk([]);
                setShowStockInModal(true);
              }}
               className="bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-400"
             >
               <PackagePlus size={18} /> 入庫 (Stock In)
             </button>
             <button 
               onClick={() => setProductModal({ isOpen: true, mode: 'CREATE' })}
               className="bg-brand-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
             >
               <Plus size={18} /> 新增商品
             </button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row gap-4 bg-slate-50/50">
            <div className="relative flex-1 max-w-md">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
               <input 
                 type="text" 
                 placeholder="搜尋 SKU 或 名稱..." 
                 className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500"
                 value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
               />
            </div>
            <div className="flex gap-2">
              <select 
                className="px-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500"
                value={selectedBrand}
                onChange={(e) => setSelectedBrand(e.target.value)}
              >
                {brands.map((b: string) => <option key={b} value={b}>{b === 'All' ? '所有品牌 (All Brands)' : b}</option>)}
              </select>
              <select 
                className="px-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                {categories.map(c => <option key={c} value={c}>{c === 'All' ? '所有分類 (All Categories)' : c}</option>)}
              </select>
            </div>
          </div>

          {isProductsLoading && products.length === 0 ? (
              <div className="p-12 flex flex-col items-center justify-center text-slate-400">
                  <Loader2 size={48} className="animate-spin mb-4 text-brand-500" />
                  <p>正在載入數據 (Loading Data)...</p>
              </div>
          ) : (
            <table className="w-full text-left text-sm">
                <thead>
                <tr className="bg-slate-100 text-slate-600 uppercase text-xs tracking-wider font-semibold">
                    <th className="p-4 w-10 text-center">
                        <input 
                            type="checkbox" 
                            className="w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500 cursor-pointer"
                            checked={isAllSelected}
                            onChange={handleSelectAll}
                        />
                    </th>
                    <th className="p-4">商品資料 (Product Info)</th>
                    {branches.map(b => (
                    <th key={b.id} className="p-4 text-center">{b.code} 庫存</th>
                    ))}
                    <th className="p-4 text-center">總數</th>
                    <th className="p-4 text-center">操作</th>
                </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                {filteredProducts.map((product: Product) => {
                    const currentBranchStock = product.stock[user.branchId] || 0;
                    const isLowStock = currentBranchStock <= product.lowStockThreshold && product.trackStock;
                    const isSelected = selectedProductIds.has(product.id);

                    return (
                        <tr key={product.id} className={`transition-colors group ${isSelected ? 'bg-indigo-50/50 hover:bg-indigo-50' : 'hover:bg-slate-50'}`}>
                        <td className="p-4 text-center">
                            <input 
                                type="checkbox" 
                                className="w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500 cursor-pointer"
                                checked={isSelected}
                                onChange={() => handleSelectOne(product.id)}
                            />
                        </td>
                        <td className="p-4">
                            <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold ${getCategoryClasses(product.category)}`}>
                                <span className="px-1 text-center leading-tight truncate max-w-[36px]">
                                    {product.category || 'N/A'}
                                </span>
                            </div>
                            <div>
                                <div className="font-bold text-slate-800 flex items-center gap-2">
                                {product.sku}
                                {isLowStock && <span className="text-[10px] bg-red-100 text-red-600 px-1.5 rounded font-bold">Low</span>}
                                {!product.trackStock && <span className="text-[10px] bg-blue-100 text-blue-600 px-1.5 rounded font-bold">Service</span>}
                                </div>
                                <div className="text-slate-500 max-w-[250px] truncate">{product.name}</div>
                                <div className="text-xs text-slate-400 mt-0.5">L/T: {product.trackStock ? product.lowStockThreshold : 'N/A'}</div>
                            </div>
                            </div>
                        </td>
                        {branches.map(b => (
                            <td key={b.id} className="p-4 text-center">
                            {product.trackStock ? (
                                <span className={`px-2 py-1 rounded font-medium ${
                                    (product.stock[b.id] || 0) <= product.lowStockThreshold
                                    ? 'bg-red-50 text-red-600' 
                                    : 'bg-slate-100 text-slate-700'
                                }`}>
                                    {product.stock[b.id] || 0}
                                </span>
                            ) : (
                                <span className="text-slate-400 text-xs"><Infinity size={14} className="inline"/></span>
                            )}
                            </td>
                        ))}
                        <td className="p-4 text-center font-bold text-slate-800">
                            {product.trackStock ? Object.values(product.stock).reduce((a: number, b: number) => a + b, 0) : '-'}
                        </td>
                        <td className="p-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                            <button 
                                onClick={() => handleOpenHistory(product)}
                                className="text-slate-400 hover:text-blue-600 p-1"
                                title="商品追蹤 (Tracking)"
                            >
                                <History size={18} />
                            </button>
                            <button 
                                onClick={() => setProductModal({ isOpen: true, mode: 'VIEW', product })}
                                className="text-slate-400 hover:text-brand-600 p-1" 
                                title="查看 (View)"
                            >
                                <Eye size={18} />
                            </button>
                            <button 
                                onClick={() => setProductModal({ isOpen: true, mode: 'EDIT', product })}
                                className="text-slate-400 hover:text-brand-600 p-1" 
                                title="編輯 (Edit)"
                            >
                                <Edit size={18} />
                            </button>
                            <button 
                                onClick={() => handleDeleteProduct(product.id, product.name)}
                                className="text-slate-400 hover:text-red-600 p-1" 
                                title="刪除 (Delete)"
                            >
                                <Trash2 size={18} />
                            </button>
                            </div>
                        </td>
                        </tr>
                    )
                    })}
                {filteredProducts.length === 0 && (
                    <tr><td colSpan={6 + branches.length} className="p-8 text-center text-slate-400">找不到相關商品</td></tr>
                )}
                </tbody>
            </table>
          )}
        </div>

        {productModal.isOpen && (
          <ProductModal 
            mode={productModal.mode}
            product={productModal.product}
            branchId={user.branchId}
            categories={categories}
            brands={brands}
            suppliers={suppliers}
            existingProducts={products}
            branches={branches}
            onClose={() => setProductModal({ ...productModal, isOpen: false })} 
            onSave={handleSaveProduct}
          />
        )}
        
        {showStockInModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl w-full max-w-7xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
              <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <h3 className="font-bold text-lg text-slate-800">入庫 (Stock In)</h3>
                <button onClick={() => setShowStockInModal(false)}><X size={20} className="text-slate-400 hover:text-slate-600" /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                  <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">選擇商品 (Select Product)</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                      <input
                        type="text"
                        placeholder="搜尋名稱 / SKU..."
                        className="w-full pl-9 pr-3 py-2 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                        value={stockInProductSearch}
                        onChange={e => setStockInProductSearch(e.target.value)}
                      />
                    </div>
                    <select
                      className="w-full border rounded p-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                      value={stockInFilterCategory}
                      onChange={e => setStockInFilterCategory(e.target.value)}
                    >
                      {categories.map(c => <option key={c} value={c}>{c === 'All' ? '所有分類 (Category)' : c}</option>)}
                    </select>
                    <select
                      className="w-full border rounded p-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                      value={stockInFilterBrand}
                      onChange={e => setStockInFilterBrand(e.target.value)}
                    >
                      {brands.map(b => <option key={b} value={b}>{b === 'All' ? '所有品牌 (Brand)' : b}</option>)}
                    </select>
                  </div>
                  {(() => {
                    const baseList = selectedProductIds.size > 0 ? products.filter(p => selectedProductIds.has(p.id)) : products;
                    const stockInFilteredProducts = baseList.filter(p => {
                      const qs = stockInProductSearch.toLowerCase();
                      const matchesSearch = p.name.toLowerCase().includes(qs) || p.sku.toLowerCase().includes(qs);
                      const matchesCategory = stockInFilterCategory === 'All' || p.category === stockInFilterCategory;
                      const matchesBrand = stockInFilterBrand === 'All' || p.brand === stockInFilterBrand;
                      return matchesSearch && matchesCategory && matchesBrand;
                    });
                    return (
                      <div className="space-y-2">
                        <div className="border border-dashed border-slate-200 rounded-lg max-h-40 overflow-y-auto">
                          <div className="flex items-center justify-between px-2 py-1 text-xs text-slate-500 border-b border-slate-100 bg-slate-50">
                            <span>搜尋結果：{stockInFilteredProducts.length} 項</span>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                className="px-2 py-1 rounded border border-slate-200 bg-white hover:bg-slate-50"
                                onClick={() => setStockInSelectedProductIdsBulk(stockInFilteredProducts.map(p => p.id))}
                              >
                                全選
                              </button>
                              <button
                                type="button"
                                className="px-2 py-1 rounded border border-slate-200 bg-white hover:bg-slate-50"
                                onClick={() => setStockInSelectedProductIdsBulk([])}
                              >
                                清除
                              </button>
                            </div>
                          </div>
                          <table className="w-full text-sm">
                            <thead className="bg-white text-slate-500 border-b border-slate-100 sticky top-0">
                              <tr>
                                <th className="w-8 px-2 py-1"></th>
                                <th className="w-32 px-2 py-1 text-left">SKU</th>
                                <th className="px-2 py-1 text-left">商品名稱</th>
                                <th className="w-20 px-2 py-1 text-right">售價</th>
                                <th className="w-24 px-2 py-1 text-center">當前分店</th>
                                <th className="w-24 px-2 py-1 text-center">總庫存</th>
                              </tr>
                            </thead>
                            <tbody>
                              {stockInFilteredProducts.map(p => {
                                const checked = stockInSelectedProductIdsBulk.includes(p.id);
                                const currentStock = p.stock[user.branchId] || 0;
                                const totalStock = Object.values(p.stock || {}).reduce((sum, v) => sum + (v || 0), 0);
                                const fullName = `${p.sku} - ${p.name}`;
                                return (
                                  <tr
                                    key={p.id}
                                    className={`${checked ? 'bg-brand-50 text-brand-700' : 'hover:bg-slate-50'} cursor-pointer`}
                                    onClick={() =>
                                      setStockInSelectedProductIdsBulk(prev =>
                                        prev.includes(p.id) ? prev.filter(id => id !== p.id) : [...prev, p.id]
                                      )
                                    }
                                  >
                                    <td className="px-2 py-1 text-center">
                                      <input
                                        type="checkbox"
                                        className="w-3 h-3"
                                        checked={checked}
                                        onChange={e => {
                                          e.stopPropagation();
                                          setStockInSelectedProductIdsBulk(prev =>
                                            prev.includes(p.id) ? prev.filter(id => id !== p.id) : [...prev, p.id]
                                          );
                                        }}
                                      />
                                    </td>
                                    <td className="px-2 py-1 font-mono text-slate-600" title={p.sku}>
                                      <span className="block max-w-[140px] truncate">{p.sku}</span>
                                    </td>
                                    <td className="px-2 py-1" title={fullName}>
                                      <span className="block whitespace-normal break-words">{p.name}</span>
                                    </td>
                                    <td className="px-2 py-1 text-right text-slate-700">
                                      ${p.price.toLocaleString()}
                                    </td>
                                    <td className="px-2 py-1 text-center text-slate-700">
                                      {currentStock}
                                    </td>
                                    <td className="px-2 py-1 text-center text-slate-700">
                                      {totalStock}
                                    </td>
                                  </tr>
                                );
                              })}
                              {stockInFilteredProducts.length === 0 && (
                                <tr>
                                  <td colSpan={6} className="text-xs text-slate-400 text-center py-2">
                                    沒有符合的產品
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>

                        <div className="flex gap-2 items-end justify-end">
                          <div className="w-24">
                            <label className="block text-[10px] font-bold text-slate-400 mb-1">數量 (Qty)</label>
                            <input
                              type="number"
                              min={1}
                              className="w-full border rounded p-2 text-sm"
                              value={stockInForm.quantity}
                              onChange={e => setStockInForm({ ...stockInForm, quantity: Math.max(1, parseInt(e.target.value || '1')) })}
                            />
                          </div>
                          <button
                            type="button"
                            className="bg-slate-800 text-white p-2 rounded-lg hover:bg-slate-700 disabled:opacity-50"
                            disabled={stockInFilteredProducts.length === 0}
                            onClick={() => {
                              setStockInItems(prev => {
                                const next = [...prev];
                                stockInFilteredProducts.forEach(p => {
                                  const idx = next.findIndex(it => it.productId === p.id && it.unitCost === stockInForm.unitCost);
                                  if (idx >= 0) {
                                    next[idx] = { ...next[idx], quantity: next[idx].quantity + stockInForm.quantity };
                                  } else {
                                    next.push({ productId: p.id, quantity: stockInForm.quantity, unitCost: stockInForm.unitCost });
                                  }
                                });
                                return next;
                              });
                              setStockInForm(prev => ({ ...prev, quantity: 1 }));
                            }}
                          >
                            <Plus size={18} />
                          </button>
                        </div>

                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={addStockInSelectedProducts}
                            disabled={stockInSelectedProductIdsBulk.length === 0}
                            className="px-3 py-1.5 rounded bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 disabled:opacity-40"
                          >
                            加入已選商品
                          </button>
                        </div>
                      </div>
                    );
                  })()}
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">供應商 (Supplier)</label>
                  <select
                    className="w-full border rounded p-2 text-sm"
                    value={stockInForm.supplierId}
                    onChange={e => setStockInForm({ ...stockInForm, supplierId: e.target.value })}
                  >
                    <option value="">請選擇供應商</option>
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">供應商單號 (Supplier Doc No)</label>
                  <input
                    type="text"
                    className="w-full border rounded p-2 text-sm"
                    value={stockInForm.supplierDocNo}
                    onChange={e => setStockInForm({ ...stockInForm, supplierDocNo: e.target.value })}
                    placeholder="例如: 發票號碼 / 供應商單號"
                  />
                </div>
                {stockInItems.length > 0 && (
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-100 text-slate-600 text-xs uppercase font-semibold">
                        <tr>
                          <th className="px-3 py-2">商品 (Product)</th>
                          <th className="px-3 py-2 text-center w-24">數量 (Qty)</th>
                          <th className="px-3 py-2 text-right w-28">單價 (Unit)</th>
                          <th className="px-3 py-2 text-right w-32">小計 (Subtotal)</th>
                          <th className="px-3 py-2 w-10"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {stockInItems.map((it, index) => {
                          const p = products.find(pp => pp.id === it.productId);
                          const subtotal = it.quantity * it.unitCost;
                          return (
                            <tr key={it.productId + '-' + index}>
                              <td className="px-3 py-2">
                                <div className="font-medium text-slate-800">{p ? p.name : 'Unknown'}</div>
                                <div className="text-xs text-slate-500 font-mono">{p ? p.sku : it.productId}</div>
                              </td>
                              <td className="px-3 py-2 text-center">
                                <input
                                  type="number"
                                  min={1}
                                  className="w-20 border rounded p-1 text-sm text-center"
                                  value={it.quantity}
                                  onChange={e => {
                                    const v = Math.max(1, parseInt(e.target.value || '1'));
                                    setStockInItems(prev => prev.map((row, i) => i === index ? { ...row, quantity: v } : row));
                                  }}
                                />
                              </td>
                              <td className="px-3 py-2 text-right">
                                <input
                                  type="number"
                                  min={0}
                                  step="0.01"
                                  className="w-24 border rounded p-1 text-sm text-right"
                                  value={it.unitCost}
                                  onChange={e => {
                                    const v = parseFloat(e.target.value || '0');
                                    setStockInItems(prev => prev.map((row, i) => i === index ? { ...row, unitCost: v } : row));
                                  }}
                                />
                              </td>
                              <td className="px-3 py-2 text-right font-medium text-slate-700">
                                ${subtotal.toLocaleString()}
                              </td>
                              <td className="px-3 py-2 text-center">
                                <button
                                  type="button"
                                  className="text-slate-300 hover:text-red-500 p-1 rounded"
                                  onClick={() => setStockInItems(prev => prev.filter((_, i) => i !== index))}
                                >
                                  <Trash2 size={14} />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
                {stockInItems.length === 0 && (
                  <div className="text-xs text-slate-400">
                    尚未加入任何商品，請選擇商品及數量後按加入。
                  </div>
                )}
                <div className="text-right text-slate-600">
                  合計成本:{' '}
                  <span className="font-bold">
                    ${stockInItems.reduce((sum, it) => sum + it.quantity * it.unitCost, 0).toLocaleString()}
                  </span>
                </div>
              </div>
              <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                <button onClick={() => setShowStockInModal(false)} className="px-6 py-2 rounded-lg border border-slate-300 bg-white text-slate-600 hover:bg-slate-50 font-medium">取消</button>
                <button
                  className="px-6 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 font-medium"
                  onClick={async () => {
                    if (!stockInForm.supplierId) {
                      alert('請選擇供應商');
                      return;
                    }
                    if (stockInItems.length === 0) {
                      alert('請先加入至少一個商品');
                      return;
                    }
                    const supplier = suppliers.find(s => s.id === stockInForm.supplierId);
                    if (!supplier) return;
                    const batchId = `SI-${Date.now()}`;
                    for (const it of stockInItems) {
                      const product = products.find(p => p.id === it.productId);
                      if (!product) continue;
                      const record: StockInRecord = {
                        id: `SI-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                        batchId,
                        date: new Date().toISOString().split('T')[0],
                        productId: product.id,
                        productName: product.name,
                        supplierId: supplier.id,
                        supplierName: supplier.name,
                        supplierDocNo: stockInForm.supplierDocNo,
                        quantity: it.quantity,
                        unitCost: it.unitCost,
                        totalCost: it.quantity * it.unitCost,
                        branchId: user.branchId,
                        performedBy: user.name || 'System',
                        status: 'COMPLETED'
                      };
                      await saveStockInRecord(record);
                    }
                    setShowStockInModal(false);
                    setStockInItems([]);
                    setStockInForm({ productId: '', supplierId: '', supplierDocNo: '', quantity: 1, unitCost: 0 });
                  }}
                >
                  確認入庫
                </button>
              </div>
            </div>
          </div>
        )}

        {showStockTakeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
              <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <h3 className="font-bold text-lg text-slate-800">盤點 (Stock Take)</h3>
                <button onClick={() => setShowStockTakeModal(false)}><X size={20} className="text-slate-400 hover:text-slate-600" /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {selectedProductIds.size === 0 ? (
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">選擇商品 (Select Product)</label>
                    <select
                      className="w-full border rounded p-2 text-sm"
                      value={Object.keys(stockTakeCounts)[0] || ''}
                      onChange={e => {
                        const id = e.target.value;
                        if (!id) return;
                        const p = products.find(pp => pp.id === id);
                        const current = p ? (p.stock[user.branchId] || 0) : 0;
                        setStockTakeCounts({ [id]: current });
                      }}
                    >
                      <option value="">請選擇商品</option>
                      {products.map(p => (
                        <option key={p.id} value={p.id}>{p.sku} - {p.name}</option>
                      ))}
                    </select>
                  </div>
                ) : null}
                <div className="space-y-3">
                  {(selectedProductIds.size > 0 ? products.filter(p => selectedProductIds.has(p.id)) : products.filter(p => Object.keys(stockTakeCounts).includes(p.id))).map(p => {
                    const current = p.stock[user.branchId] || 0;
                    const val = stockTakeCounts[p.id] ?? current;
                    return (
                      <div key={p.id} className="flex items-center gap-3">
                        <div className="flex-1">
                          <div className="font-bold text-slate-800">{p.name}</div>
                          <div className="text-xs text-slate-500 font-mono">{p.sku}</div>
                        </div>
                        <div className="text-xs text-slate-500">目前: <span className="font-bold">{current}</span></div>
                        <input
                          type="number"
                          min={0}
                          className="w-28 border rounded p-2 text-sm"
                          value={val}
                          onChange={e => {
                            const v = Math.max(0, parseInt(e.target.value || '0'));
                            setStockTakeCounts(prev => ({ ...prev, [p.id]: v }));
                          }}
                        />
                      </div>
                    );
                  })}
                  {selectedProductIds.size === 0 && Object.keys(stockTakeCounts).length === 0 && (
                    <div className="text-slate-500 text-sm">請選擇商品或先勾選列表中的商品。</div>
                  )}
                </div>
              </div>
              <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                <button onClick={() => { setShowStockTakeModal(false); setStockTakeCounts({}); }} className="px-6 py-2 rounded-lg border border-slate-300 bg-white text-slate-600 hover:bg-slate-50 font-medium">取消</button>
                <button
                  className="px-6 py-2 rounded-lg bg-brand-600 text-white hover:bg-brand-700 font-medium"
                  onClick={async () => {
                    const targets = selectedProductIds.size > 0 ? products.filter(p => selectedProductIds.has(p.id)) : products.filter(p => Object.keys(stockTakeCounts).includes(p.id));
                    for (const p of targets) {
                      const newCount = stockTakeCounts[p.id];
                      if (typeof newCount !== 'number') continue;
                      const updated: Product = { ...p, stock: { ...p.stock, [user.branchId]: newCount } };
                      await saveProduct(updated);
                    }
                    setShowStockTakeModal(false);
                    setStockTakeCounts({});
                    refreshProducts();
                  }}
                >
                  確認盤點
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Stock History Modal */}
        {showHistoryModal && historyProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
               <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                  <div>
                    <h3 className="font-bold text-lg text-slate-800">庫存變動記錄 (Stock History)</h3>
                    <p className="text-sm text-slate-500">{historyProduct.name} ({historyProduct.sku})</p>
                  </div>
                  <button onClick={() => setShowHistoryModal(false)}><X size={20} className="text-slate-400 hover:text-slate-600" /></button>
               </div>
               <div className="flex-1 overflow-y-auto p-0">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-600 font-bold sticky top-0">
                      <tr>
                        <th className="p-4">日期 (Date)</th>
                        <th className="p-4">類型 (Type)</th>
                        <th className="p-4">參考單號 (Ref)</th>
                        <th className="p-4 text-center">分店 (Branch)</th>
                        <th className="p-4 text-right">數量 (Qty)</th>
                        <th className="p-4">經手人 (User)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {historyMovements
                        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                        .map(move => (
                        <tr key={move.id} className="hover:bg-slate-50">
                          <td className="p-4 text-slate-500">{move.date}</td>
                          <td className="p-4">
                            <span className={`px-2 py-1 rounded text-xs font-bold ${
                              move.quantity > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                            }`}>
                              {move.type}
                            </span>
                          </td>
                          <td className="p-4 font-mono text-xs">{move.referenceId}</td>
                          <td className="p-4 text-center">
                             <span className="bg-slate-100 px-2 py-1 rounded text-xs font-bold text-slate-600">{branches.find(b => b.id === move.branchId)?.code || move.branchId}</span>
                          </td>
                          <td className={`p-4 text-right font-bold ${move.quantity > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                            {move.quantity > 0 ? '+' : ''}{move.quantity}
                          </td>
                          <td className="p-4 text-slate-500">{move.performedBy}</td>
                        </tr>
                      ))}
                      {historyMovements.length === 0 && (
                        <tr><td colSpan={6} className="p-8 text-center text-slate-400">沒有變動記錄</td></tr>
                      )}
                    </tbody>
                  </table>
               </div>
               <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
                  <button onClick={() => setShowHistoryModal(false)} className="px-6 py-2 bg-white border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 font-medium">
                    關閉 (Close)
                  </button>
               </div>
            </div>
          </div>
        )}

        {/* Batch Analysis Modal */}
        {showBatchAnalysisModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl w-full max-w-4xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
               <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                  <div>
                    <h3 className="font-bold text-lg text-slate-800">商品銷量分析 (Sales Analysis)</h3>
                    <p className="text-sm text-slate-500">已選擇 {selectedCount} 項商品</p>
                  </div>
                  <button onClick={() => setShowBatchAnalysisModal(false)}><X size={20} className="text-slate-400 hover:text-slate-600" /></button>
               </div>
               <div className="flex-1 overflow-y-auto p-0">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-600 font-bold sticky top-0">
                      <tr>
                        <th className="p-4">商品 (Product)</th>
                        <th className="p-4 text-right">售價 (Price)</th>
                        <th className="p-4 text-right">歷史銷量 (Sold Qty)</th>
                        <th className="p-4 text-center">總庫存 (Total Stock)</th>
                        <th className="p-4 text-center">表現 (Performance)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {isLoadingAnalytics ? (
                           <tr><td colSpan={5} className="p-8 text-center text-slate-400"><Loader2 className="animate-spin inline mr-2"/> 分析中...</td></tr>
                      ) : products.filter(p => selectedProductIds.has(p.id)).map((product: Product) => {
                        // Calculate sales from movements
                        const salesVolume = salesAnalytics[product.id] || 0;
                        
                        const totalStock = Object.values(product.stock).reduce((a: number, b: number) => a + b, 0);
                        
                        return (
                        <tr key={product.id} className="hover:bg-slate-50">
                          <td className="p-4">
                             <div className="font-bold text-slate-800">{product.name}</div>
                             <div className="text-xs text-slate-500 font-mono">{product.sku}</div>
                          </td>
                          <td className="p-4 text-right text-slate-600">${product.price.toLocaleString()}</td>
                          <td className="p-4 text-right">
                             <span className="font-bold text-slate-900 text-base">{salesVolume}</span>
                             <span className="text-xs text-slate-400 ml-1">units</span>
                          </td>
                          <td className="p-4 text-center">
                             <span className={`px-2 py-1 rounded text-xs font-bold ${totalStock <= product.lowStockThreshold ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-700'}`}>
                               {totalStock}
                             </span>
                          </td>
                          <td className="p-4 text-center">
                             {salesVolume > 5 ? (
                                <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded text-xs font-bold flex items-center justify-center gap-1 w-fit mx-auto">
                                   <TrendingUp size={12} /> Hot
                                </span>
                             ) : salesVolume > 0 ? (
                                <span className="bg-blue-50 text-blue-600 px-2 py-1 rounded text-xs font-bold w-fit mx-auto">Active</span>
                             ) : (
                                <span className="bg-slate-100 text-slate-500 px-2 py-1 rounded text-xs font-bold w-fit mx-auto">Slow</span>
                             )}
                          </td>
                        </tr>
                      )})}
                    </tbody>
                  </table>
               </div>
               <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
                  <button onClick={() => setShowBatchAnalysisModal(false)} className="px-6 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 font-medium">
                    關閉 (Close)
                  </button>
               </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Inventory;
