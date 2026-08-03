'use client'

import { useState } from 'react'

type Deal = {
    id: string
    name: string
    company: string
    value: number
    owner: string
    daysInStage: number
    winProb: number
}

type Stage = {
    id: string
    name: string
    color: string
    bgColor: string
    deals: Deal[]
}

const INITIAL_STAGES: Stage[] = [
    {
        id: 'discovery',
        name: 'Discovery',
        color: 'bg-blue-500',
        bgColor: 'bg-blue-50',
        deals: [
            { id: 'd1', name: 'PT Sejahtera', company: 'PT Sejahtera Corp', value: 200000000, owner: 'Budi', daysInStage: 5, winProb: 30 },
            { id: 'd2', name: 'CV Berkah Mandiri', company: 'CV Berkah Mandiri', value: 45000000, owner: 'Sari', daysInStage: 3, winProb: 25 },
            { id: 'd3', name: 'PT Nusantara Tech', company: 'PT Nusantara Technology', value: 75000000, owner: 'Andi', daysInStage: 7, winProb: 20 },
            { id: 'd4', name: 'PT Global Solutions', company: 'PT Global Solutions', value: 120000000, owner: 'Budi', daysInStage: 2, winProb: 35 },
        ],
    },
    {
        id: 'proposal',
        name: 'Proposal',
        color: 'bg-yellow-500',
        bgColor: 'bg-yellow-50',
        deals: [
            { id: 'd5', name: 'CV Maju Bersama', company: 'CV Maju Bersama', value: 85000000, owner: 'Sari', daysInStage: 4, winProb: 55 },
            { id: 'd6', name: 'PT Abadi Sentosa', company: 'PT Abadi Sentosa', value: 120000000, owner: 'Budi', daysInStage: 6, winProb: 45 },
            { id: 'd7', name: 'CV Jaya Abadi', company: 'CV Jaya Abadi', value: 35000000, owner: 'Andi', daysInStage: 3, winProb: 40 },
        ],
    },
    {
        id: 'negosiasi',
        name: 'Negosiasi',
        color: 'bg-orange-500',
        bgColor: 'bg-orange-50',
        deals: [
            { id: 'd8', name: 'PT ABC Corp', company: 'PT ABC Corporation', value: 150000000, owner: 'Budi', daysInStage: 3, winProb: 75 },
            { id: 'd9', name: 'PT Maju Jaya', company: 'PT Maju Jaya', value: 65000000, owner: 'Sari', daysInStage: 5, winProb: 60 },
        ],
    },
    {
        id: 'closing',
        name: 'Closing',
        color: 'bg-green-500',
        bgColor: 'bg-green-50',
        deals: [
            { id: 'd10', name: 'CV Berkah Jaya', company: 'CV Berkah Jaya', value: 45000000, owner: 'Andi', daysInStage: 2, winProb: 90 },
            { id: 'd11', name: 'PT Sukses Makmur', company: 'PT Sukses Makmur', value: 20000000, owner: 'Budi', daysInStage: 1, winProb: 85 },
        ],
    },
]

const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount)

