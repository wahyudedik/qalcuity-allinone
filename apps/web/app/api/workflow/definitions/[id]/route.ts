import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requirePermissionForRoute } from '@/lib/session';
import { logAudit } from '@/lib/audit';

/**
 * GET /api/workflow/definitions/[id]
 * Dapatkan detail workflow definition.
 */
export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) {
            return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
        }
        const { tenantId } = auth;
        const { id } = params;

        const definition = await prisma.workflowDefinition.findFirst({
            where: { id, tenantId },
        });

        if (!definition) {
            return NextResponse.json(
                { success: false, error: 'Workflow definition not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({ success: true, data: definition });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}

/**
 * PUT /api/workflow/definitions/[id]
 * Update workflow definition.
 */
export async function PUT(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) {
            return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
        }
        const { userId, tenantId } = auth;
        const { id } = params;
        const body = await request.json();

        const existing = await prisma.workflowDefinition.findFirst({
            where: { id, tenantId },
        });

        if (!existing) {
            return NextResponse.json(
                { success: false, error: 'Workflow definition not found' },
                { status: 404 }
            );
        }

        if (existing.isSystem) {
            return NextResponse.json(
                { success: false, error: 'Tidak dapat mengubah system workflow' },
                { status: 403 }
            );
        }

        const { name, description, config, isActive } = body;

        const updateData: Record<string, unknown> = {};
        if (name !== undefined) updateData.name = name;
        if (description !== undefined) updateData.description = description;
        if (config !== undefined) {
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
            updateData.config = config;
        }
        if (isActive !== undefined) updateData.isActive = isActive;

        const updated = await prisma.workflowDefinition.update({
            where: { id },
            data: updateData,
        });

        void logAudit({
            userId,
            tenantId,
            action: 'UPDATE',
            entity: 'WorkflowDefinition',
            entityId: id,
            newValues: updateData as Record<string, unknown>,
            request,
        });

        return NextResponse.json({ success: true, data: updated });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}

/**
 * DELETE /api/workflow/definitions/[id]
 * Hapus custom workflow definition (bukan system workflow).
 */
export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) {
            return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
        }
        const { userId, tenantId } = auth;
        const { id } = params;

        const existing = await prisma.workflowDefinition.findFirst({
            where: { id, tenantId },
        });

        if (!existing) {
            return NextResponse.json(
                { success: false, error: 'Workflow definition not found' },
                { status: 404 }
            );
        }

        if (existing.isSystem) {
            return NextResponse.json(
                { success: false, error: 'Tidak dapat menghapus system workflow' },
                { status: 403 }
            );
        }

        await prisma.workflowDefinition.delete({ where: { id } });

        void logAudit({
            userId,
            tenantId,
            action: 'DELETE',
            entity: 'WorkflowDefinition',
            entityId: id,
            oldValues: existing as unknown as Record<string, unknown>,
            request,
        });

        return NextResponse.json({ success: true, data: null });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}
