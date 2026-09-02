'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { formatCurrency, formatDate } from '@/lib/utils'
import { useTranslation } from '@/lib/i18n'
import {
    Check,
    CreditCard,
    Upload,
    ExternalLink,
    Clock,
    CheckCircle,
    XCircle,
    AlertTriangle,
    Building2,
    FileText,
    Loader2,
    Send,
    Eye,
    Copy,
    Shield,
    BarChart3,
    Zap,
    Lock,
} from 'lucide-react'

interface SubscriptionPlan {
    id: string
    name: string
    slug: string
    description: string | null
    price: number
    billingPeriod: string
    maxUsers: number
    maxProducts: number
    maxStorage: string | null
    features: string[]
    isActive: boolean
    sortOrder: number
}

interface Subscription {
    id: string
    planId: string
    status: string
    startDate: string
    endDate: string | null
    nextBillingDate: string | null
    plan: SubscriptionPlan
}

interface BillingPayment {
    id: string
    amount: number
    paymentMethod: string
    bankName: string | null
    accountNumber: string | null
    accountName: string | null
    proofFileUrl: string | null
    proofFileName: string | null
    reference: string | null
    status: string
    rejectReason: string | null
    notes: string | null
    waConfirmed: boolean
    createdAt: string
}

interface TenantSubscription {
    subscriptionStatus: string
    currentPlanSlug: string | null
    trialEndsAt: string | null
}

interface EntitlementFeature {
    id: string
    featureKey: string
    enabled: boolean
    limit: number | null
}

interface EntitlementPlan {
    id: string
    name: string
    slug: string
    priceMonthly: number
    priceYearly: number | null
    maxUsers: number
    maxStorage: number | null
    features: EntitlementFeature[]
}

interface EntitlementData {
    id: string
    tenantId: string
    planId: string
    billingCycle: string
    status: string
    trialEndsAt: string | null
    currentPeriodStart: string
    currentPeriodEnd: string
    plan: EntitlementPlan
}

interface UsageStats {
    [featureKey: string]: number
}

const FEATURE_GROUPS: Record<string, { label: string; features: string[] }> = {
    finance: {
        label: 'Finance',
        features: ['finance.invoices', 'finance.payments', 'finance.purchase-orders', 'finance.journal-entries', 'finance.reports', 'finance.reconciliation'],
    },
    crm: {
        label: 'CRM',
        features: ['crm.contacts', 'crm.leads', 'crm.deals', 'crm.pipeline'],
    },
    inventory: {
        label: 'Inventory',
        features: ['inventory.products', 'inventory.stock', 'inventory.suppliers', 'inventory.categories'],
    },
    hr: {
        label: 'HR',
        features: ['hr.employees', 'hr.attendance', 'hr.leaves', 'hr.payroll'],
    },
    ai: {
        label: 'AI Features',
        features: ['ai.chat', 'ai.document-extraction', 'ai.predictions'],
    },
    integrations: {
        label: 'Integrations',
        features: ['integration.whatsapp', 'integration.email', 'integration.payment'],
    },
    platform: {
        label: 'Platform',
        features: ['platform.admin', 'platform.billing', 'platform.monitoring'],
    },
}

const FEATURE_LABELS: Record<string, string> = {
    'finance.invoices': 'Invoices',
    'finance.payments': 'Payments',
    'finance.purchase-orders': 'Purchase Orders',
    'finance.journal-entries': 'Journal Entries',
    'finance.reports': 'Finance Reports',
    'finance.reconciliation': 'Reconciliation',
    'crm.contacts': 'Contacts',
    'crm.leads': 'Leads',
    'crm.deals': 'Deals',
    'crm.pipeline': 'Pipeline',
    'inventory.products': 'Products',
    'inventory.stock': 'Stock Management',
    'inventory.suppliers': 'Suppliers',
    'inventory.categories': 'Categories',
    'hr.employees': 'Employees',
    'hr.attendance': 'Attendance',
    'hr.leaves': 'Leave Management',
    'hr.payroll': 'Payroll',
    'ai.chat': 'AI Chat',
    'ai.document-extraction': 'Document Extraction',
    'ai.predictions': 'Predictions',
    'integration.whatsapp': 'WhatsApp Integration',
    'integration.email': 'Email Integration',
    'integration.payment': 'Payment Integration',
    'platform.admin': 'Platform Admin',
    'platform.billing': 'Billing Management',
    'platform.monitoring': 'Monitoring',
}

