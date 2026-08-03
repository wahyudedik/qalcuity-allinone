'use client'

import { useState } from 'react'

const auditLogs = [
    {
        id: 1,
        user: 'Budi Santoso',
        avatar: 'BS',
        action: 'create',
        module: 'Finance',
        description: 'Membuat invoice INV-2026-0092',
        details: 'PT Maju Bersama - Rp 15.500.000',
        timestamp: '2026-08-03T09:30:00',
        ip: '103.28.12.xxx',
    },
    {
        id: 2,
        user: 'Siti Rahayu',
        avatar: 'SR',
        action: 'update',
        module: 'Sales',
        description: 'Memperbarui deal DEAL-0045',
        details: 'Stage: Proposal → Negotiation',
        timestamp: '2026-08-03T09:15:00',
        ip: '36.95.xxx.xxx',
    },
    {
        id: 3,
        user: 'Andi Pratama',
        avatar: 'AP',
        action: 'create',
        module: 'Inventory',
        description: 'Menambah produk baru: Widget Pro',
        details: 'SKU: WDG-001, Harga: Rp 250.000',
        timestamp: '2026-08-03T08:45:00',
        ip: '114.124.xxx.xxx',
    },
    {
        id: 4,
        user: 'Budi Santoso',
        avatar: 'BS',
        action: 'delete',
        module: 'CRM',
        description: 'Menghapus lead: CV Mundur',
        details: 'Alasan: Tidak ada respon',
        timestamp: '2026-08-03T08:30:00',
        ip: '103.28.12.xxx',
    },
    {
        id: 5,
        user: 'Siti Rahayu',
        avatar: 'SR',
        action: 'payment',
        module: 'Finance',
        description: 'Mencatat pembayaran PAY-2026-0088',
        details: 'INV-2026-0085 - Rp 8.250.000',
        timestamp: '2026-08-03T08:00:00',
        ip: '36.95.xxx.xxx',
    },
    {
        id: 6,
        user: 'System',
        avatar: 'SY',
        action: 'system',
        module: 'System',
        description: 'Backup database otomatis',
        details: 'db-backup-2026-08-03-0700.sql.gz',
        timestamp: '2026-08-03T07:00:00',
        ip: 'System',
    },
    {
        id: 7,
        user: 'Andi Pratama',
        avatar: 'AP',
        action: 'update',
        module: 'Inventory',
        description: 'Update stok produk: Component B',
        details: 'Stok: 150 → 200 unit',
        timestamp: '2026-08-02T16:30:00',
        ip: '114.124.xxx.xxx',
    },
    {
        id: 8,
        user: 'Budi Santoso',
        avatar: 'BS',
        action: 'create',
        module: 'HR',
        description: 'Menambah karyawan baru: Dewi Lestari',
        details: 'Posisi: Marketing, Dept: Sales',
        timestamp: '2026-08-02T14:00:00',
        ip: '103.28.12.xxx',
    },
    {
        id: 9,
        user: 'Siti Rahayu',
        avatar: 'SR',
        action: 'export',
        module: 'Finance',
        description: 'Export laporan keuangan bulanan',
        details: 'Format: PDF, Periode: Juli 2026',
        timestamp: '2026-08-02T11:30:00',
        ip: '36.95.xxx.xxx',
    },
    {
        id: 10,
        user: 'System',
        avatar: 'SY',
        action: 'alert',
        module: 'System',
        description: 'Anomaly detection: Transaksi mencurigakan',
        details: 'INV-2026-0090 - Rp 50.000.000 (New vendor)',
        timestamp: '2026-08-02T10:15:00',
        ip: 'System',
    },
]

const actionColors: Record<string, { bg: string; text: string; icon: string }> = {
    create: { bg: 'bg-green-100', text: 'text-green-700', icon: '+' },
    update: { bg: 'bg-blue-100', text: 'text-blue-700', icon: '↻' },
    delete: { bg: 'bg-red-100', text: 'text-red-700', icon: '×' },
    payment: { bg: 'bg-purple-100', text: 'text-purple-700', icon: 'Rp' },
    export: { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: '↓' },
    system: { bg: 'bg-gray-100', text: 'text-gray-700', icon: '⚙' },
    alert: { bg: 'bg-orange-100', text: 'text-orange-700', icon: '!' },
}

const modules = ['Semua', 'Finance', 'Sales', 'Inventory', 'HR', 'CRM', 'System']
const actions = ['Semua', 'create', 'update', 'delete', 'payment', 'export', 'system', 'alert']

