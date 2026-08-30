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

export type InvoiceStatusLower = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
export type InvoiceStatus = InvoiceStatusLower; // alias kept for backward compatibility
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
    name: string;
    type: "CUSTOMER" | "SUPPLIER" | "BOTH";
    company?: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    province?: string;
    postalCode?: string;
    taxId?: string;
    notes?: string;
    isActive: boolean;
    tenantId: ID;
    createdAt: Timestamp;
    updatedAt: Timestamp;
    deletedAt?: Timestamp;
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
export type LeaveTypeLower = 'annual' | 'sick' | 'personal' | 'maternity' | 'unpaid';
export type LeaveType = LeaveTypeLower; // alias kept for backward compatibility
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

// --------------------------------------------
// DTO Types (Create/Update Request Bodies)
// --------------------------------------------

export interface CreateInvoiceDTO {
    contactId?: string;
    customerName: string;
    items: CreateInvoiceItemDTO[];
    taxRate?: number;
    discount?: number;
    dueDate: string;
    notes?: string;
}

export interface CreateInvoiceItemDTO {
    description: string;
    quantity: number;
    unitPrice: number;
}

export interface UpdateInvoiceDTO extends Partial<CreateInvoiceDTO> {
    status?: InvoiceStatus;
}

export interface CreateQuotationDTO {
    contactId?: string;
    customerName: string;
    items: CreateQuotationItemDTO[];
    taxRate?: number;
    discount?: number;
    validUntil: string;
    notes?: string;
    terms?: string;
}

export interface CreateQuotationItemDTO {
    description: string;
    quantity: number;
    unitPrice: number;
}

export interface UpdateQuotationDTO extends Partial<CreateQuotationDTO> {
    status?: QuotationStatus;
}

export interface CreatePaymentDTO {
    invoiceId?: string;
    customerName: string;
    amount: number;
    method: PaymentMethodType;
    type?: PaymentTransactionType;
    reference?: string;
    notes?: string;
    paymentDate: string;
}

export interface UpdatePaymentDTO extends Partial<CreatePaymentDTO> {
    status?: PaymentTransactionStatus;
}

export interface CreatePurchaseOrderDTO {
    supplierId?: string;
    supplierName: string;
    items: CreatePurchaseOrderItemDTO[];
    taxRate?: number;
    deliveryDate?: string;
    notes?: string;
}

export interface CreatePurchaseOrderItemDTO {
    description: string;
    quantity: number;
    unitPrice: number;
}

export interface UpdatePurchaseOrderDTO extends Partial<CreatePurchaseOrderDTO> {
    status?: PurchaseOrderStatus;
}

export interface CreateContactDTO {
    name: string;
    type: ContactType;
    company?: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    province?: string;
    postalCode?: string;
    taxId?: string;
    notes?: string;
}

export interface UpdateContactDTO extends Partial<CreateContactDTO> { }

export interface CreateLeadDTO {
    name: string;
    company?: string;
    email?: string;
    phone?: string;
    source?: string;
    value?: number;
    notes?: string;
    contactId?: string;
}

export interface UpdateLeadDTO extends Partial<CreateLeadDTO> {
    status?: LeadStatus;
}

export interface CreateDealDTO {
    title: string;
    value?: number;
    stage?: DealStage;
    probability?: number;
    closeDate?: string;
    notes?: string;
    contactId?: string;
    leadId?: string;
}

export interface UpdateDealDTO extends Partial<CreateDealDTO> {
    stage?: DealStage;
}

export interface CreateProductDTO {
    sku: string;
    name: string;
    description?: string;
    unit?: string;
    price?: number;
    cost?: number;
    stock?: number;
    minStock?: number;
    categoryId?: string;
}

export interface UpdateProductDTO extends Partial<CreateProductDTO> {
    isActive?: boolean;
}

export interface CreateCategoryDTO {
    name: string;
    description?: string;
}

export interface UpdateCategoryDTO extends Partial<CreateCategoryDTO> { }

export interface CreateSupplierDTO {
    name: string;
    contactPerson?: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    rating?: number;
    notes?: string;
}

export interface UpdateSupplierDTO extends Partial<CreateSupplierDTO> { }