const BANK_ACCOUNTS = [
    { bank: 'BRI', number: '2118 0100 8728 508' },
    { bank: 'JAGO', number: '106818913479' },
    { bank: 'BTN', number: '5901500292405' },
    { bank: 'BSI', number: '7243220925' },
]

const WA_CONFIRM_URL = 'https://wa.me/6281529211963?text=Saya sudah transfer untuk langganan Qalcuity. Mohon konfirmasi.'

function getStatusConfig(t: (key: string) => string): Record<string, { label: string; color: string; icon: React.ReactNode }> {
    return {
        ACTIVE: { label: t('settings.billing.statusActive'), color: 'bg-green-100 text-green-700', icon: <CheckCircle className="w-4 h-4" /> },
        TRIAL: { label: t('settings.billing.statusTrial'), color: 'bg-blue-100 text-blue-700', icon: <Clock className="w-4 h-4" /> },
        PENDING_PAYMENT: { label: t('settings.billing.statusPendingPayment'), color: 'bg-yellow-100 text-yellow-700', icon: <AlertTriangle className="w-4 h-4" /> },
        SUSPENDED: { label: t('settings.billing.statusSuspended'), color: 'bg-red-100 text-red-700', icon: <XCircle className="w-4 h-4" /> },
        CANCELLED: { label: t('settings.billing.statusCancelled'), color: 'bg-gray-100 text-gray-700', icon: <XCircle className="w-4 h-4" /> },
        PENDING: { label: t('settings.billing.statusPending'), color: 'bg-yellow-100 text-yellow-700', icon: <Clock className="w-4 h-4" /> },
        VERIFIED: { label: t('settings.billing.statusVerified'), color: 'bg-green-100 text-green-700', icon: <CheckCircle className="w-4 h-4" /> },
        REJECTED: { label: t('settings.billing.statusRejected'), color: 'bg-red-100 text-red-700', icon: <XCircle className="w-4 h-4" /> },
    }
}

