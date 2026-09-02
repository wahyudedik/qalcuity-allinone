/**
 * @qalcuity/web — Workflow Helper
 *
 * Helper functions untuk integrasi workflow engine dengan API routes.
 * Menyediakan fungsi-fungsi yang bisa dipanggil dari API route atau server action.
 */

import { WorkflowEngine, type Transition, type WorkflowDefinition } from '@qalcuity/workflow';
import { prisma } from './db';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface WorkflowHistoryEntry {
    id: string;
    entityType: string;
    entityId: string;
    fromState: string;
    toState: string;
    action: string;
    userId: string;
    userName?: string;
    userEmail?: string;
    notes?: string;
    metadata?: unknown;
    createdAt: Date;
}

// ─── Main Helper Functions ──────────────────────────────────────────────────

/**
 * Execute workflow transition untuk entity.
 *
 * @param entityType - Jenis entity (e.g., 'INVOICE', 'QUOTATION')
 * @param entityId - ID entity
 * @param action - Nama aksi (e.g., 'send', 'pay', 'approve')
 * @param userId - ID user yang melakukan transisi
 * @param tenantId - ID tenant
 * @param notes - Catatan tambahan (opsional)
 * @returns Hasil transisi
 */
export async function transitionWorkflow(
    entityType: string,
    entityId: string,
    action: string,
    userId: string,
    tenantId: string,
    notes?: string
): Promise<{ success: boolean; newState: string; error?: string }> {
    const upperEntityType = entityType.toUpperCase();

    // Dapatkan current state
    const currentState = await getCurrentState(upperEntityType, entityId, tenantId);
    if (currentState === null) {
        return {
            success: false,
            newState: '',
            error: `Entity ${entityType} dengan ID ${entityId} tidak ditemukan`,
        };
    }

    // Execute transition
    const result = WorkflowEngine.executeTransition(
        upperEntityType,
        currentState,
        action,
        tenantId
    );

    if (!result.success) {
        return {
            success: false,
            newState: currentState,
            error: result.error || 'Transisi tidak valid',
        };
    }

    // Update state di database
    await updateEntityState(upperEntityType, entityId, tenantId, result.toState);

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

    return {
        success: true,
        newState: result.toState,
    };
}

/**
 * Dapatkan workflow history untuk entity.
 *
 * @param entityType - Jenis entity
 * @param entityId - ID entity
 * @param tenantId - ID tenant
 * @returns Array workflow history entries
 */
export async function getWorkflowHistory(
    entityType: string,
    entityId: string,
    tenantId: string
): Promise<WorkflowHistoryEntry[]> {
    const history = await prisma.workflowHistory.findMany({
        where: {
            tenantId,
            entityType: entityType.toUpperCase(),
            entityId,
        },
        include: {
            user: {
                select: { id: true, name: true, email: true },
            },
        },
        orderBy: { createdAt: 'desc' },
    });

    return history.map((h) => ({
        id: h.id,
        entityType: h.entityType,
        entityId: h.entityId,
        fromState: h.fromState,
        toState: h.toState,
        action: h.action,
        userId: h.userId,
        userName: h.user.name,
        userEmail: h.user.email,
        notes: h.notes || undefined,
        metadata: h.metadata || undefined,
        createdAt: h.createdAt,
    }));
}

/**
 * Dapatkan available transitions untuk state saat ini.
 *
 * @param entityType - Jenis entity
 * @param currentState - State saat ini
 * @param tenantId - ID tenant
 * @returns Array transisi yang tersedia
 */
export async function getAvailableTransitions(
    entityType: string,
    currentState: string,
    tenantId?: string
): Promise<Transition[]> {
    return WorkflowEngine.getTransitions(entityType, currentState, tenantId);
}

/**
 * Load workflow definitions dari database ke cache.
 * Harus dipanggil saat aplikasi startup atau saat workflow di-update.
 *
 * @param tenantId - ID tenant
 */
export async function loadWorkflowsToCache(tenantId: string): Promise<void> {
    const definitions = await prisma.workflowDefinition.findMany({
        where: { tenantId, isActive: true },
    });

    for (const def of definitions) {
        const config = def.config as unknown as WorkflowDefinition;
        WorkflowEngine.registerWorkflow(tenantId, def.entityType, config);
    }
}

/**
 * Dapatkan workflow definition untuk entity type.
 * Prioritas: custom workflow > default workflow.
 *
 * @param entityType - Jenis entity
 * @param tenantId - ID tenant
 * @returns Workflow definition atau null
 */
export function getWorkflowDefinition(
    entityType: string,
    tenantId?: string
): WorkflowDefinition | null {
    return WorkflowEngine.getWorkflow(entityType, tenantId);
}

// ─── Internal Helper Functions ──────────────────────────────────────────────

/**
 * Dapatkan current state dari entity.
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
 * Update state di entity.
 */
