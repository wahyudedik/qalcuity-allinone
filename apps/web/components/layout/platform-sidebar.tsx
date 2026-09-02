"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { getInitials } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";
import {
    LayoutDashboard,
    Building2,
    CreditCard,
    Activity,
    HeadphonesIcon,
    Shield,
    Settings,
    ChevronRight,
    X,
    LogOut,
    type LucideIcon,
} from "lucide-react";

// ─── Tipe Data Menu Item ──────────────────────────────────────────────────────
interface MenuItem {
    label: string;
    href: string;
    icon: LucideIcon;
    children?: { label: string; href: string }[];
}

// ─── Daftar Menu Navigasi Platform ────────────────────────────────────────────
function getPlatformMenuItems(t: (key: string) => string): MenuItem[] {
    return [
        {
            label: t("platform.dashboard") || "Dashboard",
            href: "/platform",
            icon: LayoutDashboard,
        },
        {
            label: t("platform.tenants") || "Tenants",
            href: "/platform/tenants",
            icon: Building2,
        },
        {
            label: t("platform.billingPlans") || "Billing & Plans",
            href: "/platform/billing",
            icon: CreditCard,
        },
        {
            label: t("platform.monitoring") || "Monitoring",
            href: "/platform/monitoring",
            icon: Activity,
        },
        {
            label: t("platform.support") || "Support",
            href: "/platform/support",
            icon: HeadphonesIcon,
        },
        {
            label: t("platform.security") || "Security",
            href: "/platform/security",
            icon: Shield,
        },
        {
            label: t("platform.settings") || "Settings",
            href: "/platform/settings",
            icon: Settings,
        },
    ];
}

// ─── Props Komponen ───────────────────────────────────────────────────────────
interface PlatformSidebarProps {
    isOpen?: boolean;
    onClose?: () => void;
}

