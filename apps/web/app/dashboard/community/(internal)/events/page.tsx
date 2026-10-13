'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { CalendarDays, Download, Eye, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { useTranslation } from '@/lib/i18n'
import { usePermission } from '@/lib/use-permission'
import { useToast } from '@/components/ui/toast'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { EmptyState } from '@/components/ui/empty-state'
import { exportToCSV, formatCurrencyIDR, formatDateID } from '@/lib/export'

interface EventRow {
    id: string
    eventNumber: string
    title: string
    description: string | null
    category: string
    startsAt: string
    endsAt: string | null
    location: string | null
    maxCapacity: number | null
    budgetAmount: number | null
    status: string
    publishedAt: string | null
    createdAt: string
    updatedAt: string
    _count?: { transactions: number }
}

interface EventForm {
    title: string
    description: string
    category: string
    startsAt: string
    endsAt: string
    location: string
    maxCapacity: string
    budgetAmount: string
    publishedAt: string
    status: string
}

const EMPTY_FORM: EventForm = {
    title: '',
    description: '',
    category: 'RAPAT',
    startsAt: '',
    endsAt: '',
    location: '',
    maxCapacity: '',
    budgetAmount: '',
    publishedAt: '',
    status: 'PLANNED',
}

const CATEGORY_VALUES = ['RAPAT', 'KERJA_BAKTI', 'PERAYAAN', 'SOSIAL', 'LAINNYA'] as const
const STATUS_VALUES = ['PLANNED', 'ONGOING', 'DONE', 'CANCELLED'] as const

