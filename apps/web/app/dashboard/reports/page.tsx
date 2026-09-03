'use client'

import { useState, useEffect, useCallback } from 'react'
import { formatCurrency, formatDate, formatNumber } from '@/lib/utils'
import { useTranslation } from '@/lib/i18n'
import { exportToCSV, exportToExcel, printReport } from '@/lib/export'
import { BarChart, PieChart, LineChart } from '@/components/ui/charts'
import {
    FileText,
    DollarSign,
    TrendingUp,
    Package,
    Users,
    ShoppingCart,
    Download,
    Printer,
    Calendar,
    Filter,
    BarChart3,
    PieChart as PieChartIcon,
    TrendingDown,
    ArrowUpRight,
    ArrowDownRight,
    Building2,
    ClipboardList,
    Loader2,
    AlertCircle,
    RefreshCw,
    Star,
} from 'lucide-react'

/* ============================================
   TYPES
   ============================================ */

type ReportCategory = 'finance' | 'sales' | 'hr' | 'inventory'
type ReportType =
    | 'revenue'
    | 'expense'
    | 'profit-loss'
    | 'sales-by-customer'
    | 'stock-summary'
    | 'employee-summary'
    | 'sales-by-product'
    | 'attendance-summary'
    | 'payroll-summary'
    | 'low-stock'
    | 'supplier-performance'
    | 'cash-flow'
    | 'trial-balance'
    | 'balance-sheet'
    | 'income-statement'

interface ReportConfig {
    id: ReportType
    name: string
    description: string
    category: ReportCategory
}

// Data types matching API response
interface RevenueData {
    month: string
    revenue: number
    invoiceCount: number
}

interface ExpenseData {
    category: string
    amount: number
}

interface SalesByCustomerData {
    customer: string
    totalSales: number
    transactions: number
    lastOrder: string
}

interface SalesByProductData {
    product: string
    totalSold: number
    revenue: number
}

interface StockData {
    sku: string
    name: string
    stock: number
    minStock: number
    price: number
    cost: number
    category: string
}

interface EmployeeData {
    id: string
    name: string
    department: string
    position: string
    salary: number
    status: string
}

interface AttendanceData {
    name: string
    department: string
    present: number
    late: number
    absent: number
    wfh: number
}

interface PayrollData {
    department: string
    headcount: number
    totalSalary: number
    avgSalary: number
}

interface SupplierData {
    name: string
    rating: number
    orders: number
    onTime: number
    totalSpent: number
}

interface ReportsData {
    revenue: RevenueData[]
    expenses: ExpenseData[]
    salesByCustomer: SalesByCustomerData[]
    salesByProduct: SalesByProductData[]
    stock: StockData[]
    employees: EmployeeData[]
    attendance: AttendanceData[]
    payroll: PayrollData[]
    suppliers: SupplierData[]
}

// Trial Balance types
interface TrialBalanceAccount {
    accountId: string
    accountCode: string
    accountName: string
    accountType: string
    totalDebit: number
    totalCredit: number
    balance: number
    balanceType: 'debit' | 'credit'
}

interface TrialBalanceData {
    accounts: TrialBalanceAccount[]
    totalDebit: number
    totalCredit: number
    isBalanced: boolean
    dateFrom: string | null
    dateTo: string | null
    generatedAt: string
}

// Balance Sheet types
interface BalanceSheetAccount {
    accountId: string
    accountCode: string
    accountName: string
    balance: number
}

interface BalanceSheetSection {
    label: string
    accounts: BalanceSheetAccount[]
    total: number
}

interface BalanceSheetData {
    assets: {
        current: BalanceSheetSection
        nonCurrent: BalanceSheetSection
        total: number
    }
    liabilities: {
        current: BalanceSheetSection
        longTerm: BalanceSheetSection
        total: number
    }
    equity: BalanceSheetSection
    totalLiabilitiesAndEquity: number
    isBalanced: boolean
    date: string
    generatedAt: string
}

// Income Statement types
interface IncomeStatementAccount {
    accountId: string
    accountCode: string
    accountName: string
    amount: number
}

interface IncomeStatementSection {
    label: string
    accounts: IncomeStatementAccount[]
    total: number
}

interface PeriodData {
    period: string
    revenue: number
    cogs: number
    grossProfit: number
    operatingExpenses: number
    operatingIncome: number
    nonOperatingIncome: number
    nonOperatingExpenses: number
    netIncome: number
}

interface IncomeStatementData {
    revenue: IncomeStatementSection
    cogs: IncomeStatementSection
    grossProfit: number
    operatingExpenses: IncomeStatementSection
    operatingIncome: number
    nonOperatingIncome: IncomeStatementSection
    nonOperatingExpenses: IncomeStatementSection
    netIncome: number
    byPeriod: PeriodData[]
    dateFrom: string | null
    dateTo: string | null
    generatedAt: string
}

/* ============================================
   REPORT DEFINITIONS
   ============================================ */

const REPORT_CATEGORY_CONFIG: { id: ReportCategory; icon: typeof FileText; color: string; nameKey: string; descKey: string }[] = [
    { id: 'finance', icon: DollarSign, color: 'blue', nameKey: 'reports.categories.finance.name', descKey: 'reports.categories.finance.desc' },
    { id: 'sales', icon: TrendingUp, color: 'green', nameKey: 'reports.categories.sales.name', descKey: 'reports.categories.sales.desc' },
    { id: 'hr', icon: Users, color: 'purple', nameKey: 'reports.categories.hr.name', descKey: 'reports.categories.hr.desc' },
    { id: 'inventory', icon: Package, color: 'orange', nameKey: 'reports.categories.inventory.name', descKey: 'reports.categories.inventory.desc' },
]

const REPORT_TYPE_CONFIG: { id: ReportType; nameKey: string; descKey: string; category: ReportCategory }[] = [
    { id: 'revenue', nameKey: 'reports.types.revenue.name', descKey: 'reports.types.revenue.desc', category: 'finance' },
    { id: 'expense', nameKey: 'reports.types.expense.name', descKey: 'reports.types.expense.desc', category: 'finance' },
    { id: 'profit-loss', nameKey: 'reports.types.profitLoss.name', descKey: 'reports.types.profitLoss.desc', category: 'finance' },
    { id: 'cash-flow', nameKey: 'reports.types.cashFlow.name', descKey: 'reports.types.cashFlow.desc', category: 'finance' },
    { id: 'sales-by-customer', nameKey: 'reports.types.salesByCustomer.name', descKey: 'reports.types.salesByCustomer.desc', category: 'sales' },
    { id: 'sales-by-product', nameKey: 'reports.types.salesByProduct.name', descKey: 'reports.types.salesByProduct.desc', category: 'sales' },
    { id: 'employee-summary', nameKey: 'reports.types.employeeSummary.name', descKey: 'reports.types.employeeSummary.desc', category: 'hr' },
    { id: 'attendance-summary', nameKey: 'reports.types.attendanceSummary.name', descKey: 'reports.types.attendanceSummary.desc', category: 'hr' },
    { id: 'payroll-summary', nameKey: 'reports.types.payrollSummary.name', descKey: 'reports.types.payrollSummary.desc', category: 'hr' },
    { id: 'stock-summary', nameKey: 'reports.types.stockSummary.name', descKey: 'reports.types.stockSummary.desc', category: 'inventory' },
    { id: 'low-stock', nameKey: 'reports.types.lowStock.name', descKey: 'reports.types.lowStock.desc', category: 'inventory' },
    { id: 'supplier-performance', nameKey: 'reports.types.supplierPerformance.name', descKey: 'reports.types.supplierPerformance.desc', category: 'inventory' },
    { id: 'trial-balance', nameKey: 'reports.types.trialBalance.name', descKey: 'reports.types.trialBalance.desc', category: 'finance' },
    { id: 'balance-sheet', nameKey: 'reports.types.balanceSheet.name', descKey: 'reports.types.balanceSheet.desc', category: 'finance' },
    { id: 'income-statement', nameKey: 'reports.types.incomeStatement.name', descKey: 'reports.types.incomeStatement.desc', category: 'finance' },
]

/* ============================================
   REPORT BUILDER COMPONENT
   ============================================ */

