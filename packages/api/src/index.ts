// ============================================
// @qalcuity/api
// Shared API client, types, and error handling
// ============================================

// Types
export type {
    HttpMethod,
    FetchOptions,
    RequestOptions,
    ApiResponse,
    ApiResponseWithMeta,
    ApiErrorResponse,
    PaginationParams,
    PaginationMeta,
    TenantHeaders,
    ApiClientConfig,
    ApiClient,
    UploadOptions,
    UploadProgress,
    UploadResponse,
    BatchRequest,
    BatchResponse,
    WebSocketMessage,
    WebSocketConfig,
} from './types';

// Errors
export {
    ApiError,
    BadRequestError,
    UnauthorizedError,
    ForbiddenError,
    NotFoundError,
    ConflictError,
    UnprocessableEntityError,
    RateLimitError,
    InternalServerError,
    ServiceUnavailableError,
    NetworkError,
    parseApiError,
} from './errors';

// Client
export {
    createApiClient,
    apiClient,
    financeApi,
    crmApi,
    inventoryApi,
    hrApi,
    settingsApi,
} from './client';
