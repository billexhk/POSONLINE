import React, { useState } from 'react';
import { X, Save, AlertCircle } from 'lucide-react';
import { CartItem } from '../types';

interface EditItemModalProps {
  item: CartItem;
  onClose: () => void;
  onSave: (updatedItem: CartItem) => void;
  allowEditCost?: boolean;
}

const EditItemModal: React.FC<EditItemModalProps> = ({ item, onClose, onSave, allowEditCost = true }) => {
  const [formData, setFormData] = useState({
    price: item.price,
    cost: item.cost,
    description: item.description,
    discount: item.discount,
  });

  const handleSave = () => {
    onSave({
      ...item,
      ...formData
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
           <h3 className="font-bold text-lg text-slate-800">編輯項目 (Edit Item)</h3>
           <button onClick={onClose}><X size={20} className="text-slate-400 hover:text-slate-600" /></button>
        </div>
        
        <div className="p-6 space-y-4">
          <div className="bg-slate-50 p-3 rounded-lg text-sm text-slate-600 border border-slate-100 mb-2">
            <p className="font-bold text-slate-800">{item.name}</p>
            <p className="text-xs mt-1">SKU: {item.sku}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">售價 (Unit Price)</label>
              <input 
                type="number" 
                className="w-full border rounded p-2 text-sm focus:ring-2 focus:ring-brand-500 outline-none" 
                value={formData.price}
                onChange={e => setFormData({...formData, price: Number(e.target.value)})}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">折扣 (Discount/Unit)</label>
              <input 
                type="number" 
                className="w-full border rounded p-2 text-sm focus:ring-2 focus:ring-brand-500 outline-none" 
                value={formData.discount}
                onChange={e => setFormData({...formData, discount: Number(e.target.value)})}
              />
            </div>
          </div>

          {allowEditCost && (
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1 flex items-center gap-1">
                成本 (Unit Cost) 
                <span className="bg-orange-100 text-orange-600 px-1.5 rounded text-[10px]">Internal Only</span>
              </label>
              <input 
                type="number" 
                className="w-full border rounded p-2 text-sm focus:ring-2 focus:ring-orange-500 outline-none border-orange-200 bg-orange-50/30" 
                value={formData.cost}
                onChange={e => setFormData({...formData, cost: Number(e.target.value)})}
              />
            </div>
          )}

          <div>
             <label className="block text-xs font-bold text-slate-500 mb-1">產品描述 (Description)</label>
             <textarea 
                rows={3}
                className="w-full border rounded p-2 text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                value={formData.description}
                onChange={e => setFormData({...formData, description: e.target.value})}
             />
             <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
               <AlertCircle size={10} /> 此修改只會應用於當前訂單/報價單。
             </p>
          </div>

          <div className="pt-2">
            <button 
              onClick={handleSave}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2"
            >
              <Save size={18} /> 更新項目 (Update)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditItemModal;
