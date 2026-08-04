/**
 * API Client utility untuk Qalcuity Web App
 * Menyediakan fungsi fetch yang konsisten untuk semua halaman
 */

const API_BASE = '/api';

export interface ApiResponse<T> {
    success: boolean;
    data: T;
    total?: number;
    page?: number;
    limit?: number;
    totalPages?: number;
    error?: string;
}

export interface FetchOptions {
    method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    body?: unknown;
    params?: Record<string, string>;
    headers?: Record<string, string>;
}

/**
 * Generic fetch function untuk API calls
 */
export async function fetchApi<T>(
    endpoint: string,
    options: FetchOptions = {}
): Promise<ApiResponse<T>> {
    const { method = 'GET', body, params, headers = {} } = options;

    let url = `${API_BASE}${endpoint}`;

    if (params) {
        const searchParams = new URLSearchParams(params);
        url += `?${searchParams.toString()}`;
    }

    const fetchOptions: RequestInit = {
        method,
        headers: {
            'Content-Type': 'application/json',
            ...headers,
        },
    };

    if (body && method !== 'GET') {
        fetchOptions.body = JSON.stringify(body);
    }

    const response = await fetch(url, fetchOptions);
    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error || `API Error: ${response.status}`);
    }

    return data;
}

/**
 * Hook-style fetch dengan state management
 * Digunakan di halaman-halaman untuk fetch data
 */
export function createApiFetcher<T>(endpoint: string) {
    return {
        getAll: (params?: Record<string, string>) =>
            fetchApi<T[]>(endpoint, { params }),

        getById: (id: string) =>
            fetchApi<T>(`${endpoint}/${id}`),

        create: (data: Partial<T>) =>
            fetchApi<T>(endpoint, { method: 'POST', body: data }),

        update: (id: string, data: Partial<T>) =>
            fetchApi<T>(`${endpoint}/${id}`, { method: 'PUT', body: data }),

        delete: (id: string) =>
            fetchApi<void>(`${endpoint}/${id}`, { method: 'DELETE' }),
    };
}

// ============================================
// API Clients per Module
// ============================================

// Finance
export const invoiceApi = createApiFetcher<{
    id: string;
    invoiceNumber: string;
    customerName: string;
    subtotal: number;
    tax: number;
    total: number;
    currency: string;
    status: string;
    dueDate: string;
    items?: Array<{ description: string; quantity: number; unitPrice: number; total: number }>;
    createdAt: string;
}>('/finance/invoices');

export const quotationApi = createApiFetcher<{
    id: string;
    quotationNumber: string;
    customerName: string;
    subtotal: number;
    tax: number;
    total: number;
    currency: string;
    status: string;
    validUntil: string;
    items?: Array<{ description: string; quantity: number; unitPrice: number; total: number }>;
    createdAt: string;
}>('/finance/quotations');

export const paymentApi = createApiFetcher<{
    id: string;
    paymentNumber: string;
    invoiceId: string;
    customerName: string;
    amount: number;
    method: string;
    status: string;
    date: string;
    reference: string;
    createdAt: string;
}>('/finance/payments');

export const purchaseOrderApi = createApiFetcher<{
    id: string;
    poNumber: string;
    supplierName: string;
    total: number;
    currency: string;
    status: string;
    expectedDelivery: string;
    items?: Array<{ description: string; quantity: number; unitPrice: number; total: number }>;
    createdAt: string;
}>('/finance/purchase-orders');

// CRM
export const leadApi = createApiFetcher<{
    id: string;
    name: string;
    email: string;
    phone: string;
    company: string;
    source: string;
    status: string;
    value: number;
    assignedTo: string;
    createdAt: string;
}>('/crm/leads');

export const contactApi = createApiFetcher<{
    id: string;
    name: string;
    email: string;
    phone: string;
    company: string;
    type: string;
    position: string;
    address: string;
    notes: string;
    createdAt: string;
}>('/crm/contacts');

export const dealApi = createApiFetcher<{
    id: string;
    name: string;
    company: string;
    value: number;
    stage: string;
    probability: number;
    assignedTo: string;
    expectedCloseDate: string;
    createdAt: string;
}>('/crm/deals');

// Inventory
export const productApi = createApiFetcher<{
    id: string;
    sku: string;
    name: string;
    description: string;
    category: string;
    unitPrice: number;
    costPrice: number;
    currency: string;
    stock: number;
    minStock: number;
    unit: string;
    status: string;
    createdAt: string;
}>('/inventory/products');

// HR
export const employeeApi = createApiFetcher<{
    id: string;
    employeeId: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    position: string;
    department: string;
    startDate: string;
    status: string;
    salary: number;
    currency: string;
    createdAt: string;
}>('/hr/employees');
