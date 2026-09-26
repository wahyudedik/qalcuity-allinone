/**
 * @qalcuity/web — SLA Templates
 *
 * Template presets untuk common SLA scenarios.
 * Templates digunakan sebagai blueprints untuk membuat SLATracker records
 * dengan default SLA targets yang sudah dikonfigurasi.
 *
 * Phase 4 — UCE SLA Enhancement
 */

import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface SLATemplateDef {
    /** Unique template identifier */
    name: string;
    /** Human-readable display name */
    displayName: string;
    /** Description of the template */
    description: string;
    /** Entity type this template applies to (e.g., "INVOICE", "PURCHASE_ORDER") */
    entityType: string;
    /** Default stage when SLA starts */
    stage: string;
    /** SLA target in hours */
    targetHours: number;
    /** Priority level: higher = more critical */
    priority: number;
}

export interface SLATemplateRecord {
    id: string;
    tenantId: string;
    name: string;
    displayName: string;
    description: string;
    entityType: string;
    stage: string;
    targetHours: number;
    priority: number;
    enabled: boolean;
    createdAt: Date;
    updatedAt: Date;
}

// ─── Default Template Presets ───────────────────────────────────────────────

/**
 * Built-in SLA template presets.
 * These are available to all tenants and can be applied with `applySLATemplate()`.
 */
export const SLA_TEMPLATE_PRESETS: SLATemplateDef[] = [
    {
        name: 'invoice-approval',
        displayName: 'Invoice Approval',
        description: 'Standard SLA for invoice approval workflow — 24 hours target',
        entityType: 'INVOICE',
        stage: 'pending_approval',
        targetHours: 24,
        priority: 10,
    },
    {
        name: 'po-approval',
        displayName: 'PO Approval',
        description: 'Standard SLA for purchase order approval — 48 hours target',
        entityType: 'PURCHASE_ORDER',
        stage: 'pending_approval',
        targetHours: 48,
        priority: 8,
    },
    {
        name: 'payment-approval',
        displayName: 'Payment Approval',
        description: 'Standard SLA for payment approval — 12 hours target',
        entityType: 'PAYMENT',
        stage: 'pending_approval',
        targetHours: 12,
        priority: 12,
    },
    {
        name: 'quotation-approval',
        displayName: 'Quotation Approval',
        description: 'Standard SLA for quotation approval — 24 hours target',
        entityType: 'QUOTATION',
        stage: 'pending_approval',
        targetHours: 24,
        priority: 9,
    },
    {
        name: 'journal-entry-review',
        displayName: 'Journal Entry Review',
        description: 'Standard SLA for journal entry review — 72 hours target',
        entityType: 'JOURNAL_ENTRY',
        stage: 'pending_review',
        targetHours: 72,
        priority: 6,
    },
    {
        name: 'expense-approval',
        displayName: 'Expense Approval',
        description: 'Standard SLA for expense approval — 24 hours target',
        entityType: 'EXPENSE',
        stage: 'pending_approval',
        targetHours: 24,
        priority: 8,
    },
    {
        name: 'bill-approval',
        displayName: 'Bill Approval',
        description: 'Standard SLA for bill approval — 48 hours target',
        entityType: 'BILL',
        stage: 'pending_approval',
        targetHours: 48,
        priority: 7,
    },
];

// ─── Tenant SLA Templates (stored in Tenant.settings JSON) ──────────────────

/**
 * Get all SLA templates configured for a tenant.
 * Uses Tenant.settings.slaTemplates JSON field for storage.
 *
 * @param tenantId - Tenant ID
 * @returns Array of SLA template records
 */
export async function getSLATemplates(tenantId: string): Promise<SLATemplateRecord[]> {
    try {
        const tenant = await prisma.tenant.findUnique({
            where: { id: tenantId },
            select: { settings: true },
        });

        if (!tenant?.settings) {
            return [];
        }

        const settings = tenant.settings as Record<string, unknown>;
        const slaTemplates = settings.slaTemplates as Array<Record<string, unknown>> | undefined;

        if (!slaTemplates || !Array.isArray(slaTemplates)) {
            return [];
        }

        return slaTemplates.map((t) => ({
            id: String(t.id || ''),
            tenantId,
            name: String(t.name || ''),
            displayName: String(t.displayName || t.name || ''),
            description: String(t.description || ''),
            entityType: String(t.entityType || ''),
            stage: String(t.stage || ''),
            targetHours: Number(t.targetHours) || 24,
            priority: Number(t.priority) || 0,
            enabled: t.enabled !== false,
            createdAt: t.createdAt ? new Date(String(t.createdAt)) : new Date(),
            updatedAt: t.updatedAt ? new Date(String(t.updatedAt)) : new Date(),
        }));
    } catch (error) {
        logger.error('Failed to get SLA templates', { tenantId, error });
        return [];
    }
}

/**
 * Save an SLA template for a tenant.
 * Appends to or updates the Tenant.settings.slaTemplates array.
 *
 * @param tenantId - Tenant ID
 * @param template - Template definition to save
 * @returns Saved template record
 */
