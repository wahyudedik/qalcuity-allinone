'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from '@/lib/i18n'
import { Factory, Loader2, CheckCircle, X, ShoppingCart, Wrench, Briefcase, Building2, Heart, GraduationCap, Coffee, Building } from 'lucide-react'

type IndustryType = 'retail' | 'manufacturing' | 'services' | 'construction' | 'healthcare' | 'education' | 'food_beverage' | 'general'

type ModuleConfig = {
    finance: boolean
    crm: boolean
    hr: boolean
    inventory: boolean
    billing: boolean
    analytics: boolean
}

type IndustryConfigData = {
    industry: IndustryType
    name: string
    description: string
    modules: ModuleConfig
    customFieldCount: number
}

const INDUSTRY_ICONS: Record<IndustryType, typeof Factory> = {
    retail: ShoppingCart,
    manufacturing: Wrench,
    services: Briefcase,
    construction: Building2,
    healthcare: Heart,
    education: GraduationCap,
    food_beverage: Coffee,
    general: Building,
}

function getIndustryLabel(industry: IndustryType, t: (key: string) => string): string {
    const labels: Record<IndustryType, string> = {
        retail: t('settings.industry.labelRetail'),
        manufacturing: t('settings.industry.labelManufacturing'),
        services: t('settings.industry.labelServices'),
        construction: t('settings.industry.labelConstruction'),
        healthcare: t('settings.industry.labelHealthcare'),
        education: t('settings.industry.labelEducation'),
        food_beverage: t('settings.industry.labelFoodBeverage'),
        general: t('settings.industry.labelGeneral'),
    }
    return labels[industry]
}

function getModuleLabel(module: string, t: (key: string) => string): string {
    const labels: Record<string, string> = {
        finance: t('settings.industry.moduleFinance'),
        crm: t('settings.industry.moduleCrm'),
        hr: t('settings.industry.moduleHr'),
        inventory: t('settings.industry.moduleInventory'),
        billing: t('settings.industry.moduleBilling'),
        analytics: t('settings.industry.moduleAnalytics'),
    }
    return labels[module] || module
}

