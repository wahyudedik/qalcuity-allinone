// ─── Unlock as Exception Engine (UCE-26) ────────────────────────────────────
// Workflow: User Request → Reason (mandatory) → Manager Approval →
//           Temporary Unlock (expiresAt) → Edit → Auto re-lock.
// Ref: ADR-021 (Emergency Access), ADR-022 (Period Closing).
//
// Storage: Tenant.settings JSON (unlockRequests + temporaryUnlocks) — pola
// delegation.ts, karena LockRecord tidak punya field metadata/JSON dan
// schema.prisma tidak boleh diubah tanpa approval (Option B dari brief).
//
// Cross-reference ApprovalRequest: dibuat HANYA jika tenant mengonfigurasi
// ApprovalLevel untuk entityType 'UNLOCK_REQUEST' (visibility di approval inbox).
// Keputusan tetap melalui endpoint dedicated (approve/reject) karena approval
// engine auto-approve saat tidak ada ApprovalLevel, dan hook updateEntityStatus
// tidak sesuai untuk unlock request (mapping SENT/CANCELLED khusus invoice/PO).

import { prisma } from './db';
import { logger } from './logger';
import { logAudit } from './audit';
import { getApprovalLevels } from './approval';
import { getLockPolicy, isRoleAllowed, type LockLevel } from './lock-policy';

// ─── Types ───────────────────────────────────────────────────────────────────

export type UnlockLevel = LockLevel | 'SPECIFIC';
export type UnlockRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED' | 'CANCELLED';

export interface UnlockPeriodRef {
    id: string;
    name: string;
    startDate: string;
    endDate: string;
    status: string;
}

