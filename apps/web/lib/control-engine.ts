/**
 * @qalcuity/web — Unified Control Engine
 *
 * Centralized control panel yang memungkinkan admin mengelola semua konfigurasi platform dari satu tempat.
 * Menggunakan Tenant.settings JSON field sebagai storage utama untuk control configs.
 *
 * Categories: workflow, fields, modules, permissions, dashboard, approvals
 */

import { prisma } from './db';
import { logger } from '@/lib/logger';
import { IndustryConfigEngine, type IndustryType } from '@qalcuity/industry-config';

// ─── Types ──────────────────────────────────────────────────────────────────

export type ControlCategory = 'workflow' | 'fields' | 'modules' | 'permissions' | 'dashboard' | 'approvals';

export type ControlScope = 'global' | 'industry' | 'tenant';

export interface ControlConfig {
    category: ControlCategory;
    key: string;
    value: unknown;
    scope: ControlScope;
    source: string; // e.g., 'industry-pack', 'tenant-override', 'system-default'
    updatedAt?: string;
}

export interface ControlChange {
    id: string;
    category: ControlCategory;
    key: string;
    oldValue: unknown;
    newValue: unknown;
    reason?: string;
    changedBy: string;
    changedAt: string;
}

export interface ControlEngineExport {
    version: string;
    exportedAt: string;
    tenantId: string;
    configs: ControlConfig[];
}

// ─── Storage Key ────────────────────────────────────────────────────────────

const CONTROL_ENGINE_KEY = 'controlEngine';
const CONTROL_HISTORY_KEY = 'controlHistory';

// ─── Industry Config Engine ─────────────────────────────────────────────────

const industryEngine = new IndustryConfigEngine();

// ─── Helper: Read/Write Tenant Settings ─────────────────────────────────────

interface TenantSettings {
    controlEngine?: Record<string, unknown>;
    controlHistory?: ControlChange[];
    [key: string]: unknown;
}

function parseSettings(settings: unknown): TenantSettings {
    if (!settings || typeof settings !== 'object') return {};
    if (typeof settings === 'string') {
        try {
            return JSON.parse(settings) as TenantSettings;
        } catch {
            return {};
        }
    }
    return settings as TenantSettings;
}

async function getTenantSettings(tenantId: string): Promise<TenantSettings> {
    const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { settings: true },
    });
    return parseSettings(tenant?.settings);
}

async function saveTenantSettings(tenantId: string, settings: TenantSettings): Promise<void> {
    await prisma.tenant.update({
        where: { id: tenantId },
        data: { settings: settings as never },
    });
}

function getConfigMap(settings: TenantSettings): Record<string, unknown> {
    const ce = settings.controlEngine;
    if (ce && typeof ce === 'object') return ce as Record<string, unknown>;
    return {};
}

function getHistoryArray(settings: TenantSettings): ControlChange[] {
    const h = settings.controlHistory;
    if (Array.isArray(h)) return h;
    return [];
}

// ─── Main Functions ─────────────────────────────────────────────────────────

/**
 * Get all control configs for a tenant.
 * Merges system defaults → industry defaults → tenant overrides.
 */
