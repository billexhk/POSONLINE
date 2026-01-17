import React, { useState } from 'react';
import { 
  Building2, 
  Users, 
  Printer, 
  Store, 
  Save, 
  CreditCard, 
  Globe, 
  CheckCircle,
  Mail,
  Phone,
  MapPin,
  Shield,
  Plus,
  X,
  Edit,
  Trash2,
  Lock,
  Eye,
  EyeOff,
  Database,
  Tag,
  Box
} from 'lucide-react';
import { Branch, User, Role } from '../types';
import { useOutletContext } from 'react-router-dom';

type Tab = 'GENERAL' | 'BRANCHES' | 'USERS' | 'MASTER_DATA' | 'RECEIPT';

// Role Definitions for UI Display
const ROLE_DEFINITIONS: Record<Role, string[]> = {
  [Role.ADMIN]: ['所有權限 (Full Access)', '系統設定', '員工管理', '跨分店存取'],
  [Role.MANAGER]: ['查看成本 (View Cost)', '修改價格', '業績報表', '退貨/取消訂單', '分店庫存管理'],
  [Role.ACCOUNTANT]: ['會計結算', '採購單管理', '查看成本', '業績報表'],
  [Role.CASHIER]: ['POS 銷售', '客戶管理 (CRM)', '查看庫存', '一般訂單操作'],
  [Role.CLERK]: ['POS 銷售', '查看庫存 (無成本)', '建立報價單']
};

interface SettingsContext {
  user: User;
  categories: string[];
  brands: string[];
  branches: Branch[];
  allUsers: User[];
  saveBranch: (branch: Branch) => Promise<boolean>;
  saveUser: (user: User & { password?: string }) => Promise<boolean>;
  deleteBranch: (id: string) => Promise<boolean>;
  deleteUser: (id: string) => Promise<boolean>;
  saveCategory: (name: string) => Promise<boolean>;
  deleteCategory: (name: string) => Promise<boolean>;
  saveBrand: (name: string) => Promise<boolean>;
  deleteBrand: (name: string) => Promise<boolean>;
  taxRate: number;
  setTaxRate: (rate: number) => void;
}