export interface UnlockRequest {
    id: string;
    tenantId: string;
    level: UnlockLevel;
    /** Berlaku jika level === 'SPECIFIC' */
    periodId: string | null;
    /** Periode target hasil resolusi (bisa lebih dari satu untuk level DAY/MONTH/...) */
    targetPeriods: UnlockPeriodRef[];
    reason: string;
    requestedBy: string;
    requestedByName: string | null;
    requestedByEmail: string | null;
    requestedAt: string;
    status: UnlockRequestStatus;
    decidedBy: string | null;
    decidedByName: string | null;
    decidedAt: string | null;
    decisionComments: string | null;
    temporaryUnlockExpiresAt: string | null;
    temporaryUnlockDurationHours: number | null;
    approvalRequestId: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface TemporaryUnlock {
    id: string;
    tenantId: string;
    unlockRequestId: string;
    level: UnlockLevel;
    periodIds: string[];
    periodNames: string[];
    grantedTo: string;
    grantedToName: string | null;
    approvedBy: string;
    approvedByName: string | null;
    expiresAt: string;
    /**
     * Periode yang di-reopen melalui unlock ini (closeNotes di-set ke marker
     * `unlock:<requestId>`). Saat unlock expired, periode dengan marker ini
     * akan di-auto re-lock (status CLOSED kembali).
     */
    reopenedPeriodIds: string[];
    createdAt: string;
}

export type UnlockErrorCode =
    | 'UNLOCK_REQUEST_NOT_FOUND'
    | 'UNLOCK_REQUEST_NOT_PENDING'
    | 'UNLOCK_SELF_APPROVAL_FORBIDDEN'
    | 'UNLOCK_APPROVAL_FORBIDDEN_ROLE'
    | 'UNLOCK_REQUEST_FORBIDDEN_ROLE'
    | 'UNLOCK_REQUEST_ALREADY_EXISTS'
    | 'UNLOCK_LEVEL_NOT_ALLOWED'
    | 'PERIOD_NOT_FOUND'
    | 'REASON_INVALID';

export interface UnlockActionResult {
    ok: boolean;
    code?: UnlockErrorCode;
    message?: string;
    request?: UnlockRequest;
    temporaryUnlock?: TemporaryUnlock | null;
    /** True jika request langsung di-approve (requireApprovalForUnlock = false) */
    autoApproved?: boolean;
    /** True jika request PENDING duplikat yang sudah ada dikembalikan */
    duplicate?: boolean;
}

// ─── Storage helpers (Tenant.settings JSON) ─────────────────────────────────

function newId(prefix: string): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function parseRequest(raw: Record<string, unknown>, tenantId: string): UnlockRequest {
    return {
        id: String(raw.id || ''),
        tenantId,
        level: (raw.level as UnlockLevel) || 'MONTH',
        periodId: raw.periodId ? String(raw.periodId) : null,
        targetPeriods: Array.isArray(raw.targetPeriods)
            ? (raw.targetPeriods as Array<Record<string, unknown>>).map((p) => ({
                id: String(p.id || ''),
                name: String(p.name || ''),
                startDate: String(p.startDate || ''),
                endDate: String(p.endDate || ''),
                status: String(p.status || ''),
            }))
            : [],
        reason: String(raw.reason || ''),
        requestedBy: String(raw.requestedBy || ''),
        requestedByName: raw.requestedByName ? String(raw.requestedByName) : null,
        requestedByEmail: raw.requestedByEmail ? String(raw.requestedByEmail) : null,
        requestedAt: String(raw.requestedAt || new Date().toISOString()),
        status: (raw.status as UnlockRequestStatus) || 'PENDING',
        decidedBy: raw.decidedBy ? String(raw.decidedBy) : null,
        decidedByName: raw.decidedByName ? String(raw.decidedByName) : null,
        decidedAt: raw.decidedAt ? String(raw.decidedAt) : null,
        decisionComments: raw.decisionComments ? String(raw.decisionComments) : null,
        temporaryUnlockExpiresAt: raw.temporaryUnlockExpiresAt
            ? String(raw.temporaryUnlockExpiresAt)
            : null,
        temporaryUnlockDurationHours:
            typeof raw.temporaryUnlockDurationHours === 'number'
                ? raw.temporaryUnlockDurationHours
                : null,
        approvalRequestId: raw.approvalRequestId ? String(raw.approvalRequestId) : null,
        createdAt: String(raw.createdAt || new Date().toISOString()),
        updatedAt: String(raw.updatedAt || new Date().toISOString()),
    };
}

function parseTemporaryUnlock(raw: Record<string, unknown>, tenantId: string): TemporaryUnlock {
    return {
        id: String(raw.id || ''),
        tenantId,
        unlockRequestId: String(raw.unlockRequestId || ''),
        level: (raw.level as UnlockLevel) || 'MONTH',
        periodIds: Array.isArray(raw.periodIds)
            ? (raw.periodIds as unknown[]).map(String)
            : [],
        periodNames: Array.isArray(raw.periodNames)
            ? (raw.periodNames as unknown[]).map(String)
            : [],
        grantedTo: String(raw.grantedTo || ''),
        grantedToName: raw.grantedToName ? String(raw.grantedToName) : null,
        approvedBy: String(raw.approvedBy || ''),
        approvedByName: raw.approvedByName ? String(raw.approvedByName) : null,
        expiresAt: String(raw.expiresAt || ''),
        reopenedPeriodIds: Array.isArray(raw.reopenedPeriodIds)
            ? (raw.reopenedPeriodIds as unknown[]).map(String)
            : [],
        createdAt: String(raw.createdAt || new Date().toISOString()),
    };
}

async function readSettings(
    tenantId: string
): Promise<{ requests: UnlockRequest[]; unlocks: TemporaryUnlock[] }> {
    const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { settings: true },
    });
    const settings = (tenant?.settings as Record<string, unknown>) || {};

    const rawRequests = Array.isArray(settings.unlockRequests)
        ? (settings.unlockRequests as Array<Record<string, unknown>>)
        : [];
    const rawUnlocks = Array.isArray(settings.temporaryUnlocks)
        ? (settings.temporaryUnlocks as Array<Record<string, unknown>>)
        : [];

    return {
        requests: rawRequests.map((r) => parseRequest(r, tenantId)),
        unlocks: rawUnlocks.map((u) => parseTemporaryUnlock(u, tenantId)),
    };
}

async function writeSettings(
    tenantId: string,
    requests: UnlockRequest[],
    unlocks: TemporaryUnlock[]
): Promise<void> {
    const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { settings: true },
    });
    const settings = (tenant?.settings as Record<string, unknown>) || {};

    await prisma.tenant.update({
        where: { id: tenantId },
        data: {
            settings: {
                ...settings,
                unlockRequests: requests as unknown as Array<Record<string, unknown>>,
                temporaryUnlocks: unlocks as unknown as Array<Record<string, unknown>>,
            } as never,
        },
    });
}

