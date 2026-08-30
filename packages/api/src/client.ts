// ============================================
// @qalcuity/api — API Client
// Fetch wrapper dengan auth, error handling, tenant isolation
// ============================================

import {
    ApiClient,
    ApiClientConfig,
    ApiResponse,
    ApiResponseWithMeta,
    RequestOptions,
    PaginationParams,
} from './types';
import { parseApiError, NetworkError } from './errors';

// --------------------------------------------
// Default Configuration
// --------------------------------------------

const DEFAULT_CONFIG: ApiClientConfig = {
    baseUrl: '/api',
    defaultHeaders: {},
    timeout: 30000,
    credentials: 'same-origin',
    getToken: undefined,
};

// --------------------------------------------
// Create API Client
// --------------------------------------------

export function createApiClient(config: ApiClientConfig = {}): ApiClient {
    let currentConfig: ApiClientConfig = { ...DEFAULT_CONFIG, ...config };

    /**
     * Build full URL with query params
     */
    function buildUrl(endpoint: string, params?: Record<string, string | number | boolean | undefined | null>): string {
        const baseUrl = currentConfig.baseUrl || '/api';
        let url = `${baseUrl}${endpoint}`;

        if (params) {
            const searchParams = new URLSearchParams();
            for (const [key, value] of Object.entries(params)) {
                if (value !== undefined && value !== null) {
                    searchParams.append(key, String(value));
                }
            }
            const queryString = searchParams.toString();
            if (queryString) {
                url += `?${queryString}`;
            }
        }

        return url;
    }

    /**
     * Build headers with auth token and tenant isolation
     */
    async function buildHeaders(customHeaders?: Record<string, string>): Promise<Record<string, string>> {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            ...currentConfig.defaultHeaders,
            ...customHeaders,
        };

        // Add auth token if available
        if (currentConfig.getToken) {
            try {
                const token = await currentConfig.getToken();
                if (token) {
                    headers['Authorization'] = `Bearer ${token}`;
                }
            } catch {
                // Token provider failed, continue without auth
            }
        }

        return headers;
    }

    /**
     * Core fetch function with timeout, error handling
     */
    async function request<T>(
        endpoint: string,
        options: RequestOptions = {}
    ): Promise<ApiResponse<T>> {
        const {
            method = 'GET',
            body,
            params,
            headers: customHeaders,
            signal,
            timeout = currentConfig.timeout,
            credentials = currentConfig.credentials,
        } = options;

        const url = buildUrl(endpoint, params);
        const headers = await buildHeaders(customHeaders);

        const fetchOptions: RequestInit = {
            method,
            headers,
            credentials,
            signal,
        };

        if (body && method !== 'GET') {
            fetchOptions.body = JSON.stringify(body);
        }

        // Timeout handling
        const controller = new AbortController();
        const timeoutId = timeout
            ? setTimeout(() => controller.abort(), timeout)
            : null;

        // Combine external signal with timeout signal
        let combinedSignal = controller.signal;
        if (signal) {
            const combined = new AbortController();
            signal.addEventListener('abort', () => combined.abort());
            controller.signal.addEventListener('abort', () => combined.abort());
            combinedSignal = combined.signal;
        }
        fetchOptions.signal = combinedSignal;

        try {
            const response = await fetch(url, fetchOptions);
            let responseData: unknown;

            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                responseData = await response.json();
            } else {
                responseData = await response.text();
            }

            if (!response.ok) {
                throw parseApiError(response.status, responseData);
            }

            return responseData as ApiResponse<T>;
        } catch (error) {
            // Re-throw ApiError instances
            if (error && typeof error === 'object' && 'statusCode' in error) {
                throw error;
            }

            // Handle AbortError (timeout or user abort)
            if (error instanceof DOMException && error.name === 'AbortError') {
                if (signal?.aborted) {
                    throw error; // User-initiated abort
                }
                throw new NetworkError('Request timeout. Coba lagi nanti.');
            }

            // Network error
            throw new NetworkError(
                error instanceof Error ? error.message : 'Gagal terhubung ke server'
            );
        } finally {
            if (timeoutId) clearTimeout(timeoutId);
        }
    }

    // --------------------------------------------
    // Client Methods
    // --------------------------------------------

    const client: ApiClient = {
        async get<T>(endpoint: string, options?: RequestOptions): Promise<ApiResponse<T>> {
            return request<T>(endpoint, { ...options, method: 'GET' });
        },

        async post<T>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<ApiResponse<T>> {
            return request<T>(endpoint, { ...options, method: 'POST', body });
        },

        async put<T>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<ApiResponse<T>> {
            return request<T>(endpoint, { ...options, method: 'PUT', body });
        },

        async patch<T>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<ApiResponse<T>> {
            return request<T>(endpoint, { ...options, method: 'PATCH', body });
        },

        async delete<T>(endpoint: string, options?: RequestOptions): Promise<ApiResponse<T>> {
            return request<T>(endpoint, { ...options, method: 'DELETE' });
        },

        async list<T>(
            endpoint: string,
            params?: PaginationParams
        ): Promise<ApiResponseWithMeta<T>> {
            return request<ApiResponseWithMeta<T>>(endpoint, { params: params as Record<string, string> })
                .then((res) => res.data as unknown as ApiResponseWithMeta<T>);
        },

        configure(newConfig: Partial<ApiClientConfig>): void {
            currentConfig = { ...currentConfig, ...newConfig };
        },
    };

    return client;
}

