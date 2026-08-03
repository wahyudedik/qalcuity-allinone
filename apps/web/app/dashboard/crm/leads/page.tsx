'use client'

import { useState } from 'react'

type Lead = {
    id: string
    name: string
    company: string
    email: string
    phone: string
    source: string
    score: number
    status: 'new' | 'contacted' | 'qualified' | 'unqualified'
    assignedTo: string
    createdAt: string
}

const MOCK_LEADS: Lead[] = [
    { id: 'L-001', name: 'Ahmad Rizky', company: 'PT Teknologi Nusantara', email: 'ahmad@teknologi.co.id', phone: '081234567890', source: 'Website', score: 85, status: 'new', assignedTo: 'Budi', createdAt: '2026-08-03' },
    { id: 'L-002', name: 'Siti Rahmawati', company: 'CV Berkah Mandiri', email: 'siti@berkah.co.id', phone: '082345678901', source: 'Referral', score: 92, status: 'qualified', assignedTo: 'Sari', createdAt: '2026-08-02' },
    { id: 'L-003', name: 'Dedi Kurniawan', company: 'PT Maju Jaya', email: 'dedi@maju-jaya.co.id', phone: '083456789012', source: 'LinkedIn', score: 65, status: 'contacted', assignedTo: 'Andi', createdAt: '2026-08-01' },
    { id: 'L-004', name: 'Rina Sari', company: 'CV Abadi Sentosa', email: 'rina@abadi.co.id', phone: '084567890123', source: 'Google Ads', score: 45, status: 'new', assignedTo: 'Budi', createdAt: '2026-07-31' },
    { id: 'L-005', name: 'Bambang Susilo', company: 'PT Global Tech', email: 'bambang@globaltech.co.id', phone: '085678901234', source: 'Event', score: 78, status: 'qualified', assignedTo: 'Sari', createdAt: '2026-07-30' },
    { id: 'L-006', name: 'Maya Putri', company: 'CV Sejahtera Bersama', email: 'maya@sejahtera.co.id', phone: '086789012345', source: 'Website', score: 30, status: 'unqualified', assignedTo: 'Andi', createdAt: '2026-07-29' },
    { id: 'L-007', name: 'Hendra Wijaya', company: 'PT Solusi Digital', email: 'hendra@solusidigital.co.id', phone: '087890123456', source: 'Referral', score: 88, status: 'contacted', assignedTo: 'Budi', createdAt: '2026-07-28' },
    { id: 'L-008', name: 'Diana Puspita', company: 'CV Karya Utama', email: 'diana@karyautama.co.id', phone: '088901234567', source: 'Facebook Ads', score: 55, status: 'new', assignedTo: 'Sari', createdAt: '2026-07-27' },
]

const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount)

const statusStyles: Record<string, string> = {
    new: 'bg-blue-100 text-blue-800',
    contacted: 'bg-yellow-100 text-yellow-800',
    qualified: 'bg-green-100 text-green-800',
    unqualified: 'bg-gray-100 text-gray-500',
}

const statusLabels: Record<string, string> = {
    new: 'Baru',
    contacted: 'Dihubungi',
    qualified: 'Kualifikasi',
    unqualified: 'Tidak Layak',
}

const sourceColors: Record<string, string> = {
    Website: 'bg-blue-50 text-blue-700',
    Referral: 'bg-green-50 text-green-700',
    LinkedIn: 'bg-indigo-50 text-indigo-700',
    'Google Ads': 'bg-red-50 text-red-700',
    Event: 'bg-purple-50 text-purple-700',
    'Facebook Ads': 'bg-blue-50 text-blue-700',
}

