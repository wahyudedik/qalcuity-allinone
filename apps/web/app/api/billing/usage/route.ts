export const dynamic = 'force-dynamic';

/**
 * GET /api/billing/usage
 *
 * Get usage statistics for the current tenant.
 * Query params: period (YYYY-MM, optional â€” defaults to current month)
 */

import { NextResponse } from 'next/server';
import { MSG } from '@/lib/api-messages';
import { requirePermissionForRoute } from '@/lib/session';
import { getUsageStats } from '@/lib/entitlement';
import { handleApiError } from '@/lib/api-error';

export async function GET(request: Request) {
    try {
        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) {
            return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
        }

        const { tenantId } = auth;
        const { searchParams } = new URL(request.url);
        const period = searchParams.get('period') || undefined;

        const usageStats = await getUsageStats(tenantId, period);

        return NextResponse.json({
            success: true,
            data: usageStats,
        });
    } catch (error) {
        return handleApiError(error);
    }
}
