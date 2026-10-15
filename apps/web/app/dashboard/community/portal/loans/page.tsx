'use client'

import { useCallback, useEffect, useState } from 'react'
import { ArrowLeftRight } from 'lucide-react'
import { useTranslation } from '@/lib/i18n'
import { EmptyState } from '@/components/ui/empty-state'
import { useToast } from '@/components/ui/toast'
import { formatDateID } from '@/lib/export'

interface PortalLoanRow {
    assetCode: string
    assetName: string
    loanDate: string
    dueDate: string
    returnedAt: string | null
    isOverdue: boolean
    conditionAtLoan: string
    conditionAtReturn: string | null
}

function conditionBadge(condition: string) {
    if (condition === 'BAIK') return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
    if (condition === 'PERLU_PERBAIKAN') return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
    return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
}

function conditionLabel(t: (k: string) => string, condition: string) {
    if (condition === 'BAIK') return t('community.assets.condition.baik')
    if (condition === 'PERLU_PERBAIKAN') return t('community.assets.condition.perluPerbaikan')
    if (condition === 'RUSAK_RINGAN') return t('community.assets.condition.rusakRingan')
    if (condition === 'RUSAK_BERAT') return t('community.assets.condition.rusakBerat')
    return condition
}

/** Badge status pinjaman: Dikembalikan (hijau) / Terlambat (merah) / Dipinjam (biru). */
function loanStatusBadge(row: PortalLoanRow, t: (k: string) => string) {
    if (row.returnedAt != null) {
        return (
            <span className="inline-flex shrink-0 items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                {t('community.portal.loans.badge.returned')}
            </span>
        )
    }
    if (row.isOverdue) {
        return (
            <span className="inline-flex shrink-0 items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400">
                {t('community.portal.loans.badge.overdue')}
            </span>
        )
    }
    return (
        <span className="inline-flex shrink-0 items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
            {t('community.portal.loans.badge.active')}
        </span>
    )
}

export default function CommunityPortalLoansPage() {
    const { t } = useTranslation()
    const { addToast } = useToast()

    const [rows, setRows] = useState<PortalLoanRow[]>([])
    const [memberLinked, setMemberLinked] = useState(true)
    const [loading, setLoading] = useState(true)

    const fetchRows = useCallback(async () => {
        setLoading(true)
        try {
            const res = await fetch('/api/community/portal/loans')
            if (!res.ok) throw new Error()
            const json = await res.json()
            setRows(json.data ?? [])
            // member: null → akun belum terhubung dengan data warga (dual empty state)
            setMemberLinked(json.member != null)
        } catch {
            addToast(t('common.error.load'), 'error')
        } finally {
            setLoading(false)
        }
    }, [addToast, t])

    useEffect(() => {
        void fetchRows()
    }, [fetchRows])

    return (
        <div className="space-y-6 p-6">
            <div>
                <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900 dark:text-gray-100">
                    <ArrowLeftRight className="h-6 w-6 text-orange-600" />
                    {t('community.portal.loans.title')}
                </h1>
                <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">{t('community.portal.loans.subtitle')}</p>
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
                    icon={ArrowLeftRight}
                    title={
                        memberLinked
                            ? t('community.portal.loans.empty')
                            : t('community.portal.loans.emptyMember')
                    }
                    description=""
                />
            ) : (
                <div className="space-y-3">
                    {rows.map((row) => (
                        <div
                            key={`${row.assetCode}-${row.loanDate}`}
                            className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800"
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex min-w-0 items-start gap-2">
                                    <ArrowLeftRight className="mt-0.5 h-4 w-4 shrink-0 text-orange-600" />
                                    <div className="min-w-0">
                                        <p className="font-mono text-xs text-gray-500 dark:text-gray-400">{row.assetCode}</p>
                                        <p className="font-semibold text-gray-900 dark:text-gray-100">{row.assetName}</p>
                                    </div>
                                </div>
                                {loanStatusBadge(row, t)}
                            </div>
                            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 pl-6 text-xs text-gray-600 dark:text-gray-300">
                                <div>
                                    <dt className="text-gray-400 dark:text-gray-500">{t('community.portal.loans.field.loanDate')}</dt>
                                    <dd className="mt-0.5 font-medium">{formatDateID(row.loanDate)}</dd>
                                </div>
                                <div>
                                    <dt className="text-gray-400 dark:text-gray-500">{t('community.portal.loans.field.dueDate')}</dt>
                                    <dd className={`mt-0.5 font-medium ${row.isOverdue && row.returnedAt == null ? 'text-red-600 dark:text-red-400' : ''}`}>
                                        {formatDateID(row.dueDate)}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-gray-400 dark:text-gray-500">{t('community.portal.loans.field.returnedAt')}</dt>
                                    <dd className="mt-0.5 font-medium">
                                        {row.returnedAt != null ? formatDateID(row.returnedAt) : t('community.portal.loans.notReturned')}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-gray-400 dark:text-gray-500">{t('community.portal.loans.field.conditionAtLoan')}</dt>
                                    <dd className="mt-0.5">
                                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${conditionBadge(row.conditionAtLoan)}`}>
                                            {conditionLabel(t, row.conditionAtLoan)}
                                        </span>
                                    </dd>
                                </div>
                                {row.conditionAtReturn != null && (
                                    <div>
                                        <dt className="text-gray-400 dark:text-gray-500">{t('community.portal.loans.field.conditionAtReturn')}</dt>
                                        <dd className="mt-0.5">
                                            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${conditionBadge(row.conditionAtReturn)}`}>
                                                {conditionLabel(t, row.conditionAtReturn)}
                                            </span>
                                        </dd>
                                    </div>
                                )}
                            </dl>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
