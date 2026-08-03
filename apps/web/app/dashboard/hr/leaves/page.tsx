'use client'

import { useState } from 'react'

interface LeaveRequest {
    id: string
    employeeName: string
    type: 'annual' | 'sick' | 'personal' | 'maternity' | 'unpaid'
    startDate: string
    endDate: string
    days: number
    reason: string
    status: 'pending' | 'approved' | 'rejected'
    appliedDate: string
    approvedBy?: string
}

const leaveRequests: LeaveRequest[] = [
    {
        id: 'LV-001',
        employeeName: 'Budi Santoso',
        type: 'annual',
        startDate: '2026-08-03',
        endDate: '2026-08-07',
        days: 5,
        reason: 'Liburan keluarga ke Bali',
        status: 'approved',
        appliedDate: '2026-07-25',
        approvedBy: 'Dewi Lestari',
    },
    {
        id: 'LV-002',
        employeeName: 'Ahmad Rizky',
        type: 'sick',
        startDate: '2026-08-04',
        endDate: '2026-08-04',
        days: 1,
        reason: 'Sakit demam',
        status: 'pending',
        appliedDate: '2026-08-03',
    },
    {
        id: 'LV-003',
        employeeName: 'Hana Permata',
        type: 'personal',
        startDate: '2026-08-10',
        endDate: '2026-08-11',
        days: 2,
        reason: 'Urusan keluarga',
        status: 'pending',
        appliedDate: '2026-08-02',
    },
    {
        id: 'LV-004',
        employeeName: 'Fitri Handayani',
        type: 'annual',
        startDate: '2026-07-28',
        endDate: '2026-07-30',
        days: 3,
        reason: 'Wedding anniversary',
        status: 'approved',
        appliedDate: '2026-07-20',
        approvedBy: 'Siti Nurhaliza',
    },
    {
        id: 'LV-005',
        employeeName: 'Eko Prasetyo',
        type: 'unpaid',
        startDate: '2026-08-15',
        endDate: '2026-08-16',
        days: 2,
        reason: 'Keperluan pribadi',
        status: 'rejected',
        appliedDate: '2026-08-01',
        approvedBy: 'Dewi Lestari',
    },
]

const leaveTypes = {
    annual: { label: 'Cuti Tahunan', color: 'bg-blue-100 text-blue-700', icon: '🏖️' },
    sick: { label: 'Sakit', color: 'bg-red-100 text-red-700', icon: '🤒' },
    personal: { label: 'Cuti Pribadi', color: 'bg-purple-100 text-purple-700', icon: '🏠' },
    maternity: { label: 'Cuti Melahirkan', color: 'bg-pink-100 text-pink-700', icon: '👶' },
    unpaid: { label: 'Cuti Tanpa Gaji', color: 'bg-gray-100 text-gray-700', icon: '💰' },
}

const statusConfig = {
    pending: { label: 'Menunggu', color: 'bg-yellow-100 text-yellow-700' },
    approved: { label: 'Disetujui', color: 'bg-green-100 text-green-700' },
    rejected: { label: 'Ditolak', color: 'bg-red-100 text-red-700' },
}

