// ============================================
// @qalcuity/config — Feature Flags
// ============================================

export interface FeatureFlag {
    key: string;
    name: string;
    description: string;
    defaultValue: boolean;
    /** Plan required to access this feature (null = all plans) */
    requiredPlan?: string | null;
}

// --------------------------------------------
// Feature Flags Registry
// --------------------------------------------

export const FEATURE_FLAGS: Record<string, FeatureFlag> = {
    // Core Features
    FINANCE_MODULE: {
        key: 'FINANCE_MODULE',
        name: 'Modul Keuangan',
        description: 'Invoice, quotation, payment, purchase order',
        defaultValue: true,
    },
    CRM_MODULE: {
        key: 'CRM_MODULE',
        name: 'Modul CRM',
        description: 'Leads, contacts, deals, pipeline',
        defaultValue: true,
    },
    INVENTORY_MODULE: {
        key: 'INVENTORY_MODULE',
        name: 'Modul Persediaan',
        description: 'Products, stock, categories, suppliers',
        defaultValue: true,
    },
    HR_MODULE: {
        key: 'HR_MODULE',
        name: 'Modul HR',
        description: 'Employees, attendance, leaves, payroll',
        defaultValue: true,
    },

    // AI Features
    AI_CHAT: {
        key: 'AI_CHAT',
        name: 'AI Chat',
        description: 'Floating AI assistant chat',
        defaultValue: true,
    },
    AI_INSIGHTS: {
        key: 'AI_INSIGHTS',
        name: 'AI Insights',
        description: 'AI-generated business insight cards',
        defaultValue: true,
    },
    AI_DOCUMENT_EXTRACTION: {
        key: 'AI_DOCUMENT_EXTRACTION',
        name: 'Smart Document Extraction',
        description: 'OCR and document data extraction',
        defaultValue: true,
    },
    AI_ANOMALY_DETECTION: {
        key: 'AI_ANOMALY_DETECTION',
        name: 'Anomaly Detection',
        description: 'Detect suspicious transactions and patterns',
        defaultValue: true,
    },
    AI_CASH_FLOW_PREDICTION: {
        key: 'AI_CASH_FLOW_PREDICTION',
        name: 'Cash Flow Prediction',
        description: 'Predict cash flow for 30/60/90 days',
        defaultValue: true,
    },
    AI_TEMPLATE_GENERATOR: {
        key: 'AI_TEMPLATE_GENERATOR',
        name: 'AI Template Generator',
        description: 'Generate documents from templates using AI',
        defaultValue: true,
    },

    // Advanced Features
    ADVANCED_REPORTING: {
        key: 'ADVANCED_REPORTING',
        name: 'Advanced Reporting',
        description: '12 report types with export and custom charts',
        defaultValue: true,
    },
    AUDIT_TRAIL: {
        key: 'AUDIT_TRAIL',
        name: 'Jejak Audit',
        description: 'Track all user actions and changes',
        defaultValue: true,
    },
    GLOBAL_SEARCH: {
        key: 'GLOBAL_SEARCH',
        name: 'Global Search',
        description: 'Ctrl+K search across all modules',
        defaultValue: true,
    },
    DARK_MODE: {
        key: 'DARK_MODE',
        name: 'Mode Gelap',
        description: 'Dark mode support',
        defaultValue: true,
    },

    // Integration Features
    WHATSAPP_INTEGRATION: {
        key: 'WHATSAPP_INTEGRATION',
        name: 'Integrasi WhatsApp',
        description: 'WhatsApp notifications and messaging',
        defaultValue: false,
        requiredPlan: 'growth',
    },
    MARKETPLACE_INTEGRATION: {
        key: 'MARKETPLACE_INTEGRATION',
        name: 'Integrasi Marketplace',
        description: 'Connect to Shopee, Tokopedia, etc.',
        defaultValue: false,
        requiredPlan: 'growth',
    },
    PAYMENT_GATEWAY: {
        key: 'PAYMENT_GATEWAY',
        name: 'Payment Gateway',
        description: 'Midtrans/Xendit payment processing',
        defaultValue: false,
        requiredPlan: 'growth',
    },
    EMAIL_NOTIFICATIONS: {
        key: 'EMAIL_NOTIFICATIONS',
        name: 'Email Notifications',
        description: 'SMTP email notifications',
        defaultValue: false,
        requiredPlan: 'starter',
    },
    BANK_RECONCILIATION: {
        key: 'BANK_RECONCILIATION',
        name: 'Bank Reconciliation',
        description: 'Match bank statements with transactions',
        defaultValue: false,
        requiredPlan: 'growth',
    },

    // Platform Features
    DESKTOP_APP: {
        key: 'DESKTOP_APP',
        name: 'Desktop App',
        description: 'Electron-based desktop application',
        defaultValue: true,
    },
    MOBILE_APP: {
        key: 'MOBILE_APP',
        name: 'Mobile App',
        description: 'React Native mobile application',
        defaultValue: true,
    },
    CUSTOMER_PORTAL: {
        key: 'CUSTOMER_PORTAL',
        name: 'Customer Portal',
        description: 'Self-service portal for customers',
        defaultValue: false,
        requiredPlan: 'business',
    },
};

// --------------------------------------------
// Feature Flag Helpers
// --------------------------------------------

/**
 * Check if a feature flag is enabled
 * In production, this would check against tenant subscription and feature config
 */
export function isFeatureEnabled(
    featureKey: string,
    tenantFeatures?: Record<string, boolean>
): boolean {
    const flag = FEATURE_FLAGS[featureKey];
    if (!flag) return false;

    // If tenant features provided, check there first
    if (tenantFeatures && featureKey in tenantFeatures) {
        return tenantFeatures[featureKey];
    }

    // Fall back to default value
    return flag.defaultValue;
}

/**
 * Get all enabled features for a tenant
 */
export function getEnabledFeatures(
    tenantFeatures?: Record<string, boolean>
): string[] {
    return Object.keys(FEATURE_FLAGS).filter((key) =>
        isFeatureEnabled(key, tenantFeatures)
    );
}

/**
 * Get features that require a specific plan
 */
export function getPlanRequiredFeatures(planSlug: string): FeatureFlag[] {
    return Object.values(FEATURE_FLAGS).filter(
        (flag) => flag.requiredPlan === planSlug
    );
}

/**
 * Check if a feature requires a higher plan
 */
export function requiresUpgrade(
    featureKey: string,
    currentPlan: string
): boolean {
    const flag = FEATURE_FLAGS[featureKey];
    if (!flag || !flag.requiredPlan) return false;

    const planHierarchy = ['trial', 'starter', 'growth', 'business'];
    const currentIdx = planHierarchy.indexOf(currentPlan);
    const requiredIdx = planHierarchy.indexOf(flag.requiredPlan);

    return currentIdx < requiredIdx;
}
