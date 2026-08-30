'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { formatCurrency, formatDate } from '@/lib/utils'
import { useTranslation } from '@/lib/i18n'
import { Star, Pencil, FileText, BarChart3, ArrowLeft, Mail, Phone, MapPin, Building2, Calendar, Trash2 } from 'lucide-react'
import { useSession } from 'next-auth/react'

interface EmployeeDetail {
    id: string
    firstName: string
    lastName: string
    email: string
    phone: string
    department: string
    position: string
    joinDate: string
    status: string
    salary: number
    address: string
    emergencyContact: string
    emergencyPhone: string
    skills: string[]
    performance: { rating: number; lastReview: string }
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

    useEffect(() => {
        const fetchEmployee = async () => {
            try {
                const response = await fetch(`/api/hr/employees/${params.id}`)
                const data = await response.json()
                if (data.success) {
                    setEmployee(data.data)
                } else {
                    setError(t('hr.employeeDetail.error'))
                }
            } catch {
                setError(t('hr.employeeDetail.errorLoad'))
            } finally {
                setLoading(false)
            }
        }
        fetchEmployee()
    }, [params.id, t])

    const handleDelete = async () => {
        if (!window.confirm(t('hr.employeeDetail.confirmDelete'))) return
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

    const fullName = `${employee.firstName} ${employee.lastName}`

    return (
        <div className="space-y-6 p-6">
            {/* Header */}
            <div>
                <Link href="/dashboard/hr/employees" className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900">
                    <ArrowLeft className="h-4 w-4" />
                    {t('hr.employeeDetail.backToEmployees')}
                </Link>
                <div className="mt-4 flex items-center gap-4">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-xl font-bold text-blue-600">
                        {employee.firstName[0]}{employee.lastName[0]}
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">{fullName}</h1>
                        <p className="text-sm text-gray-500">{employee.position} • {employee.department}</p>
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
                                    <p className="font-medium text-gray-900">{employee.email}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Phone className="h-4 w-4 text-gray-400" />
                                <div>
                                    <p className="text-sm text-gray-500">{t('hr.employeeDetail.phone')}</p>
                                    <p className="font-medium text-gray-900">{employee.phone}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-2 sm:col-span-2">
                                <MapPin className="mt-1 h-4 w-4 text-gray-400" />
                                <div>
                                    <p className="text-sm text-gray-500">{t('hr.employeeDetail.address')}</p>
                                    <p className="font-medium text-gray-900">{employee.address}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Emergency Contact */}
                    <div className="rounded-xl border border-gray-200 bg-white p-6">
                        <h3 className="text-lg font-semibold text-gray-900">{t('hr.employeeDetail.emergencyContact')}</h3>
                        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div>
                                <p className="text-sm text-gray-500">{t('hr.employeeDetail.emergencyContact')}</p>
                                <p className="font-medium text-gray-900">{employee.emergencyContact}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">{t('hr.employeeDetail.emergencyPhone')}</p>
                                <p className="font-medium text-gray-900">{employee.emergencyPhone}</p>
                            </div>
                        </div>
                    </div>

                    {/* Skills */}
                    {employee.skills.length > 0 && (
                        <div className="rounded-xl border border-gray-200 bg-white p-6">
                            <h3 className="text-lg font-semibold text-gray-900">{t('hr.employeeDetail.skills')}</h3>
                            <div className="mt-4 flex flex-wrap gap-2">
                                {employee.skills.map((skill) => (
                                    <span key={skill} className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700">
                                        {skill}
                                    </span>
                                ))}
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
                                <span className="text-sm font-medium text-gray-900">{employee.department}</span>
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
                                <span className="font-mono text-sm text-gray-900">{employee.id}</span>
                            </div>
                        </div>
                    </div>

                    {/* Compensation */}
                    <div className="rounded-xl border border-gray-200 bg-white p-6">
                        <h3 className="text-lg font-semibold text-gray-900">{t('hr.employeeDetail.compensation')}</h3>
                        <div className="mt-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-500">{t('hr.employeeDetail.baseSalary')}</span>
                                <span className="text-sm font-medium text-gray-900">{formatCurrency(employee.salary)}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-500">{t('hr.employeeDetail.thr')}</span>
                                <span className="text-sm font-medium text-gray-900">{formatCurrency(employee.salary)}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-500">{t('hr.employeeDetail.bpjs')}</span>
                                <span className="text-sm font-medium text-green-600">{t('hr.employeeDetail.fullCoverage')}</span>
                            </div>
                        </div>
                    </div>

                    {/* Performance */}
                    <div className="rounded-xl border border-gray-200 bg-white p-6">
                        <h3 className="text-lg font-semibold text-gray-900">{t('hr.employeeDetail.performance')}</h3>
                        <div className="mt-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-500">{t('hr.employeeDetail.rating')}</span>
                                <span className="flex items-center gap-1 text-lg font-bold text-yellow-500">
                                    {Array.from({ length: Math.round(employee.performance.rating) }).map((_, i) => (
                                        <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                    ))}
                                    <span className="ml-1">{employee.performance.rating}</span>
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-500">{t('hr.employeeDetail.lastReview')}</span>
                                <span className="text-sm text-gray-900">{formatDate(employee.performance.lastReview)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="rounded-xl border border-gray-200 bg-white p-6">
                        <h3 className="text-lg font-semibold text-gray-900">{t('hr.employeeDetail.actions')}</h3>
                        <div className="mt-4 space-y-3">
                            <button className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
                                <Pencil className="h-4 w-4" />
                                {t('hr.employeeDetail.editProfile')}
                            </button>
                            <button className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                                <FileText className="h-4 w-4" />
                                {t('hr.employeeDetail.viewPayslip')}
                            </button>
                            <button className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
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
