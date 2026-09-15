'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from '@/lib/i18n'
import {
    Settings,
    GitBranch,
    Package,
    LayoutGrid,
    Sliders,
    ClipboardCheck,
    Shield,
    Loader2,
    CheckCircle,
    X,
    Download,
    Upload,
    RotateCcw,
    ChevronDown,
    ChevronRight,
    Eye,
    EyeOff,
    GripVertical,
    History,
    ArrowUpDown,
} from 'lucide-react'

// ─── Types ──────────────────────────────────────────────────────────────────

type ControlCategory = 'workflow' | 'fields' | 'modules' | 'permissions' | 'dashboard' | 'approvals'
type TabType = ControlCategory | 'history'

interface ControlConfig {
    category: ControlCategory
    key: string
    value: unknown
    scope: string
    source: string
    updatedAt?: string
}

interface ControlChange {
    id: string
    category: ControlCategory
    key: string
    oldValue: unknown
    newValue: unknown
    reason?: string
    changedBy: string
    changedAt: string
}

interface ModuleStatus {
    module: string
    name: string
    description: string
    enabled: boolean
    features: { key: string; name: string; description: string; enabled: boolean }[]
    isCore: boolean
}

interface WidgetConfig {
    id: string
    title: string
    module: string
    type: string
    size: string
    visible: boolean
    order: number
}

interface Toast {
    message: string
    type: 'success' | 'error'
}

// ─── Tab Configuration ──────────────────────────────────────────────────────

