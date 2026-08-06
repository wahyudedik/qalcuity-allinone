"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useEffect, useState, useCallback } from "react";
import { getInitials } from "@/lib/utils";
import { SearchModal } from "@/components/ui/search-modal";
import { useDarkMode } from "@/lib/hooks/use-dark-mode";

interface HeaderProps {
    title?: string;
    onMenuClick?: () => void;
}

export function Header({ title, onMenuClick }: HeaderProps) {
    const pathname = usePathname();
    const { data: session } = useSession();
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const { isDark, toggleTheme, mounted } = useDarkMode();

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
    const segments = pathname.split("/").filter(Boolean);
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
                    <span className="text-xl">☰</span>
                </button>

                {/* Breadcrumbs */}
                <nav className="flex items-center gap-2 text-sm overflow-x-auto">
                    <Link href="/dashboard" className="text-gray-400 hover:text-gray-600 whitespace-nowrap dark:text-gray-500 dark:hover:text-gray-300">
                        Home
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
                    <span>🔍</span>
                    <span className="hidden sm:inline">Search...</span>
                    <kbd className="hidden rounded border border-gray-200 px-1.5 py-0.5 text-xs font-medium text-gray-400 dark:border-gray-700 dark:text-gray-500 sm:inline">
                        ⌘K
                    </kbd>
                </button>

                {/* Dark Mode Toggle */}
                <button
                    onClick={toggleTheme}
                    className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
                    aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
                >
                    <span className="text-lg">{mounted && isDark ? "☀️" : "🌙"}</span>
                </button>

                {/* Notifications */}
                <button className="relative rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600">
                    <span className="text-lg">🔔</span>
                    <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-red-500"></span>
                </button>

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
                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                        >
                            ⚙️ Pengaturan
                        </Link>
                        <button
                            onClick={() => signOut({ callbackUrl: '/login' })}
                            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                        >
                            🚪 Keluar
                        </button>
                    </div>
                </div>
            </div>
        </header>

            <SearchModal isOpen={isSearchOpen} onClose={handleSearchClose} />
        </>
    );
}
