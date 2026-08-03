'use client'

import Link from 'next/link'

const summaryCards = [
    { title: 'Total Karyawan', value: '45', icon: '👥', color: 'text-blue-600', href: '/dashboard/hr/employees' },
    { title: 'Hadir Hari Ini', value: '38', icon: '✅', color: 'text-green-600', href: '/dashboard/hr/attendance' },
    { title: 'Cuti Hari Ini', value: '5', icon: '🏖️', color: 'text-yellow-600', href: '/dashboard/hr/leaves' },
    { title: 'WFH Hari Ini', value: '2', icon: '🏠', color: 'text-purple-600', href: '/dashboard/hr/attendance' },
]

const recentLeaves = [
    { name: 'Andi Pratama', type: 'Cuti Tahunan', dates: '4-5 Agt 2026', status: 'approved' },
    { name: 'Sari Dewi', type: 'Sakit', dates: '3 Agt 2026', status: 'approved' },
    { name: 'Budi Hartono', type: 'Cuti Tahunan', dates: '6-8 Agt 2026', status: 'pending' },
    { name: 'Rina Sari', type: 'Cuti Tahunan', dates: '10-12 Agt 2026', status: 'pending' },
]

const birthdays = [
    { name: 'Dedi Kurniawan', date: '5 Agt 2026', department: 'Engineering' },
    { name: 'Maya Putri', date: '8 Agt 2026', department: 'Marketing' },
    { name: 'Hendra Wijaya', date: '15 Agt 2026', department: 'Sales' },
]

const statusStyles: Record<string, string> = {
    approved: 'bg-green-100 text-green-800',
    pending: 'bg-yellow-100 text-yellow-800',
    rejected: 'bg-red-100 text-red-800',
}

export default function HrPage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">HR Overview</h1>
                <p className="text-gray-500">Ringkasan data dan aktivitas HR</p>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {summaryCards.map((card) => (
                    <Link key={card.title} href={card.href} className="rounded-xl border border-gray-200 bg-white p-4 transition-shadow hover:shadow-md">
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-500">{card.title}</span>
                            <span className="text-2xl">{card.icon}</span>
                        </div>
                        <p className={`mt-2 text-2xl font-bold ${card.color}`}>{card.value}</p>
                    </Link>
                ))}
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {/* Recent Leave Requests */}
                <div className="rounded-xl border border-gray-200 bg-white">
                    <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
                        <h2 className="font-semibold text-gray-900">🏖️ Pengajuan Cuti Terbaru</h2>
                        <Link href="/dashboard/hr/leaves" className="text-sm text-blue-600 hover:underline">Lihat Semua →</Link>
                    </div>
                    <div className="divide-y divide-gray-100">
                        {recentLeaves.map((leave, i) => (
                            <div key={i} className="flex items-center justify-between px-4 py-3">
                                <div>
                                    <p className="font-medium text-gray-900">{leave.name}</p>
                                    <p className="text-xs text-gray-500">{leave.type} · {leave.dates}</p>
                                </div>
                                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusStyles[leave.status]}`}>
                                    {leave.status === 'approved' ? 'Disetujui' : leave.status === 'pending' ? 'Menunggu' : 'Ditolak'}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Upcoming Birthdays */}
                <div className="rounded-xl border border-gray-200 bg-white">
                    <div className="border-b border-gray-200 px-4 py-3">
                        <h2 className="font-semibold text-gray-900">🎂 Ulang Tahun Mendatang</h2>
                    </div>
                    <div className="divide-y divide-gray-100">
                        {birthdays.map((b, i) => (
                            <div key={i} className="flex items-center gap-3 px-4 py-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-pink-100 text-lg">🎂</div>
                                <div className="flex-1">
                                    <p className="font-medium text-gray-900">{b.name}</p>
                                    <p className="text-xs text-gray-500">{b.department}</p>
                                </div>
                                <span className="text-sm text-gray-500">{b.date}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}
