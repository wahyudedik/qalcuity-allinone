'use client'

import { useState } from 'react'
import { formatCurrency } from '@/lib/utils'

type Account = {
    id: string
    code: string
    name: string
    type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense'
    subtype: string
    balance: number
    isActive: boolean
}

const MOCK_ACCOUNTS: Account[] = [
    // Assets
    { id: '1', code: '1101', name: 'Kas', type: 'asset', subtype: 'Kas & Setara Kas', balance: 45000000, isActive: true },
    { id: '2', code: '1102', name: 'Bank BCA', type: 'asset', subtype: 'Kas & Setara Kas', balance: 125000000, isActive: true },
    { id: '3', code: '1103', name: 'Bank Mandiri', type: 'asset', subtype: 'Kas & Setara Kas', balance: 78500000, isActive: true },
    { id: '4', code: '1201', name: 'Piutang Dagang', type: 'asset', subtype: 'Piutang', balance: 85000000, isActive: true },
    { id: '5', code: '1202', name: 'Piutang Pajak', type: 'asset', subtype: 'Piutang', balance: 12000000, isActive: true },
    { id: '6', code: '1301', name: 'Persediaan Barang', type: 'asset', subtype: 'Persediaan', balance: 250000000, isActive: true },
    { id: '7', code: '1401', name: 'Peralatan Kantor', type: 'asset', subtype: 'Aset Tetap', balance: 85000000, isActive: true },
    { id: '8', code: '1402', name: 'Kendaraan', type: 'asset', subtype: 'Aset Tetap', balance: 350000000, isActive: true },
    { id: '9', code: '1403', name: 'Akumulasi Depresiasi', type: 'asset', subtype: 'Aset Tetap', balance: -125000000, isActive: true },
    // Liabilities
    { id: '10', code: '2101', name: 'Hutang Dagang', type: 'liability', subtype: 'Hutang Lancar', balance: 65000000, isActive: true },
    { id: '11', code: '2102', name: 'Hutang Pajak', type: 'liability', subtype: 'Hutang Lancar', balance: 8500000, isActive: true },
    { id: '12', code: '2103', name: 'Hutang Gaji', type: 'liability', subtype: 'Hutang Lancar', balance: 22000000, isActive: true },
    { id: '13', code: '2201', name: 'Hutang Bank (Kredit)', type: 'liability', subtype: 'Hutang Jangka Panjang', balance: 500000000, isActive: true },
    // Equity
    { id: '14', code: '3101', name: 'Modal Disetor', type: 'equity', subtype: 'Modal', balance: 500000000, isActive: true },
    { id: '15', code: '3201', name: 'Laba Ditahan', type: 'equity', subtype: 'Laba', balance: 180000000, isActive: true },
    { id: '16', code: '3301', name: 'Laba Berjalan', type: 'equity', subtype: 'Laba', balance: 45000000, isActive: true },
    // Revenue
    { id: '17', code: '4101', name: 'Penjualan Barang', type: 'revenue', subtype: 'Penjualan', balance: 450000000, isActive: true },
    { id: '18', code: '4102', name: 'Pendapatan Jasa', type: 'revenue', subtype: 'Penjualan', balance: 125000000, isActive: true },
    { id: '19', code: '4201', name: 'Pendapatan Bunga', type: 'revenue', subtype: 'Pendapatan Lain', balance: 2500000, isActive: true },
    // Expenses
    { id: '20', code: '5101', name: 'Harga Pokok Penjualan', type: 'expense', subtype: 'Beban Pokok', balance: 280000000, isActive: true },
    { id: '21', code: '5201', name: 'Gaji & Tunjangan', type: 'expense', subtype: 'Beban Operasional', balance: 95000000, isActive: true },
    { id: '22', code: '5202', name: 'Sewa Kantor', type: 'expense', subtype: 'Beban Operasional', balance: 36000000, isActive: true },
    { id: '23', code: '5203', name: 'Listrik & Internet', type: 'expense', subtype: 'Beban Operasional', balance: 8500000, isActive: true },
    { id: '24', code: '5301', name: 'Biaya Marketing', type: 'expense', subtype: 'Beban Pemasaran', balance: 15000000, isActive: true },
    { id: '25', code: '5401', name: 'Biaya Depresiasi', type: 'expense', subtype: 'Beban Lain', balance: 12500000, isActive: true },
    { id: '26', code: '5402', name: 'Biaya Bunga', type: 'expense', subtype: 'Beban Lain', balance: 5000000, isActive: true },
    { id: '27', code: '5403', name: 'Biaya Admin Bank', type: 'expense', subtype: 'Beban Lain', balance: 1200000, isActive: true },
]

const typeLabels: Record<string, string> = {
    asset: 'Aset',
    liability: 'Kewajiban',
    equity: 'Ekuitas',
    revenue: 'Pendapatan',
    expense: 'Beban',
}

const typeColors: Record<string, string> = {
    asset: 'bg-blue-100 text-blue-800',
    liability: 'bg-red-100 text-red-800',
    equity: 'bg-purple-100 text-purple-800',
    revenue: 'bg-green-100 text-green-800',
    expense: 'bg-orange-100 text-orange-800',
}

