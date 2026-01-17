import React, { useState, useEffect, useMemo } from 'react';
import { Expense, Branch, User } from '../types';
import { Trash2, X, Filter, Save } from 'lucide-react';
import { API_BASE_URL } from '../App';

interface ExpenseManagerProps {
  onClose: () => void;
  user: User;
  branches: Branch[];
  authToken?: string | null;
}

const ExpenseManager: React.FC<ExpenseManagerProps> = ({ onClose, user, branches, authToken }) => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'LIST' | 'ADD'>('LIST');

  // Filter States
  const [filterBranch, setFilterBranch] = useState(user.role === 'ADMIN' ? 'ALL' : user.branchId);
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setDate(1); // 1st of month
    return d.toISOString().split('T')[0];
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0]);

  // Form State
  const [formData, setFormData] = useState({
    branchId: user.branchId,
    category: 'Rent',
    amount: '',
    description: '',
    expenseDate: new Date().toISOString().split('T')[0]
  });

  const CATEGORIES = ['Rent', 'Utilities', 'Salaries', 'Maintenance', 'Supplies', 'Marketing', 'Other'];

  const fetchExpenses = async () => {
    setIsLoading(true);
    try {
      const url = `${API_BASE_URL}/get_expenses.php?branch_id=${filterBranch}&start_date=${dateFrom}&end_date=${dateTo}`;
      const res = await fetch(url, {
        headers: authToken ? { 'X-Auth-Token': authToken } : undefined,
      });
      const json = await res.json();
      if (Array.isArray(json)) {
        setExpenses(json);
      }
    } catch (e) {
      console.error("Failed to fetch expenses", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, [filterBranch, dateFrom, dateTo]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      alert("Please enter a valid amount");
      return;
    }

    try {
      const payload: Expense = {
        id: `EXP-${Date.now()}`,
        branchId: formData.branchId,
        category: formData.category,
        amount: parseFloat(formData.amount),
        description: formData.description,
        expenseDate: formData.expenseDate,
        createdAt: new Date().toISOString(),
        createdBy: user.name
      };

      const res = await fetch(`${API_BASE_URL}/save_expense.php`, {
        method: 'POST',
        headers: authToken ? { 'Content-Type': 'application/json', 'X-Auth-Token': authToken } : { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const result = await res.json();
      if (result.success) {
        alert("Expense saved!");
        setActiveTab('LIST');
        setFormData({ ...formData, amount: '', description: '' });
        fetchExpenses();
      } else {
        alert("Error: " + result.error);
      }
    } catch (err) {
      alert("Failed to save expense");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this expense?")) return;
    try {
      const res = await fetch(`${API_BASE_URL}/delete_expense.php`, {
        method: 'POST',
        headers: authToken ? { 'Content-Type': 'application/json', 'X-Auth-Token': authToken } : { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      const result = await res.json();
      if (result.success) {
        fetchExpenses();
      } else {
        alert("Error: " + result.error);
      }
    } catch (err) {
      alert("Failed to delete");
    }
  };

  const totalAmount = useMemo(() => expenses.reduce((sum, e) => sum + e.amount, 0), [expenses]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-2xl">
          <div>
             <h2 className="text-xl font-bold text-slate-800">支出管理 (Expense Management)</h2>
             <p className="text-xs text-slate-500 mt-1">Manage operating expenses for accurate P&L</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-500">
            <X size={24} />
          </button>
        </div>

        <div className="flex border-b border-slate-200">
           <button 
             onClick={() => setActiveTab('LIST')}
             className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors ${activeTab === 'LIST' ? 'border-slate-800 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
           >
             支出列表 (Expense List)
           </button>
           <button 
             onClick={() => setActiveTab('ADD')}
             className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors ${activeTab === 'ADD' ? 'border-brand-600 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
           >
             新增支出 (Add Expense)
           </button>
        </div>

        <div className="flex-1 overflow-hidden p-6 bg-slate-50">
           {activeTab === 'LIST' && (
             <div className="h-full flex flex-col">
                <div className="flex flex-wrap gap-3 mb-4 items-center bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                   <Filter size={18} className="text-slate-400" />
                   {user.role === 'ADMIN' && (
                     <select 
                       value={filterBranch}
                       onChange={e => setFilterBranch(e.target.value)}
                       className="border border-slate-300 rounded px-2 py-1 text-sm"
                     >
                        <option value="ALL">All Branches</option>
                        {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                     </select>
                   )}
                   <input 
                     type="date" 
                     value={dateFrom}
                     onChange={e => setDateFrom(e.target.value)}
                     className="border border-slate-300 rounded px-2 py-1 text-sm"
                   />
                   <span className="text-slate-400">-</span>
                   <input 
                     type="date" 
                     value={dateTo}
                     onChange={e => setDateTo(e.target.value)}
                     className="border border-slate-300 rounded px-2 py-1 text-sm"
                   />
                   <div className="ml-auto font-bold text-slate-700">
                      Total: <span className="text-red-600">${totalAmount.toLocaleString()}</span>
                   </div>
                </div>

                <div className="flex-1 overflow-auto bg-white rounded-xl border border-slate-200 shadow-sm">
                   <table className="w-full text-sm text-left">
                      <thead className="bg-slate-50 text-slate-500 font-semibold sticky top-0">
                         <tr>
                            <th className="p-4">Date</th>
                            <th className="p-4">Branch</th>
                            <th className="p-4">Category</th>
                            <th className="p-4">Description</th>
                            <th className="p-4 text-right">Amount</th>
                            <th className="p-4 text-center">Action</th>
                         </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                         {expenses.map(exp => (
                            <tr key={exp.id} className="hover:bg-slate-50">
                               <td className="p-4 whitespace-nowrap">{exp.expenseDate}</td>
                               <td className="p-4 text-slate-600">{branches.find(b => b.id === exp.branchId)?.name || exp.branchId}</td>
                               <td className="p-4">
                                  <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs font-bold">{exp.category}</span>
                               </td>
                               <td className="p-4 text-slate-600 max-w-xs truncate">{exp.description}</td>
                               <td className="p-4 text-right font-bold text-red-600">-${exp.amount.toLocaleString()}</td>
                               <td className="p-4 text-center">
                                  <button onClick={() => handleDelete(exp.id)} className="text-slate-300 hover:text-red-500">
                                     <Trash2 size={16} />
                                  </button>
                               </td>
                            </tr>
                         ))}
                         {expenses.length === 0 && (
                            <tr><td colSpan={6} className="p-8 text-center text-slate-400">No records found</td></tr>
                         )}
                      </tbody>
                   </table>
                </div>
             </div>
           )}

           {activeTab === 'ADD' && (
             <div className="max-w-xl mx-auto bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
                <form onSubmit={handleSubmit} className="space-y-4">
                   <div className="grid grid-cols-2 gap-4">
                      <div>
                         <label className="block text-xs font-bold text-slate-500 mb-1">Branch</label>
                         <select 
                           value={formData.branchId}
                           onChange={e => setFormData({...formData, branchId: e.target.value})}
                           className="w-full border border-slate-300 rounded-lg p-2.5 bg-slate-50 focus:bg-white transition-colors"
                           disabled={user.role !== 'ADMIN'}
                         >
                            {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                         </select>
                      </div>
                      <div>
                         <label className="block text-xs font-bold text-slate-500 mb-1">Date</label>
                         <input 
                           type="date"
                           value={formData.expenseDate}
                           onChange={e => setFormData({...formData, expenseDate: e.target.value})}
                           className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-brand-500 outline-none"
                           required
                         />
                      </div>
                   </div>

                   <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">Category</label>
                      <select 
                         value={formData.category}
                         onChange={e => setFormData({...formData, category: e.target.value})}
                         className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-brand-500 outline-none"
                      >
                         {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                   </div>

                   <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">Amount ($)</label>
                      <input 
                         type="number"
                         step="0.01"
                         min="0"
                         value={formData.amount}
                         onChange={e => setFormData({...formData, amount: e.target.value})}
                         className="w-full border border-slate-300 rounded-lg p-2.5 font-mono font-bold text-lg focus:ring-2 focus:ring-brand-500 outline-none"
                         placeholder="0.00"
                         required
                      />
                   </div>

                   <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">Description (Optional)</label>
                      <textarea 
                         value={formData.description}
                         onChange={e => setFormData({...formData, description: e.target.value})}
                         className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-brand-500 outline-none min-h-[100px]"
                         placeholder="Enter details..."
                      />
                   </div>

                   <div className="pt-4 flex justify-end gap-3">
                      <button 
                        type="button"
                        onClick={() => setActiveTab('LIST')}
                        className="px-6 py-3 rounded-xl text-slate-600 hover:bg-slate-100 font-bold"
                      >
                        Cancel
                      </button>
                      <button 
                        type="submit"
                        className="px-8 py-3 bg-brand-600 text-white rounded-xl hover:bg-brand-700 font-bold flex items-center gap-2 shadow-lg shadow-brand-600/20"
                      >
                        <Save size={18} /> Save Expense
                      </button>
                   </div>
                </form>
             </div>
           )}
        </div>
      </div>
    </div>
  );
};

export default ExpenseManager;