export default function IndustrySettingsPage() {
    const { t } = useTranslation()
    const [config, setConfig] = useState<IndustryConfigData | null>(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
    const [selectedIndustry, setSelectedIndustry] = useState<IndustryType | null>(null)
    const [modules, setModules] = useState<ModuleConfig>({
        finance: true,
        crm: true,
        hr: true,
        inventory: true,
        billing: true,
        analytics: true,
    })

    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 3000)
            return () => clearTimeout(timer)
        }
    }, [toast])

    const fetchConfig = useCallback(async () => {
        try {
            setLoading(true)
            setError(null)
            const res = await fetch('/api/settings/industry')
            const data = await res.json()
            if (data.success) {
                setConfig(data.data)
                setSelectedIndustry(data.data.industry)
                setModules(data.data.modules)
            } else {
                setError(data.error || t('settings.industry.loadFailed'))
            }
        } catch {
            setError(t('settings.industry.connectFailed'))
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchConfig()
    }, [fetchConfig])

    const handleSave = async () => {
        if (!selectedIndustry) {
            setToast({ message: t('settings.industry.selectFirst'), type: 'error' })
            return
        }

        setSaving(true)
        try {
            const res = await fetch('/api/settings/industry', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ industry: selectedIndustry, modules }),
            })
            const data = await res.json()
            if (data.success) {
                setToast({ message: t('settings.industry.saveSuccess'), type: 'success' })
                fetchConfig()
            } else {
                setToast({ message: data.error || t('settings.industry.saveFailed'), type: 'error' })
            }
        } catch {
            setToast({ message: t('settings.industry.connectFailed'), type: 'error' })
        } finally {
            setSaving(false)
        }
    }

    const handleIndustrySelect = (industry: IndustryType) => {
        setSelectedIndustry(industry)
    }

    const toggleModule = (module: keyof ModuleConfig) => {
        setModules(prev => ({ ...prev, [module]: !prev[module] }))
    }

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="animate-pulse">
                    <div className="h-8 bg-gray-200 rounded w-64 mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-96"></div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <div className="animate-pulse grid grid-cols-2 md:grid-cols-4 gap-3">
                        {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                            <div key={i} className="h-24 bg-gray-200 rounded-lg"></div>
                        ))}
                    </div>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="bg-white rounded-xl border border-gray-200 p-8">
                <div className="flex flex-col items-center text-center">
                    <Factory className="h-12 w-12 text-red-500 mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('settings.industry.loadError')}</h3>
                    <p className="text-gray-600 mb-4">{error}</p>
                    <button onClick={fetchConfig} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                        {t('settings.retry')}
                    </button>
                </div>
            </div>
        )
    }

    const industries: IndustryType[] = ['retail', 'manufacturing', 'services', 'construction', 'healthcare', 'education', 'food_beverage', 'general']

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
                <h2 className="text-xl font-bold text-gray-900">{t('settings.industry.title')}</h2>
                <p className="text-gray-600 mt-1">{t('settings.industry.subtitle')}</p>
            </div>

            {/* Current Config */}
            {config && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Factory className="h-5 w-5 text-blue-600" />
                        <div>
                            <span className="text-sm text-blue-600 font-medium">{t('settings.industry.currentIndustry')}</span>
                            <span className="ml-2 text-blue-900 font-semibold">{config.name}</span>
                        </div>
                    </div>
                    <span className="text-sm text-blue-600">{config.customFieldCount} {t('settings.industry.customFieldsCount')}</span>
                </div>
            )}

            {/* Industry Selection */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="font-semibold text-gray-900 mb-4">{t('settings.industry.selectIndustry')}</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {industries.map(industry => {
                        const Icon = INDUSTRY_ICONS[industry]
                        const isSelected = selectedIndustry === industry
                        return (
                            <button
                                key={industry}
                                onClick={() => handleIndustrySelect(industry)}
                                className={`p-4 rounded-xl border-2 transition-all text-center ${isSelected
                                    ? 'border-blue-500 bg-blue-50 shadow-sm'
                                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                    }`}
                            >
                                <Icon className={`h-8 w-8 mx-auto mb-2 ${isSelected ? 'text-blue-600' : 'text-gray-400'}`} />
                                <span className={`text-sm font-medium ${isSelected ? 'text-blue-900' : 'text-gray-700'}`}>
                                    {getIndustryLabel(industry, t)}
                                </span>
                            </button>
                        )
                    })}
                </div>
            </div>

            {/* Module Configuration */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="font-semibold text-gray-900 mb-4">{t('settings.industry.enableModules')}</h3>
                <p className="text-sm text-gray-500 mb-4">{t('settings.industry.enableModulesDesc')}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {(Object.keys(modules) as (keyof ModuleConfig)[]).map(module => (
                        <label
                            key={module}
                            className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all ${modules[module]
                                ? 'border-green-500 bg-green-50'
                                : 'border-gray-200 bg-gray-50 opacity-60'
                                }`}
                        >
                            <div className="flex items-center gap-3">
                                <input
                                    type="checkbox"
                                    checked={modules[module]}
                                    onChange={() => toggleModule(module)}
                                    className="h-4 w-4 text-green-600 rounded"
                                />
                                <span className="font-medium text-gray-900">{getModuleLabel(module, t)}</span>
                            </div>
                            <span className={`text-xs font-medium px-2 py-1 rounded-full ${modules[module] ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                                }`}>
                                {modules[module] ? t('settings.industry.active') : t('settings.industry.inactive')}
                            </span>
                        </label>
                    ))}
                </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end">
                <button
                    onClick={handleSave}
                    disabled={saving || !selectedIndustry}
                    className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 font-medium"
                >
                    {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                    {t('settings.industry.saveBtn')}
                </button>
            </div>
        </div>
    )
}
