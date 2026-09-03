'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { Bell, CheckCheck, Trash2, X, FileText, CreditCard, Users, Settings, AlertTriangle } from 'lucide-react'
import { formatDateTime } from '@/lib/utils'

type InAppNotification = {
    id: string
    type: string
    title: string
    message: string
    link: string | null
    isRead: boolean
    createdAt: string
}

const notifTypeConfig: Record<string, { bg: string; icon: React.ReactNode }> = {
    approval: { bg: 'bg-blue-100', icon: <CheckCheck className="h-4 w-4 text-blue-600" /> },
    payment: { bg: 'bg-green-100', icon: <CreditCard className="h-4 w-4 text-green-600" /> },
    team: { bg: 'bg-purple-100', icon: <Users className="h-4 w-4 text-purple-600" /> },
    system: { bg: 'bg-gray-100', icon: <Settings className="h-4 w-4 text-gray-600" /> },
    audit: { bg: 'bg-yellow-100', icon: <FileText className="h-4 w-4 text-yellow-600" /> },
    alert: { bg: 'bg-red-100', icon: <AlertTriangle className="h-4 w-4 text-red-600" /> },
}

export function NotificationCenter() {
    const { data: session } = useSession()
    const [notifications, setNotifications] = useState<InAppNotification[]>([])
    const [unreadCount, setUnreadCount] = useState(0)
    const [isOpen, setIsOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)

    const fetchNotifications = useCallback(async () => {
        if (!session?.user) return
        try {
            const res = await fetch('/api/notifications?limit=15')
            const data = await res.json()
            if (data.success) {
                setNotifications(data.data)
                setUnreadCount(data.unreadCount)
            }
        } catch {
            // Silently fail — notification center is non-critical
        }
    }, [session?.user])

    // Fetch on mount and every 30 seconds
    useEffect(() => {
        fetchNotifications()
        const interval = setInterval(fetchNotifications, 30000)
        return () => clearInterval(interval)
    }, [fetchNotifications])

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside)
        }
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [isOpen])

    const markAsRead = async (id: string) => {
        try {
            await fetch('/api/notifications', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids: [id] }),
            })
            setNotifications(prev =>
                prev.map(n => n.id === id ? { ...n, isRead: true } : n)
            )
            setUnreadCount(prev => Math.max(0, prev - 1))
        } catch {
            // Silently fail
        }
    }

    const markAllAsRead = async () => {
        setLoading(true)
        try {
            await fetch('/api/notifications', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ markAll: true }),
            })
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
            setUnreadCount(0)
        } catch {
            // Silently fail
        } finally {
            setLoading(false)
        }
    }

    const clearAll = async () => {
        setLoading(true)
        try {
            await fetch('/api/notifications', { method: 'DELETE' })
            setNotifications([])
            setUnreadCount(0)
        } catch {
            // Silently fail
        } finally {
            setLoading(false)
        }
    }

    const handleNotificationClick = (notif: InAppNotification) => {
        if (!notif.isRead) {
            markAsRead(notif.id)
        }
        setIsOpen(false)
    }

    const getTypeConfig = (type: string) => {
        return notifTypeConfig[type] || notifTypeConfig.system
    }

    const formatTimestamp = (timestamp: string) => {
        const date = new Date(timestamp)
        const now = new Date()
        const diff = now.getTime() - date.getTime()
        const minutes = Math.floor(diff / (1000 * 60))

        if (minutes < 1) return 'Baru saja'
        if (minutes < 60) return `${minutes}m lalu`
        const hours = Math.floor(minutes / 60)
        if (hours < 24) return `${hours}j lalu`
        const days = Math.floor(hours / 24)
        if (days < 7) return `${days}h lalu`
        return formatDateTime(timestamp)
    }

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Bell Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
                aria-label="Notifications"
            >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown */}
            {isOpen && (
                <div className="absolute right-0 top-full mt-1 w-80 sm:w-96 rounded-xl border border-gray-200 bg-white shadow-xl z-50 dark:border-gray-700 dark:bg-gray-800">
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-700">
                        <div className="flex items-center gap-2">
                            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                Notifikasi
                            </h3>
                            {unreadCount > 0 && (
                                <span className="inline-flex items-center justify-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-600 dark:bg-red-900/30 dark:text-red-400">
                                    {unreadCount}
                                </span>
                            )}
                        </div>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="rounded p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>

                    {/* Notification List */}
                    <div className="max-h-80 overflow-y-auto">
                        {notifications.length === 0 ? (
                            <div className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                                <Bell className="mx-auto mb-2 h-8 w-8 text-gray-300 dark:text-gray-600" />
                                <p>Tidak ada notifikasi</p>
                            </div>
                        ) : (
                            notifications.map((notif) => {
                                const config = getTypeConfig(notif.type)
                                const notifClassName = `flex items-start gap-3 border-b border-gray-100 px-4 py-3 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-750 cursor-pointer transition-colors ${!notif.isRead ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`

                                const notifContent = (
                                    <>
                                        <div className={`flex h-8 w-8 items-center justify-center rounded-full flex-shrink-0 ${config.bg}`}>
                                            {config.icon}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-2">
                                                <p className={`text-sm truncate ${!notif.isRead ? 'font-semibold text-gray-900 dark:text-gray-100' : 'text-gray-700 dark:text-gray-300'}`}>
                                                    {notif.title}
                                                </p>
                                                {!notif.isRead && (
                                                    <span className="h-2 w-2 rounded-full bg-blue-500 flex-shrink-0 mt-1.5" />
                                                )}
                                            </div>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                                                {notif.message}
                                            </p>
                                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                                {formatTimestamp(notif.createdAt)}
                                            </p>
                                        </div>
                                    </>
                                )

                                return notif.link ? (
                                    <Link
                                        key={notif.id}
                                        href={notif.link}
                                        className={notifClassName}
                                        onClick={() => handleNotificationClick(notif)}
                                    >
                                        {notifContent}
                                    </Link>
                                ) : (
                                    <div
                                        key={notif.id}
                                        className={notifClassName}
                                        onClick={() => handleNotificationClick(notif)}
                                    >
                                        {notifContent}
                                    </div>
                                )
                            })
                        )}
                    </div>

                    {/* Footer Actions */}
                    {notifications.length > 0 && (
                        <div className="border-t border-gray-200 px-4 py-2 dark:border-gray-700">
                            <div className="flex items-center justify-between">
                                {unreadCount > 0 && (
                                    <button
                                        onClick={markAllAsRead}
                                        disabled={loading}
                                        className="flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 disabled:opacity-50"
                                    >
                                        <CheckCheck className="h-3.5 w-3.5" />
                                        Tandai semua dibaca
                                    </button>
                                )}
                                <button
                                    onClick={clearAll}
                                    disabled={loading}
                                    className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 disabled:opacity-50 ml-auto"
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                    Hapus semua
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
