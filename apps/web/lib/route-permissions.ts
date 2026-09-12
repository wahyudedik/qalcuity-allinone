// ─── Route-to-Permission Mapping ──────────────────────────────────────────────
// Mapping dari API route path ke permission string.
// Digunakan oleh requirePermissionForRoute() helper di session.ts.
//
// Setiap API route path di-mapping ke permission yang sesuai.
// Permission string mengikuti format: "module:action" (e.g., "finance:view").
//
// Method-based action mapping:
//   GET    → module:view   (read operations)
//   POST   → module:create (create operations)
//   PUT/PATCH → module:edit (update operations)
//   DELETE → module:delete (delete operations)
//
// Routes dengan permission spesifik (e.g., "approval:approve") tidak di-mapping
// berdasarkan method — permission tetap digunakan apa adanya.
//
// fallbackRole digunakan jika permission engine tidak tersedia (backward compat).

export const ROUTE_PERMISSIONS: Record<string, { permission: string; method?: string; fallbackRole?: string }> = {
    // ─── Finance ──────────────────────────────────────────────────────────────
    '/api/finance/invoices': { permission: 'finance:view', fallbackRole: 'ADMIN' },
    '/api/finance/payments': { permission: 'finance:view', fallbackRole: 'ADMIN' },
    '/api/finance/quotations': { permission: 'finance:view', fallbackRole: 'ADMIN' },
    '/api/finance/purchase-orders': { permission: 'finance:view', fallbackRole: 'ADMIN' },
    '/api/finance/accounts': { permission: 'finance:view', fallbackRole: 'ADMIN' },
    '/api/finance/reconciliation': { permission: 'finance:view', fallbackRole: 'ADMIN' },
    '/api/finance/journal-entries': { permission: 'finance:view', fallbackRole: 'ADMIN' },
    '/api/finance/tax-rates': { permission: 'finance:view', fallbackRole: 'ADMIN' },
    '/api/finance/periods': { permission: 'finance:view', fallbackRole: 'ADMIN' },
    '/api/finance/recurring-invoices': { permission: 'finance:view', fallbackRole: 'ADMIN' },

    // ─── Finance Reports ──────────────────────────────────────────────────────
    '/api/finance/reports/balance-sheet': { permission: 'reports:view', fallbackRole: 'ADMIN' },
    '/api/finance/reports/income-statement': { permission: 'reports:view', fallbackRole: 'ADMIN' },
    '/api/finance/reports/trial-balance': { permission: 'reports:view', fallbackRole: 'ADMIN' },

    // ─── CRM ──────────────────────────────────────────────────────────────────
    '/api/crm/contacts': { permission: 'crm:view', fallbackRole: 'ADMIN' },
    '/api/crm/leads': { permission: 'crm:view', fallbackRole: 'ADMIN' },
    '/api/crm/deals': { permission: 'crm:view', fallbackRole: 'ADMIN' },
    '/api/crm/activities': { permission: 'crm:view', fallbackRole: 'ADMIN' },
    '/api/crm/pipeline': { permission: 'crm:view', fallbackRole: 'ADMIN' },

    // ─── HR ───────────────────────────────────────────────────────────────────
    '/api/hr/employees': { permission: 'hr:view', fallbackRole: 'ADMIN' },
    '/api/hr/attendance': { permission: 'hr:view', fallbackRole: 'ADMIN' },
    '/api/hr/leaves': { permission: 'hr:view', fallbackRole: 'ADMIN' },
    '/api/hr/payroll': { permission: 'hr:view', fallbackRole: 'ADMIN' },
    '/api/hr/departments': { permission: 'hr:view', fallbackRole: 'ADMIN' },
    '/api/hr/departments/[id]': { permission: 'hr:view', fallbackRole: 'ADMIN' },
    '/api/timesheet': { permission: 'hr:view', fallbackRole: 'MEMBER' },

    // ─── Inventory ────────────────────────────────────────────────────────────
    '/api/inventory/products': { permission: 'inventory:view', fallbackRole: 'ADMIN' },
    '/api/inventory/categories': { permission: 'inventory:view', fallbackRole: 'ADMIN' },
    '/api/inventory/suppliers': { permission: 'inventory:view', fallbackRole: 'ADMIN' },
    '/api/inventory/warehouses': { permission: 'inventory:view', fallbackRole: 'ADMIN' },
    '/api/inventory/warehouses/[id]': { permission: 'inventory:view', fallbackRole: 'ADMIN' },
    '/api/inventory/stock-opname': { permission: 'inventory:view', fallbackRole: 'ADMIN' },
    '/api/inventory/stock-opname/[id]': { permission: 'inventory:view', fallbackRole: 'ADMIN' },

    // ─── Approval Engine (CRITICAL) ───────────────────────────────────────────
    '/api/approval/levels': { permission: 'approval:view', fallbackRole: 'ADMIN' },
    '/api/approval/levels/[id]': { permission: 'approval:view', fallbackRole: 'ADMIN' },
    '/api/approval/requests': { permission: 'approval:view', fallbackRole: 'MEMBER' },
    '/api/approval/requests/[id]': { permission: 'approval:view', fallbackRole: 'MEMBER' },
    '/api/approval/requests/[id]/approve': { permission: 'approval:approve', fallbackRole: 'ADMIN' },
    '/api/approval/requests/[id]/reject': { permission: 'approval:reject', fallbackRole: 'ADMIN' },

    // ─── Workflow Engine (CRITICAL) ───────────────────────────────────────────
    '/api/workflow/definitions': { permission: 'workflow:view', fallbackRole: 'ADMIN' },
    '/api/workflow/definitions/[id]': { permission: 'workflow:view', fallbackRole: 'ADMIN' },
    '/api/workflow/transition': { permission: 'workflow:transition', fallbackRole: 'ADMIN' },
    '/api/workflow/history': { permission: 'workflow:view', fallbackRole: 'MEMBER' },

    // ─── POS Transactions (CRITICAL) ──────────────────────────────────────────
    '/api/pos/transactions': { permission: 'pos:view', fallbackRole: 'ADMIN' },
    '/api/pos/transactions/[id]': { permission: 'pos:view', fallbackRole: 'ADMIN' },
    '/api/pos/refunds': { permission: 'pos:view', fallbackRole: 'ADMIN' },
    '/api/pos/refunds/[id]': { permission: 'pos:view', fallbackRole: 'ADMIN' },
    '/api/pos/sessions': { permission: 'pos:view', fallbackRole: 'ADMIN' },
    '/api/pos/sessions/[id]': { permission: 'pos:view', fallbackRole: 'ADMIN' },

    // ─── POS Products & Terminals ─────────────────────────────────────────────
    '/api/pos/products': { permission: 'pos:view', fallbackRole: 'ADMIN' },
    '/api/pos/products/[id]': { permission: 'pos:view', fallbackRole: 'ADMIN' },
    '/api/pos/terminals': { permission: 'pos:view', fallbackRole: 'ADMIN' },
    '/api/pos/terminals/[id]': { permission: 'pos:view', fallbackRole: 'ADMIN' },
    '/api/pos/terminals/status': { permission: 'pos:view', fallbackRole: 'ADMIN' },

    // ─── POS Table Management ─────────────────────────────────────────────────
    '/api/pos/tables': { permission: 'pos:view', fallbackRole: 'ADMIN' },
    '/api/pos/tables/[id]': { permission: 'pos:view', fallbackRole: 'ADMIN' },
    '/api/pos/tables/[id]/status': { permission: 'pos:view', fallbackRole: 'ADMIN' },
    '/api/pos/tables/reservations': { permission: 'pos:view', fallbackRole: 'MEMBER' },
    '/api/pos/tables/reservations/[id]': { permission: 'pos:view', fallbackRole: 'MEMBER' },
    '/api/pos/tables/stats': { permission: 'pos:view', fallbackRole: 'MEMBER' },

    // ─── POS Loyalty Program ──────────────────────────────────────────────────
    '/api/pos/loyalty/members': { permission: 'pos:view', fallbackRole: 'ADMIN' },
    '/api/pos/loyalty/members/[id]': { permission: 'pos:view', fallbackRole: 'ADMIN' },
    '/api/pos/loyalty/members/[id]/transactions': { permission: 'pos:view', fallbackRole: 'ADMIN' },
    '/api/pos/loyalty/rewards': { permission: 'pos:view', fallbackRole: 'ADMIN' },
    '/api/pos/loyalty/rewards/[id]': { permission: 'pos:view', fallbackRole: 'ADMIN' },
    '/api/pos/loyalty/redeem': { permission: 'pos:view', fallbackRole: 'ADMIN' },

    // ─── POS Analytics ────────────────────────────────────────────────────────
    '/api/pos/analytics': { permission: 'analytics:view', fallbackRole: 'ADMIN' },
    '/api/pos/analytics/cashiers': { permission: 'analytics:view', fallbackRole: 'ADMIN' },
    '/api/pos/analytics/customers': { permission: 'analytics:view', fallbackRole: 'ADMIN' },
    '/api/pos/analytics/hours': { permission: 'analytics:view', fallbackRole: 'ADMIN' },
    '/api/pos/analytics/products': { permission: 'analytics:view', fallbackRole: 'ADMIN' },
    '/api/pos/analytics/sales': { permission: 'analytics:view', fallbackRole: 'ADMIN' },
    '/api/pos/analytics/summary': { permission: 'analytics:view', fallbackRole: 'ADMIN' },
    '/api/pos/dashboard': { permission: 'analytics:view', fallbackRole: 'ADMIN' },

    // ─── POS Kitchen Display ──────────────────────────────────────────────────
    '/api/pos/kitchen/orders': { permission: 'pos:view', fallbackRole: 'ADMIN' },
    '/api/pos/kitchen/orders/[id]': { permission: 'pos:view', fallbackRole: 'ADMIN' },
    '/api/pos/kitchen/stations': { permission: 'pos:view', fallbackRole: 'ADMIN' },
    '/api/pos/kitchen/stations/[id]': { permission: 'pos:view', fallbackRole: 'ADMIN' },
    '/api/pos/kitchen/stats': { permission: 'pos:view', fallbackRole: 'ADMIN' },

    // ─── Settings ─────────────────────────────────────────────────────────────
    '/api/settings/company': { permission: 'settings:view', fallbackRole: 'ADMIN' },
    '/api/settings/team': { permission: 'settings:view', fallbackRole: 'ADMIN' },
    '/api/settings/roles': { permission: 'settings:view', fallbackRole: 'SUPERADMIN' },
    '/api/settings/security': { permission: 'settings:view', fallbackRole: 'ADMIN' },
    '/api/settings/notifications': { permission: 'settings:view', fallbackRole: 'ADMIN' },
    '/api/settings/integrations': { permission: 'settings:view', fallbackRole: 'ADMIN' },
    '/api/settings/industry': { permission: 'settings:view', fallbackRole: 'ADMIN' },
    '/api/settings/custom-fields': { permission: 'settings:view', fallbackRole: 'ADMIN' },
    '/api/settings/profile': { permission: 'settings:view', fallbackRole: 'MEMBER' },

    // ─── Billing ──────────────────────────────────────────────────────────────
    '/api/billing/admin': { permission: 'billing:view', fallbackRole: 'SUPERADMIN' },
    '/api/billing/entitlement': { permission: 'billing:view', fallbackRole: 'ADMIN' },
    '/api/billing/feature-check': { permission: 'billing:view', fallbackRole: 'MEMBER' },
    '/api/billing/payments': { permission: 'billing:view', fallbackRole: 'ADMIN' },
    '/api/billing/plan': { permission: 'billing:view', fallbackRole: 'ADMIN' },
    '/api/billing/plans': { permission: 'billing:view', fallbackRole: 'MEMBER' },
    '/api/billing/subscription': { permission: 'billing:view', fallbackRole: 'ADMIN' },
    '/api/billing/usage': { permission: 'billing:view', fallbackRole: 'ADMIN' },
    '/api/billing/webhook': { permission: 'billing:view', fallbackRole: 'ADMIN' },

    // ─── Analytics Studio ──────────────────────────────────────────────────────
    '/api/analytics': { permission: 'analytics:view', fallbackRole: 'ADMIN' },
    '/api/analytics/alerts': { permission: 'analytics:view', fallbackRole: 'ADMIN' },
    '/api/analytics/alerts/[id]': { permission: 'analytics:view', fallbackRole: 'ADMIN' },
    '/api/analytics/alerts/triggers': { permission: 'analytics:view', fallbackRole: 'ADMIN' },
    '/api/analytics/alerts/triggers/[id]/acknowledge': { permission: 'analytics:edit', fallbackRole: 'ADMIN' },
    '/api/analytics/charts': { permission: 'analytics:view', fallbackRole: 'ADMIN' },
    '/api/analytics/charts/[id]': { permission: 'analytics:view', fallbackRole: 'ADMIN' },
    '/api/analytics/dashboard': { permission: 'analytics:view', fallbackRole: 'ADMIN' },
    '/api/analytics/dashboards': { permission: 'analytics:view', fallbackRole: 'ADMIN' },
    '/api/analytics/dashboards/[id]': { permission: 'analytics:view', fallbackRole: 'ADMIN' },
    '/api/analytics/dashboards/[id]/widgets': { permission: 'analytics:view', fallbackRole: 'ADMIN' },
    '/api/analytics/dictionary': { permission: 'analytics:view', fallbackRole: 'ADMIN' },
    '/api/analytics/explorer': { permission: 'analytics:view', fallbackRole: 'ADMIN' },
    '/api/analytics/kpi': { permission: 'analytics:view', fallbackRole: 'ADMIN' },
    '/api/analytics/kpi/[id]': { permission: 'analytics:view', fallbackRole: 'ADMIN' },
    '/api/analytics/kpi/[id]/evaluate': { permission: 'analytics:edit', fallbackRole: 'ADMIN' },
    '/api/analytics/metrics': { permission: 'analytics:view', fallbackRole: 'ADMIN' },
    '/api/analytics/query-history': { permission: 'analytics:view', fallbackRole: 'ADMIN' },
    '/api/analytics/reports': { permission: 'analytics:view', fallbackRole: 'ADMIN' },
    '/api/analytics/reports/[id]': { permission: 'analytics:view', fallbackRole: 'ADMIN' },
    '/api/analytics/reports/[id]/execute': { permission: 'analytics:view', fallbackRole: 'ADMIN' },
    '/api/analytics/scheduled': { permission: 'analytics:view', fallbackRole: 'ADMIN' },

    // ─── Reports ──────────────────────────────────────────────────────────────
    '/api/reports': { permission: 'reports:view', fallbackRole: 'ADMIN' },

    // ─── Audit ────────────────────────────────────────────────────────────────
    '/api/audit': { permission: 'audit:view', fallbackRole: 'ADMIN' },

    // ─── Dashboard ────────────────────────────────────────────────────────────
    '/api/dashboard/approvals': { permission: 'dashboard:view', fallbackRole: 'ADMIN' },
    '/api/dashboard/charts': { permission: 'dashboard:view', fallbackRole: 'ADMIN' },
    '/api/dashboard/kpi': { permission: 'dashboard:view', fallbackRole: 'ADMIN' },
    '/api/dashboard/recent-activity': { permission: 'dashboard:view', fallbackRole: 'ADMIN' },

    // ─── Operations Module ────────────────────────────────────────────────────
    '/api/projects': { permission: 'project:view', fallbackRole: 'MEMBER' },
    '/api/projects/[id]': { permission: 'project:view', fallbackRole: 'MEMBER' },
    '/api/projects/[id]/budget': { permission: 'project:view', fallbackRole: 'ADMIN' },
    '/api/projects/[id]/gantt': { permission: 'project:view', fallbackRole: 'MEMBER' },
    '/api/projects/[id]/members': { permission: 'project:view', fallbackRole: 'ADMIN' },
    '/api/projects/[id]/resources': { permission: 'project:view', fallbackRole: 'ADMIN' },
    '/api/tasks': { permission: 'operations:view', fallbackRole: 'ADMIN' },

    // ─── Field Service ────────────────────────────────────────────────────────
    '/api/field/jobs': { permission: 'operations:view', fallbackRole: 'ADMIN' },
    '/api/field/checklists': { permission: 'operations:view', fallbackRole: 'ADMIN' },

    // ─── Notifications & Upload ───────────────────────────────────────────────
    '/api/notifications': { permission: 'notification:view', fallbackRole: 'MEMBER' },
    '/api/upload': { permission: 'system:view', fallbackRole: 'MEMBER' },

    // ─── AI Features ──────────────────────────────────────────────────────────
    '/api/ai/query': { permission: 'ai:view', fallbackRole: 'MEMBER' },
    '/api/ai/chat': { permission: 'ai:view', fallbackRole: 'MEMBER' },
    '/api/ai/extract': { permission: 'ai:view', fallbackRole: 'MEMBER' },
    '/api/ai/extraction-history': { permission: 'ai:view', fallbackRole: 'MEMBER' },
    '/api/ai/anomalies': { permission: 'ai:view', fallbackRole: 'ADMIN' },
    '/api/ai/anomalies/scan': { permission: 'system:admin', fallbackRole: 'SUPERADMIN' },
    '/api/ai/anomalies/[id]': { permission: 'system:admin', fallbackRole: 'SUPERADMIN' },
    '/api/ai/health': { permission: 'ai:view', fallbackRole: 'MEMBER' },

    // ─── CRM Emails ──────────────────────────────────────────────────────────
    '/api/crm/emails': { permission: 'crm:view', fallbackRole: 'ADMIN' },

    // ─── Admin ────────────────────────────────────────────────────────────────
    '/api/admin/plans': { permission: 'platform:view', fallbackRole: 'SUPERADMIN' },
    '/api/admin/seed-workflows': { permission: 'system:admin', fallbackRole: 'SUPERADMIN' },
    '/api/admin/rate-limits': { permission: 'system:admin', fallbackRole: 'SUPERADMIN' },

    // ─── Platform Admin ───────────────────────────────────────────────────────
    '/api/platform/tenants': { permission: 'platform:view', fallbackRole: 'SUPERADMIN' },
    '/api/platform/stats': { permission: 'platform:view', fallbackRole: 'SUPERADMIN' },
    '/api/platform/monitoring': { permission: 'platform:view', fallbackRole: 'SUPERADMIN' },
    '/api/platform/settings': { permission: 'platform:view', fallbackRole: 'SUPERADMIN' },
    '/api/platform/plans': { permission: 'platform:view', fallbackRole: 'SUPERADMIN' },
    '/api/platform/billing': { permission: 'platform:view', fallbackRole: 'SUPERADMIN' },
    '/api/platform/support': { permission: 'platform:view', fallbackRole: 'SUPERADMIN' },
    '/api/platform/security': { permission: 'platform:view', fallbackRole: 'SUPERADMIN' },

    // ─── Cron Endpoints (CRON_SECRET auth, blocked for regular users) ─────────
    '/api/cron/run': { permission: 'system:admin', fallbackRole: 'SUPERADMIN' },
    '/api/cron/payment-reminder': { permission: 'system:admin', fallbackRole: 'SUPERADMIN' },
    '/api/cron/stock-alert': { permission: 'system:admin', fallbackRole: 'SUPERADMIN' },
    '/api/cron/recurring-invoice': { permission: 'system:admin', fallbackRole: 'SUPERADMIN' },
};

