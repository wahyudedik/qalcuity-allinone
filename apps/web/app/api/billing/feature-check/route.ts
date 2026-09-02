/**
 * POST /api/billing/feature-check
 *
 * Check if the tenant has access to a specific feature and/or usage limit.
 * Body: { featureKey: string, checkLimit?: boolean }
 */

import { NextResponse } from 'next/server';
import { requirePermissionForRoute } from '@/lib/session';
import { hasFeature, checkLimit } from '@/lib/entitlement';
import { z } from 'zod';

const featureCheckSchema = z.object({
    featureKey: z.string().min(1, 'Feature key wajib diisi'),
    checkLimit: z.boolean().optional().default(false),
});

export async function POST(request: Request) {
    try {
        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) {
            return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
        }

        const { tenantId } = auth;
        const body = await request.json();

        const validation = featureCheckSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Validasi gagal',
                    details: validation.error.issues.map((i) => ({
                        field: i.path.join('.'),
                        message: i.message,
                    })),
                },
                { status: 400 }
            );
        }

        const { featureKey, checkLimit: shouldCheckLimit } = validation.data;

        // Check feature access
        const featureAccess = await hasFeature(tenantId, featureKey);

        const result: Record<string, unknown> = {
            featureKey,
            hasAccess: featureAccess,
        };

        // Optionally check usage limit
        if (shouldCheckLimit) {
            const limitResult = await checkLimit(tenantId, featureKey);
            result.limit = limitResult;
        }

        return NextResponse.json({
            success: true,
            data: result,
        });
    } catch (error) {
        console.error('[FeatureCheck] Error:', error instanceof Error ? error.message : 'Unknown error');
        return NextResponse.json(
            { success: false, error: 'Gagal memeriksa akses fitur' },
            { status: 500 }
        );
    }
}
