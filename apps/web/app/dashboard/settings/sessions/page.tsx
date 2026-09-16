'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from '@/lib/i18n'
import { logger } from '@/lib/logger'
import {
    Monitor, Smartphone, Tablet, Shield, Trash2, LogOut,
    Loader2, Globe, RefreshCw, AlertTriangle,
} from 'lucide-react'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

// ─── Types ───────────────────────────────────────────────────────────────────

type SessionEntry = {
    id: string
    device: string
    ipAddress: string
    userAgent: string
    isCurrent: boolean
    lastActiveAt: string
    expiresAt: string
    createdAt: string
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function SessionsPage() {
    const { t } = useTranslation()

    const [sessions, setSessions] = useState<SessionEntry[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

    // Revoke state
    const [showRevokeAllConfirm, setShowRevokeAllConfirm] = useState(false)
    const [revokingId, setRevokingId] = useState<string | null>(null)

    // ─── Toast auto-dismiss ───────────────────────────────────────────────────

    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 3000)
            return () => clearTimeout(timer)
        }
    }, [toast])

    // ─── Data Fetching ────────────────────────────────────────────────────────

    const fetchSessions = useCallback(async () => {
        try {
            setLoading(true)
            setError(null)
            const res = await fetch('/api/settings/sessions')
            const data = await res.json()
            if (data.success) {
                setSessions(data.data)
            } else {
                setError(data.error || t('settings.sessions.errorLoad'))
            }
        } catch {
            setError(t('settings.errorConnectServer'))
        } finally {
            setLoading(false)
        }
    }, [t])

    useEffect(() => {
        fetchSessions()
    }, [fetchSessions])

    // ─── Handlers ─────────────────────────────────────────────────────────────

    const handleRevokeSession = async (sessionId: string) => {
        try {
            setRevokingId(sessionId)
            const res = await fetch(`/api/settings/sessions/${sessionId}`, {
                method: 'DELETE',
            })
            const data = await res.json()
            if (data.success) {
                setToast({ message: t('settings.sessions.revokeSuccess'), type: 'success' })
                fetchSessions()
            } else {
                setToast({ message: data.error || t('settings.sessions.revokeError'), type: 'error' })
            }
        } catch {
            setToast({ message: t('settings.sessions.revokeError'), type: 'error' })
        } finally {
            setRevokingId(null)
        }
    }

    const handleRevokeAllSessions = async () => {
        try {
            const res = await fetch('/api/settings/sessions/revoke-all', {
                method: 'POST',
            })
            const data = await res.json()
            if (data.success) {
                setToast({ message: data.message || t('settings.sessions.revokeAllSuccess'), type: 'success' })
                fetchSessions()
            } else {
                setToast({ message: data.error || t('settings.sessions.revokeError'), type: 'error' })
            }
        } catch {
            setToast({ message: t('settings.sessions.revokeError'), type: 'error' })
        }
        setShowRevokeAllConfirm(false)
    }

    // ─── Utility Functions ────────────────────────────────────────────────────

    const getDeviceIcon = (userAgent: string) => {
        const ua = userAgent.toLowerCase()
        if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
            return <Smartphone className="w-5 h-5" />
        }
        if (ua.includes('ipad') || ua.includes('tablet')) {
            return <Tablet className="w-5 h-5" />
        }
        if (ua.includes('chrome') || ua.includes('firefox') || ua.includes('safari') || ua.includes('edge')) {
            return <Globe className="w-5 h-5" />
        }
        return <Monitor className="w-5 h-5" />
    }

    const formatRelativeTime = (dateStr: string) => {
        const date = new Date(dateStr)
        const now = new Date()
        const diffMs = now.getTime() - date.getTime()
        const diffMin = Math.floor(diffMs / 60000)
        const diffHour = Math.floor(diffMs / 3600000)
        const diffDay = Math.floor(diffMs / 86400000)

        if (diffMin < 1) return t('settings.sessions.justNow')
        if (diffMin < 60) return `${diffMin} ${t('settings.sessions.minutesAgo')}`
        if (diffHour < 24) return `${diffHour} ${t('settings.sessions.hoursAgo')}`
        if (diffDay < 7) return `${diffDay} ${t('settings.sessions.daysAgo')}`
        return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
    }

    // ─── Loading State ────────────────────────────────────────────────────────

    if (loading) {
        return (
            <div className="space-y-6">
                <div>
                    <h2 className="text-lg font-semibold text-gray-900">{t('settings.sessions.title')}</h2>
                    <p className="text-sm text-gray-600 mt-1">{t('settings.sessions.subtitle')}</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-12 flex flex-col items-center justify-center">
                    <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-3" />
                    <p className="text-sm text-gray-500">{t('settings.sessions.loading')}</p>
                </div>
            </div>
        )
    }

    // ─── Render ───────────────────────────────────────────────────────────────

    const otherSessions = sessions.filter(s => !s.isCurrent)

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-semibold text-gray-900">{t('settings.sessions.title')}</h2>
                    <p className="text-sm text-gray-600 mt-1">{t('settings.sessions.subtitle')}</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={fetchSessions}
                        className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                        title={t('settings.sessions.refresh')}
                    >
                        <RefreshCw className="w-4 h-4" />
                    </button>
                    {otherSessions.length > 0 && (
                        <button
                            onClick={() => setShowRevokeAllConfirm(true)}
                            className="px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 border border-red-200 rounded-lg transition-colors flex items-center gap-2"
                        >
                            <Shield className="w-4 h-4" />
                            {t('settings.sessions.revokeAll')}
                        </button>
                    )}
                </div>
            </div>

            {/* Error Banner */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
                    <p className="text-sm text-red-700 flex-1">{error}</p>
                    <button onClick={() => setError(null)} className="text-sm text-red-600 hover:text-red-800 font-medium">
                        &times;
                    </button>
                </div>
            )}

            {/* Session Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                    <Shield className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div>
                        <p className="text-sm text-blue-800 font-medium">{t('settings.sessions.maxSessionsLabel')}</p>
                        <p className="text-xs text-blue-700 mt-1">{t('settings.sessions.maxSessionsDesc')}</p>
                    </div>
                </div>
            </div>

            {/* Sessions List */}
            {sessions.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                    <Monitor className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm text-gray-500">{t('settings.sessions.noSessions')}</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {sessions.map((session) => (
                        <div
                            key={session.id}
                            className={`flex items-center justify-between p-4 rounded-xl border transition-colors ${session.isCurrent
                                    ? 'border-green-200 bg-green-50'
                                    : 'border-gray-200 bg-white hover:bg-gray-50'
                                }`}
                        >
                            {/* Device Info */}
                            <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${session.isCurrent ? 'bg-green-100' : 'bg-gray-100'
                                    }`}>
                                    <span className={session.isCurrent ? 'text-green-600' : 'text-gray-500'}>
                                        {getDeviceIcon(session.userAgent)}
                                    </span>
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium text-gray-900 text-sm">
                                            {session.device}
                                        </span>
                                        {session.isCurrent && (
                                            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                                                {t('settings.sessions.currentSession')}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-1 mt-1">
                                        <span className="text-xs text-gray-500">
                                            {session.ipAddress}
                                        </span>
                                        <span className="text-xs text-gray-400">&middot;</span>
                                        <span className="text-xs text-gray-500">
                                            {t('settings.sessions.lastActive')}: {formatRelativeTime(session.lastActiveAt)}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Revoke Button */}
                            {!session.isCurrent && (
                                <button
                                    onClick={() => handleRevokeSession(session.id)}
                                    disabled={revokingId === session.id}
                                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                                    title={t('settings.sessions.revoke')}
                                >
                                    {revokingId === session.id ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <LogOut className="w-4 h-4" />
                                    )}
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Confirm Dialogs */}
            <ConfirmDialog
                isOpen={showRevokeAllConfirm}
                onClose={() => setShowRevokeAllConfirm(false)}
                onConfirm={handleRevokeAllSessions}
                title={t('settings.sessions.revokeAllConfirmTitle')}
                message={t('settings.sessions.revokeAllConfirmMessage')}
                confirmText={t('settings.sessions.revokeAllConfirmButton')}
                variant="warning"
            />

            {/* Toast */}
            {toast && (
                <div className={`fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium text-white shadow-lg transition-all ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
                    }`}>
                    {toast.message}
                </div>
            )}
        </div>
    )
}