export async function getControlConfigs(tenantId: string): Promise<ControlConfig[]> {
    const settings = await getTenantSettings(tenantId);
    const tenantConfigMap = getConfigMap(settings);

    // Get tenant's industry type
    const dbConfig = await prisma.industryConfiguration.findUnique({
        where: { tenantId },
        select: { industry: true },
    });
    const industry: IndustryType = (dbConfig?.industry as IndustryType) || 'general';

    // Get industry defaults
    const industryDefaults = getIndustryDefaults(industry);

    // Merge: system defaults → industry defaults → tenant overrides
    const configs: ControlConfig[] = [];
    const allKeys = new Set<string>();

    // Collect all keys from defaults
    for (const def of industryDefaults) {
        allKeys.add(`${def.category}:${def.key}`);
    }

    // Collect all keys from tenant overrides
    for (const key of Object.keys(tenantConfigMap)) {
        allKeys.add(key);
    }

    for (const fullKey of allKeys) {
        const [category, ...keyParts] = fullKey.split(':');
        const key = keyParts.join(':');

        const tenantValue = tenantConfigMap[fullKey];
        const industryDefault = industryDefaults.find(d => d.category === category && d.key === key);

        if (tenantValue !== undefined) {
            configs.push({
                category: category as ControlCategory,
                key,
                value: tenantValue,
                scope: 'tenant',
                source: 'tenant-override',
                updatedAt: settings.controlEngine ? (settings.controlEngine as Record<string, unknown>)[`${fullKey}_updatedAt`] as string : undefined,
            });
        } else if (industryDefault) {
            configs.push(industryDefault);
        }
    }

    return configs;
}

/**
 * Get control configs filtered by category.
 */
export async function getControlConfigsByCategory(
    tenantId: string,
    category: ControlCategory
): Promise<ControlConfig[]> {
    const allConfigs = await getControlConfigs(tenantId);
    return allConfigs.filter(c => c.category === category);
}

/**
 * Update a control config for a tenant.
 * Validates the config and logs the change to history.
 */
export async function updateControlConfig(
    tenantId: string,
    config: { category: ControlCategory; key: string; value: unknown; reason?: string },
    userId: string
): Promise<ControlConfig> {
    const settings = await getTenantSettings(tenantId);
    const controlEngine = getConfigMap(settings);
    const history = getHistoryArray(settings);

    const fullKey = `${config.category}:${config.key}`;
    const oldValue = controlEngine[fullKey];

    // Validate the config value
    validateConfigValue(config.category, config.key, config.value);

    // Update the config
    controlEngine[fullKey] = config.value;
    controlEngine[`${fullKey}_updatedAt`] = new Date().toISOString();

    // Log change to history
    const change: ControlChange = {
        id: `change_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        category: config.category,
        key: config.key,
        oldValue: oldValue !== undefined ? oldValue : null,
        newValue: config.value,
        reason: config.reason,
        changedBy: userId,
        changedAt: new Date().toISOString(),
    };
    history.push(change);

    // Keep only last 100 history entries
    if (history.length > 100) {
        history.splice(0, history.length - 100);
    }

    settings.controlEngine = controlEngine as unknown as Record<string, unknown>;
    settings.controlHistory = history;
    await saveTenantSettings(tenantId, settings);

    logger.info(`[ControlEngine] Config updated: ${fullKey}`, { tenantId, userId });

    return {
        category: config.category,
        key: config.key,
        value: config.value,
        scope: 'tenant',
        source: 'tenant-override',
        updatedAt: controlEngine[`${fullKey}_updatedAt`] as string,
    };
}

/**
 * Get default configs from industry pack.
 */
export function getControlDefaults(industry?: IndustryType): ControlConfig[] {
    return getIndustryDefaults(industry || 'general');
}

/**
 * Reset configs to defaults. If category is provided, only reset that category.
 */
export async function resetToDefaults(
    tenantId: string,
    category?: ControlCategory,
    userId?: string
): Promise<void> {
    const settings = await getTenantSettings(tenantId);
    const controlEngine = getConfigMap(settings);
    const history = getHistoryArray(settings);

    // Get tenant's industry type
    const dbConfig = await prisma.industryConfiguration.findUnique({
        where: { tenantId },
        select: { industry: true },
    });
    const industry: IndustryType = (dbConfig?.industry as IndustryType) || 'general';
    const defaults = getIndustryDefaults(industry);

    const keysToDelete = Object.keys(controlEngine).filter(key => {
        if (key.endsWith('_updatedAt')) return false;
        if (category) {
            return key.startsWith(`${category}:`);
        }
        return true;
    });

    // Log each reset as a change
    for (const key of keysToDelete) {
        const oldValue = controlEngine[key];
        const parts = key.split(':');
        const cat = parts[0] as ControlCategory;
        const configKey = parts.slice(1).join(':');

        const defaultConfig = defaults.find(d => d.category === cat && d.key === configKey);

        history.push({
            id: `reset_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            category: cat,
            key: configKey,
            oldValue,
            newValue: defaultConfig?.value ?? null,
            reason: category ? `Reset ${category} to defaults` : 'Reset all to defaults',
            changedBy: userId || 'system',
            changedAt: new Date().toISOString(),
        });

        delete controlEngine[key];
        delete controlEngine[`${key}_updatedAt`];
    }

    // Keep only last 100 history entries
    if (history.length > 100) {
        history.splice(0, history.length - 100);
    }

    settings.controlEngine = controlEngine as unknown as Record<string, unknown>;
    settings.controlHistory = history;
    await saveTenantSettings(tenantId, settings);

    logger.info(`[ControlEngine] Reset to defaults: ${category || 'all'}`, { tenantId });
}

