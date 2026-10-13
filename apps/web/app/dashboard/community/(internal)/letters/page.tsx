'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
    BadgeCheck,
    Ban,
    Copy,
    Download,
    ExternalLink,
    FileText,
    FilePlus2,
    Pencil,
    Trash2,
    Undo2,
} from 'lucide-react'
import { useTranslation } from '@/lib/i18n'
import { usePermission } from '@/lib/use-permission'
import { useToast } from '@/components/ui/toast'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { EmptyState } from '@/components/ui/empty-state'
import { exportToCSV, formatDateID } from '@/lib/export'

interface LetterRow {
    id: string
    letterNumber: string | null
    letterType: string
    memberId: string
    purpose: string
    destination: string | null
    notes: string | null
    status: string
    issuedAt: string | null
    signedByName: string | null
    revokedAt: string | null
    revokeReason: string | null
    verifyUrl: string | null
    hasSnapshot: boolean
    hasNik: boolean
    createdAt: string
    updatedAt: string
    member: {
        id: string
        code: string
        fullName: string
        address: string | null
        rtRw: string | null
        phone: string | null
        nikStored: boolean
    } | null
}

interface MemberOption {
    id: string
    code: string
    fullName: string
}

interface LetterForm {
    memberId: string
    letterType: string
    purpose: string
    destination: string
    notes: string
}

const EMPTY_FORM: LetterForm = { memberId: '', letterType: 'PENGANTAR', purpose: '', destination: '', notes: '' }
const LETTER_TYPE_VALUES = ['PENGANTAR', 'DOMISILI', 'SKTM', 'KETERANGAN_LAIN'] as const
const STATUS_VALUES = ['DRAFT', 'ISSUED', 'REVOKED'] as const

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

