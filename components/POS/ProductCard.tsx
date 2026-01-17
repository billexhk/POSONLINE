
import React from 'react';
import { Product } from '../../types';
import { Plus, Infinity, Eye } from 'lucide-react';

interface ProductCardProps {
  product: Product;
  onAdd: (product: Product) => void;
  onQuickView: (product: Product) => void;
  branchId: string;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, onAdd, onQuickView, branchId }) => {
  const currentBranchStock = product.stock[branchId] || 0;
  const totalStock = Object.values(product.stock).reduce((a: number, b: number) => a + b, 0);
  
  // If trackStock is false, it's never out of stock
  const isOutOfStock = product.trackStock && currentBranchStock <= 0;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOutOfStock && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      onAdd(product);
    }
  };

  const handleQuickViewClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      onQuickView(product);
  };

  return (
    <div 
      role="button"
      tabIndex={isOutOfStock ? -1 : 0}
      onKeyDown={handleKeyDown}
      className={`bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex flex-col h-full hover:shadow-md hover:border-brand-300 focus:ring-2 focus:ring-brand-500 focus:outline-none transition-all cursor-pointer group select-none ${isOutOfStock ? 'opacity-75 bg-slate-50' : ''}`}
      onClick={() => !isOutOfStock && onAdd(product)}
    >
      <div className="flex justify-between items-start mb-2">
         <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded">{product.brand}</span>
         {product.trackStock && (
             <span className="text-[10px] font-medium text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">
                Total: {totalStock}
             </span>
         )}
      </div>

      <div className="flex-1">
        <h3 className="font-bold text-slate-800 text-sm leading-snug mb-1 line-clamp-3">
          {product.description || product.name}
        </h3>
        <div className="text-[10px] text-slate-400 font-mono mb-2 flex justify-between items-center">
            <span>{product.sku}</span>
        </div>
      </div>
      
      <div className="mt-2 space-y-2">
        {/* Detailed Stock Row */}
        <div className="flex items-center justify-between text-xs border-t border-b border-slate-50 py-1">
            <span className="text-slate-400 text-[10px]">倉存 (Stock):</span>
            <div className="flex items-center gap-1">
                {product.trackStock ? (
                    <span className={`font-bold px-1.5 py-0.5 rounded ${
                        currentBranchStock <= product.lowStockThreshold 
                        ? 'bg-red-100 text-red-600' 
                        : 'bg-emerald-100 text-emerald-700'
                    }`}>
                        {branchId}: {currentBranchStock}
                    </span>
                ) : (
                    <span className="font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-600 flex items-center gap-1">
                        <Infinity size={10} /> Service
                    </span>
                )}
            </div>
        </div>

        <div className="flex items-center justify-between pt-1">
          <div className="font-bold text-lg text-brand-600">
            ${product.price.toLocaleString()}
          </div>
          <div className="flex gap-1">
             <button 
                onClick={handleQuickViewClick}
                className="bg-slate-100 text-slate-500 p-1.5 rounded-lg hover:bg-slate-200 hover:text-slate-800 transition-colors"
                title="快速查看/修改 (Quick View)"
             >
                <Eye size={16} />
             </button>
             <div className="bg-brand-50 text-brand-600 p-1.5 rounded-lg group-hover:bg-brand-600 group-hover:text-white transition-colors">
                <Plus size={16} />
             </div>
          </div>
        </div>
        {isOutOfStock && (
            <div className="text-center text-xs font-bold text-red-500">缺貨 (No Stock)</div>
        )}
      </div>
    </div>
  );
};

export default ProductCard;
