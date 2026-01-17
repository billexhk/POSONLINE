
import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Outlet, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import POSPage from './components/POS/POSPage';
import Dashboard from './components/Dashboard';
import Inventory from './components/Inventory';
import CustomersPage from './components/CustomersPage';
import OrdersPage from './components/OrdersPage';
import TransfersPage from './components/TransfersPage';
import PurchasingPage from './components/PurchasingPage';
import QuotationsPage from './components/QuotationsPage';
import AccountingPage from './components/AccountingPage';
import SettingsPage from './components/SettingsPage';
import RepairsPage from './components/RepairsPage'; 
import PrintPage from './components/PrintPage';
import Login from './components/Login';
import { User, Product, Order, Customer, Supplier, Quotation, Transfer, RepairTicket, PurchaseOrder, StockInRecord, Branch, Role } from './types';

// --- API CONFIGURATION ---
export const API_BASE_URL = 'https://billposdb.free.nf/pos_api'
const API_ENDPOINTS = {
  LOGIN: `${API_BASE_URL}/login.php`,
  PRODUCTS: `${API_BASE_URL}/get_products.php`,
  SAVE_PRODUCT: `${API_BASE_URL}/save_product.php`,
  CUSTOMERS: `${API_BASE_URL}/get_customers.php`,
  SAVE_CUSTOMER: `${API_BASE_URL}/save_customer.php`,
  ORDERS: `${API_BASE_URL}/get_orders.php`,
  SAVE_ORDER: `${API_BASE_URL}/save_order.php`,
  UPDATE_ORDER: `${API_BASE_URL}/update_order.php`,
  SUPPLIERS: `${API_BASE_URL}/get_suppliers.php`,
  SAVE_SUPPLIER: `${API_BASE_URL}/save_supplier.php`,
  QUOTATIONS: `${API_BASE_URL}/get_quotations.php`,
  SAVE_QUOTATION: `${API_BASE_URL}/save_quotation.php`,
  TRANSFERS: `${API_BASE_URL}/get_transfers.php`,
  SAVE_TRANSFER: `${API_BASE_URL}/save_transfer.php`,
  REPAIRS: `${API_BASE_URL}/get_repairs.php`,
  SAVE_REPAIR: `${API_BASE_URL}/save_repair.php`,
  PURCHASE_ORDERS: `${API_BASE_URL}/get_purchase_orders.php`,
  SAVE_PURCHASE_ORDER: `${API_BASE_URL}/save_purchase_order.php`,
  STOCK_IN_RECORDS: `${API_BASE_URL}/get_stock_in_records.php`,
  SAVE_STOCK_IN_RECORD: `${API_BASE_URL}/save_stock_in_record.php`,
  BRANCHES: `${API_BASE_URL}/get_branches.php`,
  SAVE_BRANCH: `${API_BASE_URL}/save_branch.php`,
  DELETE_BRANCH: `${API_BASE_URL}/delete_branch.php`,
  USERS: `${API_BASE_URL}/get_users.php`,
  SAVE_USER: `${API_BASE_URL}/save_user.php`,
  DELETE_USER: `${API_BASE_URL}/delete_user.php`,
  DELETE_PRODUCT: `${API_BASE_URL}/delete_product.php`,
  CATEGORIES: `${API_BASE_URL}/get_categories.php`,
  SAVE_CATEGORY: `${API_BASE_URL}/save_category.php`,
  DELETE_CATEGORY: `${API_BASE_URL}/delete_category.php`,
  BRANDS: `${API_BASE_URL}/get_brands.php`,
  SAVE_BRAND: `${API_BASE_URL}/save_brand.php`,
  DELETE_BRAND: `${API_BASE_URL}/delete_brand.php`,
  GET_COGS_SUMMARY: `${API_BASE_URL}/get_cogs_summary.php`,
  EXPENSES: `${API_BASE_URL}/get_expenses.php`,
  SAVE_EXPENSE: `${API_BASE_URL}/save_expense.php`,
  DELETE_EXPENSE: `${API_BASE_URL}/delete_expense.php`,
};

