import { NextResponse } from 'next/server';
import { requirePermissionForRoute } from '@/lib/session';
import { getTenantCustomFields } from '@/lib/industry-config';

// ─── GET /api/settings/industry/fields?entity=product ────────────────────────

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
                { success: false, error: 'Parameter "entity" wajib diisi' },
                { status: 400 }
            );
        }

        const fields = await getTenantCustomFields(tenantId, entity);

        return NextResponse.json({
            success: true,
            data: fields,
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}
