'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Pencil, Plus, Search, Trash2, Users, ShieldCheck, ShieldAlert } from 'lucide-react'
import { useTranslation } from '@/lib/i18n'
import { usePermission } from '@/lib/use-permission'
import { useToast } from '@/components/ui/toast'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { EmptyState } from '@/components/ui/empty-state'

interface MemberRow {
    id: string
    code: string
    fullName: string
    nikStored: boolean
    gender: string | null
    address: string | null
    rtRw: string | null
    houseStatus: string | null
    phone: string | null
    email: string | null
    status: string
    joinedAt: string | null
}

const EMPTY_FORM = {
    code: '',
    fullName: '',
    nik: '',
    nomorKk: '',
    gender: '',
    birthPlace: '',
    birthDate: '',
    address: '',
    rtRw: '',
    houseStatus: '',
    phone: '',
    email: '',
    status: 'ACTIVE',
    joinedAt: '',
    notes: '',
}

type FormState = typeof EMPTY_FORM

function statusBadge(status: string) {
    if (status === 'ACTIVE') return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
    if (status === 'INACTIVE') return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
    return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
}

export default function CommunityMembersPage() {
    const { t } = useTranslation()
    const { addToast } = useToast()
    const { canMutate, canDelete } = usePermission()
    const canMutateCommunity = canMutate('community')
    const canDeleteCommunity = canDelete('community')

    const [rows, setRows] = useState<MemberRow[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState('')
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [total, setTotal] = useState(0)

    const [modalOpen, setModalOpen] = useState(false)
    const [editing, setEditing] = useState<MemberRow | null>(null)
    const [form, setForm] = useState<FormState>(EMPTY_FORM)
    const [saving, setSaving] = useState(false)
    const [deleteTarget, setDeleteTarget] = useState<MemberRow | null>(null)
    const [deleting, setDeleting] = useState(false)

    const fetchRows = useCallback(async () => {
        setLoading(true)
        try {
            const params = new URLSearchParams({ page: String(page), limit: '20' })
            if (search) params.set('search', search)
            if (statusFilter) params.set('status', statusFilter)
            const res = await fetch(`/api/community/members?${params.toString()}`)
            if (res.ok) {
                const json = await res.json()
                setRows(Array.isArray(json.data) ? json.data : [])
                setTotalPages(json.totalPages ?? 1)
                setTotal(json.total ?? 0)
            }
        } catch {
            // ignore
        } finally {
            setLoading(false)
        }
    }, [page, search, statusFilter])

    useEffect(() => {
        fetchRows()
    }, [fetchRows])

    // debounce sederhana: reset halaman saat filter berubah
    useEffect(() => {
        setPage(1)
    }, [search, statusFilter])

    const openCreate = () => {
        setEditing(null)
        setForm(EMPTY_FORM)
        setModalOpen(true)
    }

    const openEdit = (row: MemberRow) => {
        setEditing(row)
        setForm({
            code: row.code,
            fullName: row.fullName,
            nik: '',
            nomorKk: '',
            gender: row.gender ?? '',
            birthPlace: '',
            birthDate: '',
            address: row.address ?? '',
            rtRw: row.rtRw ?? '',
            houseStatus: row.houseStatus ?? '',
            phone: row.phone ?? '',
            email: row.email ?? '',
            status: row.status,
            joinedAt: row.joinedAt ? row.joinedAt.slice(0, 10) : '',
            notes: '',
        })
        setModalOpen(true)
    }

    const setField = (key: keyof FormState, value: string) => {
        setForm((prev) => ({ ...prev, [key]: value }))
    }

    const handleSave = async () => {
        if (!form.code.trim()) {
            addToast(t('community.members.validation.codeRequired'), 'error')
            return
        }
        if (!form.fullName.trim()) {
            addToast(t('community.members.validation.nameRequired'), 'error')
            return
        }
        setSaving(true)
        try {
            const payload: Record<string, unknown> = {
                code: form.code.trim(),
                fullName: form.fullName.trim(),
                status: form.status,
            }
            // NIK/KK hanya dikirim jika diisi (edit: kosong = pertahankan tersimpan)
            if (form.nik.trim()) payload.nik = form.nik.trim()
            if (form.nomorKk.trim()) payload.nomorKk = form.nomorKk.trim()
            if (form.gender) payload.gender = form.gender
            if (form.birthPlace.trim()) payload.birthPlace = form.birthPlace.trim()
            if (form.birthDate) payload.birthDate = form.birthDate
            if (form.address.trim()) payload.address = form.address.trim()
            if (form.rtRw.trim()) payload.rtRw = form.rtRw.trim()
            if (form.houseStatus) payload.houseStatus = form.houseStatus
            if (form.phone.trim()) payload.phone = form.phone.trim()
            if (form.email.trim()) payload.email = form.email.trim()
            if (form.joinedAt) payload.joinedAt = form.joinedAt
            if (form.notes.trim()) payload.notes = form.notes.trim()

            const res = await fetch(
                editing ? `/api/community/members/${editing.id}` : '/api/community/members',
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
            addToast(editing ? t('community.members.toast.updated') : t('community.members.toast.created'), 'success')
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
            const res = await fetch(`/api/community/members/${deleteTarget.id}`, { method: 'DELETE' })
            const json = await res.json().catch(() => ({}))
            if (!res.ok) {
                addToast(json?.error?.message || json?.message || 'Error', 'error')
                return
            }
            addToast(t('community.members.toast.deleted'), 'success')
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

    return (
        <div className="space-y-6 p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('community.members.title')}</h1>
                {canMutateCommunity && (
                    <button
                        onClick={openCreate}
                        className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
                    >
                        <Plus className="h-4 w-4" />
                        {t('community.members.add')}
                    </button>
                )}
            </div>

            {/* Filter bar */}
            <div className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800 sm:flex-row sm:items-center">
                <div className="relative flex-1">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder={t('community.members.searchPlaceholder')}
                        className={`${inputClass} pl-9`}
                    />
                </div>
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={`${inputClass} sm:w-44`}>
                    <option value="">{t('community.common.filterAll')}</option>
                    <option value="ACTIVE">{t('community.members.status.active')}</option>
                    <option value="INACTIVE">{t('community.members.status.inactive')}</option>
                    <option value="MOVED">{t('community.members.status.moved')}</option>
                </select>
            </div>

            <p className="text-sm text-gray-500 dark:text-gray-400">{total} data</p>

            {loading ? (
                <div className="space-y-3">
                    {[0, 1, 2].map((i) => (
                        <div key={i} className="h-20 animate-pulse rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800" />
                    ))}
                </div>
            ) : rows.length === 0 ? (
                <EmptyState icon={Users} title={t('community.members.empty')} description={t('community.members.emptyDesc')} actionLabel={canMutateCommunity ? t('community.members.add') : undefined} onAction={canMutateCommunity ? openCreate : undefined} />
            ) : (
                <>
                    {/* Mobile cards */}
                    <div className="space-y-3 md:hidden">
                        {rows.map((row) => (
                            <div key={row.id} className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{row.fullName}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">{row.code}</p>
                                    </div>
                                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusBadge(row.status)}`}>
                                        {row.status === 'ACTIVE' ? t('community.members.status.active') : row.status === 'INACTIVE' ? t('community.members.status.inactive') : t('community.members.status.moved')}
                                    </span>
                                </div>
                                <div className="mt-2 space-y-1 text-xs text-gray-600 dark:text-gray-300">
                                    {row.address && <p>{row.address}{row.rtRw ? ` (RT/RW ${row.rtRw})` : ''}</p>}
                                    {row.phone && <p>{row.phone}</p>}
                                    <p className="inline-flex items-center gap-1">
                                        {row.nikStored ? (
                                            <><ShieldCheck className="h-3.5 w-3.5 text-green-500" /> {t('community.members.nikStored')}</>
                                        ) : (
                                            <><ShieldAlert className="h-3.5 w-3.5 text-yellow-500" /> {t('community.members.nikMissing')}</>
                                        )}
                                    </p>
                                </div>
                                {canMutateCommunity && (
                                    <div className="mt-3 flex gap-2">
                                        <button onClick={() => openEdit(row)} className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700">
                                            <Pencil className="h-3.5 w-3.5" /> {t('community.members.edit')}
                                        </button>
                                        {canDeleteCommunity && (
                                            <button onClick={() => setDeleteTarget(row)} className="inline-flex items-center gap-1 rounded-lg border border-red-300 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20">
                                                <Trash2 className="h-3.5 w-3.5" /> {t('common.delete')}
                                            </button>
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
                                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">{t('community.members.table.code')}</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">{t('community.members.table.fullName')}</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">{t('community.members.table.address')}</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">{t('community.members.table.phone')}</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">NIK</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">{t('community.members.table.status')}</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">{t('community.members.table.joinedAt')}</th>
                                    {canMutateCommunity && <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">{t('community.members.table.actions')}</th>}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {rows.map((row) => (
                                    <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                        <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">{row.code}</td>
                                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{row.fullName}</td>
                                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{row.address || '-'}{row.rtRw ? ` (RT/RW ${row.rtRw})` : ''}</td>
                                        <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{row.phone || '-'}</td>
                                        <td className="whitespace-nowrap px-4 py-3 text-sm">
                                            {row.nikStored ? (
                                                <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400"><ShieldCheck className="h-3.5 w-3.5" /> {t('community.members.nikStored')}</span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 text-yellow-600 dark:text-yellow-400"><ShieldAlert className="h-3.5 w-3.5" /> {t('community.members.nikMissing')}</span>
                                            )}
                                        </td>
                                        <td className="whitespace-nowrap px-4 py-3 text-sm">
                                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusBadge(row.status)}`}>
                                                {row.status === 'ACTIVE' ? t('community.members.status.active') : row.status === 'INACTIVE' ? t('community.members.status.inactive') : t('community.members.status.moved')}
                                            </span>
                                        </td>
                                        <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{row.joinedAt ? new Date(row.joinedAt).toLocaleDateString('id-ID') : '-'}</td>
                                        {canMutateCommunity && (
                                            <td className="whitespace-nowrap px-4 py-3 text-right">
                                                <div className="inline-flex gap-2">
                                                    <button onClick={() => openEdit(row)} className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-blue-600 dark:hover:bg-gray-700" title={t('community.members.edit')}>
                                                        <Pencil className="h-4 w-4" />
                                                    </button>
                                                    {canDeleteCommunity && (
                                                        <button onClick={() => setDeleteTarget(row)} className="rounded-lg p-1.5 text-gray-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20" title={t('common.delete')}>
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-500 dark:text-gray-400">Halaman {page} / {totalPages}</span>
                            <div className="flex gap-2">
                                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-50 dark:border-gray-600">
                                    ←
                                </button>
                                <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-50 dark:border-gray-600">
                                    →
                                </button>
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* Modal create/edit */}
            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
                    <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 dark:bg-gray-800">
                        <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
                            {editing ? t('community.members.edit') : t('community.members.add')}
                        </h2>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{t('community.members.form.code')} *</label>
                                <input type="text" value={form.code} onChange={(e) => setField('code', e.target.value)} placeholder={t('community.members.form.codePlaceholder')} className={inputClass} />
                            </div>
                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{t('community.members.form.fullName')} *</label>
                                <input type="text" value={form.fullName} onChange={(e) => setField('fullName', e.target.value)} className={inputClass} />
                            </div>
                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{t('community.members.form.nik')}</label>
                                <input type="text" value={form.nik} onChange={(e) => setField('nik', e.target.value)} maxLength={16} className={inputClass} />
                                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{t('community.members.form.nikHint')}</p>
                            </div>
                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{t('community.members.form.nomorKk')}</label>
                                <input type="text" value={form.nomorKk} onChange={(e) => setField('nomorKk', e.target.value)} maxLength={16} className={inputClass} />
                            </div>
                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{t('community.members.form.gender')}</label>
                                <select value={form.gender} onChange={(e) => setField('gender', e.target.value)} className={inputClass}>
                                    <option value="">-</option>
                                    <option value="L">{t('community.members.gender.male')}</option>
                                    <option value="P">{t('community.members.gender.female')}</option>
                                </select>
                            </div>
                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{t('community.members.form.birthPlace')}</label>
                                <input type="text" value={form.birthPlace} onChange={(e) => setField('birthPlace', e.target.value)} className={inputClass} />
                            </div>
                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{t('community.members.form.birthDate')}</label>
                                <input type="date" value={form.birthDate} onChange={(e) => setField('birthDate', e.target.value)} className={inputClass} />
                            </div>
                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{t('community.members.form.houseStatus')}</label>
                                <select value={form.houseStatus} onChange={(e) => setField('houseStatus', e.target.value)} className={inputClass}>
                                    <option value="">-</option>
                                    <option value="OWNER">{t('community.members.houseStatus.owner')}</option>
                                    <option value="RENT">{t('community.members.houseStatus.rent')}</option>
                                </select>
                            </div>
                            <div className="sm:col-span-2">
                                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{t('community.members.form.address')}</label>
                                <input type="text" value={form.address} onChange={(e) => setField('address', e.target.value)} className={inputClass} />
                            </div>
                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{t('community.members.form.rtRw')}</label>
                                <input type="text" value={form.rtRw} onChange={(e) => setField('rtRw', e.target.value)} maxLength={20} className={inputClass} />
                            </div>
                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{t('community.members.form.phone')}</label>
                                <input type="text" value={form.phone} onChange={(e) => setField('phone', e.target.value)} className={inputClass} />
                            </div>
                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{t('community.members.form.email')}</label>
                                <input type="email" value={form.email} onChange={(e) => setField('email', e.target.value)} className={inputClass} />
                            </div>
                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{t('community.members.form.status')}</label>
                                <select value={form.status} onChange={(e) => setField('status', e.target.value)} className={inputClass}>
                                    <option value="ACTIVE">{t('community.members.status.active')}</option>
                                    <option value="INACTIVE">{t('community.members.status.inactive')}</option>
                                    <option value="MOVED">{t('community.members.status.moved')}</option>
                                </select>
                            </div>
                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{t('community.members.form.joinedAt')}</label>
                                <input type="date" value={form.joinedAt} onChange={(e) => setField('joinedAt', e.target.value)} className={inputClass} />
                            </div>
                            <div className="sm:col-span-2">
                                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{t('community.members.form.notes')}</label>
                                <textarea value={form.notes} onChange={(e) => setField('notes', e.target.value)} rows={2} className={inputClass} />
                            </div>
                        </div>
                        <div className="mt-6 flex justify-end gap-3">
                            <button onClick={() => setModalOpen(false)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700">
                                {t('community.common.cancel')}
                            </button>
                            <button onClick={handleSave} disabled={saving} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
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
                title={t('community.members.confirmDelete.title')}
                message={t('community.members.confirmDelete.desc')}
                confirmText={t('common.delete')}
                cancelText={t('community.common.cancel')}
                variant="danger"
                isLoading={deleting}
            />
        </div>
    )
}
