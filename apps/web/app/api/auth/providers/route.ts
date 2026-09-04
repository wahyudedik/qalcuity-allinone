import { NextResponse } from 'next/server';

/**
 * GET /api/auth/providers
 * 
 * Returns which authentication providers are available and working.
 * Used by login/register pages to conditionally show provider buttons.
 * 
 * Google OAuth is considered available only if:
 * 1. GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET env vars are set
 * 2. The credentials look valid (non-empty, proper format)
 * 3. Google's OAuth discovery endpoint is reachable
 */
export async function GET() {
    const providers: Record<string, boolean> = {
        credentials: true, // Email/password is always available
        google: false,
    };

    // Check if Google OAuth credentials are configured
    const googleClientId = process.env.GOOGLE_CLIENT_ID;
    const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (googleClientId && googleClientSecret) {
        // Basic validation: credentials should not be empty/placeholder values
        const isValidFormat =
            googleClientId.length > 10 &&
            googleClientSecret.length > 10 &&
            // Google client IDs typically end with .apps.googleusercontent.com
            // but we allow any non-placeholder value
            !googleClientId.includes('your-') &&
            !googleClientId.includes('xxx') &&
            !googleClientId.includes('placeholder') &&
            !googleClientSecret.includes('your-') &&
            !googleClientSecret.includes('xxx') &&
            !googleClientSecret.includes('placeholder');

        if (isValidFormat) {
            // Try to reach Google's OAuth discovery endpoint
            // This is a lightweight check to verify network connectivity
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout

                const response = await fetch(
                    'https://accounts.google.com/.well-known/openid-configuration',
                    {
                        method: 'HEAD',
                        signal: controller.signal,
                    }
                );

                clearTimeout(timeoutId);

                if (response.ok) {
                    providers.google = true;
                } else {
                    console.warn(
                        `[Auth Providers] Google OAuth endpoint returned status ${response.status}. ` +
                        `Google login is disabled.`
                    );
                }
            } catch (error) {
                // Network error, timeout, or DNS failure — Google OAuth is not reachable
                console.warn(
                    `[Auth Providers] Cannot reach Google OAuth endpoint. ` +
                    `Google login is disabled. Error: ${error instanceof Error ? error.message : 'Unknown'}`,
                );
            }
        } else {
            console.warn(
                '[Auth Providers] Google OAuth credentials appear to be placeholder values. ' +
                'Google login is disabled.'
            );
        }
    }

    return NextResponse.json(providers);
}
