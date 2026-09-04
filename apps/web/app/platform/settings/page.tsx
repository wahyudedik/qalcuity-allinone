"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "@/lib/i18n";
import {
    Settings,
    Save,
    RefreshCw,
    Globe,
    Shield,
    Database,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface PlatformSettings {
    platformName: string;
    supportEmail: string;
    defaultTrialDays: number;
    maxTenantsPerPlan: Record<string, number>;
    maintenanceMode: boolean;
    allowRegistration: boolean;
    emailNotifications: boolean;
    securityAlerts: boolean;
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function PlatformSettingsPage() {
    const { t } = useTranslation();
    const [settings, setSettings] = useState<PlatformSettings | null>(null);
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(true);
    const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

    const fetchSettings = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/platform/settings");
            const data = await res.json();
            if (res.ok && data.success) {
                setSettings(data.data);
            } else {
                setToast({ message: data.error || t('platform.settingsPage.errorFetch'), type: "error" });
            }
        } catch {
            setToast({ message: t('platform.settingsPage.errorFetch'), type: "error" });
        } finally {
            setLoading(false);
        }
    }, [t]);

    useEffect(() => {
        fetchSettings();
    }, [fetchSettings]);

    const handleSave = async () => {
        if (!settings) return;
        setSaving(true);
        setToast(null);
        try {
            const res = await fetch("/api/platform/settings", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(settings),
            });
            const data = await res.json();
            if (res.ok && data.success) {
                setToast({ message: t('platform.settingsPage.successSaved'), type: "success" });
            } else {
                setToast({ message: data.error || t('platform.settingsPage.errorSave'), type: "error" });
            }
        } catch {
            setToast({ message: t('platform.settingsPage.errorSave'), type: "error" });
        } finally {
            setSaving(false);
        }
    };

    if (loading || !settings) {
        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('platform.settingsPage.title')}</h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{t('platform.settingsPage.subtitle')}</p>
                    </div>
                </div>
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900 p-6">
                            <div className="animate-pulse space-y-4">
                                <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
                                <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded" />
                                <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                        {t('platform.settingsPage.title')}
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        {t('platform.settingsPage.subtitle')}
                    </p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50"
                >
                    {saving ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                        <Save className="h-4 w-4" />
                    )}
                    {t('platform.settingsPage.save')}
                </button>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {/* General Settings */}
                <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
                    <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
                        <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
                            <Globe className="h-5 w-5 text-purple-500" />
                            {t('platform.settingsPage.general')}
                        </h2>
                    </div>
                    <div className="p-6 space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                {t('platform.settingsPage.platformName')}
                            </label>
                            <input
                                type="text"
                                value={settings.platformName}
                                onChange={(e) =>
                                    setSettings({ ...settings, platformName: e.target.value })
                                }
                                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                {t('platform.settingsPage.supportEmail')}
                            </label>
                            <input
                                type="email"
                                value={settings.supportEmail}
                                onChange={(e) =>
                                    setSettings({ ...settings, supportEmail: e.target.value })
                                }
                                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                {t('platform.settingsPage.defaultTrialDays')}
                            </label>
                            <input
                                type="number"
                                value={settings.defaultTrialDays}
                                onChange={(e) =>
                                    setSettings({
                                        ...settings,
                                        defaultTrialDays: parseInt(e.target.value) || 14,
                                    })
                                }
                                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                            />
                        </div>
                    </div>
                </div>

                {/* Security & Access */}
                <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
                    <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
                        <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
                            <Shield className="h-5 w-5 text-purple-500" />
                            {t('platform.settingsPage.securityAccess')}
                        </h2>
                    </div>
                    <div className="p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    {t('platform.settingsPage.maintenanceMode')}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {t('platform.settingsPage.maintenanceDesc')}
                                </p>
                            </div>
                            <button
                                onClick={() =>
                                    setSettings({
                                        ...settings,
                                        maintenanceMode: !settings.maintenanceMode,
                                    })
                                }
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${settings.maintenanceMode ? "bg-red-500" : "bg-gray-300 dark:bg-gray-600"
                                    }`}
                            >
                                <span
                                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${settings.maintenanceMode ? "translate-x-6" : "translate-x-1"
                                        }`}
                                />
                            </button>
                        </div>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    {t('platform.settingsPage.allowRegistration')}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {t('platform.settingsPage.allowRegistrationDesc')}
                                </p>
                            </div>
                            <button
                                onClick={() =>
                                    setSettings({
                                        ...settings,
                                        allowRegistration: !settings.allowRegistration,
                                    })
                                }
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${settings.allowRegistration ? "bg-green-500" : "bg-gray-300 dark:bg-gray-600"
                                    }`}
                            >
                                <span
                                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${settings.allowRegistration ? "translate-x-6" : "translate-x-1"
                                        }`}
                                />
                            </button>
                        </div>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    {t('platform.settingsPage.emailNotifications')}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {t('platform.settingsPage.emailNotificationsDesc')}
                                </p>
                            </div>
                            <button
                                onClick={() =>
                                    setSettings({
                                        ...settings,
                                        emailNotifications: !settings.emailNotifications,
                                    })
                                }
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${settings.emailNotifications ? "bg-green-500" : "bg-gray-300 dark:bg-gray-600"
                                    }`}
                            >
                                <span
                                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${settings.emailNotifications ? "translate-x-6" : "translate-x-1"
                                        }`}
                                />
                            </button>
                        </div>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    {t('platform.settingsPage.securityAlerts')}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {t('platform.settingsPage.securityAlertsDesc')}
                                </p>
                            </div>
                            <button
                                onClick={() =>
                                    setSettings({
                                        ...settings,
                                        securityAlerts: !settings.securityAlerts,
                                    })
                                }
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${settings.securityAlerts ? "bg-green-500" : "bg-gray-300 dark:bg-gray-600"
                                    }`}
                            >
                                <span
                                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${settings.securityAlerts ? "translate-x-6" : "translate-x-1"
                                        }`}
                                />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Plan Limits */}
                <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
                    <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
                        <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
                            <Database className="h-5 w-5 text-purple-500" />
                            {t('platform.settingsPage.planLimits')}
                        </h2>
                    </div>
                    <div className="p-6 space-y-4">
                        {Object.entries(settings.maxTenantsPerPlan).map(([plan, limit]) => (
                            <div key={plan}>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    {plan}
                                </label>
                                <input
                                    type="number"
                                    value={limit}
                                    onChange={(e) =>
                                        setSettings({
                                            ...settings,
                                            maxTenantsPerPlan: {
                                                ...settings.maxTenantsPerPlan,
                                                [plan]: parseInt(e.target.value) || 0,
                                            },
                                        })
                                    }
                                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                                />
                            </div>
                        ))}
                    </div>
                </div>

                {/* About */}
                <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
                    <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
                        <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
                            <Settings className="h-5 w-5 text-purple-500" />
                            {t('platform.settingsPage.about')}
                        </h2>
                    </div>
                    <div className="p-6 space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-500 dark:text-gray-400">{t('platform.settingsPage.version')}</span>
                            <span className="text-sm font-medium text-gray-900 dark:text-white">1.0.0</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-500 dark:text-gray-400">{t('platform.settingsPage.framework')}</span>
                            <span className="text-sm font-medium text-gray-900 dark:text-white">Next.js 14</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-500 dark:text-gray-400">{t('platform.settingsPage.database')}</span>
                            <span className="text-sm font-medium text-gray-900 dark:text-white">PostgreSQL 18</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-500 dark:text-gray-400">{t('platform.settingsPage.orm')}</span>
                            <span className="text-sm font-medium text-gray-900 dark:text-white">Prisma 5.15</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Toast */}
            {toast && (
                <div className="fixed bottom-4 right-4 z-50">
                    <div className={`flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium text-white shadow-lg ${toast.type === "success" ? "bg-green-600" : "bg-red-600"
                        }`}>
                        {toast.message}
                        <button onClick={() => setToast(null)} className="ml-2 hover:opacity-75">×</button>
                    </div>
                </div>
            )}
        </div>
    );
}
