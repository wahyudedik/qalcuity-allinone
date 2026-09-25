export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requirePermissionForRoute } from '@/lib/session';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { handleApiError } from '@/lib/api-error';
import { MSG } from '@/lib/api-messages';
import { ROLE_HIERARCHY } from '@qalcuity/config';
import { checkPermissionByRole } from '@/lib/permissions';
import { PERMISSIONS } from '@qalcuity/permissions';

// ─── Types ───────────────────────────────────────────────────────────────────

interface InboxTask {
    id: string;
    title: string;
    status: string;
    priority: string;
    dueDate: string | null;
    projectName: string;
    projectId: string;
}

interface InboxApproval {
    id: string;
    entityType: string;
    entityDisplay: string;
    entityAmount: number | null;
    currentLevel: number;
    requesterName: string;
    createdAt: string;
}

interface OverdueItem {
    id: string;
    type: 'TASK' | 'INVOICE';
    title: string;
    dueDate: string;
    daysOverdue: number;
    details: string;
}

interface RecentActivity {
    id: string;
    action: string;
    entity: string;
    entityId: string | null;
    timestamp: string;
    userName: string;
}

// ─── GET Handler ─────────────────────────────────────────────────────────────

export async function GET(request: Request) {
    try {
        const ip = getClientIp(request);
        const rateLimitResult = checkRateLimit(`api:inbox:${ip}`, 60, 60000);
        if (!rateLimitResult.success) {
            return NextResponse.json(
                { success: false, error: MSG.TOO_MANY_REQUESTS },
                { status: 429 }
            );
        }

        const auth = await requirePermissionForRoute(request);
        if ('error' in auth) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        const { tenantId, userId, role } = auth;
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const userLevel = ROLE_HIERARCHY[role] ?? 0;
        const canViewAllApprovals = await checkPermissionByRole(userId, role, PERMISSIONS.APPROVAL_VIEW_ALL);

        // ── Parallel queries ────────────────────────────────────────────────

        // 1. My Tasks — assigned to current user, not DONE/CANCELLED
        const myTasksPromise = prisma.task.findMany({
            where: {
                tenantId,
                assigneeId: userId,
                status: { notIn: ['DONE', 'CANCELLED'] },
            },
            include: {
                project: { select: { id: true, name: true } },
            },
            orderBy: [
                { sortOrder: 'asc' },
                { createdAt: 'desc' },
            ],
            take: 20,
        });

        // 2. Pending Approvals — items waiting for user's approval
        const approvalLevelsPromise = prisma.approvalLevel.findMany({
            where: { tenantId, isActive: true },
        });

        // 3. Overdue Tasks — tasks past due date, not DONE/CANCELLED
        const overdueTasksPromise = prisma.task.findMany({
            where: {
                tenantId,
                status: { notIn: ['DONE', 'CANCELLED'] },
                dueDate: { lt: now },
            },
            include: {
                project: { select: { id: true, name: true } },
            },
            orderBy: { dueDate: 'asc' },
            take: 20,
        });

        // 4. Overdue Invoices — SENT or OVERDUE status, past due date
        const overdueInvoicesPromise = prisma.invoice.findMany({
            where: {
                tenantId,
                status: { in: ['SENT', 'OVERDUE'] },
                dueDate: { lt: now },
            },
            orderBy: { dueDate: 'asc' },
            take: 20,
        });

        // 5. Recent Activity — latest audit logs for this user's tenant
        const recentActivityPromise = prisma.auditLog.findMany({
            where: {
                tenantId,
            },
            orderBy: { createdAt: 'desc' },
            take: 15,
        });

        // 6. Completed today count
        const completedTodayPromise = prisma.task.count({
            where: {
                tenantId,
                assigneeId: userId,
                status: 'DONE',
                updatedAt: { gte: todayStart },
            },
        });

        // Execute all queries in parallel
        const [
            myTasks,
            approvalLevels,
            overdueTasks,
            overdueInvoices,
            recentActivity,
            completedTodayCount,
        ] = await Promise.all([
            myTasksPromise,
            approvalLevelsPromise,
            overdueTasksPromise,
            overdueInvoicesPromise,
            recentActivityPromise,
            completedTodayPromise,
        ]);

        // ── Process Pending Approvals ──────────────────────────────────────

        const eligibleEntityTypes = approvalLevels
            .filter((l) => userLevel >= (ROLE_HIERARCHY[l.requiredRole] ?? 0))
            .map((l) => l.entityType);

        let pendingApprovals: InboxApproval[] = [];
        let pendingApprovalsCount = 0;

        // Users with approval:viewAll see all pending; others only eligible types
        const approvalWhere: Record<string, unknown> = {
            tenantId,
            status: 'PENDING',
        };

        if (!canViewAllApprovals) {
            if (eligibleEntityTypes.length === 0) {
                // User cannot approve anything
                pendingApprovalsCount = 0;
            } else {
                approvalWhere.entityType = { in: eligibleEntityTypes };
                const [count, requests] = await Promise.all([
                    prisma.approvalRequest.count({ where: approvalWhere }),
                    prisma.approvalRequest.findMany({
                        where: approvalWhere,
                        orderBy: { createdAt: 'desc' },
                        take: 10,
                    }),
                ]);
                pendingApprovalsCount = count;
                pendingApprovals = await enrichApprovals(requests);
            }
        } else {
            const [count, requests] = await Promise.all([
                prisma.approvalRequest.count({ where: approvalWhere }),
                prisma.approvalRequest.findMany({
                    where: approvalWhere,
                    orderBy: { createdAt: 'desc' },
                    take: 10,
                }),
            ]);
            pendingApprovalsCount = count;
            pendingApprovals = await enrichApprovals(requests);
        }

        // ── Enrich My Tasks ────────────────────────────────────────────────

        const enrichedTasks: InboxTask[] = myTasks.map((t) => ({
            id: t.id,
            title: t.title,
            status: t.status,
            priority: t.priority,
            dueDate: t.dueDate?.toISOString() || null,
            projectName: t.project.name,
            projectId: t.project.id,
        }));

        // ── Enrich Overdue Items ───────────────────────────────────────────

        const overdueItems: OverdueItem[] = [];

        for (const task of overdueTasks) {
            const daysOverdue = Math.floor(
                (now.getTime() - new Date(task.dueDate!).getTime()) / (1000 * 60 * 60 * 24)
            );
            overdueItems.push({
                id: task.id,
                type: 'TASK',
                title: task.title,
                dueDate: task.dueDate!.toISOString(),
                daysOverdue,
                details: task.project.name,
            });
        }

        for (const invoice of overdueInvoices) {
            const daysOverdue = Math.floor(
                (now.getTime() - new Date(invoice.dueDate).getTime()) / (1000 * 60 * 60 * 24)
            );
            overdueItems.push({
                id: invoice.id,
                type: 'INVOICE',
                title: invoice.invoiceNumber,
                dueDate: invoice.dueDate.toISOString(),
                daysOverdue,
                details: `Rp ${Number(invoice.total).toLocaleString('id-ID')}`,
            });
        }

        // Sort overdue items by daysOverdue descending (most overdue first)
        overdueItems.sort((a, b) => b.daysOverdue - a.daysOverdue);

        // ── Enrich Recent Activity ─────────────────────────────────────────

        // Batch fetch user names
        const activityUserIds = [...new Set(recentActivity.map((a) => a.userId))];
        const activityUsers = activityUserIds.length > 0
            ? await prisma.user.findMany({
                where: { id: { in: activityUserIds } },
                select: { id: true, name: true },
            })
            : [];
        const activityUserMap = new Map(activityUsers.map((u) => [u.id, u.name]));

        const enrichedActivity: RecentActivity[] = recentActivity.map((a) => ({
            id: a.id,
            action: a.action,
            entity: a.entity,
            entityId: a.entityId,
            timestamp: a.createdAt.toISOString(),
            userName: activityUserMap.get(a.userId) || 'Unknown',
        }));

        // ── Response ───────────────────────────────────────────────────────

        return NextResponse.json({
            success: true,
            data: {
                summary: {
                    myTasksCount: myTasks.length,
                    pendingApprovalsCount,
                    overdueCount: overdueItems.length,
                    completedTodayCount,
                },
                myTasks: enrichedTasks,
                pendingApprovals,
                overdueItems,
                recentActivity: enrichedActivity,
            },
        });
    } catch (error) {
        return handleApiError(error);
    }
}

