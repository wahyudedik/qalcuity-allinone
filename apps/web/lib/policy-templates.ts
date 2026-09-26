/**
 * @qalcuity/web — Policy Template Presets
 *
 * Provides pre-built policy templates for common business scenarios.
 * Templates can be applied to a tenant to quickly bootstrap their control policies.
 *
 * Phase 2 — UCE Policy Engine Enhancements
 */

import { prisma } from '@/lib/db';
import { logAudit } from '@/lib/audit';
import { logger } from '@/lib/logger';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface PolicyTemplateItem {
    name: string;
    description: string;
    module: string;
    action: string;
    conditions: Record<string, unknown>;
    effect: 'allow' | 'deny';
    priority: number;
    enabled: boolean;
}

export interface PolicyTemplate {
    id: string;
    name: string;
    description: string;
    policies: PolicyTemplateItem[];
}

// ─── Template Definitions ───────────────────────────────────────────────────

const INVOICE_APPROVAL_TEMPLATE: PolicyTemplate = {
    id: 'invoice-approval',
    name: 'Invoice Approval',
    description: 'Approval rules untuk invoice berdasarkan amount threshold',
    policies: [
        {
            name: 'Invoice Auto-Approve (Small)',
            description: 'Invoice ≤ 5 juta auto-approve, tidak perlu approval',
            module: 'finance',
            action: 'create',
            conditions: { maxAmount: 5000000, entityTypes: ['INVOICE'] },
            effect: 'allow',
            priority: 100,
            enabled: true,
        },
        {
            name: 'Invoice Single Approval (Medium)',
            description: 'Invoice > 5 juta dan ≤ 50 juta perlu 1 level approval (Manager)',
            module: 'finance',
            action: 'create',
            conditions: {
                minAmount: 5000001,
                maxAmount: 50000000,
                entityTypes: ['INVOICE'],
                requireApproval: true,
                approvalLevels: 1,
                requiredRole: 'ADMIN',
            },
            effect: 'allow',
            priority: 200,
            enabled: true,
        },
        {
            name: 'Invoice Dual Approval (Large)',
            description: 'Invoice > 50 juta perlu 2 level approval (Manager + Director)',
            module: 'finance',
            action: 'create',
            conditions: {
                minAmount: 50000001,
                maxAmount: 500000000,
                entityTypes: ['INVOICE'],
                requireApproval: true,
                approvalLevels: 2,
                requiredRole: 'ADMIN',
            },
            effect: 'allow',
            priority: 300,
            enabled: true,
        },
        {
            name: 'Invoice Triple Approval (Very Large)',
            description: 'Invoice > 500 juta perlu 3 level approval termasuk CFO',
            module: 'finance',
            action: 'create',
            conditions: {
                minAmount: 500000001,
                entityTypes: ['INVOICE'],
                requireApproval: true,
                approvalLevels: 3,
                requiredRole: 'SUPERADMIN',
            },
            effect: 'allow',
            priority: 400,
            enabled: true,
        },
    ],
};

const PURCHASE_ORDER_TEMPLATE: PolicyTemplate = {
    id: 'purchase-order-approval',
    name: 'Purchase Order Approval',
    description: 'Approval rules untuk purchase order berdasarkan amount threshold',
    policies: [
        {
            name: 'PO Auto-Approve (Small)',
            description: 'PO ≤ 10 juta auto-approve',
            module: 'finance',
            action: 'create',
            conditions: { maxAmount: 10000000, entityTypes: ['PURCHASE_ORDER'] },
            effect: 'allow',
            priority: 100,
            enabled: true,
        },
        {
            name: 'PO Single Approval (Medium)',
            description: 'PO > 10 juta dan ≤ 100 juta perlu 1 level approval',
            module: 'finance',
            action: 'create',
            conditions: {
                minAmount: 10000001,
                maxAmount: 100000000,
                entityTypes: ['PURCHASE_ORDER'],
                requireApproval: true,
                approvalLevels: 1,
                requiredRole: 'ADMIN',
            },
            effect: 'allow',
            priority: 200,
            enabled: true,
        },
        {
            name: 'PO Dual Approval (Large)',
            description: 'PO > 100 juta perlu 2 level approval',
            module: 'finance',
            action: 'create',
            conditions: {
                minAmount: 100000001,
                maxAmount: 1000000000,
                entityTypes: ['PURCHASE_ORDER'],
                requireApproval: true,
                approvalLevels: 2,
                requiredRole: 'ADMIN',
            },
            effect: 'allow',
            priority: 300,
            enabled: true,
        },
        {
            name: 'PO Triple Approval (Very Large)',
            description: 'PO > 1 miliar perlu 3 level approval',
            module: 'finance',
            action: 'create',
            conditions: {
                minAmount: 1000000001,
                entityTypes: ['PURCHASE_ORDER'],
                requireApproval: true,
                approvalLevels: 3,
                requiredRole: 'SUPERADMIN',
            },
            effect: 'allow',
            priority: 400,
            enabled: true,
        },
    ],
};

