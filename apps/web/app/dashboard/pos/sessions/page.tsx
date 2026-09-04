'use client'

import { useState, useEffect, useCallback } from 'react'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import { useTranslation } from '@/lib/i18n'
import { useSession } from 'next-auth/react'
import {
    Search, BookOpen, Loader2, Check, X, AlertCircle, Lock, Unlock, ArrowUpDown,
} from 'lucide-react'
import { EmptyState } from '@/components/ui/empty-state'

type Session = {
    id: string
    terminalId: string
    terminalName: string
    terminalCode: string
    cashierId: string
    cashierName: string
    status: string
    openingCash: number
    closingCash: number | null
    expectedCash: number | null
    variance: number | null
    transactionCount: number
    totalSales: number
    openedAt: string
    closedAt: string | null
    createdAt: string
}

export default function POSSessionsPage() {
    const { t } = useTranslation()
    const { data: session } = useSession()
    const canManage = session?.user?.role === 'ADMIN' || session?.user?.role === 'SUPERADMIN'

    const [sessions, setSessions] = useState<Session[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [filterStatus, setFilterStatus] = useState('all')
    const [searchQuery, setSearchQuery] = useState('')
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

    // Close session modal
    const [showCloseModal, setShowCloseModal] = useState(false)
    const [closingSessionId, setClosingSessionId] = useState<string | null>(null)
    const [closingCash, setClosingCash] = useState<number>(0)
    const [closing, setClosing] = useState(false)

    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 3000)
            return () => clearTimeout(timer)
        }
    }, [toast])

    const fetchSessions = useCallback(async () => {
        try {
            setLoading(true)
            setError(null)
            const params = new URLSearchParams()
            if (filterStatus !== 'all') params.set('status', filterStatus)
            const response = await fetch(`/api/pos/sessions?${params.toString()}`)
            const data = await response.json()
            if (data.success) {
                setSessions(data.data)
            } else {
                setError(data.error || 'Gagal memuat data sesi')
            }
        } catch {
            setError('Gagal memuat data sesi. Periksa koneksi jaringan Anda.')
        } finally {
            setLoading(false)
        }
    }, [filterStatus])

    useEffect(() => {
        fetchSessions()
    }, [fetchSessions])

    const filtered = sessions.filter((s) => {
        if (!searchQuery) return true
        const q = searchQuery.toLowerCase()
        return (
            s.terminalName.toLowerCase().includes(q) ||
            s.terminalCode.toLowerCase().includes(q) ||
            s.cashierName.toLowerCase().includes(q)
        )
    })

    const handleCloseSession = async () => {
        if (!closingSessionId) return
        setClosing(true)
        try {
            const response = await fetch(`/api/pos/sessions/${closingSessionId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ closingCash }),
            })
            const data = await response.json()
            if (data.success) {
                setToast({ message: 'Sesi berhasil ditutup', type: 'success' })
                setShowCloseModal(false)
                setClosingSessionId(null)
                setClosingCash(0)
                fetchSessions()
            } else {
                setToast({ message: data.error || 'Gagal menutup sesi', type: 'error' })
            }
        } catch {
            setToast({ message: 'Gagal menutup sesi', type: 'error' })
        } finally {
            setClosing(false)
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
                        <BookOpen className="h-6 w-6" />
                        {t('pos.sessions.title') || 'Sesi Kasir'}
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Kelola sesi kasir dan penutupan kas</p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Cari terminal atau kasir..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                    />
                </div>
                <div className="flex gap-2">
                    {['all', 'OPEN', 'CLOSED'].map((status) => (
                        <button
                            key={status}
                            onClick={() => setFilterStatus(status)}
                            className={`px-4 py-2.5 text-sm font-medium rounded-lg border transition-colors ${filterStatus === status
                                    ? 'bg-blue-600 text-white border-blue-600'
                                    : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-600'
                                }`}
                        >
                            {status === 'all' ? 'Semua' : status === 'OPEN' ? 'Aktif' : 'Tertutup'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content */}
            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                </div>
            ) : error ? (
                <div className="flex flex-col items-center justify-center h-64 text-center">
                    <AlertCircle className="h-12 w-12 text-red-400 mb-3" />
                    <p className="text-sm text-gray-500">{error}</p>
                    <button onClick={fetchSessions} className="mt-3 text-sm text-blue-600 hover:underline">Coba Lagi</button>
                </div>
            ) : filtered.length === 0 ? (
                <EmptyState icon={BookOpen} title="Belum ada sesi" description="Sesi kasir akan muncul di sini setelah dibuka." />
            ) : (
                <>
                    {/* Desktop Table */}
                    <div className="hidden md:block overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-gray-800">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Terminal</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kasir</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Uang Awal</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Penjualan</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Uang Tutup</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Selisih</th>
                                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-900">
                                {filtered.map((s) => (
                                    <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                        <td className="px-4 py-3">
                                            <div className="text-sm font-medium text-gray-900 dark:text-white">{s.terminalName}</div>
                                            <div className="text-xs text-gray-400">{s.terminalCode}</div>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{s.cashierName}</td>
                                        <td className="px-4 py-3 text-sm text-right text-gray-600 dark:text-gray-400">{formatCurrency(s.openingCash)}</td>
                                        <td className="px-4 py-3 text-sm text-right font-medium text-gray-900 dark:text-white">{formatCurrency(s.totalSales)}</td>
                                        <td className="px-4 py-3 text-sm text-right text-gray-600 dark:text-gray-400">
                                            {s.closingCash !== null ? formatCurrency(s.closingCash) : '-'}
                                        </td>
                                        <td className={`px-4 py-3 text-sm text-right font-medium ${s.variance === null ? 'text-gray-400' :
                                                s.variance === 0 ? 'text-green-600' :
                                                    'text-red-600'
                                            }`}>
                                            {s.variance !== null ? formatCurrency(s.variance) : '-'}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${s.status === 'OPEN'
                                                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                                    : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                                                }`}>
                                                {s.status === 'OPEN' ? <Unlock className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                                                {s.status === 'OPEN' ? 'Aktif' : 'Tertutup'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            {s.status === 'OPEN' && canManage && (
                                                <button
                                                    onClick={() => {
                                                        setClosingSessionId(s.id)
                                                        setClosingCash(s.totalSales + s.openingCash)
                                                        setShowCloseModal(true)
                                                    }}
                                                    className="inline-flex items-center gap-1 rounded-lg bg-orange-100 px-3 py-1.5 text-xs font-medium text-orange-700 hover:bg-orange-200 dark:bg-orange-900/30 dark:text-orange-400"
                                                >
                                                    <Lock className="h-3 w-3" />
                                                    Tutup
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile Cards */}
                    <div className="md:hidden space-y-3">
                        {filtered.map((s) => (
                            <div key={s.id} className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="font-medium text-gray-900 dark:text-white">{s.terminalName}</p>
                                        <p className="text-xs text-gray-400">{s.terminalCode} • {s.cashierName}</p>
                                    </div>
                                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${s.status === 'OPEN'
                                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                            : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                                        }`}>
                                        {s.status === 'OPEN' ? 'Aktif' : 'Tertutup'}
                                    </span>
                                </div>
                                <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                                    <div>
                                        <p className="text-gray-400 text-xs">Uang Awal</p>
                                        <p className="font-medium">{formatCurrency(s.openingCash)}</p>
                                    </div>
                                    <div>
                                        <p className="text-gray-400 text-xs">Penjualan</p>
                                        <p className="font-medium">{formatCurrency(s.totalSales)}</p>
                                    </div>
                                    <div>
                                        <p className="text-gray-400 text-xs">Uang Tutup</p>
                                        <p>{s.closingCash !== null ? formatCurrency(s.closingCash) : '-'}</p>
                                    </div>
                                    <div>
                                        <p className="text-gray-400 text-xs">Selisih</p>
                                        <p className={s.variance === null ? '' : s.variance === 0 ? 'text-green-600' : 'text-red-600'}>
                                            {s.variance !== null ? formatCurrency(s.variance) : '-'}
                                        </p>
                                    </div>
                                </div>
                                {s.status === 'OPEN' && canManage && (
                                    <button
                                        onClick={() => {
                                            setClosingSessionId(s.id)
                                            setClosingCash(s.totalSales + s.openingCash)
                                            setShowCloseModal(true)
                                        }}
                                        className="mt-3 w-full inline-flex items-center justify-center gap-1 rounded-lg bg-orange-100 px-3 py-2 text-xs font-medium text-orange-700 hover:bg-orange-200"
                                    >
                                        <Lock className="h-3 w-3" />
                                        Tutup Sesi
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </>
            )}

            {/* Close Session Modal */}
            {showCloseModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => !closing && setShowCloseModal(false)}>
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Tutup Sesi</h3>
                            {!closing && (
                                <button onClick={() => setShowCloseModal(false)} className="text-gray-400 hover:text-gray-600">
                                    <X className="h-5 w-5" />
                                </button>
                            )}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Uang Tutup (Closing Cash)</label>
                            <input
                                type="number"
                                value={closingCash || ''}
                                onChange={(e) => setClosingCash(Number(e.target.value))}
                                min="0"
                                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                            />
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowCloseModal(false)}
                                disabled={closing}
                                className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium hover:bg-gray-50 dark:border-gray-600"
                            >
                                Batal
                            </button>
                            <button
                                onClick={handleCloseSession}
                                disabled={closing}
                                className="flex-1 rounded-lg bg-orange-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-50"
                            >
                                {closing ? 'Menutup...' : 'Tutup Sesi'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