// --------------------------------------------
// Default Client Instance
// --------------------------------------------

export const apiClient = createApiClient();

// --------------------------------------------
// Module-Specific API Clients
// --------------------------------------------

/**
 * Finance API endpoints
 */
export const financeApi = {
    invoices: {
        list: (params?: PaginationParams) => apiClient.list<unknown>('/finance/invoices', params),
        get: (id: string) => apiClient.get<unknown>(`/finance/invoices/${id}`),
        create: (data: unknown) => apiClient.post<unknown>('/finance/invoices', data),
        update: (id: string, data: unknown) => apiClient.put<unknown>(`/finance/invoices/${id}`, data),
        delete: (id: string) => apiClient.delete<unknown>(`/finance/invoices/${id}`),
    },
    quotations: {
        list: (params?: PaginationParams) => apiClient.list<unknown>('/finance/quotations', params),
        get: (id: string) => apiClient.get<unknown>(`/finance/quotations/${id}`),
        create: (data: unknown) => apiClient.post<unknown>('/finance/quotations', data),
        update: (id: string, data: unknown) => apiClient.put<unknown>(`/finance/quotations/${id}`, data),
        delete: (id: string) => apiClient.delete<unknown>(`/finance/quotations/${id}`),
    },
    payments: {
        list: (params?: PaginationParams) => apiClient.list<unknown>('/finance/payments', params),
        get: (id: string) => apiClient.get<unknown>(`/finance/payments/${id}`),
        create: (data: unknown) => apiClient.post<unknown>('/finance/payments', data),
        update: (id: string, data: unknown) => apiClient.put<unknown>(`/finance/payments/${id}`, data),
        delete: (id: string) => apiClient.delete<unknown>(`/finance/payments/${id}`),
    },
    purchaseOrders: {
        list: (params?: PaginationParams) => apiClient.list<unknown>('/finance/purchase-orders', params),
        get: (id: string) => apiClient.get<unknown>(`/finance/purchase-orders/${id}`),
        create: (data: unknown) => apiClient.post<unknown>('/finance/purchase-orders', data),
        update: (id: string, data: unknown) => apiClient.put<unknown>(`/finance/purchase-orders/${id}`, data),
        delete: (id: string) => apiClient.delete<unknown>(`/finance/purchase-orders/${id}`),
    },
    accounts: {
        list: (params?: PaginationParams) => apiClient.list<unknown>('/finance/accounts', params),
    },
};

/**
 * CRM API endpoints
 */
export const crmApi = {
    leads: {
        list: (params?: PaginationParams) => apiClient.list<unknown>('/crm/leads', params),
        get: (id: string) => apiClient.get<unknown>(`/crm/leads/${id}`),
        create: (data: unknown) => apiClient.post<unknown>('/crm/leads', data),
        update: (id: string, data: unknown) => apiClient.put<unknown>(`/crm/leads/${id}`, data),
        delete: (id: string) => apiClient.delete<unknown>(`/crm/leads/${id}`),
    },
    contacts: {
        list: (params?: PaginationParams) => apiClient.list<unknown>('/crm/contacts', params),
        get: (id: string) => apiClient.get<unknown>(`/crm/contacts/${id}`),
        create: (data: unknown) => apiClient.post<unknown>('/crm/contacts', data),
        update: (id: string, data: unknown) => apiClient.put<unknown>(`/crm/contacts/${id}`, data),
        delete: (id: string) => apiClient.delete<unknown>(`/crm/contacts/${id}`),
    },
    deals: {
        list: (params?: PaginationParams) => apiClient.list<unknown>('/crm/deals', params),
        get: (id: string) => apiClient.get<unknown>(`/crm/deals/${id}`),
        create: (data: unknown) => apiClient.post<unknown>('/crm/deals', data),
        update: (id: string, data: unknown) => apiClient.put<unknown>(`/crm/deals/${id}`, data),
        delete: (id: string) => apiClient.delete<unknown>(`/crm/deals/${id}`),
    },
};

