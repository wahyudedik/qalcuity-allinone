'use client'

import { useCallback, useEffect, useState } from 'react'
import { ArrowLeftRight, CalendarClock, Plus, RotateCcw, Search } from 'lucide-react'
import { useTranslation } from '@/lib/i18n'
import { usePermission } from '@/lib/use-permission'
import { useToast } from '@/components/ui/toast'
import { EmptyState } from '@/components/ui/empty-state'
import { formatCurrencyIDR, formatDateID } from '@/lib/export'

interface LoanAssetBrief {
    assetCode: string | null
    name: string
    condition: string
}

interface LoanMemberBrief {
    code: string
    fullName: string
}

interface LoanRow {
    id: string
    assetId: string
    memberId: string
    loanDate: string
    dueDate: string
    returnedAt: string | null
    conditionAtLoan: string
    conditionAtReturn: string | null
    status: string
    notes: string | null
    returnNotes: string | null
    isOverdue: boolean
    asset: LoanAssetBrief
    member: LoanMemberBrief
}

interface LoanStats {
    active: number
    overdue: number
    returnedThisMonth: number
    total: number
}

interface AssetOption {
    id: string
    assetCode: string | null
    name: string
    category: string
    condition: string
    status: string
    acquisitionCost: number | null
    activeLoanCount: number
}

interface MemberOption {
    id: string
    code: string
    fullName: string
}

interface CreateForm {
    assetId: string
    memberId: string
    loanDate: string
    dueDate: string
    notes: string
}

const CONDITION_VALUES = ['BAIK', 'PERLU_PERBAIKAN', 'RUSAK_RINGAN', 'RUSAK_BERAT'] as const

/** Label error respons API — `error` bisa string atau { message } (handleApiError). */
function apiErrorMessage(json: Record<string, unknown> | null | undefined): string {
    const err = json?.error
    if (typeof err === 'string' && err) return err
    if (err && typeof err === 'object' && typeof (err as { message?: unknown }).message === 'string') {
        return (err as { message: string }).message
    }
    if (typeof json?.message === 'string' && json.message) return json.message
    return 'Error'
}

/** yyyy-MM-dd lokal (bukan ISO slice — hindari geser tanggal di timezone positif). */
function ymd(d: Date): string {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
}

function emptyCreateForm(): CreateForm {
    const today = new Date()
    const due = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
    return { assetId: '', memberId: '', loanDate: ymd(today), dueDate: ymd(due), notes: '' }
}

