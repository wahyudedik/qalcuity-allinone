'use client';

/**
 * Kitchen Display System — Order Card Component
 *
 * Card component untuk satu order kitchen.
 * Menampilkan: order info, items, timer, action buttons.
 * Color-coded border berdasarkan status.
 *
 * Ref: plans/pos-kitchen-display-architecture.md Section 5.1.3
 */

import { useState, useMemo } from 'react';
import {
    Clock,
    Flame,
    CheckCircle,
    PackageCheck,
    XCircle,
    AlertTriangle,
    ChevronRight,
    UtensilsCrossed,
    ShoppingBag,
    Truck,
    StickyNote,
    X,
    MapPin,
} from 'lucide-react';
import type { KitchenOrder, KitchenOrderStatus } from '@/hooks/use-kitchen-orders';
import { KitchenOrderTimer } from './kitchen-order-timer';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useTranslation } from '@/lib/i18n';

// =============================================================================
// Types
// =============================================================================

interface KitchenOrderCardProps {
    order: KitchenOrder;
    onStatusChange: (orderId: string, newStatus: KitchenOrderStatus) => Promise<boolean>;
}

// =============================================================================
// Styling Constants (no i18n needed)
// =============================================================================

const STATUS_STYLES: Record<KitchenOrderStatus, {
    badgeColor: string;
    badgeBg: string;
    cardBg: string;
    borderColor: string;
    icon: typeof Clock;
}> = {
    PENDING: {
        badgeColor: 'text-yellow-700',
        badgeBg: 'bg-yellow-100',
        cardBg: 'bg-yellow-50',
        borderColor: 'border-yellow-300',
        icon: Clock,
    },
    PREPARING: {
        badgeColor: 'text-orange-700',
        badgeBg: 'bg-orange-100',
        cardBg: 'bg-orange-50',
        borderColor: 'border-orange-300',
        icon: Flame,
    },
    READY: {
        badgeColor: 'text-green-700',
        badgeBg: 'bg-green-100',
        cardBg: 'bg-green-50',
        borderColor: 'border-green-300',
        icon: CheckCircle,
    },
    SERVED: {
        badgeColor: 'text-gray-600',
        badgeBg: 'bg-gray-100',
        cardBg: 'bg-gray-50',
        borderColor: 'border-gray-200',
        icon: PackageCheck,
    },
    CANCELLED: {
        badgeColor: 'text-red-600',
        badgeBg: 'bg-red-100',
        cardBg: 'bg-red-50',
        borderColor: 'border-red-200',
        icon: XCircle,
    },
};

const ORDER_TYPE_ICONS: Record<string, typeof UtensilsCrossed> = {
    DINE_IN: UtensilsCrossed,
    TAKEAWAY: ShoppingBag,
    DELIVERY: Truck,
};

const PRIORITY_STYLES: Record<string, { color: string; bgColor: string }> = {
    URGENT: { color: 'text-red-700', bgColor: 'bg-red-100' },
    HIGH: { color: 'text-orange-700', bgColor: 'bg-orange-100' },
    NORMAL: { color: 'text-gray-600', bgColor: 'bg-gray-100' },
    LOW: { color: 'text-blue-600', bgColor: 'bg-blue-50' },
};

// =============================================================================
// Component
// =============================================================================

/**
 * Kitchen order card showing order details, items, timer, and action buttons.
 *
 * Features:
 * - Color-coded border based on status
 * - Overdue detection (red border + "Lambat" badge)
 * - Running timer
 * - Context-aware action buttons
 * - Cancel with confirmation
 */
