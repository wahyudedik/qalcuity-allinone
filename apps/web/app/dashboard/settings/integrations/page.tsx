'use client'

import { useState } from 'react'
import { useTranslation } from '@/lib/i18n'
import {
    MessageSquare,
    Mail,
    Calendar,
    ShoppingBag,
    Store,
    Landmark,
    CreditCard,
    BarChart3,
    Package,
    Bike,
    Info,
    Search,
    Settings,
    Eye,
    EyeOff,
    CheckCircle,
    AlertCircle,
    type LucideIcon,
} from 'lucide-react'

interface Integration {
    id: string
    name: string
    description: string
    icon: LucideIcon
    color: string
    connected: boolean
    category: string
}

const integrationData: Omit<Integration, 'description' | 'category'>[] = [
    { id: 'whatsapp', name: 'WhatsApp Business', icon: MessageSquare, color: 'bg-green-500', connected: true },
    { id: 'email', name: 'Email (SMTP)', icon: Mail, color: 'bg-blue-500', connected: true },
    { id: 'google-calendar', name: 'Google Calendar', icon: Calendar, color: 'bg-red-500', connected: false },
    { id: 'shopee', name: 'Shopee', icon: ShoppingBag, color: 'bg-orange-500', connected: false },
    { id: 'tokopedia', name: 'Tokopedia', icon: Store, color: 'bg-green-600', connected: false },
    { id: 'bank-bca', name: 'Bank BCA', icon: Landmark, color: 'bg-blue-700', connected: false },
    { id: 'bank-mandiri', name: 'Bank Mandiri', icon: Landmark, color: 'bg-blue-800', connected: false },
    { id: 'midtrans', name: 'Midtrans', icon: CreditCard, color: 'bg-purple-600', connected: true },
    { id: 'xendit', name: 'Xendit', icon: CreditCard, color: 'bg-indigo-600', connected: false },
    { id: 'google-sheets', name: 'Google Sheets', icon: BarChart3, color: 'bg-green-500', connected: false },
    { id: 'jne', name: 'JNE', icon: Package, color: 'bg-red-600', connected: false },
    { id: 'grab', name: 'Grab Express', icon: Bike, color: 'bg-green-700', connected: false },
]

// Peta key i18n untuk deskripsi dan kategori setiap integrasi
const integrationI18n: Record<string, { descKey: string; catKey: string }> = {
    whatsapp: { descKey: 'settings.integrations.desc.whatsapp', catKey: 'settings.integrations.categories.communication' },
    email: { descKey: 'settings.integrations.desc.email', catKey: 'settings.integrations.categories.communication' },
    'google-calendar': { descKey: 'settings.integrations.desc.googleCalendar', catKey: 'settings.integrations.categories.productivity' },
    shopee: { descKey: 'settings.integrations.desc.shopee', catKey: 'settings.integrations.categories.marketplace' },
    tokopedia: { descKey: 'settings.integrations.desc.tokopedia', catKey: 'settings.integrations.categories.marketplace' },
    'bank-bca': { descKey: 'settings.integrations.desc.bankBca', catKey: 'settings.integrations.categories.payment' },
    'bank-mandiri': { descKey: 'settings.integrations.desc.bankMandiri', catKey: 'settings.integrations.categories.payment' },
    midtrans: { descKey: 'settings.integrations.desc.midtrans', catKey: 'settings.integrations.categories.payment' },
    xendit: { descKey: 'settings.integrations.desc.xendit', catKey: 'settings.integrations.categories.payment' },
    'google-sheets': { descKey: 'settings.integrations.desc.googleSheets', catKey: 'settings.integrations.categories.productivity' },
    jne: { descKey: 'settings.integrations.desc.jne', catKey: 'settings.integrations.categories.logistics' },
    grab: { descKey: 'settings.integrations.desc.grab', catKey: 'settings.integrations.categories.logistics' },
}

