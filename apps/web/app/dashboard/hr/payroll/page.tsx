'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { formatCurrency } from '@/lib/utils'
import { LoadingSkeleton } from '@/components/ui/loading-skeleton'
import { useTranslation } from '@/lib/i18n'
import { exportToCSV } from '@/lib/export'
import {
    Download,
    Play,
    AlertTriangle,
    Trash2,
    Check,
    X,
    Loader2,
    Calculator,
    List,
    ChevronDown,
    ChevronUp,
    Save,
    RefreshCw,
    Building2,
    Shield,
    PiggyBank,
    Receipt,
} from 'lucide-react'
import { useSession } from 'next-auth/react'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

// ============================================
// Types
// ============================================

interface PayrollRecord {
    id: string
    employeeName: string
    employeeId?: string
    position?: string
    department?: string
    period: string
    baseSalary: number
    allowances: number
    deductions: number
    netSalary: number
    status: 'pending' | 'processed' | 'paid'
    paidAt?: string | null
    notes?: string
}

interface Employee {
    id: string
    name: string
    employeeId: string
    position: string
    department: string
    salary: number
}

interface PayrollCalculationResult {
    employeeId: string
    employeeName: string
    employeeCode: string
    period: string
    baseSalary: number
    allowances: {
        transport: number
        meal: number
        other: number
        total: number
    }
    deductions: {
        late: number
        absent: number
        other: number
        total: number
    }
    bonus: number
    grossSalary: number
    pph21: {
        statusKawin: string
        ptkpYearly: number
        pkpYearly: number
        pph21Yearly: number
        pph21Monthly: number
        effectiveRate: number
    }
    bpjs: {
        kesehatan: {
            employee: number
            employer: number
        }
        ketenagakerjaan: {
            jkk: number
            jkm: number
            jhtEmployee: number
            jhtEmployer: number
            jpEmployee: number
            jpEmployer: number
            totalEmployee: number
            totalEmployer: number
        }
        totalEmployee: number
        totalEmployer: number
    }
    totalDeductions: number
    totalAllowances: number
    netSalary: number
}

// ============================================
// Status Kawin Options
// ============================================

const STATUS_KAWIN_OPTIONS = [
    { value: 'TK/0', label: 'TK/0 (Belum Kawin, 0 Tanggungan)', ptkp: 54000000 },
    { value: 'TK/1', label: 'TK/1 (Belum Kawin, 1 Tanggungan)', ptkp: 58500000 },
    { value: 'TK/2', label: 'TK/2 (Belum Kawin, 2 Tanggungan)', ptkp: 63000000 },
    { value: 'TK/3', label: 'TK/3 (Belum Kawin, 3 Tanggungan)', ptkp: 67500000 },
    { value: 'K/0', label: 'K/0 (Kawin, 0 Tanggungan)', ptkp: 58500000 },
    { value: 'K/1', label: 'K/1 (Kawin, 1 Tanggungan)', ptkp: 63000000 },
    { value: 'K/2', label: 'K/2 (Kawin, 2 Tanggungan)', ptkp: 67500000 },
    { value: 'K/3', label: 'K/3 (Kawin, 3 Tanggungan)', ptkp: 72000000 },
]

const JKK_RISK_OPTIONS = [
    { value: 'low', label: 'Rendah (0.24%)' },
    { value: 'medium', label: 'Sedang (0.89%)' },
    { value: 'high', label: 'Tinggi (1.74%)' },
]

// ============================================
// Main Component
// ============================================

