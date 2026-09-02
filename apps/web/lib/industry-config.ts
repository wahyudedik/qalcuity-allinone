/**
 * @qalcuity/web — Industry Configuration Helper
 *
 * Helper functions untuk integrasi Industry Configuration Engine dengan API routes.
 * Menyediakan fungsi-fungsi yang bisa dipanggil dari API route atau server action.
 */

import { IndustryConfigEngine, type IndustryType, type IndustryConfig, type CustomField, type CustomFieldValidationResult } from '@qalcuity/industry-config';
import { prisma } from './db';

// ─── Singleton Engine ────────────────────────────────────────────────────────

/**
 * Singleton engine instance.
 */
const engine = new IndustryConfigEngine();

// ─── Main Helper Functions ───────────────────────────────────────────────────

/**
 * Dapatkan industry config untuk tenant tertentu.
 * Load dari database, merge dengan defaults, dan cache di engine.
 *
 * @param tenantId - ID tenant
 * @returns IndustryConfig yang sudah di-merge
 */
export async function getTenantIndustryConfig(tenantId: string): Promise<IndustryConfig> {
    // Load tenant config dari database
    const dbConfig = await prisma.industryConfiguration.findUnique({
        where: { tenantId },
    });

    if (dbConfig) {
        // Register tenant override di engine
        engine.registerTenantConfig(tenantId, {
            industry: dbConfig.industry as IndustryType,
            config: dbConfig.config as Partial<IndustryConfig>,
        });
    }

    // Get tenant's industry type (default ke 'general')
    const industry: IndustryType = (dbConfig?.industry as IndustryType) || 'general';

    return engine.getConfig(industry, tenantId);
}

/**
 * Dapatkan custom fields untuk entity tertentu dari tenant.
 * Merge industry defaults dengan tenant custom fields dari database.
 *
 * @param tenantId - ID tenant
 * @param entity - Nama entity (e.g., 'product', 'invoice')
 * @returns Array CustomField (merged)
 */
export async function getTenantCustomFields(tenantId: string, entity: string): Promise<CustomField[]> {
    // Get tenant's industry type
    const dbConfig = await prisma.industryConfiguration.findUnique({
        where: { tenantId },
    });
    const industry: IndustryType = (dbConfig?.industry as IndustryType) || 'general';

    // Get industry default custom fields
    const defaultFields = engine.getCustomFields(industry, entity);

    // Get tenant custom fields dari database
    const tenantFields = await prisma.tenantCustomField.findMany({
        where: {
            tenantId,
            entity,
            isActive: true,
        },
        orderBy: { sortOrder: 'asc' },
    });

    // Convert database fields ke CustomField type
    const customFields: CustomField[] = tenantFields.map((field: {
        fieldName: string;
        fieldLabel: string;
        fieldType: string;
        required: boolean;
        options: unknown;
        defaultValue: unknown;
    }) => ({
        name: field.fieldName,
        label: field.fieldLabel,
        type: field.fieldType as CustomField['type'],
        required: field.required,
        options: (field.options as string[]) || undefined,
        defaultValue: field.defaultValue ?? undefined,
    }));

    // Merge: tenant fields override default fields dengan nama yang sama
    const mergedMap = new Map<string, CustomField>();

    // Add defaults first
    for (const field of defaultFields) {
        mergedMap.set(field.name, field);
    }

    // Override with tenant fields
    for (const field of customFields) {
        mergedMap.set(field.name, field);
    }

    return Array.from(mergedMap.values());
}

/**
 * Validasi custom field values untuk entity tertentu.
 *
 * @param tenantId - ID tenant
 * @param entity - Nama entity
 * @param data - Object berisi field values { fieldName: value }
 * @returns CustomFieldValidationResult
 */
export async function validateCustomFields(
    tenantId: string,
    entity: string,
    data: Record<string, unknown>
): Promise<CustomFieldValidationResult> {
    const fields = await getTenantCustomFields(tenantId, entity);
    return engine.validateCustomFields(fields, data);
}

/**
 * Cek apakah module aktif untuk tenant.
 *
 * @param tenantId - ID tenant
 * @param module - Nama module
 * @returns boolean
 */
export async function isTenantModuleEnabled(tenantId: string, module: string): Promise<boolean> {
    const dbConfig = await prisma.industryConfiguration.findUnique({
        where: { tenantId },
    });
    const industry: IndustryType = (dbConfig?.industry as IndustryType) || 'general';
    return engine.isModuleEnabled(industry, module, tenantId);
}

/**
 * Update industry config untuk tenant.
 *
 * @param tenantId - ID tenant
 * @param config - Config overrides
 * @returns Updated IndustryConfiguration record
 */
export async function updateTenantIndustryConfig(
    tenantId: string,
    config: Partial<IndustryConfig>
) {
    // Get existing config
    const existing = await prisma.industryConfiguration.findUnique({
        where: { tenantId },
    });

    let record;
    if (existing) {
        // Merge existing config with new overrides
        const mergedConfig = engine.mergeTenantConfig(
            existing.config as unknown as IndustryConfig,
            config
        );
        record = await prisma.industryConfiguration.update({
            where: { tenantId },
            data: { config: mergedConfig as unknown as Record<string, unknown> as never },
        });
    } else {
        // Create new config
        record = await prisma.industryConfiguration.create({
            data: {
                tenantId,
                industry: config.industry || 'general',
                config: config as unknown as Record<string, unknown> as never,
            },
        });
    }

    // Refresh cache
    engine.unregisterTenantConfig(tenantId);
    if (record) {
        engine.registerTenantConfig(tenantId, {
            industry: record.industry as IndustryType,
            config: record.config as Partial<IndustryConfig>,
        });
    }

    return record;
}

/**
 * Get all default industry configs (tanpa tenant overrides).
 */
export function getAllDefaultConfigs() {
    // Dynamic import to avoid circular dependency
    const defaults = require('@qalcuity/industry-config') as { DEFAULT_INDUSTRY_CONFIGS: Record<string, IndustryConfig> };
    return defaults.DEFAULT_INDUSTRY_CONFIGS;
}