// ─── Period resolution ───────────────────────────────────────────────────────

function windowForLevel(level: LockLevel, from: Date): { start: Date; end: Date } {
    const start = new Date(from);
    const end = new Date(from);
    switch (level) {
        case 'DAY':
            start.setHours(0, 0, 0, 0);
            end.setHours(23, 59, 59, 999);
            break;
        case 'MONTH':
            start.setDate(1);
            start.setHours(0, 0, 0, 0);
            end.setMonth(end.getMonth() + 1, 0);
            end.setHours(23, 59, 59, 999);
            break;
        case 'QUARTER': {
            const qMonth = Math.floor(from.getMonth() / 3) * 3;
            start.setMonth(qMonth, 1);
            start.setHours(0, 0, 0, 0);
            end.setMonth(qMonth + 3, 0);
            end.setHours(23, 59, 59, 999);
            break;
        }
        case 'YEAR':
            start.setMonth(0, 1);
            start.setHours(0, 0, 0, 0);
            end.setMonth(11, 31);
            end.setHours(23, 59, 59, 999);
            break;
    }
    return { start, end };
}

/**
 * Resolusi periode target untuk sebuah unlock request.
 * - level SPECIFIC: wajib periodId, 1 periode.
 * - level DAY/MONTH/QUARTER/YEAR: periode yang overlap dengan window berdasarkan
 *   waktu request (bisa 0..n periode — tidak memblokir request jika window belum
 *   punya periode).
 */
async function resolveTargetPeriods(
    tenantId: string,
    level: UnlockLevel,
    periodId?: string
): Promise<{ periods: UnlockPeriodRef[]; error?: UnlockErrorCode }> {
    if (level === 'SPECIFIC') {
        if (!periodId) return { periods: [], error: 'PERIOD_NOT_FOUND' };
        const period = await prisma.accountingPeriod.findFirst({
            where: { id: periodId, tenantId },
        });
        if (!period) return { periods: [], error: 'PERIOD_NOT_FOUND' };
        return {
            periods: [
                {
                    id: period.id,
                    name: period.name,
                    startDate: period.startDate.toISOString(),
                    endDate: period.endDate.toISOString(),
                    status: period.status,
                },
            ],
        };
    }

    const { start, end } = windowForLevel(level, new Date());
    const periods = await prisma.accountingPeriod.findMany({
        where: {
            tenantId,
            startDate: { lte: end },
            endDate: { gte: start },
        },
        orderBy: { startDate: 'desc' },
    });

    return {
        periods: periods.map((p) => ({
            id: p.id,
            name: p.name,
            startDate: p.startDate.toISOString(),
            endDate: p.endDate.toISOString(),
            status: p.status,
        })),
    };
}

// ─── Sweep (auto-expire + auto re-lock) ──────────────────────────────────────

/** Marker closeNotes untuk periode yang di-reopen melalui temporary unlock. */
export function unlockReopenMarker(requestId: string): string {
    return `unlock:${requestId}`;
}

/**
 * Sweep temporary unlock yang sudah expired:
 * 1. Periode yang di-reopen via unlock (closeNotes = marker) → auto re-lock (CLOSED).
 * 2. Request terkait → status EXPIRED.
 * 3. Entri temporaryUnlock yang expired dihapus dari settings.
 *
 * @returns Jumlah temporary unlock yang di-expire
 */
