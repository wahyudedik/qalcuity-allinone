'use client'

import { useState, useEffect, useCallback } from 'react'
import { formatCurrency } from '@/lib/utils'
import { LoadingSkeleton } from '@/components/ui/loading-skeleton'
import { useTranslation } from '@/lib/i18n'
import {
    Download,
    Play,
    AlertTriangle,
    Trash2,
    Check,
    X,
    Loader2,
} from 'lucide-react'
import { useSession } from 'next-auth/react'

interface PayrollRecord {
    id: string
    employeeName: string
    period: string
    baseSalary: number
    allowances: number
    deductions: number
    netSalary: number
    status: 'pending' | 'processed' | 'paid'
}

export default function PayrollPage() {
    const { t } = useTranslation()
    const { data: session } = useSession()
    const canMutate = session?.user?.role !== 'VIEWER'
    const [payrollData, setPayrollData] = useState<PayrollRecord[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [filterStatus, setFilterStatus] = useState('all')
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 3000)
            return () => clearTimeout(timer)
        }
    }, [toast])

    const statusConfig = {
        pending: { label: t('hr.payroll.pending') || 'Belum Diproses', color: 'bg-yellow-100 text-yellow-700' },
        processed: { label: t('hr.payroll.processed') || 'Sudah Diproses', color: 'bg-blue-100 text-blue-700' },
        paid: { label: t('hr.payroll.paid') || 'Sudah Dibayar', color: 'bg-green-100 text-green-700' },
    }

    const fetchPayroll = useCallback(async () => {
        try {
            setLoading(true)
            setError(null)
            const params = new URLSearchParams()
            if (filterStatus !== 'all') params.set('status', filterStatus)

            const res = await fetch(`/api/hr/payroll?${params.toString()}`)
            const data = await res.json()

            if (data.success) {
                setPayrollData(data.data)
            } else {
                setError(data.error || 'Gagal memuat data payroll')
            }
        } catch {
            setError('Gagal memuat data payroll. Periksa koneksi jaringan Anda.')
        } finally {
            setLoading(false)
        }
    }, [filterStatus])

    useEffect(() => {
        fetchPayroll()
    }, [fetchPayroll])

    const handleDelete = async (id: string) => {
        if (!window.confirm('Apakah Anda yakin ingin menghapus data payroll ini?')) return
        try {
            const response = await fetch(`/api/hr/payroll/${id}`, { method: 'DELETE' })
            const result = await response.json()
            if (result.success) {
                fetchPayroll()
                setToast({ message: 'Data payroll berhasil dihapus', type: 'success' })
            } else {
                setToast({ message: `Gagal menghapus: ${result.error}`, type: 'error' })
            }
        } catch {
            setToast({ message: 'Gagal menghapus data payroll', type: 'error' })
        }
    }

    const filteredData = payrollData.filter(p => filterStatus === 'all' || p.status === filterStatus)

    // Safe calculations with NaN protection
    const totalNetSalary = payrollData.reduce((sum, p) => sum + (Number(p.netSalary) || 0), 0)
    const totalProcessed = payrollData.filter(p => p.status === 'processed' || p.status === 'paid').reduce((sum, p) => sum + (Number(p.netSalary) || 0), 0)
    const totalPending = payrollData.filter(p => p.status === 'pending').reduce((sum, p) => sum + (Number(p.netSalary) || 0), 0)
    const averageSalary = payrollData.length > 0 ? Math.round(totalNetSalary / payrollData.length) : 0

    if (loading) {
        return (
            <div className="space-y-6">
                <LoadingSkeleton lines={2} />
                <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
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
                <button onClick={fetchPayroll} className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
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
                    <h1 className="text-2xl font-bold text-gray-900">{t('hr.payroll.title') || 'Payroll'}</h1>
                    <p className="text-gray-500">{t('hr.payroll.subtitle') || 'Kelola gaji dan penggajian karyawan'}</p>
                </div>
                <div className="flex gap-3">
                    <button className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
                        <Download className="h-4 w-4" />
                        {t('hr.payroll.export') || 'Export'}
                    </button>
                    <button className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700">
                        <Play className="h-4 w-4" />
                        {t('hr.payroll.processPayroll') || 'Proses Payroll'}
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                <div className="rounded-xl border border-gray-200 bg-white p-5">
                    <div className="text-sm text-gray-500">{t('hr.payroll.totalSalaryThisMonth') || 'Total Gaji Bulan Ini'}</div>
                    <div className="mt-1 text-2xl font-bold text-gray-900">{formatCurrency(totalNetSalary)}</div>
                    <div className="mt-1 text-xs text-gray-400">{payrollData.length} {t('hr.payroll.employee') || 'karyawan'}</div>
                </div>
                <div className="rounded-xl border border-green-200 bg-green-50 p-5">
                    <div className="text-sm text-green-600">{t('hr.payroll.paid') || 'Sudah Dibayar'}</div>
                    <div className="mt-1 text-2xl font-bold text-green-700">{formatCurrency(totalProcessed)}</div>
                    <div className="mt-1 text-xs text-green-500">{payrollData.filter(p => p.status === 'processed' || p.status === 'paid').length} {t('hr.payroll.employee') || 'karyawan'}</div>
                </div>
                <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-5">
                    <div className="text-sm text-yellow-600">{t('hr.payroll.pending') || 'Belum Diproses'}</div>
                    <div className="mt-1 text-2xl font-bold text-yellow-700">{formatCurrency(totalPending)}</div>
                    <div className="mt-1 text-xs text-yellow-500">{payrollData.filter(p => p.status === 'pending').length} {t('hr.payroll.employee') || 'karyawan'}</div>
                </div>
                <div className="rounded-xl border border-blue-200 bg-blue-50 p-5">
                    <div className="text-sm text-blue-600">{t('hr.payroll.averageSalary') || 'Rata-rata Gaji'}</div>
                    <div className="mt-1 text-2xl font-bold text-blue-700">{formatCurrency(averageSalary)}</div>
                    <div className="mt-1 text-xs text-blue-500">{t('hr.payroll.perEmployee') || 'Per karyawan'}</div>
                </div>
            </div>

            {/* Filter */}
            <div className="flex items-center gap-4">
                <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
                >
                    <option value="all">{t('hr.payroll.allStatuses') || 'Semua Status'}</option>
                    <option value="pending">{t('hr.payroll.pending') || 'Belum Diproses'}</option>
                    <option value="processed">{t('hr.payroll.processed') || 'Sudah Diproses'}</option>
                    <option value="paid">{t('hr.payroll.paid') || 'Sudah Dibayar'}</option>
                </select>
            </div>

            {/* Kartu Payroll untuk tampilan mobile */}
            <div className="md:hidden space-y-3">
                {filteredData.length === 0 ? (
                    <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-gray-500">
                        <Play className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500 mb-4" />
                        <p className="text-sm">Belum ada data payroll</p>
                    </div>
                ) : (
                    filteredData.map((record) => (
                        <div key={record.id} className="rounded-xl border border-gray-200 bg-white p-4">
                            <div className="flex items-start justify-between">
                                <div>
                                    <div className="font-medium text-gray-900">{record.employeeName}</div>
                                    <div className="text-xs text-gray-500">{record.period}</div>
                                </div>
                                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusConfig[record.status]?.color || 'bg-gray-100 text-gray-700'}`}>
                                    {statusConfig[record.status]?.label || record.status}
                                </span>
                            </div>
                            <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                                <div>
                                    <span className="text-gray-500">{t('hr.payroll.baseSalary') || 'Gaji Pokok'}:</span>
                                    <span className="ml-1">{formatCurrency(Number(record.baseSalary) || 0)}</span>
                                </div>
                                <div>
                                    <span className="text-gray-500">{t('hr.payroll.allowances') || 'Tunjangan'}:</span>
                                    <span className="ml-1 text-green-600">+{formatCurrency(Number(record.allowances) || 0)}</span>
                                </div>
                                <div>
                                    <span className="text-gray-500">{t('hr.payroll.deductions') || 'Potongan'}:</span>
                                    <span className="ml-1 text-red-600">-{formatCurrency(Number(record.deductions) || 0)}</span>
                                </div>
                                <div>
                                    <span className="text-gray-500">{t('hr.payroll.netSalary') || 'Gaji Bersih'}:</span>
                                    <span className="ml-1 font-semibold">{formatCurrency(Number(record.netSalary) || 0)}</span>
                                </div>
                            </div>
                            <div className="mt-3 flex justify-end">
                                <button
                                    onClick={() => handleDelete(record.id)}
                                    className="text-sm text-red-500 hover:text-red-700"
                                >
                                    {t('common.delete') || 'Hapus'}
                                </button>
                            </div>
                        </div>
                    ))
                )}
                {/* Total Card Mobile */}
                {filteredData.length > 0 && (
                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                        <div className="grid grid-cols-2 gap-2 text-sm font-semibold">
                            <div className="text-gray-900">{t('hr.payroll.total') || 'Total'}</div>
                            <div></div>
                            <div>
                                <span className="text-gray-500">{t('hr.payroll.netSalary') || 'Gaji Bersih'}:</span>
                                <span className="ml-1">{formatCurrency(filteredData.reduce((sum, p) => sum + (Number(p.netSalary) || 0), 0))}</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Tabel Payroll untuk tampilan desktop */}
            <div className="hidden md:block rounded-xl border border-gray-200 bg-white overflow-hidden">
                {filteredData.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                        <Play className="h-12 w-12 text-gray-400 dark:text-gray-500 mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">Belum ada data payroll</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Data payroll akan muncul setelah proses penggajian dilakukan</p>
                        <button className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                            <Play className="h-4 w-4" />
                            Proses Payroll
                        </button>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('hr.employees.title') || 'Karyawan'}</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('hr.payroll.baseSalary') || 'Gaji Pokok'}</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('hr.payroll.allowances') || 'Tunjangan'}</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('hr.payroll.deductions') || 'Potongan'}</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('hr.payroll.netSalary') || 'Gaji Bersih'}</th>
                                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">{t('hr.employees.status') || 'Status'}</th>
                                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredData.map((record) => (
                                    <tr key={record.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-gray-900">{record.employeeName}</div>
                                            <div className="text-xs text-gray-500">{record.period}</div>
                                        </td>
                                        <td className="px-6 py-4 text-right text-sm text-gray-600">{formatCurrency(Number(record.baseSalary) || 0)}</td>
                                        <td className="px-6 py-4 text-right text-sm text-green-600">+{formatCurrency(Number(record.allowances) || 0)}</td>
                                        <td className="px-6 py-4 text-right text-sm text-red-600">-{formatCurrency(Number(record.deductions) || 0)}</td>
                                        <td className="px-6 py-4 text-right text-sm font-semibold text-gray-900">{formatCurrency(Number(record.netSalary) || 0)}</td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusConfig[record.status]?.color || 'bg-gray-100 text-gray-700'}`}>
                                                {statusConfig[record.status]?.label || record.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {canMutate && (
                                                <button
                                                    onClick={() => handleDelete(record.id)}
                                                    className="text-red-500 hover:text-red-700"
                                                    title="Hapus"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot className="bg-gray-50 border-t border-gray-200">
                                <tr>
                                    <td className="px-6 py-4 font-semibold text-gray-900">{t('hr.payroll.total') || 'Total'}</td>
                                    <td className="px-6 py-4 text-right text-sm font-semibold text-gray-900">
                                        {formatCurrency(filteredData.reduce((sum, p) => sum + (Number(p.baseSalary) || 0), 0))}
                                    </td>
                                    <td className="px-6 py-4 text-right text-sm font-semibold text-green-600">
                                        +{formatCurrency(filteredData.reduce((sum, p) => sum + (Number(p.allowances) || 0), 0))}
                                    </td>
                                    <td className="px-6 py-4 text-right text-sm font-semibold text-red-600">
                                        -{formatCurrency(filteredData.reduce((sum, p) => sum + (Number(p.deductions) || 0), 0))}
                                    </td>
                                    <td className="px-6 py-4 text-right text-sm font-bold text-gray-900">
                                        {formatCurrency(filteredData.reduce((sum, p) => sum + (Number(p.netSalary) || 0), 0))}
                                    </td>
                                    <td colSpan={2}></td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                )}
            </div>

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