// ─── Helper: Enrich Approval Requests ────────────────────────────────────────

async function enrichApprovals(
    requests: Array<{
        id: string;
        entityType: string;
        entityId: string;
        currentLevel: number;
        status: string;
        requestedBy: string;
        createdAt: Date;
    }>
): Promise<InboxApproval[]> {
    if (requests.length === 0) return [];

    // Batch fetch all requesters
    const requesterIds = [...new Set(requests.map((r) => r.requestedBy))];
    const requesters = await prisma.user.findMany({
        where: { id: { in: requesterIds } },
        select: { id: true, name: true },
    });
    const requesterMap = new Map(requesters.map((r) => [r.id, r.name]));

    // Batch fetch all entities by type
    const invoiceIds = requests
        .filter((r) => r.entityType === 'INVOICE')
        .map((r) => r.entityId);
    const poIds = requests
        .filter((r) => r.entityType === 'PURCHASE_ORDER')
        .map((r) => r.entityId);
    const qtIds = requests
        .filter((r) => r.entityType === 'QUOTATION')
        .map((r) => r.entityId);

    const [invoices, purchaseOrders, quotations] = await Promise.all([
        invoiceIds.length > 0
            ? prisma.invoice.findMany({
                where: { id: { in: invoiceIds } },
                select: { id: true, invoiceNumber: true, total: true },
            })
            : [],
        poIds.length > 0
            ? prisma.purchaseOrder.findMany({
                where: { id: { in: poIds } },
                select: { id: true, poNumber: true, total: true },
            })
            : [],
        qtIds.length > 0
            ? prisma.quotation.findMany({
                where: { id: { in: qtIds } },
                select: { id: true, quotationNumber: true, total: true },
            })
            : [],
    ]);

    const invoiceMap = new Map(
        invoices.map((inv) => [inv.id, { display: inv.invoiceNumber, amount: Number(inv.total) }])
    );
    const poMap = new Map(
        purchaseOrders.map((po) => [po.id, { display: po.poNumber, amount: Number(po.total) }])
    );
    const qtMap = new Map(
        quotations.map((qt) => [qt.id, { display: qt.quotationNumber, amount: Number(qt.total) }])
    );

    return requests.map((req) => {
        let entityDisplay = req.entityId;
        let entityAmount: number | null = null;

        if (req.entityType === 'INVOICE') {
            const inv = invoiceMap.get(req.entityId);
            if (inv) {
                entityDisplay = inv.display;
                entityAmount = inv.amount;
            }
        } else if (req.entityType === 'PURCHASE_ORDER') {
            const po = poMap.get(req.entityId);
            if (po) {
                entityDisplay = po.display;
                entityAmount = po.amount;
            }
        } else if (req.entityType === 'QUOTATION') {
            const qt = qtMap.get(req.entityId);
            if (qt) {
                entityDisplay = qt.display;
                entityAmount = qt.amount;
            }
        }

        return {
            id: req.id,
            entityType: req.entityType,
            entityDisplay,
            entityAmount,
            currentLevel: req.currentLevel,
            requesterName: requesterMap.get(req.requestedBy) || 'Unknown',
            createdAt: req.createdAt.toISOString(),
        };
    });
}
