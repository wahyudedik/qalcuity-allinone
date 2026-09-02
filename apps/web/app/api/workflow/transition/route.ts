import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requirePermissionForRoute } from '@/lib/session';
import { logAudit } from '@/lib/audit';
import { WorkflowEngine } from '@qalcuity/workflow';

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

        const { entityType, entityId, action, notes } = body;

        // Validasi input
        if (!entityType || !entityId || !action) {
            return NextResponse.json(
                { success: false, error: 'entityType, entityId, dan action wajib diisi' },
                { status: 400 }
            );
        }

        const upperEntityType = entityType.toUpperCase();

        // Dapatkan current state dari entity
        const currentState = await getCurrentState(upperEntityType, entityId, tenantId);
        if (currentState === null) {
            return NextResponse.json(
                { success: false, error: `Entity ${entityType} dengan ID ${entityId} tidak ditemukan` },
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
                { success: false, error: result.error || 'Transisi tidak valid' },
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
        const message = error instanceof Error ? error.message : 'Internal server error';
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
        case 'INVOICE':
            await prisma.invoice.update({
                where: { id: entityId },
                data: { status: newState },
            });
            break;
        case 'QUOTATION':
            await prisma.quotation.update({
                where: { id: entityId },
                data: { status: newState },
            });
            break;
        case 'PURCHASE_ORDER':
            await prisma.purchaseOrder.update({
                where: { id: entityId },
                data: { status: newState },
            });
            break;
        case 'LEAVE_REQUEST':
            await prisma.leaveRequest.update({
                where: { id: entityId },
                data: { status: newState },
            });
            break;
        case 'PAYROLL':
            await prisma.payrollRecord.update({
                where: { id: entityId },
                data: { status: newState },
            });
            break;
        case 'DEAL':
            await prisma.deal.update({
                where: { id: entityId },
                data: { stage: newState },
            });
            break;
        default:
            throw new Error(`Unsupported entity type: ${entityType}`);
    }
}
