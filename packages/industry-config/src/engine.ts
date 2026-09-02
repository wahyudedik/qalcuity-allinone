/**
 * @qalcuity/industry-config — Industry Configuration Engine Core
 *
 * Mesin utama untuk mengelola konfigurasi industri.
 * Mendukung default configs, tenant overrides, custom fields validation,
 * dan module visibility checks.
 */

import type {
    IndustryConfig,
    IndustryType,
    CustomField,
    DashboardWidget,
    ApprovalRule,
    CustomFieldValidationResult,
    TenantConfigOverride,
} from './types';
import { DEFAULT_INDUSTRY_CONFIGS } from './defaults';

export class IndustryConfigEngine {
    // ─── Private State ────────────────────────────────────────────────────────

    /**
     * Cache untuk default configurations.
     */
    private configs: Map<IndustryType, IndustryConfig>;

    /**
     * Cache untuk tenant-specific overrides.
     * Key: tenantId
     */
    private tenantConfigs: Map<string, TenantConfigOverride>;

    // ─── Constructor ──────────────────────────────────────────────────────────

    constructor() {
        this.configs = new Map();
        this.tenantConfigs = new Map();
        this.loadDefaults();
    }

    // ─── Private Methods ──────────────────────────────────────────────────────

    /**
     * Load default configurations ke cache.
     */
    private loadDefaults(): void {
        for (const [key, config] of Object.entries(DEFAULT_INDUSTRY_CONFIGS)) {
            this.configs.set(key as IndustryType, config);
        }
    }

    /**
     * Deep merge two objects. Source values override target values.
     * Arrays are replaced, not merged.
     */
    private deepMerge(target: unknown, source: unknown): unknown {
        if (typeof target !== 'object' || target === null || Array.isArray(target)) {
            return source !== undefined ? source : target;
        }
        if (typeof source !== 'object' || source === null || Array.isArray(source)) {
            return source !== undefined ? source : target;
        }

        const result = { ...(target as Record<string, unknown>) };

        for (const key of Object.keys(source as Record<string, unknown>)) {
            const sourceVal = (source as Record<string, unknown>)[key];
            const targetVal = result[key];

            if (
                sourceVal !== null &&
                sourceVal !== undefined &&
                typeof sourceVal === 'object' &&
                !Array.isArray(sourceVal) &&
                typeof targetVal === 'object' &&
                targetVal !== null &&
                !Array.isArray(targetVal)
            ) {
                result[key] = this.deepMerge(targetVal, sourceVal);
            } else if (sourceVal !== undefined) {
                result[key] = sourceVal;
            }
        }

        return result;
    }

    // ─── Public Methods ───────────────────────────────────────────────────────

    /**
     * Dapatkan konfigurasi industri, dengan opsional tenant overrides.
     * Prioritas: tenant overrides > default config.
     *
     * @param industry - Jenis industri
     * @param tenantId - ID tenant (opsional)
     * @returns IndustryConfig yang sudah di-merge
     */
    getConfig(industry: IndustryType, tenantId?: string): IndustryConfig {
        const defaultConfig = this.configs.get(industry);
        if (!defaultConfig) {
            // Fallback ke general jika industri tidak dikenal
            return this.configs.get('general')!;
        }

        if (!tenantId) {
            return defaultConfig;
        }

        const tenantOverride = this.tenantConfigs.get(tenantId);
        if (!tenantOverride || tenantOverride.industry !== industry) {
            return defaultConfig;
        }

        return this.deepMerge(defaultConfig, tenantOverride.config) as unknown as IndustryConfig;
    }

    /**
     * Dapatkan custom fields untuk entity tertentu.
     *
     * @param industry - Jenis industri
     * @param entity - Nama entity (e.g., 'product', 'invoice')
     * @param tenantId - ID tenant (opsional)
     * @returns Array CustomField
     */
    getCustomFields(industry: IndustryType, entity: string, tenantId?: string): CustomField[] {
        const config = this.getConfig(industry, tenantId);
        return config.customFields[entity] || [];
    }

    /**
     * Dapatkan dashboard widgets untuk industri.
     *
     * @param industry - Jenis industri
     * @param tenantId - ID tenant (opsional)
     * @returns Array DashboardWidget
     */
    getDashboardWidgets(industry: IndustryType, tenantId?: string): DashboardWidget[] {
        const config = this.getConfig(industry, tenantId);
        return config.dashboardWidgets;
    }

    /**
     * Dapatkan approval rules untuk entity tertentu.
     *
     * @param industry - Jenis industri
     * @param entity - Nama entity
     * @param tenantId - ID tenant (opsional)
     * @returns ApprovalRule atau undefined
     */
    getApprovalRules(industry: IndustryType, entity: string, tenantId?: string): ApprovalRule | undefined {
        const config = this.getConfig(industry, tenantId);
        return config.approvalRules.find((rule) => rule.entity === entity);
    }