export default function CommunityLettersPage() {
    const { t } = useTranslation()
    const { addToast } = useToast()
    const { hasPermission } = usePermission()
    const canManage = hasPermission('community:manage')
    const canApprove = hasPermission('community:approve')

    const [rows, setRows] = useState<LetterRow[]>([])
    const [loading, setLoading] = useState(true)
    const [statusFilter, setStatusFilter] = useState('')
    const [typeFilter, setTypeFilter] = useState('')
    const [search, setSearch] = useState('')
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [total, setTotal] = useState(0)

    const [formOpen, setFormOpen] = useState(false)
    const [editing, setEditing] = useState<LetterRow | null>(null)
    const [form, setForm] = useState<LetterForm>(EMPTY_FORM)
    const [saving, setSaving] = useState(false)
    const [members, setMembers] = useState<MemberOption[]>([])
    const [membersLoading, setMembersLoading] = useState(false)

    const [deleteTarget, setDeleteTarget] = useState<LetterRow | null>(null)
    const [deleting, setDeleting] = useState(false)
    const [issueTarget, setIssueTarget] = useState<LetterRow | null>(null)
    const [issuing, setIssuing] = useState(false)
    const [revokeTarget, setRevokeTarget] = useState<LetterRow | null>(null)
    const [revokeReason, setRevokeReason] = useState('')
    const [revoking, setRevoking] = useState(false)
    const [pdfId, setPdfId] = useState<string | null>(null)

    const fetchRows = useCallback(async () => {
        setLoading(true)
        try {
            const params = new URLSearchParams({ page: String(page), limit: '20' })
            if (statusFilter) params.set('status', statusFilter)
            if (typeFilter) params.set('letterType', typeFilter)
            if (search.trim()) params.set('q', search.trim())
            const res = await fetch(`/api/community/letters?${params.toString()}`)
            const json = await res.json().catch(() => ({}))
            if (res.ok) {
                setRows(Array.isArray(json.data) ? json.data : [])
                setTotalPages(json.totalPages ?? 1)
                setTotal(json.total ?? 0)
            }
        } catch {
            // swallow — UI shows empty state
        } finally {
            setLoading(false)
        }
    }, [page, statusFilter, typeFilter, search])

    useEffect(() => {
        void fetchRows()
    }, [fetchRows])

    useEffect(() => {
        setPage(1)
    }, [statusFilter, typeFilter, search])

    const fetchMembers = useCallback(async () => {
        setMembersLoading(true)
        try {
            const res = await fetch('/api/community/members?limit=100&status=ACTIVE')
            const json = await res.json().catch(() => ({}))
            if (res.ok && Array.isArray(json.data)) {
                setMembers(
                    json.data.map((m: { id: string; code: string; fullName: string }) => ({
                        id: m.id,
                        code: m.code,
                        fullName: m.fullName,
                    }))
                )
            }
        } catch {
            // ignore — select will be empty
        } finally {
            setMembersLoading(false)
        }
    }, [])

    const openCreate = () => {
        setEditing(null)
        setForm(EMPTY_FORM)
        setFormOpen(true)
        if (members.length === 0) void fetchMembers()
    }

    const openEdit = (row: LetterRow) => {
        setEditing(row)
        setForm({
            memberId: row.memberId,
            letterType: row.letterType,
            purpose: row.purpose,
            destination: row.destination ?? '',
            notes: row.notes ?? '',
        })
        setFormOpen(true)
        if (members.length === 0) void fetchMembers()
    }

    const handleSave = async () => {
        if (!form.memberId || !form.purpose.trim() || form.purpose.trim().length < 3) {
            addToast(t('community.common.requiredField'), 'error')
            return
        }
        setSaving(true)
        try {
            const payload: Record<string, unknown> = {
                memberId: form.memberId,
                letterType: form.letterType,
                purpose: form.purpose.trim(),
            }
            if (form.destination.trim()) payload.destination = form.destination.trim()
            if (form.notes.trim()) payload.notes = form.notes.trim()

            const res = await fetch(editing ? `/api/community/letters/${editing.id}` : '/api/community/letters', {
                method: editing ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            })
            const json = await res.json().catch(() => ({}))
            if (!res.ok) {
                addToast(apiErrorMessage(json), 'error')
                return
            }
            addToast(editing ? t('community.letters.toast.updated') : t('community.letters.toast.created'), 'success')
            setFormOpen(false)
            void fetchRows()
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
            const res = await fetch(`/api/community/letters/${deleteTarget.id}`, { method: 'DELETE' })
            const json = await res.json().catch(() => ({}))
            if (!res.ok) {
                addToast(apiErrorMessage(json), 'error')
                return
            }
            addToast(t('community.letters.toast.deleted'), 'success')
            setDeleteTarget(null)
            void fetchRows()
        } catch {
            addToast('Error', 'error')
        } finally {
            setDeleting(false)
        }
    }

    const handleIssue = async () => {
        if (!issueTarget) return
        setIssuing(true)
        try {
            const res = await fetch(`/api/community/letters/${issueTarget.id}/issue`, { method: 'POST' })
            const json = await res.json().catch(() => ({}))
            if (!res.ok) {
                addToast(apiErrorMessage(json), 'error')
                return
            }
            addToast(t('community.letters.toast.issued'), 'success')
            setIssueTarget(null)
            void fetchRows()
        } catch {
            addToast('Error', 'error')
        } finally {
            setIssuing(false)
        }
    }

    const handleRevoke = async () => {
        if (!revokeTarget) return
        const reason = revokeReason.trim()
        if (reason.length < 3 || reason.length > 500) {
            addToast(t('community.letters.revokeForm.reasonInvalid'), 'error')
            return
        }
        setRevoking(true)
        try {
            const res = await fetch(`/api/community/letters/${revokeTarget.id}/revoke`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reason }),
            })
            const json = await res.json().catch(() => ({}))
            if (!res.ok) {
                addToast(apiErrorMessage(json), 'error')
                return
            }
            addToast(t('community.letters.toast.revoked'), 'success')
            setRevokeTarget(null)
            setRevokeReason('')
            void fetchRows()
        } catch {
            addToast('Error', 'error')
        } finally {
            setRevoking(false)
        }
    }

    const handleDownloadPdf = async (row: LetterRow) => {
        setPdfId(row.id)
        try {
            const res = await fetch(`/api/community/letters/${row.id}/pdf`, { credentials: 'include' })
            if (!res.ok) {
                const json = await res.json().catch(() => ({}))
                addToast(apiErrorMessage(json), 'error')
                return
            }
            const blob = await res.blob()
            const disposition = res.headers.get('Content-Disposition') || ''
            const match = disposition.match(/filename="?([^";]+)"?/i)
            const filename = match?.[1] || (row.letterNumber ? `${row.letterNumber}.pdf` : `DRAF-${row.id}.pdf`)
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = filename
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            URL.revokeObjectURL(url)
        } catch {
            addToast('Error', 'error')
        } finally {
            setPdfId(null)
        }
    }

    const handleCopyVerify = async (row: LetterRow) => {
        if (!row.verifyUrl) return
        try {
            await navigator.clipboard.writeText(row.verifyUrl)
            addToast(t('community.letters.toast.linkCopied'), 'success')
        } catch {
            addToast(t('community.letters.toast.copyFailed'), 'error')
        }
    }

    const handleExport = async () => {
        try {
            // Ambil semua baris yang cocok dengan filter aktif (per halaman 100, maks 10 halaman).
            const all: LetterRow[] = []
            for (let p = 1; p <= 10; p++) {
                const params = new URLSearchParams({ page: String(p), limit: '100' })
                if (statusFilter) params.set('status', statusFilter)
                if (typeFilter) params.set('letterType', typeFilter)
                if (search.trim()) params.set('q', search.trim())
                const res = await fetch(`/api/community/letters?${params.toString()}`)
                const json = await res.json().catch(() => ({}))
                if (!res.ok || !Array.isArray(json.data)) break
                all.push(...(json.data as LetterRow[]))
                if (p >= (json.totalPages ?? 1)) break
            }
            if (all.length === 0) {
                addToast(t('community.common.noData'), 'info')
                return
            }
            exportToCSV(
                all.map((r) => ({
                    letterNumber: r.letterNumber ?? '-',
                    letterType: r.letterType,
                    member: r.member?.fullName ?? '-',
                    memberCode: r.member?.code ?? '-',
                    purpose: r.purpose,
                    destination: r.destination ?? '-',
                    status: r.status,
                    issuedAt: r.issuedAt ? formatDateID(r.issuedAt) : '-',
                    revokedAt: r.revokedAt ? formatDateID(r.revokedAt) : '-',
                })),
                'surat-komunitas',
                {
                    letterNumber: t('community.letters.table.letterNumber'),
                    letterType: t('community.letters.table.letterType'),
                    member: t('community.letters.table.member'),
                    memberCode: t('community.letters.table.memberCode'),
                    purpose: t('community.letters.table.purpose'),
                    destination: t('community.letters.table.destination'),
                    status: t('community.letters.table.status'),
                    issuedAt: t('community.letters.table.issuedAt'),
                    revokedAt: t('community.letters.table.revokedAt'),
                }
            )
        } catch {
            addToast('Error', 'error')
        }
    }

    const statusBadge = (status: string) => {
        switch (status) {
            case 'ISSUED':
                return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
            case 'REVOKED':
                return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
            default:
                return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
        }
    }

    const statusLabel = (status: string) => {
        switch (status) {
            case 'ISSUED':
                return t('community.letters.status.issued')
            case 'REVOKED':
                return t('community.letters.status.revoked')
            default:
                return t('community.letters.status.draft')
        }
    }

    const typeLabel = (letterType: string) => {
        switch (letterType) {
            case 'PENGANTAR':
                return t('community.letters.type.pengantar')
            case 'DOMISILI':
                return t('community.letters.type.domisili')
            case 'SKTM':
                return t('community.letters.type.sktm')
            case 'KETERANGAN_LAIN':
                return t('community.letters.type.lainnya')
            default:
                return letterType
        }
    }

    const inputClass =
        'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100'

    const memberOptions = useMemo(
        () => members.map((m) => ({ value: m.id, label: `${m.code} — ${m.fullName}` })),
        [members]
    )

    if (!canManage) {
        return (
            <div className="p-6">
                <EmptyState
                    icon={Ban}
                    title={t('community.letters.accessDenied.title')}
                    description={t('community.letters.accessDenied.desc')}
                />
            </div>
        )
    }

    return (
        <div className="space-y-6 p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('community.letters.title')}</h1>
                <div className="flex gap-2">
                    <button
                        onClick={handleExport}
                        className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                    >
                        <Download className="h-4 w-4" />
                        {t('community.common.exportCsv')}
                    </button>
                    <button
                        onClick={openCreate}
                        className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
                    >
                        <FilePlus2 className="h-4 w-4" />
                        {t('community.letters.new')}
                    </button>
                </div>
            </div>

            {/* Filter bar */}
            <div className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800 sm:flex-row sm:items-end">
                <div>
                    <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
                        {t('community.letters.filterStatus')}
                    </label>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className={`${inputClass} sm:w-44`}
                    >
                        <option value="">{t('community.common.filterAll')}</option>
                        {STATUS_VALUES.map((s) => (
                            <option key={s} value={s}>
                                {statusLabel(s)}
                            </option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
                        {t('community.letters.filterType')}
                    </label>
                    <select
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value)}
                        className={`${inputClass} sm:w-52`}
                    >
                        <option value="">{t('community.common.filterAll')}</option>
                        {LETTER_TYPE_VALUES.map((v) => (
                            <option key={v} value={v}>
                                {typeLabel(v)}
                            </option>
                        ))}
                    </select>
                </div>
                <div className="flex-1">
                    <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
                        {t('community.letters.searchLabel')}
                    </label>
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder={t('community.letters.searchPlaceholder')}
                        className={inputClass}
                    />
                </div>
            </div>

            <p className="text-sm text-gray-500 dark:text-gray-400">{total} data</p>

            {loading ? (
                <div className="space-y-3">
                    {[0, 1, 2].map((i) => (
                        <div
                            key={i}
                            className="h-20 animate-pulse rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
                        />
                    ))}
                </div>
            ) : rows.length === 0 ? (
                <EmptyState
                    icon={FileText}
                    title={t('community.letters.empty')}
                    description={t('community.letters.emptyDesc')}
                    actionLabel={t('community.letters.new')}
                    onAction={openCreate}
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
                                    <div className="min-w-0">
                                        <p className="truncate font-mono text-sm font-semibold text-gray-900 dark:text-gray-100">
                                            {row.letterNumber ?? t('community.letters.draftNumber')}
                                        </p>
                                        <p className="mt-0.5 truncate text-xs text-gray-500 dark:text-gray-400">
                                            {typeLabel(row.letterType)} · {row.member?.fullName ?? '-'}
                                        </p>
                                    </div>
                                    <span
                                        className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusBadge(row.status)}`}
                                    >
                                        {statusLabel(row.status)}
                                    </span>
                                </div>
                                <p className="mt-2 line-clamp-2 text-xs text-gray-600 dark:text-gray-300">{row.purpose}</p>
                                {row.issuedAt && (
                                    <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                                        {t('community.letters.table.issuedAt')}: {formatDateID(row.issuedAt)}
                                    </p>
                                )}
                                <div className="mt-3 flex flex-wrap gap-2">
                                    <Link
                                        href={`/dashboard/community/letters/${row.id}`}
                                        className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                                    >
                                        <ExternalLink className="h-3.5 w-3.5" /> {t('community.common.viewDetail')}
                                    </Link>
                                    {row.status === 'DRAFT' && (
                                        <>
                                            <button
                                                onClick={() => openEdit(row)}
                                                className="inline-flex items-center gap-1 rounded-lg border border-blue-300 px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 dark:border-blue-700 dark:text-blue-400 dark:hover:bg-blue-900/20"
                                            >
                                                <Pencil className="h-3.5 w-3.5" /> {t('community.letters.edit')}
                                            </button>
                                            <button
                                                onClick={() => setDeleteTarget(row)}
                                                className="inline-flex items-center gap-1 rounded-lg border border-red-300 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" /> {t('community.letters.delete')}
                                            </button>
                                        </>
                                    )}
                                    {(row.status === 'DRAFT' || row.status === 'ISSUED') && (
                                        <button
                                            onClick={() => void handleDownloadPdf(row)}
                                            disabled={pdfId === row.id}
                                            className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                                        >
                                            <Download className="h-3.5 w-3.5" />{' '}
                                            {pdfId === row.id ? t('community.common.loading') : 'PDF'}
                                        </button>
                                    )}
                                    {row.status === 'ISSUED' && row.verifyUrl && (
                                        <button
                                            onClick={() => void handleCopyVerify(row)}
                                            className="inline-flex items-center gap-1 rounded-lg border border-green-300 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-50 dark:border-green-700 dark:text-green-400 dark:hover:bg-green-900/20"
                                        >
                                            <Copy className="h-3.5 w-3.5" /> {t('community.letters.copyVerify')}
                                        </button>
                                    )}
                                    {row.status === 'DRAFT' && canApprove && (
                                        <button
                                            onClick={() => setIssueTarget(row)}
                                            className="inline-flex items-center gap-1 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700"
                                        >
                                            <BadgeCheck className="h-3.5 w-3.5" /> {t('community.letters.issue')}
                                        </button>
                                    )}
                                    {row.status === 'ISSUED' && canApprove && (
                                        <button
                                            onClick={() => {
                                                setRevokeTarget(row)
                                                setRevokeReason('')
                                            }}
                                            className="inline-flex items-center gap-1 rounded-lg border border-red-300 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20"
                                        >
                                            <Ban className="h-3.5 w-3.5" /> {t('community.letters.revoke')}
                                        </button>
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
                                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                        {t('community.letters.table.letterNumber')}
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                        {t('community.letters.table.letterType')}
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                        {t('community.letters.table.member')}
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                        {t('community.letters.table.purpose')}
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                        {t('community.letters.table.status')}
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                        {t('community.letters.table.issuedAt')}
                                    </th>
                                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                        {t('community.common.actions')}
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {rows.map((row) => (
                                    <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                        <td className="whitespace-nowrap px-4 py-3 font-mono text-sm font-medium text-gray-900 dark:text-gray-100">
                                            {row.letterNumber ?? (
                                                <span className="text-gray-400 dark:text-gray-500">
                                                    {t('community.letters.draftNumber')}
                                                </span>
                                            )}
                                        </td>
                                        <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                                            {typeLabel(row.letterType)}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                                            {row.member?.fullName ?? '-'}
                                        </td>
                                        <td className="max-w-[240px] truncate px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                                            {row.purpose}
                                        </td>
                                        <td className="whitespace-nowrap px-4 py-3 text-sm">
                                            <span
                                                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusBadge(row.status)}`}
                                            >
                                                {statusLabel(row.status)}
                                            </span>
                                        </td>
                                        <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                                            {row.issuedAt ? formatDateID(row.issuedAt) : '-'}
                                        </td>
                                        <td className="whitespace-nowrap px-4 py-3 text-right">
                                            <div className="inline-flex flex-wrap justify-end gap-1.5">
                                                <Link
                                                    href={`/dashboard/community/letters/${row.id}`}
                                                    className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                                                >
                                                    <ExternalLink className="h-3.5 w-3.5" />{' '}
                                                    {t('community.common.viewDetail')}
                                                </Link>
                                                {row.status === 'DRAFT' && (
                                                    <>
                                                        <button
                                                            onClick={() => openEdit(row)}
                                                            className="inline-flex items-center gap-1 rounded-lg border border-blue-300 px-2.5 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 dark:border-blue-700 dark:text-blue-400 dark:hover:bg-blue-900/20"
                                                        >
                                                            <Pencil className="h-3.5 w-3.5" /> {t('community.letters.edit')}
                                                        </button>
                                                        <button
                                                            onClick={() => setDeleteTarget(row)}
                                                            className="inline-flex items-center gap-1 rounded-lg border border-red-300 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20"
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" /> {t('community.letters.delete')}
                                                        </button>
                                                    </>
                                                )}
                                                {(row.status === 'DRAFT' || row.status === 'ISSUED') && (
                                                    <button
                                                        onClick={() => void handleDownloadPdf(row)}
                                                        disabled={pdfId === row.id}
                                                        className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                                                    >
                                                        <Download className="h-3.5 w-3.5" />{' '}
                                                        {pdfId === row.id ? t('community.common.loading') : 'PDF'}
                                                    </button>
                                                )}
                                                {row.status === 'ISSUED' && row.verifyUrl && (
                                                    <button
                                                        onClick={() => void handleCopyVerify(row)}
                                                        className="inline-flex items-center gap-1 rounded-lg border border-green-300 px-2.5 py-1 text-xs font-medium text-green-700 hover:bg-green-50 dark:border-green-700 dark:text-green-400 dark:hover:bg-green-900/20"
                                                    >
                                                        <Copy className="h-3.5 w-3.5" /> {t('community.letters.copyVerify')}
                                                    </button>
                                                )}
                                                {row.status === 'DRAFT' && canApprove && (
                                                    <button
                                                        onClick={() => setIssueTarget(row)}
                                                        className="inline-flex items-center gap-1 rounded-lg bg-green-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-green-700"
                                                    >
                                                        <BadgeCheck className="h-3.5 w-3.5" /> {t('community.letters.issue')}
                                                    </button>
                                                )}
                                                {row.status === 'ISSUED' && canApprove && (
                                                    <button
                                                        onClick={() => {
                                                            setRevokeTarget(row)
                                                            setRevokeReason('')
                                                        }}
                                                        className="inline-flex items-center gap-1 rounded-lg border border-red-300 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20"
                                                    >
                                                        <Ban className="h-3.5 w-3.5" /> {t('community.letters.revoke')}
                                                    </button>
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
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                                Halaman {page} / {totalPages}
                            </span>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                                    disabled={page <= 1}
                                    className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-50 dark:border-gray-600"
                                >
                                    ←
                                </button>
                                <button
                                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                    disabled={page >= totalPages}
                                    className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-50 dark:border-gray-600"
                                >
                                    →
                                </button>
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* Modal Create / Edit Surat */}
            {formOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
                    <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl bg-white p-6 dark:bg-gray-800">
                        <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
                            {editing ? t('community.letters.editTitle') : t('community.letters.newTitle')}
                        </h2>
                        <div className="space-y-4">
                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    {t('community.letters.form.member')} *
                                </label>
                                <select
                                    value={form.memberId}
                                    onChange={(e) => setForm((f) => ({ ...f, memberId: e.target.value }))}
                                    disabled={membersLoading}
                                    className={inputClass}
                                >
                                    <option value="">
                                        {membersLoading
                                            ? t('community.common.loading')
                                            : t('community.letters.form.memberPlaceholder')}
                                    </option>
                                    {memberOptions.map((m) => (
                                        <option key={m.value} value={m.value}>
                                            {m.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    {t('community.letters.form.letterType')} *
                                </label>
                                <select
                                    value={form.letterType}
                                    onChange={(e) => setForm((f) => ({ ...f, letterType: e.target.value }))}
                                    className={inputClass}
                                >
                                    {LETTER_TYPE_VALUES.map((v) => (
                                        <option key={v} value={v}>
                                            {typeLabel(v)}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    {t('community.letters.form.purpose')} *
                                </label>
                                <textarea
                                    value={form.purpose}
                                    onChange={(e) => setForm((f) => ({ ...f, purpose: e.target.value }))}
                                    rows={2}
                                    className={inputClass}
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    {t('community.letters.form.destination')}
                                </label>
                                <input
                                    type="text"
                                    value={form.destination}
                                    onChange={(e) => setForm((f) => ({ ...f, destination: e.target.value }))}
                                    className={inputClass}
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    {t('community.letters.form.notes')}
                                </label>
                                <textarea
                                    value={form.notes}
                                    onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                                    rows={2}
                                    className={inputClass}
                                />
                            </div>
                        </div>
                        <div className="mt-6 flex justify-end gap-3">
                            <button
                                onClick={() => setFormOpen(false)}
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

            {/* Modal Revoke */}
            {revokeTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
                    <div className="w-full max-w-md rounded-xl bg-white p-6 dark:bg-gray-800">
                        <h2 className="mb-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
                            {t('community.letters.revokeForm.title')}
                        </h2>
                        <p className="mb-4 text-sm text-gray-600 dark:text-gray-300">
                            {revokeTarget.letterNumber ?? t('community.letters.draftNumber')} — {revokeTarget.member?.fullName ?? '-'}
                        </p>
                        <div>
                            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                {t('community.letters.revokeForm.reason')} *
                            </label>
                            <textarea
                                value={revokeReason}
                                onChange={(e) => setRevokeReason(e.target.value)}
                                rows={3}
                                maxLength={500}
                                className={inputClass}
                            />
                            <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">{revokeReason.trim().length}/500</p>
                        </div>
                        <div className="mt-6 flex justify-end gap-3">
                            <button
                                onClick={() => setRevokeTarget(null)}
                                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                            >
                                {t('community.common.cancel')}
                            </button>
                            <button
                                onClick={handleRevoke}
                                disabled={revoking}
                                className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                            >
                                <Undo2 className="h-4 w-4" />
                                {revoking ? t('community.common.loading') : t('community.letters.revokeForm.submit')}
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
                message={t('community.letters.deleteConfirmDesc')}
                confirmText={t('community.letters.delete')}
                cancelText={t('community.common.cancel')}
                variant="danger"
                isLoading={deleting}
            />

            <ConfirmDialog
                isOpen={!!issueTarget}
                onClose={() => setIssueTarget(null)}
                onConfirm={handleIssue}
                title={t('community.letters.issueConfirm.title')}
                message={t('community.letters.issueConfirm.desc')}
                confirmText={t('community.letters.issue')}
                cancelText={t('community.common.cancel')}
                isLoading={issuing}
            />
        </div>
    )
}