export async function sweepExpiredTemporaryUnlocks(tenantId: string): Promise<number> {
    try {
        const { requests, unlocks } = await readSettings(tenantId);
        const now = new Date();

        const expired = unlocks.filter((u) => u.expiresAt && new Date(u.expiresAt) <= now);
        if (expired.length === 0) return 0;

        for (const unlock of expired) {
            // Auto re-lock periode yang di-reopen melalui unlock ini
            for (const periodId of unlock.reopenedPeriodIds) {
                const marker = unlockReopenMarker(unlock.unlockRequestId);
                const period = await prisma.accountingPeriod.findFirst({
                    where: { id: periodId, tenantId },
                    select: { id: true, status: true, closeNotes: true },
                });
                if (period && period.status === 'OPEN' && period.closeNotes === marker) {
                    await prisma.accountingPeriod.update({
                        where: { id: periodId },
                        data: {
                            status: 'CLOSED',
                            closedAt: new Date(),
                            closeNotes: `Auto re-locked after temporary unlock (${unlock.unlockRequestId})`,
                        },
                    });
                    void logAudit({
                        userId: 'system',
                        tenantId,
                        action: 'UPDATE',
                        entity: 'AccountingPeriod',
                        entityId: periodId,
                        oldValues: { status: 'OPEN', unlockRequestId: unlock.unlockRequestId },
                        newValues: {
                            status: 'CLOSED',
                            reason: 'Auto re-locked after temporary unlock expired',
                        },
                    });
                }
            }

            // Request terkait → EXPIRED
            const request = requests.find((r) => r.id === unlock.unlockRequestId);
            if (request && request.status === 'APPROVED') {
                request.status = 'EXPIRED';
                request.updatedAt = now.toISOString();
                void logAudit({
                    userId: 'system',
                    tenantId,
                    action: 'UPDATE',
                    entity: 'UnlockRequest',
                    entityId: request.id,
                    oldValues: { status: 'APPROVED' },
                    newValues: { status: 'EXPIRED', reason: 'Temporary unlock expired' },
                });
            }
        }

        const remainingUnlocks = unlocks.filter(
            (u) => !u.expiresAt || new Date(u.expiresAt) > now
        );
        await writeSettings(tenantId, requests, remainingUnlocks);

        logger.info(
            `[UnlockRequest] Swept ${expired.length} expired temporary unlock(s)`,
            { tenantId, count: expired.length }
        );

        return expired.length;
    } catch (error) {
        logger.error('[UnlockRequest] Sweep failed', { tenantId, error });
        return 0;
    }
}

// ─── Temporary unlock queries ────────────────────────────────────────────────

/**
 * Daftar temporary unlock yang masih aktif untuk tenant.
 */
export async function getActiveTemporaryUnlocks(tenantId: string): Promise<TemporaryUnlock[]> {
    await sweepExpiredTemporaryUnlocks(tenantId);
    const { unlocks } = await readSettings(tenantId);
    const now = new Date();
    return unlocks.filter((u) => u.expiresAt && new Date(u.expiresAt) > now);
}

/**
 * Cek apakah ada temporary unlock aktif.
 * @param periodId - Jika diisi, hanya unlock yang mencakup periode tersebut.
 */
export async function hasActiveTemporaryUnlock(
    tenantId: string,
    periodId?: string
): Promise<boolean> {
    const active = await getActiveTemporaryUnlocks(tenantId);
    if (!periodId) return active.length > 0;
    return active.some((u) => u.periodIds.includes(periodId));
}

/**
 * Temporary unlock aktif untuk satu periode tertentu (untuk integrasi locks API).
 */
export async function getActiveTemporaryUnlockForPeriod(
    tenantId: string,
    periodId: string
): Promise<TemporaryUnlock | null> {
    const active = await getActiveTemporaryUnlocks(tenantId);
    return active.find((u) => u.periodIds.includes(periodId)) ?? null;
}

// ─── Request lifecycle ───────────────────────────────────────────────────────

/**
 * Buat unlock request (UCE-26). Jika policy.requireApprovalForUnlock = false,
 * request langsung di-approve (auto temporary unlock).
 */
