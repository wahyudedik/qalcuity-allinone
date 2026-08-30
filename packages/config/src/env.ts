// ============================================
// @qalcuity/config — Environment Variable Validation
// ============================================

export interface EnvConfig {
    NODE_ENV: 'development' | 'production' | 'test';
    NEXTAUTH_SECRET?: string;
    NEXTAUTH_URL?: string;
    DATABASE_URL: string;
    API_BASE_URL?: string;
    SMTP_HOST?: string;
    SMTP_PORT?: number;
    SMTP_USER?: string;
    SMTP_PASS?: string;
    SMTP_FROM?: string;
    MIDTRANS_SERVER_KEY?: string;
    MIDTRANS_CLIENT_KEY?: string;
    MIDTRANS_MERCHANT_ID?: string;
    XENDIT_SECRET_KEY?: string;
    XENDIT_CALLBACK_TOKEN?: string;
    S3_BUCKET?: string;
    S3_REGION?: string;
    S3_ACCESS_KEY?: string;
    S3_SECRET_KEY?: string;
    REDIS_URL?: string;
}

/**
 * Get environment variable with optional default value
 */
export function getEnv(key: string, defaultValue?: string): string {
    const value = process.env[key] ?? defaultValue;
    if (value === undefined) {
        throw new Error(`Environment variable ${key} is not set`);
    }
    return value;
}

/**
 * Get optional environment variable (returns undefined if not set)
 */
export function getOptionalEnv(key: string): string | undefined {
    return process.env[key] || undefined;
}

/**
 * Get environment variable as number
 */
export function getEnvNumber(key: string, defaultValue?: number): number {
    const value = process.env[key];
    if (value === undefined || value === '') {
        if (defaultValue !== undefined) return defaultValue;
        throw new Error(`Environment variable ${key} is not set`);
    }
    const num = Number(value);
    if (isNaN(num)) {
        throw new Error(`Environment variable ${key} must be a number, got: ${value}`);
    }
    return num;
}

/**
 * Get environment variable as boolean
 */
export function getEnvBoolean(key: string, defaultValue = false): boolean {
    const value = process.env[key];
    if (value === undefined || value === '') return defaultValue;
    return value === 'true' || value === '1';
}

/**
 * Check if running in development mode
 */
export function isDevelopment(): boolean {
    return process.env.NODE_ENV === 'development';
}

/**
 * Check if running in production mode
 */
export function isProduction(): boolean {
    return process.env.NODE_ENV === 'production';
}

/**
 * Check if running in test mode
 */
export function isTest(): boolean {
    return process.env.NODE_ENV === 'test';
}

/**
 * Get current NODE_ENV with safe default
 */
export function getNodeEnv(): 'development' | 'production' | 'test' {
    const env = process.env.NODE_ENV;
    if (env === 'production') return 'production';
    if (env === 'test') return 'test';
    return 'development';
}

/**
 * Validate required environment variables at startup
 * Call this in server-side code (API routes, middleware, etc.)
 */
export function validateRequiredEnv(requiredKeys: string[]): void {
    const missing: string[] = [];
    for (const key of requiredKeys) {
        if (!process.env[key]) {
            missing.push(key);
        }
    }
    if (missing.length > 0) {
        throw new Error(
            `Missing required environment variables: ${missing.join(', ')}. ` +
            `Please check your .env file.`
        );
    }
}

/**
 * Default environment validation for the app
 */
export function validateAppEnv(): void {
    validateRequiredEnv(['DATABASE_URL']);
}

/**
 * Get database URL with validation
 */
export function getDatabaseUrl(): string {
    return getEnv('DATABASE_URL');
}

/**
 * Get NextAuth configuration
 */
export function getNextAuthConfig() {
    return {
        secret: getOptionalEnv('NEXTAUTH_SECRET'),
        url: getOptionalEnv('NEXTAUTH_URL'),
    };
}

/**
 * Get SMTP configuration
 */
export function getSmtpConfig() {
    return {
        host: getOptionalEnv('SMTP_HOST'),
        port: getEnvNumber('SMTP_PORT', 587),
        user: getOptionalEnv('SMTP_USER'),
        pass: getOptionalEnv('SMTP_PASS'),
        from: getOptionalEnv('SMTP_FROM'),
    };
}

/**
 * Get payment gateway configuration
 */
export function getPaymentConfig() {
    return {
        midtrans: {
            serverKey: getOptionalEnv('MIDTRANS_SERVER_KEY'),
            clientKey: getOptionalEnv('MIDTRANS_CLIENT_KEY'),
            merchantId: getOptionalEnv('MIDTRANS_MERCHANT_ID'),
        },
        xendit: {
            secretKey: getOptionalEnv('XENDIT_SECRET_KEY'),
            callbackToken: getOptionalEnv('XENDIT_CALLBACK_TOKEN'),
        },
    };
}
