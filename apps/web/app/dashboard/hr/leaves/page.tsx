'use client'

import { useState, useEffect } from 'react'
import { LoadingSkeleton } from '@/components/ui/loading-skeleton'
import { useTranslation } from '@/lib/i18n'
import {
    Search,
    Plus,
    ClipboardList,
    BarChart3,
    Calendar,
    AlertTriangle,
    Check,
    X,
    Clock,
    MessageCircle,
    Palmtree,
    Thermometer,
    Home,
    Baby,
    Wallet,
} from 'lucide-react'

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

export default function LeavesPage() {
    const { t } = useTranslation()
    const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [activeTab, setActiveTab] = useState<'requests' | 'balance' | 'calendar'>('requests')
    const [filterStatus, setFilterStatus] = useState('all')
    const [filterType, setFilterType] = useState('all')
    const [searchQuery, setSearchQuery] = useState('')

    const leaveTypeConfig = {
        annual: { label: t('hr.leaves.annual') || 'Cuti Tahunan', color: 'bg-blue-100 text-blue-700', icon: Palmtree },
        sick: { label: t('hr.leaves.sick') || 'Sakit', color: 'bg-red-100 text-red-700', icon: Thermometer },
        personal: { label: t('hr.leaves.personal') || 'Cuti Pribadi', color: 'bg-purple-100 text-purple-700', icon: Home },
        maternity: { label: t('hr.leaves.maternity') || 'Cuti Melahirkan', color: 'bg-pink-100 text-pink-700', icon: Baby },
        unpaid: { label: t('hr.leaves.unpaid') || 'Cuti Tanpa Gaji', color: 'bg-gray-100 text-gray-700', icon: Wallet },
    }

    const statusConfig = {
        pending: { label: t('hr.leaves.pending') || 'Menunggu', color: 'bg-yellow-100 text-yellow-700' },
        approved: { label: t('hr.leaves.approved') || 'Disetujui', color: 'bg-green-100 text-green-700' },
        rejected: { label: t('hr.leaves.rejected') || 'Ditolak', color: 'bg-red-100 text-red-700' },
    }

    const fetchLeaves = async () => {
        try {
            setLoading(true)
            const params = new URLSearchParams()
            if (searchQuery) params.set('search', searchQuery)
            if (filterStatus !== 'all') params.set('status', filterStatus)
            if (filterType !== 'all') params.set('type', filterType)

            const res = await fetch(`/api/hr/leaves?${params.toString()}`)
            const data = await res.json()

            if (data.success) {
                setLeaveRequests(data.data)
            }
        } catch {
            setError('Gagal memuat data cuti')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchLeaves()
    }, [searchQuery, filterStatus, filterType])

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

    if (loading) {
        return (
            <div className="space-y-6">
                <LoadingSkeleton lines={2} />
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                    {[1, 2, 3, 4].map(i => <LoadingSkeleton key={i} lines={1} />)}
                </div>
                <LoadingSkeleton lines={1} />
                <LoadingSkeleton lines={5} />
            </div>
        )
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center rounded-xl border border-gray-200 bg-white p-12">
                <AlertTriangle className="h-10 w-10 text-yellow-500" />
                <h3 className="mt-4 text-lg font-medium text-gray-900">{error}</h3>
                <button onClick={fetchLeaves} className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
                    Coba Lagi
                </button>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">{t('hr.leaves.title') || 'Cuti'}</h1>
                    <p className="text-gray-500">{t('hr.leaves.subtitle') || 'Kelola permohonan dan jatah cuti karyawan'}</p>
                </div>
                <button className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700">
                    <Plus className="h-4 w-4" />
                    {t('hr.leaves.requestLeave') || 'Ajukan Cuti'}
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                    <div className="text-2xl font-bold text-gray-900">{leaveRequests.length}</div>
                    <div className="text-sm text-gray-500">{t('hr.leaves.totalRequests') || 'Total Permohonan'}</div>
                </div>
                <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4">
                    <div className="text-2xl font-bold text-yellow-600">{pendingCount}</div>
                    <div className="text-sm text-yellow-600">{t('hr.leaves.pendingApproval') || 'Menunggu Persetujuan'}</div>
                </div>
                <div className="rounded-xl border border-green-200 bg-green-50 p-4">
                    <div className="text-2xl font-bold text-green-600">{approvedCount}</div>
                    <div className="text-sm text-green-600">{t('hr.leaves.approved') || 'Disetujui'}</div>
                </div>
                <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                    <div className="text-2xl font-bold text-red-600">{rejectedCount}</div>
                    <div className="text-sm text-red-600">{t('hr.leaves.rejected') || 'Ditolak'}</div>
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
                        <span className="flex items-center gap-2">
                            <ClipboardList className="h-4 w-4" />
                            {t('hr.leaves.requestsTab') || 'Permohonan Cuti'}
                        </span>
                    </button>
                    <button
                        onClick={() => setActiveTab('balance')}
                        className={`whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium ${activeTab === 'balance' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        <span className="flex items-center gap-2">
                            <BarChart3 className="h-4 w-4" />
                            {t('hr.leaves.balanceTab') || 'Saldo Cuti'}
                        </span>
                    </button>
                    <button
                        onClick={() => setActiveTab('calendar')}
                        className={`whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium ${activeTab === 'calendar' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        <span className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            {t('hr.leaves.calendarTab') || 'Kalender Cuti'}
                        </span>
                    </button>
                </nav>
            </div>

            {/* Requests Tab */}
            {activeTab === 'requests' && (
                <>
                    {/* Filters */}
                    <div className="flex flex-col gap-4 md:flex-row md:items-center">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder={t('hr.leaves.searchPlaceholder') || 'Cari nama karyawan...'}
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
                            <option value="all">{t('hr.leaves.allStatuses') || 'Semua Status'}</option>
                            <option value="pending">{t('hr.leaves.pending') || 'Menunggu'}</option>
                            <option value="approved">{t('hr.leaves.approved') || 'Disetujui'}</option>
                            <option value="rejected">{t('hr.leaves.rejected') || 'Ditolak'}</option>
                        </select>
                        <select
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value)}
                            className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
                        >
                            <option value="all">{t('hr.leaves.allTypes') || 'Semua Tipe'}</option>
                            <option value="annual">{t('hr.leaves.annual') || 'Cuti Tahunan'}</option>
                            <option value="sick">{t('hr.leaves.sick') || 'Sakit'}</option>
                            <option value="personal">{t('hr.leaves.personal') || 'Cuti Pribadi'}</option>
                            <option value="maternity">{t('hr.leaves.maternity') || 'Cuti Melahirkan'}</option>
                            <option value="unpaid">{t('hr.leaves.unpaid') || 'Cuti Tanpa Gaji'}</option>
                        </select>
                    </div>

                    {/* Leave Requests List */}
                    <div className="space-y-4">
                        {filteredRequests.map((request) => {
                            const typeConfig = leaveTypeConfig[request.type]
                            const TypeIcon = typeConfig.icon
                            return (
                                <div key={request.id} className="rounded-xl border border-gray-200 bg-white p-5 hover:shadow-md transition-shadow">
                                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3">
                                                <div className={`flex h-10 w-10 items-center justify-center rounded-full ${typeConfig.color}`}>
                                                    <TypeIcon className="h-5 w-5" />
                                                </div>
                                                <div>
                                                    <h3 className="font-semibold text-gray-900">{request.employeeName}</h3>
                                                    <p className="text-sm text-gray-500">{request.id} • {t('hr.leaves.appliedDate') || 'Diajukan'} {new Date(request.appliedDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                                                </div>
                                            </div>
                                            <div className="mt-3 ml-13">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${typeConfig.color}`}>
                                                        {typeConfig.label}
                                                    </span>
                                                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusConfig[request.status].color}`}>
                                                        {statusConfig[request.status].label}
                                                    </span>
                                                </div>
                                                <div className="mt-2 flex items-center gap-4 text-sm text-gray-600">
                                                    <span className="flex items-center gap-1">
                                                        <Calendar className="h-3.5 w-3.5" />
                                                        {new Date(request.startDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} - {new Date(request.endDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <Clock className="h-3.5 w-3.5" />
                                                        {request.days} hari
                                                    </span>
                                                </div>
                                                <p className="mt-2 flex items-center gap-1 text-sm text-gray-500">
                                                    <MessageCircle className="h-3.5 w-3.5" />
                                                    {request.reason}
                                                </p>
                                                {request.approvedBy && (
                                                    <p className="mt-1 text-xs text-gray-400">{t('hr.leaves.approvedBy') || 'Oleh'}: {request.approvedBy}</p>
                                                )}
                                            </div>
                                        </div>
                                        {request.status === 'pending' && (
                                            <div className="flex gap-2 md:flex-col">
                                                <button className="inline-flex items-center gap-1 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700">
                                                    <Check className="h-4 w-4" />
                                                    {t('hr.leaves.approve') || 'Setujui'}
                                                </button>
                                                <button className="inline-flex items-center gap-1 rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50">
                                                    <X className="h-4 w-4" />
                                                    {t('hr.leaves.reject') || 'Tolak'}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>

                    {filteredRequests.length === 0 && (
                        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
                            <ClipboardList className="mx-auto h-10 w-10 text-gray-400" />
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
                            const config = leaveTypeConfig[balance.type as keyof typeof leaveTypeConfig]
                            const BalanceIcon = config.icon
                            const percentage = Math.round((balance.used / balance.total) * 100)
                            return (
                                <div key={balance.type} className="rounded-xl border border-gray-200 bg-white p-6">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className={`flex h-12 w-12 items-center justify-center rounded-full ${config.color}`}>
                                            <BalanceIcon className="h-6 w-6" />
                                        </div>
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
                        <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
                            <BarChart3 className="h-5 w-5 text-blue-600" />
                            Ringkasan Saldo Semua Karyawan
                        </h3>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="border-b border-gray-200">
                                    <tr>
                                        <th className="pb-3 text-left text-xs font-medium text-gray-500 uppercase">{t('hr.employees.title') || 'Karyawan'}</th>
                                        <th className="pb-3 text-center text-xs font-medium text-gray-500 uppercase">{t('hr.leaves.annual') || 'Cuti Tahunan'}</th>
                                        <th className="pb-3 text-center text-xs font-medium text-gray-500 uppercase">{t('hr.leaves.sick') || 'Sakit'}</th>
                                        <th className="pb-3 text-center text-xs font-medium text-gray-500 uppercase">{t('hr.leaves.personal') || 'Pribadi'}</th>
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
                        <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                            <Calendar className="h-5 w-5 text-blue-600" />
                            Agustus 2026
                        </h3>
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
                            const day = i - 0 + 1
                            const isCurrentMonth = day >= 1 && day <= 31
                            const isToday = day === 4

                            const hasLeave = [3, 4, 5, 6, 7, 10, 11, 15, 16].includes(day)
                            const leaveNames: Record<number, string> = {
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
                                            {leaveNames[day]}
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>

                    <div className="mt-6 flex items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                            <div className="h-3 w-3 rounded bg-blue-100 border border-blue-200" />
                            <span>{t('hr.leaves.title') || 'Cuti'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="h-3 w-3 rounded ring-2 ring-blue-500" />
                            <span>{t('hr.attendance.today') || 'Hari Ini'}</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
