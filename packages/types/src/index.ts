// ============================================
// Qalcuity Shared Types
// Centralized type definitions for all modules
// ============================================

// --------------------------------------------
// Common Types
// --------------------------------------------

export type ID = string;
export type Timestamp = string; // ISO 8601
export type Currency = 'IDR' | 'USD' | 'EUR';

export interface PaginationParams {
    page: number;
    limit: number;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
    data: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}

export interface User {
    id: ID;
    email: string;
    name: string;
    avatar?: string;
    role: UserRole;
    companyId: ID;
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

export type UserRole = 'owner' | 'admin' | 'manager' | 'staff' | 'viewer';

export interface Company {
    id: ID;
    name: string;
    address?: string;
    phone?: string;
    email?: string;
    website?: string;
    logo?: string;
    taxId?: string; // NPWP
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

// --------------------------------------------
// Finance Module
// --------------------------------------------

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
export type PaymentStatus = 'pending' | 'partial' | 'paid' | 'failed';
export type PaymentMethod = 'bank_transfer' | 'cash' | 'credit_card' | 'qris' | 'ewallet';

export interface Invoice {
    id: ID;
    invoiceNumber: string;
    companyId: ID;
    customerId: ID;
    customerName: string;
    items: InvoiceItem[];
    subtotal: number;
    tax: number;
    discount: number;
    total: number;
    currency: Currency;
    status: InvoiceStatus;
    dueDate: Timestamp;
    notes?: string;
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

export interface InvoiceItem {
    id: ID;
    productId?: ID;
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
}

export interface Quotation {
    id: ID;
    quotationNumber: string;
    companyId: ID;
    customerId: ID;
    customerName: string;
    items: QuotationItem[];
    subtotal: number;
    tax: number;
    discount: number;
    total: number;
    currency: Currency;
    status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';
    validUntil: Timestamp;
    notes?: string;
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

export interface QuotationItem {
    id: ID;
    productId?: ID;
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
}

export interface Payment {
    id: ID;
    paymentNumber: string;
    companyId: ID;
    invoiceId?: ID;
    customerId?: ID;
    customerName: string;
    amount: number;
    currency: Currency;
    method: PaymentMethod;
    status: 'pending' | 'completed' | 'failed';
    reference?: string;
    notes?: string;
    paidAt: Timestamp;
    createdAt: Timestamp;
}

export interface PurchaseOrder {
    id: ID;
    poNumber: string;
    companyId: ID;
    supplierId: ID;
    supplierName: string;
    items: PurchaseOrderItem[];
    subtotal: number;
    tax: number;
    total: number;
    currency: Currency;
    status: 'draft' | 'sent' | 'confirmed' | 'received' | 'cancelled';
    expectedDate?: Timestamp;
    notes?: string;
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

export interface PurchaseOrderItem {
    id: ID;
    productId?: ID;
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
}

export interface Account {
    id: ID;
    code: string;
    name: string;
    type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
    parentId?: ID;
    balance: number;
    currency: Currency;
    isActive: boolean;
}

// --------------------------------------------
// CRM Module
// --------------------------------------------

export type LeadStatus = 'new' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost';
export type DealStage = 'discovery' | 'proposal' | 'negotiation' | 'closed_won' | 'closed_lost';

export interface Lead {
    id: ID;
    companyId: ID;
    name: string;
    email?: string;
    phone?: string;
    company?: string;
    source: string;
    status: LeadStatus;
    value?: number;
    assignedTo?: ID;
    notes?: string;
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

export interface Contact {
    id: ID;
    companyId: ID;
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    company?: string;
    position?: string;
    leadId?: ID;
    tags?: string[];
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

export interface Deal {
    id: ID;
    companyId: ID;
    name: string;
    customerId?: ID;
    customerName: string;
    value: number;
    currency: Currency;
    stage: DealStage;
    probability: number;
    expectedCloseDate?: Timestamp;
    assignedTo?: ID;
    contactId?: ID;
    notes?: string;
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

export interface Pipeline {
    id: ID;
    companyId: ID;
    name: string;
    stages: PipelineStage[];
    isDefault: boolean;
}

export interface PipelineStage {
    id: ID;
    name: string;
    order: number;
    probability: number;
    color: string;
}

// --------------------------------------------
// Inventory Module
// --------------------------------------------

export type ProductStatus = 'active' | 'inactive' | 'discontinued';
export type StockStatus = 'in_stock' | 'low_stock' | 'out_of_stock';

export interface Product {
    id: ID;
    companyId: ID;
    sku: string;
    name: string;
    description?: string;
    categoryId?: ID;
    categoryName?: string;
    unitPrice: number;
    costPrice?: number;
    currency: Currency;
    stock: number;
    minStock: number;
    unit: string;
    status: ProductStatus;
    imageUrl?: string;
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

export interface Category {
    id: ID;
    companyId: ID;
    name: string;
    description?: string;
    parentId?: ID;
    productCount: number;
    createdAt: Timestamp;
}

export interface Supplier {
    id: ID;
    companyId: ID;
    name: string;
    contactName?: string;
    email?: string;
    phone?: string;
    address?: string;
    leadTime?: number; // days
    rating?: number;
    notes?: string;
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

export interface StockMovement {
    id: ID;
    companyId: ID;
    productId: ID;
    productName: string;
    type: 'in' | 'out' | 'adjustment';
    quantity: number;
    reference?: string;
    notes?: string;
    createdAt: Timestamp;
    createdBy: ID;
}

// --------------------------------------------
// HR Module
// --------------------------------------------

export type EmployeeStatus = 'active' | 'inactive' | 'on_leave' | 'terminated';
export type LeaveType = 'annual' | 'sick' | 'personal' | 'maternity' | 'unpaid';
export type LeaveStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';
export type AttendanceStatus = 'present' | 'late' | 'absent' | 'leave' | 'wfh';

export interface Employee {
    id: ID;
    companyId: ID;
    employeeId: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    position: string;
    department: string;
    startDate: Timestamp;
    endDate?: Timestamp;
    status: EmployeeStatus;
    salary?: number;
    currency?: Currency;
    managerId?: ID;
    avatar?: string;
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

export interface Department {
    id: ID;
    companyId: ID;
    name: string;
    managerId?: ID;
    employeeCount: number;
    createdAt: Timestamp;
}

export interface Attendance {
    id: ID;
    companyId: ID;
    employeeId: ID;
    employeeName: string;
    date: Timestamp;
    clockIn?: Timestamp;
    clockOut?: Timestamp;
    status: AttendanceStatus;
    notes?: string;
    location?: string; // GPS coordinates
}

export interface Leave {
    id: ID;
    companyId: ID;
    employeeId: ID;
    employeeName: string;
    type: LeaveType;
    startDate: Timestamp;
    endDate: Timestamp;
    days: number;
    reason: string;
    status: LeaveStatus;
    approvedBy?: ID;
    notes?: string;
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

export interface Payroll {
    id: ID;
    companyId: ID;
    employeeId: ID;
    employeeName: string;
    period: string; // e.g., "2026-08"
    baseSalary: number;
    allowance: number;
    deductions: number;
    netSalary: number;
    currency: Currency;
    status: 'draft' | 'processed' | 'paid';
    paidAt?: Timestamp;
    createdAt: Timestamp;
}

// --------------------------------------------
// Settings
// --------------------------------------------

export interface NotificationSettings {
    email: boolean;
    push: boolean;
    sms: boolean;
    invoiceReminder: boolean;
    leaveApproval: boolean;
    dealUpdate: boolean;
    stockAlert: boolean;
}

export interface IntegrationSettings {
    id: ID;
    companyId: ID;
    provider: string;
    type: 'whatsapp' | 'marketplace' | 'payment' | 'email' | 'sms' | 'other';
    apiKey: string;
    isActive: boolean;
    config?: Record<string, string>;
    lastSyncAt?: Timestamp;
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

// --------------------------------------------
// Audit Trail
// --------------------------------------------

export interface AuditLog {
    id: ID;
    companyId: ID;
    userId: ID;
    userName: string;
    action: string;
    entity: string;
    entityId: ID;
    changes?: Record<string, { old: unknown; new: unknown }>;
    ipAddress?: string;
    userAgent?: string;
    createdAt: Timestamp;
}

// --------------------------------------------
// Dashboard
// --------------------------------------------

export interface DashboardStats {
    revenue: { current: number; previous: number; change: number };
    orders: { current: number; previous: number; change: number };
    customers: { current: number; previous: number; change: number };
    products: { current: number; previous: number; change: number };
}

export interface Activity {
    id: ID;
    icon: string;
    title: string;
    description: string;
    amount?: string;
    timestamp: Timestamp;
    moduleId: string;
}
