'use client'

import { useState, useEffect } from 'react'
import { formatCurrency } from '@/lib/utils'
import { LoadingSkeleton } from '@/components/ui/loading-skeleton'
import { useTranslation } from '@/lib/i18n'
import {
    Download,
    Play,
    AlertTriangle,
} from 'lucide-react'

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
    const [payrollData, setPayrollData] = useState<PayrollRecord[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [filterStatus, setFilterStatus] = useState('all')

    const statusConfig = {
        pending: { label: t('hr.payroll.pending') || 'Belum Diproses', color: 'bg-yellow-100 text-yellow-700' },
        processed: { label: t('hr.payroll.processed') || 'Sudah Diproses', color: 'bg-blue-100 text-blue-700' },
        paid: { label: t('hr.payroll.paid') || 'Sudah Dibayar', color: 'bg-green-100 text-green-700' },
    }

    const fetchPayroll = async () => {
        try {
            setLoading(true)
            const params = new URLSearchParams()
            if (filterStatus !== 'all') params.set('status', filterStatus)

            const res = await fetch(`/api/hr/payroll?${params.toString()}`)
            const data = await res.json()

            if (data.success) {
                setPayrollData(data.data)
            }
        } catch {
            setError('Gagal memuat data payroll')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchPayroll()
    }, [filterStatus])

    const filteredData = payrollData.filter(p => filterStatus === 'all' || p.status === filterStatus)
    const totalNetSalary = payrollData.reduce((sum, p) => sum + p.netSalary, 0)
    const totalProcessed = payrollData.filter(p => p.status === 'processed' || p.status === 'paid').reduce((sum, p) => sum + p.netSalary, 0)
    const totalPending = payrollData.filter(p => p.status === 'pending').reduce((sum, p) => sum + p.netSalary, 0)

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
                    <div className="mt-1 text-2xl font-bold text-blue-700">{formatCurrency(Math.round(totalNetSalary / payrollData.length))}</div>
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

            {/* Payroll Table */}
            <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
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
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredData.map((record) => (
                                <tr key={record.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4">
                                        <div className="font-medium text-gray-900">{record.employeeName}</div>
                                        <div className="text-xs text-gray-500">{record.id}</div>
                                    </td>
                                    <td className="px-6 py-4 text-right text-sm text-gray-600">{formatCurrency(record.baseSalary)}</td>
                                    <td className="px-6 py-4 text-right text-sm text-green-600">+{formatCurrency(record.allowances)}</td>
                                    <td className="px-6 py-4 text-right text-sm text-red-600">-{formatCurrency(record.deductions)}</td>
                                    <td className="px-6 py-4 text-right text-sm font-semibold text-gray-900">{formatCurrency(record.netSalary)}</td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusConfig[record.status].color}`}>
                                            {statusConfig[record.status].label}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button className="text-sm text-blue-600 hover:text-blue-700">{t('hr.payroll.payslip') || 'Slip Gaji'}</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot className="bg-gray-50 border-t border-gray-200">
                            <tr>
                                <td className="px-6 py-4 font-semibold text-gray-900">{t('hr.payroll.total') || 'Total'}</td>
                                <td className="px-6 py-4 text-right text-sm font-semibold text-gray-900">
                                    {formatCurrency(filteredData.reduce((sum, p) => sum + p.baseSalary, 0))}
                                </td>
                                <td className="px-6 py-4 text-right text-sm font-semibold text-green-600">
                                    +{formatCurrency(filteredData.reduce((sum, p) => sum + p.allowances, 0))}
                                </td>
                                <td className="px-6 py-4 text-right text-sm font-semibold text-red-600">
                                    -{formatCurrency(filteredData.reduce((sum, p) => sum + p.deductions, 0))}
                                </td>
                                <td className="px-6 py-4 text-right text-sm font-bold text-gray-900">
                                    {formatCurrency(filteredData.reduce((sum, p) => sum + p.netSalary, 0))}
                                </td>
                                <td colSpan={2}></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
        </div>
    )
}
