'use client'

import Link from 'next/link'
import { useState } from 'react'

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

const employees: Employee[] = [
    {
        id: 'EMP-001',
        name: 'Ahmad Rizky',
        position: 'Software Engineer',
        department: 'Engineering',
        email: 'ahmad@qalcuity.com',
        phone: '+62 812-3456-7890',
        status: 'active',
        joinDate: '2023-03-15',
    },
    {
        id: 'EMP-002',
        name: 'Siti Nurhaliza',
        position: 'Marketing Manager',
        department: 'Marketing',
        email: 'siti@qalcuity.com',
        phone: '+62 813-4567-8901',
        status: 'active',
        joinDate: '2022-08-20',
    },
    {
        id: 'EMP-003',
        name: 'Budi Santoso',
        position: 'Finance Analyst',
        department: 'Finance',
        email: 'budi@qalcuity.com',
        phone: '+62 815-6789-0123',
        status: 'on-leave',
        joinDate: '2023-01-10',
    },
    {
        id: 'EMP-004',
        name: 'Dewi Lestari',
        position: 'HR Specialist',
        department: 'Human Resources',
        email: 'dewi@qalcuity.com',
        phone: '+62 816-7890-1234',
        status: 'active',
        joinDate: '2022-11-05',
    },
    {
        id: 'EMP-005',
        name: 'Eko Prasetyo',
        position: 'Sales Executive',
        department: 'Sales',
        email: 'eko@qalcuity.com',
        phone: '+62 817-8901-2345',
        status: 'active',
        joinDate: '2023-06-01',
    },
    {
        id: 'EMP-006',
        name: 'Fitri Handayani',
        position: 'UI/UX Designer',
        department: 'Product',
        email: 'fitri@qalcuity.com',
        phone: '+62 818-9012-3456',
        status: 'active',
        joinDate: '2023-04-20',
    },
    {
        id: 'EMP-007',
        name: 'Gunawan Wibowo',
        position: 'DevOps Engineer',
        department: 'Engineering',
        email: 'gunawan@qalcuity.com',
        phone: '+62 819-0123-4567',
        status: 'inactive',
        joinDate: '2022-05-15',
    },
    {
        id: 'EMP-008',
        name: 'Hana Permata',
        position: 'Content Writer',
        department: 'Marketing',
        email: 'hana@qalcuity.com',
        phone: '+62 821-1234-5678',
        status: 'active',
        joinDate: '2023-09-01',
    },
]

const departments = ['All', 'Engineering', 'Marketing', 'Finance', 'Human Resources', 'Sales', 'Product']

export default function EmployeesPage() {
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedDepartment, setSelectedDepartment] = useState('All')
    const [selectedStatus, setSelectedStatus] = useState('All')
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

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
        'active': 'Aktif',
        'on-leave': 'Cuti',
        'inactive': 'Tidak Aktif',
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

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Karyawan</h1>
                    <p className="text-gray-500">Kelola data karyawan dan informasi personal</p>
                </div>
                <Link
                    href="/dashboard/hr/employees/new"
                    className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
                >
                    <span>＋</span>
                    Tambah Karyawan
                </Link>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                    <div className="text-2xl font-bold text-gray-900">{employees.length}</div>
                    <div className="text-sm text-gray-500">Total Karyawan</div>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                    <div className="text-2xl font-bold text-green-600">
                        {employees.filter(e => e.status === 'active').length}
                    </div>
                    <div className="text-sm text-gray-500">Aktif</div>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                    <div className="text-2xl font-bold text-yellow-600">
                        {employees.filter(e => e.status === 'on-leave').length}
                    </div>
                    <div className="text-sm text-gray-500">Sedang Cuti</div>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                    <div className="text-2xl font-bold text-gray-600">
                        {employees.filter(e => e.status === 'inactive').length}
                    </div>
                    <div className="text-sm text-gray-500">Tidak Aktif</div>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center">
                <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
                    <input
                        type="text"
                        placeholder="Cari nama, posisi, atau email..."
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
                        <option key={dept} value={dept}>{dept === 'All' ? 'Semua Departemen' : dept}</option>
                    ))}
                </select>
                <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
                >
                    <option value="All">Semua Status</option>
                    <option value="active">Aktif</option>
                    <option value="on-leave">Cuti</option>
                    <option value="inactive">Tidak Aktif</option>
                </select>
                <div className="flex rounded-lg border border-gray-300">
                    <button
                        onClick={() => setViewMode('grid')}
                        className={`px-3 py-2 text-sm ${viewMode === 'grid' ? 'bg-gray-100' : ''}`}
                    >
                        ⊞
                    </button>
                    <button
                        onClick={() => setViewMode('list')}
                        className={`px-3 py-2 text-sm ${viewMode === 'list' ? 'bg-gray-100' : ''}`}
                    >
                        ☰
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
                                    <span>🏢</span>
                                    <span>{emp.department}</span>
                                </div>
                                <div className="flex items-center gap-2 text-gray-600">
                                    <span>📧</span>
                                    <span className="truncate">{emp.email}</span>
                                </div>
                                <div className="flex items-center gap-2 text-gray-600">
                                    <span>📞</span>
                                    <span>{emp.phone}</span>
                                </div>
                            </div>
                            <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-4">
                                <span className="text-xs text-gray-500">
                                    Bergabung: {new Date(emp.joinDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </span>
                                <Link
                                    href={`/dashboard/hr/employees/${emp.id}`}
                                    className="text-sm font-medium text-blue-600 hover:text-blue-700"
                                >
                                    Detail →
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
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Karyawan</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Posisi</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Departemen</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bergabung</th>
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
                                                Lihat
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
                    <span className="text-4xl">👤</span>
                    <h3 className="mt-4 text-lg font-medium text-gray-900">Tidak ada karyawan ditemukan</h3>
                    <p className="mt-2 text-gray-500">Coba ubah filter atau kata kunci pencarian</p>
                </div>
            )}
        </div>
    )
}
