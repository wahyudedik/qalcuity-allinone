export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { MSG } from '@/lib/api-messages';
import { requirePermissionForRoute } from '@/lib/session';
import { getTenantCustomFields } from '@/lib/industry-config';
import { handleApiError } from '@/lib/api-error';

// â”€â”€â”€ GET /api/settings/industry/fields?entity=product â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * Dapatkan custom fields untuk entity tertentu.
 * Query param: entity (required)
 */
export async function GET(request: Request) {
    try {
        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
        const { tenantId } = auth;

        const { searchParams } = new URL(request.url);
        const entity = searchParams.get('entity');

        if (!entity) {
            return NextResponse.json(
                { success: false, error: MSG.ENTITY_PARAM_REQUIRED },
                { status: 400 }
            );
        }

        const fields = await getTenantCustomFields(tenantId, entity);

        return NextResponse.json({
            success: true,
            data: fields,
        });
    } catch (error) {
        return handleApiError(error);
    }
}
