'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { LoadingSkeleton } from '@/components/ui/loading-skeleton'
import { useTranslation } from '@/lib/i18n'
import {
    Search,
    Plus,
    Building2,
    Mail,
    Phone,
    User,
    LayoutGrid,
    List,
    AlertTriangle,
} from 'lucide-react'

interface Employee {
    id: string
    name: string
    position: string
    department: string
    email: string
    phone: string
    status: 'active' | 'on-leave' | 'inactive'
    joinDate: string
    avatar?: string
}

export default function EmployeesPage() {
    const { t } = useTranslation()
    const [employees, setEmployees] = useState<Employee[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedDepartment, setSelectedDepartment] = useState('All')
    const [selectedStatus, setSelectedStatus] = useState('All')
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

    const fetchEmployees = async () => {
        try {
            setLoading(true)
            const params = new URLSearchParams()
            if (searchQuery) params.set('search', searchQuery)
            if (selectedDepartment !== 'All') params.set('department', selectedDepartment)
            if (selectedStatus !== 'All') params.set('status', selectedStatus === 'on-leave' ? 'on_leave' : selectedStatus)

            const res = await fetch(`/api/hr/employees?${params.toString()}`)
            const data = await res.json()

            if (data.success) {
                const mapped = data.data.map((emp: Record<string, unknown>) => ({
                    id: emp.id as string,
                    name: `${emp.firstName} ${emp.lastName}`,
                    position: emp.position as string,
                    department: emp.department as string,
                    email: emp.email as string,
                    phone: emp.phone as string,
                    status: emp.status === 'on_leave' ? 'on-leave' : emp.status as 'active' | 'inactive',
                    joinDate: emp.startDate as string,
                }))
                setEmployees(mapped)
            }
        } catch {
            setError(t('hr.employees.retry') || 'Gagal memuat data karyawan')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchEmployees()
    }, [searchQuery, selectedDepartment, selectedStatus])

    const filteredEmployees = employees.filter((emp) => {
        const matchesSearch = emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            emp.position.toLowerCase().includes(searchQuery.toLowerCase()) ||
            emp.email.toLowerCase().includes(searchQuery.toLowerCase())
        const matchesDepartment = selectedDepartment === 'All' || emp.department === selectedDepartment
        const matchesStatus = selectedStatus === 'All' || emp.status === selectedStatus
        return matchesSearch && matchesDepartment && matchesStatus
    })

    const statusColors = {
        'active': 'bg-green-100 text-green-700',
        'on-leave': 'bg-yellow-100 text-yellow-700',
        'inactive': 'bg-gray-100 text-gray-700',
    }

    const statusLabels = {
        'active': t('hr.employees.active') || 'Aktif',
        'on-leave': t('hr.employees.onLeave') || 'Cuti',
        'inactive': t('hr.employees.inactive') || 'Tidak Aktif',
    }

    const getInitials = (name: string) => {
        return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
    }

    const avatarColors = [
        'bg-blue-500',
        'bg-purple-500',
        'bg-green-500',
        'bg-orange-500',
        'bg-pink-500',
        'bg-indigo-500',
        'bg-teal-500',
        'bg-red-500',
    ]

    const departments = ['All', 'Engineering', 'Marketing', 'Finance', 'Human Resources', 'Sales', 'Product']

    if (loading) {
        return (
            <div className="space-y-6">
                <LoadingSkeleton lines={2} />
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                    {[1, 2, 3, 4].map(i => <LoadingSkeleton key={i} lines={1} />)}
                </div>
                <LoadingSkeleton lines={1} />
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {[1, 2, 3, 4, 5, 6].map(i => <LoadingSkeleton key={i} lines={3} />)}
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center rounded-xl border border-gray-200 bg-white p-12">
                <AlertTriangle className="h-10 w-10 text-yellow-500" />
                <h3 className="mt-4 text-lg font-medium text-gray-900">{error}</h3>
                <button onClick={fetchEmployees} className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
                    {t('hr.employees.retry') || 'Coba Lagi'}
                </button>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">{t('hr.employees.title') || 'Karyawan'}</h1>
                    <p className="text-gray-500">{t('hr.employees.subtitle') || 'Kelola data karyawan dan informasi personal'}</p>
                </div>
                <Link
                    href="/dashboard/hr/employees/new"
                    className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
                >
                    <Plus className="h-4 w-4" />
                    {t('hr.employees.addEmployee') || 'Tambah Karyawan'}
                </Link>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                    <div className="text-2xl font-bold text-gray-900">{employees.length}</div>
                    <div className="text-sm text-gray-500">{t('hr.employees.totalEmployees') || 'Total Karyawan'}</div>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                    <div className="text-2xl font-bold text-green-600">
                        {employees.filter(e => e.status === 'active').length}
                    </div>
                    <div className="text-sm text-gray-500">{t('hr.employees.active') || 'Aktif'}</div>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                    <div className="text-2xl font-bold text-yellow-600">
                        {employees.filter(e => e.status === 'on-leave').length}
                    </div>
                    <div className="text-sm text-gray-500">{t('hr.employees.onLeave') || 'Sedang Cuti'}</div>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                    <div className="text-2xl font-bold text-gray-600">
                        {employees.filter(e => e.status === 'inactive').length}
                    </div>
                    <div className="text-sm text-gray-500">{t('hr.employees.inactive') || 'Tidak Aktif'}</div>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder={t('hr.employees.searchPlaceholder') || 'Cari nama, posisi, atau email...'}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                </div>
                <select
                    value={selectedDepartment}
                    onChange={(e) => setSelectedDepartment(e.target.value)}
                    className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
                >
                    {departments.map(dept => (
                        <option key={dept} value={dept}>{dept === 'All' ? (t('hr.employees.allDepartments') || 'Semua Departemen') : dept}</option>
                    ))}
                </select>
                <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
                >
                    <option value="All">{t('hr.employees.allStatuses') || 'Semua Status'}</option>
                    <option value="active">{t('hr.employees.active') || 'Aktif'}</option>
                    <option value="on-leave">{t('hr.employees.onLeave') || 'Cuti'}</option>
                    <option value="inactive">{t('hr.employees.inactive') || 'Tidak Aktif'}</option>
                </select>
                <div className="flex rounded-lg border border-gray-300">
                    <button
                        onClick={() => setViewMode('grid')}
                        className={`px-3 py-2 text-sm ${viewMode === 'grid' ? 'bg-gray-100' : ''}`}
                        title={t('hr.employees.gridView') || 'Tampilan Grid'}
                    >
                        <LayoutGrid className="h-4 w-4" />
                    </button>
                    <button
                        onClick={() => setViewMode('list')}
                        className={`px-3 py-2 text-sm ${viewMode === 'list' ? 'bg-gray-100' : ''}`}
                        title={t('hr.employees.listView') || 'Tampilan Daftar'}
                    >
                        <List className="h-4 w-4" />
                    </button>
                </div>
            </div>

            {/* Grid View */}
            {viewMode === 'grid' ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {filteredEmployees.map((emp, index) => (
                        <div key={emp.id} className="rounded-xl border border-gray-200 bg-white p-5 hover:shadow-md transition-shadow">
                            <div className="flex items-start gap-4">
                                <div className={`flex h-12 w-12 items-center justify-center rounded-full text-white font-medium ${avatarColors[index % avatarColors.length]}`}>
                                    {getInitials(emp.name)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-semibold text-gray-900 truncate">{emp.name}</h3>
                                    <p className="text-sm text-gray-500 truncate">{emp.position}</p>
                                </div>
                                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[emp.status]}`}>
                                    {statusLabels[emp.status]}
                                </span>
                            </div>
                            <div className="mt-4 space-y-2 text-sm">
                                <div className="flex items-center gap-2 text-gray-600">
                                    <Building2 className="h-4 w-4 flex-shrink-0" />
                                    <span>{emp.department}</span>
                                </div>
                                <div className="flex items-center gap-2 text-gray-600">
                                    <Mail className="h-4 w-4 flex-shrink-0" />
                                    <span className="truncate">{emp.email}</span>
                                </div>
                                <div className="flex items-center gap-2 text-gray-600">
                                    <Phone className="h-4 w-4 flex-shrink-0" />
                                    <span>{emp.phone}</span>
                                </div>
                            </div>
                            <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-4">
                                <span className="text-xs text-gray-500">
                                    {t('hr.employees.joined') || 'Bergabung'}: {new Date(emp.joinDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </span>
                                <Link
                                    href={`/dashboard/hr/employees/${emp.id}`}
                                    className="text-sm font-medium text-blue-600 hover:text-blue-700"
                                >
                                    {t('hr.employees.detail') || 'Detail'} →
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                /* List View */
                <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('hr.employees.title') || 'Karyawan'}</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('hr.employees.position') || 'Posisi'}</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('hr.employees.department') || 'Departemen'}</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('hr.employees.status') || 'Status'}</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('hr.employees.hireDate') || 'Bergabung'}</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredEmployees.map((emp, index) => (
                                    <tr key={emp.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className={`flex h-10 w-10 items-center justify-center rounded-full text-white text-sm font-medium ${avatarColors[index % avatarColors.length]}`}>
                                                    {getInitials(emp.name)}
                                                </div>
                                                <div>
                                                    <div className="font-medium text-gray-900">{emp.name}</div>
                                                    <div className="text-sm text-gray-500">{emp.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">{emp.position}</td>
                                        <td className="px-6 py-4 text-sm text-gray-600">{emp.department}</td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[emp.status]}`}>
                                                {statusLabels[emp.status]}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">
                                            {new Date(emp.joinDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <Link
                                                href={`/dashboard/hr/employees/${emp.id}`}
                                                className="text-sm font-medium text-blue-600 hover:text-blue-700"
                                            >
                                                {t('hr.employees.view') || 'Lihat'}
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {filteredEmployees.length === 0 && (
                <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
                    <User className="mx-auto h-10 w-10 text-gray-400" />
                    <h3 className="mt-4 text-lg font-medium text-gray-900">{t('hr.employees.emptyState') || 'Tidak ada karyawan ditemukan'}</h3>
                    <p className="mt-2 text-gray-500">{t('hr.employees.emptyHint') || 'Coba ubah filter atau kata kunci pencarian'}</p>
                </div>
            )}
        </div>
    )
}
