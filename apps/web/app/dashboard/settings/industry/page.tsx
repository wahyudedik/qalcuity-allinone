'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from '@/lib/i18n'
import {
    Loader2,
    CheckCircle,
    X,
    UtensilsCrossed,
    ShoppingBag,
    Factory,
    Heart,
    HardHat,
    Briefcase,
    GraduationCap,
    Wheat,
    Truck,
    Hotel,
    ChevronRight,
    Package,
    GitBranch,
    LayoutDashboard,
    Zap,
    ArrowLeft,
    Info,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

type IndustryType =
    | 'restaurant'
    | 'retail'
    | 'manufacturing'
    | 'healthcare'
    | 'construction'
    | 'professional-services'
    | 'education'
    | 'agriculture'
    | 'logistics'
    | 'hospitality'

type PackSummary = {
    id: string
    name: string
    description: string
    baseIndustry: string
    moduleCount: number
    enabledModuleCount: number
    workflowCount: number
    hasPosSettings: boolean
}

type PackDetail = {
    id: string
    name: string
    description: string
    baseIndustry: string
    modules: Record<string, { enabled: boolean; label: string }>
    customFields: Record<string, Array<{ name: string; label: string; type: string; required: boolean }>>
    dashboardWidgets: Array<{ id: string; title: string; module: string; size: string }>
    workflows: Record<string, { states: string[]; initialState: string }>
    posSettings?: Record<string, unknown>
}

type IndustryConfigData = {
    industry: string
    name: string
    description: string
    modules: Record<string, boolean>
    customFieldCount: number
    config?: Record<string, unknown>
}

// ─── Constants ────────────────────────────────────────────────────────────────

const INDUSTRY_ICONS: Record<IndustryType, typeof Factory> = {
    restaurant: UtensilsCrossed,
    retail: ShoppingBag,
    manufacturing: Factory,
    healthcare: Heart,
    construction: HardHat,
    'professional-services': Briefcase,
    education: GraduationCap,
    agriculture: Wheat,
    logistics: Truck,
    hospitality: Hotel,
}

const INDUSTRY_LABELS: Record<IndustryType, string> = {
    restaurant: 'Restaurant & Food Service',
    retail: 'Retail & E-Commerce',
    manufacturing: 'Manufacturing',
    healthcare: 'Healthcare',
    construction: 'Construction',
    'professional-services': 'Professional Services',
    education: 'Education',
    agriculture: 'Agriculture',
    logistics: 'Logistics & Transportation',
    hospitality: 'Hospitality & Tourism',
}

// ─── Helper: map packId to icon ──────────────────────────────────────────────

function getPackIcon(packId: string): typeof Factory {
    const map: Record<string, typeof Factory> = {
        restaurant: UtensilsCrossed,
        retail: ShoppingBag,
        manufacturing: Factory,
        healthcare: Heart,
        construction: HardHat,
        'professional-services': Briefcase,
        education: GraduationCap,
        agriculture: Wheat,
        logistics: Truck,
        hospitality: Hotel,
    }
    return map[packId] || Package
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function IndustrySettingsPage() {
    const { t } = useTranslation()

    // State
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

    // Current config
    const [config, setConfig] = useState<IndustryConfigData | null>(null)

    // Available packs
    const [packs, setPacks] = useState<PackSummary[]>([])
    const [selectedPack, setSelectedPack] = useState<PackSummary | null>(null)
    const [packDetail, setPackDetail] = useState<PackDetail | null>(null)
    const [loadingDetail, setLoadingDetail] = useState(false)

    // Activating state
    const [activating, setActivating] = useState(false)

    // View mode: 'select' = pack selection grid, 'detail' = pack detail preview
    const [viewMode, setViewMode] = useState<'select' | 'detail'>('select')

    // Toast auto-dismiss
    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 3000)
            return () => clearTimeout(timer)
        }
    }, [toast])

    // ─── Fetch current config + available packs ──────────────────────────────

    const fetchData = useCallback(async () => {
        try {
            setLoading(true)
            setError(null)

            const [configRes, packsRes] = await Promise.all([
                fetch('/api/settings/industry'),
                fetch('/api/settings/industry/packs'),
            ])

            const configData = await configRes.json()
            const packsData = await packsRes.json()

            if (configData.success) {
                setConfig(configData.data)
            } else {
                setError(configData.error || t('settings.industry.loadFailed'))
            }

            if (packsData.success) {
                setPacks(packsData.data)
            }
        } catch {
            setError(t('settings.industry.connectFailed'))
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchData()
    }, [fetchData])

    // ─── Fetch pack detail ───────────────────────────────────────────────────

    const fetchPackDetail = useCallback(async (packId: string) => {
        try {
            setLoadingDetail(true)
            // Get full pack details from the full packs list (use the defaults endpoint)
            const res = await fetch('/api/settings/industry/defaults')
            const data = await res.json()

            if (data.success) {
                // Find the pack in the defaults
                const pack = data.data.configs?.[packId]
                if (pack) {
                    // Also fetch pack-specific data from the packs API
                    const packRes = await fetch(`/api/settings/industry/packs`)
                    const packData = await packRes.json()

                    // Build a combined detail view
                    setPackDetail({
                        id: packId,
                        name: pack.name || selectedPack?.name || packId,
                        description: pack.description || selectedPack?.description || '',
                        baseIndustry: pack.industry || packId,
                        modules: pack.modules || {},
                        customFields: pack.customFields || {},
                        dashboardWidgets: pack.dashboardWidgets || [],
                        workflows: pack.workflows || {},
                    })
                } else {
                    // Fallback: create detail from pack summary
                    if (selectedPack) {
                        setPackDetail({
                            id: selectedPack.id,
                            name: selectedPack.name,
                            description: selectedPack.description,
                            baseIndustry: selectedPack.baseIndustry,
                            modules: {},
                            customFields: {},
                            dashboardWidgets: [],
                            workflows: {},
                        })
                    }
                }
            }
        } catch {
            // Silent fail — detail is optional
        } finally {
            setLoadingDetail(false)
        }
    }, [selectedPack])

    // ─── Handle pack selection ───────────────────────────────────────────────

    const handlePackSelect = useCallback((pack: PackSummary) => {
        setSelectedPack(pack)
        setViewMode('detail')
        fetchPackDetail(pack.id)
    }, [fetchPackDetail])

    // ─── Handle pack activation ──────────────────────────────────────────────

    const handleActivatePack = async (packId: string) => {
        setActivating(true)
        try {
            const res = await fetch('/api/settings/industry/packs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ packId }),
            })
            const data = await res.json()
            if (data.success) {
                setToast({ message: t('settings.industry.packActivated') || 'Industry pack berhasil diaktifkan!', type: 'success' })
                // Refresh config
                await fetchData()
                setViewMode('select')
                setSelectedPack(null)
                setPackDetail(null)
            } else {
                setToast({ message: data.error || t('settings.industry.saveFailed'), type: 'error' })
            }
        } catch {
            setToast({ message: t('settings.industry.connectFailed'), type: 'error' })
        } finally {
            setActivating(false)
        }
    }

    // ─── Back to selection ───────────────────────────────────────────────────

    const handleBack = () => {
        setViewMode('select')
        setSelectedPack(null)
        setPackDetail(null)
    }

    // ─── Loading state ──────────────────────────────────────────────────────

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="animate-pulse">
                    <div className="h-8 bg-gray-200 rounded w-64 mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-96"></div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <div className="animate-pulse grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(i => (
                            <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
                        ))}
                    </div>
                </div>
            </div>
        )
    }

    // ─── Error state ────────────────────────────────────────────────────────

    if (error) {
        return (
            <div className="bg-white rounded-xl border border-gray-200 p-8">
                <div className="flex flex-col items-center text-center">
                    <Factory className="h-12 w-12 text-red-500 mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('settings.industry.loadError')}</h3>
                    <p className="text-gray-600 mb-4">{error}</p>
                    <button onClick={fetchData} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                        {t('settings.retry')}
                    </button>
                </div>
            </div>
        )
    }

    // ─── Render: Pack Detail View ───────────────────────────────────────────

    if (viewMode === 'detail' && selectedPack) {
        const Icon = getPackIcon(selectedPack.id)
        const isActive = config?.industry === selectedPack.baseIndustry
        const modules = packDetail?.modules || {}
        const customFields = packDetail?.customFields || {}
        const workflows = packDetail?.workflows || {}
        const widgets = packDetail?.dashboardWidgets || []

        return (
            <div className="space-y-6">
                {/* Toast */}
                {toast && (
                    <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 ${toast.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
                        {toast.type === 'success' ? <CheckCircle className="h-5 w-5" /> : <X className="h-5 w-5" />}
                        <span className="text-sm font-medium">{toast.message}</span>
                    </div>
                )}

                {/* Back button + Header */}
                <div>
                    <button
                        onClick={handleBack}
                        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-3"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        {t('settings.industry.backToPacks') || 'Kembali ke Daftar Pack'}
                    </button>
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-blue-50 rounded-xl">
                            <Icon className="h-8 w-8 text-blue-600" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">{selectedPack.name}</h2>
                            <p className="text-gray-600 mt-0.5">{selectedPack.description}</p>
                        </div>
                        {isActive && (
                            <span className="ml-auto px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium flex items-center gap-1">
                                <CheckCircle className="h-4 w-4" />
                                {t('settings.industry.activePack') || 'Pack Aktif'}
                            </span>
                        )}
                    </div>
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
                        <Package className="h-5 w-5 text-blue-500" />
                        <div>
                            <p className="text-2xl font-bold text-gray-900">{selectedPack.enabledModuleCount}</p>
                            <p className="text-xs text-gray-500">{t('settings.industry.activeModules') || 'Module Aktif'}</p>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
                        <GitBranch className="h-5 w-5 text-purple-500" />
                        <div>
                            <p className="text-2xl font-bold text-gray-900">{selectedPack.workflowCount}</p>
                            <p className="text-xs text-gray-500">{t('settings.industry.workflows') || 'Workflow'}</p>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
                        <LayoutDashboard className="h-5 w-5 text-green-500" />
                        <div>
                            <p className="text-2xl font-bold text-gray-900">{widgets.length}</p>
                            <p className="text-xs text-gray-500">{t('settings.industry.widgets') || 'Dashboard Widget'}</p>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
                        <Info className="h-5 w-5 text-amber-500" />
                        <div>
                            <p className="text-2xl font-bold text-gray-900">{Object.keys(customFields).length}</p>
                            <p className="text-xs text-gray-500">{t('settings.industry.entitiesWithFields') || 'Entity Custom Fields'}</p>
                        </div>
                    </div>
                </div>

                {/* Modules */}
                {Object.keys(modules).length > 0 && (
                    <div className="bg-white rounded-xl border border-gray-200 p-6">
                        <h3 className="font-semibold text-gray-900 mb-4">{t('settings.industry.packModules') || 'Module yang Tersedia'}</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {Object.entries(modules).map(([key, mod]) => (
                                <div
                                    key={key}
                                    className={`flex items-center justify-between p-3 rounded-xl border-2 ${mod.enabled ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50 opacity-60'}`}
                                >
                                    <div className="flex items-center gap-2">
                                        <Zap className={`h-4 w-4 ${mod.enabled ? 'text-green-600' : 'text-gray-400'}`} />
                                        <span className="text-sm font-medium text-gray-900">{mod.label}</span>
                                    </div>
                                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${mod.enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                        {mod.enabled ? (t('settings.industry.active') || 'Aktif') : (t('settings.industry.inactive') || 'Nonaktif')}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Custom Fields Preview */}
                {Object.keys(customFields).length > 0 && (
                    <div className="bg-white rounded-xl border border-gray-200 p-6">
                        <h3 className="font-semibold text-gray-900 mb-4">{t('settings.industry.customFieldsPreview') || 'Custom Fields per Entity'}</h3>
                        <div className="space-y-4">
                            {Object.entries(customFields).map(([entity, fields]) => (
                                <div key={entity}>
                                    <h4 className="text-sm font-medium text-gray-700 mb-2 capitalize">{entity}</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {fields.map((field) => (
                                            <span
                                                key={field.name}
                                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border ${field.required ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-gray-50 text-gray-600 border-gray-200'}`}
                                            >
                                                {field.label}
                                                <span className="text-[10px] text-gray-400">({field.type})</span>
                                                {field.required && <span className="text-red-400">*</span>}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Workflows */}
                {Object.keys(workflows).length > 0 && (
                    <div className="bg-white rounded-xl border border-gray-200 p-6">
                        <h3 className="font-semibold text-gray-900 mb-4">{t('settings.industry.workflowPreview') || 'Workflow yang Tersedia'}</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {Object.entries(workflows).map(([key, wf]) => (
                                <div key={key} className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                                    <div className="flex items-center gap-2 mb-2">
                                        <GitBranch className="h-4 w-4 text-purple-500" />
                                        <span className="text-sm font-semibold text-gray-900 capitalize">{key}</span>
                                    </div>
                                    <div className="flex flex-wrap gap-1">
                                        {(wf.states || []).map((state, idx) => (
                                            <span key={idx} className="inline-flex items-center gap-1">
                                                <span className="px-2 py-0.5 bg-white border border-gray-200 rounded text-xs font-medium text-gray-700">
                                                    {state}
                                                </span>
                                                {idx < (wf.states || []).length - 1 && (
                                                    <ChevronRight className="h-3 w-3 text-gray-400" />
                                                )}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Dashboard Widgets Preview */}
                {widgets.length > 0 && (
                    <div className="bg-white rounded-xl border border-gray-200 p-6">
                        <h3 className="font-semibold text-gray-900 mb-4">{t('settings.industry.widgetsPreview') || 'Dashboard Widgets'}</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {widgets.map((widget) => (
                                <div key={widget.id} className="p-3 bg-gray-50 rounded-xl border border-gray-200 flex items-center gap-3">
                                    <LayoutDashboard className="h-4 w-4 text-gray-400" />
                                    <div>
                                        <p className="text-sm font-medium text-gray-900">{widget.title}</p>
                                        <p className="text-xs text-gray-500">{widget.module} &middot; {widget.size}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Loading detail */}
                {loadingDetail && (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                        <span className="ml-2 text-sm text-gray-500">{t('settings.industry.loadingDetails') || 'Memuat detail...'}</span>
                    </div>
                )}

                {/* Activate Button */}
                <div className="flex justify-end gap-3">
                    <button
                        onClick={handleBack}
                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                    >
                        {t('common.back') || 'Kembali'}
                    </button>
                    <button
                        onClick={() => handleActivatePack(selectedPack.id)}
                        disabled={activating || isActive}
                        className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors ${isActive
                            ? 'bg-green-100 text-green-700 cursor-not-allowed'
                            : 'bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50'
                            }`}
                    >
                        {activating && <Loader2 className="h-4 w-4 animate-spin" />}
                        {isActive
                            ? (t('settings.industry.alreadyActive') || 'Sudah Aktif')
                            : (t('settings.industry.activatePack') || 'Aktifkan Pack Ini')
                        }
                    </button>
                </div>
            </div>
        )
    }

    // ─── Render: Pack Selection View ────────────────────────────────────────

    return (
        <div className="space-y-6">
            {/* Toast */}
            {toast && (
                <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 ${toast.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
                    {toast.type === 'success' ? <CheckCircle className="h-5 w-5" /> : <X className="h-5 w-5" />}
                    <span className="text-sm font-medium">{toast.message}</span>
                </div>
            )}

            {/* Header */}
            <div>
                <h2 className="text-xl font-bold text-gray-900">{t('settings.industry.title')}</h2>
                <p className="text-gray-600 mt-1">{t('settings.industry.subtitle')}</p>
            </div>

            {/* Current Config Banner */}
            {config && config.industry && config.industry !== 'general' && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Factory className="h-5 w-5 text-blue-600" />
                        <div>
                            <span className="text-sm text-blue-600 font-medium">{t('settings.industry.currentIndustry') || 'Industri Aktif'}</span>
                            <span className="ml-2 text-blue-900 font-semibold">{config.name}</span>
                        </div>
                    </div>
                    <span className="text-sm text-blue-600">{config.customFieldCount} {t('settings.industry.customFieldsCount') || 'custom fields'}</span>
                </div>
            )}

            {/* Industry Pack Selection */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h3 className="font-semibold text-gray-900">{t('settings.industry.selectPack') || 'Pilih Industry Pack'}</h3>
                        <p className="text-sm text-gray-500 mt-0.5">{t('settings.industry.selectPackDesc') || 'Pilih industri yang paling sesuai dengan bisnis Anda. Setiap pack menyediakan konfigurasi modul, field, dan workflow yang sudah dioptimasi.'}</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {packs.map((pack) => {
                        const Icon = getPackIcon(pack.id)
                        const isCurrentlyActive = config?.industry === pack.baseIndustry
                        return (
                            <button
                                key={pack.id}
                                onClick={() => handlePackSelect(pack)}
                                className={`group p-5 rounded-xl border-2 transition-all text-left ${isCurrentlyActive
                                    ? 'border-blue-500 bg-blue-50 shadow-sm'
                                    : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50 hover:shadow-sm'
                                    }`}
                            >
                                <div className="flex items-start justify-between mb-3">
                                    <div className={`p-2 rounded-lg ${isCurrentlyActive ? 'bg-blue-100' : 'bg-gray-100 group-hover:bg-blue-50'}`}>
                                        <Icon className={`h-6 w-6 ${isCurrentlyActive ? 'text-blue-600' : 'text-gray-500 group-hover:text-blue-500'}`} />
                                    </div>
                                    {isCurrentlyActive && (
                                        <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium flex items-center gap-1">
                                            <CheckCircle className="h-3 w-3" />
                                            Aktif
                                        </span>
                                    )}
                                </div>
                                <h4 className="font-semibold text-gray-900 mb-1">{pack.name}</h4>
                                <p className="text-xs text-gray-500 mb-3 line-clamp-2">{pack.description}</p>
                                <div className="flex items-center gap-3 text-xs text-gray-400">
                                    <span className="flex items-center gap-1">
                                        <Package className="h-3 w-3" />
                                        {pack.enabledModuleCount} module
                                    </span>
                                    {pack.workflowCount > 0 && (
                                        <span className="flex items-center gap-1">
                                            <GitBranch className="h-3 w-3" />
                                            {pack.workflowCount} workflow
                                        </span>
                                    )}
                                    {pack.hasPosSettings && (
                                        <span className="flex items-center gap-1">
                                            <Zap className="h-3 w-3" />
                                            POS
                                        </span>
                                    )}
                                </div>
                                <div className="mt-3 flex items-center gap-1 text-xs font-medium text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
                                    {t('settings.industry.viewDetails') || 'Lihat Detail'}
                                    <ChevronRight className="h-3 w-3" />
                                </div>
                            </button>
                        )
                    })}
                </div>
            </div>

            {/* Quick Module Toggle (for current config) */}
            {config && (
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <h3 className="font-semibold text-gray-900 mb-1">{t('settings.industry.moduleOverview') || 'Modul yang Aktif'}</h3>
                    <p className="text-sm text-gray-500 mb-4">{t('settings.industry.moduleOverviewDesc') || 'Modul-modul yang sedang aktif untuk industri Anda saat ini.'}</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                        {Object.entries(config.modules || {}).map(([module, enabled]) => (
                            <div
                                key={module}
                                className={`flex items-center justify-between p-3 rounded-xl border-2 ${enabled
                                    ? 'border-green-200 bg-green-50'
                                    : 'border-gray-200 bg-gray-50 opacity-60'
                                    }`}
                            >
                                <span className="text-sm font-medium text-gray-900 capitalize">{module}</span>
                                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                                    }`}>
                                    {enabled ? (t('settings.industry.active') || 'Aktif') : (t('settings.industry.inactive') || 'Nonaktif')}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