function getTabs(t: (key: string) => string): { key: TabType; label: string; icon: typeof Settings }[] {
    return [
        { key: 'modules', label: t('controlEngine.tabs.modules') || 'Modules', icon: Package },
        { key: 'workflow', label: t('controlEngine.tabs.workflow') || 'Workflow', icon: GitBranch },
        { key: 'approvals', label: t('controlEngine.tabs.approvals') || 'Approvals', icon: ClipboardCheck },
        { key: 'fields', label: t('controlEngine.tabs.fields') || 'Fields', icon: Sliders },
        { key: 'dashboard', label: t('controlEngine.tabs.widgets') || 'Widgets', icon: LayoutGrid },
        { key: 'permissions', label: t('controlEngine.tabs.permissions') || 'Permissions', icon: Shield },
        { key: 'history', label: t('controlEngine.tabs.history') || 'History', icon: History },
    ]
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function ControlEnginePage() {
    const { t } = useTranslation()
    const [activeTab, setActiveTab] = useState<TabType>('modules')
    const [configs, setConfigs] = useState<ControlConfig[]>([])
    const [history, setHistory] = useState<ControlChange[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [toast, setToast] = useState<Toast | null>(null)
    const [expandedModule, setExpandedModule] = useState<string | null>(null)

    // Toast auto-dismiss
    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 3000)
            return () => clearTimeout(timer)
        }
    }, [toast])

    // Fetch configs
    const fetchConfigs = useCallback(async () => {
        try {
            setLoading(true)
            const res = await fetch('/api/settings/control-engine')
            const data = await res.json()
            if (data.success) {
                setConfigs(data.data)
            }
        } catch {
            setToast({ message: t('controlEngine.loadError') || 'Gagal memuat konfigurasi', type: 'error' })
        } finally {
            setLoading(false)
        }
    }, [t])

    // Fetch history
    const fetchHistory = useCallback(async () => {
        try {
            const res = await fetch('/api/settings/control-engine?action=history')
            const data = await res.json()
            if (data.success) {
                setHistory(data.data)
            }
        } catch {
            setToast({ message: t('controlEngine.loadHistoryError') || 'Gagal memuat riwayat', type: 'error' })
        }
    }, [t])

    useEffect(() => {
        fetchConfigs()
        if (activeTab === 'history') {
            fetchHistory()
        }
    }, [activeTab, fetchConfigs, fetchHistory])

    // Update config
    const updateConfig = async (category: ControlCategory, key: string, value: unknown, reason?: string) => {
        try {
            setSaving(true)
            const res = await fetch('/api/settings/control-engine', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ category, key, value, reason }),
            })
            const data = await res.json()
            if (data.success) {
                setToast({ message: t('controlEngine.saveSuccess') || 'Konfigurasi berhasil diupdate', type: 'success' })
                fetchConfigs()
                if (activeTab === 'history') fetchHistory()
            } else {
                setToast({ message: data.error || t('controlEngine.saveError') || 'Gagal update konfigurasi', type: 'error' })
            }
        } catch {
            setToast({ message: t('controlEngine.saveErrorCategory') || 'Gagal update konfigurasi', type: 'error' })
        } finally {
            setSaving(false)
        }
    }

    // Reset to defaults
    const handleReset = async (category?: ControlCategory) => {
        if (!confirm(category ? `Reset ${category} ke defaults?` : 'Semua konfigurasi akan direset ke defaults. Lanjutkan?')) return

        try {
            setSaving(true)
            const res = await fetch('/api/settings/control-engine?action=reset', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ category }),
            })
            const data = await res.json()
            if (data.success) {
                setToast({ message: t('controlEngine.resetSuccess') || 'Berhasil direset ke defaults', type: 'success' })
                fetchConfigs()
            } else {
                setToast({ message: data.error || t('controlEngine.resetError') || 'Gagal reset', type: 'error' })
            }
        } catch {
            setToast({ message: t('controlEngine.resetErrorCategory') || 'Gagal reset konfigurasi', type: 'error' })
        } finally {
            setSaving(false)
        }
    }

    // Export config
    const handleExport = async () => {
        try {
            const res = await fetch('/api/settings/control-engine?action=export')
            const data = await res.json()
            if (data.success) {
                const blob = new Blob([JSON.stringify(data.data, null, 2)], { type: 'application/json' })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = `control-engine-config-${new Date().toISOString().slice(0, 10)}.json`
                a.click()
                URL.revokeObjectURL(url)
                setToast({ message: t('controlEngine.exportSuccess') || 'Konfigurasi berhasil di-export', type: 'success' })
            }
        } catch {
            setToast({ message: t('controlEngine.exportError') || 'Gagal export konfigurasi', type: 'error' })
        }
    }

    // Import config
    const handleImport = async () => {
        const input = document.createElement('input')
        input.type = 'file'
        input.accept = '.json'
        input.onchange = async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0]
            if (!file) return

            try {
                const text = await file.text()
                const data = JSON.parse(text)
                setSaving(true)
                const res = await fetch('/api/settings/control-engine?action=import', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data),
                })
                const result = await res.json()
                if (result.success) {
                    setToast({ message: (t('controlEngine.importSuccess') || 'Berhasil import {count} konfigurasi').replace('{count}', String(result.data.imported)), type: 'success' })
                    fetchConfigs()
                } else {
                    setToast({ message: result.error || t('controlEngine.importError') || 'Gagal import', type: 'error' })
                }
            } catch {
                setToast({ message: t('controlEngine.importInvalidFile') || 'File tidak valid', type: 'error' })
            } finally {
                setSaving(false)
            }
        }
        input.click()
    }

    // Get configs by category
    const getConfigsByCategory = (category: ControlCategory) =>
        configs.filter(c => c.category === category)

    // Get a specific config value
    const getConfigValue = (category: ControlCategory, key: string): unknown => {
        const config = configs.find(c => c.category === category && c.key === key)
        return config?.value
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
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Settings className="h-6 w-6" />
                        {t('settings.controlEngine.title') || 'Control Engine'}
                    </h1>
                    <p className="text-gray-600 mt-1">
                        {t('settings.controlEngine.description') || 'Kelola semua konfigurasi platform dari satu tempat'}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleExport}
                        className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                        <Download className="h-4 w-4" />
                        {t('controlEngine.exportButton') || 'Export'}
                    </button>
                    <button
                        onClick={handleImport}
                        disabled={saving}
                        className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                    >
                        <Upload className="h-4 w-4" />
                        {t('controlEngine.importButton') || 'Import'}
                    </button>
                    <button
                        onClick={() => handleReset()}
                        disabled={saving}
                        className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-red-700 bg-white border border-red-300 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                    >
                        <RotateCcw className="h-4 w-4" />
                        {t('controlEngine.resetAllButton') || 'Reset All'}
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200">
                <nav className="flex gap-1 overflow-x-auto">
                    {getTabs(t).map((tab) => {
                        const Icon = tab.icon
                        return (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key)}
                                className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === tab.key
                                        ? 'border-blue-500 text-blue-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                    }`}
                            >
                                <Icon className="h-4 w-4" />
                                {tab.label}
                            </button>
                        )
                    })}
                </nav>
            </div>

            {/* Content */}
            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                    <span className="ml-2 text-gray-600">{t('controlEngine.loading') || 'Memuat konfigurasi...'}</span>
                </div>
            ) : (
                <div className="bg-white rounded-xl border border-gray-200">
                    {/* Modules Tab */}
                    {activeTab === 'modules' && (
                        <ModulesTab
                            configs={configs}
                            updateConfig={updateConfig}
                            saving={saving}
                            expandedModule={expandedModule}
                            setExpandedModule={setExpandedModule}
                            t={t}
                        />
                    )}

                    {/* Workflow Tab */}
                    {activeTab === 'workflow' && (
                        <WorkflowTab
                            configs={configs}
                            updateConfig={updateConfig}
                            saving={saving}
                            onReset={() => handleReset('workflow')}
                            t={t}
                        />
                    )}

                    {/* Approvals Tab */}
                    {activeTab === 'approvals' && (
                        <ApprovalsTab
                            configs={configs}
                            updateConfig={updateConfig}
                            saving={saving}
                            t={t}
                        />
                    )}

                    {/* Fields Tab */}
                    {activeTab === 'fields' && (
                        <FieldsTab
                            configs={configs}
                            updateConfig={updateConfig}
                            saving={saving}
                            t={t}
                        />
                    )}

                    {/* Dashboard Widgets Tab */}
                    {activeTab === 'dashboard' && (
                        <DashboardTab
                            configs={configs}
                            updateConfig={updateConfig}
                            saving={saving}
                            t={t}
                        />
                    )}

                    {/* Permissions Tab */}
                    {activeTab === 'permissions' && (
                        <PermissionsTab
                            configs={configs}
                            updateConfig={updateConfig}
                            saving={saving}
                            t={t}
                        />
                    )}

                    {/* History Tab */}
                    {activeTab === 'history' && (
                        <HistoryTab history={history} t={t} />
                    )}
                </div>
            )}
        </div>
    )
}

