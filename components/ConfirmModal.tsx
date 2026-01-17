import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  isDanger?: boolean;
  children?: React.ReactNode;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({ 
  isOpen, 
  title, 
  message, 
  onConfirm, 
  onCancel,
  confirmText = '確認 (Confirm)',
  cancelText = '取消 (Cancel)',
  isDanger = false,
  children
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden scale-100 animate-in zoom-in-95 duration-200">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className={`p-3 rounded-full ${isDanger ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'}`}>
              <AlertTriangle size={24} />
            </div>
            <h3 className="font-bold text-lg text-slate-800">{title}</h3>
          </div>
          <p className="text-slate-600 mb-4 whitespace-pre-wrap leading-relaxed">{message}</p>
          {children && (
            <div className="mb-6">
              {children}
            </div>
          )}
          <div className="flex gap-3">
             <button 
               onClick={onCancel}
               className="flex-1 px-4 py-3 border border-slate-300 rounded-xl text-slate-700 font-bold hover:bg-slate-50 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400"
             >
               {cancelText}
             </button>
             <button 
               onClick={onConfirm}
               className={`flex-1 px-4 py-3 text-white rounded-xl font-bold shadow-lg transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                 isDanger 
                   ? 'bg-red-600 hover:bg-red-700 focus:ring-red-600 shadow-red-200' 
                   : 'bg-brand-600 hover:bg-brand-700 focus:ring-brand-600 shadow-brand-200'
               }`}
             >
               {confirmText}
             </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