const SettingsPage: React.FC = () => {
  const { user, categories, brands, branches, allUsers: users, saveBranch, saveUser, deleteBranch, deleteUser, saveCategory, deleteCategory, saveBrand, deleteBrand, taxRate, setTaxRate } = useOutletContext<SettingsContext>();
  const isAdmin = user.role === Role.ADMIN;
  const isManager = user.role === Role.MANAGER;
  
  const [activeTab, setActiveTab] = useState<Tab>('GENERAL');
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  // Modal States
  const [branchModal, setBranchModal] = useState<{isOpen: boolean, mode: 'CREATE' | 'EDIT', data?: Branch}>({ isOpen: false, mode: 'CREATE' });
  const [userModal, setUserModal] = useState<{isOpen: boolean, mode: 'CREATE' | 'EDIT', data?: User}>({ isOpen: false, mode: 'CREATE' });

  // Input states for new Master Data
  const [newCategory, setNewCategory] = useState('');
  const [newBrand, setNewBrand] = useState('');

  // Mock General Settings State
  const [generalSettings, setGeneralSettings] = useState({
    companyName: 'HK Tech Limited',
    email: 'support@hktech.com',
    phone: '+852 2345 6789',
    address: 'Shop 101, 1/F, Mong Kok Computer Centre, Mong Kok, Kowloon',
    currency: 'HKD ($)',
    website: 'www.hktech.com'
  });

  const [receiptSettings, setReceiptSettings] = useState({
    headerText: 'Thank you for shopping with HK Tech!',
    footerText: 'Goods sold are non-refundable. Exchange within 7 days with receipt.',
    showLogo: true,
    showTaxId: false,
    printerIp: '192.168.1.200'
  });

  const handleSave = () => {
    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      setLoading(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }, 800);
  };

  // Branch Handlers
  const handleSaveBranch = async (branch: Branch) => {
    // Generate ID for new branch if missing (client-side generation for now, ideally server returns it)
    // But our API expects ID for both create and update.
    // Let's assume user provides ID or we generate it. 
    // Wait, the API save_branch.php expects 'id', 'name', 'code'.
    // BranchModal doesn't have ID input for new branches? 
    // Let's check BranchModal. It seems it doesn't show ID input.
    // I should add ID input or auto-generate.
    // For now, let's auto-generate if it's CREATE.
    
    let branchToSave = { ...branch };
    if (branchModal.mode === 'CREATE' && !branchToSave.id) {
         branchToSave.id = `b${Date.now()}`;
    }

    const success = await saveBranch(branchToSave);
    if (success) {
        setBranchModal({ isOpen: false, mode: 'CREATE' });
    }
  };

  const handleDeleteBranch = async (id: string) => {
     if (window.confirm('確定刪除此分店? (Are you sure?)')) {
        await deleteBranch(id);
     }
  };

  const handleSaveUser = async (user: User & { password?: string }) => {
    let userToSave = { ...user };
    if (userModal.mode === 'CREATE' && !userToSave.id) {
         userToSave.id = `u${Date.now()}`;
    }
    
    const success = await saveUser(userToSave);
    if (success) {
        setUserModal({ isOpen: false, mode: 'CREATE' });
    }
  };

   const handleDeleteUser = async (id: string) => {
     if (window.confirm('確定刪除此員工? (Are you sure?)')) {
        await deleteUser(id);
     }
  };

  // Master Data Handlers
  const handleAddCategory = async () => {
    if (newCategory.trim() && !categories.includes(newCategory.trim())) {
      await saveCategory(newCategory.trim());
      setNewCategory('');
    }
  };

  const handleDeleteCategory = async (cat: string) => {
    if (cat === 'All') return; // Protect 'All'
    if (window.confirm(`刪除分類 "${cat}"?`)) {
      await deleteCategory(cat);
    }
  };

  const handleAddBrand = async () => {
    if (newBrand.trim() && !brands.includes(newBrand.trim())) {
      await saveBrand(newBrand.trim());
      setNewBrand('');
    }
  };

  const handleDeleteBrand = async (br: string) => {
    if (br === 'All') return; // Protect 'All'
    if (window.confirm(`刪除品牌 "${br}"?`)) {
      await deleteBrand(br);
    }
  };

  const TabButton = ({ id, label, icon: Icon }: { id: Tab, label: string, icon: any }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all ${
        activeTab === id 
          ? 'bg-brand-50 text-brand-600 shadow-sm' 
          : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
      }`}
    >
      <Icon size={18} />
      {label}
    </button>
  );

  return (
    <div className="p-8 bg-slate-50 min-h-screen">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
           <div>
             <h1 className="text-2xl font-bold text-slate-800">系統設定 (System Settings)</h1>
             <p className="text-slate-500 mt-1">管理店鋪資訊、使用者權限與系統參數</p>
           </div>
           
           <button 
             onClick={handleSave}
             disabled={loading}
             className="bg-slate-900 text-white px-6 py-2.5 rounded-xl flex items-center gap-2 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-500 disabled:opacity-70 transition-all shadow-lg shadow-slate-900/20"
           >
             {saved ? <CheckCircle size={18} className="text-emerald-400" /> : <Save size={18} />}
             {loading ? '儲存中...' : (saved ? '已儲存' : '儲存變更 (Save)')}
           </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
           {/* Sidebar Navigation */}
           <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-2 space-y-1">
                 <TabButton id="GENERAL" label="一般設定 (General)" icon={Building2} />
                 {isAdmin && <TabButton id="BRANCHES" label="分店管理 (Branches)" icon={Store} />}
                 {(isAdmin || isManager) && <TabButton id="USERS" label="員工權限 (Users)" icon={Users} />}
                 {(isAdmin || isManager) && <TabButton id="MASTER_DATA" label="基礎資料 (Master Data)" icon={Database} />}
                 {(isAdmin || isManager) && <TabButton id="RECEIPT" label="收據設定 (Receipt)" icon={Printer} />}
              </div>

              <div className="mt-6 bg-blue-50 rounded-2xl p-4 border border-blue-100">
                 <div className="flex items-start gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                       <Shield size={20} />
                    </div>
                    <div>
                       <h4 className="font-bold text-blue-900 text-sm">系統資訊</h4>
                       <p className="text-xs text-blue-700 mt-1">Version: 2.2.0 (Stable)</p>
                       <p className="text-xs text-blue-700">Last Backup: Today 10:00 AM</p>
                    </div>
                 </div>
              </div>
           </div>

           {/* Content Area */}
           <div className="lg:col-span-3">
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 min-h-[600px]">
                 
                 {/* GENERAL SETTINGS */}
                 {activeTab === 'GENERAL' && (
                    <div className="space-y-6 animate-in fade-in duration-300">
                       <h2 className="text-xl font-bold text-slate-800 border-b border-slate-100 pb-4 mb-6">一般設定</h2>
                       
                       <div className="grid grid-cols-1 gap-6">
                          <div>
                             <label className="block text-sm font-bold text-slate-700 mb-2">公司名稱 (Company Name)</label>
                             <div className="relative">
                               <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                               <input 
                                 type="text" 
                                 className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:outline-none"
                                 value={generalSettings.companyName}
                                 onChange={e => setGeneralSettings({...generalSettings, companyName: e.target.value})}
                               />
                             </div>
                          </div>

                          <div className="grid grid-cols-2 gap-6">
                             <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">聯絡電話 (Phone)</label>
                                <div className="relative">
                                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                  <input 
                                    type="text" 
                                    className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:outline-none"
                                    value={generalSettings.phone}
                                    onChange={e => setGeneralSettings({...generalSettings, phone: e.target.value})}
                                  />
                                </div>
                             </div>
                             <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">電子郵件 (Email)</label>
                                <div className="relative">
                                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                  <input 
                                    type="email" 
                                    className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:outline-none"
                                    value={generalSettings.email}
                                    onChange={e => setGeneralSettings({...generalSettings, email: e.target.value})}
                                  />
                                </div>
                             </div>
                          </div>

                          <div>
                             <label className="block text-sm font-bold text-slate-700 mb-2">地址 (Address)</label>
                             <div className="relative">
                               <MapPin className="absolute left-3 top-3 text-slate-400" size={18} />
                               <textarea 
                                 rows={3}
                                 className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:outline-none"
                                 value={generalSettings.address}
                                 onChange={e => setGeneralSettings({...generalSettings, address: e.target.value})}
                               />
                             </div>
                          </div>

                          <div className="grid grid-cols-2 gap-6">
                             <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">網站 (Website)</label>
                                <div className="relative">
                                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                  <input 
                                    type="text" 
                                    className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:outline-none"
                                    value={generalSettings.website}
                                    onChange={e => setGeneralSettings({...generalSettings, website: e.target.value})}
                                  />
                                </div>
                             </div>
                             <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">貨幣單位 (Currency)</label>
                                <div className="relative">
                                  <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                  <input 
                                    type="text" 
                                    className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:outline-none bg-slate-50"
                                    value={generalSettings.currency}
                                    readOnly
                                  />
                                </div>
                             </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-6">
                            <div>
                              <label className="block text-sm font-bold text-slate-700 mb-2">銷售稅率 (Tax Rate %)</label>
                              <div className="relative">
                                <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input
                                  type="number"
                                  min={0}
                                  step={0.1}
                                  className="w-full pl-10 pr-10 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:outline-none"
                                  value={taxRate}
                                  onChange={e => {
                                    const value = parseFloat(e.target.value);
                                    setTaxRate(!isNaN(value) && value >= 0 ? value : 0);
                                  }}
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">%</span>
                              </div>
                              <p className="mt-1 text-xs text-slate-500">用於計算 GST / VAT 等銷售稅。</p>
                            </div>
                          </div>
                       </div>
                    </div>
                 )}

                 {/* BRANCHES */}
                 {activeTab === 'BRANCHES' && (
                    <div className="space-y-6 animate-in fade-in duration-300">
                        <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-6">
                           <h2 className="text-xl font-bold text-slate-800">分店管理</h2>
                           <button 
                             onClick={() => setBranchModal({ isOpen: true, mode: 'CREATE' })}
                             className="text-sm bg-brand-50 text-brand-600 px-3 py-1.5 rounded-lg font-bold hover:bg-brand-100 flex items-center gap-1"
                           >
                              <Plus size={16} /> 新增分店
                           </button>
                        </div>
                        
                        <div className="space-y-4">
                           {branches.map(branch => (
                              <div key={branch.id} className="p-4 border border-slate-200 rounded-xl hover:border-brand-300 transition-colors group">
                                 <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-4">
                                       <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center text-slate-500 font-bold group-hover:bg-brand-50 group-hover:text-brand-600 transition-colors">
                                          {branch.code}
                                       </div>
                                       <div>
                                          <h3 className="font-bold text-slate-800">{branch.name}</h3>
                                          <p className="text-sm text-slate-500">ID: {branch.id}</p>
                                       </div>
                                    </div>
                                    <div className="flex gap-2">
                                       <button 
                                          onClick={() => setBranchModal({ isOpen: true, mode: 'EDIT', data: branch })}
                                          className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 flex items-center gap-1"
                                       >
                                          <Edit size={14} /> 編輯
                                       </button>
                                       <button 
                                          onClick={() => handleDeleteBranch(branch.id)}
                                          className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg text-red-600 hover:bg-red-50 flex items-center gap-1"
                                       >
                                          <Trash2 size={14} /> 刪除
                                       </button>
                                    </div>
                                 </div>
                              </div>
                           ))}
                        </div>
                    </div>
                 )}

                 {/* USERS */}
                 {activeTab === 'USERS' && (
                    <div className="space-y-6 animate-in fade-in duration-300">
                       <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-6">
                           <h2 className="text-xl font-bold text-slate-800">員工權限管理</h2>
                           <button 
                             onClick={() => setUserModal({ isOpen: true, mode: 'CREATE' })}
                             className="text-sm bg-brand-50 text-brand-600 px-3 py-1.5 rounded-lg font-bold hover:bg-brand-100 flex items-center gap-1"
                           >
                              <Plus size={16} /> 新增員工
                           </button>
                        </div>

                        <div className="overflow-hidden border border-slate-200 rounded-xl mb-8">
                           <table className="w-full text-left text-sm">
                              <thead className="bg-slate-50 text-slate-600 font-bold">
                                 <tr>
                                    <th className="p-4">姓名 (Name)</th>
                                    <th className="p-4">用戶名 (Username)</th>
                                    <th className="p-4">角色 (Role)</th>
                                    <th className="p-4">所屬分店 (Branch)</th>
                                    <th className="p-4 text-center">狀態</th>
                                    <th className="p-4 text-center">操作</th>
                                 </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                 {users.map(u => {
                                    const isTargetAdmin = u.role === Role.ADMIN;
                                    const canManageUser = isAdmin || (isManager && !isTargetAdmin);
                                    return (
                                      <tr key={u.id} className="hover:bg-slate-50">
                                         <td className="p-4 font-medium text-slate-800">{u.name}</td>
                                         <td className="p-4 text-slate-600">{u.username}</td>
                                         <td className="p-4">
                                            <span className={`px-2 py-1 rounded text-xs font-bold ${
                                              u.role === Role.ADMIN ? 'bg-purple-100 text-purple-700' :
                                              u.role === Role.MANAGER ? 'bg-blue-100 text-blue-700' :
                                              'bg-slate-100 text-slate-700'
                                            }`}>{u.role}</span>
                                         </td>
                                         <td className="p-4 text-slate-600">{branches.find(b => b.id === u.branchId)?.name || u.branchId}</td>
                                         <td className="p-4 text-center">
                                            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                                         </td>
                                         <td className="p-4 text-center">
                                            {canManageUser && (
                                              <div className="flex items-center justify-center gap-2">
                                                 <button 
                                                    onClick={() => setUserModal({ isOpen: true, mode: 'EDIT', data: u })}
                                                    className="text-slate-400 hover:text-brand-600 p-1"
                                                 >
                                                    <Edit size={16} />
                                                 </button>
                                                 <button 
                                                    onClick={() => handleDeleteUser(u.id)}
                                                    className="text-slate-400 hover:text-red-600 p-1"
                                                 >
                                                    <Trash2 size={16} />
                                                 </button>
                                              </div>
                                            )}
                                         </td>
                                      </tr>
                                    );
                                 })}
                              </tbody>
                           </table>
                        </div>

                        {/* Permissions Reference */}
                        <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
                           <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                              <Shield size={18} className="text-slate-500" />
                              角色權限說明 (Role Permissions)
                           </h3>
                           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              {Object.entries(ROLE_DEFINITIONS).map(([role, perms]) => (
                                 <div key={role} className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                                    <h4 className="font-bold text-sm text-slate-700 mb-2 border-b border-slate-100 pb-2">{role}</h4>
                                    <ul className="space-y-1">
                                       {perms.map((p, idx) => (
                                          <li key={idx} className="text-xs text-slate-500 flex items-center gap-1.5">
                                             <div className="w-1 h-1 bg-brand-500 rounded-full"></div>
                                             {p}
                                          </li>
                                       ))}
                                    </ul>
                                 </div>
                              ))}
                           </div>
                        </div>
                    </div>
                 )}

                 {/* MASTER DATA (Categories & Brands) */}
                 {activeTab === 'MASTER_DATA' && (
                    <div className="space-y-8 animate-in fade-in duration-300">
                       <h2 className="text-xl font-bold text-slate-800 border-b border-slate-100 pb-4">基礎資料管理</h2>
                       
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          {/* Categories Section */}
                          <div className="bg-slate-50 rounded-xl border border-slate-200 flex flex-col h-[500px]">
                             <div className="p-4 border-b border-slate-200 bg-white rounded-t-xl flex justify-between items-center">
                                <h3 className="font-bold text-slate-700 flex items-center gap-2">
                                   <Box size={18} /> 商品分類 (Categories)
                                </h3>
                                <span className="text-xs text-slate-400">{categories.length - 1} items</span>
                             </div>
                             <div className="flex-1 overflow-y-auto p-4 space-y-2">
                                {categories.filter(c => c !== 'All').map((cat, idx) => (
                                   <div key={idx} className="flex justify-between items-center p-3 bg-white border border-slate-100 rounded-lg shadow-sm group hover:border-brand-300 transition-all">
                                      <span className="text-sm font-medium text-slate-700">{cat}</span>
                                      <button 
                                        onClick={() => handleDeleteCategory(cat)}
                                        className="text-slate-300 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                      >
                                         <Trash2 size={16} />
                                      </button>
                                   </div>
                                ))}
                             </div>
                             <div className="p-4 border-t border-slate-200 bg-white rounded-b-xl">
                                <div className="flex gap-2">
                                   <input 
                                     type="text" 
                                     className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
                                     placeholder="輸入新分類..."
                                     value={newCategory}
                                     onChange={(e) => setNewCategory(e.target.value)}
                                     onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
                                   />
                                   <button 
                                     onClick={handleAddCategory}
                                     disabled={!newCategory.trim()}
                                     className="bg-brand-600 text-white p-2 rounded-lg hover:bg-brand-700 disabled:opacity-50"
                                   >
                                      <Plus size={20} />
                                   </button>
                                </div>
                             </div>
                          </div>

                          {/* Brands Section */}
                          <div className="bg-slate-50 rounded-xl border border-slate-200 flex flex-col h-[500px]">
                             <div className="p-4 border-b border-slate-200 bg-white rounded-t-xl flex justify-between items-center">
                                <h3 className="font-bold text-slate-700 flex items-center gap-2">
                                   <Tag size={18} /> 品牌列表 (Brands)
                                </h3>
                                <span className="text-xs text-slate-400">{brands.length - 1} items</span>
                             </div>
                             <div className="flex-1 overflow-y-auto p-4 space-y-2">
                                {brands.filter(b => b !== 'All').map((brand, idx) => (
                                   <div key={idx} className="flex justify-between items-center p-3 bg-white border border-slate-100 rounded-lg shadow-sm group hover:border-brand-300 transition-all">
                                      <span className="text-sm font-medium text-slate-700">{brand}</span>
                                      <button 
                                        onClick={() => handleDeleteBrand(brand)}
                                        className="text-slate-300 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                      >
                                         <Trash2 size={16} />
                                      </button>
                                   </div>
                                ))}
                             </div>
                             <div className="p-4 border-t border-slate-200 bg-white rounded-b-xl">
                                <div className="flex gap-2">
                                   <input 
                                     type="text" 
                                     className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
                                     placeholder="輸入新品牌..."
                                     value={newBrand}
                                     onChange={(e) => setNewBrand(e.target.value)}
                                     onKeyDown={(e) => e.key === 'Enter' && handleAddBrand()}
                                   />
                                   <button 
                                     onClick={handleAddBrand}
                                     disabled={!newBrand.trim()}
                                     className="bg-brand-600 text-white p-2 rounded-lg hover:bg-brand-700 disabled:opacity-50"
                                   >
                                      <Plus size={20} />
                                   </button>
                                </div>
                             </div>
                          </div>
                       </div>
                    </div>
                 )}

                 {/* RECEIPT */}
                 {activeTab === 'RECEIPT' && (
                    <div className="space-y-6 animate-in fade-in duration-300">
                       <h2 className="text-xl font-bold text-slate-800 border-b border-slate-100 pb-4 mb-6">收據列印設定</h2>
                       
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <div className="space-y-6">
                              <div>
                                 <label className="block text-sm font-bold text-slate-700 mb-2">頁首文字 (Header Text)</label>
                                 <textarea 
                                    rows={2}
                                    className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:outline-none"
                                    value={receiptSettings.headerText}
                                    onChange={e => setReceiptSettings({...receiptSettings, headerText: e.target.value})}
                                 />
                              </div>
                              <div>
                                 <label className="block text-sm font-bold text-slate-700 mb-2">頁尾條款 (Footer Terms)</label>
                                 <textarea 
                                    rows={4}
                                    className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:outline-none"
                                    value={receiptSettings.footerText}
                                    onChange={e => setReceiptSettings({...receiptSettings, footerText: e.target.value})}
                                 />
                              </div>
                              
                              <div className="flex items-center gap-4">
                                 <label className="flex items-center gap-2 cursor-pointer">
                                    <input 
                                       type="checkbox" 
                                       checked={receiptSettings.showLogo}
                                       onChange={e => setReceiptSettings({...receiptSettings, showLogo: e.target.checked})}
                                       className="w-5 h-5 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                                    />
                                    <span className="text-slate-700 font-medium">列印 Logo</span>
                                 </label>
                                 <label className="flex items-center gap-2 cursor-pointer">
                                    <input 
                                       type="checkbox" 
                                       checked={receiptSettings.showTaxId}
                                       onChange={e => setReceiptSettings({...receiptSettings, showTaxId: e.target.checked})}
                                       className="w-5 h-5 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                                    />
                                    <span className="text-slate-700 font-medium">顯示商業登記號 (BR)</span>
                                 </label>
                              </div>
                          </div>

                          <div className="bg-slate-100 rounded-xl p-6 border border-slate-200 flex flex-col items-center justify-center text-center">
                              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">預覽 (Preview)</p>
                              <div className="bg-white p-6 shadow-md w-full max-w-[300px] text-xs font-mono text-slate-600 min-h-[300px]">
                                 {receiptSettings.showLogo && (
                                    <div className="w-12 h-12 bg-slate-900 mx-auto mb-4 flex items-center justify-center text-white font-bold rounded">Logo</div>
                                 )}
                                 <div className="text-center font-bold text-sm text-slate-900 mb-2">{generalSettings.companyName}</div>
                                 <div className="text-center mb-4">{generalSettings.address}</div>
                                 <div className="text-center mb-4 border-b border-slate-300 pb-2">{receiptSettings.headerText}</div>
                                 
                                 <div className="flex justify-between mb-1">
                                    <span>Item A</span>
                                    <span>$100.00</span>
                                 </div>
                                 <div className="flex justify-between mb-4">
                                    <span>Item B</span>
                                    <span>$50.00</span>
                                 </div>
                                 
                                 <div className="flex justify-between font-bold text-slate-900 border-t border-slate-300 pt-2 mb-6">
                                    <span>TOTAL</span>
                                    <span>$150.00</span>
                                 </div>
                                 
                                 <div className="text-center text-[10px] text-slate-400">
                                    {receiptSettings.footerText}
                                 </div>
                              </div>
                          </div>
                       </div>
                    </div>
                 )}

              </div>
           </div>
        </div>
      </div>
      
      {/* Branch Modal */}
      {branchModal.isOpen && (
         <BranchModal 
           mode={branchModal.mode} 
           branch={branchModal.data} 
           onClose={() => setBranchModal({ ...branchModal, isOpen: false })}
           onSave={handleSaveBranch}
         />
      )}

      {/* User Modal */}
      {userModal.isOpen && (
         <UserModal 
            mode={userModal.mode}
            user={userModal.data}
            branches={branches}
            onClose={() => setUserModal({ ...userModal, isOpen: false })}
            onSave={handleSaveUser}
            currentUserRole={user.role}
         />
      )}
    </div>
  );
};

// Sub-component: Branch Modal
const BranchModal = ({ mode, branch, onClose, onSave }: { mode: 'CREATE' | 'EDIT', branch?: Branch, onClose: () => void, onSave: (b: Branch) => Promise<void> | void }) => {
   const [form, setForm] = useState<Partial<Branch>>(branch || { name: '', code: '' });

   const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      onSave({ ...branch, ...form } as Branch);
   };

   return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
         <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-4">
               <h3 className="font-bold text-lg">{mode === 'CREATE' ? '新增分店' : '編輯分店'}</h3>
               <button onClick={onClose}><X size={20} className="text-slate-400" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
               <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">分店名稱 (Name)</label>
                  <input required className="w-full border rounded p-2" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
               </div>
               <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">分店代號 (Code)</label>
                  <input required className="w-full border rounded p-2" value={form.code} onChange={e => setForm({...form, code: e.target.value})} />
               </div>
               <button className="w-full bg-brand-600 text-white font-bold py-2 rounded-lg mt-2">儲存</button>
            </form>
         </div>
      </div>
   );
};

// Sub-component: User Modal
const UserModal = ({ mode, user, branches, onClose, onSave, currentUserRole }: { mode: 'CREATE' | 'EDIT', user?: User, branches: Branch[], onClose: () => void, onSave: (u: User & { password?: string }) => Promise<void> | void, currentUserRole: Role }) => {
   const [form, setForm] = useState<Partial<User>>(user || { name: '', username: '', role: Role.CLERK, branchId: branches[0]?.id });
   const [password, setPassword] = useState('');
   const [showPassword, setShowPassword] = useState(false);

   const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      // Include password if it's set
      const userToSave = { ...user, ...form } as User;
      if (password) {
         (userToSave as any).password = password;
      }
      onSave(userToSave);
   };

   const currentPermissions = form.role ? ROLE_DEFINITIONS[form.role] : [];
   const allowedRoles = currentUserRole === Role.ADMIN
     ? Object.keys(ROLE_DEFINITIONS)
     : Object.keys(ROLE_DEFINITIONS).filter(r => r !== Role.ADMIN);

   return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
         <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-4">
               <h3 className="font-bold text-lg">{mode === 'CREATE' ? '新增員工 (Add User)' : '編輯員工 (Edit User)'}</h3>
               <button onClick={onClose}><X size={20} className="text-slate-400" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto flex-1 px-1">
               <div className="grid grid-cols-2 gap-4">
                  <div>
                     <label className="block text-xs font-bold text-slate-500 mb-1">姓名 (Name)</label>
                     <input required className="w-full border rounded p-2 text-sm" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
                  </div>
                   <div>
                     <label className="block text-xs font-bold text-slate-500 mb-1">所屬分店 (Branch)</label>
                     <select className="w-full border rounded p-2 bg-white text-sm" value={form.branchId} onChange={e => setForm({...form, branchId: e.target.value})}>
                        {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                     </select>
                  </div>
               </div>

               <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                  <label className="block text-xs font-bold text-slate-500 mb-2 flex items-center gap-1">
                     <Lock size={12} /> 登入資訊 (Login Credentials)
                  </label>
                  <div className="space-y-3">
                     <div>
                        <label className="block text-[10px] font-bold text-slate-400 mb-1">用戶名 (Username)</label>
                        <input required className="w-full border rounded p-2 text-sm bg-white" value={form.username} onChange={e => setForm({...form, username: e.target.value})} />
                     </div>
                     <div>
                        <label className="block text-[10px] font-bold text-slate-400 mb-1">
                           密碼 (Password) 
                           {mode === 'EDIT' && <span className="font-normal text-slate-400 ml-1">- 留空則不修改 (Leave blank to keep)</span>}
                        </label>
                        <div className="relative">
                            <input 
                                type={showPassword ? "text" : "password"} 
                                className="w-full border rounded p-2 text-sm bg-white pr-10" 
                                value={password} 
                                onChange={e => setPassword(e.target.value)} 
                                required={mode === 'CREATE'} // Required for new users
                            />
                            <button 
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400"
                            >
                                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                     </div>
                  </div>
               </div>

               <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">角色 (Role)</label>
                  <div className="grid grid-cols-1 gap-2">
                     {allowedRoles.map(r => (
                        <label key={r} className={`flex items-center p-2 rounded border cursor-pointer transition-colors ${form.role === r ? 'bg-brand-50 border-brand-200 ring-1 ring-brand-200' : 'border-slate-200 hover:bg-slate-50'}`}>
                           <input 
                              type="radio" 
                              name="role" 
                              value={r} 
                              checked={form.role === r} 
                              onChange={() => setForm({...form, role: r as Role})}
                              className="mr-2"
                           />
                           <span className="text-sm font-medium text-slate-700">{r}</span>
                        </label>
                     ))}
                  </div>
               </div>
               
               {currentPermissions.length > 0 && (
                   <div className="bg-slate-50 p-3 rounded-lg text-xs text-slate-600">
                      <p className="font-bold mb-1">權限包含:</p>
                      <ul className="list-disc list-inside space-y-0.5">
                         {currentPermissions.map((p, i) => <li key={i}>{p}</li>)}
                      </ul>
                   </div>
               )}

               <button className="w-full bg-brand-600 text-white font-bold py-2 rounded-lg mt-2">儲存</button>
            </form>
         </div>
      </div>
   );
};

export default SettingsPage;