async function updateEntityState(
    entityType: string,
    entityId: string,
    tenantId: string,
    newState: string
): Promise<void> {
    // Verify entity belongs to tenant before update
    const currentState = await getCurrentState(entityType, entityId, tenantId);
    if (currentState === null) {
        throw new Error(`Entity ${entityType} dengan ID ${entityId} tidak ditemukan di tenant ${tenantId}`);
    }

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

// ─── Workflow Transition Validation ────────────────────────────────────────

/**
 * Hasil validasi transisi workflow.
 */
export interface TransitionValidationResult {
    valid: boolean;
    error?: string;
}

/**
 * Validate workflow transition dari status lama ke status baru.
 * Menggunakan WorkflowEngine untuk validasi dan memastikan tenant punya workflow definition.
 *
 * @param tenantId - ID tenant
 * @param entityType - Jenis entity (e.g., 'DEAL', 'INVOICE')
 * @param fromStatus - Status saat ini
 * @param toStatus - Status tujuan
 * @param callerRole - Role user yang melakukan transisi (untuk logging)
 * @returns TransitionValidationResult
 */
export async function validateWorkflowTransition(
    tenantId: string,
    entityType: string,
    fromStatus: string,
    toStatus: string,
    callerRole: string
): Promise<TransitionValidationResult> {
    const upperEntityType = entityType.toUpperCase();
    const upperFrom = fromStatus.toUpperCase();
    const upperTo = toStatus.toUpperCase();

    // Load workflow ke cache jika belum ada
    await loadWorkflowsToCache(tenantId);

    // Cek apakah workflow ada untuk entity type ini
    const workflow = WorkflowEngine.getWorkflow(upperEntityType, tenantId);
    if (!workflow) {
        return {
            valid: false,
            error: `Workflow tidak ditemukan untuk entity type: ${entityType}`,
        };
    }

    // Cek apakah transisi valid
    const canTransit = WorkflowEngine.canTransition(
        upperEntityType,
        upperFrom,
        upperTo,
        tenantId
    );

    if (!canTransit) {
        // Dapatkan transisi yang tersedia dari status saat ini
        const availableTransitions = WorkflowEngine.getTransitions(
            upperEntityType,
            upperFrom,
            tenantId
        );
        const availableTargets = availableTransitions
            .map((t) => t.to)
            .join(', ');

        return {
            valid: false,
            error: `Transisi tidak valid: ${fromStatus} → ${toStatus}. ` +
                `Transisi yang tersedia dari "${fromStatus}": ${availableTargets || 'tidak ada'}`,
        };
    }

    // Cek permission pada transisi
    const transition = workflow.transitions.find(
        (t) =>
            t.from.toUpperCase() === upperFrom &&
            t.to.toUpperCase() === upperTo
    );

    if (transition?.permissions && transition.permissions.length > 0) {
        // Log permission check (permission validation dilakukan di lapisan API route)
        console.log(
            `[Workflow] Transition ${upperFrom} → ${upperTo} requires permissions:`,
            transition.permissions,
            `Caller role: ${callerRole}`
        );
    }

    return { valid: true };
}

// ─── Backward-Compatible Workflow Helpers ──────────────────────────────────

/**
 * Log workflow history ke database dengan backward compatibility.
 * Jika model WorkflowHistory belum tersedia atau ada error, log ke console sebagai fallback.
 *
 * @returns true jika berhasil ditulis ke DB, false jika fallback ke console log
 */
export async function logWorkflowHistory(params: {
    tenantId: string;
    entityType: string;
    entityId: string;
    fromState: string;
    toState: string;
    action: string;
    userId: string;
    notes?: string | null;
}): Promise<boolean> {
    try {
        await prisma.workflowHistory.create({
            data: {
                tenantId: params.tenantId,
                entityType: params.entityType,
                entityId: params.entityId,
                fromState: params.fromState,
                toState: params.toState,
                action: params.action,
                userId: params.userId,
                notes: params.notes || null,
            },
        });
        return true;
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.warn(
            `[Workflow] Gagal menulis workflow history ke DB: ${message}`,
            `\n  Entity: ${params.entityType}#${params.entityId}`,
            `\n  Transition: ${params.fromState} → ${params.toState} (${params.action})`,
            `\n  User: ${params.userId}, Tenant: ${params.tenantId}`
        );
        return false;
    }
}

/**
 * Validate workflow transition dengan backward compatibility.
 * Jika workflow engine tidak tersedia atau gagal, tetap izinkan transisi dengan warning.
 *
 * @returns { valid: true } jika transisi valid atau workflow tidak tersedia,
 *          { valid: false, error: string } jika transisi benar-benar tidak valid
 */
export async function validateWorkflowTransitionSafe(
    tenantId: string,
    entityType: string,
    fromStatus: string,
    toStatus: string,
    callerRole: string
): Promise<TransitionValidationResult> {
    try {
        return await validateWorkflowTransition(tenantId, entityType, fromStatus, toStatus, callerRole);
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.warn(
            `[Workflow] Workflow validation gagal, mengizinkan transisi dengan fallback: ${message}`,
            `\n  Entity: ${entityType}`,
            `\n  Transition: ${fromStatus} → ${toStatus}`,
            `\n  Caller role: ${callerRole}`
        );
        // Backward compatibility: izinkan transisi jika workflow engine gagal
        return { valid: true };
    }
}

/**
 * Validasi transisi workflow menggunakan WorkflowEngine.canTransition().
 * Jika workflow engine gagal, log warning dan izinkan transisi.
 *
 * @returns true jika transisi valid atau workflow tidak tersedia
 */
export function canTransitionSafe(
    entityType: string,
    fromStatus: string,
    toStatus: string,
    tenantId?: string
): boolean {
    try {
        return WorkflowEngine.canTransition(entityType, fromStatus, toStatus, tenantId);
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.warn(
            `[Workflow] canTransition gagal, mengizinkan transisi dengan fallback: ${message}`,
            `\n  Entity: ${entityType}`,
            `\n  Transition: ${fromStatus} → ${toStatus}`
        );
        // Backward compatibility: izinkan transisi jika workflow engine gagal
        return true;
    }
}
