'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { formatCurrency, formatDate } from '@/lib/utils'

type Deal = {
    id: string
    name: string
    company: string
    value: number
    stage: string
    probability: number
    assignedTo: string
    expectedCloseDate: string
    source: string
    notes: string
    competitors: string[]
    activities: Array<{ type: string; date: string; description: string }>
    createdAt: string
}

const stageStyles: Record<string, string> = {
    Discovery: 'bg-blue-100 text-blue-800',
    Proposal: 'bg-yellow-100 text-yellow-800',
    Negosiasi: 'bg-orange-100 text-orange-800',
    Closing: 'bg-green-100 text-green-800',
}

export default function DealsPage() {
    const [deals, setDeals] = useState<Deal[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [filterStage, setFilterStage] = useState<string>('all')
    const [searchQuery, setSearchQuery] = useState('')

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
                setError('Gagal memuat data deals')
            }
        } catch {
            setError('Terjadi kesalahan saat memuat data')
        } finally {
            setLoading(false)
        }
    }

    const filtered = deals.filter((d) => {
        const matchStage = filterStage === 'all' || d.stage === filterStage
        const matchSearch = searchQuery === '' ||
            d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            d.company.toLowerCase().includes(searchQuery.toLowerCase())
        return matchStage && matchSearch
    })

    const totalValue = deals.reduce((s, d) => s + d.value, 0)
    const weightedValue = deals.reduce((s, d) => s + (d.value * d.probability / 100), 0)
    const avgWinProb = deals.length > 0 ? Math.round(deals.reduce((s, d) => s + d.probability, 0) / deals.length) : 0

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
                        Coba Lagi
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
                    <h1 className="text-2xl font-bold text-gray-900">Deals</h1>
                    <p className="text-gray-500">{deals.length} deals aktif · Total {formatCurrency(totalValue)}</p>
                </div>
                <button className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700">
                    ＋ Deal Baru
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                    <p className="text-sm text-gray-500">Total Deals</p>
                    <p className="mt-1 text-2xl font-bold text-gray-900">{deals.length}</p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                    <p className="text-sm text-gray-500">Total Value</p>
                    <p className="mt-1 text-xl font-bold text-green-600">{formatCurrency(totalValue)}</p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                    <p className="text-sm text-gray-500">Weighted Value</p>
                    <p className="mt-1 text-xl font-bold text-blue-600">{formatCurrency(weightedValue)}</p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                    <p className="text-sm text-gray-500">Avg Win Probability</p>
                    <p className="mt-1 text-2xl font-bold text-purple-600">{avgWinProb}%</p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-4 sm:flex-row sm:items-center">
                <div className="flex-1">
                    <input
                        type="text"
                        placeholder="Cari deal..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                </div>
                <div className="flex gap-2">
                    {['all', 'Discovery', 'Proposal', 'Negosiasi', 'Closing'].map((stage) => (
                        <button
                            key={stage}
                            onClick={() => setFilterStage(stage)}
                            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${filterStage === stage
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                        >
                            {stage === 'all' ? 'Semua' : stage}
                        </button>
                    ))}
                </div>
            </div>

            {/* Table */}
            <div className="rounded-xl border border-gray-200 bg-white">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="border-b border-gray-200 bg-gray-50">
                                <th className="px-4 py-3 font-medium text-gray-500">Nama Deal</th>
                                <th className="px-4 py-3 font-medium text-gray-500">Perusahaan</th>
                                <th className="px-4 py-3 text-right font-medium text-gray-500">Nilai</th>
                                <th className="px-4 py-3 text-center font-medium text-gray-500">Stage</th>
                                <th className="px-4 py-3 text-center font-medium text-gray-500">Win %</th>
                                <th className="px-4 py-3 text-center font-medium text-gray-500">Weighted</th>
                                <th className="px-4 py-3 font-medium text-gray-500">Expected Close</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                                        Tidak ada deal ditemukan
                                    </td>
                                </tr>
                            ) : (
                                filtered.map((deal) => (
                                    <tr key={deal.id} className="hover:bg-gray-50">
                                        <td className="whitespace-nowrap px-4 py-3">
                                            <Link href={`/dashboard/crm/deals/${deal.id}`} className="font-medium text-blue-600 hover:underline">
                                                {deal.name}
                                            </Link>
                                        </td>
                                        <td className="px-4 py-3">{deal.company}</td>
                                        <td className="whitespace-nowrap px-4 py-3 text-right font-medium">{formatCurrency(deal.value)}</td>
                                        <td className="whitespace-nowrap px-4 py-3 text-center">
                                            <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${stageStyles[deal.stage] || 'bg-gray-100 text-gray-700'}`}>
                                                {deal.stage}
                                            </span>
                                        </td>
                                        <td className="whitespace-nowrap px-4 py-3 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <div className="h-2 w-16 rounded-full bg-gray-200">
                                                    <div
                                                        className="h-full rounded-full bg-blue-500"
                                                        style={{ width: `${deal.probability}%` }}
                                                    />
                                                </div>
                                                <span className="text-xs text-gray-500">{deal.probability}%</span>
                                            </div>
                                        </td>
                                        <td className="whitespace-nowrap px-4 py-3 text-center font-medium text-green-600">
                                            {formatCurrency(deal.value * deal.probability / 100)}
                                        </td>
                                        <td className="whitespace-nowrap px-4 py-3 text-gray-500">{formatDate(deal.expectedCloseDate)}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
