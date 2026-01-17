
import React, { useState } from 'react';
import { Transfer, Branch } from '../types';
import { ArrowLeftRight, Search, CheckCircle, Clock, PackageCheck, Plus, Ban } from 'lucide-react';
import ConfirmModal from './ConfirmModal';
import TransferRequestModal from './TransferRequestModal';
import { useOutletContext } from 'react-router-dom';

const TransfersPage: React.FC = () => {
  const { transfers, saveTransfer, branches } = useOutletContext<any>();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'COMPLETED'>('ALL');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  // Modals
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState<{isOpen: boolean; title: string; message: string; onConfirm: () => void; isDanger?: boolean} | null>(null);

  const filteredTransfers: Transfer[] = (transfers as Transfer[]).filter((t: Transfer) => {
    const lower = searchTerm.toLowerCase();
    const matchesSearch = t.productName.toLowerCase().includes(lower) || 
                          t.productSku.toLowerCase().includes(lower) ||
                          t.id.toLowerCase().includes(lower) ||
                          (t.remark || '').toLowerCase().includes(lower);
    const matchesStatus = statusFilter === 'ALL' || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getBranchCode = (id: string) => branches.find((b: Branch) => b.id === id)?.code || id;

  const getStatusBadge = (status: Transfer['status']) => {
    switch (status) {
      case 'COMPLETED':
        return <span className="flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-1 rounded text-xs font-bold"><CheckCircle size={12} /> Completed</span>;
      case 'PENDING':
        return <span className="flex items-center gap-1 text-orange-600 bg-orange-50 px-2 py-1 rounded text-xs font-bold"><Clock size={12} /> Pending</span>;
      case 'CANCELLED':
        return <span className="flex items-center gap-1 text-slate-500 bg-slate-200 px-2 py-1 rounded text-xs font-bold"><Ban size={12} /> Cancelled</span>;
      default:
        return null;
    }
  };

  const handleCancelTransfer = (id: string) => {
    setConfirmConfig({
        isOpen: true,
        title: '取消調貨單 (Cancel Transfer)',
        message: '確定取消此調貨單? (Are you sure to cancel this transfer?)',
        isDanger: true,
        onConfirm: async () => {
             const transfer = transfers.find((t: Transfer) => t.id === id);
             if (transfer) {
                 await saveTransfer({ ...transfer, status: 'CANCELLED' });
                 setSelectedIds(prev => {
                     const newSet = new Set(prev);
                     newSet.delete(id);
                     return newSet;
                 });
             }
             setConfirmConfig(null);
        }
    });
  };

  const handleConfirmReceive = (id: string) => {
    setConfirmConfig({
        isOpen: true,
        title: '確認收貨',
        message: '確認已收到貨品並完成調貨? (Confirm goods received?)',
        onConfirm: async () => {
            const transfer = transfers.find((t: Transfer) => t.id === id);
            if (transfer) {
                await saveTransfer({ ...transfer, status: 'COMPLETED' });
            }
            setConfirmConfig(null);
        }
    });
  };

  const handleBatchReceive = () => {
      const pendingSelected = transfers.filter((t: Transfer) => selectedIds.has(t.id) && t.status === 'PENDING');
      
      if (pendingSelected.length === 0) {
          return;
      }
  
      setConfirmConfig({
          isOpen: true,
          title: '批量確認收貨',
          message: `確認將選中的 ${pendingSelected.length} 筆待處理調貨單標記為已收貨?\nConfirm mark ${pendingSelected.length} pending transfers as received?`,
          onConfirm: async () => {
              for (const t of pendingSelected) {
                  await saveTransfer({ ...t, status: 'COMPLETED' });
              }
              setSelectedIds(new Set());
              setConfirmConfig(null);
          }
      });
  };

  const handleSaveRequests = async (newTransfers: Transfer[]) => {
      for (const t of newTransfers) {
          await saveTransfer(t);
      }
      setIsRequestModalOpen(false);
      setConfirmConfig({
          isOpen: true,
          title: '請求已建立 (Request Created)',
          message: `成功建立 ${newTransfers.length} 筆調貨請求。\nSuccessfully created ${newTransfers.length} transfer requests.`,
          onConfirm: () => setConfirmConfig(null),
          isDanger: false
      });
  };

  // Selection Logic
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.checked) {
          const ids = filteredTransfers.map((t: Transfer) => t.id);
          setSelectedIds(new Set(ids));
      } else {
          setSelectedIds(new Set());
      }
  };

  const handleSelectOne = (id: string) => {
      const newSet = new Set(selectedIds);
      if (newSet.has(id)) {
          newSet.delete(id);
      } else {
          newSet.add(id);
      }
      setSelectedIds(newSet);
  };

  const selectedCount = selectedIds.size;
  const isAllSelected = filteredTransfers.length > 0 && selectedIds.size === filteredTransfers.length;
  // Check if any selected item is PENDING
  const hasPendingSelected = transfers.some((t: Transfer) => selectedIds.has(t.id) && t.status === 'PENDING');

  return (
    <div className="p-8 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
            <h1 className="text-2xl font-bold text-slate-800">調貨管理 (Transfer Management)</h1>
            <div className="flex gap-3">
                {selectedCount > 0 && (
                    <button 
                        onClick={handleBatchReceive}
                        disabled={!hasPendingSelected}
                        className="bg-emerald-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-lg shadow-emerald-200 transition-all disabled:opacity-50 disabled:shadow-none"
                    >
                        <PackageCheck size={18} /> 批量收貨 ({selectedCount})
                    </button>
                )}
                <button 
                    onClick={() => setIsRequestModalOpen(true)}
                    className="bg-brand-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 shadow-lg shadow-brand-200 transition-all"
                >
                    <Plus size={18} /> 建立調貨請求 (Request Transfer)
                </button>
            </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          {/* Toolbar */}
          <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row gap-4 bg-slate-50/50">
            <div className="relative flex-1 max-w-md">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
               <input 
                 type="text" 
                 placeholder="搜尋單號, 產品 SKU, 名稱..." 
                 className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500"
                 value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
               />
            </div>
            <div className="flex gap-2">
               <button 
                 onClick={() => setStatusFilter('ALL')}
                 className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${statusFilter === 'ALL' ? 'bg-slate-800 text-white' : 'bg-white border border-slate-300 text-slate-600'}`}
               >
                 全部 (All)
               </button>
               <button 
                 onClick={() => setStatusFilter('PENDING')}
                 className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${statusFilter === 'PENDING' ? 'bg-orange-600 text-white' : 'bg-white border border-slate-300 text-slate-600'}`}
               >
                 待處理 (Pending)
               </button>
               <button 
                 onClick={() => setStatusFilter('COMPLETED')}
                 className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${statusFilter === 'COMPLETED' ? 'bg-emerald-600 text-white' : 'bg-white border border-slate-300 text-slate-600'}`}
               >
                 已完成 (Completed)
               </button>
            </div>
          </div>

          {/* Table */}
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
                <th className="p-4">調貨單號 (ID)</th>
                <th className="p-4">產品資料 (Product)</th>
                <th className="p-4 text-center">來源 (From)</th>
                <th className="p-4 text-center">目的 (To)</th>
                <th className="p-4 text-center">數量 (Qty)</th>
                <th className="p-4 text-center">狀態 (Status)</th>
                <th className="p-4">備註 (Remark)</th>
                <th className="p-4">建立者 (Created By)</th>
                <th className="p-4 text-center">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTransfers.map(transfer => (
                <tr key={transfer.id} className={`hover:bg-slate-50 transition-colors ${selectedIds.has(transfer.id) ? 'bg-blue-50/50' : ''} ${transfer.status === 'CANCELLED' ? 'opacity-60' : ''}`}>
                  <td className="p-4 text-center">
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500 cursor-pointer"
                        checked={selectedIds.has(transfer.id)}
                        onChange={() => handleSelectOne(transfer.id)}
                    />
                  </td>
                  <td className="p-4 font-medium text-slate-700">
                    <div className="flex items-center gap-2">
                       <ArrowLeftRight size={16} className="text-brand-500" />
                       {transfer.id}
                    </div>
                    <div className="text-xs text-slate-400 mt-1 pl-6">
                      {new Date(transfer.createdAt).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="font-bold text-slate-800">{transfer.productSku}</div>
                    <div className="text-slate-500 text-xs">{transfer.productName}</div>
                  </td>
                  <td className="p-4 text-center">
                    <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded font-bold">{getBranchCode(transfer.fromBranchId)}</span>
                  </td>
                  <td className="p-4 text-center">
                    <span className="bg-brand-50 text-brand-700 px-2 py-1 rounded font-bold">{getBranchCode(transfer.toBranchId)}</span>
                  </td>
                  <td className="p-4 text-center font-bold text-lg">
                    {transfer.quantity}
                  </td>
                  <td className="p-4 flex justify-center">
                    {getStatusBadge(transfer.status)}
                  </td>
                  <td className="p-4 text-xs text-slate-500 max-w-xs">
                    <div className="line-clamp-2 whitespace-pre-line">
                      {transfer.remark || '-'}
                    </div>
                  </td>
                  <td className="p-4 text-slate-500 text-xs">
                    {transfer.createdBy}
                  </td>
                  <td className="p-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      {transfer.status === 'PENDING' && (
                        <>
                            <button 
                            onClick={() => handleConfirmReceive(transfer.id)}
                            className="text-slate-400 hover:text-emerald-600 p-1"
                            title="Confirm Received"
                            >
                            <PackageCheck size={18} />
                            </button>
                            <button 
                                onClick={() => handleCancelTransfer(transfer.id)}
                                className="text-slate-400 hover:text-red-600 p-1"
                                title="取消 (Cancel)"
                            >
                                <Ban size={18} />
                            </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredTransfers.length === 0 && (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-400">
                    沒有相關記錄 (No records found)
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Transfer Request Modal */}
      <TransferRequestModal 
        isOpen={isRequestModalOpen}
        onClose={() => setIsRequestModalOpen(false)}
        onSave={handleSaveRequests}
      />

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

export default TransfersPage;
