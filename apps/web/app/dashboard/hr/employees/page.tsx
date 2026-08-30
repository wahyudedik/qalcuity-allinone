'use client'

import Link from 'next/link'
import { useState, useEffect, useCallback } from 'react'
import { LoadingSkeleton } from '@/components/ui/loading-skeleton'
import { getInitials } from '@/lib/utils'
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
    Trash2,
    Check,
    X,
    Loader2,
} from 'lucide-react'
import { useSession } from 'next-auth/react'

interface Employee {
    id: string
    employeeId: string
    name: string
    position: string
    department: string
    email: string
    phone: string
    status: 'ACTIVE' | 'INACTIVE' | 'TERMINATED'
    joinDate: string
    salary: number
}

interface EmployeeFormData {
    name: string
    email: string
    phone: string
    position: string
    department: string
    joinDate: string
    salary: number
    status: string
}

interface FormErrors {
    name?: string
    email?: string
    phone?: string
    position?: string
    department?: string
    joinDate?: string
    salary?: string
}

const DEPARTMENTS = ['Engineering', 'Marketing', 'Finance', 'Human Resources', 'Sales', 'Product', 'Operations', 'Design']

function validateEmployeeForm(data: EmployeeFormData): FormErrors {
    const errors: FormErrors = {}

    // Name: required, min 2 karakter
    if (!data.name || data.name.trim().length < 2) {
        errors.name = 'Nama harus minimal 2 karakter'
    }

    // Email: required, format valid
    if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
        errors.email = 'Format email tidak valid'
    }

    // Phone: format telepon Indonesia (opsional, tapi jika diisi harus valid)
    if (data.phone && !/^(\+62|62|0)8[1-9][0-9]{6,11}$/.test(data.phone.replace(/[\s-]/g, ''))) {
        errors.phone = 'Format telepon Indonesia tidak valid (contoh: 081234567890)'
    }

    // Position: required
    if (!data.position || data.position.trim().length === 0) {
        errors.position = 'Posisi wajib diisi'
    }

    // Department: required
    if (!data.department || data.department.trim().length === 0) {
        errors.department = 'Departemen wajib dipilih'
    }

    // Join Date: required, tidak boleh masa depan
    if (!data.joinDate) {
        errors.joinDate = 'Tanggal bergabung wajib diisi'
    } else {
        const joinDate = new Date(data.joinDate)
        const today = new Date()
        today.setHours(23, 59, 59, 999)
        if (joinDate > today) {
            errors.joinDate = 'Tanggal bergabung tidak boleh di masa depan'
        }
    }

    return errors
}

