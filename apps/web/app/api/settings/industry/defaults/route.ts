import { NextResponse } from 'next/server';
import { requirePermissionForRoute } from '@/lib/session';
import { DEFAULT_INDUSTRY_CONFIGS, SUPPORTED_INDUSTRIES } from '@qalcuity/industry-config';

// ─── GET /api/settings/industry/defaults ─────────────────────────────────────

/**
 * Dapatkan semua default industry configs.
 * Untuk semua user yang terautentikasi (read-only).
 */
export async function GET(request: Request) {
    try {
        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

        return NextResponse.json({
            success: true,
            data: {
                industries: SUPPORTED_INDUSTRIES,
                configs: DEFAULT_INDUSTRY_CONFIGS,
            },
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}
