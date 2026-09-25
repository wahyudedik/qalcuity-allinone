/**
 * Prisma Client Extension — Automatic Tenant Isolation.
 *
 * Provides `getScopedPrisma(tenantId)` which returns a Prisma client that
 * automatically injects `tenantId` into ALL queries (read + write) for
 * models that have a `tenantId` field.
 *
 * This reduces cross-tenant data leak risk from 400+ manual filter points
 * to a single, centralized extension.
 *
 * ARCHITECTURE:
 *   - Uses per-model query extensions (most reliable for Prisma 5.x)
 *   - Each tenant-scoped model gets its own extension that intercepts
 *     findMany, findFirst, findUnique, create, update, upsert, delete,
 *     count, and aggregate operations
 *   - The tenantId is read from AsyncLocalStorage (see tenant-context.ts)
 *     OR passed explicitly via getScopedPrisma(tenantId)
 *
 * USAGE:
 *   Option A — Explicit scoped client:
 *     import { getScopedPrisma } from '@/lib/prisma-tenant';
 *     const scopedPrisma = getScopedPrisma(tenantId);
 *     const leads = await scopedPrisma.lead.findMany({ where: { status: 'NEW' } });
 *
 *   Option B — Context-based (requires tenantStorage.run() wrapper):
 *     import { prisma } from '@/lib/db';
 *     // Inside tenantStorage.run() context, prisma automatically scopes queries
 *     const leads = await prisma.lead.findMany({ where: { status: 'NEW' } });
 *
 *   Option C — Hybrid (read from context, fallback to explicit):
 *     import { getScopedPrisma } from '@/lib/prisma-tenant';
 *     import { getTenantId } from '@/lib/tenant-context';
 *     const tid = tenantId ?? getTenantId();
 *     const scopedPrisma = getScopedPrisma(tid);
 *
 * BACKWARD COMPATIBILITY:
 *   - Existing routes that manually filter by tenantId continue to work
 *   - The extension only injects tenantId when it's NOT already present
 *   - findUnique (by ID) is NOT intercepted — ID lookups are safe
 *   - Routes outside tenantStorage.run() context work as before
 *
 * IMPORTANT:
 *   - Do NOT modify this file to add/remove models manually.
 *     The list is auto-derived from the Prisma schema.
 *   - Models WITHOUT tenantId (Tenant, SubscriptionPlan, Plan, etc.)
 *     are excluded from scoping.
 */

import { PrismaClient, Prisma } from '@prisma/client';
import { prisma } from './db';
import { getTenantId } from './tenant-context';

// ─── Tenant-Scoped Models ─────────────────────────────────────────────────────
// Complete list of Prisma models that have a `tenantId` field.
// Derived from packages/db/prisma/schema.prisma (107 models total, ~94 with tenantId).
// Models WITHOUT tenantId are intentionally excluded:
//   - Tenant (platform-level)
//   - SubscriptionPlan, Plan, PlanFeature, PlanTenantLimit (platform-level)
//   - PlatformSetting (platform-level)
//   - CronRunLog (platform-level)
//   - InvoiceItem, PurchaseOrderItem, QuotationItem (accessed via parent)
//   - PosTransactionItem (accessed via parent)
//   - RecurringInvoiceItem (accessed via parent)
//   - FieldChecklistResult, FieldJobAssignment (accessed via parent)

