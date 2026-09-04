'use client'

import { useState, useEffect, useCallback } from 'react'
import { formatCurrency } from '@/lib/utils'
import { useTranslation } from '@/lib/i18n'
import {
    Monitor, Loader2, AlertCircle, Check, RefreshCw,
    Wifi, WifiOff, Clock, DollarSign, ShoppingCart, User,
} from 'lucide-react'

// ─── Types ──────────────────────────────────────────────────────────────────

type TerminalData = {
    id: string
    name: string
    code: string
    location: string | null
    terminalStatus: string
    runtimeStatus: string
    currentCashier: string | null
    currentSessionId: string | null
    todayTransactions: number
    todaySales: number
    lastActivity: string | null
    lastOpenedAt: string | null
}

type TerminalsStatusData = {
    terminals: TerminalData[]
    summary: {
        total: number
        active: number
        idle: number
        offline: number
    }
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function TerminalsMonitorPage() {
    const { t } = useTranslation()

    const [data, setData] = useState<TerminalsStatusData | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 3000)
            return () => clearTimeout(timer)
        }
    }, [toast])

    const fetchData = useCallback(async () => {
        try {
            const response = await fetch('/api/pos/terminals/status')
            const result = await response.json()
            if (result.success) {
                setData(result.data)
                setLastUpdated(new Date())
                setError(null)
            } else {
                setError(result.error || 'Gagal memuat status terminal')
            }
        } catch {
            setError('Gagal memuat status terminal. Periksa koneksi jaringan Anda.')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchData()
        // Auto-refresh every 30 seconds
        const interval = setInterval(fetchData, 30000)
        return () => clearInterval(interval)
    }, [fetchData])

    const handleManualRefresh = useCallback(() => {
        setLoading(true)
        fetchData()
    }, [fetchData])

    const getStatusColor = (runtimeStatus: string) => {
        switch (runtimeStatus) {
            case 'ACTIVE': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
            case 'IDLE': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
            default: return 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
        }
    }

    const getStatusIcon = (runtimeStatus: string) => {
        switch (runtimeStatus) {
            case 'ACTIVE': return <Wifi className="h-4 w-4" />
            case 'IDLE': return <Clock className="h-4 w-4" />
            default: return <WifiOff className="h-4 w-4" />
        }
    }

    const getStatusLabel = (runtimeStatus: string) => {
        switch (runtimeStatus) {
            case 'ACTIVE': return t('pos.monitor.statusActive') || 'Aktif'
            case 'IDLE': return t('pos.monitor.statusIdle') || 'Idle'
            default: return t('pos.monitor.statusOffline') || 'Offline'
        }
    }

    return (
        <div className="space-y-6">
            {/* Toast */}
            {toast && (
                <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium text-white shadow-lg ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
                    {toast.type === 'success' ? <Check className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                    {toast.message}
                </div>
            )}

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Monitor className="h-6 w-6" />
                        {t('pos.monitor.title') || 'Monitor Terminal'}
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        {t('pos.monitor.subtitle') || 'Pantau semua terminal POS secara real-time'}
                    </p>
                    {lastUpdated && (
                        <p className="text-xs text-gray-400 mt-1">
                            {t('pos.monitor.lastUpdated') || 'Terakhir diperbarui'}: {lastUpdated.toLocaleTimeString('id-ID')}
                        </p>
                    )}
                </div>
                <button
                    onClick={handleManualRefresh}
                    className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
                >
                    <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    {t('common.refresh') || 'Refresh'}
                </button>
            </div>

            {loading && !data ? (
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                </div>
            ) : error && !data ? (
                <div className="flex flex-col items-center justify-center h-64 text-center">
                    <AlertCircle className="h-12 w-12 text-red-400 mb-3" />
                    <p className="text-sm text-gray-500">{error}</p>
                    <button onClick={fetchData} className="mt-3 text-sm text-blue-600 hover:underline">{t('common.tryAgain') || 'Coba Lagi'}</button>
                </div>
            ) : data && (
                <>
                    {/* Summary Cards */}
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                        <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                                    <Monitor className="h-5 w-5 text-blue-600" />
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">{t('pos.monitor.totalTerminals') || 'Total Terminal'}</p>
                                    <p className="text-xl font-bold text-gray-900 dark:text-white">{data.summary.total}</p>
                                </div>
                            </div>
                        </div>
                        <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
                                    <Wifi className="h-5 w-5 text-green-600" />
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">{t('pos.monitor.active') || 'Aktif'}</p>
                                    <p className="text-xl font-bold text-green-600">{data.summary.active}</p>
                                </div>
                            </div>
                        </div>
                        <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-100 dark:bg-yellow-900/30">
                                    <Clock className="h-5 w-5 text-yellow-600" />
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">{t('pos.monitor.idle') || 'Idle'}</p>
                                    <p className="text-xl font-bold text-yellow-600">{data.summary.idle}</p>
                                </div>
                            </div>
                        </div>
                        <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-700">
                                    <WifiOff className="h-5 w-5 text-gray-500" />
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">{t('pos.monitor.offline') || 'Offline'}</p>
                                    <p className="text-xl font-bold text-gray-500">{data.summary.offline}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Terminal Grid */}
                    {data.terminals.length > 0 ? (
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {data.terminals.map((terminal) => (
                                <TerminalCard
                                    key={terminal.id}
                                    terminal={terminal}
                                    statusColor={getStatusColor(terminal.runtimeStatus)}
                                    statusIcon={getStatusIcon(terminal.runtimeStatus)}
                                    statusLabel={getStatusLabel(terminal.runtimeStatus)}
                                    translations={{
                                        transactions: t('pos.monitor.transactions') || 'Transaksi Hari Ini',
                                        sales: t('pos.monitor.sales') || 'Penjualan Hari Ini',
                                        openedAt: t('pos.monitor.openedAt') || 'Dibuka',
                                        liveSession: t('pos.monitor.liveSession') || 'Sesi aktif',
                                    }}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-64 text-center">
                            <Monitor className="h-12 w-12 text-gray-300 mb-3" />
                            <p className="text-sm text-gray-500">{t('pos.monitor.noTerminals') || 'Belum ada terminal yang dikonfigurasi'}</p>
                        </div>
                    )}
                </>
            )}
        </div>
    )
}

// ─── Terminal Card Component ────────────────────────────────────────────────

function TerminalCard({
    terminal,
    statusColor,
    statusIcon,
    statusLabel,
    translations,
}: {
    terminal: TerminalData
    statusColor: string
    statusIcon: React.ReactNode
    statusLabel: string
    translations: {
        transactions: string
        sales: string
        openedAt: string
        liveSession: string
    }
}) {
    return (
        <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800 hover:shadow-md transition-shadow">
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
                <div>
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white">{terminal.name}</h3>
                    <p className="text-xs text-gray-400">{terminal.code}{terminal.location ? ` · ${terminal.location}` : ''}</p>
                </div>
                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${statusColor}`}>
                    {statusIcon}
                    {statusLabel}
                </span>
            </div>

            {/* Cashier Info */}
            {terminal.currentCashier && (
                <div className="flex items-center gap-2 mb-3 p-2 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                    <User className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">{terminal.currentCashier}</span>
                </div>
            )}

            {/* Stats */}
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-sm text-gray-500">
                        <ShoppingCart className="h-3.5 w-3.5" />
                        {translations.transactions}
                    </span>
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">{terminal.todayTransactions}</span>
                </div>
                <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-sm text-gray-500">
                        <DollarSign className="h-3.5 w-3.5" />
                        {translations.sales}
                    </span>
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">{formatCurrency(terminal.todaySales)}</span>
                </div>
                {terminal.lastOpenedAt && (
                    <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-sm text-gray-500">
                            <Clock className="h-3.5 w-3.5" />
                            {translations.openedAt}
                        </span>
                        <span className="text-xs text-gray-400">
                            {new Date(terminal.lastOpenedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                    </div>
                )}
            </div>

            {/* Pulse indicator for active terminals */}
            {terminal.runtimeStatus === 'ACTIVE' && (
                <div className="mt-3 flex items-center gap-2">
                    <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
                    </span>
                    <span className="text-xs text-green-600 dark:text-green-400">{translations.liveSession}</span>
                </div>
            )}
        </div>
    )
}