// ─── Komponen Platform Sidebar ────────────────────────────────────────────────
export function PlatformSidebar({ isOpen = false, onClose }: PlatformSidebarProps) {
    const pathname = usePathname();
    const { data: session } = useSession();
    const { t } = useTranslation();

    const navRef = useRef<HTMLElement>(null);
    const activeItemRef = useRef<HTMLAnchorElement>(null);

    // Auto-scroll ke menu yang aktif
    useEffect(() => {
        if (activeItemRef.current && navRef.current) {
            const nav = navRef.current;
            const item = activeItemRef.current;
            const navRect = nav.getBoundingClientRect();
            const itemRect = item.getBoundingClientRect();
            if (itemRect.top < navRect.top || itemRect.bottom > navRect.bottom) {
                item.scrollIntoView({ behavior: "smooth", block: "nearest" });
            }
        }
    }, [pathname]);

    const menuItems = getPlatformMenuItems(t);

    return (
        <>
            {/* Overlay untuk mobile */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/50 lg:hidden"
                    onClick={onClose}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`fixed inset-y-0 left-0 z-50 flex h-screen w-64 shrink-0 flex-col border-r border-gray-200 bg-white transition-transform duration-200 ease-in-out lg:static lg:z-auto lg:h-auto lg:translate-x-0 dark:border-gray-700 dark:bg-gray-900 ${isOpen ? "translate-x-0" : "-translate-x-full"
                    }`}
            >
                {/* Logo + Platform Badge */}
                <div className="flex h-16 shrink-0 items-center justify-between border-b border-gray-200 px-6 dark:border-gray-700">
                    <Link href="/platform" className="flex items-center gap-2">
                        <img
                            src="/logo.png"
                            alt="Qalcuity"
                            className="h-8 w-8 object-contain"
                        />
                        <div className="flex flex-col">
                            <span className="text-xl font-bold text-gray-900 dark:text-gray-100">
                                Qalcuity
                            </span>
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-purple-600 dark:text-purple-400">
                                Platform
                            </span>
                        </div>
                    </Link>
                    <button
                        onClick={onClose}
                        className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300 lg:hidden"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Badge Role — selalu SUPERADMIN */}
                <div className="shrink-0 border-b border-gray-200 px-6 py-2 dark:border-gray-700">
                    <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                        <Shield className="h-3 w-3" />
                        {t("platform.platformAdmin") || "Platform Admin"}
                    </span>
                </div>

                {/* Navigasi */}
                <nav
                    ref={navRef}
                    className="flex-1 overflow-y-auto p-4 min-h-0"
                    style={{ scrollbarWidth: "thin", scrollbarColor: "#cbd5e1 transparent" }}
                >
                    <ul className="space-y-1">
                        {menuItems.map((item) => {
                            const isActive =
                                pathname === item.href ||
                                pathname?.startsWith(item.href + "/");
                            const hasChildren =
                                item.children && item.children.length > 0;
                            const shouldExpand =
                                hasChildren &&
                                (pathname === item.href ||
                                    pathname?.startsWith(item.href + "/"));
                            const Icon = item.icon;

                            const hasActiveChild = item.children?.some(
                                (child) =>
                                    pathname === child.href ||
                                    pathname?.startsWith(child.href + "/")
                            );

                            return (
                                <li key={item.href}>
                                    <Link
                                        href={item.href}
                                        onClick={onClose}
                                        ref={
                                            isActive || hasActiveChild
                                                ? activeItemRef
                                                : undefined
                                        }
                                        className={`flex items-center gap-3 rounded-lg px-3 py-2 min-h-[44px] text-sm font-medium transition ${isActive
                                                ? "bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
                                                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100"
                                            }`}
                                    >
                                        <Icon className="h-5 w-5 shrink-0" />
                                        <span>{item.label}</span>
                                        {hasChildren && (
                                            <ChevronRight
                                                className={`ml-auto h-4 w-4 text-gray-400 dark:text-gray-500 transition-transform ${shouldExpand ? "rotate-90" : ""
                                                    }`}
                                            />
                                        )}
                                    </Link>

                                    {/* Sub-menu */}
                                    {hasChildren && shouldExpand && (
                                        <ul className="ml-8 mt-1 space-y-1">
                                            {item.children!.map((child) => {
                                                const isChildActive =
                                                    pathname === child.href ||
                                                    pathname?.startsWith(
                                                        child.href + "/"
                                                    );
                                                return (
                                                    <li key={child.href}>
                                                        <Link
                                                            href={child.href}
                                                            onClick={onClose}
                                                            ref={
                                                                isChildActive
                                                                    ? activeItemRef
                                                                    : undefined
                                                            }
                                                            className={`flex min-h-[44px] items-center rounded-lg px-3 py-2 text-sm transition ${isChildActive
                                                                    ? "bg-purple-50 text-purple-700 font-medium dark:bg-purple-900/30 dark:text-purple-400"
                                                                    : "text-gray-500 hover:text-gray-700 dark:text-gray-500 dark:hover:text-gray-300"
                                                                }`}
                                                        >
                                                            {child.label}
                                                        </Link>
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                </nav>

                {/* Footer — switch to customer dashboard + user info */}
                <div className="shrink-0 border-t border-gray-200 p-4 dark:border-gray-700">
                    {/* Switch to Customer Dashboard */}
                    <Link
                        href="/dashboard"
                        className="mb-3 flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50 hover:text-gray-900 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100"
                    >
                        <LayoutDashboard className="h-4 w-4" />
                        <span>{t("platform.customerDashboard") || "Customer Dashboard"}</span>
                    </Link>

                    {/* User Info */}
                    <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-100 text-sm font-semibold text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                            {session?.user?.name
                                ? getInitials(session.user.name)
                                : "SA"}
                        </div>
                        <div className="flex-1 truncate">
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                {session?.user?.name || "Super Admin"}
                            </p>
                            <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                                {session?.user?.email || "admin@qalcuity.com"}
                            </p>
                        </div>
                        <button
                            onClick={() => {
                                // signOut will be handled by the parent
                                window.location.href = "/api/auth/signout";
                            }}
                            className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
                            title="Sign Out"
                        >
                            <LogOut className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            </aside>
        </>
    );
}