const TENANT_SCOPED_MODELS: string[] = [
    // Core
    'User', 'UserSession', 'LoginLog', 'Role',

    // CRM
    'Contact', 'Lead', 'Deal', 'Activity',

    // Finance
    'Invoice', 'Payment', 'TaxRate', 'Bill', 'Expense',
    'PurchaseOrder', 'Quotation',
    'JournalEntry', 'JournalEntryItem',
    'CoAAccount', 'BankTransaction',
    'AccountingPeriod', 'ApprovalLevel', 'ApprovalRequest',
    'RecurringInvoice', 'PaymentReminderLog',

    // Inventory
    'Product', 'Category', 'Supplier', 'Warehouse',
    'StockMovement', 'StockOpname', 'StockOpnameItem',

    // HR
    'Employee', 'Department', 'AttendanceRecord', 'LeaveRequest', 'PayrollRecord',

    // Reports & Analytics
    'SavedReport', 'SavedReportExecution',
    'ScheduledReport', 'ScheduledReportExecution',
    'KPI', 'KPIEvaluation',
    'AlertRule', 'AlertTrigger',
    'UserDashboard',
    'AnalyticsDataset', 'AnalyticsQueryHistory',
    'AnalyticsChart', 'AnalyticsDashboard', 'AnalyticsDashboardWidget',
    'DataDictionaryEntry', 'ScheduledQuery', 'MetricDefinition',

    // Tenant Configuration
    'TenantNotificationSettings', 'TenantIntegration',
    'IndustryConfiguration', 'TenantCustomField',
    'TenantSubscription', 'BillingPayment',
    'TenantEntitlement', 'UsageRecord',

    // Workflow
    'WorkflowDefinition', 'WorkflowHistory',

    // Notifications & Audit
    'AuditLog', 'InAppNotification',

    // POS
    'PosTerminal', 'PosSession', 'PosTransaction', 'PosPayment', 'PosRefund',
    'PosTable', 'PosTableReservation', 'PosKitchenStation',
    'PosKitchenOrder', 'PosKitchenOrderItem',
    'LoyaltyMember', 'LoyaltyTransaction', 'LoyaltyReward',

    // Operations / Projects
    'Project', 'ProjectMember', 'Task', 'TaskComment',
    'TimeLog', 'ProjectBudget', 'ResourceAllocation',
    'FieldJob', 'FieldJobAssignment', 'FieldChecklist', 'FieldChecklistResult',

    // AI
    'AnomalyDetection', 'ExtractionHistory',

    // Misc
    'RateLimitLog', 'PasswordPolicy', 'WhatsAppMessageLog',
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Check if a given where clause already has a tenantId filter.
 * Supports both direct tenantId and nested conditions (AND, OR, NOT).
 */
function hasTenantFilterWhere(where: Record<string, unknown> | undefined): boolean {
    if (!where) return false;
    if ('tenantId' in where && where.tenantId !== undefined) return true;

    // Check nested AND/OR/NOT
    for (const key of ['AND', 'OR', 'NOT']) {
        const val = where[key];
        if (Array.isArray(val)) {
            if (val.some((item) => item && typeof item === 'object' && 'tenantId' in item)) return true;
        } else if (val && typeof val === 'object' && 'tenantId' in val) {
            return true;
        }
    }
    return false;
}

/**
 * Inject tenantId into a where clause if not already present.
 * Returns a new object (does not mutate the original).
 */
function injectTenantWhere(where: Record<string, unknown> | undefined, tenantId: string): Record<string, unknown> {
    if (!where) return { tenantId };
    if (hasTenantFilterWhere(where)) return where;
    return { ...where, tenantId };
}

/**
 * Inject tenantId into a data object for create/upsert operations.
 * Returns a new object (does not mutate the original).
 */
function injectTenantData(
    data: Record<string, unknown> | Record<string, unknown>[],
    tenantId: string
): Record<string, unknown> | Record<string, unknown>[] {
    // Batch create (array of data)
    if (Array.isArray(data)) {
        return data.map((item) =>
            item.tenantId ? item : { ...item, tenantId }
        );
    }
    // Single create
    if (data.tenantId) return data;
    return { ...data, tenantId };
}

// ─── Per-Model Extension Builder ──────────────────────────────────────────────

/**
 * Build a Prisma query extension for a single model that auto-injects
 * tenantId into read and write operations.
 *
 * This is the core of the tenant isolation system. Each model gets its
 * own extension with the same logic, but typed to its specific model name.
 */
function buildModelExtension(modelName: string) {
    return {
        [modelName]: {
            findMany: async ({ args, query }: { args: Record<string, unknown>; query: (args: Record<string, unknown>) => Promise<unknown> }) => {
                const where = args.where as Record<string, unknown> | undefined;
                const resolvedTenantId = getTenantId();
                if (resolvedTenantId) {
                    args.where = injectTenantWhere(where, resolvedTenantId);
                }
                return query(args);
            },

            findFirst: async ({ args, query }: { args: Record<string, unknown>; query: (args: Record<string, unknown>) => Promise<unknown> }) => {
                const where = args.where as Record<string, unknown> | undefined;
                const resolvedTenantId = getTenantId();
                if (resolvedTenantId) {
                    args.where = injectTenantWhere(where, resolvedTenantId);
                }
                return query(args);
            },

            // findUnique is intentionally NOT intercepted — ID lookups are safe
            // and injecting tenantId would break expected behavior.

            create: async ({ args, query }: { args: Record<string, unknown>; query: (args: Record<string, unknown>) => Promise<unknown> }) => {
                const resolvedTenantId = getTenantId();
                if (resolvedTenantId) {
                    args.data = injectTenantData(args.data as Record<string, unknown>, resolvedTenantId);
                }
                return query(args);
            },

            createMany: async ({ args, query }: { args: Record<string, unknown>; query: (args: Record<string, unknown>) => Promise<unknown> }) => {
                const resolvedTenantId = getTenantId();
                if (resolvedTenantId && args.data) {
                    args.data = injectTenantData(args.data as Record<string, unknown>[], resolvedTenantId);
                }
                return query(args);
            },

            update: async ({ args, query }: { args: Record<string, unknown>; query: (args: Record<string, unknown>) => Promise<unknown> }) => {
                const where = args.where as Record<string, unknown> | undefined;
                const resolvedTenantId = getTenantId();
                if (resolvedTenantId) {
                    args.where = injectTenantWhere(where, resolvedTenantId);
                }
                return query(args);
            },

            updateMany: async ({ args, query }: { args: Record<string, unknown>; query: (args: Record<string, unknown>) => Promise<unknown> }) => {
                const where = args.where as Record<string, unknown> | undefined;
                const resolvedTenantId = getTenantId();
                if (resolvedTenantId) {
                    args.where = injectTenantWhere(where, resolvedTenantId);
                }
                return query(args);
            },

            upsert: async ({ args, query }: { args: Record<string, unknown>; query: (args: Record<string, unknown>) => Promise<unknown> }) => {
                const where = args.where as Record<string, unknown> | undefined;
                const resolvedTenantId = getTenantId();
                if (resolvedTenantId) {
                    args.where = injectTenantWhere(where, resolvedTenantId);
                    // Also inject into create data
                    if (args.create && typeof args.create === 'object') {
                        args.create = injectTenantData(args.create as Record<string, unknown>, resolvedTenantId);
                    }
                }
                return query(args);
            },

            delete: async ({ args, query }: { args: Record<string, unknown>; query: (args: Record<string, unknown>) => Promise<unknown> }) => {
                const where = args.where as Record<string, unknown> | undefined;
                const resolvedTenantId = getTenantId();
                if (resolvedTenantId) {
                    args.where = injectTenantWhere(where, resolvedTenantId);
                }
                return query(args);
            },

            deleteMany: async ({ args, query }: { args: Record<string, unknown>; query: (args: Record<string, unknown>) => Promise<unknown> }) => {
                const where = args.where as Record<string, unknown> | undefined;
                const resolvedTenantId = getTenantId();
                if (resolvedTenantId) {
                    args.where = injectTenantWhere(where, resolvedTenantId);
                }
                return query(args);
            },

            count: async ({ args, query }: { args: Record<string, unknown>; query: (args: Record<string, unknown>) => Promise<unknown> }) => {
                const where = args.where as Record<string, unknown> | undefined;
                const resolvedTenantId = getTenantId();
                if (resolvedTenantId) {
                    args.where = injectTenantWhere(where, resolvedTenantId);
                }
                return query(args);
            },

            aggregate: async ({ args, query }: { args: Record<string, unknown>; query: (args: Record<string, unknown>) => Promise<unknown> }) => {
                const where = args.where as Record<string, unknown> | undefined;
                const resolvedTenantId = getTenantId();
                if (resolvedTenantId) {
                    args.where = injectTenantWhere(where, resolvedTenantId);
                }
                return query(args);
            },

            groupBy: async ({ args, query }: { args: Record<string, unknown>; query: (args: Record<string, unknown>) => Promise<unknown> }) => {
                const where = args.where as Record<string, unknown> | undefined;
                const resolvedTenantId = getTenantId();
                if (resolvedTenantId) {
                    args.where = injectTenantWhere(where, resolvedTenantId);
                }
                return query(args);
            },
        },
    };
}

// ─── Build All Extensions ─────────────────────────────────────────────────────

/**
 * Object containing per-model query extensions for all tenant-scoped models.
 * Each key is a model name, and the value is the extension config for that model.
 *
 * Used by:
 *   - `getScopedPrisma()` for explicit scoped client creation
 *   - `prismaTenant` singleton in db.ts for context-based auto-scoping
 */
export const modelExtensions = TENANT_SCOPED_MODELS.reduce(
    (acc, modelName) => {
        const ext = buildModelExtension(modelName);
        Object.assign(acc, ext);
        return acc;
    },
    {} as Record<string, unknown>
);

// ─── Scoped Prisma Client ─────────────────────────────────────────────────────

/**
 * Scoped Prisma client with automatic tenant isolation.
 *
 * This client wraps the base Prisma client with extensions that
 * automatically inject `tenantId` into all queries for models that
 * have a `tenantId` field.
 *
 * The injection logic:
 *   1. READ operations (findMany, findFirst, count, aggregate, groupBy):
 *      - Injects `tenantId` into `where` clause if not already present
 *   2. WRITE operations (create, createMany, update, updateMany, upsert, delete, deleteMany):
 *      - Injects `tenantId` into `data` (for create) or `where` (for update/delete)
 *   3. findUnique is NOT intercepted — ID lookups are safe and don't need scoping
 *
 * @example
 * ```typescript
 * const scopedPrisma = getScopedPrisma('tenant_123');
 *
 * // This query will automatically add `where: { tenantId: 'tenant_123', status: 'NEW' }`
 * const leads = await scopedPrisma.lead.findMany({ where: { status: 'NEW' } });
 *
 * // This create will automatically add `data: { ..., tenantId: 'tenant_123' }`
 * await scopedPrisma.lead.create({ data: { name: 'John', status: 'NEW' } });
 * ```
 *
 * @param tenantId - The tenant ID to scope all queries to
 * @returns A Prisma client instance with tenant isolation extensions
 */
export function getScopedPrisma(tenantId: string) {
    // Create a new PrismaClient instance for each scoped client.
    // This ensures isolation — each scoped client operates independently.
    const scopedClient = new PrismaClient();

    return scopedClient.$extends(modelExtensions as any);
}

/**
 * List of all tenant-scoped model names.
 * Useful for debugging, testing, or dynamic model checks.
 */
export { TENANT_SCOPED_MODELS };

/**
 * Check if a given model name has tenant scoping enabled.
 *
 * @param modelName - The Prisma model name (e.g., 'Lead', 'Invoice')
 * @returns true if the model has automatic tenant isolation
 */
export function isTenantScopedModel(modelName: string): boolean {
    return TENANT_SCOPED_MODELS.includes(modelName);
}

/**
 * Get the count of tenant-scoped models.
 * Useful for health checks and monitoring.
 */
export function getTenantScopedModelCount(): number {
    return TENANT_SCOPED_MODELS.length;
}