/**
 * Get control change history for a tenant.
 */
export async function getControlHistory(
    tenantId: string,
    category?: ControlCategory
): Promise<ControlChange[]> {
    const settings = await getTenantSettings(tenantId);
    const history = getHistoryArray(settings);

    if (category) {
        return history.filter(h => h.category === category);
    }

    return history;
}

/**
 * Export full config as JSON.
 */
export async function exportConfig(tenantId: string): Promise<ControlEngineExport> {
    const configs = await getControlConfigs(tenantId);

    return {
        version: '1.0.0',
        exportedAt: new Date().toISOString(),
        tenantId,
        configs,
    };
}

/**
 * Import config from JSON export.
 */
export async function importConfig(
    tenantId: string,
    data: ControlEngineExport,
    userId: string
): Promise<{ imported: number; errors: string[] }> {
    const errors: string[] = [];
    let imported = 0;

    for (const config of data.configs) {
        try {
            await updateControlConfig(
                tenantId,
                {
                    category: config.category,
                    key: config.key,
                    value: config.value,
                    reason: `Imported from export v${data.version}`,
                },
                userId
            );
            imported++;
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            errors.push(`${config.category}:${config.key} — ${message}`);
        }
    }

    logger.info(`[ControlEngine] Import completed: ${imported} imported, ${errors.length} errors`, { tenantId });

    return { imported, errors };
}

// ─── Industry Defaults ──────────────────────────────────────────────────────

function getIndustryDefaults(industry: IndustryType): ControlConfig[] {
    const defaults: ControlConfig[] = [];

    // Module defaults — all modules enabled by default
    const modules = ['finance', 'crm', 'hr', 'inventory', 'pos', 'projects', 'analytics', 'ai', 'field-service', 'operations'];
    for (const mod of modules) {
        defaults.push({
            category: 'modules',
            key: mod,
            value: true,
            scope: 'industry',
            source: 'industry-pack',
        });
    }

    // Workflow defaults — common entities
    const workflowEntities = ['invoice', 'quotation', 'purchase_order', 'leave_request', 'payroll', 'deal'];
    for (const entity of workflowEntities) {
        defaults.push({
            category: 'workflow',
            key: `${entity}.enabled`,
            value: true,
            scope: 'industry',
            source: 'industry-pack',
        });
        defaults.push({
            category: 'workflow',
            key: `${entity}.autoTransition`,
            value: false,
            scope: 'industry',
            source: 'industry-pack',
        });
    }

    // Approval defaults
    defaults.push({
        category: 'approvals',
        key: 'enabled',
        value: true,
        scope: 'industry',
        source: 'industry-pack',
    });
    defaults.push({
        category: 'approvals',
        key: 'maxLevels',
        value: 3,
        scope: 'industry',
        source: 'industry-pack',
    });
    defaults.push({
        category: 'approvals',
        key: 'requireComments',
        value: false,
        scope: 'industry',
        source: 'industry-pack',
    });

    // Dashboard widget defaults
    const widgets = ['revenue-chart', 'expense-chart', 'cash-flow', 'pipeline', 'stock-levels', 'employee-count', 'recent-transactions', 'top-products'];
    for (const widget of widgets) {
        defaults.push({
            category: 'dashboard',
            key: widget,
            value: { visible: true, order: widgets.indexOf(widget), size: 'md' },
            scope: 'industry',
            source: 'industry-pack',
        });
    }

    // Fields defaults — common entities
    const fieldEntities = ['product', 'invoice', 'contact', 'employee'];
    for (const entity of fieldEntities) {
        defaults.push({
            category: 'fields',
            key: `${entity}.customFieldsEnabled`,
            value: true,
            scope: 'industry',
            source: 'industry-pack',
        });
    }

    // Permission defaults
    defaults.push({
        category: 'permissions',
        key: 'viewerCanExport',
        value: false,
        scope: 'industry',
        source: 'industry-pack',
    });
    defaults.push({
        category: 'permissions',
        key: 'memberCanDelete',
        value: false,
        scope: 'industry',
        source: 'industry-pack',
    });

    return defaults;
}

