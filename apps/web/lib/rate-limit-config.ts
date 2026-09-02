/**
 * Rate Limit Configuration — Endpoint-specific rate limits.
 *
 * Setiap endpoint category memiliki limit dan window yang berbeda:
 *   - Auth endpoints:     5 requests / 15 minutes  (brute force protection)
 *   - API endpoints:      100 requests / 15 minutes (normal usage)
 *   - File upload:        10 requests / hour        (resource protection)
 *   - Search endpoints:   50 requests / minute      (CPU-intensive)
 *   - Admin endpoints:    200 requests / 15 minutes (admin workflows)
 *
 * Tenant-level overrides bisa ditambahkan via database configuration.
 *
 * @see apps/web/lib/rate-limit.ts
 * @see apps/web/middleware.ts
 */

// ============================================================
// Types
// ============================================================

export interface RateLimitRule {
    /** Maximum requests allowed within the window */
    maxRequests: number;
    /** Time window in milliseconds */
    windowMs: number;
    /** Human-readable description */
    description: string;
    /** Whether to log violations to database */
    logViolations: boolean;
    /** Whether to block IP after repeated violations */
    autoBlock: boolean;
    /** Number of violations before auto-block */
    blockThreshold: number;
    /** Block duration in milliseconds (default: 1 hour) */
    blockDurationMs: number;
}

export interface RateLimitConfig {
    /** Default rule for unmatched endpoints */
    default: RateLimitRule;
    /** Endpoint-specific rules */
    rules: Record<string, RateLimitRule>;
    /** Internal routes that should skip rate limiting */
    skipPaths: string[];
    /** Custom key generator function */
    keyGenerator?: (ip: string, pathname: string) => string;
}

// ============================================================
// Rate Limit Rules
// ============================================================

/**
 * Auth endpoints — Strict limits untuk brute force protection.
 * Login, register, password reset, OTP, dll.
 */
export const AUTH_RATE_LIMIT: RateLimitRule = {
    maxRequests: parseInt(process.env.RATE_LIMIT_AUTH_MAX || '5', 10),
    windowMs: parseInt(process.env.RATE_LIMIT_AUTH_WINDOW_MS || String(15 * 60 * 1000), 10),
    description: 'Auth endpoints — brute force protection',
    logViolations: true,
    autoBlock: true,
    blockThreshold: parseInt(process.env.RATE_LIMIT_AUTH_BLOCK_THRESHOLD || '3', 10),
    blockDurationMs: parseInt(process.env.RATE_LIMIT_AUTH_BLOCK_DURATION_MS || String(60 * 60 * 1000), 10),
};

/**
 * API endpoints — Standard limits untuk normal usage.
 * CRUD operations, data queries, dll.
 */
export const API_RATE_LIMIT: RateLimitRule = {
    maxRequests: parseInt(process.env.RATE_LIMIT_API_MAX || '100', 10),
    windowMs: parseInt(process.env.RATE_LIMIT_API_WINDOW_MS || String(15 * 60 * 1000), 10),
    description: 'API endpoints — standard usage',
    logViolations: true,
    autoBlock: false,
    blockThreshold: 10,
    blockDurationMs: 60 * 60 * 1000,
};

/**
 * File upload endpoints — Resource protection.
 * Upload, import, export, dll.
 */
export const UPLOAD_RATE_LIMIT: RateLimitRule = {
    maxRequests: parseInt(process.env.RATE_LIMIT_UPLOAD_MAX || '10', 10),
    windowMs: parseInt(process.env.RATE_LIMIT_UPLOAD_WINDOW_MS || String(60 * 60 * 1000), 10),
    description: 'File upload endpoints — resource protection',
    logViolations: true,
    autoBlock: true,
    blockThreshold: 5,
    blockDurationMs: 2 * 60 * 60 * 1000,
};

/**
 * Search endpoints — CPU-intensive protection.
 * Search, filter, analytics queries, dll.
 */
export const SEARCH_RATE_LIMIT: RateLimitRule = {
    maxRequests: parseInt(process.env.RATE_LIMIT_SEARCH_MAX || '50', 10),
    windowMs: parseInt(process.env.RATE_LIMIT_SEARCH_WINDOW_MS || String(60 * 1000), 10),
    description: 'Search endpoints — CPU-intensive protection',
    logViolations: true,
    autoBlock: false,
    blockThreshold: 10,
    blockDurationMs: 30 * 60 * 1000,
};

/**
 * Admin endpoints — Higher limits untuk admin workflows.
 * Settings, team management, billing, dll.
 */
