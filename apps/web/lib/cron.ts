// ─── Cron Utility Helpers ─────────────────────────────────────────────────────
// Shared helpers for cron endpoints that use CRON_SECRET Bearer token auth.
// Pattern: external cron service → GET/POST with Authorization: Bearer <CRON_SECRET>

import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

/**
 * Verify that the request is authenticated via CRON_SECRET Bearer token.
 * Returns true if the token matches, false otherwise.
 *
 * Usage in route handler:
 *   if (!verifyCronAuth(req)) return cronError('Unauthorized', 401);
 */
export function verifyCronAuth(req: Request): boolean {
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
        logger.error('[Cron] CRON_SECRET environment variable is not configured');
        return false;
    }

    return authHeader === `Bearer ${cronSecret}`;
}

/**
 * Standard cron success response.
 */
export function cronSuccess(data: Record<string, unknown>): NextResponse {
    return NextResponse.json({ success: true, ...data });
}

/**
 * Standard cron error response.
 */
export function cronError(message: string, status: number = 400): NextResponse {
    return NextResponse.json({ success: false, error: message }, { status });
}
