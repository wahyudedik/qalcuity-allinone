'use client'

import { useCallback, useEffect, useState } from 'react'
import { CalendarDays, MapPin, UserPlus, Ban } from 'lucide-react'
import { useTranslation } from '@/lib/i18n'
import { EmptyState } from '@/components/ui/empty-state'
import { useToast } from '@/components/ui/toast'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { formatDateID } from '@/lib/export'

interface PortalEventRow {
    id: string
    eventNumber: string
    title: string
    description: string | null
    category: string
    startsAt: string
    endsAt: string | null
    location: string | null
    maxCapacity: number | null
    status: string
    publishedAt: string | null
    /** Fase 3 — status pendaftaran diri warga (null = belum terdaftar). */
    participantStatus: string | null
    /** Fase 3 — jumlah peserta aktif (REGISTERED/ATTENDED) + kapasitas. */
    participantCount: { active: number; maxCapacity: number | null } | null
}

function apiErrorMessage(json: Record<string, unknown> | null | undefined): string {
    if (!json) return ''
    if (typeof json.error === 'string' && json.error) return json.error
    const err = json.error
    if (err && typeof err === 'object' && typeof (err as { message?: unknown }).message === 'string') {
        return (err as { message: string }).message
    }
    if (typeof json.message === 'string' && json.message) return json.message
    return ''
}