export default function IntegrationsSettingsPage() {
    const { t } = useTranslation()
    const [search, setSearch] = useState('')
    const [activeCategory, setActiveCategory] = useState('all')
    const [showPaymentGateway, setShowPaymentGateway] = useState(false)
    const [pgProvider, setPgProvider] = useState<'midtrans' | 'xendit'>('midtrans')
    const [pgServerKey, setPgServerKey] = useState('')
    const [pgClientKey, setPgClientKey] = useState('')
    const [pgEnvironment, setPgEnvironment] = useState('sandbox')
    const [showServerKey, setShowServerKey] = useState(false)
    const [pgSaving, setPgSaving] = useState(false)
    const [pgSaved, setPgSaved] = useState(false)

    // Bangun array integrasi dengan deskripsi dari i18n
    const integrations: Integration[] = integrationData.map(item => ({
        ...item,
        description: t(integrationI18n[item.id].descKey),
        category: t(integrationI18n[item.id].catKey),
    }))

    const categoryKeys = ['all', 'communication', 'productivity', 'marketplace', 'payment', 'logistics'] as const
    const categories = categoryKeys.map(key => ({ key, label: t(`settings.integrations.categories.${key}`) }))

    const filteredIntegrations = integrations.filter(i => {
        const matchesSearch = i.name.toLowerCase().includes(search.toLowerCase()) ||
            i.description.toLowerCase().includes(search.toLowerCase())
        const catLabel = t(`settings.integrations.categories.${categoryKeys.find(k => t(`settings.integrations.categories.${k}`) === i.category) || 'all'}`)
        const matchesCategory = activeCategory === 'all' || i.category === catLabel
        return matchesSearch && matchesCategory
    })

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t('settings.integrations.title')}</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {t('settings.integrations.subtitle')}
                </p>
            </div>

            {/* Notice */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 dark:bg-blue-900/20 dark:border-blue-800">
                <div className="flex items-start gap-3">
                    <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
                    <div>
                        <h3 className="font-medium text-blue-900 dark:text-blue-300">{t('settings.integrations.noticeTitle')}</h3>
                        <p className="text-sm text-blue-700 dark:text-blue-400 mt-1">
                            {t('settings.integrations.noticeDesc')}
                        </p>
                    </div>
                </div>
            </div>

            {/* Payment Gateway Configuration */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div
                    className="flex items-center justify-between p-6 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    onClick={() => setShowPaymentGateway(!showPaymentGateway)}
                >
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                            <CreditCard className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-gray-900 dark:text-gray-100">{t('settings.integrations.pgTitle')}</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{t('settings.integrations.pgDesc')}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="inline-flex items-center gap-1.5 text-sm text-green-600">
                            <CheckCircle className="h-4 w-4" />
                            {t('settings.integrations.active')}
                        </span>
                        <Settings className={`h-5 w-5 text-gray-400 transition-transform ${showPaymentGateway ? 'rotate-90' : ''}`} />
                    </div>
                </div>

                {showPaymentGateway && (
                    <div className="px-6 pb-6 space-y-5 border-t border-gray-200 dark:border-gray-700 pt-5">
                        {/* Provider Selection */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                {t('settings.integrations.selectProvider')}
                            </label>
                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    onClick={() => setPgProvider('midtrans')}
                                    className={`p-4 border-2 rounded-lg text-left transition-all ${pgProvider === 'midtrans'
                                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'
                                        }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                                            <CreditCard className="h-5 w-5 text-purple-600" />
                                        </div>
                                        <div>
                                            <h4 className="font-medium text-gray-900 dark:text-gray-100">Midtrans</h4>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">VA, Credit Card, E-Wallet</p>
                                        </div>
                                    </div>
                                    {pgProvider === 'midtrans' && (
                                        <div className="mt-2 text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1">
                                            <CheckCircle className="h-3.5 w-3.5" />
                                            {t('settings.integrations.selected')}
                                        </div>
                                    )}
                                </button>

                                <button
                                    onClick={() => setPgProvider('xendit')}
                                    className={`p-4 border-2 rounded-lg text-left transition-all ${pgProvider === 'xendit'
                                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'
                                        }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                                            <CreditCard className="h-5 w-5 text-indigo-600" />
                                        </div>
                                        <div>
                                            <h4 className="font-medium text-gray-900 dark:text-gray-100">Xendit</h4>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">VA, Credit Card, QRIS</p>
                                        </div>
                                    </div>
                                    {pgProvider === 'xendit' && (
                                        <div className="mt-2 text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1">
                                            <CheckCircle className="h-3.5 w-3.5" />
                                            {t('settings.integrations.selected')}
                                        </div>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* API Keys */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                    {t('settings.integrations.serverKey')}
                                </label>
                                <div className="relative">
                                    <input
                                        type={showServerKey ? 'text' : 'password'}
                                        value={pgServerKey}
                                        onChange={(e) => setPgServerKey(e.target.value)}
                                        placeholder={pgProvider === 'midtrans' ? 'SB-Mid-server-...' : 'xnd_development_...'}
                                        className="w-full px-4 py-2.5 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none dark:bg-gray-800 dark:text-gray-100"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowServerKey(!showServerKey)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                    >
                                        {showServerKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                    {t('settings.integrations.clientKey')}
                                </label>
                                <input
                                    type="text"
                                    value={pgClientKey}
                                    onChange={(e) => setPgClientKey(e.target.value)}
                                    placeholder={pgProvider === 'midtrans' ? 'SB-Mid-client-...' : 'xnd_development_...'}
                                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none dark:bg-gray-800 dark:text-gray-100"
                                />
                            </div>
                        </div>

                        {/* Environment */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                {t('settings.integrations.environment')}
                            </label>
                            <select
                                value={pgEnvironment}
                                onChange={(e) => setPgEnvironment(e.target.value)}
                                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none dark:bg-gray-800 dark:text-gray-100"
                            >
                                <option value="sandbox">{t('settings.integrations.sandbox')}</option>
                                <option value="production">{t('settings.integrations.production')}</option>
                            </select>
                            {pgEnvironment === 'production' && (
                                <div className="flex items-center gap-2 mt-2 text-sm text-amber-600 dark:text-amber-400">
                                    <AlertCircle className="h-4 w-4 shrink-0" />
                                    <span>{t('settings.integrations.productionWarning')}</span>
                                </div>
                            )}
                        </div>

                        {/* Supported Methods */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                {t('settings.integrations.supportedMethods')}
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {['Virtual Account', 'Credit Card', 'QRIS', 'GoPay', 'OVO', 'Dana', 'ShopeePay'].map((method) => (
                                    <span
                                        key={method}
                                        className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                                    >
                                        {method}
                                    </span>
                                ))}
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-700">
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                {t('settings.integrations.keyEncrypted')}
                            </p>
                            <div className="flex gap-2">
                                {pgSaved && (
                                    <span className="inline-flex items-center gap-1.5 text-sm text-green-600">
                                        <CheckCircle className="h-4 w-4" />
                                        {t('settings.integrations.saved')}
                                    </span>
                                )}
                                <button
                                    onClick={() => {
                                        setPgSaving(true);
                                        setTimeout(() => {
                                            setPgSaving(false);
                                            setPgSaved(true);
                                            setTimeout(() => setPgSaved(false), 3000);
                                        }, 1000);
                                    }}
                                    disabled={pgSaving}
                                    className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                                >
                                    {pgSaving ? t('settings.integrations.saving') : t('settings.integrations.saveConfig')}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Search and Filter */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder={t('settings.integrations.searchPlaceholder')}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                    />
                </div>
                <div className="flex gap-2 flex-wrap">
                    {categories.map((cat) => (
                        <button
                            key={cat.key}
                            onClick={() => setActiveCategory(cat.key)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeCategory === cat.key
                                ? 'bg-blue-600 text-white'
                                : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700'
                                }`}
                        >
                            {cat.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Connected */}
            <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">{t('settings.integrations.connected')}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredIntegrations.filter(i => i.connected).map((integration) => (
                        <IntegrationCard key={integration.id} integration={integration} t={t} />
                    ))}
                </div>
                {filteredIntegrations.filter(i => i.connected).length === 0 && (
                    <p className="text-sm text-gray-500 text-center py-4">{t('settings.integrations.noConnected')}</p>
                )}
            </div>

            {/* Available */}
            <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">{t('settings.integrations.available')}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredIntegrations.filter(i => !i.connected).map((integration) => (
                        <IntegrationCard key={integration.id} integration={integration} t={t} />
                    ))}
                </div>
            </div>
        </div>
    )
}

function IntegrationCard({ integration, t }: { integration: Integration; t: (key: string) => string }) {
    const [showConfig, setShowConfig] = useState(false)
    const Icon = integration.icon

    return (
        <div className="bg-white border border-gray-200 rounded-xl p-4 dark:bg-gray-800 dark:border-gray-700">
            <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 ${integration.color} rounded-xl flex items-center justify-center`}>
                        <Icon className="h-6 w-6 text-white" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h4 className="font-medium text-gray-900 dark:text-gray-100">{integration.name}</h4>
                            <span className="text-xs text-gray-500 bg-gray-100 dark:bg-gray-700 dark:text-gray-400 px-2 py-0.5 rounded-full">
                                {integration.category}
                            </span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{integration.description}</p>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-3 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                {integration.connected ? (
                    <>
                        <span className="inline-flex items-center gap-1.5 text-sm text-green-600">
                            <span className="w-2 h-2 bg-green-500 rounded-full" />
                            {t('settings.integrations.connectedLabel')}
                        </span>
                        <button
                            onClick={() => setShowConfig(!showConfig)}
                            className="ml-auto text-sm text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                        >
                            {t('settings.integrations.settings')}
                        </button>
                        <button className="text-sm text-red-600 hover:text-red-700">
                            {t('settings.integrations.disconnect')}
                        </button>
                    </>
                ) : (
                    <button
                        onClick={() => setShowConfig(!showConfig)}
                        className="ml-auto px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        {t('settings.integrations.connect')}
                    </button>
                )}
            </div>

            {/* Config Panel */}
            {showConfig && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200 dark:bg-gray-700/50 dark:border-gray-600">
                    <h5 className="font-medium text-gray-900 dark:text-gray-100 mb-3">
                        {integration.connected ? t('settings.integrations.configTitle') : t('settings.integrations.connectTitle')} {integration.name}
                    </h5>
                    <div className="space-y-3">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                API Key
                            </label>
                            <input
                                type="password"
                                placeholder={t('settings.integrations.enterApiKey')}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                {t('settings.integrations.apiSecret')}
                            </label>
                            <input
                                type="password"
                                placeholder={t('settings.integrations.enterApiSecret')}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                            />
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            {t('settings.integrations.keyEncrypted')} {integration.name}.
                        </p>
                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => setShowConfig(false)}
                                className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                            >
                                {t('settings.integrations.cancel')}
                            </button>
                            <button className="px-4 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
                                {integration.connected ? t('settings.integrations.save') : t('settings.integrations.connect')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