export interface CreateEmployeeDTO {
    employeeId: string;
    name: string;
    email: string;
    phone?: string;
    position: string;
    department?: string;
    joinDate: string;
    salary?: number;
}

export interface UpdateEmployeeDTO extends Partial<CreateEmployeeDTO> {
    status?: EmployeeStatusType;
}

export interface CreateAttendanceDTO {
    employeeId: string;
    date: string;
    clockIn?: string;
    clockOut?: string;
    status: AttendanceStatusType;
    notes?: string;
}

export interface CreateLeaveRequestDTO {
    employeeId: string;
    type: LeaveType;
    startDate: string;
    endDate: string;
    days: number;
    reason?: string;
}

export interface UpdateLeaveRequestDTO {
    status: LeaveRequestStatus;
    notes?: string;
}

export interface CreatePayrollDTO {
    employeeId: string;
    period: string;
    baseSalary: number;
    allowances?: number;
    deductions?: number;
    bonus?: number;
}

export interface UpdatePayrollDTO {
    status: PayrollStatus;
    paidAt?: string;
}

// --------------------------------------------
// Auth Types
// --------------------------------------------

export interface LoginDTO {
    email: string;
    password: string;
}

export interface RegisterDTO {
    name: string;
    email: string;
    password: string;
    companyName?: string;
}

export interface AuthUser {
    id: ID;
    email: string;
    name: string;
    avatar?: string;
    role: SystemRole;
    tenantId: ID;
    tenantName: string;
}

export interface AuthSession {
    user: AuthUser;
    accessToken: string;
    expiresAt: Timestamp;
}

// --------------------------------------------
// Subscription & Billing Types
// --------------------------------------------

export type SubscriptionStatus = 'TRIAL' | 'ACTIVE' | 'PENDING_PAYMENT' | 'SUSPENDED' | 'CANCELLED';
export type BillingPeriod = 'monthly' | 'yearly';
export type PaymentTransactionStatus = 'PENDING' | 'VERIFIED' | 'REJECTED';

export interface SubscriptionPlan {
    id: ID;
    name: string;
    slug: string;
    description?: string;
    price: number;
    billingPeriod: BillingPeriod;
    maxUsers: number;
    maxProducts: number;
    maxStorage?: string;
    features?: string[];
    isActive: boolean;
    sortOrder: number;
}

export interface TenantSubscription {
    id: ID;
    tenantId: ID;
    planId: ID;
    plan?: SubscriptionPlan;
    status: SubscriptionStatus;
    startDate: Timestamp;
    endDate?: Timestamp;
    nextBillingDate?: Timestamp;
    paymentMethod?: string;
}