export async function saveSLATemplate(
    tenantId: string,
    template: SLATemplateDef
): Promise<SLATemplateRecord> {
    const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { settings: true },
    });

    const settings = (tenant?.settings as Record<string, unknown>) || {};
    const slaTemplates = (Array.isArray(settings.slaTemplates) ? settings.slaTemplates : []) as Array<Record<string, unknown>>;

    const now = new Date().toISOString();
    const id = `sla-tpl-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    // Check if template with same name already exists — update it
    const existingIndex = slaTemplates.findIndex((t) => t.name === template.name);

    const record: Record<string, unknown> = {
        id: existingIndex >= 0 ? slaTemplates[existingIndex].id : id,
        name: template.name,
        displayName: template.displayName,
        description: template.description,
        entityType: template.entityType,
        stage: template.stage,
        targetHours: template.targetHours,
        priority: template.priority,
        enabled: true,
        createdAt: existingIndex >= 0 ? slaTemplates[existingIndex].createdAt : now,
        updatedAt: now,
    };

    if (existingIndex >= 0) {
        slaTemplates[existingIndex] = record;
    } else {
        slaTemplates.push(record);
    }

    // Save back to tenant settings
    await prisma.tenant.update({
        where: { id: tenantId },
        data: {
            settings: {
                ...settings,
                slaTemplates,
            } as never,
        },
    });

    return {
        id: String(record.id),
        tenantId,
        name: String(record.name),
        displayName: String(record.displayName),
        description: String(record.description),
        entityType: String(record.entityType),
        stage: String(record.stage),
        targetHours: Number(record.targetHours),
        priority: Number(record.priority),
        enabled: record.enabled !== false,
        createdAt: record.createdAt ? new Date(String(record.createdAt)) : new Date(),
        updatedAt: new Date(),
    };
}

/**
 * Apply a built-in SLA template preset to a tenant.
 * Creates the template record in Tenant.settings and optionally creates an active SLATracker.
 *
 * @param tenantId - Tenant ID
 * @param templateName - Name of the preset template (e.g., "invoice-approval")
 * @returns Applied template record, or null if template not found
 */
export async function applySLATemplate(
    tenantId: string,
    templateName: string
): Promise<SLATemplateRecord | null> {
    const preset = SLA_TEMPLATE_PRESETS.find((t) => t.name === templateName);
    if (!preset) {
        logger.warn('SLA template preset not found', { templateName });
        return null;
    }

    return saveSLATemplate(tenantId, preset);
}

/**
 * Apply all built-in SLA template presets to a tenant.
 * Useful during tenant setup or onboarding.
 *
 * @param tenantId - Tenant ID
 * @returns Array of applied template records
 */
export async function applyAllSLATemplates(
    tenantId: string
): Promise<SLATemplateRecord[]> {
    const results: SLATemplateRecord[] = [];

    for (const preset of SLA_TEMPLATE_PRESETS) {
        try {
            const record = await saveSLATemplate(tenantId, preset);
            results.push(record);
        } catch (error) {
            logger.error('Failed to apply SLA template', {
                tenantId,
                templateName: preset.name,
                error,
            });
        }
    }

    return results;
}

/**
 * Delete an SLA template from a tenant.
 *
 * @param tenantId - Tenant ID
 * @param templateName - Name of the template to delete
 * @returns true if deleted, false if not found
 */
export async function deleteSLATemplate(
    tenantId: string,
    templateName: string
): Promise<boolean> {
    const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { settings: true },
    });

    if (!tenant?.settings) return false;

    const settings = tenant.settings as Record<string, unknown>;
    const slaTemplates = (Array.isArray(settings.slaTemplates) ? settings.slaTemplates : []) as Array<Record<string, unknown>>;

    const filteredTemplates = slaTemplates.filter((t) => t.name !== templateName);

    if (filteredTemplates.length === slaTemplates.length) {
        return false; // Nothing was removed
    }

    await prisma.tenant.update({
        where: { id: tenantId },
        data: {
            settings: {
                ...settings,
                slaTemplates: filteredTemplates,
            } as never,
        },
    });

    return true;
}

/**
 * Get the SLA target hours for a given entity type and stage.
 * Checks tenant templates first, falls back to built-in defaults.
 *
 * @param tenantId - Tenant ID
 * @param entityType - Entity type (e.g., "INVOICE")
 * @param stage - Stage name (e.g., "pending_approval")
 * @returns SLA target in hours
 */
export async function getSLATargetHours(
    tenantId: string,
    entityType: string,
    stage: string
): Promise<number> {
    // Check tenant-configured templates first
    const templates = await getSLATemplates(tenantId);
    const matching = templates.find(
        (t) => t.enabled && t.entityType === entityType && t.stage === stage
    );

    if (matching) {
        return matching.targetHours;
    }

    // Fall back to built-in presets
    const preset = SLA_TEMPLATE_PRESETS.find(
        (t) => t.entityType === entityType && t.stage === stage
    );

    return preset?.targetHours ?? 48; // Default 48 hours
}
