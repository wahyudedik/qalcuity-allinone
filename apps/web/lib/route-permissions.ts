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

    // ─── Analytics ────────────────────────────────────────────────────────────
    '/api/analytics': { permission: 'analytics.read', fallbackRole: 'ADMIN' },

    // ─── Reports ──────────────────────────────────────────────────────────────
    '/api/reports': { permission: 'reports.read', fallbackRole: 'ADMIN' },

    // ─── Audit ────────────────────────────────────────────────────────────────
    '/api/audit': { permission: 'audit.read', fallbackRole: 'ADMIN' },
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
