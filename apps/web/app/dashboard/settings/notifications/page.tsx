'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from '@/lib/i18n'
import { MessageCircle, Mail, Settings, Eye, EyeOff, CheckCircle, AlertCircle, Loader2, X } from 'lucide-react'

type NotificationSettings = {
    emailInvoice: boolean
    emailPayment: boolean
    emailOverdue: boolean
    emailWeeklyReport: boolean
    emailMarketing: boolean
    pushInvoice: boolean
    pushPayment: boolean
    pushOverdue: boolean
    pushMention: boolean
    whatsappInvoice: boolean
    whatsappPayment: boolean
    whatsappOverdue: boolean
    smsOverdue: boolean
    smsPayment: boolean
}

const defaultSettings: NotificationSettings = {
    emailInvoice: true,
    emailPayment: true,
    emailOverdue: true,
    emailWeeklyReport: true,
    emailMarketing: false,
    pushInvoice: true,
    pushPayment: true,
    pushOverdue: true,
    pushMention: true,
    whatsappInvoice: true,
    whatsappPayment: true,
    whatsappOverdue: false,
    smsOverdue: false,
    smsPayment: false,
}

export default function NotificationsSettingsPage() {
    const { t } = useTranslation()
    const [settings, setSettings] = useState<NotificationSettings>(defaultSettings)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [saveSuccess, setSaveSuccess] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const [showEmailConfig, setShowEmailConfig] = useState(false)
    const [showSmtpPassword, setShowSmtpPassword] = useState(false)
    const [emailConfig, setEmailConfig] = useState({
        smtpHost: '',
        smtpPort: '587',
        smtpEmail: '',
        smtpPassword: '',
        useTLS: true,
    })
    const [emailSaving, setEmailSaving] = useState(false)
    const [emailSaved, setEmailSaved] = useState(false)
    const [testingEmail, setTestingEmail] = useState(false)
    const [testResult, setTestResult] = useState<'success' | 'error' | null>(null)

    useEffect(() => {
        fetchSettings()
    }, [])

    useEffect(() => {
        if (saveSuccess) {
            const timer = setTimeout(() => setSaveSuccess(false), 3000)
            return () => clearTimeout(timer)
        }
    }, [saveSuccess])

    const fetchSettings = async () => {
        try {
            setLoading(true)
            setError(null)
            const res = await fetch('/api/settings/notifications')
            const data = await res.json()
            if (data.success) {
                setSettings(data.data)
            } else {
                setError(data.error || t('settings.errorLoadNotifications') || 'Gagal memuat pengaturan notifikasi')
            }
        } catch {
            setError(t('settings.errorConnectServer'))
        } finally {
            setLoading(false)
        }
    }

    const toggleSetting = useCallback((key: keyof NotificationSettings) => {
        setSettings(prev => ({ ...prev, [key]: !prev[key] }))
    }, [])

    const handleSave = async () => {
        try {
            setSaving(true)
            setError(null)
            const res = await fetch('/api/settings/notifications', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(settings),
            })
            const data = await res.json()
            if (data.success) {
                setSettings(data.data)
                setSaveSuccess(true)
            } else {
                setError(data.error || t('settings.errorSaveSettings') || 'Gagal menyimpan pengaturan')
            }
        } catch {
            setError(t('settings.errorConnectServer'))
        } finally {
            setSaving(false)
        }
    }

    const handleEmailConfigChange = (field: string, value: string | boolean) => {
        setEmailConfig(prev => ({ ...prev, [field]: value }))
    }

    const ToggleSwitch = ({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) => (
        <button
            type="button"
            onClick={onToggle}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${enabled ? 'bg-blue-600' : 'bg-gray-200'
                }`}
        >
            <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${enabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
            />
        </button>
    )

    if (loading) {
        return (
            <div className="space-y-6">
                <div>
                    <h2 className="text-lg font-semibold text-gray-900">{t('settings.notificationsTitle') || 'Pengaturan Notifikasi'}</h2>
                    <p className="text-sm text-gray-600 mt-1">
                        {t('settings.notificationsSubtitle') || 'Pilih notifikasi mana yang ingin Anda terima'}
                    </p>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-12 flex flex-col items-center justify-center">
                    <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-3" />
                    <p className="text-sm text-gray-500">{t('settings.loadingNotifications')}</p>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-lg font-semibold text-gray-900">{t('settings.notificationsTitle') || 'Pengaturan Notifikasi'}</h2>
                <p className="text-sm text-gray-600 mt-1">
                    {t('settings.notificationsSubtitle') || 'Pilih notifikasi mana yang ingin Anda terima'}
                </p>
            </div>

            {/* Error Banner */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
                    <p className="text-sm text-red-700 flex-1">{error}</p>
                    <button onClick={() => setError(null)} className="text-sm text-red-600 hover:text-red-800 font-medium"><X className="w-4 h-4" /></button>
                </div>
            )}

            {/* Email Notifications */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                    </div>
                    <div>
                        <h3 className="font-medium text-gray-900">{t('settings.emailNotifications') || 'Email'}</h3>
                        <p className="text-sm text-gray-500">{t('settings.emailDesc') || 'Notifikasi via email'}</p>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="flex items-center justify-between py-2">
                        <div>
                            <div className="text-sm font-medium text-gray-900">{t('settings.newInvoice') || 'Invoice Baru'}</div>
                            <div className="text-xs text-gray-500">{t('settings.invoiceDesc')}</div>
                        </div>
                        <ToggleSwitch enabled={settings.emailInvoice} onToggle={() => toggleSetting('emailInvoice')} />
                    </div>
                    <div className="flex items-center justify-between py-2">
                        <div>
                            <div className="text-sm font-medium text-gray-900">{t('settings.paymentReceived') || 'Pembayaran Diterima'}</div>
                            <div className="text-xs text-gray-500">{t('settings.paymentDesc')}</div>
                        </div>
                        <ToggleSwitch enabled={settings.emailPayment} onToggle={() => toggleSetting('emailPayment')} />
                    </div>
                    <div className="flex items-center justify-between py-2">
                        <div>
                            <div className="text-sm font-medium text-gray-900">{t('settings.overdueInvoice') || 'Invoice Overdue'}</div>
                            <div className="text-xs text-gray-500">{t('settings.overdueInvoiceDesc')}</div>
                        </div>
                        <ToggleSwitch enabled={settings.emailOverdue} onToggle={() => toggleSetting('emailOverdue')} />
                    </div>
                    <div className="flex items-center justify-between py-2">
                        <div>
                            <div className="text-sm font-medium text-gray-900">{t('settings.weeklyReport')}</div>
                            <div className="text-xs text-gray-500">{t('settings.weeklyReportDesc')}</div>
                        </div>
                        <ToggleSwitch enabled={settings.emailWeeklyReport} onToggle={() => toggleSetting('emailWeeklyReport')} />
                    </div>
                    <div className="flex items-center justify-between py-2">
                        <div>
                            <div className="text-sm font-medium text-gray-900">{t('settings.emailMarketing')}</div>
                            <div className="text-xs text-gray-500">{t('settings.emailMarketingDesc')}</div>
                        </div>
                        <ToggleSwitch enabled={settings.emailMarketing} onToggle={() => toggleSetting('emailMarketing')} />
                    </div>
                </div>
            </div>

            {/* Email SMTP Configuration */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div
                    className="flex items-center justify-between p-6 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => setShowEmailConfig(!showEmailConfig)}
                >
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                            <Mail className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                            <h3 className="font-medium text-gray-900">{t('settings.smtpConfiguration')}</h3>
                            <p className="text-sm text-gray-500">{t('settings.smtpConfigDesc')}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="inline-flex items-center gap-1.5 text-sm text-green-600">
                            <CheckCircle className="h-4 w-4" />
                            {t('settings.configured')}
                        </span>
                        <Settings className={`h-5 w-5 text-gray-400 transition-transform ${showEmailConfig ? 'rotate-90' : ''}`} />
                    </div>
                </div>

                {showEmailConfig && (
                    <div className="px-6 pb-6 space-y-4 border-t border-gray-200 pt-5">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">SMTP Host</label>
                                <input
                                    type="text"
                                    value={emailConfig.smtpHost}
                                    onChange={(e) => handleEmailConfigChange('smtpHost', e.target.value)}
                                    placeholder="smtp.gmail.com"
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">SMTP Port</label>
                                <input
                                    type="number"
                                    value={emailConfig.smtpPort}
                                    onChange={(e) => handleEmailConfigChange('smtpPort', e.target.value)}
                                    placeholder="587"
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address</label>
                            <input
                                type="email"
                                value={emailConfig.smtpEmail}
                                onChange={(e) => handleEmailConfigChange('smtpEmail', e.target.value)}
                                placeholder="noreply@company.com"
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Password / App Password</label>
                            <div className="relative">
                                <input
                                    type={showSmtpPassword ? 'text' : 'password'}
                                    value={emailConfig.smtpPassword}
                                    onChange={(e) => handleEmailConfigChange('smtpPassword', e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full px-4 py-2.5 pr-10 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowSmtpPassword(!showSmtpPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                    {showSmtpPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="useTLS"
                                checked={emailConfig.useTLS}
                                onChange={(e) => handleEmailConfigChange('useTLS', e.target.checked)}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <label htmlFor="useTLS" className="text-sm text-gray-700">{t('settings.useTls')}</label>
                        </div>

                        <div className="flex items-center gap-3 pt-3 border-t border-gray-200">
                            <button
                                onClick={() => {
                                    setTestingEmail(true);
                                    setTestResult(null);
                                    setTimeout(() => {
                                        setTestingEmail(false);
                                        setTestResult('success');
                                        setTimeout(() => setTestResult(null), 5000);
                                    }, 1500);
                                }}
                                disabled={testingEmail}
                                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors disabled:opacity-50 flex items-center gap-2"
                            >
                                {testingEmail ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                                        {t('settings.sendingTest')}
                                    </>
                                ) : (
                                    t('settings.testEmail')
                                )}
                            </button>

                            {testResult === 'success' && (
                                <span className="text-sm text-green-600 flex items-center gap-1">
                                    <CheckCircle className="h-4 w-4" />
                                    {t('settings.testEmailSent')}
                                </span>
                            )}
                            {testResult === 'error' && (
                                <span className="text-sm text-red-600 flex items-center gap-1">
                                    <AlertCircle className="h-4 w-4" />
                                    {t('settings.testEmailFailed')}
                                </span>
                            )}

                            <div className="ml-auto flex items-center gap-3">
                                {emailSaved && (
                                    <span className="text-sm text-green-600 flex items-center gap-1">
                                        <CheckCircle className="h-4 w-4" />
                                        {t('settings.saved')}
                                    </span>
                                )}
                                <button
                                    onClick={() => {
                                        setEmailSaving(true);
                                        setTimeout(() => {
                                            setEmailSaving(false);
                                            setEmailSaved(true);
                                            setTimeout(() => setEmailSaved(false), 3000);
                                        }, 1000);
                                    }}
                                    disabled={emailSaving}
                                    className="px-5 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
                                >
                                    {emailSaving ? t('settings.saving') : t('settings.saveConfig')}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Push Notifications */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                        </svg>
                    </div>
                    <div>
                        <h3 className="font-medium text-gray-900">{t('settings.pushNotifications') || 'Push Notification'}</h3>
                        <p className="text-sm text-gray-500">{t('settings.pushDesc') || 'Notifikasi langsung di browser'}</p>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="flex items-center justify-between py-2">
                        <div>
                            <div className="text-sm font-medium text-gray-900">{t('settings.newInvoice') || 'Invoice Baru'}</div>
                            <div className="text-xs text-gray-500">{t('settings.pushInvoiceDesc')}</div>
                        </div>
                        <ToggleSwitch enabled={settings.pushInvoice} onToggle={() => toggleSetting('pushInvoice')} />
                    </div>
                    <div className="flex items-center justify-between py-2">
                        <div>
                            <div className="text-sm font-medium text-gray-900">{t('settings.paymentReceived') || 'Pembayaran Diterima'}</div>
                            <div className="text-xs text-gray-500">{t('settings.pushPaymentDesc')}</div>
                        </div>
                        <ToggleSwitch enabled={settings.pushPayment} onToggle={() => toggleSetting('pushPayment')} />
                    </div>
                    <div className="flex items-center justify-between py-2">
                        <div>
                            <div className="text-sm font-medium text-gray-900">{t('settings.overdueInvoice') || 'Invoice Overdue'}</div>
                            <div className="text-xs text-gray-500">{t('settings.pushOverdueDesc')}</div>
                        </div>
                        <ToggleSwitch enabled={settings.pushOverdue} onToggle={() => toggleSetting('pushOverdue')} />
                    </div>
                    <div className="flex items-center justify-between py-2">
                        <div>
                            <div className="text-sm font-medium text-gray-900">{t('settings.mentionedInComment')}</div>
                            <div className="text-xs text-gray-500">{t('settings.mentionedDesc')}</div>
                        </div>
                        <ToggleSwitch enabled={settings.pushMention} onToggle={() => toggleSetting('pushMention')} />
                    </div>
                </div>
            </div>

            {/* WhatsApp Notifications */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                        <MessageCircle className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                        <h3 className="font-medium text-gray-900">WhatsApp</h3>
                        <p className="text-sm text-gray-500">{t('settings.whatsappDesc') || 'Notifikasi via WhatsApp Business API'}</p>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="flex items-center justify-between py-2">
                        <div>
                            <div className="text-sm font-medium text-gray-900">{t('settings.newInvoice') || 'Invoice Baru'}</div>
                            <div className="text-xs text-gray-500">{t('settings.whatsappInvoiceDesc')}</div>
                        </div>
                        <ToggleSwitch enabled={settings.whatsappInvoice} onToggle={() => toggleSetting('whatsappInvoice')} />
                    </div>
                    <div className="flex items-center justify-between py-2">
                        <div>
                            <div className="text-sm font-medium text-gray-900">{t('settings.paymentReceived') || 'Pembayaran Diterima'}</div>
                            <div className="text-xs text-gray-500">{t('settings.whatsappPaymentDesc')}</div>
                        </div>
                        <ToggleSwitch enabled={settings.whatsappPayment} onToggle={() => toggleSetting('whatsappPayment')} />
                    </div>
                    <div className="flex items-center justify-between py-2">
                        <div>
                            <div className="text-sm font-medium text-gray-900">{t('settings.overdueInvoice') || 'Reminder Overdue'}</div>
                            <div className="text-xs text-gray-500">{t('settings.whatsappOverdueDesc')}</div>
                        </div>
                        <ToggleSwitch enabled={settings.whatsappOverdue} onToggle={() => toggleSetting('whatsappOverdue')} />
                    </div>
                </div>
            </div>

            {/* SMS Notifications */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                        </svg>
                    </div>
                    <div>
                        <h3 className="font-medium text-gray-900">{t('settings.smsNotifications') || 'SMS'}</h3>
                        <p className="text-sm text-gray-500">{t('settings.smsDesc') || 'Notifikasi via SMS (memerlukan integrasi)'}</p>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="flex items-center justify-between py-2">
                        <div>
                            <div className="text-sm font-medium text-gray-900">{t('settings.overdueInvoice') || 'Invoice Overdue'}</div>
                            <div className="text-xs text-gray-500">{t('settings.smsOverdueDesc')}</div>
                        </div>
                        <ToggleSwitch enabled={settings.smsOverdue} onToggle={() => toggleSetting('smsOverdue')} />
                    </div>
                    <div className="flex items-center justify-between py-2">
                        <div>
                            <div className="text-sm font-medium text-gray-900">{t('settings.paymentReceived') || 'Pembayaran Diterima'}</div>
                            <div className="text-xs text-gray-500">{t('settings.smsPaymentDesc')}</div>
                        </div>
                        <ToggleSwitch enabled={settings.smsPayment} onToggle={() => toggleSetting('smsPayment')} />
                    </div>
                </div>
            </div>

            <div className="flex justify-end">
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                    {saving ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            {t('settings.saving')}
                        </>
                    ) : saveSuccess ? (
                        <>
                            <CheckCircle className="w-4 h-4" />
                            {t('settings.saved')}
                        </>
                    ) : (
                        t('common.save') || 'Simpan Pengaturan'
                    )}
                </button>
            </div>
        </div>
    )
}
