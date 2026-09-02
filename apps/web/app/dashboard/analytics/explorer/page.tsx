'use client'

import { useState, useCallback } from 'react'
import { formatCurrency, formatNumber } from '@/lib/utils'
import { useTranslation } from '@/lib/i18n'
import {
    Search,
    Plus,
    Trash2,
    Download,
    Save,
    Table,
    BarChart3,
    ChevronLeft,
    ChevronRight,
    Loader2,
    AlertCircle,
    Check,
    X,
} from 'lucide-react'

/* ============================================
   TYPES
   ============================================ */

interface DatasetDimension {
    id: string
    name: string
    nameKey: string
    type: string
    sourceField: string
}

interface DatasetMeasure {
    id: string
    name: string
    nameKey: string
    aggregation: string
    sourceField: string
    dataType: string
}

interface DatasetDef {
    id: string
    name: string
    type: string
    sourceModel: string
    dimensions: DatasetDimension[]
    measures: DatasetMeasure[]
}

interface ExplorerFilter {
    field: string
    operator: string
    value: string
}

interface ExplorerColumn {
    key: string
    name: string
    type: 'dimension' | 'measure'
    dataType: string
    format?: string
}

interface ExplorerResult {
    data: Array<Record<string, string | number | boolean | null>>
    columns: ExplorerColumn[]
    metadata: {
        totalRows: number
        executionTimeMs: number
        generatedAt: string
    }
}

interface ExplorerResponse {
    success: boolean
    data: ExplorerResult
}

/* ============================================
   DATASET DEFINITIONS (inline from API)
   ============================================ */

const ALL_DATASETS: DatasetDef[] = [
    {
        id: 'invoices',
        name: 'Sales Invoices',
        type: 'finance',
        sourceModel: 'Invoice',
        dimensions: [
            { id: 'date', name: 'Date', nameKey: 'dimensions.date', type: 'temporal', sourceField: 'createdAt' },
            { id: 'status', name: 'Status', nameKey: 'dimensions.status', type: 'ordinal', sourceField: 'status' },
        ],
        measures: [
            { id: 'invoice_total', name: 'Invoice Total', nameKey: 'measures.invoice_total', aggregation: 'sum', sourceField: 'total', dataType: 'currency' },
            { id: 'tax_amount', name: 'Tax Amount', nameKey: 'measures.tax_amount', aggregation: 'sum', sourceField: 'taxAmount', dataType: 'currency' },
            { id: 'invoice_count', name: 'Invoice Count', nameKey: 'measures.invoice_count', aggregation: 'count', sourceField: 'id', dataType: 'number' },
            { id: 'avg_invoice', name: 'Average Invoice', nameKey: 'measures.avg_invoice', aggregation: 'avg', sourceField: 'total', dataType: 'currency' },
        ],
    },
    {
        id: 'payments',
        name: 'Payments',
        type: 'finance',
        sourceModel: 'Payment',
        dimensions: [
            { id: 'date', name: 'Date', nameKey: 'dimensions.date', type: 'temporal', sourceField: 'createdAt' },
            { id: 'status', name: 'Status', nameKey: 'dimensions.status', type: 'ordinal', sourceField: 'status' },
        ],
        measures: [
            { id: 'payment_amount', name: 'Payment Amount', nameKey: 'measures.payment_amount', aggregation: 'sum', sourceField: 'amount', dataType: 'currency' },
            { id: 'payment_count', name: 'Payment Count', nameKey: 'measures.payment_count', aggregation: 'count', sourceField: 'id', dataType: 'number' },
        ],
    },
    {
        id: 'deals',
        name: 'Sales Deals',
        type: 'crm',
        sourceModel: 'Deal',
        dimensions: [
            { id: 'date', name: 'Date', nameKey: 'dimensions.date', type: 'temporal', sourceField: 'createdAt' },
            { id: 'stage', name: 'Deal Stage', nameKey: 'dimensions.stage', type: 'ordinal', sourceField: 'stage' },
        ],
        measures: [
            { id: 'deal_value', name: 'Deal Value', nameKey: 'measures.deal_value', aggregation: 'sum', sourceField: 'value', dataType: 'currency' },
            { id: 'deal_count', name: 'Deal Count', nameKey: 'measures.deal_count', aggregation: 'count', sourceField: 'id', dataType: 'number' },
        ],
    },
    {
        id: 'products',
        name: 'Products & Inventory',
        type: 'inventory',
        sourceModel: 'Product',
        dimensions: [
            { id: 'category', name: 'Category', nameKey: 'dimensions.category', type: 'nominal', sourceField: 'categoryId' },
            { id: 'date', name: 'Date', nameKey: 'dimensions.date', type: 'temporal', sourceField: 'createdAt' },
        ],
        measures: [
            { id: 'stock_level', name: 'Stock Level', nameKey: 'measures.stock_level', aggregation: 'sum', sourceField: 'stock', dataType: 'number' },
            { id: 'stock_value', name: 'Stock Value', nameKey: 'measures.stock_value', aggregation: 'sum', sourceField: 'stock', dataType: 'currency' },
            { id: 'product_count', name: 'Product Count', nameKey: 'measures.product_count', aggregation: 'count', sourceField: 'id', dataType: 'number' },
        ],
    },
    {
        id: 'employees',
        name: 'Employees',
        type: 'hr',
        sourceModel: 'Employee',
        dimensions: [
            { id: 'department', name: 'Department', nameKey: 'dimensions.department', type: 'nominal', sourceField: 'department' },
            { id: 'date', name: 'Date', nameKey: 'dimensions.date', type: 'temporal', sourceField: 'createdAt' },
        ],
        measures: [
            { id: 'employee_count', name: 'Employee Count', nameKey: 'measures.employee_count', aggregation: 'count', sourceField: 'id', dataType: 'number' },
            { id: 'total_salary', name: 'Total Salary', nameKey: 'measures.total_salary', aggregation: 'sum', sourceField: 'salary', dataType: 'currency' },
            { id: 'avg_salary', name: 'Average Salary', nameKey: 'measures.avg_salary', aggregation: 'avg', sourceField: 'salary', dataType: 'currency' },
        ],
    },
]

