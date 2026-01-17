
import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  ShoppingCart, 
  Package, 
  Users, 
  FileText, 
  LayoutDashboard, 
  Settings, 
  LogOut,
  ArrowLeftRight,
  Store,
  Truck,
  FileOutput,
  Calculator,
  Wrench,
  Wifi,
  WifiOff
} from 'lucide-react';
import { User, Branch, Role } from '../types';

type NavItem = {
  to: string;
  label: string;
  icon: React.ComponentType<{ size?: number }>;
  roles?: Role[];
};

interface SidebarProps {
  user: User;
  branches: Branch[];
  onLogout: () => void;
  onSwitchBranch: (branchId: string) => void;
  isOnline?: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ user, branches = [], onLogout, onSwitchBranch, isOnline = false }) => {
  const linkClass = ({ isActive }: { isActive: boolean }) => 
    `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-slate-800 ${
      isActive 
        ? 'bg-brand-600 text-white shadow-lg shadow-brand-500/30' 
        : 'text-slate-400 hover:bg-slate-800 hover:text-white'
    }`;

  const navItems: NavItem[] = [
    { to: '/', label: '銷售終端 (POS)', icon: ShoppingCart },
    { to: '/orders', label: '訂單記錄', icon: FileText },
    { to: '/products', label: '商品庫存', icon: Package, roles: [Role.ADMIN, Role.MANAGER, Role.ACCOUNTANT, Role.CLERK] },
    { to: '/daily-close', label: '日結 (Daily Close)', icon: Calculator, roles: [Role.CASHIER] },
    { to: '/accounting', label: '會計結算 (Close)', icon: Calculator, roles: [Role.ADMIN, Role.MANAGER, Role.ACCOUNTANT] },
    { to: '/purchasing', label: '採購管理 (PO)', icon: Truck, roles: [Role.ADMIN, Role.MANAGER, Role.ACCOUNTANT, Role.CASHIER] },
    { to: '/quotations', label: '報價單 (Quote)', icon: FileOutput, roles: [Role.ADMIN, Role.MANAGER, Role.CASHIER, Role.CLERK] },
    { to: '/repairs', label: '維修管理 (RMA)', icon: Wrench, roles: [Role.ADMIN, Role.MANAGER, Role.CLERK] },
    { to: '/customers', label: '客戶管理 (CRM)', icon: Users },
    { to: '/transfers', label: '調貨管理', icon: ArrowLeftRight, roles: [Role.ADMIN, Role.MANAGER, Role.CLERK] },
    { to: '/dashboard', label: '業績報表', icon: LayoutDashboard, roles: [Role.ADMIN, Role.MANAGER, Role.ACCOUNTANT] }
  ];

  return (
    <div className="h-screen w-20 lg:w-64 bg-slate-900 text-white flex flex-col justify-between p-4 sticky top-0 left-0 border-r border-slate-800">
      <div>
        <div className="flex items-center gap-3 px-2 mb-4 mt-2">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-brand-500 to-indigo-600 flex items-center justify-center font-bold text-xl shadow-lg shrink-0">
            HK
          </div>
          <div className="hidden lg:block">
            <h1 className="font-bold text-lg leading-tight">HK Tech</h1>
            <p className="text-xs text-slate-500">POS System v2.1</p>
          </div>
        </div>

        {/* Branch Switcher */}
        <div className="hidden lg:block mb-6 px-2">
           <label className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-2 flex items-center gap-2">
             <Store size={12} /> 當前分店 (Branch)
           </label>
           <select 
             value={user.branchId}
             onChange={(e) => onSwitchBranch(e.target.value)}
             className="w-full bg-slate-800 border border-slate-700 text-white text-sm rounded-lg p-2.5 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 focus:outline-none"
           >
             {branches.map(branch => (
               <option key={branch.id} value={branch.id}>
                 {branch.name}
               </option>
             ))}
           </select>
        </div>

        <nav className="space-y-1">
          {navItems
            .filter(item => !item.roles || item.roles.includes(user.role))
            .map(item => {
              const Icon = item.icon;
              return (
                <NavLink key={item.to} to={item.to} className={linkClass}>
                  <Icon size={20} />
                  <span className="hidden lg:block font-medium">{item.label}</span>
                </NavLink>
              );
            })}
        </nav>
      </div>

      <div className="border-t border-slate-800 pt-4">
        {/* System Status Indicator */}
        <div className={`hidden lg:flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold mb-2 transition-colors ${isOnline ? 'bg-emerald-500/10 text-emerald-400' : 'bg-orange-500/10 text-orange-400'}`}>
            {isOnline ? <Wifi size={14} /> : <WifiOff size={14} />}
            {isOnline ? 'Database Connected' : 'Offline Mode (Demo)'}
        </div>

        {(user.role === Role.ADMIN || user.role === Role.MANAGER) && (
          <NavLink to="/settings" className={linkClass}>
            <Settings size={20} />
            <span className="hidden lg:block font-medium">系統設定</span>
          </NavLink>
        )}
        <div className="mt-4 px-4 py-3 bg-slate-800/50 rounded-xl hidden lg:flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold shrink-0">
            {user.name.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user.name}</p>
            <p className="text-xs text-slate-500 truncate">{user.role}</p>
          </div>
          <button 
            onClick={onLogout}
            className="text-slate-400 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-slate-500 rounded p-1"
            title="登出 (Logout)"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
