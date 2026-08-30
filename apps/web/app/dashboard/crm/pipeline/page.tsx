'use client'

import { useState, useEffect } from 'react'
import { useTranslation } from '@/lib/i18n'
import { formatCurrency } from '@/lib/utils'

type Deal = {
    id: string
    name: string
    company: string
    value: number
    stage: string
    probability: number
    assignedTo: string
    expectedCloseDate: string
    createdAt: string
}

type Stage = {
    id: string
    name: string
    color: string
    bgColor: string
    deals: Deal[]
}

const stageConfig = [
    { id: 'DISCOVERY', name: 'Discovery', color: 'bg-blue-500', bgColor: 'bg-blue-50' },
    { id: 'PROPOSAL', name: 'Proposal', color: 'bg-yellow-500', bgColor: 'bg-yellow-50' },
    { id: 'NEGOTIATION', name: 'Negosiasi', color: 'bg-orange-500', bgColor: 'bg-orange-50' },
    { id: 'CLOSING', name: 'Closing', color: 'bg-purple-500', bgColor: 'bg-purple-50' },
    { id: 'CLOSED_WON', name: 'Won', color: 'bg-green-500', bgColor: 'bg-green-50' },
    { id: 'CLOSED_LOST', name: 'Lost', color: 'bg-red-500', bgColor: 'bg-red-50' },
]

