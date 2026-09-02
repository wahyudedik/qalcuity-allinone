'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { formatCurrency, formatDate } from '@/lib/utils'
import { useTranslation } from '@/lib/i18n'
import { Star, Pencil, FileText, BarChart3, ArrowLeft, Mail, Phone, MapPin, Building2, Calendar, Trash2, X, Loader2 } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

interface EmployeeAttendance {
    id: string
    date: string
    clockIn: string | null
    clockOut: string | null
    status: string
    workHours: number
}

interface EmployeeLeave {
    id: string
    type: string
    startDate: string
    endDate: string
    days: number
    reason: string
    status: string
    appliedDate: string
}

interface EmployeePayroll {
    id: string
    period: string
    baseSalary: number
    allowances: number
    deductions: number
    netSalary: number
    status: string
}

interface EmployeeDetail {
    id: string
    employeeId: string
    name: string
    email: string
    phone: string
    position: string
    department: string
    joinDate: string
    status: string
    salary: number
    attendance: EmployeeAttendance[]
    leaves: EmployeeLeave[]
    payroll: EmployeePayroll[]
    createdAt: string
}

/** Extract initials from a full name (e.g. "Budi Santoso" → "BS"). */
function getInitials(name: string): string {
    if (!name) return '?'
    const parts = name.trim().split(/\s+/)
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
}

