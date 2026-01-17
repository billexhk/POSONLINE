
import React, { useState, useEffect } from 'react';
import { RepairTicket, RepairStatus, Customer, Supplier, Product } from '../types';
import { Search, Plus, Filter, Wrench, Clock, Truck, PackageCheck, CheckCircle, X, Printer, Edit, Save, ArrowRight, User as UserIcon, Archive, AlertTriangle, Ban } from 'lucide-react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import ConfirmModal from './ConfirmModal';

const RepairsPage: React.FC = () => {
  const { user, repairs, saveRepair, products, customers, suppliers } = useOutletContext<any>();
  
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<RepairStatus | 'ALL'>('ALL');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRepair, setEditingRepair] = useState<RepairTicket | null>(null);
  
  // Form State
  const [form, setForm] = useState<Partial<RepairTicket>>({});
  const [customId, setCustomId] = useState('');
  
  // Product Search for Stock RMA
  const [productSearch, setProductSearch] = useState('');

  // Confirm Modal
  const [confirmConfig, setConfirmConfig] = useState<{isOpen: boolean; title: string; message: string; onConfirm: () => void; isDanger?: boolean} | null>(null);

  useEffect(() => {
      if (isModalOpen && !editingRepair) {
          // Generate new ID for create mode
          const dateStr = new Date().toISOString().slice(2, 7).replace('-', '');
          const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
          setCustomId(`RMA-${dateStr}-${random}`);
          setForm({
              type: 'CUSTOMER', // Default
              customer: undefined,
              productName: '',
              serialNumber: '',
              problemDescription: '',
              accessories: 'None',
              supplierId: '',
              repairCost: 0,
              repairPrice: 0,
              notes: ''
          });
          setProductSearch('');
      } else if (isModalOpen && editingRepair) {
          setCustomId(editingRepair.id);
          setForm({ ...editingRepair });
      }
  }, [isModalOpen, editingRepair]);

  const filteredRepairs = repairs.filter((r: RepairTicket) => {
      const matchesSearch = r.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            r.customer?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            r.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            r.serialNumber.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter;
      return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: RepairStatus) => {
      switch (status) {
          case 'RECEIVED': return <span className="px-2 py-1 rounded bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1"><Clock size={12}/> 收件待處 (Received)</span>;
          case 'SENT_TO_VENDOR': return <span className="px-2 py-1 rounded bg-blue-100 text-blue-700 text-xs font-bold flex items-center gap-1"><Truck size={12}/> 已寄廠商 (Sent)</span>;
          case 'BACK_FROM_VENDOR': return <span className="px-2 py-1 rounded bg-orange-100 text-orange-700 text-xs font-bold flex items-center gap-1"><PackageCheck size={12}/> 廠回待取 (Returned)</span>;
          case 'COMPLETED': return <span className="px-2 py-1 rounded bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center gap-1"><CheckCircle size={12}/> 已完成 (Done)</span>;
          case 'CANCELLED': return <span className="px-2 py-1 rounded bg-red-100 text-red-700 text-xs font-bold flex items-center gap-1"><X size={12}/> 取消 (Cancelled)</span>;
          default: return null;
      }
  };

  const handleStockProductSelect = (product: Product) => {
      setForm({
          ...form,
          productId: product.id,
          productName: product.name,
          productSku: product.sku
      });
      setProductSearch(''); // Clear search after select to close dropdown (optional UX)
  };

  const handleSave = async () => {
      if (!form.productName || !form.problemDescription) {
          alert('請填寫產品名稱及故障描述 (Product & Problem required)');
          return;
      }

      // Resolve objects from IDs
    const supplier = suppliers.find((s: Supplier) => s.id === form.supplierId);
    const resolvedStatus: RepairStatus = (form.status as RepairStatus) || editingRepair?.status || 'RECEIVED';
    
    const newTicket: RepairTicket = {
          ...form as RepairTicket,
          id: customId,
          branchId: editingRepair?.branchId || user.branchId,
          supplierName: supplier?.name,
          status: resolvedStatus,
          createdAt: editingRepair?.createdAt || new Date().toISOString().split('T')[0],
          createdBy: editingRepair?.createdBy || user.name
      };

      // Special handling for Stock RMA status change to COMPLETED from non-COMPLETED
      if (editingRepair && editingRepair.type === 'STOCK') {
          const oldStatus = editingRepair.status;
          if (oldStatus !== 'COMPLETED' && resolvedStatus === 'COMPLETED') {
              setConfirmConfig({
                  isOpen: true,
                  title: '確認完成庫存 RMA',
                  message: `此操作將會把良品加回庫存。\nConfirm complete? 1 unit will be added back to stock.`,
                  onConfirm: async () => {
                      await saveRepair(newTicket);
                      alert(`[System Info] 庫存已增加: +1 ${editingRepair.productSku} (Branch: ${editingRepair.branchId})`);
                      setConfirmConfig(null);
                      setIsModalOpen(false);
                  }
              });
              return;
          }
      }

      await saveRepair(newTicket);
      
      if (!editingRepair && newTicket.type === 'STOCK') {
          // Note: In a real app, this would be an API call. 
          // Here we simulate the side effect visually via alert.
          alert(`[System Info] 已建立庫存 RMA。\n庫存扣除: -1 ${newTicket.productSku} (Branch: ${newTicket.branchId})`);
      }
      
      setIsModalOpen(false);
  };

  const updateStatus = (ticket: RepairTicket, newStatus: RepairStatus) => {
      const today = new Date().toISOString().split('T')[0];
      let updates: Partial<RepairTicket> = { status: newStatus };

      if (newStatus === 'SENT_TO_VENDOR') updates.sentDate = today;
      if (newStatus === 'BACK_FROM_VENDOR') updates.returnDate = today;
      if (newStatus === 'COMPLETED') updates.completedDate = today;

      const updatedTicket = { ...ticket, ...updates };
      
      // Confirm for Stock RMA Completion (Stock Addition)
      if (ticket.type === 'STOCK' && newStatus === 'COMPLETED') {
          setConfirmConfig({
              isOpen: true,
              title: '確認完成庫存 RMA',
              message: `此操作將會把良品加回庫存。\nConfirm complete? 1 unit will be added back to stock.`,
              onConfirm: async () => {
                  await saveRepair(updatedTicket);
                  alert(`[System Info] 庫存已增加: +1 ${ticket.productSku} (Branch: ${ticket.branchId})`);
                  setConfirmConfig(null);
              }
          });
          return;
      }

      // Just save
      // Note: Since updateStatus is called from onClick directly, we can't await easily without wrapping.
      // But it's fine, saveRepair handles it.
      saveRepair(updatedTicket).then(() => {
          // Auto-open modal for editing details when changing status (e.g., adding cost on return)
          if (newStatus === 'BACK_FROM_VENDOR') {
              setEditingRepair(updatedTicket);
              setIsModalOpen(true);
          }
      });
  };

  const handleVoidRepair = (id: string) => {
      setConfirmConfig({
          isOpen: true,
          title: '作廢維修單 (Void Repair)',
          message: '確定作廢此維修單? 此操作保留記錄但標記為無效。\n(Are you sure to void this repair ticket?)',
          isDanger: true,
          onConfirm: async () => {
              const ticket = repairs.find((r: RepairTicket) => r.id === id);
              if (ticket) {
                  await saveRepair({ ...ticket, status: 'CANCELLED' });
              }
              setConfirmConfig(null);
          }
      });
  };

  const handlePrint = (ticket: RepairTicket) => {
      navigate(`/print/repair/${ticket.id}`, { state: { data: ticket } });
  };

  return (
    <div className="p-8 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Wrench className="text-brand-600" /> 維修管理 (RMA Management)
          </h1>
          <button 
             onClick={() => { setEditingRepair(null); setIsModalOpen(true); }}
             className="bg-brand-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 shadow-lg shadow-brand-200 transition-all"
           >
             <Plus size={18} /> 建立維修單 (New Ticket)
           </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
           {/* Toolbar */}
           <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-col md:flex-row gap-4">
             <div className="relative flex-1">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
               <input 
                 type="text" 
                 placeholder="搜尋單號, 客戶, 產品 SN..."
                 className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500"
                 value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
               />
            </div>
            <div className="flex items-center gap-2 overflow-x-auto">
                <Filter size={16} className="text-slate-400" />
                {(['ALL', 'RECEIVED', 'SENT_TO_VENDOR', 'BACK_FROM_VENDOR', 'COMPLETED', 'CANCELLED'] as const).map(s => (
                    <button
                        key={s}
                        onClick={() => setStatusFilter(s)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${
                            statusFilter === s 
                            ? 'bg-slate-800 text-white' 
                            : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                    >
                        {s === 'ALL' ? '全部 (All)' : s.replace(/_/g, ' ')}
                    </button>
                ))}
            </div>
          </div>

          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-slate-100 text-slate-600 uppercase text-xs tracking-wider font-semibold">
                <th className="p-4">維修單號 (ID)</th>
                <th className="p-4">類型 (Type)</th>
                <th className="p-4">客戶 / 來源 (Customer/Source)</th>
                <th className="p-4">產品資料 (Product / SN)</th>
                <th className="p-4 text-center">狀態 (Status)</th>
                <th className="p-4">進度 (Progress)</th>
                <th className="p-4 text-center">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
               {filteredRepairs.map((repair: RepairTicket) => (
                 <tr key={repair.id} className="hover:bg-slate-50 group">
                   <td className="p-4">
                       <div className="font-bold text-slate-800">{repair.id}</div>
                       <div className="text-xs text-slate-500 mt-1">{repair.createdAt}</div>
                   </td>
                   <td className="p-4">
                       {repair.type === 'STOCK' ? (
                           <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded text-xs font-bold flex items-center gap-1 w-fit">
                               <Archive size={12} /> Stock RMA
                           </span>
                       ) : (
                           <span className="bg-blue-50 text-blue-600 px-2 py-1 rounded text-xs font-bold flex items-center gap-1 w-fit">
                               <UserIcon size={12} /> Customer
                           </span>
                       )}
                   </td>
                   <td className="p-4">
                       {repair.type === 'STOCK' ? (
                           <div className="text-slate-500 italic">Inventory (Stock)</div>
                       ) : repair.customer ? (
                           <div>
                               <div className="font-medium text-slate-700">{repair.customer.name}</div>
                               <div className="text-xs text-slate-400">{repair.customer.phone}</div>
                           </div>
                       ) : (
                           <span className="text-slate-400 italic">Walk-in</span>
                       )}
                   </td>
                   <td className="p-4">
                       <div className="font-medium text-slate-800">{repair.productName}</div>
                       <div className="text-xs text-slate-500 font-mono mt-0.5">SN: {repair.serialNumber}</div>
                       <div className="text-xs text-red-400 mt-1 line-clamp-1" title={repair.problemDescription}>{repair.problemDescription}</div>
                   </td>
                   <td className="p-4 flex justify-center">
                       {getStatusBadge(repair.status)}
                   </td>
                   <td className="p-4">
                       <div className="text-xs text-slate-500 space-y-1">
                           {repair.sentDate && <div className="flex items-center gap-1"><ArrowRight size={10} className="text-blue-500"/> Sent: {repair.sentDate}</div>}
                           {repair.returnDate && <div className="flex items-center gap-1"><ArrowRight size={10} className="text-orange-500"/> Ret: {repair.returnDate}</div>}
                           {repair.completedDate && <div className="flex items-center gap-1"><ArrowRight size={10} className="text-emerald-500"/> End: {repair.completedDate}</div>}
                       </div>
                   </td>
                   <td className="p-4 text-center">
                       <div className="flex items-center justify-center gap-2">
                           {/* Workflow Actions */}
                           {repair.status === 'RECEIVED' && (
                               <button 
                                   onClick={() => updateStatus(repair, 'SENT_TO_VENDOR')}
                                   className="p-1.5 rounded bg-blue-50 text-blue-600 hover:bg-blue-100" 
                                   title="寄出 (Send)"
                               >
                                   <Truck size={16} />
                               </button>
                           )}
                           {repair.status === 'SENT_TO_VENDOR' && (
                               <button 
                                   onClick={() => updateStatus(repair, 'BACK_FROM_VENDOR')}
                                   className="p-1.5 rounded bg-orange-50 text-orange-600 hover:bg-orange-100" 
                                   title="廠回 (Receive)"
                               >
                                   <PackageCheck size={16} />
                               </button>
                           )}
                           {repair.status === 'BACK_FROM_VENDOR' && (
                               <button 
                                   onClick={() => updateStatus(repair, 'COMPLETED')}
                                   className="p-1.5 rounded bg-emerald-50 text-emerald-600 hover:bg-emerald-100" 
                                   title={repair.type === 'STOCK' ? "入庫 (Add to Stock)" : "取機 (Customer Pickup)"}
                               >
                                   <CheckCircle size={16} />
                               </button>
                           )}
                           
                           <div className="w-px h-4 bg-slate-300 mx-1"></div>

                           <button 
                               onClick={() => handlePrint(repair)}
                               className="text-slate-400 hover:text-slate-700 p-1" 
                               title="列印 (Print)"
                           >
                               <Printer size={16} />
                           </button>
                           {repair.status !== 'CANCELLED' && repair.status !== 'COMPLETED' && (
                               <>
                                   <button 
                                       onClick={() => { setEditingRepair(repair); setIsModalOpen(true); }}
                                       className="text-slate-400 hover:text-brand-600 p-1" 
                                       title="編輯 (Edit)"
                                   >
                                       <Edit size={16} />
                                   </button>
                                   <button 
                                       onClick={() => handleVoidRepair(repair.id)}
                                       className="text-slate-400 hover:text-red-600 p-1" 
                                       title="作廢 (Void)"
                                   >
                                       <Ban size={16} />
                                   </button>
                               </>
                           )}
                       </div>
                   </td>
                 </tr>
               ))}
               {filteredRepairs.length === 0 && (
                   <tr><td colSpan={7} className="p-8 text-center text-slate-400">沒有維修記錄</td></tr>
               )}
            </tbody>
          </table>
        </div>
      </div>

      {/* REPAIR TICKET MODAL */}
      {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
              <div className="bg-white rounded-2xl w-full max-w-4xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col">
                  <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                      <div>
                          <h3 className="font-bold text-lg text-slate-800">
                              {editingRepair ? '編輯維修單 (Edit Repair Ticket)' : '建立維修單 (New Repair Ticket)'}
                          </h3>
                          <p className="text-xs text-slate-500 font-mono mt-1">ID: {customId}</p>
                      </div>
                      <button onClick={() => setIsModalOpen(false)}><X size={20} className="text-slate-400 hover:text-slate-600" /></button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-6 space-y-6">
                      
                      {/* TYPE SELECTION */}
                      <div className="flex gap-4 mb-4">
                          <button 
                              onClick={() => setForm({...form, type: 'CUSTOMER'})}
                              className={`flex-1 py-3 rounded-xl border-2 flex items-center justify-center gap-2 transition-all ${form.type === 'CUSTOMER' ? 'border-brand-500 bg-brand-50 text-brand-700 font-bold' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                          >
                              <UserIcon size={20} /> 客戶維修 (Customer Repair)
                          </button>
                          <button 
                              onClick={() => setForm({...form, type: 'STOCK'})}
                              className={`flex-1 py-3 rounded-xl border-2 flex items-center justify-center gap-2 transition-all ${form.type === 'STOCK' ? 'border-purple-500 bg-purple-50 text-purple-700 font-bold' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                          >
                              <Archive size={20} /> 庫存壞貨 (Stock RMA)
                          </button>
                      </div>

                      {/* Customer Section (Only for Customer Repair) */}
                      {form.type === 'CUSTOMER' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">客戶 (Customer)</label>
                                <select 
                                    className="w-full border rounded p-2.5 text-sm bg-white"
                                    value={form.customer?.id || ''}
                                    onChange={(e) => {
                                        const c = customers.find((cust: Customer) => cust.id === e.target.value);
                                        setForm({ ...form, customer: c });
                                    }}
                                >
                                    <option value="">Walk-in / Select Customer</option>
                                    {customers.map((c: Customer) => <option key={c.id} value={c.id}>{c.name} - {c.phone}</option>)}
                                </select>
                                {form.customer && (
                                    <div className="mt-2 p-2 bg-blue-50 rounded text-xs text-blue-700 flex items-start gap-2">
                                        <UserIcon size={14} className="mt-0.5" />
                                        <div>
                                            <p className="font-bold">{form.customer.name}</p>
                                            <p>{form.customer.phone}</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">當前狀態 (Status)</label>
                                <select 
                                    className="w-full border rounded p-2.5 text-sm bg-white"
                                    value={form.status || 'RECEIVED'}
                                    onChange={(e) => setForm({ ...form, status: e.target.value as RepairStatus })}
                                >
                                    <option value="RECEIVED">收件待處 (Received)</option>
                                    <option value="SENT_TO_VENDOR">已寄廠商 (Sent to Vendor)</option>
                                    <option value="BACK_FROM_VENDOR">廠回待取 (Back from Vendor)</option>
                                    <option value="COMPLETED">已完成 (Completed)</option>
                                    <option value="CANCELLED">取消 (Cancelled)</option>
                                </select>
                            </div>
                        </div>
                      )}

                      {form.type === 'STOCK' && (
                          <div className="bg-purple-50 p-4 rounded-xl border border-purple-100 flex gap-3 items-start animate-in fade-in">
                              <AlertTriangle className="text-purple-600 mt-0.5" size={18} />
                              <div>
                                  <h4 className="text-sm font-bold text-purple-800">庫存扣除注意</h4>
                                  <p className="text-xs text-purple-600 mt-1">
                                      建立此維修單時，系統將自動從庫存中扣除 1 件商品。<br/>
                                      當狀態更新為「已完成」時，將自動加回 1 件商品 (或需手動報廢)。
                                  </p>
                              </div>
                          </div>
                      )}

                      <hr className="border-slate-100" />

                      {/* Product Section */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="md:col-span-2">
                              <label className="block text-xs font-bold text-slate-500 mb-1">產品名稱 (Product Name) *</label>
                              {form.type === 'STOCK' ? (
                                  <div className="relative group">
                                      <input 
                                          className="w-full border rounded p-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none" 
                                          value={productSearch || form.productName || ''} 
                                          onChange={e => {
                                              setProductSearch(e.target.value);
                                              setForm({...form, productName: e.target.value, productId: undefined});
                                          }} 
                                          placeholder="Search product from inventory..."
                                      />
                                      {/* Simple Product Dropdown for Stock Selection */}
                                    {productSearch && !form.productId && (
                                        <div className="absolute top-full left-0 w-full bg-white border border-slate-200 shadow-xl rounded-lg mt-1 z-10 max-h-48 overflow-y-auto">
                                            {products.filter((p: Product) => p.name.toLowerCase().includes(productSearch.toLowerCase()) || p.sku.toLowerCase().includes(productSearch.toLowerCase())).map((p: Product) => (
                                                <div 
                                                    key={p.id} 
                                                    onClick={() => handleStockProductSelect(p)}
                                                    className="p-2 hover:bg-purple-50 cursor-pointer text-sm border-b border-slate-50 last:border-0"
                                                >
                                                    <div className="font-bold text-slate-800">{p.name}</div>
                                                    <div className="text-xs text-slate-500 flex justify-between">
                                                        <span>{p.sku}</span>
                                                        <span>Stock: {p.stock[user.branchId] || 0}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                  </div>
                              ) : (
                                  <input 
                                      className="w-full border rounded p-2 text-sm" 
                                      value={form.productName || ''} 
                                      onChange={e => setForm({ ...form, productName: e.target.value })} 
                                      placeholder="e.g., ASUS RTX 4090"
                                  />
                              )}
                          </div>
                          <div>
                              <label className="block text-xs font-bold text-slate-500 mb-1">序號 (Serial No.) *</label>
                              <input 
                                  className="w-full border rounded p-2 text-sm font-mono" 
                                  value={form.serialNumber || ''} 
                                  onChange={e => setForm({ ...form, serialNumber: e.target.value })} 
                                  placeholder="SN-XXXXXXXX"
                              />
                          </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                              <label className="block text-xs font-bold text-slate-500 mb-1">故障描述 (Problem) *</label>
                              <textarea 
                                  rows={3}
                                  className="w-full border rounded p-2 text-sm" 
                                  value={form.problemDescription || ''} 
                                  onChange={e => setForm({ ...form, problemDescription: e.target.value })} 
                                  placeholder="Describe the issue (e.g. DOA, No Power)..."
                              />
                          </div>
                          <div>
                              <label className="block text-xs font-bold text-slate-500 mb-1">隨附配件 (Accessories)</label>
                              <textarea 
                                  rows={3}
                                  className="w-full border rounded p-2 text-sm" 
                                  value={form.accessories || ''} 
                                  onChange={e => setForm({ ...form, accessories: e.target.value })} 
                                  placeholder="e.g., Full Box, Cable..."
                              />
                          </div>
                      </div>

                      <hr className="border-slate-100" />

                      {/* Vendor & Dates */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                          <div>
                              <label className="block text-xs font-bold text-slate-500 mb-1">供應商 (Vendor)</label>
                              <select 
                                  className="w-full border rounded p-2 text-sm bg-white"
                                  value={form.supplierId || ''}
                                  onChange={(e) => setForm({ ...form, supplierId: e.target.value })}
                              >
                                  <option value="">Select Vendor</option>
                                  {suppliers.map((s: Supplier) => <option key={s.id} value={s.id}>{s.name}</option>)}
                              </select>
                          </div>
                          <div>
                              <label className="block text-xs font-bold text-slate-500 mb-1">收件日期 (Received Date)</label>
                              <input 
                                  type="date"
                                  className="w-full border rounded p-2 text-sm"
                                  value={form.createdAt || ''}
                                  onChange={e => setForm({ ...form, createdAt: e.target.value })}
                              />
                          </div>
                          <div>
                              <label className="block text-xs font-bold text-slate-500 mb-1">寄出日期 (Sent Date)</label>
                              <input 
                                  type="date"
                                  className="w-full border rounded p-2 text-sm"
                                  value={form.sentDate || ''}
                                  onChange={e => setForm({ ...form, sentDate: e.target.value })}
                              />
                          </div>
                      </div>

                      {/* Return Info (Only show if Sent or Back) */}
                      {(form.status === 'BACK_FROM_VENDOR' || form.status === 'COMPLETED') && (
                          <div className="bg-orange-50 p-4 rounded-xl border border-orange-100 animate-in fade-in">
                              <h4 className="font-bold text-orange-800 text-sm mb-3">維修結果 (Return Details)</h4>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                  <div>
                                      <label className="block text-xs font-bold text-orange-700 mb-1">廠回日期 (Return Date)</label>
                                      <input 
                                          type="date"
                                          className="w-full border border-orange-200 rounded p-2 text-sm"
                                          value={form.returnDate || ''}
                                          onChange={e => setForm({ ...form, returnDate: e.target.value })}
                                      />
                                  </div>
                                  <div>
                                      <label className="block text-xs font-bold text-orange-700 mb-1">維修成本 (Cost)</label>
                                      <input 
                                          type="number"
                                          className="w-full border border-orange-200 rounded p-2 text-sm"
                                          value={form.repairCost ?? 0}
                                          onChange={e => setForm({ ...form, repairCost: Number(e.target.value) })}
                                      />
                                  </div>
                                  <div>
                                      <label className="block text-xs font-bold text-orange-700 mb-1">
                                          {form.type === 'STOCK' ? 'N/A' : '客戶收費 (Price)'}
                                      </label>
                                      <input 
                                          type="number"
                                          disabled={form.type === 'STOCK'}
                                          className="w-full border border-orange-200 rounded p-2 text-sm font-bold disabled:bg-orange-100 disabled:text-orange-400"
                                          value={form.repairPrice ?? 0}
                                          onChange={e => setForm({ ...form, repairPrice: Number(e.target.value) })}
                                      />
                                  </div>
                              </div>
                              <div className="mt-3">
                                  <label className="block text-xs font-bold text-orange-700 mb-1">備註 / 維修報告 (Notes)</label>
                                  <textarea 
                                      rows={2}
                                      className="w-full border border-orange-200 rounded p-2 text-sm"
                                      value={form.notes || ''}
                                      onChange={e => setForm({ ...form, notes: e.target.value })}
                                      placeholder="e.g. Replaced motherboard, tested OK."
                                  />
                              </div>
                          </div>
                      )}

                  </div>

                  <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                      <button onClick={() => setIsModalOpen(false)} className="px-6 py-2 rounded-lg border border-slate-300 bg-white text-slate-600 hover:bg-slate-50 font-medium">取消</button>
                      <button onClick={handleSave} className="px-6 py-2 rounded-lg bg-brand-600 text-white hover:bg-brand-700 font-bold flex items-center gap-2">
                          <Save size={18} /> 儲存 (Save)
                      </button>
                  </div>
              </div>
          </div>
      )}

      {confirmConfig && (
        <ConfirmModal 
            isOpen={confirmConfig.isOpen}
            title={confirmConfig.title}
            message={confirmConfig.message}
            onConfirm={confirmConfig.onConfirm}
            onCancel={() => setConfirmConfig(null)}
            isDanger={confirmConfig.isDanger}
        />
      )}
    </div>
  );
};

export default RepairsPage;
