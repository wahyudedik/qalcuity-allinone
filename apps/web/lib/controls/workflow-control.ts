/**
 * @qalcuity/web — Workflow Control
 *
 * Control functions untuk mengelola workflow configurations per tenant.
 * Menggunakan WorkflowDefinition model dan Tenant.settings JSON field.
 */

import { prisma } from '../db';
import { logger } from '@/lib/logger';
import { WorkflowEngine, type WorkflowDefinition, type Transition } from '@qalcuity/workflow';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface WorkflowConfig {
    entity: string;
    enabled: boolean;
    autoTransition: boolean;
    customStates?: string[];
    customTransitions?: Transition[];
}

export interface ApprovalRule {
    id: string;
    entity: string;
    action: string;
    levels: {
        level: number;
        role: string;
        required: boolean;
    }[];
    isActive: boolean;
}

// ─── Functions ──────────────────────────────────────────────────────────────

/**
 * Get workflow configs for a tenant, optionally filtered by entity.
 */
export async function getWorkflowConfigs(
    tenantId: string,
    entity?: string
): Promise<WorkflowConfig[]> {
    // Get workflow definitions from database
    const where: { tenantId: string; entityType?: string } = { tenantId };
    if (entity) {
        where.entityType = entity.toUpperCase();
    }

    const definitions = await prisma.workflowDefinition.findMany({
        where,
        orderBy: { entityType: 'asc' },
    });

    return definitions.map((def) => {
        const config = def.config as Record<string, unknown>;
        return {
            entity: def.entityType.toLowerCase(),
            enabled: def.isActive,
            autoTransition: false,
            customStates: config.states as string[] | undefined,
            customTransitions: config.transitions as Transition[] | undefined,
        };
    });
}

/**
 * Update workflow config for a specific entity.
 */
export async function updateWorkflowConfig(
    tenantId: string,
    entity: string,
    config: Partial<WorkflowConfig>
): Promise<WorkflowConfig> {
    const entityType = entity.toUpperCase();

    const existing = await prisma.workflowDefinition.findUnique({
        where: { tenantId_entityType: { tenantId, entityType } },
    });

    if (!existing) {
        throw new Error(`Workflow definition for '${entity}' not found`);
    }

    // Update the definition
    const updated = await prisma.workflowDefinition.update({
        where: { id: existing.id },
        data: {
            isActive: config.enabled ?? existing.isActive,
        },
    });

    logger.info(`[WorkflowControl] Updated config for ${entity}`, { tenantId });

    return {
        entity: updated.entityType.toLowerCase(),
        enabled: updated.isActive,
        autoTransition: config.autoTransition ?? false,
        customStates: config.customStates,
        customTransitions: config.customTransitions,
    };
}

/**
 * Add a new state to a workflow entity.
 */
export async function addWorkflowState(
    tenantId: string,
    entity: string,
    state: string
): Promise<void> {
    const entityType = entity.toUpperCase();

    const existing = await prisma.workflowDefinition.findUnique({
        where: { tenantId_entityType: { tenantId, entityType } },
    });

    if (!existing) {
        throw new Error(`Workflow definition for '${entity}' not found`);
    }

    const config = existing.config as unknown as WorkflowDefinition;

    // Check if state already exists
    if (config.states.includes(state)) {
        throw new Error(`State '${state}' already exists in workflow '${entity}'`);
    }

    // Add the new state
    const updatedStates = [...config.states, state];
    await prisma.workflowDefinition.update({
        where: { id: existing.id },
        data: {
            config: {
                ...config,
                states: updatedStates,
            } as never,
        },
    });

    logger.info(`[WorkflowControl] Added state '${state}' to ${entity}`, { tenantId });
}

/**
 * Add a new transition to a workflow entity.
 */
export async function addWorkflowTransition(
    tenantId: string,
    entity: string,
    transition: Transition
): Promise<void> {
    const entityType = entity.toUpperCase();

    const existing = await prisma.workflowDefinition.findUnique({
        where: { tenantId_entityType: { tenantId, entityType } },
    });

    if (!existing) {
        throw new Error(`Workflow definition for '${entity}' not found`);
    }

    const config = existing.config as unknown as WorkflowDefinition;

    // Validate from/to states exist
    if (!config.states.includes(transition.from)) {
        throw new Error(`Source state '${transition.from}' not found in workflow '${entity}'`);
    }
    if (!config.states.includes(transition.to)) {
        throw new Error(`Target state '${transition.to}' not found in workflow '${entity}'`);
    }

    // Check for duplicate transition
    const duplicate = config.transitions.find(
        t => t.from === transition.from && t.to === transition.to && t.action === transition.action
    );
    if (duplicate) {
        throw new Error(`Transition '${transition.action}' from '${transition.from}' to '${transition.to}' already exists`);
    }

    // Add the transition
    const updatedTransitions = [...config.transitions, transition];
    await prisma.workflowDefinition.update({
        where: { id: existing.id },
        data: {
            config: {
                ...config,
                transitions: updatedTransitions,
            } as never,
        },
    });

    logger.info(`[WorkflowControl] Added transition '${transition.action}' to ${entity}`, { tenantId });
}

/**
 * Get approval rules for a tenant, optionally filtered by entity.
 */
export async function getApprovalRules(
    tenantId: string,
    entity?: string
): Promise<ApprovalRule[]> {
    // Read approval rules from IndustryConfiguration
    const dbConfig = await prisma.industryConfiguration.findUnique({
        where: { tenantId },
    });

    if (!dbConfig) {
        return getDefaultApprovalRules();
    }

    const config = dbConfig.config as Record<string, unknown>;
    const approvalRules = config.approvalRules as ApprovalRule[] | undefined;

    if (!approvalRules || !Array.isArray(approvalRules)) {
        return getDefaultApprovalRules();
    }

    if (entity) {
        return approvalRules.filter(r => r.entity === entity);
    }

    return approvalRules;
}

/**
 * Update approval rules for a specific entity.
 */
export async function updateApprovalRules(
    tenantId: string,
    entity: string,
    rules: ApprovalRule[]
): Promise<void> {
    const dbConfig = await prisma.industryConfiguration.findUnique({
        where: { tenantId },
    });

    const currentConfig = (dbConfig?.config as Record<string, unknown>) || {};

    // Get existing approval rules
    const existingRules = (currentConfig.approvalRules as ApprovalRule[]) || [];

    // Filter out rules for this entity and add new ones
    const otherRules = existingRules.filter(r => r.entity !== entity);
    const updatedRules = [...otherRules, ...rules];

    await prisma.industryConfiguration.update({
        where: { tenantId },
        data: {
            config: {
                ...currentConfig,
                approvalRules: updatedRules,
            } as never,
        },
    });

    logger.info(`[WorkflowControl] Updated approval rules for ${entity}`, { tenantId });
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function getDefaultApprovalRules(): ApprovalRule[] {
    return [
        {
            id: 'default-invoice-approval',
            entity: 'invoice',
            action: 'approve',
            levels: [
                { level: 1, role: 'ADMIN', required: true },
                { level: 2, role: 'SUPERADMIN', required: false },
            ],
            isActive: true,
        },
        {
            id: 'default-purchase-order-approval',
            entity: 'purchase_order',
            action: 'approve',
            levels: [
                { level: 1, role: 'ADMIN', required: true },
                { level: 2, role: 'SUPERADMIN', required: false },
            ],
            isActive: true,
        },
    ];
}
