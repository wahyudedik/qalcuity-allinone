/**
 * @qalcuity/industry-config
 *
 * Industry Configuration Engine untuk Qalcuity.
 * Mendukung custom fields, dashboard widgets, approval rules,
 * module visibility, dan document templates per industri.
 *
 * @example
 * ```typescript
 * import { IndustryConfigEngine, DEFAULT_INDUSTRY_CONFIGS } from '@qalcuity/industry-config';
 *
 * // Get config for retail industry
 * const engine = new IndustryConfigEngine();
 * const config = engine.getConfig('retail');
 *
 * // Check if module is enabled
 * const inventoryEnabled = engine.isModuleEnabled('retail', 'inventory'); // true
 *
 * // Get custom fields for product entity
 * const fields = engine.getCustomFields('retail', 'product');
 *
 * // Validate custom field values
 * const result = engine.validateCustomField(fields[0], 'SKU-001');
 * // result: { valid: true, errors: [] }
 * ```
 */

export { IndustryConfigEngine } from './engine';
export type {
    IndustryType,
    IndustryConfig,
    CustomField,
    DashboardWidget,
    ReportConfig,
    DocumentTemplate,
    ApprovalRule,
    ApprovalLevel,
    TenantConfigOverride,
    CustomFieldValidationResult,
    IndustryPack,
    PackModule,
    PackDashboardWidget,
    WorkflowTransition,
    PackWorkflow,
    PackPosSettings,
} from './types';
export { DEFAULT_INDUSTRY_CONFIGS, SUPPORTED_INDUSTRIES } from './defaults';
export { restaurantIndustryPack } from './packs/restaurant';
export { INDUSTRY_PACKS, AVAILABLE_PACK_IDS } from './packs';

// ─── Convenience Functions ───────────────────────────────────────────────────

import { IndustryConfigEngine } from './engine';
import { DEFAULT_INDUSTRY_CONFIGS } from './defaults';
import { INDUSTRY_PACKS } from './packs';
import type { IndustryType, IndustryConfig, CustomField, IndustryPack } from './types';

/**
 * Singleton engine instance untuk convenience functions.
 */
const engine = new IndustryConfigEngine();

/**
 * Dapatkan konfigurasi industri.
 *
 * @param industry - Jenis industri
 * @param tenantId - ID tenant (opsional)
 * @returns IndustryConfig
 */
export function getIndustryConfig(industry: IndustryType, tenantId?: string): IndustryConfig {
    return engine.getConfig(industry, tenantId);
}

/**
 * Dapatkan custom fields untuk entity tertentu.
 *
 * @param industry - Jenis industri
 * @param entity - Nama entity
 * @param tenantId - ID tenant (opsional)
 * @returns Array CustomField
 */
export function getCustomFields(industry: IndustryType, entity: string, tenantId?: string): CustomField[] {
    return engine.getCustomFields(industry, entity, tenantId);
}

/**
 * Cek apakah module aktif untuk industri tertentu.
 *
 * @param industry - Jenis industri
 * @param module - Nama module
 * @param tenantId - ID tenant (opsional)
 * @returns boolean
 */
export function isModuleEnabled(industry: IndustryType, module: string, tenantId?: string): boolean {
    return engine.isModuleEnabled(industry, module, tenantId);
}

/**
 * Dapatkan industry pack berdasarkan pack ID.
 *
 * @param packId - ID pack (e.g., 'restaurant')
 * @returns IndustryPack atau undefined
 */
export function getIndustryPack(packId: string): IndustryPack | undefined {
    return engine.getIndustryPack(packId);
}

/**
 * Dapatkan semua industry packs yang tersedia.
 *
 * @returns Array IndustryPack
 */
export function getAvailablePacks(): IndustryPack[] {
    return engine.getAvailablePacks();
}

/**
 * Merge industry pack dengan user customizations.
 *
 * @param pack - Industry pack
 * @param customConfig - Custom config dari user
 * @returns Merged IndustryPack
 */
export function mergePackWithDefaults(pack: IndustryPack, customConfig: Partial<IndustryPack>): IndustryPack {
    return engine.mergeWithDefaults(pack, customConfig);
}
