export const dynamic = 'force-dynamic';

/**
 * Work Inbox API — UCE-21/22/23
 *
 * GET /api/inbox — Personal work inbox per user.
 *
 * Returns 6 categories (UCE-23):
 *   1. overdue           — tasks past due, SLA breaches, stale approvals
 *   2. approvalRequired  — PENDING approvals the user can act on, incl. delegated (UCE-21)
 *   3. awaitingAction    — items waiting on the user (in-review tasks, due today)
 *   4. assigned          — open tasks assigned to the user
 *   5. escalated         — SLA escalations + escalation notifications
 *   6. recentlyCompleted — tasks/approvals the user completed in the last 7 days
 *
 * Delegation resolution (UCE-21): active delegations where the current user
 * is the delegatee (from Tenant.settings via delegation.ts) — pending
 * approval requests from delegators whose module matches appear in
 * `approvalRequired` with `delegated: true`.
 *
 * Multi-tenant: every query filters `tenantId` from the session.
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requirePermissionForRoute } from '@/lib/session';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { handleApiError } from '@/lib/api-error';
import { MSG } from '@/lib/api-messages';
import { ROLE_HIERARCHY } from '@qalcuity/config';
import { checkPermissionByRole } from '@/lib/permissions';
import { PERMISSIONS } from '@qalcuity/permissions';
import { getDelegations } from '@/lib/delegation';
import { getSLAColor } from '@/lib/sla-monitor';

// ─── Types ───────────────────────────────────────────────────────────────────

export type InboxCategory =
    | 'overdue'
    | 'approvalRequired'
    | 'awaitingAction'
    | 'assigned'
    | 'escalated'
    | 'recentlyCompleted';

export interface InboxSLAInfo {
    color: 'green' | 'yellow' | 'red' | 'breached';
    label: string;
    hoursRemaining: number;
}

export interface InboxItem {
    id: string;
    title: string;
    entityType: string;
    entityLabel: string;
    entityAmount: number | null;
    status: string;
    link: string;
    timestamp: string;
    dueDate: string | null;
    sla: InboxSLAInfo | null;
    delegated: boolean;
    delegatedFrom: string | null;
    meta: Record<string, string | number | null>;
}

interface ApprovalRequestRow {
    id: string;
    entityType: string;
    entityId: string;
    currentLevel: number;
    status: string;
    requestedBy: string;
    createdAt: Date;
}

// ─── Constants ───────────────────────────────────────────────────────────────

/** Entity types that map to the "finance" delegation module. */
const FINANCE_ENTITY_TYPES = new Set(['INVOICE', 'PURCHASE_ORDER', 'QUOTATION']);

/** In-app notification types produced by approval-escalation.ts. */
const ESCALATION_NOTIFICATION_TYPES = ['approval_escalation', 'approval_escalation_admin'];

/** Approval stale thresholds (hours) — mirrors approval-escalation SLA defaults. */
const APPROVAL_REMINDER_HOURS = 24;
const APPROVAL_ESCALATE_HOURS = 48;
const APPROVAL_ADMIN_NOTIFY_HOURS = 72;

const TASK_STATUSES_OPEN = ['TODO', 'IN_PROGRESS', 'IN_REVIEW'];

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Map an approval entity type to a delegation module name. */
function entityTypeToModule(entityType: string): string {
    return FINANCE_ENTITY_TYPES.has(entityType) ? 'finance' : entityType.toLowerCase();
}

/** Build a dashboard link for the entity behind an inbox item. */
function buildLink(entityType: string, entityId: string, projectId?: string | null): string {
    switch (entityType) {
        case 'INVOICE':
            return `/dashboard/finance/invoices/${entityId}`;
        case 'PURCHASE_ORDER':
            return `/dashboard/finance/purchase-orders/${entityId}`;
        case 'QUOTATION':
            return `/dashboard/finance/quotations/${entityId}`;
        case 'TASK':
            return projectId ? `/dashboard/projects/${projectId}/board` : '/dashboard/tasks';
        case 'APPROVAL':
        case 'APPROVAL_REQUEST':
            return '/dashboard/approvals';
        default:
            return '/dashboard/inbox';
    }
}

