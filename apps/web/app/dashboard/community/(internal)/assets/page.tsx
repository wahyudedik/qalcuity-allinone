'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { ChevronDown, ChevronRight, Download, Package, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { useTranslation } from '@/lib/i18n'
import { usePermission } from '@/lib/use-permission'
import { useToast } from '@/components/ui/toast'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { EmptyState } from '@/components/ui/empty-state'
import { exportToCSV, formatCurrencyIDR, formatDateID } from '@/lib/export'

interface AssetCustodian {
    id: string
    code: string
    fullName: string
}

interface AssetRow {
    id: string
    assetCode: string | null
    name: string
    category: string
    acquisitionDate: string | null
    acquisitionCost: number | null
    condition: string
    status: string
    location: string | null
    custodianMemberId: string | null
    custodian: AssetCustodian | null
    notes: string | null
    createdAt: string
    activeLoanCount: number
}

interface AssetSummary {
    totalAssets: number
    totalAcquisitionCost: number
    totalBookValue: number
    byCategory: { category: string; count: number; totalAcquisitionCost: number | null; totalBookValue: number | null }[]
    byCondition: { condition: string; count: number }[]
    byStatus: { status: string; count: number }[]
}

interface AssetForm {
    name: string
    category: string
    condition: string
    status: string
    acquisitionDate: string
    acquisitionCost: string
    location: string
    custodianMemberId: string
    notes: string
}

const EMPTY_FORM: AssetForm = {
    name: '',
    category: 'LAINNYA',
    condition: 'BAIK',
    status: 'AKTIF',
    acquisitionDate: '',
    acquisitionCost: '',
    location: '',
    custodianMemberId: '',
    notes: '',
}

const CATEGORY_VALUES = ['ELEKTRONIK', 'PERABOT', 'KENDARAAN', 'ALAT', 'BANGUNAN', 'LAINNYA'] as const
const CONDITION_VALUES = ['BAIK', 'PERLU_PERBAIKAN', 'RUSAK_RINGAN', 'RUSAK_BERAT'] as const
const STATUS_VALUES = ['AKTIF', 'PERAWATAN', 'TIDAK_AKTIF'] as const

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

