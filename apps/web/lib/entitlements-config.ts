/**
 * Entitlements Configuration — Feature Keys & Default Plans
 *
 * Mendefinisikan semua feature keys yang digunakan oleh Entitlement Engine.
 * Setiap feature key merepresentasikan satu fitur yang bisa di-gate oleh plan.
 *
 * Naming convention: {module}.{feature}
 * Contoh: "finance.invoices", "hr.employees", "ai.chat"
 */

// ─── Feature Keys ──────────────────────────────────────────────────────────────

export const FEATURE_KEYS = {
    // Finance
    FINANCE_INVOICES: 'finance.invoices',
    FINANCE_PAYMENTS: 'finance.payments',
    FINANCE_PURCHASE_ORDERS: 'finance.purchase-orders',
    FINANCE_JOURNAL_ENTRIES: 'finance.journal-entries',
    FINANCE_REPORTS: 'finance.reports',
    FINANCE_RECONCILIATION: 'finance.reconciliation',

    // CRM
    CRM_CONTACTS: 'crm.contacts',
    CRM_LEADS: 'crm.leads',
    CRM_DEALS: 'crm.deals',
    CRM_PIPELINE: 'crm.pipeline',

    // Inventory
    INVENTORY_PRODUCTS: 'inventory.products',
    INVENTORY_STOCK: 'inventory.stock',
    INVENTORY_SUPPLIERS: 'inventory.suppliers',
    INVENTORY_CATEGORIES: 'inventory.categories',

    // HR
    HR_EMPLOYEES: 'hr.employees',
    HR_ATTENDANCE: 'hr.attendance',
    HR_LEAVES: 'hr.leaves',
    HR_PAYROLL: 'hr.payroll',

    // AI
    AI_CHAT: 'ai.chat',
    AI_DOCUMENT_EXTRACTION: 'ai.document-extraction',
    AI_PREDICTIONS: 'ai.predictions',

    // Integrations
    INTEGRATION_WHATSAPP: 'integration.whatsapp',
    INTEGRATION_EMAIL: 'integration.email',
    INTEGRATION_PAYMENT: 'integration.payment',

    // Platform
    PLATFORM_ADMIN: 'platform.admin',
    PLATFORM_BILLING: 'platform.billing',
    PLATFORM_MONITORING: 'platform.monitoring',
} as const;

export type FeatureKey = (typeof FEATURE_KEYS)[keyof typeof FEATURE_KEYS];

// ─── Feature Groups (for UI display) ──────────────────────────────────────────

export const FEATURE_GROUPS = {
    finance: {
        label: 'Finance',
        features: [
            FEATURE_KEYS.FINANCE_INVOICES,
            FEATURE_KEYS.FINANCE_PAYMENTS,
            FEATURE_KEYS.FINANCE_PURCHASE_ORDERS,
            FEATURE_KEYS.FINANCE_JOURNAL_ENTRIES,
            FEATURE_KEYS.FINANCE_REPORTS,
            FEATURE_KEYS.FINANCE_RECONCILIATION,
        ],
    },
    crm: {
        label: 'CRM',
        features: [
            FEATURE_KEYS.CRM_CONTACTS,
            FEATURE_KEYS.CRM_LEADS,
            FEATURE_KEYS.CRM_DEALS,
            FEATURE_KEYS.CRM_PIPELINE,
        ],
    },
    inventory: {
        label: 'Inventory',
        features: [
            FEATURE_KEYS.INVENTORY_PRODUCTS,
            FEATURE_KEYS.INVENTORY_STOCK,
            FEATURE_KEYS.INVENTORY_SUPPLIERS,
            FEATURE_KEYS.INVENTORY_CATEGORIES,
        ],
    },
    hr: {
        label: 'HR',
        features: [
            FEATURE_KEYS.HR_EMPLOYEES,
            FEATURE_KEYS.HR_ATTENDANCE,
            FEATURE_KEYS.HR_LEAVES,
            FEATURE_KEYS.HR_PAYROLL,
        ],
    },
    ai: {
        label: 'AI Features',
        features: [
            FEATURE_KEYS.AI_CHAT,
            FEATURE_KEYS.AI_DOCUMENT_EXTRACTION,
            FEATURE_KEYS.AI_PREDICTIONS,
        ],
    },
    integrations: {
        label: 'Integrations',
        features: [
            FEATURE_KEYS.INTEGRATION_WHATSAPP,
            FEATURE_KEYS.INTEGRATION_EMAIL,
            FEATURE_KEYS.INTEGRATION_PAYMENT,
        ],
    },
    platform: {
        label: 'Platform',
        features: [
            FEATURE_KEYS.PLATFORM_ADMIN,
            FEATURE_KEYS.PLATFORM_BILLING,
            FEATURE_KEYS.PLATFORM_MONITORING,
        ],
    },
} as const;

