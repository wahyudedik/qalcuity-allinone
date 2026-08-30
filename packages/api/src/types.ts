// ============================================
// @qalcuity/api — API Types
// ============================================

import type { ID, Timestamp } from '@qalcuity/types';

// --------------------------------------------
// HTTP Methods
// --------------------------------------------

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

// --------------------------------------------
// Request Types
// --------------------------------------------

export interface FetchOptions {
    method?: HttpMethod;
    body?: unknown;
    params?: Record<string, string | number | boolean | undefined | null>;
    headers?: Record<string, string>;
    signal?: AbortSignal;
}

export interface RequestOptions extends FetchOptions {
    /** Base URL override (default: API_BASE) */
    baseUrl?: string;
    /** Custom timeout in milliseconds (default: 30000) */
    timeout?: number;
    /** Whether to include credentials (cookies) */
    credentials?: RequestCredentials;
}

// --------------------------------------------
// Response Types
// --------------------------------------------

export interface ApiResponse<T> {
    success: boolean;
    data: T;
    message?: string;
    error?: string;
}

export interface ApiResponseWithMeta<T> {
    success: boolean;
    data: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export interface ApiErrorResponse {
    success: false;
    error: string;
    message?: string;
    details?: Record<string, string>;
    statusCode: number;
}

// --------------------------------------------
// Pagination
// --------------------------------------------

export interface PaginationParams {
    page?: number;
    limit?: number;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}

export interface PaginationMeta {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

// --------------------------------------------
// Tenant Isolation Headers
// --------------------------------------------

export interface TenantHeaders {
    'x-tenant-id'?: string;
    'x-user-id'?: string;
    'x-user-role'?: string;
}

// --------------------------------------------
// API Client Configuration
// --------------------------------------------

export interface ApiClientConfig {
    /** Base URL for all API requests (default: '/api') */
    baseUrl?: string;
    /** Default headers to include in all requests */
    defaultHeaders?: Record<string, string>;
    /** Default timeout in milliseconds (default: 30000) */
    timeout?: number;
    /** Whether to include credentials (default: 'same-origin') */
    credentials?: RequestCredentials;
    /** Custom error handler */
    onError?: (error: ApiErrorResponse) => void;
    /** Token provider function for auth */
    getToken?: () => string | Promise<string | null> | null;
}

// --------------------------------------------
// API Client Instance
// --------------------------------------------

export interface ApiClient {
    /** Make a GET request */
    get<T>(endpoint: string, options?: RequestOptions): Promise<ApiResponse<T>>;

    /** Make a POST request */
    post<T>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<ApiResponse<T>>;

    /** Make a PUT request */
    put<T>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<ApiResponse<T>>;

    /** Make a PATCH request */
    patch<T>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<ApiResponse<T>>;

    /** Make a DELETE request */
    delete<T>(endpoint: string, options?: RequestOptions): Promise<ApiResponse<T>>;

    /** Get paginated list */
    list<T>(endpoint: string, params?: PaginationParams): Promise<ApiResponseWithMeta<T>>;

    /** Update default configuration */
    configure(config: Partial<ApiClientConfig>): void;
}

// --------------------------------------------
// Upload Types
// --------------------------------------------

export interface UploadOptions {
    /** Additional form data fields */
    fields?: Record<string, string>;
    /** Progress callback */
    onProgress?: (progress: UploadProgress) => void;
    /** Abort signal */
    signal?: AbortSignal;
}

export interface UploadProgress {
    loaded: number;
    total: number;
    percentage: number;
}

export interface UploadResponse {
    success: boolean;
    data?: {
        id: string;
        url: string;
        filename: string;
        originalName: string;
        mimeType: string;
        size: number;
    };
    error?: string;
}

// --------------------------------------------
// Batch / Bulk Operation Types
// --------------------------------------------

export interface BatchRequest<T> {
    operations: Array<{
        method: HttpMethod;
        endpoint: string;
        body?: T;
    }>;
}

export interface BatchResponse<T> {
    results: Array<{
        success: boolean;
        data?: T;
        error?: string;
        statusCode: number;
    }>;
}

// --------------------------------------------
// WebSocket Types (for real-time updates)
// --------------------------------------------

export interface WebSocketMessage<T = unknown> {
    type: string;
    payload: T;
    timestamp: Timestamp;
    tenantId: ID;
}

export interface WebSocketConfig {
    url: string;
    reconnect?: boolean;
    reconnectInterval?: number;
    maxReconnectAttempts?: number;
    onMessage?: (message: WebSocketMessage) => void;
    onConnect?: () => void;
    onDisconnect?: () => void;
    onError?: (error: Event) => void;
}
