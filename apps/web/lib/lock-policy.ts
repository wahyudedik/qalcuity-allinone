// ─── Lock Policy Engine (UCE-25) ────────────────────────────────────────────
// Per-company (per-tenant) configurable lock policy.
//
// Konfigurasi disimpan di Tenant.settings JSON (bukan model baru di schema.prisma,
// mengikuti pola delegation.ts) — karena schema.prisma tidak boleh diubah tanpa
// approval. Gap yang dicatat:
//   - Tidak ada model LockPolicy dedicated → storage: Tenant.settings.lockPolicy
//   - Auto-lock timing di-enforce secara lazy (read-time) via enforceAutoLock(),
//     bukan cron — karena menambah cron task di luar scope session ini.
//
// Referensi: ADR-021 (Emergency Access), ADR-022 (Period Closing), UCE-24 (Locks).

import { prisma } from './db';
import { logger } from './logger';
import { logAudit } from './audit';

// ─── Types ───────────────────────────────────────────────────────────────────

export type LockLevel = 'DAY' | 'MONTH' | 'QUARTER' | 'YEAR';

/** Aksi yang dikendalikan oleh lock policy */
export type LockAction = 'lock' | 'unlock' | 'unlockRequest' | 'unlockApprove';

export interface LockPolicyConfig {
    /** Level lock yang diaktifkan untuk tenant ini */
    enabledLockLevels: LockLevel[];
    /** Role yang boleh mengakui/melepas lock (LockRecord) */
    allowedLockRoles: string[];
    /** Role yang boleh mengajukan unlock request (UCE-26) */
    allowedUnlockRequestRoles: string[];
    /** Role yang boleh approve/reject unlock request */
    allowedUnlockApproverRoles: string[];
    /**
     * Auto-lock timing: periode OPEN yang endDate-nya sudah lewat lebih dari
     * N hari akan otomatis di-CLOSED. 0 = disabled (default, safe rollout).
     */
    autoLockAfterDays: number;
    /**
     * Jika true, membuka periode terkunci (unlock) harus melalui approval flow
     * (unlock request → manager approval → temporary unlock).
     */
    requireApprovalForUnlock: boolean;
    /** Durasi temporary unlock dalam jam (default 24, max 168) */
    temporaryUnlockDurationHours: number;
}

export const DEFAULT_LOCK_POLICY: LockPolicyConfig = {
    enabledLockLevels: ['DAY', 'MONTH', 'QUARTER', 'YEAR'],
    allowedLockRoles: ['ADMIN', 'SUPERADMIN'],
    allowedUnlockRequestRoles: ['ADMIN', 'SUPERADMIN', 'MEMBER'],
    allowedUnlockApproverRoles: ['ADMIN', 'SUPERADMIN'],
    autoLockAfterDays: 0,
    requireApprovalForUnlock: true,
    temporaryUnlockDurationHours: 24,
};

const LOCK_LEVELS: readonly string[] = ['DAY', 'MONTH', 'QUARTER', 'YEAR'];
const KNOWN_ROLES: readonly string[] = ['SUPERADMIN', 'ADMIN', 'MEMBER', 'VIEWER'];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function normalizeStringArray(value: unknown, allowed: readonly string[]): string[] | null {
    if (!Array.isArray(value)) return null;
    const result = value.filter(
        (v): v is string => typeof v === 'string' && allowed.includes(v)
    );
    return result.length > 0 ? result : null;
}

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
    if (typeof value !== 'number' || Number.isNaN(value)) return fallback;
    return Math.min(max, Math.max(min, Math.floor(value)));
}

/** Normalisasi raw settings JSON menjadi LockPolicyConfig yang valid. */
export function normalizeLockPolicy(raw: unknown): LockPolicyConfig {
    const source = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;

    const enabledLockLevels =
        (normalizeStringArray(source.enabledLockLevels, LOCK_LEVELS) as LockLevel[] | null) ??
        DEFAULT_LOCK_POLICY.enabledLockLevels;

    return {
        enabledLockLevels,
        allowedLockRoles:
            normalizeStringArray(source.allowedLockRoles, KNOWN_ROLES) ??
            DEFAULT_LOCK_POLICY.allowedLockRoles,
        allowedUnlockRequestRoles:
            normalizeStringArray(source.allowedUnlockRequestRoles, KNOWN_ROLES) ??
            DEFAULT_LOCK_POLICY.allowedUnlockRequestRoles,
        allowedUnlockApproverRoles:
            normalizeStringArray(source.allowedUnlockApproverRoles, KNOWN_ROLES) ??
            DEFAULT_LOCK_POLICY.allowedUnlockApproverRoles,
        autoLockAfterDays: clampNumber(
            source.autoLockAfterDays,
            0,
            30,
            DEFAULT_LOCK_POLICY.autoLockAfterDays
        ),
        requireApprovalForUnlock:
            typeof source.requireApprovalForUnlock === 'boolean'
                ? source.requireApprovalForUnlock
                : DEFAULT_LOCK_POLICY.requireApprovalForUnlock,
        temporaryUnlockDurationHours: clampNumber(
            source.temporaryUnlockDurationHours,
            1,
            168,
            DEFAULT_LOCK_POLICY.temporaryUnlockDurationHours
        ),
    };
}