export function KitchenOrderCard({ order, onStatusChange }: KitchenOrderCardProps) {
    const { t } = useTranslation();
    const [cancelling, setCancelling] = useState(false);
    const [updating, setUpdating] = useState(false);
    const [showCancelConfirm, setShowCancelConfirm] = useState(false);

    // Status labels (i18n)
    const STATUS_LABELS: Record<KitchenOrderStatus, string> = useMemo(() => ({
        PENDING: t('pos.kitchen.statusPending'),
        PREPARING: t('pos.kitchen.statusPreparingLabel'),
        READY: t('pos.kitchen.statusReadyLabel'),
        SERVED: t('pos.kitchen.statusServedLabel'),
        CANCELLED: t('pos.kitchen.statusCancelledLabel'),
    }), [t]);

    // Order type labels (i18n)
    const ORDER_TYPE_LABELS: Record<string, string> = useMemo(() => ({
        DINE_IN: t('pos.kitchen.typeDineIn'),
        TAKEAWAY: t('pos.kitchen.typeTakeaway'),
        DELIVERY: t('pos.kitchen.typeDelivery'),
    }), [t]);

    // Priority labels (i18n)
    const PRIORITY_LABELS: Record<string, string> = useMemo(() => ({
        URGENT: t('pos.kitchen.priorityUrgent'),
        HIGH: t('pos.kitchen.priorityHigh'),
        NORMAL: t('pos.kitchen.priorityNormal'),
        LOW: t('pos.kitchen.priorityLow'),
    }), [t]);

    const statusStyle = STATUS_STYLES[order.status];
    const StatusIcon = statusStyle.icon;
    const orderTypeIcon = ORDER_TYPE_ICONS[order.orderType ?? 'DINE_IN'] ?? ORDER_TYPE_ICONS.DINE_IN;
    const OrderTypeIcon = orderTypeIcon;
    const orderTypeLabel = ORDER_TYPE_LABELS[order.orderType ?? 'DINE_IN'] ?? ORDER_TYPE_LABELS.DINE_IN;
    const priorityStyle = PRIORITY_STYLES[order.priority] ?? PRIORITY_STYLES.NORMAL;
    const priorityLabel = PRIORITY_LABELS[order.priority] ?? PRIORITY_LABELS.NORMAL;

    // Overdue detection: elapsed > estimatedMinutes * 1.5
    const isOverdue = Boolean(
        order.startedAt &&
        order.estimatedMinutes &&
        order.status !== 'SERVED' &&
        order.status !== 'CANCELLED' &&
        (Date.now() - new Date(order.startedAt).getTime()) > order.estimatedMinutes * 1.5 * 60 * 1000
    );

    const handleStatusChange = async (newStatus: KitchenOrderStatus) => {
        setUpdating(true);
        try {
            await onStatusChange(order.id, newStatus);
        } finally {
            setUpdating(false);
        }
    };

    const handleCancel = async () => {
        setCancelling(true);
        try {
            await onStatusChange(order.id, 'CANCELLED');
        } finally {
            setCancelling(false);
        }
    };

    return (
        <div
            className={`relative rounded-xl border-2 p-4 transition-all ${isOverdue
                ? 'border-red-500 bg-red-50 shadow-red-100'
                : statusStyle.borderColor
                } ${statusStyle.cardBg} shadow-sm hover:shadow-md`}
        >
            {/* Header: Order number + Status badge */}
            <div className="flex items-start justify-between mb-3">
                <div>
                    <div className="flex items-center gap-2">
                        <h3 className="text-lg font-bold text-gray-900">
                            #{String(order.orderNumber).padStart(4, '0')}
                        </h3>
                        {order.priority !== 'NORMAL' && (
                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${priorityStyle.bgColor} ${priorityStyle.color}`}>
                                {priorityLabel}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                        <OrderTypeIcon className="h-3.5 w-3.5 text-gray-400" />
                        <span className="text-xs text-gray-500">
                            {orderTypeLabel}
                        </span>
                        {order.tableNumber && (
                            <>
                                <span className="text-gray-300">•</span>
                                <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">
                                    <MapPin className="h-3 w-3" />
                                    {t('pos.kitchen.tableLabel')?.replace('{number}', String(order.tableNumber))}
                                    {order.tableName && <span className="text-purple-500">({order.tableName})</span>}
                                </span>
                            </>
                        )}
                        {order.tableZone && !order.tableNumber && (
                            <>
                                <span className="text-gray-300">•</span>
                                <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                                    <MapPin className="h-3 w-3" />
                                    {order.tableZone}
                                </span>
                            </>
                        )}
                        {order.station && (
                            <>
                                <span className="text-gray-300">•</span>
                                <span className="text-xs text-gray-500">{order.station.name}</span>
                            </>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {isOverdue && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold text-white animate-pulse">
                            <AlertTriangle className="h-3 w-3" />
                            {t('pos.kitchen.overdue')}
                        </span>
                    )}
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyle.badgeBg} ${statusStyle.badgeColor}`}>
                        <StatusIcon className="h-3.5 w-3.5" />
                        {STATUS_LABELS[order.status]}
                    </span>
                </div>
            </div>

            {/* Items list */}
            <div className="space-y-1.5 mb-3">
                {order.items.map((item) => (
                    <div key={item.id} className="flex items-start gap-2 text-sm">
                        <span className="font-semibold text-gray-700 min-w-[2rem]">
                            {item.quantity}x
                        </span>
                        <div className="flex-1">
                            <span className="text-gray-800">{item.productName}</span>
                            {item.notes && (
                                <div className="flex items-center gap-1 mt-0.5">
                                    <ChevronRight className="h-3 w-3 text-gray-400 flex-shrink-0" />
                                    <span className="text-xs text-gray-500 italic">{item.notes}</span>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Order notes */}
            {order.notes && (
                <div className="flex items-start gap-1.5 mb-3 rounded-lg bg-white/60 px-2.5 py-1.5">
                    <StickyNote className="h-3.5 w-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
                    <span className="text-xs text-gray-600">{order.notes}</span>
                </div>
            )}

            {/* Timer */}
            <div className="mb-3">
                <KitchenOrderTimer
                    startTime={order.startedAt}
                    estimatedMinutes={order.estimatedMinutes}
                    isTerminal={order.status === 'SERVED' || order.status === 'CANCELLED'}
                    size="md"
                />
            </div>

            {/* Action buttons */}
            <div className="flex gap-2">
                {order.status === 'PENDING' && (
                    <button
                        onClick={() => handleStatusChange('PREPARING')}
                        disabled={updating}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-orange-500 px-3 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-orange-600 disabled:opacity-50 transition-colors"
                    >
                        <Flame className="h-4 w-4" />
                        {updating ? t('pos.kitchen.waiting') : t('pos.kitchen.startPreparing')}
                    </button>
                )}

                {order.status === 'PREPARING' && (
                    <button
                        onClick={() => handleStatusChange('READY')}
                        disabled={updating}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-green-500 px-3 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-green-600 disabled:opacity-50 transition-colors"
                    >
                        <CheckCircle className="h-4 w-4" />
                        {updating ? t('pos.kitchen.waiting') : t('pos.kitchen.readyToPick')}
                    </button>
                )}

                {order.status === 'READY' && (
                    <button
                        onClick={() => handleStatusChange('SERVED')}
                        disabled={updating}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-blue-500 px-3 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-600 disabled:opacity-50 transition-colors"
                    >
                        <PackageCheck className="h-4 w-4" />
                        {updating ? t('pos.kitchen.waiting') : t('pos.kitchen.pickedUp')}
                    </button>
                )}

                {/* Cancel button for PENDING/PREPARING */}
                {(order.status === 'PENDING' || order.status === 'PREPARING') && (
                    <button
                        onClick={() => setShowCancelConfirm(true)}
                        disabled={cancelling}
                        className="inline-flex items-center justify-center gap-1 rounded-lg border border-red-300 bg-white px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors"
                    >
                        <X className="h-4 w-4" />
                        {cancelling ? '...' : t('pos.kitchen.cancel')}
                    </button>
                )}
            </div>

            {/* Cancel Confirm Dialog */}
            <ConfirmDialog
                isOpen={showCancelConfirm}
                onClose={() => setShowCancelConfirm(false)}
                onConfirm={async () => {
                    setShowCancelConfirm(false);
                    await handleCancel();
                }}
                title={t('pos.kitchen.cancelTitle')}
                message={t('pos.kitchen.cancelConfirm')}
                variant="danger"
            />
        </div>
    );
}
