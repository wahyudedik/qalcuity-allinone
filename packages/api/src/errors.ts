// ============================================
// @qalcuity/api — Custom Error Classes
// ============================================

/**
 * Base API error class
 */
export class ApiError extends Error {
    /** Machine-readable error code (e.g. 'VALIDATION_ERROR', 'NETWORK_ERROR') */
    public readonly code: string;
    public readonly statusCode: number;
    public readonly statusText: string;
    public readonly body?: unknown;

    constructor(
        message: string,
        statusCode: number,
        statusText?: string,
        body?: unknown,
        code: string = 'API_ERROR'
    ) {
        super(message);
        this.name = 'ApiError';
        this.code = code;
        this.statusCode = statusCode;
        this.statusText = statusText || 'Error';
        this.body = body;
    }
}

/**
 * 400 — Bad Request / Validation Error
 */
export class BadRequestError extends ApiError {
    public readonly validationErrors?: Record<string, string>;

    constructor(message = 'Request tidak valid', validationErrors?: Record<string, string>) {
        super(message, 400, 'Bad Request', undefined, 'VALIDATION_ERROR');
        this.name = 'BadRequestError';
        this.validationErrors = validationErrors;
    }
}

/**
 * 401 — Unauthorized
 */
export class UnauthorizedError extends ApiError {
    constructor(message = 'Anda harus login terlebih dahulu') {
        super(message, 401, 'Unauthorized', undefined, 'UNAUTHORIZED');
        this.name = 'UnauthorizedError';
    }
}

/**
 * 403 — Forbidden
 */
export class ForbiddenError extends ApiError {
    constructor(message = 'Anda tidak memiliki akses ke resource ini') {
        super(message, 403, 'Forbidden', undefined, 'FORBIDDEN');
        this.name = 'ForbiddenError';
    }
}

/**
 * 404 — Not Found
 */
export class NotFoundError extends ApiError {
    constructor(resource = 'Resource', id?: string) {
        const msg = id ? `${resource} dengan ID "${id}" tidak ditemukan` : `${resource} tidak ditemukan`;
        super(msg, 404, 'Not Found', undefined, 'NOT_FOUND');
        this.name = 'NotFoundError';
    }
}

/**
 * 409 — Conflict
 */
export class ConflictError extends ApiError {
    constructor(message = 'Data sudah ada atau konflik') {
        super(message, 409, 'Conflict', undefined, 'CONFLICT');
        this.name = 'ConflictError';
    }
}

/**
 * 422 — Unprocessable Entity
 */
export class UnprocessableEntityError extends ApiError {
    constructor(message = 'Data tidak dapat diproses') {
        super(message, 422, 'Unprocessable Entity', undefined, 'UNPROCESSABLE_ENTITY');
        this.name = 'UnprocessableEntityError';
    }
}

/**
 * 429 — Too Many Requests (Rate Limit)
 */
export class RateLimitError extends ApiError {
    public readonly retryAfter?: number;

    constructor(message = 'Terlalu banyak request. Coba lagi nanti.', retryAfter?: number) {
        super(message, 429, 'Too Many Requests', undefined, 'RATE_LIMITED');
        this.name = 'RateLimitError';
        this.retryAfter = retryAfter;
    }
}

/**
 * 500 — Internal Server Error
 */
export class InternalServerError extends ApiError {
    constructor(message = 'Terjadi kesalahan pada server') {
        super(message, 500, 'Internal Server Error', undefined, 'INTERNAL_SERVER_ERROR');
        this.name = 'InternalServerError';
    }
}

/**
 * 503 — Service Unavailable
 */
export class ServiceUnavailableError extends ApiError {
    constructor(message = 'Layanan sedang tidak tersedia') {
        super(message, 503, 'Service Unavailable', undefined, 'SERVICE_UNAVAILABLE');
        this.name = 'ServiceUnavailableError';
    }
}

/**
 * Network Error (no response received)
 */
export class NetworkError extends ApiError {
    constructor(message = 'Gagal terhubung ke server. Periksa koneksi internet Anda.') {
        super(message, 0, 'Network Error', undefined, 'NETWORK_ERROR');
        this.name = 'NetworkError';
    }
}

