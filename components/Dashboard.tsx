
import React, { useState, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { AreaChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area } from 'recharts';
import { ArrowUpRight, DollarSign, Package, Users, Trophy, Calendar, Filter, TrendingUp, Eye, EyeOff, X, ChevronRight, FileText, Search } from 'lucide-react';
import { Order, Product, User } from '../types';

const safeNumber = (value: unknown): number => {
  if (typeof value !== 'number') return 0;
  if (!Number.isFinite(value)) return 0;
  return value;
};

const StatCard = ({ title, value, sub, icon: Icon, color }: any) => (
  <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm transition-all hover:shadow-md">
    <div className="flex justify-between items-start mb-4">
      <div className={`p-3 rounded-lg ${color} text-white shadow-lg shadow-opacity-20`}>
        <Icon size={24} />
      </div>
      {sub && (
        <span className="flex items-center text-emerald-600 text-sm font-medium bg-emerald-50 px-2 py-1 rounded">
          <ArrowUpRight size={14} className="mr-1" />
          {sub}
        </span>
      )}
    </div>
    <h3 className="text-slate-500 text-sm font-medium">{title}</h3>
    <p className="text-2xl font-bold text-slate-800 mt-1">{value}</p>
  </div>
);

const Dashboard: React.FC = () => {
  const { user, products, orders, categories = [], brands = [] } = useOutletContext<{ user: User; products: Product[]; orders: Order[]; categories: string[]; brands: string[] }>();
  
  // Default to current month
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];

  const [startDate, setStartDate] = useState(firstDay);
  const [endDate, setEndDate] = useState(lastDay);
  const [showGP, setShowGP] = useState(false);
  
  // State for Detail Modals
  const [selectedStaffName, setSelectedStaffName] = useState<string | null>(null);
  
  // UPGRADED: Multi-select state for products
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  // NEW: Independent date range for the detail modal
  const [detailStartDate, setDetailStartDate] = useState('');
  const [detailEndDate, setDetailEndDate] = useState('');
  
  // State for Product Search
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [productSearchQuery, setProductSearchQuery] = useState('');
  // Local selection state inside the search modal
  const [tempSelectedIds, setTempSelectedIds] = useState<Set<string>>(new Set());
  const [searchCategory, setSearchCategory] = useState('All');
  const [searchBrand, setSearchBrand] = useState('All');

  // 1. Filter Orders based on Date Range (Global Dashboard)
  const filteredOrders = useMemo<Order[]>(() => {
    const start = new Date(startDate).setHours(0, 0, 0, 0);
    const end = new Date(endDate).setHours(23, 59, 59, 999);

    return (orders as Order[]).filter((o: Order) => {
      const orderDate = new Date(o.createdAt).getTime();
      return orderDate >= start && orderDate <= end;
    });
  }, [startDate, endDate, orders]);

  // NEW: Filter Orders based on Detail Modal Date Range
  const detailFilteredOrders = useMemo<Order[]>(() => {
    if (!detailStartDate || !detailEndDate) return [];
    const start = new Date(detailStartDate).setHours(0, 0, 0, 0);
    const end = new Date(detailEndDate).setHours(23, 59, 59, 999);

    return (orders as Order[]).filter((o: Order) => {
      const orderDate = new Date(o.createdAt).getTime();
      return orderDate >= start && orderDate <= end;
    });
  }, [detailStartDate, detailEndDate, orders]);

  // 2. Calculate KPI Stats
  const stats = useMemo(() => {
    const totalRevenue = filteredOrders.reduce((acc, o) => acc + o.total, 0);
    const totalOrders = filteredOrders.length;
    const newMembers = Math.floor(totalOrders * 0.1); 
    const lowStockCount = products.filter((p: Product) => Object.values(p.stock).some((qty: number) => qty <= p.lowStockThreshold)).length;

    return { totalRevenue, totalOrders, newMembers, lowStockCount };
  }, [filteredOrders, products]);

  // 3. Generate Chart Data (Daily Sales Trend)
  const chartData = useMemo(() => {
    const grouped = filteredOrders.reduce((acc: Record<string, number>, order: Order) => {
      const dateStr = new Date(order.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      acc[dateStr] = (acc[dateStr] || 0) + order.total;
      return acc;
    }, {} as Record<string, number>);

    return Object.keys(grouped).map(date => ({
      name: date,
      sales: grouped[date]
    })).sort((a, b) => new Date(a.name).getTime() - new Date(b.name).getTime());
  }, [filteredOrders]);

  // 4. Calculate Sales Performance (Top Sales Staff with GP)
  const performanceData = useMemo(() => {
    const staffStats: Record<string, { name: string, revenue: number, cost: number, count: number, quantity: number }> = {};

    filteredOrders.forEach(order => {
      const name = order.cashierName || 'Unknown';
      if (!staffStats[name]) {
        staffStats[name] = { name, revenue: 0, cost: 0, count: 0, quantity: 0 };
      }
      
      staffStats[name].count += 1;

      // Calculate Revenue, Cost and Quantity per item
      order.items.forEach(item => {
          const price = safeNumber(item.price);
          const discount = safeNumber(item.discount);
          const costPerUnit = safeNumber(item.cost);
          const itemRevenue = (price - discount) * item.quantity;
          const itemCost = costPerUnit * item.quantity;

          if (item.isReturn) {
              staffStats[name].revenue -= itemRevenue;
              staffStats[name].cost -= itemCost;
              staffStats[name].quantity -= item.quantity;
          } else {
              staffStats[name].revenue += itemRevenue;
              staffStats[name].cost += itemCost;
              staffStats[name].quantity += item.quantity;
          }
      });
    });

    return Object.values(staffStats)
        .map(stat => {
            const revenue = safeNumber(stat.revenue);
            const cost = safeNumber(stat.cost);
            const gp = revenue - cost;
            const gpMargin = revenue > 0 ? (gp / revenue) * 100 : 0;
            return { ...stat, revenue, cost, gp, gpMargin };
        })
        .sort((a, b) => b.revenue - a.revenue);
  }, [filteredOrders]);

  // 5. Calculate Top Products
  const productStats = useMemo(() => {
    const prodStats: Record<string, { id: string, name: string, sku: string, quantity: number, revenue: number }> = {};
    
    filteredOrders.forEach(order => {
      order.items.forEach(item => {
        if (!prodStats[item.id]) {
          prodStats[item.id] = {
            id: item.id,
            name: item.name,
            sku: item.sku,
            quantity: 0,
            revenue: 0
          };
        }
        const price = safeNumber(item.price);
        const discount = safeNumber(item.discount);
        const itemRevenue = (price - discount) * item.quantity;
        if (item.isReturn) {
            prodStats[item.id].quantity -= item.quantity;
            prodStats[item.id].revenue -= itemRevenue;
        } else {
            prodStats[item.id].quantity += item.quantity;
            prodStats[item.id].revenue += itemRevenue;
        }
      });
    });

    // Sort by Revenue descending (Value driven)
    return Object.values(prodStats)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);
  }, [filteredOrders]);

  // 6. Calculate Staff Details (Drill Down)
  const staffDetails = useMemo(() => {
      if (!selectedStaffName) return [];
      
      const details: Record<string, { id: string, name: string, sku: string, qty: number, total: number }> = {};
      
      filteredOrders
          .filter(o => o.cashierName === selectedStaffName)
          .forEach(order => {
              order.items.forEach(item => {
                  if (!details[item.id]) {
                      details[item.id] = { id: item.id, name: item.name, sku: item.sku, qty: 0, total: 0 };
                  }
                  const price = safeNumber(item.price);
                  const discount = safeNumber(item.discount);
                  const amount = (price - discount) * item.quantity;
                  if (item.isReturn) {
                      details[item.id].qty -= item.quantity;
                      details[item.id].total -= amount;
                  } else {
                      details[item.id].qty += item.quantity;
                      details[item.id].total += amount;
                  }
              });
          });

      return Object.values(details).sort((a, b) => b.total - a.total);
  }, [selectedStaffName, filteredOrders]);

  // 7. Calculate Product Sales Details (Multi-Product Drill Down with Independent Date)
  const productSalesDetails = useMemo(() => {
      if (selectedProductIds.length === 0) return [];
      
      const sales: Array<{
          orderId: string,
          date: string,
          customer: string,
          salesperson: string,
          productId: string, 
          productName: string,
          productSku: string,
          qty: number,
          price: number,
          total: number,
          cost: number, // Added cost
          gp: number,   // Added gp
          isReturn: boolean
      }> = [];

      // USE detailFilteredOrders here
      detailFilteredOrders.forEach(order => {
          // Find items in this order that match ANY of the selected IDs
          const items = order.items.filter(i => selectedProductIds.includes(i.id));
          items.forEach(item => {
              const price = safeNumber(item.price);
              const discount = safeNumber(item.discount);
              const costPerUnit = safeNumber(item.cost);
              const sign = item.isReturn ? -1 : 1;
              const lineTotal = (price - discount) * item.quantity * sign;
              const lineCost = costPerUnit * item.quantity * sign;

              sales.push({
                  orderId: order.id,
                  date: order.createdAt,
                  customer: order.customer?.name || 'Walk-in',
                  salesperson: order.cashierName,
                  productId: item.id,
                  productName: item.name,
                  productSku: item.sku,
                  qty: item.quantity * sign,
                  price: item.price - item.discount,
                  total: lineTotal,
                  cost: lineCost,
                  gp: lineTotal - lineCost,
                  isReturn: !!item.isReturn
              });
          });
      });

      return sales.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [selectedProductIds, detailFilteredOrders]);

  // 8. Calculate Salesperson Summary for Selected Product(s) - REVENUE & GP
  const productSalesSummary = useMemo(() => {
      const summary: Record<string, { qty: number, revenue: number, gp: number }> = {};
      
      productSalesDetails.forEach(sale => {
          if (!summary[sale.salesperson]) {
              summary[sale.salesperson] = { qty: 0, revenue: 0, gp: 0 };
          }
          summary[sale.salesperson].qty += sale.qty;
          summary[sale.salesperson].revenue += sale.total;
          summary[sale.salesperson].gp += sale.gp;
      });

      return Object.entries(summary)
          .map(([name, data]) => ({ name, ...data }))
          .sort((a, b) => b.revenue - a.revenue); // Sort by Revenue desc
  }, [productSalesDetails]);

  // Helper to get selected product names for display
  const selectedProductNames = useMemo(() => {
      if (selectedProductIds.length === 0) return '';
      if (selectedProductIds.length === 1) {
          return products.find((p: Product) => p.id === selectedProductIds[0])?.name || 'Unknown';
      }
      return `${selectedProductIds.length} Items Selected`;
  }, [selectedProductIds, products]);

  // Search results for Product Search Modal
  const filteredSearchProducts = useMemo<Product[]>(() => {
    const allProducts = Array.isArray(products) ? (products as Product[]) : [];
    const term = productSearchQuery.toLowerCase().trim();
    return allProducts
      .filter((p: Product) => {
        const matchesSearch =
          term === '' ||
          p.name.toLowerCase().includes(term) ||
          p.sku.toLowerCase().includes(term);
        const matchesCategory =
          searchCategory === 'All' || p.category === searchCategory;
        const matchesBrand = searchBrand === 'All' || p.brand === searchBrand;
        return matchesSearch && matchesCategory && matchesBrand;
      })
      .slice(0, 50);
  }, [productSearchQuery, searchCategory, searchBrand, products]);

  // Toggle selection in search modal
  const toggleSearchSelection = (id: string) => {
      const newSet = new Set(tempSelectedIds);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      setTempSelectedIds(newSet);
  };

  const handleOpenSearch = () => {
      setTempSelectedIds(new Set());
      setProductSearchQuery('');
      setShowProductSearch(true);
  };

  const handleConfirmSearchSelection = () => {
      if (tempSelectedIds.size > 0) {
          setSelectedProductIds(Array.from(tempSelectedIds));
          // Sync dates when opening
          setDetailStartDate(startDate);
          setDetailEndDate(endDate);
          setShowProductSearch(false);
      }
  };

  const handleProductClick = (id: string) => {
      setSelectedProductIds([id]);
      // Sync dates when opening
      setDetailStartDate(startDate);
      setDetailEndDate(endDate);
  };

  const COLORS = ['#0ea5e9', '#6366f1', '#8b5cf6', '#ec4899', '#10b981'];

  return (
    <div className="p-8 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        
        {/* Header & Date Filter */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">管理概覽 (Executive Dashboard)</h1>
            <p className="text-slate-500 text-sm mt-1">實時業務數據分析</p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-2 bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
             <div className="flex items-center gap-2 px-2">
               <Filter size={16} className="text-slate-400" />
               <span className="text-xs font-bold text-slate-500 uppercase">日期範圍</span>
             </div>
             <div className="flex items-center gap-2">
               <input 
                 type="date" 
                 className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg focus:ring-brand-500 focus:border-brand-500 block p-2" 
                 value={startDate}
                 onChange={(e) => setStartDate(e.target.value)}
               />
               <span className="text-slate-400">-</span>
               <input 
                 type="date" 
                 className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg focus:ring-brand-500 focus:border-brand-500 block p-2" 
                 value={endDate}
                 onChange={(e) => setEndDate(e.target.value)}
               />
             </div>
          </div>
        </div>
        
        {/* Stat Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard 
            title="總營業額 (Revenue)" 
            value={`$${stats.totalRevenue.toLocaleString()}`} 
            icon={DollarSign} 
            color="bg-brand-500" 
          />
          <StatCard 
            title="訂單數量 (Orders)" 
            value={stats.totalOrders} 
            icon={Package} 
            color="bg-indigo-500" 
          />
          <StatCard 
            title="新增會員 (New Members)" 
            value={stats.newMembers} 
            icon={Users} 
            color="bg-orange-500" 
          />
          <StatCard 
            title="低庫存項目 (Low Stock)" 
            value={stats.lowStockCount} 
            sub="需跟進" 
            icon={Package} 
            color="bg-red-500" 
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Chart */}
          <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col">
            <div className="flex justify-between items-center mb-6">
               <h3 className="font-bold text-lg text-slate-800">銷售趨勢 (Sales Trend)</h3>
               <div className="text-xs text-slate-400 flex items-center gap-1">
                 <Calendar size={12} />
                 {startDate} ~ {endDate}
               </div>
            </div>
            
            <div className="h-80 w-full">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} tickFormatter={(value) => `$${value/1000}k`} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      formatter={(value: number) => [`$${value.toLocaleString()}`, 'Revenue']}
                    />
                    <Area type="monotone" dataKey="sales" stroke="#0ea5e9" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-400">
                   <Package size={48} className="mb-2 opacity-20" />
                   <p>此日期範圍內沒有銷售數據</p>
                </div>
              )}
            </div>
          </div>

          {/* Sales Performance (Top Sales) - ENHANCED with Drill Down */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col h-[480px]">
             <div className="flex items-center justify-between mb-4 flex-shrink-0">
                <div className="flex items-center gap-2">
                  <Trophy className="text-amber-500" size={24} />
                  <div>
                    <h3 className="font-bold text-lg text-slate-800 leading-tight">SALES Revenue 統計</h3>
                    <p className="text-[10px] text-slate-400">Revenue Stats (Click to View Detail)</p>
                  </div>
                </div>
                <button 
                    onClick={() => setShowGP(!showGP)}
                    className={`flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors ${showGP ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-500 hover:text-slate-700'}`}
                    title={showGP ? "隱藏毛利 (Hide GP)" : "顯示毛利 (Show GP)"}
                >
                    {showGP ? <Eye size={14} /> : <EyeOff size={14} />}
                    {showGP ? 'GP On' : 'GP Off'}
                </button>
             </div>

             {/* Header Row - Adjusted to remove Ord/Qty */}
             <div className="grid grid-cols-12 gap-2 text-[10px] font-bold text-slate-400 uppercase border-b border-slate-100 pb-2 mb-2">
                 <div className="col-span-1 text-center">#</div>
                 <div className={showGP ? "col-span-4" : "col-span-5"}>Name</div>
                 <div className={`text-right ${showGP ? 'col-span-4' : 'col-span-6'}`}>Revenue</div>
                 {showGP && <div className="col-span-3 text-right">GP</div>}
             </div>
             
             <div className="flex-1 overflow-y-auto pr-2">
                {performanceData.map((staff, index) => (
                    <div 
                        key={staff.name} 
                        onClick={() => setSelectedStaffName(staff.name)}
                        className="py-3 border-b border-slate-50 last:border-0 hover:bg-indigo-50 transition-colors group cursor-pointer relative"
                        title="點擊查看銷售明細 (Click for Details)"
                    >
                        <div className="grid grid-cols-12 gap-2 items-center">
                            {/* Rank */}
                            <div className="col-span-1 flex justify-center">
                                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold 
                                    ${index === 0 ? 'bg-amber-100 text-amber-600' : (index === 1 ? 'bg-slate-200 text-slate-600' : (index === 2 ? 'bg-orange-100 text-orange-700' : 'bg-slate-50 text-slate-400'))}`}>
                                    {index + 1}
                                </span>
                            </div>
                            
                            {/* Name */}
                            <div className={`${showGP ? 'col-span-4' : 'col-span-5'} font-medium text-slate-700 text-xs truncate flex items-center gap-1`}>
                                {staff.name}
                                <ChevronRight size={12} className="opacity-0 group-hover:opacity-100 text-slate-400" />
                            </div>

                            {/* Revenue */}
                            <div className={`text-right font-bold text-slate-800 text-sm ${showGP ? 'col-span-4' : 'col-span-6'}`}>
                                ${staff.revenue.toLocaleString()}
                            </div>

                            {/* GP */}
                            {showGP && (
                                <div className="col-span-3 text-right">
                                    <div className={`text-xs font-bold ${staff.gp >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                        ${staff.gp.toLocaleString()}
                                    </div>
                                    <div className="text-[9px] text-slate-400">
                                        {staff.gpMargin.toFixed(1)}%
                                    </div>
                                </div>
                            )}
                        </div>
                        
                        {/* Simple Progress Bar */}
                        <div className="mt-2 w-full bg-slate-100 rounded-full h-1 overflow-hidden opacity-50 group-hover:opacity-100 transition-opacity">
                            <div 
                                className="h-full rounded-full"
                                style={{ 
                                    width: `${(staff.revenue / (performanceData[0]?.revenue || 1)) * 100}%`,
                                    backgroundColor: COLORS[index % COLORS.length]
                                }}
                            ></div>
                        </div>
                    </div>
                ))}
                
                {performanceData.length === 0 && (
                    <div className="text-center text-slate-400 py-10">
                      <Users size={32} className="mx-auto mb-2 opacity-20" />
                      暫無數據
                    </div>
                )}
             </div>
          </div>
        </div>

        {/* Top Products Section - ENHANCED with Drill Down & Search */}
        <div className="mt-8 bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                    <TrendingUp className="text-emerald-500" size={24} />
                    <h3 className="font-bold text-lg text-slate-800">熱賣商品統計 (Top Products)</h3>
                    <span className="text-xs text-slate-400 ml-2 hidden sm:inline">(點擊查看銷售記錄 Click items to view history)</span>
                </div>
                <button 
                    onClick={handleOpenSearch}
                    className="flex items-center gap-1.5 text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-1.5 rounded-lg transition-colors font-bold"
                >
                    <Search size={14} />
                    查詢其他商品 (Search Other)
                </button>
            </div>

            <div className="overflow-x-auto">
               <div className="min-w-[600px]">
                  <div className="grid grid-cols-12 gap-4 text-xs font-bold text-slate-500 uppercase border-b border-slate-100 pb-3 mb-2 px-2">
                     <div className="col-span-1 text-center">Rank</div>
                     <div className="col-span-5">Product Info</div>
                     <div className="col-span-2 text-right">Quantity</div>
                     <div className="col-span-2 text-right">Revenue</div>
                     <div className="col-span-2">Share</div>
                  </div>
                  
                  {productStats.map((product, index) => {
                     const share = stats.totalRevenue > 0 ? (product.revenue / stats.totalRevenue) * 100 : 0;
                     
                     return (
                        <div 
                            key={product.id} 
                            onClick={() => handleProductClick(product.id)}
                            className="grid grid-cols-12 gap-4 items-center py-3 border-b border-slate-50 hover:bg-emerald-50 px-2 rounded-lg transition-colors group cursor-pointer"
                        >
                           <div className="col-span-1 text-center">
                              <span className={`w-6 h-6 inline-flex items-center justify-center rounded-full text-xs font-bold ${
                                 index === 0 ? 'bg-amber-100 text-amber-700' : 
                                 index === 1 ? 'bg-slate-200 text-slate-700' : 
                                 index === 2 ? 'bg-orange-100 text-orange-700' : 
                                 'text-slate-400'
                              }`}>
                                 {index + 1}
                              </span>
                           </div>
                           <div className="col-span-5">
                              <p className="text-sm font-bold text-slate-800 line-clamp-1 group-hover:text-emerald-800 transition-colors flex items-center gap-2">
                                 {product.name}
                                 <ChevronRight size={14} className="opacity-0 group-hover:opacity-100 text-emerald-500" />
                              </p>
                              <p className="text-[10px] text-slate-400 font-mono mt-0.5">{product.sku}</p>
                           </div>
                           <div className="col-span-2 text-right">
                              <span className="text-base font-bold text-slate-700">{product.quantity}</span>
                              <span className="text-[10px] text-slate-400 ml-1">units</span>
                           </div>
                           <div className="col-span-2 text-right font-medium text-slate-600">
                              ${product.revenue.toLocaleString()}
                           </div>
                           <div className="col-span-2">
                              <div className="flex items-center gap-2">
                                 <div className="flex-1 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                    <div 
                                       className="h-full bg-emerald-500 rounded-full" 
                                       style={{ width: `${share}%` }}
                                    ></div>
                                 </div>
                                 <span className="text-[10px] font-medium text-slate-500 w-8 text-right">{share.toFixed(1)}%</span>
                              </div>
                           </div>
                        </div>
                     );
                  })}
                  
                  {productStats.length === 0 && (
                     <div className="py-12 text-center text-slate-400 flex flex-col items-center">
                        <Package size={32} className="opacity-20 mb-2" />
                        <p>沒有商品銷售數據</p>
                     </div>
                  )}
               </div>
            </div>
        </div>

        {/* Staff Detail Modal */}
        {selectedStaffName && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                <div className="bg-white rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
                    <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                        <div>
                            <h3 className="font-bold text-lg text-slate-800">銷售明細 (Sales Detail)</h3>
                            <p className="text-sm text-slate-500">{selectedStaffName} • {startDate} ~ {endDate}</p>
                        </div>
                        <button onClick={() => setSelectedStaffName(null)} className="p-1 hover:bg-slate-200 rounded-full transition-colors">
                            <X size={20} className="text-slate-500" />
                        </button>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-0">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 text-slate-600 font-bold sticky top-0 shadow-sm">
                                <tr>
                                    <th className="p-4">商品 (Product)</th>
                                    <th className="p-4 text-right">數量 (Qty)</th>
                                    <th className="p-4 text-right">銷售額 (Revenue)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {staffDetails.map(item => (
                                    <tr key={item.id} className="hover:bg-slate-50">
                                        <td className="p-4">
                                            <div className="font-bold text-slate-800">{item.name}</div>
                                            <div className="text-xs text-slate-500 font-mono">{item.sku}</div>
                                        </td>
                                        <td className="p-4 text-right">
                                            <span className={`font-bold ${item.qty < 0 ? 'text-red-600' : 'text-slate-700'}`}>
                                                {item.qty}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right font-medium text-slate-600">
                                            ${item.total.toLocaleString()}
                                        </td>
                                    </tr>
                                ))}
                                {staffDetails.length === 0 && (
                                    <tr><td colSpan={3} className="p-8 text-center text-slate-400">此期間沒有銷售記錄</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    
                    <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
                        <button 
                            onClick={() => setSelectedStaffName(null)}
                            className="px-6 py-2 bg-white border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-100 font-medium"
                        >
                            關閉 (Close)
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* Product Sales Detail Modal (Supports Multiple & Independent Dates) */}
        {selectedProductIds.length > 0 && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                <div className="bg-white rounded-2xl w-full max-w-5xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
                    <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                        <div>
                            <h3 className="font-bold text-lg text-slate-800">商品銷售記錄 (Product Sales History)</h3>
                            {/* Independent Date Picker */}
                            <div className="flex items-center gap-2 mt-1">
                                <input 
                                    type="date" 
                                    className="bg-slate-100 border-none text-slate-700 text-xs rounded font-bold focus:ring-2 focus:ring-brand-500 py-1 px-2" 
                                    value={detailStartDate}
                                    onChange={(e) => setDetailStartDate(e.target.value)}
                                />
                                <span className="text-slate-400 text-xs">-</span>
                                <input 
                                    type="date" 
                                    className="bg-slate-100 border-none text-slate-700 text-xs rounded font-bold focus:ring-2 focus:ring-brand-500 py-1 px-2" 
                                    value={detailEndDate}
                                    onChange={(e) => setDetailEndDate(e.target.value)}
                                />
                            </div>
                        </div>
                        <button onClick={() => setSelectedProductIds([])} className="p-1 hover:bg-slate-200 rounded-full transition-colors">
                            <X size={20} className="text-slate-500" />
                        </button>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-0">
                        
                        {/* Salesperson Summary Header with Revenue & GP */}
                        <div className="p-4 bg-slate-50 border-b border-slate-100">
                            <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">
                                銷售人員匯總 (Salesperson Summary) - <span className="text-slate-800">{selectedProductNames}</span>
                            </h4>
                            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                                {productSalesSummary.map((staff) => (
                                    <div key={staff.name} className="bg-white border border-slate-200 rounded-lg p-3 min-w-[140px] shadow-sm flex-shrink-0 flex flex-col justify-between">
                                        <div>
                                            <div className="text-xs text-slate-500 mb-1 flex items-center gap-1">
                                                <Users size={12} /> Sales
                                            </div>
                                            <div className="font-bold text-slate-800 text-sm truncate mb-2" title={staff.name}>{staff.name}</div>
                                        </div>
                                        <div className="text-right">
                                            {/* Revenue */}
                                            <div className={`text-base font-bold ${staff.revenue < 0 ? 'text-red-600' : 'text-slate-800'}`}>
                                                ${staff.revenue.toLocaleString()}
                                            </div>
                                            {/* GP - Conditionally Show */}
                                            {showGP && (
                                                <div className={`text-xs font-medium ${staff.gp < 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                                                    GP: ${staff.gp.toLocaleString()}
                                                </div>
                                            )}
                                            {/* Quantity */}
                                            <div className="text-[10px] text-slate-400 mt-1 bg-slate-100 inline-block px-1.5 py-0.5 rounded">
                                                Qty: {staff.qty}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {productSalesSummary.length === 0 && <span className="text-xs text-slate-400">暫無銷售數據 (No data in this period)</span>}
                            </div>
                        </div>

                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 text-slate-600 font-bold sticky top-0 shadow-sm">
                                <tr>
                                    <th className="p-4">日期 (Date)</th>
                                    <th className="p-4">單號 (Order ID)</th>
                                    {selectedProductIds.length > 1 && <th className="p-4">商品 (Product)</th>}
                                    <th className="p-4">客戶 (Customer)</th>
                                    <th className="p-4">經手人 (Sales)</th>
                                    <th className="p-4 text-right">數量 (Qty)</th>
                                    <th className="p-4 text-right">單價 (Unit Price)</th>
                                    <th className="p-4 text-right">小計 (Total)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {productSalesDetails.map((sale, idx) => (
                                    <tr key={`${sale.orderId}-${idx}`} className="hover:bg-slate-50">
                                        <td className="p-4 text-slate-500">
                                            {new Date(sale.date).toLocaleDateString()}
                                            <div className="text-xs text-slate-400">{new Date(sale.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                                        </td>
                                        <td className="p-4 font-mono font-medium text-slate-700 flex items-center gap-1">
                                            <FileText size={12} className="text-slate-400"/>
                                            {sale.orderId}
                                        </td>
                                        {selectedProductIds.length > 1 && (
                                            <td className="p-4 text-xs">
                                                <div className="font-bold text-slate-800 line-clamp-1" title={sale.productName}>{sale.productName}</div>
                                                <div className="text-slate-400 font-mono">{sale.productSku}</div>
                                            </td>
                                        )}
                                        <td className="p-4 text-slate-600">{sale.customer}</td>
                                        <td className="p-4 text-slate-600">{sale.salesperson}</td>
                                        <td className={`p-4 text-right font-bold ${sale.qty < 0 ? 'text-red-600' : 'text-slate-800'}`}>
                                            {sale.qty}
                                        </td>
                                        <td className="p-4 text-right text-slate-600">
                                            ${sale.price.toLocaleString()}
                                        </td>
                                        <td className={`p-4 text-right font-bold ${sale.total < 0 ? 'text-red-600' : 'text-emerald-700'}`}>
                                            ${sale.total.toLocaleString()}
                                        </td>
                                    </tr>
                                ))}
                                {productSalesDetails.length === 0 && (
                                    <tr><td colSpan={selectedProductIds.length > 1 ? 8 : 7} className="p-10 text-center text-slate-400">此期間沒有銷售記錄 (No records in selected period)</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    
                    <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
                        <button 
                            onClick={() => setSelectedProductIds([])}
                            className="px-6 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 font-medium"
                        >
                            關閉 (Close)
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* Product Search Modal (Multi-Select Support) */}
        {showProductSearch && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                <div className="bg-white rounded-2xl w-full max-w-7xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
                    <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                        <h3 className="font-bold text-lg text-slate-800">查詢商品銷售 (Search Product Sales)</h3>
                        <button onClick={() => setShowProductSearch(false)}><X size={20} className="text-slate-400" /></button>
                    </div>
                    
                    <div className="p-4 border-b border-slate-100">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                <input 
                                    autoFocus
                                    type="text" 
                                    placeholder="搜尋名稱 / SKU..." 
                                    className="w-full pl-9 pr-3 py-2 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                                    value={productSearchQuery}
                                    onChange={e => setProductSearchQuery(e.target.value)}
                                />
                            </div>
                            <select 
                                className="w-full border rounded p-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                                value={searchCategory}
                                onChange={e => setSearchCategory(e.target.value)}
                            >
                                <option value="All">所有分類 (All Categories)</option>
                                {categories
                                  .filter((c: string) => c !== 'All')
                                  .map((c: string) => (
                                    <option key={c} value={c}>{c}</option>
                                  ))}
                            </select>
                            <select 
                                className="w-full border rounded p-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                                value={searchBrand}
                                onChange={e => setSearchBrand(e.target.value)}
                            >
                                <option value="All">所有品牌 (All Brands)</option>
                                {brands
                                  .filter((b: string) => b !== 'All')
                                  .map((b: string) => (
                                    <option key={b} value={b}>{b}</option>
                                  ))}
                            </select>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-2 ml-1">提示: 點擊列可以多選商品 (Tip: Click rows to select multiple items).</p>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-2">
                        <div className="border border-dashed border-slate-200 rounded-lg mb-2 max-h-[420px] overflow-y-auto">
                            <div className="flex items-center justify-between px-2 py-1 text-xs text-slate-500 border-b border-slate-100 bg-slate-50">
                                <span>搜尋結果：{filteredSearchProducts.length} 項</span>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        className="px-2 py-1 rounded border border-slate-200 bg-white hover:bg-slate-50"
                                        onClick={() => {
                                            const allIds = filteredSearchProducts.map(p => p.id);
                                            setTempSelectedIds(new Set(allIds));
                                        }}
                                    >
                                        全選
                                    </button>
                                    <button
                                        type="button"
                                        className="px-2 py-1 rounded border border-slate-200 bg-white hover:bg-slate-50"
                                        onClick={() => setTempSelectedIds(new Set())}
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
                                    {filteredSearchProducts.map(p => {
                                        const isSelected = tempSelectedIds.has(p.id);
                                        const currentStock = p.stock[user.branchId] || 0;
                                        const totalStock = Object.values(p.stock || {}).reduce((sum: number, v: number) => sum + (v || 0), 0);
                                        const fullName = `${p.sku} - ${p.name}`;
                                        return (
                                            <tr
                                                key={p.id}
                                                className={`${isSelected ? 'bg-brand-50 text-brand-700' : 'hover:bg-slate-50'} cursor-pointer`}
                                                onClick={() => toggleSearchSelection(p.id)}
                                            >
                                                <td className="px-2 py-1 text-center">
                                                    <input
                                                        type="checkbox"
                                                        className="w-3 h-3"
                                                        checked={isSelected}
                                                        onChange={e => {
                                                            e.stopPropagation();
                                                            toggleSearchSelection(p.id);
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
                                    {filteredSearchProducts.length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="text-xs text-slate-400 text-center py-2">
                                                沒有符合的產品
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        {!productSearchQuery && filteredSearchProducts.length === 0 && (
                            <div className="text-center py-4 text-slate-400 text-xs">請輸入關鍵字搜尋...</div>
                        )}
                    </div>

                    <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-500">已選擇 {tempSelectedIds.size} 項 (Selected)</span>
                        <button 
                            disabled={tempSelectedIds.size === 0}
                            onClick={handleConfirmSearchSelection}
                            className="bg-slate-800 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-slate-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            查看選取項目 (View Selected)
                        </button>
                    </div>
                </div>
            </div>
        )}

      </div>
    </div>
  );
};

export default Dashboard;
