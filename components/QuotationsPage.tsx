
import React, { useState } from 'react';
import { Search, Plus, CheckCircle, Edit, Eye, FileText, Clock, AlertCircle, Printer, FileCheck, Ban } from 'lucide-react';
import { Quotation } from '../types';
import { useOutletContext, useNavigate } from 'react-router-dom';
import ConfirmModal from './ConfirmModal';
import QuotationModal from './QuotationModal';

type ModalMode = 'CREATE' | 'EDIT' | 'VIEW';

const QuotationsPage: React.FC = () => {
  const { 
    user, 
    quotations, 
    saveQuotation, 
    products,
    customers,
    allUsers,
    categories,
    brands
  } = useOutletContext<any>();
  const navigate = useNavigate();
  
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal State
  const [modalConfig, setModalConfig] = useState<{ isOpen: boolean; mode: ModalMode; quotation?: Quotation }>({
    isOpen: false, mode: 'CREATE'
  });

  const [confirmConfig, setConfirmConfig] = useState<{isOpen: boolean; title: string; message: string; onConfirm: () => void; isDanger?: boolean} | null>(null);

  const filteredQuotes: Quotation[] = (quotations as Quotation[]).filter((q: Quotation) => 
    q.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    q.customer?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    q.customer?.phone.includes(searchTerm)
  );

  const getStatusBadge = (status: Quotation['status']) => {
    switch (status) {
      case 'ACCEPTED':
      case 'CONVERTED':
        return <span className="flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-1 rounded text-xs font-bold"><CheckCircle size={12} /> {status}</span>;
      case 'SENT':
        return <span className="flex items-center gap-1 text-blue-600 bg-blue-50 px-2 py-1 rounded text-xs font-bold"><FileText size={12} /> SENT</span>;
      case 'REJECTED':
        return <span className="flex items-center gap-1 text-red-600 bg-red-50 px-2 py-1 rounded text-xs font-bold"><AlertCircle size={12} /> REJECTED</span>;
      case 'CANCELLED':
        return <span className="flex items-center gap-1 text-slate-500 bg-slate-200 px-2 py-1 rounded text-xs font-bold"><Ban size={12} /> VOID</span>;
      default:
        return <span className="flex items-center gap-1 text-slate-500 bg-slate-100 px-2 py-1 rounded text-xs font-bold"><Clock size={12} /> DRAFT</span>;
    }
  };

  const handleSaveQuotation = async (quotation: Quotation) => {
    // Check duplication if ID changed (and it's a new ID that already exists in the list)
    // Note: In real API, backend checks this, but frontend check is nice for UX.
    const exists = quotations.some((q: Quotation) => q.id === quotation.id && q.id !== modalConfig.quotation?.id);
    if (exists) {
        setConfirmConfig({
            isOpen: true,
            title: '錯誤',
            message: '報價單號已存在，請使用其他編號。\nQuotation ID already exists.',
            isDanger: true,
            onConfirm: () => setConfirmConfig(null)
        });
        return;
    }

    const success = await saveQuotation(quotation);
    if (success) {
        setModalConfig({ ...modalConfig, isOpen: false });
    }
  };

  const handleVoidQuotation = (id: string) => {
    setConfirmConfig({
        isOpen: true,
        title: '作廢報價單 (Void Quotation)',
        message: '確定作廢此報價單? 此操作保留記錄但標記為無效。\n(Are you sure to void this quotation?)',
        isDanger: true,
        onConfirm: async () => {
             const quote = quotations.find((q: Quotation) => q.id === id);
             if (quote) {
                 await saveQuotation({ ...quote, status: 'CANCELLED' });
             }
             setConfirmConfig(null);
        }
    });
  };

  const handlePrint = (quote: Quotation) => {
    navigate(`/print/quotation/${quote.id}`, { state: { data: quote } });
  };

  const handlePrintProforma = (quote: Quotation) => {
    navigate(`/print/proforma/${quote.id}`, { state: { data: quote } });
  };

  return (
    <div className="p-8 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-slate-800">報價單系統 (Quotations)</h1>
          <button 
             onClick={() => setModalConfig({ isOpen: true, mode: 'CREATE' })}
             className="bg-brand-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
           >
             <Plus size={18} /> 建立報價單
           </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
           {/* Toolbar */}
           <div className="p-4 border-b border-slate-200 bg-slate-50/50">
             <div className="relative max-w-md">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
               <input 
                 type="text" 
                 placeholder="搜尋報價單號, 客戶名稱, 電話..."
                 className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500"
                 value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
               />
            </div>
          </div>

          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-slate-100 text-slate-600 uppercase text-xs tracking-wider font-semibold">
                <th className="p-4">報價單號 (ID)</th>
                <th className="p-4">日期 (Date)</th>
                <th className="p-4">客戶 (Customer)</th>
                <th className="p-4 text-center">經手人 (Handled By)</th>
                <th className="p-4 text-center">有效期 (Valid Until)</th>
                <th className="p-4 text-right">總額 (Total)</th>
                <th className="p-4 text-center">狀態 (Status)</th>
                <th className="p-4 text-center">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
               {filteredQuotes.map(q => (
                 <tr key={q.id} className={`hover:bg-slate-50 group ${q.status === 'CANCELLED' ? 'opacity-60 bg-slate-50' : ''}`}>
                   <td className="p-4 font-bold text-slate-800">
                       {q.id}
                       {q.status === 'CANCELLED' && <span className="ml-2 text-[10px] bg-slate-200 text-slate-500 px-1 rounded">VOID</span>}
                   </td>
                   <td className="p-4 text-slate-500">{q.createdAt}</td>
                   <td className="p-4">
                     <div className="font-medium">{q.customer?.name || 'Walk-in Customer'}</div>
                     <div className="text-xs text-slate-400">{q.customer?.phone}</div>
                   </td>
                   <td className="p-4 text-center text-slate-600">{q.createdBy}</td>
                   <td className="p-4 text-center text-slate-500">{q.validUntil}</td>
                   <td className={`p-4 text-right font-bold ${q.status === 'CANCELLED' ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                       ${q.total.toLocaleString()}
                   </td>
                   <td className="p-4 text-center">{getStatusBadge(q.status)}</td>
                   <td className="p-4 text-center">
                     <div className="flex items-center justify-center gap-2">
                         <button 
                          onClick={() => handlePrintProforma(q)}
                          className="text-slate-400 hover:text-indigo-600 p-1" 
                          title="Print Proforma Invoice"
                        >
                          <FileCheck size={18} />
                        </button>
                         <button 
                          onClick={() => handlePrint(q)}
                          className="text-slate-400 hover:text-slate-700 p-1" 
                          title="Print Quotation"
                        >
                          <Printer size={18} />
                        </button>
                        <button 
                          onClick={() => setModalConfig({ isOpen: true, mode: 'VIEW', quotation: q })}
                          className="text-slate-400 hover:text-brand-600 p-1" 
                          title="View"
                        >
                          <Eye size={18} />
                        </button>
                        {q.status !== 'CANCELLED' && q.status !== 'CONVERTED' && (
                            <>
                                <button 
                                onClick={() => setModalConfig({ isOpen: true, mode: 'EDIT', quotation: q })}
                                className="text-slate-400 hover:text-brand-600 p-1" 
                                title="Edit"
                                >
                                <Edit size={18} />
                                </button>
                                <button 
                                onClick={() => handleVoidQuotation(q.id)}
                                className="text-slate-400 hover:text-red-600 p-1" 
                                title="作廢 (Void)"
                                >
                                <Ban size={18} />
                                </button>
                            </>
                        )}
                     </div>
                   </td>
                 </tr>
               ))}
               {filteredQuotes.length === 0 && (
                 <tr><td colSpan={8} className="p-8 text-center text-slate-400">找不到報價單</td></tr>
               )}
            </tbody>
          </table>
        </div>
      </div>
      
      {modalConfig.isOpen && (
        <QuotationModal 
          mode={modalConfig.mode}
          quotation={modalConfig.quotation}
          allQuotations={quotations}
          currentUser={user}
          products={products}
          customers={customers}
          users={allUsers}
          categories={categories}
          brands={brands}
          onClose={() => setModalConfig({ ...modalConfig, isOpen: false })}
          onSave={handleSaveQuotation}
          onPrint={() => modalConfig.quotation && handlePrint(modalConfig.quotation)}
          onPrintProforma={() => modalConfig.quotation && handlePrintProforma(modalConfig.quotation)}
        />
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

export default QuotationsPage;