export default function EmployeeDetailPage({ params }: { params: { id: string } }) {
    const { t } = useTranslation()
    const { data: session } = useSession()
    const canMutate = session?.user?.role !== 'VIEWER'
    const router = useRouter()
    const [employee, setEmployee] = useState<EmployeeDetail | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
    const [isEditing, setIsEditing] = useState(false)
    const [editForm, setEditForm] = useState({
        name: '',
        email: '',
        phone: '',
        position: '',
        department: '',
        salary: 0,
        joinDate: '',
    })
    const [editSaving, setEditSaving] = useState(false)

    useEffect(() => {
        const fetchEmployee = async () => {
            try {
                const response = await fetch(`/api/hr/employees/${params.id}`)
                const data = await response.json()
                if (data.success) {
                    setEmployee(data.data)
                } else {
                    setError(data.error || t('hr.employeeDetail.error'))
                }
            } catch {
                setError(t('hr.employeeDetail.errorLoad'))
            } finally {
                setLoading(false)
            }
        }
        fetchEmployee()
    }, [params.id, t])

    const openEditForm = () => {
        if (!employee) return
        setEditForm({
            name: employee.name,
            email: employee.email,
            phone: employee.phone,
            position: employee.position,
            department: employee.department,
            salary: Number(employee.salary),
            joinDate: employee.joinDate ? employee.joinDate.split('T')[0] : '',
        })
        setIsEditing(true)
    }

    const handleEditSave = async () => {
        setEditSaving(true)
        try {
            const res = await fetch(`/api/hr/employees/${params.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editForm),
            })
            const data = await res.json()
            if (data.success) {
                setToast({ message: t('hr.employeeDetail.updateSuccess'), type: 'success' })
                setIsEditing(false)
                // Refresh employee data
                const updated = await fetch(`/api/hr/employees/${params.id}`)
                const updatedData = await updated.json()
                if (updatedData.success) {
                    setEmployee(updatedData.data)
                }
            } else {
                setToast({ message: data.error || t('hr.employeeDetail.updateError'), type: 'error' })
            }
        } catch {
            setToast({ message: t('hr.employeeDetail.updateError'), type: 'error' })
        } finally {
            setEditSaving(false)
        }
    }

    const handleDelete = () => {
        setShowDeleteConfirm(true)
    }

    const confirmDelete = async () => {
        setShowDeleteConfirm(false)
        try {
            const res = await fetch(`/api/hr/employees/${params.id}`, { method: 'DELETE' })
            const data = await res.json()
            if (data.success) {
                setToast({ message: t('hr.employeeDetail.deleteSuccess'), type: 'success' })
                router.push('/dashboard/hr/employees')
            } else {
                setToast({ message: data.error || t('hr.employeeDetail.deleteError'), type: 'error' })
            }
        } catch {
            setToast({ message: t('hr.employeeDetail.deleteError'), type: 'error' })
        }
    }

    if (loading) {
        return (
            <div className="p-6">
                <div className="h-6 w-32 animate-pulse rounded bg-gray-200" />
                <div className="mt-4 h-48 animate-pulse rounded-xl bg-gray-100" />
            </div>
        )
    }

    if (error || !employee) {
        return (
            <div className="flex h-64 items-center justify-center">
                <div className="text-center">
                    <p className="text-lg text-gray-600">{error || t('hr.employeeDetail.error')}</p>
                    <Link href="/dashboard/hr/employees" className="mt-4 inline-block text-blue-600 hover:text-blue-800">
                        ← {t('hr.employeeDetail.backToEmployees')}
                    </Link>
                </div>
            </div>
        )
    }

    const employeeName = employee.name || 'Unknown'
    const initials = getInitials(employeeName)

    return (
        <div className="space-y-6 p-6">
            {/* Toast notification */}
            {/* Delete Confirm Dialog */}
            <ConfirmDialog
                isOpen={showDeleteConfirm}
                onClose={() => setShowDeleteConfirm(false)}
                onConfirm={confirmDelete}
                title={t('hr.employeeDetail.confirmDelete') || 'Hapus Karyawan'}
                message={t('hr.employeeDetail.confirmDelete') || 'Apakah Anda yakin ingin menghapus data karyawan ini?'}
                confirmText="Hapus"
                variant="danger"
            />

            {toast && (
                <div className={`fixed right-4 top-4 z-50 rounded-lg px-4 py-3 text-sm font-medium text-white shadow-lg ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
                    }`}>
                    {toast.message}
                    <button onClick={() => setToast(null)} className="ml-2"><X className="h-4 w-4 inline" /></button>
                </div>
            )}

            {/* Header */}
            <div>
                <Link href="/dashboard/hr/employees" className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900">
                    <ArrowLeft className="h-4 w-4" />
                    {t('hr.employeeDetail.backToEmployees')}
                </Link>
                <div className="mt-4 flex items-center gap-4">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-xl font-bold text-blue-600">
                        {initials}
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">{employeeName}</h1>
                        <p className="text-sm text-gray-500">{employee.position} • {employee.department || '-'}</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                {/* Main Info */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Personal Info */}
                    <div className="rounded-xl border border-gray-200 bg-white p-6">
                        <h3 className="text-lg font-semibold text-gray-900">{t('hr.employeeDetail.personalInfo')}</h3>
                        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div className="flex items-center gap-2">
                                <Mail className="h-4 w-4 text-gray-400" />
                                <div>
                                    <p className="text-sm text-gray-500">{t('hr.employeeDetail.email')}</p>
                                    <p className="font-medium text-gray-900">{employee.email || '-'}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Phone className="h-4 w-4 text-gray-400" />
                                <div>
                                    <p className="text-sm text-gray-500">{t('hr.employeeDetail.phone')}</p>
                                    <p className="font-medium text-gray-900">{employee.phone || '-'}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Attendance History */}
                    {employee.attendance && employee.attendance.length > 0 && (
                        <div className="rounded-xl border border-gray-200 bg-white p-6">
                            <h3 className="text-lg font-semibold text-gray-900">{t('hr.employeeDetail.attendanceHistory')}</h3>
                            <div className="mt-4 overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead>
                                        <tr className="border-b text-gray-500">
                                            <th className="pb-2 font-medium">{t('hr.employeeDetail.date')}</th>
                                            <th className="pb-2 font-medium">Clock In</th>
                                            <th className="pb-2 font-medium">Clock Out</th>
                                            <th className="pb-2 font-medium">{t('hr.employeeDetail.status')}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {employee.attendance.map((a) => (
                                            <tr key={a.id} className="border-b last:border-0">
                                                <td className="py-2">{formatDate(a.date)}</td>
                                                <td className="py-2">{a.clockIn ? formatDate(a.clockIn) : '-'}</td>
                                                <td className="py-2">{a.clockOut ? formatDate(a.clockOut) : '-'}</td>
                                                <td className="py-2">
                                                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${a.status === 'PRESENT' ? 'bg-green-100 text-green-700' :
                                                        a.status === 'LATE' ? 'bg-yellow-100 text-yellow-700' :
                                                            a.status === 'ABSENT' ? 'bg-red-100 text-red-700' :
                                                                'bg-gray-100 text-gray-700'
                                                        }`}>
                                                        {a.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Leave Requests */}
                    {employee.leaves && employee.leaves.length > 0 && (
                        <div className="rounded-xl border border-gray-200 bg-white p-6">
                            <h3 className="text-lg font-semibold text-gray-900">{t('hr.employeeDetail.leaves')}</h3>
                            <div className="mt-4 overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead>
                                        <tr className="border-b text-gray-500">
                                            <th className="pb-2 font-medium">{t('hr.employeeDetail.type')}</th>
                                            <th className="pb-2 font-medium">{t('hr.employeeDetail.startDate')}</th>
                                            <th className="pb-2 font-medium">{t('hr.employeeDetail.endDate')}</th>
                                            <th className="pb-2 font-medium">{t('hr.employeeDetail.days')}</th>
                                            <th className="pb-2 font-medium">{t('hr.employeeDetail.status')}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {employee.leaves.map((l) => (
                                            <tr key={l.id} className="border-b last:border-0">
                                                <td className="py-2">{l.type}</td>
                                                <td className="py-2">{formatDate(l.startDate)}</td>
                                                <td className="py-2">{formatDate(l.endDate)}</td>
                                                <td className="py-2">{l.days}</td>
                                                <td className="py-2">
                                                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${l.status === 'APPROVED' ? 'bg-green-100 text-green-700' :
                                                        l.status === 'REJECTED' ? 'bg-red-100 text-red-700' :
                                                            'bg-yellow-100 text-yellow-700'
                                                        }`}>
                                                        {l.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Work Info */}
                    <div className="rounded-xl border border-gray-200 bg-white p-6">
                        <h3 className="text-lg font-semibold text-gray-900">{t('hr.employeeDetail.workInfo')}</h3>
                        <div className="mt-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="flex items-center gap-2 text-sm text-gray-500">
                                    <Building2 className="h-4 w-4" /> {t('hr.employeeDetail.department')}
                                </span>
                                <span className="text-sm font-medium text-gray-900">{employee.department || '-'}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="flex items-center gap-2 text-sm text-gray-500">
                                    <Pencil className="h-4 w-4" /> {t('hr.employeeDetail.position')}
                                </span>
                                <span className="text-sm font-medium text-gray-900">{employee.position}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="flex items-center gap-2 text-sm text-gray-500">
                                    <Calendar className="h-4 w-4" /> {t('hr.employeeDetail.hireDate')}
                                </span>
                                <span className="text-sm text-gray-900">{formatDate(employee.joinDate)}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-500">{t('hr.employeeDetail.employeeId')}</span>
                                <span className="font-mono text-sm text-gray-900">{employee.employeeId}</span>
                            </div>
                        </div>
                    </div>

                    {/* Compensation */}
                    <div className="rounded-xl border border-gray-200 bg-white p-6">
                        <h3 className="text-lg font-semibold text-gray-900">{t('hr.employeeDetail.compensation')}</h3>
                        <div className="mt-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-500">{t('hr.employeeDetail.baseSalary')}</span>
                                <span className="text-sm font-medium text-gray-900">{formatCurrency(Number(employee.salary))}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-500">{t('hr.employeeDetail.thr')}</span>
                                <span className="text-sm font-medium text-gray-900">{formatCurrency(Number(employee.salary))}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-500">{t('hr.employeeDetail.bpjs')}</span>
                                <span className="text-sm font-medium text-green-600">{t('hr.employeeDetail.fullCoverage')}</span>
                            </div>
                        </div>
                    </div>

                    {/* Latest Payroll */}
                    {employee.payroll && employee.payroll.length > 0 && (
                        <div className="rounded-xl border border-gray-200 bg-white p-6">
                            <h3 className="text-lg font-semibold text-gray-900">{t('hr.employeeDetail.payroll')}</h3>
                            <div className="mt-4 space-y-3">
                                {employee.payroll.map((p) => (
                                    <div key={p.id} className="flex items-center justify-between border-b border-gray-100 pb-2 last:border-0 last:pb-0">
                                        <div>
                                            <p className="text-sm font-medium text-gray-900">{p.period}</p>
                                            <p className="text-xs text-gray-500">
                                                {t('hr.employeeDetail.netSalary')}: {formatCurrency(Number(p.netSalary))}
                                            </p>
                                        </div>
                                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${p.status === 'PAID' ? 'bg-green-100 text-green-700' :
                                            p.status === 'PROCESSED' ? 'bg-blue-100 text-blue-700' :
                                                'bg-yellow-100 text-yellow-700'
                                            }`}>
                                            {p.status}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="rounded-xl border border-gray-200 bg-white p-6">
                        <h3 className="text-lg font-semibold text-gray-900">{t('hr.employeeDetail.actions')}</h3>
                        <div className="mt-4 space-y-3">
                            <button
                                onClick={openEditForm}
                                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                            >
                                <Pencil className="h-4 w-4" />
                                {t('hr.employeeDetail.editProfile')}
                            </button>
                            <button
                                onClick={() => router.push(`/dashboard/hr/payroll?employeeId=${params.id}`)}
                                className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                            >
                                <FileText className="h-4 w-4" />
                                {t('hr.employeeDetail.viewPayslip')}
                            </button>
                            <button
                                onClick={() => router.push(`/dashboard/hr/attendance?employeeId=${params.id}`)}
                                className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                            >
                                <BarChart3 className="h-4 w-4" />
                                {t('hr.employeeDetail.attendanceHistory')}
                            </button>
                            {canMutate && (
                                <button onClick={handleDelete} className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50">
                                    <Trash2 className="h-4 w-4" />
                                    {t('hr.employeeDetail.delete')}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
