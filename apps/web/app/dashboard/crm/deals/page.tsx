'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Plus, Search, Trash2 } from 'lucide-react'
import { useTranslation } from '@/lib/i18n'
import { formatCurrency, formatDate } from '@/lib/utils'
import { useSession } from 'next-auth/react'

type Deal = {
    id: string
    title: string
    value: number
    stage: string
    probability: number
    closeDate: string | null
    notes: string | null
    contactName?: string
    createdAt: string
}

const stageStyles: Record<string, string> = {
    DISCOVERY: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    PROPOSAL: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    NEGOTIATION: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
    CLOSING: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    CLOSED_WON: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
    CLOSED_LOST: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
}

const filterStages = ['all', 'DISCOVERY', 'PROPOSAL', 'NEGOTIATION', 'CLOSING']

export default function DealsPage() {
    const { t } = useTranslation()
    const { data: session } = useSession()
    const canMutate = session?.user?.role !== 'VIEWER'
    const [deals, setDeals] = useState<Deal[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [filterStage, setFilterStage] = useState<string>('all')
    const [searchQuery, setSearchQuery] = useState('')
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 3000)
            return () => clearTimeout(timer)
        }
    }, [toast])

    useEffect(() => {
        fetchDeals()
    }, [])

    const fetchDeals = async () => {
        try {
            setLoading(true)
            const response = await fetch('/api/crm/deals')
            const data = await response.json()
            if (data.success) {
                setDeals(data.data)
            } else {
                setError(t('common.error'))
            }
        } catch {
            setError(t('common.error'))
        } finally {
            setLoading(false)
        }
    }

    const filtered = deals.filter((d) => {
        const matchStage = filterStage === 'all' || d.stage === filterStage
        const matchSearch = searchQuery === '' ||
            d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (d.contactName || '').toLowerCase().includes(searchQuery.toLowerCase())
        return matchStage && matchSearch
    })

    const handleDelete = async (id: string) => {
        if (!window.confirm('Apakah Anda yakin ingin menghapus deal ini?')) return
        try {
            const response = await fetch(`/api/crm/deals/${id}`, { method: 'DELETE' })
            const result = await response.json()
            if (result.success) {
                fetchDeals()
                setToast({ message: 'Deal berhasil dihapus', type: 'success' })
            } else {
                setToast({ message: `Gagal menghapus: ${result.error}`, type: 'error' })
            }
        } catch {
            setToast({ message: 'Gagal menghapus deal', type: 'error' })
        }
    }

    const totalValue = deals.reduce((s, d) => s + d.value, 0)
    const weightedValue = deals.reduce((s, d) => s + (d.value * d.probability / 100), 0)
    const avgWinProb = deals.length > 0 ? Math.round(deals.reduce((s, d) => s + d.probability, 0) / deals.length) : 0

    const getStageLabel = (stage: string) => t(`crm.deals.stages.${stage}`)

    if (loading) {
        return (
            <div className="space-y-6 p-6">
                <div className="animate-pulse">
                    <div className="h-8 bg-gray-200 rounded w-48 mb-4"></div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="h-24 bg-gray-200 rounded-xl"></div>
                        ))}
                    </div>
                    <div className="h-96 bg-gray-200 rounded-xl"></div>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="p-6">
                <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
                    <p className="text-red-600">{error}</p>
                    <button
                        onClick={fetchDeals}
                        className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                    >
                        {t('common.retry')}
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('crm.deals.title')}</h1>
                    <p className="text-gray-500">{deals.length} {t('crm.deals.subtitle')} · {t('crm.deals.totalValue')}: {formatCurrency(totalValue)}</p>
                </div>
                {canMutate && (
                    <button className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700">
                    <Plus className="h-4 w-4" />
                    {t('crm.deals.newDeal')}
                    </button>
                )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                    <p className="text-sm text-gray-500 dark:text-gray-400">{t('crm.deals.totalDeals')}</p>
                    <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{deals.length}</p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                    <p className="text-sm text-gray-500 dark:text-gray-400">{t('crm.deals.totalValue')}</p>
                    <p className="mt-1 text-xl font-bold text-green-600">{formatCurrency(totalValue)}</p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                    <p className="text-sm text-gray-500 dark:text-gray-400">{t('crm.deals.weightedValue')}</p>
                    <p className="mt-1 text-xl font-bold text-blue-600">{formatCurrency(weightedValue)}</p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                    <p className="text-sm text-gray-500 dark:text-gray-400">{t('crm.deals.avgWinProb')}</p>
                    <p className="mt-1 text-2xl font-bold text-purple-600">{avgWinProb}%</p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-4 sm:flex-row sm:items-center dark:border-gray-700 dark:bg-gray-800">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder={t('crm.deals.searchPlaceholder')}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    />
                </div>
                <div className="flex gap-2 overflow-x-auto">
                    {filterStages.map((stage) => (
                        <button
                            key={stage}
                            onClick={() => setFilterStage(stage)}
                            className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${filterStage === stage
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'
                                }`}
                        >
                            {stage === 'all' ? t('crm.deals.filterAll') : getStageLabel(stage)}
                        </button>
                    ))}
                </div>
            </div>

            {/* Kartu deal untuk tampilan mobile */}
            <div className="md:hidden space-y-3">
                {filtered.length === 0 ? (
                    <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 p-8 text-center text-gray-500 dark:text-gray-400">
                        {t('crm.deals.empty')}
                    </div>
                ) : (
                    filtered.map((deal) => (
                        <div key={deal.id} className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                            <div className="flex justify-between items-start">
                                <div>
                                    <Link href={`/dashboard/crm/deals/${deal.id}`} className="font-medium text-blue-600 hover:underline dark:text-blue-400">
                                        {deal.title}
                                    </Link>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">{deal.contactName || '-'}</p>
                                </div>
                                <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${stageStyles[deal.stage] || 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'}`}>
                                    {getStageLabel(deal.stage)}
                                </span>
                            </div>
                            <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                                <div>
                                    <span className="text-gray-500 dark:text-gray-400">{t('crm.deals.table.value')}:</span>
                                    <span className="ml-1 font-medium text-gray-900 dark:text-white">{formatCurrency(deal.value)}</span>
                                </div>
                                <div>
                                    <span className="text-gray-500 dark:text-gray-400">{t('crm.deals.table.winProb')}:</span>
                                    <span className="ml-1">{deal.probability}%</span>
                                </div>
                                <div>
                                    <span className="text-gray-500 dark:text-gray-400">{t('crm.deals.table.weighted')}:</span>
                                    <span className="ml-1 font-medium text-green-600">{formatCurrency(deal.value * deal.probability / 100)}</span>
                                </div>
                                <div>
                                    <span className="text-gray-500 dark:text-gray-400">{t('crm.deals.table.expectedClose')}:</span>
                                    <span className="ml-1">{deal.closeDate ? formatDate(deal.closeDate) : '-'}</span>
                                </div>
                            </div>
                            <div className="mt-3 flex gap-2">
                                <Link href={`/dashboard/crm/deals/${deal.id}`} className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400">
                                    {t('common.view') || 'Lihat'}
                                </Link>
                                <button
                                    onClick={() => handleDelete(deal.id)}
                                    className="text-sm text-red-600 hover:text-red-800 dark:text-red-400"
                                >
                                    {t('common.delete') || 'Hapus'}
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Tabel deal untuk tampilan desktop */}
            <div className="hidden md:block rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900">
                                <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">{t('crm.deals.table.name')}</th>
                                <th className="hidden md:table-cell px-4 py-3 font-medium text-gray-500 dark:text-gray-400">{t('crm.deals.table.company')}</th>
                                <th className="px-4 py-3 text-right font-medium text-gray-500 dark:text-gray-400">{t('crm.deals.table.value')}</th>
                                <th className="px-4 py-3 text-center font-medium text-gray-500 dark:text-gray-400">{t('crm.deals.table.stage')}</th>
                                <th className="hidden lg:table-cell px-4 py-3 text-center font-medium text-gray-500 dark:text-gray-400">{t('crm.deals.table.winProb')}</th>
                                <th className="hidden lg:table-cell px-4 py-3 text-center font-medium text-gray-500 dark:text-gray-400">{t('crm.deals.table.weighted')}</th>
                                <th className="hidden md:table-cell px-4 py-3 font-medium text-gray-500 dark:text-gray-400">{t('crm.deals.table.expectedClose')}</th>
                                <th className="px-4 py-3 text-center font-medium text-gray-500 dark:text-gray-400"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-4 py-12 text-center text-gray-500 dark:text-gray-400">
                                        {t('crm.deals.empty')}
                                    </td>
                                </tr>
                            ) : (
                                filtered.map((deal) => (
                                    <tr key={deal.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                        <td className="whitespace-nowrap px-4 py-3">
                                            <Link href={`/dashboard/crm/deals/${deal.id}`} className="font-medium text-blue-600 hover:underline dark:text-blue-400">
                                                {deal.title}
                                            </Link>
                                        </td>
                                        <td className="hidden md:table-cell px-4 py-3 text-gray-600 dark:text-gray-400">{deal.contactName || '-'}</td>
                                        <td className="whitespace-nowrap px-4 py-3 text-right font-medium text-gray-900 dark:text-white">{formatCurrency(deal.value)}</td>
                                        <td className="whitespace-nowrap px-4 py-3 text-center">
                                            <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${stageStyles[deal.stage] || 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'}`}>
                                                {getStageLabel(deal.stage)}
                                            </span>
                                        </td>
                                        <td className="hidden lg:table-cell whitespace-nowrap px-4 py-3 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <div className="h-2 w-16 rounded-full bg-gray-200 dark:bg-gray-600">
                                                    <div
                                                        className="h-full rounded-full bg-blue-500"
                                                        style={{ width: `${deal.probability}%` }}
                                                    />
                                                </div>
                                                <span className="text-xs text-gray-500 dark:text-gray-400">{deal.probability}%</span>
                                            </div>
                                        </td>
                                        <td className="hidden lg:table-cell whitespace-nowrap px-4 py-3 text-center font-medium text-green-600">
                                            {formatCurrency(deal.value * deal.probability / 100)}
                                        </td>
                                        <td className="hidden md:table-cell whitespace-nowrap px-4 py-3 text-gray-500 dark:text-gray-400">{deal.closeDate ? formatDate(deal.closeDate) : '-'}</td>
                                        <td className="whitespace-nowrap px-4 py-3 text-center">
                                            {canMutate && (
                                                <button
                                                onClick={() => handleDelete(deal.id)}
                                                className="text-red-500 hover:text-red-700"
                                                title="Hapus"
                                                >
                                                <Trash2 className="h-4 w-4" />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            {/* Toast */}
            {toast && (
                <div className={`fixed bottom-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-white text-sm font-medium transition-all duration-300 ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
                    }`}>
                    {toast.type === 'success' ? '✓' : '✕'} {toast.message}
                </div>
            )}
        </div>
    )
}
