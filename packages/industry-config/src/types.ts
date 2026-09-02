/**
 * @qalcuity/industry-config — Type Definitions
 *
 * Tipe data untuk Industry Configuration Engine.
 * Mendukung custom fields, dashboard widgets, approval rules,
 * dan module visibility per industri.
 */

// ─── Industry Type ───────────────────────────────────────────────────────────

/**
 * Jenis industri yang didukung oleh Qalcuity.
 * Setiap industri memiliki konfigurasi default yang bisa di-override per tenant.
 */
export type IndustryType =
    | 'retail'
    | 'manufacturing'
    | 'services'
    | 'construction'
    | 'healthcare'
    | 'education'
    | 'food_beverage'
    | 'general';

// ─── Industry Config ────────────────────────────────────────────────────────

/**
 * Konfigurasi lengkap untuk satu industri.
 * Berisi module visibility, custom fields, widgets, reports,
 * document templates, dan approval rules.
 */
export interface IndustryConfig {
    id: string;
    industry: IndustryType;
    name: string;
    description: string;

    // Module visibility
    modules: {
        finance: boolean;
        crm: boolean;
        hr: boolean;
        inventory: boolean;
        billing: boolean;
        analytics: boolean;
    };

    // Custom fields per entity
    customFields: {
        [entity: string]: CustomField[];
    };

    // Dashboard widgets
    dashboardWidgets: DashboardWidget[];

    // Custom reports
    reports: ReportConfig[];

    // Document templates
    documentTemplates: {
        [docType: string]: DocumentTemplate;
    };

    // Approval rules
    approvalRules: ApprovalRule[];
}

// ─── Custom Field ────────────────────────────────────────────────────────────

/**
 * Definisi custom field untuk entity tertentu.
 * Digunakan untuk menambahkan field tambahan sesuai kebutuhan industri.
 */
export interface CustomField {
    name: string;
    label: string;
    type: 'text' | 'number' | 'date' | 'select' | 'boolean';
    required: boolean;
    options?: string[]; // for select type
    defaultValue?: unknown;
}

// ─── Dashboard Widget ────────────────────────────────────────────────────────

/**
 * Widget dashboard yang relevan untuk industri tertentu.
 */
export interface DashboardWidget {
    id: string;
    type: 'chart' | 'stat' | 'table' | 'list';
    title: string;
    module: string;
    metric: string;
    size: 'sm' | 'md' | 'lg';
}

// ─── Report Config ───────────────────────────────────────────────────────────

/**
 * Konfigurasi laporan khusus industri.
 */
export interface ReportConfig {
    id: string;
    name: string;
    module: string;
    metrics: string[];
    groupBy?: string;
}

// ─── Document Template ───────────────────────────────────────────────────────

/**
 * Template dokumen khusus industri.
 */
export interface DocumentTemplate {
    name: string;
    fields: string[];
    layout: 'standard' | 'compact' | 'detailed';
}

// ─── Approval Rules ──────────────────────────────────────────────────────────

/**
 * Aturan approval untuk entity dan aksi tertentu.
 */
export interface ApprovalRule {
    entity: string;
    action: string;
    levels: ApprovalLevel[];
}

/**
 * Level approval dalam aturan approval.
 */
export interface ApprovalLevel {
    level: number;
    role: string;
    required: boolean;
}

// ─── Tenant Config Override ──────────────────────────────────────────────────

/**
 * Override konfigurasi industri per tenant.
 * Digunakan untuk menyimpan perubahan config tenant di database.
 */
export interface TenantConfigOverride {
    industry: IndustryType;
    config: Partial<IndustryConfig>;
}

// ─── Validation Result ───────────────────────────────────────────────────────

/**
 * Hasil validasi custom field values.
 */
export interface CustomFieldValidationResult {
    valid: boolean;
    errors: string[];
}