export async function requestUnlock(params: {
    tenantId: string;
    userId: string;
    userRole: string;
    userName?: string | null;
    userEmail?: string | null;
    level: UnlockLevel;
    periodId?: string;
    reason: string;
    request?: Request;
}): Promise<UnlockActionResult> {
    const { tenantId, userId, userRole, userName, userEmail, level, periodId, reason, request } =
        params;

    const policy = await getLockPolicy(tenantId);

    if (!isRoleAllowed(policy, userRole, 'unlockRequest')) {
        return {
            ok: false,
            code: 'UNLOCK_REQUEST_FORBIDDEN_ROLE',
            message: 'Your role is not allowed to submit unlock requests',
        };
    }

    const trimmedReason = (reason || '').trim();
    if (trimmedReason.length < 20 || trimmedReason.length > 1000) {
        return {
            ok: false,
            code: 'REASON_INVALID',
            message: 'Reason must be between 20 and 1000 characters',
        };
    }

    if (level !== 'SPECIFIC' && !policy.enabledLockLevels.includes(level as LockLevel)) {
        return {
            ok: false,
            code: 'UNLOCK_LEVEL_NOT_ALLOWED',
            message: `Lock level ${level} is not enabled by your company lock policy`,
        };
    }

    const { periods, error } = await resolveTargetPeriods(tenantId, level, periodId);
    if (error) {
        return {
            ok: false,
            code: error,
            message:
                error === 'PERIOD_NOT_FOUND'
                    ? 'Period not found or access denied'
                    : 'Invalid unlock target',
        };
    }

    await sweepExpiredTemporaryUnlocks(tenantId);
    const { requests, unlocks } = await readSettings(tenantId);

    // Dedup: PENDING request dengan target sama (periodId atau level) dikembalikan
    const duplicate = requests.find(
        (r) =>
            r.status === 'PENDING' &&
            r.requestedBy === userId &&
            (level === 'SPECIFIC'
                ? r.periodId === periodId
                : r.level === level && r.periodId == null)
    );
    if (duplicate) {
        return {
            ok: true,
            duplicate: true,
            request: duplicate,
            message: 'A pending unlock request already exists for this target',
        };
    }

    const nowIso = new Date().toISOString();
    const autoApprove = !policy.requireApprovalForUnlock;
    const expiresAt = new Date(
        Date.now() + policy.temporaryUnlockDurationHours * 60 * 60 * 1000
    );

    const newRequest: UnlockRequest = {
        id: newId('ulr'),
        tenantId,
        level,
        periodId: level === 'SPECIFIC' ? (periodId ?? null) : null,
        targetPeriods: periods,
        reason: trimmedReason,
        requestedBy: userId,
        requestedByName: userName ?? null,
        requestedByEmail: userEmail ?? null,
        requestedAt: nowIso,
        status: autoApprove ? 'APPROVED' : 'PENDING',
        decidedBy: autoApprove ? 'system' : null,
        decidedByName: autoApprove ? 'Auto-approved (approval not required)' : null,
        decidedAt: autoApprove ? nowIso : null,
        decisionComments: autoApprove
            ? 'Auto-approved because requireApprovalForUnlock is disabled'
            : null,
        temporaryUnlockExpiresAt: autoApprove ? expiresAt.toISOString() : null,
        temporaryUnlockDurationHours: autoApprove ? policy.temporaryUnlockDurationHours : null,
        approvalRequestId: null,
        createdAt: nowIso,
        updatedAt: nowIso,
    };

    let temporaryUnlock: TemporaryUnlock | null = null;

    if (autoApprove) {
        temporaryUnlock = {
            id: newId('tul'),
            tenantId,
            unlockRequestId: newRequest.id,
            level,
            periodIds: periods.map((p) => p.id),
            periodNames: periods.map((p) => p.name),
            grantedTo: userId,
            grantedToName: userName ?? null,
            approvedBy: 'system',
            approvedByName: 'Auto-approved (approval not required)',
            expiresAt: expiresAt.toISOString(),
            reopenedPeriodIds: [],
            createdAt: nowIso,
        };
        unlocks.push(temporaryUnlock);
    } else {
        // Cross-reference ApprovalRequest — hanya jika tenant mengonfigurasi
        // ApprovalLevel untuk entityType 'UNLOCK_REQUEST' (visibility di inbox).
        try {
            const levels = await getApprovalLevels(tenantId, 'UNLOCK_REQUEST');
            if (levels.length > 0) {
                const approvalRequest = await prisma.approvalRequest.create({
                    data: {
                        tenantId,
                        entityType: 'UNLOCK_REQUEST',
                        entityId: newRequest.id,
                        currentLevel: 1,
                        status: 'PENDING',
                        requestedBy: userId,
                        requestedAt: new Date(),
                    },
                });
                newRequest.approvalRequestId = approvalRequest.id;
            }
        } catch (crossRefError) {
            logger.warn(
                '[UnlockRequest] Failed to create ApprovalRequest cross-reference',
                { tenantId, requestId: newRequest.id, error: crossRefError }
            );
        }
    }

    requests.push(newRequest);
    await writeSettings(tenantId, requests, unlocks);

    void logAudit({
        userId,
        tenantId,
        action: 'CREATE',
        entity: 'UnlockRequest',
        entityId: newRequest.id,
        newValues: {
            level,
            periodId: newRequest.periodId,
            targetPeriods: periods.map((p) => p.name),
            reason: trimmedReason,
            status: newRequest.status,
        },
        request,
    });

    logger.info('[UnlockRequest] Unlock request created', {
        tenantId,
        requestId: newRequest.id,
        level,
        status: newRequest.status,
    });

    return {
        ok: true,
        request: newRequest,
        temporaryUnlock,
        autoApproved: autoApprove,
    };
}