/** Konversi ISO string ke value datetime-local (waktu lokal browser). */
function toLocalInput(iso: string | null): string {
    if (!iso) return ''
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return ''
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** Label error respons API — `error` bisa string (route lama) atau { message } (handleApiError). */
function apiErrorMessage(json: Record<string, unknown> | null | undefined): string {
    const err = json?.error
    if (typeof err === 'string' && err) return err
    if (err && typeof err === 'object' && typeof (err as { message?: unknown }).message === 'string') {
        return (err as { message: string }).message
    }
    if (typeof json?.message === 'string' && json.message) return json.message
    return 'Error'
}

export default function CommunityEventsPage() {
    const { t } = useTranslation()
    const { addToast } = useToast()
    const { hasPermission } = usePermission()
    const canManage = hasPermission('community:manage')

    const [rows, setRows] = useState<EventRow[]>([])
    const [loading, setLoading] = useState(true)
    const [statusFilter, setStatusFilter] = useState('')
    const [search, setSearch] = useState('')
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [total, setTotal] = useState(0)

    const [formOpen, setFormOpen] = useState(false)
    const [editing, setEditing] = useState<EventRow | null>(null)
    const [form, setForm] = useState<EventForm>(EMPTY_FORM)
    const [saving, setSaving] = useState(false)

    const [deleteTarget, setDeleteTarget] = useState<EventRow | null>(null)
    const [deleting, setDeleting] = useState(false)

    const fetchRows = useCallback(async () => {
        try {
            setLoading(true)
            const params = new URLSearchParams({ page: String(page), limit: '20' })
            if (statusFilter) params.set('status', statusFilter)
            const res = await fetch(`/api/community/events?${params.toString()}`, { credentials: 'include' })
            if (!res.ok) {
                const json = (await res.json().catch(() => null)) as Record<string, unknown> | null
                addToast(apiErrorMessage(json), 'error')
                return
            }
            const json = (await res.json()) as { data?: EventRow[]; total?: number; totalPages?: number }
            let list = json.data ?? []
            if (search.trim()) {
                const q = search.trim().toLowerCase()
                list = list.filter(
                    (r) =>
                        r.title.toLowerCase().includes(q) ||
                        r.eventNumber.toLowerCase().includes(q) ||
                        (r.location ?? '').toLowerCase().includes(q)
                )
            }
            setRows(list)
            setTotal(json.total ?? list.length)
            setTotalPages(json.totalPages ?? 1)
        } catch {
            addToast('Error', 'error')
        } finally {
            setLoading(false)
        }
    }, [page, statusFilter, search, addToast])

    useEffect(() => {
        setPage(1)
    }, [statusFilter])

    useEffect(() => {
        void fetchRows()
    }, [fetchRows])

    const setField = (key: keyof EventForm, value: string) => {
        setForm((prev) => ({ ...prev, [key]: value }))
    }

    const openCreate = () => {
        setEditing(null)
        setForm(EMPTY_FORM)
        setFormOpen(true)
    }

    const openEdit = (row: EventRow) => {
        setEditing(row)
        setForm({
            title: row.title,
            description: row.description ?? '',
            category: row.category,
            startsAt: toLocalInput(row.startsAt),
            endsAt: toLocalInput(row.endsAt),
            location: row.location ?? '',
            maxCapacity: row.maxCapacity != null ? String(row.maxCapacity) : '',
            budgetAmount: row.budgetAmount != null ? String(row.budgetAmount) : '',
            publishedAt: toLocalInput(row.publishedAt),
            status: row.status,
        })
        setFormOpen(true)
    }

    const handleSave = async () => {
        if (form.title.trim().length < 3) {
            addToast(t('community.events.form.titleRequired'), 'error')
            return
        }
        if (!form.startsAt) {
            addToast(t('community.events.form.startsAtRequired'), 'error')
            return
        }
        if (form.endsAt && new Date(form.endsAt) < new Date(form.startsAt)) {
            addToast(t('community.events.form.invalidDate'), 'error')
            return
        }
        const payload: Record<string, unknown> = {
            title: form.title.trim(),
            description: form.description.trim() || null,
            category: form.category,
            startsAt: new Date(form.startsAt).toISOString(),
            endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : null,
            location: form.location.trim() || null,
            maxCapacity: form.maxCapacity ? parseInt(form.maxCapacity, 10) : null,
            budgetAmount: form.budgetAmount ? parseFloat(form.budgetAmount) : null,
            publishedAt: form.publishedAt ? new Date(form.publishedAt).toISOString() : null,
            status: form.status,
        }
        try {
            setSaving(true)
            const res = await fetch(editing ? `/api/community/events/${editing.id}` : '/api/community/events', {
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
            addToast(editing ? t('community.events.toast.updated') : t('community.events.toast.created'), 'success')
            setFormOpen(false)
            await fetchRows()
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
            const res = await fetch(`/api/community/events/${deleteTarget.id}`, {
                method: 'DELETE',
                credentials: 'include',
            })
            const json = (await res.json().catch(() => null)) as Record<string, unknown> | null
            if (!res.ok) {
                addToast(apiErrorMessage(json), 'error')
                return
            }
            addToast(t('community.events.toast.deleted'), 'success')
            setDeleteTarget(null)
            await fetchRows()
        } catch {
            addToast('Error', 'error')
        } finally {
            setDeleting(false)
        }
    }

    const handleExport = async () => {
        try {
            const all: EventRow[] = []
            for (let p = 1; p <= 10; p += 1) {
                const params = new URLSearchParams({ page: String(p), limit: '100' })
                if (statusFilter) params.set('status', statusFilter)
                const res = await fetch(`/api/community/events?${params.toString()}`, { credentials: 'include' })
                if (!res.ok) break
                const json = (await res.json()) as { data?: EventRow[]; totalPages?: number }
                all.push(...(json.data ?? []))
                if (p >= (json.totalPages ?? 1)) break
            }
            exportToCSV(
                all.map((r) => ({
                    eventNumber: r.eventNumber,
                    title: r.title,
                    category: r.category,
                    startsAt: formatDateID(r.startsAt),
                    endsAt: r.endsAt ? formatDateID(r.endsAt) : '',
                    location: r.location ?? '',
                    budgetAmount: r.budgetAmount ?? '',
                    status: r.status,
                })),
                'community-events',
                {
                    eventNumber: t('community.events.table.eventNumber'),
                    title: t('community.events.table.title'),
                    category: t('community.events.table.category'),
                    startsAt: t('community.events.table.startsAt'),
                    endsAt: t('community.events.table.endsAt'),
                    location: t('community.events.table.location'),
                    budgetAmount: t('community.events.table.budget'),
                    status: t('community.events.table.status'),
                }
            )
        } catch {
            addToast('Error', 'error')
        }
    }

    const statusBadge = (status: string) => {
        switch (status) {
            case 'PLANNED':
                return (
                    <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                        {t('community.events.status.planned')}
                    </span>
                )
            case 'ONGOING':
                return (
                    <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                        {t('community.events.status.ongoing')}
                    </span>
                )
            case 'DONE':
                return (
                    <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                        {t('community.events.status.done')}
                    </span>
                )
            case 'CANCELLED':
                return (
                    <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400">
                        {t('community.events.status.cancelled')}
                    </span>
                )
            default:
                return (
                    <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                        {status}
                    </span>
                )
        }
    }

    const categoryLabel = (category: string) => {
        switch (category) {
            case 'RAPAT':
                return t('community.events.category.rapat')
            case 'KERJA_BAKTI':
                return t('community.events.category.kerjaBakti')
            case 'PERAYAAN':
                return t('community.events.category.perayaan')
            case 'SOSIAL':
                return t('community.events.category.sosial')
            case 'LAINNYA':
                return t('community.events.category.lainnya')
            default:
                return category
        }
    }

    const dateRange = (row: EventRow) => {
        const start = formatDateID(row.startsAt)
        return row.endsAt ? `${start} — ${formatDateID(row.endsAt)}` : start
    }

    const inputClass =
        'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100'

    if (!canManage && !hasPermission('community:view')) {
        return (
            <div className="p-6">
                <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-8 text-center dark:border-yellow-800 dark:bg-yellow-900/20">
                    <CalendarDays className="mx-auto mb-3 h-10 w-10 text-yellow-500" />
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                        {t('community.events.accessDenied.title')}
                    </h2>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                        {t('community.events.accessDenied.desc')}
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
                        <CalendarDays className="h-5 w-5" />
                        {t('community.events.title')}
                    </h1>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t('community.events.subtitle')}</p>
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
                            {t('community.events.new')}
                        </button>
                    )}
                </div>
            </div>

            {/* Filter */}
            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className={`${inputClass} sm:w-44`}
                >
                    <option value="">{t('community.common.filterAll')}</option>
                    {STATUS_VALUES.map((s) => (
                        <option key={s} value={s}>
                            {s === 'PLANNED'
                                ? t('community.events.status.planned')
                                : s === 'ONGOING'
                                    ? t('community.events.status.ongoing')
                                    : s === 'DONE'
                                        ? t('community.events.status.done')
                                        : t('community.events.status.cancelled')}
                        </option>
                    ))}
                </select>
                <div className="relative flex-1 sm:max-w-xs">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder={t('community.events.searchPlaceholder')}
                        className={`${inputClass} pl-9`}
                    />
                </div>
                <span className="text-sm text-gray-500 dark:text-gray-400">{total} data</span>
            </div>

            {loading ? (
                <div className="space-y-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="h-20 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-700" />
                    ))}
                </div>
            ) : rows.length === 0 ? (
                <EmptyState
                    icon={<CalendarDays className="h-10 w-10 text-gray-400" />}
                    title={t('community.events.empty')}
                    description={t('community.events.emptyDesc')}
                    actionLabel={canManage ? t('community.events.new') : undefined}
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
                                        <p className="text-xs text-gray-500 dark:text-gray-400">{row.eventNumber}</p>
                                        <p className="font-medium text-gray-900 dark:text-gray-100">{row.title}</p>
                                    </div>
                                    {statusBadge(row.status)}
                                </div>
                                <dl className="mt-2 grid grid-cols-2 gap-1 text-xs text-gray-600 dark:text-gray-300">
                                    <dt>{t('community.events.table.category')}</dt>
                                    <dd>{categoryLabel(row.category)}</dd>
                                    <dt>{t('community.events.table.startsAt')}</dt>
                                    <dd>{dateRange(row)}</dd>
                                    <dt>{t('community.events.table.budget')}</dt>
                                    <dd>{row.budgetAmount != null ? formatCurrencyIDR(row.budgetAmount) : '-'}</dd>
                                </dl>
                                <div className="mt-3 flex flex-wrap gap-2">
                                    <Link
                                        href={`/dashboard/community/events/${row.id}`}
                                        className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                                    >
                                        <Eye className="h-3.5 w-3.5" />
                                        {t('community.common.viewDetail')}
                                    </Link>
                                    {canManage && (
                                        <>
                                            <button
                                                type="button"
                                                onClick={() => openEdit(row)}
                                                className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
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
                                        </>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Desktop table */}
                    <div className="hidden overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 md:block">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900/50">
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                        {t('community.events.table.eventNumber')}
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                        {t('community.events.table.title')}
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                        {t('community.events.table.category')}
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                        {t('community.events.table.startsAt')}
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                        {t('community.events.table.budget')}
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                        {t('community.events.table.status')}
                                    </th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                        {t('community.common.actions')}
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {rows.map((row) => (
                                    <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                        <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">
                                            {row.eventNumber}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                                            <p className="font-medium">{row.title}</p>
                                            {row.location && (
                                                <p className="text-xs text-gray-500 dark:text-gray-400">{row.location}</p>
                                            )}
                                        </td>
                                        <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                                            {categoryLabel(row.category)}
                                        </td>
                                        <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                                            {dateRange(row)}
                                        </td>
                                        <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                                            {row.budgetAmount != null ? formatCurrencyIDR(row.budgetAmount) : '-'}
                                        </td>
                                        <td className="whitespace-nowrap px-4 py-3">{statusBadge(row.status)}</td>
                                        <td className="whitespace-nowrap px-4 py-3 text-right text-sm">
                                            <div className="flex items-center justify-end gap-1">
                                                <Link
                                                    href={`/dashboard/community/events/${row.id}`}
                                                    className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                                                >
                                                    <Eye className="h-3.5 w-3.5" />
                                                    {t('community.common.viewDetail')}
                                                </Link>
                                                {canManage && (
                                                    <>
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
                                                    </>
                                                )}
                                            </div>
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
                            {editing ? t('community.events.editTitle') : t('community.events.newTitle')}
                        </h3>
                        <div className="mt-4 space-y-4">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                {t('community.events.form.title')}
                                <input
                                    type="text"
                                    value={form.title}
                                    onChange={(e) => setField('title', e.target.value)}
                                    className={`mt-1 ${inputClass}`}
                                    maxLength={200}
                                />
                            </label>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                {t('community.events.form.description')}
                                <textarea
                                    value={form.description}
                                    onChange={(e) => setField('description', e.target.value)}
                                    rows={3}
                                    maxLength={2000}
                                    className={`mt-1 ${inputClass}`}
                                />
                            </label>
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    {t('community.events.form.category')}
                                    <select
                                        value={form.category}
                                        onChange={(e) => setField('category', e.target.value)}
                                        className={`mt-1 ${inputClass}`}
                                    >
                                        {CATEGORY_VALUES.map((c) => (
                                            <option key={c} value={c}>
                                                {c === 'RAPAT'
                                                    ? t('community.events.category.rapat')
                                                    : c === 'KERJA_BAKTI'
                                                        ? t('community.events.category.kerjaBakti')
                                                        : c === 'PERAYAAN'
                                                            ? t('community.events.category.perayaan')
                                                            : c === 'SOSIAL'
                                                                ? t('community.events.category.sosial')
                                                                : t('community.events.category.lainnya')}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    {t('community.events.table.status')}
                                    <select
                                        value={form.status}
                                        onChange={(e) => setField('status', e.target.value)}
                                        className={`mt-1 ${inputClass}`}
                                    >
                                        {STATUS_VALUES.map((s) => (
                                            <option key={s} value={s}>
                                                {s === 'PLANNED'
                                                    ? t('community.events.status.planned')
                                                    : s === 'ONGOING'
                                                        ? t('community.events.status.ongoing')
                                                        : s === 'DONE'
                                                            ? t('community.events.status.done')
                                                            : t('community.events.status.cancelled')}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    {t('community.events.form.startsAt')}
                                    <input
                                        type="datetime-local"
                                        value={form.startsAt}
                                        onChange={(e) => setField('startsAt', e.target.value)}
                                        className={`mt-1 ${inputClass}`}
                                    />
                                </label>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    {t('community.events.form.endsAt')}
                                    <input
                                        type="datetime-local"
                                        value={form.endsAt}
                                        onChange={(e) => setField('endsAt', e.target.value)}
                                        className={`mt-1 ${inputClass}`}
                                    />
                                </label>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    {t('community.events.form.location')}
                                    <input
                                        type="text"
                                        value={form.location}
                                        onChange={(e) => setField('location', e.target.value)}
                                        className={`mt-1 ${inputClass}`}
                                        maxLength={200}
                                    />
                                </label>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    {t('community.events.form.maxCapacity')}
                                    <input
                                        type="number"
                                        min={1}
                                        max={10000}
                                        value={form.maxCapacity}
                                        onChange={(e) => setField('maxCapacity', e.target.value)}
                                        className={`mt-1 ${inputClass}`}
                                    />
                                </label>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    {t('community.events.form.budgetAmount')}
                                    <input
                                        type="number"
                                        min={0}
                                        step="any"
                                        value={form.budgetAmount}
                                        onChange={(e) => setField('budgetAmount', e.target.value)}
                                        className={`mt-1 ${inputClass}`}
                                    />
                                </label>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    {t('community.events.form.publishedAt')}
                                    <input
                                        type="datetime-local"
                                        value={form.publishedAt}
                                        onChange={(e) => setField('publishedAt', e.target.value)}
                                        className={`mt-1 ${inputClass}`}
                                    />
                                </label>
                            </div>
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
                message={t('community.events.deleteConfirmDesc')}
                confirmText={t('community.common.delete')}
                cancelText={t('community.common.cancel')}
                variant="danger"
                isLoading={deleting}
            />
        </div>
    )
}
