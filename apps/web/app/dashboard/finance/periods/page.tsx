'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from '@/lib/i18n'
import { useSession } from 'next-auth/react'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import {
    Calendar,
    Lock,
    Unlock,
    CheckCircle,
    AlertTriangle,
    Plus,
    Search,
    ChevronRight,
    X,
    FileText,
    ArrowRight,
    RefreshCw,
    Loader2,
} from 'lucide-react'

// ============================================
// Types
// ============================================

type Period = {
    id: string
    name: string
    startDate: string
    endDate: string
    status: string
    closedBy: string | null
    closedAt: string | null
    closeNotes: string | null
    createdAt: string
}

type PeriodDetail = Period & {
    summary: {
        totalEntries: number
        postedEntries: number
        draftEntries: number
        voidEntries: number
        totalDebit: number
        totalCredit: number
    }
}

type CheckResult = {
    name: string
    status: 'pass' | 'fail' | 'warning'
    message: string
    count?: number
}

// ============================================
// Status Config
// ============================================

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
    OPEN: { label: 'Terbuka', color: 'bg-green-100 text-green-700', icon: Unlock },
    CLOSING: { label: 'Proses Tutup', color: 'bg-yellow-100 text-yellow-700', icon: Loader2 },
    CLOSED: { label: 'Ditutup', color: 'bg-gray-100 text-gray-500', icon: Lock },
}

// ============================================
// Main Component
// ============================================