// ─── Routes that intentionally have NO permission entry ───────────────────────
// These routes are handled by other auth mechanisms and do NOT need entries:
//
// SKIPPED in requirePermissionForRoute() (apps/web/lib/session.ts):
//   - /api/auth/*          — NextAuth handler (login, register, forgot-password, etc.)
//   - /api/mobile/*        — Mobile JWT auth (separate auth mechanism)
//   - /api/health          — Public health check endpoint
//   - /api/search          — Global search (explicitly skipped)
//   - /api/demo/load       — Demo data loading (explicitly skipped)
//   - /api/dashboard/stats — Dashboard stats (explicitly skipped)
//
// PUBLIC routes (in PUBLIC_API_PATHS middleware bypass):
//   - /api/billing/payments/midtrans/callback — Midtrans webhook (HMAC signature verification)
//
// COVERED by prefix matching (getPermissionForRoute()):
//   - All /api/crm/contacts/*     → covered by /api/crm/contacts
//   - All /api/crm/leads/*        → covered by /api/crm/leads
//   - All /api/crm/deals/*        → covered by /api/crm/deals
//   - All /api/crm/activities/*   → covered by /api/crm/activities
//   - All /api/ai/anomalies/*     → covered by /api/ai/anomalies (except /scan and /[id] which have explicit entries)
//   - All /api/settings/* sub-routes → covered by parent prefixes
//   - All /api/billing/* sub-routes → covered by parent prefixes
//   - All /api/finance/* sub-routes → covered by parent prefixes
//   - All /api/pos/* sub-routes → covered by parent prefixes
//   - All /api/platform/* sub-routes → covered by parent prefixes
//   - All /api/projects/* sub-routes → covered by /api/projects
//   - All /api/tasks/* sub-routes → covered by /api/tasks
//   - All /api/field/* sub-routes → covered by parent prefixes
//   - /api/analytics/* sub-routes → now have EXPLICIT entries (permission guard fix)
//   - All /api/audit/* sub-routes → covered by /api/audit

