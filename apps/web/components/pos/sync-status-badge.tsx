'use client';

/**
 * POS Offline Mode — Sync Status Badge Component
 *
 * Badge kecil untuk area cart POS terminal yang menampilkan jumlah transaksi
 * yang belum disinkronkan. Klik untuk membuka detail sync status.
 *
 * Fitur:
 * - Status koneksi, jumlah pending/syncing/failed
 * - Daftar status per-transaksi (pending/failed) dari IndexedDB
 * - Retry manual per-transaksi untuk operasi yang gagal
 *
 * Ref: plans/pos-offline-mode-architecture.md Section 8
 */

import { useCallback, useEffect, useState } from 'react';
import {
    RefreshCw,
    CloudOff,
    Cloud,
    CheckCircle2,
    AlertTriangle,
    Clock,
    X,
    RotateCcw,
} from 'lucide-react';
import { usePosOffline } from '@/hooks/use-pos-offline';
import { useTranslation } from '@/lib/i18n';
import { getPendingTransactions, getSyncQueue } from '@/lib/pos-offline/db';
import type { PendingTransaction, SyncOperation } from '@/lib/pos-offline/types';
import { logger } from '@/lib/logger';

// =============================================================================
// Types
// =============================================================================

interface SyncStatusBadgeProps {
    /** Custom class name for the container */
    className?: string;
}

/** Per-transaction row: pending transaction + its sync operation (if any) */
interface TransactionSyncRow {
    tx: PendingTransaction;
    op: SyncOperation | null;
}

// =============================================================================
// Helpers
// =============================================================================

const CURRENCY_FORMATTER = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
});

// =============================================================================
// Component
// =============================================================================

/**
 * Small badge showing pending sync count in POS cart area.
 *
 * - Shows count of pending transactions
 * - Clicking opens a popover/modal with sync status details
 * - Per-transaction status list with manual retry for failed ops
 */
