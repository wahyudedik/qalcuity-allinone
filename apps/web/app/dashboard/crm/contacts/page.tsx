'use client'

import { useState } from 'react'

type Contact = {
    id: string
    name: string
    company: string
    role: string
    email: string
    phone: string
    type: 'customer' | 'supplier' | 'partner' | 'lead'
    lastActivity: string
}

const MOCK_CONTACTS: Contact[] = [
    { id: 'C-001', name: 'Budi Santoso', company: 'PT Maju Jaya', role: 'Direktur', email: 'budi@maju-jaya.co.id', phone: '081234567890', type: 'customer', lastActivity: '2 jam lalu' },
    { id: 'C-002', name: 'Siti Rahmawati', company: 'CV Berkah Mandiri', role: 'Finance Manager', email: 'siti@berkah.co.id', phone: '082345678901', type: 'customer', lastActivity: 'Kemarin' },
    { id: 'C-003', name: 'Ahmad Rizky', company: 'PT Teknologi Nusantara', role: 'CTO', email: 'ahmad@teknologi.co.id', phone: '083456789012', type: 'lead', lastActivity: '3 hari lalu' },
    { id: 'C-004', name: 'Dedi Kurniawan', company: 'PT Supplier ABC', role: 'Sales Manager', email: 'dedi@supplier-abc.co.id', phone: '084567890123', type: 'supplier', lastActivity: '2 hari lalu' },
    { id: 'C-005', name: 'Rina Sari', company: 'CV Abadi Sentosa', role: 'Operations Director', email: 'rina@abadi.co.id', phone: '085678901234', type: 'customer', lastActivity: '1 minggu lalu' },
    { id: 'C-006', name: 'Hendra Wijaya', company: 'PT Solusi Digital', role: 'CEO', email: 'hendra@solusidigital.co.id', phone: '086789012345', type: 'partner', lastActivity: '5 hari lalu' },
    { id: 'C-007', name: 'Maya Putri', company: 'CV Sejahtera Bersama', role: 'Purchasing', email: 'maya@sejahtera.co.id', phone: '087890123456', type: 'lead', lastActivity: '1 minggu lalu' },
    { id: 'C-008', name: 'Bambang Susilo', company: 'PT Global Tech', role: 'IT Manager', email: 'bambang@globaltech.co.id', phone: '088901234567', type: 'customer', lastActivity: '3 hari lalu' },
    { id: 'C-009', name: 'Diana Puspita', company: 'CV Karya Utama', role: 'Marketing Manager', email: 'diana@karyautama.co.id', phone: '089012345678', type: 'customer', lastActivity: '4 hari lalu' },
    { id: 'C-010', name: 'Eko Prasetyo', company: 'PT Material Jaya', role: 'Director', email: 'eko@material-jaya.co.id', phone: '080123456789', type: 'supplier', lastActivity: '2 minggu lalu' },
]

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
    const [contacts] = useState<Contact[]>(MOCK_CONTACTS)
    const [filterType, setFilterType] = useState<string>('all')
    const [searchQuery, setSearchQuery] = useState('')
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

    const filtered = contacts.filter((c) => {
        const matchType = filterType === 'all' || c.type === filterType
        const matchSearch = searchQuery === '' || c.name.toLowerCase().includes(searchQuery.toLowerCase()) || c.company.toLowerCase().includes(searchQuery.toLowerCase())
        return matchType && matchSearch
    })

    const stats = {
        total: contacts.length,
        customers: contacts.filter((c) => c.type === 'customer').length,
        suppliers: contacts.filter((c) => c.type === 'supplier').length,
        partners: contacts.filter((c) => c.type === 'partner').length,
        leads: contacts.filter((c) => c.type === 'lead').length,
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
                            className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${filterType === type ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                        >
                            {type === 'all' ? 'Semua' : typeLabels[type]}
                        </button>
                    ))}
                </div>
                <div className="flex rounded-lg border border-gray-300">
                    <button onClick={() => setViewMode('grid')} className={`px-3 py-1.5 text-sm ${viewMode === 'grid' ? 'bg-blue-600 text-white' : 'text-gray-700'}`}>Grid</button>
                    <button onClick={() => setViewMode('list')} className={`px-3 py-1.5 text-sm ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'text-gray-700'}`}>List</button>
                </div>
            </div>

            {/* Grid View */}
            {viewMode === 'grid' && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {filtered.map((contact) => (
                        <div key={contact.id} className="rounded-xl border border-gray-200 bg-white p-4 transition-shadow hover:shadow-md">
                            <div className="flex items-start gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-200 text-sm font-semibold text-gray-600">
                                    {contact.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-gray-900 truncate">{contact.name}</p>
                                    <p className="text-xs text-gray-500 truncate">{contact.company}</p>
                                </div>
                                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${typeStyles[contact.type]}`}>
                                    {typeLabels[contact.type]}
                                </span>
                            </div>
                            <div className="mt-3 space-y-1">
                                <p className="text-xs text-gray-500">{contact.role}</p>
                                <p className="text-xs text-gray-500 truncate">{contact.email}</p>
                                <p className="text-xs text-gray-500">{contact.phone}</p>
                            </div>
                            <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3">
                                <span className="text-xs text-gray-400">{contact.lastActivity}</span>
                                <button className="text-xs text-blue-600 hover:underline">Lihat →</button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* List View */}
            {viewMode === 'list' && (
                <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="border-b border-gray-200 bg-gray-50">
                                <th className="px-4 py-3 font-medium text-gray-600">Nama</th>
                                <th className="px-4 py-3 font-medium text-gray-600">Perusahaan</th>
                                <th className="px-4 py-3 font-medium text-gray-600">Jabatan</th>
                                <th className="px-4 py-3 font-medium text-gray-600">Kontak</th>
                                <th className="px-4 py-3 font-medium text-gray-600">Tipe</th>
                                <th className="px-4 py-3 font-medium text-gray-600">Terakhir Aktif</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filtered.map((contact) => (
                                <tr key={contact.id} className="cursor-pointer hover:bg-gray-50">
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-xs font-semibold text-gray-600">
                                                {contact.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                                            </div>
                                            <span className="font-medium text-gray-900">{contact.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-gray-700">{contact.company}</td>
                                    <td className="px-4 py-3 text-gray-500">{contact.role}</td>
                                    <td className="px-4 py-3">
                                        <p className="text-xs text-gray-600">{contact.email}</p>
                                        <p className="text-xs text-gray-500">{contact.phone}</p>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${typeStyles[contact.type]}`}>
                                            {typeLabels[contact.type]}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-gray-500">{contact.lastActivity}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}
