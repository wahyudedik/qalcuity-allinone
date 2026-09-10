'use client';

import { useState } from 'react';
import {
    AlertTriangle,
    ChevronDown,
    ChevronRight,
    Shield,
    Eye,
    Ban,
    XCircle,
    type LucideIcon,
} from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
// NOTE: getSeverityColor & getStatusColor are inlined here (not imported from
// @/lib/ai/anomaly-detection) to avoid pulling server-only dependencies
// (nodemailer via email.ts) into the client bundle, which breaks production
// builds with "Module not found: Can't resolve 'fs'/'net'/'dns'".

// ─── Types ───────────────────────────────────────────────────────────────────

type AnomalySeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
type AnomalyStatus = 'OPEN' | 'DISMISSED' | 'INVESTIGATING' | 'BLOCKED';

// ─── Inline Color Helpers (mirrored from anomaly-detection.ts) ───────────────

function getSeverityColor(severity: AnomalySeverity): string {
    switch (severity) {
        case 'CRITICAL': return 'text-red-700 bg-red-100 dark:bg-red-900/30 dark:text-red-400';
        case 'HIGH': return 'text-orange-700 bg-orange-100 dark:bg-orange-900/30 dark:text-orange-400';
        case 'MEDIUM': return 'text-yellow-700 bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-400';
        case 'LOW': return 'text-blue-700 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400';
        default: return 'text-gray-700 bg-gray-100';
    }
}

function getStatusColor(status: AnomalyStatus): string {
    switch (status) {
        case 'OPEN': return 'text-red-700 bg-red-50 dark:bg-red-900/20 dark:text-red-400';
        case 'INVESTIGATING': return 'text-yellow-700 bg-yellow-50 dark:bg-yellow-900/20 dark:text-yellow-400';
        case 'BLOCKED': return 'text-purple-700 bg-purple-50 dark:bg-purple-900/20 dark:text-purple-400';
        case 'DISMISSED': return 'text-gray-700 bg-gray-50 dark:bg-gray-800 dark:text-gray-400';
        default: return 'text-gray-700 bg-gray-100';
    }
}

