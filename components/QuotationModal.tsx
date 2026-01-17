import React, { useState, useEffect } from 'react';
import { Printer, X, Trash2, Eye, EyeOff, Save, RefreshCw, Search, FileCheck } from 'lucide-react';
import { Quotation, CartItem, User, Customer, Product } from '../types';

const safeNumber = (value: unknown): number => {
  if (typeof value !== 'number') return 0;
  if (!Number.isFinite(value)) return 0;
  return value;
};

export interface QuotationModalProps {
  mode: 'CREATE' | 'EDIT' | 'VIEW';
  quotation?: Quotation;
  allQuotations: Quotation[];
  currentUser: User;
  products: Product[];
  customers: Customer[];
  users: User[];
  categories: string[];
  brands: string[];
  onClose: () => void;
  onSave: (q: Quotation) => void;
  onPrint?: () => void;
  onPrintProforma?: () => void;
  // New props for POS integration
  initialItems?: CartItem[];
  initialCustomer?: Customer | null;
}

const QuotationModal: React.FC<QuotationModalProps> = ({ 
    mode, 
    quotation, 
    allQuotations = [], 
    currentUser, 
    products = [],
    customers = [],
    users = [],
    categories = [],
    brands = [],
    onClose, 
    onSave, 
    onPrint, 
    onPrintProforma,
    initialItems = [],
    initialCustomer = null
}) => {
  const isViewMode = mode === 'VIEW';
  const isEditMode = mode === 'EDIT';

  // Form State
  const [prefix, setPrefix] = useState('QT'); // Default prefix
  const [customId, setCustomId] = useState(quotation?.id || '');
  const [customerId, setCustomerId] = useState(quotation?.customer?.id || initialCustomer?.id || '');
  const [createdAt, setCreatedAt] = useState(quotation?.createdAt || new Date().toISOString().split('T')[0]);
  const [validUntil, setValidUntil] = useState(quotation?.validUntil || new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0]);
  const [items, setItems] = useState<CartItem[]>(
    quotation ? JSON.parse(JSON.stringify(quotation.items)) : JSON.parse(JSON.stringify(initialItems))
  );
  const [handledBy, setHandledBy] = useState(quotation?.createdBy || currentUser.name);
  
  // UI State
  const [showCost, setShowCost] = useState(false);
  
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterBrand, setFilterBrand] = useState('All');

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(productSearchTerm.toLowerCase()) || 
                          p.sku.toLowerCase().includes(productSearchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'All' || p.category === filterCategory;
    const matchesBrand = filterBrand === 'All' || p.brand === filterBrand;
    return matchesSearch && matchesCategory && matchesBrand;
  });

  const [selectedProductId, setSelectedProductId] = useState('');
  const [qty, setQty] = useState(1);
  const [selectedProductIdsBulk, setSelectedProductIdsBulk] = useState<string[]>([]);

  // Initialize ID on open if creating
  useEffect(() => {
    if (!quotation && customId === '') {
        generateNextId('QT');
    }
  }, []);

  // Initialize selected product when filtered list changes
  useEffect(() => {
     if (filteredProducts.length > 0) {
        // Only reset if current selection is invalid or empty
        if (!selectedProductId || !filteredProducts.find(p => p.id === selectedProductId)) {
            setSelectedProductId(filteredProducts[0].id);
        }
     } else {
        setSelectedProductId('');
     }
  }, [filteredProducts, selectedProductId]);


  // Update customer if initialCustomer changes (when opening from POS)
  useEffect(() => {
    if (!quotation && initialCustomer) {
        setCustomerId(initialCustomer.id);
    }
  }, [initialCustomer, quotation]);

  // Update items if initialItems changes
  useEffect(() => {
    if (!quotation && initialItems.length > 0) {
        setItems(JSON.parse(JSON.stringify(initialItems)));
    }
  }, [initialItems, quotation]);

  const generateNextId = (p: string) => {
      const cleanPrefix = p.trim().toUpperCase();
      // Find all IDs starting with this prefix
      const matches = allQuotations.filter(q => q.id.startsWith(cleanPrefix));
      
      let nextNumString = '';
      
      if (matches.length > 0) {
        // Try to find the max number sequence
        let maxNum = 0;
        let maxLen = 0;
        
        matches.forEach(q => {
            const numPart = q.id.substring(cleanPrefix.length);
            // Check if rest is a number
            if (/^\d+$/.test(numPart)) {
                const num = parseInt(numPart, 10);
                if (num > maxNum) maxNum = num;
                if (numPart.length > maxLen) maxLen = numPart.length;
            }
        });

        // Use standard length if extracted length is small, otherwise maintain structure
        const targetLen = maxLen > 0 ? maxLen : 4; 
        nextNumString = (maxNum + 1).toString().padStart(targetLen, '0');
      } else {
        // Default format: YYMM + 0001
        const dateStr = new Date().toISOString().slice(2, 7).replace('-', ''); // 2502
        nextNumString = `${dateStr}0001`;
      }

      setCustomId(`${cleanPrefix}${nextNumString}`);
  };

  const handlePrefixChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value.toUpperCase();
      setPrefix(val);
      if (!isViewMode && val.length > 0) {
        generateNextId(val);
      }
  };

  const addSelectedProducts = () => {
    if (selectedProductIdsBulk.length === 0) return;
    setItems(prev => {
      let next = [...prev];
      selectedProductIdsBulk.forEach(id => {
        const product = filteredProducts.find(p => p.id === id);
        if (!product) return;
        const existing = next.find(i => i.id === id);
        if (existing) {
          next = next.map(i => i.id === id ? { ...i, quantity: i.quantity + qty } : i);
        } else {
          next.push({ ...product, quantity: qty, discount: 0 });
        }
      });
      return next;
    });
    setSelectedProductIdsBulk([]);
  };

  const removeItem = (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const updateItemField = (id: string, field: keyof CartItem, value: string | number) => {
    setItems(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, [field]: value };
      }
      return item;
    }));
  };

  const subtotal = items.reduce((acc, i) => acc + (safeNumber(i.price) * i.quantity), 0);
  const totalCost = items.reduce((acc, i) => acc + (safeNumber(i.cost) * i.quantity), 0);
  const totalDiscount = items.reduce((acc, i) => acc + (safeNumber(i.discount) * i.quantity), 0);
  const total = subtotal - totalDiscount;
  const gp = total - totalCost;
  const gpMargin = total > 0 ? (gp / total) * 100 : 0;

  const handleSave = () => {
    const customer = customers.find(c => c.id === customerId);
    
    const newQuote: Quotation = {
      id: customId,
      customer, // Undefined if walk-in
      items,
      subtotal,
      totalDiscount,
      total,
      status: quotation?.status || 'DRAFT',
      validUntil,
      createdAt: createdAt,
      createdBy: handledBy,
      branchId: quotation?.branchId || currentUser.branchId
    };
    onSave(newQuote);
  };

  const modalTitle = isViewMode ? `查看報價單` : (isEditMode ? `編輯報價單` : '建立新報價單');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl w-full max-w-7xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
           <div className="flex items-center gap-3">
             <h3 className="font-bold text-lg text-slate-800">{modalTitle}</h3>
             {isViewMode && <span className="text-slate-500 text-sm font-mono">{quotation?.id}</span>}
           </div>
           <div className="flex items-center gap-2">
             <button 
                onClick={() => setShowCost(!showCost)}
                className={`p-2 rounded-lg transition-colors ${showCost ? 'bg-orange-100 text-orange-600' : 'text-slate-400 hover:text-slate-600'}`}
                title={showCost ? "隱藏成本 (Hide Cost)" : "顯示成本 (Show Cost)"}
             >
               {showCost ? <Eye size={20} /> : <EyeOff size={20} />}
             </button>
             <button onClick={onClose}><X size={20} className="text-slate-400 hover:text-slate-600" /></button>
           </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            {!isViewMode && (
              <div className="md:col-span-1">
                 <label className="block text-xs font-bold text-slate-500 mb-1">字首 (Prefix)</label>
                 <div className="flex gap-2">
                    <input 
                      type="text" 
                      className="w-20 border rounded p-2 text-sm font-mono text-center uppercase"
                      value={prefix}
                      onChange={handlePrefixChange}
                      placeholder="QT"
                    />
                     <div className="flex-1 relative">
                        <input 
                        type="text" 
                        className="w-full border rounded p-2 text-sm font-mono"
                        value={customId}
                        onChange={e => setCustomId(e.target.value)}
                        />
                         <button 
                           onClick={() => generateNextId(prefix)}
                           className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-brand-600"
                           title="Regenerate ID"
                         >
                           <RefreshCw size={14} />
                         </button>
                     </div>
                 </div>
                 <p className="text-[10px] text-slate-400 mt-1">輸入字首自動生成編號</p>
              </div>
            )}
            <div className="md:col-span-1">
              <label className="block text-xs font-bold text-slate-500 mb-1">客戶 (Customer)</label>
              <select 
                disabled={isViewMode}
                className="w-full border rounded p-2 text-sm bg-white disabled:bg-slate-100 disabled:text-slate-500"
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
              >
                <option value="">Walk-in Customer (零售客)</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            
            <div className="md:col-span-1">
              <label className="block text-xs font-bold text-slate-500 mb-1">建立日期 (Date)</label>
              <input 
                disabled={isViewMode}
                type="date"
                className="w-full border rounded p-2 text-sm disabled:bg-slate-100 disabled:text-slate-500"
                value={createdAt}
                onChange={(e) => setCreatedAt(e.target.value)}
              />
            </div>

             <div className="md:col-span-1">
              <label className="block text-xs font-bold text-slate-500 mb-1">有效期 (Valid Until)</label>
              <input 
                disabled={isViewMode}
                type="date"
                className="w-full border rounded p-2 text-sm disabled:bg-slate-100 disabled:text-slate-500"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
              />
            </div>
            <div className="md:col-span-1">
              <label className="block text-xs font-bold text-slate-500 mb-1">經手人 (Handled By)</label>
              <select 
                disabled={isViewMode}
                className="w-full border rounded p-2 text-sm bg-white disabled:bg-slate-100 disabled:text-slate-500"
                value={handledBy}
                onChange={(e) => setHandledBy(e.target.value)}
              >
                 {users.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
              </select>
            </div>
          </div>

          {/* Add Item Section - Hide in View Mode */}
          {!isViewMode && (
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6">
              <h4 className="text-xs font-bold text-slate-500 uppercase mb-3">加入產品 (Add Item)</h4>
              
              {/* Product Filters */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                  <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                      <input 
                          type="text" 
                          placeholder="搜尋名稱 / SKU..." 
                          className="w-full pl-9 pr-3 py-2 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                          value={productSearchTerm}
                          onChange={e => setProductSearchTerm(e.target.value)}
                      />
                  </div>
                  <select 
                      className="w-full border rounded p-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                      value={filterCategory}
                      onChange={e => setFilterCategory(e.target.value)}
                  >
                      {categories.map(c => <option key={c} value={c}>{c === 'All' ? '所有分類 (Category)' : c}</option>)}
                  </select>
                  <select 
                      className="w-full border rounded p-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                      value={filterBrand}
                      onChange={e => setFilterBrand(e.target.value)}
                  >
                      {brands.map(b => <option key={b} value={b}>{b === 'All' ? '所有品牌 (Brand)' : b}</option>)}
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
                      <th className="w-20 px-2 py-1 text-right">售價</th>
                      <th className="w-24 px-2 py-1 text-center">當前分店</th>
                      <th className="w-24 px-2 py-1 text-center">總庫存</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProducts.map(p => {
                      const checked = selectedProductIdsBulk.includes(p.id);
                      const currentStock = p.stock[currentUser.branchId] || 0;
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
                    {filteredProducts.length === 0 && (
                      <tr>
                        <td colSpan={6} className="text-xs text-slate-400 text-center py-2">
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
                    min={1}
                    className="w-full border rounded p-2 text-sm"
                    value={qty}
                    onChange={e => setQty(Math.max(1, Number(e.target.value) || 1))}
                  />
                </div>
                <button
                  type="button"
                  onClick={addSelectedProducts}
                  disabled={selectedProductIdsBulk.length === 0}
                  className="px-3 py-1.5 rounded bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 disabled:opacity-40"
                >
                  加入已選商品
                </button>
              </div>
            </div>
          )}

          {/* Items Table - Inline Editing */}
          <div className="border border-slate-200 rounded-lg overflow-hidden mb-6">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold">
                <tr>
                  <th className="py-3 px-4 w-12">#</th>
                  <th className="py-3 px-4 w-[40%]">產品描述 (Description)</th>
                  {showCost && <th className="py-3 px-4 text-right w-24 bg-orange-50 text-orange-700 border-l border-orange-100">成本 (Cost)</th>}
                  <th className="py-3 px-4 text-right w-24">單價 (Price)</th>
                  <th className="py-3 px-4 text-center w-20">數量</th>
                  <th className="py-3 px-4 text-right w-24">折扣 (Disc.)</th>
                  <th className="py-3 px-4 text-right w-32">小計 (Subtotal)</th>
                  {!isViewMode && <th className="py-3 px-4 w-10"></th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item, index) => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 text-slate-400">{index + 1}</td>
                    <td className="py-2 px-4">
                      {isViewMode ? (
                        <div className="py-1.5">{item.description || item.name}</div>
                      ) : (
                        <textarea
                          rows={2}
                          className="w-full text-sm border-gray-200 rounded p-1.5 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 resize-none"
                          value={item.description || ''}
                          onChange={(e) => updateItemField(item.id, 'description', e.target.value)}
                          placeholder={item.name}
                        />
                      )}
                      <div className="text-[10px] text-slate-400 mt-1 font-mono">SKU: {item.sku}</div>
                    </td>
                    
                    {/* Cost Column (Conditional) */}
                    {showCost && (
                      <td className="py-2 px-4 bg-orange-50/50 border-l border-orange-50">
                        {isViewMode ? (
                          <div className="text-right text-orange-700 py-1.5">${safeNumber(item.cost).toLocaleString()}</div>
                        ) : (
                          <input 
                            type="number"
                            className="w-full text-right text-xs bg-orange-50 text-orange-700 border-orange-100 rounded p-1 focus:ring-2 focus:ring-orange-500 outline-none"
                            value={safeNumber(item.cost)}
                            onChange={(e) => updateItemField(item.id, 'cost', Number(e.target.value))}
                          />
                        )}
                      </td>
                    )}

                    <td className="py-2 px-4 text-center">
                       {isViewMode ? (
                         <div className="py-1.5">{item.quantity}</div>
                       ) : (
                         <input 
                          type="number"
                          min="1"
                          className="w-full text-center border-gray-200 rounded p-1 focus:ring-2 focus:ring-brand-500 outline-none"
                          value={item.quantity}
                          onChange={(e) => updateItemField(item.id, 'quantity', Number(e.target.value))}
                        />
                       )}
                    </td>
                    <td className="py-2 px-4">
                      {isViewMode ? (
                        <div className="text-right font-medium py-1.5">${safeNumber(item.price).toLocaleString()}</div>
                      ) : (
                         <input 
                          type="number"
                          className="w-full text-right font-medium border-gray-200 rounded p-1 focus:ring-2 focus:ring-brand-500 outline-none"
                          value={safeNumber(item.price)}
                          onChange={(e) => updateItemField(item.id, 'price', Number(e.target.value))}
                        />
                      )}
                    </td>
                    <td className="py-2 px-4">
                       {isViewMode ? (
                         <div className="text-right text-red-600 py-1.5">
                           {safeNumber(item.discount) > 0 ? `-${safeNumber(item.discount)}` : '-'}
                         </div>
                       ) : (
                         <input 
                          type="number"
                          min="0"
                          className="w-full text-right text-red-600 border-gray-200 rounded p-1 focus:ring-2 focus:ring-brand-500 outline-none"
                          value={safeNumber(item.discount)}
                          onChange={(e) => updateItemField(item.id, 'discount', Number(e.target.value))}
                        />
                       )}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-800">
                      ${((safeNumber(item.price) - safeNumber(item.discount)) * item.quantity).toLocaleString()}
                    </td>
                    {!isViewMode && (
                      <td className="py-3 px-4 text-center">
                        <button onClick={() => removeItem(item.id)} className="text-slate-300 hover:text-red-500 p-1">
                          <Trash2 size={16} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr><td colSpan={showCost ? 9 : 8} className="py-8 text-center text-slate-400 bg-slate-50/50">報價單清單為空 (Empty List)</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end gap-8 text-sm">
             {showCost && (
                <div className="text-right border-r border-slate-200 pr-8 mr-4">
                  <p className="text-slate-500">總成本 (Total Cost)</p>
                  <p className="font-bold text-orange-600 text-lg">${totalCost.toLocaleString()}</p>
                  <p className="text-xs text-slate-400 mt-1">GP: ${gp.toLocaleString()} ({gpMargin.toFixed(1)}%)</p>
                </div>
             )}
             <div className="text-right">
               <p className="text-slate-500">小計 (Subtotal)</p>
               <p className="font-bold text-slate-800 text-lg">${subtotal.toLocaleString()}</p>
             </div>
             <div className="text-right">
               <p className="text-slate-500">折扣 (Discount)</p>
               <p className="font-bold text-red-600 text-lg">-${totalDiscount.toLocaleString()}</p>
             </div>
             <div className="text-right">
               <p className="text-slate-500">總額 (Total)</p>
               <p className="font-bold text-brand-600 text-2xl">${total.toLocaleString()}</p>
             </div>
          </div>
        </div>

        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
           <button onClick={onClose} className="px-6 py-2 rounded-lg border border-slate-300 bg-white text-slate-600 hover:bg-slate-50 font-medium">
             {isViewMode ? '關閉 (Close)' : '取消 (Cancel)'}
           </button>
           {!isViewMode && (
             <button onClick={handleSave} disabled={items.length === 0} className="px-6 py-2 rounded-lg bg-brand-600 text-white hover:bg-brand-700 font-bold disabled:opacity-50 flex items-center gap-2">
               <Save size={18} /> {isEditMode ? '更新報價單 (Update)' : '建立報價單 (Create)'}
             </button>
           )}
           {isViewMode && (
              <>
                <button 
                    onClick={onPrintProforma}
                    className="px-6 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 font-medium flex items-center gap-2"
                >
                    <FileCheck size={18} /> Proforma
                </button>
                <button 
                    onClick={onPrint}
                    className="px-6 py-2 rounded-lg bg-slate-800 text-white hover:bg-slate-900 font-medium flex items-center gap-2"
                >
                    <Printer size={18} /> 列印 (Print)
                </button>
              </>
           )}
        </div>
      </div>
    </div>
  );
};

export default QuotationModal;
