import React, { useEffect, useState } from 'react';
import { Customer } from '../types';
import { Save, X } from 'lucide-react';

interface CustomerModalProps {
  open: boolean;
  customer?: Customer | null;
  onClose: () => void;
  saveCustomer: (customer: Customer) => Promise<boolean>;
  onSaved?: (customer: Customer) => void;
}

const CustomerModal: React.FC<CustomerModalProps> = ({
  open,
  customer,
  onClose,
  saveCustomer,
  onSaved,
}) => {
  const [formData, setFormData] = useState<Partial<Customer>>({
    name: '',
    phone: '',
    email: '',
    tier: 'General',
    points: 0,
    companyName: '',
    address: '',
    remark: '',
  });

  useEffect(() => {
    if (customer) {
      setFormData(customer);
    } else {
      setFormData({
        name: '',
        phone: '',
        email: '',
        tier: 'General',
        points: 0,
        companyName: '',
        address: '',
        remark: '',
      });
    }
  }, [customer, open]);

  if (!open) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    let customerToSave: Customer;

    if (customer) {
      customerToSave = { ...customer, ...formData } as Customer;
    } else {
      customerToSave = {
        ...(formData as Customer),
        id: `c${Date.now()}`,
        points: formData.points || 0,
      } as Customer;
    }

    const success = await saveCustomer(customerToSave);
    if (success) {
      if (onSaved) onSaved(customerToSave);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 sticky top-0 z-10">
          <h3 className="font-bold text-lg text-slate-800">
            {customer ? '編輯客戶 (Edit Customer)' : '新增客戶 (New Customer)'}
          </h3>
          <button onClick={onClose}>
            <X size={20} className="text-slate-400 hover:text-slate-600" />
          </button>
        </div>
        <form onSubmit={handleSave} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">姓名 (Name)</label>
              <input
                required
                className="w-full border rounded p-2.5 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
                value={formData.name || ''}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">公司名稱 (Company Name)</label>
              <input
                className="w-full border rounded p-2.5 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
                value={formData.companyName || ''}
                onChange={e => setFormData({ ...formData, companyName: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">電話 (Phone)</label>
              <input
                required
                className="w-full border rounded p-2.5 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
                value={formData.phone || ''}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Email</label>
              <input
                type="email"
                className="w-full border rounded p-2.5 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
                value={formData.email || ''}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">地址 (Address)</label>
            <input
              className="w-full border rounded p-2.5 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
              value={formData.address || ''}
              onChange={e => setFormData({ ...formData, address: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">等級 (Tier)</label>
              <select
                className="w-full border rounded p-2.5 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none bg-white"
                value={formData.tier || 'General'}
                onChange={e => setFormData({ ...formData, tier: e.target.value as any })}
              >
                <option value="General">General</option>
                <option value="VIP">VIP</option>
                <option value="Corporate">Corporate</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">積分 (Points)</label>
              <input
                type="number"
                className="w-full border rounded p-2.5 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
                value={formData.points ?? 0}
                onChange={e =>
                  setFormData({ ...formData, points: parseInt(e.target.value, 10) || 0 })
                }
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">備註 (Remark)</label>
            <textarea
              rows={2}
              className="w-full border rounded p-2.5 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
              value={formData.remark || ''}
              onChange={e => setFormData({ ...formData, remark: e.target.value })}
            />
          </div>

          <div className="pt-4 border-t border-slate-100 mt-2">
            <button
              type="submit"
              className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors"
            >
              <Save size={18} /> 儲存資料
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CustomerModal;

