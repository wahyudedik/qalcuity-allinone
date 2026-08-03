'use client'

import { useState } from 'react'

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

const payrollData: PayrollRecord[] = [
    { id: 'PAY-001', employeeName: 'Ahmad Rizky', period: 'Agustus 2026', baseSalary: 15000000, allowances: 2000000, deductions: 1500000, netSalary: 15500000, status: 'processed' },
    { id: 'PAY-002', employeeName: 'Siti Nurhaliza', period: 'Agustus 2026', baseSalary: 18000000, allowances: 2500000, deductions: 1800000, netSalary: 18700000, status: 'processed' },
    { id: 'PAY-003', employeeName: 'Budi Santoso', period: 'Agustus 2026', baseSalary: 12000000, allowances: 1500000, deductions: 1200000, netSalary: 12300000, status: 'paid' },
    { id: 'PAY-004', employeeName: 'Dewi Lestari', period: 'Agustus 2026', baseSalary: 16000000, allowances: 2200000, deductions: 1600000, netSalary: 16600000, status: 'paid' },
    { id: 'PAY-005', employeeName: 'Eko Prasetyo', period: 'Agustus 2026', baseSalary: 14000000, allowances: 1800000, deductions: 1400000, netSalary: 14400000, status: 'pending' },
    { id: 'PAY-006', employeeName: 'Fitri Handayani', period: 'Agustus 2026', baseSalary: 13000000, allowances: 1600000, deductions: 1300000, netSalary: 13300000, status: 'pending' },
    { id: 'PAY-007', employeeName: 'Hana Permata', period: 'Agustus 2026', baseSalary: 11000000, allowances: 1400000, deductions: 1100000, netSalary: 11300000, status: 'pending' },
]

export default function PayrollPage() {
    const [filterStatus, setFilterStatus] = useState('all')

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount)
    }

    const statusConfig = {
        pending: { label: 'Belum Diproses', color: 'bg-yellow-100 text-yellow-700' },
        processed: { label: 'Sudah Diproses', color: 'bg-blue-100 text-blue-700' },
        paid: { label: 'Sudah Dibayar', color: 'bg-green-100 text-green-700' },
    }

    const filteredData = payrollData.filter(p => filterStatus === 'all' || p.status === filterStatus)
    const totalNetSalary = payrollData.reduce((sum, p) => sum + p.netSalary, 0)
    const totalProcessed = payrollData.filter(p => p.status === 'processed' || p.status === 'paid').reduce((sum, p) => sum + p.netSalary, 0)
    const totalPending = payrollData.filter(p => p.status === 'pending').reduce((sum, p) => sum + p.netSalary, 0)

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Payroll</h1>
                    <p className="text-gray-500">Kelola gaji dan penggajian karyawan</p>
                </div>
                <div className="flex gap-3">
                    <button className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
                        <span>⬇</span>
                        Export
                    </button>
                    <button className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700">
                        <span>▶</span>
                        Proses Payroll
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                <div className="rounded-xl border border-gray-200 bg-white p-5">
                    <div className="text-sm text-gray-500">Total Gaji Bulan Ini</div>
                    <div className="mt-1 text-2xl font-bold text-gray-900">{formatCurrency(totalNetSalary)}</div>
                    <div className="mt-1 text-xs text-gray-400">{payrollData.length} karyawan</div>
                </div>
                <div className="rounded-xl border border-green-200 bg-green-50 p-5">
                    <div className="text-sm text-green-600">Sudah Dibayar</div>
                    <div className="mt-1 text-2xl font-bold text-green-700">{formatCurrency(totalProcessed)}</div>
                    <div className="mt-1 text-xs text-green-500">{payrollData.filter(p => p.status === 'processed' || p.status === 'paid').length} karyawan</div>
                </div>
                <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-5">
                    <div className="text-sm text-yellow-600">Belum Diproses</div>
                    <div className="mt-1 text-2xl font-bold text-yellow-700">{formatCurrency(totalPending)}</div>
                    <div className="mt-1 text-xs text-yellow-500">{payrollData.filter(p => p.status === 'pending').length} karyawan</div>
                </div>
                <div className="rounded-xl border border-blue-200 bg-blue-50 p-5">
                    <div className="text-sm text-blue-600">Rata-rata Gaji</div>
                    <div className="mt-1 text-2xl font-bold text-blue-700">{formatCurrency(Math.round(totalNetSalary / payrollData.length))}</div>
                    <div className="mt-1 text-xs text-blue-500">Per karyawan</div>
                </div>
            </div>

            {/* Filter */}
            <div className="flex items-center gap-4">
                <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
                >
                    <option value="all">Semua Status</option>
                    <option value="pending">Belum Diproses</option>
                    <option value="processed">Sudah Diproses</option>
                    <option value="paid">Sudah Dibayar</option>
                </select>
            </div>

            {/* Payroll Table */}
            <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Karyawan</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Gaji Pokok</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Tunjangan</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Potongan</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Gaji Bersih</th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
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
                                        <button className="text-sm text-blue-600 hover:text-blue-700">Slip Gaji</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot className="bg-gray-50 border-t border-gray-200">
                            <tr>
                                <td className="px-6 py-4 font-semibold text-gray-900">Total</td>
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
