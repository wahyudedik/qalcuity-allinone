'use client'

import { useState } from 'react'

interface AttendanceRecord {
    id: string
    employeeName: string
    date: string
    clockIn: string | null
    clockOut: string | null
    status: 'present' | 'late' | 'absent' | 'leave' | 'wfH'
    workHours: number
}

const attendanceData: AttendanceRecord[] = [
    { id: '1', employeeName: 'Ahmad Rizky', date: '2026-08-03', clockIn: '08:55', clockOut: null, status: 'present', workHours: 0 },
    { id: '2', employeeName: 'Siti Nurhaliza', date: '2026-08-03', clockIn: '08:30', clockOut: null, status: 'present', workHours: 0 },
    { id: '3', employeeName: 'Budi Santoso', date: '2026-08-03', clockIn: null, clockOut: null, status: 'leave', workHours: 0 },
    { id: '4', employeeName: 'Dewi Lestari', date: '2026-08-03', clockIn: '09:15', clockOut: null, status: 'late', workHours: 0 },
    { id: '5', employeeName: 'Eko Prasetyo', date: '2026-08-03', clockIn: '08:00', clockOut: '17:00', status: 'present', workHours: 9 },
    { id: '6', employeeName: 'Fitri Handayani', date: '2026-08-03', clockIn: '07:55', clockOut: null, status: 'wfH', workHours: 0 },
    { id: '7', employeeName: 'Hana Permata', date: '2026-08-03', clockIn: null, clockOut: null, status: 'absent', workHours: 0 },
]

const historicalData: AttendanceRecord[] = [
    { id: 'h1', employeeName: 'Ahmad Rizky', date: '2026-08-02', clockIn: '08:58', clockOut: '17:05', status: 'present', workHours: 8.12 },
    { id: 'h2', employeeName: 'Siti Nurhaliza', date: '2026-08-02', clockIn: '08:25', clockOut: '17:30', status: 'present', workHours: 9.08 },
    { id: 'h3', employeeName: 'Budi Santoso', date: '2026-08-02', clockIn: '09:30', clockOut: '17:00', status: 'late', workHours: 7.5 },
    { id: 'h4', employeeName: 'Dewi Lestari', date: '2026-08-02', clockIn: '08:00', clockOut: '17:15', status: 'present', workHours: 9.25 },
    { id: 'h5', employeeName: 'Eko Prasetyo', date: '2026-08-02', clockIn: '08:05', clockOut: '18:00', status: 'present', workHours: 9.92 },
    { id: 'h6', employeeName: 'Fitri Handayani', date: '2026-08-02', clockIn: '08:00', clockOut: '17:00', status: 'present', workHours: 9 },
    { id: 'h7', employeeName: 'Hana Permata', date: '2026-08-02', clockIn: '08:45', clockOut: '17:10', status: 'present', workHours: 8.42 },
    { id: 'h8', employeeName: 'Ahmad Rizky', date: '2026-08-01', clockIn: '09:20', clockOut: '17:00', status: 'late', workHours: 7.67 },
    { id: 'h9', employeeName: 'Siti Nurhaliza', date: '2026-08-01', clockIn: '08:30', clockOut: '17:30', status: 'present', workHours: 9 },
    { id: 'h10', employeeName: 'Budi Santoso', date: '2026-08-01', clockIn: '08:00', clockOut: '17:00', status: 'present', workHours: 9 },
]