// ─── Modules Tab ────────────────────────────────────────────────────────────

function ModulesTab({
    configs,
    updateConfig,
    saving,
    expandedModule,
    setExpandedModule,
    t,
}: {
    configs: ControlConfig[]
    updateConfig: (category: ControlCategory, key: string, value: unknown) => Promise<void>
    saving: boolean
    expandedModule: string | null
    setExpandedModule: (module: string | null) => void
    t: (key: string) => string
}) {
    const modules = [
        { key: 'finance', name: t('controlEngine.modules.finance') || 'Finance', description: t('controlEngine.modules.financeDesc') || 'Invoice, quotation, payment, purchase order', isCore: true },
        { key: 'crm', name: t('controlEngine.modules.crm') || 'Sales & CRM', description: t('controlEngine.modules.crmDesc') || 'Leads, contacts, deals, pipeline', isCore: true },
        { key: 'hr', name: t('controlEngine.modules.hr') || 'Human Resources', description: t('controlEngine.modules.hrDesc') || 'Employees, attendance, leaves, payroll', isCore: true },
        { key: 'inventory', name: t('controlEngine.modules.inventory') || 'Inventory', description: t('controlEngine.modules.inventoryDesc') || 'Products, stock, categories, suppliers', isCore: true },
        { key: 'pos', name: t('controlEngine.modules.pos') || 'Point of Sale', description: t('controlEngine.modules.posDesc') || 'POS transactions, tables, kitchen display', isCore: false },
        { key: 'projects', name: t('controlEngine.modules.projects') || 'Operations', description: t('controlEngine.modules.projectsDesc') || 'Projects, tasks, gantt charts', isCore: false },
        { key: 'analytics', name: t('controlEngine.modules.analytics') || 'Analytics', description: t('controlEngine.modules.analyticsDesc') || 'Dashboards, reports, KPIs', isCore: false },
        { key: 'ai', name: t('controlEngine.modules.aiFeatures') || 'AI Features', description: t('controlEngine.modules.aiFeaturesDesc') || 'AI chat, insights, anomaly detection', isCore: false },
        { key: 'field-service', name: t('controlEngine.modules.fieldService') || 'Field Service', description: t('controlEngine.modules.fieldServiceDesc') || 'Field jobs, technician scheduling', isCore: false },
        { key: 'operations', name: t('controlEngine.modules.operations') || 'Operations', description: t('controlEngine.modules.operationsDesc') || 'Budget tracking, resource management', isCore: false },
    ]

    return (
        <div className="p-6">
            <div className="mb-4">
                <h2 className="text-lg font-semibold text-gray-900">{t('controlEngine.modules.title') || 'Module Activation'}</h2>
                <p className="text-sm text-gray-500">{t('controlEngine.modules.subtitle') || 'Aktifkan atau nonaktifkan modul untuk platform Anda'}</p>
            </div>
            <div className="space-y-3">
                {modules.map((mod) => {
                    const enabled = configs.find(c => c.category === 'modules' && c.key === mod.key)?.value ?? true
                    const isExpanded = expandedModule === mod.key

                    return (
                        <div key={mod.key} className="border border-gray-200 rounded-lg">
                            <div className="flex items-center justify-between p-4">
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => setExpandedModule(isExpanded ? null : mod.key)}
                                        className="text-gray-400 hover:text-gray-600"
                                    >
                                        {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                    </button>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium text-gray-900">{mod.name}</span>
                                            {mod.isCore && (
                                                <span className="px-1.5 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded">{t('controlEngine.core') || 'Core'}</span>
                                            )}
                                        </div>
                                        <p className="text-sm text-gray-500">{mod.description}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => updateConfig('modules', mod.key, !enabled)}
                                    disabled={saving || mod.isCore}
                                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${enabled ? 'bg-blue-600' : 'bg-gray-200'
                                        }`}
                                    title={mod.isCore ? (t('controlEngine.modules.coreDisabled') || 'Core module tidak bisa dinonaktifkan') : ''}
                                >
                                    <span
                                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${enabled ? 'translate-x-5' : 'translate-x-0'
                                            }`}
                                    />
                                </button>
                            </div>
                            {isExpanded && (
                                <div className="px-4 pb-4 border-t border-gray-100 pt-3">
                                    <p className="text-xs text-gray-500 mb-2">{t('controlEngine.modules.featuresInModule') || 'Fitur dalam modul ini:'}</p>
                                    <div className="flex flex-wrap gap-2">
                                        <span className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                                            {mod.name}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

// ─── Workflow Tab ───────────────────────────────────────────────────────────

function WorkflowTab({
    configs,
    updateConfig,
    saving,
    onReset,
    t,
}: {
    configs: ControlConfig[]
    updateConfig: (category: ControlCategory, key: string, value: unknown) => Promise<void>
    saving: boolean
    onReset: () => void
    t: (key: string) => string
}) {
    const entities = ['invoice', 'quotation', 'purchase_order', 'leave_request', 'payroll', 'deal']

    return (
        <div className="p-6">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h2 className="text-lg font-semibold text-gray-900">{t('controlEngine.workflow.title') || 'Workflow Configuration'}</h2>
                    <p className="text-sm text-gray-500">{t('controlEngine.workflow.subtitle') || 'Konfigurasi alur kerja per entitas'}</p>
                </div>
                <button
                    onClick={onReset}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                >
                    <RotateCcw className="h-3.5 w-3.5" />
                    {t('controlEngine.workflow.resetButton') || 'Reset'}
                </button>
            </div>
            <div className="space-y-3">
                {entities.map((entity) => {
                    const enabled = configs.find(c => c.category === 'workflow' && c.key === `${entity}.enabled`)?.value ?? true
                    const autoTransition = configs.find(c => c.category === 'workflow' && c.key === `${entity}.autoTransition`)?.value ?? false

                    return (
                        <div key={entity} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                            <div>
                                <span className="font-medium text-gray-900 capitalize">{entity.replace(/_/g, ' ')}</span>
                            </div>
                            <div className="flex items-center gap-4">
                                <label className="flex items-center gap-2 text-sm text-gray-600">
                                    <span>{t('controlEngine.workflow.autoTransition') || 'Auto Transition'}</span>
                                    <button
                                        onClick={() => updateConfig('workflow', `${entity}.autoTransition`, !autoTransition)}
                                        disabled={saving}
                                        className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 ${autoTransition ? 'bg-blue-600' : 'bg-gray-200'
                                            }`}
                                    >
                                        <span
                                            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${autoTransition ? 'translate-x-4' : 'translate-x-0'
                                                }`}
                                        />
                                    </button>
                                </label>
                                <button
                                    onClick={() => updateConfig('workflow', `${entity}.enabled`, !enabled)}
                                    disabled={saving}
                                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 ${enabled ? 'bg-blue-600' : 'bg-gray-200'
                                        }`}
                                >
                                    <span
                                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${enabled ? 'translate-x-5' : 'translate-x-0'
                                            }`}
                                    />
                                </button>
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

// ─── Approvals Tab ──────────────────────────────────────────────────────────

function ApprovalsTab({
    configs,
    updateConfig,
    saving,
    t,
}: {
    configs: ControlConfig[]
    updateConfig: (category: ControlCategory, key: string, value: unknown) => Promise<void>
    saving: boolean
    t: (key: string) => string
}) {
    const enabled = configs.find(c => c.category === 'approvals' && c.key === 'enabled')?.value ?? true
    const maxLevels = configs.find(c => c.category === 'approvals' && c.key === 'maxLevels')?.value ?? 3
    const requireComments = configs.find(c => c.category === 'approvals' && c.key === 'requireComments')?.value ?? false

    return (
        <div className="p-6">
            <div className="mb-4">
                <h2 className="text-lg font-semibold text-gray-900">{t('controlEngine.approvals.title') || 'Approval Rules'}</h2>
                <p className="text-sm text-gray-500">{t('controlEngine.approvals.subtitle') || 'Konfigurasi aturan approval transaksi'}</p>
            </div>
            <div className="space-y-4">
                {/* Enable/Disable */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                        <span className="font-medium text-gray-900">{t('controlEngine.approvals.approvalSystem') || 'Approval System'}</span>
                        <p className="text-sm text-gray-500">{t('controlEngine.approvals.approvalSystemDesc') || 'Aktifkan atau nonaktifkan sistem approval'}</p>
                    </div>
                    <button
                        onClick={() => updateConfig('approvals', 'enabled', !enabled)}
                        disabled={saving}
                        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 ${enabled ? 'bg-blue-600' : 'bg-gray-200'
                            }`}
                    >
                        <span
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${enabled ? 'translate-x-5' : 'translate-x-0'
                                }`}
                        />
                    </button>
                </div>

                {/* Max Levels */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                        <span className="font-medium text-gray-900">{t('controlEngine.approvals.maxLevels') || 'Max Approval Levels'}</span>
                        <p className="text-sm text-gray-500">{t('controlEngine.approvals.maxLevelsDesc') || 'Jumlah maksimal level approval'}</p>
                    </div>
                    <select
                        value={Number(maxLevels)}
                        onChange={(e) => updateConfig('approvals', 'maxLevels', parseInt(e.target.value))}
                        disabled={saving || !enabled}
                        className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
                    >
                        {[1, 2, 3, 4, 5].map(n => (
                            <option key={n} value={n}>{n} Level</option>
                        ))}
                    </select>
                </div>

                {/* Require Comments */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                        <span className="font-medium text-gray-900">{t('controlEngine.approvals.requireComments') || 'Require Comments'}</span>
                        <p className="text-sm text-gray-500">{t('controlEngine.approvals.requireCommentsDesc') || 'Wajibkan komentar saat approve/reject'}</p>
                    </div>
                    <button
                        onClick={() => updateConfig('approvals', 'requireComments', !requireComments)}
                        disabled={saving || !enabled}
                        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 ${requireComments ? 'bg-blue-600' : 'bg-gray-200'
                            }`}
                    >
                        <span
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${requireComments ? 'translate-x-5' : 'translate-x-0'
                                }`}
                        />
                    </button>
                </div>
            </div>
        </div>
    )
}

// ─── Fields Tab ─────────────────────────────────────────────────────────────

function FieldsTab({
    configs,
    updateConfig,
    saving,
    t,
}: {
    configs: ControlConfig[]
    updateConfig: (category: ControlCategory, key: string, value: unknown) => Promise<void>
    saving: boolean
    t: (key: string) => string
}) {
    const entities = ['product', 'invoice', 'contact', 'employee']

    return (
        <div className="p-6">
            <div className="mb-4">
                <h2 className="text-lg font-semibold text-gray-900">{t('controlEngine.fields.title') || 'Custom Fields Configuration'}</h2>
                <p className="text-sm text-gray-500">{t('controlEngine.fields.subtitle') || 'Aktifkan atau nonaktifkan custom fields per entitas'}</p>
            </div>
            <div className="space-y-3">
                {entities.map((entity) => {
                    const enabled = configs.find(c => c.category === 'fields' && c.key === `${entity}.customFieldsEnabled`)?.value ?? true

                    return (
                        <div key={entity} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                            <div>
                                <span className="font-medium text-gray-900 capitalize">{entity}</span>
                                <p className="text-sm text-gray-500">{t(`controlEngine.fields.${entity}`) || `Custom fields untuk ${entity}`}</p>
                            </div>
                            <button
                                onClick={() => updateConfig('fields', `${entity}.customFieldsEnabled`, !enabled)}
                                disabled={saving}
                                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 ${enabled ? 'bg-blue-600' : 'bg-gray-200'
                                    }`}
                            >
                                <span
                                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${enabled ? 'translate-x-5' : 'translate-x-0'
                                        }`}
                                />
                            </button>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

// ─── Dashboard Widgets Tab ──────────────────────────────────────────────────

function DashboardTab({
    configs,
    updateConfig,
    saving,
    t,
}: {
    configs: ControlConfig[]
    updateConfig: (category: ControlCategory, key: string, value: unknown) => Promise<void>
    saving: boolean
    t: (key: string) => string
}) {
    const widgets = [
        { id: 'revenue-chart', titleKey: 'controlEngine.dashboard.revenueChart', fallbackTitle: 'Revenue Chart', module: 'finance' },
        { id: 'expense-chart', titleKey: 'controlEngine.dashboard.expenseChart', fallbackTitle: 'Expense Chart', module: 'finance' },
        { id: 'cash-flow', titleKey: 'controlEngine.dashboard.cashFlow', fallbackTitle: 'Cash Flow', module: 'finance' },
        { id: 'pipeline', titleKey: 'controlEngine.dashboard.salesPipeline', fallbackTitle: 'Sales Pipeline', module: 'crm' },
        { id: 'stock-levels', titleKey: 'controlEngine.dashboard.stockLevels', fallbackTitle: 'Stock Levels', module: 'inventory' },
        { id: 'employee-count', titleKey: 'controlEngine.dashboard.employeeCount', fallbackTitle: 'Employee Count', module: 'hr' },
        { id: 'recent-transactions', titleKey: 'controlEngine.dashboard.recentTransactions', fallbackTitle: 'Recent Transactions', module: 'finance' },
        { id: 'top-products', titleKey: 'controlEngine.dashboard.topProducts', fallbackTitle: 'Top Products', module: 'inventory' },
        { id: 'overdue-invoices', titleKey: 'controlEngine.dashboard.overdueInvoices', fallbackTitle: 'Overdue Invoices', module: 'finance' },
        { id: 'attendance-overview', titleKey: 'controlEngine.dashboard.attendanceOverview', fallbackTitle: 'Attendance Overview', module: 'hr' },
    ]

    return (
        <div className="p-6">
            <div className="mb-4">
                <h2 className="text-lg font-semibold text-gray-900">{t('controlEngine.dashboard.title') || 'Dashboard Widgets'}</h2>
                <p className="text-sm text-gray-500">{t('controlEngine.dashboard.subtitle') || 'Kelola visibilitas widget dashboard'}</p>
            </div>
            <div className="space-y-2">
                {widgets.map((widget) => {
                    const config = configs.find(c => c.category === 'dashboard' && c.key === widget.id)
                    const widgetConfig = (config?.value as { visible?: boolean; size?: string }) || { visible: true, size: 'md' }
                    const visible = widgetConfig.visible ?? true

                    return (
                        <div key={widget.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-3">
                                <GripVertical className="h-4 w-4 text-gray-400" />
                                <div>
                                    <span className="font-medium text-gray-900 text-sm">{t(widget.titleKey) || widget.fallbackTitle}</span>
                                    <span className="ml-2 text-xs text-gray-500 bg-gray-200 px-1.5 py-0.5 rounded">{widget.module}</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <select
                                    value={widgetConfig.size || 'md'}
                                    onChange={(e) => updateConfig('dashboard', widget.id, { ...widgetConfig, size: e.target.value })}
                                    disabled={saving}
                                    className="text-xs border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="sm">{t('controlEngine.dashboard.sizeSmall') || 'Small'}</option>
                                    <option value="md">{t('controlEngine.dashboard.sizeMedium') || 'Medium'}</option>
                                    <option value="lg">{t('controlEngine.dashboard.sizeLarge') || 'Large'}</option>
                                </select>
                                <button
                                    onClick={() => updateConfig('dashboard', widget.id, { ...widgetConfig, visible: !visible })}
                                    disabled={saving}
                                    className={`p-1.5 rounded-lg transition-colors ${visible ? 'text-blue-600 hover:bg-blue-50' : 'text-gray-400 hover:bg-gray-100'
                                        }`}
                                    title={visible ? (t('controlEngine.dashboard.hideWidget') || 'Sembunyikan widget') : (t('controlEngine.dashboard.showWidget') || 'Tampilkan widget')}
                                >
                                    {visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

// ─── Permissions Tab ────────────────────────────────────────────────────────

function PermissionsTab({
    configs,
    updateConfig,
    saving,
    t,
}: {
    configs: ControlConfig[]
    updateConfig: (category: ControlCategory, key: string, value: unknown) => Promise<void>
    saving: boolean
    t: (key: string) => string
}) {
    const permissions = [
        { key: 'viewerCanExport', label: t('controlEngine.permissions.viewerCanExport') || 'Viewer Can Export', description: t('controlEngine.permissions.viewerCanExportDesc') || 'Izinkan role Viewer untuk export data' },
        { key: 'memberCanDelete', label: t('controlEngine.permissions.memberCanDelete') || 'Member Can Delete', description: t('controlEngine.permissions.memberCanDeleteDesc') || 'Izinkan role Member untuk menghapus data' },
    ]

    return (
        <div className="p-6">
            <div className="mb-4">
                <h2 className="text-lg font-semibold text-gray-900">{t('controlEngine.permissions.title') || 'Permission Overrides'}</h2>
                <p className="text-sm text-gray-500">{t('controlEngine.permissions.subtitle') || 'Override permission default untuk role tertentu'}</p>
            </div>
            <div className="space-y-3">
                {permissions.map((perm) => {
                    const enabled = configs.find(c => c.category === 'permissions' && c.key === perm.key)?.value ?? false

                    return (
                        <div key={perm.key} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                            <div>
                                <span className="font-medium text-gray-900">{perm.label}</span>
                                <p className="text-sm text-gray-500">{perm.description}</p>
                            </div>
                            <button
                                onClick={() => updateConfig('permissions', perm.key, !enabled)}
                                disabled={saving}
                                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 ${enabled ? 'bg-blue-600' : 'bg-gray-200'
                                    }`}
                            >
                                <span
                                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${enabled ? 'translate-x-5' : 'translate-x-0'
                                        }`}
                                />
                            </button>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

// ─── History Tab ────────────────────────────────────────────────────────────

function HistoryTab({ history, t }: { history: ControlChange[]; t: (key: string) => string }) {
    if (history.length === 0) {
        return (
            <div className="p-6 text-center py-12">
                <History className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">{t('controlEngine.history.empty') || 'Belum ada riwayat perubahan'}</p>
            </div>
        )
    }

    return (
        <div className="p-6">
            <div className="mb-4">
                <h2 className="text-lg font-semibold text-gray-900">{t('controlEngine.history.title') || 'Change History'}</h2>
                <p className="text-sm text-gray-500">{t('controlEngine.history.subtitle') || 'Riwayat perubahan konfigurasi'}</p>
            </div>
            <div className="space-y-2">
                {[...history].reverse().slice(0, 50).map((change) => (
                    <div key={change.id} className="p-3 bg-gray-50 rounded-lg text-sm">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="px-1.5 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded">
                                {change.category}
                            </span>
                            <span className="font-medium text-gray-900">{change.key}</span>
                            <ArrowUpDown className="h-3 w-3 text-gray-400" />
                        </div>
                        <div className="text-gray-500 text-xs">
                            <span className="line-through">{JSON.stringify(change.oldValue)}</span>
                            {' → '}
                            <span className="font-medium text-gray-700">{JSON.stringify(change.newValue)}</span>
                        </div>
                        {change.reason && (
                            <p className="text-xs text-gray-400 mt-1">{t('controlEngine.history.reason') || 'Reason'}: {change.reason}</p>
                        )}
                        <p className="text-xs text-gray-400 mt-1">
                            {new Date(change.changedAt).toLocaleString('id-ID')}
                        </p>
                    </div>
                ))}
            </div>
        </div>
    )
}
