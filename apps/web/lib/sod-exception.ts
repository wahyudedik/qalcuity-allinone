/**
 * @qalcuity/web — SoD Exception Workflow
 *
 * Manages exceptions to Separation of Duties rules.
 * Users can request temporary exceptions with business justification,
 * which require approver authorization.
 *
 * Phase 3 — UCE SoD Engine
 */

import { prisma } from '@/lib/db';
import { logAudit } from '@/lib/audit';
import { logger } from '@/lib/logger';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface SoDExceptionResult {
    id: string;
    ruleId: string;
    userId: string;
    reason: string;
    status: string;
    expiresAt: Date;
    createdAt: Date;
}

export interface SoDDecisionResult {
    id: string;
    ruleId: string;
    userId: string;
    status: string;
    approverId: string;
    decision: string;
    decidedAt: Date;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const DEFAULT_EXCEPTION_DAYS = 30; // Default exception validity: 30 days
const MAX_EXCEPTION_DAYS = 90;     // Maximum exception validity: 90 days

// ─── Core Functions ─────────────────────────────────────────────────────────

/**
 * Request a SoD exception.
 * Creates a pending exception request that requires approver authorization.
 *
 * @param params.tenantId - Tenant ID
 * @param params.ruleId - SoD Rule ID to request exception for
 * @param params.userId - User requesting the exception
 * @param params.reason - Business justification for the exception
 * @param params.durationDays - Optional duration in days (default: 30, max: 90)
 * @param params.request - Optional Request object for audit logging
 * @returns The created exception record
 */
export async function requestSoDException(params: {
    tenantId: string;
    ruleId: string;
    userId: string;
    reason: string;
    durationDays?: number;
    request?: Request;
}): Promise<SoDExceptionResult> {
    const { tenantId, ruleId, userId, reason, durationDays, request } = params;

    // Verify the SoD rule exists and belongs to tenant
    const rule = await prisma.soDRule.findFirst({
        where: { id: ruleId, tenantId },
    });

    if (!rule) {
        throw new Error('SoD Rule tidak ditemukan');
    }

    // Check if user already has a pending or approved exception for this rule
    const existingException = await prisma.soDException.findFirst({
        where: {
            tenantId,
            ruleId,
            userId,
            status: { in: ['PENDING', 'APPROVED'] },
        },
    });

    if (existingException) {
        if (existingException.status === 'APPROVED' && existingException.expiresAt > new Date()) {
            throw new Error('Anda sudah memiliki exception yang aktif untuk rule ini');
        }
        if (existingException.status === 'PENDING') {
            throw new Error('Anda sudah memiliki request exception yang pending untuk rule ini');
        }
    }

    // Calculate expiry date
    const days = Math.min(durationDays ?? DEFAULT_EXCEPTION_DAYS, MAX_EXCEPTION_DAYS);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + days);

    const exception = await prisma.soDException.create({
        data: {
            tenantId,
            ruleId,
            userId,
            reason,
            status: 'PENDING',
            expiresAt,
        },
    });

    void logAudit({
        userId,
        tenantId,
        action: 'CREATE',
        entity: 'SoDException',
        entityId: exception.id,
        newValues: {
            ruleId,
            ruleName: rule.name,
            reason,
            durationDays: days,
            expiresAt: expiresAt.toISOString(),
        },
        request,
    });

    logger.info(`[SoDException] Exception requested: ${exception.id} for rule ${rule.name}`, {
        tenantId,
        userId,
        ruleId,
    });

    return {
        id: exception.id,
        ruleId: exception.ruleId,
        userId: exception.userId,
        reason: exception.reason,
        status: exception.status,
        expiresAt: exception.expiresAt,
        createdAt: exception.createdAt,
    };
}

/**
 * Approve or reject a SoD exception request.
 *
 * @param params.exceptionId - Exception ID
 * @param params.approverId - Approver's user ID
 * @param params.decision - "APPROVED" or "REJECTED"
 * @param params.comments - Optional decision comments
 * @param params.request - Optional Request object for audit logging
 * @returns The updated exception record
 */
