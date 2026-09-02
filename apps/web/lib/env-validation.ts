// ─── Environment Variable Validation ───────────────────────────────────────────
// Validate required environment variables at startup.
// Prevents cryptic runtime errors when critical config is missing.

const requiredEnvVars = [
    'NEXTAUTH_SECRET',
    'NEXTAUTH_URL',
    'DATABASE_URL',
];

const optionalEnvVars = [
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'SMTP_HOST',
    'SMTP_USER',
    'SMTP_PASS',
    'MIDTRANS_SERVER_KEY',
    'MIDTRANS_CLIENT_KEY',
    'MIDTRANS_WEBHOOK_SECRET',
];

export function validateEnv() {
    const missing = requiredEnvVars.filter(key => !process.env[key]);
    if (missing.length > 0) {
        console.error(`❌ Missing required env vars: ${missing.join(', ')}`);
        console.error('Please set these in .env.production');
        // Don't throw in development, only in production
        if (process.env.NODE_ENV === 'production') {
            throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
        }
    }

    // Warn about optional but recommended vars
    const missingOptional = optionalEnvVars.filter(key => !process.env[key]);
    if (missingOptional.length > 0) {
        console.warn(`⚠️ Optional env vars not set: ${missingOptional.join(', ')}`);
    }
}