const OPERATORS: { value: string; label: string }[] = [
    { value: 'eq', label: 'Equals' },
    { value: 'neq', label: 'Not Equals' },
    { value: 'gt', label: 'Greater Than' },
    { value: 'gte', label: 'Greater or Equal' },
    { value: 'lt', label: 'Less Than' },
    { value: 'lte', label: 'Less or Equal' },
    { value: 'contains', label: 'Contains' },
    { value: 'in', label: 'In' },
]

const PAGE_SIZE = 20

/* ============================================
   MAIN PAGE
   ============================================ */

export default function DataExplorerPage() {
    const { t } = useTranslation()

    // Config state
    const [selectedDataset, setSelectedDataset] = useState('invoices')
    const [selectedDimensions, setSelectedDimensions] = useState<string[]>(['date'])
    const [selectedMeasures, setSelectedMeasures] = useState<string[]>(['invoice_total', 'invoice_count'])
    const [filters, setFilters] = useState<ExplorerFilter[]>([])
    const [dateFrom, setDateFrom] = useState('2026-01-01')
    const [dateTo, setDateTo] = useState('2026-12-31')

    // Result state
    const [result, setResult] = useState<ExplorerResult | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [viewMode, setViewMode] = useState<'table' | 'chart'>('table')
    const [page, setPage] = useState(1)

    // Save state
    const [showSaveModal, setShowSaveModal] = useState(false)
    const [saveName, setSaveName] = useState('')
    const [saveTags, setSaveTags] = useState('')
    const [saving, setSaving] = useState(false)

    const dataset = ALL_DATASETS.find(d => d.id === selectedDataset)

    /* ---------- Toggle helpers ---------- */
    const toggleDimension = (dimId: string) => {
        setSelectedDimensions(prev =>
            prev.includes(dimId) ? prev.filter(d => d !== dimId) : [...prev, dimId]
        )
    }

    const toggleMeasure = (measureId: string) => {
        setSelectedMeasures(prev =>
            prev.includes(measureId) ? prev.filter(m => m !== measureId) : [...prev, measureId]
        )
    }

    const addFilter = () => {
        setFilters(prev => [...prev, { field: 'status', operator: 'eq', value: '' }])
    }

    const removeFilter = (index: number) => {
        setFilters(prev => prev.filter((_, i) => i !== index))
    }

    const updateFilter = (index: number, updates: Partial<ExplorerFilter>) => {
        setFilters(prev => prev.map((f, i) => i === index ? { ...f, ...updates } : f))
    }

    /* ---------- Analyze ---------- */
    const runAnalysis = useCallback(async () => {
        if (selectedDimensions.length === 0 && selectedMeasures.length === 0) {
            setError('Select at least one dimension or measure')
            return
        }
        try {
            setLoading(true)
            setError(null)
            setPage(1)

            const res = await fetch('/api/analytics/explorer', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    dataset: selectedDataset,
                    dimensions: selectedDimensions,
                    measures: selectedMeasures,
                    filters: filters.filter(f => f.value !== ''),
                    dateRange: {
                        from: dateFrom,
                        to: dateTo,
                    },
                    limit: 100,
                }),
            })
            const json: ExplorerResponse = await res.json()
            if (!res.ok || !json.success) {
                throw new Error(json.data?.metadata?.totalRows !== undefined ? 'Query failed' : 'Failed to analyze')
            }
            setResult(json.data)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error')
        } finally {
            setLoading(false)
        }
    }, [selectedDataset, selectedDimensions, selectedMeasures, filters, dateFrom, dateTo])

    /* ---------- Save ---------- */
    const saveReport = async () => {
        if (!saveName.trim()) return
        try {
            setSaving(true)
            const res = await fetch('/api/analytics/reports', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: saveName,
                    type: 'query',
                    config: {
                        dataset: selectedDataset,
                        dimensions: selectedDimensions,
                        measures: selectedMeasures,
                        filters,
                        dateRange: { from: dateFrom, to: dateTo },
                    },
                    tags: saveTags.split(',').map(s => s.trim()).filter(Boolean),
                }),
            })
            if (!res.ok) throw new Error('Failed to save')
            setShowSaveModal(false)
            setSaveName('')
            setSaveTags('')
        } catch {
            setError('Failed to save report')
        } finally {
            setSaving(false)
        }
    }

    /* ---------- Export CSV ---------- */
    const exportCSV = () => {
        if (!result || result.data.length === 0) return
        const headers = result.columns.map(c => c.name).join(',')
        const rows = result.data.map(row =>
            result.columns.map(c => {
                const val = row[c.key]
                if (val === null || val === undefined) return ''
                if (typeof val === 'string' && val.includes(',')) return `"${val}"`
                return String(val)
            }).join(',')
        )
        const csv = [headers, ...rows].join('\n')
        const blob = new Blob([csv], { type: 'text/csv' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `explorer-${selectedDataset}-${new Date().toISOString().split('T')[0]}.csv`
        a.click()
        URL.revokeObjectURL(url)
    }

    /* ---------- Pagination ---------- */
    const totalPages = result ? Math.ceil(result.data.length / PAGE_SIZE) : 0
    const paginatedData = result
        ? result.data.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
        : []

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                        {t('analytics.explorer.title') || 'Data Explorer'}
                    </h1>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        {t('analytics.explorer.subtitle') || 'Explore and analyze your data with a point-and-click interface'}
                    </p>
                </div>
            </div>

            {/* Configuration Panel */}
            <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                {/* Dataset Selector */}
                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {t('analytics.explorer.dataset') || 'Dataset'}
                    </label>
                    <select
                        value={selectedDataset}
                        onChange={(e) => {
                            setSelectedDataset(e.target.value)
                            setSelectedDimensions([])
                            setSelectedMeasures([])
                        }}
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
                    >
                        {ALL_DATASETS.map(ds => (
                            <option key={ds.id} value={ds.id}>{ds.name}</option>
                        ))}
                    </select>
                </div>

                {dataset && (
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        {/* Dimensions */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                {t('analytics.explorer.dimensions') || 'Dimensions'}
                            </label>
                            <div className="space-y-2">
                                {dataset.dimensions.map(dim => (
                                    <label key={dim.id} className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={selectedDimensions.includes(dim.id)}
                                            onChange={() => toggleDimension(dim.id)}
                                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                        />
                                        <span className="text-sm text-gray-700 dark:text-gray-300">{dim.name}</span>
                                        <span className="text-xs text-gray-400 dark:text-gray-500">({dim.type})</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Measures */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                {t('analytics.explorer.measures') || 'Measures'}
                            </label>
                            <div className="space-y-2">
                                {dataset.measures.map(m => (
                                    <label key={m.id} className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={selectedMeasures.includes(m.id)}
                                            onChange={() => toggleMeasure(m.id)}
                                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                        />
                                        <span className="text-sm text-gray-700 dark:text-gray-300">{m.name}</span>
                                        <span className="text-xs text-gray-400 dark:text-gray-500">({m.aggregation})</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Filters */}
                <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {t('analytics.explorer.filters') || 'Filters'}
                    </label>

                    {/* Date Range */}
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                        <span className="text-xs text-gray-500 dark:text-gray-400">Date Range:</span>
                        <input
                            type="date"
                            value={dateFrom}
                            onChange={(e) => setDateFrom(e.target.value)}
                            className="rounded border border-gray-300 px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
                        />
                        <span className="text-xs text-gray-400">to</span>
                        <input
                            type="date"
                            value={dateTo}
                            onChange={(e) => setDateTo(e.target.value)}
                            className="rounded border border-gray-300 px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
                        />
                    </div>

                    {/* Custom Filters */}
                    {filters.map((filter, index) => (
                        <div key={index} className="mb-2 flex flex-wrap items-center gap-2">
                            <select
                                value={filter.field}
                                onChange={(e) => updateFilter(index, { field: e.target.value })}
                                className="rounded border border-gray-300 px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
                            >
                                {dataset?.dimensions.map(dim => (
                                    <option key={dim.id} value={dim.id}>{dim.name}</option>
                                ))}
                            </select>
                            <select
                                value={filter.operator}
                                onChange={(e) => updateFilter(index, { operator: e.target.value })}
                                className="rounded border border-gray-300 px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
                            >
                                {OPERATORS.map(op => (
                                    <option key={op.value} value={op.value}>{op.label}</option>
                                ))}
                            </select>
                            <input
                                type="text"
                                value={filter.value}
                                onChange={(e) => updateFilter(index, { value: e.target.value })}
                                placeholder={t('common.description') || 'Value'}
                                className="rounded border border-gray-300 px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
                            />
                            <button
                                onClick={() => removeFilter(index)}
                                className="p-1 text-red-500 hover:text-red-700 dark:text-red-400"
                            >
                                <Trash2 className="h-4 w-4" />
                            </button>
                        </div>
                    ))}

                    <button
                        onClick={addFilter}
                        className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
                    >
                        <Plus className="h-3.5 w-3.5" />
                        {t('analytics.explorer.addFilter') || 'Add Filter'}
                    </button>
                </div>

                {/* Action Buttons */}
                <div className="mt-4 flex flex-wrap gap-3">
                    <button
                        onClick={runAnalysis}
                        disabled={loading}
                        className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                        {loading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Search className="h-4 w-4" />
                        )}
                        {t('analytics.explorer.analyze') || 'Analyze'}
                    </button>
                    {result && (
                        <>
                            <button
                                onClick={() => setShowSaveModal(true)}
                                className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
                            >
                                <Save className="h-4 w-4" />
                                {t('common.save') || 'Save'}
                            </button>
                            <button
                                onClick={exportCSV}
                                className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
                            >
                                <Download className="h-4 w-4" />
                                {t('common.export') || 'Export'}
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Error */}
            {error && (
                <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20">
                    <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                    <span className="text-sm text-red-700 dark:text-red-300">{error}</span>
                    <button onClick={() => setError(null)} className="ml-auto">
                        <X className="h-4 w-4 text-red-400" />
                    </button>
                </div>
            )}

            {/* Results */}
            {result && (
                <div className="rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
                    {/* Results Header */}
                    <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-700">
                        <div className="flex items-center gap-3">
                            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                {t('analytics.explorer.results') || 'Results'} ({result.metadata.totalRows} rows, {(result.metadata.executionTimeMs / 1000).toFixed(2)}s)
                            </h2>
                        </div>
                        <div className="flex items-center gap-1 rounded-lg border border-gray-200 p-0.5 dark:border-gray-600">
                            <button
                                onClick={() => setViewMode('table')}
                                className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${viewMode === 'table'
                                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
                                    }`}
                            >
                                <Table className="h-3.5 w-3.5" />
                                Table
                            </button>
                            <button
                                onClick={() => setViewMode('chart')}
                                className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${viewMode === 'chart'
                                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
                                    }`}
                            >
                                <BarChart3 className="h-3.5 w-3.5" />
                                Chart
                            </button>
                        </div>
                    </div>

                    {/* Table View */}
                    {viewMode === 'table' && (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                <thead className="bg-gray-50 dark:bg-gray-700/50">
                                    <tr>
                                        {result.columns.map(col => (
                                            <th
                                                key={col.key}
                                                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400"
                                            >
                                                {col.name}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                    {paginatedData.map((row, idx) => (
                                        <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                            {result.columns.map(col => (
                                                <td
                                                    key={col.key}
                                                    className="whitespace-nowrap px-4 py-3 text-sm text-gray-700 dark:text-gray-300"
                                                >
                                                    {formatCellValue(row[col.key], col)}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                    {paginatedData.length === 0 && (
                                        <tr>
                                            <td
                                                colSpan={result.columns.length}
                                                className="px-4 py-8 text-center text-sm text-gray-400 dark:text-gray-500"
                                            >
                                                No data found
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Chart View */}
                    {viewMode === 'chart' && (
                        <div className="p-6">
                            <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                                Chart visualization — select at least one dimension and one measure to generate a chart.
                            </p>
                        </div>
                    )}

                    {/* Pagination */}
                    {viewMode === 'table' && totalPages > 1 && (
                        <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3 dark:border-gray-700">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:text-gray-300"
                            >
                                <ChevronLeft className="h-4 w-4" />
                                Prev
                            </button>
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                                Page {page} of {totalPages}
                            </span>
                            <button
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                                className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:text-gray-300"
                            >
                                Next
                                <ChevronRight className="h-4 w-4" />
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Empty State */}
            {!result && !loading && (
                <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 py-16 dark:border-gray-600">
                    <Search className="h-12 w-12 text-gray-300 dark:text-gray-600" />
                    <h3 className="mt-4 text-lg font-semibold text-gray-600 dark:text-gray-400">
                        {t('analytics.explorer.empty.title') || 'Configure & Analyze'}
                    </h3>
                    <p className="mt-1 text-sm text-gray-400 dark:text-gray-500 text-center max-w-sm">
                        {t('analytics.explorer.empty.description') || 'Select a dataset, choose dimensions and measures, then click Analyze to explore your data.'}
                    </p>
                </div>
            )}

            {/* Save Modal */}
            {showSaveModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                            {t('analytics.explorer.saveReport') || 'Save Report'}
                        </h3>
                        <div className="mt-4 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Name
                                </label>
                                <input
                                    type="text"
                                    value={saveName}
                                    onChange={(e) => setSaveName(e.target.value)}
                                    placeholder="e.g., Monthly Sales Analysis"
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    {t('analytics.explorer.tags') || 'Tags (comma-separated)'}
                                </label>
                                <input
                                    type="text"
                                    value={saveTags}
                                    onChange={(e) => setSaveTags(e.target.value)}
                                    placeholder="e.g., sales, monthly" /* Example placeholder — intentionally not i18n'd */
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
                                />
                            </div>
                        </div>
                        <div className="mt-6 flex justify-end gap-3">
                            <button
                                onClick={() => setShowSaveModal(false)}
                                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={saveReport}
                                disabled={!saveName.trim() || saving}
                                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                            >
                                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

/* ============================================
   HELPERS
   ============================================ */

function formatCellValue(value: string | number | boolean | null, col: ExplorerColumn): string {
    if (value === null || value === undefined) return '—'
    if (col.dataType === 'date' || col.type === 'dimension') {
        const date = new Date(String(value))
        if (!isNaN(date.getTime())) {
            return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
        }
    }
    if (col.format === 'currency') {
        return formatCurrency(Number(value))
    }
    if (col.format === 'percentage') {
        return `${Number(value).toFixed(1)}%`
    }
    if (typeof value === 'number') {
        return formatNumber(value)
    }
    return String(value)
}