export default function PipelinePage() {
    const { t } = useTranslation()
    const [deals, setDeals] = useState<Deal[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [viewMode, setViewMode] = useState<'board' | 'list'>('board')

    useEffect(() => {
        fetchDeals()
    }, [])

    const fetchDeals = async () => {
        try {
            setLoading(true)
            const response = await fetch('/api/crm/deals?limit=100')
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

    const getStageLabel = (stageId: string) => t(`crm.deals.stages.${stageId}`)

    // Organize deals by stage — filter out CLOSED_WON and CLOSED_LOST from active stages for stats
    const activeStages: Stage[] = stageConfig
        .filter(s => s.id !== 'CLOSED_WON' && s.id !== 'CLOSED_LOST')
        .map(config => ({
            ...config,
            deals: deals.filter(d => d.stage === config.id),
        }))

    const closedStages: Stage[] = stageConfig
        .filter(s => s.id === 'CLOSED_WON' || s.id === 'CLOSED_LOST')
        .map(config => ({
            ...config,
            deals: deals.filter(d => d.stage === config.id),
        }))

    const allStages = [...activeStages, ...closedStages]

    const totalValue = deals.reduce((sum, d) => sum + Number(d.value), 0)
    const totalDeals = deals.length
    const weightedValue = deals
        .filter(d => d.stage !== 'CLOSED_WON' && d.stage !== 'CLOSED_LOST')
        .reduce((sum, d) => sum + (Number(d.value) * d.probability / 100), 0)
    const wonCount = deals.filter(d => d.stage === 'CLOSED_WON').length
    const lostCount = deals.filter(d => d.stage === 'CLOSED_LOST').length
    const winRate = totalDeals > 0 ? Math.round((wonCount / (wonCount + lostCount || 1)) * 100) : 0

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
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="h-96 bg-gray-200 rounded-xl"></div>
                        ))}
                    </div>
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
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('crm.pipeline.title')}</h1>
                    <p className="text-gray-500 dark:text-gray-400">{totalDeals} {t('crm.pipeline.subtitle')} {formatCurrency(totalValue)}</p>
                </div>
                <div className="flex gap-2">
                    <div className="flex gap-1 rounded-lg border border-gray-200 p-1 dark:border-gray-700">
                        <button
                            onClick={() => setViewMode('board')}
                            className={`rounded px-3 py-1.5 text-xs font-medium ${viewMode === 'board' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'}`}
                        >
                            {t('crm.pipeline.boardView')}
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`rounded px-3 py-1.5 text-xs font-medium ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'}`}
                        >
                            {t('crm.pipeline.listView')}
                        </button>
                    </div>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
                {activeStages.map((stage) => {
                    const stageValue = stage.deals.reduce((sum, d) => sum + Number(d.value), 0)
                    const stageWeighted = stage.deals.reduce((sum, d) => sum + (Number(d.value) * d.probability / 100), 0)
                    return (
                        <div key={stage.id} className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                            <div className="flex items-center gap-2">
                                <div className={`h-3 w-3 rounded-full ${stage.color}`} />
                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{getStageLabel(stage.id)}</p>
                            </div>
                            <p className="mt-2 text-xl font-bold text-gray-900 dark:text-white">{stage.deals.length}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{formatCurrency(stageValue)}</p>
                            <p className="text-xs text-blue-600 mt-1">{t('crm.pipeline.weighted')} {formatCurrency(stageWeighted)}</p>
                        </div>
                    )
                })}
                {/* Win Rate Card */}
                <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                    <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full bg-green-500" />
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('crm.pipeline.winRate')}</p>
                    </div>
                    <p className="mt-2 text-xl font-bold text-gray-900 dark:text-white">{winRate}%</p>
                    <p className="text-xs text-green-600">{wonCount} {t('crm.pipeline.won')}</p>
                    <p className="text-xs text-red-500">{lostCount} {t('crm.pipeline.lost')}</p>
                </div>
            </div>

            {/* Board View */}
            {viewMode === 'board' && (
                <div className="space-y-4">
                    {/* Active Stages */}
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                        {activeStages.map((stage) => (
                            <BoardColumn key={stage.id} stage={stage} getStageLabel={getStageLabel} t={t} />
                        ))}
                    </div>
                    {/* Closed Stages */}
                    {(closedStages.some(s => s.deals.length > 0) || true) && (
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            {closedStages.map((stage) => (
                                <BoardColumn key={stage.id} stage={stage} getStageLabel={getStageLabel} t={t} />
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* List View - Mobile Cards */}
            {viewMode === 'list' && (
                <>
                    <div className="md:hidden space-y-3">
                        {allStages.map((stage) =>
                            stage.deals.map((deal) => (
                                <div key={deal.id} className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <div className="font-medium text-gray-900 dark:text-white">{deal.name}</div>
                                            {deal.company && <div className="text-sm text-gray-500 dark:text-gray-400">{deal.company}</div>}
                                        </div>
                                        <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${stage.bgColor} ${stage.color.replace('bg-', 'text-')}`}>
                                            {getStageLabel(stage.id)}
                                        </span>
                                    </div>
                                    <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                                        <div>
                                            <span className="text-gray-500 dark:text-gray-400">{t('crm.pipeline.table.value')}:</span>
                                            <span className="ml-1 font-medium text-gray-900 dark:text-white">{formatCurrency(Number(deal.value))}</span>
                                        </div>
                                        <div>
                                            <span className="text-gray-500 dark:text-gray-400">{t('crm.pipeline.table.winProb')}:</span>
                                            <span className="ml-1">{deal.probability}%</span>
                                        </div>
                                        <div>
                                            <span className="text-gray-500 dark:text-gray-400">{t('crm.pipeline.table.weighted')}:</span>
                                            <span className="ml-1 font-medium text-green-600">{formatCurrency(Number(deal.value) * deal.probability / 100)}</span>
                                        </div>
                                        <div>
                                            <span className="text-gray-500 dark:text-gray-400">Owner:</span>
                                            <span className="ml-1">{deal.assignedTo || '-'}</span>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* List View - Desktop Table */}
                    <div className="hidden md:block rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead>
                                    <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900">
                                        <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">{t('crm.pipeline.table.deal')}</th>
                                        <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">{t('crm.pipeline.table.company')}</th>
                                        <th className="px-4 py-3 text-right font-medium text-gray-500 dark:text-gray-400">{t('crm.pipeline.table.value')}</th>
                                        <th className="px-4 py-3 text-center font-medium text-gray-500 dark:text-gray-400">{t('crm.pipeline.table.stage')}</th>
                                        <th className="hidden lg:table-cell px-4 py-3 text-center font-medium text-gray-500 dark:text-gray-400">{t('crm.pipeline.table.winProb')}</th>
                                        <th className="hidden lg:table-cell px-4 py-3 text-center font-medium text-gray-500 dark:text-gray-400">{t('crm.pipeline.table.weighted')}</th>
                                        <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">{t('crm.pipeline.table.owner')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                    {allStages.map((stage) =>
                                        stage.deals.map((deal) => (
                                            <tr key={deal.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                                <td className="whitespace-nowrap px-4 py-3 font-medium text-gray-900 dark:text-white">{deal.name}</td>
                                                <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{deal.company || '-'}</td>
                                                <td className="whitespace-nowrap px-4 py-3 text-right font-medium text-gray-900 dark:text-white">{formatCurrency(Number(deal.value))}</td>
                                                <td className="whitespace-nowrap px-4 py-3 text-center">
                                                    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${stage.bgColor} ${stage.color.replace('bg-', 'text-')}`}>
                                                        {getStageLabel(stage.id)}
                                                    </span>
                                                </td>
                                                <td className="hidden lg:table-cell whitespace-nowrap px-4 py-3 text-center text-gray-600 dark:text-gray-400">{deal.probability}%</td>
                                                <td className="hidden lg:table-cell whitespace-nowrap px-4 py-3 text-center font-medium text-green-600">
                                                    {formatCurrency(Number(deal.value) * deal.probability / 100)}
                                                </td>
                                                <td className="whitespace-nowrap px-4 py-3 text-gray-500 dark:text-gray-400">{deal.assignedTo || '-'}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}

            {/* Summary */}
            <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{t('crm.pipeline.totalPipelineValue')}</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(totalValue)}</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{t('crm.pipeline.weightedPipeline')}</p>
                        <p className="text-2xl font-bold text-blue-600">{formatCurrency(weightedValue)}</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{t('crm.pipeline.avgDealSize')}</p>
                        <p className="text-2xl font-bold text-green-600">
                            {formatCurrency(totalDeals > 0 ? totalValue / totalDeals : 0)}
                        </p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{t('crm.pipeline.winRate')}</p>
                        <p className="text-2xl font-bold text-purple-600">{winRate}%</p>
                    </div>
                </div>
            </div>
        </div>
    )
}

function BoardColumn({ stage, getStageLabel, t }: { stage: Stage; getStageLabel: (id: string) => string; t: (key: string) => string }) {
    return (
        <div className={`rounded-xl border border-gray-200 ${stage.bgColor} p-4`}>
            <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className={`h-3 w-3 rounded-full ${stage.color}`} />
                    <h3 className="font-semibold text-gray-900">{getStageLabel(stage.id)}</h3>
                </div>
                <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-gray-600">
                    {stage.deals.length}
                </span>
            </div>
            <div className="space-y-3">
                {stage.deals.length === 0 ? (
                    <p className="rounded-lg bg-white/50 p-4 text-center text-sm text-gray-500">
                        {t('crm.pipeline.noDeals')}
                    </p>
                ) : (
                    stage.deals.map((deal) => (
                        <div
                            key={deal.id}
                            className="rounded-lg bg-white p-3 shadow-sm transition-shadow hover:shadow-md"
                        >
                            <p className="font-medium text-gray-900">{deal.name}</p>
                            {deal.company && (
                                <p className="text-xs text-gray-500">{deal.company}</p>
                            )}
                            <div className="mt-2 flex items-center justify-between">
                                <span className="text-sm font-bold text-green-600">
                                    {formatCurrency(Number(deal.value))}
                                </span>
                                <span className="text-xs text-gray-500">
                                    {deal.probability}%
                                </span>
                            </div>
                            <div className="mt-2 flex items-center gap-2">
                                <div className="h-1.5 flex-1 rounded-full bg-gray-200">
                                    <div
                                        className="h-full rounded-full bg-blue-500"
                                        style={{ width: `${deal.probability}%` }}
                                    />
                                </div>
                            </div>
                            <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                                <span>{deal.assignedTo || t('crm.pipeline.unassigned')}</span>
                                <span>{t('crm.pipeline.weighted')} {formatCurrency(Number(deal.value) * deal.probability / 100)}</span>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}
