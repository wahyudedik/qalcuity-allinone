'use client'
import { usePermission } from '@/lib/use-permission'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { formatDate } from '@/lib/utils'
import { useTranslation } from '@/lib/i18n'
import { useSession } from 'next-auth/react'
import {
    ArrowLeft,
    Building2,
    Users,
    Edit,
    Trash2,
    Loader2,
    FileText,
    User,
    AlertTriangle,
    CheckCircle,
    XCircle,
} from 'lucide-react'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

// ============================================
// TYPES
// ============================================

interface DepartmentEmployee {
    id: string
    employeeId: string
    name: string
    email: string
    position: string
    status: string
    joinDate: string
}

interface DepartmentDetail {
    id: string
    name: string
    description: string
    isActive: boolean
    employeeCount: number
    employees: DepartmentEmployee[]
    createdAt: string
    updatedAt: string
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function DepartmentDetailPage({ params }: { params: { id: string } }) {
    const { t } = useTranslation()
    const router = useRouter()
    const { data: session } = useSession()
    const { canMutate: canMutateFn } = usePermission()
    const canMutate = canMutateFn('hr')

    const [department, setDepartment] = useState<DepartmentDetail | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
    const [deleting, setDeleting] = useState(false)

    // ============================================
    // EFFECTS
    // ============================================

    useEffect(() => {
        fetchDepartment()
    }, [params.id])

    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 3000)
            return () => clearTimeout(timer)
        }
    }, [toast])

    // ============================================
    // DATA FETCHING
    // ============================================

    const fetchDepartment = async () => {
        try {
            setLoading(true)
            setError(null)
            const response = await fetch(`/api/hr/departments/${params.id}`)
            const data = await response.json()
            if (data.success) {
                setDepartment(data.data)
            } else {
                setError(data.error || t('hr.department.error.loadFailed'))
            }
        } catch {
            setError(t('hr.department.error.loadFailed'))
        } finally {
            setLoading(false)
        }
    }

    // ============================================
    // HANDLERS
    // ============================================

    const handleDelete = async () => {
        try {
            setDeleting(true)
            const response = await fetch(`/api/hr/departments/${params.id}`, { method: 'DELETE' })
            const result = await response.json()
            if (result.success) {
                setToast({ message: t('hr.department.toast.deleteSuccess') || 'Departemen berhasil dihapus', type: 'success' })
                setTimeout(() => router.push('/dashboard/hr/departments'), 1000)
            } else {
                setToast({ message: result.error || t('hr.department.toast.deleteFailed'), type: 'error' })
            }
        } catch {
            setToast({ message: t('hr.department.toast.deleteFailed'), type: 'error' })
        } finally {
            setDeleting(false)
            setShowDeleteConfirm(false)
        }
    }

    // ============================================
    // RENDER: LOADING
    // ============================================

    if (loading) {
        return (
            <div className="space-y-6 p-6">
                <div className="h-10 w-40 bg-gray-200 rounded-lg animate-pulse" />
                <div className="flex items-start justify-between">
                    <div className="space-y-2">
                        <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
                        <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
                    </div>
                </div>
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                    <div className="lg:col-span-2">
                        <div className="rounded-xl border border-gray-200 bg-white p-6">
                            <div className="h-6 w-40 bg-gray-200 rounded animate-pulse mb-4" />
                            <div className="space-y-3">
                                {[1, 2, 3].map((i) => (
                                    <div key={i} className="flex justify-between">
                                        <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
                                        <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                    <div>
                        <div className="rounded-xl border border-gray-200 bg-white p-6">
                            <div className="h-6 w-32 bg-gray-200 rounded animate-pulse mb-4" />
                            <div className="space-y-3">
                                {[1, 2, 3].map((i) => (
                                    <div key={i} className="flex justify-between">
                                        <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
                                        <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    // ============================================
    // RENDER: ERROR
    // ============================================

    if (error || !department) {
        return (
            <div className="p-6">
                <div className="flex flex-col items-center justify-center py-12">
                    <AlertTriangle className="h-12 w-12 text-gray-300 mb-4" />
                    <p className="text-gray-500">{error || t('hr.department.error.notFound')}</p>
                    <Link
                        href="/dashboard/hr/departments"
                        className="mt-4 text-blue-600 hover:underline"
                    >
                        ← {t('hr.department.backToList')}
                    </Link>
                </div>
            </div>
        )
    }

    // ============================================
    // RENDER: MAIN
    // ============================================

    return (
        <div className="space-y-6 p-6">
            {/* Toast */}
            {toast && (
                <div
                    className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium transition-all ${toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}
                >
                    {toast.message}
                </div>
            )}

            {/* Delete Confirm Dialog */}
            <ConfirmDialog
                isOpen={showDeleteConfirm}
                onClose={() => setShowDeleteConfirm(false)}
                onConfirm={handleDelete}
                title={t('hr.department.confirm.deleteTitle') || 'Hapus Departemen'}
                message={`${t('hr.department.confirm.deleteMessage') || 'Apakah Anda yakin ingin menghapus'} ${department.name}?`}
                confirmText={deleting ? (t('common.processing') || 'Memproses...') : (t('common.confirm') || 'Ya, Hapus')}
                variant="danger"
            />

            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Link
                        href="/dashboard/hr/departments"
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <ArrowLeft className="h-5 w-5 text-gray-600" />
                    </Link>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                                {department.name}
                            </h1>
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${department.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                                {department.isActive ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                                {department.isActive ? (t('hr.department.status.active') || 'Aktif') : (t('hr.department.status.inactive') || 'Nonaktif')}
                            </span>
                        </div>
                        <p className="text-gray-500 mt-1">{department.employeeCount} {t('hr.department.employees') || 'karyawan'}</p>
                    </div>
                </div>
                {canMutate && (
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setShowDeleteConfirm(true)}
                            className="flex items-center gap-2 rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                        >
                            <Trash2 className="h-4 w-4" />
                            {t('common.delete') || 'Hapus'}
                        </button>
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                {/* Main Info */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Department Details */}
                    <div className="rounded-xl border border-gray-200 bg-white p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <FileText className="h-5 w-5 text-gray-400" />
                            {t('hr.department.detailTitle') || 'Detail Departemen'}
                        </h2>
                        <div className="space-y-4">
                            <div>
                                <p className="text-sm text-gray-500">{t('hr.department.fields.name') || 'Nama'}</p>
                                <p className="font-medium text-gray-900 mt-1">{department.name}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">{t('hr.department.fields.description') || 'Deskripsi'}</p>
                                <p className="font-medium text-gray-900 mt-1">{department.description || '-'}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">{t('hr.department.fields.status') || 'Status'}</p>
                                <p className="font-medium text-gray-900 mt-1">
                                    {department.isActive ? (t('hr.department.status.active') || 'Aktif') : (t('hr.department.status.inactive') || 'Nonaktif')}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">{t('hr.department.fields.createdAt') || 'Dibuat'}</p>
                                <p className="font-medium text-gray-900 mt-1">{formatDate(department.createdAt)}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">{t('hr.department.fields.updatedAt') || 'Terakhir Diperbarui'}</p>
                                <p className="font-medium text-gray-900 mt-1">{formatDate(department.updatedAt)}</p>
                            </div>
                        </div>
                    </div>

                    {/* Employees List */}
                    <div className="rounded-xl border border-gray-200 bg-white p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <Users className="h-5 w-5 text-gray-400" />
                            {t('hr.department.employeeList.title') || 'Daftar Karyawan'}
                            <span className="text-sm font-normal text-gray-500">({department.employeeCount})</span>
                        </h2>
                        {department.employees.length === 0 ? (
                            <div className="text-center py-8">
                                <Users className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                                <p className="text-gray-500">{t('hr.department.employeeList.empty') || 'Belum ada karyawan di departemen ini'}</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gray-50 border-b border-gray-200">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('hr.department.employeeList.name') || 'Nama'}</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('hr.department.employeeList.position') || 'Posisi'}</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('hr.department.employeeList.status') || 'Status'}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {department.employees.map((emp) => (
                                            <tr key={emp.id} className="hover:bg-gray-50">
                                                <td className="px-4 py-3">
                                                    <Link
                                                        href={`/dashboard/hr/employees/${emp.id}`}
                                                        className="font-medium text-gray-900 hover:text-blue-600"
                                                    >
                                                        {emp.name}
                                                    </Link>
                                                    <p className="text-xs text-gray-500">{emp.email}</p>
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-500">{emp.position}</td>
                                                <td className="px-4 py-3">
                                                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${emp.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                                                        {emp.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Summary */}
                    <div className="rounded-xl border border-gray-200 bg-white p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <Building2 className="h-5 w-5 text-gray-400" />
                            {t('hr.department.summary.title') || 'Ringkasan'}
                        </h2>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-500">{t('hr.department.summary.totalEmployees') || 'Total Karyawan'}</span>
                                <span className="text-sm font-medium text-gray-900">{department.employeeCount}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-500">{t('hr.department.summary.activeEmployees') || 'Karyawan Aktif'}</span>
                                <span className="text-sm font-medium text-gray-900">
                                    {department.employees.filter((e) => e.status === 'ACTIVE').length}
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-500">{t('common.status')}</span>
                                <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${department.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                                    {department.isActive ? (t('hr.department.status.active') || 'Aktif') : (t('hr.department.status.inactive') || 'Nonaktif')}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="rounded-xl border border-gray-200 bg-white p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('hr.department.actions.title') || 'Aksi'}</h2>
                        <div className="space-y-3">
                            <Link
                                href="/dashboard/hr/departments"
                                className="flex items-center justify-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 w-full"
                            >
                                <ArrowLeft className="h-4 w-4" />
                                {t('hr.department.actions.backToList') || 'Kembali ke Daftar'}
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
