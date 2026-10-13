'use client'

import { useCallback, useEffect, useState } from 'react'
import { CalendarDays, MapPin } from 'lucide-react'
import { useTranslation } from '@/lib/i18n'
import { EmptyState } from '@/components/ui/empty-state'
import { useToast } from '@/components/ui/toast'
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

export default function CommunityPortalEventsPage() {
    const { t } = useTranslation()
    const { addToast } = useToast()

    const [rows, setRows] = useState<PortalEventRow[]>([])
    const [loading, setLoading] = useState(true)
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [total, setTotal] = useState(0)

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
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">{t('community.events.table.endsAt')}</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">{t('community.events.table.location')}</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">{t('community.events.table.status')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {rows.map((row) => {
                                    const badge = statusBadge(t, row.status)
                                    return (
                                        <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                            <td className="whitespace-nowrap px-4 py-3 font-mono text-sm text-gray-900 dark:text-gray-100">{row.eventNumber}</td>
                                            <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                                                <p className="font-medium">{row.title}</p>
                                                {row.description && (
                                                    <p className="mt-0.5 max-w-md truncate text-xs text-gray-500 dark:text-gray-400">{row.description}</p>
                                                )}
                                            </td>
                                            <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{categoryLabel(t, row.category)}</td>
                                            <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{formatDateID(row.startsAt)}</td>
                                            <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{row.endsAt ? formatDateID(row.endsAt) : '—'}</td>
                                            <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{row.location ?? '—'}</td>
                                            <td className="whitespace-nowrap px-4 py-3 text-sm">
                                                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${badge.cls}`}>{badge.label}</span>
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
        </div>
    )
}
