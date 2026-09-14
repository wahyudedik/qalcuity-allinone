/**
 * @qalcuity/web — Module Control
 *
 * Control functions untuk mengelola module activation/deactivation per tenant.
 * Menggunakan Tenant.settings JSON field sebagai storage.
 */

import { prisma } from '../db';
import { logger } from '@/lib/logger';
import { FEATURE_FLAGS, type FeatureFlag } from '@qalcuity/config';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ModuleStatus {
    module: string;
    name: string;
    description: string;
    enabled: boolean;
    features: Feature[];
    isCore: boolean;
}

export interface Feature {
    key: string;
    name: string;
    description: string;
    enabled: boolean;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const MODULE_KEY = 'modules';

interface TenantSettings {
    modules?: Record<string, boolean>;
    [key: string]: unknown;
}

function parseSettings(settings: unknown): TenantSettings {
    if (!settings || typeof settings !== 'object') return {};
    if (typeof settings === 'string') {
        try { return JSON.parse(settings) as TenantSettings; } catch { return {}; }
    }
    return settings as TenantSettings;
}

// ─── Module Definitions ─────────────────────────────────────────────────────

const MODULE_DEFINITIONS: Record<string, { name: string; description: string; isCore: boolean; featureKeys: string[] }> = {
    finance: {
        name: 'Finance',
        description: 'Invoice, quotation, payment, purchase order',
        isCore: true,
        featureKeys: ['FINANCE_MODULE', 'ADVANCED_REPORTING', 'AUTOMATED_RECURRING_INVOICES'],
    },
    crm: {
        name: 'Sales & CRM',
        description: 'Leads, contacts, deals, pipeline',
        isCore: true,
        featureKeys: ['CRM_MODULE'],
    },
    hr: {
        name: 'Human Resources',
        description: 'Employees, attendance, leaves, payroll',
        isCore: true,
        featureKeys: ['HR_MODULE'],
    },
    inventory: {
        name: 'Inventory',
        description: 'Products, stock, categories, suppliers',
        isCore: true,
        featureKeys: ['INVENTORY_MODULE'],
    },
    pos: {
        name: 'Point of Sale',
        description: 'POS transactions, tables, kitchen display',
        isCore: false,
        featureKeys: ['POS_MODULE'],
    },
    projects: {
        name: 'Operations',
        description: 'Projects, tasks, gantt charts, budget tracking',
        isCore: false,
        featureKeys: ['OPERATIONS_MODULE'],
    },
    analytics: {
        name: 'Analytics',
        description: 'Dashboards, reports, KPIs',
        isCore: false,
        featureKeys: ['ADVANCED_REPORTING', 'ANALYTICS_STUDIO'],
    },
    ai: {
        name: 'AI Features',
        description: 'AI chat, insights, anomaly detection, predictions',
        isCore: false,
        featureKeys: ['AI_CHAT', 'AI_INSIGHTS', 'AI_ANOMALY_DETECTION', 'AI_CASH_FLOW_PREDICTION'],
    },
    'field-service': {
        name: 'Field Service',
        description: 'Field jobs, technician scheduling, GPS tracking',
        isCore: false,
        featureKeys: ['FIELD_SERVICE_MODULE'],
    },
    operations: {
        name: 'Operations',
        description: 'Budget tracking, resource management',
        isCore: false,
        featureKeys: ['OPERATIONS_MODULE'],
    },
};

// ─── Functions ──────────────────────────────────────────────────────────────

/**
 * Get module status for a tenant.
 */
export async function getModuleStatus(tenantId: string): Promise<ModuleStatus[]> {
    const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { settings: true },
    });

    const settings = parseSettings(tenant?.settings);
    const moduleOverrides = settings.modules || {};

    return Object.entries(MODULE_DEFINITIONS).map(([moduleKey, def]) => {
        const enabled = moduleOverrides[moduleKey] !== undefined
            ? moduleOverrides[moduleKey]
            : true; // Default: all modules enabled

        const features: Feature[] = def.featureKeys.map(featureKey => {
            const flag = FEATURE_FLAGS[featureKey];
            return {
                key: featureKey,
                name: flag?.name || featureKey,
                description: flag?.description || '',
                enabled,
            };
        });

        return {
            module: moduleKey,
            name: def.name,
            description: def.description,
            enabled,
            features,
            isCore: def.isCore,
        };
    });
}

/**
 * Toggle a module on/off for a tenant.
 */
export async function toggleModule(
    tenantId: string,
    module: string,
    enabled: boolean
): Promise<ModuleStatus> {
    // Validate module exists
    if (!MODULE_DEFINITIONS[module]) {
        throw new Error(`Module '${module}' does not exist`);
    }

    // Prevent disabling core modules
    if (MODULE_DEFINITIONS[module].isCore && !enabled) {
        throw new Error(`Cannot disable core module '${module}'`);
    }

    const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { settings: true },
    });

    const settings = parseSettings(tenant?.settings);
    const moduleOverrides = settings.modules || {};

    moduleOverrides[module] = enabled;
    settings.modules = moduleOverrides;

    await prisma.tenant.update({
        where: { id: tenantId },
        data: { settings: settings as never },
    });

    logger.info(`[ModuleControl] Module '${module}' ${enabled ? 'enabled' : 'disabled'}`, { tenantId });

    const def = MODULE_DEFINITIONS[module];
    const features: Feature[] = def.featureKeys.map(featureKey => {
        const flag = FEATURE_FLAGS[featureKey];
        return {
            key: featureKey,
            name: flag?.name || featureKey,
            description: flag?.description || '',
            enabled,
        };
    });

    return {
        module,
        name: def.name,
        description: def.description,
        enabled,
        features,
        isCore: def.isCore,
    };
}

/**
 * Get features for a specific module.
 */
export function getModuleFeatures(module: string): Feature[] {
    const def = MODULE_DEFINITIONS[module];
    if (!def) {
        throw new Error(`Module '${module}' does not exist`);
    }

    return def.featureKeys.map(featureKey => {
        const flag = FEATURE_FLAGS[featureKey];
        return {
            key: featureKey,
            name: flag?.name || featureKey,
            description: flag?.description || '',
            enabled: true,
        };
    });
}