    /**
     * Cek apakah module aktif untuk industri tertentu.
     *
     * @param industry - Jenis industri
     * @param module - Nama module (e.g., 'finance', 'crm')
     * @param tenantId - ID tenant (opsional)
     * @returns boolean
     */
    isModuleEnabled(industry: IndustryType, module: string, tenantId?: string): boolean {
        const config = this.getConfig(industry, tenantId);
        const modules = config.modules as Record<string, boolean>;
        return modules[module] ?? false;
    }

    /**
     * Validasi nilai custom field.
     *
     * @param field - Definisi custom field
     * @param value - Nilai yang akan divalidasi
     * @returns CustomFieldValidationResult
     */
    validateCustomField(field: CustomField, value: unknown): CustomFieldValidationResult {
        const errors: string[] = [];

        // Check required
        if (field.required && (value === undefined || value === null || value === '')) {
            errors.push(`Field "${field.label}" wajib diisi`);
            return { valid: false, errors };
        }

        // Skip further validation if empty and not required
        if (value === undefined || value === null || value === '') {
            return { valid: true, errors: [] };
        }

        // Type-specific validation
        switch (field.type) {
            case 'text':
                if (typeof value !== 'string') {
                    errors.push(`Field "${field.label}" harus berupa teks`);
                }
                break;

            case 'number':
                if (typeof value !== 'number' && (typeof value !== 'string' || isNaN(Number(value)))) {
                    errors.push(`Field "${field.label}" harus berupa angka`);
                }
                break;

            case 'date':
                if (typeof value === 'string') {
                    const date = new Date(value);
                    if (isNaN(date.getTime())) {
                        errors.push(`Field "${field.label}" harus berupa tanggal yang valid`);
                    }
                } else if (!(value instanceof Date)) {
                    errors.push(`Field "${field.label}" harus berupa tanggal`);
                }
                break;

            case 'select':
                if (field.options && field.options.length > 0) {
                    if (!field.options.includes(String(value))) {
                        errors.push(`Field "${field.label}" harus salah satu dari: ${field.options.join(', ')}`);
                    }
                }
                break;

            case 'boolean':
                if (typeof value !== 'boolean' && value !== 'true' && value !== 'false') {
                    errors.push(`Field "${field.label}" harus berupa boolean`);
                }
                break;
        }

        return { valid: errors.length === 0, errors };
    }

    /**
     * Validasi multiple custom field values sekaligus.
     *
     * @param fields - Array definisi custom fields
     * @param data - Object berisi field values { fieldName: value }
     * @returns CustomFieldValidationResult
     */
    validateCustomFields(fields: CustomField[], data: Record<string, unknown>): CustomFieldValidationResult {
        const allErrors: string[] = [];

        for (const field of fields) {
            const value = data[field.name];
            const result = this.validateCustomField(field, value);
            allErrors.push(...result.errors);
        }

        return { valid: allErrors.length === 0, errors: allErrors };
    }

    /**
     * Register tenant config override.
     * Dipanggil saat load config dari database.
     *
     * @param tenantId - ID tenant
     * @param override - Config overrides
     */
    registerTenantConfig(tenantId: string, override: TenantConfigOverride): void {
        this.tenantConfigs.set(tenantId, override);
    }

    /**
     * Hapus tenant config override dari cache.
     *
     * @param tenantId - ID tenant
     */
    unregisterTenantConfig(tenantId: string): void {
        this.tenantConfigs.delete(tenantId);
    }

    /**
     * Hapus semua tenant configs dari cache.
     */
    clearTenantCache(): void {
        this.tenantConfigs.clear();
    }

    /**
     * Dapatkan daftar semua industri yang didukung.
     *
     * @returns Array IndustryType
     */
    getSupportedIndustries(): IndustryType[] {
        return Array.from(this.configs.keys());
    }

    /**
     * Dapatkan ringkasan konfigurasi industri (tanpa detail lengkap).
     *
     * @param industry - Jenis industri
     * @returns Object ringkasan
     */
    getIndustrySummary(industry: IndustryType): {
        name: string;
        description: string;
        enabledModules: string[];
        customFieldEntities: string[];
        widgetCount: number;
        reportCount: number;
    } | null {
        const config = this.configs.get(industry);
        if (!config) return null;

        const enabledModules = Object.entries(config.modules)
            .filter(([, enabled]) => enabled)
            .map(([name]) => name);

        return {
            name: config.name,
            description: config.description,
            enabledModules,
            customFieldEntities: Object.keys(config.customFields),
            widgetCount: config.dashboardWidgets.length,
            reportCount: config.reports.length,
        };
    }

    /**
     * Merge tenant overrides dengan base config.
     * Berguna untuk menyimpan perubahan config tenant.
     *
     * @param base - Base industry config
     * @param overrides - Tenant overrides
     * @returns Merged IndustryConfig
     */
    mergeTenantConfig(base: IndustryConfig, overrides: Partial<IndustryConfig>): IndustryConfig {
        return this.deepMerge(base, overrides) as unknown as IndustryConfig;
    }
}
