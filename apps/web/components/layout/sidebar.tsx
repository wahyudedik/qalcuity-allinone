"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { getInitials } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";
import {
    LayoutDashboard,
    Receipt,
    FileText,
    CreditCard,
    ShoppingCart,
    BookOpen,
    TrendingUp,
    Target,
    Users,
    Handshake,
    Package,
    Boxes,
    Tags,
    Truck,
    UsersRound,
    ClipboardCheck,
    CalendarOff,
    Wallet,
    ScrollText,
    Settings,
    ChevronRight,
    X,
    Zap,
    type LucideIcon,
} from "lucide-react";

interface MenuItem {
    label: string;
    href: string;
    icon: LucideIcon;
    children?: { label: string; href: string }[];
}

// Menu items are defined inside the component to access t()
function getMenuItems(t: (key: string) => string): MenuItem[] {
    return [
        {
            label: t("nav.dashboard") || "Dashboard",
            href: "/dashboard",
            icon: LayoutDashboard,
        },
        {
            label: t("nav.finance") || "Finance",
            href: "/dashboard/finance",
            icon: Receipt,
            children: [
                { label: t("nav.overview") || "Overview", href: "/dashboard/finance" },
                { label: t("nav.invoices") || "Invoices", href: "/dashboard/finance/invoices" },
                { label: t("nav.quotations") || "Quotations", href: "/dashboard/finance/quotations" },
                { label: t("nav.payments") || "Payments", href: "/dashboard/finance/payments" },
                { label: t("nav.purchaseOrders") || "Purchase Orders", href: "/dashboard/finance/purchase-orders" },
                { label: t("nav.chartOfAccount") || "Chart of Account", href: "/dashboard/finance/accounts" },
            ],
        },
        {
            label: t("nav.salesCrm") || "Sales & CRM",
            href: "/dashboard/crm",
            icon: TrendingUp,
            children: [
                { label: t("nav.overview") || "Overview", href: "/dashboard/crm" },
                { label: t("nav.pipeline") || "Pipeline", href: "/dashboard/crm/pipeline" },
                { label: t("nav.leads") || "Leads", href: "/dashboard/crm/leads" },
                { label: t("nav.contacts") || "Contacts", href: "/dashboard/crm/contacts" },
                { label: t("nav.deals") || "Deals", href: "/dashboard/crm/deals" },
            ],
        },
        {
            label: t("nav.inventory") || "Inventory",
            href: "/dashboard/inventory",
            icon: Package,
            children: [
                { label: t("nav.overview") || "Overview", href: "/dashboard/inventory" },
                { label: t("nav.products") || "Products", href: "/dashboard/inventory/products" },
                { label: t("nav.stock") || "Stock", href: "/dashboard/inventory/stock" },
                { label: t("nav.categories") || "Categories", href: "/dashboard/inventory/categories" },
                { label: t("nav.suppliers") || "Suppliers", href: "/dashboard/inventory/suppliers" },
            ],
        },
        {
            label: t("nav.hrPeople") || "HR & People",
            href: "/dashboard/hr",
            icon: UsersRound,
            children: [
                { label: t("nav.overview") || "Overview", href: "/dashboard/hr" },
                { label: t("nav.employees") || "Employees", href: "/dashboard/hr/employees" },
                { label: t("nav.attendance") || "Attendance", href: "/dashboard/hr/attendance" },
                { label: t("nav.leaves") || "Leaves", href: "/dashboard/hr/leaves" },
                { label: t("nav.payroll") || "Payroll", href: "/dashboard/hr/payroll" },
            ],
        },
        {
            label: t("nav.auditTrail") || "Audit Trail",
            href: "/dashboard/audit",
            icon: ScrollText,
        },
        {
            label: t("nav.settings") || "Settings",
            href: "/dashboard/settings",
            icon: Settings,
        },
    ];
}

interface SidebarProps {
    isOpen?: boolean;
    onClose?: () => void;
}

export function Sidebar({ isOpen = false, onClose }: SidebarProps) {
    const pathname = usePathname();
    const { data: session } = useSession();
    const { t } = useTranslation();

    // Helper untuk mengecek apakah section harus di-expand
    const isSectionActive = (item: MenuItem) => {
        if (!item.children) return false;
        return pathname === item.href || pathname?.startsWith(item.href + "/");
    };

    return (
        <>
            {/* Mobile Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/50 lg:hidden"
                    onClick={onClose}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`fixed left-0 top-0 z-50 h-screen w-64 border-r border-gray-200 bg-white transition-transform duration-200 ease-in-out lg:translate-x-0 dark:border-gray-700 dark:bg-gray-900 ${isOpen ? "translate-x-0" : "-translate-x-full"
                    }`}
            >
                {/* Logo */}
                <div className="flex h-16 items-center justify-between border-b border-gray-200 px-6 dark:border-gray-700">
                    <Link href="/dashboard" className="flex items-center gap-2">
                        <Zap className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                        <span className="text-xl font-bold text-gray-900 dark:text-gray-100">Qalcuity</span>
                    </Link>
                    {/* Close button for mobile */}
                    <button
                        onClick={onClose}
                        className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300 lg:hidden"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 overflow-y-auto p-4">
                    <ul className="space-y-1">
                        {getMenuItems(t).map((item) => {
                            const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");
                            const hasChildren = item.children && item.children.length > 0;
                            const shouldExpand = isSectionActive(item);
                            const Icon = item.icon;

                            return (
                                <li key={item.href}>
                                    <Link
                                        href={item.href}
                                        onClick={onClose}
                                        className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${isActive
                                            ? "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
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

                                    {/* Sub-menu — auto-expand jika section aktif */}
                                    {hasChildren && shouldExpand && (
                                        <ul className="ml-8 mt-1 space-y-1">
                                            {item.children!.map((child) => {
                                                const isChildActive = pathname === child.href;
                                                return (
                                                    <li key={child.href}>
                                                        <Link
                                                            href={child.href}
                                                            onClick={onClose}
                                                            className={`block rounded-lg px-3 py-1.5 text-sm transition ${isChildActive
                                                                ? "bg-blue-50 text-blue-700 font-medium dark:bg-blue-900/30 dark:text-blue-400"
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

                {/* Footer — gunakan session data */}
                <div className="border-t border-gray-200 p-4 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                            {session?.user?.name ? getInitials(session.user.name) : "U"}
                        </div>
                        <div className="flex-1 truncate">
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                {session?.user?.name || "User"}
                            </p>
                            <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                                {session?.user?.email || "user@qalcuity.com"}
                            </p>
                        </div>
                    </div>
                </div>
            </aside>
        </>
    );
}