/**
 * Parse API error response and return appropriate error class
 */
export function parseApiError(statusCode: number, body: unknown): ApiError {
    const message = extractErrorMessage(body);

    switch (statusCode) {
        case 400:
            return new BadRequestError(message, extractValidationErrors(body));
        case 401:
            return new UnauthorizedError(message);
        case 403:
            return new ForbiddenError(message);
        case 404:
            return new NotFoundError(message);
        case 409:
            return new ConflictError(message);
        case 422:
            return new UnprocessableEntityError(message);
        case 429:
            return new RateLimitError(message, extractRetryAfter(body));
        case 500:
            return new InternalServerError(message);
        case 503:
            return new ServiceUnavailableError(message);
        default:
            return new ApiError(message, statusCode, undefined, body, `API_ERROR_${statusCode}`);
    }
}

/**
 * Extract error message from various response body formats
 */
function extractErrorMessage(body: unknown): string {
    if (!body) return 'Terjadi kesalahan tidak diketahui';
    if (typeof body === 'string') return body;
    if (typeof body === 'object' && body !== null) {
        const obj = body as Record<string, unknown>;
        // Legacy format: { error: 'message string' }
        if (typeof obj.error === 'string') return obj.error;
        // Standardized format: { error: { code, message } }
        if (obj.error !== null && typeof obj.error === 'object') {
            const errPayload = obj.error as Record<string, unknown>;
            if (typeof errPayload.message === 'string') return errPayload.message;
        }
        if (typeof obj.message === 'string') return obj.message;
    }
    return 'Terjadi kesalahan tidak diketahui';
}

/**
 * Extract validation errors from response body
 */
function extractValidationErrors(body: unknown): Record<string, string> | undefined {
    if (!body || typeof body !== 'object') return undefined;
    const obj = body as Record<string, unknown>;
    if (obj.details && typeof obj.details === 'object') {
        return obj.details as Record<string, string>;
    }
    // Standardized format: { error: { details } }
    if (obj.error !== null && typeof obj.error === 'object') {
        const errPayload = obj.error as Record<string, unknown>;
        if (errPayload.details && typeof errPayload.details === 'object') {
            return errPayload.details as Record<string, string>;
        }
    }
    return undefined;
}

/**
 * Extract retryAfter (seconds) from response body if present.
 */
function extractRetryAfter(body: unknown): number | undefined {
    if (!body || typeof body !== 'object') return undefined;
    const obj = body as Record<string, unknown>;
    if (typeof obj.retryAfter === 'number' && obj.retryAfter >= 0) {
        return obj.retryAfter;
    }
    return undefined;
}

// --------------------------------------------
// Retry Helpers
// --------------------------------------------

/** Status codes considered transient / retryable (network, timeout, rate limit, gateway). */
const RETRYABLE_STATUS_CODES: ReadonlySet<number> = new Set([0, 408, 429, 502, 503, 504]);

/**
 * Determine whether an error is safe to retry.
 * Network errors (statusCode 0), timeouts (408), rate limits (429),
 * and gateway errors (502/503/504) are retryable.
 * Other client/server errors (400, 401, 403, 404, 409, 422, 500) are NOT.
 */
export function isRetryableError(error: unknown): boolean {
    if (!(error instanceof ApiError)) return false;
    return RETRYABLE_STATUS_CODES.has(error.statusCode);
}

/**
 * Compute backoff delay before the next retry attempt (milliseconds).
 * - Respects `Retry-After` (seconds) when provided on a RateLimitError.
 * - Otherwise exponential backoff with jitter: base * 2^attempt + random(0..base/2).
 */
export function getRetryDelayMs(
    error: unknown,
    attempt: number,
    baseDelayMs = 1000
): number {
    if (error instanceof RateLimitError && error.retryAfter !== undefined) {
        return Math.max(error.retryAfter * 1000, 0);
    }
    const exponential = baseDelayMs * Math.pow(2, attempt);
    const jitter = Math.random() * (baseDelayMs / 2);
    return exponential + jitter;
}
