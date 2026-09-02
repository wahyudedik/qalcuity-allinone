/**
 * API Client — Qalcuity Mobile
 * 
 * Handles all API communication with the server.
 * Includes JWT token storage, authorization headers, and automatic token refresh.
 * 
 * Token Strategy:
 * - Access token stored in AsyncStorage
 * - Refresh token stored in AsyncStorage
 * - Automatic refresh on 401 responses
 * - Logout on refresh failure
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// API Configuration
const API_BASE_URL = 'http://localhost:3000/api';

// ─── Token Storage Keys ───────────────────────────────────────────────────────

const TOKEN_KEY = '@qalcuity:auth_token';
const REFRESH_TOKEN_KEY = '@qalcuity:refresh_token';
const USER_KEY = '@qalcuity:user';

// ─── Token Management ─────────────────────────────────────────────────────────

export async function getStoredToken(): Promise<string | null> {
    try {
        return await AsyncStorage.getItem(TOKEN_KEY);
    } catch {
        return null;
    }
}

export async function getStoredRefreshToken(): Promise<string | null> {
    try {
        return await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
    } catch {
        return null;
    }
}

export async function getStoredUser(): Promise<MobileUser | null> {
    try {
        const json = await AsyncStorage.getItem(USER_KEY);
        return json ? JSON.parse(json) : null;
    } catch {
        return null;
    }
}

export async function storeAuthData(
    token: string,
    refreshToken: string,
    user: MobileUser
): Promise<void> {
    try {
        await AsyncStorage.setItem(TOKEN_KEY, token);
        await AsyncStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
        await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
    } catch (error) {
        console.error('[API] Failed to store auth data:', error);
    }
}

export async function clearAuthData(): Promise<void> {
    try {
        await AsyncStorage.removeItem(TOKEN_KEY);
        await AsyncStorage.removeItem(REFRESH_TOKEN_KEY);
        await AsyncStorage.removeItem(USER_KEY);
    } catch (error) {
        console.error('[API] Failed to clear auth data:', error);
    }
}

// ─── Token Refresh ────────────────────────────────────────────────────────────

let isRefreshing = false;
let refreshPromise: Promise<string> | null = null;

/**
 * Refresh the access token using the stored refresh token.
 * Deduplicates concurrent refresh requests.
 */
async function refreshAccessToken(): Promise<string> {
    if (isRefreshing && refreshPromise) {
        return refreshPromise;
    }

    isRefreshing = true;
    refreshPromise = (async () => {
        try {
            const refreshToken = await getStoredRefreshToken();
            if (!refreshToken) {
                throw new Error('No refresh token');
            }

            const response = await fetch(`${API_BASE_URL}/mobile/auth/refresh`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refreshToken }),
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.error || 'Refresh failed');
            }

            // Store new tokens
            const user = await getStoredUser();
            if (user) {
                await storeAuthData(data.token, data.refreshToken, user);
            }

            return data.token;
        } catch (error) {
            // Refresh failed — clear all auth data
            await clearAuthData();
            throw error;
        } finally {
            isRefreshing = false;
            refreshPromise = null;
        }
    })();

    return refreshPromise;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MobileUser {
    id: string;
    email: string;
    name: string;
    role: string;
    tenantId: string;
    avatar?: string | null;
    isActive: boolean;
}

// ─── Generic Fetch Helper ─────────────────────────────────────────────────────

/**
 * Generic fetch helper with error handling, token injection, and auto-refresh.
 */
async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;

    // Get stored token
    const token = await getStoredToken();

    // Build headers
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options?.headers as Record<string, string> || {}),
    };

    // Add Authorization header if token exists
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    try {
        const response = await fetch(url, {
            ...options,
            headers,
        });

        // If 401 and we have a refresh token, try refreshing
        if (response.status === 401 && token) {
            try {
                const newToken = await refreshAccessToken();

                // Retry with new token
                headers['Authorization'] = `Bearer ${newToken}`;
                const retryResponse = await fetch(url, {
                    ...options,
                    headers,
                });

                if (!retryResponse.ok) {
                    throw new Error(`API Error: ${retryResponse.status} ${retryResponse.statusText}`);
                }

                return await retryResponse.json() as T;
            } catch {
                // Refresh failed — throw auth error
                throw new AuthError('Sesi telah berakhir. Silakan login kembali.');
            }
        }

        if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            const message = errorData?.error || `API Error: ${response.status} ${response.statusText}`;
            throw new Error(message);
        }

        const data = await response.json();
        return data as T;
    } catch (error) {
        if (error instanceof AuthError) {
            throw error;
        }
        if (error instanceof Error) {
            throw new Error(`Network error: ${error.message}`);
        }
        throw new Error('Unknown error occurred');
    }
}

// ─── Auth Error Class ─────────────────────────────────────────────────────────

export class AuthError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'AuthError';
    }
}

// ─── Auth API ─────────────────────────────────────────────────────────────────

export interface AuthResponse {
    success: boolean;
    user?: MobileUser;
    token?: string;
    refreshToken?: string;
    error?: string;
}

export async function loginAPI(
    email: string,
    password: string
): Promise<{ user: MobileUser; token: string; refreshToken: string }> {
    const res = await fetchAPI<AuthResponse>('/mobile/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
    });

    if (!res.success || !res.user || !res.token || !res.refreshToken) {
        throw new Error(res.error || 'Login gagal');
    }

    // Store auth data
    await storeAuthData(res.token, res.refreshToken, res.user);

    return { user: res.user, token: res.token, refreshToken: res.refreshToken };
}

export interface RegisterResponse {
    success: boolean;
    user?: MobileUser;
    token?: string;
    refreshToken?: string;
    error?: string;
}

export async function registerAPI(
    name: string,
    email: string,
    password: string,
    companyName: string
): Promise<{ user: MobileUser; token: string; refreshToken: string }> {
    const res = await fetchAPI<RegisterResponse>('/mobile/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name, email, password, companyName }),
    });

    if (!res.success || !res.user || !res.token || !res.refreshToken) {
        throw new Error(res.error || 'Registrasi gagal');
    }

    // Store auth data
    await storeAuthData(res.token, res.refreshToken, res.user);

    return { user: res.user, token: res.token, refreshToken: res.refreshToken };
}

export async function getMeAPI(): Promise<MobileUser> {
    const res = await fetchAPI<{ success: boolean; user?: MobileUser; error?: string }>('/mobile/auth/me');

    if (!res.success || !res.user) {
        throw new Error(res.error || 'Gagal mengambil data user');
    }

    // Update stored user
    const token = await getStoredToken();
    const refreshToken = await getStoredRefreshToken();
    if (token && refreshToken) {
        await storeAuthData(token, refreshToken, res.user);
    }

    return res.user;
}

export async function logoutAPI(): Promise<void> {
    await clearAuthData();
}

// ═══════════════════════════════════════════════════════════════════════════════
// BUSINESS DATA APIs
// ═══════════════════════════════════════════════════════════════════════════════

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