export default function AuditPage() {
    const [selectedModule, setSelectedModule] = useState('Semua')
    const [selectedAction, setSelectedAction] = useState('Semua')
    const [dateRange, setDateRange] = useState('today')
    const [search, setSearch] = useState('')

    const filteredLogs = auditLogs.filter(log => {
        const matchesModule = selectedModule === 'Semua' || log.module === selectedModule
        const matchesAction = selectedAction === 'Semua' || log.action === selectedAction
        const matchesSearch = search === '' ||
            log.description.toLowerCase().includes(search.toLowerCase()) ||
            log.user.toLowerCase().includes(search.toLowerCase())
        return matchesModule && matchesAction && matchesSearch
    })

    const formatTimestamp = (timestamp: string) => {
        const date = new Date(timestamp)
        const now = new Date()
        const diff = now.getTime() - date.getTime()
        const hours = Math.floor(diff / (1000 * 60 * 60))

        if (hours < 1) return 'Baru saja'
        if (hours < 24) return `${hours} jam lalu`

        const days = Math.floor(hours / 24)
        if (days === 1) return 'Kemarin'
        return `${days} hari lalu`
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Audit Trail</h1>
                    <p className="text-gray-600 mt-1">Riwayat aktivitas dan perubahan sistem</p>
                </div>
                <button className="px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Export Log
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="text-sm text-gray-600">Total Aktivitas</div>
                    <div className="text-2xl font-bold text-gray-900 mt-1">{auditLogs.length}</div>
                    <div className="text-xs text-green-600 mt-1">Hari ini</div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="text-sm text-gray-600">Pembuatan</div>
                    <div className="text-2xl font-bold text-green-600 mt-1">
                        {auditLogs.filter(l => l.action === 'create').length}
                    </div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="text-sm text-gray-600">Pembaruan</div>
                    <div className="text-2xl font-bold text-blue-600 mt-1">
                        {auditLogs.filter(l => l.action === 'update').length}
                    </div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="text-sm text-gray-600">Peringatan</div>
                    <div className="text-2xl font-bold text-orange-600 mt-1">
                        {auditLogs.filter(l => l.action === 'alert').length}
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="relative flex-1">
                        <svg
                            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                            type="text"
                            placeholder="Cari aktivitas..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                        />
                    </div>
                    <select
                        value={selectedModule}
                        onChange={(e) => setSelectedModule(e.target.value)}
                        className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white"
                    >
                        {modules.map(m => (
                            <option key={m} value={m}>Modul: {m}</option>
                        ))}
                    </select>
                    <select
                        value={selectedAction}
                        onChange={(e) => setSelectedAction(e.target.value)}
                        className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white"
                    >
                        {actions.map(a => (
                            <option key={a} value={a}>Aksi: {a === 'Semua' ? 'Semua' : a}</option>
                        ))}
                    </select>
                    <div className="flex gap-2">
                        {[
                            { value: 'today', label: 'Hari Ini' },
                            { value: 'week', label: 'Minggu Ini' },
                            { value: 'month', label: 'Bulan Ini' },
                        ].map(({ value, label }) => (
                            <button
                                key={value}
                                onClick={() => setDateRange(value)}
                                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${dateRange === value
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Audit Log List */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="divide-y divide-gray-100">
                    {filteredLogs.map((log) => {
                        const colorConfig = actionColors[log.action] || actionColors.system
                        return (
                            <div key={log.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                                <div className="flex items-start gap-4">
                                    {/* Avatar */}
                                    <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center text-sm font-medium text-gray-600 flex-shrink-0">
                                        {log.avatar}
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium text-gray-900">{log.user}</span>
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colorConfig.bg} ${colorConfig.text}`}>
                                                {log.action}
                                            </span>
                                            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                                                {log.module}
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-700 mt-1">{log.description}</p>
                                        <p className="text-xs text-gray-500 mt-1">{log.details}</p>
                                    </div>

                                    {/* Timestamp */}
                                    <div className="text-right flex-shrink-0">
                                        <div className="text-sm text-gray-500">{formatTimestamp(log.timestamp)}</div>
                                        <div className="text-xs text-gray-400 mt-0.5">IP: {log.ip}</div>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>

                {/* Pagination */}
                <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                    <div className="text-sm text-gray-500">
                        Menampilkan {filteredLogs.length} dari {auditLogs.length} aktivitas
                    </div>
                    <div className="flex gap-2">
                        <button className="px-3 py-1.5 border border-gray-300 rounded text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50" disabled>
                            Sebelumnya
                        </button>
                        <button className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm font-medium">
                            1
                        </button>
                        <button className="px-3 py-1.5 border border-gray-300 rounded text-sm text-gray-700 hover:bg-gray-50">
                            2
                        </button>
                        <button className="px-3 py-1.5 border border-gray-300 rounded text-sm text-gray-700 hover:bg-gray-50">
                            3
                        </button>
                        <button className="px-3 py-1.5 border border-gray-300 rounded text-sm text-gray-700 hover:bg-gray-50">
                            Selanjutnya
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
