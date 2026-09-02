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
} from './types';
export { DEFAULT_INDUSTRY_CONFIGS, SUPPORTED_INDUSTRIES } from './defaults';

// ─── Convenience Functions ───────────────────────────────────────────────────

import { IndustryConfigEngine } from './engine';
import { DEFAULT_INDUSTRY_CONFIGS } from './defaults';
import type { IndustryType, IndustryConfig, CustomField } from './types';

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
