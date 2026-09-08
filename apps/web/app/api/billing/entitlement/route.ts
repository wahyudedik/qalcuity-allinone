/**
 * GET /api/billing/entitlement
 *
 * Get current tenant's entitlement (plan + features).
 * Returns the entitlement data with plan details and feature flags.
 */

import { NextResponse } from 'next/server';
import { MSG } from '@/lib/api-messages';
import { requirePermissionForRoute } from '@/lib/session';
import { getEntitlement, ensureEntitlement } from '@/lib/entitlement';
import { handleApiError } from '@/lib/api-error';

export async function GET(request: Request) {
    try {
        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) {
            return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
        }

        const { tenantId } = auth;

        // Ensure tenant has entitlement (creates Free plan if missing)
        const entitlement = await ensureEntitlement(tenantId);

        return NextResponse.json({
            success: true,
            data: entitlement,
        });
    } catch (error) {
        return handleApiError(error);
    }
}
