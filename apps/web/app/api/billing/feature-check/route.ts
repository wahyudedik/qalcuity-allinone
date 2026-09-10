export const dynamic = 'force-dynamic';

/**
 * POST /api/billing/feature-check
 *
 * Check if the tenant has access to a specific feature and/or usage limit.
 * Body: { featureKey: string, checkLimit?: boolean }
 */

import { NextResponse } from 'next/server';
import { MSG } from '@/lib/api-messages';
import { requirePermissionForRoute } from '@/lib/session';
import { hasFeature, checkLimit } from '@/lib/entitlement';
import { handleApiError } from '@/lib/api-error';
import { z } from 'zod';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

const featureCheckSchema = z.object({
    featureKey: z.string().min(1, MSG.FEATURE_KEY_REQUIRED),
    checkLimit: z.boolean().optional().default(false),
});

export async function POST(request: Request) {
    try {
        const ip = getClientIp(request);
        const rl = checkRateLimit(`billing:feature-check:${ip}`, 30, 60_000);
        if (!rl.success) {
            return NextResponse.json({ success: false, error: MSG.TOO_MANY_REQUESTS }, { status: 429 });
        }

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
        return handleApiError(error);
    }
}
