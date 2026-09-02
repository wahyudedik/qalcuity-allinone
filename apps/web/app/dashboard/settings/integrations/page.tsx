'use client'

import { useState, useEffect, useCallback } from 'react'
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
    Loader2,
    X,
    Trash2,
    RefreshCw,
    type LucideIcon,
} from 'lucide-react'

interface IntegrationRecord {
    id: string
    type: string
    name: string
    status: string
    config: Record<string, unknown>
    hasApiKey: boolean
    hasApiSecret: boolean
    webhookUrl: string | null
    lastSyncAt: string | null
    lastErrorAt: string | null
    lastError: string | null
    createdAt: string
    updatedAt: string
}

interface IntegrationDisplay {
    id: string
    name: string
    description: string
    icon: LucideIcon
    color: string
    connected: boolean
    status: string
    category: string
    dbRecord?: IntegrationRecord
}

// Default connection statuses — all false until API confirms otherwise
const defaultConnectionStatuses: Record<string, boolean> = {
    whatsapp: false,
    email: false,
    midtrans: false,
    xendit: false,
}

const integrationData: Omit<IntegrationDisplay, 'description' | 'category' | 'connected' | 'status' | 'dbRecord'>[] = [
    { id: 'whatsapp', name: 'WhatsApp Business', icon: MessageSquare, color: 'bg-green-500' },
    { id: 'email', name: 'Email (SMTP)', icon: Mail, color: 'bg-blue-500' },
    { id: 'google-calendar', name: 'Google Calendar', icon: Calendar, color: 'bg-red-500' },
    { id: 'shopee', name: 'Shopee', icon: ShoppingBag, color: 'bg-orange-500' },
    { id: 'tokopedia', name: 'Tokopedia', icon: Store, color: 'bg-green-600' },
    { id: 'bank-bca', name: 'Bank BCA', icon: Landmark, color: 'bg-blue-700' },
    { id: 'bank-mandiri', name: 'Bank Mandiri', icon: Landmark, color: 'bg-blue-800' },
    { id: 'midtrans', name: 'Midtrans', icon: CreditCard, color: 'bg-purple-600' },
    { id: 'xendit', name: 'Xendit', icon: CreditCard, color: 'bg-indigo-600' },
    { id: 'google-sheets', name: 'Google Sheets', icon: BarChart3, color: 'bg-green-500' },
    { id: 'jne', name: 'JNE', icon: Package, color: 'bg-red-600' },
    { id: 'grab', name: 'Grab Express', icon: Bike, color: 'bg-green-700' },
]

// Peta key i18n untuk deskripsi dan kategori setiap integrasi
const integrationI18n: Record<string, { descKey: string; catKey: string; type: string; category: string }> = {
    whatsapp: { descKey: 'settings.integrations.desc.whatsapp', catKey: 'settings.integrations.categories.communication', type: 'communication', category: 'communication' },
    email: { descKey: 'settings.integrations.desc.email', catKey: 'settings.integrations.categories.communication', type: 'email', category: 'communication' },
    'google-calendar': { descKey: 'settings.integrations.desc.googleCalendar', catKey: 'settings.integrations.categories.productivity', type: 'productivity', category: 'productivity' },
    shopee: { descKey: 'settings.integrations.desc.shopee', catKey: 'settings.integrations.categories.marketplace', type: 'marketplace', category: 'marketplace' },
    tokopedia: { descKey: 'settings.integrations.desc.tokopedia', catKey: 'settings.integrations.categories.marketplace', type: 'marketplace', category: 'marketplace' },
    'bank-bca': { descKey: 'settings.integrations.desc.bankBca', catKey: 'settings.integrations.categories.payment', type: 'payment', category: 'payment' },
    'bank-mandiri': { descKey: 'settings.integrations.desc.bankMandiri', catKey: 'settings.integrations.categories.payment', type: 'payment', category: 'payment' },
    midtrans: { descKey: 'settings.integrations.desc.midtrans', catKey: 'settings.integrations.categories.payment', type: 'payment', category: 'payment' },
    xendit: { descKey: 'settings.integrations.desc.xendit', catKey: 'settings.integrations.categories.payment', type: 'payment', category: 'payment' },
    'google-sheets': { descKey: 'settings.integrations.desc.googleSheets', catKey: 'settings.integrations.categories.productivity', type: 'productivity', category: 'productivity' },
    jne: { descKey: 'settings.integrations.desc.jne', catKey: 'settings.integrations.categories.logistics', type: 'logistics', category: 'logistics' },
    grab: { descKey: 'settings.integrations.desc.grab', catKey: 'settings.integrations.categories.logistics', type: 'logistics', category: 'logistics' },
}