const PAYMENT_APPROVAL_TEMPLATE: PolicyTemplate = {
    id: 'payment-approval',
    name: 'Payment Approval',
    description: 'Approval rules untuk pembayaran',
    policies: [
        {
            name: 'Payment Auto-Approve (Small)',
            description: 'Pembayaran ≤ 5 juta auto-approve',
            module: 'finance',
            action: 'create',
            conditions: { maxAmount: 5000000, entityTypes: ['PAYMENT'] },
            effect: 'allow',
            priority: 100,
            enabled: true,
        },
        {
            name: 'Payment Single Approval (Medium)',
            description: 'Pembayaran > 5 juta dan ≤ 50 juta perlu approval',
            module: 'finance',
            action: 'create',
            conditions: {
                minAmount: 5000001,
                maxAmount: 50000000,
                entityTypes: ['PAYMENT'],
                requireApproval: true,
                approvalLevels: 1,
                requiredRole: 'ADMIN',
            },
            effect: 'allow',
            priority: 200,
            enabled: true,
        },
        {
            name: 'Payment Dual Approval (Large)',
            description: 'Pembayaran > 50 juta perlu 2 level approval',
            module: 'finance',
            action: 'create',
            conditions: {
                minAmount: 50000001,
                entityTypes: ['PAYMENT'],
                requireApproval: true,
                approvalLevels: 2,
                requiredRole: 'SUPERADMIN',
            },
            effect: 'allow',
            priority: 300,
            enabled: true,
        },
    ],
};

const JOURNAL_ENTRY_TEMPLATE: PolicyTemplate = {
    id: 'journal-entry-approval',
    name: 'Journal Entry Approval',
    description: 'Approval rules untuk journal entry',
    policies: [
        {
            name: 'Journal Entry Auto-Approve (Standard)',
            description: 'Journal entry ≤ 10 juta auto-approve',
            module: 'finance',
            action: 'create',
            conditions: { maxAmount: 10000000, entityTypes: ['JOURNAL_ENTRY'] },
            effect: 'allow',
            priority: 100,
            enabled: true,
        },
        {
            name: 'Journal Entry Approval (Large)',
            description: 'Journal entry > 10 juta perlu approval',
            module: 'finance',
            action: 'create',
            conditions: {
                minAmount: 10000001,
                entityTypes: ['JOURNAL_ENTRY'],
                requireApproval: true,
                approvalLevels: 1,
                requiredRole: 'ADMIN',
            },
            effect: 'allow',
            priority: 200,
            enabled: true,
        },
        {
            name: 'Journal Entry Deny (Adjustment)',
            description: 'Tidak boleh update journal entry yang sudah posted',
            module: 'finance',
            action: 'update',
            conditions: {
                entityTypes: ['JOURNAL_ENTRY'],
                custom: { posted: true },
            },
            effect: 'deny',
            priority: 500,
            enabled: true,
        },
    ],
};

// ─── Template Registry ──────────────────────────────────────────────────────

const TEMPLATE_REGISTRY: Record<string, PolicyTemplate> = {
    'invoice-approval': INVOICE_APPROVAL_TEMPLATE,
    'purchase-order-approval': PURCHASE_ORDER_TEMPLATE,
    'payment-approval': PAYMENT_APPROVAL_TEMPLATE,
    'journal-entry-approval': JOURNAL_ENTRY_TEMPLATE,
};

