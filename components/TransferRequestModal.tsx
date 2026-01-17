import React, { useState, useEffect } from 'react';
import { X, Search, Trash2, FileText, ShoppingCart, Download, Save, RefreshCw } from 'lucide-react';
import { useOutletContext } from 'react-router-dom';
import { Transfer, Quotation, Order, Product, Branch } from '../types';

interface TransferRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (transfers: Transfer[]) => void;
}

type LoadSource = 'NONE' | 'QUOTATION' | 'ORDER';

interface TransferItem {
  productId: string;
  productName: string;
  productSku: string;
  quantity: number;
  currentStock: number; // Stock at source branch
}

const TransferRequestModal: React.FC<TransferRequestModalProps> = ({ isOpen, onClose, onSave }) => {
  const { user: currentUser, products, branches, categories, brands, quotations, orders } = useOutletContext<any>();
  
  const [fromBranchId, setFromBranchId] = useState(branches.find((b: Branch) => b.id !== currentUser.branchId)?.id || '');
  const [toBranchId] = useState(currentUser.branchId);
  
  const [items, setItems] = useState<TransferItem[]>([]);
  const [remark, setRemark] = useState('');
  
  // Product Search & Filter State
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterBrand, setFilterBrand] = useState('All');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [qty, setQty] = useState(1);
  const [selectedProductIdsBulk, setSelectedProductIdsBulk] = useState<string[]>([]);
  
  // Load Modal State
  const [loadSource, setLoadSource] = useState<LoadSource>('NONE');
  const [docSearch, setDocSearch] = useState('');

  // Filter Logic
  const filteredProducts: Product[] = (products as Product[]).filter((p: Product) => {
    const matchesSearch = p.name.toLowerCase().includes(productSearchTerm.toLowerCase()) || 
                          p.sku.toLowerCase().includes(productSearchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'All' || p.category === filterCategory;
    const matchesBrand = filterBrand === 'All' || p.brand === filterBrand;
    return matchesSearch && matchesCategory && matchesBrand;
  });

  // Auto-select first product when filters change
  useEffect(() => {
     if (filteredProducts.length > 0) {
        if (!selectedProductId || !filteredProducts.find(p => p.id === selectedProductId)) {
            setSelectedProductId(filteredProducts[0].id);
        }
     } else {
        setSelectedProductId('');
     }
  }, [productSearchTerm, filterCategory, filterBrand]);

  if (!isOpen) return null;

  const handleAddSelectedProducts = () => {
    if (selectedProductIdsBulk.length === 0) return;
    setItems(prev => {
      const next = [...prev];
      selectedProductIdsBulk.forEach(id => {
        const product = products.find((p: Product) => p.id === id);
        if (!product) return;
        const existingIndex = next.findIndex(i => i.productId === id);
        if (existingIndex >= 0) {
          next[existingIndex] = { ...next[existingIndex], quantity: next[existingIndex].quantity + qty };
        } else {
          next.push({
            productId: product.id,
            productName: product.name,
            productSku: product.sku,
            quantity: qty,
            currentStock: product.stock[fromBranchId] || 0
          });
        }
      });
      return next;
    });
    setSelectedProductIdsBulk([]);
  };

  const handleRemoveItem = (index: number) => {
    const newItems = [...items];
    newItems.splice(index, 1);
    setItems(newItems);
  };

  const handleUpdateQty = (index: number, newQty: number) => {
    const newItems = [...items];
    newItems[index].quantity = newQty;
    setItems(newItems);
  };

  // --- Logic to Load from Docs ---

  const handleLoadFromDoc = (doc: Quotation | Order) => {
    const newItems: TransferItem[] = doc.items.map(item => {
       const productDef = products.find((p: Product) => p.id === item.id);
       return {
         productId: item.id,
         productName: item.name,
         productSku: item.sku,
         quantity: item.quantity,
         currentStock: productDef ? (productDef.stock[fromBranchId] || 0) : 0
       };
    });

    // Merge or Replace? Let's append, but check duplicates
    const currentItems = [...items];
    newItems.forEach(newItem => {
        const existingIdx = currentItems.findIndex(ci => ci.productId === newItem.productId);
        if (existingIdx >= 0) {
            currentItems[existingIdx].quantity += newItem.quantity;
        } else {
            currentItems.push(newItem);
        }
    });
    
    setItems(currentItems);
    setLoadSource('NONE');
  };

  // --- Submit ---

  const handleSubmit = () => {
    if (items.length === 0) return;

    // Generate individual transfer records for each item
    const newTransfers: Transfer[] = items.map(item => ({
      id: `TR-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      productId: item.productId,
      productName: item.productName,
      productSku: item.productSku,
      fromBranchId,
      toBranchId,
      quantity: item.quantity,
      remark: remark.trim() || undefined,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
      createdBy: currentUser.name
    }));

    onSave(newTransfers);
  };

  const getSourceBranchName = () => branches.find((b: Branch) => b.id === fromBranchId)?.name || 'Unknown';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl w-full max-w-7xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col relative">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
           <h3 className="font-bold text-lg text-slate-800">建立調貨請求 (New Transfer Request)</h3>
           <button onClick={onClose}><X size={20} className="text-slate-400 hover:text-slate-600" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 relative">
            
            {/* DOCUMENT LOADER OVERLAY */}
            {loadSource !== 'NONE' && (
                <div className="absolute inset-0 z-10 bg-white p-6 animate-in fade-in zoom-in-95 duration-200">
                    <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-2">
                        <h4 className="font-bold text-lg text-slate-700">
                            {loadSource === 'QUOTATION' ? '從報價單載入 (Load from Quote)' : '從訂單載入 (Load from Order)'}
                        </h4>
                        <button onClick={() => setLoadSource('NONE')} className="p-1 hover:bg-slate-100 rounded"><X size={20}/></button>
                    </div>
                    
                    <div className="mb-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input 
                                type="text" 
                                placeholder="Search ID or Customer..." 
                                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                                value={docSearch}
                                onChange={(e) => setDocSearch(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="overflow-y-auto max-h-[400px] border rounded-lg">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 text-slate-500 font-bold sticky top-0">
                                <tr>
                                    <th className="p-3">單號 (ID)</th>
                                    <th className="p-3">客戶 (Customer)</th>
                                    <th className="p-3 text-right">項目 (Items)</th>
                                    <th className="p-3 text-right">日期 (Date)</th>
                                    <th className="p-3"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {(loadSource === 'QUOTATION' ? quotations : orders)
                                    .filter((d: any) => d.id.toLowerCase().includes(docSearch.toLowerCase()) || d.customer?.name.toLowerCase().includes(docSearch.toLowerCase()))
                                    .map((doc: any) => (
                                    <tr key={doc.id} className="hover:bg-slate-50">
                                        <td className="p-3 font-mono font-medium">{doc.id}</td>
                                        <td className="p-3">{doc.customer?.name || 'Walk-in'}</td>
                                        <td className="p-3 text-right">{doc.items.length}</td>
                                        <td className="p-3 text-right text-slate-500">{new Date(doc.createdAt).toLocaleDateString()}</td>
                                        <td className="p-3 text-right">
                                            <button 
                                                onClick={() => handleLoadFromDoc(doc)}
                                                className="px-3 py-1.5 bg-brand-600 text-white text-xs rounded hover:bg-brand-700 flex items-center gap-1 ml-auto"
                                            >
                                                <Download size={12} /> 載入 (Load)
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* BRANCH CONFIG & REMARK */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">來源分店 (From Branch)</label>
                    <select 
                        className="w-full border rounded-lg p-2.5 text-sm bg-white focus:ring-2 focus:ring-brand-500 outline-none"
                        value={fromBranchId}
                        onChange={(e) => setFromBranchId(e.target.value)}
                    >
                        {branches.filter((b: Branch) => b.id !== toBranchId).map((b: Branch) => (
                            <option key={b.id} value={b.id}>{b.name}</option>
                        ))}
                    </select>
                    <p className="text-[10px] text-slate-400 mt-1">從此分店調取貨物</p>
                </div>
                <div>
                     <label className="block text-xs font-bold text-slate-500 mb-1">接收分店 (To Branch)</label>
                     <div className="w-full border border-slate-200 bg-slate-100 text-slate-500 rounded-lg p-2.5 text-sm flex items-center justify-between cursor-not-allowed">
                        <span>{branches.find((b: Branch) => b.id === toBranchId)?.name}</span>
                        <span className="text-[10px] bg-slate-200 px-1.5 py-0.5 rounded">Current</span>
                     </div>
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">備註 (Remark)</label>
                    <textarea
                        className="w-full border rounded-lg p-2.5 text-sm bg-white focus:ring-2 focus:ring-brand-500 outline-none resize-none h-20"
                        placeholder="例如：急件、指定送貨時間等"
                        value={remark}
                        onChange={e => setRemark(e.target.value)}
                    />
                </div>
            </div>

            {/* ENHANCED ADD ITEMS TOOLBAR */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6">
                <div className="flex justify-between items-center mb-3">
                    <h4 className="text-xs font-bold text-slate-500 uppercase">加入產品 (Add Product)</h4>
                    <div className="flex gap-2">
                        <button 
                            onClick={() => setLoadSource('QUOTATION')}
                            className="text-xs bg-white border border-blue-200 text-blue-600 px-3 py-1.5 rounded-lg font-bold hover:bg-blue-50 flex items-center gap-1"
                        >
                            <FileText size={14} /> 載入報價單
                        </button>
                        <button 
                            onClick={() => setLoadSource('ORDER')}
                            className="text-xs bg-white border border-emerald-200 text-emerald-600 px-3 py-1.5 rounded-lg font-bold hover:bg-emerald-50 flex items-center gap-1"
                        >
                            <ShoppingCart size={14} /> 載入訂單
                        </button>
                    </div>
                </div>
                
                {/* Search & Filters */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                        <input 
                            type="text" 
                            placeholder="搜尋名稱 / SKU..." 
                            className="w-full pl-9 pr-3 py-2 border rounded text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                            value={productSearchTerm}
                            onChange={e => setProductSearchTerm(e.target.value)}
                        />
                    </div>
                    <select 
                        className="w-full border rounded p-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                        value={filterCategory}
                        onChange={e => setFilterCategory(e.target.value)}
                    >
                        {categories.map((c: string) => <option key={c} value={c}>{c === 'All' ? '所有分類 (Category)' : c}</option>)}
                    </select>
                    <select 
                        className="w-full border rounded p-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                        value={filterBrand}
                        onChange={e => setFilterBrand(e.target.value)}
                    >
                        {brands.map((b: string) => <option key={b} value={b}>{b === 'All' ? '所有品牌 (Brand)' : b}</option>)}
                    </select>
                </div>
                
                <div className="border border-dashed border-slate-200 rounded-lg mb-2 max-h-40 overflow-y-auto">
                  <div className="flex items-center justify-between px-2 py-1 text-xs text-slate-500 border-b border-slate-100 bg-slate-50">
                    <span>搜尋結果：{filteredProducts.length} 項</span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="px-2 py-1 rounded border border-slate-200 bg-white hover:bg-slate-50"
                        onClick={() => setSelectedProductIdsBulk(filteredProducts.map(p => p.id))}
                      >
                        全選
                      </button>
                      <button
                        type="button"
                        className="px-2 py-1 rounded border border-slate-200 bg-white hover:bg-slate-50"
                        onClick={() => setSelectedProductIdsBulk([])}
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
                        <th className="w-24 px-2 py-1 text-center">來源分店</th>
                        <th className="w-24 px-2 py-1 text-center">總庫存</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredProducts.map(p => {
                        const checked = selectedProductIdsBulk.includes(p.id);
                        const fromStock = p.stock[fromBranchId] || 0;
                        const totalStock = Object.values(p.stock || {}).reduce((sum, v) => sum + (v || 0), 0);
                        const fullName = `${p.sku} - ${p.name}`;
                        return (
                          <tr
                            key={p.id}
                            className={`${checked ? 'bg-brand-50 text-brand-700' : 'hover:bg-slate-50'} cursor-pointer`}
                            onClick={() =>
                              setSelectedProductIdsBulk(prev =>
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
                                  setSelectedProductIdsBulk(prev =>
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
                            <td className="px-2 py-1 text-center text-slate-700">
                              {fromStock}
                            </td>
                            <td className="px-2 py-1 text-center text-slate-700">
                              {totalStock}
                            </td>
                          </tr>
                        );
                      })}
                      {filteredProducts.length === 0 && (
                        <tr>
                          <td colSpan={5} className="text-xs text-slate-400 text-center py-2">
                            沒有符合的產品
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="mt-2 flex items-end justify-end gap-3">
                  <div className="w-20">
                    <label className="block text-[10px] font-bold text-slate-400 mb-1">數量 (Qty)</label>
                    <input 
                        type="number" 
                        min="1" 
                        className="w-full border rounded p-2 text-sm bg-white focus:ring-2 focus:ring-brand-500 outline-none" 
                        value={qty} 
                        onChange={e => setQty(Math.max(1, Number(e.target.value) || 1))} 
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleAddSelectedProducts}
                    disabled={selectedProductIdsBulk.length === 0}
                    className="px-3 py-1.5 rounded bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 disabled:opacity-40"
                  >
                    加入已選商品
                  </button>
                </div>
            </div>

            {/* ITEMS TABLE */}
            <div className="border border-slate-200 rounded-xl overflow-hidden mb-6">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-100 text-slate-600 font-bold uppercase text-xs">
                        <tr>
                            <th className="p-3 w-12 text-center">#</th>
                            <th className="p-3">產品資料 (Product)</th>
                            <th className="p-3 text-center">來源庫存 (Stock)</th>
                            <th className="p-3 text-center w-32">請求數量 (Qty)</th>
                            <th className="p-3 w-16"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {items.map((item, index) => {
                             // Re-check stock in case source branch changed
                             const productDef = products.find((p: Product) => p.id === item.productId);
                             const currentStock = productDef ? (productDef.stock[fromBranchId] || 0) : 0;
                             
                             return (
                                <tr key={index} className="hover:bg-slate-50">
                                    <td className="p-3 text-center text-slate-400">{index + 1}</td>
                                    <td className="p-3">
                                        <div className="font-bold text-slate-800">{item.productSku}</div>
                                        <div className="text-xs text-slate-500 line-clamp-1">{item.productName}</div>
                                    </td>
                                    <td className="p-3 text-center">
                                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${currentStock < item.quantity ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-600'}`}>
                                            {currentStock}
                                        </span>
                                    </td>
                                    <td className="p-3 text-center">
                                        <input 
                                            type="number" 
                                            min="1"
                                            className="w-20 text-center border rounded p-1.5 focus:ring-2 focus:ring-brand-500 outline-none"
                                            value={item.quantity}
                                            onChange={(e) => handleUpdateQty(index, parseInt(e.target.value) || 1)}
                                        />
                                    </td>
                                    <td className="p-3 text-center">
                                        <button 
                                            onClick={() => handleRemoveItem(index)}
                                            className="text-slate-300 hover:text-red-500 p-1.5 rounded hover:bg-red-50 transition-colors"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                             );
                        })}
                        {items.length === 0 && (
                            <tr>
                                <td colSpan={5} className="p-8 text-center text-slate-400">
                                    <div className="flex flex-col items-center">
                                        <RefreshCw size={32} className="opacity-20 mb-2" />
                                        <p>清單是空的 (List is empty)</p>
                                        <p className="text-xs mt-1">請加入產品或從文件載入</p>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {items.length > 0 && (
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 flex gap-3 text-sm text-blue-700">
                    <div className="font-bold flex-shrink-0">摘要:</div>
                    <div>
                        將會建立 <span className="font-bold">{items.length}</span> 張調貨單，
                        從 <span className="font-bold">{getSourceBranchName()}</span> 調往 <span className="font-bold">{branches.find((b: Branch)=>b.id===toBranchId)?.name}</span>。
                    </div>
                </div>
            )}
        </div>

        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
            <button onClick={onClose} className="px-6 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-600 hover:bg-slate-50 font-bold transition-colors">
                取消 (Cancel)
            </button>
            <button 
                onClick={handleSubmit}
                disabled={items.length === 0}
                className="px-6 py-2.5 rounded-xl bg-brand-600 text-white hover:bg-brand-700 font-bold shadow-lg shadow-brand-200 disabled:opacity-50 disabled:shadow-none flex items-center gap-2 transition-colors"
            >
                <Save size={18} /> 提交請求 (Submit Request)
            </button>
        </div>

      </div>
    </div>
  );
};

export default TransferRequestModal;