export default function BillingSettingsPage() {
    const { t } = useTranslation()
    const STATUS_CONFIG = useMemo(() => getStatusConfig(t), [t])

    // State
    const [plans, setPlans] = useState<SubscriptionPlan[]>([])
    const [subscription, setSubscription] = useState<Subscription | null>(null)
    const [tenantSub, setTenantSub] = useState<TenantSubscription | null>(null)
    const [payments, setPayments] = useState<BillingPayment[]>([])
    const [entitlement, setEntitlement] = useState<EntitlementData | null>(null)
    const [usage, setUsage] = useState<UsageStats>({})
    const [loading, setLoading] = useState(true)
    const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null)
    const [showPaymentForm, setShowPaymentForm] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [uploading, setUploading] = useState(false)
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

    // Payment form
    const [bankName, setBankName] = useState('')
    const [accountNumber, setAccountNumber] = useState('')
    const [accountName, setAccountName] = useState('')
    const [reference, setReference] = useState('')
    const [notes, setNotes] = useState('')
    const [proofFile, setProofFile] = useState<File | null>(null)
    const [proofFileName, setProofFileName] = useState('')
    const [proofFileUrl, setProofFileUrl] = useState('')

    // Fetch data
    const fetchData = useCallback(async () => {
        try {
            setLoading(true)
            const [plansRes, subRes, paymentsRes, entitlementRes, usageRes] = await Promise.all([
                fetch('/api/billing/plans'),
                fetch('/api/billing/subscription'),
                fetch('/api/billing/payments'),
                fetch('/api/billing/entitlement'),
                fetch('/api/billing/usage'),
            ])

            const plansData = await plansRes.json()
            const subData = await subRes.json()
            const paymentsData = await paymentsRes.json()
            const entitlementData = await entitlementRes.json()
            const usageData = await usageRes.json()

            if (plansData.success) setPlans(plansData.data)
            if (subData.success) {
                setSubscription(subData.data.subscription)
                setTenantSub(subData.data.tenant)
            }
            if (paymentsData.success) setPayments(paymentsData.data)
            if (entitlementData.success) setEntitlement(entitlementData.data)
            if (usageData.success) setUsage(usageData.data || {})
        } catch {
            console.error('Error fetching billing data')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchData()
    }, [fetchData])

    // Handle file upload
    const handleFileUpload = async (file: File) => {
        if (file.size > 5 * 1024 * 1024) {
            setMessage({ type: 'error', text: t('settings.billing.fileTooLarge') })
            return
        }

        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
        if (!allowedTypes.includes(file.type)) {
            setMessage({ type: 'error', text: t('settings.billing.fileTypeNotSupported') })
            return
        }

        try {
            setUploading(true)
            const formData = new FormData()
            formData.append('file', file)

            const res = await fetch('/api/billing/payments/upload', {
                method: 'POST',
                body: formData,
            })

            const data = await res.json()
            if (data.success) {
                setProofFileUrl(data.data.url)
                setProofFileName(data.data.fileName)
                setProofFile(file)
                setMessage({ type: 'success', text: t('settings.billing.fileUploaded') })
            } else {
                setMessage({ type: 'error', text: data.error || t('settings.billing.uploadFailed') })
            }
        } catch {
            setMessage({ type: 'error', text: t('settings.billing.uploadFailed') })
        } finally {
            setUploading(false)
        }
    }

    // Submit payment
    const handlePaymentSubmit = async () => {
        if (!selectedPlan || !bankName || !accountNumber || !accountName) {
            setMessage({ type: 'error', text: t('settings.billing.fillRequiredFields') })
            return
        }

        if (!subscription) {
            setMessage({ type: 'error', text: t('settings.billing.subscriptionNotFound') })
            return
        }

        try {
            setSubmitting(true)
            const res = await fetch('/api/billing/payments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    subscriptionId: subscription.id,
                    amount: selectedPlan.price,
                    bankName,
                    accountNumber,
                    accountName,
                    reference,
                    notes,
                    proofFileUrl,
                    proofFileName,
                }),
            })

            const data = await res.json()
            if (data.success) {
                setMessage({ type: 'success', text: t('settings.billing.proofSubmitted') })
                setShowPaymentForm(false)
                setSelectedPlan(null)
                resetForm()
                fetchData()
            } else {
                setMessage({ type: 'error', text: data.error || t('settings.billing.submitProofFailed') })
            }
        } catch {
            setMessage({ type: 'error', text: t('settings.billing.submitProofFailed') })
        } finally {
            setSubmitting(false)
        }
    }

    const resetForm = () => {
        setBankName('')
        setAccountNumber('')
        setAccountName('')
        setReference('')
        setNotes('')
        setProofFile(null)
        setProofFileName('')
        setProofFileUrl('')
    }

    const handleSelectPlan = (plan: SubscriptionPlan) => {
        setSelectedPlan(plan)
        setShowPaymentForm(true)
        setMessage(null)
    }

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text.replace(/\s/g, ''))
    }

    const currentPlanSlug = tenantSub?.currentPlanSlug || subscription?.plan?.slug || 'growth'
    const subStatus = tenantSub?.subscriptionStatus || subscription?.status || 'ACTIVE'

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Message Toast */}
            {message && (
                <div className={`p-4 rounded-lg flex items-center gap-3 ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                    {message.type === 'success' ? <CheckCircle className="w-5 h-5 flex-shrink-0" /> : <XCircle className="w-5 h-5 flex-shrink-0" />}
                    <span className="text-sm">{message.text}</span>
                    <button onClick={() => setMessage(null)} className="ml-auto text-sm underline">{t('settings.billing.close')}</button>
                </div>
            )}

            {/* Section 1: Current Plan Card */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900">{t('settings.currentPlanTitle')}</h2>
                        <p className="text-sm text-gray-600 mt-1">{t('settings.manageSubscription')}</p>
                    </div>
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${STATUS_CONFIG[subStatus]?.color || 'bg-gray-100 text-gray-700'}`}>
                        {STATUS_CONFIG[subStatus]?.icon}
                        {STATUS_CONFIG[subStatus]?.label || subStatus}
                    </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 pt-4 border-t border-gray-200">
                    <div>
                        <div className="text-sm text-gray-600">{t('settings.billing.currentPlan')}</div>
                        <div className="text-2xl font-bold text-gray-900 mt-1">{subscription?.plan?.name || currentPlanSlug}</div>
                    </div>
                    <div>
                        <div className="text-sm text-gray-600">{t('settings.monthlyBilling')}</div>
                        <div className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(Number(subscription?.plan?.price || 0))}</div>
                    </div>
                    <div>
                        <div className="text-sm text-gray-600">{t('settings.billing.maxUsers')}</div>
                        <div className="text-2xl font-bold text-gray-900 mt-1">{subscription?.plan?.maxUsers || 0} {t('settings.billing.usersLabel')}</div>
                    </div>
                    <div>
                        <div className="text-sm text-gray-600">{t('settings.nextPayment')}</div>
                        <div className="text-2xl font-bold text-gray-900 mt-1">
                            {subscription?.nextBillingDate
                                ? formatDate(subscription.nextBillingDate)
                                : '-'}
                        </div>
                    </div>
                </div>

                <div className="flex gap-3 mt-6">
                    <a
                        href={WA_CONFIRM_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
                    >
                        <Send className="w-4 h-4" />
                        {t('settings.billing.confirmViaWhatsApp')}
                    </a>
                </div>
            </div>

            {/* Section 2: Entitlement Features & Usage */}
            {entitlement && (
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900">{t('settings.billing.featureAccess')}</h2>
                            <p className="text-sm text-gray-600 mt-1">
                                {t('settings.billing.currentPlan')}: <span className="font-medium text-gray-900">{entitlement.plan.name}</span>
                                {entitlement.status === 'trial' && entitlement.trialEndsAt && (
                                    <span className="ml-2 text-blue-600">
                                        ({t('settings.billing.trialEnds')} {formatDate(entitlement.trialEndsAt)})
                                    </span>
                                )}
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${entitlement.status === 'active' ? 'bg-green-100 text-green-700' : entitlement.status === 'trial' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>
                                {entitlement.status === 'active' ? <CheckCircle className="w-4 h-4" /> : entitlement.status === 'trial' ? <Clock className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                                {entitlement.status === 'active' ? t('settings.billing.statusActive') : entitlement.status === 'trial' ? t('settings.billing.statusTrial') : entitlement.status}
                            </span>
                        </div>
                    </div>

                    {/* Plan Limits Summary */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
                        <div>
                            <div className="text-xs text-gray-500 uppercase tracking-wide">{t('settings.billing.maxUsers')}</div>
                            <div className="text-lg font-bold text-gray-900 mt-1">
                                {entitlement.plan.maxUsers === -1 ? t('settings.billing.unlimited') : entitlement.plan.maxUsers}
                            </div>
                        </div>
                        <div>
                            <div className="text-xs text-gray-500 uppercase tracking-wide">{t('settings.billing.storage')}</div>
                            <div className="text-lg font-bold text-gray-900 mt-1">
                                {entitlement.plan.maxStorage ? `${entitlement.plan.maxStorage} MB` : '-'}
                            </div>
                        </div>
                        <div>
                            <div className="text-xs text-gray-500 uppercase tracking-wide">{t('settings.billing.billingCycle')}</div>
                            <div className="text-lg font-bold text-gray-900 mt-1 capitalize">{entitlement.billingCycle}</div>
                        </div>
                        <div>
                            <div className="text-xs text-gray-500 uppercase tracking-wide">{t('settings.billing.periodEnd')}</div>
                            <div className="text-lg font-bold text-gray-900 mt-1">{formatDate(entitlement.currentPeriodEnd)}</div>
                        </div>
                    </div>

                    {/* Feature Groups */}
                    <div className="space-y-5">
                        {Object.entries(FEATURE_GROUPS).map(([groupKey, group]) => (
                            <div key={groupKey}>
                                <div className="flex items-center gap-2 mb-3">
                                    <Shield className="w-4 h-4 text-gray-400" />
                                    <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">{group.label}</h3>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                    {group.features.map((featureKey) => {
                                        const feature = entitlement.plan.features.find((f) => f.featureKey === featureKey)
                                        const isEnabled = feature?.enabled ?? false
                                        const limit = feature?.limit ?? null
                                        const used = usage[featureKey] ?? 0

                                        return (
                                            <div
                                                key={featureKey}
                                                className={`flex items-center justify-between p-3 rounded-lg border ${isEnabled ? 'border-green-200 bg-green-50/50' : 'border-gray-200 bg-gray-50/50'}`}
                                            >
                                                <div className="flex items-center gap-2">
                                                    {isEnabled ? (
                                                        <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                                                    ) : (
                                                        <Lock className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                                    )}
                                                    <span className={`text-sm ${isEnabled ? 'text-gray-900' : 'text-gray-500'}`}>
                                                        {FEATURE_LABELS[featureKey] || featureKey}
                                                    </span>
                                                </div>
                                                <div className="text-right">
                                                    {isEnabled && limit !== null && limit > 0 ? (
                                                        <div className="flex items-center gap-1">
                                                            <BarChart3 className="w-3 h-3 text-gray-400" />
                                                            <span className={`text-xs font-medium ${used >= limit ? 'text-red-600' : 'text-gray-600'}`}>
                                                                {used}/{limit}
                                                            </span>
                                                        </div>
                                                    ) : isEnabled ? (
                                                        <span className="flex items-center gap-1 text-xs text-green-600">
                                                            <Zap className="w-3 h-3" />
                                                            {t('settings.billing.unlimited')}
                                                        </span>
                                                    ) : (
                                                        <span className="text-xs text-gray-400">-</span>
                                                    )}
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Section 3: Plan Selection */}
            <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('settings.availablePlans')}</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {plans.map((plan) => {
                        const isCurrentPlan = currentPlanSlug === plan.slug
                        const isPopular = plan.slug === 'growth'

                        return (
                            <div
                                key={plan.id}
                                className={`bg-white rounded-xl border-2 p-6 ${isPopular
                                    ? 'border-blue-500 shadow-lg'
                                    : isCurrentPlan
                                        ? 'border-green-500'
                                        : 'border-gray-200'
                                    }`}
                            >
                                {isPopular && (
                                    <div className="inline-block px-3 py-1 bg-blue-600 text-white text-xs font-medium rounded-full mb-4">
                                        {t('settings.popular')}
                                    </div>
                                )}
                                {isCurrentPlan && (
                                    <div className="inline-block px-3 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full mb-4">
                                        {t('settings.yourPlan')}
                                    </div>
                                )}

                                <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
                                <p className="text-sm text-gray-500 mt-1">{plan.description}</p>
                                <div className="mt-3">
                                    <span className="text-3xl font-bold text-gray-900">{formatCurrency(Number(plan.price))}</span>
                                    <span className="text-gray-600">{t('settings.billing.perMonth')}</span>
                                </div>

                                <div className="mt-2 text-xs text-gray-500">
                                    {t('settings.billing.maxLabel')} {plan.maxUsers} {t('settings.billing.usersLabel')} · {plan.maxProducts === -1 ? t('settings.billing.unlimited') : plan.maxProducts} {t('settings.billing.productsLabel')} · {plan.maxStorage || '-'}
                                </div>

                                <ul className="mt-6 space-y-3">
                                    {plan.features.map((feature, idx) => (
                                        <li key={idx} className="flex items-start gap-3">
                                            <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                                            <span className="text-sm text-gray-700">{feature}</span>
                                        </li>
                                    ))}
                                </ul>

                                <button
                                    className={`w-full mt-6 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${isCurrentPlan
                                        ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                                        : isPopular
                                            ? 'bg-blue-600 text-white hover:bg-blue-700'
                                            : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                                        }`}
                                    disabled={isCurrentPlan}
                                    onClick={() => !isCurrentPlan && handleSelectPlan(plan)}
                                >
                                    {isCurrentPlan ? t('settings.activePlan') : t('settings.selectPlan')}
                                </button>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* Section 4: Payment Instructions */}
            {showPaymentForm && selectedPlan && (
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('settings.billing.paymentInstructions')}</h2>

                    {/* Bank Accounts */}
                    <div className="bg-gray-50 rounded-lg p-4 mb-6">
                        <h3 className="text-sm font-medium text-gray-700 mb-3">{t('settings.billing.transferToAccount')}</h3>
                        <div className="space-y-2">
                            {BANK_ACCOUNTS.map((acc) => (
                                <div key={acc.bank} className="flex items-center justify-between bg-white rounded-lg px-4 py-2.5 border border-gray-100">
                                    <div className="flex items-center gap-3">
                                        <Building2 className="w-4 h-4 text-gray-400" />
                                        <span className="font-medium text-gray-900">{acc.bank}</span>
                                        <span className="text-sm text-gray-600">{acc.number}</span>
                                    </div>
                                    <button
                                        onClick={() => copyToClipboard(acc.number)}
                                        className="text-blue-600 hover:text-blue-700"
                                        title={t('settings.billing.copyAccountNumber')}
                                    >
                                        <Copy className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                        <div className="mt-3 text-sm text-gray-600">
                            {t('settings.billing.accountHolder')} <span className="font-medium text-gray-900">WAHYU DEDIK DWI ASTONO</span>
                        </div>
                        <div className="mt-2 text-lg font-bold text-blue-600">
                            {t('settings.billing.nominal')} {formatCurrency(Number(selectedPlan.price))}
                        </div>
                    </div>

                    {/* WhatsApp Confirmation */}
                    <div className="mb-6">
                        <a
                            href={WA_CONFIRM_URL}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
                        >
                            <ExternalLink className="w-4 h-4" />
                            {t('settings.billing.confirmViaWhatsApp')}
                        </a>
                    </div>

                    {/* Upload Proof */}
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">{t('settings.billing.uploadProof')}</label>
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
                            {uploading ? (
                                <div className="flex items-center justify-center gap-2">
                                    <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                                    <span className="text-sm text-gray-600">{t('settings.billing.uploading')}</span>
                                </div>
                            ) : proofFileName ? (
                                <div className="flex items-center justify-center gap-2">
                                    <FileText className="w-5 h-5 text-green-600" />
                                    <span className="text-sm text-gray-900">{proofFileName}</span>
                                    <button
                                        onClick={() => { setProofFile(null); setProofFileName(''); setProofFileUrl('') }}
                                        className="text-sm text-red-600 hover:text-red-700 ml-2"
                                    >
                                        {t('settings.billing.removeFile')}
                                    </button>
                                </div>
                            ) : (
                                <div>
                                    <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                                    <p className="text-sm text-gray-600 mb-2">{t('settings.billing.dragDropUpload')}</p>
                                    <p className="text-xs text-gray-400">{t('settings.billing.fileFormats')}</p>
                                    <input
                                        type="file"
                                        accept="image/jpeg,image/png,image/webp,application/pdf"
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0]
                                            if (file) handleFileUpload(file)
                                        }}
                                        style={{ position: 'relative' }}
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Payment Form */}
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">{t('settings.billing.senderBank')}</label>
                                <select
                                    value={bankName}
                                    onChange={(e) => setBankName(e.target.value)}
                                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="">{t('settings.billing.selectBank')}</option>
                                    <option value="BRI">BRI</option>
                                    <option value="JAGO">JAGO</option>
                                    <option value="BTN">BTN</option>
                                    <option value="BSI">BSI</option>
                                    <option value="BCA">BCA</option>
                                    <option value="Mandiri">Mandiri</option>
                                    <option value="BNI">BNI</option>
                                    <option value="Other">{t('settings.billing.otherBank')}</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">{t('settings.billing.senderAccountNumber')}</label>
                                <input
                                    type="text"
                                    value={accountNumber}
                                    onChange={(e) => setAccountNumber(e.target.value)}
                                    placeholder={t('settings.billing.enterAccountNumber')}
                                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">{t('settings.billing.senderName')}</label>
                            <input
                                type="text"
                                value={accountName}
                                onChange={(e) => setAccountName(e.target.value)}
                                placeholder={t('settings.billing.enterAccountName')}
                                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">{t('settings.billing.referenceNumber')}</label>
                            <input
                                type="text"
                                value={reference}
                                onChange={(e) => setReference(e.target.value)}
                                placeholder={t('settings.billing.referencePlaceholder')}
                                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">{t('settings.billing.notesLabel')}</label>
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder={t('settings.billing.notesPlaceholder')}
                                rows={2}
                                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 mt-6">
                        <button
                            onClick={handlePaymentSubmit}
                            disabled={submitting || !bankName || !accountNumber || !accountName}
                            className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {submitting ? (
                                <><Loader2 className="w-4 h-4 animate-spin" /> {t('settings.billing.submitting')}</>
                            ) : (
                                <><CreditCard className="w-4 h-4" /> {t('settings.billing.submitPayment')}</>
                            )}
                        </button>
                        <button
                            onClick={() => { setShowPaymentForm(false); setSelectedPlan(null); resetForm() }}
                            className="px-6 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                            {t('common.cancel')}
                        </button>
                    </div>
                </div>
            )}

            {/* Section 5: Payment Status (latest pending payment) */}
            {payments.some((p) => p.status === 'PENDING' || p.status === 'REJECTED') && (
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('settings.billing.lastPaymentStatus')}</h2>
                    {payments
                        .filter((p) => p.status === 'PENDING' || p.status === 'REJECTED')
                        .slice(0, 1)
                        .map((payment) => (
                            <div key={payment.id} className={`rounded-lg p-4 ${payment.status === 'PENDING' ? 'bg-yellow-50 border border-yellow-200' : 'bg-red-50 border border-red-200'}`}>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${STATUS_CONFIG[payment.status]?.color}`}>
                                            {STATUS_CONFIG[payment.status]?.icon}
                                            {STATUS_CONFIG[payment.status]?.label}
                                        </span>
                                        <span className="text-sm text-gray-600">
                                            {formatCurrency(Number(payment.amount))} · {payment.bankName || '-'} · {formatDate(payment.createdAt)}
                                        </span>
                                    </div>
                                </div>
                                {payment.status === 'REJECTED' && payment.rejectReason && (
                                    <div className="mt-3 text-sm text-red-700">
                                        <strong>{t('settings.billing.rejectionReason')}</strong> {payment.rejectReason}
                                        <button
                                            onClick={() => {
                                                setShowPaymentForm(true)
                                                setSelectedPlan(subscription?.plan ? {
                                                    ...subscription.plan,
                                                    features: Array.isArray(subscription.plan.features) ? subscription.plan.features : [],
                                                } : null)
                                            }}
                                            className="ml-3 underline hover:text-red-800"
                                        >
                                            {t('settings.billing.reupload')}
                                        </button>
                                    </div>
                                )}
                                {payment.proofFileUrl && (
                                    <div className="mt-3">
                                        <a
                                            href={payment.proofFileUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700"
                                        >
                                            <Eye className="w-4 h-4" />
                                            {t('settings.billing.viewProof')}
                                        </a>
                                    </div>
                                )}
                            </div>
                        ))}
                </div>
            )}

            {/* Section 6: Payment History */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('settings.billing.paymentHistory')}</h2>
                {payments.length === 0 ? (
                    <div className="text-center py-8">
                        <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-sm text-gray-500">{t('settings.billing.noPaymentHistory')}</p>
                    </div>
                ) : (
                    <>
                        {/* Mobile Cards */}
                        <div className="md:hidden space-y-3">
                            {payments.map((payment) => (
                                <div key={payment.id} className="border border-gray-200 rounded-lg p-4">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-gray-600">{formatDate(payment.createdAt)}</span>
                                        <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${STATUS_CONFIG[payment.status]?.color || 'bg-gray-100 text-gray-700'}`}>
                                            {STATUS_CONFIG[payment.status]?.icon}
                                            {STATUS_CONFIG[payment.status]?.label || payment.status}
                                        </span>
                                    </div>
                                    <div className="mt-2 flex items-center justify-between">
                                        <span className="text-sm font-medium text-gray-900">{formatCurrency(Number(payment.amount))}</span>
                                        <span className="text-sm text-gray-600">{payment.bankName || '-'}</span>
                                    </div>
                                    {payment.proofFileUrl && (
                                        <div className="mt-2">
                                            <a
                                                href={payment.proofFileUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-sm text-blue-600 hover:text-blue-700"
                                            >
                                                {t('settings.billing.viewProofShort')}
                                            </a>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Desktop Table */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-gray-200">
                                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">{t('settings.billing.date')}</th>
                                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">{t('settings.billing.amount')}</th>
                                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">{t('settings.billing.bank')}</th>
                                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">{t('settings.billing.statusLabel')}</th>
                                        <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">{t('settings.billing.action')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {payments.map((payment) => (
                                        <tr key={payment.id}>
                                            <td className="py-3 px-4 text-sm text-gray-900">{formatDate(payment.createdAt)}</td>
                                            <td className="py-3 px-4 text-sm text-gray-900 font-medium">{formatCurrency(Number(payment.amount))}</td>
                                            <td className="py-3 px-4 text-sm text-gray-600">{payment.bankName || '-'}</td>
                                            <td className="py-3 px-4">
                                                <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${STATUS_CONFIG[payment.status]?.color || 'bg-gray-100 text-gray-700'}`}>
                                                    {STATUS_CONFIG[payment.status]?.icon}
                                                    {STATUS_CONFIG[payment.status]?.label || payment.status}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 text-right">
                                                {payment.proofFileUrl && (
                                                    <a
                                                        href={payment.proofFileUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-sm text-blue-600 hover:text-blue-700"
                                                    >
                                                        {t('settings.billing.viewProofShort')}
                                                    </a>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}