export default function CommunityAssetsPage() {
    const { t } = useTranslation()
    const { addToast } = useToast()
    const { hasPermission } = usePermission()
    const canManage = hasPermission('community:manage')

    const [rows, setRows] = useState<AssetRow[]>([])
    const [loading, setLoading] = useState(true)
    const [summary, setSummary] = useState<AssetSummary | null>(null)
    const [summaryOpen, setSummaryOpen] = useState(false)

    const [search, setSearch] = useState('')
    const [debouncedSearch, setDebouncedSearch] = useState('')
    const [categoryFilter, setCategoryFilter] = useState('')
    const [conditionFilter, setConditionFilter] = useState('')
    const [statusFilter, setStatusFilter] = useState('')
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [total, setTotal] = useState(0)

    const [formOpen, setFormOpen] = useState(false)
    const [editing, setEditing] = useState<AssetRow | null>(null)
    const [form, setForm] = useState<AssetForm>(EMPTY_FORM)
    const [saving, setSaving] = useState(false)
    const [members, setMembers] = useState<AssetCustodian[]>([])

    const [deleteTarget, setDeleteTarget] = useState<AssetRow | null>(null)
    const [deleting, setDeleting] = useState(false)

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
    }, [categoryFilter, conditionFilter, statusFilter])

    const fetchRows = useCallback(async () => {
        try {
            setLoading(true)
            const params = new URLSearchParams({ page: String(page), limit: '20' })
            if (debouncedSearch) params.set('search', debouncedSearch)
            if (categoryFilter) params.set('category', categoryFilter)
            if (conditionFilter) params.set('condition', conditionFilter)
            if (statusFilter) params.set('status', statusFilter)
            const res = await fetch(`/api/community/assets?${params.toString()}`, { credentials: 'include' })
            if (!res.ok) {
                const json = (await res.json().catch(() => null)) as Record<string, unknown> | null
                addToast(apiErrorMessage(json), 'error')
                return
            }
            const json = (await res.json()) as { data?: AssetRow[]; total?: number; totalPages?: number }
            setRows(json.data ?? [])
            setTotal(json.total ?? 0)
            setTotalPages(json.totalPages ?? 1)
        } catch {
            addToast('Error', 'error')
        } finally {
            setLoading(false)
        }
    }, [page, debouncedSearch, categoryFilter, conditionFilter, statusFilter, addToast])

    const fetchSummary = useCallback(async () => {
        try {
            const res = await fetch('/api/community/assets/summary', { credentials: 'include' })
            if (!res.ok) return
            const json = (await res.json()) as { data?: AssetSummary }
            setSummary(json.data ?? null)
        } catch {
            // Stat cards gagal load tidak fatal — list tetap tampil.
        }
    }, [])

    useEffect(() => {
        void fetchRows()
    }, [fetchRows])

    useEffect(() => {
        void fetchSummary()
    }, [fetchSummary])

    const fetchMembers = useCallback(async () => {
        try {
            const res = await fetch('/api/community/members?status=ACTIVE&limit=100', { credentials: 'include' })
            if (!res.ok) return
            const json = (await res.json()) as { data?: { id: string; code: string; fullName: string }[] }
            setMembers(json.data ?? [])
        } catch {
            // Dropdown kosong — form tetap bisa dipakai tanpa custodian.
        }
    }, [])

    const setField = (key: keyof AssetForm, value: string) => {
        setForm((prev) => ({ ...prev, [key]: value }))
    }

    const openCreate = () => {
        setEditing(null)
        setForm(EMPTY_FORM)
        setFormOpen(true)
        if (members.length === 0) void fetchMembers()
    }

    const openEdit = (row: AssetRow) => {
        setEditing(row)
        setForm({
            name: row.name,
            category: row.category,
            condition: row.condition,
            status: row.status,
            acquisitionDate: row.acquisitionDate ? row.acquisitionDate.slice(0, 10) : '',
            acquisitionCost: row.acquisitionCost != null ? String(row.acquisitionCost) : '',
            location: row.location ?? '',
            custodianMemberId: row.custodianMemberId ?? '',
            notes: row.notes ?? '',
        })
        setFormOpen(true)
        if (members.length === 0) void fetchMembers()
    }

    const handleSave = async () => {
        if (!form.name.trim()) {
            addToast(t('community.assets.field.name') + ' *', 'error')
            return
        }
        const payload: Record<string, unknown> = {
            name: form.name.trim(),
            category: form.category,
            condition: form.condition,
            status: form.status,
            location: form.location.trim() || null,
            notes: form.notes.trim() || null,
            // '' = clear custodian (PUT); create kirim undefined bila kosong.
            custodianMemberId: editing ? form.custodianMemberId : form.custodianMemberId || undefined,
        }
        if (form.acquisitionDate) payload.acquisitionDate = new Date(form.acquisitionDate).toISOString()
        if (form.acquisitionCost) payload.acquisitionCost = parseFloat(form.acquisitionCost)
        try {
            setSaving(true)
            const res = await fetch(editing ? `/api/community/assets/${editing.id}` : '/api/community/assets', {
                method: editing ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(payload),
            })
            const json = (await res.json().catch(() => null)) as Record<string, unknown> | null
            if (!res.ok) {
                addToast(apiErrorMessage(json), 'error')
                return
            }
            addToast(editing ? t('community.assets.toast.updated') : t('community.assets.toast.created'), 'success')
            setFormOpen(false)
            await fetchRows()
            await fetchSummary()
        } catch {
            addToast('Error', 'error')
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async () => {
        if (!deleteTarget) return
        try {
            setDeleting(true)
            const res = await fetch(`/api/community/assets/${deleteTarget.id}`, {
                method: 'DELETE',
                credentials: 'include',
            })
            const json = (await res.json().catch(() => null)) as Record<string, unknown> | null
            if (!res.ok) {
                addToast(apiErrorMessage(json), 'error')
                return
            }
            addToast(t('community.assets.toast.deleted'), 'success')
            setDeleteTarget(null)
            await fetchRows()
            await fetchSummary()
        } catch {
            addToast('Error', 'error')
        } finally {
            setDeleting(false)
        }
    }

    const handleExport = async () => {
        try {
            const all: AssetRow[] = []
            for (let p = 1; p <= 10; p += 1) {
                const params = new URLSearchParams({ page: String(p), limit: '100' })
                if (debouncedSearch) params.set('search', debouncedSearch)
                if (categoryFilter) params.set('category', categoryFilter)
                if (conditionFilter) params.set('condition', conditionFilter)
                if (statusFilter) params.set('status', statusFilter)
                const res = await fetch(`/api/community/assets?${params.toString()}`, { credentials: 'include' })
                if (!res.ok) break
                const json = (await res.json()) as { data?: AssetRow[]; totalPages?: number }
                all.push(...(json.data ?? []))
                if (p >= (json.totalPages ?? 1)) break
            }
            const period = new Date().toISOString().slice(0, 7)
            exportToCSV(
                all.map((r) => ({
                    assetCode: r.assetCode ?? '',
                    name: r.name,
                    category: r.category,
                    condition: r.condition,
                    status: r.status,
                    location: r.location ?? '',
                    acquisitionDate: r.acquisitionDate ? formatDateID(r.acquisitionDate) : '',
                    acquisitionCost: r.acquisitionCost ?? '',
                    custodian: r.custodian?.fullName ?? '',
                })),
                `aset-komunitas-${period}`,
                {
                    assetCode: t('community.assets.table.assetCode'),
                    name: t('community.assets.table.name'),
                    category: t('community.assets.table.category'),
                    condition: t('community.assets.table.condition'),
                    status: t('community.assets.table.status'),
                    location: t('community.assets.table.location'),
                    acquisitionDate: t('community.assets.field.acquisitionDate'),
                    acquisitionCost: t('community.assets.field.acquisitionCost'),
                    custodian: t('community.assets.table.custodian'),
                }
            )
        } catch {
            addToast('Error', 'error')
        }
    }

    const categoryLabel = (value: string) => {
        const key = `community.assets.category.${value.toLowerCase()}`
        const label = t(key)
        return label === key ? value : label
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

    const statusLabel = (value: string) => {
        const map: Record<string, string> = {
            AKTIF: 'community.assets.status.aktif',
            PERAWATAN: 'community.assets.status.perawatan',
            TIDAK_AKTIF: 'community.assets.status.tidakAktif',
        }
        return map[value] ? t(map[value]) : value
    }

    const conditionBadge = (value: string) => {
        switch (value) {
            case 'BAIK':
                return (
                    <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                        {conditionLabel(value)}
                    </span>
                )
            case 'PERLU_PERBAIKAN':
                return (
                    <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                        {conditionLabel(value)}
                    </span>
                )
            default:
                // RUSAK_RINGAN / RUSAK_BERAT → merah.
                return (
                    <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400">
                        {conditionLabel(value)}
                    </span>
                )
        }
    }

    const statusBadge = (value: string) => {
        switch (value) {
            case 'AKTIF':
                return (
                    <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                        {statusLabel(value)}
                    </span>
                )
            case 'PERAWATAN':
                return (
                    <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                        {statusLabel(value)}
                    </span>
                )
            default:
                return (
                    <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                        {statusLabel(value)}
                    </span>
                )
        }
    }

    // Badge "Dipinjam" — aset sedang dipinjam warga (spec §6.2).
    const onLoanBadge = (count: number) => {
        if (count <= 0) return null
        return (
            <span className="inline-flex items-center rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-medium text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
                {t('community.assets.onLoan')}
            </span>
        )
    }

    // Stat cards dari summary (spec §6.1) — optional-chain penuh (byStatus/byCondition bisa undefined)
    const statActive = summary?.byStatus?.find((s) => s.status === 'AKTIF')?.count ?? 0
    const statNeedRepair =
        (summary?.byCondition?.find((c) => c.condition === 'PERLU_PERBAIKAN')?.count ?? 0) +
        (summary?.byCondition?.find((c) => c.condition === 'RUSAK_RINGAN')?.count ?? 0)
    const statMaintenance = summary?.byStatus?.find((s) => s.status === 'PERAWATAN')?.count ?? 0

    const resetFilters = () => {
        setSearch('')
        setDebouncedSearch('')
        setCategoryFilter('')
        setConditionFilter('')
        setStatusFilter('')
        setPage(1)
    }

    const inputClass =
        'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100'

    const hasFilter = debouncedSearch || categoryFilter || conditionFilter || statusFilter

    const summaryByCategory = useMemo(() => summary?.byCategory ?? [], [summary])
    const summaryByCondition = useMemo(() => summary?.byCondition ?? [], [summary])

    if (!canManage && !hasPermission('community:view')) {
        return (
            <div className="p-6">
                <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-8 text-center dark:border-yellow-800 dark:bg-yellow-900/20">
                    <Package className="mx-auto mb-3 h-10 w-10 text-yellow-500" />
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                        {t('community.assets.accessDenied.title')}
                    </h2>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                        {t('community.assets.accessDenied.desc')}
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
                        <Package className="h-5 w-5" />
                        {t('community.assets.title')}
                    </h1>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t('community.assets.subtitle')}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <button
                        type="button"
                        onClick={() => void handleExport()}
                        className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                    >
                        <Download className="h-4 w-4" />
                        {t('community.common.exportCsv')}
                    </button>
                    {canManage && (
                        <button
                            type="button"
                            onClick={openCreate}
                            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                        >
                            <Plus className="h-4 w-4" />
                            {t('community.assets.add')}
                        </button>
                    )}
                </div>
            </div>

            {/* Stat cards */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                    <p className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        {t('community.assets.stat.active')}
                    </p>
                    <p className="mt-1 text-lg font-bold text-gray-900 dark:text-gray-100">{statActive}</p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                    <p className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        {t('community.assets.stat.totalCost')}
                    </p>
                    <p className="mt-1 text-lg font-bold text-gray-900 dark:text-gray-100">
                        {formatCurrencyIDR(summary?.totalAcquisitionCost ?? 0)}
                    </p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                    <p className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        {t('community.assets.stat.needRepair')}
                    </p>
                    <p className="mt-1 text-lg font-bold text-gray-900 dark:text-gray-100">{statNeedRepair}</p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                    <p className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        {t('community.assets.stat.maintenance')}
                    </p>
                    <p className="mt-1 text-lg font-bold text-gray-900 dark:text-gray-100">{statMaintenance}</p>
                </div>
            </div>

            {/* Section ringkasan collapsible */}
            {summary && (
                <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
                    <button
                        type="button"
                        onClick={() => setSummaryOpen((v) => !v)}
                        className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700/50"
                    >
                        <span>{t('community.assets.summary.title')}</span>
                        {summaryOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </button>
                    {summaryOpen && (
                        <div className="border-t border-gray-200 p-4 dark:border-gray-700">
                            {/* Nilai buku (estimasi informatif — bukan laporan akuntansi, spec §6.2) */}
                            <div className="mb-4 rounded-lg bg-gray-50 p-3 dark:bg-gray-900/30">
                                <p className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                    {t('community.assets.summary.bookValue')}
                                </p>
                                <p className="mt-1 text-lg font-bold text-gray-900 dark:text-gray-100">
                                    {formatCurrencyIDR(summary.totalBookValue ?? 0)}
                                </p>
                                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                    {t('community.assets.summary.bookValueCaption')}
                                </p>
                            </div>
                            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                                <div>
                                    <h3 className="mb-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
                                        {t('community.assets.summary.byCategory')}
                                    </h3>
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="text-left text-xs uppercase text-gray-500 dark:text-gray-400">
                                                <th className="py-1.5">{t('community.assets.table.category')}</th>
                                                <th className="py-1.5 text-right">{t('community.assets.summary.count')}</th>
                                                <th className="py-1.5 text-right">{t('community.assets.summary.totalCost')}</th>
                                                <th className="py-1.5 text-right">{t('community.assets.summary.bookValue')}</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                            {summaryByCategory.map((row) => (
                                                <tr key={row.category}>
                                                    <td className="py-1.5 text-gray-700 dark:text-gray-300">{categoryLabel(row.category)}</td>
                                                    <td className="py-1.5 text-right text-gray-700 dark:text-gray-300">{row.count}</td>
                                                    <td className="py-1.5 text-right text-gray-700 dark:text-gray-300">
                                                        {formatCurrencyIDR(row.totalAcquisitionCost ?? 0)}
                                                    </td>
                                                    <td className="py-1.5 text-right text-gray-700 dark:text-gray-300">
                                                        {formatCurrencyIDR(row.totalBookValue ?? 0)}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <div>
                                    <h3 className="mb-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
                                        {t('community.assets.summary.byCondition')}
                                    </h3>
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="text-left text-xs uppercase text-gray-500 dark:text-gray-400">
                                                <th className="py-1.5">{t('community.assets.table.condition')}</th>
                                                <th className="py-1.5 text-right">{t('community.assets.summary.count')}</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                            {summaryByCondition.map((row) => (
                                                <tr key={row.condition}>
                                                    <td className="py-1.5 text-gray-700 dark:text-gray-300">{conditionLabel(row.condition)}</td>
                                                    <td className="py-1.5 text-right text-gray-700 dark:text-gray-300">{row.count}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Filter + search */}
            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className={`${inputClass} sm:w-44`}
                >
                    <option value="">{t('community.assets.filter.allCategories')}</option>
                    {CATEGORY_VALUES.map((c) => (
                        <option key={c} value={c}>
                            {categoryLabel(c)}
                        </option>
                    ))}
                </select>
                <select
                    value={conditionFilter}
                    onChange={(e) => setConditionFilter(e.target.value)}
                    className={`${inputClass} sm:w-44`}
                >
                    <option value="">{t('community.assets.filter.allConditions')}</option>
                    {CONDITION_VALUES.map((c) => (
                        <option key={c} value={c}>
                            {conditionLabel(c)}
                        </option>
                    ))}
                </select>
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className={`${inputClass} sm:w-40`}
                >
                    <option value="">{t('community.assets.filter.allStatuses')}</option>
                    {STATUS_VALUES.map((s) => (
                        <option key={s} value={s}>
                            {statusLabel(s)}
                        </option>
                    ))}
                </select>
                <div className="relative flex-1 sm:max-w-xs">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder={t('community.assets.search.placeholder')}
                        className={`${inputClass} pl-9`}
                    />
                </div>
                {hasFilter && (
                    <button
                        type="button"
                        onClick={resetFilters}
                        className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700"
                    >
                        {t('community.assets.filter.reset')}
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
                    icon={Package}
                    title={t('community.assets.empty')}
                    description=""
                    actionLabel={canManage ? t('community.assets.add') : undefined}
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
                                        <p className="text-xs text-gray-500 dark:text-gray-400">{row.assetCode ?? '-'}</p>
                                        <p className="font-medium text-gray-900 dark:text-gray-100">{row.name}</p>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-1">
                                        {statusBadge(row.status)}
                                        {onLoanBadge(row.activeLoanCount)}
                                    </div>
                                </div>
                                <dl className="mt-2 grid grid-cols-2 gap-1 text-xs text-gray-600 dark:text-gray-300">
                                    <dt>{t('community.assets.table.category')}</dt>
                                    <dd>{categoryLabel(row.category)}</dd>
                                    <dt>{t('community.assets.table.condition')}</dt>
                                    <dd>{conditionBadge(row.condition)}</dd>
                                    <dt>{t('community.assets.table.location')}</dt>
                                    <dd>{row.location ?? '-'}</dd>
                                    <dt>{t('community.assets.table.custodian')}</dt>
                                    <dd>{row.custodian ? `${row.custodian.code} — ${row.custodian.fullName}` : t('community.assets.custodian.none')}</dd>
                                    <dt>{t('community.assets.field.acquisitionCost')}</dt>
                                    <dd>{row.acquisitionCost != null ? formatCurrencyIDR(row.acquisitionCost) : '-'}</dd>
                                </dl>
                                {canManage && (
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        <button
                                            type="button"
                                            onClick={() => openEdit(row)}
                                            className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-xs text-gray-700 hover:bg-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                                        >
                                            <Pencil className="h-3.5 w-3.5" />
                                            {t('community.common.edit')}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setDeleteTarget(row)}
                                            className="inline-flex items-center gap-1 rounded-lg border border-red-300 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                            {t('community.common.delete')}
                                        </button>
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
                                        {t('community.assets.table.assetCode')}
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                        {t('community.assets.table.name')}
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                        {t('community.assets.table.category')}
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                        {t('community.assets.table.condition')}
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                        {t('community.assets.table.status')}
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                        {t('community.assets.table.location')}
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                        {t('community.assets.table.custodian')}
                                    </th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                        {t('community.common.actions')}
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {rows.map((row) => (
                                    <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                        <td className="whitespace-nowrap px-4 py-3 text-sm font-mono text-gray-900 dark:text-gray-100">
                                            {row.assetCode ?? '-'}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                                            <p className="font-medium">{row.name}</p>
                                            {row.notes && (
                                                <p className="text-xs text-gray-500 dark:text-gray-400">{row.notes}</p>
                                            )}
                                        </td>
                                        <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                                            {categoryLabel(row.category)}
                                        </td>
                                        <td className="whitespace-nowrap px-4 py-3">{conditionBadge(row.condition)}</td>
                                        <td className="whitespace-nowrap px-4 py-3">
                                            <div className="flex flex-wrap items-center gap-1">
                                                {statusBadge(row.status)}
                                                {onLoanBadge(row.activeLoanCount)}
                                            </div>
                                        </td>
                                        <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                                            {row.location ?? '-'}
                                        </td>
                                        <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                                            {row.custodian ? row.custodian.fullName : <span className="text-gray-400">{t('community.assets.custodian.none')}</span>}
                                        </td>
                                        <td className="whitespace-nowrap px-4 py-3 text-right text-sm">
                                            {canManage && (
                                                <div className="flex items-center justify-end gap-1">
                                                    <button
                                                        type="button"
                                                        onClick={() => openEdit(row)}
                                                        className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                                                    >
                                                        <Pencil className="h-3.5 w-3.5" />
                                                        {t('community.common.edit')}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setDeleteTarget(row)}
                                                        className="inline-flex items-center gap-1 rounded-lg border border-red-300 px-2.5 py-1.5 text-xs text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20"
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                        {t('community.common.delete')}
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

            {/* Modal Create / Edit */}
            {formOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-xl dark:bg-gray-800">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                            {editing ? t('community.assets.editTitle') : t('community.assets.add')}
                        </h3>
                        <div className="mt-4 space-y-4">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                {t('community.assets.field.name')} *
                                <input
                                    type="text"
                                    value={form.name}
                                    onChange={(e) => setField('name', e.target.value)}
                                    className={`mt-1 ${inputClass}`}
                                    maxLength={200}
                                />
                            </label>
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    {t('community.assets.field.category')}
                                    <select
                                        value={form.category}
                                        onChange={(e) => setField('category', e.target.value)}
                                        className={`mt-1 ${inputClass}`}
                                    >
                                        {CATEGORY_VALUES.map((c) => (
                                            <option key={c} value={c}>
                                                {categoryLabel(c)}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    {t('community.assets.field.condition')}
                                    <select
                                        value={form.condition}
                                        onChange={(e) => setField('condition', e.target.value)}
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
                                    {t('community.assets.field.status')}
                                    <select
                                        value={form.status}
                                        onChange={(e) => setField('status', e.target.value)}
                                        className={`mt-1 ${inputClass}`}
                                    >
                                        {STATUS_VALUES.map((s) => (
                                            <option key={s} value={s}>
                                                {statusLabel(s)}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    {t('community.assets.field.acquisitionDate')}
                                    <input
                                        type="date"
                                        value={form.acquisitionDate}
                                        onChange={(e) => setField('acquisitionDate', e.target.value)}
                                        className={`mt-1 ${inputClass}`}
                                    />
                                </label>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    {t('community.assets.field.acquisitionCost')}
                                    <input
                                        type="number"
                                        min={0}
                                        step="any"
                                        value={form.acquisitionCost}
                                        onChange={(e) => setField('acquisitionCost', e.target.value)}
                                        className={`mt-1 ${inputClass}`}
                                    />
                                </label>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    {t('community.assets.field.location')}
                                    <input
                                        type="text"
                                        value={form.location}
                                        onChange={(e) => setField('location', e.target.value)}
                                        className={`mt-1 ${inputClass}`}
                                        maxLength={200}
                                    />
                                </label>
                            </div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                {t('community.assets.field.custodian')}
                                <select
                                    value={form.custodianMemberId}
                                    onChange={(e) => setField('custodianMemberId', e.target.value)}
                                    className={`mt-1 ${inputClass}`}
                                >
                                    <option value="">{t('community.assets.custodian.none')}</option>
                                    {members.map((m) => (
                                        <option key={m.id} value={m.id}>
                                            {m.code} — {m.fullName}
                                        </option>
                                    ))}
                                </select>
                            </label>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                {t('community.assets.field.notes')}
                                <textarea
                                    value={form.notes}
                                    onChange={(e) => setField('notes', e.target.value)}
                                    rows={3}
                                    maxLength={500}
                                    className={`mt-1 ${inputClass}`}
                                />
                            </label>
                        </div>
                        <div className="mt-6 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setFormOpen(false)}
                                className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                            >
                                {t('community.common.cancel')}
                            </button>
                            <button
                                type="button"
                                onClick={() => void handleSave()}
                                disabled={saving}
                                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                            >
                                {saving ? t('community.common.loading') : t('community.common.save')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <ConfirmDialog
                isOpen={!!deleteTarget}
                onClose={() => setDeleteTarget(null)}
                onConfirm={handleDelete}
                title={t('community.common.confirmDeleteTitle')}
                message={t('community.assets.deleteConfirm')}
                confirmText={t('community.common.delete')}
                cancelText={t('community.common.cancel')}
                variant="danger"
                isLoading={deleting}
            />
        </div>
    )
}
