'use client';

/**
 * POS Offline Mode — Sync Status Badge Component
 *
 * Badge kecil untuk area cart POS terminal yang menampilkan jumlah transaksi
 * yang belum disinkronkan. Klik untuk membuka detail sync status.
 *
 * Ref: plans/pos-offline-mode-architecture.md Section 8
 */

import { useState } from 'react';
import {
    RefreshCw,
    CloudOff,
    Cloud,
    CheckCircle2,
    AlertTriangle,
    Clock,
    X,
} from 'lucide-react';
import { usePosOffline } from '@/hooks/use-pos-offline';

// =============================================================================
// Types
// =============================================================================

interface SyncStatusBadgeProps {
    /** Custom class name for the container */
    className?: string;
}

// =============================================================================
// Component
// =============================================================================

/**
 * Small badge showing pending sync count in POS cart area.
 *
 * - Shows count of pending transactions
 * - Clicking opens a popover/modal with sync status details
 * - Different visual states based on sync status
 */
export function SyncStatusBadge({ className = '' }: SyncStatusBadgeProps) {
    const {
        isOnline,
        syncStatus,
        pendingCount,
        initialized,
        syncNow,
    } = usePosOffline();

    const [showModal, setShowModal] = useState(false);

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
    // Render Badge Button
    // -------------------------------------------------------------------------

    return (
        <div className={`relative ${className}`}>
            {/* Badge Button */}
            <button
                onClick={() => setShowModal(true)}
                className={`flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded-full transition-colors ${badgeColor} hover:opacity-80`}
                type="button"
                aria-label={`Sync status: ${pendingCount} pending`}
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
                                    Status Sinkronisasi
                                </h3>
                            </div>
                            <button
                                onClick={() => setShowModal(false)}
                                className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                                type="button"
                                aria-label="Close"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="px-4 py-3 space-y-3">
                            {/* Connection Status */}
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-gray-500">Koneksi</span>
                                <span
                                    className={`text-xs font-medium ${isOnline ? 'text-green-600' : 'text-amber-600'}`}
                                >
                                    {isOnline ? 'Online' : 'Offline'}
                                </span>
                            </div>

                            {/* Pending Count */}
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-gray-500">Menunggu sync</span>
                                <span className="text-xs font-medium text-gray-900">
                                    {pendingCount} transaksi
                                </span>
                            </div>

                            {/* Syncing Count */}
                            {isSyncing && (
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-gray-500">Sedang sync</span>
                                    <span className="text-xs font-medium text-blue-600">
                                        {syncStatus.syncingCount} transaksi
                                    </span>
                                </div>
                            )}

                            {/* Failed Count */}
                            {hasFailed && (
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-gray-500">Gagal</span>
                                    <span className="text-xs font-medium text-red-600">
                                        {syncStatus.failedCount} transaksi
                                    </span>
                                </div>
                            )}

                            {/* Last Sync */}
                            {syncStatus.lastSyncAt && (
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-gray-500">Terakhir sync</span>
                                    <span className="text-xs text-gray-700">
                                        {new Date(syncStatus.lastSyncAt).toLocaleString('id-ID', {
                                            hour: '2-digit',
                                            minute: '2-digit',
                                            day: 'numeric',
                                            month: 'short',
                                        })}
                                    </span>
                                </div>
                            )}

                            {/* Current Sync Item */}
                            {isSyncing && syncStatus.currentSyncItem && (
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-gray-500">Sedang memproses</span>
                                    <span className="text-xs text-blue-600 truncate max-w-[150px]">
                                        {syncStatus.currentSyncItem}
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
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
                                    Sync Sekarang
                                </button>
                            )}

                            {!isOnline && (
                                <div className="flex items-center gap-2 text-xs text-amber-700">
                                    <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                                    <span>
                                        Transaksi baru akan otomatis disinkronkan saat kembali online.
                                    </span>
                                </div>
                            )}

                            {isOnline && !hasPending && !hasFailed && (
                                <div className="flex items-center gap-2 text-xs text-green-700">
                                    <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                                    <span>Semua transaksi sudah tersinkronkan.</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
