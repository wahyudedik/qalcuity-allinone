// ============================================
// Auto-Approval Rules Engine
// Auto-approve approval requests berdasarkan
// amount threshold yang dikonfigurasi per entity type
// ============================================

import { prisma } from './db';
import { logAudit } from './audit';

// ============================================
// Types
// ============================================

export interface AutoApprovalRule {
    entityType: string;
    enabled: boolean;
    maxAmount: number; // Jika total <= maxAmount, auto-approve
}

export interface AutoApprovalResult {
    autoApproved: boolean;
    reason?: string;
}

// ============================================
// Default Rules (fallback jika tidak ada config di tenant)
// ============================================

const DEFAULT_RULES: AutoApprovalRule[] = [
    { entityType: 'INVOICE', enabled: false, maxAmount: 5000000 },       // Rp 5 juta
    { entityType: 'PURCHASE_ORDER', enabled: false, maxAmount: 10000000 }, // Rp 10 juta
    { entityType: 'QUOTATION', enabled: false, maxAmount: 20000000 },    // Rp 20 juta
];

// ============================================
// Core Functions
// ============================================

/**
 * Dapatkan auto-approval rules untuk tenant tertentu.
 * Menggunakan tenant settings jika ada, otherwise fallback ke defaults.
 */
export async function getAutoApprovalRules(
    tenantId: string
): Promise<AutoApprovalRule[]> {
    try {
        const tenant = await prisma.tenant.findUnique({
            where: { id: tenantId },
            select: { settings: true },
        });

        if (!tenant?.settings) {
            return DEFAULT_RULES;
        }

        const settings = tenant.settings as Record<string, unknown>;
        const autoApprovalConfig = settings.autoApproval as Record<string, unknown> | undefined;

        if (!autoApprovalConfig) {
            return DEFAULT_RULES;
        }

        // Merge with defaults
        return DEFAULT_RULES.map((defaultRule) => {
            const configRule = autoApprovalConfig[defaultRule.entityType] as Record<string, unknown> | undefined;
            if (configRule) {
                return {
                    entityType: defaultRule.entityType,
                    enabled: Boolean(configRule.enabled ?? defaultRule.enabled),
                    maxAmount: Number(configRule.maxAmount ?? defaultRule.maxAmount),
                };
            }
            return defaultRule;
        });
    } catch {
        return DEFAULT_RULES;
    }
}

/**
 * Simpan auto-approval rules untuk tenant tertentu.
 * Disimpan di tenant.settings sebagai JSON.
 */
