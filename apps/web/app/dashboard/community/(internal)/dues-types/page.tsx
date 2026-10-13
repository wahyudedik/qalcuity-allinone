'use client'

import { useCallback, useEffect, useState } from 'react'
import { Pencil, Plus, Search, Tags, Trash2 } from 'lucide-react'
import { useTranslation } from '@/lib/i18n'
import { usePermission } from '@/lib/use-permission'
import { useToast } from '@/components/ui/toast'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { EmptyState } from '@/components/ui/empty-state'
import { formatCurrencyIDR } from '@/lib/export'

interface DuesTypeRow {
    id: string
    code: string
    name: string
    description: string | null
    amount: number
    frequency: string
    isActive: boolean
}

const EMPTY_FORM = {
    code: '',
    name: '',
    description: '',
    amount: '',
    frequency: 'MONTHLY',
    isActive: true,
}

type FormState = typeof EMPTY_FORM

export default function CommunityDuesTypesPage() {
    const { t } = useTranslation()
    const { addToast } = useToast()
    const { canMutate } = usePermission()
    const canMutateCommunity = canMutate('community')

    const [rows, setRows] = useState<DuesTypeRow[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')

    const [modalOpen, setModalOpen] = useState(false)
    const [editing, setEditing] = useState<DuesTypeRow | null>(null)
    const [form, setForm] = useState<FormState>(EMPTY_FORM)
    const [saving, setSaving] = useState(false)
    const [deleteTarget, setDeleteTarget] = useState<DuesTypeRow | null>(null)
    const [deleting, setDeleting] = useState(false)

    const fetchRows = useCallback(async () => {
        setLoading(true)
        try {
            const res = await fetch('/api/community/dues-types')
            const json = await res.json().catch(() => ({}))
            if (res.ok) {
                setRows(Array.isArray(json.data) ? json.data : [])
            }
        } catch {
            // ignore
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchRows()
    }, [fetchRows])

    const filtered = rows.filter((row) => {
        if (!search) return true
        const q = search.toLowerCase()
        return row.code.toLowerCase().includes(q) || row.name.toLowerCase().includes(q)
    })

    const openCreate = () => {
        setEditing(null)
        setForm(EMPTY_FORM)
        setModalOpen(true)
    }

    const openEdit = (row: DuesTypeRow) => {
        setEditing(row)
        setForm({
            code: row.code,
            name: row.name,
            description: row.description ?? '',
            amount: String(row.amount),
            frequency: row.frequency || 'MONTHLY',
            isActive: row.isActive,
        })
        setModalOpen(true)
    }

    const setField = (key: keyof FormState, value: string | boolean) => {
        setForm((prev) => ({ ...prev, [key]: value }))
    }

    const handleSave = async () => {
        if (!form.code.trim()) {
            addToast(t('community.duesTypes.validation.codeRequired'), 'error')
            return
        }
        if (!form.name.trim()) {
            addToast(t('community.duesTypes.validation.nameRequired'), 'error')
            return
        }
        const amountNum = Number(form.amount)
        if (!amountNum || amountNum <= 0) {
            addToast(t('community.duesTypes.validation.amountInvalid'), 'error')
            return
        }
        setSaving(true)
        try {
            const payload: Record<string, unknown> = {
                code: form.code.trim(),
                name: form.name.trim(),
                amount: amountNum,
                frequency: form.frequency,
                isActive: form.isActive,
            }
            if (form.description.trim()) payload.description = form.description.trim()

            const res = await fetch(
                editing ? `/api/community/dues-types/${editing.id}` : '/api/community/dues-types',
                {
                    method: editing ? 'PUT' : 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                }
            )
            const json = await res.json().catch(() => ({}))
            if (!res.ok) {
                addToast(json?.error?.message || json?.message || 'Error', 'error')
                return
            }
            addToast(editing ? t('community.duesTypes.toast.updated') : t('community.duesTypes.toast.created'), 'success')
            setModalOpen(false)
            fetchRows()
        } catch {
            addToast('Error', 'error')
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async () => {
        if (!deleteTarget) return
        setDeleting(true)
        try {
            const res = await fetch(`/api/community/dues-types/${deleteTarget.id}`, { method: 'DELETE' })
            const json = await res.json().catch(() => ({}))
            if (!res.ok) {
                addToast(json?.error?.message || json?.message || 'Error', 'error')
                return
            }
            addToast(t('community.duesTypes.toast.deleted'), 'success')
            setDeleteTarget(null)
            fetchRows()
        } catch {
            addToast('Error', 'error')
        } finally {
            setDeleting(false)
        }
    }

    const inputClass =
        'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100'

    const frequencyLabel = (freq: string) => {
        switch (freq) {
            case 'MONTHLY':
                return t('community.duesTypes.frequency.monthly')
            case 'QUARTERLY':
                return t('community.duesTypes.frequency.quarterly')
            case 'YEARLY':
                return t('community.duesTypes.frequency.yearly')
            case 'ONE_TIME':
                return t('community.duesTypes.frequency.once')
            default:
                return freq
        }
    }

    return (
        <div className="space-y-6 p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('community.duesTypes.title')}</h1>
                {canMutateCommunity && (
                    <button
                        onClick={openCreate}
                        className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
                    >
                        <Plus className="h-4 w-4" />
                        {t('community.duesTypes.add')}
                    </button>
                )}
            </div>

            {/* Filter bar */}
            <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                <div className="relative max-w-md">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder={t('community.duesTypes.searchPlaceholder')}
                        className={`${inputClass} pl-9`}
                    />
                </div>
            </div>

            {loading ? (
                <div className="space-y-3">
                    {[0, 1, 2].map((i) => (
                        <div key={i} className="h-20 animate-pulse rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800" />
                    ))}
                </div>
            ) : filtered.length === 0 ? (
                <EmptyState
                    icon={Tags}
                    title={t('community.duesTypes.empty')}
                    description={t('community.duesTypes.emptyDesc')}
                    actionLabel={canMutateCommunity ? t('community.duesTypes.add') : undefined}
                    onAction={canMutateCommunity ? openCreate : undefined}
                />
            ) : (
                <>
                    {/* Mobile cards */}
                    <div className="space-y-3 md:hidden">
                        {filtered.map((row) => (
                            <div key={row.id} className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{row.name}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">{row.code}</p>
                                    </div>
                                    <span
                                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${row.isActive
                                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                                : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                                            }`}
                                    >
                                        {row.isActive ? t('community.duesTypes.table.active') : t('community.common.filterAll') === 'Semua' ? '—' : '—'}
                                    </span>
                                </div>
                                <div className="mt-2 space-y-1 text-xs text-gray-600 dark:text-gray-300">
                                    <p className="font-medium text-gray-900 dark:text-gray-100">{formatCurrencyIDR(row.amount)}</p>
                                    <p>{frequencyLabel(row.frequency)}</p>
                                    {row.description && <p className="line-clamp-2">{row.description}</p>}
                                </div>
                                {canMutateCommunity && (
                                    <div className="mt-3 flex gap-2">
                                        <button
                                            onClick={() => openEdit(row)}
                                            className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                                        >
                                            <Pencil className="h-3.5 w-3.5" /> {t('community.duesTypes.edit')}
                                        </button>
                                        <button
                                            onClick={() => setDeleteTarget(row)}
                                            className="inline-flex items-center gap-1 rounded-lg border border-red-300 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20"
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
                                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">{t('community.duesTypes.table.code')}</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">{t('community.duesTypes.table.name')}</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">{t('community.duesTypes.table.amount')}</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">{t('community.duesTypes.table.frequency')}</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">{t('community.duesTypes.table.description')}</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">{t('community.duesTypes.table.active')}</th>
                                    {canMutateCommunity && (
                                        <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">{t('community.duesTypes.table.actions')}</th>
                                    )}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {filtered.map((row) => (
                                    <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                        <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">{row.code}</td>
                                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{row.name}</td>
                                        <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{formatCurrencyIDR(row.amount)}</td>
                                        <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{frequencyLabel(row.frequency)}</td>
                                        <td className="max-w-xs truncate px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{row.description || '-'}</td>
                                        <td className="whitespace-nowrap px-4 py-3 text-sm">
                                            <span
                                                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${row.isActive
                                                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                                        : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                                                    }`}
                                            >
                                                {row.isActive ? t('community.duesTypes.table.active') : '—'}
                                            </span>
                                        </td>
                                        {canMutateCommunity && (
                                            <td className="whitespace-nowrap px-4 py-3 text-right">
                                                <div className="inline-flex gap-2">
                                                    <button
                                                        onClick={() => openEdit(row)}
                                                        className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-blue-600 dark:hover:bg-gray-700"
                                                        title={t('community.duesTypes.edit')}
                                                    >
                                                        <Pencil className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => setDeleteTarget(row)}
                                                        className="rounded-lg p-1.5 text-gray-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
                                                        title={t('common.delete')}
                                                    >
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
                </>
            )}

            {/* Modal create/edit */}
            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
                    <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 dark:bg-gray-800">
                        <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
                            {editing ? t('community.duesTypes.edit') : t('community.duesTypes.add')}
                        </h2>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{t('community.duesTypes.form.code')} *</label>
                                <input
                                    type="text"
                                    value={form.code}
                                    onChange={(e) => setField('code', e.target.value)}
                                    placeholder={t('community.duesTypes.form.codePlaceholder')}
                                    className={inputClass}
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{t('community.duesTypes.form.name')} *</label>
                                <input type="text" value={form.name} onChange={(e) => setField('name', e.target.value)} className={inputClass} />
                            </div>
                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{t('community.duesTypes.form.amount')} *</label>
                                <input
                                    type="number"
                                    min={1}
                                    value={form.amount}
                                    onChange={(e) => setField('amount', e.target.value)}
                                    className={inputClass}
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{t('community.duesTypes.form.frequency')}</label>
                                <select value={form.frequency} onChange={(e) => setField('frequency', e.target.value)} className={inputClass}>
                                    <option value="MONTHLY">{t('community.duesTypes.frequency.monthly')}</option>
                                    <option value="QUARTERLY">{t('community.duesTypes.frequency.quarterly')}</option>
                                    <option value="YEARLY">{t('community.duesTypes.frequency.yearly')}</option>
                                    <option value="ONE_TIME">{t('community.duesTypes.frequency.once')}</option>
                                </select>
                            </div>
                            <div className="sm:col-span-2">
                                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{t('community.duesTypes.form.description')}</label>
                                <textarea
                                    value={form.description}
                                    onChange={(e) => setField('description', e.target.value)}
                                    rows={2}
                                    className={inputClass}
                                />
                            </div>
                            <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                                <input
                                    type="checkbox"
                                    checked={form.isActive}
                                    onChange={(e) => setField('isActive', e.target.checked)}
                                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                {t('community.duesTypes.form.active')}
                            </label>
                        </div>
                        <div className="mt-6 flex justify-end gap-3">
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
                title={t('community.duesTypes.confirmDelete.title')}
                message={t('community.duesTypes.confirmDelete.desc')}
                confirmText={t('common.delete')}
                cancelText={t('community.common.cancel')}
                variant="danger"
                isLoading={deleting}
            />
        </div>
    )
}
