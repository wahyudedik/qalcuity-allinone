'use client'

import { useState, useEffect } from 'react'
import { useTranslation } from '@/lib/i18n'
import { Shield, X, CheckCircle } from 'lucide-react'
import SoDRulesTab from './components/SoDRulesTab'
import SoDExceptionsTab from './components/SoDExceptionsTab'

type TabType = 'rules' | 'exceptions'

export default function SoDManagementPage() {
    const { t } = useTranslation()
    const [activeTab, setActiveTab] = useState<TabType>('rules')
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 3000)
            return () => clearTimeout(timer)
        }
    }, [toast])

    const showToast = (message: string, type: 'success' | 'error') => {
        setToast({ message, type })
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
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <Shield className="h-6 w-6 text-blue-600" />
                    {t('settings.sod.title')}
                </h1>
                <p className="text-gray-600 mt-1">{t('settings.sod.subtitle')}</p>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200">
                <nav className="flex gap-1 overflow-x-auto">
                    <button
                        onClick={() => setActiveTab('rules')}
                        className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'rules'
                            ? 'border-blue-600 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                    >
                        {t('settings.sod.tabRules')}
                    </button>
                    <button
                        onClick={() => setActiveTab('exceptions')}
                        className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'exceptions'
                            ? 'border-blue-600 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                    >
                        {t('settings.sod.tabExceptions')}
                    </button>
                </nav>
            </div>

            {/* Content */}
            {activeTab === 'rules' ? (
                <SoDRulesTab onToast={showToast} />
            ) : (
                <SoDExceptionsTab onToast={showToast} />
            )}
        </div>
    )
}
