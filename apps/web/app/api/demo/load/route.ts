export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { MSG } from '@/lib/api-messages';
import { requirePermissionForRoute } from "@/lib/session";
import { loadDemoData, tenantHasData } from "@/lib/seed-data/demo";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { handleApiError } from "@/lib/api-error";

/**
 * POST /api/demo/load
 *
 * Loads demo data into the current user's tenant.
 * Requires authenticated user with ADMIN or SUPERADMIN role.
 *
 * Request body (optional):
 * - force: boolean â€” skip the "already has data" check
 */
export async function POST(req: Request) {
    try {
        const auth = await requirePermissionForRoute(req);
        if ('error' in auth) {
            return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
        }
        const { tenantId } = auth;

        // Rate limiting: demo load is expensive, limit strictly
        const ip = getClientIp(req);
        const rateLimitResult = checkRateLimit(`api:demo:load:${tenantId}:${ip}`, 5, 300000); // 5 per 5 minutes
        if (!rateLimitResult.success) {
            return NextResponse.json(
                { success: false, error: "MSG.TOO_MANY_REQUESTS" },
                { status: 429 }
            );
        }

        // Check if tenant already has data (unless force=true)
        let body: { force?: boolean } = {};
        try {
            body = await req.json();
        } catch {
            // Body is optional
        }

        if (!body.force) {
            const hasData = await tenantHasData(tenantId);
            if (hasData) {
                return NextResponse.json(
                    {
                        success: false,
                        error: "Tenant sudah memiliki data. Gunakan force=true untuk memuat ulang.",
                        hasData: true,
                    },
                    { status: 409 }
                );
            }
        }

        // Load demo data
        const result = await loadDemoData(tenantId);

        if (result.success) {
            return NextResponse.json({
                success: true,
                message: result.message,
                counts: result.counts,
            });
        } else {
            return NextResponse.json(
                { success: false, error: result.message },
                { status: 500 }
            );
        }
    } catch (error) {
        return handleApiError(error);
    }
}
