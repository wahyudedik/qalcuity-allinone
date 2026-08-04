'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { formatCurrency } from '@/lib/utils'

type Lead = {
    id: string
    name: string
    company: string
    email: string
    phone: string
    source: string
    value: number
    status: string
    assignedTo: string
    createdAt: string
}

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
    const [leads, setLeads] = useState<Lead[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [filterStatus, setFilterStatus] = useState<string>('all')
    const [searchQuery, setSearchQuery] = useState('')

    useEffect(() => {
        fetchLeads()
    }, [])

    const fetchLeads = async () => {
        try {
            setLoading(true)
            const response = await fetch('/api/crm/leads')
            const data = await response.json()
            if (data.success) {
                setLeads(data.data)
            } else {
                setError('Gagal memuat data leads')
            }
        } catch {
            setError('Terjadi kesalahan saat memuat data')
        } finally {
            setLoading(false)
        }
    }

    const filtered = leads.filter((l) => {
        const matchStatus = filterStatus === 'all' || l.status === filterStatus
        const matchSearch = searchQuery === '' ||
            l.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            l.company.toLowerCase().includes(searchQuery.toLowerCase())
        return matchStatus && matchSearch
    })

    const stats = {
        total: leads.length,
        new: leads.filter((l) => l.status === 'new').length,
        contacted: leads.filter((l) => l.status === 'contacted').length,
        qualified: leads.filter((l) => l.status === 'qualified').length,
        totalValue: leads.reduce((sum, l) => sum + (l.value || 0), 0),
    }

    if (loading) {
        return (
            <div className="space-y-6 p-6">
                <div className="animate-pulse">
                    <div className="h-8 bg-gray-200 rounded w-48 mb-4"></div>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                        {[1, 2, 3, 4, 5].map(i => (
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
                        onClick={fetchLeads}
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
                    <p className="text-sm text-gray-500">Total Nilai</p>
                    <p className="mt-1 text-2xl font-bold text-purple-600">{formatCurrency(stats.totalValue)}</p>
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
                <div className="flex flex-wrap gap-2">
                    {['all', 'new', 'contacted', 'qualified', 'unqualified'].map((status) => (
                        <button
                            key={status}
                            onClick={() => setFilterStatus(status)}
                            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${filterStatus === status
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                        >
                            {status === 'all' ? 'Semua' : statusLabels[status] || status}
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
                                <th className="px-4 py-3 font-medium text-gray-500">Nama</th>
                                <th className="px-4 py-3 font-medium text-gray-500">Perusahaan</th>
                                <th className="px-4 py-3 font-medium text-gray-500">Email</th>
                                <th className="px-4 py-3 font-medium text-gray-500">Telepon</th>
                                <th className="px-4 py-3 font-medium text-gray-500">Sumber</th>
                                <th className="px-4 py-3 text-right font-medium text-gray-500">Nilai</th>
                                <th className="px-4 py-3 text-center font-medium text-gray-500">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                                        Tidak ada lead ditemukan
                                    </td>
                                </tr>
                            ) : (
                                filtered.map((lead) => (
                                    <tr key={lead.id} className="hover:bg-gray-50">
                                        <td className="whitespace-nowrap px-4 py-3 font-medium">
                                            <Link href={`/dashboard/crm/leads/${lead.id}`} className="text-blue-600 hover:text-blue-800">
                                                {lead.name}
                                            </Link>
                                        </td>
                                        <td className="px-4 py-3">{lead.company}</td>
                                        <td className="whitespace-nowrap px-4 py-3 text-gray-500">{lead.email}</td>
                                        <td className="whitespace-nowrap px-4 py-3 text-gray-500">{lead.phone}</td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${sourceColors[lead.source] || 'bg-gray-50 text-gray-700'}`}>
                                                {lead.source}
                                            </span>
                                        </td>
                                        <td className="whitespace-nowrap px-4 py-3 text-right font-medium">{formatCurrency(lead.value || 0)}</td>
                                        <td className="whitespace-nowrap px-4 py-3 text-center">
                                            <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${statusStyles[lead.status] || 'bg-gray-100 text-gray-700'}`}>
                                                {statusLabels[lead.status] || lead.status}
                                            </span>
                                        </td>
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
