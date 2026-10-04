'use client';

/**
 * My Work Inbox — UCE-22 + UCE-23
 *
 * Personal work dashboard with 6 inbox categories:
 *   Overdue, Approval Required, Awaiting Action, Assigned,
 *   Escalated, Recently Completed.
 *
 * Delegated approval items (UCE-21) are marked with a
 * "Delegated" badge and the delegator's name.
 */

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
    Inbox,
    RefreshCw,
    AlertTriangle,
    Clock,
    CheckSquare,
    Send,
    Flame,
    CheckCircle2,
    UserCheck,
    FileText,
    ShoppingCart,
    PenLine,
    Bell,
    ArrowRight,
    Calendar,
    User,
    type LucideIcon,
} from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { useToast } from '@/components/ui/toast';
import { EmptyState } from '@/components/ui/empty-state';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils';

// ─── Types ───────────────────────────────────────────────────────────────────

type CategoryKey =
    | 'overdue'
    | 'approvalRequired'
    | 'awaitingAction'
    | 'assigned'
    | 'escalated'
    | 'recentlyCompleted';

interface InboxSLAInfo {
    color: 'green' | 'yellow' | 'red' | 'breached';
    label: string;
    hoursRemaining: number;
}

interface InboxItem {
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

interface InboxData {
    summary: {
        total: number;
        overdue: number;
        approvalRequired: number;
        awaitingAction: number;
        assigned: number;
        escalated: number;
        recentlyCompleted: number;
    };
    categories: Record<CategoryKey, InboxItem[]>;
    meta: {
        delegatedFrom: string[];
        generatedAt: string;
        staleApprovalThresholdHours: number;
        escalationThresholdHours: number;
    };
}

// ─── Category config ─────────────────────────────────────────────────────────

const CATEGORIES: Array<{
    key: CategoryKey;
    icon: LucideIcon;
    labelKey: string;
    emptyKey: string;
    badgeClass: string;
}> = [
        {
            key: 'overdue',
            icon: AlertTriangle,
            labelKey: 'inbox.categoryOverdue',
            emptyKey: 'inbox.emptyOverdue',
            badgeClass: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
        },
        {
            key: 'approvalRequired',
            icon: Clock,
            labelKey: 'inbox.categoryApprovalRequired',
            emptyKey: 'inbox.emptyApprovalRequired',
            badgeClass: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
        },
        {
            key: 'awaitingAction',
            icon: Send,
            labelKey: 'inbox.categoryAwaitingAction',
            emptyKey: 'inbox.emptyAwaitingAction',
            badgeClass: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
        },
        {
            key: 'assigned',
            icon: CheckSquare,
            labelKey: 'inbox.categoryAssigned',
            emptyKey: 'inbox.emptyAssigned',
            badgeClass: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
        },
        {
            key: 'escalated',
            icon: Flame,
            labelKey: 'inbox.categoryEscalated',
            emptyKey: 'inbox.emptyEscalated',
            badgeClass: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
        },
        {
            key: 'recentlyCompleted',
            icon: CheckCircle2,
            labelKey: 'inbox.categoryRecentlyCompleted',
            emptyKey: 'inbox.emptyRecentlyCompleted',
            badgeClass: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
        },
    ];

const ENTITY_ICONS: Record<string, LucideIcon> = {
    TASK: CheckSquare,
    INVOICE: FileText,
    PURCHASE_ORDER: ShoppingCart,
    QUOTATION: PenLine,
    APPROVAL_REQUEST: Clock,
    SLA: Flame,
    NOTIFICATION: Bell,
};

const ENTITY_COLORS: Record<string, string> = {
    TASK: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    INVOICE: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400',
    PURCHASE_ORDER: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    QUOTATION: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    APPROVAL_REQUEST: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    SLA: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    NOTIFICATION: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
};

const ENTITY_I18N: Record<string, string> = {
    TASK: 'inbox.typeTask',
    INVOICE: 'inbox.typeInvoice',
    PURCHASE_ORDER: 'inbox.typePurchaseOrder',
    QUOTATION: 'inbox.typeQuotation',
    APPROVAL_REQUEST: 'inbox.typeApprovalRequest',
    SLA: 'inbox.typeSla',
    NOTIFICATION: 'inbox.typeNotification',
};

const STATUS_COLORS: Record<string, string> = {
    TODO: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
    IN_PROGRESS: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    IN_REVIEW: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
    DONE: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    CANCELLED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    PENDING: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    APPROVED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    REJECTED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    active: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    breached: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    UNREAD: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
    READ: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
};

const STATUS_I18N: Record<string, string> = {
    TODO: 'dashboard.tasks.status.TODO',
    IN_PROGRESS: 'dashboard.tasks.status.IN_PROGRESS',
    IN_REVIEW: 'dashboard.tasks.status.IN_REVIEW',
    DONE: 'dashboard.tasks.status.DONE',
    CANCELLED: 'dashboard.tasks.status.CANCELLED',
    PENDING: 'inbox.statusPending',
    APPROVED: 'inbox.statusApproved',
    REJECTED: 'inbox.statusRejected',
    active: 'inbox.statusActive',
    breached: 'inbox.statusBreached',
    UNREAD: 'inbox.statusUnread',
    READ: 'inbox.statusRead',
};

const PRIORITY_I18N: Record<string, string> = {
    LOW: 'dashboard.tasks.priority.LOW',
    MEDIUM: 'dashboard.tasks.priority.MEDIUM',
    HIGH: 'dashboard.tasks.priority.HIGH',
    URGENT: 'dashboard.tasks.priority.URGENT',
};

const SLA_DOT: Record<string, string> = {
    green: 'bg-green-500',
    yellow: 'bg-yellow-400',
    red: 'bg-red-500',
    breached: 'bg-red-700',
};

const SLA_TEXT: Record<string, string> = {
    green: 'text-green-600 dark:text-green-400',
    yellow: 'text-yellow-600 dark:text-yellow-400',
    red: 'text-red-600 dark:text-red-400',
    breached: 'text-red-700 dark:text-red-500',
};

const SLA_I18N: Record<string, string> = {
    green: 'inbox.slaGreen',
    yellow: 'inbox.slaYellow',
    red: 'inbox.slaRed',
    breached: 'inbox.slaBreached',
};

// ─── Sub-components ──────────────────────────────────────────────────────────

function EntityBadge({ entityType, entityLabel, t }: { entityType: string; entityLabel: string; t: (key: string) => string }) {
    const Icon = ENTITY_ICONS[entityType] || FileText;
    return (
        <span
            className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${ENTITY_COLORS[entityType] || 'bg-gray-100 text-gray-600'}`}
            title={entityLabel}
        >
            <Icon className="h-3 w-3" />
            {t(ENTITY_I18N[entityType] || entityType)}
        </span>
    );
}

function StatusBadge({ status, t }: { status: string; t: (key: string) => string }) {
    const i18nKey = STATUS_I18N[status];
    return (
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[status] || 'bg-gray-100 text-gray-600'}`}>
            {i18nKey ? t(i18nKey) : status}
        </span>
    );
}

