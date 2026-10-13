'use client'

import { useCallback, useEffect, useState } from 'react'
import { BellRing, Megaphone } from 'lucide-react'
import { useTranslation } from '@/lib/i18n'
import { EmptyState } from '@/components/ui/empty-state'
import { useToast } from '@/components/ui/toast'
import { formatDateID } from '@/lib/export'

interface PortalAnnouncementRow {
    id: string
    title: string
    content: string
    category: string
    priority: string
    publishedAt: string | null
    expiresAt: string | null
}

function priorityBadge(priority: string) {
    if (priority === 'URGENT') return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
    if (priority === 'HIGH') return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
    if (priority === 'NORMAL') return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
    return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
}

function categoryLabel(t: (k: string) => string, category: string) {
    const key = `community.announcements.category.${category.toLowerCase()}`
    const label = t(key)
    return label === key ? category : label
}

export default function CommunityPortalAnnouncementsPage() {
    const { t } = useTranslation()
    const { addToast } = useToast()

    const [rows, setRows] = useState<PortalAnnouncementRow[]>([])
    const [loading, setLoading] = useState(true)
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [total, setTotal] = useState(0)

    const fetchRows = useCallback(async () => {
        setLoading(true)
        try {
            const res = await fetch(`/api/community/portal/announcements?page=${page}&limit=10`)
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
                    <Megaphone className="h-6 w-6 text-blue-600" />
                    {t('community.portal.announcements.title')}
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
                    icon={BellRing}
                    title={t('community.portal.announcements.empty')}
                    description=""
                />
            ) : (
                <>
                    <div className="space-y-3">
                        {rows.map((row) => (
                            <div key={row.id} className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex min-w-0 items-start gap-2">
                                        <BellRing className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                                        <div className="min-w-0">
                                            <p className="font-semibold text-gray-900 dark:text-gray-100">{row.title}</p>
                                            <p className="mt-1 whitespace-pre-wrap text-sm text-gray-600 dark:text-gray-300">{row.content}</p>
                                        </div>
                                    </div>
                                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${priorityBadge(row.priority)}`}>
                                        {row.priority}
                                    </span>
                                </div>
                                <div className="mt-3 flex flex-wrap items-center gap-3 pl-6 text-xs text-gray-500 dark:text-gray-400">
                                    <span className="rounded-full bg-gray-100 px-2 py-0.5 dark:bg-gray-700">{categoryLabel(t, row.category)}</span>
                                    {row.publishedAt && (
                                        <span>{t('community.announcements.table.publishedAt')}: {formatDateID(row.publishedAt)}</span>
                                    )}
                                    {row.expiresAt && (
                                        <span>{t('community.announcements.table.expiresAt')}: {formatDateID(row.expiresAt)}</span>
                                    )}
                                </div>
                            </div>
                        ))}
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
