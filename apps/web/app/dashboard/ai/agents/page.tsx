'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    TrendingUp,
    Users,
    Package,
    Bot,
    Send,
    RefreshCw,
    AlertTriangle,
    CheckCircle,
    Clock,
    Zap,
    ArrowRight,
} from 'lucide-react';
import { useTranslation } from '@/lib/i18n';

// ─── Types ─────────────────────────────────────────────────────────────────

interface AgentAction {
    id: string;
    label: string;
}

interface AgentInfo {
    name: string;
    label: string;
    icon: string;
    status: string;
    description: string;
    actions: AgentAction[];
}

interface AgentSuggestion {
    agent: string;
    action: string;
    label: string;
    description: string;
    priority: 'high' | 'medium' | 'low';
}

interface AgentResponse {
    success: boolean;
    agent: string;
    action: string;
    result: unknown;
    summary: string;
    timestamp: string;
    error?: string;
}

// ─── Icon Map ──────────────────────────────────────────────────────────────

const ICON_MAP: Record<string, React.ElementType> = {
    TrendingUp,
    Users,
    Package,
};

const AGENT_COLORS: Record<string, { bg: string; text: string; border: string; gradient: string }> = {
    finance: {
        bg: 'bg-green-50 dark:bg-green-900/20',
        text: 'text-green-700 dark:text-green-400',
        border: 'border-green-200 dark:border-green-800',
        gradient: 'from-green-500 to-emerald-600',
    },
    sales: {
        bg: 'bg-blue-50 dark:bg-blue-900/20',
        text: 'text-blue-700 dark:text-blue-400',
        border: 'border-blue-200 dark:border-blue-800',
        gradient: 'from-blue-500 to-indigo-600',
    },
    inventory: {
        bg: 'bg-orange-50 dark:bg-orange-900/20',
        text: 'text-orange-700 dark:text-orange-400',
        border: 'border-orange-200 dark:border-orange-800',
        gradient: 'from-orange-500 to-amber-600',
    },
};

const PRIORITY_STYLES: Record<string, string> = {
    high: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    low: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
};

// ─── Component ─────────────────────────────────────────────────────────────

