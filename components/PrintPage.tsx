
import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate, useLocation, useOutletContext } from 'react-router-dom';
import PrintTemplate, { PrintDocumentType } from './PrintTemplate';
import { Printer, X, ArrowLeft, RefreshCw } from 'lucide-react';
import { API_BASE_URL } from '../App'; // Import API_BASE_URL

const PrintPage: React.FC = () => {
  const { type, id } = useParams<{ type: string; id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [printData, setPrintData] = useState<any>(null);
  const [originalData, setOriginalData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const outletContext = useOutletContext<any | null>();
  const authToken = outletContext?.authToken ?? localStorage.getItem('authToken');

  // Initialize data
  useEffect(() => {
      const fetchData = async () => {
        let data = location.state?.data;
        
        // Fallback lookup if page loaded directly via URL
        if (!data && id) {
            setLoading(true);
            try {
                let endpoint = '';
                if (type === 'order') endpoint = `${API_BASE_URL}/get_orders.php`;
                else if (type === 'quotation' || type === 'proforma') endpoint = `${API_BASE_URL}/get_quotations.php`;
                else if (type === 'po') endpoint = `${API_BASE_URL}/get_purchase_orders.php`;
                else if (type === 'repair') endpoint = `${API_BASE_URL}/get_repairs.php`;
                
                if (endpoint) {
                    const res = await fetch(endpoint, {
                      headers: authToken ? { 'X-Auth-Token': authToken } : undefined,
                    });
                    if (!res.ok) throw new Error('API Error');
                    const allData = await res.json();
                    if (Array.isArray(allData)) {
                        data = allData.find((item: any) => item.id === id);
                    }
                }
            } catch (err) {
                console.error("Failed to fetch print data", err);
                setError("Failed to load data");
            } finally {
                setLoading(false);
            }
        }

        if (data) {
            // Deep copy to prevent mutating the original data
            setPrintData(JSON.parse(JSON.stringify(data)));
            setOriginalData(JSON.parse(JSON.stringify(data)));
        } else if (!loading && !printData) {
             // If still no data and not loading
             // setError("Document not found");
        }
      };

      fetchData();
  }, [id, type, location.state]);

  // Determine Document Type
  let docType: PrintDocumentType = 'INVOICE';
  if (type === 'order') {
      const mode = searchParams.get('mode');
      if (mode === 'delivery') {
          docType = 'DELIVERY_NOTE';
      } else if (mode === 'receipt') {
          docType = 'RECEIPT';
      } else {
          docType = 'INVOICE';
      }
  } else if (type === 'quotation') {
      docType = 'QUOTATION';
  } else if (type === 'proforma') {
      docType = 'PROFORMA_INVOICE';
  } else if (type === 'po') {
      docType = 'PURCHASE_ORDER';
  } else if (type === 'stocktake') {
      docType = 'STOCK_TAKE';
  } else if (type === 'repair') {
      docType = 'REPAIR_TICKET';
  } else if (type === 'daily') {
      docType = 'DAILY_SETTLEMENT';
  }

  const handlePrint = () => {
      window.print();
  };

  const handleClose = () => {
      if (window.history.state && window.history.state.idx > 0) {
          navigate(-1);
      } else {
          navigate('/');
      }
  };

  const handleRemoveItem = (index: number) => {
      if (!printData) return;
      // Note: Repair tickets don't typically have removeable items in this context, 
      // but if we extend to billing parts, this logic handles it.
      
      const newItems = [...(printData.items || [])];
      newItems.splice(index, 1);
      
      // Recalculate totals
      let subtotal = 0;
      let totalDiscount = 0;
      
      newItems.forEach((item: any) => {
          const qty = item.quantity || 0;
          const price = item.price ?? item.unitCost ?? 0;
          const discount = item.discount || 0;
          subtotal += price * qty;
          totalDiscount += discount * qty;
      });
      const total = subtotal - totalDiscount;

      setPrintData({
          ...printData,
          items: newItems,
          subtotal,
          totalDiscount,
          total,       // for Order/Quotation
          totalAmount: total // for PO
      });
  };

  const handleReset = () => {
      if (originalData) {
          setPrintData(JSON.parse(JSON.stringify(originalData)));
      }
  };

  if (!printData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 text-slate-500">
        <h1 className="text-xl font-bold mb-2">找不到文件 (Document Not Found)</h1>
        <p>ID: {id}</p>
        {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
        <button onClick={() => navigate(-1)} className="mt-4 text-brand-600 hover:underline">返回 (Go Back)</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center">
      
      {/* Floating Toolbar for Preview */}
      <div className="w-full bg-slate-900 text-white p-3 shadow-md print:hidden flex justify-between items-center px-4 md:px-8 sticky top-0 z-50">
         <div className="flex items-center gap-4">
            <button onClick={handleClose} className="hover:bg-slate-800 p-2 rounded-full transition-colors">
                <ArrowLeft size={20} />
            </button>
            <div>
                <h2 className="font-bold text-sm md:text-base">列印預覽 (Print Preview)</h2>
                <div className="flex items-center gap-2">
                    <span className="text-[10px] bg-slate-700 px-2 py-0.5 rounded text-slate-300 font-mono hidden md:inline-block">
                        {printData.id} - {docType}
                    </span>
                    {printData.items?.length === 0 && <span className="text-[10px] text-red-400 bg-red-900/30 px-2 py-0.5 rounded">空白 (Empty)</span>}
                </div>
            </div>
         </div>
         <div className="flex gap-3">
            <button 
                onClick={handleReset}
                className="px-3 py-2 text-sm bg-slate-800 hover:bg-slate-700 text-slate-300 rounded flex items-center gap-2 transition-colors"
                title="重置 (Reset Data)"
            >
                <RefreshCw size={16} /> <span className="hidden md:inline">重置</span>
            </button>
            <button 
                onClick={handleClose}
                className="px-4 py-2 text-sm bg-slate-700 hover:bg-slate-600 rounded flex items-center gap-2 transition-colors hidden md:flex"
            >
                <X size={16} /> 關閉 (Close)
            </button>
            <button 
                onClick={handlePrint}
                className="px-6 py-2 text-sm bg-blue-600 hover:bg-blue-500 font-bold rounded flex items-center gap-2 shadow-lg transition-colors"
            >
                <Printer size={16} /> 列印 (Print)
            </button>
         </div>
      </div>

      <div className="my-8 shadow-2xl print:shadow-none print:m-0 animate-in zoom-in-95 duration-300 origin-top">
        <PrintTemplate 
            data={printData} 
            type={docType} 
            onRemoveItem={handleRemoveItem}
        />
      </div>
    </div>
  );
};

export default PrintPage;
