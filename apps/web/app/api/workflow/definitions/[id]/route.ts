import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requirePermissionForRoute } from '@/lib/session';
import { logAudit } from '@/lib/audit';
import { MSG } from '@/lib/api-messages';
import { handleApiError } from '@/lib/api-error';

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
                { success: false, error: MSG.WORKFLOW_DEFINITION_NOT_FOUND },
                { status: 404 }
            );
        }

        return NextResponse.json({ success: true, data: definition });
    } catch (error) {
        return handleApiError(error);
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
                { success: false, error: MSG.WORKFLOW_DEFINITION_NOT_FOUND },
                { status: 404 }
            );
        }

        if (existing.isSystem) {
            return NextResponse.json(
                { success: false, error: MSG.WORKFLOW_SYSTEM_CANNOT_MODIFY },
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
                    { success: false, error: MSG.WORKFLOW_CONFIG_STATES_ARRAY },
                    { status: 400 }
                );
            }
            if (!config.transitions || !Array.isArray(config.transitions)) {
                return NextResponse.json(
                    { success: false, error: MSG.WORKFLOW_CONFIG_TRANSITIONS_ARRAY },
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
    } catch (error) {
        return handleApiError(error);
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
                { success: false, error: MSG.WORKFLOW_DEFINITION_NOT_FOUND },
                { status: 404 }
            );
        }

        if (existing.isSystem) {
            return NextResponse.json(
                { success: false, error: MSG.WORKFLOW_SYSTEM_CANNOT_DELETE },
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
    } catch (error) {
        return handleApiError(error);
    }
}
