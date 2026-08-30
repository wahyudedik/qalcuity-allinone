"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useEffect, useState, useCallback } from "react";
import { getInitials } from "@/lib/utils";
import { SearchModal } from "@/components/ui/search-modal";
import { useDarkMode } from "@/lib/hooks/use-dark-mode";
import { useTranslation } from "@/lib/i18n";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import {
    Menu,
    Search,
    Sun,
    Moon,
    Bell,
    Settings,
    LogOut,
    CreditCard,
    X,
} from "lucide-react";

interface NotificationItem {
    id: string;
    type: string;
    title: string;
    message: string;
    tenant: { id: string; name: string; email: string };
    plan: { name: string; price: number };
    amount: number;
    isRead: boolean;
    createdAt: string;
}

interface HeaderProps {
    title?: string;
    onMenuClick?: () => void;
}

export function Header({ title, onMenuClick }: HeaderProps) {
    const pathname = usePathname();
    const { data: session } = useSession();
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const { isDark, toggleTheme, mounted } = useDarkMode();
    const { t } = useTranslation();
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [showNotifications, setShowNotifications] = useState(false);
    const [pendingCount, setPendingCount] = useState(0);

    const userRole = session?.user?.role as string | undefined;
    const isAdmin = userRole === "SUPERADMIN" || userRole === "ADMIN";

    const fetchNotifications = useCallback(async () => {
        if (!isAdmin) return;
        try {
            const [notifRes, statsRes] = await Promise.all([
                fetch("/api/billing/admin/notifications"),
                fetch("/api/billing/admin/stats"),
            ]);
            const notifData = await notifRes.json();
            const statsData = await statsRes.json();
            if (notifData.success) setNotifications(notifData.data);
            if (statsData.success) setPendingCount(statsData.data.pendingCount);
        } catch {
            // Silently fail
        }
    }, [isAdmin]);

    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 60000);
        return () => clearInterval(interval);
    }, [fetchNotifications]);

    const handleSearchOpen = useCallback(() => {
        setIsSearchOpen(true);
    }, []);

    const handleSearchClose = useCallback(() => {
        setIsSearchOpen(false);
    }, []);

    // Global keyboard shortcut: Ctrl+K / ⌘K
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "k") {
                e.preventDefault();
                setIsSearchOpen((prev) => !prev);
            }
        };

        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, []);

    // Generate breadcrumbs from pathname
    const segments = (pathname || "").split("/").filter(Boolean);
    const breadcrumbs = segments.map((segment, index) => {
        const href = "/" + segments.slice(0, index + 1).join("/");
        const label = segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, " ");
        return { href, label };
    });

    return (
        <>
            <header className="sticky top-0 z-30 flex h-16 items-center border-b border-gray-200 bg-white px-4 sm:px-6 dark:border-gray-700 dark:bg-gray-900">
                <div className="flex flex-1 items-center gap-4">
                    {/* Mobile Menu Button */}
                    <button
                        onClick={onMenuClick}
                        className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-300 lg:hidden"
                    >
                        <Menu className="h-5 w-5" />
                    </button>

                    {/* Breadcrumbs */}
                    <nav className="flex items-center gap-2 text-sm overflow-x-auto">
                        <Link href="/dashboard" className="text-gray-400 hover:text-gray-600 whitespace-nowrap dark:text-gray-500 dark:hover:text-gray-300">
                            {t("common.home") || "Home"}
                        </Link>
                        {breadcrumbs.map((crumb, index) => (
                            <span key={crumb.href} className="flex items-center gap-2 whitespace-nowrap">
                                <span className="text-gray-300">/</span>
                                {index === breadcrumbs.length - 1 ? (
                                    <span className="font-medium text-gray-900 dark:text-gray-100">{crumb.label}</span>
                                ) : (
                                    <Link href={crumb.href} className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300">
                                        {crumb.label}
                                    </Link>
                                )}
                            </span>
                        ))}
                    </nav>
                </div>

                <div className="flex items-center gap-2 sm:gap-4">
                    {/* Search */}
                    <button
                        onClick={handleSearchOpen}
                        className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-500 transition hover:border-gray-300 hover:text-gray-700 dark:border-gray-700 dark:text-gray-400 dark:hover:border-gray-600 dark:hover:text-gray-300"
                    >
                        <Search className="h-4 w-4" />
                        <span className="hidden sm:inline">{t("common.search") || "Search..."}</span>
                        <kbd className="hidden rounded border border-gray-200 px-1.5 py-0.5 text-xs font-medium text-gray-400 dark:border-gray-700 dark:text-gray-500 sm:inline">
                            ⌘K
                        </kbd>
                    </button>

                    {/* Dark Mode Toggle */}
                    <button
                        onClick={toggleTheme}
                        className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
                        aria-label={isDark ? (t("common.switchToLight") || "Switch to light mode") : (t("common.switchToDark") || "Switch to dark mode")}
                    >
                        {mounted && isDark ? (
                            <Sun className="h-5 w-5" />
                        ) : (
                            <Moon className="h-5 w-5" />
                        )}
                    </button>

                    {/* Notifications — SUPERADMIN/ADMIN only */}
                    {isAdmin && (
                        <div className="relative">
                            <button
                                onClick={() => setShowNotifications(!showNotifications)}
                                className="relative rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
                            >
                                <Bell className="h-5 w-5" />
                                {pendingCount > 0 && (
                                    <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                                        {pendingCount > 9 ? "9+" : pendingCount}
                                    </span>
                                )}
                            </button>

                            {/* Notification Dropdown */}
                            {showNotifications && (
                                <>
                                    <div
                                        className="fixed inset-0 z-40"
                                        onClick={() => setShowNotifications(false)}
                                    />
                                    <div className="absolute right-0 top-full mt-1 w-80 sm:w-96 rounded-xl border border-gray-200 bg-white shadow-xl z-50 dark:border-gray-700 dark:bg-gray-800">
                                        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-700">
                                            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                                Notifikasi Pembayaran
                                            </h3>
                                            <button
                                                onClick={() => setShowNotifications(false)}
                                                className="rounded p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                                            >
                                                <X className="h-4 w-4" />
                                            </button>
                                        </div>
                                        <div className="max-h-80 overflow-y-auto">
                                            {notifications.length === 0 ? (
                                                <div className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                                                    <Bell className="mx-auto mb-2 h-8 w-8 text-gray-300 dark:text-gray-600" />
                                                    Tidak ada notifikasi baru
                                                </div>
                                            ) : (
                                                notifications.map((notif) => (
                                                    <Link
                                                        key={notif.id}
                                                        href="/dashboard/billing"
                                                        className="flex items-start gap-3 border-b border-gray-100 px-4 py-3 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-750"
                                                        onClick={() => setShowNotifications(false)}
                                                    >
                                                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-900/30">
                                                            <CreditCard className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                                                                {notif.title}
                                                            </p>
                                                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                                                {notif.message}
                                                            </p>
                                                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                                                {formatDateTime(notif.createdAt)}
                                                            </p>
                                                        </div>
                                                    </Link>
                                                ))
                                            )}
                                        </div>
                                        {notifications.length > 0 && (
                                            <div className="border-t border-gray-200 px-4 py-2 dark:border-gray-700">
                                                <Link
                                                    href="/dashboard/billing"
                                                    className="block text-center text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400"
                                                    onClick={() => setShowNotifications(false)}
                                                >
                                                    Lihat Semua Pembayaran
                                                </Link>
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {/* User Menu */}
                    <div className="relative group">
                        <button className="flex items-center gap-2 rounded-lg p-1.5 transition hover:bg-gray-100 dark:hover:bg-gray-800">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                                {session?.user?.name ? getInitials(session.user.name) : 'U'}
                            </div>
                            <span className="hidden text-sm font-medium text-gray-700 dark:text-gray-300 sm:inline">
                                {session?.user?.name || 'User'}
                            </span>
                        </button>

                        {/* Dropdown Menu */}
                        <div className="absolute right-0 top-full mt-1 w-48 rounded-lg border border-gray-200 bg-white py-1 shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 dark:border-gray-700 dark:bg-gray-800">
                            <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-700">
                                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{session?.user?.name}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">{session?.user?.email}</p>
                            </div>
                            <Link
                                href="/dashboard/settings"
                                className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                            >
                                <Settings className="h-4 w-4" />
                                {t("common.settings") || "Pengaturan"}
                            </Link>
                            <button
                                onClick={() => signOut({ callbackUrl: '/login' })}
                                className="flex items-center gap-2 w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                            >
                                <LogOut className="h-4 w-4" />
                                {t("common.logout") || "Keluar"}
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <SearchModal isOpen={isSearchOpen} onClose={handleSearchClose} />
        </>
    );
}
