'use client'

import { useCallback, useEffect, useState } from 'react'
import { BellRing, Megaphone, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { useTranslation } from '@/lib/i18n'
import { usePermission } from '@/lib/use-permission'
import { useToast } from '@/components/ui/toast'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { EmptyState } from '@/components/ui/empty-state'
import { formatDateID } from '@/lib/export'

interface AnnouncementRow {
    id: string
    title: string
    content: string
    category: string
    priority: string
    publishedAt: string | null
    expiresAt: string | null
    isActive: boolean
}

const EMPTY_FORM = {
    title: '',
    content: '',
    category: 'GENERAL',
    priority: 'NORMAL',
    publishedAt: '',
    expiresAt: '',
    isActive: true,
}

type FormState = typeof EMPTY_FORM

const CATEGORY_VALUES = ['GENERAL', 'MEETING', 'PAYMENT', 'EVENT', 'EMERGENCY'] as const
const PRIORITY_VALUES = ['LOW', 'NORMAL', 'HIGH', 'URGENT'] as const

function categoryLabel(t: (k: string) => string, category: string) {
    const key = `community.announcements.category.${category.toLowerCase()}`
    const label = t(key)
    return label === key ? category : label
}

function priorityLabel(t: (k: string) => string, priority: string) {
    const key = `community.announcements.priority.${priority.toLowerCase()}`
    const label = t(key)
    return label === key ? priority : label
}

function priorityBadge(priority: string) {
    if (priority === 'URGENT') return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
    if (priority === 'HIGH') return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
    if (priority === 'NORMAL') return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
    return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
}

const inputClass =
    'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100'

export default function CommunityAnnouncementsPage() {
    const { t } = useTranslation()
    const { addToast } = useToast()
    const { hasPermission } = usePermission()
    const canManage = hasPermission('community:manage')

    const [rows, setRows] = useState<AnnouncementRow[]>([])
    const [loading, setLoading] = useState(true)
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [total, setTotal] = useState(0)

    const [search, setSearch] = useState('')
    const [categoryFilter, setCategoryFilter] = useState('')
    const [priorityFilter, setPriorityFilter] = useState('')
    const [activeFilter, setActiveFilter] = useState('')

    const [modalOpen, setModalOpen] = useState(false)
    const [editing, setEditing] = useState<AnnouncementRow | null>(null)
    const [form, setForm] = useState<FormState>(EMPTY_FORM)
    const [saving, setSaving] = useState(false)
    const [deleteTarget, setDeleteTarget] = useState<AnnouncementRow | null>(null)
    const [deleting, setDeleting] = useState(false)

    const fetchRows = useCallback(async () => {
        setLoading(true)
        try {
            const params = new URLSearchParams({ page: String(page), limit: '10' })
            if (categoryFilter) params.set('category', categoryFilter)
            if (priorityFilter) params.set('priority', priorityFilter)
            if (activeFilter) params.set('active', activeFilter)
            const res = await fetch(`/api/community/announcements?${params.toString()}`)
            if (!res.ok) throw new Error()
            const json = await res.json()
            setRows(json.data ?? [])
            setTotal(json.total ?? 0)
            setTotalPages(json.totalPages ?? 1)
        } catch {
            addToast(t('common.error.load'), 'error')
        } finally {
            setLoading(false)
        }
    }, [page, categoryFilter, priorityFilter, activeFilter, addToast, t])

    useEffect(() => {
        void fetchRows()
    }, [fetchRows])

    const filteredRows = rows.filter((row) =>
        row.title.toLowerCase().includes(search.toLowerCase())
    )

    const openCreate = () => {
        setEditing(null)
        setForm(EMPTY_FORM)
        setModalOpen(true)
    }

    const openEdit = (row: AnnouncementRow) => {
        setEditing(row)
        setForm({
            title: row.title,
            content: row.content,
            category: row.category,
            priority: row.priority,
            publishedAt: row.publishedAt ? row.publishedAt.slice(0, 10) : '',
            expiresAt: row.expiresAt ? row.expiresAt.slice(0, 10) : '',
            isActive: row.isActive,
        })
        setModalOpen(true)
    }

    const handleSave = async () => {
        if (!form.title.trim() || form.title.trim().length < 3) {
            addToast('Judul minimal 3 karakter', 'error')
            return
        }
        if (!form.content.trim() || form.content.trim().length < 3) {
            addToast('Isi pengumuman minimal 3 karakter', 'error')
            return
        }
        if (form.publishedAt && form.expiresAt && form.publishedAt > form.expiresAt) {
            addToast('Tanggal terbit harus sebelum tanggal kedaluwarsa', 'error')
            return
        }
        setSaving(true)
        try {
            const payload: Record<string, unknown> = {
                title: form.title.trim(),
                content: form.content.trim(),
                category: form.category,
                priority: form.priority,
                isActive: form.isActive,
            }
            if (form.publishedAt) payload.publishedAt = form.publishedAt
            if (form.expiresAt) payload.expiresAt = form.expiresAt

            const res = await fetch(
                editing ? `/api/community/announcements/${editing.id}` : '/api/community/announcements',
                {
                    method: editing ? 'PUT' : 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                }
            )
            if (!res.ok) {
                const err = await res.json().catch(() => null)
                addToast(err?.error || t('common.error.save'), 'error')
                return
            }
            addToast(editing ? t('community.announcements.toast.updated') : t('community.announcements.toast.created'), 'success')
            setModalOpen(false)
            void fetchRows()
        } catch {
            addToast(t('common.error.save'), 'error')
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async () => {
        if (!deleteTarget) return
        setDeleting(true)
        try {
            const res = await fetch(`/api/community/announcements/${deleteTarget.id}`, { method: 'DELETE' })
            if (!res.ok) {
                const err = await res.json().catch(() => null)
                addToast(err?.error || t('common.error.delete'), 'error')
                return
            }
            addToast(t('community.announcements.toast.deleted'), 'success')
            setDeleteTarget(null)
            void fetchRows()
        } catch {
            addToast(t('common.error.delete'), 'error')
        } finally {
            setDeleting(false)
        }
    }

    return (
        <div className="space-y-6 p-6">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900 dark:text-gray-100">
                        <Megaphone className="h-6 w-6 text-blue-600" />
                        {t('community.announcements.title')}
                    </h1>
                </div>
                {canManage && (
                    <button
                        onClick={openCreate}
                        className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
                    >
                        <Plus className="h-4 w-4" />
                        {t('community.announcements.add')}
                    </button>
                )}
            </div>

            <div className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800 sm:flex-row sm:items-center">
                <div className="relative flex-1">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder={t('community.announcements.searchPlaceholder')}
                        className={`${inputClass} pl-9`}
                    />
                </div>
                <select value={categoryFilter} onChange={(e) => { setCategoryFilter(e.target.value); setPage(1) }} className={`${inputClass} sm:w-40`}>
                    <option value="">{t('community.announcements.filterCategory')}: {t('community.common.filterAll')}</option>
                    {CATEGORY_VALUES.map((c) => (
                        <option key={c} value={c}>{categoryLabel(t, c)}</option>
                    ))}
                </select>
                <select value={priorityFilter} onChange={(e) => { setPriorityFilter(e.target.value); setPage(1) }} className={`${inputClass} sm:w-40`}>
                    <option value="">{t('community.announcements.filterPriority')}: {t('community.common.filterAll')}</option>
                    {PRIORITY_VALUES.map((p) => (
                        <option key={p} value={p}>{priorityLabel(t, p)}</option>
                    ))}
                </select>
                <select value={activeFilter} onChange={(e) => { setActiveFilter(e.target.value); setPage(1) }} className={`${inputClass} sm:w-40`}>
                    <option value="">{t('community.announcements.filterActive')}: {t('community.common.filterAll')}</option>
                    <option value="true">{t('common.yes')}</option>
                    <option value="false">{t('common.no')}</option>
                </select>
            </div>

            {loading ? (
                <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="h-16 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-700" />
                    ))}
                </div>
            ) : filteredRows.length === 0 ? (
                <EmptyState
                    icon={BellRing}
                    title={t('community.announcements.empty')}
                    description={t('community.announcements.emptyDesc')}
                />
            ) : (
                <>
                    {/* Mobile cards */}
                    <div className="space-y-3 md:hidden">
                        {filteredRows.map((row) => (
                            <div key={row.id} className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                        <p className="truncate font-semibold text-gray-900 dark:text-gray-100">{row.title}</p>
                                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 line-clamp-2">{row.content}</p>
                                    </div>
                                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${priorityBadge(row.priority)}`}>
                                        {priorityLabel(t, row.priority)}
                                    </span>
                                </div>
                                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                                    <span className="rounded-full bg-gray-100 px-2 py-0.5 dark:bg-gray-700">{categoryLabel(t, row.category)}</span>
                                    {row.publishedAt && <span>{t('community.announcements.table.publishedAt')}: {formatDateID(row.publishedAt)}</span>}
                                    {row.expiresAt && <span>{t('community.announcements.table.expiresAt')}: {formatDateID(row.expiresAt)}</span>}
                                    <span className={row.isActive ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}>
                                        {row.isActive ? t('common.yes') : t('common.no')}
                                    </span>
                                </div>
                                {canManage && (
                                    <div className="mt-3 flex gap-2">
                                        <button
                                            onClick={() => openEdit(row)}
                                            className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                                        >
                                            <Pencil className="h-3.5 w-3.5" /> {t('common.edit')}
                                        </button>
                                        <button
                                            onClick={() => setDeleteTarget(row)}
                                            className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg border border-red-300 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" /> {t('common.delete')}
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
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">{t('community.announcements.table.title')}</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">{t('community.announcements.table.category')}</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">{t('community.announcements.table.priority')}</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">{t('community.announcements.table.publishedAt')}</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">{t('community.announcements.table.expiresAt')}</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">{t('community.announcements.table.isActive')}</th>
                                    {canManage && (
                                        <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">{t('community.common.actions')}</th>
                                    )}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {filteredRows.map((row) => (
                                    <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                        <td className="px-4 py-3 text-sm">
                                            <p className="font-medium text-gray-900 dark:text-gray-100">{row.title}</p>
                                            <p className="mt-0.5 max-w-md truncate text-xs text-gray-500 dark:text-gray-400">{row.content}</p>
                                        </td>
                                        <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{categoryLabel(t, row.category)}</td>
                                        <td className="whitespace-nowrap px-4 py-3 text-sm">
                                            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${priorityBadge(row.priority)}`}>
                                                {priorityLabel(t, row.priority)}
                                            </span>
                                        </td>
                                        <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{row.publishedAt ? formatDateID(row.publishedAt) : '—'}</td>
                                        <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{row.expiresAt ? formatDateID(row.expiresAt) : '—'}</td>
                                        <td className="whitespace-nowrap px-4 py-3 text-sm">
                                            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${row.isActive ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'}`}>
                                                {row.isActive ? t('common.yes') : t('common.no')}
                                            </span>
                                        </td>
                                        {canManage && (
                                            <td className="whitespace-nowrap px-4 py-3 text-right text-sm">
                                                <div className="flex items-center justify-end gap-1">
                                                    <button onClick={() => openEdit(row)} className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-blue-600 dark:hover:bg-gray-700" title={t('common.edit')}>
                                                        <Pencil className="h-4 w-4" />
                                                    </button>
                                                    <button onClick={() => setDeleteTarget(row)} className="rounded-lg p-1.5 text-gray-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20" title={t('common.delete')}>
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {totalPages > 1 && (
                        <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                            <span>{total} data</span>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                                    disabled={page <= 1}
                                    className="rounded-lg border border-gray-300 px-3 py-1.5 disabled:opacity-40 dark:border-gray-600"
                                >
                                    {t('common.previous')}
                                </button>
                                <span>{page} / {totalPages}</span>
                                <button
                                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                    disabled={page >= totalPages}
                                    className="rounded-lg border border-gray-300 px-3 py-1.5 disabled:opacity-40 dark:border-gray-600"
                                >
                                    {t('common.next')}
                                </button>
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* Create / Edit modal */}
            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setModalOpen(false)}>
                    <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl dark:bg-gray-800" onClick={(e) => e.stopPropagation()}>
                        <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
                            {editing ? t('community.announcements.edit') : t('community.announcements.add')}
                        </h2>
                        <div className="space-y-4">
                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    {t('community.announcements.form.title')} *
                                </label>
                                <input
                                    value={form.title}
                                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                                    className={inputClass}
                                    maxLength={200}
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    {t('community.announcements.form.content')} *
                                </label>
                                <textarea
                                    value={form.content}
                                    onChange={(e) => setForm({ ...form, content: e.target.value })}
                                    className={`${inputClass} min-h-24`}
                                    rows={4}
                                    maxLength={5000}
                                />
                            </div>
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{t('community.announcements.form.category')}</label>
                                    <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className={inputClass}>
                                        {CATEGORY_VALUES.map((c) => (
                                            <option key={c} value={c}>{categoryLabel(t, c)}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{t('community.announcements.form.priority')}</label>
                                    <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className={inputClass}>
                                        {PRIORITY_VALUES.map((p) => (
                                            <option key={p} value={p}>{priorityLabel(t, p)}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{t('community.announcements.form.publishedAt')}</label>
                                    <input
                                        type="date"
                                        value={form.publishedAt}
                                        onChange={(e) => setForm({ ...form, publishedAt: e.target.value })}
                                        className={inputClass}
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{t('community.announcements.form.expiresAt')}</label>
                                    <input
                                        type="date"
                                        value={form.expiresAt}
                                        onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
                                        className={inputClass}
                                    />
                                </div>
                            </div>
                            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                                <input
                                    type="checkbox"
                                    checked={form.isActive}
                                    onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                                    className="h-4 w-4 rounded border-gray-300"
                                />
                                {t('community.announcements.form.isActive')}
                            </label>
                        </div>
                        <div className="mt-6 flex justify-end gap-2">
                            <button
                                onClick={() => setModalOpen(false)}
                                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                            >
                                {t('community.common.cancel')}
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                            >
                                {saving ? t('common.loading') : t('community.common.save')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <ConfirmDialog
                isOpen={!!deleteTarget}
                onClose={() => setDeleteTarget(null)}
                onConfirm={handleDelete}
                title={t('community.announcements.confirmDelete.title')}
                message={t('community.announcements.confirmDelete.desc')}
                confirmText={t('common.delete')}
                cancelText={t('community.common.cancel')}
                variant="danger"
                isLoading={deleting}
            />
        </div>
    )
}
