/**
 * @qalcuity/web — Dashboard Widget Control
 *
 * Control functions untuk mengelola dashboard widget configuration per tenant.
 * Menggunakan Tenant.settings JSON field sebagai storage.
 */

import { prisma } from '../db';
import { logger } from '@/lib/logger';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface WidgetConfig {
    id: string;
    title: string;
    module: string;
    type: 'chart' | 'stat' | 'table' | 'list';
    size: 'sm' | 'md' | 'lg';
    visible: boolean;
    order: number;
    metric?: string;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const WIDGET_KEY = 'dashboardWidgets';

interface TenantSettings {
    dashboardWidgets?: Record<string, WidgetConfig>;
    [key: string]: unknown;
}

function parseSettings(settings: unknown): TenantSettings {
    if (!settings || typeof settings !== 'object') return {};
    if (typeof settings === 'string') {
        try { return JSON.parse(settings) as TenantSettings; } catch { return {}; }
    }
    return settings as TenantSettings;
}

// ─── Default Widgets ────────────────────────────────────────────────────────

const DEFAULT_WIDGETS: WidgetConfig[] = [
    { id: 'revenue-chart', title: 'Revenue Chart', module: 'finance', type: 'chart', size: 'md', visible: true, order: 0, metric: 'revenue' },
    { id: 'expense-chart', title: 'Expense Chart', module: 'finance', type: 'chart', size: 'md', visible: true, order: 1, metric: 'expense' },
    { id: 'cash-flow', title: 'Cash Flow', module: 'finance', type: 'chart', size: 'lg', visible: true, order: 2, metric: 'cashflow' },
    { id: 'pipeline', title: 'Sales Pipeline', module: 'crm', type: 'stat', size: 'md', visible: true, order: 3, metric: 'pipeline' },
    { id: 'stock-levels', title: 'Stock Levels', module: 'inventory', type: 'table', size: 'md', visible: true, order: 4, metric: 'stock' },
    { id: 'employee-count', title: 'Employee Count', module: 'hr', type: 'stat', size: 'sm', visible: true, order: 5, metric: 'employees' },
    { id: 'recent-transactions', title: 'Recent Transactions', module: 'finance', type: 'list', size: 'md', visible: true, order: 6, metric: 'recent' },
    { id: 'top-products', title: 'Top Products', module: 'inventory', type: 'table', size: 'md', visible: true, order: 7, metric: 'top-products' },
    { id: 'overdue-invoices', title: 'Overdue Invoices', module: 'finance', type: 'table', size: 'md', visible: true, order: 8, metric: 'overdue' },
    { id: 'attendance-overview', title: 'Attendance Overview', module: 'hr', type: 'stat', size: 'sm', visible: true, order: 9, metric: 'attendance' },
];

// ─── Functions ──────────────────────────────────────────────────────────────

/**
 * Get all dashboard widgets for a tenant.
 * Returns merged defaults with tenant overrides.
 */
export async function getDashboardWidgets(tenantId: string): Promise<WidgetConfig[]> {
    const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { settings: true },
    });

    const settings = parseSettings(tenant?.settings);
    const widgetOverrides = settings.dashboardWidgets || {};

    // Merge defaults with overrides
    return DEFAULT_WIDGETS.map(defaultWidget => {
        const override = widgetOverrides[defaultWidget.id];
        if (override) {
            return {
                ...defaultWidget,
                ...override,
                id: defaultWidget.id, // Prevent ID override
            };
        }
        return { ...defaultWidget };
    }).sort((a, b) => a.order - b.order);
}

/**
 * Update a specific widget config.
 */
export async function updateWidgetConfig(
    tenantId: string,
    widgetId: string,
    config: Partial<WidgetConfig>
): Promise<WidgetConfig> {
    // Verify widget exists in defaults
    const defaultWidget = DEFAULT_WIDGETS.find(w => w.id === widgetId);
    if (!defaultWidget) {
        throw new Error(`Widget '${widgetId}' does not exist`);
    }

    const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { settings: true },
    });

    const settings = parseSettings(tenant?.settings);
    const widgetOverrides = settings.dashboardWidgets || {};

    const existing = widgetOverrides[widgetId] || {};
    widgetOverrides[widgetId] = {
        ...existing,
        ...config,
        id: widgetId, // Prevent ID override
    };

    settings.dashboardWidgets = widgetOverrides;

    await prisma.tenant.update({
        where: { id: tenantId },
        data: { settings: settings as never },
    });

    logger.info(`[WidgetControl] Updated widget '${widgetId}'`, { tenantId });

    return {
        ...defaultWidget,
        ...widgetOverrides[widgetId],
        id: widgetId,
    };
}

/**
 * Toggle widget visibility.
 */
export async function toggleWidget(
    tenantId: string,
    widgetId: string,
    visible: boolean
): Promise<WidgetConfig> {
    return updateWidgetConfig(tenantId, widgetId, { visible });
}

/**
 * Reorder widgets.
 */
export async function reorderWidgets(
    tenantId: string,
    widgetIds: string[]
): Promise<WidgetConfig[]> {
    const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { settings: true },
    });

    const settings = parseSettings(tenant?.settings);
    const widgetOverrides = settings.dashboardWidgets || {};

    // Update order for each widget
    widgetIds.forEach((widgetId, index) => {
        const existing = widgetOverrides[widgetId] || {};
        widgetOverrides[widgetId] = {
            ...existing,
            order: index,
            id: widgetId,
        };
    });

    settings.dashboardWidgets = widgetOverrides;

    await prisma.tenant.update({
        where: { id: tenantId },
        data: { settings: settings as never },
    });

    logger.info(`[WidgetControl] Reordered ${widgetIds.length} widgets`, { tenantId });

    // Return updated widgets
    return getDashboardWidgets(tenantId);
}
