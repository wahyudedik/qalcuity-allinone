'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
    Users,
    CheckCircle,
    Palmtree,
    Home,
    Cake,
    AlertCircle,
    Inbox,
} from 'lucide-react'
import { useTranslation } from '@/lib/i18n'
import { formatDate } from '@/lib/utils'

interface Employee {
    id: string
    employeeId: string
    name: string
    email: string
    phone: string
    position: string
    department: string
    joinDate: string
    salary: number
    status: string
}

interface Leave {
    id: string
    employeeName: string
    employeeId: string
    position: string
    department: string
    type: string
    startDate: string
    endDate: string
    days: number
    reason: string
    status: string
    appliedDate: string
}

interface Attendance {
    id: string
    employeeName: string
    employeeId: string
    position: string
    department: string
    date: string
    clockIn: string | null
    clockOut: string | null
    status: string
    workHours: number
}

export default function HrPage() {
    const { t } = useTranslation()
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [employees, setEmployees] = useState<Employee[]>([])
    const [leaves, setLeaves] = useState<Leave[]>([])
    const [attendance, setAttendance] = useState<Attendance[]>([])
    const [employeeTotal, setEmployeeTotal] = useState(0)

    useEffect(() => {
        async function fetchData() {
            try {
                const [employeesRes, leavesRes, attendanceRes] = await Promise.all([
                    fetch('/api/hr/employees?limit=100'),
                    fetch('/api/hr/leaves?limit=100'),
                    fetch('/api/hr/attendance?type=today&limit=100'),
                ])

                if (!employeesRes.ok || !leavesRes.ok || !attendanceRes.ok) {
                    throw new Error('Gagal memuat data HR')
                }

                const employeesJson = await employeesRes.json()
                const leavesJson = await leavesRes.json()
                const attendanceJson = await attendanceRes.json()

                setEmployees(
                    employeesJson.success && Array.isArray(employeesJson.data)
                        ? employeesJson.data
                        : []
                )
                setEmployeeTotal(employeesJson.total || 0)
                setLeaves(
                    leavesJson.success && Array.isArray(leavesJson.data)
                        ? leavesJson.data
                        : []
                )
                setAttendance(
                    attendanceJson.success && Array.isArray(attendanceJson.data)
                        ? attendanceJson.data
                        : []
                )
            } catch (err) {
                setError(
                    err instanceof Error ? err.message : 'Gagal memuat data'
                )
            } finally {
                setLoading(false)
            }
        }
        fetchData()
    }, [])

    // Hitung summary dari data real
    const totalEmployees = employeeTotal
    const presentToday = attendance.filter(
        (a) => a.status === 'present' || a.status === 'late'
    ).length
    const leaveToday = attendance.filter((a) => a.status === 'leave').length
    const wfhToday = attendance.filter((a) => a.status === 'wfh').length

    // Pending leaves (status = pending)
    const pendingLeaves = leaves.filter((l) => l.status === 'pending')
    const pendingLeaveCount = pendingLeaves.length

    const summaryCards = [
        { titleKey: 'hr.overview.totalEmployees', value: String(totalEmployees), icon: Users, color: 'text-blue-600', href: '/dashboard/hr/employees' },
        { titleKey: 'hr.overview.presentToday', value: String(presentToday), icon: CheckCircle, color: 'text-green-600', href: '/dashboard/hr/attendance' },
        { titleKey: 'hr.overview.leaveToday', value: String(leaveToday + pendingLeaveCount), icon: Palmtree, color: 'text-yellow-600', href: '/dashboard/hr/leaves' },
        { titleKey: 'hr.overview.wfhToday', value: String(wfhToday), icon: Home, color: 'text-purple-600', href: '/dashboard/hr/attendance' },
    ]

    // Recent leaves (5 terbaru)
    const recentLeaves = leaves.slice(0, 5)

    // Upcoming birthdays — Employee model tidak memiliki field dateOfBirth,
    // jadi section ini akan kosong sampai schema ditambah
    const birthdays: { name: string; date: string; department: string }[] = []

    const statusStyles: Record<string, string> = {
        approved: 'bg-green-100 text-green-800',
        pending: 'bg-yellow-100 text-yellow-800',
        rejected: 'bg-red-100 text-red-800',
    }

    const statusKeys: Record<string, string> = {
        approved: 'hr.overview.approved',
        pending: 'hr.overview.pending',
        rejected: 'hr.overview.rejected',
    }

    const leaveTypeLabels: Record<string, string> = {
        annual: 'Cuti Tahunan',
        sick: 'Sakit',
        personal: 'Cuti Pribadi',
        maternity: 'Cuti Melahirkan',
        unpaid: 'Cuti Tanpa Gaji',
    }

    // Loading state
    if (loading) {
        return (
            <div className="space-y-6">
                <div>
                    <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
                    <div className="h-4 w-64 bg-gray-200 rounded animate-pulse mt-2" />
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                            <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
                            <div className="h-7 w-16 bg-gray-200 rounded animate-pulse mt-2" />
                        </div>
                    ))}
                </div>
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    {Array.from({ length: 2 }).map((_, i) => (
                        <div key={i} className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
                            <div className="p-4">
                                <div className="h-5 w-32 bg-gray-200 rounded animate-pulse mb-4" />
                                {Array.from({ length: 4 }).map((_, j) => (
                                    <div key={j} className="flex justify-between py-3 border-b border-gray-100 dark:border-gray-700 last:border-0">
                                        <div className="h-4 w-40 bg-gray-200 rounded animate-pulse" />
                                        <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )
    }

    // Error state
    if (error) {
        return (
            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('hr.overview.title')}</h1>
                    <p className="text-gray-500 dark:text-gray-400">{t('hr.overview.subtitle')}</p>
                </div>
                <div className="rounded-xl border border-red-200 bg-red-50 p-6 dark:border-red-800 dark:bg-red-900/20">
                    <div className="flex items-center gap-3">
                        <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                        <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('hr.overview.title')}</h1>
                <p className="text-gray-500 dark:text-gray-400">{t('hr.overview.subtitle')}</p>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {summaryCards.map((card) => {
                    const Icon = card.icon
                    return (
                        <Link key={card.titleKey} href={card.href} className="rounded-xl border border-gray-200 bg-white p-4 transition-shadow hover:shadow-md dark:border-gray-700 dark:bg-gray-800">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-500 dark:text-gray-400">{t(card.titleKey)}</span>
                                <Icon className={`h-6 w-6 ${card.color}`} />
                            </div>
                            <p className={`mt-2 text-2xl font-bold ${card.color}`}>{card.value}</p>
                        </Link>
                    )
                })}
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {/* Recent Leave Requests */}
                <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
                    <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-700">
                        <h2 className="flex items-center gap-2 font-semibold text-gray-900 dark:text-gray-100">
                            <Palmtree className="h-4 w-4 text-yellow-500" />
                            {t('hr.overview.recentLeaves')}
                        </h2>
                        <Link href="/dashboard/hr/leaves" className="text-sm text-blue-600 hover:underline">{t('hr.overview.viewAll')}</Link>
                    </div>
                    <div className="divide-y divide-gray-100 dark:divide-gray-700">
                        {recentLeaves.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-8 text-gray-500 dark:text-gray-400">
                                <Inbox className="h-8 w-8 mb-2" />
                                <p className="text-sm">Belum ada pengajuan cuti</p>
                            </div>
                        ) : (
                            recentLeaves.map((leave) => (
                                <div key={leave.id} className="flex items-center justify-between px-4 py-3">
                                    <div>
                                        <p className="font-medium text-gray-900 dark:text-gray-100">{leave.employeeName}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                            {leaveTypeLabels[leave.type] || leave.type} · {formatDate(leave.startDate)}{leave.days > 1 ? ` - ${formatDate(leave.endDate)}` : ''}
                                        </p>
                                    </div>
                                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusStyles[leave.status] || 'bg-gray-100 text-gray-800'}`}>
                                        {t(statusKeys[leave.status]) || leave.status}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Upcoming Birthdays */}
                <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
                    <div className="border-b border-gray-200 px-4 py-3 dark:border-gray-700">
                        <h2 className="flex items-center gap-2 font-semibold text-gray-900 dark:text-gray-100">
                            <Cake className="h-4 w-4 text-pink-500" />
                            {t('hr.overview.upcomingBirthdays')}
                        </h2>
                    </div>
                    <div className="divide-y divide-gray-100 dark:divide-gray-700">
                        {birthdays.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-8 text-gray-500 dark:text-gray-400">
                                <Inbox className="h-8 w-8 mb-2" />
                                <p className="text-sm">Data ulang tahun belum tersedia</p>
                                <p className="text-xs mt-1">Field dateOfBirth belum ada di data karyawan</p>
                            </div>
                        ) : (
                            birthdays.map((b, i) => (
                                <div key={i} className="flex items-center gap-3 px-4 py-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-pink-100 dark:bg-pink-900/30">
                                        <Cake className="h-5 w-5 text-pink-500" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-medium text-gray-900 dark:text-gray-100">{b.name}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">{b.department}</p>
                                    </div>
                                    <span className="text-sm text-gray-500 dark:text-gray-400">{b.date}</span>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