export interface BillingPayment {
    id: ID;
    subscriptionId: ID;
    tenantId: ID;
    amount: number;
    paymentMethod: string;
    bankName?: string;
    accountNumber?: string;
    accountName?: string;
    proofFileUrl?: string;
    proofFileName?: string;
    reference?: string;
    status: PaymentTransactionStatus;
    verifiedById?: ID;
    verifiedAt?: Timestamp;
    rejectReason?: string;
    notes?: string;
    waConfirmed: boolean;
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

// --------------------------------------------
// API Request/Response Types
// --------------------------------------------

export interface ListQueryParams {
    page?: number;
    limit?: number;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    status?: string;
    type?: string;
    startDate?: string;
    endDate?: string;
}

export interface ListResponse<T> {
    success: boolean;
    data: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export interface DetailResponse<T> {
    success: boolean;
    data: T;
}

export interface MutationResponse<T = void> {
    success: boolean;
    data?: T;
    message?: string;
    error?: string;
}

export interface ErrorResponse {
    success: false;
    error: string;
    message?: string;
    statusCode: number;
}

// --------------------------------------------
// Dashboard & Reporting Types
// --------------------------------------------

export interface RevenueMetrics {
    totalRevenue: number;
    previousRevenue: number;
    change: number;
    changePercent: number;
}

export interface SalesMetrics {
    totalDeals: number;
    wonDeals: number;
    lostDeals: number;
    winRate: number;
    pipelineValue: number;
    weightedPipeline: number;
}

export interface InventoryMetrics {
    totalProducts: number;
    lowStockCount: number;
    outOfStockCount: number;
    totalStockValue: number;
}

export interface HRMetrics {
    totalEmployees: number;
    activeEmployees: number;
    onLeaveCount: number;
    pendingLeaves: number;
}

export interface CashFlowSummary {
    totalIncome: number;
    totalExpense: number;
    netCashFlow: number;
    period: string;
}

export interface ChartDataPoint {
    label: string;
    value: number;
    color?: string;
}

export interface ChartDataset {
    label: string;
    data: number[];
    color?: string;
}

export interface ReportConfig {
    type: ReportType;
    startDate?: string;
    endDate?: string;
    groupBy?: 'day' | 'week' | 'month' | 'quarter' | 'year';
    format?: 'json' | 'csv' | 'excel';
}

export type ReportType =
    | 'revenue'
    | 'expenses'
    | 'profit_loss'
    | 'invoices'
    | 'payments'
    | 'sales_pipeline'
    | 'inventory'
    | 'employees'
    | 'attendance'
    | 'payroll'
    | 'tax';

// --------------------------------------------
// Integration Types
// --------------------------------------------

export type IntegrationType = 'whatsapp' | 'marketplace' | 'payment' | 'email' | 'sms' | 'other';
export type PaymentGatewayProvider = 'midtrans' | 'xendit' | 'manual';

export interface IntegrationConfig {
    id: ID;
    tenantId: ID;
    provider: string;
    type: IntegrationType;
    apiKey?: string;
    isActive: boolean;
    config?: Record<string, string>;
    lastSyncAt?: Timestamp;
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

// --------------------------------------------
// File Upload Types
// --------------------------------------------

export interface FileUpload {
    id: ID;
    filename: string;
    originalName: string;
    mimeType: string;
    size: number;
    url: string;
    tenantId: ID;
    uploadedBy: ID;
    createdAt: Timestamp;
}

export interface UploadResponse {
    success: boolean;
    file?: FileUpload;
    error?: string;
}

// --------------------------------------------
// Notification Types
// --------------------------------------------

export type NotificationType = 'info' | 'success' | 'warning' | 'error';
export type NotificationChannel = 'email' | 'push' | 'sms' | 'whatsapp';

export interface Notification {
    id: ID;
    tenantId: ID;
    userId: ID;
    title: string;
    message: string;
    type: NotificationType;
    isRead: boolean;
    actionUrl?: string;
    createdAt: Timestamp;
}

// --------------------------------------------
// Additional Enums (matching Prisma uppercase strings)
// --------------------------------------------

export type SystemRole = 'SUPERADMIN' | 'ADMIN' | 'USER' | 'VIEWER';
export type UserRoleSystem = 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';

export type ContactType = 'CUSTOMER' | 'SUPPLIER' | 'BOTH';
export type InvoiceStatusDB = 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE' | 'CANCELLED';
export type QuotationStatus = 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED';
export type PurchaseOrderStatus = 'DRAFT' | 'SENT' | 'CONFIRMED' | 'RECEIVED' | 'CANCELLED';
export type PaymentMethodType = 'BANK_TRANSFER' | 'CASH' | 'CREDIT_CARD' | 'E_WALLET';
export type PaymentTransactionType = 'INCOME' | 'EXPENSE';
export type PaymentTransactionStatusType = 'COMPLETED' | 'PENDING' | 'FAILED';
export type LeadStatusType = 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'PROPOSAL' | 'NEGOTIATION' | 'WON' | 'LOST';
export type DealStageType = 'DISCOVERY' | 'PROPOSAL' | 'NEGOTIATION' | 'CLOSING' | 'CLOSED_WON' | 'CLOSED_LOST';
export type ProductStatusType = 'ACTIVE' | 'INACTIVE' | 'DISCONTINUED';
export type StockMovementType = 'IN' | 'OUT' | 'ADJUSTMENT';
export type EmployeeStatusType = 'ACTIVE' | 'INACTIVE' | 'TERMINATED';
export type AttendanceStatusType = 'PRESENT' | 'LATE' | 'ABSENT' | 'LEAVE' | 'WFH';
export type LeaveTypeDB = 'ANNUAL' | 'SICK' | 'PERSONAL' | 'MATERNITY' | 'UNPAID';
export type LeaveRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type PayrollStatus = 'PENDING' | 'PROCESSED' | 'PAID';
export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT';
