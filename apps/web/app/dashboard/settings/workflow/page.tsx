'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from '@/lib/i18n'
import { GitBranch, Loader2, CheckCircle, X, ChevronDown, ChevronRight, ArrowRight, Settings } from 'lucide-react'

type WorkflowDef = {
    id: string
    tenantId: string
    entityType: string
    name: string
    description: string | null
    config: {
        states: string[]
        transitions: { from: string; to: string; action: string; requiredRole?: string }[]
        initialState: string
        finalStates: string[]
    }
    isSystem: boolean
    isActive: boolean
    createdAt: string
    updatedAt: string
}

const ENTITY_LABELS: Record<string, string> = {
    INVOICE: 'Invoice',
    QUOTATION: 'Quotation',
    PURCHASE_ORDER: 'Purchase Order',
    LEAVE: 'Cuti',
    PAYROLL: 'Payroll',
    DEAL: 'Deal',
}

const STATE_COLORS: Record<string, string> = {
    DRAFT: 'bg-gray-100 text-gray-700',
    PENDING: 'bg-yellow-100 text-yellow-700',
    APPROVED: 'bg-green-100 text-green-700',
    REJECTED: 'bg-red-100 text-red-700',
    PAID: 'bg-blue-100 text-blue-700',
    CANCELLED: 'bg-red-100 text-red-700',
    COMPLETED: 'bg-green-100 text-green-700',
    ACTIVE: 'bg-blue-100 text-blue-700',
    CLOSED: 'bg-gray-100 text-gray-700',
    SENT: 'bg-purple-100 text-purple-700',
    DELIVERED: 'bg-teal-100 text-teal-700',
    PARTIAL: 'bg-orange-100 text-orange-700',
    PROCESSING: 'bg-blue-100 text-blue-700',
}

function getStateColor(state: string): string {
    return STATE_COLORS[state] || 'bg-gray-100 text-gray-700'
}

export default function WorkflowSettingsPage() {
    const { t } = useTranslation()
    const [workflows, setWorkflows] = useState<WorkflowDef[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
    const [expandedId, setExpandedId] = useState<string | null>(null)

    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 3000)
            return () => clearTimeout(timer)
        }
    }, [toast])

    const fetchWorkflows = useCallback(async () => {
        try {
            setLoading(true)
            setError(null)
            const res = await fetch('/api/workflow/definitions')
            const data = await res.json()
            if (data.success) {
                setWorkflows(data.data)
            } else {
                setError(data.error || 'Gagal memuat data workflow')
            }
        } catch {
            setError('Gagal terhubung ke server')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchWorkflows()
    }, [fetchWorkflows])

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="animate-pulse">
                    <div className="h-8 bg-gray-200 rounded w-64 mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-96"></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="bg-white rounded-xl border border-gray-200 p-6">
                            <div className="animate-pulse space-y-3">
                                <div className="h-6 bg-gray-200 rounded w-32"></div>
                                <div className="h-4 bg-gray-200 rounded w-full"></div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="bg-white rounded-xl border border-gray-200 p-8">
                <div className="flex flex-col items-center text-center">
                    <GitBranch className="h-12 w-12 text-red-500 mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Gagal Memuat Workflow</h3>
                    <p className="text-gray-600 mb-4">{error}</p>
                    <button onClick={fetchWorkflows} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                        Coba Lagi
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Toast */}
            {toast && (
                <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 ${toast.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
                    }`}>
                    {toast.type === 'success' ? <CheckCircle className="h-5 w-5" /> : <X className="h-5 w-5" />}
                    <span className="text-sm font-medium">{toast.message}</span>
                </div>
            )}

            {/* Header */}
            <div>
                <h2 className="text-xl font-bold text-gray-900">Workflow Configuration</h2>
                <p className="text-gray-600 mt-1">Konfigurasi alur kerja untuk setiap jenis transaksi</p>
            </div>

            {/* Workflows Grid */}
            {workflows.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                    <GitBranch className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Belum Ada Workflow</h3>
                    <p className="text-gray-600">Workflow akan dibuat otomatis untuk setiap jenis transaksi.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {workflows.map(wf => {
                        const config = wf.config
                        const isExpanded = expandedId === wf.id
                        return (
                            <div key={wf.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                                <div
                                    className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                                    onClick={() => setExpandedId(isExpanded ? null : wf.id)}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 rounded-lg bg-blue-50">
                                                <GitBranch className="h-5 w-5 text-blue-600" />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-semibold text-gray-900">{wf.name}</span>
                                                    {wf.isSystem && (
                                                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full font-medium">System</span>
                                                    )}
                                                </div>
                                                <p className="text-sm text-gray-500">
                                                    {ENTITY_LABELS[wf.entityType] || wf.entityType}
                                                    {wf.description && ` — ${wf.description}`}
                                                </p>
                                            </div>
                                        </div>
                                        {isExpanded ? <ChevronDown className="h-5 w-5 text-gray-400" /> : <ChevronRight className="h-5 w-5 text-gray-400" />}
                                    </div>
                                </div>

                                {/* Expanded Detail */}
                                {isExpanded && config && (
                                    <div className="border-t border-gray-100 p-4 bg-gray-50">
                                        {/* States */}
                                        <div className="mb-4">
                                            <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                                                <Settings className="h-4 w-4" />
                                                States
                                            </h4>
                                            <div className="flex flex-wrap gap-2">
                                                {config.states.map(state => (
                                                    <span key={state} className={`px-3 py-1.5 rounded-full text-xs font-medium ${getStateColor(state)}`}>
                                                        {state === config.initialState && '🟢 '}
                                                        {config.finalStates.includes(state) && '🏁 '}
                                                        {state}
                                                    </span>
                                                ))}
                                            </div>
                                            <div className="mt-2 text-xs text-gray-500">
                                                <span className="font-medium">Initial:</span> {config.initialState}
                                                {' | '}
                                                <span className="font-medium">Final:</span> {config.finalStates.join(', ')}
                                            </div>
                                        </div>

                                        {/* Transitions */}
                                        <div>
                                            <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                                                <ArrowRight className="h-4 w-4" />
                                                Transitions
                                            </h4>
                                            <div className="space-y-1.5">
                                                {config.transitions.map((trans, idx) => (
                                                    <div key={idx} className="flex items-center gap-2 bg-white rounded-lg border border-gray-200 px-3 py-2 text-sm">
                                                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${getStateColor(trans.from)}`}>
                                                            {trans.from}
                                                        </span>
                                                        <ArrowRight className="h-3 w-3 text-gray-400 flex-shrink-0" />
                                                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${getStateColor(trans.to)}`}>
                                                            {trans.to}
                                                        </span>
                                                        <span className="text-gray-400">•</span>
                                                        <span className="text-gray-600">{trans.action}</span>
                                                        {trans.requiredRole && (
                                                            <span className="ml-auto px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full">
                                                                {trans.requiredRole}
                                                            </span>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