function statusBadge(t: (k: string) => string, status: string) {
    switch (status) {
        case 'ONGOING':
            return { cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', label: t('community.events.status.ongoing') }
        case 'DONE':
            return { cls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', label: t('community.events.status.done') }
        default:
            return { cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', label: t('community.events.status.planned') }
    }
}

/** Badge status pendaftaran diri warga (Fase 3). */
function participantBadge(t: (k: string) => string, status: string | null) {
    switch (status) {
        case 'REGISTERED':
            return { cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', label: t('community.portal.participants.registered') }
        case 'ATTENDED':
            return { cls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', label: t('community.portal.participants.attended') }
        case 'CANCELLED':
            return { cls: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300', label: t('community.portal.participants.cancelled') }
        default:
            return null
    }
}

function categoryLabel(t: (k: string) => string, category: string) {
    switch (category) {
        case 'RAPAT':
            return t('community.events.category.rapat')
        case 'KERJA_BAKTI':
            return t('community.events.category.kerjaBakti')
        case 'PERAYAAN':
            return t('community.events.category.perayaan')
        case 'SOSIAL':
            return t('community.events.category.sosial')
        default:
            return t('community.events.category.lainnya')
    }
}

function formatRange(t: (k: string) => string, startsAt: string, endsAt: string | null): string {
    const start = formatDateID(startsAt)
    if (!endsAt) return start
    const end = formatDateID(endsAt)
    if (start === end) return start
    return `${start} — ${end}`
}

/**
 * Kegiatan layak didaftar mandiri: sudah published (publishedAt != null && <= now)
 * dan tidak dibatalkan — syarat yang sama dengan gate server POST register.
 */
function canRegister(row: PortalEventRow): boolean {
    if (!row.publishedAt || row.status === 'CANCELLED') return false
    if (new Date(row.publishedAt).getTime() > Date.now()) return false
    // Terdaftar aktif / sudah hadir → tidak bisa daftar lagi (hadir = final).
    return row.participantStatus == null || row.participantStatus === 'CANCELLED'
}

export default function CommunityPortalEventsPage() {
    const { t } = useTranslation()
    const { addToast } = useToast()

    const [rows, setRows] = useState<PortalEventRow[]>([])
    const [loading, setLoading] = useState(true)
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [total, setTotal] = useState(0)
    const [actionId, setActionId] = useState<string | null>(null)
    const [cancelTarget, setCancelTarget] = useState<PortalEventRow | null>(null)
    const [cancelSaving, setCancelSaving] = useState(false)

    const fetchRows = useCallback(async () => {
        setLoading(true)
        try {
            const params = new URLSearchParams({ page: String(page), limit: '10' })
            const res = await fetch(`/api/community/portal/events?${params.toString()}`)
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
    }, [page, addToast, t])

    useEffect(() => {
        void fetchRows()
    }, [fetchRows])

    /** Daftar diri (Fase 3) — POST register tanpa body (memberId dari session portal). */
    const handleRegister = async (row: PortalEventRow) => {
        setActionId(row.id)
        try {
            const res = await fetch(`/api/community/portal/events/${row.id}/register`, { method: 'POST' })
            const json = (await res.json().catch(() => null)) as Record<string, unknown> | null
            if (!res.ok) {
                addToast(apiErrorMessage(json) || t('common.error'), 'error')
                return
            }
            addToast(t('community.portal.participants.toast.registered'), 'success')
            await fetchRows()
        } catch {
            addToast(t('community.portal.participants.errorNetwork'), 'error')
        } finally {
            setActionId(null)
        }
    }

    /** Batalkan diri (Fase 3) — konfirmasi dulu, lalu DELETE register (soft-cancel in-place). */
    const handleCancelConfirm = async () => {
        if (!cancelTarget) return
        setCancelSaving(true)
        try {
            const res = await fetch(`/api/community/portal/events/${cancelTarget.id}/register`, { method: 'DELETE' })
            const json = (await res.json().catch(() => null)) as Record<string, unknown> | null
            if (!res.ok) {
                // 404 sudah dibatalkan / 409 hadir atau kegiatan mulai — tampilkan pesan server.
                addToast(apiErrorMessage(json) || t('common.error'), 'error')
                setCancelTarget(null)
                return
            }
            addToast(t('community.portal.participants.toast.cancelled'), 'success')
            setCancelTarget(null)
            await fetchRows()
        } catch {
            addToast(t('community.portal.participants.errorNetwork'), 'error')
        } finally {
            setCancelSaving(false)
        }
    }

    const participantCountLabel = (row: PortalEventRow): string => {
        const active = row.participantCount?.active ?? 0
        const max = row.participantCount?.maxCapacity ?? row.maxCapacity
        return `${active}${max != null ? ` / ${max}` : ''} ${t('community.portal.participants.countLabel')}`
    }

    return (
        <div className="space-y-6 p-6">
            <div>
                <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900 dark:text-gray-100">
                    <CalendarDays className="h-6 w-6 text-teal-600" />
                    {t('community.portal.myEvents.title')}
                </h1>
                <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">{t('community.portal.readInfo')}</p>
            </div>

            {loading ? (
                <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="h-20 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-700" />
                    ))}
                </div>
            ) : rows.length === 0 ? (
                <EmptyState
                    icon={CalendarDays}
                    title={t('community.portal.myEvents.empty')}
                    description={t('community.portal.myEvents.emptyDesc')}
                />
            ) : (
                <>
                    {/* Mobile cards */}
                    <div className="space-y-2 md:hidden">
                        {rows.map((row) => {
                            const badge = statusBadge(t, row.status)
                            const pBadge = participantBadge(t, row.participantStatus)
                            const busy = actionId === row.id
                            return (
                                <div key={row.id} className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                                    <div className="flex items-start justify-between gap-2">
                                        <div>
                                            <p className="font-mono text-xs text-gray-500 dark:text-gray-400">{row.eventNumber}</p>
                                            <p className="mt-0.5 text-sm font-medium text-gray-900 dark:text-gray-100">{row.title}</p>
                                        </div>
                                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${badge.cls}`}>{badge.label}</span>
                                    </div>
                                    <dl className="mt-2 grid grid-cols-2 gap-1 text-xs text-gray-600 dark:text-gray-300">
                                        <div>
                                            <dt className="text-gray-400">{t('community.events.table.category')}</dt>
                                            <dd>{categoryLabel(t, row.category)}</dd>
                                        </div>
                                        <div>
                                            <dt className="text-gray-400">{t('community.events.table.startsAt')}</dt>
                                            <dd>{formatRange(t, row.startsAt, row.endsAt)}</dd>
                                        </div>
                                        <div>
                                            <dt className="text-gray-400">{t('community.events.table.participants')}</dt>
                                            <dd>{participantCountLabel(row)}</dd>
                                        </div>
                                        {row.location && (
                                            <div className="col-span-2">
                                                <dt className="text-gray-400">{t('community.events.table.location')}</dt>
                                                <dd className="flex items-center gap-1">
                                                    <MapPin className="h-3 w-3" />
                                                    {row.location}
                                                </dd>
                                            </div>
                                        )}
                                    </dl>
                                    <div className="mt-3 flex flex-wrap items-center gap-2">
                                        {pBadge && (
                                            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${pBadge.cls}`}>{pBadge.label}</span>
                                        )}
                                        {canRegister(row) && (
                                            <button
                                                type="button"
                                                disabled={busy}
                                                onClick={() => void handleRegister(row)}
                                                className="inline-flex items-center gap-1 rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-teal-700 disabled:opacity-50"
                                            >
                                                <UserPlus className="h-3.5 w-3.5" />
                                                {busy ? t('common.loading') : t('community.portal.participants.register')}
                                            </button>
                                        )}
                                        {row.participantStatus === 'REGISTERED' && (
                                            <button
                                                type="button"
                                                disabled={busy}
                                                onClick={() => setCancelTarget(row)}
                                                className="inline-flex items-center gap-1 rounded-lg border border-red-300 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20"
                                            >
                                                <Ban className="h-3.5 w-3.5" />
                                                {t('community.portal.participants.cancel')}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>

                    {/* Desktop table */}
                    <div className="hidden overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 md:block">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900/50">
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">{t('community.events.table.eventNumber')}</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">{t('community.events.table.title')}</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">{t('community.events.table.category')}</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">{t('community.events.table.startsAt')}</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">{t('community.events.table.location')}</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">{t('community.events.table.participants')}</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">{t('community.portal.participants.myStatus')}</th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">{t('community.common.actions')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {rows.map((row) => {
                                    const badge = statusBadge(t, row.status)
                                    const pBadge = participantBadge(t, row.participantStatus)
                                    const busy = actionId === row.id
                                    return (
                                        <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                            <td className="whitespace-nowrap px-4 py-3 font-mono text-sm text-gray-900 dark:text-gray-100">{row.eventNumber}</td>
                                            <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                                                <p className="font-medium">{row.title}</p>
                                                {row.description && (
                                                    <p className="mt-0.5 max-w-md truncate text-xs text-gray-500 dark:text-gray-400">{row.description}</p>
                                                )}
                                                <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${badge.cls}`}>{badge.label}</span>
                                            </td>
                                            <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{categoryLabel(t, row.category)}</td>
                                            <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{formatDateID(row.startsAt)}</td>
                                            <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{row.location ?? '—'}</td>
                                            <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{participantCountLabel(row)}</td>
                                            <td className="whitespace-nowrap px-4 py-3 text-sm">
                                                {pBadge ? (
                                                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${pBadge.cls}`}>{pBadge.label}</span>
                                                ) : (
                                                    <span className="text-xs text-gray-400 dark:text-gray-500">—</span>
                                                )}
                                            </td>
                                            <td className="whitespace-nowrap px-4 py-3 text-right text-sm">
                                                <div className="flex items-center justify-end gap-1">
                                                    {canRegister(row) && (
                                                        <button
                                                            type="button"
                                                            disabled={busy}
                                                            onClick={() => void handleRegister(row)}
                                                            className="inline-flex items-center gap-1 rounded-lg bg-teal-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-teal-700 disabled:opacity-50"
                                                        >
                                                            <UserPlus className="h-3.5 w-3.5" />
                                                            {busy ? t('common.loading') : t('community.portal.participants.register')}
                                                        </button>
                                                    )}
                                                    {row.participantStatus === 'REGISTERED' && (
                                                        <button
                                                            type="button"
                                                            disabled={busy}
                                                            onClick={() => setCancelTarget(row)}
                                                            className="inline-flex items-center gap-1 rounded-lg border border-red-300 px-2.5 py-1.5 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20"
                                                        >
                                                            <Ban className="h-3.5 w-3.5" />
                                                            {t('community.portal.participants.cancel')}
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

            <ConfirmDialog
                isOpen={cancelTarget != null}
                onClose={() => {
                    if (!cancelSaving) setCancelTarget(null)
                }}
                onConfirm={handleCancelConfirm}
                title={t('community.portal.participants.cancelConfirmTitle')}
                message={t('community.portal.participants.cancelConfirmDesc')}
                confirmText={t('community.portal.participants.cancel')}
                variant="danger"
                isLoading={cancelSaving}
            />
        </div>
    )
}