export default function AgentsPage() {
    const { t } = useTranslation();
    const [agents, setAgents] = useState<AgentInfo[]>([]);
    const [suggestions, setSuggestions] = useState<AgentSuggestion[]>([]);
    const [loading, setLoading] = useState(true);
    const [query, setQuery] = useState('');
    const [selectedAgent, setSelectedAgent] = useState<string>('');
    const [selectedAction, setSelectedAction] = useState<string>('');
    const [queryLoading, setQueryLoading] = useState(false);
    const [response, setResponse] = useState<AgentResponse | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Fetch agents and suggestions
    const fetchAgents = useCallback(async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/ai/agents');
            const data = await res.json();
            if (data.success) {
                setAgents(data.agents || []);
                setSuggestions(data.suggestions || []);
            }
        } catch {
            setError(t('ai.errorLoadingAgents'));
        } finally {
            setLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [t]);

    useEffect(() => {
        fetchAgents();
    }, [fetchAgents]);

    // Execute query
    const handleQuery = async (customQuery?: string, agentOverride?: string, actionOverride?: string) => {
        const q = customQuery || query;
        if (!q.trim()) return;

        try {
            setQueryLoading(true);
            setError(null);
            setResponse(null);

            const body: Record<string, unknown> = { query: q };
            if (agentOverride || selectedAgent) body.agent = agentOverride || selectedAgent;
            if (actionOverride || selectedAction) body.action = actionOverride || selectedAction;

            const res = await fetch('/api/ai/agents', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            const data = await res.json();
            if (data.success) {
                setResponse(data);
            } else {
                setError(data.error || t('ai.errorQuery'));
            }
        } catch {
            setError(t('ai.errorQueryAgent'));
        } finally {
            setQueryLoading(false);
        }
    };

    // Quick action handler
    const handleQuickAction = (agentName: string, actionId: string) => {
        const quickQueries: Record<string, string> = {
            predict_cash_flow: 'Prediksi cash flow 30 hari ke depan',
            categorize_expense: 'Kategorikan pengeluaran listrik kantor',
            payment_reminders: 'Tampilkan reminder pembayaran yang overdue',
            financial_insights: 'Tampilkan insight keuangan bulan ini',
            win_probability: 'Analisis win probability semua deal aktif',
            lead_score: 'Skor semua lead yang ada',
            sales_forecast: 'Forecast penjualan 30 hari ke depan',
            pipeline_insights: 'Tampilkan overview pipeline',
            next_best_action: 'Saran langkah selanjutnya untuk deal aktif',
            stockout_prediction: 'Prediksi produk yang akan stockout',
            reorder_suggestion: 'Saran reorder produk',
            dead_stock: 'Deteksi produk dead stock',
            inventory_insights: 'Tampilkan insight inventory',
            demand_forecast: 'Forecast demand produk terlaris',
        };

        setQuery(quickQueries[actionId] || `Jalankan ${actionId}`);
        setSelectedAgent(agentName);
        setSelectedAction(actionId);
        handleQuery(quickQueries[actionId], agentName, actionId);
    };

    // Format result for display
    const formatResult = (result: unknown): string => {
        if (typeof result === 'string') return result;
        if (typeof result === 'object' && result !== null) {
            return JSON.stringify(result, null, 2);
        }
        return String(result);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                    {t('ai.agentsTitle')}
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                    {t('ai.agentsSubtitle')}
                </p>
            </div>

            {/* Agent Cards */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {loading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="animate-pulse rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
                            <div className="mb-4 h-12 w-12 rounded-lg bg-gray-200 dark:bg-gray-700" />
                            <div className="mb-2 h-4 w-2/3 rounded bg-gray-200 dark:bg-gray-700" />
                            <div className="h-3 w-full rounded bg-gray-200 dark:bg-gray-700" />
                        </div>
                    ))
                ) : (
                    agents.map((agent) => {
                        const Icon = ICON_MAP[agent.icon] || Bot;
                        const colors = AGENT_COLORS[agent.name] || AGENT_COLORS.finance;
                        return (
                            <div
                                key={agent.name}
                                className={`rounded-xl border ${colors.border} ${colors.bg} p-6 transition-shadow hover:shadow-md`}
                            >
                                <div className="mb-4 flex items-center gap-3">
                                    <div className={`flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br ${colors.gradient}`}>
                                        <Icon className="h-5 w-5 text-white" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                                            {agent.label}
                                        </h3>
                                        <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                                            <CheckCircle className="h-3 w-3" />
                                            {t('common.active')}
                                        </span>
                                    </div>
                                </div>
                                <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
                                    {agent.description}
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    {agent.actions.slice(0, 3).map((action) => (
                                        <button
                                            key={action.id}
                                            onClick={() => handleQuickAction(agent.name, action.id)}
                                            disabled={queryLoading}
                                            className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                                        >
                                            <Zap className="h-3 w-3" />
                                            {action.label}
                                        </button>
                                    ))}
                                    {agent.actions.length > 3 && (
                                        <span className="inline-flex items-center rounded-md px-2.5 py-1 text-xs text-gray-500 dark:text-gray-400">
                                            +{agent.actions.length - 3}
                                        </span>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Suggestions */}
            {suggestions.length > 0 && (
                <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
                    <h3 className="mb-4 flex items-center gap-2 font-semibold text-gray-900 dark:text-gray-100">
                        <AlertTriangle className="h-5 w-5 text-amber-500" />
                        {t('ai.suggestions')}
                    </h3>
                    <div className="space-y-3">
                        {suggestions.map((suggestion, idx) => (
                            <div
                                key={idx}
                                className="flex items-start gap-3 rounded-lg border border-gray-100 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-900"
                            >
                                <div className="mt-0.5">
                                    {suggestion.priority === 'high' ? (
                                        <AlertTriangle className="h-4 w-4 text-red-500" />
                                    ) : (
                                        <Clock className="h-4 w-4 text-yellow-500" />
                                    )}
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                            {suggestion.label}
                                        </span>
                                        <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${PRIORITY_STYLES[suggestion.priority]}`}>
                                            {suggestion.priority === 'high' ? t('ai.priorityHigh') : suggestion.priority === 'medium' ? t('ai.priorityMedium') : t('ai.priorityLow')}
                                        </span>
                                        <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600 dark:bg-gray-700 dark:text-gray-400">
                                            {suggestion.agent}
                                        </span>
                                    </div>
                                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                                        {suggestion.description}
                                    </p>
                                </div>
                                <button
                                    onClick={() => handleQuickAction(suggestion.agent, suggestion.action)}
                                    disabled={queryLoading}
                                    className="mt-1 flex-shrink-0 rounded-md bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 transition hover:bg-blue-100 disabled:opacity-50 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50"
                                >
                                    <ArrowRight className="h-3 w-3" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Query Input */}
            <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
                <h3 className="mb-4 font-semibold text-gray-900 dark:text-gray-100">
                    {t('ai.agentsTitle')}
                </h3>
                <div className="flex gap-3">
                    <div className="flex-1">
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && !queryLoading && handleQuery()}
                            placeholder={t('ai.queryPlaceholder')}
                            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 dark:placeholder-gray-400"
                            disabled={queryLoading}
                        />
                    </div>
                    <button
                        onClick={() => handleQuery()}
                        disabled={queryLoading || !query.trim()}
                        className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
                    >
                        {queryLoading ? (
                            <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                            <Send className="h-4 w-4" />
                        )}
                        {queryLoading ? t('ai.sending') : t('ai.send')}
                    </button>
                </div>
            </div>

            {/* Error */}
            {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
                    <div className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-red-500" />
                        <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
                    </div>
                </div>
            )}

            {/* Response */}
            {response && (
                <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
                    <div className="mb-4 flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-green-500" />
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                            {t('ai.queryResult')}
                        </h3>
                        <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                            {response.agent}
                        </span>
                        <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600 dark:bg-gray-700 dark:text-gray-400">
                            {response.action}
                        </span>
                    </div>

                    {/* Summary */}
                    <div className="mb-4 rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
                        <p className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">
                            {response.summary}
                        </p>
                    </div>

                    {/* Detailed Result */}
                    <details className="group">
                        <summary className="cursor-pointer text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100">
                            {t('common.view')} {t('common.description').toLowerCase()} ▸
                        </summary>
                        <pre className="mt-3 max-h-96 overflow-auto rounded-lg bg-gray-50 p-4 text-xs text-gray-700 dark:bg-gray-900 dark:text-gray-300">
                            {formatResult(response.result)}
                        </pre>
                    </details>

                    <p className="mt-3 text-xs text-gray-400">
                        {new Date(response.timestamp).toLocaleString('id-ID')}
                    </p>
                </div>
            )}
        </div>
    );
}