// Layout wrapper including sidebar
export class RootErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; message: string }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: unknown) {
    return { hasError: true, message: error instanceof Error ? error.message : 'Unknown error' };
  }

  componentDidCatch(error: unknown, info: any) {
    console.error('RootErrorBoundary caught an error', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 text-slate-100 p-6">
          <div className="max-w-lg w-full bg-slate-950/60 border border-red-500/40 rounded-2xl p-8 shadow-2xl">
            <h1 className="text-2xl font-bold mb-2 text-red-400">系統發生錯誤 (Unexpected Error)</h1>
            <p className="text-sm text-slate-300 mb-4">
              若頁面持續出現空白或錯誤，請重新整理或重新登入。
            </p>
            <div className="text-xs text-red-200 bg-red-950/40 border border-red-500/30 rounded-lg p-3 font-mono break-all mb-4">
              {this.state.message}
            </div>
            <button
              className="w-full bg-slate-100 text-slate-900 font-bold py-2.5 rounded-xl hover:bg-white transition-colors"
              onClick={() => window.location.reload()}
            >
              重新整理 (Reload)
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return window.sessionStorage.getItem('pos_auth_token');
    }
    return null;
  });
  
  // Global State for Master Data
  const [categories, setCategories] = useState<string[]>([]);
  const [brands, setBrands] = useState<string[]>([]);
  
  // Global Data States
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [repairs, setRepairs] = useState<RepairTicket[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [stockInRecords, setStockInRecords] = useState<StockInRecord[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [taxRate, setTaxRate] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const stored = window.localStorage.getItem('pos_tax_rate');
      if (stored !== null) {
        const parsed = parseFloat(stored);
        if (!isNaN(parsed) && parsed >= 0) return parsed;
      }
    }
    return 0;
  });

  const [isProductsLoading, setIsProductsLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(false); // Track if connected to DB

  const buildAuthHeaders = (base?: HeadersInit): HeadersInit | undefined => {
    if (!authToken) return base;
    return {
      ...(base || {}),
      'X-Auth-Token': authToken,
    };
  };

  // --- API FETCH FUNCTIONS ---

  const fetchProducts = async () => {
    setIsProductsLoading(true);
    try {
      const response = await fetch(API_ENDPOINTS.PRODUCTS, {
        headers: buildAuthHeaders(),
      });
      if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
      const data = await response.json();
      
      if (Array.isArray(data)) {
           setProducts(data.length > 0 ? data : []);
           setIsOnline(true);
      } else {
           setProducts([]);
      }
    } catch (error) {
      console.warn("Failed to fetch products.", error);
      setProducts([]);
      setIsOnline(false);
    } finally {
      setIsProductsLoading(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      const response = await fetch(API_ENDPOINTS.CUSTOMERS, {
        headers: buildAuthHeaders(),
      });
      const data = await response.json();
      if (Array.isArray(data)) setCustomers(data);
    } catch (e) { console.error("Fetch Customers Failed", e); }
  };

  const fetchOrders = async () => {
    try {
      const response = await fetch(API_ENDPOINTS.ORDERS, {
        headers: buildAuthHeaders(),
      });
      const data = await response.json();
      if (Array.isArray(data)) setOrders(data);
    } catch (e) { console.error("Fetch Orders Failed", e); }
  };

  const fetchSuppliers = async () => {
    try {
      const response = await fetch(API_ENDPOINTS.SUPPLIERS, {
        headers: buildAuthHeaders(),
      });
      const data = await response.json();
      if (Array.isArray(data)) setSuppliers(data);
    } catch (e) { console.error("Fetch Suppliers Failed", e); }
  };

  const fetchQuotations = async () => {
    try {
      const response = await fetch(API_ENDPOINTS.QUOTATIONS, {
        headers: buildAuthHeaders(),
      });
      const data = await response.json();
      if (Array.isArray(data)) setQuotations(data);
    } catch (e) { console.error("Fetch Quotations Failed", e); }
  };

  const fetchTransfers = async () => {
    try {
      const response = await fetch(API_ENDPOINTS.TRANSFERS, {
        headers: buildAuthHeaders(),
      });
      const data = await response.json();
      if (Array.isArray(data)) setTransfers(data);
    } catch (e) { console.error("Fetch Transfers Failed", e); }
  };

  const fetchRepairs = async () => {
    try {
      const response = await fetch(API_ENDPOINTS.REPAIRS, {
        headers: buildAuthHeaders(),
      });
      const data = await response.json();
      if (Array.isArray(data)) setRepairs(data);
    } catch (e) { console.error("Fetch Repairs Failed", e); }
  };

  const fetchPurchaseOrders = async () => {
    try {
      const response = await fetch(API_ENDPOINTS.PURCHASE_ORDERS, {
        headers: buildAuthHeaders(),
      });
      const data = await response.json();
      if (Array.isArray(data)) setPurchaseOrders(data);
    } catch (e) { console.error("Fetch Purchase Orders Failed", e); }
  };

  const fetchStockInRecords = async () => {
    try {
      const response = await fetch(API_ENDPOINTS.STOCK_IN_RECORDS, {
        headers: buildAuthHeaders(),
      });
      const data = await response.json();
      if (Array.isArray(data)) setStockInRecords(data);
    } catch (e) { console.error("Fetch Stock In Records Failed", e); }
  };

  const fetchBranches = async () => {
    try {
      const response = await fetch(API_ENDPOINTS.BRANCHES, {
        headers: buildAuthHeaders(),
      });
      const data = await response.json();
      if (Array.isArray(data)) setBranches(data);
    } catch (e) { console.error("Fetch Branches Failed", e); }
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch(API_ENDPOINTS.USERS, {
        headers: buildAuthHeaders(),
      });
      const data = await response.json();
      if (Array.isArray(data)) setAllUsers(data);
    } catch (e) { console.error("Fetch Users Failed", e); }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch(API_ENDPOINTS.CATEGORIES, {
        headers: buildAuthHeaders(),
      });
      const data = await response.json();
      if (Array.isArray(data)) {
         setCategories(['All', ...data.map((c: any) => c.name)]);
      }
    } catch (e) { console.error("Fetch Categories Failed", e); }
  };

  const fetchBrands = async () => {
    try {
      const response = await fetch(API_ENDPOINTS.BRANDS, {
        headers: buildAuthHeaders(),
      });
      const data = await response.json();
      if (Array.isArray(data)) {
         setBrands(['All', ...data.map((b: any) => b.name)]);
      }
    } catch (e) { console.error("Fetch Brands Failed", e); }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('pos_tax_rate', String(taxRate));
    }
  }, [taxRate]);

  // --- SAVE FUNCTIONS ---

  const saveOrder = async (order: Order): Promise<boolean> => {
    try {
      const response = await fetch(API_ENDPOINTS.SAVE_ORDER, {
        method: 'POST',
        headers: buildAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(order),
      });
      const result = await response.json();
      if (!result.success) throw new Error(result.error);
      
      await fetchProducts(); // Stock updated
      await fetchOrders();   // Refresh orders list
      return true;
    } catch (error) {
      alert(`Transaction Failed: ${error instanceof Error ? error.message : 'Unknown'}`);
      return false;
    }
  };

  const updateOrder = async (order: Order): Promise<boolean> => {
    try {
        const response = await fetch(API_ENDPOINTS.UPDATE_ORDER, {
            method: 'POST',
            headers: buildAuthHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify(order),
        });
        const result = await response.json();
        if (!result.success) throw new Error(result.error);
        await fetchProducts(); // Stock might change if voided
        await fetchOrders();
        return true;
    } catch (error) {
        alert(`Update Failed: ${error}`);
        return false;
    }
  };

  const saveProduct = async (product: Product): Promise<boolean> => {
    try {
      const response = await fetch(API_ENDPOINTS.SAVE_PRODUCT, {
        method: 'POST',
        headers: buildAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(product),
      });
      const result = await response.json();
      if (!result.success) throw new Error(result.error);
      await fetchProducts();
      return true;
    } catch (error) {
      alert(`Save Failed: ${error instanceof Error ? error.message : 'Unknown'}`);
      return false;
    }
  };

  const deleteProduct = async (id: string): Promise<boolean> => {
    if (!isOnline) {
      setProducts(prev => prev.filter(p => p.id !== id));
      alert("Offline Mode: Product deleted locally.");
      return true;
    }
    try {
      const response = await fetch(API_ENDPOINTS.DELETE_PRODUCT, {
        method: 'POST',
        headers: buildAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ id }),
      });
      const result = await response.json();
      if (!result.success) throw new Error(result.error);
      await fetchProducts();
      return true;
    } catch (error) {
      alert(`Delete Failed: ${error instanceof Error ? error.message : 'Unknown'}`);
      return false;
    }
  };

  const saveCustomer = async (customer: Customer): Promise<boolean> => {
    if (!isOnline) {
      setCustomers(prev => {
        const exists = prev.find(c => c.id === customer.id);
        return exists ? prev.map(c => c.id === customer.id ? customer : c) : [...prev, customer];
      });
      alert("Offline Mode: Customer saved locally.");
      return true;
    }
    try {
      const response = await fetch(API_ENDPOINTS.SAVE_CUSTOMER, {
        method: 'POST',
        headers: buildAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(customer),
      });
      const result = await response.json();
      if (!result.success) throw new Error(result.error);
      await fetchCustomers();
      return true;
    } catch (error) {
      alert(`Save Failed: ${error instanceof Error ? error.message : 'Unknown'}`);
      return false;
    }
  };

  const saveSupplier = async (supplier: Supplier): Promise<boolean> => {
    if (!isOnline) {
        setSuppliers(prev => {
            const exists = prev.find(s => s.id === supplier.id);
            return exists ? prev.map(s => s.id === supplier.id ? supplier : s) : [...prev, supplier];
        });
        return true;
    }
    try {
        const response = await fetch(API_ENDPOINTS.SAVE_SUPPLIER, {
            method: 'POST',
            headers: buildAuthHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify(supplier),
        });
        const result = await response.json();
        if (!result.success) throw new Error(result.error);
        await fetchSuppliers();
        return true;
    } catch (error) {
        alert(`Save Supplier Failed: ${error}`);
        return false;
    }
  };

  const saveQuotation = async (quotation: Quotation): Promise<boolean> => {
    if (!isOnline) {
        setQuotations(prev => {
            const exists = prev.find(q => q.id === quotation.id);
            return exists ? prev.map(q => q.id === quotation.id ? quotation : q) : [quotation, ...prev];
        });
        return true;
    }
    try {
        const response = await fetch(API_ENDPOINTS.SAVE_QUOTATION, {
            method: 'POST',
            headers: buildAuthHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify(quotation),
        });
        const result = await response.json();
        if (!result.success) throw new Error(result.error);
        await fetchQuotations();
        return true;
    } catch (error) {
        alert(`Save Quotation Failed: ${error}`);
        return false;
    }
  };

  const saveTransfer = async (transfer: Transfer): Promise<boolean> => {
    try {
        const response = await fetch(API_ENDPOINTS.SAVE_TRANSFER, {
            method: 'POST',
            headers: buildAuthHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify(transfer),
        });
        const result = await response.json();
        if (!result.success) throw new Error(result.error);
        await fetchTransfers();
        return true;
    } catch (error) {
        alert(`Save Transfer Failed: ${error}`);
        return false;
    }
  };

  const saveRepair = async (repair: RepairTicket): Promise<boolean> => {
    try {
        const response = await fetch(API_ENDPOINTS.SAVE_REPAIR, {
            method: 'POST',
            headers: buildAuthHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify(repair),
        });
        const result = await response.json();
        if (!result.success) throw new Error(result.error);
        await fetchRepairs();
        return true;
    } catch (error) {
        alert(`Save Repair Failed: ${error}`);
        return false;
    }
  };

  const savePurchaseOrder = async (po: PurchaseOrder): Promise<boolean> => {
    try {
        const response = await fetch(API_ENDPOINTS.SAVE_PURCHASE_ORDER, {
            method: 'POST',
            headers: buildAuthHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify(po),
        });
        const result = await response.json();
        if (!result.success) throw new Error(result.error);
        await fetchPurchaseOrders();
        return true;
    } catch (error) {
        alert(`Save PO Failed: ${error}`);
        return false;
    }
  };

  const saveStockInRecord = async (record: StockInRecord): Promise<boolean> => {
    try {
        const response = await fetch(API_ENDPOINTS.SAVE_STOCK_IN_RECORD, {
            method: 'POST',
            headers: buildAuthHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify(record),
        });
        const result = await response.json();
        if (!result.success) throw new Error(result.error);
        
        await fetchStockInRecords();
        await fetchProducts(); // Update stock
        return true;
    } catch (error) {
        alert(`Save Record Failed: ${error}`);
        return false;
    }
  };

  const saveBranch = async (branch: Branch): Promise<boolean> => {
    try {
        const response = await fetch(API_ENDPOINTS.SAVE_BRANCH, {
            method: 'POST',
            headers: buildAuthHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify(branch),
        });
        const result = await response.json();
        if (!result.success) throw new Error(result.error);
        await fetchBranches();
        return true;
    } catch (error) {
        alert(`Save Branch Failed: ${error}`);
        return false;
    }
  };

  const saveUser = async (userData: User & { password?: string }): Promise<boolean> => {
      // Note: userData includes password optionally for new/update
      try {
          const response = await fetch(API_ENDPOINTS.SAVE_USER, {
              method: 'POST',
              headers: buildAuthHeaders({ 'Content-Type': 'application/json' }),
              body: JSON.stringify(userData),
          });
          const result = await response.json();
          if (!result.success) throw new Error(result.error);
          await fetchUsers();
          return true;
      } catch (error) {
          alert(`Save User Failed: ${error}`);
          return false;
      }
  };

  const deleteBranch = async (id: string): Promise<boolean> => {
    try {
      const response = await fetch(API_ENDPOINTS.DELETE_BRANCH, {
        method: 'POST',
        headers: buildAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ id }),
      });
      const result = await response.json();
      if (!result.success) throw new Error(result.error);
      await fetchBranches();
      return true;
    } catch (error) {
      alert(`Delete Branch Failed: ${error}`);
      return false;
    }
  };

  const deleteUser = async (id: string): Promise<boolean> => {
    try {
      const response = await fetch(API_ENDPOINTS.DELETE_USER, {
        method: 'POST',
        headers: buildAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ id }),
      });
      const result = await response.json();
      if (!result.success) throw new Error(result.error);
      await fetchUsers();
      return true;
    } catch (error) {
      alert(`Delete User Failed: ${error}`);
      return false;
    }
  };

  const saveCategory = async (name: string): Promise<boolean> => {
    try {
      const response = await fetch(API_ENDPOINTS.SAVE_CATEGORY, {
        method: 'POST',
        headers: buildAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ name }),
      });
      const result = await response.json();
      if (!result.success) throw new Error(result.error);
      await fetchCategories();
      return true;
    } catch (error) {
      alert(`Save Category Failed: ${error}`);
      return false;
    }
  };

  const deleteCategory = async (name: string): Promise<boolean> => {
    try {
      const response = await fetch(API_ENDPOINTS.DELETE_CATEGORY, {
        method: 'POST',
        headers: buildAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ name }),
      });
      const result = await response.json();
      if (!result.success) throw new Error(result.error);
      await fetchCategories();
      return true;
    } catch (error) {
      alert(`Delete Category Failed: ${error}`);
      return false;
    }
  };

  const saveBrand = async (name: string): Promise<boolean> => {
    try {
      const response = await fetch(API_ENDPOINTS.SAVE_BRAND, {
        method: 'POST',
        headers: buildAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ name }),
      });
      const result = await response.json();
      if (!result.success) throw new Error(result.error);
      await fetchBrands();
      return true;
    } catch (error) {
      alert(`Save Brand Failed: ${error}`);
      return false;
    }
  };

  const deleteBrand = async (name: string): Promise<boolean> => {
    try {
      const response = await fetch(API_ENDPOINTS.DELETE_BRAND, {
        method: 'POST',
        headers: buildAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ name }),
      });
      const result = await response.json();
      if (!result.success) throw new Error(result.error);
      await fetchBrands();
      return true;
    } catch (error) {
      alert(`Delete Brand Failed: ${error}`);
      return false;
    }
  };

  // --- EFFECTS ---

  // Initial Fetch on Login
  useEffect(() => {
    if (user) {
      fetchProducts().then(() => {
         // After products, try fetching others
         fetchCustomers();
         fetchOrders();
         fetchSuppliers();
         fetchQuotations();
         fetchTransfers();
         fetchRepairs();
         fetchPurchaseOrders();
         fetchStockInRecords();
         fetchBranches();
         if (user.role === Role.ADMIN || user.role === Role.MANAGER) {
           fetchUsers();
         }
         fetchCategories();
         fetchBrands();
      });
    }
  }, [user]);

  // Re-fetch when coming online
  useEffect(() => {
    if (user && isOnline) {
        fetchCustomers();
        fetchOrders();
        fetchSuppliers();
        fetchQuotations();
        fetchTransfers();
        fetchRepairs();
        fetchPurchaseOrders();
        fetchStockInRecords();
        fetchBranches();
        if (user.role === Role.ADMIN || user.role === Role.MANAGER) {
          fetchUsers();
        }
        fetchCategories();
        fetchBrands();
    }
  }, [isOnline, user]);

  // --- HANDLERS ---

  const handleLogin = async (credentials: any) => {
    // If credentials has username/password, try API
    if (credentials.username && credentials.password) {
        try {
            const response = await fetch(API_ENDPOINTS.LOGIN, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(credentials)
            });
            const result = await response.json();
            if (result.success) {
                const u = result.user;
                const token = result.token || null;
                const mapped = {
                  id: u.id,
                  username: u.username,
                  name: u.name,
                  role: u.role,
                  branchId: u.branchId ?? u.branch_id
                };
                setUser(mapped);
                if (token) {
                  setAuthToken(token);
                  if (typeof window !== 'undefined') {
                    window.sessionStorage.setItem('pos_auth_token', token);
                  }
                }
                return true;
            } else {
                return false;
            }
        } catch (e) {
            console.error("Login API failed", e);
            return false; 
        }
    }
    return false;
  };

  const handleLogout = () => {
    setUser(null);
    setAuthToken(null);
    if (typeof window !== 'undefined') {
      window.sessionStorage.removeItem('pos_auth_token');
    }
  };

  const handleSwitchBranch = (branchId: string) => {
    if (user) {
      setUser({ ...user, branchId });
    }
  };

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  const renderProtected = (element: React.ReactElement, allowedRoles?: Role[]) => {
    if (!allowedRoles || allowedRoles.includes(user.role)) {
      return element;
    }
    return (
      <div className="p-8">
        <div className="max-w-xl mx-auto bg-white rounded-2xl shadow-sm border border-rose-200 p-6">
          <h2 className="text-lg font-bold text-rose-700 mb-2">沒有權限</h2>
          <p className="text-sm text-rose-600">您的帳號角色無法存取此功能，請聯絡系統管理員。</p>
        </div>
      </div>
    );
  };

  const appContext = {
    user,
    authToken,
    products,
    customers,
    orders,
    suppliers,
    quotations,
    transfers,
    repairs,
    purchaseOrders,
    stockInRecords,
    branches,
    allUsers,
    categories,
    brands,
    setCategories,
    setBrands,
    saveOrder,
    updateOrder,
    saveProduct,
    deleteProduct,
    saveCustomer,
    saveSupplier,
    saveQuotation,
    saveTransfer,
    saveRepair,
    savePurchaseOrder,
    saveStockInRecord,
    saveBranch,
    saveUser,
    deleteBranch,
    deleteUser,
    saveCategory,
    deleteCategory,
    saveBrand,
    deleteBrand,
    refreshProducts: fetchProducts,
    isProductsLoading,
    taxRate,
    setTaxRate
  };

  return (
    <RootErrorBoundary>
      <HashRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <Routes>
          <Route
            path="/"
            element={
              <div className="flex flex-row h-screen w-full bg-slate-50 text-slate-900">
                <Sidebar 
                  user={user} 
                  branches={branches}
                  onLogout={handleLogout} 
                  onSwitchBranch={handleSwitchBranch} 
                  isOnline={isOnline}
                />
                <div className="flex-1 min-w-0 h-screen overflow-auto">
                  <Outlet context={appContext} />
                </div>
              </div>
            }>
            <Route index element={<POSPage />} />
            <Route path="dashboard" element={renderProtected(<Dashboard />, [Role.ADMIN, Role.MANAGER, Role.ACCOUNTANT])} />
            <Route path="products" element={renderProtected(<Inventory />, [Role.ADMIN, Role.MANAGER, Role.ACCOUNTANT, Role.CLERK])} />
            <Route path="purchasing" element={renderProtected(<PurchasingPage />, [Role.ADMIN, Role.MANAGER, Role.ACCOUNTANT, Role.CASHIER])} />
            <Route path="quotations" element={renderProtected(<QuotationsPage />, [Role.ADMIN, Role.MANAGER, Role.CASHIER, Role.CLERK])} />
            <Route path="transfers" element={renderProtected(<TransfersPage />, [Role.ADMIN, Role.MANAGER, Role.CLERK])} />
            <Route path="customers" element={<CustomersPage />} />
            <Route path="orders" element={<OrdersPage />} />
            <Route path="accounting" element={renderProtected(<AccountingPage />, [Role.ADMIN, Role.MANAGER, Role.ACCOUNTANT])} />
            <Route path="daily-close" element={renderProtected(<AccountingPage />, [Role.CASHIER])} />
            <Route path="settings" element={renderProtected(<SettingsPage />, [Role.ADMIN, Role.MANAGER])} />
            <Route path="repairs" element={renderProtected(<RepairsPage />, [Role.ADMIN, Role.MANAGER, Role.CLERK])} />
          </Route>
          <Route path="/print/:type/:id" element={<PrintPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HashRouter>
    </RootErrorBoundary>
  );
};

export default App;