export default function AttendancePage() {
    const [activeTab, setActiveTab] = useState<'today' | 'history'>('today')
    const [selectedDate, setSelectedDate] = useState('2026-08-03')
    const [searchQuery, setSearchQuery] = useState('')

    const statusConfig = {
        present: { label: 'Hadir', color: 'bg-green-100 text-green-700', dot: 'bg-green-500' },
        late: { label: 'Terlambat', color: 'bg-yellow-100 text-yellow-700', dot: 'bg-yellow-500' },
        absent: { label: 'Tidak Hadir', color: 'bg-red-100 text-red-700', dot: 'bg-red-500' },
        leave: { label: 'Cuti', color: 'bg-blue-100 text-blue-700', dot: 'bg-blue-500' },
        'wfH': { label: 'WFH', color: 'bg-purple-100 text-purple-700', dot: 'bg-purple-500' },
    }

    const presentCount = attendanceData.filter(a => a.status === 'present' || a.status === 'wfH').length
    const lateCount = attendanceData.filter(a => a.status === 'late').length
    const absentCount = attendanceData.filter(a => a.status === 'absent').length
    const leaveCount = attendanceData.filter(a => a.status === 'leave').length

    const todayData = attendanceData.filter(a =>
        a.employeeName.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const historyData = historicalData.filter(a =>
        a.employeeName.toLowerCase().includes(searchQuery.toLowerCase())
    )

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Absensi</h1>
                    <p className="text-gray-500">Monitor kehadiran karyawan harian</p>
                </div>
                <div className="flex items-center gap-3">
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
                    />
                    <button className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700">
                        <span>⬇</span>
                        Export
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                    <div className="text-2xl font-bold text-gray-900">{attendanceData.length}</div>
                    <div className="text-sm text-gray-500">Total Karyawan</div>
                </div>
                <div className="rounded-xl border border-green-200 bg-green-50 p-4">
                    <div className="text-2xl font-bold text-green-600">{presentCount}</div>
                    <div className="text-sm text-green-600">Hadir / WFH</div>
                </div>
                <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4">
                    <div className="text-2xl font-bold text-yellow-600">{lateCount}</div>
                    <div className="text-sm text-yellow-600">Terlambat</div>
                </div>
                <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                    <div className="text-2xl font-bold text-red-600">{absentCount}</div>
                    <div className="text-sm text-red-600">Tidak Hadir</div>
                </div>
                <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                    <div className="text-2xl font-bold text-blue-600">{leaveCount}</div>
                    <div className="text-sm text-blue-600">Cuti</div>
                </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-1">
                    <button
                        onClick={() => setActiveTab('today')}
                        className={`whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium ${activeTab === 'today' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        📋 Hari Ini
                    </button>
                    <button
                        onClick={() => setActiveTab('history')}
                        className={`whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium ${activeTab === 'history' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        📅 Riwayat
                    </button>
                </nav>
            </div>

            {/* Search */}
            <div className="relative max-w-md">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
                <input
                    type="text"
                    placeholder="Cari nama karyawan..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
            </div>

            {/* Today's Attendance */}
            {activeTab === 'today' && (
                <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Karyawan</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Jam Masuk</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Jam Keluar</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Jam Kerja</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {todayData.map((record) => (
                                    <tr key={record.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-gray-900">{record.employeeName}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className={`h-2 w-2 rounded-full ${statusConfig[record.status].dot}`} />
                                                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusConfig[record.status].color}`}>
                                                    {statusConfig[record.status].label}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">
                                            {record.clockIn || '-'}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">
                                            {record.clockOut || '-'}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">
                                            {record.workHours > 0 ? `${record.workHours} jam` : '-'}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button className="text-sm text-blue-600 hover:text-blue-700">
                                                Detail
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* History */}
            {activeTab === 'history' && (
                <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tanggal</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Karyawan</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Jam Masuk</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Jam Keluar</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Jam Kerja</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {historyData.map((record) => (
                                    <tr key={record.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 text-sm text-gray-600">
                                            {new Date(record.date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                                        </td>
                                        <td className="px-6 py-4 font-medium text-gray-900">{record.employeeName}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className={`h-2 w-2 rounded-full ${statusConfig[record.status].dot}`} />
                                                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusConfig[record.status].color}`}>
                                                    {statusConfig[record.status].label}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">{record.clockIn || '-'}</td>
                                        <td className="px-6 py-4 text-sm text-gray-600">{record.clockOut || '-'}</td>
                                        <td className="px-6 py-4 text-sm text-gray-600">{record.workHours} jam</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Summary Card */}
            <div className="rounded-xl border border-gray-200 bg-white p-6">
                <h3 className="mb-4 text-lg font-semibold text-gray-900">📊 Ringkasan Kehadiran Minggu Ini</h3>
                <div className="grid grid-cols-5 gap-4">
                    <div className="text-center">
                        <div className="text-3xl font-bold text-green-600">92%</div>
                        <div className="text-sm text-gray-500">Tingkat Kehadiran</div>
                    </div>
                    <div className="text-center">
                        <div className="text-3xl font-bold text-yellow-600">8.5</div>
                        <div className="text-sm text-gray-500">Rata-rata Jam Kerja</div>
                    </div>
                    <div className="text-center">
                        <div className="text-3xl font-bold text-red-600">3</div>
                        <div className="text-sm text-gray-500">Total Keterlambatan</div>
                    </div>
                    <div className="text-center">
                        <div className="text-3xl font-bold text-blue-600">2</div>
                        <div className="text-sm text-gray-500">Total WFH</div>
                    </div>
                    <div className="text-center">
                        <div className="text-3xl font-bold text-purple-600">1</div>
                        <div className="text-sm text-gray-500">Total Cuti</div>
                    </div>
                </div>
            </div>
        </div>
    )
}