export default function EmployeesPage() {
    const { t } = useTranslation()
    const { data: session } = useSession()
    const canMutate = session?.user?.role !== 'VIEWER'
    const [employees, setEmployees] = useState<Employee[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedDepartment, setSelectedDepartment] = useState('All')
    const [selectedStatus, setSelectedStatus] = useState('All')
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

    // Form modal state
    const [showForm, setShowForm] = useState(false)
    const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null)
    const [formData, setFormData] = useState<EmployeeFormData>({
        name: '',
        email: '',
        phone: '',
        position: '',
        department: '',
        joinDate: '',
        salary: 0,
        status: 'ACTIVE',
    })
    const [formErrors, setFormErrors] = useState<FormErrors>({})
    const [submitting, setSubmitting] = useState(false)

    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 3000)
            return () => clearTimeout(timer)
        }
    }, [toast])

    const fetchEmployees = useCallback(async () => {
        try {
            setLoading(true)
            setError(null)
            const params = new URLSearchParams()
            if (searchQuery) params.set('search', searchQuery)
            if (selectedDepartment !== 'All') params.set('department', selectedDepartment)
            if (selectedStatus !== 'All') params.set('status', selectedStatus)

            const res = await fetch(`/api/hr/employees?${params.toString()}`)
            const data = await res.json()

            if (data.success) {
                setEmployees(data.data)
            } else {
                setError(data.error || 'Gagal memuat data karyawan')
            }
        } catch {
            setError('Gagal memuat data karyawan. Periksa koneksi jaringan Anda.')
        } finally {
            setLoading(false)
        }
    }, [searchQuery, selectedDepartment, selectedStatus])

    useEffect(() => {
        fetchEmployees()
    }, [fetchEmployees])

    const filteredEmployees = employees.filter((emp) => {
        const matchesSearch = emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            emp.position.toLowerCase().includes(searchQuery.toLowerCase()) ||
            emp.email.toLowerCase().includes(searchQuery.toLowerCase())
        const matchesDepartment = selectedDepartment === 'All' || emp.department === selectedDepartment
        const matchesStatus = selectedStatus === 'All' || emp.status === selectedStatus
        return matchesSearch && matchesDepartment && matchesStatus
    })

    const handleDelete = async (id: string) => {
        if (!window.confirm('Apakah Anda yakin ingin menghapus karyawan ini?')) return
        try {
            const response = await fetch(`/api/hr/employees?id=${id}`, { method: 'DELETE' })
            const result = await response.json()
            if (result.success) {
                fetchEmployees()
                setToast({ message: 'Karyawan berhasil dihapus', type: 'success' })
            } else {
                setToast({ message: `Gagal menghapus: ${result.error}`, type: 'error' })
            }
        } catch {
            setToast({ message: 'Gagal menghapus karyawan', type: 'error' })
        }
    }

    const openCreateForm = () => {
        setEditingEmployee(null)
        setFormData({
            name: '',
            email: '',
            phone: '',
            position: '',
            department: '',
            joinDate: '',
            salary: 0,
            status: 'ACTIVE',
        })
        setFormErrors({})
        setShowForm(true)
    }

    const openEditForm = (emp: Employee) => {
        setEditingEmployee(emp)
        setFormData({
            name: emp.name,
            email: emp.email,
            phone: emp.phone || '',
            position: emp.position,
            department: emp.department || '',
            joinDate: emp.joinDate ? emp.joinDate.split('T')[0] : '',
            salary: emp.salary || 0,
            status: emp.status,
        })
        setFormErrors({})
        setShowForm(true)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        const errors = validateEmployeeForm(formData)
        setFormErrors(errors)

        if (Object.keys(errors).length > 0) return

        setSubmitting(true)
        try {
            const url = editingEmployee
                ? `/api/hr/employees/${editingEmployee.id}`
                : '/api/hr/employees'
            const method = editingEmployee ? 'PUT' : 'POST'

            const payload = editingEmployee
                ? { id: editingEmployee.id, ...formData }
                : formData

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            })
            const result = await res.json()

            if (result.success) {
                setShowForm(false)
                fetchEmployees()
                setToast({
                    message: editingEmployee ? 'Karyawan berhasil diupdate' : 'Karyawan berhasil ditambahkan',
                    type: 'success',
                })
            } else {
                setToast({ message: result.error || 'Gagal menyimpan data', type: 'error' })
            }
        } catch {
            setToast({ message: 'Gagal menyimpan data karyawan', type: 'error' })
        } finally {
            setSubmitting(false)
        }
    }

    const handleFormChange = (field: keyof EmployeeFormData, value: string | number) => {
        setFormData((prev) => ({ ...prev, [field]: value }))
        // Clear error for this field when user types
        if (formErrors[field as keyof FormErrors]) {
            setFormErrors((prev) => ({ ...prev, [field]: undefined }))
        }
    }

    const statusColors = {
        'ACTIVE': 'bg-green-100 text-green-700',
        'INACTIVE': 'bg-gray-100 text-gray-700',
        'TERMINATED': 'bg-red-100 text-red-700',
    }

    const statusLabels = {
        'ACTIVE': t('hr.employees.active') || 'Aktif',
        'INACTIVE': t('hr.employees.inactive') || 'Tidak Aktif',
        'TERMINATED': 'Dikeluarkan',
    }

    const avatarColors = [
        'bg-blue-500', 'bg-purple-500', 'bg-green-500', 'bg-orange-500',
        'bg-pink-500', 'bg-indigo-500', 'bg-teal-500', 'bg-red-500',
    ]

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
                {canMutate && (
                    <button
                        onClick={openCreateForm}
                        className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
                    >
                        <Plus className="h-4 w-4" />
                        {t('hr.employees.addEmployee') || 'Tambah Karyawan'}
                    </button>
                )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                    <div className="text-2xl font-bold text-gray-900">{employees.length}</div>
                    <div className="text-sm text-gray-500">{t('hr.employees.totalEmployees') || 'Total Karyawan'}</div>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                    <div className="text-2xl font-bold text-green-600">
                        {employees.filter(e => e.status === 'ACTIVE').length}
                    </div>
                    <div className="text-sm text-gray-500">{t('hr.employees.active') || 'Aktif'}</div>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                    <div className="text-2xl font-bold text-yellow-600">
                        {employees.filter(e => e.status === 'INACTIVE').length}
                    </div>
                    <div className="text-sm text-gray-500">{t('hr.employees.inactive') || 'Tidak Aktif'}</div>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                    <div className="text-2xl font-bold text-red-600">
                        {employees.filter(e => e.status === 'TERMINATED').length}
                    </div>
                    <div className="text-sm text-gray-500">Dikeluarkan</div>
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
                    <option value="All">{t('hr.employees.allDepartments') || 'Semua Departemen'}</option>
                    {DEPARTMENTS.map(dept => (
                        <option key={dept} value={dept}>{dept}</option>
                    ))}
                </select>
                <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
                >
                    <option value="All">{t('hr.employees.allStatuses') || 'Semua Status'}</option>
                    <option value="ACTIVE">{t('hr.employees.active') || 'Aktif'}</option>
                    <option value="INACTIVE">{t('hr.employees.inactive') || 'Tidak Aktif'}</option>
                    <option value="TERMINATED">Dikeluarkan</option>
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
                                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[emp.status] || 'bg-gray-100 text-gray-700'}`}>
                                    {statusLabels[emp.status] || emp.status}
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
                                    <span>{emp.phone || '-'}</span>
                                </div>
                            </div>
                            <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-4">
                                <span className="text-xs text-gray-500">
                                    {t('hr.employees.joined') || 'Bergabung'}: {new Date(emp.joinDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </span>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => openEditForm(emp)}
                                        className="text-sm font-medium text-blue-600 hover:text-blue-700"
                                    >
                                        Edit
                                    </button>
                                    <Link
                                        href={`/dashboard/hr/employees/${emp.id}`}
                                        className="text-sm font-medium text-gray-600 hover:text-gray-700"
                                    >
                                        Detail
                                    </Link>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <>
                    {/* Kartu karyawan untuk tampilan mobile */}
                    <div className="md:hidden space-y-3">
                        {filteredEmployees.map((emp, index) => (
                            <div key={emp.id} className="rounded-xl border border-gray-200 bg-white p-4">
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-3">
                                        <div className={`flex h-10 w-10 items-center justify-center rounded-full text-white text-sm font-medium ${avatarColors[index % avatarColors.length]}`}>
                                            {getInitials(emp.name)}
                                        </div>
                                        <div>
                                            <h3 className="font-medium text-gray-900">{emp.name}</h3>
                                            <p className="text-sm text-gray-500">{emp.position}</p>
                                        </div>
                                    </div>
                                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[emp.status] || 'bg-gray-100 text-gray-700'}`}>
                                        {statusLabels[emp.status] || emp.status}
                                    </span>
                                </div>
                                <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                                    <div>
                                        <span className="text-gray-500">{t('hr.employees.department') || 'Departemen'}:</span>
                                        <span className="ml-1">{emp.department}</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-500">{t('hr.employees.hireDate') || 'Bergabung'}:</span>
                                        <span className="ml-1">{new Date(emp.joinDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-500">Email:</span>
                                        <span className="ml-1">{emp.email}</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-500">Telepon:</span>
                                        <span className="ml-1">{emp.phone || '-'}</span>
                                    </div>
                                </div>
                                <div className="mt-3 flex gap-3">
                                    <button
                                        onClick={() => openEditForm(emp)}
                                        className="text-sm font-medium text-blue-600 hover:text-blue-700"
                                    >
                                        Edit
                                    </button>
                                    <Link
                                        href={`/dashboard/hr/employees/${emp.id}`}
                                        className="text-sm font-medium text-gray-600 hover:text-gray-700"
                                    >
                                        Detail
                                    </Link>
                                    <button
                                        onClick={() => handleDelete(emp.id)}
                                        className="text-sm font-medium text-red-600 hover:text-red-700"
                                    >
                                        Hapus
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Tabel karyawan untuk tampilan desktop */}
                    <div className="hidden md:block rounded-xl border border-gray-200 bg-white overflow-hidden">
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
                                                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[emp.status] || 'bg-gray-100 text-gray-700'}`}>
                                                    {statusLabels[emp.status] || emp.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-600">
                                                {new Date(emp.joinDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => openEditForm(emp)}
                                                        className="text-sm font-medium text-blue-600 hover:text-blue-700"
                                                    >
                                                        Edit
                                                    </button>
                                                    <Link
                                                        href={`/dashboard/hr/employees/${emp.id}`}
                                                        className="text-sm font-medium text-gray-600 hover:text-gray-700"
                                                    >
                                                        Detail
                                                    </Link>
                                                    {canMutate && (
                                                        <button
                                                            onClick={() => handleDelete(emp.id)}
                                                            className="text-red-500 hover:text-red-700"
                                                            title="Hapus"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}

            {filteredEmployees.length === 0 && !loading && (
                <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
                    <User className="mx-auto h-10 w-10 text-gray-400" />
                    <h3 className="mt-4 text-lg font-medium text-gray-900">{t('hr.employees.emptyState') || 'Tidak ada karyawan ditemukan'}</h3>
                    <p className="mt-2 text-gray-500">{t('hr.employees.emptyHint') || 'Coba ubah filter atau kata kunci pencarian'}</p>
                </div>
            )}

            {/* Form Modal */}
            {showForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="mx-4 w-full max-w-lg rounded-xl bg-white shadow-xl max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
                            <h2 className="text-lg font-semibold text-gray-900">
                                {editingEmployee ? 'Edit Karyawan' : 'Tambah Karyawan Baru'}
                            </h2>
                            <button
                                onClick={() => setShowForm(false)}
                                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
                            {/* Name */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Nama <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => handleFormChange('name', e.target.value)}
                                    className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1 ${formErrors.name
                                        ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                                        : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                                        }`}
                                    placeholder="Masukkan nama lengkap"
                                />
                                {formErrors.name && (
                                    <p className="mt-1 text-xs text-red-600">{formErrors.name}</p>
                                )}
                            </div>

                            {/* Email */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Email <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => handleFormChange('email', e.target.value)}
                                    className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1 ${formErrors.email
                                        ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                                        : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                                        }`}
                                    placeholder="nama@perusahaan.com"
                                />
                                {formErrors.email && (
                                    <p className="mt-1 text-xs text-red-600">{formErrors.email}</p>
                                )}
                            </div>

                            {/* Phone */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Telepon
                                </label>
                                <input
                                    type="tel"
                                    value={formData.phone}
                                    onChange={(e) => handleFormChange('phone', e.target.value)}
                                    className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1 ${formErrors.phone
                                        ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                                        : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                                        }`}
                                    placeholder="081234567890"
                                />
                                {formErrors.phone && (
                                    <p className="mt-1 text-xs text-red-600">{formErrors.phone}</p>
                                )}
                            </div>

                            {/* Position */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Posisi <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={formData.position}
                                    onChange={(e) => handleFormChange('position', e.target.value)}
                                    className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1 ${formErrors.position
                                        ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                                        : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                                        }`}
                                    placeholder="Contoh: Software Engineer"
                                />
                                {formErrors.position && (
                                    <p className="mt-1 text-xs text-red-600">{formErrors.position}</p>
                                )}
                            </div>

                            {/* Department */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Departemen <span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={formData.department}
                                    onChange={(e) => handleFormChange('department', e.target.value)}
                                    className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1 ${formErrors.department
                                        ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                                        : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                                        }`}
                                >
                                    <option value="">Pilih departemen</option>
                                    {DEPARTMENTS.map(dept => (
                                        <option key={dept} value={dept}>{dept}</option>
                                    ))}
                                </select>
                                {formErrors.department && (
                                    <p className="mt-1 text-xs text-red-600">{formErrors.department}</p>
                                )}
                            </div>

                            {/* Join Date */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Tanggal Bergabung <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="date"
                                    value={formData.joinDate}
                                    onChange={(e) => handleFormChange('joinDate', e.target.value)}
                                    className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1 ${formErrors.joinDate
                                        ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                                        : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                                        }`}
                                />
                                {formErrors.joinDate && (
                                    <p className="mt-1 text-xs text-red-600">{formErrors.joinDate}</p>
                                )}
                            </div>

                            {/* Salary */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Gaji (Rp)
                                </label>
                                <input
                                    type="number"
                                    value={formData.salary}
                                    onChange={(e) => handleFormChange('salary', Number(e.target.value))}
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    placeholder="0"
                                    min="0"
                                />
                            </div>

                            {/* Status */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Status
                                </label>
                                <select
                                    value={formData.status}
                                    onChange={(e) => handleFormChange('status', e.target.value)}
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                >
                                    <option value="ACTIVE">Aktif</option>
                                    <option value="INACTIVE">Tidak Aktif</option>
                                    <option value="TERMINATED">Dikeluarkan</option>
                                </select>
                            </div>

                            {/* Actions */}
                            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                                <button
                                    type="button"
                                    onClick={() => setShowForm(false)}
                                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                                    disabled={submitting}
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                                    {submitting ? 'Menyimpan...' : (editingEmployee ? 'Update' : 'Simpan')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Toast */}
            {toast && (
                <div className={`fixed bottom-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-white text-sm font-medium transition-all duration-300 ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
                    }`}>
                    <span className="inline-flex items-center gap-1.5">
                        {toast.type === 'success' ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                        {toast.message}
                    </span>
                </div>
            )}
        </div>
    )
}
