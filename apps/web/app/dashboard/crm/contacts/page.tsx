'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

type Contact = {
    id: string
    name: string
    company: string
    type: string
    email: string
    phone: string
    position: string
    address: string
    notes: string
    totalDeals: number
    totalValue: number
    lastContact: string
    createdAt: string
}

const typeStyles: Record<string, string> = {
    customer: 'bg-green-100 text-green-800',
    supplier: 'bg-blue-100 text-blue-800',
    partner: 'bg-purple-100 text-purple-800',
    lead: 'bg-yellow-100 text-yellow-800',
}

const typeLabels: Record<string, string> = {
    customer: 'Customer',
    supplier: 'Supplier',
    partner: 'Partner',
    lead: 'Lead',
}

export default function ContactsPage() {
    const [contacts, setContacts] = useState<Contact[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [filterType, setFilterType] = useState<string>('all')
    const [searchQuery, setSearchQuery] = useState('')
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

    useEffect(() => {
        fetchContacts()
    }, [])

    const fetchContacts = async () => {
        try {
            setLoading(true)
            const response = await fetch('/api/crm/contacts')
            const data = await response.json()
            if (data.success) {
                setContacts(data.data)
            } else {
                setError('Gagal memuat data kontak')
            }
        } catch {
            setError('Terjadi kesalahan saat memuat data')
        } finally {
            setLoading(false)
        }
    }

    const filtered = contacts.filter((c) => {
        const matchType = filterType === 'all' || c.type === filterType
        const matchSearch = searchQuery === '' ||
            c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.company.toLowerCase().includes(searchQuery.toLowerCase())
        return matchType && matchSearch
    })

    const stats = {
        total: contacts.length,
        customers: contacts.filter((c) => c.type === 'customer').length,
        suppliers: contacts.filter((c) => c.type === 'supplier').length,
        partners: contacts.filter((c) => c.type === 'partner').length,
        leads: contacts.filter((c) => c.type === 'lead').length,
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
                        onClick={fetchContacts}
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
                    <h1 className="text-2xl font-bold text-gray-900">Kontak</h1>
                    <p className="text-gray-500">{stats.total} kontak terdaftar</p>
                </div>
                <div className="flex gap-2">
                    <button className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
                        📥 Import
                    </button>
                    <button className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700">
                        ＋ Kontak Baru
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                    <p className="text-sm text-gray-500">Total</p>
                    <p className="mt-1 text-2xl font-bold text-gray-900">{stats.total}</p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                    <p className="text-sm text-gray-500">Customer</p>
                    <p className="mt-1 text-2xl font-bold text-green-600">{stats.customers}</p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                    <p className="text-sm text-gray-500">Supplier</p>
                    <p className="mt-1 text-2xl font-bold text-blue-600">{stats.suppliers}</p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                    <p className="text-sm text-gray-500">Partner</p>
                    <p className="mt-1 text-2xl font-bold text-purple-600">{stats.partners}</p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                    <p className="text-sm text-gray-500">Lead</p>
                    <p className="mt-1 text-2xl font-bold text-yellow-600">{stats.leads}</p>
                </div>
            </div>

            {/* Filters & View Toggle */}
            <div className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-4 sm:flex-row sm:items-center">
                <div className="flex-1">
                    <input
                        type="text"
                        placeholder="Cari kontak..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                </div>
                <div className="flex gap-2">
                    {['all', 'customer', 'supplier', 'partner', 'lead'].map((type) => (
                        <button
                            key={type}
                            onClick={() => setFilterType(type)}
                            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${filterType === type
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                        >
                            {type === 'all' ? 'Semua' : typeLabels[type] || type}
                        </button>
                    ))}
                </div>
                <div className="flex gap-1 rounded-lg border border-gray-200 p-1">
                    <button
                        onClick={() => setViewMode('grid')}
                        className={`rounded px-2 py-1 text-xs ${viewMode === 'grid' ? 'bg-gray-100' : ''}`}
                    >
                        ⊞
                    </button>
                    <button
                        onClick={() => setViewMode('list')}
                        className={`rounded px-2 py-1 text-xs ${viewMode === 'list' ? 'bg-gray-100' : ''}`}
                    >
                        ☰
                    </button>
                </div>
            </div>

            {/* Grid View */}
            {viewMode === 'grid' && (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {filtered.map((contact) => (
                        <Link
                            key={contact.id}
                            href={`/dashboard/crm/contacts/${contact.id}`}
                            className="rounded-xl border border-gray-200 bg-white p-4 transition-shadow hover:shadow-md"
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-600">
                                        {contact.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                    </div>
                                    <div>
                                        <p className="font-medium text-gray-900">{contact.name}</p>
                                        <p className="text-sm text-gray-500">{contact.company}</p>
                                    </div>
                                </div>
                                <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${typeStyles[contact.type] || 'bg-gray-100 text-gray-700'}`}>
                                    {typeLabels[contact.type] || contact.type}
                                </span>
                            </div>
                            <div className="mt-4 space-y-2 text-sm text-gray-600">
                                <p>📧 {contact.email}</p>
                                <p>📱 {contact.phone}</p>
                                <p>💼 {contact.position}</p>
                            </div>
                            {contact.totalDeals > 0 && (
                                <div className="mt-4 border-t border-gray-100 pt-3">
                                    <p className="text-xs text-gray-500">{contact.totalDeals} deal aktif</p>
                                </div>
                            )}
                        </Link>
                    ))}
                </div>
            )}

            {/* List View */}
            {viewMode === 'list' && (
                <div className="rounded-xl border border-gray-200 bg-white">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead>
                                <tr className="border-b border-gray-200 bg-gray-50">
                                    <th className="px-4 py-3 font-medium text-gray-500">Nama</th>
                                    <th className="px-4 py-3 font-medium text-gray-500">Perusahaan</th>
                                    <th className="px-4 py-3 font-medium text-gray-500">Email</th>
                                    <th className="px-4 py-3 font-medium text-gray-500">Telepon</th>
                                    <th className="px-4 py-3 font-medium text-gray-500">Tipe</th>
                                    <th className="px-4 py-3 font-medium text-gray-500">Posisi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filtered.map((contact) => (
                                    <tr key={contact.id} className="cursor-pointer hover:bg-gray-50">
                                        <td className="whitespace-nowrap px-4 py-3">
                                            <Link href={`/dashboard/crm/contacts/${contact.id}`} className="font-medium text-blue-600 hover:underline">
                                                {contact.name}
                                            </Link>
                                        </td>
                                        <td className="px-4 py-3">{contact.company}</td>
                                        <td className="whitespace-nowrap px-4 py-3 text-gray-500">{contact.email}</td>
                                        <td className="whitespace-nowrap px-4 py-3 text-gray-500">{contact.phone}</td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${typeStyles[contact.type] || 'bg-gray-100 text-gray-700'}`}>
                                                {typeLabels[contact.type] || contact.type}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-gray-500">{contact.position}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    )
}
