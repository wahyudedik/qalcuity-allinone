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
 *
 * Environment Configuration:
 * - EXPO_PUBLIC_API_URL env var (set in .env or EAS build)
 * - Fallback to app.json extra.apiUrl via expo-constants
 * - Final fallback: http://localhost:3000/api (local dev)
 *
 * To configure API URL:
 * 1. Copy .env.example to .env and set EXPO_PUBLIC_API_URL
 * 2. Or set via EAS build environment variables
 * 3. Or update app.json > expo > extra > apiUrl
 */

/// <reference path="../types/env.d.ts" />

import AsyncStorage from '@react-native-async-storage/async-storage';

// API Configuration — configurable base URL (no more hardcoded)
// Priority: EXPO_PUBLIC_API_URL env var > app.json extra.apiUrl > localhost fallback
function getBaseUrl(): string {
    // EXPO_PUBLIC_* env vars are injected by Metro bundler at build time (Expo 49+)
    if (process.env.EXPO_PUBLIC_API_URL) {
        return process.env.EXPO_PUBLIC_API_URL;
    }

    // Fallback: try expo-constants (available when package is installed)
    try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const Constants = require('expo-constants');
        const extraApiUrl = Constants?.expoConfig?.extra?.apiUrl;
        if (extraApiUrl) return extraApiUrl;
    } catch {
        // expo-constants not available — continue to fallback
    }

    // Final fallback: local development
    return 'http://localhost:3000/api';
}