export function SyncStatusBadge({ className = '' }: SyncStatusBadgeProps) {
    const { t } = useTranslation();
    const {
        isOnline,
        syncStatus,
        pendingCount,
        initialized,
        syncNow,
        retrySyncOperation,
        retryFailedSyncOperations,
    } = usePosOffline();

    const [showModal, setShowModal] = useState(false);
    const [txRows, setTxRows] = useState<TransactionSyncRow[]>([]);
    const [loadingDetails, setLoadingDetails] = useState(false);
    const [retryingOpId, setRetryingOpId] = useState<string | null>(null);

    // -------------------------------------------------------------------------
    // Per-transaction details (loaded when modal opens)
    // -------------------------------------------------------------------------

    const loadDetails = useCallback(async () => {
        setLoadingDetails(true);
        try {
            const [txs, ops] = await Promise.all([getPendingTransactions(), getSyncQueue()]);
            const activeOps = ops.filter((op) => op.status !== 'COMPLETED');
            const rows: TransactionSyncRow[] = txs
                .filter((tx) => tx.status !== 'SYNCED')
                .map((tx) => ({
                    tx,
                    op:
                        activeOps.find(
                            (op) => op.type === 'CREATE_TRANSACTION' && op.entityId === tx.localId
                        ) ?? null,
                }));
            setTxRows(rows);
        } catch (error) {
            logger.error('[POS-SyncBadge] Failed to load pending transaction details:', error);
            setTxRows([]);
        } finally {
            setLoadingDetails(false);
        }
    }, []);

    useEffect(() => {
        if (showModal) {
            void loadDetails();
        }
    }, [showModal, loadDetails, syncStatus]);

    // -------------------------------------------------------------------------
    // Retry handlers
    // -------------------------------------------------------------------------

    const handleRetryOne = useCallback(
        async (op: SyncOperation) => {
            setRetryingOpId(op.id);
            try {
                await retrySyncOperation(op.id);
                await loadDetails();
            } finally {
                setRetryingOpId(null);
            }
        },
        [retrySyncOperation, loadDetails]
    );

    const handleRetryAllFailed = useCallback(async () => {
        await retryFailedSyncOperations();
        await loadDetails();
    }, [retryFailedSyncOperations, loadDetails]);

    // Don't render until initialized
    if (!initialized) return null;

    // -------------------------------------------------------------------------
    // Determine badge appearance
    // -------------------------------------------------------------------------

    const isSyncing = syncStatus.syncingCount > 0;
    const hasFailed = syncStatus.failedCount > 0;
    const hasPending = pendingCount > 0;

    // No badge needed if online and nothing pending
    if (!hasPending && !isSyncing && !hasFailed) {
        return null;
    }

    // -------------------------------------------------------------------------
    // Badge Color Logic
    // -------------------------------------------------------------------------

    let badgeColor = 'bg-gray-100 text-gray-600';
    let icon = <Clock className="h-3 w-3" />;

    if (!isOnline) {
        badgeColor = 'bg-amber-100 text-amber-700';
        icon = <CloudOff className="h-3 w-3" />;
    } else if (isSyncing) {
        badgeColor = 'bg-blue-100 text-blue-700';
        icon = <RefreshCw className="h-3 w-3 animate-spin" />;
    } else if (hasFailed) {
        badgeColor = 'bg-red-100 text-red-700';
        icon = <AlertTriangle className="h-3 w-3" />;
    } else if (hasPending && isOnline) {
        badgeColor = 'bg-amber-100 text-amber-700';
        icon = <Clock className="h-3 w-3" />;
    }

    // -------------------------------------------------------------------------
    // Per-transaction status label
    // -------------------------------------------------------------------------

    const statusLabel = (row: TransactionSyncRow): { text: string; className: string } => {
        const opStatus = row.op?.status;
        if (opStatus === 'FAILED' || row.tx.status === 'FAILED') {
            return { text: t('pos.syncBadge.statusFailed'), className: 'text-red-600' };
        }
        if (opStatus === 'PROCESSING' || row.tx.status === 'SYNCING') {
            return { text: t('pos.syncBadge.statusSyncing'), className: 'text-blue-600' };
        }
        return { text: t('pos.syncBadge.statusPending'), className: 'text-amber-600' };
    };

    // -------------------------------------------------------------------------
    // Render Badge Button
    // -------------------------------------------------------------------------

    return (
        <div className={`relative ${className}`}>
            {/* Badge Button */}
            <button
                onClick={() => setShowModal(true)}
                className={`flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded-full transition-colors ${badgeColor} hover:opacity-80`}
                type="button"
                aria-label={`${t('pos.syncBadge.title')}: ${pendingCount} ${t('pos.syncBadge.transactions')}`}
            >
                {icon}
                <span>{pendingCount}</span>
            </button>

            {/* -------------------------------------------------------------------------
        Sync Status Modal
      ------------------------------------------------------------------------- */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-sm mx-4 overflow-hidden">
                        {/* Header */}
                        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
                            <div className="flex items-center gap-2">
                                {isOnline ? (
                                    <Cloud className="h-5 w-5 text-blue-600" />
                                ) : (
                                    <CloudOff className="h-5 w-5 text-amber-600" />
                                )}
                                <h3 className="text-sm font-semibold text-gray-900">
                                    {t('pos.syncBadge.title')}
                                </h3>
                            </div>
                            <button
                                onClick={() => setShowModal(false)}
                                className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                                type="button"
                                aria-label={t('pos.offlineIndicator.dismiss')}
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="px-4 py-3 space-y-3">
                            {/* Connection Status */}
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-gray-500">{t('pos.syncBadge.connection')}</span>
                                <span
                                    className={`text-xs font-medium ${isOnline ? 'text-green-600' : 'text-amber-600'}`}
                                >
                                    {isOnline ? t('pos.offlineIndicator.online') : t('pos.syncBadge.offline')}
                                </span>
                            </div>

                            {/* Pending Count */}
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-gray-500">{t('pos.syncBadge.pendingLabel')}</span>
                                <span className="text-xs font-medium text-gray-900">
                                    {pendingCount} {t('pos.syncBadge.transactions')}
                                </span>
                            </div>

                            {/* Syncing Count */}
                            {isSyncing && (
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-gray-500">{t('pos.syncBadge.syncingLabel')}</span>
                                    <span className="text-xs font-medium text-blue-600">
                                        {syncStatus.syncingCount} {t('pos.syncBadge.transactions')}
                                    </span>
                                </div>
                            )}

                            {/* Failed Count */}
                            {hasFailed && (
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-gray-500">{t('pos.syncBadge.failedLabel')}</span>
                                    <span className="text-xs font-medium text-red-600">
                                        {syncStatus.failedCount} {t('pos.syncBadge.transactions')}
                                    </span>
                                </div>
                            )}

                            {/* Last Sync */}
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-gray-500">{t('pos.syncBadge.lastSync')}</span>
                                <span className="text-xs text-gray-700">
                                    {syncStatus.lastSyncAt
                                        ? new Date(syncStatus.lastSyncAt).toLocaleString('id-ID', {
                                            hour: '2-digit',
                                            minute: '2-digit',
                                            day: 'numeric',
                                            month: 'short',
                                        })
                                        : t('pos.syncBadge.lastSyncFallback')}
                                </span>
                            </div>

                            {/* Current Sync Item */}
                            {isSyncing && syncStatus.currentSyncItem && (
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-gray-500">{t('pos.syncBadge.processing')}</span>
                                    <span className="text-xs text-blue-600 truncate max-w-[150px]">
                                        {syncStatus.currentSyncItem}
                                    </span>
                                </div>
                            )}

                            {/* Per-transaction status list */}
                            <div className="border-t border-gray-100 pt-2">
                                <div className="text-xs font-medium text-gray-700 mb-1.5">
                                    {t('pos.syncBadge.pendingListTitle')}
                                </div>
                                {loadingDetails ? (
                                    <div className="text-xs text-gray-400 py-1">
                                        {t('pos.syncBadge.processing')}...
                                    </div>
                                ) : txRows.length === 0 ? (
                                    <div className="text-xs text-gray-400 py-1">
                                        {t('pos.syncBadge.noPendingList')}
                                    </div>
                                ) : (
                                    <ul className="space-y-1.5 max-h-40 overflow-y-auto">
                                        {txRows.map((row) => {
                                            const status = statusLabel(row);
                                            const isFailed =
                                                row.op?.status === 'FAILED' || row.tx.status === 'FAILED';
                                            return (
                                                <li
                                                    key={row.tx.localId}
                                                    className="flex items-center justify-between gap-2 text-xs"
                                                >
                                                    <div className="min-w-0 flex-1">
                                                        <div className="font-medium text-gray-800 truncate">
                                                            {row.tx.serverTransactionNo ??
                                                                row.tx.localId.slice(0, 12)}
                                                        </div>
                                                        <div className="text-gray-500 truncate">
                                                            {CURRENCY_FORMATTER.format(row.tx.totalAmount)}
                                                            {typeof row.op?.retryCount === 'number' &&
                                                                row.op.retryCount > 0 &&
                                                                ` · #${row.op.retryCount}`}
                                                        </div>
                                                    </div>
                                                    <span className={`flex-shrink-0 font-medium ${status.className}`}>
                                                        {status.text}
                                                    </span>
                                                    {isFailed && row.op && (
                                                        <button
                                                            onClick={() => void handleRetryOne(row.op as SyncOperation)}
                                                            disabled={retryingOpId === row.op.id}
                                                            className="flex-shrink-0 flex items-center gap-1 px-1.5 py-0.5 text-[11px] font-medium text-red-700 bg-red-50 rounded hover:bg-red-100 transition-colors disabled:opacity-50"
                                                            type="button"
                                                        >
                                                            <RotateCcw
                                                                className={`h-3 w-3 ${retryingOpId === row.op.id ? 'animate-spin' : ''}`}
                                                            />
                                                            {t('pos.offlineIndicator.retry')}
                                                        </button>
                                                    )}
                                                </li>
                                            );
                                        })}
                                    </ul>
                                )}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="px-4 py-3 border-t border-gray-200 bg-gray-50 space-y-2">
                            {isOnline && hasFailed && (
                                <button
                                    onClick={() => void handleRetryAllFailed()}
                                    className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-red-700 bg-red-100 rounded-lg hover:bg-red-200 transition-colors"
                                    type="button"
                                >
                                    <RotateCcw className="h-4 w-4" />
                                    {t('pos.offlineIndicator.retry')}
                                </button>
                            )}

                            {isOnline && (hasPending || hasFailed) && (
                                <button
                                    onClick={() => {
                                        void syncNow();
                                        setShowModal(false);
                                    }}
                                    className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                                    type="button"
                                >
                                    <RefreshCw className="h-4 w-4" />
                                    {t('pos.syncBadge.syncNow')}
                                </button>
                            )}

                            {!isOnline && (
                                <div className="flex items-center gap-2 text-xs text-amber-700">
                                    <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                                    <span>{t('pos.syncBadge.autoSyncNote')}</span>
                                </div>
                            )}

                            {isOnline && !hasPending && !hasFailed && (
                                <div className="flex items-center gap-2 text-xs text-green-700">
                                    <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                                    <span>{t('pos.syncBadge.allSynced')}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
