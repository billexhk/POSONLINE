import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Search, UserPlus, Phone, Mail, Award, Edit, Trash2, Save, X, Building2, MapPin, History, DollarSign, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { Customer, Order } from '../types';

const CustomersPage: React.FC = () => {
  const { customers, orders, saveCustomer } = useOutletContext<any>();
  const [searchTerm, setSearchTerm] = useState('');
  
  // Create/Edit Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  
  // History Modal
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [historyCustomer, setHistoryCustomer] = useState<Customer | null>(null);
  const [historyOrders, setHistoryOrders] = useState<Order[]>([]);

  // Form State
  const [formData, setFormData] = useState<Partial<Customer>>({
    name: '', phone: '', email: '', tier: 'General', points: 0, companyName: '', address: '', remark: ''
  });

  const filteredCustomers: Customer[] = (customers as Customer[]).filter((c: Customer) => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.phone.includes(searchTerm) ||
    (c.companyName && c.companyName.toLowerCase().includes(searchTerm.toLowerCase())) ||
    c.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenModal = (customer?: Customer) => {
    if (customer) {
      setEditingCustomer(customer);
      setFormData(customer);
    } else {
      setEditingCustomer(null);
      setFormData({ name: '', phone: '', email: '', tier: 'General', points: 0, companyName: '', address: '', remark: '' });
    }
    setIsModalOpen(true);
  };

  const handleOpenHistory = (customer: Customer) => {
    const customerOrders = orders.filter((o: Order) => o.customer?.id === customer.id);
    // Sort by date desc
    customerOrders.sort((a: Order, b: Order) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    setHistoryCustomer(customer);
    setHistoryOrders(customerOrders);
    setIsHistoryOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    let customerToSave: Customer;

    if (editingCustomer) {
      // Update
      customerToSave = { ...editingCustomer, ...formData } as Customer;
    } else {
      // Create
      customerToSave = { 
        ...formData, 
        id: `c${Date.now()}`,
        points: formData.points || 0
      } as Customer;
    }

    const success = await saveCustomer(customerToSave);
    if (success) {
      setIsModalOpen(false);
    }
  };

  const calculateBalance = (customerId: string) => {
      // Find all orders for this customer that are PARTIAL
      const customerOrders = orders.filter((o: Order) => o.customer?.id === customerId && o.status === 'PARTIAL');
      let balance = 0;
      customerOrders.forEach((o: Order) => {
          const paid = o.payments.reduce((acc, p) => acc + p.amount, 0);
          balance += (o.total - paid);
      });
      return balance;
  };

  const getStatusBadge = (status: Order['status']) => {
    switch (status) {
      case 'COMPLETED':
        return <span className="flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-1 rounded text-[10px] font-bold"><CheckCircle size={10} /> Completed</span>;
      case 'PARTIAL':
        return <span className="flex items-center gap-1 text-orange-600 bg-orange-50 px-2 py-1 rounded text-[10px] font-bold"><Clock size={10} /> Partial</span>;
      default:
        return <span className="flex items-center gap-1 text-slate-500 bg-slate-100 px-2 py-1 rounded text-[10px] font-bold"><AlertCircle size={10} /> Pending</span>;
    }
  };

  return (
    <div className="p-8 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-slate-800">客戶管理 (CRM)</h1>
          <button 
            onClick={() => handleOpenModal()}
            className="bg-brand-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
          >
            <UserPlus size={18} /> 新增客戶
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          {/* Toolbar */}
          <div className="p-4 border-b border-slate-200 flex gap-4 bg-slate-50/50">
            <div className="relative flex-1 max-w-md">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
               <input 
                 type="text" 
                 placeholder="搜尋姓名, 公司, 電話, Email..." 
                 className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500"
                 value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
               />
            </div>
            <select className="px-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500">
               <option value="All">所有等級 (All Tiers)</option>
               <option value="General">General</option>
               <option value="VIP">VIP</option>
               <option value="Corporate">Corporate</option>
            </select>
          </div>

          {/* Table */}
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-slate-100 text-slate-600 uppercase text-xs tracking-wider font-semibold">
                <th className="p-4">客戶資料 (Customer)</th>
                <th className="p-4">詳細資料 (Details)</th>
                <th className="p-4">會員等級 (Tier)</th>
                <th className="p-4 text-right">尚欠款項 (Balance)</th>
                <th className="p-4 text-right">積分 (Points)</th>
                <th className="p-4 text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCustomers.map(customer => {
                  const balance = calculateBalance(customer.id);
                  return (
                    <tr key={customer.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4 align-top">
                        <div className="font-bold text-slate-800 text-base">{customer.name}</div>
                        {customer.companyName && (
                          <div className="flex items-center gap-1.5 text-slate-600 text-xs mt-1">
                            <Building2 size={12} /> {customer.companyName}
                          </div>
                        )}
                        <div className="text-slate-400 text-xs mt-1">ID: {customer.id}</div>
                      </td>
                      <td className="p-4 align-top">
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center gap-2 text-slate-600">
                            <Phone size={14} className="text-slate-400" /> {customer.phone}
                          </div>
                          <div className="flex items-center gap-2 text-slate-600">
                            <Mail size={14} className="text-slate-400" /> {customer.email}
                          </div>
                          {customer.address && (
                            <div className="flex items-start gap-2 text-slate-600 max-w-xs">
                               <MapPin size={14} className="text-slate-400 mt-0.5 flex-shrink-0" /> 
                               <span className="text-xs">{customer.address}</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="p-4 align-top">
                        <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${
                          customer.tier === 'VIP' ? 'bg-amber-100 text-amber-700' : 
                          customer.tier === 'Corporate' ? 'bg-indigo-100 text-indigo-700' : 
                          'bg-slate-100 text-slate-600'
                        }`}>
                          {customer.tier}
                        </span>
                      </td>
                      <td className="p-4 text-right align-top">
                        {balance > 0 ? (
                            <span className="text-red-600 font-bold flex items-center justify-end gap-1">
                                <DollarSign size={14} /> {balance.toLocaleString()}
                            </span>
                        ) : (
                            <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="p-4 text-right align-top">
                        <div className="flex items-center justify-end gap-1 font-bold text-brand-600">
                          <Award size={16} /> {customer.points}
                        </div>
                      </td>
                      <td className="p-4 text-right align-top">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                             onClick={() => handleOpenHistory(customer)}
                             className="text-slate-400 hover:text-blue-600 p-1 rounded hover:bg-blue-50 transition-colors"
                             title="查看訂單記錄 (Order History)"
                          >
                             <History size={18} />
                          </button>
                          <button 
                            onClick={() => handleOpenModal(customer)}
                            className="text-slate-400 hover:text-brand-600 p-1 rounded hover:bg-brand-50 transition-colors"
                            title="編輯 (Edit)"
                          >
                            <Edit size={18} />
                          </button>
                          <button className="text-slate-400 hover:text-red-600 p-1 rounded hover:bg-red-50 transition-colors" title="刪除 (Delete)">
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
              })}
              {filteredCustomers.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    找不到符合的客戶
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 sticky top-0 z-10">
              <h3 className="font-bold text-lg text-slate-800">
                {editingCustomer ? '編輯客戶 (Edit Customer)' : '新增客戶 (New Customer)'}
              </h3>
              <button onClick={() => setIsModalOpen(false)}>
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
                    value={formData.name} 
                    onChange={e => setFormData({...formData, name: e.target.value})} 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">公司名稱 (Company Name)</label>
                  <input 
                    className="w-full border rounded p-2.5 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none" 
                    value={formData.companyName} 
                    onChange={e => setFormData({...formData, companyName: e.target.value})} 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">電話 (Phone)</label>
                  <input 
                    required 
                    className="w-full border rounded p-2.5 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none" 
                    value={formData.phone} 
                    onChange={e => setFormData({...formData, phone: e.target.value})} 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Email</label>
                  <input 
                    type="email"
                    className="w-full border rounded p-2.5 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none" 
                    value={formData.email} 
                    onChange={e => setFormData({...formData, email: e.target.value})} 
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">地址 (Address)</label>
                <input 
                  className="w-full border rounded p-2.5 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none" 
                  value={formData.address} 
                  onChange={e => setFormData({...formData, address: e.target.value})} 
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">等級 (Tier)</label>
                  <select 
                    className="w-full border rounded p-2.5 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none bg-white"
                    value={formData.tier}
                    onChange={e => setFormData({...formData, tier: e.target.value as any})}
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
                    value={formData.points} 
                    onChange={e => setFormData({...formData, points: parseInt(e.target.value) || 0})} 
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">備註 (Remark)</label>
                <textarea 
                  rows={2}
                  className="w-full border rounded p-2.5 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none" 
                  value={formData.remark} 
                  onChange={e => setFormData({...formData, remark: e.target.value})} 
                />
              </div>

              <div className="pt-4 border-t border-slate-100 mt-2">
                <button type="submit" className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors">
                  <Save size={18} /> 儲存資料
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* History Modal */}
      {isHistoryOpen && historyCustomer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
              <div className="bg-white rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col">
                  <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                      <div>
                          <h3 className="font-bold text-lg text-slate-800">訂單記錄 (Order History)</h3>
                          <p className="text-sm text-slate-500">{historyCustomer.name} - {historyCustomer.phone}</p>
                      </div>
                      <button onClick={() => setIsHistoryOpen(false)}>
                          <X size={20} className="text-slate-400 hover:text-slate-600" />
                      </button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4">
                      {historyOrders.length === 0 ? (
                          <div className="text-center py-10 text-slate-400">沒有過往訂單</div>
                      ) : (
                          <table className="w-full text-sm text-left">
                              <thead className="bg-slate-50 text-slate-500 font-bold sticky top-0">
                                  <tr>
                                      <th className="p-3">單號 (ID)</th>
                                      <th className="p-3">日期 (Date)</th>
                                      <th className="p-3 text-right">總額 (Total)</th>
                                      <th className="p-3 text-right">已付 (Paid)</th>
                                      <th className="p-3 text-right">尚欠 (Balance)</th>
                                      <th className="p-3 text-center">狀態 (Status)</th>
                                  </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                  {historyOrders.map(o => {
                                      const paid = o.payments.reduce((acc, p) => acc + p.amount, 0);
                                      const balance = o.total - paid;
                                      return (
                                          <tr key={o.id} className="hover:bg-slate-50">
                                              <td className="p-3 font-mono font-medium">{o.id}</td>
                                              <td className="p-3 text-slate-500">{new Date(o.createdAt).toLocaleDateString()}</td>
                                              <td className="p-3 text-right font-bold">${o.total.toLocaleString()}</td>
                                              <td className="p-3 text-right text-emerald-600">${paid.toLocaleString()}</td>
                                              <td className="p-3 text-right">
                                                  {balance > 0 ? (
                                                      <span className="text-red-600 font-bold">${balance.toLocaleString()}</span>
                                                  ) : (
                                                      <span className="text-slate-300">-</span>
                                                  )}
                                              </td>
                                              <td className="p-3 text-center">{getStatusBadge(o.status)}</td>
                                          </tr>
                                      )
                                  })}
                              </tbody>
                          </table>
                      )}
                  </div>
                  <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
                      <button onClick={() => setIsHistoryOpen(false)} className="px-6 py-2 bg-white border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50">
                          關閉 (Close)
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default CustomersPage;