export default function LeadsPage() {
    const [leads] = useState<Lead[]>(MOCK_LEADS)
    const [filterStatus, setFilterStatus] = useState<string>('all')
    const [searchQuery, setSearchQuery] = useState('')

    const filtered = leads.filter((l) => {
        const matchStatus = filterStatus === 'all' || l.status === filterStatus
        const matchSearch = searchQuery === '' || l.name.toLowerCase().includes(searchQuery.toLowerCase()) || l.company.toLowerCase().includes(searchQuery.toLowerCase())
        return matchStatus && matchSearch
    })

    const stats = {
        total: leads.length,
        new: leads.filter((l) => l.status === 'new').length,
        contacted: leads.filter((l) => l.status === 'contacted').length,
        qualified: leads.filter((l) => l.status === 'qualified').length,
        avgScore: Math.round(leads.reduce((s, l) => s + l.score, 0) / leads.length),
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Leads</h1>
                    <p className="text-gray-500">Kelola prospek dan lead masuk</p>
                </div>
                <div className="flex gap-2">
                    <button className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
                        📥 Import
                    </button>
                    <button className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700">
                        ＋ Lead Baru
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                    <p className="text-sm text-gray-500">Total Leads</p>
                    <p className="mt-1 text-2xl font-bold text-gray-900">{stats.total}</p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                    <p className="text-sm text-gray-500">Baru</p>
                    <p className="mt-1 text-2xl font-bold text-blue-600">{stats.new}</p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                    <p className="text-sm text-gray-500">Dihubungi</p>
                    <p className="mt-1 text-2xl font-bold text-yellow-600">{stats.contacted}</p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                    <p className="text-sm text-gray-500">Kualifikasi</p>
                    <p className="mt-1 text-2xl font-bold text-green-600">{stats.qualified}</p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                    <p className="text-sm text-gray-500">Avg Score</p>
                    <p className="mt-1 text-2xl font-bold text-purple-600">{stats.avgScore}</p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-4 sm:flex-row sm:items-center">
                <div className="flex-1">
                    <input
                        type="text"
                        placeholder="Cari berdasarkan nama atau perusahaan..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                </div>
                <div className="flex gap-2">
                    {['all', 'new', 'contacted', 'qualified', 'unqualified'].map((status) => (
                        <button
                            key={status}
                            onClick={() => setFilterStatus(status)}
                            className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${filterStatus === status ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                        >
                            {status === 'all' ? 'Semua' : statusLabels[status]}
                        </button>
                    ))}
                </div>
            </div>

            {/* Leads Table */}
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="border-b border-gray-200 bg-gray-50">
                                <th className="px-4 py-3 font-medium text-gray-600">Lead</th>
                                <th className="px-4 py-3 font-medium text-gray-600">Perusahaan</th>
                                <th className="px-4 py-3 font-medium text-gray-600">Kontak</th>
                                <th className="px-4 py-3 font-medium text-gray-600">Sumber</th>
                                <th className="px-4 py-3 font-medium text-gray-600">Score</th>
                                <th className="px-4 py-3 font-medium text-gray-600">Status</th>
                                <th className="px-4 py-3 font-medium text-gray-600">Assigned</th>
                                <th className="px-4 py-3 font-medium text-gray-600">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-4 py-12 text-center text-gray-500">
                                        <div className="flex flex-col items-center gap-2">
                                            <span className="text-4xl">🎯</span>
                                            <p>Belum ada data lead</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filtered.map((lead) => (
                                    <tr key={lead.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3">
                                            <p className="font-medium text-gray-900">{lead.name}</p>
                                            <p className="text-xs text-gray-500">{lead.id}</p>
                                        </td>
                                        <td className="px-4 py-3 text-gray-700">{lead.company}</td>
                                        <td className="px-4 py-3">
                                            <p className="text-xs text-gray-600">{lead.email}</p>
                                            <p className="text-xs text-gray-500">{lead.phone}</p>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${sourceColors[lead.source] || 'bg-gray-100 text-gray-700'}`}>
                                                {lead.source}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <div className="h-2 w-16 rounded-full bg-gray-200">
                                                    <div
                                                        className={`h-2 rounded-full ${lead.score >= 70 ? 'bg-green-500' : lead.score >= 40 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                                        style={{ width: `${lead.score}%` }}
                                                    />
                                                </div>
                                                <span className="text-xs font-medium text-gray-700">{lead.score}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${statusStyles[lead.status]}`}>
                                                {statusLabels[lead.status]}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-gray-500">{lead.assignedTo}</td>
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
                        Menampilkan {filtered.length} dari {leads.length} leads
                    </p>
                    <div className="flex gap-1">
                        <button className="rounded border border-gray-300 bg-white px-3 py-1 text-sm text-gray-700 hover:bg-gray-100">&laquo;</button>
                        <button className="rounded border border-blue-600 bg-blue-600 px-3 py-1 text-sm text-white">1</button>
                        <button className="rounded border border-gray-300 bg-white px-3 py-1 text-sm text-gray-700 hover:bg-gray-100">2</button>
                        <button className="rounded border border-gray-300 bg-white px-3 py-1 text-sm text-gray-700 hover:bg-gray-100">&raquo;</button>
                    </div>
                </div>
            </div>
        </div>
    )
}
