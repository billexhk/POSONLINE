import React, { useMemo, useState, useEffect } from 'react';
import { PaymentMethod, Order, Expense, DailySettlement, Role, Product, PurchaseOrder } from '../types';
import { useOutletContext, useNavigate, useLocation } from 'react-router-dom';
import { DollarSign, CreditCard, Smartphone, Banknote } from 'lucide-react';
import { API_BASE_URL } from '../App';
import ExpenseManager from './ExpenseManager';

type PnlPreset = 'DAY' | 'WEEK' | 'MONTH' | 'YEAR';

interface CogsSummary {
  branch_id: string;
  total_cogs: string; // API returns string decimal
  total_qty: string;
}

interface BankTransaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  matchedOrderIds: string[];
  status: 'MATCHED' | 'UNMATCHED';
}

interface PosPaymentForRecon {
  id: string;
  orderId: string;
  date: string;
  amount: number;
  method: PaymentMethod;
}

interface BankReconciliationSummary {
  totalBank: number;
  totalPos: number;
  matchedBankTotal: number;
  unmatchedBankTotal: number;
  unmatchedPosTotal: number;
  matchedCount: number;
  unmatchedBankCount: number;
  unmatchedPosCount: number;
}

interface BankReconciliationResult {
  bank: BankTransaction[];
  summary: BankReconciliationSummary;
}

interface BalanceSheetSnapshot {
  cash: number;
  inventory: number;
  receivable: number;
  payable: number;
}