export default function LeavesPage() {
    const [activeTab, setActiveTab] = useState<'requests' | 'balance' | 'calendar'>('requests')
    const [filterStatus, setFilterStatus] = useState('all')
    const [filterType, setFilterType] = useState('all')
    const [searchQuery, setSearchQuery] = useState('')

    const filteredRequests = leaveRequests.filter(req => {
        const matchesSearch = req.employeeName.toLowerCase().includes(searchQuery.toLowerCase())
        const matchesStatus = filterStatus === 'all' || req.status === filterStatus
        const matchesType = filterType === 'all' || req.type === filterType
        return matchesSearch && matchesStatus && matchesType
    })

    const pendingCount = leaveRequests.filter(r => r.status === 'pending').length
    const approvedCount = leaveRequests.filter(r => r.status === 'approved').length
    const rejectedCount = leaveRequests.filter(r => r.status === 'rejected').length

    const leaveBalance = [
        { type: 'annual', total: 12, used: 5, remaining: 7 },
        { type: 'sick', total: 12, used: 2, remaining: 10 },
        { type: 'personal', total: 3, used: 1, remaining: 2 },
    ]

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Cuti</h1>
                    <p className="text-gray-500">Kelola permohonan dan jatah cuti karyawan</p>
                </div>
                <button className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700">
                    <span>＋</span>
                    Ajukan Cuti
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                    <div className="text-2xl font-bold text-gray-900">{leaveRequests.length}</div>
                    <div className="text-sm text-gray-500">Total Permohonan</div>
                </div>
                <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4">
                    <div className="text-2xl font-bold text-yellow-600">{pendingCount}</div>
                    <div className="text-sm text-yellow-600">Menunggu Persetujuan</div>
                </div>
                <div className="rounded-xl border border-green-200 bg-green-50 p-4">
                    <div className="text-2xl font-bold text-green-600">{approvedCount}</div>
                    <div className="text-sm text-green-600">Disetujui</div>
                </div>
                <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                    <div className="text-2xl font-bold text-red-600">{rejectedCount}</div>
                    <div className="text-sm text-red-600">Ditolak</div>
                </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-1">
                    <button
                        onClick={() => setActiveTab('requests')}
                        className={`whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium ${activeTab === 'requests' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        📋 Permohonan Cuti
                    </button>
                    <button
                        onClick={() => setActiveTab('balance')}
                        className={`whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium ${activeTab === 'balance' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        📊 Saldo Cuti
                    </button>
                    <button
                        onClick={() => setActiveTab('calendar')}
                        className={`whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium ${activeTab === 'calendar' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        📅 Kalender Cuti
                    </button>
                </nav>
            </div>

            {/* Requests Tab */}
            {activeTab === 'requests' && (
                <>
                    {/* Filters */}
                    <div className="flex flex-col gap-4 md:flex-row md:items-center">
                        <div className="relative flex-1">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
                            <input
                                type="text"
                                placeholder="Cari nama karyawan..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                        </div>
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
                        >
                            <option value="all">Semua Status</option>
                            <option value="pending">Menunggu</option>
                            <option value="approved">Disetujui</option>
                            <option value="rejected">Ditolak</option>
                        </select>
                        <select
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value)}
                            className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
                        >
                            <option value="all">Semua Tipe</option>
                            <option value="annual">Cuti Tahunan</option>
                            <option value="sick">Sakit</option>
                            <option value="personal">Cuti Pribadi</option>
                            <option value="maternity">Cuti Melahirkan</option>
                            <option value="unpaid">Cuti Tanpa Gaji</option>
                        </select>
                    </div>

                    {/* Leave Requests List */}
                    <div className="space-y-4">
                        {filteredRequests.map((request) => (
                            <div key={request.id} className="rounded-xl border border-gray-200 bg-white p-5 hover:shadow-md transition-shadow">
                                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3">
                                            <span className="text-2xl">{leaveTypes[request.type].icon}</span>
                                            <div>
                                                <h3 className="font-semibold text-gray-900">{request.employeeName}</h3>
                                                <p className="text-sm text-gray-500">{request.id} • Diajukan {new Date(request.appliedDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                                            </div>
                                        </div>
                                        <div className="mt-3 ml-11">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${leaveTypes[request.type].color}`}>
                                                    {leaveTypes[request.type].label}
                                                </span>
                                                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusConfig[request.status].color}`}>
                                                    {statusConfig[request.status].label}
                                                </span>
                                            </div>
                                            <div className="mt-2 flex items-center gap-4 text-sm text-gray-600">
                                                <span>📅 {new Date(request.startDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} - {new Date(request.endDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                                <span>⏱️ {request.days} hari</span>
                                            </div>
                                            <p className="mt-2 text-sm text-gray-500">💬 {request.reason}</p>
                                            {request.approvedBy && (
                                                <p className="mt-1 text-xs text-gray-400">Oleh: {request.approvedBy}</p>
                                            )}
                                        </div>
                                    </div>
                                    {request.status === 'pending' && (
                                        <div className="flex gap-2 md:flex-col">
                                            <button className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700">
                                                ✓ Setujui
                                            </button>
                                            <button className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50">
                                                ✕ Tolak
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    {filteredRequests.length === 0 && (
                        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
                            <span className="text-4xl">🏖️</span>
                            <h3 className="mt-4 text-lg font-medium text-gray-900">Tidak ada permohonan cuti</h3>
                            <p className="mt-2 text-gray-500">Belum ada permohonan cuti yang sesuai dengan filter</p>
                        </div>
                    )}
                </>
            )}

            {/* Balance Tab */}
            {activeTab === 'balance' && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                        {leaveBalance.map((balance) => {
                            const config = leaveTypes[balance.type as keyof typeof leaveTypes]
                            const percentage = Math.round((balance.used / balance.total) * 100)
                            return (
                                <div key={balance.type} className="rounded-xl border border-gray-200 bg-white p-6">
                                    <div className="flex items-center gap-3 mb-4">
                                        <span className="text-3xl">{config.icon}</span>
                                        <div>
                                            <h3 className="font-semibold text-gray-900">{config.label}</h3>
                                            <p className="text-sm text-gray-500">Tahun 2026</p>
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-500">Terpakai</span>
                                            <span className="font-medium text-gray-900">{balance.used} dari {balance.total} hari</span>
                                        </div>
                                        <div className="h-2 w-full rounded-full bg-gray-100">
                                            <div
                                                className="h-2 rounded-full bg-blue-600"
                                                style={{ width: `${percentage}%` }}
                                            />
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-500">Sisa</span>
                                            <span className="font-bold text-green-600">{balance.remaining} hari</span>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>

                    {/* Summary */}
                    <div className="rounded-xl border border-gray-200 bg-white p-6">
                        <h3 className="mb-4 text-lg font-semibold text-gray-900">📋 Ringkasan Saldo Semua Karyawan</h3>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="border-b border-gray-200">
                                    <tr>
                                        <th className="pb-3 text-left text-xs font-medium text-gray-500 uppercase">Karyawan</th>
                                        <th className="pb-3 text-center text-xs font-medium text-gray-500 uppercase">Cuti Tahunan</th>
                                        <th className="pb-3 text-center text-xs font-medium text-gray-500 uppercase">Sakit</th>
                                        <th className="pb-3 text-center text-xs font-medium text-gray-500 uppercase">Pribadi</th>
                                        <th className="pb-3 text-center text-xs font-medium text-gray-500 uppercase">Total Sisa</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {['Ahmad Rizky', 'Siti Nurhaliza', 'Budi Santoso', 'Dewi Lestari', 'Eko Prasetyo', 'Fitri Handayani', 'Hana Permata'].map((name, idx) => (
                                        <tr key={name} className="hover:bg-gray-50">
                                            <td className="py-3 font-medium text-gray-900">{name}</td>
                                            <td className="py-3 text-center text-sm">
                                                <span className="text-green-600">{7 - idx}</span> / 12
                                            </td>
                                            <td className="py-3 text-center text-sm">
                                                <span className="text-green-600">{10 - idx}</span> / 12
                                            </td>
                                            <td className="py-3 text-center text-sm">
                                                <span className="text-green-600">{2 - (idx % 2)}</span> / 3
                                            </td>
                                            <td className="py-3 text-center">
                                                <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-700">
                                                    {19 - idx * 2} hari
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Calendar Tab */}
            {activeTab === 'calendar' && (
                <div className="rounded-xl border border-gray-200 bg-white p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-semibold text-gray-900">📅 Agustus 2026</h3>
                        <div className="flex gap-2">
                            <button className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50">← Prev</button>
                            <button className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50">Next →</button>
                        </div>
                    </div>

                    <div className="grid grid-cols-7 gap-1 text-center text-xs">
                        {/* Day headers */}
                        {['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'].map(day => (
                            <div key={day} className="py-2 font-medium text-gray-500">{day}</div>
                        ))}

                        {/* Calendar days */}
                        {Array.from({ length: 35 }, (_, i) => {
                            const day = i - 0 + 1 // August 2026 starts on Saturday
                            const isCurrentMonth = day >= 1 && day <= 31
                            const isToday = day === 3

                            // Sample leave days
                            const hasLeave = [3, 4, 5, 6, 7, 10, 11, 15, 16].includes(day)
                            const leaveNames = {
                                3: 'Budi',
                                4: 'Budi',
                                5: 'Budi',
                                6: 'Budi',
                                7: 'Budi',
                                10: 'Hana',
                                11: 'Hana',
                                15: 'Eko',
                                16: 'Eko',
                            }

                            return (
                                <div
                                    key={i}
                                    className={`min-h-[60px] rounded-lg border p-1 ${isCurrentMonth ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50'
                                        } ${isToday ? 'ring-2 ring-blue-500' : ''}`}
                                >
                                    <div className={`text-right p-1 ${isCurrentMonth ? 'text-gray-900' : 'text-gray-400'}`}>
                                        {isCurrentMonth ? day : ''}
                                    </div>
                                    {isCurrentMonth && hasLeave && (
                                        <div className="rounded bg-blue-100 px-1 py-0.5 text-[10px] text-blue-700 truncate">
                                            {leaveNames[day as keyof typeof leaveNames]}
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>

                    <div className="mt-6 flex items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                            <div className="h-3 w-3 rounded bg-blue-100 border border-blue-200" />
                            <span>Cuti</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="h-3 w-3 rounded ring-2 ring-blue-500" />
                            <span>Hari Ini</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
