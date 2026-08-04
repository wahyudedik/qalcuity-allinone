// API Configuration
const API_BASE_URL = 'http://localhost:3000/api';

// Generic fetch helper with error handling
async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    try {
        const response = await fetch(url, {
            headers: {
                'Content-Type': 'application/json',
                ...options?.headers,
            },
            ...options,
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        return data as T;
    } catch (error) {
        if (error instanceof Error) {
            throw new Error(`Network error: ${error.message}`);
        }
        throw new Error('Unknown error occurred');
    }
}

// ===== Finance API =====
export interface InvoiceData {
    id: string;
    invoiceNumber: string;
    customerName: string;
    amount: number;
    status: string;
    dueDate: string;
    createdAt: string;
}

export interface InvoiceDetailData extends InvoiceData {
    customerAddress: string;
    customerEmail: string;
    customerPhone: string;
    items: Array<{ name: string; description: string; quantity: number; unitPrice: number; total: number }>;
    subtotal: number;
    tax: number;
    total: number;
    currency: string;
    notes: string;
}

export interface PaymentData {
    id: string;
    invoiceNumber: string;
    customerName: string;
    amount: number;
    status: string;
    paymentDate: string;
    method: string;
}

export async function fetchInvoices(): Promise<InvoiceData[]> {
    const res = await fetchAPI<{ success: boolean; data: InvoiceData[] }>('/finance/invoices');
    return res.data || [];
}

export async function fetchInvoiceDetail(id: string): Promise<InvoiceDetailData> {
    const res = await fetchAPI<{ success: boolean; data: InvoiceDetailData }>(`/finance/invoices/${id}`);
    return res.data;
}

export async function fetchPayments(): Promise<PaymentData[]> {
    const res = await fetchAPI<{ success: boolean; data: PaymentData[] }>('/finance/payments');
    return res.data || [];
}

// ===== CRM API =====
export interface LeadData {
    id: string;
    name: string;
    company: string;
    email: string;
    status: string;
    value: number;
    source: string;
    createdAt: string;
}

export interface DealData {
    id: string;
    name: string;
    company: string;
    contactName: string;
    value: number;
    stage: string;
    probability: number;
    expectedCloseDate: string;
    createdAt: string;
}

export interface DealDetailData extends DealData {
    notes: string;
    activities: Array<{ type: string; description: string; date: string; user: string }>;
}

export interface ContactData {
    id: string;
    name: string;
    company: string;
    email: string;
    phone: string;
    position: string;
    type: string;
    createdAt: string;
}

export interface ContactDetailData extends ContactData {
    address: string;
    notes: string;
    deals: Array<{ name: string; value: number; stage: string }>;
    activities: Array<{ type: string; description: string; date: string }>;
}

export async function fetchLeads(): Promise<LeadData[]> {
    const res = await fetchAPI<{ success: boolean; data: LeadData[] }>('/crm/leads');
    return res.data || [];
}

export async function fetchDeals(): Promise<DealData[]> {
    const res = await fetchAPI<{ success: boolean; data: DealData[] }>('/crm/deals');
    return res.data || [];
}

export async function fetchDealDetail(id: string): Promise<DealDetailData> {
    const res = await fetchAPI<{ success: boolean; data: DealDetailData }>(`/crm/deals/${id}`);
    return res.data;
}

export async function fetchContacts(): Promise<ContactData[]> {
    const res = await fetchAPI<{ success: boolean; data: ContactData[] }>('/crm/contacts');
    return res.data || [];
}

export async function fetchContactDetail(id: string): Promise<ContactDetailData> {
    const res = await fetchAPI<{ success: boolean; data: ContactDetailData }>(`/crm/contacts/${id}`);
    return res.data;
}

// ===== Inventory API =====
export interface ProductData {
    id: string;
    sku: string;
    name: string;
    category: string;
    price: number;
    stock: number;
    minStock: number;
    status: string;
    unit: string;
}

export interface SupplierData {
    id: string;
    name: string;
    contactPerson: string;
    email: string;
    phone: string;
    address: string;
    status: string;
    rating: number;
    products: number;
}

export async function fetchProducts(): Promise<ProductData[]> {
    const res = await fetchAPI<{ success: boolean; data: ProductData[] }>('/inventory/products');
    return res.data || [];
}

export async function fetchSuppliers(): Promise<SupplierData[]> {
    const res = await fetchAPI<{ success: boolean; data: SupplierData[] }>('/inventory/suppliers');
    return res.data || [];
}

// ===== HR API =====
export interface EmployeeData {
    id: string;
    name: string;
    position: string;
    department: string;
    email: string;
    phone: string;
    status: string;
    joinDate: string;
    salary: number;
}

export interface AttendanceData {
    id: string;
    employeeId: string;
    employeeName: string;
    date: string;
    clockIn: string;
    clockOut: string | null;
    status: string;
    workHours: number;
}

export interface LeaveData {
    id: string;
    employeeId: string;
    employeeName: string;
    type: string;
    startDate: string;
    endDate: string;
    days: number;
    status: string;
    reason: string;
}

export interface PayrollData {
    id: string;
    employeeId: string;
    employeeName: string;
    period: string;
    baseSalary: number;
    allowances: number;
    deductions: number;
    netSalary: number;
    status: string;
}

export async function fetchEmployees(): Promise<EmployeeData[]> {
    const res = await fetchAPI<{ success: boolean; data: EmployeeData[] }>('/hr/employees');
    return res.data || [];
}

export async function fetchEmployeeDetail(id: string): Promise<EmployeeData> {
    const res = await fetchAPI<{ success: boolean; data: EmployeeData }>(`/hr/employees/${id}`);
    return res.data;
}

export async function fetchAttendance(): Promise<AttendanceData[]> {
    const res = await fetchAPI<{ success: boolean; data: AttendanceData[] }>('/hr/attendance');
    return res.data || [];
}

export async function fetchLeaves(): Promise<LeaveData[]> {
    const res = await fetchAPI<{ success: boolean; data: LeaveData[] }>('/hr/leaves');
    return res.data || [];
}

export async function fetchPayroll(): Promise<PayrollData[]> {
    const res = await fetchAPI<{ success: boolean; data: PayrollData[] }>('/hr/payroll');
    return res.data || [];
}

// ===== Dashboard API =====
export interface DashboardStats {
    totalRevenue: number;
    totalOrders: number;
    totalCustomers: number;
    totalProducts: number;
    recentInvoices: InvoiceData[];
    recentPayments: PaymentData[];
}

export async function fetchDashboardStats(): Promise<DashboardStats> {
    const res = await fetchAPI<{ success: boolean; data: DashboardStats }>('/dashboard/stats');
    return res.data;
}

// ===== Currency Formatter =====
export function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
}

export function formatDate(date: string): string {
    return new Date(date).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });
}
