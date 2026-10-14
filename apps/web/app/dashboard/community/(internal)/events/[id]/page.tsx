'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
    ArrowDownRight,
    ArrowLeft,
    ArrowUpRight,
    Ban,
    CalendarDays,
    CheckCircle2,
    MapPin,
    Pencil,
    Trash2,
    UserPlus,
    Users,
    Wallet,
} from 'lucide-react'
import { useTranslation } from '@/lib/i18n'
import { usePermission } from '@/lib/use-permission'
import { useToast } from '@/components/ui/toast'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { formatCurrencyIDR, formatDateID } from '@/lib/export'

interface EventDetail {
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
    announcementId: string | null
    createdAt: string
    updatedAt: string
    _count?: { transactions: number }
}

interface CashRow {
    id: string
    txNumber: string | null
    type: string
    category: string
    amount: number
    description: string | null
    txDate: string
    status: string
    eventId: string | null
}

interface ParticipantRow {
    id: string
    memberId: string
    status: string
    note: string | null
    registeredAt: string
    member: { id: string; code: string; fullName: string; phone: string | null }
}

interface MemberOption {
    id: string
    code: string
    fullName: string
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

export default function CommunityEventDetailPage() {
    const params = useParams<{ id: string }>()
    const id = params?.id ?? ''
    const { t } = useTranslation()
    const { addToast } = useToast()
    const { hasPermission } = usePermission()
    const canManage = hasPermission('community:manage')

    const [event, setEvent] = useState<EventDetail | null>(null)
    const [cashRows, setCashRows] = useState<CashRow[]>([])
    const [participants, setParticipants] = useState<ParticipantRow[]>([])
    const [loading, setLoading] = useState(true)
    const [notFound, setNotFound] = useState(false)

    // —— Peserta (Fase 3) ——
    const [addOpen, setAddOpen] = useState(false)
    const [addMemberId, setAddMemberId] = useState('')
    const [addNote, setAddNote] = useState('')
    const [addSaving, setAddSaving] = useState(false)
    const [memberOptions, setMemberOptions] = useState<MemberOption[]>([])
    const [memberOptionsLoading, setMemberOptionsLoading] = useState(false)
    const [participantAction, setParticipantAction] = useState<string | null>(null) // id baris yang sedang diproses
    const [cancelParticipant, setCancelParticipant] = useState<ParticipantRow | null>(null)
    const [cancelSaving, setCancelSaving] = useState(false)

    const [formOpen, setFormOpen] = useState(false)
    const [form, setForm] = useState<EventForm>({
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
    })
    const [saving, setSaving] = useState(false)
    const [deleteOpen, setDeleteOpen] = useState(false)
    const [deleting, setDeleting] = useState(false)

    const fetchAll = useCallback(async () => {
        if (!id) return
        try {
            setLoading(true)
            const [eventRes, cashRes, participantRes] = await Promise.all([
                fetch(`/api/community/events/${id}`, { credentials: 'include' }),
                // Server-side filter eventId (GET /api/community/cash-transactions?eventId=<id>) —
                // 404 jika event bukan milik tenant ini (guard backend).
                fetch(`/api/community/cash-transactions?eventId=${encodeURIComponent(id)}&limit=100`, { credentials: 'include' }),
                fetch(`/api/community/events/${id}/participants`, { credentials: 'include' }),
            ])
            if (eventRes.status === 404) {
                setNotFound(true)
                return
            }
            if (!eventRes.ok) {
                const json = (await eventRes.json().catch(() => null)) as Record<string, unknown> | null
                addToast(apiErrorMessage(json), 'error')
                return
            }
            const eventJson = (await eventRes.json()) as { data?: EventDetail }
            setEvent(eventJson.data ?? null)
            if (!eventJson.data) {
                setNotFound(true)
                return
            }
            if (cashRes.ok) {
                const cashJson = (await cashRes.json()) as { data?: CashRow[] }
                setCashRows(cashJson.data ?? [])
            }
            if (participantRes.ok) {
                const pJson = (await participantRes.json()) as { data?: ParticipantRow[] }
                setParticipants(pJson.data ?? [])
            } else {
                // 403 community:view — section disembunyikan tanpa menggagalkan seluruh halaman.
                setParticipants([])
            }
        } catch {
            addToast('Error', 'error')
        } finally {
            setLoading(false)
        }
    }, [id, addToast])

    useEffect(() => {
        void fetchAll()
    }, [fetchAll])

    const { totalIncome, totalExpense } = useMemo(() => {
        let income = 0
        let expense = 0
        for (const r of cashRows) {
            if (r.status === 'REJECTED') continue
            if (r.type === 'INCOME') income += Number(r.amount)
            else expense += Number(r.amount)
        }
        return { totalIncome: income, totalExpense: expense }
    }, [cashRows])

    const budgetUsagePct = useMemo(() => {
        if (!event?.budgetAmount || event.budgetAmount <= 0) return null
        return Math.min(100, Math.round((totalExpense / event.budgetAmount) * 100))
    }, [totalExpense, event?.budgetAmount])

    /** Ringkasan peserta — `active` = REGISTERED + ATTENDED (mengisi kuota). */
    const participantStats = {
        registered: participants.filter((p) => p.status === 'REGISTERED').length,
        attended: participants.filter((p) => p.status === 'ATTENDED').length,
        cancelled: participants.filter((p) => p.status === 'CANCELLED').length,
        active: participants.filter((p) => p.status === 'REGISTERED' || p.status === 'ATTENDED').length,
    }

    /** Opsi dropdown Tambah — kecualikan warga yang sudah terdaftar aktif (CANCELLED boleh diaktifkan lagi). */
    const addableMemberOptions = memberOptions.filter(
        (m) => !participants.some((p) => p.memberId === m.id && p.status !== 'CANCELLED')
    )

    const setField = (key: keyof EventForm, value: string) => {
        setForm((prev) => ({ ...prev, [key]: value }))
    }

    const openEdit = () => {
        if (!event) return
        setForm({
            title: event.title,
            description: event.description ?? '',
            category: event.category,
            startsAt: toLocalInput(event.startsAt),
            endsAt: toLocalInput(event.endsAt),
            location: event.location ?? '',
            maxCapacity: event.maxCapacity != null ? String(event.maxCapacity) : '',
            budgetAmount: event.budgetAmount != null ? String(event.budgetAmount) : '',
            publishedAt: toLocalInput(event.publishedAt),
            status: event.status,
        })
        setFormOpen(true)
    }

    const handleSave = async () => {
        if (!event) return
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
            const res = await fetch(`/api/community/events/${event.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(payload),
            })
            const json = (await res.json().catch(() => null)) as Record<string, unknown> | null
            if (!res.ok) {
                addToast(apiErrorMessage(json), 'error')
                return
            }
            addToast(t('community.events.toast.updated'), 'success')
            setFormOpen(false)
            await fetchAll()
        } catch {
            addToast('Error', 'error')
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async () => {
        if (!event) return
        try {
            setDeleting(true)
            const res = await fetch(`/api/community/events/${event.id}`, {
                method: 'DELETE',
                credentials: 'include',
            })
            const json = (await res.json().catch(() => null)) as Record<string, unknown> | null
            if (!res.ok) {
                // 409 EVENT_HAS_TRANSACTIONS — guard backend; tampilkan pesan API apa adanya.
                addToast(apiErrorMessage(json), 'error')
                return
            }
            addToast(t('community.events.toast.deleted'), 'success')
            window.location.href = '/dashboard/community/events'
        } catch {
            addToast('Error', 'error')
        } finally {
            setDeleting(false)
        }
    }

    // —— Peserta (Fase 3) ——
    const openAddParticipant = async () => {
        setAddMemberId('')
        setAddNote('')
        setAddOpen(true)
        if (memberOptions.length > 0) return
        try {
            setMemberOptionsLoading(true)
            const res = await fetch('/api/community/members?limit=100&status=ACTIVE', { credentials: 'include' })
            if (res.ok) {
                const json = (await res.json()) as { data?: Array<{ id: string; code: string; fullName: string }> }
                setMemberOptions((json.data ?? []).map((m) => ({ id: m.id, code: m.code, fullName: m.fullName })))
            }
        } catch {
            addToast('Error', 'error')
        } finally {
            setMemberOptionsLoading(false)
        }
    }

    const handleAddParticipant = async () => {
        if (!event) return
        if (!addMemberId) {
            addToast(t('community.events.participants.memberRequired'), 'error')
            return
        }
        try {
            setAddSaving(true)
            const res = await fetch(`/api/community/events/${event.id}/participants`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ memberId: addMemberId, note: addNote.trim() || undefined }),
            })
            const json = (await res.json().catch(() => null)) as Record<string, unknown> | null
            if (!res.ok) {
                // 409 ALREADY_REGISTERED / EVENT_FULL — tampilkan pesan API apa adanya.
                addToast(apiErrorMessage(json), 'error')
                return
            }
            addToast(t('community.events.participants.toast.added'), 'success')
            setAddOpen(false)
            await fetchAll()
        } catch {
            addToast('Error', 'error')
        } finally {
            setAddSaving(false)
        }
    }

    const handleMarkAttended = async (row: ParticipantRow) => {
        if (!event) return
        try {
            setParticipantAction(row.id)
            const res = await fetch(`/api/community/events/${event.id}/participants/${row.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ status: 'ATTENDED' }),
            })
            const json = (await res.json().catch(() => null)) as Record<string, unknown> | null
            if (!res.ok) {
                // ATTENDED → hanya boleh ATTENDED (400 INVALID_STATUS_TRANSITION bila dicoba diubah).
                addToast(apiErrorMessage(json), 'error')
                return
            }
            addToast(t('community.events.participants.toast.markedAttended'), 'success')
            await fetchAll()
        } catch {
            addToast('Error', 'error')
        } finally {
            setParticipantAction(null)
        }
    }

    const handleCancelParticipant = async () => {
        if (!event || !cancelParticipant) return
        try {
            setCancelSaving(true)
            // DELETE internal = soft-cancel in-place (spec §4.2) — flip status CANCELLED.
            const res = await fetch(`/api/community/events/${event.id}/participants/${cancelParticipant.id}`, {
                method: 'DELETE',
                credentials: 'include',
            })
            const json = (await res.json().catch(() => null)) as Record<string, unknown> | null
            if (!res.ok) {
                addToast(apiErrorMessage(json), 'error')
                return
            }
            addToast(t('community.events.participants.toast.cancelled'), 'success')
            setCancelParticipant(null)
            await fetchAll()
        } catch {
            addToast('Error', 'error')
        } finally {
            setCancelSaving(false)
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

    const participantStatusBadge = (status: string) => {
        switch (status) {
            case 'REGISTERED':
                return (
                    <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                        {t('community.events.participants.status.registered')}
                    </span>
                )
            case 'ATTENDED':
                return (
                    <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                        {t('community.events.participants.status.attended')}
                    </span>
                )
            case 'CANCELLED':
                return (
                    <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-500 dark:bg-gray-700 dark:text-gray-400">
                        {t('community.events.participants.status.cancelled')}
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

    const cashTypeLabel = (type: string) =>
        type === 'INCOME' ? t('community.events.detail.income') : t('community.events.detail.expense')

    const inputClass =
        'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100'

    if (!canManage) {
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

    if (loading) {
        return (
            <div className="space-y-6 p-6">
                <div className="h-8 w-48 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                <div className="h-48 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-700" />
                <div className="h-40 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-700" />
            </div>
        )
    }

    if (notFound || !event) {
        return (
            <div className="p-6">
                <div className="rounded-xl border border-gray-200 bg-white p-8 text-center dark:border-gray-700 dark:bg-gray-800">
                    <CalendarDays className="mx-auto mb-3 h-10 w-10 text-gray-400" />
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                        {t('community.common.notFound')}
                    </h2>
                    <Link
                        href="/dashboard/community/events"
                        className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        {t('community.events.title')}
                    </Link>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6 p-6">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <Link
                        href="/dashboard/community/events"
                        className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        {t('community.events.title')}
                    </Link>
                    <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{event.eventNumber}</p>
                        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">{event.title}</h1>
                    </div>
                    {statusBadge(event.status)}
                </div>
                {canManage && (
                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            type="button"
                            onClick={openEdit}
                            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                        >
                            <Pencil className="h-4 w-4" />
                            {t('community.common.edit')}
                        </button>
                        <button
                            type="button"
                            onClick={() => setDeleteOpen(true)}
                            className="inline-flex items-center gap-2 rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20"
                        >
                            <Trash2 className="h-4 w-4" />
                            {t('community.common.delete')}
                        </button>
                    </div>
                )}
            </div>

            {/* Info kegiatan */}
            <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
                <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
                    <CalendarDays className="h-4 w-4" />
                    {t('community.events.detail.eventInfo')}
                </h2>
                <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                        <dt className="text-xs text-gray-500 dark:text-gray-400">
                            {t('community.events.table.eventNumber')}
                        </dt>
                        <dd className="mt-0.5 text-sm font-medium text-gray-900 dark:text-gray-100">
                            {event.eventNumber}
                        </dd>
                    </div>
                    <div>
                        <dt className="text-xs text-gray-500 dark:text-gray-400">
                            {t('community.events.table.category')}
                        </dt>
                        <dd className="mt-0.5 text-sm text-gray-900 dark:text-gray-100">
                            {categoryLabel(event.category)}
                        </dd>
                    </div>
                    <div>
                        <dt className="text-xs text-gray-500 dark:text-gray-400">
                            {t('community.events.table.startsAt')}
                        </dt>
                        <dd className="mt-0.5 flex items-center gap-1 text-sm text-gray-900 dark:text-gray-100">
                            <CalendarDays className="h-3.5 w-3.5 text-gray-400" />
                            {formatDateID(event.startsAt)}
                            {event.endsAt ? ` — ${formatDateID(event.endsAt)}` : ''}
                        </dd>
                    </div>
                    <div>
                        <dt className="text-xs text-gray-500 dark:text-gray-400">
                            {t('community.events.table.location')}
                        </dt>
                        <dd className="mt-0.5 flex items-center gap-1 text-sm text-gray-900 dark:text-gray-100">
                            <MapPin className="h-3.5 w-3.5 text-gray-400" />
                            {event.location ?? '-'}
                        </dd>
                    </div>
                    <div>
                        <dt className="text-xs text-gray-500 dark:text-gray-400">
                            {t('community.events.form.maxCapacity')}
                        </dt>
                        <dd className="mt-0.5 flex items-center gap-1 text-sm text-gray-900 dark:text-gray-100">
                            <Users className="h-3.5 w-3.5 text-gray-400" />
                            {event.maxCapacity != null ? event.maxCapacity : '-'}
                        </dd>
                    </div>
                    <div>
                        <dt className="text-xs text-gray-500 dark:text-gray-400">
                            {t('community.events.detail.publishedAt')}
                        </dt>
                        <dd className="mt-0.5 text-sm text-gray-900 dark:text-gray-100">
                            {event.publishedAt ? formatDateID(event.publishedAt) : t('community.events.detail.unpublished')}
                        </dd>
                    </div>
                    {event.description && (
                        <div className="sm:col-span-2">
                            <dt className="text-xs text-gray-500 dark:text-gray-400">
                                {t('community.events.form.description')}
                            </dt>
                            <dd className="mt-0.5 whitespace-pre-wrap text-sm text-gray-900 dark:text-gray-100">
                                {event.description}
                            </dd>
                        </div>
                    )}
                </dl>
            </div>

            {/* Anggaran & realisasi */}
            <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
                <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
                    <Wallet className="h-4 w-4" />
                    {t('community.events.detail.budgetTitle')}
                </h2>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-900/50">
                        <p className="text-xs text-gray-500 dark:text-gray-400">{t('community.events.table.budget')}</p>
                        <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-gray-100">
                            {event.budgetAmount != null ? formatCurrencyIDR(event.budgetAmount) : t('community.events.detail.noBudget')}
                        </p>
                    </div>
                    <div className="rounded-lg bg-green-50 p-4 dark:bg-green-900/20">
                        <p className="flex items-center gap-1 text-xs text-green-700 dark:text-green-400">
                            <ArrowDownRight className="h-3.5 w-3.5" />
                            {t('community.events.detail.income')}
                        </p>
                        <p className="mt-1 text-lg font-semibold text-green-700 dark:text-green-400">
                            {formatCurrencyIDR(totalIncome)}
                        </p>
                    </div>
                    <div className="rounded-lg bg-red-50 p-4 dark:bg-red-900/20">
                        <p className="flex items-center gap-1 text-xs text-red-700 dark:text-red-400">
                            <ArrowUpRight className="h-3.5 w-3.5" />
                            {t('community.events.detail.expense')}
                        </p>
                        <p className="mt-1 text-lg font-semibold text-red-700 dark:text-red-400">
                            {formatCurrencyIDR(totalExpense)}
                        </p>
                    </div>
                </div>
                {budgetUsagePct != null && (
                    <div className="mt-4">
                        <div className="mb-1 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                            <span>{t('community.events.detail.budgetUsage')}</span>
                            <span>{budgetUsagePct}%</span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                            <div
                                className={`h-full rounded-full ${budgetUsagePct >= 90 ? 'bg-red-500' : budgetUsagePct >= 70 ? 'bg-amber-500' : 'bg-green-500'}`}
                                style={{ width: `${budgetUsagePct}%` }}
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* Peserta kegiatan (Fase 3) */}
            <div>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
                        <Users className="h-4 w-4" />
                        {t('community.events.participants.title')}
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                            {participantStats.active}
                            {event.maxCapacity != null ? ` / ${event.maxCapacity}` : ''}
                        </span>
                    </h2>
                    <button
                        type="button"
                        onClick={() => void openAddParticipant()}
                        className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                    >
                        <UserPlus className="h-4 w-4" />
                        {t('community.events.participants.add')}
                    </button>
                </div>
                {participants.length === 0 ? (
                    <p className="rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
                        {t('community.events.participants.empty')}
                    </p>
                ) : (
                    <div className="space-y-3 md:hidden">
                        {participants.map((row) => (
                            <div
                                key={row.id}
                                className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800"
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">{row.member.code}</p>
                                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                            {row.member.fullName}
                                        </p>
                                    </div>
                                    {participantStatusBadge(row.status)}
                                </div>
                                {row.note && (
                                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{row.note}</p>
                                )}
                                <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                                    {formatDateID(row.registeredAt)}
                                </p>
                                {row.status === 'REGISTERED' && (
                                    <div className="mt-3 flex gap-2">
                                        <button
                                            type="button"
                                            onClick={() => void handleMarkAttended(row)}
                                            disabled={participantAction === row.id}
                                            className="inline-flex items-center gap-1 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
                                        >
                                            <CheckCircle2 className="h-3.5 w-3.5" />
                                            {t('community.events.participants.markAttended')}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setCancelParticipant(row)}
                                            disabled={participantAction === row.id}
                                            className="inline-flex items-center gap-1 rounded-lg border border-red-300 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20"
                                        >
                                            <Ban className="h-3.5 w-3.5" />
                                            {t('community.events.participants.cancel')}
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
                {participants.length > 0 && (
                    <div className="hidden overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 md:block">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900/50">
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                        {t('community.members.table.code')}
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                        {t('community.members.table.fullName')}
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                        {t('community.members.table.phone')}
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                        {t('community.events.participants.registeredAt')}
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
                                {participants.map((row) => (
                                    <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                        <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">
                                            {row.member.code}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                                            {row.member.fullName}
                                        </td>
                                        <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                                            {row.member.phone ?? '-'}
                                        </td>
                                        <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                                            {formatDateID(row.registeredAt)}
                                            {row.note && (
                                                <span className="ml-2 text-xs text-gray-400">{row.note}</span>
                                            )}
                                        </td>
                                        <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                                            {participantStatusBadge(row.status)}
                                        </td>
                                        <td className="whitespace-nowrap px-4 py-3 text-right text-sm">
                                            {row.status === 'REGISTERED' ? (
                                                <div className="flex justify-end gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => void handleMarkAttended(row)}
                                                        disabled={participantAction === row.id}
                                                        className="inline-flex items-center gap-1 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
                                                    >
                                                        <CheckCircle2 className="h-3.5 w-3.5" />
                                                        {t('community.events.participants.markAttended')}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setCancelParticipant(row)}
                                                        disabled={participantAction === row.id}
                                                        className="inline-flex items-center gap-1 rounded-lg border border-red-300 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20"
                                                    >
                                                        <Ban className="h-3.5 w-3.5" />
                                                        {t('community.events.participants.cancel')}
                                                    </button>
                                                </div>
                                            ) : (
                                                <span className="text-xs text-gray-400 dark:text-gray-500">—</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Realisasi kas (transaksi terkait) */}
            <div>
                <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
                    <Wallet className="h-4 w-4" />
                    {t('community.events.detail.cashRealization')}
                </h2>
                {cashRows.length === 0 ? (
                    <p className="rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
                        {t('community.events.detail.noCash')}
                    </p>
                ) : (
                    <div className="space-y-3 md:hidden">
                        {cashRows.map((row) => (
                            <div
                                key={row.id}
                                className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800"
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">{row.txNumber ?? '-'}</p>
                                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                            {row.description ?? row.category}
                                        </p>
                                    </div>
                                    <span
                                        className={`text-sm font-semibold ${row.type === 'INCOME' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}
                                    >
                                        {row.type === 'INCOME' ? '+' : '-'}
                                        {formatCurrencyIDR(row.amount)}
                                    </span>
                                </div>
                                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                    {formatDateID(row.txDate)} · {cashTypeLabel(row.type)}
                                </p>
                            </div>
                        ))}
                    </div>
                )}
                {cashRows.length > 0 && (
                    <div className="hidden overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 md:block">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900/50">
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                        {t('community.cash.table.txNumber')}
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                        {t('community.cash.table.category')}
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                        {t('community.cash.table.txDate')}
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                        {t('community.events.table.status')}
                                    </th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                        {t('community.cash.table.amount')}
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {cashRows.map((row) => (
                                    <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                        <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">
                                            {row.txNumber ?? '-'}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                                            {row.description ?? row.category}
                                            <span className="ml-2 text-xs text-gray-400">{cashTypeLabel(row.type)}</span>
                                        </td>
                                        <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                                            {formatDateID(row.txDate)}
                                        </td>
                                        <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                                            {row.status}
                                        </td>
                                        <td
                                            className={`whitespace-nowrap px-4 py-3 text-right text-sm font-semibold ${row.type === 'INCOME' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}
                                        >
                                            {row.type === 'INCOME' ? '+' : '-'}
                                            {formatCurrencyIDR(row.amount)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal Tambah Peserta */}
            {addOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-gray-800">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                            {t('community.events.participants.addTitle')}
                        </h3>
                        <div className="mt-4 space-y-4">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                {t('community.events.participants.selectMember')}
                                <select
                                    value={addMemberId}
                                    onChange={(e) => setAddMemberId(e.target.value)}
                                    disabled={memberOptionsLoading}
                                    className={`mt-1 ${inputClass}`}
                                >
                                    <option value="">
                                        {memberOptionsLoading
                                            ? t('community.common.loading')
                                            : t('community.events.participants.noMembers')}
                                    </option>
                                    {addableMemberOptions.map((m) => (
                                        <option key={m.id} value={m.id}>
                                            {m.code} — {m.fullName}
                                        </option>
                                    ))}
                                </select>
                            </label>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                {t('community.events.participants.noteOptional')}
                                <textarea
                                    value={addNote}
                                    onChange={(e) => setAddNote(e.target.value)}
                                    rows={2}
                                    maxLength={500}
                                    className={`mt-1 ${inputClass}`}
                                />
                            </label>
                        </div>
                        <div className="mt-6 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setAddOpen(false)}
                                className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                            >
                                {t('community.common.cancel')}
                            </button>
                            <button
                                type="button"
                                onClick={() => void handleAddParticipant()}
                                disabled={addSaving}
                                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                            >
                                {addSaving ? t('community.common.loading') : t('community.common.save')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Edit */}
            {formOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-xl dark:bg-gray-800">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                            {t('community.events.editTitle')}
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
                isOpen={deleteOpen}
                onClose={() => setDeleteOpen(false)}
                onConfirm={handleDelete}
                title={t('community.common.confirmDeleteTitle')}
                message={t('community.events.deleteConfirmDesc')}
                confirmText={t('community.common.delete')}
                cancelText={t('community.common.cancel')}
                variant="danger"
                isLoading={deleting}
            />

            <ConfirmDialog
                isOpen={cancelParticipant !== null}
                onClose={() => setCancelParticipant(null)}
                onConfirm={() => void handleCancelParticipant()}
                title={t('community.events.participants.cancelConfirmTitle')}
                message={t('community.events.participants.cancelConfirmDesc')}
                confirmText={t('community.events.participants.cancel')}
                cancelText={t('community.common.cancel')}
                variant="danger"
                isLoading={cancelSaving}
            />
        </div>
    )
}