export default function PipelinePage() {
    const [stages] = useState<Stage[]>(INITIAL_STAGES)
    const [viewMode, setViewMode] = useState<'board' | 'list'>('board')

    const totalValue = stages.reduce((sum, stage) => sum + stage.deals.reduce((s, d) => s + d.value, 0), 0)
    const totalDeals = stages.reduce((sum, stage) => sum + stage.deals.length, 0)

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Sales Pipeline</h1>
                    <p className="text-gray-500">
                        {totalDeals} deals · Total value {formatCurrency(totalValue)}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    {/* View Toggle */}
                    <div className="flex rounded-lg border border-gray-300 bg-white">
                        <button
                            onClick={() => setViewMode('board')}
                            className={`px-3 py-1.5 text-sm font-medium ${viewMode === 'board' ? 'bg-blue-600 text-white' : 'text-gray-700'}`}
                        >
                            Board
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`px-3 py-1.5 text-sm font-medium ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'text-gray-700'}`}
                        >
                            List
                        </button>
                    </div>
                    <button className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700">
                        ＋ Deal Baru
                    </button>
                </div>
            </div>

            {/* Board View */}
            {viewMode === 'board' && (
                <div className="flex gap-4 overflow-x-auto pb-4">
                    {stages.map((stage) => {
                        const stageValue = stage.deals.reduce((s, d) => s + d.value, 0)
                        return (
                            <div key={stage.id} className="min-w-[280px] flex-1">
                                {/* Stage Header */}
                                <div className={`rounded-t-lg ${stage.bgColor} px-4 py-3`}>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className={`h-2.5 w-2.5 rounded-full ${stage.color}`} />
                                            <h3 className="font-semibold text-gray-900">{stage.name}</h3>
                                            <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-gray-600">
                                                {stage.deals.length}
                                            </span>
                                        </div>
                                    </div>
                                    <p className="mt-1 text-sm text-gray-600">{formatCurrency(stageValue)}</p>
                                </div>

                                {/* Deal Cards */}
                                <div className={`space-y-2 rounded-b-lg ${stage.bgColor} p-2`}>
                                    {stage.deals.map((deal) => (
                                        <div
                                            key={deal.id}
                                            className="cursor-pointer rounded-lg border border-gray-200 bg-white p-3 shadow-sm transition-shadow hover:shadow-md"
                                        >
                                            <div className="flex items-start justify-between">
                                                <div>
                                                    <p className="font-medium text-gray-900">{deal.name}</p>
                                                    <p className="text-xs text-gray-500">{deal.company}</p>
                                                </div>
                                            </div>
                                            <div className="mt-3 flex items-center justify-between">
                                                <span className="text-sm font-semibold text-gray-900">{formatCurrency(deal.value)}</span>
                                                <span className="text-xs text-gray-500">{deal.daysInStage}h</span>
                                            </div>
                                            <div className="mt-2 flex items-center justify-between">
                                                <div className="flex items-center gap-1.5">
                                                    <div className="h-5 w-5 rounded-full bg-gray-300" />
                                                    <span className="text-xs text-gray-500">{deal.owner}</span>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <div className="h-1.5 w-12 rounded-full bg-gray-200">
                                                        <div className="h-1.5 rounded-full bg-blue-500" style={{ width: `${deal.winProb}%` }} />
                                                    </div>
                                                    <span className="text-xs text-gray-500">{deal.winProb}%</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}

                                    {/* Add Deal Button */}
                                    <button className="w-full rounded-lg border-2 border-dashed border-gray-300 py-2 text-sm text-gray-500 hover:border-gray-400 hover:text-gray-700">
                                        + Tambah Deal
                                    </button>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            {/* List View */}
            {viewMode === 'list' && (
                <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="border-b border-gray-200 bg-gray-50">
                                <th className="px-4 py-3 font-medium text-gray-600">Deal</th>
                                <th className="px-4 py-3 font-medium text-gray-600">Perusahaan</th>
                                <th className="px-4 py-3 font-medium text-gray-600">Stage</th>
                                <th className="px-4 py-3 text-right font-medium text-gray-600">Nilai</th>
                                <th className="px-4 py-3 font-medium text-gray-600">Win Prob</th>
                                <th className="px-4 py-3 font-medium text-gray-600">Owner</th>
                                <th className="px-4 py-3 font-medium text-gray-600">Hari di Stage</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {stages.map((stage) =>
                                stage.deals.map((deal) => (
                                    <tr key={deal.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 font-medium text-gray-900">{deal.name}</td>
                                        <td className="px-4 py-3 text-gray-500">{deal.company}</td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${stage.bgColor} text-gray-800`}>
                                                <span className={`h-1.5 w-1.5 rounded-full ${stage.color}`} />
                                                {stage.name}
                                            </span>
                                        </td>
                                        <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-gray-900">{formatCurrency(deal.value)}</td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <div className="h-1.5 w-16 rounded-full bg-gray-200">
                                                    <div className="h-1.5 rounded-full bg-blue-500" style={{ width: `${deal.winProb}%` }} />
                                                </div>
                                                <span className="text-xs text-gray-500">{deal.winProb}%</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-gray-500">{deal.owner}</td>
                                        <td className="px-4 py-3 text-gray-500">{deal.daysInStage} hari</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}
