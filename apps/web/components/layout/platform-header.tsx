"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useDarkMode } from "@/lib/hooks/use-dark-mode";
import {
    Menu,
    Sun,
    Moon,
    ArrowLeft,
} from "lucide-react";

interface PlatformHeaderProps {
    onMenuClick?: () => void;
}

export function PlatformHeader({ onMenuClick }: PlatformHeaderProps) {
    const pathname = usePathname();
    const { data: session } = useSession();
    const { isDark, toggleTheme, mounted } = useDarkMode();

    // Generate breadcrumbs from pathname
    const segments = (pathname || "").split("/").filter(Boolean);
    const breadcrumbs = segments.map((segment, index) => {
        const href = "/" + segments.slice(0, index + 1).join("/");
        const label = segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, " ");
        return { href, label };
    });

    return (
        <header className="sticky top-0 z-30 flex h-16 items-center border-b border-gray-200 bg-white px-4 sm:px-6 dark:border-gray-700 dark:bg-gray-900">
            <div className="flex flex-1 items-center gap-4">
                {/* Mobile Menu Button */}
                <button
                    onClick={onMenuClick}
                    className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-300 lg:hidden"
                >
                    <Menu className="h-5 w-5" />
                </button>

                {/* Back to Customer Dashboard */}
                <Link
                    href="/dashboard"
                    className="hidden sm:flex items-center gap-1.5 rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
                    title="Kembali ke Customer Dashboard"
                >
                    <ArrowLeft className="h-4 w-4" />
                    <span className="text-sm font-medium">Dashboard</span>
                </Link>

                {/* Breadcrumbs */}
                <nav className="flex items-center gap-2 text-sm overflow-x-auto">
                    <Link href="/platform" className="text-gray-400 hover:text-gray-600 whitespace-nowrap dark:text-gray-500 dark:hover:text-gray-300">
                        Platform
                    </Link>
                    {breadcrumbs.slice(1).map((crumb, index) => (
                        <span key={crumb.href} className="flex items-center gap-2 whitespace-nowrap">
                            <span className="text-gray-300">/</span>
                            {index === breadcrumbs.length - 2 ? (
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
                {/* Dark Mode Toggle */}
                <button
                    onClick={toggleTheme}
                    className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
                    aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
                >
                    {mounted && isDark ? (
                        <Sun className="h-5 w-5" />
                    ) : (
                        <Moon className="h-5 w-5" />
                    )}
                </button>

                {/* User Name */}
                <div className="hidden sm:block text-right">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {session?.user?.name || "Super Admin"}
                    </p>
                    <p className="text-xs text-purple-600 dark:text-purple-400">
                        Platform Admin
                    </p>
                </div>
            </div>
        </header>
    );
}
