'use client'

import { useCallback, useEffect, useState } from 'react'
import { ExternalLink, FileText, UserX } from 'lucide-react'
import { useTranslation } from '@/lib/i18n'
import { EmptyState } from '@/components/ui/empty-state'
import { useToast } from '@/components/ui/toast'
import { formatDateID } from '@/lib/export'

interface PortalLetterRow {
    id: string
    letterNumber: string
    letterType: string
    status: string
    purpose: string | null
    destination: string | null
    issuedAt: string | null
    revokedAt: string | null
    createdAt: string
    verifyUrl: string | null
}

const inputClass =
    'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100'

const STATUS_VALUES = ['DRAFT', 'ISSUED', 'REVOKED'] as const

function statusBadge(t: (k: string) => string, status: string) {
    switch (status) {
        case 'ISSUED':
            return { cls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', label: t('community.letters.status.issued') }
        case 'REVOKED':
            return { cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', label: t('community.letters.status.revoked') }
        default:
            return { cls: 'bg-gray-100 text-gray-700 dark:bg-gray-700/40 dark:text-gray-300', label: t('community.letters.status.draft') }
    }
}

function typeLabel(t: (k: string) => string, letterType: string) {
    switch (letterType) {
        case 'PENGANTAR':
            return t('community.letters.type.pengantar')
        case 'DOMISILI':
            return t('community.letters.type.domisili')
        case 'SKTM':
            return t('community.letters.type.sktm')
        default:
            return t('community.letters.type.lainnya')
    }
}

export default function CommunityPortalLettersPage() {
    const { t } = useTranslation()
    const { addToast } = useToast()

    const [rows, setRows] = useState<PortalLetterRow[]>([])
    const [loading, setLoading] = useState(true)
    const [notRegistered, setNotRegistered] = useState(false)
    const [statusFilter, setStatusFilter] = useState('')
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [total, setTotal] = useState(0)

    const fetchRows = useCallback(async () => {
        setLoading(true)
        try {
            const params = new URLSearchParams({ page: String(page), limit: '10' })
            if (statusFilter) params.set('status', statusFilter)
            const res = await fetch(`/api/community/portal/letters?${params.toString()}`)
            if (res.status === 404) {
                setNotRegistered(true)
                setRows([])
                return
            }
            if (!res.ok) throw new Error()
            const json = await res.json()
            setNotRegistered(false)
            setRows(json.data ?? [])
            setTotal(json.total ?? 0)
            setTotalPages(json.totalPages ?? 1)
        } catch {
            addToast(t('common.error.load'), 'error')
        } finally {
            setLoading(false)
        }
    }, [page, statusFilter, addToast, t])

    useEffect(() => {
        void fetchRows()
    }, [fetchRows])

    if (notRegistered) {
        return (
            <div className="p-6">
                <EmptyState
                    icon={UserX}
                    title={t('community.portal.notRegistered')}
                    description={t('community.portal.notRegisteredDesc')}
                />
            </div>
        )
    }

    return (
        <div className="space-y-6 p-6">
            <div>
                <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900 dark:text-gray-100">
                    <FileText className="h-6 w-6 text-purple-600" />
                    {t('community.portal.myLetters.title')}
                </h1>
                <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">{t('community.portal.readInfo')}</p>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                <div className="sm:w-56">
                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                        {t('community.letters.filterStatus')}
                    </label>
                    <select
                        value={statusFilter}
                        onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
                        className={inputClass}
                    >
                        <option value="">{t('community.common.filterAll')}</option>
                        {STATUS_VALUES.map((s) => (
                            <option key={s} value={s}>{statusBadge(t, s).label}</option>
                        ))}
                    </select>
                </div>
            </div>

            {loading ? (
                <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="h-16 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-700" />
                    ))}
                </div>
            ) : rows.length === 0 ? (
                <EmptyState
                    icon={FileText}
                    title={t('community.portal.myLetters.empty')}
                    description={t('community.portal.myLetters.emptyDesc')}
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
                                            <p className="font-mono text-sm font-medium text-gray-900 dark:text-gray-100">{row.letterNumber}</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">{typeLabel(t, row.letterType)}</p>
                                        </div>
                                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${badge.cls}`}>{badge.label}</span>
                                    </div>
                                    {row.purpose && (
                                        <p className="mt-2 text-xs text-gray-600 dark:text-gray-300">{row.purpose}</p>
                                    )}
                                    <dl className="mt-2 grid grid-cols-2 gap-1 text-xs text-gray-600 dark:text-gray-300">
                                        <div>
                                            <dt className="text-gray-400">{t('community.letters.table.issuedAt')}</dt>
                                            <dd>{row.issuedAt ? formatDateID(row.issuedAt) : '—'}</dd>
                                        </div>
                                    </dl>
                                    {row.status === 'ISSUED' && row.verifyUrl && (
                                        <a
                                            href={row.verifyUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
                                        >
                                            <ExternalLink className="h-3.5 w-3.5" />
                                            {t('community.portal.myLetters.verify')}
                                        </a>
                                    )}
                                </div>
                            )
                        })}
                    </div>

                    {/* Desktop table */}
                    <div className="hidden overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 md:block">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900/50">
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">{t('community.letters.table.letterNumber')}</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">{t('community.letters.table.letterType')}</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">{t('community.letters.table.purpose')}</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">{t('community.letters.table.issuedAt')}</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">{t('community.letters.table.status')}</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">{t('community.common.actions')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {rows.map((row) => {
                                    const badge = statusBadge(t, row.status)
                                    return (
                                        <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                            <td className="whitespace-nowrap px-4 py-3 font-mono text-sm text-gray-900 dark:text-gray-100">{row.letterNumber}</td>
                                            <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{typeLabel(t, row.letterType)}</td>
                                            <td className="max-w-xs truncate px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{row.purpose ?? '—'}</td>
                                            <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{row.issuedAt ? formatDateID(row.issuedAt) : '—'}</td>
                                            <td className="whitespace-nowrap px-4 py-3 text-sm">
                                                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${badge.cls}`}>{badge.label}</span>
                                            </td>
                                            <td className="whitespace-nowrap px-4 py-3 text-sm">
                                                {row.status === 'ISSUED' && row.verifyUrl ? (
                                                    <a
                                                        href={row.verifyUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center gap-1.5 font-medium text-blue-600 hover:underline dark:text-blue-400"
                                                    >
                                                        <ExternalLink className="h-3.5 w-3.5" />
                                                        {t('community.portal.myLetters.verify')}
                                                    </a>
                                                ) : (
                                                    <span className="text-gray-400 dark:text-gray-500">—</span>
                                                )}
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
