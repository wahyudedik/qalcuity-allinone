// ─── Route-to-Permission Mapping ──────────────────────────────────────────────
// Mapping dari API route path ke permission string.
// Digunakan oleh requirePermissionOrRole() helper di session.ts.
//
// Setiap API route path di-mapping ke permission yang sesuai.
// Permission string mengikuti format: "module.entity" (e.g., "finance.invoice").
// fallbackRole digunakan jika permission engine tidak tersedia (backward compat).

export const ROUTE_PERMISSIONS: Record<string, { permission: string; method?: string; fallbackRole?: string }> = {
    // ─── Finance ──────────────────────────────────────────────────────────────
    '/api/finance/invoices': { permission: 'finance.invoice', fallbackRole: 'ADMIN' },
    '/api/finance/payments': { permission: 'finance.payment', fallbackRole: 'ADMIN' },
    '/api/finance/quotations': { permission: 'finance.quotation', fallbackRole: 'ADMIN' },
    '/api/finance/purchase-orders': { permission: 'finance.purchase_order', fallbackRole: 'ADMIN' },
    '/api/finance/accounts': { permission: 'finance.account', fallbackRole: 'ADMIN' },
    '/api/finance/reconciliation': { permission: 'finance.reconciliation', fallbackRole: 'ADMIN' },
    '/api/finance/journal-entries': { permission: 'finance.journal_entry', fallbackRole: 'ADMIN' },
    '/api/finance/tax-rates': { permission: 'finance.tax_rate', fallbackRole: 'ADMIN' },
    '/api/finance/periods': { permission: 'finance.period', fallbackRole: 'ADMIN' },
    '/api/finance/recurring-invoices': { permission: 'finance.invoice', fallbackRole: 'ADMIN' },

    // ─── Finance Reports ──────────────────────────────────────────────────────
    '/api/finance/reports/balance-sheet': { permission: 'finance.report', fallbackRole: 'ADMIN' },
    '/api/finance/reports/income-statement': { permission: 'finance.report', fallbackRole: 'ADMIN' },
    '/api/finance/reports/trial-balance': { permission: 'finance.report', fallbackRole: 'ADMIN' },

    // ─── CRM ──────────────────────────────────────────────────────────────────
    '/api/crm/contacts': { permission: 'crm.contact', fallbackRole: 'ADMIN' },
    '/api/crm/leads': { permission: 'crm.lead', fallbackRole: 'ADMIN' },
    '/api/crm/deals': { permission: 'crm.deal', fallbackRole: 'ADMIN' },

    // ─── HR ───────────────────────────────────────────────────────────────────
    '/api/hr/employees': { permission: 'hr.employee', fallbackRole: 'ADMIN' },
    '/api/hr/attendance': { permission: 'hr.attendance', fallbackRole: 'ADMIN' },
    '/api/hr/leaves': { permission: 'hr.leave', fallbackRole: 'ADMIN' },
    '/api/hr/payroll': { permission: 'hr.payroll', fallbackRole: 'ADMIN' },

    // ─── Inventory ────────────────────────────────────────────────────────────
    '/api/inventory/products': { permission: 'inventory.product', fallbackRole: 'ADMIN' },
    '/api/inventory/categories': { permission: 'inventory.category', fallbackRole: 'ADMIN' },
    '/api/inventory/suppliers': { permission: 'inventory.supplier', fallbackRole: 'ADMIN' },

    // ─── Settings ─────────────────────────────────────────────────────────────
    '/api/settings/company': { permission: 'settings.company', fallbackRole: 'ADMIN' },
    '/api/settings/team': { permission: 'settings.team', fallbackRole: 'ADMIN' },
    '/api/settings/roles': { permission: 'settings.roles', fallbackRole: 'SUPERADMIN' },
    '/api/settings/security': { permission: 'settings.security', fallbackRole: 'ADMIN' },
    '/api/settings/notifications': { permission: 'settings.notifications', fallbackRole: 'ADMIN' },
    '/api/settings/integrations': { permission: 'settings.integrations', fallbackRole: 'ADMIN' },
    '/api/settings/industry': { permission: 'settings.industry', fallbackRole: 'ADMIN' },
    '/api/settings/custom-fields': { permission: 'settings.custom_fields', fallbackRole: 'ADMIN' },
    '/api/settings/profile': { permission: 'settings.profile', fallbackRole: 'MEMBER' },

    // ─── Billing ──────────────────────────────────────────────────────────────
    '/api/billing/admin': { permission: 'billing.admin', fallbackRole: 'SUPERADMIN' },
    '/api/billing/entitlement': { permission: 'billing.entitlement', fallbackRole: 'ADMIN' },
    '/api/billing/feature-check': { permission: 'billing.feature_check', fallbackRole: 'MEMBER' },
    '/api/billing/payments': { permission: 'billing.payment', fallbackRole: 'ADMIN' },
    '/api/billing/plan': { permission: 'billing.plan', fallbackRole: 'ADMIN' },
    '/api/billing/plans': { permission: 'billing.plan', fallbackRole: 'MEMBER' },
    '/api/billing/subscription': { permission: 'billing.subscription', fallbackRole: 'ADMIN' },
    '/api/billing/usage': { permission: 'billing.usage', fallbackRole: 'ADMIN' },
    '/api/billing/webhook': { permission: 'billing.webhook', fallbackRole: 'ADMIN' },

    // ─── Analytics ────────────────────────────────────────────────────────────
    '/api/analytics': { permission: 'analytics.read', fallbackRole: 'ADMIN' },

    // ─── Reports ──────────────────────────────────────────────────────────────
    '/api/reports': { permission: 'reports.read', fallbackRole: 'ADMIN' },

    // ─── Audit ────────────────────────────────────────────────────────────────
    '/api/audit': { permission: 'audit.read', fallbackRole: 'ADMIN' },

    // ─── POS Analytics ─────────────────────────────────────────────────────
    '/api/pos/analytics/sales': { permission: 'pos.analytics', fallbackRole: 'ADMIN' },
    '/api/pos/analytics/products': { permission: 'pos.analytics', fallbackRole: 'ADMIN' },
    '/api/pos/analytics/hours': { permission: 'pos.analytics', fallbackRole: 'ADMIN' },
    '/api/pos/analytics/customers': { permission: 'pos.analytics', fallbackRole: 'ADMIN' },

    // ─── POS Kitchen Display ─────────────────────────────────────────────────
    '/api/pos/kitchen/orders': { permission: 'pos.kitchen_order', fallbackRole: 'ADMIN' },
    '/api/pos/kitchen/stations': { permission: 'pos.kitchen_station', fallbackRole: 'ADMIN' },
    '/api/pos/kitchen/stats': { permission: 'pos.kitchen_order', fallbackRole: 'ADMIN' },

    // ─── POS Table Management ──────────────────────────────────────────────
    '/api/pos/tables': { permission: 'pos.table', fallbackRole: 'ADMIN' },
    '/api/pos/tables/reservations': { permission: 'pos.table', fallbackRole: 'ADMIN' },
    '/api/pos/tables/stats': { permission: 'pos.table', fallbackRole: 'ADMIN' },

    // ─── Operations Module ─────────────────────────────────────────────────
    '/api/projects': { permission: 'operations.project', fallbackRole: 'ADMIN' },
    '/api/tasks': { permission: 'operations.task', fallbackRole: 'ADMIN' },
    '/api/timesheet': { permission: 'operations.timesheet', fallbackRole: 'MEMBER' },

    // ─── Field Service ─────────────────────────────────────────────────────
    '/api/field/jobs': { permission: 'operations.field_job', fallbackRole: 'ADMIN' },
    '/api/field/checklists': { permission: 'operations.field_checklist', fallbackRole: 'ADMIN' },

    // ─── AI Features ───────────────────────────────────────────────────────
    '/api/ai/query': { permission: 'ai.query', fallbackRole: 'MEMBER' },
    '/api/ai/chat': { permission: 'ai.query', fallbackRole: 'MEMBER' },
    '/api/ai/extract': { permission: 'ai.extract', fallbackRole: 'MEMBER' },
    '/api/ai/extraction-history': { permission: 'ai.extract', fallbackRole: 'MEMBER' },
    '/api/ai/anomalies': { permission: 'ai.anomaly', fallbackRole: 'ADMIN' },
    '/api/ai/health': { permission: 'ai.read', fallbackRole: 'MEMBER' },

    // ─── Admin Plans (SUPERADMIN) ───────────────────────────────────────
    '/api/admin/plans': { permission: 'platform.plan', fallbackRole: 'SUPERADMIN' },

    // ─── Platform Admin ──────────────────────────────────────────────────
    '/api/platform/tenants': { permission: 'platform.tenant', fallbackRole: 'SUPERADMIN' },
    '/api/platform/stats': { permission: 'platform.stats', fallbackRole: 'SUPERADMIN' },
    '/api/platform/monitoring': { permission: 'platform.monitoring', fallbackRole: 'SUPERADMIN' },
    '/api/platform/settings': { permission: 'platform.settings', fallbackRole: 'SUPERADMIN' },
    '/api/platform/plans': { permission: 'platform.plan', fallbackRole: 'SUPERADMIN' },
    '/api/platform/billing': { permission: 'platform.billing', fallbackRole: 'SUPERADMIN' },
    '/api/platform/support': { permission: 'platform.support', fallbackRole: 'SUPERADMIN' },
    '/api/platform/security': { permission: 'platform.security', fallbackRole: 'SUPERADMIN' },

    // ─── Cron Endpoints (CRON_SECRET auth, blocked for regular users) ──────
    '/api/cron/payment-reminder': { permission: 'system.admin', fallbackRole: 'SUPERADMIN' },
    '/api/cron/stock-alert': { permission: 'system.admin', fallbackRole: 'SUPERADMIN' },
    '/api/cron/recurring-invoice': { permission: 'system.admin', fallbackRole: 'SUPERADMIN' },
    '/api/ai/anomalies/scan': { permission: 'system.admin', fallbackRole: 'SUPERADMIN' },
    '/api/ai/anomalies/[id]': { permission: 'system.admin', fallbackRole: 'SUPERADMIN' },
};