// ─── Validation ─────────────────────────────────────────────────────────────

function validateConfigValue(category: ControlCategory, key: string, value: unknown): void {
    switch (category) {
        case 'modules': {
            // Module toggle must be boolean
            if (typeof value !== 'boolean') {
                throw new Error(`Module config '${key}' must be a boolean`);
            }
            const validModules = ['finance', 'crm', 'hr', 'inventory', 'pos', 'projects', 'analytics', 'ai', 'field-service', 'operations'];
            if (!validModules.includes(key)) {
                throw new Error(`Invalid module: '${key}'. Valid modules: ${validModules.join(', ')}`);
            }
            break;
        }
        case 'workflow': {
            // Workflow config values can be boolean or object
            if (key.endsWith('.enabled') && typeof value !== 'boolean') {
                throw new Error(`Workflow enabled config must be a boolean`);
            }
            if (key.endsWith('.autoTransition') && typeof value !== 'boolean') {
                throw new Error(`Workflow autoTransition config must be a boolean`);
            }
            break;
        }
        case 'approvals': {
            if (key === 'maxLevels') {
                if (typeof value !== 'number' || value < 1 || value > 10) {
                    throw new Error('maxLevels must be a number between 1 and 10');
                }
            }
            if (key === 'enabled' && typeof value !== 'boolean') {
                throw new Error('approvals.enabled must be a boolean');
            }
            if (key === 'requireComments' && typeof value !== 'boolean') {
                throw new Error('approvals.requireComments must be a boolean');
            }
            break;
        }
        case 'dashboard': {
            // Dashboard widget config must be an object with visible, order, size
            if (typeof value !== 'object' || value === null) {
                throw new Error(`Dashboard widget config must be an object`);
            }
            const v = value as Record<string, unknown>;
            if (v.visible !== undefined && typeof v.visible !== 'boolean') {
                throw new Error('Widget visible must be a boolean');
            }
            if (v.order !== undefined && typeof v.order !== 'number') {
                throw new Error('Widget order must be a number');
            }
            if (v.size !== undefined && !['sm', 'md', 'lg'].includes(v.size as string)) {
                throw new Error('Widget size must be sm, md, or lg');
            }
            break;
        }
        case 'fields': {
            if (key.endsWith('.customFieldsEnabled') && typeof value !== 'boolean') {
                throw new Error('Custom fields enabled must be a boolean');
            }
            break;
        }
        case 'permissions': {
            if (typeof value !== 'boolean') {
                throw new Error(`Permission config '${key}' must be a boolean`);
            }
            break;
        }
    }
}