// ─── Public Functions ───────────────────────────────────────────────────────

/**
 * Get all available policy templates.
 *
 * @returns Array of available templates (without policy details)
 */
export function getAvailableTemplates(): Array<{ id: string; name: string; description: string }> {
    return Object.values(TEMPLATE_REGISTRY).map((t) => ({
        id: t.id,
        name: t.name,
        description: t.description,
    }));
}

/**
 * Get a specific policy template by ID.
 *
 * @param templateId - Template ID
 * @returns The full template with policy details, or null if not found
 */
export function getTemplateById(templateId: string): PolicyTemplate | null {
    return TEMPLATE_REGISTRY[templateId] ?? null;
}

/**
 * Apply a policy template to a tenant.
 * Creates all policies from the template for the given tenant.
 * Skips policies with duplicate names (already exists for this tenant).
 *
 * @param params.tenantId - Tenant ID
 * @param params.templateId - Template ID to apply
 * @param params.userId - User applying the template
 * @param params.request - Optional Request object for audit logging
 * @returns Summary of applied policies
 */
export async function applyPolicyTemplate(params: {
    tenantId: string;
    templateId: string;
    userId: string;
    request?: Request;
}): Promise<{
    templateId: string;
    templateName: string;
    created: number;
    skipped: number;
    policies: Array<{ id: string; name: string; status: 'created' | 'skipped' }>;
}> {
    const { tenantId, templateId, userId, request } = params;

    const template = getTemplateById(templateId);
    if (!template) {
        throw new Error(`Template "${templateId}" tidak ditemukan`);
    }

    const results: Array<{ id: string; name: string; status: 'created' | 'skipped' }> = [];
    let created = 0;
    let skipped = 0;

    for (const policyDef of template.policies) {
        // Check if policy with same name already exists for this tenant
        const existing = await prisma.controlPolicy.findFirst({
            where: {
                tenantId,
                name: policyDef.name,
                module: policyDef.module,
            },
        });

        if (existing) {
            results.push({ id: existing.id, name: policyDef.name, status: 'skipped' });
            skipped++;
            continue;
        }

        const policy = await prisma.controlPolicy.create({
            data: {
                tenantId,
                name: policyDef.name,
                description: policyDef.description,
                module: policyDef.module,
                action: policyDef.action,
                conditions: policyDef.conditions as never,
                effect: policyDef.effect,
                priority: policyDef.priority,
                enabled: policyDef.enabled,
                createdBy: userId,
            },
        });

        results.push({ id: policy.id, name: policyDef.name, status: 'created' });
        created++;
    }

    void logAudit({
        userId,
        tenantId,
        action: 'CREATE',
        entity: 'ControlPolicy',
        entityId: templateId,
        newValues: {
            templateId,
            templateName: template.name,
            createdCount: created,
            skippedCount: skipped,
            policies: results,
        } as never,
        request,
    });

    logger.info(`[PolicyTemplates] Applied template "${templateId}" to tenant ${tenantId}: ${created} created, ${skipped} skipped`, {
        tenantId,
        userId,
    });

    return {
        templateId,
        templateName: template.name,
        created,
        skipped,
        policies: results,
    };
}

/**
 * Preview a template — returns what policies would be created without actually creating them.
 * Useful for UI preview before applying.
 *
 * @param templateId - Template ID
 * @param tenantId - Tenant ID (to check for duplicates)
 * @returns Preview of policies with duplicate status
 */
export async function previewTemplate(
    templateId: string,
    tenantId: string
): Promise<{
    template: PolicyTemplate | null;
    policies: Array<PolicyTemplateItem & { alreadyExists: boolean }>;
}> {
    const template = getTemplateById(templateId);
    if (!template) {
        return { template: null, policies: [] };
    }

    const policiesWithStatus = await Promise.all(
        template.policies.map(async (p) => {
            const existing = await prisma.controlPolicy.findFirst({
                where: {
                    tenantId,
                    name: p.name,
                    module: p.module,
                },
            });
            return { ...p, alreadyExists: !!existing };
        })
    );

    return {
        template,
        policies: policiesWithStatus,
    };
}