// ─── Feature Labels (for UI display) ──────────────────────────────────────────

export const FEATURE_LABELS: Record<FeatureKey, string> = {
    [FEATURE_KEYS.FINANCE_INVOICES]: 'Invoices',
    [FEATURE_KEYS.FINANCE_PAYMENTS]: 'Payments',
    [FEATURE_KEYS.FINANCE_PURCHASE_ORDERS]: 'Purchase Orders',
    [FEATURE_KEYS.FINANCE_JOURNAL_ENTRIES]: 'Journal Entries',
    [FEATURE_KEYS.FINANCE_REPORTS]: 'Finance Reports',
    [FEATURE_KEYS.FINANCE_RECONCILIATION]: 'Reconciliation',
    [FEATURE_KEYS.CRM_CONTACTS]: 'Contacts',
    [FEATURE_KEYS.CRM_LEADS]: 'Leads',
    [FEATURE_KEYS.CRM_DEALS]: 'Deals',
    [FEATURE_KEYS.CRM_PIPELINE]: 'Pipeline',
    [FEATURE_KEYS.INVENTORY_PRODUCTS]: 'Products',
    [FEATURE_KEYS.INVENTORY_STOCK]: 'Stock Management',
    [FEATURE_KEYS.INVENTORY_SUPPLIERS]: 'Suppliers',
    [FEATURE_KEYS.INVENTORY_CATEGORIES]: 'Categories',
    [FEATURE_KEYS.HR_EMPLOYEES]: 'Employees',
    [FEATURE_KEYS.HR_ATTENDANCE]: 'Attendance',
    [FEATURE_KEYS.HR_LEAVES]: 'Leave Management',
    [FEATURE_KEYS.HR_PAYROLL]: 'Payroll',
    [FEATURE_KEYS.AI_CHAT]: 'AI Chat',
    [FEATURE_KEYS.AI_DOCUMENT_EXTRACTION]: 'Document Extraction',
    [FEATURE_KEYS.AI_PREDICTIONS]: 'Predictions',
    [FEATURE_KEYS.INTEGRATION_WHATSAPP]: 'WhatsApp Integration',
    [FEATURE_KEYS.INTEGRATION_EMAIL]: 'Email Integration',
    [FEATURE_KEYS.INTEGRATION_PAYMENT]: 'Payment Integration',
    [FEATURE_KEYS.PLATFORM_ADMIN]: 'Platform Admin',
    [FEATURE_KEYS.PLATFORM_BILLING]: 'Billing Management',
    [FEATURE_KEYS.PLATFORM_MONITORING]: 'Monitoring',
};

// ─── Default Plan Definitions ──────────────────────────────────────────────────

export interface PlanDefinition {
    name: string;
    slug: string;
    description: string;
    priceMonthly: number;
    priceYearly: number;
    maxUsers: number;
    maxStorage: number | null;
    sortOrder: number;
    features: { featureKey: FeatureKey; enabled: boolean; limit: number | null }[];
}

