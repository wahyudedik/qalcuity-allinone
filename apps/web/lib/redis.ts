/**
 * Redis Client Library — Production-grade dengan connection pooling & graceful fallback.
 *
 * Features:
 *   - Lazy singleton connection (tidak connect sampai dipakai)
 *   - Connection pooling via ioredis
 *   - Retry logic dengan exponential backoff
 *   - Graceful fallback ke in-memory jika Redis tidak tersedia
 *   - Health check utility
 *   - Graceful shutdown
 *
 * Environment Variables:
 *   - REDIS_URL       — Redis connection string (e.g., redis://localhost:6379)
 *   - REDIS_TOKEN     — Redis auth token (optional, untuk cloud Redis)
 *   - REDIS_KEY_PREFIX — Prefix untuk semua keys (default: 'qalcuity:')
 *
 * @see docs/SECURITY.md — H04 (Rate Limiter)
 */

// Use dynamic import to avoid @types/ioredis v4 conflict with ioredis v6
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let RedisClass: any = null;

async function loadRedis(): Promise<any> {
    if (RedisClass) return RedisClass;
    try {
        const mod = await import('ioredis');
        RedisClass = mod.default;
        return RedisClass;
    } catch {
        console.warn('[Redis] ioredis module not available');
        return null;
    }
}

// ============================================================
// Configuration
// ============================================================

const REDIS_URL = process.env.REDIS_URL;
const REDIS_TOKEN = process.env.REDIS_TOKEN;
const REDIS_KEY_PREFIX = process.env.REDIS_KEY_PREFIX || 'qalcuity:';

const REDIS_CONFIG = {
    maxRetriesPerRequest: 3,
    retryStrategy(times: number): number | null {
        if (times > 5) {
            console.error('[Redis] Max retries exceeded, stopping retry attempts');
            return null;
        }
        const delay = Math.min(times * 100, 3000);
        console.warn(`[Redis] Retry attempt ${times}, waiting ${delay}ms`);
        return delay;
    },
    lazyConnect: true,
    connectTimeout: 5000,
    commandTimeout: 3000,
    keepAlive: 30000,
    enableReadyCheck: true,
    autoResubscribe: true,
    autoResendUnfulfilledCommands: true,
};

// ============================================================
// Lazy Singleton
// ============================================================

let redisClient: any = null;
let redisAvailable = false;
let initializationAttempted = false;

/**
 * Get or create Redis client (lazy singleton pattern).
 * Returns null if Redis is not configured or connection fails.
 */
export async function getRedisClient(): Promise<any> {
    // Already initialized and determined unavailable
    if (initializationAttempted && !redisClient) {
        return null;
    }

    // Already have a connected client
    if (redisClient && redisAvailable) {
        return redisClient;
    }

    // No Redis URL configured
    if (!REDIS_URL) {
        if (!initializationAttempted) {
            console.warn(
                '[Redis] REDIS_URL not configured. Using in-memory fallback. ' +
                'Configure REDIS_URL in .env for shared rate limiting.'
            );
            initializationAttempted = true;
        }
        return null;
    }

    initializationAttempted = true;

    try {
        const Redis = await loadRedis();
        if (!Redis) return null;

        // Build connection options
        const connectOptions = {
            ...REDIS_CONFIG,
            keyPrefix: REDIS_KEY_PREFIX,
            password: REDIS_TOKEN || undefined,
        };

        redisClient = new Redis(REDIS_URL, connectOptions);

        // Event handlers
        redisClient.on('error', (err: Error) => {
            console.error('[Redis] Connection error:', err.message);
            redisAvailable = false;
        });

        redisClient.on('connect', () => {
            console.log('[Redis] Connected successfully');
            redisAvailable = true;
        });

        redisClient.on('ready', () => {
            console.log('[Redis] Ready to accept commands');
            redisAvailable = true;
        });

        redisClient.on('close', () => {
            console.warn('[Redis] Connection closed');
            redisAvailable = false;
        });

        redisClient.on('reconnecting', (delay: number) => {
            console.warn(`[Redis] Reconnecting in ${delay}ms...`);
        });

        // Attempt lazy connection
        redisClient.connect().catch((err: Error) => {
            console.error('[Redis] Initial connection failed:', err.message);
            redisAvailable = false;
        });

        return redisClient;
    } catch (error) {
        console.error('[Redis] Failed to create client:', error);
        redisClient = null;
        return null;
    }
}

// ============================================================
// Sync accessor (for backward compatibility with sync middleware)
// Returns cached client without triggering async initialization.
// ============================================================

/**
 * Get Redis client synchronously (returns cached instance or null).
 * For use in sync contexts like middleware. Will not trigger new connections.
 */
export function getRedisClientSync(): any {
    if (redisAvailable && redisClient) {
        return redisClient;
    }
    return null;
}

// ============================================================
// Public API
// ============================================================

/**
 * Check if Redis is available and connected.
 */
export function isRedisAvailable(): boolean {
    return redisAvailable && redisClient !== null;
}

/**
 * Get Redis health status.
 */
export function getRedisHealth(): {
    available: boolean;
    status: string;
    url: string | null;
} {
    return {
        available: isRedisAvailable(),
        status: redisClient?.status || 'not_initialized',
        url: REDIS_URL ? REDIS_URL.replace(/\/\/.*@/, '//***@') : null, // Mask credentials
    };
}

/**
 * Gracefully disconnect Redis client.
 * Call this during application shutdown.
 */
export async function disconnectRedis(): Promise<void> {
    if (redisClient) {
        try {
            await redisClient.quit();
            console.log('[Redis] Disconnected gracefully');
        } catch {
            redisClient.disconnect();
        }
        redisClient = null;
        redisAvailable = false;
    }
}

// ============================================================
// Graceful Shutdown
// ============================================================

if (typeof process !== 'undefined') {
    const shutdown = async () => {
        await disconnectRedis();
        process.exit(0);
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
}