// ─── Permissions that don't exist in the permission engine ────────────────────
// Modules: billing, pos, approval, workflow, dashboard, project, operations,
//          notification, system, ai, platform
//
// These modules are NOT defined in @qalcuity/permissions PERMISSIONS constant.
// For these modules, the permission engine check will ALWAYS fail (returns false),
// and the system falls back to role hierarchy check (fallbackRole).
//
// This is INTENTIONAL — these modules use role-based access control exclusively.
// Only the following modules have granular permission support in the engine:
//   finance, crm, hr, inventory, settings, reports, analytics, audit

// ─── Permission Modules with Granular Access ──────────────────────────────────
// These modules ARE defined in the permission engine with module:action format:
//
//   finance:    view, create, edit, delete, approve
//   crm:        view, create, edit, delete, import
//   hr:         view, create, edit, delete, approve
//   inventory:  view, create, edit, delete
//   settings:   view, edit, team, billing
//   reports:    view, create
//   analytics:  view, edit
//   audit:      view
//
// For these modules, the permission engine provides granular access control.
// Custom roles can be assigned specific permissions within these modules.

// ─── Method-based Action Mapping ──────────────────────────────────────────────
// Maps HTTP method to permission action for routes with base permission "module:view".
// Routes with specific permissions (e.g., "approval:approve") bypass this mapping.

