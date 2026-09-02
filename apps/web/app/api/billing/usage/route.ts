/**
 * GET /api/billing/usage
 *
 * Get usage statistics for the current tenant.
 * Query params: period (YYYY-MM, optional — defaults to current month)
 */

import { NextResponse } from 'next/server';
import { requirePermissionForRoute } from '@/lib/session';
import { getUsageStats } from '@/lib/entitlement';

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
        console.error('[Usage] Error fetching usage:', error instanceof Error ? error.message : 'Unknown error');
        return NextResponse.json(
            { success: false, error: 'Gagal mengambil data penggunaan' },
            { status: 500 }
        );
    }
}
