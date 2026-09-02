import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requirePermissionForRoute } from '@/lib/session';
import { logAudit } from '@/lib/audit';

/**
 * GET /api/workflow/definitions
 * List semua workflow definitions untuk tenant.
 */
export async function GET(request: Request) {
    try {
        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) {
            return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
        }
        const { tenantId } = auth;

        const definitions = await prisma.workflowDefinition.findMany({
            where: { tenantId },
            orderBy: { entityType: 'asc' },
        });

        return NextResponse.json({ success: true, data: definitions });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}

/**
 * POST /api/workflow/definitions
 * Buat atau update workflow definition.
 * Jika entityType sudah ada untuk tenant, update config-nya.
 */
export async function POST(request: Request) {
    try {
        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) {
            return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
        }
        const { userId, tenantId } = auth;
        const body = await request.json();

        const { entityType, name, description, config } = body;

        if (!entityType || !name || !config) {
            return NextResponse.json(
                { success: false, error: 'entityType, name, dan config wajib diisi' },
                { status: 400 }
            );
        }

        // Validate config structure
        if (!config.states || !Array.isArray(config.states) || config.states.length === 0) {
            return NextResponse.json(
                { success: false, error: 'config.states harus berupa array yang tidak kosong' },
                { status: 400 }
            );
        }

        if (!config.transitions || !Array.isArray(config.transitions)) {
            return NextResponse.json(
                { success: false, error: 'config.transitions harus berupa array' },
                { status: 400 }
            );
        }

        if (!config.initialState) {
            return NextResponse.json(
                { success: false, error: 'config.initialState wajib diisi' },
                { status: 400 }
            );
        }

        if (!config.finalStates || !Array.isArray(config.finalStates)) {
            return NextResponse.json(
                { success: false, error: 'config.finalStates harus berupa array' },
                { status: 400 }
            );
        }

        // Upsert: update jika sudah ada, create jika belum
        const existing = await prisma.workflowDefinition.findFirst({
            where: { tenantId, entityType: entityType.toUpperCase() },
        });

        let definition;

        if (existing) {
            if (existing.isSystem) {
                return NextResponse.json(
                    { success: false, error: 'Tidak dapat mengubah system workflow' },
                    { status: 403 }
                );
            }

            definition = await prisma.workflowDefinition.update({
                where: { id: existing.id },
                data: {
                    name,
                    description: description || null,
                    config,
                },
            });
        } else {
            definition = await prisma.workflowDefinition.create({
                data: {
                    tenantId,
                    entityType: entityType.toUpperCase(),
                    name,
                    description: description || null,
                    config,
                    isSystem: false,
                },
            });
        }

        void logAudit({
            userId,
            tenantId,
            action: existing ? 'UPDATE' : 'CREATE',
            entity: 'WorkflowDefinition',
            entityId: definition.id,
            newValues: { entityType: definition.entityType, name: definition.name },
            request,
        });

        return NextResponse.json({ success: true, data: definition });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}