export async function saveAutoApprovalRules(
    tenantId: string,
    rules: AutoApprovalRule[],
    userId: string,
    request?: Request
): Promise<{ success: boolean; error?: string }> {
    try {
        const tenant = await prisma.tenant.findUnique({
            where: { id: tenantId },
            select: { settings: true },
        });

        const currentSettings = (tenant?.settings as Record<string, unknown>) || {};
        const newSettings = {
            ...currentSettings,
            autoApproval: rules.reduce((acc, rule) => {
                acc[rule.entityType] = {
                    enabled: rule.enabled,
                    maxAmount: rule.maxAmount,
                };
                return acc;
            }, {} as Record<string, unknown>),
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await prisma.tenant.update({
            where: { id: tenantId },
            data: { settings: newSettings as any },
        });

        void logAudit({
            userId,
            tenantId,
            action: 'UPDATE',
            entity: 'Tenant',
            entityId: tenantId,
            oldValues: { autoApproval: currentSettings.autoApproval },
            newValues: { autoApproval: newSettings.autoApproval },
            request,
        });

        return { success: true };
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return { success: false, error: message };
    }
}

/**
 * Dapatkan amount dari entity berdasarkan entity type.
 */
async function getEntityAmount(
    tenantId: string,
    entityType: string,
    entityId: string
): Promise<number | null> {
    switch (entityType) {
        case 'INVOICE': {
            const invoice = await prisma.invoice.findFirst({
                where: { id: entityId, tenantId },
                select: { total: true },
            });
            return invoice ? Number(invoice.total) : null;
        }
        case 'PURCHASE_ORDER': {
            const po = await prisma.purchaseOrder.findFirst({
                where: { id: entityId, tenantId },
                select: { total: true },
            });
            return po ? Number(po.total) : null;
        }
        case 'QUOTATION': {
            const quotation = await prisma.quotation.findFirst({
                where: { id: entityId, tenantId },
                select: { total: true },
            });
            return quotation ? Number(quotation.total) : null;
        }
        default:
            return null;
    }
}

/**
 * Update entity status menjadi APPROVED (auto-approved).
 */
async function autoApproveEntity(
    tenantId: string,
    entityType: string,
    entityId: string
): Promise<void> {
    switch (entityType) {
        case 'INVOICE':
            await prisma.invoice.updateMany({
                where: { id: entityId, tenantId },
                data: { status: 'SENT' }, // Approved → SENT
            });
            break;
        case 'PURCHASE_ORDER':
            await prisma.purchaseOrder.updateMany({
                where: { id: entityId, tenantId },
                data: { status: 'SENT' }, // Approved → SENT
            });
            break;
        case 'QUOTATION':
            await prisma.quotation.updateMany({
                where: { id: entityId, tenantId },
                data: { status: 'SENT' }, // Approved → SENT
            });
            break;
    }
}

/**
 * Cek apakah entity harus di-auto-approve berdasarkan rules.
 *
 * @param tenantId - ID tenant
 * @param entityType - Tipe entity (INVOICE, PURCHASE_ORDER, QUOTATION)
 * @param entityId - ID entity
 * @param userId - ID user yang membuat request (untuk audit log)
 * @param request - Request object (untuk audit log)
 * @returns AutoApprovalResult
 */
export async function checkAutoApproval(
    tenantId: string,
    entityType: string,
    entityId: string,
    userId: string,
    request?: Request
): Promise<AutoApprovalResult> {
    try {
        // Get rules untuk tenant ini
        const rules = await getAutoApprovalRules(tenantId);
        const rule = rules.find((r) => r.entityType === entityType);

        // Jika tidak ada rule atau rule disabled, skip auto-approval
        if (!rule || !rule.enabled) {
            return { autoApproved: false, reason: 'Auto-approval tidak aktif untuk entity type ini' };
        }

        // Get entity amount
        const amount = await getEntityAmount(tenantId, entityType, entityId);

        if (amount === null) {
            return { autoApproved: false, reason: 'Entity tidak ditemukan atau tidak memiliki amount' };
        }

        // Check threshold
        if (amount > rule.maxAmount) {
            return {
                autoApproved: false,
                reason: `Amount ${amount} melebihi threshold ${rule.maxAmount} untuk auto-approval`,
            };
        }

        // Amount <= threshold → auto-approve
        // Create approval request
        const approvalRequest = await prisma.approvalRequest.create({
            data: {
                tenantId,
                entityType,
                entityId,
                currentLevel: 1,
                status: 'APPROVED',
                requestedBy: userId,
                resolvedBy: userId,
                resolvedAt: new Date(),
                comments: `[Auto-Approval] Amount ${amount} <= threshold ${rule.maxAmount}`,
            },
        });

        // Update entity status
        await autoApproveEntity(tenantId, entityType, entityId);

        void logAudit({
            userId,
            tenantId,
            action: 'CREATE',
            entity: 'ApprovalRequest',
            entityId: approvalRequest.id,
            newValues: {
                entityType,
                entityId,
                status: 'APPROVED',
                autoApproved: true,
                amount,
                threshold: rule.maxAmount,
            },
            request,
        });

        return { autoApproved: true };
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('[AutoApproval] Error:', message);
        return { autoApproved: false, reason: `Error: ${message}` };
    }
}
