
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { Search, Scan, User as UserIcon, Trash2, ChevronRight, Calculator, RotateCcw, Eye, EyeOff, Edit2, Users, RefreshCw, FileText, Plus, X, ArrowUpDown, MapPin, Layers, Undo2, PauseCircle, PlayCircle, Barcode, LayoutGrid, List as ListIcon, Infinity } from 'lucide-react';
import ProductCard from './ProductCard';
import CheckoutModal from './CheckoutModal';
import ConfirmModal from '../ConfirmModal';
import QuotationModal from '../QuotationModal';
import ProductModal from '../ProductModal'; 
import CustomerModal from '../CustomerModal';
import { CartItem, Product, Customer, PaymentRecord, User, Role, Quotation, ParkedOrder, Order, Branch, Supplier } from '../../types';

type SortOption = 'NAME_ASC' | 'PRICE_ASC' | 'PRICE_DESC' | 'STOCK_DESC' | 'STOCK_ASC' | 'LT_ASC';
type ViewMode = 'LIST' | 'GRID';

interface POSContextType {
  user: User;
  categories: string[];
  brands: string[];
  products: Product[];
  customers: Customer[];
  branches: Branch[];
  allUsers: User[];
  quotations: Quotation[];
  suppliers: Supplier[];
  orders: Order[];
  saveOrder: (order: Order) => Promise<boolean>;
  saveCustomer: (customer: Customer) => Promise<boolean>;
  saveQuotation: (q: Quotation) => Promise<boolean>;
  saveProduct: (product: Product) => Promise<boolean>;
  taxRate: number;
}

