
import React from 'react';
import { Order, Quotation, PurchaseOrder, RepairTicket } from '../types';
import { Building2, Phone, Mail, Globe, Trash2 } from 'lucide-react';

export type PrintDocumentType = 'INVOICE' | 'RECEIPT' | 'QUOTATION' | 'DELIVERY_NOTE' | 'PURCHASE_ORDER' | 'PROFORMA_INVOICE' | 'STOCK_TAKE' | 'REPAIR_TICKET' | 'DAILY_SETTLEMENT';

interface PrintTemplateProps {
  data: Order | Quotation | PurchaseOrder | RepairTicket | any; // Allow any for custom structure
  type: PrintDocumentType;
  companyInfo?: {
    name: string;
    address: string;
    phone: string;
    email: string;
    website: string;
  };
  onRemoveItem?: (index: number) => void;
}

const PrintTemplate: React.FC<PrintTemplateProps> = ({ 
  data, 
  type,
  companyInfo = {
    name: 'HK Tech Limited',
    address: 'Shop 101, 1/F, Mong Kok Computer Centre, Mong Kok, Kowloon',
    phone: '+852 2345 6789',
    email: 'support@hktech.com',
    website: 'www.hktech.com'
  },
  onRemoveItem
}) => {
  const isQuote = type === 'QUOTATION';
  const isProforma = type === 'PROFORMA_INVOICE';
  const isPO = type === 'PURCHASE_ORDER';
  const isDN = type === 'DELIVERY_NOTE';
  const isStockTake = type === 'STOCK_TAKE';
  const isRepair = type === 'REPAIR_TICKET';
  const isDailySettlement = type === 'DAILY_SETTLEMENT';

  // Type Guards & Data Access
  const quoteData = (isQuote || isProforma) ? (data as Quotation) : null;
  const poData = isPO ? (data as PurchaseOrder) : null;
  const repairData = isRepair ? (data as RepairTicket) : null;
  const orderData = (!isQuote && !isProforma && !isPO && !isStockTake && !isRepair && !isDailySettlement) ? (data as Order) : null;

  // Items extraction
  let items: any[] = [];
  if (poData) items = poData.items;
  else if (data?.items) items = data.items;
  else if (repairData) {
      // Create a pseudo-item for the repair ticket table
      items = [{
          description: `${repairData.productName} (SN: ${repairData.serialNumber})`,
          sku: repairData.productSku || 'RMA-ITEM',
          quantity: 1,
          price: repairData.repairPrice || 0,
          total: repairData.repairPrice || 0
      }];
  }

  const customer = (!isPO && !isStockTake) ? (data as any)?.customer : null;
  const supplierName = poData ? poData.supplierName : '';

  const totalPaid = orderData?.payments?.reduce((acc, p) => acc + p.amount, 0) || 0;
  // @ts-ignore
  const totalAmount = poData ? poData.totalAmount : (isRepair ? repairData?.repairPrice : (data?.total || 0));
  const balance = (totalAmount || 0) - totalPaid;

  return (
    <div className="w-[210mm] min-h-[297mm] mx-auto bg-white p-[15mm] text-slate-900 font-sans relative group/page">
      
      {/* HEADER */}
      <div className="flex justify-between items-start border-b-2 border-slate-800 pb-6 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
             <div className="w-10 h-10 bg-slate-900 text-white flex items-center justify-center font-bold text-xl rounded">HK</div>
             <h1 className="text-2xl font-bold tracking-tight">{companyInfo.name}</h1>
          </div>
          <div className="text-xs text-slate-500 space-y-1 ml-1">
             <p className="flex items-center gap-2"><Building2 size={10} /> {companyInfo.address}</p>
             <div className="flex gap-4">
                <p className="flex items-center gap-2"><Phone size={10} /> {companyInfo.phone}</p>
                <p className="flex items-center gap-2"><Mail size={10} /> {companyInfo.email}</p>
                <p className="flex items-center gap-2"><Globe size={10} /> {companyInfo.website}</p>
             </div>
          </div>
        </div>
        <div className="text-right">
          <h2 className="text-3xl font-bold text-slate-800 tracking-wider uppercase mb-1">
            {type.replace('_', ' ')}
          </h2>
          <p className="font-mono text-slate-500 font-medium">#{data?.id || 'N/A'}</p>
        </div>
      </div>

      {/* INFO GRID */}
      <div className="grid grid-cols-2 gap-12 mb-8">
        {/* Bill To / Vendor */}
        <div>
          {!isStockTake && !isDailySettlement && (
            <>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                {isPO ? 'Vendor (供應商)' : (isQuote || isProforma ? 'To (客戶)' : 'Bill To (客戶)')}
              </h3>
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 h-full">
                {isPO ? (
                  <>
                    <p className="font-bold text-lg text-slate-800">{supplierName}</p>
                    <p className="text-sm text-slate-500 mt-2">Vendor Address</p> 
                  </>
                ) : (
                    customer ? (
                      <>
                        <p className="font-bold text-lg text-slate-800">{customer.companyName || customer.name}</p>
                        {customer.companyName && <p className="text-sm text-slate-600 mb-1">Attn: {customer.name}</p>}
                        <p className="text-sm text-slate-500 mt-2">{customer.address || 'No Address Provided'}</p>
                        <div className="mt-3 pt-3 border-t border-slate-200 text-xs text-slate-500">
                          <p>Tel: {customer.phone}</p>
                          <p>Email: {customer.email}</p>
                        </div>
                      </>
                    ) : (
                      <p className="text-slate-500 italic">Walk-in Customer (零售客戶)</p>
                    )
                )}
              </div>
            </>
          )}
          {isStockTake && (
             <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 h-full">
                <h3 className="font-bold text-lg text-slate-800 mb-2">Inventory Check Details</h3>
                <div className="text-sm text-slate-600 space-y-1">
                   <p><strong>Branch (分店):</strong> {data?.branchName || '-'}</p>
                   <p><strong>Category (分類):</strong> {data?.category || 'All'}</p>
                   <p><strong>Brand (品牌):</strong> {data?.brand || 'All'}</p>
                </div>
             </div>
          )}
          {isDailySettlement && (
             <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 h-full">
                <h3 className="font-bold text-lg text-slate-800 mb-2">Settlement Summary</h3>
                <div className="text-sm text-slate-600 space-y-1">
                   <p><strong>Branch (分店):</strong> {data?.branchName || '-'}</p>
                   <p><strong>Total Orders (訂單數):</strong> {data?.totalCount || 0}</p>
                   <p><strong>Total Revenue (總營業額):</strong> ${data?.totalRevenue?.toLocaleString() || 0}</p>
                   <p><strong>Cash In Drawer (現金櫃):</strong> ${data?.cashInDrawer?.toLocaleString() || 0}</p>
                </div>
             </div>
          )}
        </div>

        {/* Details */}
        <div>
           <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Details (資料)</h3>
           <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm">
              <div className="text-slate-500">Date (日期):</div>
              <div className="font-medium text-right">
                {data?.createdAt ? new Date(data.createdAt).toLocaleDateString() : '-'}
              </div>

              {(isQuote || isProforma) && quoteData && (
                <>
                  <div className="text-slate-500">Valid Until (有效期):</div>
                  <div className="font-medium text-right text-red-600">{quoteData.validUntil}</div>
                </>
              )}

              {isPO && poData && poData.expectedDate && (
                 <>
                  <div className="text-slate-500">Expected (預計):</div>
                  <div className="font-medium text-right">{poData.expectedDate}</div>
                 </>
              )}

              <div className="text-slate-500">{isPO ? 'Created By' : (isStockTake ? 'Staff' : 'Salesperson')}:</div>
              <div className="font-medium text-right">
                  {(isQuote || isProforma) ? quoteData?.createdBy : (isPO ? poData?.createdBy : (isStockTake ? data?.createdBy : (isRepair ? repairData?.createdBy : orderData?.cashierName)))}
              </div>

              {!isStockTake && (
                <>
                  <div className="text-slate-500">Status (狀態):</div>
                  <div className="font-medium text-right uppercase">{data?.status}</div>
                  
                  <div className="text-slate-500">Currency (貨幣):</div>
                  <div className="font-medium text-right">HKD ($)</div>
                </>
              )}
           </div>
        </div>
      </div>

      {/* ITEMS TABLE */}
      <div className="mb-8">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="bg-slate-900 text-white uppercase text-xs">
              <th className="py-3 px-4 w-12 text-center">#</th>
              <th className="py-3 px-4">{isDailySettlement ? 'Payment Method' : 'Item & Description'}</th>
              {isStockTake ? (
                 <>
                   <th className="py-3 px-4 text-center w-32 border-l border-slate-700">System Qty</th>
                   <th className="py-3 px-4 text-left w-48 border-l border-slate-700">Actual Count (實點)</th>
                 </>
              ) : (
                 !isDailySettlement && <th className="py-3 px-4 text-right w-24">Qty</th>
              )}
              
              {!isDN && !isStockTake && !isDailySettlement && (
                <>
                  <th className="py-3 px-4 text-right w-32">Unit Price</th>
                  {!isPO && !isRepair && <th className="py-3 px-4 text-right w-24">Disc.</th>}
                  <th className="py-3 px-4 text-right w-32">Total</th>
                </>
              )}
              {isDailySettlement && (
                <th className="py-3 px-4 text-right w-32">Amount</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {items.map((item: any, index: number) => (
              <tr key={index} className="group">
                <td className="py-3 px-4 text-center text-slate-500 relative">
                  <span className={onRemoveItem ? "group-hover:opacity-0 transition-opacity" : ""}>{index + 1}</span>
                  {onRemoveItem && !isDailySettlement && (
                     <button 
                       onClick={() => onRemoveItem(index)}
                       className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-slate-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all print:hidden p-1 bg-white rounded-full shadow-sm border border-slate-200"
                       title="移除此行 (Remove Item from Print)"
                     >
                        <Trash2 size={14} />
                     </button>
                  )}
                </td>
                <td className="py-3 px-4">
                  <p className="font-bold text-slate-800">
                    {item.description || (isPO ? item.productName : item.name)}
                  </p>
                  {!isDailySettlement && (
                    <p className="text-xs text-slate-500 mt-0.5">{item.sku}</p>
                  )}
                  {/* SERIAL NUMBERS DISPLAY */}
                  {!isDailySettlement && item.serialNumbers && item.serialNumbers.length > 0 && (
                      <div className="mt-1 text-[10px] text-slate-600 font-mono break-all">
                          <span className="font-bold">SN:</span> {item.serialNumbers.filter((sn: string) => sn).join(', ')}
                      </div>
                  )}
                </td>
                
                {isStockTake ? (
                   <>
                     <td className="py-3 px-4 text-center font-medium text-slate-600 border-l border-slate-100 bg-slate-50">
                        {item.quantity}
                     </td>
                     <td className="py-3 px-4 border-l border-slate-100">
                        <div className="border-b border-slate-300 h-6 w-full"></div>
                     </td>
                   </>
                ) : (
                   !isDailySettlement && <td className="py-3 px-4 text-right font-medium">{item.quantity}</td>
                )}

                {!isDN && !isStockTake && !isDailySettlement && (
                  <>
                    <td className="py-3 px-4 text-right text-slate-600">
                        ${(isPO ? item.unitCost : item.price).toLocaleString()}
                    </td>
                    {!isPO && !isRepair && <td className="py-3 px-4 text-right text-red-500">{item.discount > 0 ? `-$${item.discount}` : '-'}</td>}
                    <td className="py-3 px-4 text-right font-bold text-slate-800">
                      ${(isPO ? item.totalCost : (isRepair ? (item.total || 0) : ((item.price - item.discount) * item.quantity))).toLocaleString()}
                    </td>
                  </>
                )}
                {isDailySettlement && (
                  <td className="py-3 px-4 text-right font-bold text-slate-800">
                    ${(item.amount || 0).toLocaleString()}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Repair Specific Issue Block */}
      {isRepair && repairData && (
          <div className="mb-8 p-4 bg-slate-50 border border-slate-200 rounded">
              <h4 className="font-bold text-sm text-slate-700 mb-2">Issue Details (故障詳情):</h4>
              <p className="text-sm text-slate-600 mb-2"><strong>Problem:</strong> {repairData.problemDescription}</p>
              <p className="text-sm text-slate-600"><strong>Accessories:</strong> {repairData.accessories}</p>
          </div>
      )}

      {/* TOTALS & SUMMARY (Hidden for Delivery Note, Stock Take and Daily Settlement) */}
      {!isDN && !isStockTake && !isDailySettlement && (
        <div className="flex justify-end mb-12">
          <div className="w-1/2 max-w-xs space-y-3">
            {!isPO && !isRepair && (
                <>
                    <div className="flex justify-between text-sm text-slate-500">
                      <span>Subtotal (小計)</span>
                      {/* @ts-ignore */}
                      <span>${data?.subtotal?.toLocaleString() || 0}</span>
                    </div>
                    <div className="flex justify-between text-sm text-slate-500">
                      <span>Discount (折扣)</span>
                      {/* @ts-ignore */}
                      <span>-${data?.totalDiscount?.toLocaleString() || 0}</span>
                    </div>
                </>
            )}
            <div className="border-t-2 border-slate-800 pt-3 flex justify-between items-end">
              <span className="font-bold text-lg text-slate-800">Total (總額)</span>
              <span className="font-bold text-2xl text-slate-900">${(totalAmount || 0).toLocaleString()}</span>
            </div>

            {/* Payment Info for Invoice/Receipt */}
            {orderData && (
              <div className="bg-slate-50 p-3 rounded mt-4 border border-slate-100">
                 <div className="text-xs font-bold text-slate-500 uppercase mb-2 border-b border-slate-200 pb-1">Payment History</div>
                 {orderData.payments.map((p, i) => (
                   <div key={i} className="flex justify-between text-xs mb-1">
                      <span className="text-slate-600">{p.method}</span>
                      <span className="font-medium">${p.amount.toLocaleString()}</span>
                   </div>
                 ))}
                 <div className="border-t border-slate-200 pt-1 mt-1 flex justify-between text-sm font-bold">
                    <span className={balance > 0 ? 'text-red-600' : 'text-emerald-600'}>
                       {balance > 0 ? 'Balance Due (尚欠)' : 'Paid In Full (已付清)'}
                    </span>
                    <span>${Math.max(0, balance).toLocaleString()}</span>
                 </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* FOOTER / SIGNATURE */}
      <div className="mt-auto border-t border-slate-200 pt-8 break-inside-avoid">
        <div className="grid grid-cols-2 gap-12">
          <div>
            {!isStockTake && !isDailySettlement && <h4 className="font-bold text-sm text-slate-800 mb-2">Terms & Conditions</h4>}
            {isStockTake && <h4 className="font-bold text-sm text-slate-800 mb-2">Instructions</h4>}
            
            <ul className="text-[10px] text-slate-500 list-disc list-inside space-y-1">
              {!isStockTake && !isRepair && !isDailySettlement && (
                <>
                  <li>Goods sold are non-refundable. Exchange within 7 days with original receipt.</li>
                  <li>Warranty service requires this document and original packaging.</li>
                  <li>{companyInfo.name} reserves the right of final decision.</li>
                  {(isQuote || isProforma) && <li>This quotation is valid for 30 days from the date of issue.</li>}
                </>
              )}
              {isRepair && (
                  <>
                    <li>Please bring this ticket for item collection.</li>
                    <li>Repair items not claimed within 60 days will be disposed of.</li>
                    <li>Data loss during repair is not covered; please backup data.</li>
                  </>
              )}
              {isStockTake && (
                 <>
                   <li>Please count physically and write the actual quantity in the "Actual Count" column.</li>
                   <li>Verify product condition while counting.</li>
                   <li>Sign and date upon completion.</li>
                 </>
              )}
              {isDailySettlement && (
                 <>
                   <li>Confirmed cash in drawer matches system record.</li>
                   <li>All receipts and vouchers are attached.</li>
                 </>
              )}
            </ul>
          </div>
          <div className="flex flex-col justify-end gap-12">
             <div className="flex justify-between gap-8 text-center">
                <div className="flex-1">
                   <div className="border-b border-slate-400 h-8"></div>
                   <p className="text-xs text-slate-500 mt-2">{isStockTake ? 'Counted By' : (isDailySettlement ? 'Prepared By' : 'Issued By')}</p>
                </div>
                <div className="flex-1">
                   <div className="border-b border-slate-400 h-8"></div>
                   <p className="text-xs text-slate-500 mt-2">{isPO ? 'Authorized Signature' : (isStockTake ? 'Verified By' : (isRepair ? 'Customer Signature' : (isDailySettlement ? 'Approved By' : 'Accepted By')))}</p>
                </div>
             </div>
          </div>
        </div>
        <div className="text-center text-[10px] text-slate-400 mt-8">
           System Generated by HK Tech POS
        </div>
      </div>
    </div>
  );
};

export default PrintTemplate;