export const DEFAULT_PLANS: PlanDefinition[] = [
    {
        name: 'Free',
        slug: 'free',
        description: 'Cocok untuk bisnis kecil yang baru memulai',
        priceMonthly: 0,
        priceYearly: 0,
        maxUsers: 3,
        maxStorage: 500, // 500 MB
        sortOrder: 0,
        features: [
            // Finance (basic)
            { featureKey: FEATURE_KEYS.FINANCE_INVOICES, enabled: true, limit: 50 },
            { featureKey: FEATURE_KEYS.FINANCE_PAYMENTS, enabled: true, limit: 50 },
            { featureKey: FEATURE_KEYS.FINANCE_PURCHASE_ORDERS, enabled: false, limit: null },
            { featureKey: FEATURE_KEYS.FINANCE_JOURNAL_ENTRIES, enabled: false, limit: null },
            { featureKey: FEATURE_KEYS.FINANCE_REPORTS, enabled: false, limit: null },
            { featureKey: FEATURE_KEYS.FINANCE_RECONCILIATION, enabled: false, limit: null },
            // CRM (basic)
            { featureKey: FEATURE_KEYS.CRM_CONTACTS, enabled: true, limit: 100 },
            { featureKey: FEATURE_KEYS.CRM_LEADS, enabled: true, limit: 20 },
            { featureKey: FEATURE_KEYS.CRM_DEALS, enabled: false, limit: null },
            { featureKey: FEATURE_KEYS.CRM_PIPELINE, enabled: false, limit: null },
            // Inventory (basic)
            { featureKey: FEATURE_KEYS.INVENTORY_PRODUCTS, enabled: true, limit: 50 },
            { featureKey: FEATURE_KEYS.INVENTORY_STOCK, enabled: true, limit: null },
            { featureKey: FEATURE_KEYS.INVENTORY_SUPPLIERS, enabled: false, limit: null },
            { featureKey: FEATURE_KEYS.INVENTORY_CATEGORIES, enabled: true, limit: 10 },
            // HR (not available)
            { featureKey: FEATURE_KEYS.HR_EMPLOYEES, enabled: false, limit: null },
            { featureKey: FEATURE_KEYS.HR_ATTENDANCE, enabled: false, limit: null },
            { featureKey: FEATURE_KEYS.HR_LEAVES, enabled: false, limit: null },
            { featureKey: FEATURE_KEYS.HR_PAYROLL, enabled: false, limit: null },
            // AI (not available)
            { featureKey: FEATURE_KEYS.AI_CHAT, enabled: false, limit: null },
            { featureKey: FEATURE_KEYS.AI_DOCUMENT_EXTRACTION, enabled: false, limit: null },
            { featureKey: FEATURE_KEYS.AI_PREDICTIONS, enabled: false, limit: null },
            // Integrations (not available)
            { featureKey: FEATURE_KEYS.INTEGRATION_WHATSAPP, enabled: false, limit: null },
            { featureKey: FEATURE_KEYS.INTEGRATION_EMAIL, enabled: false, limit: null },
            { featureKey: FEATURE_KEYS.INTEGRATION_PAYMENT, enabled: false, limit: null },
            // Platform
            { featureKey: FEATURE_KEYS.PLATFORM_ADMIN, enabled: false, limit: null },
            { featureKey: FEATURE_KEYS.PLATFORM_BILLING, enabled: false, limit: null },
            { featureKey: FEATURE_KEYS.PLATFORM_MONITORING, enabled: false, limit: null },
        ],
    },
    {
        name: 'Pro',
        slug: 'pro',
        description: 'Untuk bisnis yang berkembang dengan kebutuhan lengkap',
        priceMonthly: 299000,
        priceYearly: 2990000, // ~2 bulan gratis
        maxUsers: 20,
        maxStorage: 5000, // 5 GB
        sortOrder: 1,
        features: [
            // Finance (all)
            { featureKey: FEATURE_KEYS.FINANCE_INVOICES, enabled: true, limit: null },
            { featureKey: FEATURE_KEYS.FINANCE_PAYMENTS, enabled: true, limit: null },
            { featureKey: FEATURE_KEYS.FINANCE_PURCHASE_ORDERS, enabled: true, limit: null },
            { featureKey: FEATURE_KEYS.FINANCE_JOURNAL_ENTRIES, enabled: true, limit: null },
            { featureKey: FEATURE_KEYS.FINANCE_REPORTS, enabled: true, limit: null },
            { featureKey: FEATURE_KEYS.FINANCE_RECONCILIATION, enabled: true, limit: null },
            // CRM (all)
            { featureKey: FEATURE_KEYS.CRM_CONTACTS, enabled: true, limit: null },
            { featureKey: FEATURE_KEYS.CRM_LEADS, enabled: true, limit: null },
            { featureKey: FEATURE_KEYS.CRM_DEALS, enabled: true, limit: null },
            { featureKey: FEATURE_KEYS.CRM_PIPELINE, enabled: true, limit: null },
            // Inventory (all)
            { featureKey: FEATURE_KEYS.INVENTORY_PRODUCTS, enabled: true, limit: null },
            { featureKey: FEATURE_KEYS.INVENTORY_STOCK, enabled: true, limit: null },
            { featureKey: FEATURE_KEYS.INVENTORY_SUPPLIERS, enabled: true, limit: null },
            { featureKey: FEATURE_KEYS.INVENTORY_CATEGORIES, enabled: true, limit: null },
            // HR (basic)
            { featureKey: FEATURE_KEYS.HR_EMPLOYEES, enabled: true, limit: null },
            { featureKey: FEATURE_KEYS.HR_ATTENDANCE, enabled: true, limit: null },
            { featureKey: FEATURE_KEYS.HR_LEAVES, enabled: true, limit: null },
            { featureKey: FEATURE_KEYS.HR_PAYROLL, enabled: false, limit: null },
            // AI (basic)
            { featureKey: FEATURE_KEYS.AI_CHAT, enabled: true, limit: 100 },
            { featureKey: FEATURE_KEYS.AI_DOCUMENT_EXTRACTION, enabled: true, limit: 50 },
            { featureKey: FEATURE_KEYS.AI_PREDICTIONS, enabled: false, limit: null },
            // Integrations
            { featureKey: FEATURE_KEYS.INTEGRATION_WHATSAPP, enabled: true, limit: null },
            { featureKey: FEATURE_KEYS.INTEGRATION_EMAIL, enabled: true, limit: null },
            { featureKey: FEATURE_KEYS.INTEGRATION_PAYMENT, enabled: false, limit: null },
            // Platform
            { featureKey: FEATURE_KEYS.PLATFORM_ADMIN, enabled: false, limit: null },
            { featureKey: FEATURE_KEYS.PLATFORM_BILLING, enabled: true, limit: null },
            { featureKey: FEATURE_KEYS.PLATFORM_MONITORING, enabled: false, limit: null },
        ],
    },
    {
        name: 'Enterprise',
        slug: 'enterprise',
        description: 'Untuk bisnis besar dengan kebutuhan advanced',
        priceMonthly: 999000,
        priceYearly: 9990000, // ~2 bulan gratis
        maxUsers: -1, // unlimited
        maxStorage: null, // unlimited
        sortOrder: 2,
        features: [
            // Finance (all)
            { featureKey: FEATURE_KEYS.FINANCE_INVOICES, enabled: true, limit: null },
            { featureKey: FEATURE_KEYS.FINANCE_PAYMENTS, enabled: true, limit: null },
            { featureKey: FEATURE_KEYS.FINANCE_PURCHASE_ORDERS, enabled: true, limit: null },
            { featureKey: FEATURE_KEYS.FINANCE_JOURNAL_ENTRIES, enabled: true, limit: null },
            { featureKey: FEATURE_KEYS.FINANCE_REPORTS, enabled: true, limit: null },
            { featureKey: FEATURE_KEYS.FINANCE_RECONCILIATION, enabled: true, limit: null },
            // CRM (all)
            { featureKey: FEATURE_KEYS.CRM_CONTACTS, enabled: true, limit: null },
            { featureKey: FEATURE_KEYS.CRM_LEADS, enabled: true, limit: null },
            { featureKey: FEATURE_KEYS.CRM_DEALS, enabled: true, limit: null },
            { featureKey: FEATURE_KEYS.CRM_PIPELINE, enabled: true, limit: null },
            // Inventory (all)
            { featureKey: FEATURE_KEYS.INVENTORY_PRODUCTS, enabled: true, limit: null },
            { featureKey: FEATURE_KEYS.INVENTORY_STOCK, enabled: true, limit: null },
            { featureKey: FEATURE_KEYS.INVENTORY_SUPPLIERS, enabled: true, limit: null },
            { featureKey: FEATURE_KEYS.INVENTORY_CATEGORIES, enabled: true, limit: null },
            // HR (all)
            { featureKey: FEATURE_KEYS.HR_EMPLOYEES, enabled: true, limit: null },
            { featureKey: FEATURE_KEYS.HR_ATTENDANCE, enabled: true, limit: null },
            { featureKey: FEATURE_KEYS.HR_LEAVES, enabled: true, limit: null },
            { featureKey: FEATURE_KEYS.HR_PAYROLL, enabled: true, limit: null },
            // AI (advanced)
            { featureKey: FEATURE_KEYS.AI_CHAT, enabled: true, limit: null },
            { featureKey: FEATURE_KEYS.AI_DOCUMENT_EXTRACTION, enabled: true, limit: null },
            { featureKey: FEATURE_KEYS.AI_PREDICTIONS, enabled: true, limit: null },
            // Integrations (all)
            { featureKey: FEATURE_KEYS.INTEGRATION_WHATSAPP, enabled: true, limit: null },
            { featureKey: FEATURE_KEYS.INTEGRATION_EMAIL, enabled: true, limit: null },
            { featureKey: FEATURE_KEYS.INTEGRATION_PAYMENT, enabled: true, limit: null },
            // Platform
            { featureKey: FEATURE_KEYS.PLATFORM_ADMIN, enabled: true, limit: null },
            { featureKey: FEATURE_KEYS.PLATFORM_BILLING, enabled: true, limit: null },
            { featureKey: FEATURE_KEYS.PLATFORM_MONITORING, enabled: true, limit: null },
        ],
    },
];

// ─── Entitlement Status Constants ──────────────────────────────────────────────

export const ENTITLEMENT_STATUS = {
    ACTIVE: 'active',
    TRIAL: 'trial',
    SUSPENDED: 'suspended',
    CANCELLED: 'cancelled',
} as const;

export type EntitlementStatus = (typeof ENTITLEMENT_STATUS)[keyof typeof ENTITLEMENT_STATUS];

// ─── Billing Cycle Constants ───────────────────────────────────────────────────

export const BILLING_CYCLE = {
    MONTHLY: 'monthly',
    YEARLY: 'yearly',
} as const;

export type BillingCycle = (typeof BILLING_CYCLE)[keyof typeof BILLING_CYCLE];

// ─── Trial Configuration ───────────────────────────────────────────────────────

export const TRIAL_DAYS = 14;
export const GRACE_PERIOD_DAYS = 7;
