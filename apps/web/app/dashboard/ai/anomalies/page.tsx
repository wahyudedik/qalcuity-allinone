'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    Shield,
    RefreshCw,
    AlertTriangle,
    Search,
    Filter,
    Loader2,
    CheckCircle,
    AlertCircle,
    TrendingUp,
} from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { AnomalyList } from '@/components/ai/anomaly-list';

// ─── Types ───────────────────────────────────────────────────────────────────

type AnomalySeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
type AnomalyStatus = 'OPEN' | 'DISMISSED' | 'INVESTIGATING' | 'BLOCKED';

interface AnomalySummary {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
}

interface AnomalyData {
    id: string;
    ruleId: string;
    ruleName: string;
    severity: AnomalySeverity;
    entityType: string;
    entityId: string;
    entityDescription: string;
    message: string;
    details: Record<string, unknown>;
    suggestedActions: string[];
    detectedAt: string;
    status: AnomalyStatus;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function AnomalyDetectionPage() {
    const { t } = useTranslation();
    const [anomalies, setAnomalies] = useState<AnomalyData[]>([]);
    const [summary, setSummary] = useState<AnomalySummary>({ total: 0, critical: 0, high: 0, medium: 0, low: 0 });
    const [loading, setLoading] = useState(true);
    const [scanning, setScanning] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [filterSeverity, setFilterSeverity] = useState<AnomalySeverity | 'ALL'>('ALL');
    const [filterStatus, setFilterStatus] = useState<AnomalyStatus | 'ALL'>('ALL');
    const [scannedAt, setScannedAt] = useState<string | null>(null);
    const [scanDuration, setScanDuration] = useState<number | null>(null);

    const fetchAnomalies = useCallback(async (forceScan = false) => {
        setLoading(true);
        setError(null);

        try {
            if (forceScan) {
                setScanning(true);
                // Trigger scan first
                const scanRes = await fetch('/api/ai/anomalies', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ force: true }),
                });
                const scanData = await scanRes.json();
                if (!scanRes.ok || !scanData.success) {
                    throw new Error(scanData.error || t('ai.anomaly.errorScan'));
                }
                setAnomalies(scanData.data.anomalies);
                setSummary(scanData.data.summary);
                setScannedAt(scanData.data.scannedAt);
                setScanDuration(scanData.data.scanDuration);
                setScanning(false);
            } else {
                // Fetch existing results
                const params = new URLSearchParams();
                if (filterSeverity !== 'ALL') params.set('severity', filterSeverity);
                if (filterStatus !== 'ALL') params.set('status', filterStatus);

                const res = await fetch(`/api/ai/anomalies?${params.toString()}`);
                const data = await res.json();
                if (!res.ok || !data.success) {
                    throw new Error(data.error || t('ai.anomaly.errorLoad'));
                }
                setAnomalies(data.data.anomalies);
                setSummary(data.data.summary);
                setScannedAt(data.data.scannedAt);
                setScanDuration(data.data.scanDuration);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : t('ai.anomaly.errorGeneric'));
        } finally {
            setLoading(false);
            setScanning(false);
        }
    }, [filterSeverity, filterStatus]);

    useEffect(() => {
        fetchAnomalies();
    }, [fetchAnomalies]);

    const handleAction = async (anomalyId: string, action: 'investigate' | 'dismiss' | 'block') => {
        const statusMap: Record<string, AnomalyStatus> = {
            investigate: 'INVESTIGATING',
            dismiss: 'DISMISSED',
            block: 'BLOCKED',
        };

        // Optimistic update
        setAnomalies((prev) =>
            prev.map((a) =>
                a.id === anomalyId
                    ? { ...a, status: statusMap[action] }
                    : a
            )
        );

        try {
            const response = await fetch(`/api/ai/anomalies/${anomalyId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: statusMap[action] }),
            });

            if (!response.ok) {
                // Revert optimistic update on failure
                setAnomalies((prev) =>
                    prev.map((a) =>
                        a.id === anomalyId
                            ? { ...a, status: 'OPEN' }
                            : a
                    )
                );
                console.error('Failed to update anomaly status');
            } else {
                // Re-fetch to get accurate summary counts
                fetchAnomalies();
            }
        } catch (error) {
            // Revert on network error
            setAnomalies((prev) =>
                prev.map((a) =>
                    a.id === anomalyId
                        ? { ...a, status: 'OPEN' }
                        : a
                )
            );
            console.error('Network error updating anomaly:', error);
        }
    };

    const summaryCards = [
        { label: t('ai.anomaly.total'), value: summary.total, color: 'text-gray-900 dark:text-gray-100', bg: 'bg-gray-50 dark:bg-gray-800' },
        { label: t('ai.anomaly.critical'), value: summary.critical, color: 'text-red-700 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/20' },
        { label: t('ai.anomaly.high'), value: summary.high, color: 'text-orange-700 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-900/20' },
        { label: t('ai.anomaly.medium'), value: summary.medium, color: 'text-yellow-700 dark:text-yellow-400', bg: 'bg-yellow-50 dark:bg-yellow-900/20' },
        { label: t('ai.anomaly.low'), value: summary.low, color: 'text-blue-700 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20' },
    ];

    return (
        <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {summaryCards.map((card) => (
                    <div
                        key={card.label}
                        className={`rounded-xl border border-gray-200 p-4 dark:border-gray-700 ${card.bg}`}
                    >
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{card.label}</p>
                        <p className={`mt-1 text-2xl font-bold ${card.color}`}>{card.value}</p>
                    </div>
                ))}
            </div>

            {/* Controls */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    {/* Severity Filter */}
                    <div className="flex items-center gap-2">
                        <Filter className="h-4 w-4 text-gray-400" />
                        <select
                            value={filterSeverity}
                            onChange={(e) => setFilterSeverity(e.target.value as AnomalySeverity | 'ALL')}
                            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
                        >
                            <option value="ALL">{t('ai.allSeverity')}</option>
                            <option value="CRITICAL">{t('ai.anomaly.critical')}</option>
                            <option value="HIGH">{t('ai.anomaly.high')}</option>
                            <option value="MEDIUM">{t('ai.anomaly.medium')}</option>
                            <option value="LOW">{t('ai.anomaly.low')}</option>
                        </select>
                    </div>

                    {/* Status Filter */}
                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value as AnomalyStatus | 'ALL')}
                        className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
                    >
                        <option value="ALL">{t('ai.allStatus')}</option>
                        <option value="OPEN">{t('ai.anomaly.open')}</option>
                        <option value="INVESTIGATING">{t('ai.anomaly.investigating')}</option>
                        <option value="DISMISSED">{t('ai.anomaly.dismissed')}</option>
                        <option value="BLOCKED">{t('ai.anomaly.blocked')}</option>
                    </select>
                </div>

                <div className="flex items-center gap-3">
                    {scannedAt && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                            {t('ai.anomaly.lastScanLabel')} {new Date(scannedAt).toLocaleString('id-ID')}
                            {scanDuration && ` (${scanDuration}ms)`}
                        </span>
                    )}
                    <button
                        onClick={() => fetchAnomalies(true)}
                        disabled={scanning}
                        className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {scanning ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                {t('ai.scanning')}
                            </>
                        ) : (
                            <>
                                <RefreshCw className="h-4 w-4" />
                                {t('ai.scanNow')}
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Error */}
            {error && (
                <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {error}
                </div>
            )}

            {/* Anomaly List */}
            <AnomalyList
                anomalies={anomalies}
                onAction={handleAction}
                loading={loading}
            />
        </div>
    );
}