function SLABadge({ sla, t }: { sla: InboxSLAInfo | null; t: (key: string) => string }) {
    if (!sla) return <span className="text-xs text-gray-400 dark:text-gray-500">—</span>;
    return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium">
            <span className={`h-2 w-2 rounded-full ${SLA_DOT[sla.color] || 'bg-gray-400'}`} aria-hidden />
            <span className={SLA_TEXT[sla.color] || 'text-gray-500'}>{t(SLA_I18N[sla.color] || 'inbox.slaGreen')}</span>
        </span>
    );
}

function DelegatedBadge({ from, t }: { from: string | null; t: (key: string) => string }) {
    return (
        <span
            className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-700 dark:bg-violet-900/30 dark:text-violet-400"
            title={from ? `${t('inbox.delegatedFrom')}: ${from}` : t('inbox.delegated')}
        >
            <UserCheck className="h-3 w-3" />
            {t('inbox.delegated')}
        </span>
    );
}

function ItemMeta({ item, t }: { item: InboxItem; t: (key: string) => string }) {
    const bits: string[] = [];

    if (item.meta.projectName) bits.push(String(item.meta.projectName));
    if (item.meta.requesterName) bits.push(`${t('inbox.requester')}: ${String(item.meta.requesterName)}`);
    if (item.meta.reason === 'IN_REVIEW') bits.push(t('inbox.reasonInReview'));
    if (item.meta.reason === 'DUE_TODAY') bits.push(t('inbox.reasonDueToday'));
    if (typeof item.meta.hoursWaiting === 'number' && item.entityType === 'APPROVAL_REQUEST') {
        bits.push(`${item.meta.hoursWaiting} ${t('inbox.hoursWaiting')}`);
    }
    if (typeof item.meta.daysOverdue === 'number') {
        bits.push(`${item.meta.daysOverdue} ${t('inbox.daysOverdue')}`);
    }
    if (item.meta.stage) bits.push(String(item.meta.stage));

    if (bits.length === 0) return null;
    return (
        <p className="mt-0.5 truncate text-xs text-gray-500 dark:text-gray-400">
            {bits.join(' · ')}
        </p>
    );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function InboxPage() {
    const { t } = useTranslation();
    const { addToast } = useToast();

    const [inboxData, setInboxData] = useState<InboxData | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [activeCategory, setActiveCategory] = useState<CategoryKey>('overdue');
    const [actionPending, setActionPending] = useState<string | null>(null);

    const fetchInbox = useCallback(async (isRefresh = false) => {
        try {
            if (isRefresh) setRefreshing(true);
            else setLoading(true);
            setError(null);

            const res = await fetch('/api/inbox');
            const json = await res.json().catch(() => null);

            if (!res.ok || !json?.success) {
                throw new Error(json?.error?.message || json?.error || t('common.error'));
            }
            setInboxData(json.data);
        } catch (err) {
            setError(err instanceof Error ? err.message : t('common.error'));
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [t]);

    useEffect(() => {
        fetchInbox();
    }, [fetchInbox]);

    const handleApprove = async (approvalId: string) => {
        try {
            setActionPending(approvalId);
            const res = await fetch(`/api/approval/requests/${approvalId}/approve`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ comments: '' }),
            });
            if (!res.ok) throw new Error('Failed to approve');
            addToast(t('inbox.approveSuccess'), 'success');
            fetchInbox(true);
        } catch {
            addToast(t('inbox.approveError'), 'error');
        } finally {
            setActionPending(null);
        }
    };

    const handleReject = async (approvalId: string) => {
        try {
            setActionPending(approvalId);
            const res = await fetch(`/api/approval/requests/${approvalId}/reject`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ comments: t('inbox.rejectedFromInbox') }),
            });
            if (!res.ok) throw new Error('Failed to reject');
            addToast(t('inbox.rejectSuccess'), 'success');
            fetchInbox(true);
        } catch {
            addToast(t('inbox.rejectError'), 'error');
        } finally {
            setActionPending(null);
        }
    };

    // ── Loading State ──────────────────────────────────────────────────────

    if (loading) {
        return (
            <div className="space-y-6 p-6">
                <div>
                    <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
                    <div className="h-4 w-64 bg-gray-200 rounded animate-pulse mt-2" />
                </div>
                <div className="flex gap-2">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="h-9 w-32 bg-gray-200 rounded-lg animate-pulse" />
                    ))}
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
                    <div className="space-y-3">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse dark:bg-gray-700" />
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    // ── Error State ────────────────────────────────────────────────────────

    if (error || !inboxData) {
        return (
            <div className="p-6">
                <EmptyState
                    icon={AlertTriangle}
                    title={t('common.error')}
                    description={error || t('common.error')}
                    actionLabel={t('common.tryAgain')}
                    onAction={() => fetchInbox()}
                />
            </div>
        );
    }

    const data = inboxData;
    const activeItems = data.categories[activeCategory] || [];
    const activeConfig = CATEGORIES.find((c) => c.key === activeCategory)!;
    const pendingTotal =
        data.summary.overdue +
        data.summary.approvalRequired +
        data.summary.awaitingAction +
        data.summary.assigned +
        data.summary.escalated;

    const renderItemMeta = (item: InboxItem) => <ItemMeta item={item} t={t} />;

    const renderActions = (item: InboxItem) => {
        if (activeCategory !== 'approvalRequired') return null;
        return (
            <div className="flex items-center gap-2">
                <button
                    onClick={() => handleApprove(item.id)}
                    disabled={actionPending === item.id}
                    className="inline-flex items-center gap-1 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-green-700 disabled:opacity-50"
                >
                    <CheckCircle2 className="h-3 w-3" />
                    {t('inbox.approve')}
                </button>
                <button
                    onClick={() => handleReject(item.id)}
                    disabled={actionPending === item.id}
                    className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-100 disabled:opacity-50 dark:bg-red-900/20 dark:text-red-400"
                >
                    {t('inbox.reject')}
                </button>
            </div>
        );
    };

    return (
        <div className="space-y-6 p-6">
            {/* Header */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900 dark:text-gray-100">
                        <Inbox className="h-6 w-6 text-blue-500" />
                        {t('inbox.title')}
                    </h1>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        {t('inbox.description')}
                    </p>
                    <p className="mt-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                        {t('inbox.pendingTotal')}: {pendingTotal}
                    </p>
                    {data.meta.delegatedFrom.length > 0 && (
                        <p className="mt-1 inline-flex items-center gap-1 rounded-full bg-violet-50 px-2.5 py-0.5 text-xs font-medium text-violet-700 dark:bg-violet-900/20 dark:text-violet-400">
                            <UserCheck className="h-3 w-3" />
                            {t('inbox.delegatedFrom')}: {data.meta.delegatedFrom.join(', ')}
                        </p>
                    )}
                </div>
                <button
                    onClick={() => fetchInbox(true)}
                    disabled={refreshing}
                    className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                    <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                    {refreshing ? t('inbox.refreshing') : t('inbox.refresh')}
                </button>
            </div>

            {/* Category Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label={t('inbox.title')}>
                {CATEGORIES.map((cat) => {
                    const count = data.summary[cat.key] ?? 0;
                    const isActive = cat.key === activeCategory;
                    const Icon = cat.icon;
                    return (
                        <button
                            key={cat.key}
                            role="tab"
                            aria-selected={isActive}
                            onClick={() => setActiveCategory(cat.key)}
                            className={`inline-flex shrink-0 items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition ${isActive
                                ? 'border-blue-600 bg-blue-600 text-white shadow-sm'
                                : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                                }`}
                        >
                            <Icon className="h-4 w-4" />
                            {t(cat.labelKey)}
                            <span
                                className={`inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full px-1.5 text-xs font-bold ${isActive
                                    ? 'bg-white/20 text-white'
                                    : cat.badgeClass
                                    }`}
                            >
                                {count}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* Active Category Content */}
            {activeItems.length === 0 ? (
                <EmptyState
                    icon={activeConfig.icon}
                    title={t(activeConfig.emptyKey)}
                    description={t('inbox.emptyCategoryDescription')}
                    actionLabel={t('inbox.refresh')}
                    onAction={() => fetchInbox(true)}
                />
            ) : (
                <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
                    <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
                        <div className="flex items-center gap-3">
                            <activeConfig.icon className={`h-5 w-5 ${activeCategory === 'overdue' || activeCategory === 'escalated' ? 'text-red-500' : 'text-blue-500'}`} />
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                {t(activeConfig.labelKey)}
                            </h2>
                            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${activeConfig.badgeClass}`}>
                                {activeItems.length}
                            </span>
                        </div>
                        <span className="hidden text-xs text-gray-400 sm:block">
                            {t('inbox.generatedAt')}: {formatDateTime(data.meta.generatedAt)}
                        </span>
                    </div>

                    {/* Desktop: Table */}
                    <div className="hidden md:block">
                        <table className="w-full">
                            <thead className="bg-gray-50 dark:bg-gray-700/50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                        {t('inbox.itemTitle')}
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                        {t('common.status')}
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                        SLA
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                        {t('inbox.time')}
                                    </th>
                                    {activeCategory === 'approvalRequired' && (
                                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                            {t('inbox.flag')}
                                        </th>
                                    )}
                                    {activeCategory === 'approvalRequired' && (
                                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                            {t('inbox.action')}
                                        </th>
                                    )}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {activeItems.map((item) => {
                                    const isOverdueDue =
                                        item.dueDate && new Date(item.dueDate) < new Date() && item.entityType === 'TASK';
                                    return (
                                        <tr
                                            key={`${item.entityType}-${item.id}`}
                                            className="hover:bg-gray-50 dark:hover:bg-gray-700/50"
                                        >
                                            <td className="px-6 py-4">
                                                <div className="flex items-start gap-3">
                                                    <EntityBadge entityType={item.entityType} entityLabel={item.entityLabel} t={t} />
                                                    <div className="min-w-0">
                                                        <Link
                                                            href={item.link}
                                                            className="font-medium text-gray-900 hover:text-blue-600 dark:text-gray-100 dark:hover:text-blue-400"
                                                        >
                                                            {item.title}
                                                        </Link>
                                                        {renderItemMeta(item)}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <StatusBadge status={item.status} t={t} />
                                            </td>
                                            <td className="px-6 py-4">
                                                <SLABadge sla={item.sla} t={t} />
                                            </td>
                                            <td className={`px-6 py-4 text-sm ${isOverdueDue ? 'font-medium text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'}`}>
                                                {item.dueDate ? formatDate(item.dueDate) : formatDateTime(item.timestamp)}
                                            </td>
                                            {activeCategory === 'approvalRequired' && (
                                                <td className="px-6 py-4">
                                                    {item.delegated ? (
                                                        <DelegatedBadge from={item.delegatedFrom} t={t} />
                                                    ) : (
                                                        <span className="text-xs text-gray-400">—</span>
                                                    )}
                                                </td>
                                            )}
                                            {activeCategory === 'approvalRequired' && (
                                                <td className="px-6 py-4">{renderActions(item)}</td>
                                            )}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile: Cards */}
                    <div className="divide-y divide-gray-100 md:hidden dark:divide-gray-700">
                        {activeItems.map((item) => {
                            const isOverdueDue =
                                item.dueDate && new Date(item.dueDate) < new Date() && item.entityType === 'TASK';
                            return (
                                <div key={`${item.entityType}-${item.id}`} className="px-4 py-3">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <EntityBadge entityType={item.entityType} entityLabel={item.entityLabel} t={t} />
                                                <StatusBadge status={item.status} t={t} />
                                                {item.delegated && <DelegatedBadge from={item.delegatedFrom} t={t} />}
                                            </div>
                                            <Link
                                                href={item.link}
                                                className="mt-1 block font-medium text-gray-900 hover:text-blue-600 dark:text-gray-100"
                                            >
                                                {item.title}
                                            </Link>
                                            {renderItemMeta(item)}
                                            <div className="mt-1 flex flex-wrap items-center gap-3">
                                                <SLABadge sla={item.sla} t={t} />
                                                <span className={`text-xs ${isOverdueDue ? 'font-medium text-red-600' : 'text-gray-500 dark:text-gray-400'}`}>
                                                    <Calendar className="mr-1 inline h-3 w-3" />
                                                    {item.dueDate ? formatDate(item.dueDate) : formatDateTime(item.timestamp)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    {activeCategory === 'approvalRequired' && (
                                        <div className="mt-2">{renderActions(item)}</div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Cross-category hint */}
            {pendingTotal > 0 && activeItems.length > 0 && (
                <p className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
                    <ArrowRight className="h-3 w-3" />
                    {t('inbox.crossCategoryHint')}
                    {typeof data.meta.staleApprovalThresholdHours === 'number' &&
                        ` — ${t('inbox.staleHint')}`}
                </p>
            )}
        </div>
    );
}