/**
 * Inventory API endpoints
 */
export const inventoryApi = {
    products: {
        list: (params?: PaginationParams) => apiClient.list<unknown>('/inventory/products', params),
        get: (id: string) => apiClient.get<unknown>(`/inventory/products/${id}`),
        create: (data: unknown) => apiClient.post<unknown>('/inventory/products', data),
        update: (id: string, data: unknown) => apiClient.put<unknown>(`/inventory/products/${id}`, data),
        delete: (id: string) => apiClient.delete<unknown>(`/inventory/products/${id}`),
    },
    categories: {
        list: (params?: PaginationParams) => apiClient.list<unknown>('/inventory/categories', params),
        create: (data: unknown) => apiClient.post<unknown>('/inventory/categories', data),
    },
    suppliers: {
        list: (params?: PaginationParams) => apiClient.list<unknown>('/inventory/suppliers', params),
        get: (id: string) => apiClient.get<unknown>(`/inventory/suppliers/${id}`),
        create: (data: unknown) => apiClient.post<unknown>('/inventory/suppliers', data),
        update: (id: string, data: unknown) => apiClient.put<unknown>(`/inventory/suppliers/${id}`, data),
        delete: (id: string) => apiClient.delete<unknown>(`/inventory/suppliers/${id}`),
    },
};

/**
 * HR API endpoints
 */
export const hrApi = {
    employees: {
        list: (params?: PaginationParams) => apiClient.list<unknown>('/hr/employees', params),
        get: (id: string) => apiClient.get<unknown>(`/hr/employees/${id}`),
        create: (data: unknown) => apiClient.post<unknown>('/hr/employees', data),
        update: (id: string, data: unknown) => apiClient.put<unknown>(`/hr/employees/${id}`, data),
        delete: (id: string) => apiClient.delete<unknown>(`/hr/employees/${id}`),
    },
    attendance: {
        list: (params?: PaginationParams) => apiClient.list<unknown>('/hr/attendance', params),
        create: (data: unknown) => apiClient.post<unknown>('/hr/attendance', data),
    },
    leaves: {
        list: (params?: PaginationParams) => apiClient.list<unknown>('/hr/leaves', params),
        get: (id: string) => apiClient.get<unknown>(`/hr/leaves/${id}`),
        create: (data: unknown) => apiClient.post<unknown>('/hr/leaves', data),
        update: (id: string, data: unknown) => apiClient.put<unknown>(`/hr/leaves/${id}`, data),
    },
    payroll: {
        list: (params?: PaginationParams) => apiClient.list<unknown>('/hr/payroll', params),
        get: (id: string) => apiClient.get<unknown>(`/hr/payroll/${id}`),
        create: (data: unknown) => apiClient.post<unknown>('/hr/payroll', data),
        update: (id: string, data: unknown) => apiClient.put<unknown>(`/hr/payroll/${id}`, data),
    },
};

/**
 * Settings API endpoints
 */
export const settingsApi = {
    profile: {
        get: () => apiClient.get<unknown>('/settings/profile'),
        update: (data: unknown) => apiClient.put<unknown>('/settings/profile', data),
    },
    company: {
        get: () => apiClient.get<unknown>('/settings/company'),
        update: (data: unknown) => apiClient.put<unknown>('/settings/company', data),
    },
    team: {
        list: () => apiClient.get<unknown>('/settings/team'),
    },
    notifications: {
        get: () => apiClient.get<unknown>('/settings/notifications'),
        update: (data: unknown) => apiClient.put<unknown>('/settings/notifications', data),
    },
    security: {
        get: () => apiClient.get<unknown>('/settings/security'),
        update: (data: unknown) => apiClient.put<unknown>('/settings/security', data),
    },
};
