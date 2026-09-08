import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requirePermissionForRoute } from '@/lib/session';
import { logAudit } from '@/lib/audit';
import { WorkflowEngine } from '@qalcuity/workflow';
import { workflowTransitionSchema } from '@/lib/validation-schemas';
import { MSG } from '@/lib/api-messages';

/**
 * POST /api/workflow/transition
 * Execute workflow transition untuk entity tertentu.
 *
 * Body:
 * - entityType: string (required) — 'INVOICE', 'QUOTATION', etc.
 * - entityId: string (required) — ID entity
 * - action: string (required) — nama aksi (e.g., 'send', 'pay', 'approve')
 * - notes: string (optional) — catatan tambahan
 */
export async function POST(request: Request) {
    try {
        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) {
            return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
        }
        const { userId, tenantId } = auth;
        const body = await request.json();

        // Validasi input dengan Zod schema
        const validated = workflowTransitionSchema.safeParse(body);
        if (!validated.success) {
            return NextResponse.json(
                { success: false, error: validated.error.issues[0]?.message || MSG.INVALID_INPUT },
                { status: 400 }
            );
        }

        const { entityType, entityId, action, notes } = validated.data;
        const upperEntityType = entityType.toUpperCase();

        // Dapatkan current state dari entity
        const currentState = await getCurrentState(upperEntityType, entityId, tenantId);
        if (currentState === null) {
            return NextResponse.json(
                { success: false, error: `${MSG.WORKFLOW_ENTITY_NOT_FOUND} (${entityType} #${entityId})` },
                { status: 404 }
            );
        }

        // Execute transition via workflow engine
        const result = WorkflowEngine.executeTransition(
            upperEntityType,
            currentState,
            action,
            tenantId
        );

        if (!result.success) {
            return NextResponse.json(
                { success: false, error: result.error || MSG.WORKFLOW_TRANSITION_FAILED },
                { status: 400 }
            );
        }

        // Update state di database
        await updateEntityState(
            upperEntityType,
            entityId,
            tenantId,
            result.toState
        );

        // Catat di workflow history
        await prisma.workflowHistory.create({
            data: {
                tenantId,
                entityType: upperEntityType,
                entityId,
                fromState: result.fromState,
                toState: result.toState,
                action: result.action,
                userId,
                notes: notes || null,
            },
        });

        // Audit logging
        void logAudit({
            userId,
            tenantId,
            action: 'WORKFLOW_TRANSITION',
            entity: upperEntityType,
            entityId,
            newValues: {
                fromState: result.fromState,
                toState: result.toState,
                action: result.action,
            },
            request,
        });

        return NextResponse.json({
            success: true,
            data: {
                entityType: upperEntityType,
                entityId,
                fromState: result.fromState,
                toState: result.toState,
                action: result.action,
            },
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : MSG.INTERNAL_SERVER_ERROR;
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}

// ─── Helper Functions ──────────────────────────────────────────────────────

/**
 * Dapatkan current state dari entity berdasarkan entity type.
 */
async function getCurrentState(
    entityType: string,
    entityId: string,
    tenantId: string
): Promise<string | null> {
    switch (entityType) {
        case 'INVOICE': {
            const invoice = await prisma.invoice.findFirst({
                where: { id: entityId, tenantId },
                select: { status: true },
            });
            return invoice?.status || null;
        }
        case 'QUOTATION': {
            const quotation = await prisma.quotation.findFirst({
                where: { id: entityId, tenantId },
                select: { status: true },
            });
            return quotation?.status || null;
        }
        case 'PURCHASE_ORDER': {
            const po = await prisma.purchaseOrder.findFirst({
                where: { id: entityId, tenantId },
                select: { status: true },
            });
            return po?.status || null;
        }
        case 'LEAVE_REQUEST': {
            const leave = await prisma.leaveRequest.findFirst({
                where: { id: entityId, tenantId },
                select: { status: true },
            });
            return leave?.status || null;
        }
        case 'PAYROLL': {
            const payroll = await prisma.payrollRecord.findFirst({
                where: { id: entityId, tenantId },
                select: { status: true },
            });
            return payroll?.status || null;
        }
        case 'DEAL': {
            const deal = await prisma.deal.findFirst({
                where: { id: entityId, tenantId },
                select: { stage: true },
            });
            return deal?.stage || null;
        }
        default:
            return null;
    }
}

/**
 * Update state/ status di entity.
 */
async function updateEntityState(
    entityType: string,
    entityId: string,
    tenantId: string,
    newState: string
): Promise<void> {
    switch (entityType) {
        case 'INVOICE': {
            const entity = await prisma.invoice.findFirst({ where: { id: entityId, tenantId } });
            if (!entity) throw new Error(MSG.WORKFLOW_ENTITY_NOT_FOUND);
            await prisma.invoice.update({
                where: { id: entityId },
                data: { status: newState },
            });
            break;
        }
        case 'QUOTATION': {
            const entity = await prisma.quotation.findFirst({ where: { id: entityId, tenantId } });
            if (!entity) throw new Error(MSG.WORKFLOW_ENTITY_NOT_FOUND);
            await prisma.quotation.update({
                where: { id: entityId },
                data: { status: newState },
            });
            break;
        }
        case 'PURCHASE_ORDER': {
            const entity = await prisma.purchaseOrder.findFirst({ where: { id: entityId, tenantId } });
            if (!entity) throw new Error(MSG.WORKFLOW_ENTITY_NOT_FOUND);
            await prisma.purchaseOrder.update({
                where: { id: entityId },
                data: { status: newState },
            });
            break;
        }
        case 'LEAVE_REQUEST': {
            const entity = await prisma.leaveRequest.findFirst({ where: { id: entityId, tenantId } });
            if (!entity) throw new Error(MSG.WORKFLOW_ENTITY_NOT_FOUND);
            await prisma.leaveRequest.update({
                where: { id: entityId },
                data: { status: newState },
            });
            break;
        }
        case 'PAYROLL': {
            const entity = await prisma.payrollRecord.findFirst({ where: { id: entityId, tenantId } });
            if (!entity) throw new Error(MSG.WORKFLOW_ENTITY_NOT_FOUND);
            await prisma.payrollRecord.update({
                where: { id: entityId },
                data: { status: newState },
            });
            break;
        }
        case 'DEAL': {
            const entity = await prisma.deal.findFirst({ where: { id: entityId, tenantId } });
            if (!entity) throw new Error(MSG.WORKFLOW_ENTITY_NOT_FOUND);
            await prisma.deal.update({
                where: { id: entityId },
                data: { stage: newState },
            });
            break;
        }
        default:
            throw new Error(`Unsupported entity type: ${entityType}`);
    }
}