export default function IntegrationsSettingsPage() {
    const { t } = useTranslation()
    const [search, setSearch] = useState('')
    const [activeCategory, setActiveCategory] = useState('all')
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    // Payment Gateway config
    const [showPaymentGateway, setShowPaymentGateway] = useState(false)
    const [pgProvider, setPgProvider] = useState<'midtrans' | 'xendit'>('midtrans')
    const [pgServerKey, setPgServerKey] = useState('')
    const [pgClientKey, setPgClientKey] = useState('')
    const [pgEnvironment, setPgEnvironment] = useState('sandbox')
    const [showServerKey, setShowServerKey] = useState(false)
    const [pgSaving, setPgSaving] = useState(false)
    const [pgSaved, setPgSaved] = useState(false)

    // DB integration records
    const [dbRecords, setDbRecords] = useState<IntegrationRecord[]>([])
    const [connectionStatuses, setConnectionStatuses] = useState<Record<string, boolean>>(defaultConnectionStatuses)

    // Connect/Disconnect modal states
    const [showConnectModal, setShowConnectModal] = useState<string | null>(null)
    const [connectApiKey, setConnectApiKey] = useState('')
    const [connectApiSecret, setConnectApiSecret] = useState('')
    const [connecting, setConnecting] = useState(false)
    const [testingId, setTestingId] = useState<string | null>(null)
    const [testResult, setTestResult] = useState<{ id: string; success: boolean; message: string } | null>(null)
    const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

    // Fetch integrations from API
    const fetchIntegrations = useCallback(async () => {
        try {
            setLoading(true)
            setError(null)
            const res = await fetch('/api/settings/integrations')
            const data = await res.json()

            if (data.success && Array.isArray(data.data)) {
                setDbRecords(data.data)

                // Build connection statuses from DB records
                const statuses: Record<string, boolean> = { ...defaultConnectionStatuses }
                for (const record of data.data) {
                    // Map DB type to integration id
                    for (const item of integrationData) {
                        if (item.name.toLowerCase().includes(record.name.toLowerCase()) ||
                            record.name.toLowerCase().includes(item.name.toLowerCase())) {
                            statuses[item.id] = record.status === 'active'
                        }
                    }
                }
                setConnectionStatuses(statuses)
            } else if (data.envStatus) {
                // Fallback to env-based statuses
                setConnectionStatuses(data.envStatus)
            }
        } catch {
            setError('Gagal memuat data integrasi')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchIntegrations()
    }, [fetchIntegrations])

    // Auto-hide toast
    useEffect(() => {
        if (toastMessage) {
            const timer = setTimeout(() => setToastMessage(null), 4000)
            return () => clearTimeout(timer)
        }
    }, [toastMessage])

    // Auto-hide test result
    useEffect(() => {
        if (testResult) {
            const timer = setTimeout(() => setTestResult(null), 5000)
            return () => clearTimeout(timer)
        }
    }, [testResult])

    // Connect integration
    const handleConnect = async (itemId: string) => {
        const meta = integrationI18n[itemId]
        if (!meta) return

        try {
            setConnecting(true)
            const res = await fetch('/api/settings/integrations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: meta.type,
                    name: integrationData.find(i => i.id === itemId)?.name || itemId,
                    apiKey: connectApiKey || undefined,
                    apiSecret: connectApiSecret || undefined,
                    config: {},
                }),
            })
            const data = await res.json()

            if (data.success) {
                setToastMessage({ type: 'success', text: `Integrasi berhasil terhubung` })
                setShowConnectModal(null)
                setConnectApiKey('')
                setConnectApiSecret('')
                fetchIntegrations()
            } else {
                setToastMessage({ type: 'error', text: data.error || 'Gagal menghubungkan integrasi' })
            }
        } catch {
            setToastMessage({ type: 'error', text: 'Gagal menghubungkan integrasi' })
        } finally {
            setConnecting(false)
        }
    }

    // Disconnect integration
    const handleDisconnect = async (recordId: string) => {
        if (!confirm('Yakin ingin memutuskan integrasi ini?')) return

        try {
            const res = await fetch('/api/settings/integrations', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: recordId }),
            })
            const data = await res.json()

            if (data.success) {
                setToastMessage({ type: 'success', text: 'Integrasi berhasil diputuskan' })
                fetchIntegrations()
            } else {
                setToastMessage({ type: 'error', text: data.error || 'Gagal memutuskan integrasi' })
            }
        } catch {
            setToastMessage({ type: 'error', text: 'Gagal memutuskan integrasi' })
        }
    }

    // Test connection
    const handleTestConnection = async (recordId: string) => {
        try {
            setTestingId(recordId)
            setTestResult(null)
            const res = await fetch(`/api/settings/integrations/${recordId}/test`, {
                method: 'POST',
            })
            const data = await res.json()

            if (data.success) {
                setTestResult({
                    id: recordId,
                    success: data.data.success,
                    message: data.data.message,
                })
                fetchIntegrations()
            } else {
                setTestResult({
                    id: recordId,
                    success: false,
                    message: data.error || 'Gagal melakukan test',
                })
            }
        } catch {
            setTestResult({
                id: recordId,
                success: false,
                message: 'Gagal melakukan test koneksi',
            })
        } finally {
            setTestingId(null)
        }
    }

    // Save payment gateway config (creates/updates integration)
    const handleSavePG = async () => {
        try {
            setPgSaving(true)
            const existingRecord = dbRecords.find(r => r.name.toLowerCase().includes(pgProvider))

            if (existingRecord) {
                // Update existing
                const res = await fetch('/api/settings/integrations', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        id: existingRecord.id,
                        apiKey: pgServerKey || undefined,
                        apiSecret: pgClientKey || undefined,
                        config: { environment: pgEnvironment, clientKey: pgClientKey },
                    }),
                })
                const data = await res.json()
                if (data.success) {
                    setPgSaved(true)
                    setTimeout(() => setPgSaved(false), 3000)
                    fetchIntegrations()
                }
            } else {
                // Create new
                const res = await fetch('/api/settings/integrations', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        type: 'payment',
                        name: pgProvider === 'midtrans' ? 'Midtrans' : 'Xendit',
                        apiKey: pgServerKey || undefined,
                        apiSecret: pgClientKey || undefined,
                        config: { environment: pgEnvironment, clientKey: pgClientKey },
                    }),
                })
                const data = await res.json()
                if (data.success) {
                    setPgSaved(true)
                    setTimeout(() => setPgSaved(false), 3000)
                    fetchIntegrations()
                }
            }
        } catch {
            setToastMessage({ type: 'error', text: 'Gagal menyimpan konfigurasi payment gateway' })
        } finally {
            setPgSaving(false)
        }
    }

    // Build integrations array with i18n descriptions + DB connection status
    const integrations: IntegrationDisplay[] = integrationData.map(item => {
        const i18nMeta = integrationI18n[item.id]
        // Find matching DB record
        const dbRecord = dbRecords.find(r =>
            r.name.toLowerCase().includes(item.name.toLowerCase()) ||
            item.name.toLowerCase().includes(r.name.toLowerCase())
        )

        return {
            ...item,
            description: t(i18nMeta.descKey),
            category: t(i18nMeta.catKey),
            connected: dbRecord ? dbRecord.status === 'active' : (connectionStatuses[item.id] ?? false),
            status: dbRecord?.status || (connectionStatuses[item.id] ? 'active' : 'inactive'),
            dbRecord,
        }
    })

    const categoryKeys = ['all', 'communication', 'productivity', 'marketplace', 'payment', 'logistics'] as const
    const categories = categoryKeys.map(key => ({ key, label: t(`settings.integrations.categories.${key}`) }))

    const filteredIntegrations = integrations.filter(i => {
        const matchesSearch = i.name.toLowerCase().includes(search.toLowerCase()) ||
            i.description.toLowerCase().includes(search.toLowerCase())
        const catLabel = t(`settings.integrations.categories.${categoryKeys.find(k => t(`settings.integrations.categories.${k}`) === i.category) || 'all'}`)
        const matchesCategory = activeCategory === 'all' || i.category === catLabel
        return matchesSearch && matchesCategory
    })

    if (loading) {
        return (
            <div className="space-y-6">
                <div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t('settings.integrations.title')}</h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{t('settings.integrations.subtitle')}</p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 flex flex-col items-center justify-center">
                    <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-3" />
                    <p className="text-sm text-gray-500">Memuat integrasi...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Toast Notification */}
            {toastMessage && (
                <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg ${toastMessage.type === 'success' ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-800'
                    }`}>
                    {toastMessage.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                    <span className="text-sm font-medium">{toastMessage.text}</span>
                    <button onClick={() => setToastMessage(null)} className="ml-2"><X className="w-4 h-4" /></button>
                </div>
            )}

            {/* Header */}
            <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t('settings.integrations.title')}</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {t('settings.integrations.subtitle')}
                </p>
            </div>

            {/* Error Banner */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
                    <p className="text-sm text-red-700 flex-1">{error}</p>
                    <button onClick={() => setError(null)} className="text-sm text-red-600 hover:text-red-800 font-medium"><X className="w-4 h-4" /></button>
                </div>
            )}

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
                        {(connectionStatuses.midtrans || connectionStatuses.xendit) ? (
                            <span className="inline-flex items-center gap-1.5 text-sm text-green-600">
                                <CheckCircle className="h-4 w-4" />
                                {t('settings.integrations.active')}
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-1.5 text-sm text-gray-500">
                                <AlertCircle className="h-4 w-4" />
                                Belum dikonfigurasi
                            </span>
                        )}
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
                                    onClick={handleSavePG}
                                    disabled={pgSaving}
                                    className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                                >
                                    {pgSaving ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            {t('settings.integrations.saving')}
                                        </>
                                    ) : (
                                        t('settings.integrations.saveConfig')
                                    )}
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
                        <IntegrationCard
                            key={integration.id}
                            integration={integration}
                            t={t}
                            onTest={handleTestConnection}
                            onDisconnect={handleDisconnect}
                            testingId={testingId}
                            testResult={testResult}
                        />
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
                        <IntegrationCard
                            key={integration.id}
                            integration={integration}
                            t={t}
                            onConnect={handleConnect}
                            showConnectModal={showConnectModal}
                            setShowConnectModal={setShowConnectModal}
                            connectApiKey={connectApiKey}
                            setConnectApiKey={setConnectApiKey}
                            connectApiSecret={connectApiSecret}
                            setConnectApiSecret={setConnectApiSecret}
                            connecting={connecting}
                        />
                    ))}
                </div>
            </div>
        </div>
    )
}

function IntegrationCard({
    integration,
    t,
    onTest,
    onDisconnect,
    onConnect,
    testingId,
    testResult,
    showConnectModal,
    setShowConnectModal,
    connectApiKey,
    setConnectApiKey,
    connectApiSecret,
    setConnectApiSecret,
    connecting,
}: {
    integration: IntegrationDisplay
    t: (key: string) => string
    onTest?: (id: string) => void
    onDisconnect?: (id: string) => void
    onConnect?: (id: string) => void
    testingId?: string | null
    testResult?: { id: string; success: boolean; message: string } | null
    showConnectModal?: string | null
    setShowConnectModal?: (id: string | null) => void
    connectApiKey?: string
    setConnectApiKey?: (val: string) => void
    connectApiSecret?: string
    setConnectApiSecret?: (val: string) => void
    connecting?: boolean
}) {
    const [showConfig, setShowConfig] = useState(false)
    const Icon = integration.icon

    const isShowingConnect = showConnectModal === integration.id
    const isTesting = testingId === integration.dbRecord?.id
    const myTestResult = testResult?.id === integration.dbRecord?.id ? testResult : null

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

                        {/* Status & Last Sync Info */}
                        {integration.dbRecord && (
                            <div className="mt-2 flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                                <span className={`inline-flex items-center gap-1 ${integration.status === 'active' ? 'text-green-600' :
                                        integration.status === 'error' ? 'text-red-600' : 'text-gray-500'
                                    }`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${integration.status === 'active' ? 'bg-green-500' :
                                            integration.status === 'error' ? 'bg-red-500' : 'bg-gray-400'
                                        }`} />
                                    {integration.status === 'active' ? 'Terhubung' :
                                        integration.status === 'error' ? 'Error' : 'Nonaktif'}
                                </span>
                                {integration.dbRecord.lastSyncAt && (
                                    <span>Sync: {new Date(integration.dbRecord.lastSyncAt).toLocaleString('id-ID')}</span>
                                )}
                                {integration.dbRecord.lastError && (
                                    <span className="text-red-500">{integration.dbRecord.lastError}</span>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Test Result Banner */}
            {myTestResult && (
                <div className={`mt-3 p-2 rounded-lg text-xs flex items-center gap-2 ${myTestResult.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                    }`}>
                    {myTestResult.success ? <CheckCircle className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                    {myTestResult.message}
                </div>
            )}

            <div className="flex items-center gap-3 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                {integration.connected ? (
                    <>
                        <span className="inline-flex items-center gap-1.5 text-sm text-green-600">
                            <span className="w-2 h-2 bg-green-500 rounded-full" />
                            {t('settings.integrations.connectedLabel')}
                        </span>

                        {integration.dbRecord && (
                            <button
                                onClick={() => onTest?.(integration.dbRecord!.id)}
                                disabled={isTesting}
                                className="ml-auto text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1 disabled:opacity-50"
                            >
                                {isTesting ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                    <RefreshCw className="w-3.5 h-3.5" />
                                )}
                                Test
                            </button>
                        )}

                        <button
                            onClick={() => setShowConfig(!showConfig)}
                            className="text-sm text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 flex items-center gap-1"
                        >
                            <Settings className="w-3.5 h-3.5" />
                            {t('settings.integrations.settings')}
                        </button>

                        <button
                            onClick={() => onDisconnect?.(integration.dbRecord!.id)}
                            className="text-sm text-red-600 hover:text-red-700 flex items-center gap-1"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                            {t('settings.integrations.disconnect')}
                        </button>
                    </>
                ) : (
                    <>
                        <button
                            onClick={() => {
                                if (setShowConnectModal) {
                                    setShowConnectModal(isShowingConnect ? null : integration.id)
                                }
                                setShowConfig(!showConfig)
                            }}
                            className="ml-auto px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                        >
                            {t('settings.integrations.connect')}
                        </button>
                    </>
                )}
            </div>

            {/* Connect Config Panel */}
            {isShowingConnect && !integration.connected && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200 dark:bg-gray-700/50 dark:border-gray-600">
                    <h5 className="font-medium text-gray-900 dark:text-gray-100 mb-3">
                        Hubungkan {integration.name}
                    </h5>
                    <div className="space-y-3">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                API Key
                            </label>
                            <input
                                type="password"
                                value={connectApiKey || ''}
                                onChange={(e) => setConnectApiKey?.(e.target.value)}
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
                                value={connectApiSecret || ''}
                                onChange={(e) => setConnectApiSecret?.(e.target.value)}
                                placeholder={t('settings.integrations.enterApiSecret')}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                            />
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            {t('settings.integrations.keyEncrypted')} {integration.name}.
                        </p>
                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => setShowConnectModal?.(null)}
                                className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                            >
                                {t('settings.integrations.cancel')}
                            </button>
                            <button
                                onClick={() => onConnect?.(integration.id)}
                                disabled={connecting}
                                className="px-4 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                            >
                                {connecting && <Loader2 className="w-4 h-4 animate-spin" />}
                                {t('settings.integrations.connect')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Settings Config Panel (for connected integrations) */}
            {showConfig && integration.connected && integration.dbRecord && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200 dark:bg-gray-700/50 dark:border-gray-600">
                    <h5 className="font-medium text-gray-900 dark:text-gray-100 mb-3">
                        Pengaturan {integration.name}
                    </h5>
                    <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                        <p><span className="font-medium">Status:</span> {integration.dbRecord.status}</p>
                        <p><span className="font-medium">API Key:</span> {integration.dbRecord.hasApiKey ? '✓ Tersimpan' : '✗ Belum diisi'}</p>
                        {integration.dbRecord.webhookUrl && (
                            <p><span className="font-medium">Webhook:</span> {integration.dbRecord.webhookUrl}</p>
                        )}
                        <p><span className="font-medium">Dibuat:</span> {new Date(integration.dbRecord.createdAt).toLocaleString('id-ID')}</p>
                    </div>
                </div>
            )}
        </div>
    )
}