export const ADMIN_RATE_LIMIT: RateLimitRule = {
    maxRequests: parseInt(process.env.RATE_LIMIT_ADMIN_MAX || '200', 10),
    windowMs: parseInt(process.env.RATE_LIMIT_ADMIN_WINDOW_MS || String(15 * 60 * 1000), 10),
    description: 'Admin endpoints — admin workflows',
    logViolations: true,
    autoBlock: false,
    blockThreshold: 10,
    blockDurationMs: 60 * 60 * 1000,
};

/**
 * Public API endpoints — Very strict limits.
 * Registration, public data, dll.
 */
export const PUBLIC_RATE_LIMIT: RateLimitRule = {
    maxRequests: parseInt(process.env.RATE_LIMIT_PUBLIC_MAX || '20', 10),
    windowMs: parseInt(process.env.RATE_LIMIT_PUBLIC_WINDOW_MS || String(15 * 60 * 1000), 10),
    description: 'Public API endpoints — strict limits',
    logViolations: true,
    autoBlock: true,
    blockThreshold: 5,
    blockDurationMs: 2 * 60 * 60 * 1000,
};

// ============================================================
// Endpoint → Rule Mapping
// ============================================================

/**
 * Map URL pathnames ke rate limit rules.
 * Urutan: match pertama yang paling spesifik.
 */
const ENDPOINT_RULES: Array<{ pattern: RegExp; rule: RateLimitRule }> = [
    // Auth endpoints — paling ketat
    { pattern: /^\/api\/auth\//, rule: AUTH_RATE_LIMIT },

    // File upload endpoints
    { pattern: /\/upload|\/import|\/export/i, rule: UPLOAD_RATE_LIMIT },

    // Search endpoints
    { pattern: /\/search|\/query|\/analytics/i, rule: SEARCH_RATE_LIMIT },

    // Admin/Platform endpoints
    { pattern: /^\/api\/admin|^\/api\/platform/, rule: ADMIN_RATE_LIMIT },

    // Public endpoints (billing callbacks, etc.)
    { pattern: /^\/api\/billing\/payments\/(midtrans|xendit)\/callback/, rule: PUBLIC_RATE_LIMIT },
];

/**
 * Paths yang di-skip dari rate limiting.
 * Internal routes, health checks, webhooks, dll.
 */
export const SKIP_PATHS = [
    '/api/health',
    '/api/ping',
    '/api/cron',       // Cron jobs
    '/api/webhook',    // External webhooks (handled separately)
    '/_next/',         // Next.js internal
    '/favicon.ico',    // Static assets
    '/logo.png',       // Static assets
];

// ============================================================
// Configuration Object
// ============================================================

export const rateLimitConfig: RateLimitConfig = {
    default: API_RATE_LIMIT,
    rules: {
        auth: AUTH_RATE_LIMIT,
        api: API_RATE_LIMIT,
        upload: UPLOAD_RATE_LIMIT,
        search: SEARCH_RATE_LIMIT,
        admin: ADMIN_RATE_LIMIT,
        public: PUBLIC_RATE_LIMIT,
    },
    skipPaths: SKIP_PATHS,
};

// ============================================================
// Helper Functions
// ============================================================

/**
 * Get rate limit rule untuk pathname tertentu.
 *
 * @param pathname - URL pathname (e.g., '/api/auth/login')
 * @returns Matching RateLimitRule atau default
 */
export function getRateLimitRule(pathname: string): RateLimitRule {
    // Check skip paths first
    if (SKIP_PATHS.some((skip) => pathname.startsWith(skip))) {
        return { ...API_RATE_LIMIT, maxRequests: 0 }; // Effectively skip
    }

    // Find matching endpoint rule
    for (const { pattern, rule } of ENDPOINT_RULES) {
        if (pattern.test(pathname)) {
            return rule;
        }
    }

    // Default rule
    return rateLimitConfig.default;
}

/**
 * Generate rate limit key untuk Redis/in-memory storage.
 *
 * @param ip - Client IP address
 * @param pathname - URL pathname
 * @param rule - Rate limit rule (untuk window identifier)
 * @returns Unique key string
 */
export function generateRateLimitKey(
    ip: string,
    pathname: string,
    rule?: RateLimitRule
): string {
    const window = rule ? Math.floor(Date.now() / rule.windowMs) : Math.floor(Date.now() / (15 * 60 * 1000));
    return `rl:${ip}:${pathname}:${window}`;
}

/**
 * Generate block key untuk IP auto-blocking.
 *
 * @param ip - Client IP address
 * @param pathname - URL pathname
 * @returns Block key string
 */
export function generateBlockKey(ip: string, pathname: string): string {
    return `rl:block:${ip}:${pathname}`;
}

/**
 * Format reset time untuk HTTP headers.
 *
 * @param resetTimeMs - Reset time in milliseconds
 * @returns Unix timestamp in seconds
 */
export function formatResetTime(resetTimeMs: number): number {
    return Math.ceil(resetTimeMs / 1000);
}