export default function PeriodsPage() {
    const { t } = useTranslation()
    const { data: session } = useSession()
    const isAdmin = session?.user?.role === 'ADMIN' || session?.user?.role === 'SUPERADMIN'
    const isSuperAdmin = session?.user?.role === 'SUPERADMIN'

    const [periods, setPeriods] = useState<Period[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState('all')
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
    const [showConfirmDialog, setShowConfirmDialog] = useState(false)
    const [confirmAction, setConfirmAction] = useState<(() => Promise<void>) | null>(null)
    const [confirmMessage, setConfirmMessage] = useState('')

    // Wizard state
    const [showWizard, setShowWizard] = useState(false)
    const [wizardStep, setWizardStep] = useState(1)
    const [selectedPeriod, setSelectedPeriod] = useState<Period | null>(null)
    const [periodDetail, setPeriodDetail] = useState<PeriodDetail | null>(null)
    const [preCloseChecks, setPreCloseChecks] = useState<CheckResult[] | null>(null)
    const [closeNotes, setCloseNotes] = useState('')
    const [confirmText, setConfirmText] = useState('')
    const [closing, setClosing] = useState(false)

    // Generate periods state
    const [showGenerateForm, setShowGenerateForm] = useState(false)
    const [generateYear, setGenerateYear] = useState(new Date().getFullYear())
    const [generating, setGenerating] = useState(false)

    // Create period state
    const [showCreateForm, setShowCreateForm] = useState(false)
    const [createFormData, setCreateFormData] = useState({
        name: '',
        startDate: '',
        endDate: '',
    })

    useEffect(() => {
        fetchPeriods()
    }, [])

    // Auto-hide toast
    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 3000)
            return () => clearTimeout(timer)
        }
    }, [toast])

    const fetchPeriods = useCallback(async () => {
        try {
            setLoading(true)
            const res = await fetch('/api/finance/periods')
            const data = await res.json()
            if (data.success) {
                setPeriods(data.data)
            } else {
                setError(data.error || 'Gagal memuat data')
            }
        } catch {
            setError('Gagal memuat data periode')
        } finally {
            setLoading(false)
        }
    }, [])

    const fetchPeriodDetail = async (period: Period) => {
        try {
            const res = await fetch(`/api/finance/periods/${period.id}`)
            const data = await res.json()
            if (data.success) {
                setPeriodDetail(data.data)
            }
        } catch (error) {
            console.error('Failed to fetch period detail:', error);
        }
    }

    // ============================================
    // Generate Yearly Periods
    // ============================================

    const handleGeneratePeriods = async () => {
        try {
            setGenerating(true)
            const res = await fetch('/api/finance/periods', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ year: generateYear }),
            })
            const data = await res.json()
            if (data.success) {
                setToast({ message: data.data.message, type: 'success' })
                setShowGenerateForm(false)
                fetchPeriods()
            } else {
                setToast({ message: data.error || 'Gagal membuat periode', type: 'error' })
            }
        } catch {
            setToast({ message: 'Gagal membuat periode', type: 'error' })
        } finally {
            setGenerating(false)
        }
    }

    // ============================================
    // Create Period Manually
    // ============================================

    const handleCreatePeriod = async () => {
        try {
            const res = await fetch('/api/finance/periods', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(createFormData),
            })
            const data = await res.json()
            if (data.success) {
                setToast({ message: 'Periode berhasil dibuat', type: 'success' })
                setShowCreateForm(false)
                setCreateFormData({ name: '', startDate: '', endDate: '' })
                fetchPeriods()
            } else {
                setToast({ message: data.error || 'Gagal membuat periode', type: 'error' })
            }
        } catch {
            setToast({ message: 'Gagal membuat periode', type: 'error' })
        }
    }

    // ============================================
    // Wizard: Start Close
    // ============================================

    const startCloseWizard = async (period: Period) => {
        setSelectedPeriod(period)
        setWizardStep(1)
        setCloseNotes('')
        setConfirmText('')
        setPreCloseChecks(null)
        await fetchPeriodDetail(period)
        setShowWizard(true)
        setWizardStep(2)
    }

    // ============================================
    // Wizard: Run Pre-Close Checks
    // ============================================

    const runPreCloseChecks = async () => {
        if (!selectedPeriod) return
        try {
            const res = await fetch(`/api/finance/periods/${selectedPeriod.id}/close`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ confirmText: 'PRE_CHECK' }),
            })
            const data = await res.json()
            if (data.checks) {
                setPreCloseChecks(data.checks)
            }
        } catch {
            // Pre-checks will be re-run on actual close
        }
    }

    useEffect(() => {
        if (wizardStep === 2 && selectedPeriod) {
            runPreCloseChecks()
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [wizardStep, selectedPeriod])

    // ============================================
    // Wizard: Execute Close
    // ============================================

    const executeClose = async () => {
        if (!selectedPeriod) return
        setClosing(true)
        try {
            const res = await fetch(`/api/finance/periods/${selectedPeriod.id}/close`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    confirmText: 'CLOSE',
                    notes: closeNotes || undefined,
                }),
            })
            const data = await res.json()
            if (data.success) {
                setToast({ message: data.message || 'Periode berhasil ditutup', type: 'success' })
                setShowWizard(false)
                fetchPeriods()
            } else {
                if (data.checks) {
                    setPreCloseChecks(data.checks)
                    setToast({ message: 'Pre-close checks gagal. Silakan periksa checklist.', type: 'error' })
                } else {
                    setToast({ message: data.error || 'Gagal menutup periode', type: 'error' })
                }
            }
        } catch {
            setToast({ message: 'Gagal menutup periode', type: 'error' })
        } finally {
            setClosing(false)
        }
    }

    // ============================================
    // Wizard: Reopen Period
    // ============================================

    const handleReopen = async (period: Period) => {
        setConfirmMessage(`Apakah Anda yakin ingin membuka kembali periode "${period.name}"?`)
        setConfirmAction(() => async () => {
            try {
                const res = await fetch(`/api/finance/periods/${period.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        status: 'OPEN',
                        closeNotes: 'Dibuka kembali oleh Super Admin',
                    }),
                })
                const data = await res.json()
                if (data.success) {
                    setToast({ message: `Periode "${period.name}" berhasil dibuka kembali`, type: 'success' })
                    fetchPeriods()
                } else {
                    setToast({ message: data.error || 'Gagal membuka kembali periode', type: 'error' })
                }
            } catch {
                setToast({ message: 'Gagal membuka kembali periode', type: 'error' })
            }
        })
        setShowConfirmDialog(true)
    }

    // ============================================
    // Filtering
    // ============================================

    const filteredPeriods = periods.filter((p) => {
        if (statusFilter !== 'all' && p.status !== statusFilter) return false
        if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false
        return true
    })

    // Stats
    const openCount = periods.filter((p) => p.status === 'OPEN').length
    const closedCount = periods.filter((p) => p.status === 'CLOSED').length
    const closingCount = periods.filter((p) => p.status === 'CLOSING').length

    // ============================================
    // Render
    // ============================================

    return (
        <div className="space-y-6 p-6">
            {/* Toast */}
            {toast && (
                <div className={`fixed right-4 top-4 z-50 rounded-lg px-4 py-3 text-sm font-medium shadow-lg transition-all ${toast.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
                    {toast.message}
                </div>
            )}

            {/* Confirm Dialog */}
            <ConfirmDialog
                isOpen={showConfirmDialog}
                onClose={() => setShowConfirmDialog(false)}
                onConfirm={confirmAction || (() => Promise.resolve())}
                title="Konfirmasi"
                message={confirmMessage}
            />

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                        {t('nav.periods') || 'Periode Akuntansi'}
                    </h1>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        Kelola periode akuntansi dan tutup buku secara berkala
                    </p>
                </div>
                {isAdmin && (
                    <div className="flex gap-2">
                        <button
                            onClick={() => setShowGenerateForm(!showGenerateForm)}
                            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                        >
                            <RefreshCw className="h-4 w-4" />
                            Generate Tahunan
                        </button>
                        <button
                            onClick={() => setShowCreateForm(!showCreateForm)}
                            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                        >
                            <Plus className="h-4 w-4" />
                            Buat Periode
                        </button>
                    </div>
                )}
            </div>

            {/* Generate Form */}
            {showGenerateForm && (
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
                    <h3 className="mb-2 text-sm font-medium text-blue-800 dark:text-blue-300">
                        Generate Periode Tahunan
                    </h3>
                    <div className="flex items-center gap-4">
                        <div>
                            <label className="block text-xs text-blue-600 dark:text-blue-400">Tahun</label>
                            <input
                                type="number"
                                value={generateYear}
                                onChange={(e) => setGenerateYear(parseInt(e.target.value) || new Date().getFullYear())}
                                min={2020}
                                max={2099}
                                className="mt-1 rounded-lg border border-blue-300 bg-white px-3 py-2 text-sm dark:border-blue-700 dark:bg-gray-800"
                            />
                        </div>
                        <button
                            onClick={handleGeneratePeriods}
                            disabled={generating}
                            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                        >
                            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                            {generating ? 'Generating...' : 'Generate 12 Bulan'}
                        </button>
                        <button
                            onClick={() => setShowGenerateForm(false)}
                            className="mt-5 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
                        >
                            Batal
                        </button>
                    </div>
                </div>
            )}

            {/* Create Period Form */}
            {showCreateForm && (
                <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
                    <h3 className="mb-2 text-sm font-medium text-green-800 dark:text-green-300">
                        Buat Periode Baru
                    </h3>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                        <div>
                            <label className="block text-xs text-green-600 dark:text-green-400">Nama Periode</label>
                            <input
                                type="text"
                                value={createFormData.name}
                                onChange={(e) => setCreateFormData({ ...createFormData, name: e.target.value })}
                                placeholder="Contoh: Q1 2026"
                                className="mt-1 w-full rounded-lg border border-green-300 bg-white px-3 py-2 text-sm dark:border-green-700 dark:bg-gray-800"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-green-600 dark:text-green-400">Tanggal Mulai</label>
                            <input
                                type="date"
                                value={createFormData.startDate}
                                onChange={(e) => setCreateFormData({ ...createFormData, startDate: e.target.value })}
                                className="mt-1 w-full rounded-lg border border-green-300 bg-white px-3 py-2 text-sm dark:border-green-700 dark:bg-gray-800"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-green-600 dark:text-green-400">Tanggal Akhir</label>
                            <input
                                type="date"
                                value={createFormData.endDate}
                                onChange={(e) => setCreateFormData({ ...createFormData, endDate: e.target.value })}
                                className="mt-1 w-full rounded-lg border border-green-300 bg-white px-3 py-2 text-sm dark:border-green-700 dark:bg-gray-800"
                            />
                        </div>
                    </div>
                    <div className="mt-3 flex gap-2">
                        <button
                            onClick={handleCreatePeriod}
                            disabled={!createFormData.name || !createFormData.startDate || !createFormData.endDate}
                            className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                        >
                            <Plus className="h-4 w-4" />
                            Buat Periode
                        </button>
                        <button
                            onClick={() => setShowCreateForm(false)}
                            className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
                        >
                            Batal
                        </button>
                    </div>
                </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                    <div className="flex items-center gap-2">
                        <Unlock className="h-4 w-4 text-green-500" />
                        <span className="text-sm text-gray-500">Periode Terbuka</span>
                    </div>
                    <p className="mt-1 text-2xl font-bold text-green-600">{openCount}</p>
                </div>
                <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                    <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 text-yellow-500" />
                        <span className="text-sm text-gray-500">Sedang Proses</span>
                    </div>
                    <p className="mt-1 text-2xl font-bold text-yellow-600">{closingCount}</p>
                </div>
                <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                    <div className="flex items-center gap-2">
                        <Lock className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-500">Periode Ditutup</span>
                    </div>
                    <p className="mt-1 text-2xl font-bold text-gray-600">{closedCount}</p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Cari periode..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-sm dark:border-gray-600 dark:bg-gray-800"
                    />
                </div>
                <div className="flex gap-2">
                    {['all', 'OPEN', 'CLOSED'].map((status) => (
                        <button
                            key={status}
                            onClick={() => setStatusFilter(status)}
                            className={`rounded-lg px-3 py-2 text-sm font-medium ${statusFilter === status ? 'bg-blue-600 text-white' : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800'}`}
                        >
                            {status === 'all' ? 'Semua' : statusConfig[status]?.label || status}
                        </button>
                    ))}
                </div>
            </div>

            {/* Error State */}
            {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    {error}
                </div>
            )}

            {/* Loading State */}
            {loading && (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                </div>
            )}

            {/* Empty State */}
            {!loading && filteredPeriods.length === 0 && (
                <div className="rounded-lg border border-gray-200 bg-white py-12 text-center dark:border-gray-700 dark:bg-gray-800">
                    <Calendar className="mx-auto h-12 w-12 text-gray-300" />
                    <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-gray-100">Belum ada periode</h3>
                    <p className="mt-2 text-sm text-gray-500">
                        {isAdmin ? 'Klik "Generate Tahunan" untuk membuat periode otomatis.' : 'Belum ada periode akuntansi yang dibuat.'}
                    </p>
                </div>
            )}

            {/* Periods Table — Desktop */}
            {!loading && filteredPeriods.length > 0 && (
                <>
                    {/* Desktop Table */}
                    <div className="hidden overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 md:block">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-gray-900">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Nama Periode</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Tanggal Mulai</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Tanggal Akhir</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Status</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Ditutup Oleh</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Catatan</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {filteredPeriods.map((period) => {
                                    const cfg = statusConfig[period.status] || statusConfig.OPEN
                                    const StatusIcon = cfg.icon
                                    return (
                                        <tr key={period.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                            <td className="whitespace-nowrap px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <Calendar className="h-4 w-4 text-gray-400" />
                                                    <span className="font-medium text-gray-900 dark:text-gray-100">{period.name}</span>
                                                </div>
                                            </td>
                                            <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                                                {new Date(period.startDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                            </td>
                                            <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                                                {new Date(period.endDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                            </td>
                                            <td className="whitespace-nowrap px-6 py-4">
                                                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${cfg.color}`}>
                                                    <StatusIcon className={`h-3 w-3 ${period.status === 'CLOSING' ? 'animate-spin' : ''}`} />
                                                    {cfg.label}
                                                </span>
                                            </td>
                                            <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                                                {period.closedBy ? period.closedBy.slice(0, 8) + '...' : '-'}
                                            </td>
                                            <td className="max-w-[200px] truncate px-6 py-4 text-sm text-gray-500">
                                                {period.closeNotes || '-'}
                                            </td>
                                            <td className="whitespace-nowrap px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    {period.status === 'OPEN' && isAdmin && (
                                                        <button
                                                            onClick={() => startCloseWizard(period)}
                                                            className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100"
                                                        >
                                                            <Lock className="h-3 w-3" />
                                                            Tutup
                                                        </button>
                                                    )}
                                                    {period.status === 'CLOSED' && isSuperAdmin && (
                                                        <button
                                                            onClick={() => handleReopen(period)}
                                                            className="inline-flex items-center gap-1 rounded-lg bg-yellow-50 px-3 py-1.5 text-xs font-medium text-yellow-700 hover:bg-yellow-100"
                                                        >
                                                            <Unlock className="h-3 w-3" />
                                                            Buka Kembali
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile Cards */}
                    <div className="space-y-3 md:hidden">
                        {filteredPeriods.map((period) => {
                            const cfg = statusConfig[period.status] || statusConfig.OPEN
                            const StatusIcon = cfg.icon
                            return (
                                <div key={period.id} className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Calendar className="h-4 w-4 text-gray-400" />
                                            <span className="font-medium text-gray-900 dark:text-gray-100">{period.name}</span>
                                        </div>
                                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${cfg.color}`}>
                                            <StatusIcon className={`h-3 w-3 ${period.status === 'CLOSING' ? 'animate-spin' : ''}`} />
                                            {cfg.label}
                                        </span>
                                    </div>
                                    <div className="mt-2 grid grid-cols-2 gap-2 text-sm text-gray-500">
                                        <div>
                                            <span className="text-xs text-gray-400">Mulai:</span>{' '}
                                            {new Date(period.startDate).toLocaleDateString('id-ID')}
                                        </div>
                                        <div>
                                            <span className="text-xs text-gray-400">Akhir:</span>{' '}
                                            {new Date(period.endDate).toLocaleDateString('id-ID')}
                                        </div>
                                    </div>
                                    {period.closeNotes && (
                                        <p className="mt-2 text-xs text-gray-400 truncate">Catatan: {period.closeNotes}</p>
                                    )}
                                    <div className="mt-3 flex gap-2">
                                        {period.status === 'OPEN' && isAdmin && (
                                            <button
                                                onClick={() => startCloseWizard(period)}
                                                className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100"
                                            >
                                                <Lock className="h-3 w-3" />
                                                Tutup Periode
                                            </button>
                                        )}
                                        {period.status === 'CLOSED' && isSuperAdmin && (
                                            <button
                                                onClick={() => handleReopen(period)}
                                                className="inline-flex items-center gap-1 rounded-lg bg-yellow-50 px-3 py-1.5 text-xs font-medium text-yellow-700 hover:bg-yellow-100"
                                            >
                                                <Unlock className="h-3 w-3" />
                                                Buka Kembali
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </>
            )}

            {/* ============================================ */}
            {/* PERIOD CLOSING WIZARD MODAL */}
            {/* ============================================ */}
            {showWizard && selectedPeriod && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-2xl rounded-xl bg-white shadow-2xl dark:bg-gray-800">
                        {/* Wizard Header */}
                        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
                            <div>
                                <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                                    Period Closing Wizard
                                </h2>
                                <p className="text-sm text-gray-500">{selectedPeriod.name}</p>
                            </div>
                            <button
                                onClick={() => setShowWizard(false)}
                                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Step Indicators */}
                        <div className="flex items-center justify-center gap-2 border-b border-gray-200 px-6 py-3 dark:border-gray-700">
                            {[
                                { step: 1, label: 'Pilih Periode' },
                                { step: 2, label: 'Pre-Close Check' },
                                { step: 3, label: 'Review' },
                                { step: 4, label: 'Konfirmasi' },
                            ].map((s) => (
                                <div key={s.step} className="flex items-center gap-2">
                                    <div className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${wizardStep >= s.step ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
                                        {wizardStep > s.step ? '✓' : s.step}
                                    </div>
                                    <span className={`text-xs ${wizardStep >= s.step ? 'text-blue-600 font-medium' : 'text-gray-400'} hidden sm:inline`}>
                                        {s.label}
                                    </span>
                                    {s.step < 4 && <ChevronRight className="h-3 w-3 text-gray-300 hidden sm:block" />}
                                </div>
                            ))}
                        </div>

                        {/* Wizard Content */}
                        <div className="max-h-[60vh] overflow-y-auto px-6 py-4">
                            {/* Step 1: Period Selected (auto-advanced) */}
                            {wizardStep === 1 && (
                                <div className="text-center py-8">
                                    <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto" />
                                    <p className="mt-2 text-sm text-gray-500">Memuat data periode...</p>
                                </div>
                            )}

                            {/* Step 2: Pre-Close Checks */}
                            {wizardStep === 2 && (
                                <div className="space-y-4">
                                    <h3 className="font-medium text-gray-900 dark:text-gray-100">
                                        Pre-Close Checks
                                    </h3>
                                    {!preCloseChecks ? (
                                        <div className="flex items-center justify-center py-8">
                                            <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
                                            <span className="ml-2 text-sm text-gray-500">Menjalankan validasi...</span>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {preCloseChecks.map((check) => (
                                                <div key={check.name} className={`flex items-start gap-3 rounded-lg border p-3 ${check.status === 'fail' ? 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20' : check.status === 'warning' ? 'border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/20' : 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20'}`}>
                                                    <div className="mt-0.5">
                                                        {check.status === 'pass' && <CheckCircle className="h-5 w-5 text-green-500" />}
                                                        {check.status === 'warning' && <AlertTriangle className="h-5 w-5 text-yellow-500" />}
                                                        {check.status === 'fail' && <X className="h-5 w-5 text-red-500" />}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                                            {check.name.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                                                        </p>
                                                        <p className="text-xs text-gray-500">{check.message}</p>
                                                    </div>
                                                </div>
                                            ))}

                                            {/* Pre-close checks failed */}
                                            {preCloseChecks.some((c) => c.status === 'fail') && (
                                                <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-700 dark:bg-red-900/20 dark:text-red-400">
                                                    <strong>Close diblokir.</strong> Harap perbaiki masalah dengan status "fail" terlebih dahulu.
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Step 3: Review Summary */}
                            {wizardStep === 3 && periodDetail && (
                                <div className="space-y-4">
                                    <h3 className="font-medium text-gray-900 dark:text-gray-100">
                                        Ringkasan Periode
                                    </h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
                                            <p className="text-xs text-gray-500">Total Jurnal</p>
                                            <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{periodDetail.summary.totalEntries}</p>
                                        </div>
                                        <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
                                            <p className="text-xs text-gray-500">Jurnal POSTED</p>
                                            <p className="text-lg font-bold text-green-600">{periodDetail.summary.postedEntries}</p>
                                        </div>
                                        <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
                                            <p className="text-xs text-gray-500">Jurnal DRAFT</p>
                                            <p className="text-lg font-bold text-yellow-600">{periodDetail.summary.draftEntries}</p>
                                        </div>
                                        <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
                                            <p className="text-xs text-gray-500">Jurnal VOID</p>
                                            <p className="text-lg font-bold text-gray-400">{periodDetail.summary.voidEntries}</p>
                                        </div>
                                    </div>
                                    <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-xs text-gray-500">Total Debit</p>
                                                <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                                                    Rp {periodDetail.summary.totalDebit.toLocaleString('id-ID')}
                                                </p>
                                            </div>
                                            <ArrowRight className="h-5 w-5 text-gray-400" />
                                            <div className="text-right">
                                                <p className="text-xs text-gray-500">Total Credit</p>
                                                <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                                                    Rp {periodDetail.summary.totalCredit.toLocaleString('id-ID')}
                                                </p>
                                            </div>
                                        </div>
                                        {Math.abs(periodDetail.summary.totalDebit - periodDetail.summary.totalCredit) < 0.01 ? (
                                            <p className="mt-2 text-xs text-green-600 flex items-center gap-1">
                                                <CheckCircle className="h-3 w-3" /> Balance
                                            </p>
                                        ) : (
                                            <p className="mt-2 text-xs text-red-600 flex items-center gap-1">
                                                <AlertTriangle className="h-3 w-3" /> Tidak Balance — Selisih: Rp {Math.abs(periodDetail.summary.totalDebit - periodDetail.summary.totalCredit).toLocaleString('id-ID')}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Step 4: Confirm & Close */}
                            {wizardStep === 4 && (
                                <div className="space-y-4">
                                    <h3 className="font-medium text-gray-900 dark:text-gray-100">
                                        Konfirmasi Penutupan
                                    </h3>
                                    <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-800 dark:bg-yellow-900/20">
                                        <div className="flex items-start gap-2">
                                            <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5" />
                                            <div>
                                                <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
                                                    Peringatan: Aksi ini tidak dapat dibatalkan
                                                </p>
                                                <p className="mt-1 text-xs text-yellow-600 dark:text-yellow-400">
                                                    Periode <strong>{selectedPeriod.name}</strong> akan ditutup dan semua data di dalamnya akan dikunci.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                            Catatan (opsional)
                                        </label>
                                        <textarea
                                            value={closeNotes}
                                            onChange={(e) => setCloseNotes(e.target.value)}
                                            placeholder="Tambahkan catatan tentang penutupan periode ini..."
                                            rows={3}
                                            className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                            Ketik <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs font-mono dark:bg-gray-700">CLOSE</code> untuk konfirmasi
                                        </label>
                                        <input
                                            type="text"
                                            value={confirmText}
                                            onChange={(e) => setConfirmText(e.target.value)}
                                            placeholder="CLOSE"
                                            className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-mono dark:border-gray-600 dark:bg-gray-700"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Wizard Footer */}
                        <div className="flex items-center justify-between border-t border-gray-200 px-6 py-4 dark:border-gray-700">
                            <button
                                onClick={() => {
                                    if (wizardStep > 1) {
                                        setWizardStep(wizardStep - 1)
                                    } else {
                                        setShowWizard(false)
                                    }
                                }}
                                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                            >
                                {wizardStep > 1 ? 'Kembali' : 'Batal'}
                            </button>

                            {wizardStep < 4 ? (
                                <button
                                    onClick={() => setWizardStep(wizardStep + 1)}
                                    disabled={wizardStep === 2 && preCloseChecks?.some((c) => c.status === 'fail')}
                                    className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Selanjutnya
                                    <ChevronRight className="h-4 w-4" />
                                </button>
                            ) : (
                                <button
                                    onClick={executeClose}
                                    disabled={confirmText !== 'CLOSE' || closing}
                                    className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {closing ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            Menutup...
                                        </>
                                    ) : (
                                        <>
                                            <Lock className="h-4 w-4" />
                                            Tutup Periode
                                        </>
                                    )}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