function toSLAInfo(sla: { color: 'green' | 'yellow' | 'red' | 'breached'; label: string; hoursRemaining: number }): InboxSLAInfo {
    return { color: sla.color, label: sla.label, hoursRemaining: sla.hoursRemaining };
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
            return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
        }

        const { tenantId, userId, role } = auth;
        const now = new Date();
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        const userLevel = ROLE_HIERARCHY[role] ?? 0;
        const canViewAllApprovals = await checkPermissionByRole(userId, role, PERMISSIONS.APPROVAL_VIEW_ALL);

        // ── Delegation resolution (UCE-21) ──────────────────────────────────
        // Current user as delegatee: pending approvals from delegators whose
        // module matches appear in the inbox, marked as delegated.
        const allDelegations = await getDelegations(tenantId);
        const activeDelegations = allDelegations.filter(
            (d) => d.enabled && d.toUserId === userId && d.startDate <= now && d.endDate >= now
        );
        const delegatorIds = [...new Set(activeDelegations.map((d) => d.fromUserId))];
        const delegatorNames = new Map(activeDelegations.map((d) => [d.fromUserId, d.fromUserName]));
        const matchesDelegation = (entityType: string): boolean => {
            const module = entityTypeToModule(entityType);
            return activeDelegations.some((d) => d.module === 'all' || d.module === module);
        };

        // ── Approval eligibility (role-based via ApprovalLevel.requiredRole) ─
        const approvalLevels = await prisma.approvalLevel.findMany({
            where: { tenantId, isActive: true },
        });
        const eligibleEntityTypes = approvalLevels
            .filter((l) => userLevel >= (ROLE_HIERARCHY[l.requiredRole] ?? 0))
            .map((l) => l.entityType);

        // Build WHERE for pending approvals: eligible types OR delegated requesters
        const pendingWhere: Record<string, unknown> = { tenantId, status: 'PENDING' };
        let includePending = true;
        if (!canViewAllApprovals) {
            const orConditions: Array<Record<string, unknown>> = [];
            if (eligibleEntityTypes.length > 0) {
                orConditions.push({ entityType: { in: eligibleEntityTypes } });
            }
            if (delegatorIds.length > 0) {
                orConditions.push({ requestedBy: { in: delegatorIds } });
            }
            if (orConditions.length === 0) {
                includePending = false;
            } else {
                pendingWhere.OR = orConditions;
            }
        }

        // ── Parallel queries (all tenant-scoped) ────────────────────────────

        const openTasksPromise = prisma.task.findMany({
            where: {
                tenantId,
                assigneeId: userId,
                status: { in: TASK_STATUSES_OPEN },
            },
            include: { project: { select: { id: true, name: true } } },
            orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
            take: 30,
        });

        const openTasksCountPromise = prisma.task.count({
            where: {
                tenantId,
                assigneeId: userId,
                status: { in: TASK_STATUSES_OPEN },
            },
        });

        const completedTasksPromise = prisma.task.findMany({
            where: {
                tenantId,
                assigneeId: userId,
                status: 'DONE',
                updatedAt: { gte: sevenDaysAgo },
            },
            include: { project: { select: { id: true, name: true } } },
            orderBy: { updatedAt: 'desc' },
            take: 10,
        });

        const pendingApprovalsPromise = includePending
            ? prisma.approvalRequest.findMany({
                where: pendingWhere,
                orderBy: { createdAt: 'asc' },
                take: 30,
            })
            : Promise.resolve([]);

        const pendingApprovalsCountPromise = includePending
            ? prisma.approvalRequest.count({ where: pendingWhere })
            : Promise.resolve(0);

        const resolvedApprovalsPromise = prisma.approvalRequest.findMany({
            where: {
                tenantId,
                resolvedBy: userId,
                resolvedAt: { gte: sevenDaysAgo },
            },
            orderBy: { resolvedAt: 'desc' },
            take: 10,
        });

        const escalatedSlasPromise = prisma.sLATracker.findMany({
            where: {
                tenantId,
                escalatedTo: userId,
                status: { in: ['active', 'breached'] },
            },
            orderBy: { deadline: 'asc' },
            take: 20,
        });

        const escalationNotifsPromise = prisma.inAppNotification.findMany({
            where: {
                tenantId,
                userId,
                type: { in: ESCALATION_NOTIFICATION_TYPES },
                createdAt: { gte: sevenDaysAgo },
            },
            orderBy: { createdAt: 'desc' },
            take: 20,
        });

        const [
            openTasks,
            openTasksCount,
            completedTasks,
            pendingApprovals,
            pendingApprovalsCount,
            resolvedApprovals,
            escalatedSlas,
            escalationNotifs,
        ] = await Promise.all([
            openTasksPromise,
            openTasksCountPromise,
            completedTasksPromise,
            pendingApprovalsPromise,
            pendingApprovalsCountPromise,
            resolvedApprovalsPromise,
            escalatedSlasPromise,
            escalationNotifsPromise,
        ]);

        // ── Batch enrichment: requesters + entity displays ──────────────────

        const requesterIds = [...new Set(pendingApprovals.map((r) => r.requestedBy))];
        const requesters = requesterIds.length > 0
            ? await prisma.user.findMany({
                where: { id: { in: requesterIds } },
                select: { id: true, name: true },
            })
            : [];
        const requesterMap = new Map(requesters.map((r) => [r.id, r.name]));

        const invoiceIds = pendingApprovals.filter((r) => r.entityType === 'INVOICE').map((r) => r.entityId);
        const poIds = pendingApprovals.filter((r) => r.entityType === 'PURCHASE_ORDER').map((r) => r.entityId);
        const qtIds = pendingApprovals.filter((r) => r.entityType === 'QUOTATION').map((r) => r.entityId);

        const [invoices, purchaseOrders, quotations] = await Promise.all([
            invoiceIds.length > 0
                ? prisma.invoice.findMany({
                    where: { id: { in: invoiceIds }, tenantId },
                    select: { id: true, invoiceNumber: true, total: true },
                })
                : [],
            poIds.length > 0
                ? prisma.purchaseOrder.findMany({
                    where: { id: { in: poIds }, tenantId },
                    select: { id: true, poNumber: true, total: true },
                })
                : [],
            qtIds.length > 0
                ? prisma.quotation.findMany({
                    where: { id: { in: qtIds }, tenantId },
                    select: { id: true, quotationNumber: true, total: true },
                })
                : [],
        ]);

        const invoiceMap = new Map(invoices.map((inv) => [inv.id, { display: inv.invoiceNumber, amount: Number(inv.total) }]));
        const poMap = new Map(purchaseOrders.map((po) => [po.id, { display: po.poNumber, amount: Number(po.total) }]));
        const qtMap = new Map(quotations.map((qt) => [qt.id, { display: qt.quotationNumber, amount: Number(qt.total) }]));

        function resolveEntityDisplay(entityType: string, entityId: string): { display: string; amount: number | null } {
            if (entityType === 'INVOICE') {
                const inv = invoiceMap.get(entityId);
                if (inv) return { display: inv.display, amount: inv.amount };
            } else if (entityType === 'PURCHASE_ORDER') {
                const po = poMap.get(entityId);
                if (po) return { display: po.display, amount: po.amount };
            } else if (entityType === 'QUOTATION') {
                const qt = qtMap.get(entityId);
                if (qt) return { display: qt.display, amount: qt.amount };
            }
            return { display: entityId, amount: null };
        }

        // ── Category builders ───────────────────────────────────────────────

        // 1. Approval Required — eligible PENDING + delegated (UCE-21)
        const approvalRequired: InboxItem[] = [];
        const staleApprovals: InboxItem[] = [];

        for (const req of pendingApprovals as ApprovalRequestRow[]) {
            const isEligible =
                canViewAllApprovals || eligibleEntityTypes.includes(req.entityType);
            const isDelegated =
                !isEligible && delegatorIds.includes(req.requestedBy) && matchesDelegation(req.entityType);

            if (!isEligible && !isDelegated) continue;

            const { display, amount } = resolveEntityDisplay(req.entityType, req.entityId);
            const hoursWaiting = (now.getTime() - req.createdAt.getTime()) / (1000 * 60 * 60);
            const sla = getSLAColor(
                new Date(req.createdAt.getTime() + APPROVAL_ADMIN_NOTIFY_HOURS * 60 * 60 * 1000),
                null,
                req.createdAt
            );

            const item: InboxItem = {
                id: req.id,
                title: display,
                entityType: 'APPROVAL_REQUEST',
                entityLabel: req.entityType,
                entityAmount: amount,
                status: 'PENDING',
                link: buildLink('APPROVAL', req.id),
                timestamp: req.createdAt.toISOString(),
                dueDate: null,
                sla: toSLAInfo(sla),
                delegated: isDelegated,
                delegatedFrom: isDelegated ? delegatorNames.get(req.requestedBy) ?? null : null,
                meta: {
                    approvalEntityType: req.entityType,
                    currentLevel: req.currentLevel,
                    requesterName: requesterMap.get(req.requestedBy) ?? 'Unknown',
                    hoursWaiting: Math.floor(hoursWaiting),
                },
            };

            approvalRequired.push(item);

            // Overdue: pending approval waiting longer than the reminder threshold
            if (hoursWaiting >= APPROVAL_REMINDER_HOURS) {
                staleApprovals.push(item);
            }
        }

        // 2. Overdue — overdue tasks + SLA breaches + stale approvals
        const overdue: InboxItem[] = [];

        for (const task of openTasks) {
            if (task.dueDate && task.dueDate < now) {
                const daysOverdue = Math.floor(
                    (now.getTime() - task.dueDate.getTime()) / (1000 * 60 * 60 * 24)
                );
                overdue.push({
                    id: task.id,
                    title: task.title,
                    entityType: 'TASK',
                    entityLabel: task.project.name,
                    entityAmount: null,
                    status: task.status,
                    link: buildLink('TASK', task.id, task.project.id),
                    timestamp: task.createdAt.toISOString(),
                    dueDate: task.dueDate.toISOString(),
                    sla: {
                        color: 'breached',
                        label: `Overdue by ${daysOverdue} day(s)`,
                        hoursRemaining: -(daysOverdue * 24),
                    },
                    delegated: false,
                    delegatedFrom: null,
                    meta: {
                        daysOverdue,
                        projectName: task.project.name,
                        priority: task.priority,
                    },
                });
            }
        }

        for (const tracker of escalatedSlas) {
            if (tracker.deadline < now) {
                const sla = getSLAColor(tracker.deadline, tracker.completedAt, tracker.startedAt);
                overdue.push({
                    id: tracker.id,
                    title: `${tracker.entityType} ${tracker.entityId.slice(0, 8)}…`,
                    entityType: 'SLA',
                    entityLabel: tracker.stage,
                    entityAmount: null,
                    status: tracker.status,
                    link: buildLink('APPROVAL', tracker.entityId),
                    timestamp: tracker.startedAt.toISOString(),
                    dueDate: tracker.deadline.toISOString(),
                    sla: toSLAInfo(sla),
                    delegated: false,
                    delegatedFrom: null,
                    meta: {
                        stage: tracker.stage,
                        targetHours: tracker.targetHours,
                        entityType: tracker.entityType,
                    },
                });
            }
        }

        overdue.push(...staleApprovals);
        overdue.sort((a, b) => {
            const rank = { breached: 0, red: 1, yellow: 2, green: 3 };
            return rank[a.sla?.color ?? 'green'] - rank[b.sla?.color ?? 'green'];
        });

        // 3. Awaiting Action — in-review tasks + tasks due today (not yet overdue)
        const overdueTaskIds = new Set(
            overdue.filter((i) => i.entityType === 'TASK').map((i) => i.id)
        );
        const awaitingAction: InboxItem[] = [];

        for (const task of openTasks) {
            if (overdueTaskIds.has(task.id)) continue;
            const isDueToday = task.dueDate != null && task.dueDate <= todayEnd;
            const isReview = task.status === 'IN_REVIEW';
            if (!isDueToday && !isReview) continue;

            awaitingAction.push({
                id: task.id,
                title: task.title,
                entityType: 'TASK',
                entityLabel: task.project.name,
                entityAmount: null,
                status: task.status,
                link: buildLink('TASK', task.id, task.project.id),
                timestamp: task.createdAt.toISOString(),
                dueDate: task.dueDate?.toISOString() ?? null,
                sla: task.dueDate
                    ? toSLAInfo(getSLAColor(task.dueDate, null, task.startDate ?? task.createdAt))
                    : null,
                delegated: false,
                delegatedFrom: null,
                meta: {
                    reason: isReview ? 'IN_REVIEW' : 'DUE_TODAY',
                    projectName: task.project.name,
                    priority: task.priority,
                },
            });
        }

        // 4. Assigned — all open tasks assigned to the user
        const assigned: InboxItem[] = openTasks.map((task) => ({
            id: task.id,
            title: task.title,
            entityType: 'TASK',
            entityLabel: task.project.name,
            entityAmount: null,
            status: task.status,
            link: buildLink('TASK', task.id, task.project.id),
            timestamp: task.createdAt.toISOString(),
            dueDate: task.dueDate?.toISOString() ?? null,
            sla: task.dueDate && task.dueDate < now
                ? { color: 'breached' as const, label: 'Overdue', hoursRemaining: 0 }
                : task.dueDate
                    ? toSLAInfo(getSLAColor(task.dueDate, null, task.startDate ?? task.createdAt))
                    : null,
            delegated: false,
            delegatedFrom: null,
            meta: {
                projectName: task.project.name,
                priority: task.priority,
                progress: task.progress,
            },
        }));

        // 5. Escalated — SLA escalations + escalation notifications
        const escalated: InboxItem[] = [];

        for (const tracker of escalatedSlas) {
            const sla = getSLAColor(tracker.deadline, tracker.completedAt, tracker.startedAt);
            escalated.push({
                id: tracker.id,
                title: `${tracker.entityType} ${tracker.entityId.slice(0, 8)}…`,
                entityType: 'SLA',
                entityLabel: tracker.stage,
                entityAmount: null,
                status: tracker.status,
                link: buildLink('APPROVAL', tracker.entityId),
                timestamp: tracker.startedAt.toISOString(),
                dueDate: tracker.deadline.toISOString(),
                sla: toSLAInfo(sla),
                delegated: false,
                delegatedFrom: null,
                meta: {
                    stage: tracker.stage,
                    targetHours: tracker.targetHours,
                    escalatedTo: tracker.escalatedTo,
                },
            });
        }

        for (const notif of escalationNotifs) {
            escalated.push({
                id: notif.id,
                title: notif.title,
                entityType: 'NOTIFICATION',
                entityLabel: notif.type,
                entityAmount: null,
                status: notif.isRead ? 'READ' : 'UNREAD',
                link: notif.link || '/dashboard/approvals',
                timestamp: notif.createdAt.toISOString(),
                dueDate: null,
                sla: null,
                delegated: false,
                delegatedFrom: null,
                meta: {
                    notificationType: notif.type,
                    message: notif.message,
                },
            });
        }

        // 6. Recently Completed — tasks + approvals the user finished in 7 days
        const recentlyCompleted: InboxItem[] = [];

        for (const task of completedTasks) {
            recentlyCompleted.push({
                id: task.id,
                title: task.title,
                entityType: 'TASK',
                entityLabel: task.project.name,
                entityAmount: null,
                status: 'DONE',
                link: buildLink('TASK', task.id, task.project.id),
                timestamp: task.updatedAt.toISOString(),
                dueDate: task.dueDate?.toISOString() ?? null,
                sla: task.dueDate
                    ? toSLAInfo(getSLAColor(task.dueDate, task.updatedAt, task.startDate ?? task.createdAt))
                    : null,
                delegated: false,
                delegatedFrom: null,
                meta: {
                    projectName: task.project.name,
                    completedAt: task.updatedAt.toISOString(),
                },
            });
        }

        for (const req of resolvedApprovals) {
            const { display, amount } = resolveEntityDisplay(req.entityType, req.entityId);
            recentlyCompleted.push({
                id: req.id,
                title: display,
                entityType: 'APPROVAL_REQUEST',
                entityLabel: req.entityType,
                entityAmount: amount,
                status: req.status,
                link: buildLink('APPROVAL', req.id),
                timestamp: (req.resolvedAt ?? req.createdAt).toISOString(),
                dueDate: null,
                sla: null,
                delegated: false,
                delegatedFrom: null,
                meta: {
                    approvalEntityType: req.entityType,
                    resolvedAt: (req.resolvedAt ?? req.createdAt).toISOString(),
                    comments: req.comments,
                },
            });
        }

        recentlyCompleted.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

        // ── Response ─────────────────────────────────────────────────────────

        return NextResponse.json({
            success: true,
            data: {
                summary: {
                    total:
                        overdue.length +
                        approvalRequired.length +
                        awaitingAction.length +
                        assigned.length +
                        escalated.length,
                    overdue: overdue.length,
                    approvalRequired: pendingApprovalsCount,
                    awaitingAction: awaitingAction.length,
                    assigned: openTasksCount,
                    escalated: escalated.length,
                    recentlyCompleted: recentlyCompleted.length,
                },
                categories: {
                    overdue,
                    approvalRequired,
                    awaitingAction,
                    assigned,
                    escalated,
                    recentlyCompleted,
                },
                meta: {
                    delegatedFrom: [...delegatorNames.values()],
                    generatedAt: now.toISOString(),
                    staleApprovalThresholdHours: APPROVAL_REMINDER_HOURS,
                    escalationThresholdHours: APPROVAL_ESCALATE_HOURS,
                },
            },
        });
    } catch (error) {
        return handleApiError(error);
    }
}