export async function approveSoDException(params: {
    exceptionId: string;
    approverId: string;
    decision: 'APPROVED' | 'REJECTED';
    comments?: string;
    request?: Request;
}): Promise<SoDDecisionResult> {
    const { exceptionId, approverId, decision, comments, request } = params;

    const exception = await prisma.soDException.findUnique({
        where: { id: exceptionId },
    });

    if (!exception) {
        throw new Error('SoD Exception tidak ditemukan');
    }

    if (exception.status !== 'PENDING') {
        throw new Error('Exception sudah diproses sebelumnya');
    }

    // Prevent self-approval
    if (exception.userId === approverId) {
        throw new Error('Tidak boleh menyetujui exception sendiri');
    }

    const updated = await prisma.soDException.update({
        where: { id: exceptionId },
        data: {
            status: decision,
            approverId,
            decision: comments ?? null,
            decidedAt: new Date(),
        },
    });

    void logAudit({
        userId: approverId,
        tenantId: exception.tenantId,
        action: 'UPDATE',
        entity: 'SoDException',
        entityId: exceptionId,
        oldValues: { status: 'PENDING' },
        newValues: {
            status: decision,
            approverId,
            decision: comments ?? null,
            ruleId: exception.ruleId,
            requestedBy: exception.userId,
        },
        request,
    });

    logger.info(`[SoDException] Exception ${exceptionId} ${decision.toLowerCase()} by ${approverId}`, {
        tenantId: exception.tenantId,
    });

    return {
        id: updated.id,
        ruleId: updated.ruleId,
        userId: updated.userId,
        status: updated.status,
        approverId: approverId,
        decision: comments ?? decision,
        decidedAt: updated.decidedAt!,
    };
}

/**
 * Expire all SoD exceptions that have passed their expiry date.
 * Should be called periodically (e.g., via cron job).
 *
 * @param tenantId - Optional tenant ID (if null, processes all tenants)
 * @returns Number of expired exceptions
 */
export async function expireSoDExceptions(tenantId?: string): Promise<number> {
    const where: Record<string, unknown> = {
        status: 'APPROVED',
        expiresAt: { lt: new Date() },
    };

    if (tenantId) {
        where.tenantId = tenantId;
    }

    const expiredExceptions = await prisma.soDException.findMany({
        where,
        select: { id: true, tenantId: true, userId: true, ruleId: true },
    });

    if (expiredExceptions.length === 0) {
        return 0;
    }

    await prisma.soDException.updateMany({
        where,
        data: { status: 'EXPIRED' },
    });

    for (const ex of expiredExceptions) {
        void logAudit({
            userId: 'system',
            tenantId: ex.tenantId,
            action: 'UPDATE',
            entity: 'SoDException',
            entityId: ex.id,
            oldValues: { status: 'APPROVED' },
            newValues: { status: 'EXPIRED', reason: 'Auto-expired' },
        });
    }

    logger.info(`[SoDException] Expired ${expiredExceptions.length} SoD exceptions`, { tenantId });

    return expiredExceptions.length;
}

/**
 * Get all SoD exceptions for a tenant, optionally filtered by status or user.
 *
 * @param params.tenantId - Tenant ID
 * @param params.status - Optional status filter
 * @param params.userId - Optional user filter
 * @param params.ruleId - Optional rule filter
 * @returns Array of exception records
 */
export async function getSoDExceptions(params: {
    tenantId: string;
    status?: string;
    userId?: string;
    ruleId?: string;
}) {
    const { tenantId, status, userId, ruleId } = params;

    const where: Record<string, unknown> = { tenantId };
    if (status) where.status = status;
    if (userId) where.userId = userId;
    if (ruleId) where.ruleId = ruleId;

    return prisma.soDException.findMany({
        where,
        orderBy: { createdAt: 'desc' },
    });
}

/**
 * Get a single SoD exception by ID.
 *
 * @param params.exceptionId - Exception ID
 * @param params.tenantId - Tenant ID
 * @returns The exception record or null
 */
export async function getSoDExceptionById(params: {
    exceptionId: string;
    tenantId: string;
}) {
    const { exceptionId, tenantId } = params;

    return prisma.soDException.findFirst({
        where: { id: exceptionId, tenantId },
    });
}