/**
 * Dapatkan permission config untuk route tertentu.
 * Mendukung exact match dan prefix match
 * (e.g., /api/finance/invoices/123 → /api/finance/invoices).
 *
 * @param pathname - URL path dari request
 * @param method - HTTP method (GET, POST, PUT, DELETE)
 * @returns Permission config atau null jika tidak ditemukan
 */
export function getPermissionForRoute(
    pathname: string,
    _method: string
): { permission: string; fallbackRole: string } | null {
    // Exact match
    if (ROUTE_PERMISSIONS[pathname]) {
        return {
            permission: ROUTE_PERMISSIONS[pathname].permission,
            fallbackRole: ROUTE_PERMISSIONS[pathname].fallbackRole || 'ADMIN',
        };
    }

    // Prefix match (e.g., /api/finance/invoices/123 → /api/finance/invoices)
    // Sort by longest prefix first to avoid partial matches
    const sortedPrefixes = Object.keys(ROUTE_PERMISSIONS).sort(
        (a, b) => b.length - a.length
    );

    for (const prefix of sortedPrefixes) {
        if (pathname.startsWith(prefix + '/') || pathname.startsWith(prefix + '?')) {
            return {
                permission: ROUTE_PERMISSIONS[prefix].permission,
                fallbackRole: ROUTE_PERMISSIONS[prefix].fallbackRole || 'ADMIN',
            };
        }
    }

    return null;
}
