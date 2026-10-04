'use client';

/**
 * POS Offline Mode — Offline Indicator Component
 *
 * Banner yang menampilkan status koneksi POS terminal.
 * 4状态: online (hidden/small dot), offline (yellow), syncing (blue), error (red).
 * Posisi: fixed di top POS terminal area.
 *
 * Ref: plans/pos-offline-mode-architecture.md Section 8
 */

import { useState } from 'react';
import {
    WifiOff,
    RefreshCw,
    AlertTriangle,
    CheckCircle2,
    X,
} from 'lucide-react';
import { usePosOffline } from '@/hooks/use-pos-offline';
import { useTranslation } from '@/lib/i18n';

// =============================================================================
// Types
// =============================================================================

interface OfflineIndicatorProps {
    /** Custom class name for the container */
    className?: string;
}

// =============================================================================
// Component
// =============================================================================

/**
 * Offline indicator banner for POS terminal.
 *
 * Shows different states:
 * - **Online**: Small green dot (minimal, non-intrusive)
 * - **Offline**: Yellow/orange banner with message
 * - **Syncing**: Blue banner with progress info
 * - **Error**: Red banner with retry button
 */
export function OfflineIndicator({ className = '' }: OfflineIndicatorProps) {
    const { t } = useTranslation();
    const {
        isOnline,
        syncStatus,
        pendingCount,
        initialized,
        syncNow,
        retryFailedSyncOperations,
    } = usePosOffline();

    const [dismissed, setDismissed] = useState(false);

    // Don't render until initialized
    if (!initialized) return null;

    // -------------------------------------------------------------------------
    // State: Online (small green dot)
    // -------------------------------------------------------------------------
    if (isOnline && syncStatus.syncingCount === 0 && syncStatus.failedCount === 0) {
        return (
            <div
                className={`flex items-center gap-1.5 px-2 py-1 text-xs text-green-700 bg-green-50 border-b border-green-200 ${className}`}
            >
                <CheckCircle2 className="h-3 w-3" />
                <span className="font-medium">{t('pos.offlineIndicator.online')}</span>
            </div>
        );
    }

    // -------------------------------------------------------------------------
    // State: Syncing (blue banner)
    // -------------------------------------------------------------------------
    if (syncStatus.syncingCount > 0) {
        return (
            <div
                className={`flex items-center justify-between px-3 py-2 text-sm text-blue-800 bg-blue-50 border-b border-blue-200 ${className}`}
            >
                <div className="flex items-center gap-2">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span className="font-medium">
                        {t('pos.offlineIndicator.syncing').replace('{count}', String(syncStatus.syncingCount))}
                    </span>
                    {syncStatus.currentSyncItem && (
                        <span className="text-xs text-blue-600 hidden sm:inline">
                            ({syncStatus.currentSyncItem})
                        </span>
                    )}
                </div>
            </div>
        );
    }

    // -------------------------------------------------------------------------
    // State: Error (red banner) — failed sync operations while offline
    // -------------------------------------------------------------------------
    if (syncStatus.failedCount > 0 && !isOnline) {
        return (
            <div
                className={`flex items-center justify-between px-3 py-2 text-sm text-red-800 bg-red-50 border-b border-red-200 ${className}`}
            >
                <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="font-medium">
                        {t('pos.offlineIndicator.syncFailedWaiting').replace('{count}', String(pendingCount))}
                    </span>
                </div>
                <button
                    onClick={() => void retryFailedSyncOperations()}
                    className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-red-700 bg-red-100 rounded hover:bg-red-200 transition-colors"
                    type="button"
                >
                    <RefreshCw className="h-3 w-3" />
                    {t('pos.offlineIndicator.retry')}
                </button>
            </div>
        );
    }

    // -------------------------------------------------------------------------
    // State: Offline (yellow/orange banner)
    // -------------------------------------------------------------------------
    if (!isOnline && !dismissed) {
        return (
            <div
                className={`flex items-center justify-between px-3 py-2 text-sm text-amber-800 bg-amber-50 border-b border-amber-200 ${className}`}
            >
                <div className="flex items-center gap-2">
                    <WifiOff className="h-4 w-4" />
                    <span className="font-medium">
                        {t('pos.offlineIndicator.offlineMode')}
                    </span>
                    {pendingCount > 0 && (
                        <span className="inline-flex items-center px-1.5 py-0.5 text-xs font-semibold text-amber-700 bg-amber-100 rounded-full">
                            {t('pos.offlineIndicator.pendingBadge').replace('{count}', String(pendingCount))}
                        </span>
                    )}
                </div>
                <button
                    onClick={() => setDismissed(true)}
                    className="p-1 text-amber-600 hover:text-amber-800 hover:bg-amber-100 rounded transition-colors"
                    type="button"
                    aria-label={t('pos.offlineIndicator.dismiss')}
                >
                    <X className="h-4 w-4" />
                </button>
            </div>
        );
    }

    // -------------------------------------------------------------------------
    // State: Error without offline (failed items while online)
    // -------------------------------------------------------------------------
    if (syncStatus.failedCount > 0 && isOnline) {
        return (
            <div
                className={`flex items-center justify-between px-3 py-2 text-sm text-red-800 bg-red-50 border-b border-red-200 ${className}`}
            >
                <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="font-medium">
                        {t('pos.offlineIndicator.failedCount').replace('{count}', String(syncStatus.failedCount))}
                    </span>
                </div>
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => void retryFailedSyncOperations()}
                        className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-red-700 bg-red-100 rounded hover:bg-red-200 transition-colors"
                        type="button"
                    >
                        <RefreshCw className="h-3 w-3" />
                        {t('pos.offlineIndicator.retry')}
                    </button>
                    <button
                        onClick={() => setDismissed(true)}
                        className="p-1 text-red-600 hover:text-red-800 hover:bg-red-100 rounded transition-colors"
                        type="button"
                        aria-label={t('pos.offlineIndicator.dismiss')}
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
            </div>
        );
    }

    return null;
}