/**
 * Approve/reject unlock request. Self-approval dicegah.
 * Saat APPROVED: temporary unlock dibuat dengan expiresAt = now + policy.temporaryUnlockDurationHours.
 */
export async function decideUnlockRequest(params: {
    tenantId: string;
    requestId: string;
    approverId: string;
    approverRole: string;
    approverName?: string | null;
    decision: 'APPROVED' | 'REJECTED';
    comments?: string;
    request?: Request;
}): Promise<UnlockActionResult> {
    const {
        tenantId,
        requestId,
        approverId,
        approverRole,
        approverName,
        decision,
        comments,
        request,
    } = params;

    const policy = await getLockPolicy(tenantId);

    if (!isRoleAllowed(policy, approverRole, 'unlockApprove')) {
        return {
            ok: false,
            code: 'UNLOCK_APPROVAL_FORBIDDEN_ROLE',
            message: 'Your role is not allowed to approve or reject unlock requests',
        };
    }

    await sweepExpiredTemporaryUnlocks(tenantId);
    const { requests, unlocks } = await readSettings(tenantId);

    const target = requests.find((r) => r.id === requestId);
    if (!target) {
        return { ok: false, code: 'UNLOCK_REQUEST_NOT_FOUND', message: 'Unlock request not found' };
    }

    if (target.status !== 'PENDING') {
        return {
            ok: false,
            code: 'UNLOCK_REQUEST_NOT_PENDING',
            message: 'Unlock request is not pending',
        };
    }

    if (target.requestedBy === approverId) {
        return {
            ok: false,
            code: 'UNLOCK_SELF_APPROVAL_FORBIDDEN',
            message: 'Cannot approve or reject your own unlock request',
        };
    }

    const now = new Date();
    const nowIso = now.toISOString();
    let temporaryUnlock: TemporaryUnlock | null = null;

    if (decision === 'APPROVED') {
        const expiresAt = new Date(
            Date.now() + policy.temporaryUnlockDurationHours * 60 * 60 * 1000
        );
        temporaryUnlock = {
            id: newId('tul'),
            tenantId,
            unlockRequestId: target.id,
            level: target.level,
            periodIds: target.targetPeriods.map((p) => p.id),
            periodNames: target.targetPeriods.map((p) => p.name),
            grantedTo: target.requestedBy,
            grantedToName: target.requestedByName,
            approvedBy: approverId,
            approvedByName: approverName ?? null,
            expiresAt: expiresAt.toISOString(),
            reopenedPeriodIds: [],
            createdAt: nowIso,
        };
        unlocks.push(temporaryUnlock);

        target.temporaryUnlockExpiresAt = expiresAt.toISOString();
        target.temporaryUnlockDurationHours = policy.temporaryUnlockDurationHours;
    }

    const oldStatus = target.status;
    target.status = decision;
    target.decidedBy = approverId;
    target.decidedByName = approverName ?? null;
    target.decidedAt = nowIso;
    target.decisionComments = comments?.trim() || null;
    target.updatedAt = nowIso;

    await writeSettings(tenantId, requests, unlocks);

    // Sinkron ApprovalRequest cross-reference (jika ada)
    if (target.approvalRequestId) {
        try {
            await prisma.approvalRequest.updateMany({
                where: {
                    tenantId,
                    id: target.approvalRequestId,
                    entityType: 'UNLOCK_REQUEST',
                    status: 'PENDING',
                },
                data: {
                    status: decision,
                    resolvedBy: approverId,
                    resolvedAt: now,
                    comments: comments?.trim() || null,
                },
            });
        } catch (syncError) {
            logger.warn('[UnlockRequest] Failed to sync ApprovalRequest', {
                tenantId,
                requestId: target.id,
                error: syncError,
            });
        }
    }

    void logAudit({
        userId: approverId,
        tenantId,
        action: 'UPDATE',
        entity: 'UnlockRequest',
        entityId: target.id,
        oldValues: { status: oldStatus },
        newValues: {
            status: decision,
            decidedBy: approverId,
            comments: comments?.trim() || null,
            temporaryUnlockExpiresAt: target.temporaryUnlockExpiresAt,
        },
        request,
    });

    logger.info('[UnlockRequest] Unlock request decided', {
        tenantId,
        requestId: target.id,
        decision,
        approverId,
    });

    return {
        ok: true,
        request: target,
        temporaryUnlock,
    };
}

