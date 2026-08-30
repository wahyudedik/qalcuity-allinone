// ============================================
// @qalcuity/config
// Shared configuration, constants, and feature flags
// ============================================

// Constants
export {
    ROLES,
    ROLE_LABELS,
    ROLE_DESCRIPTIONS,
    INVOICE_STATUSES,
    INVOICE_STATUS_LABELS,
    QUOTATION_STATUSES,
    QUOTATION_STATUS_LABELS,
    PURCHASE_ORDER_STATUSES,
    PURCHASE_ORDER_STATUS_LABELS,
    PAYMENT_STATUSES,
    PAYMENT_STATUS_LABELS,
    PAYMENT_METHODS,
    PAYMENT_METHOD_LABELS,
    LEAD_STATUSES,
    LEAD_STATUS_LABELS,
    DEAL_STAGES,
    DEAL_STAGE_LABELS,
    EMPLOYEE_STATUSES,
    EMPLOYEE_STATUS_LABELS,
    LEAVE_TYPES,
    LEAVE_TYPE_LABELS,
    LEAVE_REQUEST_STATUSES,
    LEAVE_REQUEST_STATUS_LABELS,
    PAYROLL_STATUSES,
    PAYROLL_STATUS_LABELS,
    ATTENDANCE_STATUSES,
    ATTENDANCE_STATUS_LABELS,
    CONTACT_TYPES,
    CONTACT_TYPE_LABELS,
    SUBSCRIPTION_STATUSES,
    SUBSCRIPTION_STATUS_LABELS,
    BILLING_PAYMENT_STATUSES,
    BILLING_PAYMENT_STATUS_LABELS,
    LIMITS,
    CURRENCIES,
    TAX_RATES,
    DATE_FORMATS,
    TIMEZONES,
    TIMEZONE_LABELS,
    LANGUAGES,
    LANGUAGE_LABELS,
    ACCOUNT_TYPES,
    ACCOUNT_TYPE_LABELS,
    STOCK_MOVEMENT_TYPES,
    STOCK_MOVEMENT_TYPE_LABELS,
} from './constants';

// Environment
export {
    getEnv,
    getOptionalEnv,
    getEnvNumber,
    getEnvBoolean,
    isDevelopment,
    isProduction,
    isTest,
    getNodeEnv,
    validateRequiredEnv,
    validateAppEnv,
    getDatabaseUrl,
    getNextAuthConfig,
    getSmtpConfig,
    getPaymentConfig,
} from './env';

// Feature Flags
export {
    FEATURE_FLAGS,
    isFeatureEnabled,
    getEnabledFeatures,
    getPlanRequiredFeatures,
    requiresUpgrade,
} from './features';

// Types
export type { FeatureFlag } from './features';
export type { EnvConfig } from './env';