const METHOD_ACTION_MAP: Record<string, string> = {
    'GET': 'view',
    'POST': 'create',
    'PUT': 'edit',
    'PATCH': 'edit',
    'DELETE': 'delete',
};

// Permissions that have specific actions (not auto-mapped by method)
const SPECIFIC_ACTIONS = new Set([
    'approve', 'reject', 'transition', 'import', 'team', 'billing',
    'admin', 'read', 'write',
]);

/**
 * Resolve permission berdasarkan HTTP method.
 * Jika permission adalah "module:view", upgrade ke "module:action" berdasarkan method.
 * Jika permission sudah spesifik (e.g., "approval:approve"), keep as-is.
 *
 * @param basePermission - Permission dari route config (e.g., "finance:view")
 * @param method - HTTP method (GET, POST, PUT, PATCH, DELETE)
 * @returns Resolved permission string
 */
function resolvePermissionByMethod(basePermission: string, method: string): string {
    const parts = basePermission.split(':');
    if (parts.length !== 2) return basePermission;

    const [module, action] = parts;

    // If action is already specific (not 'view'), keep it as-is
    if (action !== 'view' && SPECIFIC_ACTIONS.has(action)) {
        return basePermission;
    }

    // If action is 'view', upgrade based on HTTP method
    if (action === 'view') {
        const resolvedAction = METHOD_ACTION_MAP[method] || 'view';
        return `${module}:${resolvedAction}`;
    }

    return basePermission;
}