export default function CommunityLoansPage() {
    const { t } = useTranslation()
    const { addToast } = useToast()
    const { hasPermission } = usePermission()
    const canManage = hasPermission('community:manage')

    const [rows, setRows] = useState<LoanRow[]>([])
    const [loading, setLoading] = useState(true)
    const [stats, setStats] = useState<LoanStats | null>(null)

    const [search, setSearch] = useState('')
    const [debouncedSearch, setDebouncedSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState('')
    const [assetFilter, setAssetFilter] = useState('')
    const [memberFilter, setMemberFilter] = useState('')
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [total, setTotal] = useState(0)

    const [assets, setAssets] = useState<AssetOption[]>([])
    const [members, setMembers] = useState<MemberOption[]>([])

    const [createOpen, setCreateOpen] = useState(false)
    const [createForm, setCreateForm] = useState<CreateForm>(emptyCreateForm)
    const [creating, setCreating] = useState(false)

    const [returnTarget, setReturnTarget] = useState<LoanRow | null>(null)
    const [returnCondition, setReturnCondition] = useState('BAIK')
    const [returnNotes, setReturnNotes] = useState('')
    const [returning, setReturning] = useState(false)

    const [extendTarget, setExtendTarget] = useState<LoanRow | null>(null)
    const [extendDueDate, setExtendDueDate] = useState('')
    const [extending, setExtending] = useState(false)

    // Debounce search (server-side ILIKE).
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search.trim())
            setPage(1)
        }, 400)
        return () => clearTimeout(timer)
    }, [search])

    useEffect(() => {
        setPage(1)
    }, [statusFilter, assetFilter, memberFilter])

    const fetchRows = useCallback(async () => {
        try {
            setLoading(true)
            const params = new URLSearchParams({ page: String(page), limit: '20' })
            if (debouncedSearch) params.set('search', debouncedSearch)
            if (statusFilter) params.set('status', statusFilter)
            if (assetFilter) params.set('assetId', assetFilter)
            if (memberFilter) params.set('memberId', memberFilter)
            const res = await fetch(`/api/community/loans?${params.toString()}`, { credentials: 'include' })
            if (!res.ok) {
                const json = (await res.json().catch(() => null)) as Record<string, unknown> | null
                addToast(apiErrorMessage(json), 'error')
                return
            }
            const json = (await res.json()) as { data?: LoanRow[]; total?: number; totalPages?: number }
            setRows(json.data ?? [])
            setTotal(json.total ?? 0)
            setTotalPages(json.totalPages ?? 1)
        } catch {
            addToast('Error', 'error')
        } finally {
            setLoading(false)
        }
    }, [page, debouncedSearch, statusFilter, assetFilter, memberFilter, addToast])

    // Stat cards: 4 request ringan (limit=1 / returned limit=100) — total dari field `total`
    // respons list API. "Dikembalikan bulan ini" difilter client-side dari returned terbaru
    // (skala komunitas RT — puluhan record; badge per-baris tetap dihitung server-side).
    const fetchStats = useCallback(async () => {
        try {
            const read = async (url: string): Promise<{ total: number; rows: LoanRow[] }> => {
                const res = await fetch(url, { credentials: 'include' })
                if (!res.ok) return { total: 0, rows: [] }
                const json = (await res.json()) as { total?: number; data?: LoanRow[] }
                return { total: json.total ?? 0, rows: json.data ?? [] }
            }
            const [active, overdue, returned, all] = await Promise.all([
                read('/api/community/loans?status=active&limit=1'),
                read('/api/community/loans?status=overdue&limit=1'),
                read('/api/community/loans?status=returned&limit=100'),
                read('/api/community/loans?limit=1'),
            ])
            const now = new Date()
            const returnedThisMonth = returned.rows.filter((r) => {
                if (!r.returnedAt) return false
                const d = new Date(r.returnedAt)
                return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
            }).length
            setStats({ active: active.total, overdue: overdue.total, returnedThisMonth, total: all.total })
        } catch {
            // Stat cards gagal load tidak fatal — list tetap tampil.
        }
    }, [])

    const fetchAssets = useCallback(async () => {
        try {
            const res = await fetch('/api/community/assets?limit=100', { credentials: 'include' })
            if (!res.ok) return
            const json = (await res.json()) as { data?: AssetOption[] }
            setAssets(json.data ?? [])
        } catch {
            // Dropdown kosong — filter/create tetap bisa dipakai terbatas.
        }
    }, [])

    const fetchMembers = useCallback(async () => {
        try {
            const res = await fetch('/api/community/members?limit=100', { credentials: 'include' })
            if (!res.ok) return
            const json = (await res.json()) as { data?: MemberOption[] }
            setMembers(json.data ?? [])
        } catch {
            // Dropdown kosong — filter/create tetap bisa dipakai terbatas.
        }
    }, [])

    useEffect(() => {
        void fetchRows()
    }, [fetchRows])

    useEffect(() => {
        void fetchStats()
        void fetchAssets()
        void fetchMembers()
    }, [fetchStats, fetchAssets, fetchMembers])

    const refreshAll = () => {
        void fetchRows()
        void fetchStats()
        void fetchAssets()
    }

    const openCreate = () => {
        setCreateForm(emptyCreateForm())
        setCreateOpen(true)
    }

    const handleCreate = async () => {
        if (!createForm.assetId || !createForm.memberId) {
            addToast(t('community.loans.form.required'), 'error')
            return
        }
        if (createForm.dueDate < createForm.loanDate) {
            addToast(t('community.loans.form.dueBeforeLoan'), 'error')
            return
        }
        try {
            setCreating(true)
            const res = await fetch('/api/community/loans', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    assetId: createForm.assetId,
                    memberId: createForm.memberId,
                    loanDate: createForm.loanDate,
                    dueDate: createForm.dueDate,
                    notes: createForm.notes.trim() || undefined,
                }),
            })
            const json = (await res.json().catch(() => null)) as Record<string, unknown> | null
            if (!res.ok) {
                addToast(apiErrorMessage(json), 'error')
                return
            }
            addToast(t('community.loans.toast.created'), 'success')
            setCreateOpen(false)
            refreshAll()
        } catch {
            addToast('Error', 'error')
        } finally {
            setCreating(false)
        }
    }

    const openReturn = (row: LoanRow) => {
        setReturnTarget(row)
        // Default kondisi saat ini (spec §6.1) — pengurus tinggal pilih bila berubah.
        setReturnCondition(row.conditionAtLoan)
        setReturnNotes('')
    }

    const handleReturn = async () => {
        if (!returnTarget) return
        try {
            setReturning(true)
            const res = await fetch(`/api/community/loans/${returnTarget.id}/return`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    conditionAtReturn: returnCondition,
                    returnNotes: returnNotes.trim() || undefined,
                }),
            })
            const json = (await res.json().catch(() => null)) as Record<string, unknown> | null
            if (!res.ok) {
                addToast(apiErrorMessage(json), 'error')
                return
            }
            addToast(t('community.loans.toast.returned'), 'success')
            setReturnTarget(null)
            refreshAll()
        } catch {
            addToast('Error', 'error')
        } finally {
            setReturning(false)
        }
    }

    const openExtend = (row: LoanRow) => {
        setExtendTarget(row)
        setExtendDueDate(row.dueDate.slice(0, 10))
    }

    const handleExtend = async () => {
        if (!extendTarget) return
        const loanYmd = extendTarget.loanDate.slice(0, 10)
        if (extendDueDate <= loanYmd) {
            addToast(t('community.loans.form.extendAfterLoan'), 'error')
            return
        }
        try {
            setExtending(true)
            const res = await fetch(`/api/community/loans/${extendTarget.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ dueDate: extendDueDate }),
            })
            const json = (await res.json().catch(() => null)) as Record<string, unknown> | null
            if (!res.ok) {
                addToast(apiErrorMessage(json), 'error')
                return
            }
            addToast(t('community.loans.toast.extended'), 'success')
            setExtendTarget(null)
            refreshAll()
        } catch {
            addToast('Error', 'error')
        } finally {
            setExtending(false)
        }
    }

    const conditionLabel = (value: string) => {
        const map: Record<string, string> = {
            BAIK: 'community.assets.condition.baik',
            PERLU_PERBAIKAN: 'community.assets.condition.perluPerbaikan',
            RUSAK_RINGAN: 'community.assets.condition.rusakRingan',
            RUSAK_BERAT: 'community.assets.condition.rusakBerat',
        }
        return map[value] ? t(map[value]) : value
    }

    /** Badge status turunan: Terlambat (derived) > Dipinjam > Kembali. */
    const statusBadge = (row: LoanRow) => {
        if (row.status === 'RETURNED') {
            return (
                <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                    {t('community.loans.badge.returned')}
                </span>
            )
        }
        if (row.isOverdue) {
            return (
                <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400">
                    {t('community.loans.badge.overdue')}
                </span>
            )
        }
        return (
            <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                {t('community.loans.badge.active')}
            </span>
        )
    }

    const resetFilters = () => {
        setSearch('')
        setDebouncedSearch('')
        setStatusFilter('')
        setAssetFilter('')
        setMemberFilter('')
        setPage(1)
    }

    const inputClass =
        'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100'

    const hasFilter = debouncedSearch || statusFilter || assetFilter || memberFilter

    // Aset yang bisa dipinjam: AKTIF & bukan RUSAK_BERAT; yang sedang dipinjam di-disable (client-side).
    const lendableAssets = assets.filter((a) => a.status === 'AKTIF' && a.condition !== 'RUSAK_BERAT')

    if (!canManage && !hasPermission('community:view')) {
        return (
            <div className="p-6">
                <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-8 text-center dark:border-yellow-800 dark:bg-yellow-900/20">
                    <ArrowLeftRight className="mx-auto mb-3 h-10 w-10 text-yellow-500" />
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                        {t('community.loans.accessDenied.title')}
                    </h2>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                        {t('community.loans.accessDenied.desc')}
                    </p>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6 p-6">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="flex items-center gap-2 text-xl font-bold text-gray-900 dark:text-gray-100">
                        <ArrowLeftRight className="h-5 w-5" />
                        {t('community.loans.title')}
                    </h1>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t('community.loans.subtitle')}</p>
                </div>
                {canManage && (
                    <button
                        type="button"
                        onClick={openCreate}
                        className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                    >
                        <Plus className="h-4 w-4" />
                        {t('community.loans.add')}
                    </button>
                )}
            </div>

            {/* Stat cards */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                    <p className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        {t('community.loans.stat.active')}
                    </p>
                    <p className="mt-1 text-lg font-bold text-gray-900 dark:text-gray-100">{stats?.active ?? 0}</p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                    <p className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        {t('community.loans.stat.overdue')}
                    </p>
                    <p className="mt-1 text-lg font-bold text-red-600 dark:text-red-400">{stats?.overdue ?? 0}</p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                    <p className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        {t('community.loans.stat.returnedThisMonth')}
                    </p>
                    <p className="mt-1 text-lg font-bold text-gray-900 dark:text-gray-100">
                        {stats?.returnedThisMonth ?? 0}
                    </p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                    <p className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        {t('community.loans.stat.total')}
                    </p>
                    <p className="mt-1 text-lg font-bold text-gray-900 dark:text-gray-100">{stats?.total ?? 0}</p>
                </div>
            </div>

            {/* Filter + search */}
            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className={`${inputClass} sm:w-44`}
                >
                    <option value="">{t('community.loans.filter.allStatuses')}</option>
                    <option value="active">{t('community.loans.badge.active')}</option>
                    <option value="overdue">{t('community.loans.badge.overdue')}</option>
                    <option value="returned">{t('community.loans.badge.returned')}</option>
                </select>
                <select
                    value={assetFilter}
                    onChange={(e) => setAssetFilter(e.target.value)}
                    className={`${inputClass} sm:w-52`}
                >
                    <option value="">{t('community.loans.filter.allAssets')}</option>
                    {assets.map((a) => (
                        <option key={a.id} value={a.id}>
                            {a.assetCode ? `${a.assetCode} — ${a.name}` : a.name}
                        </option>
                    ))}
                </select>
                <select
                    value={memberFilter}
                    onChange={(e) => setMemberFilter(e.target.value)}
                    className={`${inputClass} sm:w-48`}
                >
                    <option value="">{t('community.loans.filter.allMembers')}</option>
                    {members.map((m) => (
                        <option key={m.id} value={m.id}>
                            {m.code} — {m.fullName}
                        </option>
                    ))}
                </select>
                <div className="relative flex-1 sm:max-w-xs">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder={t('community.loans.search.placeholder')}
                        className={`${inputClass} pl-9`}
                    />
                </div>
                {hasFilter && (
                    <button
                        type="button"
                        onClick={resetFilters}
                        className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700"
                    >
                        {t('community.loans.filter.reset')}
                    </button>
                )}
                <span className="text-sm text-gray-500 dark:text-gray-400">{total} data</span>
            </div>

            {loading ? (
                <div className="space-y-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="h-20 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-700" />
                    ))}
                </div>
            ) : rows.length === 0 ? (
                <EmptyState
                    icon={ArrowLeftRight}
                    title={t('community.loans.empty')}
                    description=""
                    actionLabel={canManage ? t('community.loans.add') : undefined}
                    onAction={canManage ? openCreate : undefined}
                />
            ) : (
                <>
                    {/* Mobile cards */}
                    <div className="space-y-3 md:hidden">
                        {rows.map((row) => (
                            <div
                                key={row.id}
                                className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800"
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                            {row.asset.assetCode ?? '-'}
                                        </p>
                                        <p className="font-medium text-gray-900 dark:text-gray-100">
                                            {row.asset.name}
                                        </p>
                                    </div>
                                    {statusBadge(row)}
                                </div>
                                <dl className="mt-2 grid grid-cols-2 gap-1 text-xs text-gray-600 dark:text-gray-300">
                                    <dt>{t('community.loans.table.member')}</dt>
                                    <dd>{`${row.member.code} — ${row.member.fullName}`}</dd>
                                    <dt>{t('community.loans.table.loanDate')}</dt>
                                    <dd>{formatDateID(row.loanDate)}</dd>
                                    <dt>{t('community.loans.table.dueDate')}</dt>
                                    <dd>{formatDateID(row.dueDate)}</dd>
                                    <dt>{t('community.loans.table.returnedAt')}</dt>
                                    <dd>{row.returnedAt ? formatDateID(row.returnedAt) : '—'}</dd>
                                    <dt>{t('community.loans.table.conditionAtReturn')}</dt>
                                    <dd>{conditionLabel(row.conditionAtReturn ?? row.conditionAtLoan)}</dd>
                                </dl>
                                {canManage && (
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        {row.status === 'ACTIVE' && (
                                            <>
                                                <button
                                                    type="button"
                                                    onClick={() => openReturn(row)}
                                                    className="inline-flex items-center gap-1 rounded-lg border border-green-300 px-3 py-1.5 text-xs text-green-700 hover:bg-green-50 dark:border-green-700 dark:text-green-400 dark:hover:bg-green-900/20"
                                                >
                                                    <RotateCcw className="h-3.5 w-3.5" />
                                                    {t('community.loans.action.return')}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => openExtend(row)}
                                                    className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                                                >
                                                    <CalendarClock className="h-3.5 w-3.5" />
                                                    {t('community.loans.action.extend')}
                                                </button>
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Desktop table */}
                    <div className="hidden overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 md:block">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900/50">
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                        {t('community.loans.table.asset')}
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                        {t('community.loans.table.member')}
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                        {t('community.loans.table.loanDate')}
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                        {t('community.loans.table.dueDate')}
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                        {t('community.loans.table.returnedAt')}
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                        {t('community.loans.table.status')}
                                    </th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                        {t('community.common.actions')}
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {rows.map((row) => (
                                    <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                                            <p className="font-mono text-xs text-gray-500 dark:text-gray-400">
                                                {row.asset.assetCode ?? '-'}
                                            </p>
                                            <p className="font-medium">{row.asset.name}</p>
                                        </td>
                                        <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                                            {`${row.member.code} — ${row.member.fullName}`}
                                        </td>
                                        <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                                            {formatDateID(row.loanDate)}
                                        </td>
                                        <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                                            {formatDateID(row.dueDate)}
                                        </td>
                                        <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                                            {row.returnedAt ? formatDateID(row.returnedAt) : '—'}
                                        </td>
                                        <td className="whitespace-nowrap px-4 py-3">{statusBadge(row)}</td>
                                        <td className="whitespace-nowrap px-4 py-3 text-right text-sm">
                                            {canManage && row.status === 'ACTIVE' && (
                                                <div className="flex items-center justify-end gap-1">
                                                    <button
                                                        type="button"
                                                        onClick={() => openReturn(row)}
                                                        className="inline-flex items-center gap-1 rounded-lg border border-green-300 px-2.5 py-1.5 text-xs text-green-700 hover:bg-green-50 dark:border-green-700 dark:text-green-400 dark:hover:bg-green-900/20"
                                                    >
                                                        <RotateCcw className="h-3.5 w-3.5" />
                                                        {t('community.loans.action.return')}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => openExtend(row)}
                                                        className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                                                    >
                                                        <CalendarClock className="h-3.5 w-3.5" />
                                                        {t('community.loans.action.extend')}
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                            <span>
                                {t('community.common.page')} {page} / {totalPages}
                            </span>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                                    disabled={page <= 1}
                                    className="rounded-lg border border-gray-300 px-3 py-1.5 disabled:opacity-50 dark:border-gray-600"
                                >
                                    {t('community.common.previous')}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                    disabled={page >= totalPages}
                                    className="rounded-lg border border-gray-300 px-3 py-1.5 disabled:opacity-50 dark:border-gray-600"
                                >
                                    {t('community.common.next')}
                                </button>
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* Modal Pinjam Aset */}
            {createOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-xl dark:bg-gray-800">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                            {t('community.loans.add')}
                        </h3>
                        <div className="mt-4 space-y-4">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                {t('community.loans.form.asset')} *
                                <select
                                    value={createForm.assetId}
                                    onChange={(e) => setCreateForm((p) => ({ ...p, assetId: e.target.value }))}
                                    className={`mt-1 ${inputClass}`}
                                >
                                    <option value="">{t('community.loans.form.selectAsset')}</option>
                                    {lendableAssets.map((a) => (
                                        <option key={a.id} value={a.id} disabled={a.activeLoanCount > 0}>
                                            {a.assetCode ? `${a.assetCode} — ${a.name}` : a.name}
                                            {a.activeLoanCount > 0
                                                ? ` (${t('community.loans.loanedOut')})`
                                                : ''}
                                        </option>
                                    ))}
                                </select>
                            </label>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                {t('community.loans.form.member')} *
                                <select
                                    value={createForm.memberId}
                                    onChange={(e) => setCreateForm((p) => ({ ...p, memberId: e.target.value }))}
                                    className={`mt-1 ${inputClass}`}
                                >
                                    <option value="">{t('community.loans.form.selectMember')}</option>
                                    {members.map((m) => (
                                        <option key={m.id} value={m.id}>
                                            {m.code} — {m.fullName}
                                        </option>
                                    ))}
                                </select>
                            </label>
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    {t('community.loans.form.loanDate')} *
                                    <input
                                        type="date"
                                        value={createForm.loanDate}
                                        onChange={(e) => setCreateForm((p) => ({ ...p, loanDate: e.target.value }))}
                                        className={`mt-1 ${inputClass}`}
                                    />
                                </label>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    {t('community.loans.form.dueDate')} *
                                    <input
                                        type="date"
                                        value={createForm.dueDate}
                                        onChange={(e) => setCreateForm((p) => ({ ...p, dueDate: e.target.value }))}
                                        className={`mt-1 ${inputClass}`}
                                    />
                                </label>
                            </div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                {t('community.loans.form.notes')}
                                <textarea
                                    value={createForm.notes}
                                    onChange={(e) => setCreateForm((p) => ({ ...p, notes: e.target.value }))}
                                    className={`mt-1 ${inputClass}`}
                                    rows={2}
                                    maxLength={500}
                                />
                            </label>
                        </div>
                        <div className="mt-6 flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setCreateOpen(false)}
                                className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                            >
                                {t('community.common.cancel')}
                            </button>
                            <button
                                type="button"
                                onClick={() => void handleCreate()}
                                disabled={creating}
                                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                            >
                                {creating ? t('community.common.saving') : t('community.common.save')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Tandai Kembali */}
            {returnTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl dark:bg-gray-800">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                            {t('community.loans.return.title')}
                        </h3>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                            {returnTarget.asset.assetCode ? `${returnTarget.asset.assetCode} — ` : ''}
                            {returnTarget.asset.name} · {returnTarget.member.fullName}
                        </p>
                        <div className="mt-4 space-y-4">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                {t('community.loans.return.condition')}
                                <select
                                    value={returnCondition}
                                    onChange={(e) => setReturnCondition(e.target.value)}
                                    className={`mt-1 ${inputClass}`}
                                >
                                    {CONDITION_VALUES.map((c) => (
                                        <option key={c} value={c}>
                                            {conditionLabel(c)}
                                        </option>
                                    ))}
                                </select>
                            </label>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                {t('community.loans.return.notes')}
                                <textarea
                                    value={returnNotes}
                                    onChange={(e) => setReturnNotes(e.target.value)}
                                    className={`mt-1 ${inputClass}`}
                                    rows={2}
                                    maxLength={500}
                                />
                            </label>
                        </div>
                        <div className="mt-6 flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setReturnTarget(null)}
                                className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                            >
                                {t('community.common.cancel')}
                            </button>
                            <button
                                type="button"
                                onClick={() => void handleReturn()}
                                disabled={returning}
                                className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                            >
                                {returning ? t('community.common.saving') : t('community.loans.return.submit')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Perpanjang */}
            {extendTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-gray-800">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                            {t('community.loans.extend.title')}
                        </h3>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                            {extendTarget.asset.assetCode ? `${extendTarget.asset.assetCode} — ` : ''}
                            {extendTarget.asset.name} · {t('community.loans.table.dueDate')}{' '}
                            {formatDateID(extendTarget.dueDate)}
                        </p>
                        <label className="mt-4 block text-sm font-medium text-gray-700 dark:text-gray-300">
                            {t('community.loans.extend.newDueDate')} *
                            <input
                                type="date"
                                value={extendDueDate}
                                onChange={(e) => setExtendDueDate(e.target.value)}
                                className={`mt-1 ${inputClass}`}
                            />
                        </label>
                        <div className="mt-6 flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setExtendTarget(null)}
                                className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                            >
                                {t('community.common.cancel')}
                            </button>
                            <button
                                type="button"
                                onClick={() => void handleExtend()}
                                disabled={extending}
                                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                            >
                                {extending ? t('community.common.saving') : t('community.loans.extend.submit')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