const POSPage: React.FC = () => {
  // Use 'any' temporarily or define strict type if App.tsx passes it correctly.
  const { 
    user, 
    categories, 
    brands, 
    products, 
    saveOrder, 
    saveQuotation,
    customers: contextCustomers, 
    branches, 
    allUsers, 
    quotations, 
    suppliers,
    orders,
    saveCustomer,
    saveProduct,
    taxRate
  } = useOutletContext<POSContextType>(); 
  const navigate = useNavigate();
  
  const customers = contextCustomers || [];

  const [searchQuery, setSearchQuery] = useState('');
  
  // Filters & View
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedBrand, setSelectedBrand] = useState('All');
  const [sortBy, setSortBy] = useState<SortOption>('NAME_ASC');
  const [viewMode, setViewMode] = useState<ViewMode>('LIST');

  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  
  // Quick View State
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);

  // Parked Orders State
  const [parkedOrders, setParkedOrders] = useState<ParkedOrder[]>([]);
  const [showParkedModal, setShowParkedModal] = useState(false);

  // Confirmation Modal State
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    isDanger?: boolean;
  } | null>(null);

  // Customer Modal & Form State
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [customerSearch, setCustomerSearch] = useState(''); 
  const [showCustomerFormModal, setShowCustomerFormModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  
  // Quotation Modal State
  const [showQuotationModal, setShowQuotationModal] = useState(false);

  const [showGP, setShowGP] = useState(false); 
  
  const [salesperson, setSalesperson] = useState(user?.name || 'Staff');
  
  const [prefix, setPrefix] = useState('ORD');
  const [orderId, setOrderId] = useState('');

  const searchInputRef = useRef<HTMLInputElement>(null);

  const currentBranch = branches.find((b: Branch) => b.id === user?.branchId) || { id: user?.branchId || '', name: 'Loading...', code: '...' };

  // Performance Limit
  const DISPLAY_LIMIT = 48;

  useEffect(() => {
    generateOrderId();
  }, []);

  const generateOrderId = (p: string = prefix) => {
    const cleanPrefix = (p || prefix).trim().toUpperCase();
    const allOrders = Array.isArray(orders) ? orders : [];
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

    setPrefix(cleanPrefix);
    setOrderId(`${cleanPrefix}${nextNumString}`);
  };

  useEffect(() => {
    if (user) setSalesperson(user.name);
  }, [user]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F1') {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === 'F2') {
        e.preventDefault();
        if (cart.length > 0) setIsCheckoutOpen(true);
      } else if (e.key === 'F4') {
         e.preventDefault();
         openCustomerList();
      } else if (e.key === 'F7') {
         e.preventDefault();
         handleParkOrder();
      } else if (e.key === 'F8') {
         e.preventDefault();
         setShowParkedModal(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart]);

  const filteredProducts = useMemo(() => {
    const safeProducts = Array.isArray(products) ? products : [];
    let result = safeProducts.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            p.barcode.includes(searchQuery);
      const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
      const matchesBrand = selectedBrand === 'All' || p.brand === selectedBrand;
      return matchesSearch && matchesCategory && matchesBrand;
    });

    // Sorting Logic
    result = result.sort((a, b) => {
        switch (sortBy) {
            case 'NAME_ASC':
                return a.name.localeCompare(b.name);
            case 'PRICE_ASC':
                return a.price - b.price;
            case 'PRICE_DESC':
                return b.price - a.price;
            case 'STOCK_ASC':
                return (a.stock[user.branchId] || 0) - (b.stock[user.branchId] || 0);
            case 'STOCK_DESC':
                return (b.stock[user.branchId] || 0) - (a.stock[user.branchId] || 0);
            case 'LT_ASC':
                return a.lowStockThreshold - b.lowStockThreshold;
            default:
                return 0;
        }
    });

    return result;
  }, [searchQuery, selectedCategory, selectedBrand, sortBy, user.branchId, products]);

  const visibleProducts = useMemo(() => {
      return filteredProducts.slice(0, DISPLAY_LIMIT);
  }, [filteredProducts]);

  const addToCart = (product: Product) => {
    // if (product.trackStock) {
    //     const currentStock = product.stock[user.branchId] || 0;
    //     if (currentStock <= 0) return; 
    // }

    setCart(prev => {
      const existing = prev.find(item => item.id === product.id && !item.isReturn);
      if (existing) {
        return prev.map(item => (item.id === product.id && !item.isReturn) ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { 
          ...product, 
          quantity: 1, 
          discount: 0, 
          sourceBranchId: user.branchId, 
          isReturn: false, 
          serialNumbers: [] 
      }];
    });
  };

  const handleUpdateProduct = (updatedProduct: Product) => {
    saveProduct(updatedProduct).then(success => {
      if (success) {
        setQuickViewProduct(null);
      }
    });
  };

  const updateQuantity = (id: string, delta: number, isReturn: boolean = false) => {
    setCart(prev => prev.map(item => {
      if (item.id === id && !!item.isReturn === isReturn) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const removeItem = (id: string, isReturn: boolean = false) => {
    setCart(prev => prev.filter(item => !(item.id === id && !!item.isReturn === isReturn)));
  };

  const updateItemField = (id: string, isReturn: boolean, field: keyof CartItem, value: string | number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id && !!item.isReturn === isReturn) {
        return { ...item, [field]: value };
      }
      return item;
    }));
  };

  const updateSerialNumber = (id: string, index: number, value: string) => {
      setCart(prev => prev.map(item => {
          if (item.id === id && !item.isReturn) {
              const newSNs = [...(item.serialNumbers || [])];
              newSNs[index] = value;
              return { ...item, serialNumbers: newSNs };
          }
          return item;
      }));
  };

  const toggleReturnItem = (id: string, currentIsReturn: boolean) => {
      setCart(prev => prev.map(item => {
          if (item.id === id && !!item.isReturn === currentIsReturn) {
              return { ...item, isReturn: !item.isReturn };
          }
          return item;
      }));
  };

  const handleBulkBranchChange = (branchId: string) => {
      if (!branchId) return;
      setCart(prev => prev.map(item => ({ ...item, sourceBranchId: branchId })));
  };

  const cartSubtotal = useMemo(() => {
    return cart.reduce((acc, item) => {
      const line = item.price * item.quantity;
      return acc + (item.isReturn ? -line : line);
    }, 0);
  }, [cart]);

  const cartTotalDiscount = useMemo(() => {
    return cart.reduce((acc, item) => {
      const lineDiscount = item.discount * item.quantity;
      return acc + (item.isReturn ? -lineDiscount : lineDiscount);
    }, 0);
  }, [cart]);

  const cartTotalExTax = useMemo(() => {
    return cartSubtotal - cartTotalDiscount;
  }, [cartSubtotal, cartTotalDiscount]);

  const cartTaxAmount = useMemo(() => {
    if (!taxRate || cartTotalExTax === 0) return 0;
    return cartTotalExTax * (taxRate / 100);
  }, [cartTotalExTax, taxRate]);

  const cartTotal = useMemo(() => {
    return cartTotalExTax + cartTaxAmount;
  }, [cartTotalExTax, cartTaxAmount]);

  const cartCost = useMemo(() => {
    return cart.reduce((acc, item) => {
        const itemCost = item.cost * item.quantity;
        return acc + (item.isReturn ? -itemCost : itemCost);
    }, 0);
  }, [cart]);
  
  const cartGP = cartTotalExTax - cartCost;
  const cartGPMargin = cartTotalExTax > 0 ? (cartGP / cartTotalExTax) * 100 : 0;
  
  const canViewGP = [Role.ADMIN, Role.MANAGER, Role.CASHIER].includes(user.role);

  const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0);

  const handleCheckoutComplete = async (payments: PaymentRecord[], isDeposit: boolean) => {
    const paid = payments.reduce((sum, p) => sum + p.amount, 0);
    const subtotal = cartSubtotal;
    const totalDiscount = cartTotalDiscount;
    const taxAmount = cartTaxAmount;
    const total = cartTotal;
    const hasRemaining = isDeposit && paid + 0.01 < total;

    // 1. Construct the Order Object
    const newOrder: Order = {
        id: orderId,
        branchId: user.branchId,
        customer: selectedCustomer || undefined,
        items: cart,
        subtotal,
        totalDiscount,
        taxRate,
        taxAmount,
        total,
        payments: payments,
        status: hasRemaining ? 'PARTIAL' : 'COMPLETED',
        createdAt: new Date().toISOString(),
        cashierName: salesperson
    };

    // 2. Call API (if available via context)
    let success = true;
    if (saveOrder) {
        success = await saveOrder(newOrder);
    } else {
        console.warn("saveOrder function not found in context");
    }

    if (success) {
        const mode = isDeposit ? 'invoice' : 'receipt';
        const path = mode === 'receipt'
          ? `/print/order/${orderId}?mode=receipt`
          : `/print/order/${orderId}?mode=${mode}`;

        setConfirmConfig({
            isOpen: true,
            title: '交易成功 (Transaction Success)',
            message: `訂單編號: ${orderId}\nSalesperson: ${salesperson}\n\n已儲存並更新庫存。`,
            onConfirm: () => {
                setCart([]);
                setSelectedCustomer(null);
                setIsCheckoutOpen(false);
                generateOrderId(); 
                setConfirmConfig(null);
                navigate(path, { state: { data: newOrder } });
            },
            isDanger: false
        });
    }
  };

  // Park (Hold) Order Logic
  const handleParkOrder = () => {
      if (cart.length === 0) return;
      
      const newParked: ParkedOrder = {
          id: `HOLD-${Date.now().toString().slice(-4)}`,
          timestamp: new Date().toISOString(),
          customer: selectedCustomer,
          items: cart,
          salesperson: salesperson,
          note: `Held at ${new Date().toLocaleTimeString()}`
      };

      setParkedOrders([newParked, ...parkedOrders]);
      setCart([]);
      setSelectedCustomer(null);
      
      alert('掛單成功 (Order Parked Successfully)');
  };

  const handleRetrieveOrder = (parked: ParkedOrder) => {
      if (cart.length > 0) {
          if (!window.confirm('當前購物車非空，載入掛單將會覆蓋。確定嗎？\nCurrent cart is not empty. Overwrite?')) {
              return;
          }
      }
      setCart(parked.items);
      setSelectedCustomer(parked.customer);
      setParkedOrders(prev => prev.filter(p => p.id !== parked.id));
      setShowParkedModal(false);
  };

  const handleCreateQuotation = () => {
      if (cart.length === 0) return;
      setShowQuotationModal(true);
  };

  const handleSaveQuotation = (quotation: Quotation) => {
    // Use context function to save
    // Note: saveQuotation might be async, but for UI we might not await here if we just want to close modal
    // But ideally we should await. 
    // Since saveQuotation is void in context (based on my memory, wait let me check context type)
    // Context type says saveQuotation: (q: Quotation) => void (or Promise)
    // In App.tsx it is async.
    // I will just call it.
    if (saveQuotation) {
        saveQuotation(quotation);
    } else {
        console.error("saveQuotation function not found in context");
    }
    
    setShowQuotationModal(false);
    setConfirmConfig({
        isOpen: true,
        title: '報價單已建立 (Quotation Created)',
        message: `報價單編號: ${quotation.id}\n總額: $${quotation.total.toLocaleString()}`,
        onConfirm: () => {
            setCart([]);
            setSelectedCustomer(null);
            setConfirmConfig(null);
        },
        isDanger: false
    });
  };

  const openCustomerList = () => {
    setCustomerSearch(''); 
    setShowCustomerModal(true);
  };

  const handleEditCustomerClick = (e: React.MouseEvent, c: Customer) => {
    e.stopPropagation();
    setEditingCustomer(c);
    setShowCustomerFormModal(true);
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      
      {/* LEFT: Product Browser */}
      <div className="flex-1 flex flex-col min-w-0 border-r border-slate-200">
        <div className="bg-white p-4 border-b border-slate-200 shadow-sm z-10">
          
          {/* Search Bar */}
          <div className="flex gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input 
                ref={searchInputRef}
                type="text" 
                placeholder="搜尋商品, SKU, 條碼 (Barcode)... [F1]" 
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                <span className="text-[10px] bg-slate-200 text-slate-500 px-1.5 rounded border border-slate-300">F1</span>
              </div>
            </div>
            <button className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 rounded-xl flex items-center gap-2 font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-slate-300">
              <Scan size={20} /> <span className="hidden xl:inline">掃描</span>
            </button>
          </div>

          {/* Filters & Sorting */}
          <div className="flex flex-col xl:flex-row gap-3 justify-between">
             <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide flex-1">
                {/* Category Selector */}
                <select 
                  className="px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white focus:ring-2 focus:ring-brand-500 outline-none"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                >
                   {Array.isArray(categories) && categories.map((c: string) => <option key={c} value={c}>{c === 'All' ? '所有分類' : c}</option>)}
                </select>

                {/* Brand Selector */}
                <select 
                  className="px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white focus:ring-2 focus:ring-brand-500 outline-none"
                  value={selectedBrand}
                  onChange={(e) => setSelectedBrand(e.target.value)}
                >
                   {Array.isArray(brands) && brands.map((b: string) => <option key={b} value={b}>{b === 'All' ? '所有品牌' : b}</option>)}
                </select>
             </div>

             <div className="flex items-center gap-2">
                {/* View Toggle */}
                <div className="flex bg-slate-100 p-1 rounded-lg">
                    <button 
                        onClick={() => setViewMode('GRID')}
                        className={`p-1.5 rounded-md transition-colors ${viewMode === 'GRID' ? 'bg-white shadow text-brand-600' : 'text-slate-400 hover:text-slate-600'}`}
                        title="Grid View"
                    >
                        <LayoutGrid size={16} />
                    </button>
                    <button 
                        onClick={() => setViewMode('LIST')}
                        className={`p-1.5 rounded-md transition-colors ${viewMode === 'LIST' ? 'bg-white shadow text-brand-600' : 'text-slate-400 hover:text-slate-600'}`}
                        title="List View"
                    >
                        <ListIcon size={16} />
                    </button>
                </div>

                <div className="h-6 w-px bg-slate-200 mx-1"></div>

                <ArrowUpDown size={16} className="text-slate-400" />
                <select 
                  className="px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white focus:ring-2 focus:ring-brand-500 outline-none min-w-[140px]"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                >
                   <option value="NAME_ASC">名稱 (A-Z)</option>
                   <option value="PRICE_ASC">價格 (低 → 高)</option>
                   <option value="PRICE_DESC">價格 (高 → 低)</option>
                   <option value="STOCK_DESC">庫存 (高 → 低)</option>
                   <option value="STOCK_ASC">庫存 (低 → 高)</option>
                   <option value="LT_ASC">L/T 值 (低 → 高)</option>
                </select>
             </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 bg-slate-50/50">
          
          {viewMode === 'GRID' ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                {visibleProducts.map(product => (
                  <ProductCard 
                    key={product.id} 
                    product={product} 
                    onAdd={addToCart} 
                    onQuickView={setQuickViewProduct}
                    branchId={user.branchId} 
                  />
                ))}
              </div>
          ) : (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                  <table className="w-full text-left text-sm">
                      <thead className="bg-slate-100 text-slate-600 text-xs uppercase font-semibold">
                          <tr>
                              <th className="p-3">SKU / Name</th>
                              <th className="p-3">Brand / Category</th>
                              <th className="p-3 text-center">Stock</th>
                              <th className="p-3 text-right">Price</th>
                              <th className="p-3"></th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                          {visibleProducts.map(product => {
                              const currentStock = product.stock[user.branchId] || 0;
                              const isOutOfStock = product.trackStock && currentStock <= 0;
                              const totalStock = Object.values(product.stock).reduce((a: number, b: number) => a + b, 0);
                              
                              return (
                                  <tr 
                                    key={product.id} 
                                    className={`hover:bg-slate-50 transition-colors cursor-pointer ${isOutOfStock ? 'bg-red-50' : ''}`}
                                    onClick={() => addToCart(product)}
                                  >
                                      <td className="p-3">
                                          <div className="font-bold text-slate-800">{product.description || product.name}</div>
                                          <div className="text-xs text-slate-500 font-mono">{product.sku}</div>
                                      </td>
                                      <td className="p-3 text-slate-600">
                                          <div>{product.brand}</div>
                                          <div className="text-xs text-slate-400">{product.category}</div>
                                      </td>
                                      <td className="p-3 text-center">
                                          {product.trackStock ? (
                                              <div className="flex flex-col items-center">
                                                  <span className={`px-2 py-1 rounded font-bold text-xs ${currentStock <= product.lowStockThreshold ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-700'}`}>
                                                      {currentStock}
                                                  </span>
                                                  <span className="text-[10px] text-slate-400 mt-0.5">
                                                      Total: {totalStock}
                                                  </span>
                                              </div>
                                          ) : (
                                              <span className="text-blue-600 text-xs font-bold bg-blue-100 px-2 py-1 rounded flex items-center justify-center gap-1 w-fit mx-auto">
                                                  <Infinity size={12}/> Service
                                              </span>
                                          )}
                                      </td>
                                      <td className="p-3 text-right font-bold text-brand-600">
                                          ${product.price.toLocaleString()}
                                      </td>
                                      <td className="p-3 text-center">
                                          <div className="flex justify-center gap-1" onClick={e => e.stopPropagation()}>
                                              <button 
                                                onClick={() => setQuickViewProduct(product)}
                                                className="p-1.5 bg-slate-100 text-slate-500 rounded hover:bg-slate-200 hover:text-slate-800 transition-colors"
                                                title="快速查看/編輯 (Quick View/Edit)"
                                              >
                                                  <Eye size={16} />
                                              </button>
                                              <button 
                                                onClick={() => addToCart(product)}
                                                className="p-1.5 bg-brand-50 text-brand-600 rounded hover:bg-brand-600 hover:text-white transition-colors"
                                              >
                                                  <Plus size={16} />
                                              </button>
                                          </div>
                                      </td>
                                  </tr>
                              );
                          })}
                      </tbody>
                  </table>
              </div>
          )}

          {filteredProducts.length > DISPLAY_LIMIT && (
              <div className="mt-6 text-center text-slate-400 text-sm pb-4">
                  <p>顯示前 {DISPLAY_LIMIT} 筆結果 (Showing top {DISPLAY_LIMIT} items)</p>
                  <p className="text-xs mt-1">請使用搜尋功能查找特定商品 (Please refine search)</p>
              </div>
          )}

          {filteredProducts.length === 0 && (
            <div className="h-64 flex flex-col items-center justify-center text-slate-400">
              <Search size={48} className="mb-4 opacity-20" />
              <p>找不到相關商品 (No products found)</p>
            </div>
          )}
        </div>
      </div>

      {/* RIGHT: Cart & Checkout (Rest of the component remains same) */}
      <div className="w-[400px] xl:w-[480px] bg-white flex flex-col shadow-2xl z-20">
        <div className="p-4 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center justify-between mb-3 gap-3">
            <div className="flex gap-2 flex-1">
                <div className="relative w-20">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-[10px] font-bold">PRE</span>
                    <input 
                        type="text" 
                        value={prefix}
                        onChange={(e) => {
                            const val = e.target.value.toUpperCase();
                            setPrefix(val);
                            generateOrderId(val);
                        }}
                        className="w-full pl-8 pr-2 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500 uppercase text-center"
                    />
                </div>
                <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">ID</span>
                    <input 
                        type="text" 
                        value={orderId}
                        onChange={(e) => setOrderId(e.target.value)}
                        className="w-full pl-8 pr-8 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                    <button 
                        onClick={() => generateOrderId(prefix)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-brand-600 p-1"
                        title="重新生成編號 (Regenerate ID)"
                    >
                        <RefreshCw size={14} />
                    </button>
                </div>
            </div>

            <div className="flex gap-2 items-center flex-shrink-0">
               <div className="flex items-center bg-white border border-slate-200 rounded-lg px-2 py-1 gap-1">
                  <Users size={12} className="text-slate-400" />
                  <select 
                    className="text-xs font-medium text-slate-700 bg-transparent border-none focus:ring-0 cursor-pointer w-20"
                    value={salesperson}
                    onChange={(e) => setSalesperson(e.target.value)}
                  >
                     {allUsers.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
                  </select>
               </div>
               <span className="text-xs px-2 py-1 bg-brand-100 text-brand-700 rounded font-medium">{currentBranch?.code || user.branchId}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <div 
              role="button"
              tabIndex={0}
              onClick={openCustomerList}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') openCustomerList() }}
              className="flex-1 flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl cursor-pointer hover:border-brand-300 focus:ring-2 focus:ring-brand-500 focus:outline-none transition-colors group"
            >
              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-brand-50 group-hover:text-brand-600">
                <UserIcon size={20} />
              </div>
              <div className="flex-1">
                {selectedCustomer ? (
                  <>
                    <p className="font-bold text-slate-800">{selectedCustomer.name}</p>
                    <p className="text-xs text-slate-500">{selectedCustomer.points} 積分 • {selectedCustomer.tier}</p>
                  </>
                ) : (
                  <>
                    <p className="font-medium text-slate-600">零售客戶 (Walk-in)</p>
                    <p className="text-xs text-slate-400">點擊選擇會員 [F4]</p>
                  </>
                )}
              </div>
              <ChevronRight size={16} className="text-slate-300" />
            </div>
            {selectedCustomer && (
              <button 
                onClick={(e) => handleEditCustomerClick(e, selectedCustomer)}
                className="p-3 border border-slate-200 rounded-xl text-slate-400 hover:text-brand-600 hover:bg-brand-50 hover:border-brand-300 transition-all"
                title="編輯客戶 (Edit Customer)"
              >
                <Edit2 size={20} />
              </button>
            )}
          </div>
        </div>

        {/* Bulk Action Bar */}
        {cart.length > 0 && (
            <div className="px-4 py-2 bg-slate-100/50 border-b border-slate-100 flex justify-between items-center text-xs">
                <span className="text-slate-500 font-bold flex items-center gap-1"><Layers size={12}/> 項目 ({totalItems})</span>
                <div className="flex items-center gap-2">
                    <span className="text-slate-400">全單扣貨 (All from):</span>
                    <select
                        className="bg-white border border-slate-200 rounded px-2 py-1 text-slate-600 outline-none focus:ring-1 focus:ring-brand-500 cursor-pointer text-xs"
                        onChange={(e) => handleBulkBranchChange(e.target.value)}
                        value="" 
                    >
                        <option value="" disabled>批量設定 (Set All)</option>
                        {branches.map((b: Branch) => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                </div>
            </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-4">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center">
                <RotateCcw size={24} className="opacity-50" />
              </div>
              <p className="font-medium">購物車是空的</p>
              <p className="text-sm text-center max-w-[200px]">請掃描條碼或選擇商品</p>
            </div>
          ) : (
            cart.map(item => (
              <div key={`${item.id}-${item.isReturn ? 'ret' : 'reg'}`} className={`flex gap-3 p-3 rounded-xl border transition-colors group ${item.isReturn ? 'bg-red-50 border-red-200 hover:border-red-300' : 'bg-white border-slate-100 hover:border-slate-300'}`}>
                <div className="flex-1 min-w-0 flex flex-col gap-2">
                   <div className="flex items-start justify-between">
                      <div className={`text-xs font-mono px-1 rounded self-start ${item.isReturn ? 'text-red-500 bg-red-100' : 'text-slate-400 bg-slate-50'}`}>
                          {item.sku} {item.isReturn && '(退貨)'}
                      </div>
                      <div className={`font-bold text-sm ml-2 line-clamp-2 ${item.isReturn ? 'text-red-700' : 'text-slate-800'}`}>
                          {item.description || item.name}
                      </div>
                   </div>
                   
                   <textarea
                     rows={1}
                     className="w-full text-xs text-slate-500 bg-transparent border-none focus:bg-white focus:ring-1 focus:ring-brand-300 rounded p-1 -ml-1 resize-none"
                     value={item.description || ''}
                     onChange={(e) => updateItemField(item.id, !!item.isReturn, 'description', e.target.value)}
                     placeholder={item.name}
                   />

                   {/* Serial Number Inputs - Only for normal sales */}
                   {!item.isReturn && (
                       <div className="space-y-1">
                           {Array.from({ length: item.quantity }).map((_, idx) => (
                               <div key={idx} className="flex items-center gap-1">
                                   <Barcode size={10} className="text-slate-400" />
                                   <input 
                                       type="text"
                                       className="w-full text-[10px] bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 text-slate-600 focus:outline-none focus:border-brand-300 focus:bg-white placeholder:text-slate-300"
                                       placeholder={`SN ${idx + 1}`}
                                       value={item.serialNumbers?.[idx] || ''}
                                       onChange={(e) => updateSerialNumber(item.id, idx, e.target.value)}
                                   />
                               </div>
                           ))}
                       </div>
                   )}

                   {/* Source Branch Selector */}
                   <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-slate-400 font-bold flex items-center gap-1">
                         <MapPin size={10} /> 扣貨:
                      </span>
                      <select
                        className="text-xs border border-slate-200 rounded px-1 py-0.5 bg-white/50 text-slate-600 focus:outline-none focus:ring-1 focus:ring-brand-300 cursor-pointer hover:bg-white transition-colors"
                        value={item.sourceBranchId || user.branchId}
                        onChange={(e) => updateItemField(item.id, !!item.isReturn, 'sourceBranchId', e.target.value)}
                      >
                        {branches.map((b: Branch) => {
                           const stock = item.stock[b.id] || 0;
                           return (
                             <option key={b.id} value={b.id}>
                               {b.code} ({item.trackStock ? stock : '∞'})
                             </option>
                           );
                        })}
                      </select>
                   </div>
                   
                   <div className="flex items-center justify-between mt-1">
                     <div className="flex items-center gap-2">
                        {/* Price Input - Increased width for 6 digits, spin buttons hidden via CSS */}
                        <div className="relative w-28">
                           <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">$</span>
                           <input 
                             type="number"
                             className={`w-full text-sm font-bold border rounded px-1 pl-4 py-1 focus:ring-2 outline-none text-right [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [appearance:textfield] ${item.isReturn ? 'text-red-700 bg-red-50 border-red-200 focus:ring-red-500' : 'text-slate-900 bg-slate-50 border-slate-200 focus:ring-brand-500'}`}
                             value={item.price}
                             onChange={(e) => updateItemField(item.id, !!item.isReturn, 'price', Number(e.target.value))}
                           />
                        </div>

                        {/* Cost Input - Increased width, spin buttons hidden via CSS */}
                        {showGP && (
                          <div className="relative w-24">
                            <span className="absolute left-1 top-1/2 -translate-y-1/2 text-orange-300 text-[10px]">C</span>
                            <input 
                              type="number"
                              className="w-full text-xs font-medium text-orange-600 bg-orange-50 border border-orange-100 rounded px-1 pl-3 py-1 focus:ring-2 focus:ring-orange-500 outline-none text-right [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [appearance:textfield]"
                              value={item.cost}
                              onChange={(e) => updateItemField(item.id, !!item.isReturn, 'cost', Number(e.target.value))}
                            />
                          </div>
                        )}

                        <div className="flex items-center gap-1 bg-white/50 rounded-lg border border-slate-200">
                          <button 
                            onClick={() => updateQuantity(item.id, -1, !!item.isReturn)}
                            className="w-6 h-6 flex items-center justify-center text-slate-500 hover:bg-white hover:text-slate-800 rounded transition-all"
                          >
                            -
                          </button>
                          <span className={`text-sm font-bold w-5 text-center ${item.isReturn ? 'text-red-600' : ''}`}>
                              {item.quantity}
                          </span>
                          <button 
                            onClick={() => updateQuantity(item.id, 1, !!item.isReturn)}
                            className="w-6 h-6 flex items-center justify-center text-slate-500 hover:bg-white hover:text-slate-800 rounded transition-all"
                          >
                            +
                          </button>
                        </div>
                     </div>
                     
                     <div className="flex gap-1">
                        <button 
                            onClick={() => toggleReturnItem(item.id, !!item.isReturn)}
                            className={`p-1.5 rounded transition-colors ${item.isReturn ? 'bg-red-200 text-red-700 hover:bg-red-300' : 'bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700'}`}
                            title={item.isReturn ? "取消退貨 (Cancel Return)" : "標記為退貨 (Mark as Return)"}
                        >
                            <Undo2 size={16} />
                        </button>
                        <button 
                            onClick={() => removeItem(item.id, !!item.isReturn)}
                            className="text-slate-300 hover:text-red-500 px-1 rounded focus:outline-none focus:ring-2 focus:ring-red-500"
                        >
                            <Trash2 size={18} />
                        </button>
                     </div>
                   </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="bg-white border-t border-slate-200 p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
          <div className="space-y-2 mb-4">
            <div className="flex justify-between text-slate-500 text-sm">
              <span>小計 (Subtotal) • {totalItems} 件</span>
              <span>${cartSubtotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-slate-500 text-sm">
              <span>折扣 (Discount)</span>
              <span>-${cartTotalDiscount.toLocaleString()}</span>
            </div>
            
            {canViewGP && cartTotal > 0 && (
              <div className="pt-2 border-t border-slate-100 mt-2">
                 <div className="flex items-center justify-between">
                    <button 
                      onClick={() => setShowGP(!showGP)} 
                      className="text-xs flex items-center gap-1 text-slate-400 hover:text-slate-600 focus:outline-none focus:text-slate-600"
                    >
                      {showGP ? <EyeOff size={14} /> : <Eye size={14} />}
                      {showGP ? '隱藏 GP (Hide GP)' : '查看 GP (Show GP)'}
                    </button>
                    {showGP && (
                      <div className="flex gap-4 text-xs text-slate-500">
                         <span>成本: ${cartCost.toLocaleString()}</span>
                         <span className={cartGP >= 0 ? 'text-emerald-600' : 'text-red-600'}>
                           毛利: ${cartGP.toLocaleString()} ({cartGPMargin.toFixed(1)}%)
                         </span>
                      </div>
                    )}
                 </div>
              </div>
            )}

            <div className="flex justify-between items-end pt-2 border-t border-dashed border-slate-200 mt-2">
              <span className="font-bold text-slate-800">應付總額 (Total)</span>
              <span className={`font-extrabold text-3xl ${cartTotal < 0 ? 'text-red-600' : 'text-brand-600'}`}>
                  ${cartTotal.toLocaleString()}
                  {cartTotal < 0 && <span className="text-sm text-red-400 font-medium ml-2">(退款 Refund)</span>}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-5 gap-2">
            <button 
              className="col-span-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl py-2 flex flex-col items-center justify-center gap-1 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400"
              onClick={() => setCart([])}
            >
              <Trash2 size={18} />
              <span className="text-[10px] font-bold uppercase">清空</span>
            </button>
            <div className="col-span-4 grid grid-cols-4 gap-2">
                <button 
                   onClick={handleCreateQuotation}
                   disabled={cart.length === 0}
                   className="bg-sky-500 hover:bg-sky-600 text-white rounded-xl py-2 font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex flex-col items-center justify-center gap-1"
                >
                   <FileText size={18} />
                   <span className="text-[10px] uppercase">報價 (Quote)</span>
                </button>
                <button 
                  onClick={handleParkOrder}
                  disabled={cart.length === 0}
                  className="bg-orange-500 hover:bg-orange-600 text-white rounded-xl py-2 font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex flex-col items-center justify-center gap-1"
                >
                   <PauseCircle size={18} />
                   <span className="text-[10px] uppercase">掛單 (Hold)</span>
                </button>
                <button 
                   onClick={() => setShowParkedModal(true)}
                   className="bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl py-2 font-bold transition-colors flex flex-col items-center justify-center gap-1"
                >
                   <PlayCircle size={18} />
                   <span className="text-[10px] uppercase">取單 (Load)</span>
                </button>
                <button 
                  onClick={() => setIsCheckoutOpen(true)}
                  disabled={cart.length === 0}
                  className="bg-brand-600 hover:bg-brand-700 text-white rounded-xl py-2 font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex flex-col items-center justify-center gap-1"
                >
                   <Calculator size={18} />
                   <span className="text-[10px] uppercase">結帳 (Pay)</span>
                </button>
            </div>
          </div>
        </div>
      </div>

      {/* Checkout Modal */}
      <CheckoutModal 
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        total={cartTotal}
        customer={selectedCustomer}
        items={cart}
        onComplete={handleCheckoutComplete}
      />

      {/* Customer List Modal */}
      {showCustomerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[80vh]">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-lg text-slate-800">
                選擇客戶 (Select Customer)
              </h3>
              <button onClick={() => setShowCustomerModal(false)}>
                <X size={20} className="text-slate-400" />
              </button>
            </div>
            <div className="flex-1 overflow-hidden flex flex-col">
              <div className="p-4 border-b border-slate-100">
                <input 
                  autoFocus
                  type="text" 
                  placeholder="Search Name, Phone..." 
                  className="w-full border rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  value={customerSearch}
                  onChange={e => setCustomerSearch(e.target.value)}
                />
              </div>
              <div className="flex-1 overflow-y-auto p-2">
                {customers
                  .filter(c => c.name.toLowerCase().includes(customerSearch.toLowerCase()) || c.phone.includes(customerSearch))
                  .map(c => (
                    <div 
                      key={c.id} 
                      onClick={() => { setSelectedCustomer(c); setShowCustomerModal(false); }}
                      className="p-3 hover:bg-brand-50 rounded-lg cursor-pointer border-b border-slate-50 last:border-0"
                    >
                      <div className="font-bold text-slate-800">{c.name}</div>
                      <div className="text-xs text-slate-500">{c.phone} • {c.tier}</div>
                    </div>
                  ))}
              </div>
              <div className="p-4 border-t border-slate-100 bg-slate-50">
                <button 
                  onClick={() => {
                    setEditingCustomer(null);
                    setShowCustomerModal(false);
                    setShowCustomerFormModal(true);
                  }}
                  className="w-full bg-brand-600 text-white py-2 rounded-lg font-bold"
                >
                  <Plus size={16} className="inline mr-1"/> 新增客戶
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Customer Form Modal (shared with Customer Management) */}
      <CustomerModal
        open={showCustomerFormModal}
        customer={editingCustomer}
        onClose={() => setShowCustomerFormModal(false)}
        saveCustomer={saveCustomer}
        onSaved={savedCustomer => {
          setSelectedCustomer(savedCustomer);
          setShowCustomerFormModal(false);
        }}
      />

      {/* Parked Orders Modal */}
      {showParkedModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
               <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
                   <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                        <h3 className="font-bold text-lg text-slate-800">掛單列表 (Parked Orders)</h3>
                        <button onClick={() => setShowParkedModal(false)}><X size={20} className="text-slate-400" /></button>
                   </div>
                   <div className="max-h-[60vh] overflow-y-auto p-4 space-y-2">
                       {parkedOrders.length === 0 ? (
                           <div className="text-center text-slate-400 py-8">沒有掛單記錄</div>
                       ) : (
                           parkedOrders.map(order => (
                               <div key={order.id} className="border border-slate-200 rounded-xl p-4 hover:border-brand-500 transition-colors cursor-pointer group" onClick={() => handleRetrieveOrder(order)}>
                                   <div className="flex justify-between items-center mb-2">
                                       <span className="font-bold text-slate-800">{order.id}</span>
                                       <span className="text-xs text-slate-500">{new Date(order.timestamp).toLocaleTimeString()}</span>
                                   </div>
                                   <div className="text-sm text-slate-600 mb-2">
                                       {order.customer ? order.customer.name : 'Walk-in'} • {order.items.length} items
                                   </div>
                                   <div className="flex justify-between items-center">
                                       <span className="font-bold text-brand-600 text-lg">
                                           ${order.items.reduce((acc, i) => acc + (i.price - i.discount) * i.quantity, 0).toLocaleString()}
                                       </span>
                                       <button 
                                            onClick={(e) => { e.stopPropagation(); setParkedOrders(prev => prev.filter(p => p.id !== order.id)); }}
                                            className="text-slate-300 hover:text-red-500 p-1"
                                       >
                                           <Trash2 size={16} />
                                       </button>
                                   </div>
                               </div>
                           ))
                       )}
                   </div>
               </div>
          </div>
      )}
      
      {quickViewProduct && (
        <ProductModal 
          mode="EDIT"
          branchId={user.branchId}
          product={quickViewProduct}
          onClose={() => setQuickViewProduct(null)}
          onSave={handleUpdateProduct}
          categories={categories}
          brands={brands}
          suppliers={suppliers} 
          existingProducts={products}
          branches={branches}
        />
      )}
      
      {/* Quotation Modal */}
      {showQuotationModal && (
          <QuotationModal 
              mode="CREATE"
              currentUser={user}
              allQuotations={quotations}
              products={products}
              customers={customers}
              users={allUsers}
              categories={categories}
              brands={brands}
              onClose={() => setShowQuotationModal(false)}
              onSave={handleSaveQuotation}
              initialItems={cart}
              initialCustomer={selectedCustomer}
          />
      )}

      {/* Confirm/Alert Modal */}
      {confirmConfig && (
        <ConfirmModal 
            isOpen={confirmConfig.isOpen}
            title={confirmConfig.title}
            message={confirmConfig.message}
            onConfirm={confirmConfig.onConfirm}
            onCancel={confirmConfig.onConfirm} // Alert style, same action or confirm closes it
            confirmText="確定 (OK)"
            cancelText="關閉"
        />
      )}
    </div>
  );
};

export default POSPage;