interface AnomalyItem {
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

interface AnomalyListProps {
    anomalies: AnomalyItem[];
    onAction?: (anomalyId: string, action: 'investigate' | 'dismiss' | 'block') => void;
    loading?: boolean;
    className?: string;
}

// ─── Severity Icons ──────────────────────────────────────────────────────────

const SEVERITY_ICONS: Record<AnomalySeverity, LucideIcon> = {
    CRITICAL: AlertTriangle,
    HIGH: AlertTriangle,
    MEDIUM: Shield,
    LOW: Shield,
};

// ─── Component ───────────────────────────────────────────────────────────────

export function AnomalyList({ anomalies, onAction, loading = false, className = '' }: AnomalyListProps) {
    const { t } = useTranslation();
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const toggleExpand = (id: string) => {
        setExpandedId(expandedId === id ? null : id);
    };

    if (loading) {
        return (
            <div className={`space-y-3 ${className}`}>
                {[1, 2, 3].map((i) => (
                    <div key={i} className="animate-pulse rounded-lg border border-gray-200 p-4 dark:border-gray-700">
                        <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-700" />
                            <div className="flex-1 space-y-2">
                                <div className="h-4 w-1/3 rounded bg-gray-200 dark:bg-gray-700" />
                                <div className="h-3 w-2/3 rounded bg-gray-200 dark:bg-gray-700" />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    if (anomalies.length === 0) {
        return (
            <div className={`flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 py-12 dark:border-gray-600 ${className}`}>
                <Shield className="mb-3 h-10 w-10 text-green-400" />
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t('ai.noAnomalies') || 'Tidak ada anomali terdeteksi'}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                    {t('ai.anomaly.allNormal')}
                </p>
            </div>
        );
    }

    return (
        <div className={`space-y-2 ${className}`}>
            {anomalies.map((anomaly) => {
                const isExpanded = expandedId === anomaly.id;
                const SeverityIcon = SEVERITY_ICONS[anomaly.severity] || AlertTriangle;

                return (
                    <div
                        key={anomaly.id}
                        className={`rounded-lg border transition ${anomaly.severity === 'CRITICAL'
                            ? 'border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-900/10'
                            : anomaly.severity === 'HIGH'
                                ? 'border-orange-200 bg-orange-50/50 dark:border-orange-800 dark:bg-orange-900/10'
                                : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800'
                            }`}
                    >
                        {/* Header */}
                        <div
                            className="flex cursor-pointer items-center gap-3 px-4 py-3"
                            onClick={() => toggleExpand(anomaly.id)}
                        >
                            <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${anomaly.severity === 'CRITICAL'
                                ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                                : anomaly.severity === 'HIGH'
                                    ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400'
                                    : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                                }`}>
                                <SeverityIcon className="h-4 w-4" />
                            </div>

                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${getSeverityColor(anomaly.severity)}`}>
                                        {anomaly.severity}
                                    </span>
                                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${getStatusColor(anomaly.status)}`}>
                                        {anomaly.status}
                                    </span>
                                </div>
                                <p className="mt-0.5 truncate text-sm font-medium text-gray-900 dark:text-gray-100">
                                    {anomaly.ruleName}
                                </p>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                    {anomaly.entityType}
                                </span>
                                {isExpanded ? (
                                    <ChevronDown className="h-4 w-4 text-gray-400" />
                                ) : (
                                    <ChevronRight className="h-4 w-4 text-gray-400" />
                                )}
                            </div>
                        </div>

                        {/* Expanded Details */}
                        {isExpanded && (
                            <div className="border-t border-gray-200 px-4 py-3 dark:border-gray-700">
                                <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                                    {anomaly.message}
                                </p>

                                {/* Entity Info */}
                                <div className="mb-3 rounded bg-gray-50 p-2 dark:bg-gray-900/50">
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        <span className="font-medium">{t('ai.anomaly.entity')}</span> {anomaly.entityDescription}
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        <span className="font-medium">{t('ai.anomaly.detected')}</span>{' '}
                                        {new Date(anomaly.detectedAt).toLocaleString('id-ID')}
                                    </p>
                                </div>

                                {/* Suggested Actions */}
                                {anomaly.suggestedActions.length > 0 && (
                                    <div className="mb-3">
                                        <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            {t('ai.anomaly.suggestedActions')}
                                        </p>
                                        <ul className="space-y-1">
                                            {anomaly.suggestedActions.map((action, idx) => (
                                                <li key={idx} className="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-400">
                                                    <span className="mt-0.5 text-blue-500">•</span>
                                                    {action}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {/* AI Risk Score */}
                                {anomaly.details && typeof anomaly.details === 'object' && 'aiRiskScore' in anomaly.details && (
                                    <div className="mb-3 flex items-center gap-2">
                                        <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                                            {t('ai.anomaly.riskScore')}
                                        </span>
                                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold ${(anomaly.details.aiRiskScore as number) >= 8
                                            ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                            : (anomaly.details.aiRiskScore as number) >= 5
                                                ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                                                : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                            }`}>
                                            {anomaly.details.aiRiskScore as number}/10
                                        </span>
                                    </div>
                                )}

                                {/* Action Buttons */}
                                {onAction && anomaly.status === 'OPEN' && (
                                    <div className="flex gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onAction(anomaly.id, 'investigate');
                                            }}
                                            className="flex items-center gap-1.5 rounded-lg bg-yellow-50 px-3 py-1.5 text-xs font-medium text-yellow-700 transition hover:bg-yellow-100 dark:bg-yellow-900/20 dark:text-yellow-400 dark:hover:bg-yellow-900/30"
                                        >
                                            <Eye className="h-3.5 w-3.5" />
                                            {t('ai.investigate')}
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onAction(anomaly.id, 'dismiss');
                                            }}
                                            className="flex items-center gap-1.5 rounded-lg bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
                                        >
                                            <XCircle className="h-3.5 w-3.5" />
                                            {t('ai.dismiss')}
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onAction(anomaly.id, 'block');
                                            }}
                                            className="flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30"
                                        >
                                            <Ban className="h-3.5 w-3.5" />
                                            {t('ai.block')}
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
