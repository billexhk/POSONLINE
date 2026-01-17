
import React, { useState, useEffect } from 'react';
import { X, CreditCard, Banknote, Smartphone, Globe, Plus, Trash2, Printer, Loader2, ArrowLeftRight } from 'lucide-react';
import { PaymentMethod, PaymentRecord, Customer, CartItem } from '../../types';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  total: number;
  customer: Customer | null;
  items: CartItem[];
  onComplete: (payments: PaymentRecord[], isDeposit: boolean) => void;
}

const CheckoutModal: React.FC<CheckoutModalProps> = ({ isOpen, onClose, total, customer, onComplete }) => {
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [currentAmount, setCurrentAmount] = useState<string>('');
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>(PaymentMethod.CASH);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDeposit, setIsDeposit] = useState(false);

  // Refund logic: check if total is negative
  const isRefund = total < 0;
  const absTotal = Math.abs(total);

  useEffect(() => {
    if (isOpen) {
      setPayments([]);
      setCurrentAmount(absTotal.toString());
      setSelectedMethod(PaymentMethod.CASH);
      setIsDeposit(false);
    }
  }, [isOpen, total]);

  // Handle Escape key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isOpen && e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const paidTotal = payments.reduce((acc, p) => acc + p.amount, 0);
  const remaining = absTotal - paidTotal;

  const handleAddPayment = () => {
    const amount = parseFloat(currentAmount);
    if (!amount || amount <= 0) return;
    if (amount > remaining + 0.1) { // Floating point buffer
      alert(`金額超出${isRefund ? '退款' : '剩餘'}款項 (Amount exceeds remaining balance)`);
      return;
    }

    setPayments([...payments, { method: selectedMethod, amount }]);
    
    // Auto calculate next remaining
    const nextRemaining = remaining - amount;
    setCurrentAmount(nextRemaining > 0 ? nextRemaining.toFixed(1) : '');
  };

  const removePayment = (index: number) => {
    const newPayments = [...payments];
    newPayments.splice(index, 1);
    setPayments(newPayments);
    // Recalculate remaining for input
    const newPaid = newPayments.reduce((acc, p) => acc + p.amount, 0);
    setCurrentAmount((absTotal - newPaid).toFixed(1));
  };

  const handleFinalize = async () => {
    setIsProcessing(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // If it's a refund, the payment records are technically money OUT.
    // However, usually we store positive magnitude in payment records and the Order Total is negative.
    // The backend knows Order Total is negative, so Payments balance it out.
    // For specific refund tracking, sometimes negative payments are used. 
    // Here we will send the payments as they are (positive magnitude) because the Order Total will be negative.
    
    onComplete(payments, isDeposit);
    setIsProcessing(false);
  };

  if (!isOpen) return null;

  const getMethodIcon = (method: PaymentMethod) => {
    // Basic mapping based on enum values
    if (method.includes('Cash')) return <Banknote size={18} />;
    if (method.includes('Card')) return <CreditCard size={18} />;
    if (method.includes('PayMe') || method.includes('FPS') || method.includes('WeChat') || method.includes('Alipay')) return <Smartphone size={18} />;
    return <Globe size={18} />;
  };

  const isPaidEnough = remaining <= 0.5; // Tolerance

  // Logic to determine if button should be enabled
  // If isDeposit is true, allow ANY payment state (including 0 payments).
  // If isDeposit is false, must be paid enough AND have at least one payment.
  const isDisabled = isProcessing || (!isDeposit && (!isPaidEnough || payments.length === 0));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-opacity">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col md:flex-row max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Left Side: Summary */}
        <div className={`w-full md:w-1/3 p-6 border-r border-slate-200 flex flex-col ${isRefund ? 'bg-red-50' : 'bg-slate-50'}`}>
          <h2 className={`text-xl font-bold mb-6 flex items-center gap-2 ${isRefund ? 'text-red-700' : 'text-slate-800'}`}>
             {isRefund ? <ArrowLeftRight size={24}/> : null}
             {isRefund ? '退款詳情 (Refund)' : '付款詳情 (Payment)'}
          </h2>
          
          <div className="space-y-4 flex-1">
            <div className="flex justify-between items-center text-slate-600">
              <span>{isRefund ? '應退總額 (Total Refund)' : '總金額 (Total)'}</span>
              <span className={`text-xl font-bold ${isRefund ? 'text-red-700' : 'text-slate-900'}`}>
                  {isRefund ? '-' : ''}${absTotal.toLocaleString()}
              </span>
            </div>
            
            {customer && (
               <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                 <p className="text-xs text-blue-600 uppercase font-bold mb-1">客戶 (Customer)</p>
                 <p className="text-sm font-medium text-blue-900">{customer.name}</p>
                 <p className="text-xs text-blue-700">{customer.points} 積分</p>
               </div>
            )}

            <div className="pt-4 border-t border-slate-200">
               <div className="flex justify-between items-center mb-2">
                 <span className="text-sm text-slate-500">{isRefund ? '已退金額 (Refunded)' : '已付金額 (Paid)'}</span>
                 <span className="font-semibold text-emerald-600">${paidTotal.toLocaleString()}</span>
               </div>
               <div className="flex justify-between items-center">
                 <span className="text-sm text-slate-500">{isRefund ? '剩餘退款 (Remaining)' : '剩餘金額 (Remaining)'}</span>
                 <span className={`font-bold text-xl ${remaining > 0 ? 'text-red-600' : 'text-slate-400'}`}>
                   ${Math.max(0, remaining).toLocaleString()}
                 </span>
               </div>
            </div>

            {!isRefund && (
                <div className="mt-4">
                <label className="flex items-center gap-2 cursor-pointer select-none group">
                    <input 
                    type="checkbox" 
                    checked={isDeposit} 
                    onChange={(e) => setIsDeposit(e.target.checked)}
                    className="w-5 h-5 rounded border-slate-300 text-brand-600 focus:ring-brand-500 cursor-pointer"
                    />
                    <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900">這是一筆訂金/分期 (Deposit)</span>
                </label>
                {isDeposit && (
                    <p className="text-xs text-orange-600 mt-1 ml-7">
                    餘額將記錄為該客戶的未付款項。允許 $0 下單。
                    </p>
                )}
                </div>
            )}
          </div>
        </div>

        {/* Right Side: Actions */}
        <div className="w-full md:w-2/3 p-6 flex flex-col bg-white">
          <div className="flex justify-between items-center mb-6">
             <h3 className="font-bold text-lg text-slate-700">{isRefund ? '選擇退款方式 (Refund Method)' : '新增付款 (Add Payment)'}</h3>
             <button onClick={onClose} className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400">
               <X size={24} />
             </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {Object.values(PaymentMethod).map((method) => (
              <button
                key={method}
                onClick={() => setSelectedMethod(method)}
                className={`p-3 rounded-xl border text-sm font-medium transition-all flex flex-col items-center gap-2 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-1 ${
                  selectedMethod === method 
                    ? 'border-brand-500 bg-brand-50 text-brand-700 ring-2 ring-brand-500 ring-offset-1' 
                    : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                {getMethodIcon(method)}
                <span className="text-center text-xs">{method.split(' ')[0]}</span>
              </button>
            ))}
          </div>

          <div className="flex gap-3 mb-8">
            <div className="relative flex-1">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
              <input 
                type="number"
                value={currentAmount}
                onChange={(e) => setCurrentAmount(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddPayment()}
                className="w-full pl-8 pr-4 py-3 rounded-xl border border-slate-200 text-lg font-bold focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                placeholder="0.00"
                autoFocus
              />
            </div>
            <button 
              onClick={handleAddPayment}
              disabled={!currentAmount || parseFloat(currentAmount) <= 0}
              className="bg-slate-800 hover:bg-slate-900 focus:ring-2 focus:ring-offset-2 focus:ring-slate-900 disabled:opacity-50 text-white px-6 rounded-xl font-medium flex items-center gap-2 transition-all"
            >
              <Plus size={20} /> 新增
            </button>
          </div>

          <div className="flex-1 overflow-y-auto mb-6 pr-2">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                {isRefund ? '退款明細 (Refund Breakdown)' : '付款明細 (Breakdown)'}
            </h4>
            {payments.length === 0 ? (
              <div className="text-center py-8 text-slate-400 border-2 border-dashed border-slate-100 rounded-xl">
                {isRefund ? '尚未新增退款' : '尚未新增付款'}
              </div>
            ) : (
              <div className="space-y-2">
                {payments.map((p, idx) => (
                  <div key={idx} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="text-slate-500">{getMethodIcon(p.method)}</div>
                      <span className="font-medium text-slate-700 text-sm">{p.method}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-bold text-slate-900">${p.amount.toLocaleString()}</span>
                      <button 
                        onClick={() => removePayment(idx)} 
                        className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={handleFinalize}
            disabled={isDisabled}
            className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-3 transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 ${
              !isDisabled
                ? (isRefund ? 'bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-500/30' : 'bg-brand-600 hover:bg-brand-700 text-white shadow-lg shadow-brand-500/30')
                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
            }`}
          >
            {isProcessing ? (
              <Loader2 className="animate-spin" />
            ) : (
              <>
                <Printer size={20} />
                {isRefund ? '確認退款並列印 (Confirm Refund)' : (isDeposit ? '處理訂金並列印 (Deposit)' : '完成交易並列印 (Finalize)')}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CheckoutModal;
