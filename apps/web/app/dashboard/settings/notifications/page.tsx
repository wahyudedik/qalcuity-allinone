'use client'

import { useState } from 'react'
import { useTranslation } from '@/lib/i18n'
import { MessageCircle } from 'lucide-react'

export default function NotificationsSettingsPage() {
    const { t } = useTranslation()
    const [settings, setSettings] = useState({
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
    })

    const toggleSetting = (key: keyof typeof settings) => {
        setSettings(prev => ({ ...prev, [key]: !prev[key] }))
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

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-lg font-semibold text-gray-900">{t('settings.notificationsTitle') || 'Pengaturan Notifikasi'}</h2>
                <p className="text-sm text-gray-600 mt-1">
                    {t('settings.notificationsSubtitle') || 'Pilih notifikasi mana yang ingin Anda terima'}
                </p>
            </div>

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
                            <div className="text-xs text-gray-500">Dapatkan notifikasi saat invoice baru dibuat</div>
                        </div>
                        <ToggleSwitch enabled={settings.emailInvoice} onToggle={() => toggleSetting('emailInvoice')} />
                    </div>
                    <div className="flex items-center justify-between py-2">
                        <div>
                            <div className="text-sm font-medium text-gray-900">{t('settings.paymentReceived') || 'Pembayaran Diterima'}</div>
                            <div className="text-xs text-gray-500">Notifikasi saat pembayaran masuk</div>
                        </div>
                        <ToggleSwitch enabled={settings.emailPayment} onToggle={() => toggleSetting('emailPayment')} />
                    </div>
                    <div className="flex items-center justify-between py-2">
                        <div>
                            <div className="text-sm font-medium text-gray-900">{t('settings.overdueInvoice') || 'Invoice Overdue'}</div>
                            <div className="text-xs text-gray-500">Pengingat invoice yang sudah jatuh tempo</div>
                        </div>
                        <ToggleSwitch enabled={settings.emailOverdue} onToggle={() => toggleSetting('emailOverdue')} />
                    </div>
                    <div className="flex items-center justify-between py-2">
                        <div>
                            <div className="text-sm font-medium text-gray-900">Laporan Mingguan</div>
                            <div className="text-xs text-gray-500">Ringkasan aktivitas bisnis mingguan</div>
                        </div>
                        <ToggleSwitch enabled={settings.emailWeeklyReport} onToggle={() => toggleSetting('emailWeeklyReport')} />
                    </div>
                    <div className="flex items-center justify-between py-2">
                        <div>
                            <div className="text-sm font-medium text-gray-900">Email Marketing</div>
                            <div className="text-xs text-gray-500">Tips, update fitur, dan penawaran khusus</div>
                        </div>
                        <ToggleSwitch enabled={settings.emailMarketing} onToggle={() => toggleSetting('emailMarketing')} />
                    </div>
                </div>
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
                            <div className="text-xs text-gray-500">Push notification untuk invoice baru</div>
                        </div>
                        <ToggleSwitch enabled={settings.pushInvoice} onToggle={() => toggleSetting('pushInvoice')} />
                    </div>
                    <div className="flex items-center justify-between py-2">
                        <div>
                            <div className="text-sm font-medium text-gray-900">{t('settings.paymentReceived') || 'Pembayaran Diterima'}</div>
                            <div className="text-xs text-gray-500">Push notification saat pembayaran masuk</div>
                        </div>
                        <ToggleSwitch enabled={settings.pushPayment} onToggle={() => toggleSetting('pushPayment')} />
                    </div>
                    <div className="flex items-center justify-between py-2">
                        <div>
                            <div className="text-sm font-medium text-gray-900">{t('settings.overdueInvoice') || 'Invoice Overdue'}</div>
                            <div className="text-xs text-gray-500">Push notification untuk invoice overdue</div>
                        </div>
                        <ToggleSwitch enabled={settings.pushOverdue} onToggle={() => toggleSetting('pushOverdue')} />
                    </div>
                    <div className="flex items-center justify-between py-2">
                        <div>
                            <div className="text-sm font-medium text-gray-900">Disebut di Komentar</div>
                            <div className="text-xs text-gray-500">Saat seseorang menyebut Anda di komentar</div>
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
                            <div className="text-xs text-gray-500">Kirim invoice ke customer via WhatsApp</div>
                        </div>
                        <ToggleSwitch enabled={settings.whatsappInvoice} onToggle={() => toggleSetting('whatsappInvoice')} />
                    </div>
                    <div className="flex items-center justify-between py-2">
                        <div>
                            <div className="text-sm font-medium text-gray-900">{t('settings.paymentReceived') || 'Pembayaran Diterima'}</div>
                            <div className="text-xs text-gray-500">Konfirmasi pembayaran via WhatsApp</div>
                        </div>
                        <ToggleSwitch enabled={settings.whatsappPayment} onToggle={() => toggleSetting('whatsappPayment')} />
                    </div>
                    <div className="flex items-center justify-between py-2">
                        <div>
                            <div className="text-sm font-medium text-gray-900">{t('settings.overdueInvoice') || 'Reminder Overdue'}</div>
                            <div className="text-xs text-gray-500">Kirim reminder pembayaran via WhatsApp</div>
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
                            <div className="text-xs text-gray-500">SMS reminder untuk invoice overdue</div>
                        </div>
                        <ToggleSwitch enabled={settings.smsOverdue} onToggle={() => toggleSetting('smsOverdue')} />
                    </div>
                    <div className="flex items-center justify-between py-2">
                        <div>
                            <div className="text-sm font-medium text-gray-900">{t('settings.paymentReceived') || 'Pembayaran Diterima'}</div>
                            <div className="text-xs text-gray-500">Konfirmasi pembayaran via SMS</div>
                        </div>
                        <ToggleSwitch enabled={settings.smsPayment} onToggle={() => toggleSetting('smsPayment')} />
                    </div>
                </div>
            </div>

            <div className="flex justify-end">
                <button className="px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
                    {t('common.save') || 'Simpan Pengaturan'}
                </button>
            </div>
        </div>
    )
}
