/**
 * API Route: /api/settings/control-engine
 *
 * GET  — Get all configs (optional: ?category=workflow)
 * POST — Update a config
 *
 * Requires ADMIN+ role.
 */

import { NextResponse } from 'next/server';
import { requirePermissionForRoute } from '@/lib/session';
import {
    getControlConfigs,
    getControlConfigsByCategory,
    updateControlConfig,
    resetToDefaults,
    exportConfig,
    importConfig,
    getControlHistory,
    type ControlCategory,
} from '@/lib/control-engine';
import { controlConfigUpdateSchema } from '@/lib/validation-schemas';
import { handleApiError } from '@/lib/api-error';

// ─── GET /api/settings/control-engine ───────────────────────────────────────

export async function GET(req: Request) {
    try {
        const auth = await requirePermissionForRoute(req);
        if (auth.error || !auth.tenantId) {
            return NextResponse.json(
                { success: false, error: auth.error || 'Unauthorized' },
                { status: auth.status || 401 }
            );
        }

        const tenantId = auth.tenantId;

        const { searchParams } = new URL(req.url);
        const category = searchParams.get('category') as ControlCategory | null;
        const action = searchParams.get('action');

        // Export action
        if (action === 'export') {
            const data = await exportConfig(tenantId);
            return NextResponse.json({ success: true, data });
        }

        // History action
        if (action === 'history') {
            const history = await getControlHistory(tenantId, category || undefined);
            return NextResponse.json({ success: true, data: history });
        }

        // Get configs by category or all
        if (category) {
            const configs = await getControlConfigsByCategory(tenantId, category);
            return NextResponse.json({ success: true, data: configs });
        }

        const configs = await getControlConfigs(tenantId);
        return NextResponse.json({ success: true, data: configs });
    } catch (error) {
        return handleApiError(error);
    }
}

// ─── POST /api/settings/control-engine ──────────────────────────────────────

export async function POST(req: Request) {
    try {
        const auth = await requirePermissionForRoute(req);
        if (auth.error || !auth.tenantId || !auth.userId) {
            return NextResponse.json(
                { success: false, error: auth.error || 'Unauthorized' },
                { status: auth.status || 401 }
            );
        }

        const userId = auth.userId;
        const tenantId = auth.tenantId;

        const body = await req.json();
        const { searchParams } = new URL(req.url);
        const action = searchParams.get('action');

        // Reset action
        if (action === 'reset') {
            const category = body.category as ControlCategory | undefined;
            await resetToDefaults(tenantId, category, userId);
            return NextResponse.json({ success: true, message: 'Configs reset to defaults' });
        }

        // Import action
        if (action === 'import') {
            const importData = body;
            if (!importData.version || !importData.configs) {
                return NextResponse.json(
                    { success: false, error: 'Invalid import data format' },
                    { status: 400 }
                );
            }
            const result = await importConfig(tenantId, importData, userId);
            return NextResponse.json({
                success: true,
                data: result,
                message: `Imported ${result.imported} configs${result.errors.length > 0 ? ` with ${result.errors.length} errors` : ''}`,
            });
        }

        // Update config
        const validated = controlConfigUpdateSchema.parse(body);
        const config = await updateControlConfig(
            tenantId,
            {
                category: validated.category,
                key: validated.key,
                value: validated.value,
                reason: validated.reason,
            },
            userId
        );

        return NextResponse.json({ success: true, data: config, message: 'Config updated successfully' });
    } catch (error) {
        return handleApiError(error);
    }
}