// ─── Queries ─────────────────────────────────────────────────────────────────

export interface ListUnlockRequestsParams {
    tenantId: string;
    status?: string;
    /** Filter hanya milik user ini */
    requesterId?: string;
    /** Hanya temporary unlock yang masih aktif */
    active?: boolean;
    page?: number;
    limit?: number;
}

/**
 * List unlock request dengan filter status/user/active + pagination.
 * Status EXPIRED dihitung dari temporaryUnlockExpiresAt (sweep sudah jalan).
 */
export async function listUnlockRequests(params: ListUnlockRequestsParams): Promise<{
    data: Array<UnlockRequest & { temporaryUnlockActive: boolean; minutesRemaining: number }>;
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}> {
    const { tenantId, status, requesterId, active } = params;
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 20));

    await sweepExpiredTemporaryUnlocks(tenantId);
    const { requests } = await readSettings(tenantId);
    const now = new Date();

    let list = requests.map((r) => {
        const unlockActive =
            r.status === 'APPROVED' &&
            !!r.temporaryUnlockExpiresAt &&
            new Date(r.temporaryUnlockExpiresAt) > now;
        const effectiveStatus: UnlockRequestStatus =
            r.status === 'APPROVED' && !unlockActive ? 'EXPIRED' : r.status;
        return {
            ...r,
            status: effectiveStatus,
            temporaryUnlockActive: unlockActive,
            minutesRemaining: unlockActive
                ? Math.max(
                    0,
                    Math.round(
                        (new Date(r.temporaryUnlockExpiresAt as string).getTime() -
                            now.getTime()) /
                        (1000 * 60)
                    )
                )
                : 0,
        };
    });

    if (status && status !== 'all') {
        list = list.filter((r) => r.status === status.toUpperCase());
    }
    if (requesterId) {
        list = list.filter((r) => r.requestedBy === requesterId);
    }
    if (active) {
        list = list.filter((r) => r.temporaryUnlockActive);
    }

    list.sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());

    const total = list.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const start = (page - 1) * limit;

    return {
        data: list.slice(start, start + limit),
        total,
        page,
        limit,
        totalPages,
    };
}

/**
 * Ambil satu unlock request beserta status temporary unlock aktifnya.
 */
export async function getUnlockRequestById(params: {
    tenantId: string;
    requestId: string;
}): Promise<{
    request: (UnlockRequest & { temporaryUnlockActive: boolean; minutesRemaining: number }) | null;
    temporaryUnlock: TemporaryUnlock | null;
}> {
    const { tenantId, requestId } = params;

    await sweepExpiredTemporaryUnlocks(tenantId);
    const { requests } = await readSettings(tenantId);

    const found = requests.find((r) => r.id === requestId);
    if (!found) return { request: null, temporaryUnlock: null };

    const now = new Date();
    const unlockActive =
        found.status === 'APPROVED' &&
        !!found.temporaryUnlockExpiresAt &&
        new Date(found.temporaryUnlockExpiresAt) > now;

    const effectiveStatus: UnlockRequestStatus =
        found.status === 'APPROVED' && !unlockActive ? 'EXPIRED' : found.status;

    const { unlocks } = await readSettings(tenantId);
    const temporaryUnlock =
        unlocks.find((u) => u.unlockRequestId === requestId) ?? null;

    return {
        request: {
            ...found,
            status: effectiveStatus,
            temporaryUnlockActive: unlockActive,
            minutesRemaining: unlockActive
                ? Math.max(
                    0,
                    Math.round(
                        (new Date(found.temporaryUnlockExpiresAt as string).getTime() -
                            now.getTime()) /
                        (1000 * 60)
                    )
                )
                : 0,
        },
        temporaryUnlock,
    };
}