// ─── Read / Write ────────────────────────────────────────────────────────────

/**
 * Ambil lock policy tenant. Mengembalikan DEFAULT_LOCK_POLICY jika belum dikonfigurasi.
 */
export async function getLockPolicy(tenantId: string): Promise<LockPolicyConfig> {
    try {
        const tenant = await prisma.tenant.findUnique({
            where: { id: tenantId },
            select: { settings: true },
        });

        if (!tenant?.settings) return { ...DEFAULT_LOCK_POLICY };

        const settings = tenant.settings as Record<string, unknown>;
        return normalizeLockPolicy(settings.lockPolicy);
    } catch (error) {
        logger.error('[LockPolicy] Failed to read lock policy', { tenantId, error });
        return { ...DEFAULT_LOCK_POLICY };
    }
}

/**
 * Update lock policy tenant (merge dengan config saat ini).
 * Penyimpanan: Tenant.settings.lockPolicy (JSON) — pola delegation.ts.
 */
export async function updateLockPolicy(
    tenantId: string,
    patch: Partial<LockPolicyConfig>
): Promise<LockPolicyConfig> {
    const current = await getLockPolicy(tenantId);
    const merged: LockPolicyConfig = { ...current, ...patch };

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
                lockPolicy: merged,
            } as never,
        },
    });

    return merged;
}

// ─── Policy Checks ───────────────────────────────────────────────────────────

/**
 * Cek apakah role diizinkan melakukan aksi lock terkait.
 * - lock / unlock: rilis/mengakui lock (LockRecord)
 * - unlockRequest: mengajukan unlock request (UCE-26)
 * - unlockApprove: approve/reject unlock request
 */
export function isRoleAllowed(
    policy: LockPolicyConfig,
    role: string,
    action: LockAction
): boolean {
    let allowed: string[];
    switch (action) {
        case 'lock':
        case 'unlock':
            allowed = policy.allowedLockRoles;
            break;
        case 'unlockRequest':
            allowed = policy.allowedUnlockRequestRoles;
            break;
        case 'unlockApprove':
            allowed = policy.allowedUnlockApproverRoles;
            break;
        default:
            return false;
    }
    return allowed.includes(role);
}

/** Cek apakah level lock diaktifkan oleh policy tenant. */
export function isLockLevelEnabled(policy: LockPolicyConfig, level: string): boolean {
    return policy.enabledLockLevels.includes(level as LockLevel);
}

// ─── Auto-Lock (lazy enforcement) ────────────────────────────────────────────

/**
 * Auto-lock: periode OPEN yang endDate + autoLockAfterDays < hari ini akan
 * otomatis di-CLOSED. Hanya berjalan jika autoLockAfterDays > 0 (default 0 = disabled).
 *
 * Dipanggil secara lazy dari locks API (read-time) — bukan cron, karena menambah
 * cron task di luar scope. Setiap auto-close di-audit.
 *
 * @returns Jumlah periode yang di-auto-close
 */
export async function enforceAutoLock(
    tenantId: string,
    policy: LockPolicyConfig
): Promise<number> {
    if (policy.autoLockAfterDays <= 0) return 0;

    try {
        const threshold = new Date();
        threshold.setDate(threshold.getDate() - policy.autoLockAfterDays);

        const duePeriods = await prisma.accountingPeriod.findMany({
            where: {
                tenantId,
                status: 'OPEN',
                endDate: { lt: threshold },
            },
            select: { id: true, name: true, endDate: true },
        });

        if (duePeriods.length === 0) return 0;

        const closeNotes = `Auto-locked by lock policy (autoLockAfterDays=${policy.autoLockAfterDays})`;

        for (const period of duePeriods) {
            await prisma.accountingPeriod.update({
                where: { id: period.id },
                data: {
                    status: 'CLOSED',
                    closedAt: new Date(),
                    closeNotes,
                },
            });

            void logAudit({
                userId: 'system',
                tenantId,
                action: 'UPDATE',
                entity: 'AccountingPeriod',
                entityId: period.id,
                oldValues: { status: 'OPEN' },
                newValues: { status: 'CLOSED', reason: closeNotes },
            });
        }

        logger.info(
            `[LockPolicy] Auto-locked ${duePeriods.length} period(s) for tenant ${tenantId}`,
            { count: duePeriods.length, autoLockAfterDays: policy.autoLockAfterDays }
        );

        return duePeriods.length;
    } catch (error) {
        logger.error('[LockPolicy] Auto-lock enforcement failed', { tenantId, error });
        return 0;
    }
}