export default function PayrollPage() {
    const { t } = useTranslation()
    const { data: session } = useSession()
    const canMutate = session?.user?.role !== 'VIEWER'

    // Tab state
    const [activeTab, setActiveTab] = useState<'list' | 'calculate'>('list')

    // List tab states
    const [payrollData, setPayrollData] = useState<PayrollRecord[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [filterStatus, setFilterStatus] = useState('all')
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
    const [processing, setProcessing] = useState(false)
    const [showProcessConfirm, setShowProcessConfirm] = useState(false)
    const [pendingCount, setPendingCount] = useState(0)
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
    const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)

    // Calculator tab states
    const [employees, setEmployees] = useState<Employee[]>([])
    const [employeesLoading, setEmployeesLoading] = useState(false)
    const [calcForm, setCalcForm] = useState({
        employeeId: '',
        period: new Date().toISOString().slice(0, 7), // YYYY-MM
        baseSalary: 0,
        transportAllowance: 0,
        mealAllowance: 0,
        otherAllowance: 0,
        lateDeduction: 0,
        absentDeduction: 0,
        otherDeduction: 0,
        bonus: 0,
        statusKawin: 'TK/0',
        jkkRiskLevel: 'low' as 'low' | 'medium' | 'high',
        notes: '',
    })
    const [calcResult, setCalcResult] = useState<PayrollCalculationResult | null>(null)
    const [calculating, setCalculating] = useState(false)
    const [saving, setSaving] = useState(false)
    const [showBreakdown, setShowBreakdown] = useState(true)
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    // ============================================
    // Toast effect
    // ============================================
    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 3000)
            return () => clearTimeout(timer)
        }
    }, [toast])

    // ============================================
    // Fetch employees for calculator
    // ============================================
    const fetchEmployees = useCallback(async () => {
        setEmployeesLoading(true)
        try {
            const res = await fetch('/api/hr/employees?limit=100')
            const data = await res.json()
            if (data.success) {
                setEmployees(data.data.map((e: Record<string, unknown>) => ({
                    id: e.id,
                    name: e.name,
                    employeeId: e.employeeId,
                    position: e.position || '-',
                    department: e.department || '-',
                    salary: Number(e.salary) || 0,
                })))
            }
        } catch {
            // Silent fail
        } finally {
            setEmployeesLoading(false)
        }
    }, [])

    useEffect(() => {
        if (activeTab === 'calculate' && employees.length === 0) {
            fetchEmployees()
        }
    }, [activeTab, employees.length, fetchEmployees])

    // ============================================
    // Auto-calculate on form change
    // ============================================
    useEffect(() => {
        if (debounceRef.current) {
            clearTimeout(debounceRef.current)
        }

        if (!calcForm.employeeId || calcForm.baseSalary <= 0) {
            setCalcResult(null)
            return
        }

        debounceRef.current = setTimeout(async () => {
            setCalculating(true)
            try {
                const res = await fetch('/api/hr/payroll/calculate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        employeeId: calcForm.employeeId,
                        period: calcForm.period,
                        baseSalary: calcForm.baseSalary,
                        transportAllowance: calcForm.transportAllowance,
                        mealAllowance: calcForm.mealAllowance,
                        otherAllowance: calcForm.otherAllowance,
                        lateDeduction: calcForm.lateDeduction,
                        absentDeduction: calcForm.absentDeduction,
                        otherDeduction: calcForm.otherDeduction,
                        bonus: calcForm.bonus,
                        statusKawin: calcForm.statusKawin,
                        jkkRiskLevel: calcForm.jkkRiskLevel,
                    }),
                })
                const data = await res.json()
                if (data.success) {
                    setCalcResult(data.data)
                } else {
                    setCalcResult(null)
                }
            } catch {
                setCalcResult(null)
            } finally {
                setCalculating(false)
            }
        }, 500)

        return () => {
            if (debounceRef.current) {
                clearTimeout(debounceRef.current)
            }
        }
    }, [calcForm])

    // ============================================
    // Save payroll record
    // ============================================
    const handleSavePayroll = async () => {
        if (!calcResult) return
        setSaving(true)
        try {
            const res = await fetch('/api/hr/payroll', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    employeeId: calcResult.employeeId,
                    period: calcResult.period,
                    baseSalary: calcResult.baseSalary,
                    allowances: calcResult.totalAllowances,
                    deductions: calcResult.totalDeductions,
                    bonus: calcResult.bonus,
                    notes: calcForm.notes || `Auto-calculated: PPh21=${calcResult.pph21.pph21Monthly}, BPJS=${calcResult.bpjs.totalEmployee}`,
                }),
            })
            const data = await res.json()
            if (data.success) {
                setToast({ message: 'Payroll berhasil disimpan', type: 'success' })
                // Reset form
                setCalcForm(prev => ({
                    ...prev,
                    baseSalary: 0,
                    transportAllowance: 0,
                    mealAllowance: 0,
                    otherAllowance: 0,
                    lateDeduction: 0,
                    absentDeduction: 0,
                    otherDeduction: 0,
                    bonus: 0,
                    notes: '',
                }))
                setCalcResult(null)
                // Refresh list if on list tab
                fetchPayroll()
            } else {
                setToast({ message: data.error || 'Gagal menyimpan payroll', type: 'error' })
            }
        } catch {
            setToast({ message: 'Gagal menyimpan payroll', type: 'error' })
        } finally {
            setSaving(false)
        }
    }

    // ============================================
    // List tab: Export
    // ============================================
    const handleExport = () => {
        if (filteredData.length === 0) {
            setToast({ message: 'Tidak ada data untuk di-export', type: 'error' })
            return
        }
        const csvData = filteredData.map(record => ({
            'Karyawan': record.employeeName,
            'Periode': record.period,
            'Gaji Pokok': record.baseSalary,
            'Tunjangan': record.allowances,
            'Potongan': record.deductions,
            'Gaji Bersih': record.netSalary,
            'Status': statusConfig[record.status]?.label || record.status,
        }))
        exportToCSV(csvData, `payroll-${new Date().toISOString().split('T')[0]}`)
        setToast({ message: 'Data payroll berhasil di-export', type: 'success' })
    }

    // ============================================
    // List tab: Process Payroll
    // ============================================
    const handleProcessPayroll = () => {
        const pendingRecords = payrollData.filter(p => p.status === 'pending')
        if (pendingRecords.length === 0) {
            setToast({ message: 'Tidak ada payroll yang perlu diproses', type: 'error' })
            return
        }
        setPendingCount(pendingRecords.length)
        setShowProcessConfirm(true)
    }

    const confirmProcess = async () => {
        const pendingRecords = payrollData.filter(p => p.status === 'pending')
        setShowProcessConfirm(false)
        setProcessing(true)
        try {
            const results = await Promise.all(
                pendingRecords.map(record =>
                    fetch('/api/hr/payroll', {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ id: record.id, status: 'processed' }),
                    }).then(r => r.json())
                )
            )
            const succeeded = results.filter(r => r.success).length
            const failed = results.filter(r => !r.success).length
            fetchPayroll()
            if (failed === 0) {
                setToast({ message: `${succeeded} payroll berhasil diproses`, type: 'success' })
            } else {
                setToast({ message: `${succeeded} berhasil, ${failed} gagal diproses`, type: 'error' })
            }
        } catch {
            setToast({ message: 'Gagal memproses payroll', type: 'error' })
        } finally {
            setProcessing(false)
        }
    }

    // ============================================
    // List tab: Status config
    // ============================================
    const statusConfig = {
        pending: { label: t('hr.payroll.pending') || 'Belum Diproses', color: 'bg-yellow-100 text-yellow-700' },
        processed: { label: t('hr.payroll.processed') || 'Sudah Diproses', color: 'bg-blue-100 text-blue-700' },
        paid: { label: t('hr.payroll.paid') || 'Sudah Dibayar', color: 'bg-green-100 text-green-700' },
    }

    // ============================================
    // List tab: Fetch payroll data
    // ============================================
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
        if (activeTab === 'list') {
            fetchPayroll()
        }
    }, [fetchPayroll, activeTab])

    // ============================================
    // List tab: Delete
    // ============================================
    const handleDelete = (id: string) => {
        setDeleteTargetId(id)
        setShowDeleteConfirm(true)
    }

    const confirmDelete = async () => {
        if (!deleteTargetId) return
        setShowDeleteConfirm(false)
        try {
            const response = await fetch(`/api/hr/payroll/${deleteTargetId}`, { method: 'DELETE' })
            const result = await response.json()
            if (result.success) {
                fetchPayroll()
                setToast({ message: 'Data payroll berhasil dihapus', type: 'success' })
            } else {
                setToast({ message: `Gagal menghapus: ${result.error}`, type: 'error' })
            }
        } catch {
            setToast({ message: 'Gagal menghapus data payroll', type: 'error' })
        } finally {
            setDeleteTargetId(null)
        }
    }

    const filteredData = payrollData.filter(p => filterStatus === 'all' || p.status === filterStatus)

    // Safe calculations with NaN protection
    const totalNetSalary = payrollData.reduce((sum, p) => sum + (Number(p.netSalary) || 0), 0)
    const totalProcessed = payrollData.filter(p => p.status === 'processed' || p.status === 'paid').reduce((sum, p) => sum + (Number(p.netSalary) || 0), 0)
    const totalPending = payrollData.filter(p => p.status === 'pending').reduce((sum, p) => sum + (Number(p.netSalary) || 0), 0)
    const averageSalary = payrollData.length > 0 ? Math.round(totalNetSalary / payrollData.length) : 0

    // ============================================
    // Helper: handle form change
    // ============================================
    const handleFormChange = (field: string, value: string | number) => {
        setCalcForm(prev => ({ ...prev, [field]: value }))
    }

    const handleEmployeeSelect = (employeeId: string) => {
        const emp = employees.find(e => e.id === employeeId)
        if (emp) {
            setCalcForm(prev => ({
                ...prev,
                employeeId: emp.id,
                baseSalary: emp.salary || 0,
            }))
        }
    }

    // ============================================
    // Loading state
    // ============================================
    if (loading && activeTab === 'list') {
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

    // ============================================
    // Error state
    // ============================================
    if (error && activeTab === 'list') {
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
                    {activeTab === 'list' && (
                        <>
                            <button
                                onClick={handleExport}
                                className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                            >
                                <Download className="h-4 w-4" />
                                {t('hr.payroll.export') || 'Export'}
                            </button>
                            <button
                                onClick={handleProcessPayroll}
                                disabled={processing}
                                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                                {processing ? 'Memproses...' : (t('hr.payroll.processPayroll') || 'Proses Payroll')}
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex border-b border-gray-200">
                <button
                    onClick={() => setActiveTab('list')}
                    className={`inline-flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                        activeTab === 'list'
                            ? 'border-blue-600 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                >
                    <List className="h-4 w-4" />
                    Daftar Payroll
                </button>
                {canMutate && (
                    <button
                        onClick={() => setActiveTab('calculate')}
                        className={`inline-flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                            activeTab === 'calculate'
                                ? 'border-blue-600 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                    >
                        <Calculator className="h-4 w-4" />
                        Hitung Payroll
                    </button>
                )}
            </div>

            {/* ============================================ */}
            {/* TAB: Daftar Payroll */}
            {/* ============================================ */}
            {activeTab === 'list' && (
                <>
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

                    {/* Mobile cards */}
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

                    {/* Desktop table */}
                    <div className="hidden md:block rounded-xl border border-gray-200 bg-white overflow-hidden">
                        {filteredData.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-center">
                                <Play className="h-12 w-12 text-gray-400 dark:text-gray-500 mb-4" />
                                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">Belum ada data payroll</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Data payroll akan muncul setelah proses penggajian dilakukan</p>
                                <button
                                    onClick={handleProcessPayroll}
                                    disabled={processing}
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
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
                </>
            )}

            {/* ============================================ */}
            {/* TAB: Hitung Payroll */}
            {/* ============================================ */}
            {activeTab === 'calculate' && (
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    {/* Form Section */}
                    <div className="space-y-6">
                        {/* Employee & Period */}
                        <div className="rounded-xl border border-gray-200 bg-white p-6">
                            <h3 className="mb-4 text-lg font-semibold text-gray-900">Data Karyawan & Periode</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Karyawan *</label>
                                    <select
                                        value={calcForm.employeeId}
                                        onChange={(e) => handleEmployeeSelect(e.target.value)}
                                        className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
                                        disabled={employeesLoading}
                                    >
                                        <option value="">
                                            {employeesLoading ? 'Memuat karyawan...' : 'Pilih karyawan'}
                                        </option>
                                        {employees.map(emp => (
                                            <option key={emp.id} value={emp.id}>
                                                {emp.name} ({emp.employeeId}) — {emp.position}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Periode *</label>
                                    <input
                                        type="month"
                                        value={calcForm.period}
                                        onChange={(e) => handleFormChange('period', e.target.value)}
                                        className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Base Salary */}
                        <div className="rounded-xl border border-gray-200 bg-white p-6">
                            <h3 className="mb-4 text-lg font-semibold text-gray-900">Gaji Pokok</h3>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Gaji Pokok (Rp) *</label>
                                <input
                                    type="number"
                                    value={calcForm.baseSalary || ''}
                                    onChange={(e) => handleFormChange('baseSalary', Number(e.target.value))}
                                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
                                    placeholder="Masukkan gaji pokok"
                                    min={0}
                                />
                            </div>
                        </div>

                        {/* Allowances */}
                        <div className="rounded-xl border border-gray-200 bg-white p-6">
                            <h3 className="mb-4 text-lg font-semibold text-gray-900">Tunjangan</h3>
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Transport</label>
                                    <input
                                        type="number"
                                        value={calcForm.transportAllowance || ''}
                                        onChange={(e) => handleFormChange('transportAllowance', Number(e.target.value))}
                                        className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
                                        placeholder="0"
                                        min={0}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Makan</label>
                                    <input
                                        type="number"
                                        value={calcForm.mealAllowance || ''}
                                        onChange={(e) => handleFormChange('mealAllowance', Number(e.target.value))}
                                        className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
                                        placeholder="0"
                                        min={0}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Lainnya</label>
                                    <input
                                        type="number"
                                        value={calcForm.otherAllowance || ''}
                                        onChange={(e) => handleFormChange('otherAllowance', Number(e.target.value))}
                                        className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
                                        placeholder="0"
                                        min={0}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Deductions */}
                        <div className="rounded-xl border border-gray-200 bg-white p-6">
                            <h3 className="mb-4 text-lg font-semibold text-gray-900">Potongan</h3>
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Terlambat</label>
                                    <input
                                        type="number"
                                        value={calcForm.lateDeduction || ''}
                                        onChange={(e) => handleFormChange('lateDeduction', Number(e.target.value))}
                                        className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
                                        placeholder="0"
                                        min={0}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Alpha</label>
                                    <input
                                        type="number"
                                        value={calcForm.absentDeduction || ''}
                                        onChange={(e) => handleFormChange('absentDeduction', Number(e.target.value))}
                                        className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
                                        placeholder="0"
                                        min={0}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Lainnya</label>
                                    <input
                                        type="number"
                                        value={calcForm.otherDeduction || ''}
                                        onChange={(e) => handleFormChange('otherDeduction', Number(e.target.value))}
                                        className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
                                        placeholder="0"
                                        min={0}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Bonus */}
                        <div className="rounded-xl border border-gray-200 bg-white p-6">
                            <h3 className="mb-4 text-lg font-semibold text-gray-900">Bonus</h3>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Bonus (Rp)</label>
                                <input
                                    type="number"
                                    value={calcForm.bonus || ''}
                                    onChange={(e) => handleFormChange('bonus', Number(e.target.value))}
                                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
                                    placeholder="0"
                                    min={0}
                                />
                            </div>
                        </div>

                        {/* Tax & BPJS Settings */}
                        <div className="rounded-xl border border-gray-200 bg-white p-6">
                            <h3 className="mb-4 text-lg font-semibold text-gray-900">Pajak & BPJS</h3>
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Status Kawin (PPh21)</label>
                                    <select
                                        value={calcForm.statusKawin}
                                        onChange={(e) => handleFormChange('statusKawin', e.target.value)}
                                        className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
                                    >
                                        {STATUS_KAWIN_OPTIONS.map(opt => (
                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Risiko JKK</label>
                                    <select
                                        value={calcForm.jkkRiskLevel}
                                        onChange={(e) => handleFormChange('jkkRiskLevel', e.target.value)}
                                        className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
                                    >
                                        {JKK_RISK_OPTIONS.map(opt => (
                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Notes */}
                        <div className="rounded-xl border border-gray-200 bg-white p-6">
                            <h3 className="mb-4 text-lg font-semibold text-gray-900">Catatan</h3>
                            <textarea
                                value={calcForm.notes}
                                onChange={(e) => handleFormChange('notes', e.target.value)}
                                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
                                rows={3}
                                placeholder="Catatan opsional..."
                            />
                        </div>
                    </div>

                    {/* Result Section */}
                    <div className="space-y-6">
                        {/* Calculating indicator */}
                        {calculating && (
                            <div className="rounded-xl border border-blue-200 bg-blue-50 p-6 text-center">
                                <Loader2 className="mx-auto h-8 w-8 animate-spin text-blue-600" />
                                <p className="mt-2 text-sm text-blue-600">Menghitung payroll...</p>
                            </div>
                        )}

                        {/* No result yet */}
                        {!calculating && !calcResult && (
                            <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
                                <Calculator className="mx-auto h-12 w-12 text-gray-400" />
                                <h3 className="mt-4 text-lg font-medium text-gray-900">Belum Ada Hasil</h3>
                                <p className="mt-2 text-sm text-gray-500">
                                    Pilih karyawan dan masukkan data gaji untuk menghitung payroll
                                </p>
                            </div>
                        )}

                        {/* Calculation Result */}
                        {calcResult && (
                            <>
                                {/* Net Salary Highlight */}
                                <div className="rounded-xl border border-green-200 bg-green-50 p-6">
                                    <div className="text-center">
                                        <div className="text-sm text-green-600 font-medium">Gaji Bersih</div>
                                        <div className="mt-2 text-4xl font-bold text-green-700">
                                            {formatCurrency(calcResult.netSalary)}
                                        </div>
                                        <div className="mt-1 text-xs text-green-500">
                                            {calcResult.employeeName} — {calcResult.period}
                                        </div>
                                    </div>
                                </div>

                                {/* Summary Cards */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="rounded-xl border border-gray-200 bg-white p-4">
                                        <div className="flex items-center gap-2 text-sm text-gray-500">
                                            <PiggyBank className="h-4 w-4" />
                                            Gaji Kotor
                                        </div>
                                        <div className="mt-1 text-xl font-bold text-gray-900">{formatCurrency(calcResult.grossSalary)}</div>
                                    </div>
                                    <div className="rounded-xl border border-gray-200 bg-white p-4">
                                        <div className="flex items-center gap-2 text-sm text-gray-500">
                                            <Receipt className="h-4 w-4" />
                                            PPh21
                                        </div>
                                        <div className="mt-1 text-xl font-bold text-red-600">-{formatCurrency(calcResult.pph21.pph21Monthly)}</div>
                                        <div className="text-xs text-gray-400">Efektif: {calcResult.pph21.effectiveRate}%</div>
                                    </div>
                                    <div className="rounded-xl border border-gray-200 bg-white p-4">
                                        <div className="flex items-center gap-2 text-sm text-gray-500">
                                            <Shield className="h-4 w-4" />
                                            BPJS (Karyawan)
                                        </div>
                                        <div className="mt-1 text-xl font-bold text-red-600">-{formatCurrency(calcResult.bpjs.totalEmployee)}</div>
                                    </div>
                                    <div className="rounded-xl border border-gray-200 bg-white p-4">
                                        <div className="flex items-center gap-2 text-sm text-gray-500">
                                            <Building2 className="h-4 w-4" />
                                            BPJS (Perusahaan)
                                        </div>
                                        <div className="mt-1 text-xl font-bold text-blue-600">{formatCurrency(calcResult.bpjs.totalEmployer)}</div>
                                    </div>
                                </div>

                                {/* Detailed Breakdown */}
                                <div className="rounded-xl border border-gray-200 bg-white">
                                    <button
                                        onClick={() => setShowBreakdown(!showBreakdown)}
                                        className="flex w-full items-center justify-between p-6 text-left"
                                    >
                                        <h3 className="text-lg font-semibold text-gray-900">Rincian Lengkap</h3>
                                        {showBreakdown ? <ChevronUp className="h-5 w-5 text-gray-500" /> : <ChevronDown className="h-5 w-5 text-gray-500" />}
                                    </button>

                                    {showBreakdown && (
                                        <div className="border-t border-gray-100 px-6 pb-6">
                                            {/* Allowances */}
                                            <div className="mb-4">
                                                <h4 className="text-sm font-medium text-gray-700 mb-2">Tunjangan</h4>
                                                <div className="space-y-1 text-sm">
                                                    <div className="flex justify-between">
                                                        <span className="text-gray-500">Gaji Pokok</span>
                                                        <span>{formatCurrency(calcResult.baseSalary)}</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-gray-500">Transport</span>
                                                        <span className="text-green-600">+{formatCurrency(calcResult.allowances.transport)}</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-gray-500">Makan</span>
                                                        <span className="text-green-600">+{formatCurrency(calcResult.allowances.meal)}</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-gray-500">Lainnya</span>
                                                        <span className="text-green-600">+{formatCurrency(calcResult.allowances.other)}</span>
                                                    </div>
                                                    <div className="flex justify-between border-t border-gray-100 pt-1 font-medium">
                                                        <span>Total Tunjangan</span>
                                                        <span className="text-green-600">+{formatCurrency(calcResult.allowances.total)}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* PPh21 */}
                                            <div className="mb-4">
                                                <h4 className="text-sm font-medium text-gray-700 mb-2">PPh21 (Pajak Penghasilan)</h4>
                                                <div className="space-y-1 text-sm">
                                                    <div className="flex justify-between">
                                                        <span className="text-gray-500">Status</span>
                                                        <span>{calcResult.pph21.statusKawin}</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-gray-500">PTKP/Tahun</span>
                                                        <span>{formatCurrency(calcResult.pph21.ptkpYearly)}</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-gray-500">PKP/Tahun</span>
                                                        <span>{formatCurrency(calcResult.pph21.pkpYearly)}</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-gray-500">PPh21/Tahun</span>
                                                        <span>{formatCurrency(calcResult.pph21.pph21Yearly)}</span>
                                                    </div>
                                                    <div className="flex justify-between border-t border-gray-100 pt-1 font-medium">
                                                        <span>PPh21/Bulan (Dipotong)</span>
                                                        <span className="text-red-600">-{formatCurrency(calcResult.pph21.pph21Monthly)}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* BPJS Kesehatan */}
                                            <div className="mb-4">
                                                <h4 className="text-sm font-medium text-gray-700 mb-2">BPJS Kesehatan (4% + 4%)</h4>
                                                <div className="space-y-1 text-sm">
                                                    <div className="flex justify-between">
                                                        <span className="text-gray-500">Iuran Karyawan</span>
                                                        <span className="text-red-600">-{formatCurrency(calcResult.bpjs.kesehatan.employee)}</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-gray-500">Iuran Perusahaan</span>
                                                        <span className="text-blue-600">{formatCurrency(calcResult.bpjs.kesehatan.employer)}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* BPJS Ketenagakerjaan */}
                                            <div className="mb-4">
                                                <h4 className="text-sm font-medium text-gray-700 mb-2">BPJS Ketenagakerjaan</h4>
                                                <div className="space-y-1 text-sm">
                                                    <div className="flex justify-between">
                                                        <span className="text-gray-500">JKK (Perusahaan)</span>
                                                        <span className="text-blue-600">{formatCurrency(calcResult.bpjs.ketenagakerjaan.jkk)}</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-gray-500">JKM (Perusahaan)</span>
                                                        <span className="text-blue-600">{formatCurrency(calcResult.bpjs.ketenagakerjaan.jkm)}</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-gray-500">JHT Karyawan (2%)</span>
                                                        <span className="text-red-600">-{formatCurrency(calcResult.bpjs.ketenagakerjaan.jhtEmployee)}</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-gray-500">JHT Perusahaan (3.7%)</span>
                                                        <span className="text-blue-600">{formatCurrency(calcResult.bpjs.ketenagakerjaan.jhtEmployer)}</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-gray-500">JP Karyawan (1%)</span>
                                                        <span className="text-red-600">-{formatCurrency(calcResult.bpjs.ketenagakerjaan.jpEmployee)}</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-gray-500">JP Perusahaan (2%)</span>
                                                        <span className="text-blue-600">{formatCurrency(calcResult.bpjs.ketenagakerjaan.jpEmployer)}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Bonus */}
                                            {calcResult.bonus > 0 && (
                                                <div className="mb-4">
                                                    <h4 className="text-sm font-medium text-gray-700 mb-2">Bonus</h4>
                                                    <div className="flex justify-between text-sm">
                                                        <span className="text-gray-500">Bonus</span>
                                                        <span className="text-green-600">+{formatCurrency(calcResult.bonus)}</span>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Final Calculation */}
                                            <div className="rounded-lg bg-gray-50 p-4 mt-4">
                                                <h4 className="text-sm font-medium text-gray-700 mb-3">Perhitungan Akhir</h4>
                                                <div className="space-y-2 text-sm">
                                                    <div className="flex justify-between">
                                                        <span>Gaji Kotor</span>
                                                        <span>{formatCurrency(calcResult.grossSalary)}</span>
                                                    </div>
                                                    <div className="flex justify-between text-red-600">
                                                        <span>- PPh21</span>
                                                        <span>-{formatCurrency(calcResult.pph21.pph21Monthly)}</span>
                                                    </div>
                                                    <div className="flex justify-between text-red-600">
                                                        <span>- BPJS Karyawan</span>
                                                        <span>-{formatCurrency(calcResult.bpjs.totalEmployee)}</span>
                                                    </div>
                                                    <div className="flex justify-between text-red-600">
                                                        <span>- Potongan Lain</span>
                                                        <span>-{formatCurrency(calcResult.deductions.total)}</span>
                                                    </div>
                                                    {calcResult.bonus > 0 && (
                                                        <div className="flex justify-between text-green-600">
                                                            <span>+ Bonus</span>
                                                            <span>+{formatCurrency(calcResult.bonus)}</span>
                                                        </div>
                                                    )}
                                                    <div className="flex justify-between border-t-2 border-gray-300 pt-2 text-lg font-bold text-green-700">
                                                        <span>Gaji Bersih</span>
                                                        <span>{formatCurrency(calcResult.netSalary)}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Save Button */}
                                <div className="flex gap-3">
                                    <button
                                        onClick={handleSavePayroll}
                                        disabled={saving}
                                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-green-600 px-6 py-3 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                        {saving ? 'Menyimpan...' : 'Simpan Payroll'}
                                    </button>
                                    <button
                                        onClick={() => {
                                            setCalcForm(prev => ({
                                                ...prev,
                                                baseSalary: 0,
                                                transportAllowance: 0,
                                                mealAllowance: 0,
                                                otherAllowance: 0,
                                                lateDeduction: 0,
                                                absentDeduction: 0,
                                                otherDeduction: 0,
                                                bonus: 0,
                                                notes: '',
                                            }))
                                            setCalcResult(null)
                                        }}
                                        className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-6 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
                                    >
                                        <RefreshCw className="h-4 w-4" />
                                        Reset
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Process Confirm Dialog */}
            <ConfirmDialog
                isOpen={showProcessConfirm}
                onClose={() => setShowProcessConfirm(false)}
                onConfirm={confirmProcess}
                title="Proses Payroll"
                message={`Proses ${pendingCount} payroll yang belum diproses?`}
                confirmText="Proses"
                variant="warning"
                isLoading={processing}
            />

            {/* Delete Confirm Dialog */}
            <ConfirmDialog
                isOpen={showDeleteConfirm}
                onClose={() => { setShowDeleteConfirm(false); setDeleteTargetId(null) }}
                onConfirm={confirmDelete}
                title="Hapus Payroll"
                message="Apakah Anda yakin ingin menghapus data payroll ini?"
                confirmText="Hapus"
                variant="danger"
            />

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
