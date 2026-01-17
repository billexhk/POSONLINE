
import React, { useState, useEffect } from 'react';
import { X, Plus, Minus, MapPin, Package, AlertCircle, Image as ImageIcon } from 'lucide-react';
import { Product, Branch } from '../../types';

interface ProductQuickViewModalProps {
  product: Product;
  currentBranchId: string;
  branches: Branch[];
  onClose: () => void;
  onAddToOrder: (product: Product, quantity: number, price: number, discount: number, description: string, sourceBranchId: string) => void;
}

const ProductQuickViewModal: React.FC<ProductQuickViewModalProps> = ({ product, currentBranchId, branches, onClose, onAddToOrder }) => {
  const [quantity, setQuantity] = useState(1);
  const [price, setPrice] = useState(product.price);
  const [discount, setDiscount] = useState(0);
  const [description, setDescription] = useState(product.description || '');
  const [sourceBranchId, setSourceBranchId] = useState(currentBranchId);

  // Focus trap or enter key handling could be added here
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleConfirm = () => {
    onAddToOrder(product, quantity, price, discount, description, sourceBranchId);
  };

  const total = (price - discount) * quantity;
  const currentStock = product.stock[sourceBranchId] || 0;
  const isLowStock = product.trackStock && currentStock < quantity;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[90vh]">
        
        {/* Left: Image & Info */}
        <div className="w-full md:w-5/12 bg-slate-50 p-6 flex flex-col border-r border-slate-200 overflow-y-auto">
           <div className="aspect-square bg-white rounded-xl border border-slate-200 mb-6 overflow-hidden flex items-center justify-center p-4 shadow-sm relative group">
              {product.imageUrl ? (
                  <img 
                    src={product.imageUrl} 
                    alt={product.name} 
                    className="w-full h-full object-contain mix-blend-multiply group-hover:scale-105 transition-transform duration-300" 
                    onError={(e) => {
                      const img = e.target as HTMLImageElement;
                      img.style.display = 'none';
                      const parent = img.parentElement;
                      if (parent) {
                        const span = document.createElement('span');
                        span.textContent = 'No Image';
                        parent.appendChild(span);
                      }
                    }} 
                  />
              ) : (
                  <ImageIcon className="text-slate-300 w-1/3 h-1/3" />
              )}
              {product.trackStock && currentStock <= 0 && (
                  <div className="absolute inset-0 bg-white/60 flex items-center justify-center backdrop-blur-[1px]">
                      <span className="bg-red-600 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg">Out of Stock</span>
                  </div>
              )}
           </div>
           
           <div className="flex-1">
              <div className="flex gap-2 mb-2">
                 <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">{product.brand}</span>
                 <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">{product.category}</span>
              </div>
              <h3 className="text-lg font-bold text-slate-800 leading-snug mb-2">{product.name}</h3>
              <p className="text-xs font-mono text-slate-500 mb-4 select-all bg-slate-100 p-1 rounded w-fit">{product.sku}</p>
              
              {/* Stock Table */}
              {product.trackStock && (
                  <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
                      <div className="px-3 py-2 bg-slate-100 border-b border-slate-200 text-xs font-bold text-slate-600 flex items-center gap-2">
                          <Package size={14} /> 分店庫存 (Stock Availability)
                      </div>
                      <table className="w-full text-xs text-left">
                          <tbody>
                              {branches.map(b => (
                                  <tr key={b.id} className={`border-b border-slate-50 last:border-0 ${b.id === sourceBranchId ? 'bg-blue-50' : ''}`}>
                                      <td className="px-3 py-2 text-slate-600 font-medium">{b.name}</td>
                                      <td className={`px-3 py-2 text-right font-bold ${(product.stock[b.id] || 0) <= product.lowStockThreshold ? 'text-red-600' : 'text-slate-800'}`}>
                                          {product.stock[b.id] || 0}
                                      </td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                  </div>
              )}
           </div>
        </div>

        {/* Right: Actions */}
        <div className="w-full md:w-7/12 p-6 flex flex-col bg-white overflow-y-auto">
           <div className="flex justify-between items-start mb-6">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  快速加入 (Quick Add)
              </h2>
              <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition-colors">
                  <X size={24} />
              </button>
           </div>

           <div className="space-y-6 flex-1">
              
              {/* Qty */}
              <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">數量 (Quantity)</label>
                  <div className="flex items-center gap-4">
                      <div className="flex items-center border-2 border-slate-200 rounded-xl overflow-hidden w-40">
                          <button 
                            onClick={() => setQuantity(Math.max(1, quantity - 1))}
                            className="w-12 h-12 flex items-center justify-center bg-slate-50 hover:bg-slate-100 active:bg-slate-200 text-slate-600 transition-colors"
                          >
                              <Minus size={20} />
                          </button>
                          <input 
                            type="number" 
                            className="flex-1 w-full text-center font-bold text-lg text-slate-800 focus:outline-none py-2"
                            value={quantity}
                            onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                          />
                          <button 
                            onClick={() => setQuantity(quantity + 1)}
                            className="w-12 h-12 flex items-center justify-center bg-slate-50 hover:bg-slate-100 active:bg-slate-200 text-slate-600 transition-colors"
                          >
                              <Plus size={20} />
                          </button>
                      </div>
                      <div className="text-sm text-slate-500">
                          {product.trackStock ? (
                              <span>庫存: <strong className={currentStock < quantity ? 'text-red-600' : 'text-slate-800'}>{currentStock}</strong></span>
                          ) : (
                              <span className="text-blue-600 font-bold">Service Item</span>
                          )}
                      </div>
                  </div>
                  {isLowStock && (
                      <p className="text-xs text-red-500 mt-2 flex items-center gap-1 font-medium">
                          <AlertCircle size={12} /> 警告: 庫存不足 (Insufficient Stock)
                      </p>
                  )}
              </div>

              {/* Price & Discount */}
              <div className="grid grid-cols-2 gap-4">
                  <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">單價 (Unit Price)</label>
                      <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                          <input 
                            type="number" 
                            className="w-full border-2 border-slate-200 rounded-xl py-3 pl-8 pr-4 font-bold text-slate-800 focus:border-brand-500 focus:outline-none transition-colors"
                            value={price}
                            onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
                          />
                      </div>
                  </div>
                  <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">折扣/件 (Discount)</label>
                      <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">-$</span>
                          <input 
                            type="number" 
                            className="w-full border-2 border-slate-200 rounded-xl py-3 pl-9 pr-4 font-bold text-red-600 focus:border-brand-500 focus:outline-none transition-colors"
                            value={discount}
                            onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                          />
                      </div>
                  </div>
              </div>

              {/* Source Branch */}
              <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">扣貨分店 (Source Branch)</label>
                  <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <select 
                        className="w-full border-2 border-slate-200 rounded-xl py-3 pl-10 pr-4 font-medium text-slate-700 focus:border-brand-500 focus:outline-none appearance-none bg-white"
                        value={sourceBranchId}
                        onChange={(e) => setSourceBranchId(e.target.value)}
                      >
                          {branches.map(b => (
                              <option key={b.id} value={b.id}>{b.name} (Stock: {product.stock[b.id] || 0})</option>
                          ))}
                      </select>
                  </div>
              </div>

              {/* Description */}
              <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">備註 / 描述 (Description)</label>
                  <div className="relative">
                      <textarea 
                        rows={2}
                        className="w-full border-2 border-slate-200 rounded-xl py-3 px-4 font-medium text-slate-700 focus:border-brand-500 focus:outline-none resize-none"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="選填..."
                      />
                  </div>
              </div>
           </div>

           {/* Footer Action */}
           <div className="pt-6 mt-6 border-t border-slate-100">
              <div className="flex justify-between items-center mb-4">
                  <span className="text-slate-500 font-medium">小計 (Subtotal)</span>
                  <span className="text-2xl font-bold text-brand-600">${total.toLocaleString()}</span>
              </div>
              <button 
                onClick={handleConfirm}
                className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold text-lg hover:bg-slate-800 active:scale-[0.98] transition-all shadow-lg shadow-slate-900/20 flex items-center justify-center gap-2"
              >
                  <Plus size={20} /> 加入訂單 (Add to Order)
              </button>
           </div>
        </div>
      </div>
    </div>
  );
};

export default ProductQuickViewModal;
