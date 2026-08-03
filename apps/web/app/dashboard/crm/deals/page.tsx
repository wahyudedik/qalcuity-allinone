'use client'

import { useState } from 'react'

type Deal = {
    id: string
    name: string
    company: string
    value: number
    stage: string
    owner: string
    winProb: number
    closeDate: string
    createdAt: string
}

const MOCK_DEALS: Deal[] = [
    { id: 'D-001', name: 'Implementasi ERP', company: 'PT ABC Corp', value: 150000000, stage: 'Negosiasi', owner: 'Budi', winProb: 75, closeDate: '2026-08-30', createdAt: '2026-07-01' },
    { id: 'D-002', name: 'Licence Software', company: 'CV Maju Bersama', value: 85000000, stage: 'Proposal', owner: 'Sari', winProb: 55, closeDate: '2026-09-15', createdAt: '2026-07-10' },
    { id: 'D-003', name: 'Konsultasi Digital', company: 'PT Sejahtera', value: 200000000, stage: 'Discovery', owner: 'Andi', winProb: 30, closeDate: '2026-10-01', createdAt: '2026-07-20' },
    { id: 'D-004', name: 'Pengadaan Server', company: 'CV Berkah Jaya', value: 45000000, stage: 'Closing', owner: 'Andi', winProb: 90, closeDate: '2026-08-10', createdAt: '2026-06-15' },
    { id: 'D-005', name: 'Maintenance Contract', company: 'PT Abadi Sentosa', value: 120000000, stage: 'Proposal', owner: 'Budi', winProb: 45, closeDate: '2026-09-30', createdAt: '2026-07-25' },
    { id: 'D-006', name: 'Cloud Migration', company: 'PT Maju Jaya', value: 65000000, stage: 'Negosiasi', owner: 'Sari', winProb: 60, closeDate: '2026-08-25', createdAt: '2026-07-05' },
    { id: 'D-007', name: 'IT Infrastructure', company: 'PT Nusantara Tech', value: 75000000, stage: 'Discovery', owner: 'Budi', winProb: 20, closeDate: '2026-11-01', createdAt: '2026-08-01' },
    { id: 'D-008', name: 'Security Audit', company: 'CV Jaya Abadi', value: 35000000, stage: 'Proposal', owner: 'Andi', winProb: 40, closeDate: '2026-09-20', createdAt: '2026-07-28' },
]

const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount)

const formatDate = (dateStr: string) =>
    new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(dateStr))

const stageStyles: Record<string, string> = {
    Discovery: 'bg-blue-100 text-blue-800',
    Proposal: 'bg-yellow-100 text-yellow-800',
    Negosiasi: 'bg-orange-100 text-orange-800',
    Closing: 'bg-green-100 text-green-800',
}

export default function DealsPage() {
    const [deals] = useState<Deal[]>(MOCK_DEALS)
    const [filterStage, setFilterStage] = useState<string>('all')
    const [searchQuery, setSearchQuery] = useState('')

    const filtered = deals.filter((d) => {
        const matchStage = filterStage === 'all' || d.stage === filterStage
        const matchSearch = searchQuery === '' || d.name.toLowerCase().includes(searchQuery.toLowerCase()) || d.company.toLowerCase().includes(searchQuery.toLowerCase())
        return matchStage && matchSearch
    })

    const totalValue = deals.reduce((s, d) => s + d.value, 0)
    const avgWinProb = Math.round(deals.reduce((s, d) => s + d.winProb, 0) / deals.length)

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
                    <p className="text-sm text-gray-500">Avg Win Probability</p>
                    <p className="mt-1 text-2xl font-bold text-blue-600">{avgWinProb}%</p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                    <p className="text-sm text-gray-500">Closing Bulan Ini</p>
                    <p className="mt-1 text-2xl font-bold text-purple-600">
                        {deals.filter((d) => d.stage === 'Closing').length}
                    </p>
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
                            className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${filterStage === stage ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                        >
                            {stage === 'all' ? 'Semua' : stage}
                        </button>
                    ))}
                </div>
            </div>

            {/* Deals Table */}
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="border-b border-gray-200 bg-gray-50">
                                <th className="px-4 py-3 font-medium text-gray-600">Deal</th>
                                <th className="px-4 py-3 font-medium text-gray-600">Perusahaan</th>
                                <th className="px-4 py-3 font-medium text-gray-600">Stage</th>
                                <th className="px-4 py-3 text-right font-medium text-gray-600">Nilai</th>
                                <th className="px-4 py-3 font-medium text-gray-600">Win Prob</th>
                                <th className="px-4 py-3 font-medium text-gray-600">Owner</th>
                                <th className="px-4 py-3 font-medium text-gray-600">Close Date</th>
                                <th className="px-4 py-3 font-medium text-gray-600">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-4 py-12 text-center text-gray-500">
                                        <div className="flex flex-col items-center gap-2">
                                            <span className="text-4xl">🤝</span>
                                            <p>Belum ada data deal</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filtered.map((deal) => (
                                    <tr key={deal.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3">
                                            <p className="font-medium text-gray-900">{deal.name}</p>
                                            <p className="text-xs text-gray-500">{deal.id}</p>
                                        </td>
                                        <td className="px-4 py-3 text-gray-700">{deal.company}</td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${stageStyles[deal.stage] || 'bg-gray-100 text-gray-800'}`}>
                                                {deal.stage}
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
                                        <td className="whitespace-nowrap px-4 py-3 text-gray-500">{formatDate(deal.closeDate)}</td>
                                        <td className="px-4 py-3">
                                            <button className="text-sm text-blue-600 hover:underline">Detail</button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="flex items-center justify-between border-t border-gray-200 bg-gray-50 px-4 py-3">
                    <p className="text-sm text-gray-500">
                        Menampilkan {filtered.length} dari {deals.length} deals
                    </p>
                    <div className="flex gap-1">
                        <button className="rounded border border-gray-300 bg-white px-3 py-1 text-sm text-gray-700 hover:bg-gray-100">&laquo;</button>
                        <button className="rounded border border-blue-600 bg-blue-600 px-3 py-1 text-sm text-white">1</button>
                        <button className="rounded border border-gray-300 bg-white px-3 py-1 text-sm text-gray-700 hover:bg-gray-100">&raquo;</button>
                    </div>
                </div>
            </div>
        </div>
    )
}