export default function ChartOfAccountsPage() {
    const [accounts] = useState<Account[]>(MOCK_ACCOUNTS)
    const [filterType, setFilterType] = useState<string>('all')
    const [searchQuery, setSearchQuery] = useState('')
    const [showAddModal, setShowAddModal] = useState(false)

    const filteredAccounts = accounts.filter((a) => {
        const matchType = filterType === 'all' || a.type === filterType
        const matchSearch = searchQuery === '' || a.code.includes(searchQuery) || a.name.toLowerCase().includes(searchQuery.toLowerCase())
        return matchType && matchSearch
    })

    // Group accounts by type
    const groupedAccounts = filteredAccounts.reduce<Record<string, Account[]>>((acc, account) => {
        if (!acc[account.type]) acc[account.type] = []
        acc[account.type].push(account)
        return acc
    }, {})

    const totalAssets = accounts.filter((a) => a.type === 'asset').reduce((sum, a) => sum + a.balance, 0)
    const totalLiabilities = accounts.filter((a) => a.type === 'liability').reduce((sum, a) => sum + a.balance, 0)
    const totalEquity = accounts.filter((a) => a.type === 'equity').reduce((sum, a) => sum + a.balance, 0)
    const totalRevenue = accounts.filter((a) => a.type === 'revenue').reduce((sum, a) => sum + a.balance, 0)
    const totalExpense = accounts.filter((a) => a.type === 'expense').reduce((sum, a) => sum + a.balance, 0)

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Chart of Accounts</h1>
                    <p className="text-gray-500">Daftar akun keuangan perusahaan</p>
                </div>
                <div className="flex gap-2">
                    <button className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
                        📥 Import
                    </button>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
                    >
                        ＋ Tambah Akun
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                    <p className="text-sm text-gray-500">Total Aset</p>
                    <p className="mt-1 text-lg font-bold text-blue-600">{formatCurrency(totalAssets)}</p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                    <p className="text-sm text-gray-500">Total Kewajiban</p>
                    <p className="mt-1 text-lg font-bold text-red-600">{formatCurrency(totalLiabilities)}</p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                    <p className="text-sm text-gray-500">Total Ekuitas</p>
                    <p className="mt-1 text-lg font-bold text-purple-600">{formatCurrency(totalEquity)}</p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                    <p className="text-sm text-gray-500">Total Pendapatan</p>
                    <p className="mt-1 text-lg font-bold text-green-600">{formatCurrency(totalRevenue)}</p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                    <p className="text-sm text-gray-500">Total Beban</p>
                    <p className="mt-1 text-lg font-bold text-orange-600">{formatCurrency(totalExpense)}</p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-4 sm:flex-row sm:items-center">
                <div className="flex-1">
                    <input
                        type="text"
                        placeholder="Cari berdasarkan kode atau nama akun..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                </div>
                <div className="flex gap-2">
                    {['all', 'asset', 'liability', 'equity', 'revenue', 'expense'].map((type) => (
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
            </div>

            {/* Accounts Table - Grouped */}
            <div className="space-y-4">
                {Object.entries(groupedAccounts).map(([type, typeAccounts]) => (
                    <div key={type} className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                        <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-4 py-3">
                            <div className="flex items-center gap-2">
                                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${typeColors[type]}`}>
                                    {typeLabels[type]}
                                </span>
                                <span className="text-sm text-gray-500">({typeAccounts.length} akun)</span>
                            </div>
                            <span className="text-sm font-semibold text-gray-700">
                                Total: {formatCurrency(typeAccounts.reduce((sum, a) => sum + a.balance, 0))}
                            </span>
                        </div>
                        <table className="w-full text-left text-sm">
                            <thead>
                                <tr className="border-b border-gray-100">
                                    <th className="px-4 py-2.5 font-medium text-gray-500">Kode</th>
                                    <th className="px-4 py-2.5 font-medium text-gray-500">Nama Akun</th>
                                    <th className="px-4 py-2.5 font-medium text-gray-500">Sub-jenis</th>
                                    <th className="px-4 py-2.5 text-right font-medium text-gray-500">Saldo</th>
                                    <th className="px-4 py-2.5 font-medium text-gray-500">Status</th>
                                    <th className="px-4 py-2.5 font-medium text-gray-500">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {typeAccounts.map((account) => (
                                    <tr key={account.id} className="hover:bg-gray-50">
                                        <td className="whitespace-nowrap px-4 py-3 font-mono text-sm font-semibold text-gray-900">{account.code}</td>
                                        <td className="px-4 py-3 font-medium text-gray-900">{account.name}</td>
                                        <td className="px-4 py-3 text-gray-500">{account.subtype}</td>
                                        <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-gray-900">{formatCurrency(account.balance)}</td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${account.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'}`}>
                                                {account.isActive ? 'Aktif' : 'Nonaktif'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <button className="text-sm text-blue-600 hover:underline">Edit</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ))}
            </div>

            {/* Add Account Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
                        <h2 className="mb-4 text-lg font-bold text-gray-900">Tambah Akun Baru</h2>
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-gray-700">Kode Akun</label>
                                    <input type="text" placeholder="Contoh: 1104" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
                                </div>
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-gray-700">Jenis Akun</label>
                                    <select className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none">
                                        <option value="asset">Aset</option>
                                        <option value="liability">Kewajiban</option>
                                        <option value="equity">Ekuitas</option>
                                        <option value="revenue">Pendapatan</option>
                                        <option value="expense">Beban</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700">Nama Akun</label>
                                <input type="text" placeholder="Nama akun" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
                            </div>
                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700">Sub-jenis</label>
                                <input type="text" placeholder="Contoh: Kas & Setara Kas" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
                            </div>
                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700">Saldo Awal</label>
                                <input type="number" placeholder="0" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
                            </div>
                        </div>
                        <div className="mt-6 flex justify-end gap-2">
                            <button onClick={() => setShowAddModal(false)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                                Batal
                            </button>
                            <button onClick={() => setShowAddModal(false)} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
                                Simpan
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