const API_BASE_URL = getBaseUrl();

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
// SHARED TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/** Generic paginated API response */
export interface PaginatedResponse<T> {
    success: boolean;
    data: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

/** Generic single-item API response */
export interface SingleResponse<T> {
    success: boolean;
    data: T;
}

/** Generic mutation API response (no data returned) */
export interface MutationResponse {
    success: boolean;
    data?: unknown;
    error?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MOBILE CRUD TYPES — Contacts
// ═══════════════════════════════════════════════════════════════════════════════

/** Contact response from mobile API (list + detail) */
export interface MobileContact {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    type: string;
    company: string | null;
    address: string | null;
    city: string | null;
    province: string | null;
    postalCode: string | null;
    taxId: string | null;
    notes: string | null;
    isActive: boolean;
    totalDeals: number;
    totalInvoices: number;
    createdAt: string;
    updatedAt: string;
}

/** Payload for creating a contact (POST /api/mobile/crm/contacts) */
export interface CreateContactPayload {
    name: string;
    email?: string | null;
    phone?: string | null;
    type?: string;
    company?: string | null;
    position?: string | null;
    address?: string | null;
    city?: string | null;
    province?: string | null;
    postalCode?: string | null;
    taxId?: string | null;
    notes?: string | null;
}

/** Payload for updating a contact (PUT /api/mobile/crm/contacts/:id) */
export interface UpdateContactPayload {
    name?: string;
    email?: string | null;
    phone?: string | null;
    type?: string;
    company?: string | null;
    position?: string | null;
    address?: string | null;
    city?: string | null;
    province?: string | null;
    postalCode?: string | null;
    taxId?: string | null;
    notes?: string | null;
    isActive?: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MOBILE CRUD TYPES — Products
// ═══════════════════════════════════════════════════════════════════════════════

/** Product response from mobile API (list + detail) */
export interface MobileProduct {
    id: string;
    sku: string;
    name: string;
    description: string | null;
    unit: string;
    price: number;
    cost: number;
    stock: number;
    minStock: number;
    isActive: boolean;
    categoryId: string | null;
    categoryName: string | null;
    isLowStock: boolean;
    createdAt: string;
}

/** Payload for creating a product (POST /api/mobile/inventory/products) */
export interface CreateProductPayload {
    sku: string;
    name: string;
    description?: string | null;
    unit?: string;
    price?: number;
    cost?: number;
    stock?: number;
    minStock?: number;
    categoryId?: string | null;
}

/** Payload for updating a product (PUT /api/mobile/inventory/products/:id) */
export interface UpdateProductPayload {
    sku?: string;
    name?: string;
    description?: string | null;
    unit?: string;
    price?: number;
    cost?: number;
    stock?: number;
    minStock?: number;
    categoryId?: string | null;
    isActive?: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MOBILE CRUD TYPES — Invoices
// ═══════════════════════════════════════════════════════════════════════════════

/** Invoice item for create/update payloads */
export interface InvoiceItemPayload {
    description: string;
    quantity: number;
    unitPrice: number;
    total?: number;
}

/** Invoice item in response */
export interface InvoiceItemResponse {
    id: string;
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
}

/** Invoice list response from mobile API */
export interface MobileInvoice {
    id: string;
    invoiceNumber: string;
    customerName: string;
    contactId: string | null;
    subtotal: number;
    tax: number;
    total: number;
    currency: string;
    status: string;
    dueDate: string;
    createdAt: string;
    notes: string;
    items: InvoiceItemResponse[];
    paidAmount: number;
}

/** Invoice detail response from mobile API (same as list but includes more detail) */
export interface MobileInvoiceDetail extends MobileInvoice { }

/** Payload for creating an invoice (POST /api/mobile/finance/invoices) */
export interface CreateInvoicePayload {
    contactId?: string | null;
    customerName?: string;
    customerEmail?: string | null;
    customerPhone?: string | null;
    customerAddress?: string | null;
    items: InvoiceItemPayload[];
    dueDate?: string | null;
    taxRate?: number;
    taxCode?: string | null;
    taxAmount?: number;
    notes?: string | null;
}

/** Payload for updating an invoice (PUT /api/mobile/finance/invoices/:id) */
export interface UpdateInvoicePayload {
    status?: string;
    dueDate?: string | null;
    taxRate?: number;
    taxCode?: string | null;
    taxAmount?: number;
    notes?: string | null;
    items?: InvoiceItemPayload[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// MOBILE CRUD TYPES — Employees
// ═══════════════════════════════════════════════════════════════════════════════

/** Employee response from mobile API (list + detail) */
export interface MobileEmployee {
    id: string;
    employeeId: string;
    name: string;
    email: string;
    phone: string;
    position: string;
    department: string;
    joinDate: string;
    salary: number;
    status: string;
    createdAt: string;
    updatedAt?: string;
}

/** Payload for creating an employee (POST /api/mobile/hr/employees) */
export interface CreateEmployeePayload {
    name: string;
    email: string;
    phone?: string | null;
    position: string;
    department: string;
    joinDate: string;
    salary?: number;
    status?: string;
}

/** Payload for updating an employee (PUT /api/mobile/hr/employees/:id) */
export interface UpdateEmployeePayload {
    name?: string;
    email?: string;
    phone?: string | null;
    position?: string;
    department?: string;
    joinDate?: string;
    salary?: number;
    status?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MOBILE CRUD — Query Parameters
// ═══════════════════════════════════════════════════════════════════════════════

/** Common pagination params for list endpoints */
export interface PaginationParams {
    page?: number;
    limit?: number;
    search?: string;
}

/** Contact-specific list params */
export interface ContactListParams extends PaginationParams {
    type?: string;
}

/** Product-specific list params */
export interface ProductListParams extends PaginationParams {
    category?: string;
}

/** Invoice-specific list params */
export interface InvoiceListParams extends PaginationParams {
    status?: string;
}

/** Employee-specific list params */
export interface EmployeeListParams extends PaginationParams {
    status?: string;
    department?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MOBILE CRUD — Helper to build query string
// ═══════════════════════════════════════════════════════════════════════════════

function buildQueryString(params?: Record<string, string | number | undefined>): string {
    if (!params) return '';
    const entries = Object.entries(params).filter(
        ([, value]) => value !== undefined && value !== '' && value !== null
    );
    if (entries.length === 0) return '';
    const searchParams = new URLSearchParams();
    entries.forEach(([key, value]) => {
        searchParams.set(key, String(value));
    });
    return `?${searchParams.toString()}`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MOBILE CRUD — Contacts API
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/mobile/crm/contacts — List contacts (paginated, searchable).
 */
export async function getContacts(
    params?: ContactListParams
): Promise<PaginatedResponse<MobileContact>> {
    const query = buildQueryString({
        page: params?.page,
        limit: params?.limit,
        search: params?.search,
        type: params?.type,
    });
    return fetchAPI<PaginatedResponse<MobileContact>>(
        `/crm/contacts${query}`
    );
}

/**
 * GET /api/mobile/crm/contacts/:id — Get contact detail.
 */
export async function getContact(id: string): Promise<MobileContact> {
    const res = await fetchAPI<SingleResponse<MobileContact>>(
        `/crm/contacts/${id}`
    );
    return res.data;
}

/**
 * POST /api/mobile/crm/contacts — Create new contact.
 */
export async function createContact(data: CreateContactPayload): Promise<MobileContact> {
    const res = await fetchAPI<SingleResponse<MobileContact>>('/crm/contacts', {
        method: 'POST',
        body: JSON.stringify(data),
    });
    return res.data;
}

/**
 * PUT /api/mobile/crm/contacts/:id — Update contact.
 */
export async function updateContact(
    id: string,
    data: UpdateContactPayload
): Promise<MobileContact> {
    const res = await fetchAPI<SingleResponse<MobileContact>>(
        `/crm/contacts/${id}`,
        {
            method: 'PUT',
            body: JSON.stringify(data),
        }
    );
    return res.data;
}

/**
 * DELETE /api/mobile/crm/contacts/:id — Delete contact.
 */
export async function deleteContact(id: string): Promise<void> {
    await fetchAPI<MutationResponse>(`/crm/contacts/${id}`, {
        method: 'DELETE',
    });
}

// ═══════════════════════════════════════════════════════════════════════════════
// MOBILE CRUD — Products API
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/mobile/inventory/products — List products (paginated, searchable).
 */
export async function getProducts(
    params?: ProductListParams
): Promise<PaginatedResponse<MobileProduct>> {
    const query = buildQueryString({
        page: params?.page,
        limit: params?.limit,
        search: params?.search,
        category: params?.category,
    });
    return fetchAPI<PaginatedResponse<MobileProduct>>(
        `/inventory/products${query}`
    );
}

/**
 * GET /api/mobile/inventory/products/:id — Get product detail.
 */
export async function getProduct(id: string): Promise<MobileProduct> {
    const res = await fetchAPI<SingleResponse<MobileProduct>>(
        `/inventory/products/${id}`
    );
    return res.data;
}

/**
 * POST /api/mobile/inventory/products — Create new product.
 */
export async function createProduct(data: CreateProductPayload): Promise<MobileProduct> {
    const res = await fetchAPI<SingleResponse<MobileProduct>>('/inventory/products', {
        method: 'POST',
        body: JSON.stringify(data),
    });
    return res.data;
}

/**
 * PUT /api/mobile/inventory/products/:id — Update product.
 */
export async function updateProduct(
    id: string,
    data: UpdateProductPayload
): Promise<MobileProduct> {
    const res = await fetchAPI<SingleResponse<MobileProduct>>(
        `/inventory/products/${id}`,
        {
            method: 'PUT',
            body: JSON.stringify(data),
        }
    );
    return res.data;
}

/**
 * DELETE /api/mobile/inventory/products/:id — Delete product.
 */
export async function deleteProduct(id: string): Promise<void> {
    await fetchAPI<MutationResponse>(`/inventory/products/${id}`, {
        method: 'DELETE',
    });
}

// ═══════════════════════════════════════════════════════════════════════════════
// MOBILE CRUD — Invoices API
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/mobile/finance/invoices — List invoices (paginated, searchable).
 */
export async function getInvoices(
    params?: InvoiceListParams
): Promise<PaginatedResponse<MobileInvoice>> {
    const query = buildQueryString({
        page: params?.page,
        limit: params?.limit,
        search: params?.search,
        status: params?.status,
    });
    return fetchAPI<PaginatedResponse<MobileInvoice>>(
        `/finance/invoices${query}`
    );
}

/**
 * GET /api/mobile/finance/invoices/:id — Get invoice detail.
 */
export async function getInvoice(id: string): Promise<MobileInvoiceDetail> {
    const res = await fetchAPI<SingleResponse<MobileInvoiceDetail>>(
        `/finance/invoices/${id}`
    );
    return res.data;
}

/**
 * POST /api/mobile/finance/invoices — Create new invoice with items.
 */
export async function createInvoice(data: CreateInvoicePayload): Promise<MobileInvoice> {
    const res = await fetchAPI<SingleResponse<MobileInvoice>>('/finance/invoices', {
        method: 'POST',
        body: JSON.stringify(data),
    });
    return res.data;
}

/**
 * PUT /api/mobile/finance/invoices/:id — Update invoice.
 */
export async function updateInvoice(
    id: string,
    data: UpdateInvoicePayload
): Promise<MobileInvoice> {
    const res = await fetchAPI<SingleResponse<MobileInvoice>>(
        `/finance/invoices/${id}`,
        {
            method: 'PUT',
            body: JSON.stringify(data),
        }
    );
    return res.data;
}

/**
 * DELETE /api/mobile/finance/invoices/:id — Soft delete invoice.
 */
export async function deleteInvoice(id: string): Promise<void> {
    await fetchAPI<MutationResponse>(`/finance/invoices/${id}`, {
        method: 'DELETE',
    });
}

// ═══════════════════════════════════════════════════════════════════════════════
// MOBILE CRUD — Employees API
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/mobile/hr/employees — List employees (paginated, searchable).
 */
export async function getEmployees(
    params?: EmployeeListParams
): Promise<PaginatedResponse<MobileEmployee>> {
    const query = buildQueryString({
        page: params?.page,
        limit: params?.limit,
        search: params?.search,
        status: params?.status,
        department: params?.department,
    });
    return fetchAPI<PaginatedResponse<MobileEmployee>>(
        `/hr/employees${query}`
    );
}

/**
 * GET /api/mobile/hr/employees/:id — Get employee detail.
 */
export async function getEmployee(id: string): Promise<MobileEmployee> {
    const res = await fetchAPI<SingleResponse<MobileEmployee>>(
        `/hr/employees/${id}`
    );
    return res.data;
}

/**
 * POST /api/mobile/hr/employees — Create new employee.
 */
export async function createEmployee(data: CreateEmployeePayload): Promise<MobileEmployee> {
    const res = await fetchAPI<SingleResponse<MobileEmployee>>('/hr/employees', {
        method: 'POST',
        body: JSON.stringify(data),
    });
    return res.data;
}

/**
 * PUT /api/mobile/hr/employees/:id — Update employee.
 */
export async function updateEmployee(
    id: string,
    data: UpdateEmployeePayload
): Promise<MobileEmployee> {
    const res = await fetchAPI<SingleResponse<MobileEmployee>>(
        `/hr/employees/${id}`,
        {
            method: 'PUT',
            body: JSON.stringify(data),
        }
    );
    return res.data;
}

/**
 * DELETE /api/mobile/hr/employees/:id — Delete employee.
 */
export async function deleteEmployee(id: string): Promise<void> {
    await fetchAPI<MutationResponse>(`/hr/employees/${id}`, {
        method: 'DELETE',
    });
}

// ═══════════════════════════════════════════════════════════════════════════════
// LEGACY READ-ONLY APIs (kept for backward compatibility)
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

/** Revenue stats from the dashboard API */
export interface DashboardRevenue {
    current: number;
    previous: number;
    change: number;
    currency: string;
}

/** Outstanding invoices summary */
export interface DashboardOutstandingInvoices {
    count: number;
    total: number;
}

/** Expenses summary */
export interface DashboardExpenses {
    current: number;
    previous: number;
    change: number;
}

/** Deals won summary */
export interface DashboardDealsWon {
    current: number;
    previous: number;
    change: number;
}

/** New leads summary */
export interface DashboardNewLeads {
    current: number;
    previous: number;
    change: number;
}

/** Employees summary */
export interface DashboardEmployees {
    total: number;
    active: number;
}

/** Products summary */
export interface DashboardProducts {
    total: number;
    lowStock: number;
    lowStockItems: Array<{ id: string; name: string; stock: number; minStock: number }>;
}

/** Recent activity item */
export interface DashboardActivity {
    id: string;
    icon: string;
    title: string;
    description: string;
    amount: string;
    timestamp: string;
    moduleId: string;
}

/** Alert item */
export interface DashboardAlert {
    id: string;
    type: string;
    title: string;
    message: string;
    moduleId: string;
}

/** Full dashboard stats — matches the /api/dashboard/stats response shape */
export interface DashboardStats {
    revenue: DashboardRevenue;
    outstandingInvoices: DashboardOutstandingInvoices;
    expenses: DashboardExpenses;
    activeDeals: number;
    dealsWon: DashboardDealsWon;
    newLeads: DashboardNewLeads;
    employees: DashboardEmployees;
    products: DashboardProducts;
    recentActivities: DashboardActivity[];
    alerts: DashboardAlert[];
}

/** Raw API response wrapper */
interface DashboardStatsResponse {
    success: boolean;
    data: DashboardStats;
}

/**
 * Fetch dashboard statistics from the server.
 * Returns the full stats object including revenue, CRM, HR, inventory, activities, and alerts.
 */
export async function fetchDashboardStats(): Promise<DashboardStats> {
    const res = await fetchAPI<DashboardStatsResponse>('/dashboard/stats');
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
