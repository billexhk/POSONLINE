
import React, { useState, useRef } from 'react';
import { Search, Plus, User, Phone, Mail, MapPin, Truck, Calendar, FileText, CheckCircle, Clock, X, Save, Trash2, Eye, Edit, PackageCheck, Printer, RefreshCw, Download, Ban } from 'lucide-react';
import { Supplier, StockInRecord, PurchaseOrder, PurchaseOrderItem, Product, Quotation } from '../types';
import { useNavigate, useOutletContext } from 'react-router-dom';
import ConfirmModal from './ConfirmModal';
import { API_BASE_URL } from '../App';

type POMode = 'CREATE' | 'EDIT' | 'VIEW';

const PurchasingPage: React.FC = () => {
  const { 
    user, 
    categories,
    brands,
    purchaseOrders, 
    stockInRecords: records, 
    suppliers, 
    quotations,
    savePurchaseOrder, 
    saveStockInRecord,
    products,
    authToken
  } = useOutletContext<any>();

  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'ORDERS' | 'RECORDS' | 'SUPPLIERS'>('ORDERS');
  // Removed local state: purchaseOrders, records, suppliers
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [batchRecords, setBatchRecords] = useState<StockInRecord[]>([]);
  const [isLoadingBatch, setIsLoadingBatch] = useState(false);
  
  // Modal State
  const [modalConfig, setModalConfig] = useState<{ isOpen: boolean; mode: POMode; po?: PurchaseOrder }>({
    isOpen: false, mode: 'CREATE'
  });

  const [confirmConfig, setConfirmConfig] = useState<{isOpen: boolean; title: string; message: string; onConfirm: () => void; isDanger?: boolean} | null>(null);
  const [stockInSupplierDocNo, setStockInSupplierDocNo] = useState('');
  const stockInSupplierDocNoRef = useRef('');

  const filteredOrders: PurchaseOrder[] = (purchaseOrders as PurchaseOrder[]).filter((o: PurchaseOrder) => 
    o.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
    o.supplierName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredRecords: StockInRecord[] = (records as StockInRecord[]).filter((r: StockInRecord) => {
    const q = searchTerm.toLowerCase();
    return (
      r.productName.toLowerCase().includes(q) || 
      r.supplierName.toLowerCase().includes(q) ||
      (r.supplierDocNo || '').toLowerCase().includes(q) ||
      r.id.toLowerCase().includes(q) ||
      (r.batchId || '').toLowerCase().includes(q)
    );
  });

  const filteredSuppliers: Supplier[] = (suppliers as Supplier[]).filter((s: Supplier) => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.contactPerson.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

  const getStatusBadge = (status: PurchaseOrder['status']) => {
    switch (status) {
      case 'RECEIVED':
        return <span className="flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-1 rounded text-xs font-bold"><CheckCircle size={12} /> Received</span>;
      case 'SENT':
        return <span className="flex items-center gap-1 text-blue-600 bg-blue-50 px-2 py-1 rounded text-xs font-bold"><Truck size={12} /> Sent</span>;
      case 'CANCELLED':
        return <span className="flex items-center gap-1 text-slate-500 bg-slate-200 px-2 py-1 rounded text-xs font-bold"><Ban size={12} /> Void</span>;
      default:
        return <span className="flex items-center gap-1 text-slate-500 bg-slate-100 px-2 py-1 rounded text-xs font-bold"><Clock size={12} /> Draft</span>;
    }
  };

  const handleSavePO = async (po: PurchaseOrder) => {
    // Check duplication if ID changed
    const exists = purchaseOrders.some((p: PurchaseOrder) => p.id === po.id && p.id !== modalConfig.po?.id);
    if (exists) {
        setConfirmConfig({
            isOpen: true,
            title: '錯誤',
            message: '採購單號已存在，請使用其他編號。\nPO ID already exists.',
            isDanger: true,
            onConfirm: () => setConfirmConfig(null)
        });
        return;
    }

    const success = await savePurchaseOrder(po);
    if (success) {
        setModalConfig({ ...modalConfig, isOpen: false });
    }
  };

  const handleReceivePO = (po: PurchaseOrder) => {
    stockInSupplierDocNoRef.current = '';
    setStockInSupplierDocNo('');
    setConfirmConfig({
        isOpen: true,
        title: '確認入庫',
        message: `確認將採購單 ${po.id} 入庫?\nConfirm Stock In for PO ${po.id}?`,
        onConfirm: async () => {
            const updatedPO = { ...po, status: 'RECEIVED' as const };
            await savePurchaseOrder(updatedPO);

            const batchId = po.id;

            for (const item of po.items) {
                const newRecord: StockInRecord = {
                    id: `SI-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                    batchId,
                    date: new Date().toISOString().split('T')[0],
                    productId: item.productId,
                    productName: item.productName,
                    supplierId: po.supplierId,
                    supplierName: po.supplierName,
                    supplierDocNo: stockInSupplierDocNoRef.current,
                    quantity: item.quantity,
                    unitCost: item.unitCost,
                    totalCost: item.totalCost,
                    branchId: po.branchId,
                    performedBy: user.name || 'System',
                    status: 'COMPLETED'
                };
                await saveStockInRecord(newRecord);
            }

            setModalConfig({ ...modalConfig, isOpen: false });
            setActiveTab('RECORDS');
            setConfirmConfig(null);
            setStockInSupplierDocNo('');
            stockInSupplierDocNoRef.current = '';
        }
    });
  };

  const handleVoidPO = (id: string) => {
    setConfirmConfig({
        isOpen: true,
        title: '作廢採購單 (Void PO)',
        message: '確定作廢此採購單? (Confirm Void PO?)',
        isDanger: true,
        onConfirm: async () => {
             const po = purchaseOrders.find((p: PurchaseOrder) => p.id === id);
             if (po) {
                 await savePurchaseOrder({ ...po, status: 'CANCELLED' });
             }
             setConfirmConfig(null);
        }
    });
  };

  const handleVoidRecord = (record: StockInRecord) => {
    setConfirmConfig({
        isOpen: true,
        title: '作廢入庫記錄 (Void Record)',
        message: `確定作廢記錄 ${record.id}?\n警告: 系統將自動扣除 ${record.quantity} 件庫存!\n(Warning: Stock will be deducted)`,
        isDanger: true,
        onConfirm: async () => {
             await saveStockInRecord({ ...record, status: 'VOID' });
             setConfirmConfig(null);
        }
    });
  };

  const handlePrint = (po: PurchaseOrder) => {
    navigate(`/print/po/${po.id}`, { state: { data: po } });
  };

  return (
    <div className="p-8 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-slate-800">採購管理 (Purchasing)</h1>
          <div>
            {activeTab === 'ORDERS' && (
              <button 
                onClick={() => setModalConfig({ isOpen: true, mode: 'CREATE' })}
                className="bg-brand-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <Plus size={18} /> 建立採購單 (New PO)
              </button>
            )}
            {activeTab === 'SUPPLIERS' && (
               <button className="bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-slate-50">
                 <Plus size={18} /> 新增供應商
               </button>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden min-h-[600px] flex flex-col">
          {/* Tab Navigation */}
          <div className="flex border-b border-slate-200">
             <button 
              onClick={() => setActiveTab('ORDERS')}
              className={`px-6 py-4 font-bold text-sm flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'ORDERS' ? 'border-brand-500 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
              <FileText size={18} /> 採購單 (Purchase Orders)
            </button>
            <button 
              onClick={() => setActiveTab('RECORDS')}
              className={`px-6 py-4 font-bold text-sm flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'RECORDS' ? 'border-brand-500 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
              <Truck size={18} /> 入庫記錄 (Stock In History)
            </button>
            <button 
              onClick={() => setActiveTab('SUPPLIERS')}
              className={`px-6 py-4 font-bold text-sm flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'SUPPLIERS' ? 'border-brand-500 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
              <User size={18} /> 供應商資料 (Suppliers)
            </button>
          </div>

          {/* Toolbar */}
          <div className="p-4 border-b border-slate-200 bg-slate-50/50">
             <div className="relative max-w-md">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
               <input 
                 type="text" 
                 placeholder={activeTab === 'SUPPLIERS' ? "搜尋供應商..." : "搜尋單號, 產品, 供應商..."}
                 className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500"
                 value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
               />
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-auto">
            {activeTab === 'ORDERS' && (
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-slate-100 text-slate-600 uppercase text-xs tracking-wider font-semibold">
                    <th className="p-4">採購單號 (PO ID)</th>
                    <th className="p-4">供應商 (Supplier)</th>
                    <th className="p-4">項目 (Items)</th>
                    <th className="p-4 text-right">總額 (Amount)</th>
                    <th className="p-4 text-center">狀態 (Status)</th>
                    <th className="p-4 text-center">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredOrders.map((po: PurchaseOrder) => (
                    <tr key={po.id} className={`hover:bg-slate-50 group ${po.status === 'CANCELLED' ? 'opacity-60 bg-slate-50' : ''}`}>
                      <td className="p-4">
                        <div className="font-bold text-slate-800">{po.id}</div>
                        <div className="text-xs text-slate-500 mt-1">{po.createdAt}</div>
                      </td>
                      <td className="p-4 font-medium text-slate-700">{po.supplierName}</td>
                      <td className="p-4 text-slate-600">
                         {po.items.length} 項目
                         <div className="text-xs text-slate-400 truncate max-w-[200px]">
                           {po.items.map(i => i.productName).join(', ')}
                         </div>
                      </td>
                      <td className={`p-4 text-right font-bold ${po.status === 'CANCELLED' ? 'text-slate-400 line-through' : 'text-slate-800'}`}>${po.totalAmount.toLocaleString()}</td>
                      <td className="p-4 flex justify-center">{getStatusBadge(po.status)}</td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button 
                             onClick={() => handlePrint(po)}
                             className="text-slate-400 hover:text-slate-700 p-1" title="列印 (Print)"
                          >
                            <Printer size={18} />
                          </button>
                          <button 
                             onClick={() => setModalConfig({ isOpen: true, mode: 'VIEW', po })}
                             className="text-slate-400 hover:text-brand-600 p-1" title="查看 (View)"
                          >
                            <Eye size={18} />
                          </button>
                          {po.status !== 'RECEIVED' && po.status !== 'CANCELLED' && (
                            <>
                                <button 
                                onClick={() => setModalConfig({ isOpen: true, mode: 'EDIT', po })}
                                className="text-slate-400 hover:text-brand-600 p-1" title="編輯 (Edit)"
                                >
                                <Edit size={18} />
                                </button>
                                {po.status === 'SENT' && (
                                    <button 
                                    onClick={() => handleReceivePO(po)}
                                    className="text-slate-400 hover:text-emerald-600 p-1" title="確認入庫 (Confirm Stock In)"
                                    >
                                    <PackageCheck size={18} />
                                    </button>
                                )}
                                <button 
                                onClick={() => handleVoidPO(po.id)}
                                className="text-slate-400 hover:text-red-600 p-1" title="作廢 (Void)"
                                >
                                <Ban size={18} />
                                </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                   {filteredOrders.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-slate-400">沒有採購單</td></tr>}
                </tbody>
              </table>
            )}

            {activeTab === 'RECORDS' && (
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-slate-100 text-slate-600 uppercase text-xs tracking-wider font-semibold">
                    <th className="p-4">記錄/日期 (Record/Date)</th>
                    <th className="p-4">入庫單號 (Batch ID)</th>
                    <th className="p-4">供應商單號 (Supplier Doc)</th>
                    <th className="p-4">產品 (Product)</th>
                    <th className="p-4">供應商 (Supplier)</th>
                    <th className="p-4 text-center">分店 (Branch)</th>
                    <th className="p-4 text-right">數量 (Qty)</th>
                    <th className="p-4 text-right">成本 (Cost)</th>
                    <th className="p-4 text-right">總額 (Total)</th>
                    <th className="p-4 text-center">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRecords.map(record => (
                    <tr key={record.id} className={`hover:bg-slate-50 ${record.status === 'VOID' ? 'opacity-50' : ''}`}>
                      <td className="p-4">
                        <div className="font-bold text-slate-800">
                            {record.id}
                            {record.status === 'VOID' && <span className="ml-2 text-[10px] bg-slate-200 text-slate-500 px-1 rounded">VOID</span>}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-slate-500 mt-1">
                          <Calendar size={10} /> {record.date}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="text-xs text-slate-700 font-mono truncate max-w-[160px]">
                          {record.batchId ? (
                            <button
                              type="button"
                              className="text-blue-600 hover:underline"
                              onClick={() => openBatchDetails(record.batchId)}
                            >
                              {record.batchId}
                            </button>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="text-xs text-slate-600 font-mono truncate max-w-[160px]">
                          {record.supplierDocNo || '-'}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="font-medium text-slate-700">{record.productName}</div>
                      </td>
                      <td className="p-4">
                         <div className="text-slate-600">{record.supplierName}</div>
                      </td>
                      <td className="p-4 text-center">
                        <span className="bg-slate-100 px-2 py-1 rounded font-bold text-slate-600 text-xs">{record.branchId}</span>
                      </td>
                      <td className="p-4 text-right font-bold text-slate-800">{record.quantity}</td>
                      <td className="p-4 text-right text-slate-600">${record.unitCost.toLocaleString()}</td>
                      <td className="p-4 text-right font-bold text-emerald-700">${record.totalCost.toLocaleString()}</td>
                      <td className="p-4 text-center">
                        {record.status !== 'VOID' && (
                            <button 
                            onClick={() => handleVoidRecord(record)}
                            className="text-slate-400 hover:text-red-600 p-1" title="作廢並扣回庫存 (Void & Revert Stock)"
                            >
                            <Ban size={18} />
                            </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {filteredRecords.length === 0 && (
                    <tr><td colSpan={9} className="p-8 text-center text-slate-400">沒有記錄</td></tr>
                  )}
                </tbody>
              </table>
            )}

            {activeTab === 'SUPPLIERS' && (
              <table className="w-full text-left text-sm">
                <thead>
                   <tr className="bg-slate-100 text-slate-600 uppercase text-xs tracking-wider font-semibold">
                    <th className="p-4">公司名稱 (Company)</th>
                    <th className="p-4">聯絡人 (Contact)</th>
                    <th className="p-4">聯絡資料 (Details)</th>
                    <th className="p-4">地址 (Address)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                   {filteredSuppliers.map((supplier: Supplier) => (
                     <tr key={supplier.id} className="hover:bg-slate-50">
                       <td className="p-4 font-bold text-slate-800">{supplier.name}</td>
                       <td className="p-4 text-slate-600">{supplier.contactPerson}</td>
                       <td className="p-4">
                         <div className="flex flex-col gap-1 text-slate-600">
                           <div className="flex items-center gap-2"><Mail size={12}/> {supplier.email}</div>
                           <div className="flex items-center gap-2"><Phone size={12}/> {supplier.phone}</div>
                         </div>
                       </td>
                       <td className="p-4 text-slate-600">
                         <div className="flex items-center gap-2"><MapPin size={12}/> {supplier.address}</div>
                       </td>
                     </tr>
                   ))}
                   {filteredSuppliers.length === 0 && (
                    <tr><td colSpan={4} className="p-8 text-center text-slate-400">沒有供應商資料</td></tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {modalConfig.isOpen && (
        <PurchaseOrderModal 
          mode={modalConfig.mode}
          po={modalConfig.po}
          allPOs={purchaseOrders}
          products={products}
          suppliers={suppliers}
          quotations={quotations}
          categories={categories}
          brands={brands}
          onClose={() => setModalConfig({ ...modalConfig, isOpen: false })}
          onSave={handleSavePO}
          onReceive={handleReceivePO}
          onPrint={() => modalConfig.po && handlePrint(modalConfig.po)}
        />
      )}

      {selectedBatchId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4">
          <div className="bg-white rounded-2xl w-full max-w-4xl overflow-hidden shadow-2xl max-h-[80vh] flex flex-col">
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
                      <th className="px-3 py-2 text-left">產品</th>
                      <th className="px-3 py-2 text-left">供應商</th>
                      <th className="px-3 py-2 text-left">供應商單號</th>
                      <th className="px-3 py-2 text-center">分店</th>
                      <th className="px-3 py-2 text-right">數量</th>
                      <th className="px-3 py-2 text-right">單價</th>
                      <th className="px-3 py-2 text-right">小計</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {batchRecords.map(r => (
                      <tr key={r.id}>
                        <td className="px-3 py-2 text-slate-600 whitespace-nowrap">{r.date}</td>
                        <td className="px-3 py-2 text-slate-800">{r.productName}</td>
                        <td className="px-3 py-2 text-slate-700">{r.supplierName}</td>
                        <td className="px-3 py-2 text-slate-500 font-mono whitespace-nowrap">
                          {r.supplierDocNo || '-'}
                        </td>
                        <td className="px-3 py-2 text-center text-slate-700">{r.branchId}</td>
                        <td className="px-3 py-2 text-right text-slate-700">{r.quantity}</td>
                        <td className="px-3 py-2 text-right text-slate-700">
                          ${r.unitCost.toLocaleString()}
                        </td>
                        <td className="px-3 py-2 text-right text-slate-800 font-medium">
                          {r.totalCost.toLocaleString()}
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

      {confirmConfig && (
        <ConfirmModal 
            isOpen={confirmConfig.isOpen}
            title={confirmConfig.title}
            message={confirmConfig.message}
            onConfirm={confirmConfig.onConfirm}
            onCancel={() => {
              setConfirmConfig(null);
              setStockInSupplierDocNo('');
              stockInSupplierDocNoRef.current = '';
            }}
            isDanger={confirmConfig.isDanger}
        >
          {confirmConfig.title === '確認入庫' && (
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">
                供應商單號 (Supplier Doc No)
                <span className="ml-1 text-[10px] text-slate-400">非必填 Optional</span>
              </label>
              <input
                type="text"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                value={stockInSupplierDocNo}
                onChange={(e) => {
                  setStockInSupplierDocNo(e.target.value);
                  stockInSupplierDocNoRef.current = e.target.value;
                }}
                placeholder="例如: INV-2026-001 / DN-123456"
              />
            </div>
          )}
        </ConfirmModal>
      )}
    </div>
  );
};

// ... PurchaseOrderModal code remains same ...
interface PurchaseOrderModalProps {
  mode: POMode;
  po?: PurchaseOrder;
  allPOs: PurchaseOrder[];
  products: Product[];
  suppliers: Supplier[];
  quotations: Quotation[];
  categories: string[];
  brands: string[];
  onClose: () => void;
  onSave: (po: PurchaseOrder) => void;
  onReceive: (po: PurchaseOrder) => void;
  onPrint?: () => void;
}

const PurchaseOrderModal: React.FC<PurchaseOrderModalProps> = ({ mode, po, allPOs, products, suppliers, quotations, categories, brands, onClose, onSave, onReceive, onPrint }) => {
  const isViewMode = mode === 'VIEW';
  const isEditMode = mode === 'EDIT';
  const isCreate = mode === 'CREATE';

  const [prefix, setPrefix] = useState('PO');
  const [customId, setCustomId] = useState(po?.id || '');
  const [supplierId, setSupplierId] = useState(po?.supplierId || suppliers[0]?.id || '');
  const [items, setItems] = useState<PurchaseOrderItem[]>(po ? JSON.parse(JSON.stringify(po.items)) : []); 
  const [expectedDate, setExpectedDate] = useState(po?.expectedDate || '');

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

  const [qty, setQty] = useState(1);
  const [selectedProductIdsBulk, setSelectedProductIdsBulk] = useState<string[]>([]);

  const [showQuoteSelect, setShowQuoteSelect] = useState(false);
  
  const [confirmConfig, setConfirmConfig] = useState<{isOpen: boolean; title: string; message: string; onConfirm: () => void; isDanger?: boolean} | null>(null);

  React.useEffect(() => {
    if (isCreate && customId === '') {
        generateNextId('PO');
    }
  }, []);

  const generateNextId = (p: string) => {
      const cleanPrefix = p.trim().toUpperCase();
      const matches = allPOs.filter(o => o.id.startsWith(cleanPrefix));
      
      let nextNumString = '';
      if (matches.length > 0) {
        let maxNum = 0;
        let maxLen = 0;
        matches.forEach(o => {
             const digits = o.id.match(/(\d+)$/);
             if (digits) {
                 const num = parseInt(digits[0], 10);
                 if (num > maxNum) maxNum = num;
                 if (digits[0].length > maxLen) maxLen = digits[0].length;
             }
        });
        const targetLen = maxLen > 0 ? maxLen : 3; 
        nextNumString = (maxNum + 1).toString().padStart(targetLen, '0');
        
        if (matches[0].id.includes('-')) {
             const year = new Date().getFullYear();
             setCustomId(`${cleanPrefix}-${year}-${nextNumString}`);
             return;
        }
      } else {
        const year = new Date().getFullYear();
        nextNumString = `001`;
        setCustomId(`${cleanPrefix}-${year}-${nextNumString}`);
        return;
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
      const next = [...prev];
      selectedProductIdsBulk.forEach(id => {
        const p = products.find(x => x.id === id);
        if (!p) return;
        next.push({
          productId: p.id,
          productName: p.name,
          sku: p.sku,
          quantity: qty,
          unitCost: p.cost,
          totalCost: p.cost * qty,
          description: p.name
        });
      });
      return next;
    });
    setSelectedProductIdsBulk([]);
  };

  const updateItemField = (idx: number, field: keyof PurchaseOrderItem, value: string | number) => {
    setItems(prev => prev.map((item, i) => {
      if (i === idx) {
        const updated = { ...item, [field]: value };
        if (field === 'quantity' || field === 'unitCost') {
            updated.totalCost = (updated.quantity as number) * (updated.unitCost as number);
        }
        return updated;
      }
      return item;
    }));
  };

  const removeItem = (idx: number) => {
    setItems(prev => prev.filter((_, i) => i !== idx));
  };

  const handleLoadQuote = (quote: Quotation) => {
      setConfirmConfig({
        isOpen: true,
        title: '載入報價單',
        message: `確定從報價單 ${quote.id} 載入項目到採購單?\n注意：將使用商品「成本價」而非報價單售價。`,
        onConfirm: () => {
            const poItems: PurchaseOrderItem[] = quote.items.map(item => ({
                productId: item.id,
                productName: item.name,
                sku: item.sku,
                quantity: item.quantity,
                unitCost: item.cost,
                totalCost: item.cost * item.quantity,
                description: `From Quote ${quote.id}`
            }));
            setItems(poItems);
            setShowQuoteSelect(false);
            setConfirmConfig(null);
        }
      });
  };

  const totalAmount = items.reduce((acc, i) => acc + i.totalCost, 0);

  const handleSave = () => {
    const supplier = suppliers.find(s => s.id === supplierId);
    const newPO: PurchaseOrder = {
      id: customId,
      supplierId,
      supplierName: supplier?.name || '',
      items,
      totalAmount,
      status: po?.status || 'SENT',
      createdAt: po?.createdAt || new Date().toISOString().split('T')[0],
      createdBy: po?.createdBy || 'Admin',
      branchId: po?.branchId || 'b1',
      expectedDate
    };
    onSave(newPO);
  };

  const modalTitle = isViewMode ? `查看採購單` : (isEditMode ? `編輯採購單` : '建立採購單');
  const canReceive = po?.status === 'SENT';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl w-full max-w-7xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col relative">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
           <div className="flex items-center gap-3">
             <h3 className="font-bold text-lg text-slate-800">{modalTitle}</h3>
             {po?.status && (
               <span className={`px-2 py-1 rounded text-xs font-bold ${
                 po.status === 'RECEIVED' ? 'bg-emerald-100 text-emerald-700' : 
                 po.status === 'SENT' ? 'bg-blue-100 text-blue-700' : 
                 po.status === 'CANCELLED' ? 'bg-slate-200 text-slate-600' :
                 'bg-slate-100 text-slate-600'
               }`}>
                 {po.status}
               </span>
             )}
           </div>
           <div className="flex gap-2">
             {!isViewMode && (
                <button 
                    onClick={() => setShowQuoteSelect(true)}
                    className="text-xs bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg font-medium hover:bg-brand-50 hover:text-brand-600 flex items-center gap-1 transition-colors"
                >
                    <Download size={14} /> 從報價單載入 (Load Quote)
                </button>
             )}
             <button onClick={onClose}><X size={20} className="text-slate-400 hover:text-slate-600" /></button>
           </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 relative">

           {/* Quote Selector Overlay */}
           {showQuoteSelect && (
             <div className="absolute inset-0 bg-white/95 z-20 p-6 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center mb-4">
                   <h4 className="font-bold text-lg text-slate-800">選擇客戶報價單 (Select Client Quote for Back-to-Back)</h4>
                   <button onClick={() => setShowQuoteSelect(false)} className="p-1 hover:bg-slate-100 rounded"><X size={20}/></button>
                </div>
                <div className="border border-slate-200 rounded-lg overflow-hidden max-h-[400px] overflow-y-auto">
                   <table className="w-full text-sm text-left">
                     <thead className="bg-slate-50 text-slate-500 font-bold">
                       <tr>
                         <th className="p-3">單號 (ID)</th>
                         <th className="p-3">客戶 (Customer)</th>
                         <th className="p-3 text-right">項目數 (Items)</th>
                         <th className="p-3"></th>
                       </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-100">
                       {quotations.map((q: Quotation) => (
                         <tr key={q.id} className="hover:bg-slate-50">
                           <td className="p-3 font-mono">{q.id}</td>
                           <td className="p-3">{q.customer?.name || 'Walk-in'}</td>
                           <td className="p-3 text-right">{q.items.length}</td>
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
                       {quotations.length === 0 && <tr><td colSpan={4} className="p-4 text-center text-slate-400">沒有報價單</td></tr>}
                     </tbody>
                   </table>
                </div>
             </div>
          )}
           
           {/* ID & Prefix Section */}
           <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-2 md:grid-cols-4 gap-4 items-end">
              {!isViewMode && (
                <div className="md:col-span-1">
                    <label className="block text-xs font-bold text-slate-500 mb-1">字首 (Prefix)</label>
                    <input 
                      type="text" 
                      className="w-full border rounded p-2 text-sm font-mono text-center uppercase"
                      value={prefix}
                      onChange={handlePrefixChange}
                      placeholder="PO"
                    />
                </div>
              )}
              {/* ... other fields ... */}
              <div className="md:col-span-1">
                 <label className="block text-xs font-bold text-slate-500 mb-1">採購單號 (PO ID)</label>
                 <div className="relative">
                    <input 
                      disabled={isViewMode}
                      type="text" 
                      className="w-full border rounded p-2 text-sm font-mono disabled:bg-slate-200"
                      value={customId}
                      onChange={e => setCustomId(e.target.value)}
                    />
                    {!isViewMode && (
                        <button 
                           onClick={() => generateNextId(prefix)}
                           className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-brand-600"
                           title="Regenerate ID"
                         >
                           <RefreshCw size={14} />
                         </button>
                    )}
                 </div>
              </div>
              <div className="md:col-span-1">
                 <label className="block text-xs font-bold text-slate-500 mb-1">預計日期 (Expected)</label>
                 <input 
                   disabled={isViewMode}
                   type="date" 
                   className="w-full border rounded p-2 text-sm disabled:bg-slate-200 disabled:text-slate-500" 
                   value={expectedDate}
                   onChange={e => setExpectedDate(e.target.value)}
                 />
              </div>
               <div className="md:col-span-1">
                 <label className="block text-xs font-bold text-slate-500 mb-1">供應商 (Supplier)</label>
                 <select 
                   disabled={isViewMode}
                   className="w-full border rounded p-2 text-sm bg-white disabled:bg-slate-200 disabled:text-slate-500" 
                   value={supplierId} 
                   onChange={e => setSupplierId(e.target.value)}
                 >
                   {suppliers.map((s: Supplier) => <option key={s.id} value={s.id}>{s.name}</option>)}
                 </select>
               </div>
           </div>

           {/* Add Items Box */}
           {!isViewMode && (
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <h4 className="text-xs font-bold text-slate-500 uppercase mb-3">加入採購項目 (Add Item)</h4>
                
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
                       {Array.isArray(categories) && categories.map(c => <option key={c} value={c}>{c === 'All' ? '所有分類 (Category)' : c}</option>)}
                   </select>
                   <select 
                       className="w-full border rounded p-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                       value={filterBrand}
                       onChange={e => setFilterBrand(e.target.value)}
                   >
                       {Array.isArray(brands) && brands.map(b => <option key={b} value={b}>{b === 'All' ? '所有品牌 (Brand)' : b}</option>)}
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
                        <th className="w-24 px-2 py-1 text-center">總庫存</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredProducts.map(p => {
                        const checked = selectedProductIdsBulk.includes(p.id);
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
                              {totalStock}
                            </td>
                          </tr>
                        );
                      })}
                      {filteredProducts.length === 0 && (
                        <tr>
                          <td colSpan={5} className="text-xs text-slate-400 text-center py-2">
                            沒有符合的產品
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

               <div className="mt-2 flex items-end justify-end gap-3">
                 <div className="w-24">
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

           {/* Table */}
           <table className="w-full text-left text-sm">
             <thead>
               <tr className="border-b text-slate-500 text-xs uppercase bg-slate-50">
                 <th className="py-2 px-3">SKU</th>
                 <th className="py-2 px-3 w-[40%]">產品/描述</th>
                 <th className="py-2 px-3 text-right">成本 (Cost)</th>
                 <th className="py-2 px-3 text-center">數量 (Qty)</th>
                 <th className="py-2 px-3 text-right">小計 (Subtotal)</th>
                 {!isViewMode && <th className="w-8"></th>}
               </tr>
             </thead>
             <tbody>
               {items.map((item, idx) => (
                 <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                   <td className="py-3 px-3 font-mono text-xs text-slate-500">{item.sku}</td>
                   <td className="py-3 px-3">
                     <div className="font-medium">{item.productName}</div>
                     {isViewMode ? (
                        <div className="text-xs text-slate-400">{item.description}</div>
                     ) : (
                        <input 
                           type="text"
                           className="w-full text-xs border-b border-transparent focus:border-brand-500 focus:outline-none bg-transparent"
                           value={item.description || ''}
                           placeholder="Description..."
                           onChange={(e) => updateItemField(idx, 'description', e.target.value)}
                        />
                     )}
                   </td>
                   <td className="py-3 px-3 text-right">
                     {isViewMode ? (
                       `$${item.unitCost.toLocaleString()}`
                     ) : (
                        <input 
                           type="number"
                           className="w-24 text-right text-sm border border-slate-200 rounded p-1 focus:ring-2 focus:ring-brand-500 outline-none"
                           value={item.unitCost ?? 0}
                           onChange={(e) => updateItemField(idx, 'unitCost', Number(e.target.value))}
                        />
                     )}
                   </td>
                   <td className="py-3 px-3 text-center">
                      {isViewMode ? (
                        item.quantity
                      ) : (
                         <input 
                           type="number"
                           className="w-16 text-center text-sm border border-slate-200 rounded p-1 focus:ring-2 focus:ring-brand-500 outline-none"
                           value={item.quantity ?? 0}
                           onChange={(e) => updateItemField(idx, 'quantity', Number(e.target.value))}
                        />
                      )}
                   </td>
                   <td className="py-3 px-3 text-right font-bold text-slate-800">${item.totalCost.toLocaleString()}</td>
                   {!isViewMode && (
                     <td className="py-3 px-3 text-right">
                        <button onClick={() => removeItem(idx)} className="text-slate-300 hover:text-red-500"><Trash2 size={16} /></button>
                     </td>
                   )}
                 </tr>
               ))}
               {items.length === 0 && <tr><td colSpan={6} className="py-8 text-center text-slate-400">清單為空</td></tr>}
             </tbody>
           </table>
           
           <div className="flex justify-end pt-4 border-t border-slate-100">
              <div>
                <p className="text-slate-500 text-sm text-right">採購總額 (Total)</p>
                <p className="font-bold text-slate-800 text-2xl">${totalAmount.toLocaleString()}</p>
              </div>
           </div>
        </div>

        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
           <button onClick={onClose} className="px-6 py-2 rounded-lg border border-slate-300 bg-white text-slate-600 hover:bg-slate-50 font-medium">
             {isViewMode ? '關閉 (Close)' : '取消 (Cancel)'}
           </button>
           
           {/* Action Buttons */}
           {!isViewMode ? (
              <button 
                onClick={handleSave} 
                disabled={items.length === 0} 
                className="px-6 py-2 rounded-lg bg-brand-600 text-white hover:bg-brand-700 font-bold disabled:opacity-50 flex items-center gap-2"
              >
                <Save size={18} /> {isEditMode ? '更新採購單' : '建立採購單'}
              </button>
           ) : (
             <>
               <button 
                 onClick={onPrint}
                 className="px-6 py-2 rounded-lg bg-slate-800 text-white hover:bg-slate-900 font-medium flex items-center gap-2"
               >
                 <Printer size={18} /> 列印 (Print)
               </button>
               {canReceive && po && (
                 <button 
                    onClick={() => onReceive(po)} 
                    className="px-6 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 font-bold flex items-center gap-2"
                 >
                   <PackageCheck size={18} /> 確認入庫 (Confirm Receive)
                 </button>
               )}
             </>
           )}
        </div>
        
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
    </div>
  );
};

export default PurchasingPage;