const AccountingPage: React.FC = () => {
  const { user, orders, branches, products, purchaseOrders, authToken } = useOutletContext<any>();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reportSubmitted, setReportSubmitted] = useState(false);
  const [filterMode, setFilterMode] = useState<'MONTH' | 'RANGE'>('RANGE');
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [dateTo, setDateTo] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  
  const [pnlPreset, setPnlPreset] = useState<PnlPreset>('DAY');
  const [balanceDate, setBalanceDate] = useState(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  });
  
  // New State for Backend COGS & Expenses
  const [cogsData, setCogsData] = useState<CogsSummary[]>([]);
  const [expensesData, setExpensesData] = useState<Expense[]>([]);
  const [isLoadingCogs, setIsLoadingCogs] = useState(false);
  const [showExpenseManager, setShowExpenseManager] = useState(false);

  const [currentSettlement, setCurrentSettlement] = useState<DailySettlement | null>(null);
  const [isCheckingSettlement, setIsCheckingSettlement] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const today = new Date().toLocaleDateString();
  const canUnlock = user.role === Role.MANAGER || user.role === Role.ADMIN;
  const isCashierDailyClose = location.pathname.endsWith('/daily-close') && user.role === Role.CASHIER;

  const [bankTransactions, setBankTransactions] = useState<BankTransaction[]>([]);
  const [reconError, setReconError] = useState<string | null>(null);
  const [isReconciling, setIsReconciling] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);

  const branchOrders = useMemo(
    () => (orders as Order[]).filter(o => o.branchId === user.branchId),
    [orders, user.branchId]
  );

  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    branchOrders.forEach(o => {
      const d = new Date(o.createdAt);
      if (!isNaN(d.getTime())) {
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        set.add(key);
      }
    });
    return Array.from(set).sort().reverse();
  }, [branchOrders]);

  const defaultMonth = availableMonths[0] || (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  })();

  const [selectedMonth, setSelectedMonth] = useState(defaultMonth);

  // Calculate Date Range for API
  const dateRange = useMemo(() => {
    let startStr = '';
    let endStr = '';

    if (filterMode === 'MONTH') {
      const [year, month] = selectedMonth.split('-');
      const start = new Date(parseInt(year), parseInt(month) - 1, 1);
      const end = new Date(parseInt(year), parseInt(month), 0); // Last day of month
      
      // Format as YYYY-MM-DD
      const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      startStr = fmt(start);
      endStr = fmt(end);
    } else {
      startStr = dateFrom;
      endStr = dateTo;
    }
    return { startStr, endStr };
  }, [filterMode, selectedMonth, dateFrom, dateTo]);

  useEffect(() => {
    setBankTransactions([]);
    setReconError(null);
    setUploadedFileName(null);
  }, [dateRange]);

  const formatDateYmd = (value: Date) => {
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, '0');
    const d = String(value.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const handlePresetChange = (preset: PnlPreset) => {
    setPnlPreset(preset);
    const now = new Date();
    if (preset === 'DAY') {
      const d = formatDateYmd(now);
      setFilterMode('RANGE');
      setDateFrom(d);
      setDateTo(d);
    } else if (preset === 'WEEK') {
      const day = now.getDay();
      const diffToMonday = (day + 6) % 7;
      const monday = new Date(now);
      monday.setDate(now.getDate() - diffToMonday);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      setFilterMode('RANGE');
      setDateFrom(formatDateYmd(monday));
      setDateTo(formatDateYmd(sunday));
    } else if (preset === 'MONTH') {
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const key = `${year}-${month}`;
      setSelectedMonth(key);
      setFilterMode('MONTH');
    } else {
      const year = now.getFullYear();
      const from = `${year}-01-01`;
      const to = `${year}-12-31`;
      setFilterMode('RANGE');
      setDateFrom(from);
      setDateTo(to);
    }
  };

  const toDateOnly = (value: string) => {
    if (!value) return '';
    const d = new Date(value);
    if (isNaN(d.getTime())) return '';
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const parseBankCsv = (text: string): BankTransaction[] => {
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l);
    if (lines.length < 2) {
      throw new Error('檔案內容為空或格式不正確');
    }
    const splitCsvLine = (line: string) => {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i += 1) {
        const ch = line[i];
        if (ch === '"') {
          if (inQuotes && line[i + 1] === '"') {
            current += '"';
            i += 1;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (ch === ',' && !inQuotes) {
          result.push(current);
          current = '';
        } else {
          current += ch;
        }
      }
      result.push(current);
      return result.map(v => v.trim());
    };
    const headerCols = splitCsvLine(lines[0]).map(h => h.toLowerCase());
    const findIndex = (keywords: string[]) => {
      return headerCols.findIndex(h => keywords.some(k => h.includes(k)));
    };
    const dateIdx = findIndex(['date', '日期']);
    const descIdx = findIndex(['description', '摘要', '說明', '備註', '交易描述', 'transaction', 'details']);
    const amountIdx = findIndex(['amount', '金額']);
    if (dateIdx === -1 || amountIdx === -1) {
      throw new Error('找不到日期或金額欄位，請確認 CSV 標題列');
    }
    const items: BankTransaction[] = [];
    for (let i = 1; i < lines.length; i += 1) {
      const line = lines[i];
      if (!line) continue;
      const cols = splitCsvLine(line);
      if (cols.length <= Math.max(dateIdx, amountIdx)) continue;
      const rawDate = cols[dateIdx] || '';
      const rawAmount = cols[amountIdx] || '';
      const rawDesc = descIdx >= 0 && cols[descIdx] ? cols[descIdx] : '';
      const normalizedAmount = rawAmount.replace(/[^0-9\.\-]/g, '');
      if (!normalizedAmount) continue;
      const amount = parseFloat(normalizedAmount);
      if (!Number.isFinite(amount)) continue;
      const d = rawDate || '';
      const parsedDate = d ? toDateOnly(d.replace(/\./g, '-').replace(/\//g, '-')) : '';
      if (!parsedDate) continue;
      items.push({
        id: `BANK-${i}`,
        date: parsedDate,
        description: rawDesc,
        amount,
        matchedOrderIds: [],
        status: 'UNMATCHED'
      });
    }
    if (!items.length) {
      throw new Error('未能從檔案中解析任何交易紀錄');
    }
    return items;
  };

  const handleBankFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setIsReconciling(true);
    setReconError(null);
    setUploadedFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = String(reader.result || '');
        const parsed = parseBankCsv(text);
        setBankTransactions(parsed);
      } catch (err: any) {
        const message = err && err.message ? err.message : '匯入銀行對帳單失敗';
        setReconError(message);
        setBankTransactions([]);
        setUploadedFileName(null);
      } finally {
        setIsReconciling(false);
      }
    };
    reader.onerror = () => {
      setReconError('讀取檔案失敗');
      setIsReconciling(false);
      setUploadedFileName(null);
    };
    reader.readAsText(file, 'utf-8');
  };

  // Fetch COGS & Expenses from Backend
  const fetchData = async () => {
    const { startStr, endStr } = dateRange;
    if (!startStr || !endStr) return;

    setIsLoadingCogs(true);
    try {
      const cogsUrl = `${API_BASE_URL}/get_cogs_summary.php?start_date=${startStr}&end_date=${endStr}`;
      const cogsRes = await fetch(cogsUrl, {
        headers: authToken ? { 'X-Auth-Token': authToken } : undefined,
      });
      const cogsJson = await cogsRes.json();
      if (Array.isArray(cogsJson)) {
        setCogsData(cogsJson);
      } else {
        setCogsData([]);
      }

      const expUrl = `${API_BASE_URL}/get_expenses.php?branch_id=ALL&start_date=${startStr}&end_date=${endStr}`;
      const expRes = await fetch(expUrl, {
        headers: authToken ? { 'X-Auth-Token': authToken } : undefined,
      });
      const expJson = await expRes.json();
      if (Array.isArray(expJson)) {
        setExpensesData(expJson);
      } else {
        setExpensesData([]);
      }

    } catch (e) {
      console.error("Failed to fetch accounting data", e);
    } finally {
      setIsLoadingCogs(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dateRange]);

  useEffect(() => {
    const loadSettlement = async () => {
      const { startStr, endStr } = dateRange;
      if (!startStr || !endStr) {
        setCurrentSettlement(null);
        setReportSubmitted(false);
        return;
      }
      setIsCheckingSettlement(true);
      setSubmitError(null);
      try {
        const url = `${API_BASE_URL}/get_daily_settlement.php?branch_id=${encodeURIComponent(
          user.branchId
        )}&start_date=${startStr}&end_date=${endStr}`;
        const res = await fetch(url, {
          headers: authToken ? { 'X-Auth-Token': authToken } : undefined,
        });
        if (!res.ok) {
          throw new Error('無法載入日結紀錄');
        }
        const json = await res.json();
        if (json && json.success && json.settlement) {
          const s = json.settlement;
          const mapped: DailySettlement = {
            id: s.id,
            branchId: s.branch_id,
            startDate: s.start_date,
            endDate: s.end_date,
            totalRevenue: s.total_revenue,
            totalOrders: s.total_orders,
            cashInDrawer: s.cash_in_drawer,
            totalCogs: s.total_cogs,
            totalExpenses: s.total_expenses,
            grossProfit: s.gross_profit,
            netProfit: s.net_profit,
            createdAt: s.created_at,
            createdBy: s.created_by,
            status: s.status,
          };
          setCurrentSettlement(mapped);
          setReportSubmitted(true);
        } else {
          setCurrentSettlement(null);
          setReportSubmitted(false);
        }
      } catch (e: any) {
        setCurrentSettlement(null);
        setReportSubmitted(false);
        setSubmitError(e.message || '載入日結紀錄失敗');
      } finally {
        setIsCheckingSettlement(false);
      }
    };
    loadSettlement();
  }, [dateRange, user.branchId]);

  const periodOrders = useMemo(() => {
    return branchOrders.filter((o: Order) => {
      const { startStr, endStr } = dateRange;
      if (!startStr || !endStr) return true;
      const key = o.businessDate || toDateOnly(o.createdAt);
      if (!key) return false;
      return key >= startStr && key <= endStr;
    });
  }, [branchOrders, dateRange]);

  const periodOrdersAllBranches = useMemo(() => {
    return (orders as Order[]).filter(o => {
      const { startStr, endStr } = dateRange;
      if (!startStr || !endStr) return true;
      const key = o.businessDate || toDateOnly(o.createdAt);
      if (!key) return false;
      return key >= startStr && key <= endStr;
    });
  }, [orders, dateRange]);

  const stats = useMemo(() => {
    const data = {
      totalRevenue: 0,
      totalCount: periodOrders.length,
      methods: {} as Record<string, number>,
      cashInDrawer: 0,
      cogs: 0,
      grossProfit: 0,
      grossMargin: 0,
      totalExpenses: 0,
      netProfit: 0,
      totalTax: 0,
      taxableSales: 0
    };

    periodOrders.forEach((order: Order) => {
      const orderTotal = typeof order.total === 'number' && !isNaN(order.total) ? order.total : 0;
      data.totalRevenue += orderTotal;

      const taxAmount = typeof order.taxAmount === 'number' && !isNaN(order.taxAmount) ? order.taxAmount : 0;
      const subtotal = typeof order.subtotal === 'number' && !isNaN(order.subtotal) ? order.subtotal : 0;
      const totalDiscount = typeof order.totalDiscount === 'number' && !isNaN(order.totalDiscount) ? order.totalDiscount : 0;
      const taxableBase = subtotal - totalDiscount;
      if (taxAmount !== 0) {
        data.totalTax += taxAmount;
        data.taxableSales += taxableBase;
      }

      order.payments.forEach(payment => {
        const methodKey = payment.method;
        data.methods[methodKey] = (data.methods[methodKey] || 0) + payment.amount;

        if (payment.method.includes('Cash')) {
          data.cashInDrawer += payment.amount;
        }
      });
    });

    const branchCogs = cogsData.find(c => c.branch_id === user.branchId);
    if (branchCogs) {
      data.cogs = parseFloat(branchCogs.total_cogs) || 0;
    } else {
      data.cogs = 0;
    }

    const branchExpenses = expensesData.filter(e => e.branchId === user.branchId);
    data.totalExpenses = branchExpenses.reduce((sum, e) => sum + e.amount, 0);

    data.grossProfit = data.totalRevenue - data.cogs;
    data.netProfit = data.grossProfit - data.totalExpenses;

    if (data.totalRevenue > 0) {
      data.grossMargin = (data.grossProfit / data.totalRevenue) * 100;
    }

    return data;
  }, [periodOrders, cogsData, expensesData, user.branchId]);

  const branchSummaries = useMemo(() => {
    const map = new Map<
      string,
      {
        branchId: string;
        name: string;
        totalRevenue: number;
        cogs: number;
        grossProfit: number;
        grossMargin: number;
        expenses: number;
        netProfit: number;
      }
    >();

    const branchNameMap = new Map<string, string>();
    (branches as any[]).forEach(b => {
      branchNameMap.set(b.id, b.name);
    });

    // 1. Calculate Revenue from Orders
    periodOrdersAllBranches.forEach((order: Order) => {
      let entry = map.get(order.branchId);
      if (!entry) {
        entry = {
          branchId: order.branchId,
          name: branchNameMap.get(order.branchId) || order.branchId,
          totalRevenue: 0,
          cogs: 0,
          grossProfit: 0,
          grossMargin: 0,
          expenses: 0,
          netProfit: 0
        };
        map.set(order.branchId, entry);
      }
      const orderTotal = typeof order.total === 'number' && !isNaN(order.total) ? order.total : 0;
      entry.totalRevenue += orderTotal;
    });

    // 2. Inject COGS from API
    cogsData.forEach(c => {
      let entry = map.get(c.branch_id);
      if (!entry) {
        entry = {
          branchId: c.branch_id,
          name: branchNameMap.get(c.branch_id) || c.branch_id,
          totalRevenue: 0,
          cogs: 0,
          grossProfit: 0,
          grossMargin: 0,
          expenses: 0,
          netProfit: 0
        };
        map.set(c.branch_id, entry);
      }
      entry.cogs = parseFloat(c.total_cogs) || 0;
    });

    // 3. Inject Expenses from API
    expensesData.forEach(e => {
        let entry = map.get(e.branchId);
        if (!entry) {
            entry = {
                branchId: e.branchId,
                name: branchNameMap.get(e.branchId) || e.branchId,
                totalRevenue: 0,
                cogs: 0,
                grossProfit: 0,
                grossMargin: 0,
                expenses: 0,
                netProfit: 0
            };
            map.set(e.branchId, entry);
        }
        entry.expenses += e.amount;
    });

    // 4. Calculate Profit & Margin
    map.forEach(entry => {
      entry.grossProfit = entry.totalRevenue - entry.cogs;
      entry.netProfit = entry.grossProfit - entry.expenses;

      if (entry.totalRevenue > 0) {
        entry.grossMargin = (entry.grossProfit / entry.totalRevenue) * 100;
      }
    });

    return Array.from(map.values()).sort((a, b) => b.totalRevenue - a.totalRevenue);
  }, [periodOrdersAllBranches, branches, cogsData, expensesData]);

  const balanceSheet = useMemo<BalanceSheetSnapshot>(() => {
    const snapshot: BalanceSheetSnapshot = {
      cash: 0,
      inventory: 0,
      receivable: 0,
      payable: 0
    };

    const cutoff = balanceDate ? new Date(`${balanceDate}T23:59:59`) : null;

    const balanceOrders = (orders as Order[]).filter(order => {
      if (order.branchId !== user.branchId) return false;
      if (!cutoff) return true;
      const d = new Date(order.createdAt);
      if (isNaN(d.getTime())) return false;
      return d <= cutoff;
    });

    balanceOrders.forEach(order => {
      order.payments.forEach(payment => {
        if (payment.method.includes('Cash')) {
          snapshot.cash += payment.amount;
        }
      });
      const paid = order.payments.reduce((sum, p) => sum + p.amount, 0);
      const outstanding = order.total - paid;
      if (outstanding > 0 && (order.status === 'PENDING' || order.status === 'PARTIAL')) {
        snapshot.receivable += outstanding;
      }
    });

    const productList = (products || []) as Product[];
    productList.forEach(product => {
      if (!product.trackStock) return;
      const qty = product.stock[user.branchId] || 0;
      if (qty <= 0) return;
      const cost = typeof product.cost === 'number' && !isNaN(product.cost) ? product.cost : 0;
      snapshot.inventory += qty * cost;
    });

    const poList = (purchaseOrders || []) as PurchaseOrder[];
    poList.forEach(po => {
      if (po.branchId !== user.branchId) return;
      if (cutoff) {
        const d = new Date(po.createdAt);
        if (isNaN(d.getTime()) || d > cutoff) {
          return;
        }
      }
      if (po.status === 'SENT') {
        snapshot.payable += po.totalAmount;
      }
    });

    return snapshot;
  }, [orders, products, purchaseOrders, user.branchId, balanceDate]);

  const posPaymentsForRecon = useMemo<PosPaymentForRecon[]>(() => {
    const list: PosPaymentForRecon[] = [];
    periodOrders.forEach(order => {
      const dateOnly = toDateOnly(order.createdAt);
      order.payments.forEach((payment, index) => {
        if (payment.method === PaymentMethod.CASH) return;
        list.push({
          id: `${order.id}-${index}`,
          orderId: order.id,
          date: dateOnly,
          amount: payment.amount,
          method: payment.method
        });
      });
    });
    return list;
  }, [periodOrders]);

  const reconciliation = useMemo<BankReconciliationResult | null>(() => {
    if (!bankTransactions.length) return null;
    const usedPaymentIds = new Set<string>();
    const bankTotal = bankTransactions.reduce((sum, t) => sum + t.amount, 0);
    const posTotal = posPaymentsForRecon.reduce((sum, p) => sum + p.amount, 0);
    let matchedBankTotal = 0;
    let unmatchedBankTotal = 0;
    const reconciledBank: BankTransaction[] = bankTransactions.map(tx => {
      let matchedOrderIds: string[] = [];
      let status: 'MATCHED' | 'UNMATCHED' = 'UNMATCHED';
      const exactDateMatch = posPaymentsForRecon.find(p => {
        if (usedPaymentIds.has(p.id)) return false;
        if (p.date !== tx.date) return false;
        return Math.abs(p.amount - tx.amount) < 0.01;
      });
      let chosen = exactDateMatch;
      if (!chosen) {
        chosen = posPaymentsForRecon.find(p => {
          if (usedPaymentIds.has(p.id)) return false;
          return Math.abs(p.amount - tx.amount) < 0.01;
        });
      }
      if (chosen) {
        usedPaymentIds.add(chosen.id);
        matchedOrderIds = [chosen.orderId];
        status = 'MATCHED';
        matchedBankTotal += tx.amount;
      } else {
        unmatchedBankTotal += tx.amount;
      }
      return {
        ...tx,
        matchedOrderIds,
        status
      };
    });
    let unmatchedPosTotal = 0;
    let unmatchedPosCount = 0;
    posPaymentsForRecon.forEach(p => {
      if (!usedPaymentIds.has(p.id)) {
        unmatchedPosTotal += p.amount;
        unmatchedPosCount += 1;
      }
    });
    const matchedCount = reconciledBank.filter(tx => tx.status === 'MATCHED').length;
    const unmatchedBankCount = reconciledBank.length - matchedCount;
    const summary: BankReconciliationSummary = {
      totalBank: bankTotal,
      totalPos: posTotal,
      matchedBankTotal,
      unmatchedBankTotal,
      unmatchedPosTotal,
      matchedCount,
      unmatchedBankCount,
      unmatchedPosCount
    };
    return {
      bank: reconciledBank,
      summary
    };
  }, [bankTransactions, posPaymentsForRecon]);

  const handlePrintZRead = () => {
    const docId = `Z-READ-${new Date().getTime()}`;
    navigate(`/print/daily/${docId}`, {
      state: {
        data: {
          id: docId,
          createdAt: new Date().toISOString(),
          branchName: branches.find((b: any) => b.id === user.branchId)?.name,
          totalCount: stats.totalCount,
          totalRevenue: stats.totalRevenue,
          cashInDrawer: stats.cashInDrawer,
          createdBy: user.name,
          items: Object.keys(stats.methods).map(method => ({
            description: method,
            amount: stats.methods[method]
          }))
        },
        type: 'DAILY_SETTLEMENT'
      }
    });
  };

  const handleSubmitReport = async () => {
    if (isSubmitting || reportSubmitted) return;
    const { startStr, endStr } = dateRange;
    if (!startStr || !endStr) {
      alert('請先選擇有效期間');
      return;
    }
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const payload = {
        id: `SET-${user.branchId}-${startStr}-${endStr}-${Date.now()}`,
        branch_id: user.branchId,
        start_date: startStr,
        end_date: endStr,
        total_revenue: stats.totalRevenue,
        total_orders: stats.totalCount,
        cash_in_drawer: stats.cashInDrawer,
        total_cogs: stats.cogs,
        total_expenses: stats.totalExpenses,
        gross_profit: stats.grossProfit,
        net_profit: stats.netProfit,
        created_by: user.name,
      };
      const res = await fetch(`${API_BASE_URL}/submit_daily_settlement.php`, {
        method: 'POST',
        headers: authToken
          ? { 'Content-Type': 'application/json', 'X-Auth-Token': authToken }
          : { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        if (json && json.code === 'ALREADY_SUBMITTED' && json.settlement) {
          const s = json.settlement;
          const mapped: DailySettlement = {
            id: s.id,
            branchId: s.branch_id,
            startDate: s.start_date,
            endDate: s.end_date,
            totalRevenue: s.total_revenue,
            totalOrders: s.total_orders,
            cashInDrawer: s.cash_in_drawer,
            totalCogs: s.total_cogs,
            totalExpenses: s.total_expenses,
            grossProfit: s.gross_profit,
            netProfit: s.net_profit,
            createdAt: s.created_at,
            createdBy: s.created_by,
            status: s.status,
          };
          setCurrentSettlement(mapped);
          setReportSubmitted(true);
          alert('此期間已經有日結紀錄，已載入現有紀錄。');
          return;
        }
        throw new Error((json && json.error) || '提交日結失敗');
      }
      if (json.settlement) {
        const s = json.settlement;
        const mapped: DailySettlement = {
          id: s.id,
          branchId: s.branch_id,
          startDate: s.start_date,
          endDate: s.end_date,
          totalRevenue: s.total_revenue,
          totalOrders: s.total_orders,
          cashInDrawer: s.cash_in_drawer,
          totalCogs: s.total_cogs,
          totalExpenses: s.total_expenses,
          grossProfit: s.gross_profit,
          netProfit: s.net_profit,
          createdAt: s.created_at,
          createdBy: s.created_by,
          status: s.status,
        };
        setCurrentSettlement(mapped);
      }
      setReportSubmitted(true);
      alert(
        `已提交日結紀錄。\n\n期間: ${startStr} 至 ${endStr}\n分店: ${
          branches.find((b: any) => b.id === user.branchId)?.name || ''
        }\n總營業額: $${stats.totalRevenue.toLocaleString()}\n訂單數: ${stats.totalCount}`
      );
    } catch (e: any) {
      const msg = e && e.message ? e.message : '提交日結失敗';
      setSubmitError(msg);
      alert(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getIcon = (method: string) => {
      if (method.includes('Cash')) return <Banknote size={18} />;
      if (method.includes('Card')) return <CreditCard size={18} />;
      if (method.includes('PayMe') || method.includes('Alipay')) return <Smartphone size={18} />;
      return <DollarSign size={18} />;
  };

  const handleUnlockSettlement = async () => {
    if (!currentSettlement) return;
    const { startStr, endStr } = dateRange;
    if (!startStr || !endStr) return;
    if (!canUnlock) {
      alert('只有 Manager / Admin 可以解鎖日結紀錄');
      return;
    }
    const confirmed = window.confirm('確定要解鎖此期間的日結紀錄？解鎖後可重新提交日結。');
    if (!confirmed) return;
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const payload = {
        branch_id: user.branchId,
        start_date: startStr,
        end_date: endStr,
        role: user.role,
      };
      const res = await fetch(`${API_BASE_URL}/unlock_daily_settlement.php`, {
        method: 'POST',
        headers: authToken
          ? { 'Content-Type': 'application/json', 'X-Auth-Token': authToken }
          : { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error((json && json.error) || '解鎖日結失敗');
      }
      setCurrentSettlement(null);
      setReportSubmitted(false);
      alert('已解鎖日結紀錄，現在可以重新提交。');
    } catch (e: any) {
      const msg = e && e.message ? e.message : '解鎖日結失敗';
      setSubmitError(msg);
      alert(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-8 bg-slate-50 min-h-screen">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              {isCashierDailyClose ? '日結 (Daily Close)' : '會計結算 (Accounting Settlement)'}
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              {branches.find((b: any) => b.id === user.branchId)?.name || ''} · {today}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {!isCashierDailyClose && (
              <button
                type="button"
                onClick={() => setShowExpenseManager(true)}
                className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 text-sm font-medium hover:bg-slate-200"
              >
                管理支出
              </button>
            )}
            <button
              type="button"
              onClick={handlePrintZRead}
              className="px-4 py-2 rounded-lg bg-white border border-slate-200 text-sm font-medium hover:bg-slate-50"
            >
              列印 Z-READ
            </button>
            <button
              type="button"
              onClick={handleSubmitReport}
              disabled={isSubmitting || !dateRange.startStr || !dateRange.endStr}
              className={`px-4 py-2 rounded-lg text-sm font-medium text-white ${
                isSubmitting ? 'bg-slate-400' : 'bg-emerald-600 hover:bg-emerald-700'
              }`}
            >
              {reportSubmitted ? '已提交日結' : '提交日結'}
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 space-y-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="inline-flex rounded-full bg-slate-100 p-1 text-xs">
              <button
                type="button"
                onClick={() => setFilterMode('RANGE')}
                className={`px-3 py-1 rounded-full ${
                  filterMode === 'RANGE'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500'
                }`}
              >
                自訂日期
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('MONTH')}
                className={`px-3 py-1 rounded-full ${
                  filterMode === 'MONTH'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500'
                }`}
              >
                按月份
              </button>
            </div>
            <div className="flex flex-wrap gap-3 text-xs items-center">
              {filterMode === 'RANGE' ? (
                <>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500">從</span>
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={e => setDateFrom(e.target.value)}
                      className="border border-slate-200 rounded-lg px-2 py-1 text-xs"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500">至</span>
                    <input
                      type="date"
                      value={dateTo}
                      onChange={e => setDateTo(e.target.value)}
                      className="border border-slate-200 rounded-lg px-2 py-1 text-xs"
                    />
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-slate-500">月份</span>
                  <select
                    value={selectedMonth}
                    onChange={e => setSelectedMonth(e.target.value)}
                    className="border border-slate-200 rounded-lg px-2 py-1 text-xs bg-white"
                  >
                    {availableMonths.map(m => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-3 text-xs items-center mt-2">
            <span className="text-slate-500">損益表期間</span>
            <div className="inline-flex rounded-full bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => handlePresetChange('DAY')}
                className={`px-3 py-1 rounded-full ${
                  pnlPreset === 'DAY'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500'
                }`}
              >
                日
              </button>
              <button
                type="button"
                onClick={() => handlePresetChange('WEEK')}
                className={`px-3 py-1 rounded-full ${
                  pnlPreset === 'WEEK'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500'
                }`}
              >
                週
              </button>
              <button
                type="button"
                onClick={() => handlePresetChange('MONTH')}
                className={`px-3 py-1 rounded-full ${
                  pnlPreset === 'MONTH'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500'
                }`}
              >
                月
              </button>
              <button
                type="button"
                onClick={() => handlePresetChange('YEAR')}
                className={`px-3 py-1 rounded-full ${
                  pnlPreset === 'YEAR'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500'
                }`}
              >
                年
              </button>
            </div>
          </div>

          {submitError && (
            <p className="text-xs text-red-500">{submitError}</p>
          )}
          {isCheckingSettlement && (
            <p className="text-xs text-slate-500">載入日結紀錄中…</p>
          )}
          {isLoadingCogs && (
            <p className="text-xs text-slate-500">載入成本與支出中…</p>
          )}
          {currentSettlement && (
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between rounded-xl bg-emerald-50 border border-emerald-100 px-4 py-3 text-xs">
              <div>
                <p className="font-semibold text-emerald-800">此期間已有日結紀錄</p>
                <p className="text-emerald-700 mt-1">
                  總營業額 $
                  {currentSettlement.totalRevenue.toLocaleString()} · 淨利潤 $
                  {currentSettlement.netProfit.toLocaleString()}
                </p>
              </div>
              {canUnlock && (
                <button
                  type="button"
                  onClick={handleUnlockSettlement}
                  className="px-3 py-1 rounded-lg border border-emerald-500 text-emerald-700 font-medium hover:bg-emerald-100"
                >
                  解鎖日結
                </button>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
            <p className="text-xs text-slate-500 mb-1">總營業額</p>
            <p className="text-xl font-semibold text-slate-900">
              ${stats.totalRevenue.toLocaleString()}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              訂單數：{stats.totalCount}
            </p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
            <p className="text-xs text-slate-500 mb-1">毛利 / 毛利率</p>
            <p className="text-xl font-semibold text-slate-900">
              ${stats.grossProfit.toLocaleString()}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              毛利率：{stats.grossMargin.toFixed(1)}%
            </p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
            <p className="text-xs text-slate-500 mb-1">淨利 / 支出</p>
            <p className="text-xl font-semibold text-slate-900">
              ${stats.netProfit.toLocaleString()}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              總支出：${stats.totalExpenses.toLocaleString()}
            </p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
            <p className="text-xs text-slate-500 mb-1">稅務總結</p>
            <p className="text-xl font-semibold text-slate-900">
              稅額：${stats.totalTax.toLocaleString()}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              應稅銷售額：${stats.taxableSales.toLocaleString()}
            </p>
          </div>
        </div>

        {!isCashierDailyClose && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
            <h2 className="text-sm font-semibold text-slate-800 mb-3">損益表 (P&amp;L)</h2>
            <p className="text-[11px] text-slate-500 mb-2">
              期間：
              {dateRange.startStr && dateRange.endStr
                ? `${dateRange.startStr} ~ ${dateRange.endStr}`
                : '全部期間'}
            </p>
            <table className="min-w-full text-xs">
              <tbody>
                <tr className="border-b border-slate-100">
                  <td className="py-1.5 pr-4 text-slate-600">營業收入 (Revenue)</td>
                  <td className="py-1.5 text-right font-semibold text-slate-900">
                    ${stats.totalRevenue.toLocaleString()}
                  </td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="py-1.5 pr-4 text-slate-600">銷貨成本 (COGS)</td>
                  <td className="py-1.5 text-right font-semibold text-slate-900">
                    ${stats.cogs.toLocaleString()}
                  </td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="py-1.5 pr-4 text-slate-600">毛利 (Gross Profit)</td>
                  <td className="py-1.5 text-right font-semibold text-slate-900">
                    ${stats.grossProfit.toLocaleString()}
                  </td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="py-1.5 pr-4 text-slate-600">營業費用 (Expenses)</td>
                  <td className="py-1.5 text-right font-semibold text-slate-900">
                    ${stats.totalExpenses.toLocaleString()}
                  </td>
                </tr>
                <tr>
                  <td className="py-1.5 pr-4 text-slate-600">淨利 (Net Profit)</td>
                  <td className="py-1.5 text-right font-semibold text-slate-900">
                    ${stats.netProfit.toLocaleString()}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
          <h2 className="text-sm font-semibold text-slate-800 mb-3">付款方式分佈</h2>
          {Object.keys(stats.methods).length === 0 ? (
            <p className="text-xs text-slate-500">此期間沒有訂單。</p>
          ) : (
            <div className="space-y-2">
              {Object.entries(stats.methods).map(([method, amount]) => (
                <div
                  key={method}
                  className="flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-slate-600">{getIcon(method)}</span>
                    <span className="font-medium text-slate-700">{method}</span>
                  </div>
                  <span className="font-semibold text-slate-900">
                    ${(amount as number).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {!isCashierDailyClose && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
            <h2 className="text-sm font-semibold text-slate-800 mb-3">分店比較</h2>
            {branchSummaries.length === 0 ? (
              <p className="text-xs text-slate-500">沒有可用的分店數據。</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-xs">
                  <thead>
                    <tr className="text-left text-slate-500 border-b border-slate-100">
                      <th className="py-2 pr-4">分店</th>
                      <th className="py-2 pr-4">營業額</th>
                      <th className="py-2 pr-4">成本 (COGS)</th>
                      <th className="py-2 pr-4">支出</th>
                      <th className="py-2 pr-4">淨利</th>
                      <th className="py-2">毛利率</th>
                    </tr>
                  </thead>
                  <tbody>
                    {branchSummaries.map(branch => (
                      <tr
                        key={branch.branchId}
                        className="border-b border-slate-50 last:border-0"
                      >
                        <td className="py-2 pr-4 font-medium text-slate-800">
                          {branch.name}
                        </td>
                        <td className="py-2 pr-4">
                          ${branch.totalRevenue.toLocaleString()}
                        </td>
                        <td className="py-2 pr-4">
                          ${branch.cogs.toLocaleString()}
                        </td>
                        <td className="py-2 pr-4">
                          ${branch.expenses.toLocaleString()}
                        </td>
                        <td className="py-2 pr-4">
                          ${branch.netProfit.toLocaleString()}
                        </td>
                        <td className="py-2">
                          {branch.grossMargin.toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {!isCashierDailyClose && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-slate-800">資產負債表快照</h2>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-500">截至</span>
                <input
                  type="date"
                  value={balanceDate}
                  onChange={e => setBalanceDate(e.target.value)}
                  className="border border-slate-200 rounded-lg px-2 py-1 text-xs"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-slate-500 mb-1">現金及銀行存款</p>
                <p className="text-xl font-semibold text-slate-900">
                  ${balanceSheet.cash.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">存貨</p>
                <p className="text-xl font-semibold text-slate-900">
                  ${balanceSheet.inventory.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">應收帳款</p>
                <p className="text-xl font-semibold text-slate-900">
                  ${balanceSheet.receivable.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">應付帳款</p>
                <p className="text-xl font-semibold text-slate-900">
                  ${balanceSheet.payable.toLocaleString()}
                </p>
              </div>
            </div>
            <p className="text-[11px] text-slate-500 mt-3">
              數值根據目前分店資料，並以所選日期作為截至日估算。
            </p>
          </div>
        )}

        {!isCashierDailyClose && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 space-y-3">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <h2 className="text-sm font-semibold text-slate-800">銀行對帳</h2>
              <label className="text-xs text-slate-600 cursor-pointer">
                <span className="px-3 py-1 rounded-lg border border-slate-300 hover:bg-slate-50 inline-block">
                  匯入銀行 CSV
                </span>
                <input
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={handleBankFileChange}
                />
              </label>
            </div>
            {uploadedFileName && (
              <p className="text-xs text-slate-500">已載入檔案：{uploadedFileName}</p>
            )}
            {reconError && (
              <p className="text-xs text-red-500">{reconError}</p>
            )}
            {isReconciling && (
              <p className="text-xs text-slate-500">處理檔案中…</p>
            )}
            {reconciliation ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px]">
                  <div className="rounded-lg bg-slate-50 px-3 py-2">
                    <p className="text-slate-500">銀行總額</p>
                    <p className="font-semibold text-slate-900">
                      ${reconciliation.summary.totalBank.toLocaleString()}
                    </p>
                  </div>
                  <div className="rounded-lg bg-slate-50 px-3 py-2">
                    <p className="text-slate-500">POS 總額</p>
                    <p className="font-semibold text-slate-900">
                      ${reconciliation.summary.totalPos.toLocaleString()}
                    </p>
                  </div>
                  <div className="rounded-lg bg-slate-50 px-3 py-2">
                    <p className="text-slate-500">已配對</p>
                    <p className="font-semibold text-emerald-700">
                      ${reconciliation.summary.matchedBankTotal.toLocaleString()}
                    </p>
                  </div>
                  <div className="rounded-lg bg-slate-50 px-3 py-2">
                    <p className="text-slate-500">未配對</p>
                    <p className="font-semibold text-amber-700">
                      ${reconciliation.summary.unmatchedBankTotal.toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="max-h-56 overflow-auto border border-slate-100 rounded-lg">
                  <table className="min-w-full text-[11px]">
                    <thead className="bg-slate-50 text-slate-500">
                      <tr>
                        <th className="py-2 px-3 text-left">日期</th>
                        <th className="py-2 px-3 text-left">說明</th>
                        <th className="py-2 px-3 text-right">金額</th>
                        <th className="py-2 px-3 text-left">狀態</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reconciliation.bank.map(tx => (
                        <tr key={tx.id} className="border-t border-slate-50">
                          <td className="py-1.5 px-3">{tx.date}</td>
                          <td className="py-1.5 px-3 truncate max-w-[220px]">
                            {tx.description || '-'}
                          </td>
                          <td className="py-1.5 px-3 text-right">
                            ${tx.amount.toLocaleString()}
                          </td>
                          <td className="py-1.5 px-3">
                            <span
                              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
                                tx.status === 'MATCHED'
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : 'bg-amber-50 text-amber-700'
                              }`}
                            >
                              {tx.status === 'MATCHED' ? '已配對' : '未配對'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500">尚未匯入銀行對帳單。</p>
            )}
          </div>
        )}

      </div>

      {showExpenseManager && (
        <ExpenseManager
          onClose={() => {
            setShowExpenseManager(false);
            fetchData();
          }}
          user={user}
          branches={branches}
          authToken={authToken}
        />
      )}
    </div>
  );
};

export default AccountingPage;