/**
 * Dapatkan permission config untuk route tertentu.
 * Mendukung exact match dan prefix match
 * (e.g., /api/finance/invoices/123 → /api/finance/invoices).
 *
 * Permission di-resolve berdasarkan HTTP method:
 * - GET    → module:view
 * - POST   → module:create
 * - PUT/PATCH → module:edit
 * - DELETE → module:delete
 *
 * Routes dengan permission spesifik (e.g., "approval:approve") tidak di-mapping
 * berdasarkan method — permission tetap digunakan apa adanya.
 *
 * @param pathname - URL path dari request
 * @param method - HTTP method (GET, POST, PUT, PATCH, DELETE)
 * @returns Permission config atau null jika tidak ditemukan
 */
export function getPermissionForRoute(
    pathname: string,
    method: string
): { permission: string; fallbackRole: string } | null {
    // Exact match
    if (ROUTE_PERMISSIONS[pathname]) {
        const config = ROUTE_PERMISSIONS[pathname];
        const resolvedPermission = resolvePermissionByMethod(config.permission, method);
        return {
            permission: resolvedPermission,
            fallbackRole: config.fallbackRole || 'ADMIN',
        };
    }

    // Prefix match (e.g., /api/finance/invoices/123 → /api/finance/invoices)
    // Sort by longest prefix first to avoid partial matches
    const sortedPrefixes = Object.keys(ROUTE_PERMISSIONS).sort(
        (a, b) => b.length - a.length
    );

    for (const prefix of sortedPrefixes) {
        if (pathname.startsWith(prefix + '/') || pathname.startsWith(prefix + '?')) {
            const config = ROUTE_PERMISSIONS[prefix];
            const resolvedPermission = resolvePermissionByMethod(config.permission, method);
            return {
                permission: resolvedPermission,
                fallbackRole: config.fallbackRole || 'ADMIN',
            };
        }
    }

    return null;
}
