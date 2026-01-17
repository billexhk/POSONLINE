
export enum Role {
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  ACCOUNTANT = 'ACCOUNTANT',
  CASHIER = 'CASHIER',
  CLERK = 'CLERK'
}

export enum PaymentMethod {
  CASH = '現金 (Cash)',
  CARD = '信用卡 (Card)',
  FPS = '轉數快 (FPS)',
  PAYME = 'PayMe',
  ALIPAY = '支付寶 (Alipay)',
  WECHAT = '微信支付 (WeChat)',
  ONLINE = '銀行轉帳 (Bank Transfer)'
}

export interface Branch {
  id: string;
  name: string;
  code: string;
}

export interface User {
  id: string;
  username: string;
  name: string;
  role: Role;
  branchId: string;
}

export interface Product {
  id: string;
  sku: string;
  barcode: string;
  ean?: string; // Added EAN Code
  name: string;
  brand: string;
  category: string;
  description: string;
  imageUrl: string;
  webName?: string; // NEW: Web Product Name
  productUrl?: string; // NEW: Product URL
  supplierId?: string; // NEW: Default Supplier ID
  cost: number;
  price: number; // Selling Price
  webPrice?: number; // Web Price
  srp: number; // Suggested Retail Price
  stock: Record<string, number>; // branchId -> quantity
  lowStockThreshold: number; // L/T Value
  trackStock: boolean; // NEW: If false, allow infinite sales and ignore stock check
}

export interface CartItem extends Product {
  quantity: number;
  discount: number; // Per unit discount amount
  sourceBranchId?: string; // The branch to deduct stock from
  isReturn?: boolean; // NEW: Mark item as return/refund
  serialNumbers?: string[]; // NEW: SN Tracking
}

export interface ParkedOrder {
  id: string;
  timestamp: string;
  customer: Customer | null;
  items: CartItem[];
  salesperson: string;
  note?: string;
}

export interface Customer {
  id: string;
  name: string;
  companyName?: string;
  address?: string;
  remark?: string;
  phone: string;
  email: string;
  points: number;
  tier: 'General' | 'VIP' | 'Corporate';
}

export interface PaymentRecord {
  method: PaymentMethod;
  amount: number;
  reference?: string;
}

export interface Order {
  id: string;
  branchId: string;
  customer?: Customer;
  items: CartItem[];
  subtotal: number;
  totalDiscount: number;
  taxRate?: number;
  taxAmount?: number;
  total: number;
  payments: PaymentRecord[];
  status: 'COMPLETED' | 'PARTIAL' | 'PENDING' | 'VOID';
  createdAt: string;
  businessDate?: string;
  cashierName: string;
}

export interface Transfer {
  id: string;
  productId: string;
  productName: string;
  productSku: string;
  fromBranchId: string;
  toBranchId: string;
  quantity: number;
  remark?: string;
  status: 'PENDING' | 'COMPLETED' | 'CANCELLED';
  createdAt: string;
  createdBy: string;
}

export interface Supplier {
  id: string;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  address?: string;
}

export interface StockInRecord {
  id: string;
  batchId?: string;
  date: string;
  productId: string;
  productName: string;
  supplierId: string;
  supplierName: string;
  supplierDocNo?: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  branchId: string;
  performedBy: string;
  status: 'COMPLETED' | 'VOID';
}

export interface Expense {
  id: string;
  branchId: string;
  category: string;
  amount: number;
  description: string;
  expenseDate: string; // YYYY-MM-DD
  createdAt: string;
  createdBy: string;
}

export type QuotationStatus = 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'CONVERTED' | 'CANCELLED';

export interface Quotation {
  id: string;
  customer?: Customer;
  items: CartItem[];
  subtotal: number;
  totalDiscount: number;
  total: number;
  status: QuotationStatus;
  validUntil: string;
  createdAt: string;
  createdBy: string;
  branchId: string;
}

export type PurchaseOrderStatus = 'DRAFT' | 'SENT' | 'RECEIVED' | 'CANCELLED';

export interface PurchaseOrderItem {
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  description?: string;
}

export interface PurchaseOrder {
  id: string;
  supplierId: string;
  supplierName: string;
  items: PurchaseOrderItem[];
  totalAmount: number;
  status: PurchaseOrderStatus;
  createdAt: string;
  expectedDate?: string;
  createdBy: string;
  branchId: string;
}

export interface SalesStat {
  name: string;
  value: number;
}

export type MovementType = 'SALE' | 'STOCK_IN' | 'TRANSFER_IN' | 'TRANSFER_OUT' | 'ADJUSTMENT' | 'RETURN';

export interface StockMovement {
  id: string;
  productId: string;
  type: MovementType;
  quantity: number; // positive for add, negative for remove
  referenceId: string; // Order ID, PO ID, or Transfer ID
  branchId: string;
  date: string;
  performedBy: string;
  note?: string;
}

// NEW: Repair / RMA Types
export type RepairStatus = 'RECEIVED' | 'SENT_TO_VENDOR' | 'BACK_FROM_VENDOR' | 'COMPLETED' | 'CANCELLED';
export type RepairType = 'CUSTOMER' | 'STOCK';

export interface RepairTicket {
  id: string;
  type: RepairType; // Distinction between Customer Repair and Stock RMA
  customer?: Customer; // Optional if type is STOCK
  branchId: string;
  
  // Product Info (Can be manual or linked)
  productId?: string; // Linked Product ID for Stock RMA
  productName: string;
  productSku?: string;
  serialNumber: string;
  problemDescription: string;
  accessories?: string; // Cable, Box, Adapter etc.

  // Vendor Info
  supplierId?: string;
  supplierName?: string;

  // Status & Dates
  status: RepairStatus;
  createdAt: string; // Received Date
  sentDate?: string; // Sent to Vendor
  returnDate?: string; // Back from Vendor
  completedDate?: string; // Picked up by Customer OR Returned to Stock

  // Costs
  repairCost: number; // Cost to shop
  repairPrice: number; // Price to customer (0 for Stock RMA)
  
  createdBy: string;
  notes?: string;
}

export interface DailySettlement {
  id: string;
  branchId: string;
  startDate: string;
  endDate: string;
  totalRevenue: number;
  totalOrders: number;
  cashInDrawer: number;
  totalCogs: number;
  totalExpenses: number;
  grossProfit: number;
  netProfit: number;
  createdAt: string;
  createdBy: string;
  status: string;
}
