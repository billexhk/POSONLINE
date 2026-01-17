
import React, { useState, useEffect } from 'react';
import { X, Save, Barcode } from 'lucide-react';
import { Product, Supplier, Branch, StockInRecord } from '../types';
import { API_BASE_URL } from '../App';
import { useOutletContext } from 'react-router-dom';

type ProductMode = 'CREATE' | 'EDIT' | 'VIEW';

interface ProductModalProps {
  mode: ProductMode;
  product?: Product;
  branchId: string;
  onClose: () => void;
  onSave: (p: Product) => void;
  categories: string[];
  brands: string[];
  suppliers: Supplier[]; // New Prop
  existingProducts: Product[];
  branches: Branch[];
}

const ProductModal: React.FC<ProductModalProps> = ({ mode, product, branchId, onClose, onSave, categories, brands, suppliers, existingProducts, branches }) => {
  const { authToken } = useOutletContext<any>();
  const isView = mode === 'VIEW';
  const isEdit = mode === 'EDIT';
  const isCreate = mode === 'CREATE';

  const [form, setForm] = useState({
    name: product?.name || '', 
    webName: product?.webName || '', // New Field
    productUrl: product?.productUrl || '', // New Field
    sku: product?.sku || '',  
    barcode: product?.barcode || '', 
    ean: product?.ean || '',
    cost: product?.cost || 0, 
    price: product?.price || 0, 
    webPrice: product?.webPrice || 0,
    srp: product?.srp || 0, 
    stock: product?.stock[branchId] || 0, 
    lowStockThreshold: product?.lowStockThreshold ?? 0,
    category: product?.category || categories[1] || 'General',
    brand: product?.brand || brands[1] || 'Generic',
    supplierId: product?.supplierId || '', // New Field
    description: product?.description || '',
    trackStock: product?.trackStock ?? true
  });

  const [costHistory, setCostHistory] = useState<StockInRecord[]>([]);
  const [isLoadingCostHistory, setIsLoadingCostHistory] = useState(false);
  const [showCostHistory, setShowCostHistory] = useState(false);
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [batchRecords, setBatchRecords] = useState<StockInRecord[]>([]);
  const [isLoadingBatch, setIsLoadingBatch] = useState(false);

  useEffect(() => {
    if (!product?.id) {
      setCostHistory([]);
      return;
    }
    setIsLoadingCostHistory(true);
    fetch(`${API_BASE_URL}/get_stock_in_records.php?productId=${product.id}`, {
      headers: authToken ? { 'X-Auth-Token': authToken } : undefined,
    })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setCostHistory(data);
        } else {
          setCostHistory([]);
        }
      })
      .catch(() => {
        setCostHistory([]);
      })
      .finally(() => {
        setIsLoadingCostHistory(false);
      });
  }, [product?.id]);

  const openBatchDetails = (batchId: string | undefined) => {
    if (!batchId) return;
    setSelectedBatchId(batchId);
    setIsLoadingBatch(true);
    setBatchRecords([]);
    fetch(`${API_BASE_URL}/get_stock_in_records.php?batchId=${batchId}`, {
      headers: authToken ? { 'X-Auth-Token': authToken } : undefined,
    })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setBatchRecords(data);
        } else {
          setBatchRecords([]);
        }
      })
      .catch(() => {
        setBatchRecords([]);
      })
      .finally(() => {
        setIsLoadingBatch(false);
      });
  };

  const closeBatchDetails = () => {
    setSelectedBatchId(null);
    setBatchRecords([]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check for duplicate SKU
    const isDuplicateSku = existingProducts.some(p => 
      p.sku.toLowerCase() === form.sku.trim().toLowerCase() && 
      p.id !== product?.id
    );

    if (isDuplicateSku) {
      alert(`SKU '${form.sku}' already exists! Please use a unique SKU.`);
      return;
    }

    // Create stock object
    const updatedStock = product 
      ? { ...product.stock, [branchId]: form.stock }
      : { [branchId]: form.stock };

    // Remove stock (number) from form spread to avoid type conflict with Product.stock
    const { stock: _stockQty, ...formFields } = form;

    const newProduct: Product = {
      id: product?.id || 'p' + Date.now(),
      imageUrl: product?.imageUrl || '',
      ...formFields,
      stock: updatedStock,
    };
    onSave(newProduct);
  };

  const modalTitle = isView ? '查看商品 (View Product)' : (isEdit ? '編輯商品 (Edit Product)' : '新增商品 (Add Product)');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
           <h3 className="font-bold text-lg text-slate-800">{modalTitle}</h3>
           <button onClick={onClose}><X size={20} className="text-slate-400 hover:text-slate-600" /></button>
        </div>
        
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
           {/* Basic Info */}
           <div className="grid grid-cols-3 gap-4">
             <div>
               <label className="block text-xs font-bold text-slate-500 mb-1">SKU</label>
               <input 
                 disabled={isView} 
                 required 
                 className="w-full border rounded p-2 text-sm disabled:bg-slate-50 disabled:text-slate-500" 
                 value={form.sku} 
                 onChange={e => setForm({...form, sku: e.target.value})} 
               />
             </div>
             <div>
               <label className="block text-xs font-bold text-slate-500 mb-1">條碼 (Barcode)</label>
               <input 
                 disabled={isView} 
                 className="w-full border rounded p-2 text-sm disabled:bg-slate-50 disabled:text-slate-500" 
                 value={form.barcode} 
                 onChange={e => setForm({...form, barcode: e.target.value})} 
               />
             </div>
             <div>
               <label className="block text-xs font-bold text-slate-500 mb-1">EAN Code</label>
               <div className="relative">
                 <Barcode className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                 <input 
                   disabled={isView} 
                   className="w-full border rounded p-2 pl-8 text-sm disabled:bg-slate-50 disabled:text-slate-500" 
                   value={form.ean} 
                   onChange={e => setForm({...form, ean: e.target.value})} 
                   placeholder="EAN-13"
                 />
               </div>
             </div>
           </div>

           <div>
               <label className="block text-xs font-bold text-slate-500 mb-1">商品名稱 (Name)</label>
               <input 
                 disabled={isView} 
                 required 
                 className="w-full border rounded p-2 text-sm disabled:bg-slate-50 disabled:text-slate-500" 
                 value={form.name} 
                 onChange={e => setForm({...form, name: e.target.value})} 
               />
           </div>

           <div>
               <label className="block text-xs font-bold text-slate-500 mb-1">網站商品名稱 (Web Product Name)</label>
               <input 
                 disabled={isView} 
                 className="w-full border rounded p-2 text-sm disabled:bg-slate-50 disabled:text-slate-500" 
                 value={form.webName} 
                 onChange={e => setForm({...form, webName: e.target.value})} 
                 placeholder="Optional custom name for website"
               />
           </div>

           <div>
               <label className="block text-xs font-bold text-slate-500 mb-1">商品網址 (Product URL)</label>
               <input 
                 disabled={isView} 
                 className="w-full border rounded p-2 text-sm disabled:bg-slate-50 disabled:text-slate-500" 
                 value={form.productUrl} 
                 onChange={e => setForm({...form, productUrl: e.target.value})} 
                 placeholder="https://..."
               />
           </div>

           <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">分類 (Category)</label>
                <select 
                   disabled={isView}
                   className="w-full border rounded p-2 text-sm bg-white disabled:bg-slate-50 disabled:text-slate-500"
                   value={form.category}
                   onChange={(e) => setForm({...form, category: e.target.value})}
                >
                   {categories.filter(c => c !== 'All').map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">品牌 (Brand)</label>
                <select 
                   disabled={isView}
                   className="w-full border rounded p-2 text-sm bg-white disabled:bg-slate-50 disabled:text-slate-500"
                   value={form.brand}
                   onChange={(e) => setForm({...form, brand: e.target.value})}
                >
                   {brands.filter(b => b !== 'All').map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">供應商 (Supplier)</label>
                <select 
                   disabled={isView}
                   className="w-full border rounded p-2 text-sm bg-white disabled:bg-slate-50 disabled:text-slate-500"
                   value={form.supplierId}
                   onChange={(e) => setForm({...form, supplierId: e.target.value})}
                >
                   <option value="">未指定 (None)</option>
                   {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
           </div>

           <div>
               <label className="block text-xs font-bold text-slate-500 mb-1">產品描述 (Description)</label>
               <textarea 
                  disabled={isView} 
                  className="w-full border rounded p-2 text-sm disabled:bg-slate-50 disabled:text-slate-500" 
                  rows={3}
                  value={form.description} 
                  onChange={e => setForm({...form, description: e.target.value})} 
               />
           </div>

           {/* Pricing & Stock */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
             <h4 className="text-xs font-bold text-slate-500 uppercase mb-3">價格與庫存 (Pricing & Stock)</h4>
             
             {/* Track Stock Toggle */}
             <div className="mb-4 flex items-center">
                <input 
                    type="checkbox"
                    id="trackStock"
                    disabled={isView}
                    className="w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500 cursor-pointer"
                    checked={form.trackStock}
                    onChange={(e) => setForm({...form, trackStock: e.target.checked})}
                />
                <label htmlFor="trackStock" className="ml-2 text-sm font-medium text-slate-700 cursor-pointer">
                    扣除庫存 (Track Stock Quantity)
                </label>
             </div>

             <div className="grid grid-cols-4 gap-4 mb-4">
               <div>
                 <label className="block text-xs font-bold text-slate-500 mb-1">成本 (Cost)</label>
                 <input 
                   disabled={isView} 
                   type="number" 
                   className="w-full border rounded p-2 text-sm disabled:bg-slate-100 disabled:text-slate-500" 
                   value={form.cost} 
                   onChange={e => setForm({...form, cost: Number(e.target.value)})} 
                 />
               </div>
               <div>
                 <label className="block text-xs font-bold text-slate-500 mb-1">售價 (Price)</label>
                 <input 
                   disabled={isView} 
                   type="number" 
                   required 
                   className="w-full border rounded p-2 text-sm disabled:bg-slate-100 disabled:text-slate-500" 
                   value={form.price} 
                   onChange={e => setForm({...form, price: Number(e.target.value)})} 
                 />
               </div>
               <div>
                 <label className="block text-xs font-bold text-slate-500 mb-1">網上價 (Web Price)</label>
                 <input 
                   disabled={isView} 
                   type="number" 
                   className="w-full border rounded p-2 text-sm disabled:bg-slate-100 disabled:text-slate-500" 
                   value={form.webPrice} 
                   onChange={e => setForm({...form, webPrice: Number(e.target.value)})} 
                 />
               </div>
               <div>
                 <label className="block text-xs font-bold text-slate-500 mb-1">建議價 (SRP)</label>
                 <input 
                   disabled={isView} 
                   type="number" 
                   className="w-full border rounded p-2 text-sm disabled:bg-slate-100 disabled:text-slate-500" 
                   value={form.srp} 
                   onChange={e => setForm({...form, srp: Number(e.target.value)})} 
                 />
               </div>
             </div>

             <div className={`grid grid-cols-2 gap-4 transition-opacity ${!form.trackStock ? 'opacity-50 pointer-events-none' : ''}`}>
               <div>
                 <label className="block text-xs font-bold text-slate-500 mb-1">庫存參數 (L/T)</label>
                 <input 
                    disabled={isView}
                    type="number" 
                    className="w-full border border-slate-300 rounded p-2 text-sm disabled:bg-slate-100 disabled:text-slate-500" 
                    value={form.lowStockThreshold} 
                    onChange={e => setForm({...form, lowStockThreshold: Number(e.target.value)})} 
                 />
               </div>
               {isCreate ? (
                 <div>
                   <label className="block text-xs font-bold text-slate-700 mb-1">初始庫存 (Initial Stock)</label>
                   <input type="number" className="w-full border border-slate-300 rounded p-2 text-sm bg-white" value={form.stock} onChange={e => setForm({...form, stock: Number(e.target.value)})} />
                   <p className="text-[10px] text-slate-400 mt-1">只適用於當前分店 (Current Branch Only)</p>
                 </div>
               ) : (
                 <div className="col-span-1">
                    <label className="block text-xs font-bold text-slate-500 mb-1">總庫存 (Total Stock)</label>
                    <div className="p-2 bg-slate-200 text-slate-600 rounded text-sm font-bold">
                      {product ? Object.values(product.stock).reduce((a: number, b: number) => a + b, 0) : 0}
                    </div>
                 </div>
               )}
             </div>

             {!isCreate && product && form.trackStock && (
               <div className="mt-4 border-t border-slate-200 pt-3 space-y-3">
                 <div>
                   <label className="block text-xs font-bold text-slate-400 mb-2">分店庫存分佈 (Branch Breakdown)</label>
                   <div className="flex gap-2">
                      {branches.map(b => (
                        <div key={b.id} className="flex-1 bg-white border border-slate-200 p-2 rounded text-center">
                           <div className="text-[10px] text-slate-500">{b.code}</div>
                           <div className={`font-bold ${product.stock[b.id] <= product.lowStockThreshold ? 'text-red-500' : 'text-slate-800'}`}>
                             {product.stock[b.id] || 0}
                           </div>
                        </div>
                      ))}
                   </div>
                 </div>

                 <div>
                   <div className="flex items-center justify-between mb-2">
                     <label className="block text-xs font-bold text-slate-400">歷史入庫成本 (Stock In Cost History)</label>
                     <button
                       type="button"
                       className="text-[11px] px-2 py-1 rounded border border-slate-300 text-slate-600 hover:bg-slate-100"
                       onClick={() => setShowCostHistory(!showCostHistory)}
                     >
                       {showCostHistory ? '隱藏' : '顯示'}
                     </button>
                   </div>
                   {showCostHistory && (
                     <div className="bg-white border border-slate-200 rounded">
                       {isLoadingCostHistory ? (
                         <div className="p-3 text-xs text-slate-500">載入中...</div>
                       ) : costHistory.length === 0 ? (
                         <div className="p-3 text-xs text-slate-400">暫無入庫記錄</div>
                       ) : (
                        <div className="max-h-40 overflow-y-auto">
                          <table className="w-full text-[11px]">
                            <thead className="bg-slate-50 text-slate-500">
                              <tr>
                                <th className="px-2 py-1 text-left">日期</th>
                                <th className="px-2 py-1 text-left">入庫單號</th>
                                <th className="px-2 py-1 text-left">供應商</th>
                                <th className="px-2 py-1 text-left">供應商單號</th>
                                <th className="px-2 py-1 text-right">數量</th>
                                <th className="px-2 py-1 text-right">單價</th>
                              </tr>
                            </thead>
                            <tbody>
                              {costHistory.map(r => (
                                <tr key={r.id} className="border-t border-slate-100">
                                  <td className="px-2 py-1 text-slate-600 whitespace-nowrap">{r.date}</td>
                                  <td className="px-2 py-1 text-slate-600 whitespace-nowrap">
                                    {r.batchId ? (
                                      <button
                                        type="button"
                                        className="text-blue-600 hover:underline"
                                        onClick={() => openBatchDetails(r.batchId)}
                                      >
                                        {r.batchId}
                                      </button>
                                    ) : (
                                      <span className="text-slate-400">-</span>
                                    )}
                                  </td>
                                  <td className="px-2 py-1 text-slate-600 truncate max-w-[120px]">{r.supplierName}</td>
                                  <td className="px-2 py-1 text-slate-500 font-mono truncate max-w-[120px]">
                                    {r.supplierDocNo || '-'}
                                  </td>
                                  <td className="px-2 py-1 text-right text-slate-700">{r.quantity}</td>
                                  <td className="px-2 py-1 text-right text-slate-700">${r.unitCost.toLocaleString()}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                       )}
                     </div>
                   )}
                 </div>
               </div>
             )}
           </div>
        </form>

        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
          <button onClick={onClose} className="px-6 py-2 rounded-lg border border-slate-300 bg-white text-slate-600 hover:bg-slate-50 font-medium">
             {isView ? '關閉 (Close)' : '取消 (Cancel)'}
           </button>
          {!isView && (
            <button 
              onClick={(e) => handleSubmit(e as any)} 
              className="px-6 py-2 rounded-lg bg-brand-600 text-white hover:bg-brand-700 font-bold flex items-center gap-2"
            >
              <Save size={18} /> {isEdit ? '儲存變更 (Save)' : '新增商品 (Create)'}
            </button>
          )}
        </div>
      </div>

      {selectedBatchId && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-900/70 p-4">
          <div className="bg-white rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl max-h-[80vh] flex flex-col">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div>
                <h4 className="font-bold text-base text-slate-800">入庫單明細 (Batch Details)</h4>
                <div className="text-xs text-slate-500 mt-1">入庫單號: {selectedBatchId}</div>
              </div>
              <button onClick={closeBatchDetails}>
                <X size={18} className="text-slate-400 hover:text-slate-600" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {isLoadingBatch ? (
                <div className="text-sm text-slate-500">載入中...</div>
              ) : batchRecords.length === 0 ? (
                <div className="text-sm text-slate-400">此入庫單沒有明細記錄</div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                    <tr>
                      <th className="px-3 py-2 text-left">日期</th>
                      <th className="px-3 py-2 text-left">商品</th>
                      <th className="px-3 py-2 text-left">供應商</th>
                      <th className="px-3 py-2 text-left">供應商單號</th>
                      <th className="px-3 py-2 text-right">數量</th>
                      <th className="px-3 py-2 text-right">單價</th>
                      <th className="px-3 py-2 text-right">小計</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {batchRecords.map(r => (
                      <tr key={r.id}>
                        <td className="px-3 py-2 text-slate-600 whitespace-nowrap">{r.date}</td>
                        <td className="px-3 py-2 text-slate-700">{r.productName}</td>
                        <td className="px-3 py-2 text-slate-600">{r.supplierName}</td>
                        <td className="px-3 py-2 text-slate-500 font-mono whitespace-nowrap">
                          {r.supplierDocNo || '-'}
                        </td>
                        <td className="px-3 py-2 text-right text-slate-700">{r.quantity}</td>
                        <td className="px-3 py-2 text-right text-slate-700">
                          ${r.unitCost.toLocaleString()}
                        </td>
                        <td className="px-3 py-2 text-right text-slate-800 font-medium">
                          ${(r.totalCost ?? r.quantity * r.unitCost).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div className="p-3 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button
                type="button"
                onClick={closeBatchDetails}
                className="px-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 text-sm"
              >
                關閉
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductModal;
