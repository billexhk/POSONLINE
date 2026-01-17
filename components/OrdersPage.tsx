
import React, { useState, useEffect } from 'react';
import { Search, FileText, Printer, Eye, EyeOff, Truck, CheckCircle, Clock, AlertCircle, Trash2, Edit, Save, X, Plus, RefreshCw, DollarSign, Download, ScrollText, MapPin, Ban, Image as ImageIcon } from 'lucide-react';
import { Order, CartItem, User as UserType, PaymentRecord, Quotation, Product, Customer, Branch, Role } from '../types';
import { useOutletContext, useNavigate } from 'react-router-dom';
import CheckoutModal from './POS/CheckoutModal';
import ConfirmModal from './ConfirmModal';
import { PrintDocumentType } from './PrintTemplate';

const safeNumber = (value: unknown): number => {
  if (typeof value !== 'number') return 0;
  if (!Number.isFinite(value)) return 0;
  return value;
};

type ModalMode = 'CREATE' | 'EDIT';

const OrdersPage: React.FC = () => {
  const { user, orders: contextOrders, products, saveOrder, updateOrder, customers, allUsers, quotations, branches, categories, brands, taxRate } = useOutletContext<any>();
  const navigate = useNavigate();
  const orders = contextOrders || [];
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [statusFilter, setStatusFilter] = useState<'ALL' | Order['status']>('ALL');
  
  // Settle Balance State
  const [settleOrder, setSettleOrder] = useState<Order | null>(null);

  // Modal State
  const [modalConfig, setModalConfig] = useState<{ isOpen: boolean; mode: ModalMode; order?: Order }>({
    isOpen: false,
    mode: 'CREATE'
  });

  // Confirm Modal
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean; title: string; message: string; onConfirm: () => void; isDanger?: boolean;
  } | null>(null);

  const [businessDateModalOrder, setBusinessDateModalOrder] = useState<Order | null>(null);
  const [businessDateInput, setBusinessDateInput] = useState('');

  const isManager = user?.role === Role.MANAGER || user?.role === Role.ADMIN;

  const statusSortOrder: Record<Order['status'], number> = {
    PENDING: 1,
    PARTIAL: 2,
    COMPLETED: 3,
    VOID: 4
  };

  const filteredOrders = orders
    .slice()
    .filter((o: Order) => {
      const term = searchTerm.toLowerCase();
      const matchesSearch =
        o.id.toLowerCase().includes(term) ||
        o.customer?.name.toLowerCase().includes(term) ||
        o.customer?.phone.includes(searchTerm);
      const matchesStatus =
        statusFilter === 'ALL' ? true : o.status === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a: Order, b: Order) => {
      const statusDiff =
        statusSortOrder[a.status] - statusSortOrder[b.status];
      if (statusDiff !== 0) return statusDiff;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  const handleVoidOrder = (id: string, e?: React.MouseEvent) => {
    if (user?.role === Role.CLERK) {
      alert('此帳號沒有作廢訂單的權限。');
      e?.stopPropagation();
      return;
    }
    e?.stopPropagation();
    const order = orders.find((o: Order) => o.id === id);
    if (!order) return;

    if (order.status === 'VOID') return;

    setConfirmConfig({
        isOpen: true,
        title: '作廢訂單 (Void Order)',
        message: `確定要作廢訂單 ${id} 嗎？\n此操作將會:\n1. 標記訂單為無效\n2. 自動加回庫存 (Restock items)\n3. 產生作廢記錄`,
        isDanger: true,
        onConfirm: async () => {
            const updatedOrder = { ...order, status: 'VOID' };
            await updateOrder(updatedOrder);
            
            const restoreMsg = order.items.map((i: CartItem) => `+${i.quantity} ${i.sku}`).join(', ');
            alert(`訂單已作廢 (Voided).\n庫存已還原: ${restoreMsg}`);

            if (selectedOrder?.id === id) {
                setSelectedOrder({ ...selectedOrder, status: 'VOID' } as Order);
            }
            setConfirmConfig(null);
        }
    });
  };

  const handleEditClick = () => {
    if (selectedOrder && selectedOrder.status !== 'VOID') {
      setModalConfig({ isOpen: true, mode: 'EDIT', order: selectedOrder });
    }
  };

  const handleCreateClick = () => {
    setModalConfig({ isOpen: true, mode: 'CREATE' });
  };

  const handleSettleBalance = (order: Order, e?: React.MouseEvent) => {
     e?.stopPropagation();
     setSettleOrder(order);
  };

  const getRemainingBalance = (order: Order) => {
      const paid = order.payments.reduce((acc, p) => acc + p.amount, 0);
      return Math.max(0, order.total - paid);
  };

  const handleSettleComplete = async (payments: PaymentRecord[]) => {
     if (!settleOrder) return;

     const updatedOrder: Order = {
         ...settleOrder,
         payments: [...settleOrder.payments, ...payments],
         status: 'COMPLETED' 
     };

     await updateOrder(updatedOrder);
     
     if (selectedOrder?.id === settleOrder.id) {
         setSelectedOrder(updatedOrder);
     }

     setSettleOrder(null);
     
     setConfirmConfig({
         isOpen: true,
         title: '支付成功 (Payment Success)',
         message: '已成功支付尾數！ (Balance Settled Successfully)',
         onConfirm: () => setConfirmConfig(null),
         isDanger: false
     });
  };

  const openBusinessDateModal = (order: Order, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const baseDate =
      order.businessDate ||
      (order.createdAt ? order.createdAt.slice(0, 10) : '');
    setBusinessDateModalOrder(order);
    setBusinessDateInput(baseDate);
  };

  const closeBusinessDateModal = () => {
    setBusinessDateModalOrder(null);
    setBusinessDateInput('');
  };

  const handleSaveBusinessDate = async () => {
    if (!businessDateModalOrder || !businessDateInput) return;
    const updatedOrder: Order = {
      ...businessDateModalOrder,
      businessDate: businessDateInput
    };
    const success = await updateOrder(updatedOrder);
    if (success) {
      if (selectedOrder?.id === updatedOrder.id) {
        setSelectedOrder(updatedOrder);
      }
      closeBusinessDateModal();
    }
  };


  const handleSaveOrder = async (orderToSave: Order) => {
    const exists = orders.some((o: Order) => o.id === orderToSave.id && o.id !== modalConfig.order?.id);
    if (exists) {
        setConfirmConfig({
            isOpen: true,
            title: '錯誤 (Error)',
            message: '訂單編號已存在，請使用其他編號。\nOrder ID already exists.',
            onConfirm: () => setConfirmConfig(null),
            isDanger: true
        });
        return;
    }

    if (modalConfig.mode === 'EDIT') {
        await updateOrder(orderToSave);
    } else {
        await saveOrder(orderToSave);
    }
    
    setSelectedOrder(orderToSave);
    
    setModalConfig({ ...modalConfig, isOpen: false });
  };

  const getStatusBadge = (status: Order['status']) => {
    switch (status) {
      case 'COMPLETED':
        return <span className="flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-1 rounded text-xs font-bold"><CheckCircle size={12} /> Completed</span>;
      case 'PARTIAL':
        return <span className="flex items-center gap-1 text-orange-600 bg-orange-50 px-2 py-1 rounded text-xs font-bold"><Clock size={12} /> Partial Paid</span>;
      case 'VOID':
        return <span className="flex items-center gap-1 text-slate-500 bg-slate-200 px-2 py-1 rounded text-xs font-bold"><Ban size={12} /> VOID</span>;
      default:
        return <span className="flex items-center gap-1 text-blue-600 bg-blue-50 px-2 py-1 rounded text-xs font-bold"><AlertCircle size={12} /> Pending</span>;
    }
  };

  const handlePrint = (type: PrintDocumentType) => {
      if (selectedOrder) {
          let mode = '';
          if (type === 'DELIVERY_NOTE') mode = '?mode=delivery';
          else if (type === 'RECEIPT') mode = '?mode=receipt';

          navigate(`/print/order/${selectedOrder.id}${mode}`, { 
            state: { data: selectedOrder } 
          });
      }
  };

  return (
    <div className="p-8 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-slate-800">訂單記錄 (Order History)</h1>
          <button 
             onClick={handleCreateClick}
             className="bg-brand-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
           >
             <Plus size={18} /> 手動建立訂單
           </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Order List */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[calc(100vh-12rem)]">
            <div className="p-4 border-b border-slate-200 bg-slate-50/50">
               <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                 <div className="relative flex-1">
                   <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                   <input 
                     type="text" 
                     placeholder="搜尋訂單編號, 客戶名稱, 電話..." 
                     className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500"
                     value={searchTerm}
                     onChange={(e) => setSearchTerm(e.target.value)}
                   />
                 </div>
                 <div className="w-full sm:w-48">
                   <select
                     className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                     value={statusFilter}
                     onChange={(e) => setStatusFilter(e.target.value as any)}
                   >
                     <option value="ALL">所有狀態 (All Status)</option>
                     <option value="PENDING">待處理 (Pending)</option>
                     <option value="PARTIAL">部分付款 (Partial)</option>
                     <option value="COMPLETED">已完成 (Completed)</option>
                     <option value="VOID">作廢 (VOID)</option>
                   </select>
                 </div>
               </div>
            </div>
            
            <div className="flex-1 overflow-y-auto">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 bg-slate-100 text-slate-600 uppercase text-xs font-semibold shadow-sm z-10">
                  <tr>
                    <th className="p-4">訂單編號 (Order ID)</th>
                    <th className="p-4">日期 (Date)</th>
                    <th className="p-4">會計日 (Accounting Date)</th>
                    <th className="p-4">客戶 (Customer)</th>
                    <th className="p-4 text-right">總額 (Total)</th>
                    <th className="p-4 text-center">狀態 (Status)</th>
                    <th className="p-4 text-center">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredOrders.map((order: Order) => (
                    <tr 
                      key={order.id} 
                      className={`cursor-pointer transition-colors ${selectedOrder?.id === order.id ? 'bg-brand-50 border-l-4 border-brand-500' : 'hover:bg-slate-50'} ${order.status === 'VOID' ? 'opacity-60 bg-slate-50' : ''}`}
                      onClick={() => { setSelectedOrder(order); }}
                    >
                      <td className="p-4 font-bold text-slate-800">
                          {order.id}
                          {order.status === 'VOID' && <span className="ml-2 text-[10px] text-slate-500 bg-slate-200 px-1 rounded">VOID</span>}
                      </td>
                      <td className="p-4 text-slate-500">
                        {new Date(order.createdAt).toLocaleDateString()}
                        <div className="text-xs text-slate-400">{new Date(order.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                      </td>
                      <td className="p-4 text-slate-500">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-xs">
                            {order.businessDate || (order.createdAt ? order.createdAt.slice(0, 10) : '')}
                          </span>
                          {isManager && order.status !== 'VOID' && (
                            <button
                              type="button"
                              className="text-[11px] text-brand-600 hover:text-brand-800 underline"
                              onClick={(e) => openBusinessDateModal(order, e)}
                            >
                              修改
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        {order.customer ? (
                          <div>
                            <div className="font-medium text-slate-700">{order.customer.name}</div>
                            <div className="text-xs text-slate-400">{order.customer.phone}</div>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Walk-in Customer</span>
                        )}
                      </td>
                      <td className={`p-4 text-right font-bold ${order.status === 'VOID' ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                        ${order.total.toLocaleString()}
                      </td>
                      <td className="p-4 flex justify-center">
                        {getStatusBadge(order.status)}
                      </td>
                      <td className="p-4 text-center">
                         <div className="flex items-center justify-center gap-2">
                           {order.status === 'PARTIAL' && (
                               <button 
                                 onClick={(e) => handleSettleBalance(order, e)}
                                 className="text-emerald-600 hover:text-emerald-800 p-1 bg-emerald-50 rounded" 
                                 title="支付尾數 (Settle Balance)"
                               >
                                 <DollarSign size={18} />
                               </button>
                           )}
                           <button className="text-brand-600 hover:text-brand-800" title="View">
                             <Eye size={18} />
                           </button>
                           {order.status !== 'VOID' && user.role !== Role.CLERK && (
                                <button 
                                    onClick={(e) => handleVoidOrder(order.id, e)}
                                    className="text-slate-400 hover:text-red-600 p-1"
                                    title="作廢 (Void)"
                                >
                                    <Ban size={18} />
                                </button>
                           )}
                         </div>
                      </td>
                    </tr>
                  ))}
                  {filteredOrders.length === 0 && (
                     <tr><td colSpan={7} className="p-8 text-center text-slate-400">找不到訂單</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Order Detail Panel */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[calc(100vh-12rem)]">
             {selectedOrder ? (
               <>
                 <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-start">
                   <div>
                     <h2 className={`text-xl font-bold ${selectedOrder.status === 'VOID' ? 'text-slate-500 line-through' : 'text-slate-800'}`}>{selectedOrder.id}</h2>
                     <p className="text-sm text-slate-500 mt-1">分店: {selectedOrder.branchId} • 經手人: {selectedOrder.cashierName}</p>
                   </div>
                   <div className="flex items-center gap-2">
                       {getStatusBadge(selectedOrder.status)}
                       {selectedOrder.status !== 'VOID' && (
                           <>
                            <button onClick={handleEditClick} className="text-slate-400 hover:text-brand-600 p-1" title="Edit Order">
                                <Edit size={16} />
                            </button>
                            {user.role !== Role.CLERK && (
                              <button onClick={(e) => handleVoidOrder(selectedOrder.id, e)} className="text-slate-400 hover:text-red-600 p-1" title="Void Order">
                                  <Ban size={16} />
                              </button>
                            )}
                           </>
                       )}
                   </div>
                 </div>
                 
                 <div className="p-6 flex-1 overflow-y-auto">
                    {selectedOrder.status === 'VOID' && (
                        <div className="mb-4 bg-red-50 text-red-700 p-3 rounded-lg border border-red-100 text-sm font-bold flex items-center gap-2">
                            <Ban size={16} /> 此訂單已作廢，庫存已還原。 (Order Voided)
                        </div>
                    )}

                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">購買項目 (Items)</h3>
                    <div className="space-y-4 mb-6">
                      {selectedOrder.items.map((item, idx) => (
                        <div key={idx} className={`flex gap-3 ${selectedOrder.status === 'VOID' ? 'opacity-50' : ''}`}>
                          <div className="w-10 h-10 bg-slate-100 rounded flex-shrink-0 overflow-hidden flex items-center justify-center">
                             {item.imageUrl ? (
                                <img src={item.imageUrl} className="w-full h-full object-cover" alt="" onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none';
                                    (e.target as HTMLImageElement).parentElement?.classList.add('text-slate-300');
                                }} />
                             ) : (
                                <ImageIcon size={20} className="text-slate-300" />
                             )}
                          </div>
                          <div className="flex-1">
                            <div className="flex justify-between items-start">
                               <p className="font-medium text-slate-800 text-sm line-clamp-2">{item.name}</p>
                               <p className="font-bold text-slate-900 ml-2">${((item.price - item.discount) * item.quantity).toLocaleString()}</p>
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5">
                              {item.quantity} x ${item.price.toLocaleString()} 
                              {item.discount > 0 && <span className="text-red-500 ml-1">(-${item.discount})</span>}
                            </p>
                            {item.sourceBranchId && item.sourceBranchId !== selectedOrder.branchId && (
                                <p className="text-[10px] text-blue-600 mt-1 flex items-center gap-1">
                                    <MapPin size={10} /> 出貨: {branches.find((b: Branch) => b.id === item.sourceBranchId)?.name}
                                </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className={`border-t border-dashed border-slate-200 pt-4 space-y-2 mb-6 ${selectedOrder.status === 'VOID' ? 'opacity-50' : ''}`}>
                       <div className="flex justify-between text-sm text-slate-600">
                         <span>小計 (Subtotal)</span>
                         <span>${selectedOrder.subtotal.toLocaleString()}</span>
                       </div>
                       <div className="flex justify-between text-sm text-slate-600">
                         <span>折扣 (Discount)</span>
                         <span>-${selectedOrder.totalDiscount.toLocaleString()}</span>
                       </div>
                       <div className="flex justify-between text-lg font-bold text-slate-800 pt-2">
                         <span>總額 (Total)</span>
                         <span>${selectedOrder.total.toLocaleString()}</span>
                       </div>
                    </div>

                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">付款記錄 (Payments)</h3>
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 space-y-2">
                      {selectedOrder.payments.map((p, idx) => (
                         <div key={idx} className={`flex justify-between text-sm ${selectedOrder.status === 'VOID' ? 'line-through text-slate-400' : ''}`}>
                           <span className="text-slate-600">{p.method}</span>
                           <span className="font-medium">${p.amount.toLocaleString()}</span>
                         </div>
                      ))}
                      
                      {selectedOrder.status === 'PARTIAL' && getRemainingBalance(selectedOrder) > 0 && (
                        <div className="pt-2 mt-2 border-t border-slate-200 flex justify-between items-center">
                          <span className="text-sm font-bold text-red-600">尚欠 (Balance):</span>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-red-600">
                              ${getRemainingBalance(selectedOrder).toLocaleString()}
                            </span>
                            <button 
                              onClick={() => handleSettleBalance(selectedOrder)}
                              className="text-xs bg-emerald-600 text-white px-2 py-1 rounded hover:bg-emerald-700 flex items-center gap-1"
                            >
                              <DollarSign size={12} /> 支付
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                 </div>

                 <div className="p-4 border-t border-slate-200 bg-slate-50 grid grid-cols-3 gap-2">
                    <button 
                      onClick={() => handlePrint('RECEIPT')}
                      className="bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
                    >
                      <ScrollText size={18} /> 收據 (Receipt)
                    </button>
                    <button 
                      onClick={() => handlePrint('DELIVERY_NOTE')}
                      className="bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
                    >
                      <Truck size={18} /> 送貨單
                    </button>
                    <button 
                      onClick={() => handlePrint('INVOICE')}
                      className="bg-slate-800 hover:bg-slate-900 text-white py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
                    >
                      <Printer size={18} /> 發票 (Invoice)
                    </button>
                 </div>
               </>
             ) : (
               <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8 text-center">
                  <FileText size={48} className="mb-4 opacity-20" />
                  <p>請選擇訂單以查看詳情</p>
                  <p className="text-sm">Select an order to view details</p>
               </div>
             )}
          </div>
        </div>
      </div>

      {modalConfig.isOpen && (
        <OrderModal 
          mode={modalConfig.mode}
          order={modalConfig.order}
          allOrders={orders}
          currentUser={user}
          products={products}
          customers={customers}
          allUsers={allUsers}
          quotations={quotations}
          branches={branches}
          categories={categories}
          brands={brands}
          taxRate={taxRate}
          onClose={() => setModalConfig({ ...modalConfig, isOpen: false })}
          onSave={handleSaveOrder}
        />
      )}

      {/* Settle Balance Checkout Modal */}
      {settleOrder && (
        <CheckoutModal
          isOpen={true}
          onClose={() => setSettleOrder(null)}
          total={getRemainingBalance(settleOrder)}
          customer={settleOrder.customer || null}
          items={settleOrder.items}
          onComplete={handleSettleComplete}
        />
      )}

      {businessDateModalOrder && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg text-slate-800">修改會計日 (Accounting Date)</h3>
              <button
                type="button"
                onClick={closeBusinessDateModal}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4">
              <div className="text-sm text-slate-600">
                <div className="font-mono text-slate-800">訂單: {businessDateModalOrder.id}</div>
                <div className="text-xs text-slate-500 mt-1">
                  原會計日:{' '}
                  {businessDateModalOrder.businessDate ||
                    (businessDateModalOrder.createdAt
                      ? businessDateModalOrder.createdAt.slice(0, 10)
                      : '')}
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">
                  新會計日 (New Accounting Date)
                </label>
                <input
                  type="date"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  value={businessDateInput}
                  onChange={(e) => setBusinessDateInput(e.target.value)}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeBusinessDateModal}
                  className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={handleSaveBusinessDate}
                  className="px-3 py-1.5 text-sm rounded-lg bg-brand-600 text-white hover:bg-brand-700"
                >
                  保存
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Modal */}
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

interface OrderModalProps {
  mode: ModalMode;
  order?: Order;
  allOrders: Order[];
  currentUser: UserType;
  products: Product[];
  customers: Customer[];
  allUsers: UserType[];
  quotations: Quotation[];
  branches: Branch[];
  categories: string[];
  brands: string[];
  taxRate?: number;
  onClose: () => void;
  onSave: (o: Order) => void;
}

const OrderModal: React.FC<OrderModalProps> = ({ mode, order, allOrders, currentUser, products, customers, allUsers, quotations, branches, categories, brands, taxRate, onClose, onSave }) => {
  const isCreate = mode === 'CREATE';

  const [prefix, setPrefix] = useState('ORD');
  const [customId, setCustomId] = useState(order?.id || '');
  const [customerId, setCustomerId] = useState(order?.customer?.id || '');
  const [items, setItems] = useState<CartItem[]>(order ? JSON.parse(JSON.stringify(order.items)) : []);
  const [handledBy, setHandledBy] = useState(order?.cashierName || currentUser.name);
  const [status, setStatus] = useState<Order['status']>(order?.status || 'PENDING');
  
  // Checkout State
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  // Quote Selector State
  const [showQuoteSelect, setShowQuoteSelect] = useState(false);
  
  const [selectedProductId, setSelectedProductId] = useState(products.length > 0 ? products[0].id : '');
  const [qty, setQty] = useState(1);
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterBrand, setFilterBrand] = useState('All');
  const [selectedProductIdsBulk, setSelectedProductIdsBulk] = useState<string[]>([]);
  const [showCost, setShowCost] = useState(false);

  const filteredProducts = products.filter(p => {
    const search = productSearchTerm.toLowerCase();
    const matchesSearch = p.name.toLowerCase().includes(search) || p.sku.toLowerCase().includes(search);
    const matchesCategory = filterCategory === 'All' || p.category === filterCategory;
    const matchesBrand = filterBrand === 'All' || p.brand === filterBrand;
    return matchesSearch && matchesCategory && matchesBrand;
  });

  useEffect(() => {
    if (filteredProducts.length > 0) {
      if (!selectedProductId || !filteredProducts.find(p => p.id === selectedProductId)) {
        setSelectedProductId(filteredProducts[0].id);
      }
    } else {
      setSelectedProductId('');
    }
  }, [filteredProducts, selectedProductId]);

  // Local Confirm Modal State
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean; title: string; message: string; onConfirm: () => void; isDanger?: boolean;
  } | null>(null);

  useEffect(() => {
    if (isCreate && customId === '') {
        generateNextId('ORD');
    }
  }, []);

  const generateNextId = (p: string) => {
      const cleanPrefix = p.trim().toUpperCase();
      const matches = allOrders.filter(o => o.id.startsWith(cleanPrefix));
      let nextNumString = '';
      if (matches.length > 0) {
        let maxNum = 0;
        let maxLen = 0;
        matches.forEach(o => {
            const numPart = o.id.substring(cleanPrefix.length);
            if (/^\d+$/.test(numPart)) {
                const num = parseInt(numPart, 10);
                if (num > maxNum) maxNum = num;
                if (numPart.length > maxLen) maxLen = numPart.length;
            } 
        });
        const targetLen = maxLen > 0 ? maxLen : 3; 
        nextNumString = (maxNum + 1).toString().padStart(targetLen, '0');
      } else {
        const dateStr = new Date().toISOString().slice(2, 7).replace('-', ''); 
        nextNumString = `${dateStr}0001`;
      }
      setCustomId(`${cleanPrefix}${nextNumString}`);
  };

  const handlePrefixChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value.toUpperCase();
      setPrefix(val);
      if (val.length > 0 && isCreate) {
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
          next.push({ ...product, quantity: qty, discount: 0, sourceBranchId: currentUser.branchId });
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

  const handleLoadQuote = (quote: Quotation) => {
    setConfirmConfig({
        isOpen: true,
        title: '載入報價單 (Load Quote)',
        message: `確定從報價單 ${quote.id} 載入資料? 這將覆蓋當前項目。\nConfirm load from quote ${quote.id}? This will overwrite current items.`,
        onConfirm: () => {
             if (quote.customer) setCustomerId(quote.customer.id);
             setItems(JSON.parse(JSON.stringify(quote.items)));
             setShowQuoteSelect(false);
             setConfirmConfig(null);
        }
    });
  };

  const subtotal = items.reduce((acc, i) => acc + (safeNumber(i.price) * i.quantity), 0);
  const totalDiscount = items.reduce((acc, i) => acc + (safeNumber(i.discount) * i.quantity), 0);
  const taxableBase = subtotal - totalDiscount;
  const effectiveTaxRate = typeof taxRate === 'number' ? taxRate : 0;
  const taxAmount = effectiveTaxRate > 0 ? taxableBase * (effectiveTaxRate / 100) : 0;
  const total = taxableBase + taxAmount;
  const totalCost = items.reduce((acc, i) => acc + (safeNumber(i.cost) * i.quantity), 0);
  const gp = total - totalCost;
  const gpMargin = total > 0 ? (gp / total) * 100 : 0;

  const handleSave = () => {
    const customer = customers.find(c => c.id === customerId);
    const orderToSave: Order = {
      id: customId,
      branchId: order?.branchId || currentUser.branchId,
      customer,
      items,
      subtotal,
      totalDiscount,
      taxRate,
      taxAmount,
      total,
      status,
      cashierName: handledBy,
      createdAt: order?.createdAt || new Date().toISOString(),
      payments: order?.payments || [] 
    };
    onSave(orderToSave);
  };

  const handleCheckoutComplete = (payments: PaymentRecord[], isDeposit: boolean) => {
    const customer = customers.find(c => c.id === customerId);
    const paid = payments.reduce((sum, p) => sum + p.amount, 0);
    const totalAmount = total;
    const hasRemaining = isDeposit && paid + 0.01 < totalAmount;

    const orderToSave: Order = {
      id: customId,
      branchId: order?.branchId || currentUser.branchId,
      customer,
      items,
      subtotal,
      totalDiscount,
      taxRate,
      taxAmount,
      total: totalAmount,
      status: hasRemaining ? 'PARTIAL' : 'COMPLETED',
      cashierName: handledBy,
      createdAt: order?.createdAt || new Date().toISOString(),
      payments: payments
    };
    onSave(orderToSave);
    setIsCheckoutOpen(false);
  };

  const title = isCreate ? '手動建立訂單 (Create Order)' : '編輯訂單 (Edit Order)';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl w-full max-w-7xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col relative">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
           <h3 className="font-bold text-lg text-slate-800">{title}</h3>
           <div className="flex gap-2">
             <button 
                onClick={() => setShowCost(!showCost)}
                className={`p-2 rounded-lg transition-colors ${showCost ? 'bg-orange-100 text-orange-600' : 'text-slate-400 hover:text-slate-600'}`}
                title={showCost ? "隱藏成本 (Hide Cost)" : "顯示成本 (Show Cost)"}
             >
               {showCost ? <Eye size={20} /> : <EyeOff size={20} />}
             </button>
             <button 
                onClick={() => setShowQuoteSelect(true)}
                className="text-xs bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg font-medium hover:bg-brand-50 hover:text-brand-600 flex items-center gap-1 transition-colors"
             >
                <Download size={14} /> 從報價單載入 (Load Quote)
             </button>
             <button onClick={onClose}><X size={20} className="text-slate-400 hover:text-slate-600" /></button>
           </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 relative">
          
          {/* Quote Selector Overlay */}
          {showQuoteSelect && (
             <div className="absolute inset-0 bg-white/95 z-10 p-6 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center mb-4">
                   <h4 className="font-bold text-lg text-slate-800">選擇報價單 (Select Quotation)</h4>
                   <button onClick={() => setShowQuoteSelect(false)} className="p-1 hover:bg-slate-100 rounded"><X size={20}/></button>
                </div>
                <div className="border border-slate-200 rounded-lg overflow-hidden max-h-[400px] overflow-y-auto">
                   <table className="w-full text-sm text-left">
                     <thead className="bg-slate-50 text-slate-500 font-bold">
                       <tr>
                         <th className="p-3">單號 (ID)</th>
                         <th className="p-3">客戶 (Customer)</th>
                         <th className="p-3">日期 (Date)</th>
                         <th className="p-3 text-right">總額 (Total)</th>
                         <th className="p-3"></th>
                       </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-100">
                       {quotations.map(q => (
                         <tr key={q.id} className="hover:bg-slate-50">
                           <td className="p-3 font-mono">{q.id}</td>
                           <td className="p-3">{q.customer?.name || 'Walk-in'}</td>
                           <td className="p-3 text-slate-500">{q.createdAt}</td>
                           <td className="p-3 text-right font-medium">${q.total.toLocaleString()}</td>
                           <td className="p-3 text-right">
                              <button 
                                onClick={() => handleLoadQuote(q)}
                                className="px-3 py-1 bg-brand-600 text-white text-xs rounded hover:bg-brand-700"
                              >
                                載入 (Load)
                              </button>
                           </td>
                         </tr>
                       ))}
                       {quotations.length === 0 && <tr><td colSpan={5} className="p-4 text-center text-slate-400">沒有報價單</td></tr>}
                     </tbody>
                   </table>
                </div>
             </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="md:col-span-1">
                 <label className="block text-xs font-bold text-slate-500 mb-1">字首 (Prefix)</label>
                 <div className="flex gap-2">
                    <input 
                      type="text" 
                      className="w-20 border rounded p-2 text-sm font-mono text-center uppercase"
                      value={prefix}
                      onChange={handlePrefixChange}
                      placeholder="ORD"
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
            {/* ... other fields ... */}
             <div className="md:col-span-1">
              <label className="block text-xs font-bold text-slate-500 mb-1">客戶 (Customer)</label>
              <select 
                className="w-full border rounded p-2 text-sm bg-white"
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
              >
                <option value="">Walk-in Customer (零售客)</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="md:col-span-1">
              <label className="block text-xs font-bold text-slate-500 mb-1">經手人 (Handled By)</label>
              <select 
                className="w-full border rounded p-2 text-sm bg-white"
                value={handledBy}
                onChange={(e) => setHandledBy(e.target.value)}
              >
                 {allUsers.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
              </select>
            </div>
            <div className="md:col-span-1">
              <label className="block text-xs font-bold text-slate-500 mb-1">狀態 (Status)</label>
              <select 
                className="w-full border rounded p-2 text-sm bg-white"
                value={status}
                onChange={(e) => setStatus(e.target.value as Order['status'])}
              >
                 <option value="PENDING">Pending</option>
                 <option value="COMPLETED">Completed</option>
                 <option value="PARTIAL">Partial</option>
                 {currentUser.role !== Role.CLERK && (
                   <option value="VOID">Void (作廢)</option>
                 )}
              </select>
            </div>
          </div>

          {/* Add Item Section */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6">
            <h4 className="text-xs font-bold text-slate-500 uppercase mb-3">加入產品 (Add Item)</h4>

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
                {Array.isArray(categories) && categories.map(c => (
                  <option key={c} value={c}>
                    {c === 'All' ? '所有分類 (Category)' : c}
                  </option>
                ))}
              </select>
              <select 
                className="w-full border rounded p-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                value={filterBrand}
                onChange={e => setFilterBrand(e.target.value)}
              >
                {Array.isArray(brands) && brands.map(b => (
                  <option key={b} value={b}>
                    {b === 'All' ? '所有品牌 (Brand)' : b}
                  </option>
                ))}
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
                  min="1" 
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

          {/* Items Table */}
          <div className="border border-slate-200 rounded-lg overflow-hidden mb-6">
            <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 flex justify-between items-center">
                 <span className="text-xs font-bold text-slate-500 uppercase">訂單項目 (Items)</span>
                 <div className="flex items-center gap-2 text-xs">
                    <span className="text-slate-400">批量設定扣貨分店:</span>
                    <select
                        className="bg-white border border-slate-200 rounded px-2 py-1 text-slate-700 outline-none focus:ring-1 focus:ring-brand-500"
                        onChange={(e) => setItems(prev => prev.map(i => ({...i, sourceBranchId: e.target.value})))}
                        value=""
                    >
                        <option value="" disabled>選擇分店</option>
                        {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                 </div>
            </div>
            <table className="w-full text-left text-sm">
              <thead className="bg-white text-slate-500 text-xs uppercase font-semibold border-b border-slate-100">
                <tr>
                  <th className="py-3 px-4 w-12">#</th>
                  <th className="py-3 px-4 w-[40%]">產品描述 (Description)</th>
                  {showCost && (
                    <th className="py-3 px-4 text-right w-24 bg-orange-50 text-orange-700 border-l border-orange-100">
                      成本 (Cost)
                    </th>
                  )}
                  <th className="py-3 px-4 text-right w-24">單價 (Price)</th>
                  <th className="py-3 px-4 text-center w-20">數量</th>
                  <th className="py-3 px-4 text-right w-24">折扣 (Disc.)</th>
                  <th className="py-3 px-4 text-right w-32">小計 (Subtotal)</th>
                  <th className="py-3 px-4 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item, index) => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 text-slate-400">{index + 1}</td>
                    <td className="py-2 px-4">
                        <textarea
                          rows={2}
                          className="w-full text-sm border-gray-200 rounded p-1.5 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 resize-none"
                          value={item.description}
                          onChange={(e) => updateItemField(item.id, 'description', e.target.value)}
                        />
                      <div className="flex items-center gap-4 mt-1">
                          <div className="text-[10px] text-slate-400 font-mono">SKU: {item.sku}</div>
                          {/* Source Branch Selector */}
                          <div className="flex items-center gap-1">
                              <span className="text-[10px] text-slate-400 font-bold flex items-center gap-1">
                                <MapPin size={10} /> 扣貨:
                              </span>
                              <select
                                className="text-[10px] border border-slate-200 rounded px-1 py-0.5 bg-slate-50 text-slate-600 focus:outline-none focus:ring-1 focus:ring-brand-300 cursor-pointer hover:bg-white transition-colors"
                                value={item.sourceBranchId || currentUser.branchId}
                                onChange={(e) => updateItemField(item.id, 'sourceBranchId', e.target.value)}
                              >
                                {branches.map(b => {
                                  const stock = item.stock[b.id] || 0;
                                  return (
                                    <option key={b.id} value={b.id}>
                                      {b.code} ({stock})
                                    </option>
                                  );
                                })}
                              </select>
                          </div>
                      </div>
                    </td>
                    {showCost && (
                      <td className="py-2 px-4 bg-orange-50/50 border-l border-orange-50">
                        <input
                          type="number"
                          className="w-full text-right text-xs bg-orange-50 text-orange-700 border-orange-100 rounded p-1 focus:ring-2 focus:ring-orange-500 outline-none"
                          value={item.cost}
                          onChange={(e) => updateItemField(item.id, 'cost', Number(e.target.value))}
                        />
                      </td>
                    )}
                    <td className="py-2 px-4">
                         <input 
                          type="number"
                          className="w-full text-right font-medium border-gray-200 rounded p-1 focus:ring-2 focus:ring-brand-500 outline-none"
                          value={item.price}
                          onChange={(e) => updateItemField(item.id, 'price', Number(e.target.value))}
                        />
                    </td>
                    <td className="py-2 px-4">
                         <input 
                          type="number"
                          className="w-full text-center border-gray-200 rounded p-1 focus:ring-2 focus:ring-brand-500 outline-none"
                          value={item.quantity}
                          onChange={(e) => updateItemField(item.id, 'quantity', Number(e.target.value))}
                        />
                    </td>
                    <td className="py-2 px-4">
                         <input 
                          type="number"
                          className="w-full text-right border-gray-200 rounded p-1 focus:ring-2 focus:ring-brand-500 outline-none"
                          value={item.discount}
                          onChange={(e) => updateItemField(item.id, 'discount', Number(e.target.value))}
                        />
                    </td>
                    <td className="py-2 px-4 text-right font-medium text-slate-700">
                      ${((item.price - item.discount) * item.quantity).toLocaleString()}
                    </td>
                    <td className="py-2 px-4 text-center">
                       <button onClick={() => removeItem(item.id)} className="text-slate-300 hover:text-red-500">
                         <Trash2 size={16} />
                       </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end gap-8 text-sm mt-4">
            {showCost && (
              <div className="text-right border-r border-slate-200 pr-8 mr-4">
                <p className="text-slate-500">總成本 (Total Cost)</p>
                <p className="font-bold text-orange-600 text-lg">${totalCost.toLocaleString()}</p>
                <p className="text-xs text-slate-400 mt-1">
                  GP: ${gp.toLocaleString()} ({gpMargin.toFixed(1)}%)
                </p>
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
            {effectiveTaxRate > 0 && (
              <div className="text-right">
                <p className="text-slate-500">銷售稅 (Tax)</p>
                <p className="font-bold text-slate-800 text-lg">
                  ${taxAmount.toLocaleString()} ({effectiveTaxRate}%)
                </p>
              </div>
            )}
            <div className="text-right">
              <p className="text-slate-500">總額 (Total)</p>
              <p className="font-bold text-brand-600 text-2xl">${total.toLocaleString()}</p>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6">
             <button onClick={onClose} className="px-6 py-2.5 border border-slate-300 rounded-xl text-slate-600 hover:bg-slate-50 font-medium">取消 (Cancel)</button>
             {/* If Pending/Completed */}
             <button 
                onClick={handleSave} 
                className="px-6 py-2.5 bg-slate-900 text-white rounded-xl hover:bg-slate-800 font-medium flex items-center gap-2"
             >
                <Save size={18} /> 儲存訂單 (Save Order)
             </button>
             <button 
                onClick={() => setIsCheckoutOpen(true)}
                className="px-6 py-2.5 bg-brand-600 text-white rounded-xl hover:bg-brand-700 font-medium flex items-center gap-2 shadow-lg shadow-brand-600/20"
             >
                <DollarSign size={18} /> 立即結帳 (Checkout)
             </button>
          </div>
        </div>
      </div>
      
      {/* Nested Checkout Modal for Immediate Payment */}
      {isCheckoutOpen && (
          <CheckoutModal
            isOpen={true}
            onClose={() => setIsCheckoutOpen(false)}
            total={total}
            customer={customers.find(c => c.id === customerId) || null}
            items={items}
            onComplete={handleCheckoutComplete}
          />
      )}

      {/* Confirm Modal */}
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

export default OrdersPage;