export default function ReportsPage() {
    const { t } = useTranslation()
    const [selectedCategory, setSelectedCategory] = useState<ReportCategory | null>(null)
    const [selectedReport, setSelectedReport] = useState<ReportType>('revenue')
    const [dateFrom, setDateFrom] = useState('2026-01-01')
    const [dateTo, setDateTo] = useState('2026-12-31')

    // Compute i18n-resolved arrays
    const REPORT_CATEGORIES = REPORT_CATEGORY_CONFIG.map(c => ({
        ...c,
        name: t(c.nameKey),
        description: t(c.descKey),
    }))
    const REPORTS = REPORT_TYPE_CONFIG.map(r => ({
        id: r.id,
        name: t(r.nameKey),
        description: t(r.descKey),
        category: r.category,
    }))

    // Data state
    const [data, setData] = useState<ReportsData | null>(null)
    const [trialBalanceData, setTrialBalanceData] = useState<TrialBalanceData | null>(null)
    const [balanceSheetData, setBalanceSheetData] = useState<BalanceSheetData | null>(null)
    const [incomeStatementData, setIncomeStatementData] = useState<IncomeStatementData | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const currentReport = REPORTS.find(r => r.id === selectedReport)

    // Fetch data from API
    const fetchData = useCallback(async () => {
        try {
            setLoading(true)
            setError(null)
            const params = new URLSearchParams()
            if (dateFrom) params.set('dateFrom', dateFrom)
            if (dateTo) params.set('dateTo', dateTo)

            const response = await fetch(`/api/reports?${params.toString()}`)
            const result = await response.json()

            if (!result.success) {
                throw new Error(result.error || 'Gagal memuat data laporan')
            }

            setData(result.data)
        } catch (err) {
            console.error('Failed to fetch reports:', err)
            setError(err instanceof Error ? err.message : 'Terjadi kesalahan saat memuat data')
        } finally {
            setLoading(false)
        }
    }, [dateFrom, dateTo])

    // Fetch Trial Balance data
    const fetchTrialBalance = useCallback(async () => {
        try {
            setLoading(true)
            setError(null)
            const params = new URLSearchParams()
            if (dateFrom) params.set('dateFrom', dateFrom)
            if (dateTo) params.set('dateTo', dateTo)

            const response = await fetch(`/api/finance/reports/trial-balance?${params.toString()}`)
            const result = await response.json()

            if (!result.success) {
                throw new Error(result.error || 'Gagal memuat trial balance')
            }

            setTrialBalanceData(result.data)
        } catch (err) {
            console.error('Failed to fetch trial balance:', err)
            setError(err instanceof Error ? err.message : 'Terjadi kesalahan saat memuat data')
        } finally {
            setLoading(false)
        }
    }, [dateFrom, dateTo])

    // Fetch Balance Sheet data
    const fetchBalanceSheet = useCallback(async () => {
        try {
            setLoading(true)
            setError(null)
            const params = new URLSearchParams()
            if (dateTo) params.set('date', dateTo)

            const response = await fetch(`/api/finance/reports/balance-sheet?${params.toString()}`)
            const result = await response.json()

            if (!result.success) {
                throw new Error(result.error || 'Gagal memuat neraca')
            }

            setBalanceSheetData(result.data)
        } catch (err) {
            console.error('Failed to fetch balance sheet:', err)
            setError(err instanceof Error ? err.message : 'Terjadi kesalahan saat memuat data')
        } finally {
            setLoading(false)
        }
    }, [dateTo])

    // Fetch Income Statement data
    const fetchIncomeStatement = useCallback(async () => {
        try {
            setLoading(true)
            setError(null)
            const params = new URLSearchParams()
            if (dateFrom) params.set('dateFrom', dateFrom)
            if (dateTo) params.set('dateTo', dateTo)

            const response = await fetch(`/api/finance/reports/income-statement?${params.toString()}`)
            const result = await response.json()

            if (!result.success) {
                throw new Error(result.error || 'Gagal memuat laporan laba rugi')
            }

            setIncomeStatementData(result.data)
        } catch (err) {
            console.error('Failed to fetch income statement:', err)
            setError(err instanceof Error ? err.message : 'Terjadi kesalahan saat memuat data')
        } finally {
            setLoading(false)
        }
    }, [dateFrom, dateTo])

    useEffect(() => {
        if (selectedReport === 'trial-balance') {
            fetchTrialBalance()
        } else if (selectedReport === 'balance-sheet') {
            fetchBalanceSheet()
        } else if (selectedReport === 'income-statement') {
            fetchIncomeStatement()
        } else {
            fetchData()
        }
    }, [selectedReport, fetchData, fetchTrialBalance, fetchBalanceSheet, fetchIncomeStatement])

    const filteredReports = REPORTS.filter(r => !selectedCategory || r.category === selectedCategory)

    const categoryColors: Record<ReportCategory, string> = {
        finance: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800',
        sales: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800',
        hr: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800',
        inventory: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800',
    }

    // Determine if we need financial report data
    const isFinancialReport = selectedReport === 'trial-balance' || selectedReport === 'balance-sheet' || selectedReport === 'income-statement'

    // Check if we have data for the current report type
    const hasData = isFinancialReport
        ? (selectedReport === 'trial-balance' && trialBalanceData) ||
        (selectedReport === 'balance-sheet' && balanceSheetData) ||
        (selectedReport === 'income-statement' && incomeStatementData)
        : !!data

    // Loading state
    if (loading && !hasData) {
        return (
            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('reports.title')}</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {t('reports.subtitle')}
                    </p>
                </div>
                <div className="flex flex-col items-center justify-center py-20">
                    <Loader2 className="h-10 w-10 text-blue-500 animate-spin mb-4" />
                    <p className="text-gray-600 dark:text-gray-400">{t('reports.loading')}</p>
                </div>
            </div>
        )
    }

    // Error state
    if (error && !hasData) {
        const retryFn = isFinancialReport
            ? (selectedReport === 'trial-balance' ? fetchTrialBalance :
                selectedReport === 'balance-sheet' ? fetchBalanceSheet : fetchIncomeStatement)
            : fetchData
        return (
            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('reports.title')}</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {t('reports.subtitle')}
                    </p>
                </div>
                <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                    <AlertCircle className="h-12 w-12 text-red-400 mb-4" />
                    <p className="text-gray-900 dark:text-gray-100 font-medium mb-2">{t('reports.errorLoad')}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{error}</p>
                    <button
                        onClick={retryFn}
                        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                    >
                        <RefreshCw className="h-4 w-4" />
                        {t('reports.tryAgain')}
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('reports.title')}</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {t('reports.subtitle')}
                </p>
            </div>

            {/* Report Category Selection */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {REPORT_CATEGORIES.map(cat => {
                    const Icon = cat.icon
                    const isActive = selectedCategory === cat.id
                    return (
                        <button
                            key={cat.id}
                            onClick={() => setSelectedCategory(isActive ? null : cat.id)}
                            className={`text-left p-4 rounded-xl border-2 transition-all duration-200 ${isActive
                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 shadow-md ring-2 ring-blue-200 dark:ring-blue-800'
                                : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm dark:border-gray-700 dark:bg-gray-800 dark:hover:border-gray-600'
                                }`}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${isActive
                                    ? 'bg-blue-100 text-blue-600 dark:bg-blue-800 dark:text-blue-300'
                                    : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                                    }`}>
                                    <Icon className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="font-semibold text-gray-900 dark:text-gray-100">{cat.name}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{cat.description}</p>
                                </div>
                            </div>
                        </button>
                    )
                })}
            </div>

            {/* Date Range & Filters */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('reports.period')}</span>
                </div>
                <div className="flex items-center gap-2">
                    <input
                        type="date"
                        value={dateFrom}
                        onChange={e => setDateFrom(e.target.value)}
                        className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <span className="text-sm text-gray-500">{t('reports.to')}</span>
                    <input
                        type="date"
                        value={dateTo}
                        onChange={e => setDateTo(e.target.value)}
                        className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>
                <div className="flex items-center gap-2 ml-auto">
                    <Filter className="h-4 w-4 text-gray-400" />
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                        {selectedCategory ? `${REPORT_CATEGORIES.find(c => c.id === selectedCategory)?.name}` : t('reports.allCategories')}
                    </span>
                </div>
            </div>

            {/* Report Type Selection */}
            <div className="flex flex-wrap gap-2">
                {filteredReports.map(report => (
                    <button
                        key={report.id}
                        onClick={() => setSelectedReport(report.id)}
                        className={`px-3 py-1.5 text-sm rounded-lg border transition-all ${selectedReport === report.id
                            ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700'
                            }`}
                    >
                        {report.name}
                    </button>
                ))}
            </div>

            {/* Export Buttons */}
            <div className="flex flex-wrap gap-2">
                <button
                    onClick={() => {
                        if (!hasData || !data) return
                        const exportData = getExportData(selectedReport, data as ReportsData, t)
                        exportToCSV(exportData.rows, `${currentReport?.name || 'report'}_${dateTo}`)
                    }}
                    disabled={!hasData}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700 disabled:opacity-50"
                >
                    <Download className="h-4 w-4" />
                    {t('reports.exportCSV')}
                </button>
                <button
                    onClick={() => {
                        if (!hasData || !data) return
                        const exportData = getExportData(selectedReport, data as ReportsData, t)
                        exportToExcel(exportData.rows, `${currentReport?.name || 'report'}_${dateTo}`)
                    }}
                    disabled={!hasData}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700 disabled:opacity-50"
                >
                    <Download className="h-4 w-4" />
                    {t('reports.exportExcel')}
                </button>
                <button
                    onClick={() => printReport('report-preview')}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700"
                >
                    <Printer className="h-4 w-4" />
                    {t('reports.print')}
                </button>
            </div>

            {/* Report Preview */}
            <div id="report-preview" className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                {currentReport?.name}
                            </h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                                {currentReport?.description}
                            </p>
                        </div>
                        <div className={`px-3 py-1 rounded-full text-xs font-medium ${categoryColors[currentReport?.category || 'finance']}`}>
                            {REPORT_CATEGORIES.find(c => c.id === currentReport?.category)?.name}
                        </div>
                    </div>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                        {t('reports.period')} {dateFrom} — {dateTo}
                    </p>
                </div>

                <div className="p-4 sm:p-6">
                    {/* Inline loading indicator when refetching */}
                    {loading && hasData && (
                        <div className="flex items-center gap-2 mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                            <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
                            <span className="text-sm text-blue-600 dark:text-blue-400">{t('reports.updating')}</span>
                        </div>
                    )}

                    {/* Standard reports */}
                    {data && !isFinancialReport && (
                        <>
                            {selectedReport === 'revenue' && <RevenueReport data={data.revenue} />}
                            {selectedReport === 'expense' && <ExpenseReport data={data.expenses} />}
                            {selectedReport === 'profit-loss' && <ProfitLossReport revenue={data.revenue} expenses={data.expenses} />}
                            {selectedReport === 'cash-flow' && <CashFlowReport revenue={data.revenue} expenses={data.expenses} />}
                            {selectedReport === 'sales-by-customer' && <SalesByCustomerReport data={data.salesByCustomer} />}
                            {selectedReport === 'sales-by-product' && <SalesByProductReport data={data.salesByProduct} />}
                            {selectedReport === 'employee-summary' && <EmployeeSummaryReport data={data.employees} />}
                            {selectedReport === 'attendance-summary' && <AttendanceSummaryReport data={data.attendance} />}
                            {selectedReport === 'payroll-summary' && <PayrollSummaryReport data={data.payroll} />}
                            {selectedReport === 'stock-summary' && <StockSummaryReport data={data.stock} />}
                            {selectedReport === 'low-stock' && <LowStockReport data={data.stock} />}
                            {selectedReport === 'supplier-performance' && <SupplierPerformanceReport data={data.suppliers} />}
                        </>
                    )}

                    {/* Financial statements */}
                    {selectedReport === 'trial-balance' && trialBalanceData && (
                        <TrialBalanceReport data={trialBalanceData} />
                    )}
                    {selectedReport === 'balance-sheet' && balanceSheetData && (
                        <BalanceSheetReport data={balanceSheetData} />
                    )}
                    {selectedReport === 'income-statement' && incomeStatementData && (
                        <IncomeStatementReport data={incomeStatementData} />
                    )}
                </div>
            </div>
        </div>
    )
}

/* ============================================
   EXPORT DATA HELPER
   ============================================ */

function getExportData(reportType: ReportType, data: ReportsData, t: (key: string) => string): { rows: Record<string, unknown>[] } {
    switch (reportType) {
        case 'revenue':
            return {
                rows: data.revenue.map(d => ({
                    [t('reports.export.month')]: d.month,
                    [t('reports.export.revenue')]: d.revenue,
                    [t('reports.export.invoiceCount')]: d.invoiceCount,
                })),
            }
        case 'expense':
            return {
                rows: data.expenses.map(d => ({
                    [t('reports.export.category')]: d.category,
                    [t('reports.export.amount')]: d.amount,
                })),
            }
        case 'profit-loss':
            return {
                rows: data.revenue.map((d, i) => {
                    const totalExpenses = data.expenses.reduce((sum, e) => sum + e.amount, 0)
                    const expense = data.revenue.length > 0 ? Math.round(totalExpenses / data.revenue.length) : 0
                    return {
                        [t('reports.export.month')]: d.month,
                        [t('reports.export.revenue')]: d.revenue,
                        [t('reports.export.totalExpenses')]: expense,
                        [t('reports.export.profit')]: d.revenue - expense,
                    }
                }),
            }
        case 'sales-by-customer':
            return {
                rows: data.salesByCustomer.map(d => ({
                    [t('reports.export.customer')]: d.customer,
                    [t('reports.export.totalSales')]: d.totalSales,
                    [t('reports.export.transactions')]: d.transactions,
                    [t('reports.export.lastOrder')]: d.lastOrder,
                })),
            }
        case 'sales-by-product':
            return {
                rows: data.salesByProduct.map(d => ({
                    [t('reports.export.product')]: d.product,
                    [t('reports.export.totalSold')]: d.totalSold,
                    [t('reports.export.revenue')]: d.revenue,
                })),
            }
        case 'employee-summary':
            return {
                rows: data.employees.map(d => ({
                    [t('reports.export.employeeId')]: d.id,
                    [t('reports.export.name')]: d.name,
                    [t('reports.export.department')]: d.department,
                    [t('reports.export.position')]: d.position,
                    [t('reports.export.salary')]: d.salary,
                    [t('reports.export.status')]: d.status,
                })),
            }
        case 'stock-summary':
            return {
                rows: data.stock.map(d => ({
                    [t('reports.export.sku')]: d.sku,
                    [t('reports.export.product')]: d.name,
                    [t('reports.export.stock')]: d.stock,
                    [t('reports.export.minStock')]: d.minStock,
                    [t('reports.export.price')]: d.price,
                    [t('reports.export.cost')]: d.cost,
                    [t('reports.export.stockValue')]: d.stock * d.cost,
                })),
            }
        default:
            return { rows: [] }
    }
}

/* ============================================
   FINANCE REPORTS
   ============================================ */

function RevenueReport({ data }: { data: RevenueData[] }) {
    const { t } = useTranslation()
    const totalRevenue = data.reduce((sum, d) => sum + d.revenue, 0)
    const totalInvoices = data.reduce((sum, d) => sum + d.invoiceCount, 0)
    const avgRevenue = data.length > 0 ? Math.round(totalRevenue / data.length) : 0
    const lastMonth = data[data.length - 1]
    const prevMonth = data[data.length - 2]
    const growth = prevMonth && prevMonth.revenue > 0 ? ((lastMonth.revenue - prevMonth.revenue) / prevMonth.revenue * 100) : 0

    return (
        <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <KPICard label={t('reports.revenue.totalRevenue')} value={formatCurrency(totalRevenue)} icon={<DollarSign className="h-5 w-5" />} color="blue" />
                <KPICard label={t('reports.revenue.avgPerMonth')} value={formatCurrency(avgRevenue)} icon={<BarChart3 className="h-5 w-5" />} color="green" />
                <KPICard label={t('reports.revenue.totalInvoice')} value={formatNumber(totalInvoices)} icon={<FileText className="h-5 w-5" />} color="purple" />
                <KPICard
                    label={t('reports.revenue.growth')}
                    value={`${growth >= 0 ? '+' : ''}${growth.toFixed(1)}%`}
                    icon={growth >= 0 ? <ArrowUpRight className="h-5 w-5" /> : <ArrowDownRight className="h-5 w-5" />}
                    color={growth >= 0 ? 'green' : 'red'}
                />
            </div>

            {/* Chart */}
            {data.length > 0 && (
                <div>
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">{t('reports.revenue.trend')}</h3>
                    <LineChart
                        data={data.map(d => d.revenue)}
                        labels={data.map(d => d.month.split(' ')[0])}
                        color="#3B82F6"
                        height={220}
                    />
                </div>
            )}

            {/* Table */}
            {data.length > 0 ? (
                <>
                    {/* Mobile Card View */}
                    <div className="md:hidden space-y-3">
                        {data.map((d, i) => (
                            <div key={i} className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{d.month}</span>
                                    <span className="text-sm font-bold text-blue-600 dark:text-blue-400">{formatCurrency(d.revenue)}</span>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                    <div>
                                        <span className="text-gray-500 dark:text-gray-400">{t('reports.revenue.invoice')}: </span>
                                        <span className="text-gray-700 dark:text-gray-300">{d.invoiceCount}</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-500 dark:text-gray-400">{t('reports.revenue.avgPerInvoice')}: </span>
                                        <span className="text-gray-700 dark:text-gray-300">{d.invoiceCount > 0 ? formatCurrency(Math.round(d.revenue / d.invoiceCount)) : '-'}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                        <div className="p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                            <div className="flex items-center justify-between text-sm font-semibold">
                                <span className="text-gray-900 dark:text-gray-100">{t('reports.common.total')}</span>
                                <span className="text-gray-900 dark:text-gray-100">{formatCurrency(totalRevenue)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Desktop Table View */}
                    <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-200 dark:border-gray-700">
                                    <th className="text-left py-3 px-4 font-medium text-gray-600 dark:text-gray-400">{t('reports.common.month')}</th>
                                    <th className="text-right py-3 px-4 font-medium text-gray-600 dark:text-gray-400">{t('reports.common.revenue')}</th>
                                    <th className="text-right py-3 px-4 font-medium text-gray-600 dark:text-gray-400">{t('reports.revenue.invoice')}</th>
                                    <th className="text-right py-3 px-4 font-medium text-gray-600 dark:text-gray-400">{t('reports.revenue.avgPerInvoice')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.map((d, i) => (
                                    <tr key={i} className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                                        <td className="py-3 px-4 text-gray-900 dark:text-gray-100">{d.month}</td>
                                        <td className="py-3 px-4 text-right font-medium text-gray-900 dark:text-gray-100">{formatCurrency(d.revenue)}</td>
                                        <td className="py-3 px-4 text-right text-gray-600 dark:text-gray-400">{d.invoiceCount}</td>
                                        <td className="py-3 px-4 text-right text-gray-600 dark:text-gray-400">{d.invoiceCount > 0 ? formatCurrency(Math.round(d.revenue / d.invoiceCount)) : '-'}</td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr className="font-semibold border-t-2 border-gray-300 dark:border-gray-600">
                                    <td className="py-3 px-4 text-gray-900 dark:text-gray-100">{t('reports.common.total')}</td>
                                    <td className="py-3 px-4 text-right text-gray-900 dark:text-gray-100">{formatCurrency(totalRevenue)}</td>
                                    <td className="py-3 px-4 text-right text-gray-900 dark:text-gray-100">{totalInvoices}</td>
                                    <td className="py-3 px-4 text-right text-gray-900 dark:text-gray-100">{totalInvoices > 0 ? formatCurrency(Math.round(totalRevenue / totalInvoices)) : '-'}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </>
            ) : (
                <EmptyState message={t('reports.revenue.empty')} />
            )}
        </div>
    )
}

function ExpenseReport({ data }: { data: ExpenseData[] }) {
    const { t } = useTranslation()
    const totalExpenses = data.reduce((sum, d) => sum + d.amount, 0)

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                <KPICard label={t('reports.expense.totalExpenses')} value={formatCurrency(totalExpenses)} icon={<TrendingDown className="h-5 w-5" />} color="red" />
                <KPICard label={t('reports.expense.categories')} value={String(data.length)} icon={<ClipboardList className="h-5 w-5" />} color="blue" />
                <KPICard label={t('reports.expense.avgPerCategory')} value={data.length > 0 ? formatCurrency(Math.round(totalExpenses / data.length)) : '-'} icon={<BarChart3 className="h-5 w-5" />} color="yellow" />
            </div>

            {data.length > 0 ? (
                <>
                    <div className="flex flex-col lg:flex-row gap-6">
                        <div className="flex-1">
                            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">{t('reports.expense.breakdown')}</h3>
                            <BarChart
                                data={data.map(d => d.amount)}
                                labels={data.map(d => d.category.length > 10 ? d.category.substring(0, 10) + '...' : d.category)}
                                colors={['#EF4444', '#F59E0B', '#3B82F6', '#10B981', '#8B5CF6', '#EC4899', '#06B6D4']}
                                height={250}
                            />
                        </div>
                        <div className="lg:w-64">
                            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">{t('reports.common.distribution')}</h3>
                            <PieChart
                                data={data.map(d => d.amount)}
                                labels={data.map(d => d.category)}
                                colors={['#EF4444', '#F59E0B', '#3B82F6', '#10B981', '#8B5CF6', '#EC4899', '#06B6D4']}
                                size={160}
                            />
                        </div>
                    </div>

                    {/* Mobile Card View */}
                    <div className="md:hidden space-y-3">
                        {data.map((d, i) => (
                            <div key={i} className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{d.category}</span>
                                    <span className="text-sm font-bold text-red-600 dark:text-red-400">{formatCurrency(d.amount)}</span>
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                    {t('reports.common.percentOfTotal')}: {totalExpenses > 0 ? (d.amount / totalExpenses * 100).toFixed(1) : 0}%
                                </div>
                            </div>
                        ))}
                        <div className="p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                            <div className="flex items-center justify-between text-sm font-semibold">
                                <span className="text-gray-900 dark:text-gray-100">{t('reports.common.total')}</span>
                                <span className="text-gray-900 dark:text-gray-100">{formatCurrency(totalExpenses)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Desktop Table View */}
                    <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-200 dark:border-gray-700">
                                    <th className="text-left py-3 px-4 font-medium text-gray-600 dark:text-gray-400">{t('reports.common.category')}</th>
                                    <th className="text-right py-3 px-4 font-medium text-gray-600 dark:text-gray-400">{t('reports.common.amount')}</th>
                                    <th className="text-right py-3 px-4 font-medium text-gray-600 dark:text-gray-400">{t('reports.common.percentOfTotal')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.map((d, i) => (
                                    <tr key={i} className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                                        <td className="py-3 px-4 text-gray-900 dark:text-gray-100">{d.category}</td>
                                        <td className="py-3 px-4 text-right font-medium text-gray-900 dark:text-gray-100">{formatCurrency(d.amount)}</td>
                                        <td className="py-3 px-4 text-right text-gray-600 dark:text-gray-400">{totalExpenses > 0 ? (d.amount / totalExpenses * 100).toFixed(1) : 0}%</td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr className="font-semibold border-t-2 border-gray-300 dark:border-gray-600">
                                    <td className="py-3 px-4 text-gray-900 dark:text-gray-100">{t('reports.common.total')}</td>
                                    <td className="py-3 px-4 text-right text-gray-900 dark:text-gray-100">{formatCurrency(totalExpenses)}</td>
                                    <td className="py-3 px-4 text-right text-gray-900 dark:text-gray-100">100%</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </>
            ) : (
                <EmptyState message={t('reports.expense.empty')} />
            )}
        </div>
    )
}

function ProfitLossReport({ revenue, expenses }: { revenue: RevenueData[]; expenses: ExpenseData[] }) {
    const { t } = useTranslation()
    const totalRevenue = revenue.reduce((sum, d) => sum + d.revenue, 0)
    const totalExpenses = expenses.reduce((sum, d) => sum + d.amount, 0)
    const totalProfit = totalRevenue - totalExpenses
    const monthlyExpense = revenue.length > 0 ? Math.round(totalExpenses / revenue.length) : 0

    const plData = revenue.map((d) => ({
        month: d.month,
        revenue: d.revenue,
        expense: monthlyExpense,
        profit: d.revenue - monthlyExpense,
    }))

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <KPICard label={t('reports.profitLoss.totalRevenue')} value={formatCurrency(totalRevenue)} icon={<ArrowUpRight className="h-5 w-5" />} color="green" />
                <KPICard label={t('reports.profitLoss.totalExpenses')} value={formatCurrency(totalExpenses)} icon={<ArrowDownRight className="h-5 w-5" />} color="red" />
                <KPICard label={t('reports.profitLoss.netProfit')} value={formatCurrency(totalProfit)} icon={<DollarSign className="h-5 w-5" />} color={totalProfit >= 0 ? 'blue' : 'red'} />
            </div>

            {/* Stacked bar chart */}
            {plData.length > 0 && (
                <div>
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">{t('reports.profitLoss.chartTitle')}</h3>
                    <div className="flex items-end gap-1.5 sm:gap-2 h-48">
                        {plData.map((d, index) => {
                            const maxVal = Math.max(...plData.map(p => Math.max(p.revenue, p.expense)), 1)
                            return (
                                <div key={index} className="flex-1 flex flex-col items-center justify-end h-full min-w-0">
                                    <div className="flex gap-0.5 w-full items-end" style={{ height: '100%' }}>
                                        <div
                                            className="flex-1 rounded-t transition-all duration-500"
                                            style={{ height: `${(d.revenue / maxVal) * 100}%`, backgroundColor: '#10B981' }}
                                            title={`Revenue: ${formatCurrency(d.revenue)}`}
                                        />
                                        <div
                                            className="flex-1 rounded-t transition-all duration-500"
                                            style={{ height: `${(d.expense / maxVal) * 100}%`, backgroundColor: '#EF4444' }}
                                            title={`Expense: ${formatCurrency(d.expense)}`}
                                        />
                                    </div>
                                    <span className="text-[10px] text-gray-500 mt-1 text-center">{d.month.split(' ')[0]}</span>
                                </div>
                            )
                        })}
                    </div>
                    <div className="flex items-center gap-4 mt-3 justify-center">
                        <div className="flex items-center gap-1.5">
                            <div className="w-3 h-3 rounded" style={{ backgroundColor: '#10B981' }} />
                            <span className="text-xs text-gray-600 dark:text-gray-400">{t('reports.common.revenue')}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="w-3 h-3 rounded" style={{ backgroundColor: '#EF4444' }} />
                            <span className="text-xs text-gray-600 dark:text-gray-400">{t('reports.common.expenses')}</span>
                        </div>
                    </div>
                </div>
            )}

            {plData.length > 0 ? (
                <>
                    {/* Mobile Card View */}
                    <div className="md:hidden space-y-3">
                        {plData.map((d, i) => (
                            <div key={i} className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{d.month}</span>
                                    <span className={`text-sm font-bold ${d.profit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                        {formatCurrency(d.profit)}
                                    </span>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                    <div>
                                        <span className="text-gray-500 dark:text-gray-400">{t('reports.common.revenue')}: </span>
                                        <span className="text-green-600 dark:text-green-400">{formatCurrency(d.revenue)}</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-500 dark:text-gray-400">{t('reports.common.expenses')}: </span>
                                        <span className="text-red-600 dark:text-red-400">{formatCurrency(d.expense)}</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-500 dark:text-gray-400">{t('reports.profitLoss.margin')}: </span>
                                        <span className="text-gray-700 dark:text-gray-300">{d.revenue > 0 ? (d.profit / d.revenue * 100).toFixed(1) : 0}%</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Desktop Table View */}
                    <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-200 dark:border-gray-700">
                                    <th className="text-left py-3 px-4 font-medium text-gray-600 dark:text-gray-400">{t('reports.common.month')}</th>
                                    <th className="text-right py-3 px-4 font-medium text-gray-600 dark:text-gray-400">{t('reports.common.revenue')}</th>
                                    <th className="text-right py-3 px-4 font-medium text-gray-600 dark:text-gray-400">{t('reports.common.expenses')}</th>
                                    <th className="text-right py-3 px-4 font-medium text-gray-600 dark:text-gray-400">{t('reports.profitLoss.profitLoss')}</th>
                                    <th className="text-right py-3 px-4 font-medium text-gray-600 dark:text-gray-400">{t('reports.profitLoss.margin')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {plData.map((d, i) => (
                                    <tr key={i} className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                                        <td className="py-3 px-4 text-gray-900 dark:text-gray-100">{d.month}</td>
                                        <td className="py-3 px-4 text-right text-green-600 dark:text-green-400">{formatCurrency(d.revenue)}</td>
                                        <td className="py-3 px-4 text-right text-red-600 dark:text-red-400">{formatCurrency(d.expense)}</td>
                                        <td className={`py-3 px-4 text-right font-medium ${d.profit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                            {formatCurrency(d.profit)}
                                        </td>
                                        <td className="py-3 px-4 text-right text-gray-600 dark:text-gray-400">
                                            {d.revenue > 0 ? (d.profit / d.revenue * 100).toFixed(1) : 0}%
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr className="font-semibold border-t-2 border-gray-300 dark:border-gray-600">
                                    <td className="py-3 px-4 text-gray-900 dark:text-gray-100">{t('reports.common.total')}</td>
                                    <td className="py-3 px-4 text-right text-green-600 dark:text-green-400">{formatCurrency(totalRevenue)}</td>
                                    <td className="py-3 px-4 text-right text-red-600 dark:text-red-400">{formatCurrency(totalExpenses)}</td>
                                    <td className={`py-3 px-4 text-right ${totalProfit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                        {formatCurrency(totalProfit)}
                                    </td>
                                    <td className="py-3 px-4 text-right text-gray-600 dark:text-gray-400">
                                        {totalRevenue > 0 ? (totalProfit / totalRevenue * 100).toFixed(1) : 0}%
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </>
            ) : (
                <EmptyState message={t('reports.profitLoss.emptyState')} />
            )}
        </div>
    )
}

function CashFlowReport({ revenue, expenses }: { revenue: RevenueData[]; expenses: ExpenseData[] }) {
    const { t } = useTranslation()
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0)
    const monthlyExpense = revenue.length > 0 ? Math.round(totalExpenses / revenue.length) : 0

    const cashFlowData = revenue.map((d) => ({
        month: d.month,
        income: d.revenue,
        expense: monthlyExpense,
        net: d.revenue - monthlyExpense,
    }))

    const totalIncome = cashFlowData.reduce((s, d) => s + d.income, 0)
    const totalExpense = cashFlowData.reduce((s, d) => s + d.expense, 0)

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <KPICard label={t('reports.cashFlow.totalCashIn')} value={formatCurrency(totalIncome)} icon={<ArrowUpRight className="h-5 w-5" />} color="green" />
                <KPICard label={t('reports.cashFlow.totalCashOut')} value={formatCurrency(totalExpense)} icon={<ArrowDownRight className="h-5 w-5" />} color="red" />
                <KPICard label={t('reports.cashFlow.netCashFlow')} value={formatCurrency(totalIncome - totalExpense)} icon={<DollarSign className="h-5 w-5" />} color="blue" />
            </div>

            {cashFlowData.length > 0 && (
                <div>
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">{t('reports.cashFlow.chartTitle')}</h3>
                    <LineChart
                        data={cashFlowData.map(d => d.net)}
                        labels={cashFlowData.map(d => d.month.split(' ')[0])}
                        color="#3B82F6"
                        height={200}
                    />
                </div>
            )}

            {cashFlowData.length > 0 ? (
                <>
                    {/* Mobile Card View */}
                    <div className="md:hidden space-y-3">
                        {cashFlowData.map((d, i) => (
                            <div key={i} className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{d.month}</span>
                                    <span className={`text-sm font-bold ${d.net >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                        {formatCurrency(d.net)}
                                    </span>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                    <div>
                                        <span className="text-gray-500 dark:text-gray-400">{t('reports.cashFlow.cashIn')}: </span>
                                        <span className="text-green-600 dark:text-green-400">{formatCurrency(d.income)}</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-500 dark:text-gray-400">{t('reports.cashFlow.cashOut')}: </span>
                                        <span className="text-red-600 dark:text-red-400">{formatCurrency(d.expense)}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Desktop Table View */}
                    <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-200 dark:border-gray-700">
                                    <th className="text-left py-3 px-4 font-medium text-gray-600 dark:text-gray-400">{t('reports.common.month')}</th>
                                    <th className="text-right py-3 px-4 font-medium text-gray-600 dark:text-gray-400">{t('reports.cashFlow.cashIn')}</th>
                                    <th className="text-right py-3 px-4 font-medium text-gray-600 dark:text-gray-400">{t('reports.cashFlow.cashOut')}</th>
                                    <th className="text-right py-3 px-4 font-medium text-gray-600 dark:text-gray-400">{t('reports.cashFlow.net')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {cashFlowData.map((d, i) => (
                                    <tr key={i} className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                                        <td className="py-3 px-4 text-gray-900 dark:text-gray-100">{d.month}</td>
                                        <td className="py-3 px-4 text-right text-green-600 dark:text-green-400">{formatCurrency(d.income)}</td>
                                        <td className="py-3 px-4 text-right text-red-600 dark:text-red-400">{formatCurrency(d.expense)}</td>
                                        <td className={`py-3 px-4 text-right font-medium ${d.net >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            {formatCurrency(d.net)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            ) : (
                <EmptyState message={t('reports.cashFlow.emptyState')} />
            )}
        </div>
    )
}

/* ============================================
   SALES REPORTS
   ============================================ */

function SalesByCustomerReport({ data }: { data: SalesByCustomerData[] }) {
    const { t } = useTranslation()
    const totalSales = data.reduce((sum, d) => sum + d.totalSales, 0)

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                <KPICard label={t('reports.salesByCustomer.totalSales')} value={formatCurrency(totalSales)} icon={<DollarSign className="h-5 w-5" />} color="green" />
                <KPICard label={t('reports.salesByCustomer.totalCustomers')} value={String(data.length)} icon={<Users className="h-5 w-5" />} color="blue" />
                <KPICard label={t('reports.salesByCustomer.avgPerCustomer')} value={data.length > 0 ? formatCurrency(Math.round(totalSales / data.length)) : '-'} icon={<BarChart3 className="h-5 w-5" />} color="purple" />
            </div>

            {data.length > 0 ? (
                <>
                    <div className="flex flex-col lg:flex-row gap-6">
                        <div className="flex-1">
                            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">{t('reports.salesByCustomer.topCustomers')}</h3>
                            <BarChart
                                data={data.slice(0, 6).map(d => d.totalSales)}
                                labels={data.slice(0, 6).map(d => d.customer.length > 12 ? d.customer.substring(0, 12) + '...' : d.customer)}
                                colors={['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899']}
                                height={250}
                            />
                        </div>
                        <div className="lg:w-56">
                            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">{t('reports.common.distribution')}</h3>
                            <PieChart
                                data={data.slice(0, 5).map(d => d.totalSales)}
                                labels={data.slice(0, 5).map(d => d.customer.length > 15 ? d.customer.substring(0, 15) + '...' : d.customer)}
                                colors={['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6']}
                                size={130}
                            />
                        </div>
                    </div>

                    {/* Mobile Card View */}
                    <div className="md:hidden space-y-3">
                        {data.map((d, i) => (
                            <div key={i} className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                        <span className="text-gray-500 dark:text-gray-400 text-xs mr-1">#{i + 1}</span>
                                        {d.customer}
                                    </span>
                                    <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{formatCurrency(d.totalSales)}</span>
                                </div>
                                <div className="grid grid-cols-3 gap-2 text-xs">
                                    <div>
                                        <span className="text-gray-500 dark:text-gray-400">{t('reports.salesByCustomer.transactions')}: </span>
                                        <span className="text-gray-700 dark:text-gray-300">{d.transactions}</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-500 dark:text-gray-400">{t('reports.common.percentOfTotal')}: </span>
                                        <span className="text-gray-700 dark:text-gray-300">{totalSales > 0 ? (d.totalSales / totalSales * 100).toFixed(1) : 0}%</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-500 dark:text-gray-400">{t('reports.salesByCustomer.lastOrder')}: </span>
                                        <span className="text-gray-700 dark:text-gray-300">{d.lastOrder}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Desktop Table View */}
                    <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-200 dark:border-gray-700">
                                    <th className="text-left py-3 px-4 font-medium text-gray-600 dark:text-gray-400">#</th>
                                    <th className="text-left py-3 px-4 font-medium text-gray-600 dark:text-gray-400">{t('reports.salesByCustomer.customer')}</th>
                                    <th className="text-right py-3 px-4 font-medium text-gray-600 dark:text-gray-400">{t('reports.salesByCustomer.totalSales')}</th>
                                    <th className="text-right py-3 px-4 font-medium text-gray-600 dark:text-gray-400">{t('reports.salesByCustomer.transactions')}</th>
                                    <th className="text-right py-3 px-4 font-medium text-gray-600 dark:text-gray-400">{t('reports.common.percentOfTotal')}</th>
                                    <th className="text-right py-3 px-4 font-medium text-gray-600 dark:text-gray-400">{t('reports.salesByCustomer.lastOrder')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.map((d, i) => (
                                    <tr key={i} className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                                        <td className="py-3 px-4 text-gray-500 dark:text-gray-400">{i + 1}</td>
                                        <td className="py-3 px-4 font-medium text-gray-900 dark:text-gray-100">{d.customer}</td>
                                        <td className="py-3 px-4 text-right font-medium text-gray-900 dark:text-gray-100">{formatCurrency(d.totalSales)}</td>
                                        <td className="py-3 px-4 text-right text-gray-600 dark:text-gray-400">{d.transactions}</td>
                                        <td className="py-3 px-4 text-right text-gray-600 dark:text-gray-400">{totalSales > 0 ? (d.totalSales / totalSales * 100).toFixed(1) : 0}%</td>
                                        <td className="py-3 px-4 text-right text-gray-600 dark:text-gray-400">{d.lastOrder}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            ) : (
                <EmptyState message={t('reports.salesByCustomer.emptyState')} />
            )}
        </div>
    )
}

function SalesByProductReport({ data }: { data: SalesByProductData[] }) {
    const { t } = useTranslation()
    const totalRevenue = data.reduce((sum, d) => sum + d.revenue, 0)
    const totalUnits = data.reduce((sum, d) => sum + d.totalSold, 0)

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                <KPICard label={t('reports.salesByProduct.totalRevenue')} value={formatCurrency(totalRevenue)} icon={<DollarSign className="h-5 w-5" />} color="green" />
                <KPICard label={t('reports.salesByProduct.totalUnitsSold')} value={formatNumber(totalUnits)} icon={<Package className="h-5 w-5" />} color="blue" />
                <KPICard label={t('reports.salesByProduct.avgPricePerUnit')} value={totalUnits > 0 ? formatCurrency(Math.round(totalRevenue / totalUnits)) : '-'} icon={<BarChart3 className="h-5 w-5" />} color="purple" />
            </div>

            {data.length > 0 ? (
                <>
                    <div>
                        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">{t('reports.salesByProduct.chartTitle')}</h3>
                        <BarChart
                            data={data.map(d => d.revenue)}
                            labels={data.map(d => d.product)}
                            colors={['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899']}
                            height={220}
                        />
                    </div>

                    {/* Mobile Card View */}
                    <div className="md:hidden space-y-3">
                        {data.map((d, i) => (
                            <div key={i} className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                        <span className="text-gray-500 dark:text-gray-400 text-xs mr-1">#{i + 1}</span>
                                        {d.product}
                                    </span>
                                    <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{formatCurrency(d.revenue)}</span>
                                </div>
                                <div className="grid grid-cols-3 gap-2 text-xs">
                                    <div>
                                        <span className="text-gray-500 dark:text-gray-400">{t('reports.salesByProduct.unitsSold')}: </span>
                                        <span className="text-gray-700 dark:text-gray-300">{d.totalSold}</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-500 dark:text-gray-400">{t('reports.salesByProduct.pricePerUnit')}: </span>
                                        <span className="text-gray-700 dark:text-gray-300">{d.totalSold > 0 ? formatCurrency(Math.round(d.revenue / d.totalSold)) : '-'}</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-500 dark:text-gray-400">{t('reports.salesByProduct.percentRevenue')}: </span>
                                        <span className="text-gray-700 dark:text-gray-300">{totalRevenue > 0 ? (d.revenue / totalRevenue * 100).toFixed(1) : 0}%</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Desktop Table View */}
                    <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-200 dark:border-gray-700">
                                    <th className="text-left py-3 px-4 font-medium text-gray-600 dark:text-gray-400">#</th>
                                    <th className="text-left py-3 px-4 font-medium text-gray-600 dark:text-gray-400">{t('reports.salesByProduct.product')}</th>
                                    <th className="text-right py-3 px-4 font-medium text-gray-600 dark:text-gray-400">{t('reports.salesByProduct.unitsSold')}</th>
                                    <th className="text-right py-3 px-4 font-medium text-gray-600 dark:text-gray-400">{t('reports.common.revenue')}</th>
                                    <th className="text-right py-3 px-4 font-medium text-gray-600 dark:text-gray-400">{t('reports.salesByProduct.pricePerUnit')}</th>
                                    <th className="text-right py-3 px-4 font-medium text-gray-600 dark:text-gray-400">{t('reports.salesByProduct.percentRevenue')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.map((d, i) => (
                                    <tr key={i} className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                                        <td className="py-3 px-4 text-gray-500 dark:text-gray-400">{i + 1}</td>
                                        <td className="py-3 px-4 font-medium text-gray-900 dark:text-gray-100">{d.product}</td>
                                        <td className="py-3 px-4 text-right text-gray-600 dark:text-gray-400">{d.totalSold}</td>
                                        <td className="py-3 px-4 text-right font-medium text-gray-900 dark:text-gray-100">{formatCurrency(d.revenue)}</td>
                                        <td className="py-3 px-4 text-right text-gray-600 dark:text-gray-400">{d.totalSold > 0 ? formatCurrency(Math.round(d.revenue / d.totalSold)) : '-'}</td>
                                        <td className="py-3 px-4 text-right text-gray-600 dark:text-gray-400">{totalRevenue > 0 ? (d.revenue / totalRevenue * 100).toFixed(1) : 0}%</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            ) : (
                <EmptyState message={t('reports.salesByProduct.emptyState')} />
            )}
        </div>
    )
}

/* ============================================
   HR REPORTS
   ============================================ */

function EmployeeSummaryReport({ data }: { data: EmployeeData[] }) {
    const { t } = useTranslation()
    const deptGroups = data.reduce<Record<string, EmployeeData[]>>((acc, emp) => {
        if (!acc[emp.department]) acc[emp.department] = []
        acc[emp.department].push(emp)
        return acc
    }, {})

    const activeEmployees = data.filter(e => e.status === 'ACTIVE').length
    const totalSalary = data.filter(e => e.status === 'ACTIVE').reduce((s, e) => s + Number(e.salary), 0)

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <KPICard label={t('reports.employeeSummary.totalEmployees')} value={String(data.length)} icon={<Users className="h-5 w-5" />} color="blue" />
                <KPICard label={t('reports.employeeSummary.active')} value={String(activeEmployees)} icon={<Users className="h-5 w-5" />} color="green" />
                <KPICard label={t('reports.employeeSummary.departments')} value={String(Object.keys(deptGroups).length)} icon={<Building2 className="h-5 w-5" />} color="purple" />
                <KPICard label={t('reports.employeeSummary.totalSalaryPerMonth')} value={formatCurrency(totalSalary)} icon={<DollarSign className="h-5 w-5" />} color="orange" />
            </div>

            {data.length > 0 ? (
                <>
                    <div className="flex flex-col lg:flex-row gap-6">
                        <div className="flex-1">
                            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">{t('reports.employeeSummary.chartTitle')}</h3>
                            <BarChart
                                data={Object.values(deptGroups).map(g => g.length)}
                                labels={Object.keys(deptGroups)}
                                colors={['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899']}
                                height={200}
                            />
                        </div>
                        <div className="lg:w-48">
                            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">{t('reports.common.distribution')}</h3>
                            <PieChart
                                data={Object.values(deptGroups).map(g => g.length)}
                                labels={Object.keys(deptGroups)}
                                colors={['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899']}
                                size={120}
                            />
                        </div>
                    </div>

                    {/* Mobile Card View */}
                    <div className="md:hidden space-y-3">
                        {data.map((emp, i) => (
                            <div key={i} className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{emp.name}</span>
                                    <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${emp.status === 'ACTIVE' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'}`}>
                                        {emp.status}
                                    </span>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                    <div>
                                        <span className="text-gray-500 dark:text-gray-400">{t('reports.common.department')}: </span>
                                        <span className="text-gray-700 dark:text-gray-300">{emp.department}</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-500 dark:text-gray-400">{t('reports.employeeSummary.position')}: </span>
                                        <span className="text-gray-700 dark:text-gray-300">{emp.position}</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-500 dark:text-gray-400">{t('reports.employeeSummary.salary')}: </span>
                                        <span className="text-gray-700 dark:text-gray-300">{formatCurrency(emp.salary)}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Desktop Table View */}
                    <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-200 dark:border-gray-700">
                                    <th className="text-left py-3 px-4 font-medium text-gray-600 dark:text-gray-400">ID</th>
                                    <th className="text-left py-3 px-4 font-medium text-gray-600 dark:text-gray-400">{t('reports.common.name')}</th>
                                    <th className="text-left py-3 px-4 font-medium text-gray-600 dark:text-gray-400">{t('reports.common.department')}</th>
                                    <th className="text-left py-3 px-4 font-medium text-gray-600 dark:text-gray-400">{t('reports.employeeSummary.position')}</th>
                                    <th className="text-right py-3 px-4 font-medium text-gray-600 dark:text-gray-400">{t('reports.employeeSummary.salary')}</th>
                                    <th className="text-center py-3 px-4 font-medium text-gray-600 dark:text-gray-400">{t('reports.common.status')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.map((emp, i) => (
                                    <tr key={i} className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                                        <td className="py-3 px-4 text-gray-500 dark:text-gray-400 font-mono text-xs">{emp.id}</td>
                                        <td className="py-3 px-4 font-medium text-gray-900 dark:text-gray-100">{emp.name}</td>
                                        <td className="py-3 px-4 text-gray-600 dark:text-gray-400">{emp.department}</td>
                                        <td className="py-3 px-4 text-gray-600 dark:text-gray-400">{emp.position}</td>
                                        <td className="py-3 px-4 text-right text-gray-900 dark:text-gray-100">{formatCurrency(emp.salary)}</td>
                                        <td className="py-3 px-4 text-center">
                                            <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${emp.status === 'ACTIVE' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                                                }`}>
                                                {emp.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            ) : (
                <EmptyState message={t('reports.employeeSummary.emptyState')} />
            )}
        </div>
    )
}

function AttendanceSummaryReport({ data }: { data: AttendanceData[] }) {
    const { t } = useTranslation()
    const totalPresent = data.reduce((s, a) => s + a.present, 0)
    const totalLate = data.reduce((s, a) => s + a.late, 0)
    const totalAbsent = data.reduce((s, a) => s + a.absent, 0)
    const totalWfh = data.reduce((s, a) => s + a.wfh, 0)

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <KPICard label={t('reports.attendance.avgPresent')} value={`${data.length > 0 ? Math.round(totalPresent / data.length) : 0}/bln`} icon={<ClipboardList className="h-5 w-5" />} color="green" />
                <KPICard label={t('reports.attendance.avgLate')} value={`${data.length > 0 ? (totalLate / data.length).toFixed(1) : 0}/bln`} icon={<Calendar className="h-5 w-5" />} color="yellow" />
                <KPICard label={t('reports.attendance.totalAbsent')} value={String(totalAbsent)} icon={<Users className="h-5 w-5" />} color="red" />
                <KPICard label={t('reports.attendance.wfh')} value={String(totalWfh)} icon={<Building2 className="h-5 w-5" />} color="blue" />
            </div>

            {data.length > 0 ? (
                <>
                    {/* Mobile Card View */}
                    <div className="md:hidden space-y-3">
                        {data.map((a, i) => {
                            const totalDays = a.present + a.late + a.absent + a.wfh
                            const rate = totalDays > 0 ? ((a.present + a.wfh) / totalDays * 100) : 0
                            return (
                                <div key={i} className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{a.name}</span>
                                        <span className={`text-sm font-bold ${rate >= 90 ? 'text-green-600 dark:text-green-400' : rate >= 80 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'}`}>
                                            {rate.toFixed(1)}%
                                        </span>
                                    </div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">{a.department}</div>
                                    <div className="grid grid-cols-4 gap-2 text-xs">
                                        <div className="text-center">
                                            <div className="text-green-600 dark:text-green-400 font-medium">{a.present}</div>
                                            <div className="text-gray-500 dark:text-gray-400">{t('reports.attendance.present')}</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-yellow-600 dark:text-yellow-400 font-medium">{a.late}</div>
                                            <div className="text-gray-500 dark:text-gray-400">{t('reports.attendance.late')}</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-red-600 dark:text-red-400 font-medium">{a.absent}</div>
                                            <div className="text-gray-500 dark:text-gray-400">{t('reports.attendance.absent')}</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-blue-600 dark:text-blue-400 font-medium">{a.wfh}</div>
                                            <div className="text-gray-500 dark:text-gray-400">{t('reports.attendance.wfh')}</div>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>

                    {/* Desktop Table View */}
                    <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-200 dark:border-gray-700">
                                    <th className="text-left py-3 px-4 font-medium text-gray-600 dark:text-gray-400">{t('reports.common.name')}</th>
                                    <th className="text-left py-3 px-4 font-medium text-gray-600 dark:text-gray-400">{t('reports.common.department')}</th>
                                    <th className="text-center py-3 px-4 font-medium text-gray-600 dark:text-gray-400">{t('reports.attendance.present')}</th>
                                    <th className="text-center py-3 px-4 font-medium text-gray-600 dark:text-gray-400">{t('reports.attendance.late')}</th>
                                    <th className="text-center py-3 px-4 font-medium text-gray-600 dark:text-gray-400">{t('reports.attendance.absent')}</th>
                                    <th className="text-center py-3 px-4 font-medium text-gray-600 dark:text-gray-400">{t('reports.attendance.wfh')}</th>
                                    <th className="text-right py-3 px-4 font-medium text-gray-600 dark:text-gray-400">{t('reports.attendance.rate')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.map((a, i) => {
                                    const totalDays = a.present + a.late + a.absent + a.wfh
                                    const rate = totalDays > 0 ? ((a.present + a.wfh) / totalDays * 100) : 0
                                    return (
                                        <tr key={i} className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                                            <td className="py-3 px-4 font-medium text-gray-900 dark:text-gray-100">{a.name}</td>
                                            <td className="py-3 px-4 text-gray-600 dark:text-gray-400">{a.department}</td>
                                            <td className="py-3 px-4 text-center text-green-600 dark:text-green-400">{a.present}</td>
                                            <td className="py-3 px-4 text-center text-yellow-600 dark:text-yellow-400">{a.late}</td>
                                            <td className="py-3 px-4 text-center text-red-600 dark:text-red-400">{a.absent}</td>
                                            <td className="py-3 px-4 text-center text-blue-600 dark:text-blue-400">{a.wfh}</td>
                                            <td className="py-3 px-4 text-right">
                                                <span className={`font-medium ${rate >= 90 ? 'text-green-600 dark:text-green-400' : rate >= 80 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'}`}>
                                                    {rate.toFixed(1)}%
                                                </span>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </>
            ) : (
                <EmptyState message={t('reports.attendance.emptyState')} />
            )}
        </div>
    )
}

function PayrollSummaryReport({ data }: { data: PayrollData[] }) {
    const { t } = useTranslation()
    const totalPayroll = data.reduce((s, d) => s + d.totalSalary, 0)
    const totalHeadcount = data.reduce((s, d) => s + d.headcount, 0)

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                <KPICard label={t('reports.payroll.totalPayroll')} value={formatCurrency(totalPayroll)} icon={<DollarSign className="h-5 w-5" />} color="blue" />
                <KPICard label={t('reports.payroll.totalEmployees')} value={String(totalHeadcount)} icon={<Users className="h-5 w-5" />} color="green" />
                <KPICard label={t('reports.payroll.avgSalary')} value={totalHeadcount > 0 ? formatCurrency(Math.round(totalPayroll / totalHeadcount)) : '-'} icon={<BarChart3 className="h-5 w-5" />} color="purple" />
            </div>

            {data.length > 0 ? (
                <>
                    <div className="flex flex-col lg:flex-row gap-6">
                        <div className="flex-1">
                            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">{t('reports.payroll.chartTitle')}</h3>
                            <BarChart
                                data={data.map(d => d.totalSalary)}
                                labels={data.map(d => d.department)}
                                colors={['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899']}
                                height={220}
                            />
                        </div>
                        <div className="lg:w-48">
                            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">{t('reports.common.distribution')}</h3>
                            <PieChart
                                data={data.map(d => d.totalSalary)}
                                labels={data.map(d => d.department)}
                                colors={['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899']}
                                size={120}
                            />
                        </div>
                    </div>

                    {/* Mobile Card View */}
                    <div className="md:hidden space-y-3">
                        {data.map((d, i) => (
                            <div key={i} className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{d.department}</span>
                                    <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{formatCurrency(d.totalSalary)}</span>
                                </div>
                                <div className="grid grid-cols-3 gap-2 text-xs">
                                    <div>
                                        <span className="text-gray-500 dark:text-gray-400">{t('reports.payroll.employees')}: </span>
                                        <span className="text-gray-700 dark:text-gray-300">{d.headcount}</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-500 dark:text-gray-400">{t('reports.payroll.average')}: </span>
                                        <span className="text-gray-700 dark:text-gray-300">{formatCurrency(d.avgSalary)}</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-500 dark:text-gray-400">{t('reports.common.percentOfTotal')}: </span>
                                        <span className="text-gray-700 dark:text-gray-300">{totalPayroll > 0 ? (d.totalSalary / totalPayroll * 100).toFixed(1) : 0}%</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                        <div className="p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                            <div className="flex items-center justify-between text-sm font-semibold">
                                <span className="text-gray-900 dark:text-gray-100">{t('reports.common.total')}</span>
                                <span className="text-gray-900 dark:text-gray-100">{formatCurrency(totalPayroll)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Desktop Table View */}
                    <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-200 dark:border-gray-700">
                                    <th className="text-left py-3 px-4 font-medium text-gray-600 dark:text-gray-400">{t('reports.common.department')}</th>
                                    <th className="text-right py-3 px-4 font-medium text-gray-600 dark:text-gray-400">{t('reports.payroll.employees')}</th>
                                    <th className="text-right py-3 px-4 font-medium text-gray-600 dark:text-gray-400">{t('reports.payroll.totalSalary')}</th>
                                    <th className="text-right py-3 px-4 font-medium text-gray-600 dark:text-gray-400">{t('reports.payroll.average')}</th>
                                    <th className="text-right py-3 px-4 font-medium text-gray-600 dark:text-gray-400">{t('reports.common.percentOfTotal')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.map((d, i) => (
                                    <tr key={i} className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                                        <td className="py-3 px-4 font-medium text-gray-900 dark:text-gray-100">{d.department}</td>
                                        <td className="py-3 px-4 text-right text-gray-600 dark:text-gray-400">{d.headcount}</td>
                                        <td className="py-3 px-4 text-right font-medium text-gray-900 dark:text-gray-100">{formatCurrency(d.totalSalary)}</td>
                                        <td className="py-3 px-4 text-right text-gray-600 dark:text-gray-400">{formatCurrency(d.avgSalary)}</td>
                                        <td className="py-3 px-4 text-right text-gray-600 dark:text-gray-400">{totalPayroll > 0 ? (d.totalSalary / totalPayroll * 100).toFixed(1) : 0}%</td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr className="font-semibold border-t-2 border-gray-300 dark:border-gray-600">
                                    <td className="py-3 px-4 text-gray-900 dark:text-gray-100">{t('reports.common.total')}</td>
                                    <td className="py-3 px-4 text-right text-gray-900 dark:text-gray-100">{totalHeadcount}</td>
                                    <td className="py-3 px-4 text-right text-gray-900 dark:text-gray-100">{formatCurrency(totalPayroll)}</td>
                                    <td className="py-3 px-4 text-right text-gray-900 dark:text-gray-100">{totalHeadcount > 0 ? formatCurrency(Math.round(totalPayroll / totalHeadcount)) : '-'}</td>
                                    <td className="py-3 px-4 text-right text-gray-900 dark:text-gray-100">100%</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </>
            ) : (
                <EmptyState message={t('reports.payroll.emptyState')} />
            )}
        </div>
    )
}

/* ============================================
   INVENTORY REPORTS
   ============================================ */

function StockSummaryReport({ data }: { data: StockData[] }) {
    const { t } = useTranslation()
    const totalProducts = data.length
    const totalStockValue = data.reduce((s, d) => s + d.stock * Number(d.cost), 0)
    const totalRetailValue = data.reduce((s, d) => s + d.stock * Number(d.price), 0)

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                <KPICard label={t('reports.stockSummary.totalProducts')} value={String(totalProducts)} icon={<Package className="h-5 w-5" />} color="blue" />
                <KPICard label={t('reports.stockSummary.costValue')} value={formatCurrency(totalStockValue)} icon={<DollarSign className="h-5 w-5" />} color="orange" />
                <KPICard label={t('reports.stockSummary.retailValue')} value={formatCurrency(totalRetailValue)} icon={<TrendingUp className="h-5 w-5" />} color="green" />
            </div>

            {data.length > 0 ? (
                <>
                    {/* Mobile Card View */}
                    <div className="md:hidden space-y-3">
                        {data.map((d, i) => (
                            <div key={i} className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{d.name}</span>
                                    <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{formatCurrency(d.stock * d.cost)}</span>
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400 mb-2 font-mono">{d.sku} · {d.category}</div>
                                <div className="grid grid-cols-3 gap-2 text-xs">
                                    <div>
                                        <span className="text-gray-500 dark:text-gray-400">{t('reports.stockSummary.stock')}: </span>
                                        <span className="text-gray-700 dark:text-gray-300">{d.stock}</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-500 dark:text-gray-400">{t('reports.stockSummary.minStock')}: </span>
                                        <span className="text-gray-700 dark:text-gray-300">{d.minStock}</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-500 dark:text-gray-400">{t('reports.stockSummary.price')}: </span>
                                        <span className="text-gray-700 dark:text-gray-300">{formatCurrency(d.price)}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Desktop Table View */}
                    <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-200 dark:border-gray-700">
                                    <th className="text-left py-3 px-4 font-medium text-gray-600 dark:text-gray-400">SKU</th>
                                    <th className="text-left py-3 px-4 font-medium text-gray-600 dark:text-gray-400">{t('reports.stockSummary.product')}</th>
                                    <th className="text-left py-3 px-4 font-medium text-gray-600 dark:text-gray-400">{t('reports.common.category')}</th>
                                    <th className="text-right py-3 px-4 font-medium text-gray-600 dark:text-gray-400">{t('reports.stockSummary.stock')}</th>
                                    <th className="text-right py-3 px-4 font-medium text-gray-600 dark:text-gray-400">{t('reports.stockSummary.minStock')}</th>
                                    <th className="text-right py-3 px-4 font-medium text-gray-600 dark:text-gray-400">{t('reports.stockSummary.price')}</th>
                                    <th className="text-right py-3 px-4 font-medium text-gray-600 dark:text-gray-400">{t('reports.stockSummary.stockValue')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.map((d, i) => (
                                    <tr key={i} className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                                        <td className="py-3 px-4 text-gray-500 dark:text-gray-400 font-mono text-xs">{d.sku}</td>
                                        <td className="py-3 px-4 font-medium text-gray-900 dark:text-gray-100">{d.name}</td>
                                        <td className="py-3 px-4 text-gray-600 dark:text-gray-400">{d.category}</td>
                                        <td className="py-3 px-4 text-right text-gray-900 dark:text-gray-100">{d.stock}</td>
                                        <td className="py-3 px-4 text-right text-gray-600 dark:text-gray-400">{d.minStock}</td>
                                        <td className="py-3 px-4 text-right text-gray-600 dark:text-gray-400">{formatCurrency(d.price)}</td>
                                        <td className="py-3 px-4 text-right font-medium text-gray-900 dark:text-gray-100">{formatCurrency(d.stock * d.cost)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            ) : (
                <EmptyState message={t('reports.stockSummary.emptyState')} />
            )}
        </div>
    )
}

function LowStockReport({ data }: { data: StockData[] }) {
    const { t } = useTranslation()
    const lowStockItems = data.filter(d => d.stock <= d.minStock)

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
                <KPICard label={t('reports.lowStock.lowStockProducts')} value={String(lowStockItems.length)} icon={<Package className="h-5 w-5" />} color="red" />
                <KPICard label={t('reports.stockSummary.totalProducts')} value={String(data.length)} icon={<Package className="h-5 w-5" />} color="blue" />
            </div>

            {lowStockItems.length === 0 ? (
                <div className="text-center py-12">
                    <Package className="h-12 w-12 text-green-400 mx-auto mb-3" />
                    <p className="text-gray-600 dark:text-gray-400">{t('reports.lowStock.allStockSafe')}</p>
                </div>
            ) : (
                <>
                    {/* Mobile Card View */}
                    <div className="md:hidden space-y-3">
                        {lowStockItems.map((d, i) => {
                            const shortage = d.minStock - d.stock
                            return (
                                <div key={i} className="p-4 rounded-xl border border-red-200 dark:border-red-800 bg-white dark:bg-gray-800">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{d.name}</span>
                                        <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                                            {d.stock === 0 ? t('reports.lowStock.outOfStock') : t('reports.lowStock.critical')}
                                        </span>
                                    </div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-2 font-mono">{d.sku}</div>
                                    <div className="grid grid-cols-3 gap-2 text-xs">
                                        <div>
                                            <span className="text-gray-500 dark:text-gray-400">{t('reports.lowStock.currentStock')}: </span>
                                            <span className="text-red-600 dark:text-red-400 font-medium">{d.stock}</span>
                                        </div>
                                        <div>
                                            <span className="text-gray-500 dark:text-gray-400">{t('reports.lowStock.minimumStock')}: </span>
                                            <span className="text-gray-700 dark:text-gray-300">{d.minStock}</span>
                                        </div>
                                        <div>
                                            <span className="text-gray-500 dark:text-gray-400">{t('reports.lowStock.shortage')}: </span>
                                            <span className="text-red-600 dark:text-red-400 font-medium">-{shortage}</span>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>

                    {/* Desktop Table View */}
                    <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-200 dark:border-gray-700">
                                    <th className="text-left py-3 px-4 font-medium text-gray-600 dark:text-gray-400">SKU</th>
                                    <th className="text-left py-3 px-4 font-medium text-gray-600 dark:text-gray-400">{t('reports.stockSummary.product')}</th>
                                    <th className="text-right py-3 px-4 font-medium text-gray-600 dark:text-gray-400">{t('reports.lowStock.currentStock')}</th>
                                    <th className="text-right py-3 px-4 font-medium text-gray-600 dark:text-gray-400">{t('reports.lowStock.minimumStock')}</th>
                                    <th className="text-right py-3 px-4 font-medium text-gray-600 dark:text-gray-400">{t('reports.lowStock.shortage')}</th>
                                    <th className="text-center py-3 px-4 font-medium text-gray-600 dark:text-gray-400">{t('reports.common.status')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {lowStockItems.map((d, i) => {
                                    const shortage = d.minStock - d.stock
                                    return (
                                        <tr key={i} className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-red-50 dark:hover:bg-red-900/10">
                                            <td className="py-3 px-4 text-gray-500 dark:text-gray-400 font-mono text-xs">{d.sku}</td>
                                            <td className="py-3 px-4 font-medium text-gray-900 dark:text-gray-100">{d.name}</td>
                                            <td className="py-3 px-4 text-right text-red-600 dark:text-red-400 font-medium">{d.stock}</td>
                                            <td className="py-3 px-4 text-right text-gray-600 dark:text-gray-400">{d.minStock}</td>
                                            <td className="py-3 px-4 text-right text-red-600 dark:text-red-400 font-medium">-{shortage}</td>
                                            <td className="py-3 px-4 text-center">
                                                <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                                                    {d.stock === 0 ? t('reports.lowStock.outOfStock') : t('reports.lowStock.critical')}
                                                </span>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </div>
    )
}

function SupplierPerformanceReport({ data }: { data: SupplierData[] }) {
    const { t } = useTranslation()
    const avgRating = data.length > 0 ? data.reduce((s, d) => s + Number(d.rating), 0) / data.length : 0

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                <KPICard label={t('reports.supplierPerformance.totalSuppliers')} value={String(data.length)} icon={<Truck className="h-5 w-5" />} color="blue" />
                <KPICard label={t('reports.supplierPerformance.avgRating')} value={avgRating.toFixed(1)} icon={<BarChart3 className="h-5 w-5" />} color="green" />
                <KPICard label={t('reports.supplierPerformance.totalPurchases')} value={formatCurrency(data.reduce((s, d) => s + Number(d.totalSpent), 0))} icon={<DollarSign className="h-5 w-5" />} color="orange" />
            </div>

            {data.length > 0 ? (
                <>
                    {/* Mobile Card View */}
                    <div className="md:hidden space-y-3">
                        {data.map((d, i) => (
                            <div key={i} className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                        <span className="text-gray-500 dark:text-gray-400 text-xs mr-1">#{i + 1}</span>
                                        {d.name}
                                    </span>
                                    <div className="flex items-center gap-1">
                                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                        <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{d.rating}</span>
                                    </div>
                                </div>
                                <div className="grid grid-cols-3 gap-2 text-xs">
                                    <div>
                                        <span className="text-gray-500 dark:text-gray-400">{t('reports.supplierPerformance.totalOrders')}: </span>
                                        <span className="text-gray-700 dark:text-gray-300">{d.orders}</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-500 dark:text-gray-400">{t('reports.supplierPerformance.onTimePercent')}: </span>
                                        <span className={`font-medium ${d.orders > 0 && (d.onTime / d.orders * 100) >= 90 ? 'text-green-600 dark:text-green-400' : d.orders > 0 && (d.onTime / d.orders * 100) >= 75 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'}`}>
                                            {d.orders > 0 ? (d.onTime / d.orders * 100).toFixed(1) : 0}%
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-gray-500 dark:text-gray-400">{t('reports.supplierPerformance.totalSpending')}: </span>
                                        <span className="text-gray-700 dark:text-gray-300">{formatCurrency(d.totalSpent)}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Desktop Table View */}
                    <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-200 dark:border-gray-700">
                                    <th className="text-left py-3 px-4 font-medium text-gray-600 dark:text-gray-400">#</th>
                                    <th className="text-left py-3 px-4 font-medium text-gray-600 dark:text-gray-400">{t('reports.supplierPerformance.supplier')}</th>
                                    <th className="text-center py-3 px-4 font-medium text-gray-600 dark:text-gray-400">{t('reports.supplierPerformance.rating')}</th>
                                    <th className="text-right py-3 px-4 font-medium text-gray-600 dark:text-gray-400">{t('reports.supplierPerformance.totalOrders')}</th>
                                    <th className="text-right py-3 px-4 font-medium text-gray-600 dark:text-gray-400">{t('reports.supplierPerformance.onTime')}</th>
                                    <th className="text-right py-3 px-4 font-medium text-gray-600 dark:text-gray-400">{t('reports.supplierPerformance.onTimePercent')}</th>
                                    <th className="text-right py-3 px-4 font-medium text-gray-600 dark:text-gray-400">{t('reports.supplierPerformance.totalSpending')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.map((d, i) => (
                                    <tr key={i} className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                                        <td className="py-3 px-4 text-gray-500 dark:text-gray-400">{i + 1}</td>
                                        <td className="py-3 px-4 font-medium text-gray-900 dark:text-gray-100">{d.name}</td>
                                        <td className="py-3 px-4 text-center">
                                            <div className="flex items-center justify-center gap-1">
                                                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                                <span className="font-medium text-gray-900 dark:text-gray-100">{d.rating}</span>
                                            </div>
                                        </td>
                                        <td className="py-3 px-4 text-right text-gray-600 dark:text-gray-400">{d.orders}</td>
                                        <td className="py-3 px-4 text-right text-green-600 dark:text-green-400">{d.onTime}</td>
                                        <td className="py-3 px-4 text-right">
                                            <span className={`font-medium ${d.orders > 0 && (d.onTime / d.orders * 100) >= 90 ? 'text-green-600 dark:text-green-400' : d.orders > 0 && (d.onTime / d.orders * 100) >= 75 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'}`}>
                                                {d.orders > 0 ? (d.onTime / d.orders * 100).toFixed(1) : 0}%
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-right font-medium text-gray-900 dark:text-gray-100">{formatCurrency(d.totalSpent)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            ) : (
                <EmptyState message={t('reports.supplierPerformance.emptyState')} />
            )}
        </div>
    )
}

/* ============================================
   SHARED: KPI Card Component
   ============================================ */

function KPICard({
    label,
    value,
    icon,
    color,
}: {
    label: string
    value: string
    icon: React.ReactNode
    color: 'blue' | 'green' | 'red' | 'purple' | 'orange' | 'yellow'
}) {
    const colorClasses: Record<string, string> = {
        blue: 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
        green: 'bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400',
        red: 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400',
        purple: 'bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
        orange: 'bg-orange-50 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
        yellow: 'bg-yellow-50 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400',
    }

    return (
        <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${colorClasses[color]}`}>{icon}</div>
                <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{value}</p>
                </div>
            </div>
        </div>
    )
}

/* ============================================
   SHARED: Empty State Component
   ============================================ */

function EmptyState({ message }: { message: string }) {
    const { t } = useTranslation()
    return (
        <div className="text-center py-12">
            <FileText className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400">{message}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{t('reports.common.emptyStateHint')}</p>
        </div>
    )
}

/* ============================================
   FINANCIAL STATEMENTS: TRIAL BALANCE
   ============================================ */

function TrialBalanceReport({ data }: { data: TrialBalanceData }) {
    const { t } = useTranslation()

    const accountTypeLabels: Record<string, string> = {
        ASSET: 'Aset',
        LIABILITY: 'Kewajiban',
        EQUITY: 'Ekuitas',
        REVENUE: 'Pendapatan',
        EXPENSE: 'Beban',
    }

    const accountTypeColors: Record<string, string> = {
        ASSET: 'text-blue-600 dark:text-blue-400',
        LIABILITY: 'text-red-600 dark:text-red-400',
        EQUITY: 'text-purple-600 dark:text-purple-400',
        REVENUE: 'text-green-600 dark:text-green-400',
        EXPENSE: 'text-orange-600 dark:text-orange-400',
    }

    return (
        <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <KPICard label="Total Debit" value={formatCurrency(data.totalDebit)} icon={<ArrowUpRight className="h-5 w-5" />} color="blue" />
                <KPICard label="Total Kredit" value={formatCurrency(data.totalCredit)} icon={<ArrowDownRight className="h-5 w-5" />} color="red" />
                <KPICard label="Selisih" value={formatCurrency(Math.abs(data.totalDebit - data.totalCredit))} icon={<DollarSign className="h-5 w-5" />} color={data.isBalanced ? 'green' : 'red'} />
                <KPICard label="Status" value={data.isBalanced ? 'Seimbang ✓' : 'Tidak Seimbang ✗'} icon={<ClipboardList className="h-5 w-5" />} color={data.isBalanced ? 'green' : 'red'} />
            </div>

            {/* Balance indicator */}
            {!data.isBalanced && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <div className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-red-500" />
                        <span className="text-sm text-red-700 dark:text-red-400 font-medium">
                            Trial Balance tidak seimbang! Selisih: {formatCurrency(Math.abs(data.totalDebit - data.totalCredit))}
                        </span>
                    </div>
                </div>
            )}

            {/* Table */}
            {data.accounts.length > 0 ? (
                <>
                    {/* Mobile Card View */}
                    <div className="md:hidden space-y-3">
                        {data.accounts.map((acc) => (
                            <div key={acc.accountId} className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-mono text-gray-500 dark:text-gray-400">{acc.accountCode}</span>
                                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{acc.accountName}</span>
                                    </div>
                                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${accountTypeColors[acc.accountType]} bg-gray-100 dark:bg-gray-700`}>
                                        {accountTypeLabels[acc.accountType] || acc.accountType}
                                    </span>
                                </div>
                                <div className="grid grid-cols-3 gap-2 text-xs">
                                    <div>
                                        <span className="text-gray-500 dark:text-gray-400">Debit: </span>
                                        <span className="text-gray-700 dark:text-gray-300 font-medium">{acc.totalDebit > 0 ? formatCurrency(acc.totalDebit) : '-'}</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-500 dark:text-gray-400">Kredit: </span>
                                        <span className="text-gray-700 dark:text-gray-300 font-medium">{acc.totalCredit > 0 ? formatCurrency(acc.totalCredit) : '-'}</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-500 dark:text-gray-400">Saldo: </span>
                                        <span className={`font-bold ${acc.balanceType === 'debit' ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400'}`}>
                                            {formatCurrency(acc.balance)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {/* Totals */}
                        <div className="p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                            <div className="grid grid-cols-3 gap-2 text-sm font-semibold">
                                <div>
                                    <span className="text-gray-500 dark:text-gray-400 text-xs">Total Debit: </span>
                                    <span className="text-blue-600 dark:text-blue-400">{formatCurrency(data.totalDebit)}</span>
                                </div>
                                <div>
                                    <span className="text-gray-500 dark:text-gray-400 text-xs">Total Kredit: </span>
                                    <span className="text-red-600 dark:text-red-400">{formatCurrency(data.totalCredit)}</span>
                                </div>
                                <div>
                                    <span className="text-gray-500 dark:text-gray-400 text-xs">Selisih: </span>
                                    <span className={data.isBalanced ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                                        {formatCurrency(Math.abs(data.totalDebit - data.totalCredit))}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Desktop Table View */}
                    <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-200 dark:border-gray-700">
                                    <th className="text-left py-3 px-4 font-medium text-gray-600 dark:text-gray-400">Kode Akun</th>
                                    <th className="text-left py-3 px-4 font-medium text-gray-600 dark:text-gray-400">Nama Akun</th>
                                    <th className="text-center py-3 px-4 font-medium text-gray-600 dark:text-gray-400">Tipe</th>
                                    <th className="text-right py-3 px-4 font-medium text-gray-600 dark:text-gray-400">Debit</th>
                                    <th className="text-right py-3 px-4 font-medium text-gray-600 dark:text-gray-400">Kredit</th>
                                    <th className="text-right py-3 px-4 font-medium text-gray-600 dark:text-gray-400">Saldo</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.accounts.map((acc) => (
                                    <tr key={acc.accountId} className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                                        <td className="py-3 px-4 font-mono text-xs text-gray-500 dark:text-gray-400">{acc.accountCode}</td>
                                        <td className="py-3 px-4 font-medium text-gray-900 dark:text-gray-100">{acc.accountName}</td>
                                        <td className="py-3 px-4 text-center">
                                            <span className={`text-xs font-medium ${accountTypeColors[acc.accountType]}`}>
                                                {accountTypeLabels[acc.accountType] || acc.accountType}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-right text-gray-600 dark:text-gray-400">
                                            {acc.totalDebit > 0 ? formatCurrency(acc.totalDebit) : '-'}
                                        </td>
                                        <td className="py-3 px-4 text-right text-gray-600 dark:text-gray-400">
                                            {acc.totalCredit > 0 ? formatCurrency(acc.totalCredit) : '-'}
                                        </td>
                                        <td className="py-3 px-4 text-right font-bold">
                                            <span className={acc.balanceType === 'debit' ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400'}>
                                                {formatCurrency(acc.balance)}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr className="font-semibold border-t-2 border-gray-300 dark:border-gray-600">
                                    <td colSpan={3} className="py-3 px-4 text-gray-900 dark:text-gray-100">Total</td>
                                    <td className="py-3 px-4 text-right text-blue-600 dark:text-blue-400">{formatCurrency(data.totalDebit)}</td>
                                    <td className="py-3 px-4 text-right text-red-600 dark:text-red-400">{formatCurrency(data.totalCredit)}</td>
                                    <td className="py-3 px-4 text-right">
                                        <span className={data.isBalanced ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                                            {data.isBalanced ? 'Seimbang ✓' : formatCurrency(Math.abs(data.totalDebit - data.totalCredit))}
                                        </span>
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </>
            ) : (
                <EmptyState message="Tidak ada data akun untuk periode ini" />
            )}
        </div>
    )
}

/* ============================================
   FINANCIAL STATEMENTS: BALANCE SHEET (NERACA)
   ============================================ */

function BalanceSheetReport({ data }: { data: BalanceSheetData }) {
    const { t } = useTranslation()

    function renderSection(section: BalanceSheetSection, color: string) {
        if (section.accounts.length === 0) return null
        return (
            <div className="mb-6">
                <h4 className={`text-sm font-semibold ${color} mb-3`}>{section.label}</h4>
                <div className="space-y-2">
                    {section.accounts.map((acc) => (
                        <div key={acc.accountId} className="flex items-center justify-between py-1.5 px-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/30">
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-mono text-gray-400 dark:text-gray-500 w-16">{acc.accountCode}</span>
                                <span className="text-sm text-gray-700 dark:text-gray-300">{acc.accountName}</span>
                            </div>
                            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{formatCurrency(acc.balance)}</span>
                        </div>
                    ))}
                </div>
                <div className={`flex items-center justify-between py-2 px-3 mt-1 border-t ${color === 'text-blue-600' ? 'border-blue-200 dark:border-blue-800' : color === 'text-red-600' ? 'border-red-200 dark:border-red-800' : 'border-purple-200 dark:border-purple-800'}`}>
                    <span className={`text-sm font-semibold ${color}`}>Total {section.label.split('(')[0].trim()}</span>
                    <span className={`text-sm font-bold ${color}`}>{formatCurrency(section.total)}</span>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <KPICard label="Total Aset" value={formatCurrency(data.assets.total)} icon={<DollarSign className="h-5 w-5" />} color="blue" />
                <KPICard label="Total Kewajiban" value={formatCurrency(data.liabilities.total)} icon={<ArrowDownRight className="h-5 w-5" />} color="red" />
                <KPICard label="Total Ekuitas" value={formatCurrency(data.equity.total)} icon={<ArrowUpRight className="h-5 w-5" />} color="green" />
            </div>

            {/* Balance indicator */}
            {!data.isBalanced && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <div className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-red-500" />
                        <span className="text-sm text-red-700 dark:text-red-400 font-medium">
                            Neraca tidak seimbang! Aset: {formatCurrency(data.assets.total)} ≠ Kewajiban + Ekuitas: {formatCurrency(data.totalLiabilitiesAndEquity)}
                        </span>
                    </div>
                </div>
            )}

            {/* Balance Sheet Content */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Assets */}
                <div className="p-4 sm:p-6 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                    <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                        <Building2 className="h-5 w-5 text-blue-500" />
                        Aset (Assets)
                    </h3>
                    {renderSection(data.assets.current, 'text-blue-600 dark:text-blue-400')}
                    {renderSection(data.assets.nonCurrent, 'text-blue-600 dark:text-blue-400')}
                    <div className="flex items-center justify-between py-3 px-3 mt-2 border-t-2 border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <span className="text-sm font-bold text-blue-700 dark:text-blue-300">Total Aset</span>
                        <span className="text-base font-bold text-blue-700 dark:text-blue-300">{formatCurrency(data.assets.total)}</span>
                    </div>
                </div>

                {/* Liabilities + Equity */}
                <div className="p-4 sm:p-6 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                    <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                        <Building2 className="h-5 w-5 text-red-500" />
                        Kewajiban & Ekuitas
                    </h3>
                    {renderSection(data.liabilities.current, 'text-red-600 dark:text-red-400')}
                    {renderSection(data.liabilities.longTerm, 'text-red-600 dark:text-red-400')}
                    {renderSection(data.equity, 'text-purple-600 dark:text-purple-400')}
                    <div className="flex items-center justify-between py-3 px-3 mt-2 border-t-2 border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20 rounded-lg">
                        <span className="text-sm font-bold text-red-700 dark:text-red-300">Total Kewajiban + Ekuitas</span>
                        <span className="text-base font-bold text-red-700 dark:text-red-300">{formatCurrency(data.totalLiabilitiesAndEquity)}</span>
                    </div>
                </div>
            </div>
        </div>
    )
}

/* ============================================
   FINANCIAL STATEMENTS: INCOME STATEMENT (LABA RUGI)
   ============================================ */

function IncomeStatementReport({ data }: { data: IncomeStatementData }) {
    const { t } = useTranslation()

    return (
        <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <KPICard label="Pendapatan" value={formatCurrency(data.revenue.total)} icon={<ArrowUpRight className="h-5 w-5" />} color="green" />
                <KPICard label="HPP" value={formatCurrency(data.cogs.total)} icon={<ArrowDownRight className="h-5 w-5" />} color="orange" />
                <KPICard label="Laba Kotor" value={formatCurrency(data.grossProfit)} icon={<DollarSign className="h-5 w-5" />} color={data.grossProfit >= 0 ? 'blue' : 'red'} />
                <KPICard label="Laba Bersih" value={formatCurrency(data.netIncome)} icon={<DollarSign className="h-5 w-5" />} color={data.netIncome >= 0 ? 'green' : 'red'} />
            </div>

            {/* Main Income Statement */}
            <div className="p-4 sm:p-6 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                <div className="space-y-4">
                    {/* Revenue */}
                    <div>
                        <h4 className="text-sm font-semibold text-green-600 dark:text-green-400 mb-2">Pendapatan Usaha (Revenue)</h4>
                        {data.revenue.accounts.length > 0 ? (
                            <div className="space-y-1 ml-4">
                                {data.revenue.accounts.map((acc) => (
                                    <div key={acc.accountId} className="flex items-center justify-between py-1">
                                        <span className="text-sm text-gray-600 dark:text-gray-400">
                                            <span className="text-xs font-mono mr-2">{acc.accountCode}</span>
                                            {acc.accountName}
                                        </span>
                                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{formatCurrency(acc.amount)}</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-gray-400 dark:text-gray-500 ml-4">Tidak ada data</p>
                        )}
                        <div className="flex items-center justify-between py-2 px-4 mt-1 bg-green-50 dark:bg-green-900/20 rounded-lg">
                            <span className="text-sm font-semibold text-green-700 dark:text-green-300">Total Pendapatan</span>
                            <span className="text-sm font-bold text-green-700 dark:text-green-300">{formatCurrency(data.revenue.total)}</span>
                        </div>
                    </div>

                    {/* COGS */}
                    <div>
                        <h4 className="text-sm font-semibold text-orange-600 dark:text-orange-400 mb-2">Harga Pokok Penjualan (COGS)</h4>
                        {data.cogs.accounts.length > 0 ? (
                            <div className="space-y-1 ml-4">
                                {data.cogs.accounts.map((acc) => (
                                    <div key={acc.accountId} className="flex items-center justify-between py-1">
                                        <span className="text-sm text-gray-600 dark:text-gray-400">
                                            <span className="text-xs font-mono mr-2">{acc.accountCode}</span>
                                            {acc.accountName}
                                        </span>
                                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{formatCurrency(acc.amount)}</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-gray-400 dark:text-gray-500 ml-4">Tidak ada data</p>
                        )}
                        <div className="flex items-center justify-between py-2 px-4 mt-1 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                            <span className="text-sm font-semibold text-orange-700 dark:text-orange-300">Total HPP</span>
                            <span className="text-sm font-bold text-orange-700 dark:text-orange-300">{formatCurrency(data.cogs.total)}</span>
                        </div>
                    </div>

                    {/* Gross Profit */}
                    <div className="flex items-center justify-between py-3 px-4 border-t-2 border-b border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                        <span className="text-sm font-bold text-gray-900 dark:text-gray-100">Laba Kotor (Gross Profit)</span>
                        <span className={`text-base font-bold ${data.grossProfit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                            {formatCurrency(data.grossProfit)}
                        </span>
                    </div>

                    {/* Operating Expenses */}
                    <div>
                        <h4 className="text-sm font-semibold text-red-600 dark:text-red-400 mb-2">Biaya Operasional</h4>
                        {data.operatingExpenses.accounts.length > 0 ? (
                            <div className="space-y-1 ml-4">
                                {data.operatingExpenses.accounts.map((acc) => (
                                    <div key={acc.accountId} className="flex items-center justify-between py-1">
                                        <span className="text-sm text-gray-600 dark:text-gray-400">
                                            <span className="text-xs font-mono mr-2">{acc.accountCode}</span>
                                            {acc.accountName}
                                        </span>
                                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{formatCurrency(acc.amount)}</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-gray-400 dark:text-gray-500 ml-4">Tidak ada data</p>
                        )}
                        <div className="flex items-center justify-between py-2 px-4 mt-1 bg-red-50 dark:bg-red-900/20 rounded-lg">
                            <span className="text-sm font-semibold text-red-700 dark:text-red-300">Total Biaya Operasional</span>
                            <span className="text-sm font-bold text-red-700 dark:text-red-300">{formatCurrency(data.operatingExpenses.total)}</span>
                        </div>
                    </div>

                    {/* Operating Income */}
                    <div className="flex items-center justify-between py-3 px-4 border-t-2 border-b border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                        <span className="text-sm font-bold text-gray-900 dark:text-gray-100">Laba Operasional (Operating Income)</span>
                        <span className={`text-base font-bold ${data.operatingIncome >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                            {formatCurrency(data.operatingIncome)}
                        </span>
                    </div>

                    {/* Non-Operating Income */}
                    {(data.nonOperatingIncome.total !== 0 || data.nonOperatingExpenses.total !== 0) && (
                        <>
                            <div className="grid grid-cols-2 gap-4">
                                {data.nonOperatingIncome.total !== 0 && (
                                    <div>
                                        <h4 className="text-sm font-semibold text-green-600 dark:text-green-400 mb-2">Pendapatan Non-Operasional</h4>
                                        {data.nonOperatingIncome.accounts.map((acc) => (
                                            <div key={acc.accountId} className="flex items-center justify-between py-1 ml-4">
                                                <span className="text-xs text-gray-500 dark:text-gray-400">{acc.accountName}</span>
                                                <span className="text-sm font-medium text-green-600 dark:text-green-400">{formatCurrency(acc.amount)}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {data.nonOperatingExpenses.total !== 0 && (
                                    <div>
                                        <h4 className="text-sm font-semibold text-red-600 dark:text-red-400 mb-2">Beban Non-Operasional</h4>
                                        {data.nonOperatingExpenses.accounts.map((acc) => (
                                            <div key={acc.accountId} className="flex items-center justify-between py-1 ml-4">
                                                <span className="text-xs text-gray-500 dark:text-gray-400">{acc.accountName}</span>
                                                <span className="text-sm font-medium text-red-600 dark:text-red-400">{formatCurrency(acc.amount)}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </>
                    )}

                    {/* Net Income */}
                    <div className="flex items-center justify-between py-4 px-4 border-t-2 border-gray-300 dark:border-gray-500 bg-gray-100 dark:bg-gray-700 rounded-lg">
                        <span className="text-base font-bold text-gray-900 dark:text-gray-100">Laba Bersih (Net Income)</span>
                        <span className={`text-xl font-bold ${data.netIncome >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                            {formatCurrency(data.netIncome)}
                        </span>
                    </div>
                </div>
            </div>

            {/* Period Breakdown */}
            {data.byPeriod.length > 1 && (
                <div className="p-4 sm:p-6 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                    <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-4">Breakdown Periode</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-200 dark:border-gray-700">
                                    <th className="text-left py-3 px-4 font-medium text-gray-600 dark:text-gray-400">Periode</th>
                                    <th className="text-right py-3 px-4 font-medium text-gray-600 dark:text-gray-400">Pendapatan</th>
                                    <th className="text-right py-3 px-4 font-medium text-gray-600 dark:text-gray-400">HPP</th>
                                    <th className="text-right py-3 px-4 font-medium text-gray-600 dark:text-gray-400">Laba Kotor</th>
                                    <th className="text-right py-3 px-4 font-medium text-gray-600 dark:text-gray-400">Biaya Ops</th>
                                    <th className="text-right py-3 px-4 font-medium text-gray-600 dark:text-gray-400">Laba Bersih</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.byPeriod.map((pd) => (
                                    <tr key={pd.period} className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                                        <td className="py-3 px-4 font-medium text-gray-900 dark:text-gray-100">{pd.period}</td>
                                        <td className="py-3 px-4 text-right text-green-600 dark:text-green-400">{formatCurrency(pd.revenue)}</td>
                                        <td className="py-3 px-4 text-right text-orange-600 dark:text-orange-400">{formatCurrency(pd.cogs)}</td>
                                        <td className="py-3 px-4 text-right text-blue-600 dark:text-blue-400">{formatCurrency(pd.grossProfit)}</td>
                                        <td className="py-3 px-4 text-right text-red-600 dark:text-red-400">{formatCurrency(pd.operatingExpenses)}</td>
                                        <td className={`py-3 px-4 text-right font-bold ${pd.netIncome >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                            {formatCurrency(pd.netIncome)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    )
}

/* ============================================
   TRUCK ICON (custom, not from lucide)
   ============================================ */

function Truck({ className }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" />
            <path d="M15 18H9" />
            <path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14" />
            <circle cx="17" cy="18" r="2" />
            <circle cx="7" cy="18" r="2" />
        </svg>
    )
}
