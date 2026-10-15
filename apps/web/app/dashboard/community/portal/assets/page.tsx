'use client'

import { useCallback, useEffect, useState } from 'react'
import { Package } from 'lucide-react'
import { useTranslation } from '@/lib/i18n'
import { EmptyState } from '@/components/ui/empty-state'
import { useToast } from '@/components/ui/toast'

interface PortalAssetRow {
    assetCode: string
    name: string
    category: string
    condition: string
    location: string | null
}

function conditionBadge(condition: string) {
    if (condition === 'BAIK') return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
    if (condition === 'PERLU_PERBAIKAN') return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
    return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
}

function categoryLabel(t: (k: string) => string, category: string) {
    const key = `community.assets.category.${category.toLowerCase()}`
    const label = t(key)
    return label === key ? category : label
}

function conditionLabel(t: (k: string) => string, condition: string) {
    if (condition === 'BAIK') return t('community.assets.condition.baik')
    if (condition === 'PERLU_PERBAIKAN') return t('community.assets.condition.perluPerbaikan')
    if (condition === 'RUSAK_RINGAN') return t('community.assets.condition.rusakRingan')
    if (condition === 'RUSAK_BERAT') return t('community.assets.condition.rusakBerat')
    return condition
}

export default function CommunityPortalAssetsPage() {
    const { t } = useTranslation()
    const { addToast } = useToast()

    const [rows, setRows] = useState<PortalAssetRow[]>([])
    const [loading, setLoading] = useState(true)

    const fetchRows = useCallback(async () => {
        setLoading(true)
        try {
            const res = await fetch('/api/community/portal/assets')
            if (!res.ok) throw new Error()
            const json = await res.json()
            setRows(json.data ?? [])
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
                    <Package className="h-6 w-6 text-orange-600" />
                    {t('community.portal.assets.title')}
                </h1>
                <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">{t('community.portal.assets.subtitle')}</p>
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
                    icon={Package}
                    title={t('community.portal.assets.empty')}
                    description=""
                />
            ) : (
                <div className="space-y-3">
                    {rows.map((row) => (
                        <div key={row.assetCode} className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex min-w-0 items-start gap-2">
                                    <Package className="mt-0.5 h-4 w-4 shrink-0 text-orange-600" />
                                    <div className="min-w-0">
                                        <p className="font-mono text-xs text-gray-500 dark:text-gray-400">{row.assetCode}</p>
                                        <p className="font-semibold text-gray-900 dark:text-gray-100">{row.name}</p>
                                    </div>
                                </div>
                                <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${conditionBadge(row.condition)}`}>
                                    {conditionLabel(t, row.condition)}
                                </span>
                            </div>
                            <div className="mt-3 flex flex-wrap items-center gap-3 pl-6 text-xs text-gray-500 dark:text-gray-400">
                                <span className="rounded-full bg-gray-100 px-2 py-0.5 dark:bg-gray-700">{categoryLabel(t, row.category)}</span>
                                {row.location && (
                                    <span>{t('community.portal.assets.location')}: {row.location}</span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
