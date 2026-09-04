"use client";

import { useEffect, useRef } from "react";
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
    Package,
    UsersRound,
    TrendingUp,
    ScrollText,
    Settings,
    Shield,
    ChevronRight,
    X,
    BarChart3,
    CheckCircle,
    Monitor,
    type LucideIcon,
} from "lucide-react";

// ─── Tipe Data Menu Item ──────────────────────────────────────────────────────
interface MenuItem {
    label: string;
    href: string;
    icon: LucideIcon;
    children?: { label: string; href: string }[];
    adminOnly?: boolean;
}

// ─── Daftar Menu Navigasi ─────────────────────────────────────────────────────
// Menu didefinisikan di dalam komponen agar bisa mengakses t()
function getMenuItems(t: (key: string) => string): MenuItem[] {
    return [
        // 1. Dashboard — semua role
        {
            label: t("nav.dashboard") || "Dashboard",
            href: "/dashboard",
            icon: LayoutDashboard,
        },
        // 2. CRM — ADMIN, MEMBER, VIEWER (read-only)
        {
            label: t("nav.salesCrm") || "Sales & CRM",
            href: "/dashboard/crm",
            icon: TrendingUp,
            children: [
                { label: t("nav.overview") || "Overview", href: "/dashboard/crm" },
                { label: t("nav.contacts") || "Contacts", href: "/dashboard/crm/contacts" },
                { label: t("nav.leads") || "Leads", href: "/dashboard/crm/leads" },
                { label: t("nav.deals") || "Deals", href: "/dashboard/crm/deals" },
                { label: t("nav.pipeline") || "Pipeline", href: "/dashboard/crm/pipeline" },
            ],
        },
        // 3. Finance — ADMIN, MEMBER, VIEWER (read-only)
        {
            label: t("nav.finance") || "Finance",
            href: "/dashboard/finance",
            icon: Receipt,
            children: [
                { label: t("nav.overview") || "Overview", href: "/dashboard/finance" },
                { label: t("nav.invoices") || "Invoices", href: "/dashboard/finance/invoices" },
                { label: t("nav.payments") || "Payments", href: "/dashboard/finance/payments" },
                { label: t("nav.purchaseOrders") || "Purchase Orders", href: "/dashboard/finance/purchase-orders" },
                { label: t("nav.quotations") || "Quotations", href: "/dashboard/finance/quotations" },
                { label: t("nav.journalEntries") || "Jurnal", href: "/dashboard/finance/journal-entries" },
                { label: t("nav.chartOfAccount") || "Chart of Account", href: "/dashboard/finance/accounts" },
                { label: t("nav.reconciliation") || "Rekonsiliasi", href: "/dashboard/finance/reconciliation" },
                { label: t("nav.taxRates") || "Pajak", href: "/dashboard/finance/tax-rates" },
                { label: t("nav.periods") || "Periode", href: "/dashboard/finance/periods" },
            ],
        },
        // 4. HR — ADMIN, MEMBER, VIEWER (read-only)
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
        // 5. Inventory — ADMIN, MEMBER, VIEWER (read-only)
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
        // 6. POS (Point of Sale) — ADMIN, MEMBER, VIEWER (read-only)
        {
            label: t("nav.pos") || "Point of Sale",
            href: "/dashboard/pos",
            icon: Monitor,
            children: [
                { label: t("nav.posTerminal") || "Terminal (Cashier)", href: "/dashboard/pos/terminal" },
                { label: t("nav.posSessions") || "Sessions", href: "/dashboard/pos/sessions" },
                { label: t("nav.posTransactions") || "Transactions", href: "/dashboard/pos/transactions" },
                { label: t("nav.posRefunds") || "Refunds", href: "/dashboard/pos/refunds" },
                { label: t("nav.posReports") || "Reports", href: "/dashboard/pos/reports" },
                { label: t("nav.posTerminals") || "Terminals (Management)", href: "/dashboard/pos/terminals" },
                { label: t("nav.posLoyalty") || "Loyalty", href: "/dashboard/pos/loyalty" },
                { label: t("nav.posMonitor") || "Monitor", href: "/dashboard/pos/terminals-monitor" },
            ],
        },
        // 7. Approvals — all roles
        {
            label: t("nav.approvals") || "Approvals",
            href: "/dashboard/approvals",
            icon: CheckCircle,
        },
        // 8. Reports — ADMIN, MEMBER, VIEWER
        {
            label: t("nav.reports") || "Reports",
            href: "/dashboard/reports",
            icon: FileText,
        },
        // 9. Analytics — ADMIN, MEMBER, VIEWER
        {
            label: t("nav.analytics") || "Analytics",
            href: "/dashboard/analytics",
            icon: BarChart3,
            children: [
                { label: t("nav.overview") || "Overview", href: "/dashboard/analytics" },
                { label: t("nav.dataExplorer") || "Data Explorer", href: "/dashboard/analytics/explorer" },
                { label: t("nav.charts") || "Charts", href: "/dashboard/analytics/charts" },
                { label: t("nav.dashboards") || "Dashboards", href: "/dashboard/analytics/dashboards" },
                { label: t("nav.kpi") || "KPI", href: "/dashboard/analytics/kpi" },
                { label: t("nav.savedReports") || "Reports", href: "/dashboard/analytics/reports" },
                { label: t("nav.alerts") || "Alerts", href: "/dashboard/analytics/alerts" },
                { label: t("nav.analyticsHistory") || "History", href: "/dashboard/analytics/history" },
                { label: t("nav.scheduledReports") || "Scheduled", href: "/dashboard/analytics/scheduled" },
                { label: t("nav.dictionary") || "Dictionary", href: "/dashboard/analytics/dictionary" },
            ],
        },
        // 10. Settings — ADMIN, SUPERADMIN only
        {
            label: t("nav.settings") || "Settings",
            href: "/dashboard/settings",
            icon: Settings,
            adminOnly: true,
            children: [
                { label: t("nav.company") || "Company", href: "/dashboard/settings/company" },
                { label: t("nav.team") || "Team", href: "/dashboard/settings/team" },
                { label: t("nav.roles") || "Roles & Permissions", href: "/dashboard/settings/roles" },
                { label: t("nav.security") || "Security", href: "/dashboard/settings/security" },
                { label: t("nav.notifications") || "Notifications", href: "/dashboard/settings/notifications" },
                { label: t("nav.integrations") || "Integrations", href: "/dashboard/settings/integrations" },
                { label: t("nav.customFields") || "Custom Fields", href: "/dashboard/settings/custom-fields" },
                { label: t("nav.industry") || "Industry", href: "/dashboard/settings/industry" },
                { label: t("nav.workflow") || "Workflow", href: "/dashboard/settings/workflow" },
            ],
        },
        // 11. Billing — ADMIN, SUPERADMIN only
        {
            label: t("nav.billing") || "Billing",
            href: "/dashboard/settings/billing",
            icon: CreditCard,
            adminOnly: true,
        },
        // 12. Audit Trail — ADMIN, SUPERADMIN only
        {
            label: t("nav.auditTrail") || "Audit Trail",
            href: "/dashboard/audit",
            icon: ScrollText,
            adminOnly: true,
        },
    ];
}

// ─── Props Komponen Sidebar ───────────────────────────────────────────────────
interface SidebarProps {
    isOpen?: boolean;
    onClose?: () => void;
}

// ─── Komponen Sidebar ─────────────────────────────────────────────────────────
export function Sidebar({ isOpen = false, onClose }: SidebarProps) {
    const pathname = usePathname();
    const { data: session } = useSession();
    const { t } = useTranslation();

    // ─── Role-based Menu Filtering ──────────────────────────────────────────────
    // SUPERADMIN: melihat semua menu
    // ADMIN: melihat semua menu (sama seperti SUPERADMIN)
    // MEMBER: melihat semua menu kecuali Settings, Billing, Audit Trail
    // VIEWER: melihat semua menu kecuali Settings, Billing, Audit Trail
    //   (halaman bisa diakses tapi hanya read-only, tanpa tombol create/edit/delete)
    const userRole = session?.user?.role as string | undefined;
    const isSuperAdmin = userRole === "SUPERADMIN";
    const isAdmin = userRole === "ADMIN" || isSuperAdmin;
    const isMember = userRole === "MEMBER";
    const isViewer = userRole === "VIEWER";

    // ─── Refs untuk auto-scroll ke menu aktif ─────────────────────────────────
    const navRef = useRef<HTMLElement>(null);
    const activeItemRef = useRef<HTMLAnchorElement>(null);

    // ─── Auto-scroll ke menu yang aktif ───────────────────────────────────────
    useEffect(() => {
        if (activeItemRef.current && navRef.current) {
            const nav = navRef.current;
            const item = activeItemRef.current;
            // Pastikan item terlihat dalam viewport nav
            const navRect = nav.getBoundingClientRect();
            const itemRect = item.getBoundingClientRect();
            if (itemRect.top < navRect.top || itemRect.bottom > navRect.bottom) {
                item.scrollIntoView({ behavior: "smooth", block: "nearest" });
            }
        }
    }, [pathname]);

    // ─── Helper: Cek apakah section harus di-expand ─────────────────────────────
    const isSectionActive = (item: MenuItem) => {
        if (!item.children) return false;
        return pathname === item.href || pathname?.startsWith(item.href + "/");
    };

    // ─── Helper: Cek apakah menu item harus ditampilkan ─────────────────────────
    const isMenuVisible = (item: MenuItem) => {
        // Settings, Billing, dan Audit Trail hanya untuk ADMIN+
        if (item.adminOnly && !isAdmin) {
            return false;
        }
        return true;
    };

    return (
        <>
            {/* Overlay untuk mobile — klik untuk menutup sidebar */}
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
                {/* Logo */}
                <div className="flex h-16 shrink-0 items-center justify-between border-b border-gray-200 px-6 dark:border-gray-700">
                    <Link href="/dashboard" className="flex items-center gap-2">
                        <img
                            src="/logo.png"
                            alt="Qalcuity"
                            className="h-8 w-8 object-contain"
                        />
                        <span className="text-xl font-bold text-gray-900 dark:text-gray-100">
                            Qalcuity
                        </span>
                    </Link>
                    {/* Tombol tutup untuk mobile */}
                    <button
                        onClick={onClose}
                        className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300 lg:hidden"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Badge Role */}
                {userRole && (
                    <div className="shrink-0 border-b border-gray-200 px-6 py-2 dark:border-gray-700">
                        <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${isSuperAdmin
                                ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
                                : isAdmin
                                    ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                                    : isMember
                                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                        : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400"
                                }`}
                        >
                            <Shield className="h-3 w-3" />
                            {isSuperAdmin
                                ? "Super Admin"
                                : isAdmin
                                    ? "Admin"
                                    : isMember
                                        ? "Member"
                                        : "Viewer"}
                        </span>
                    </div>
                )}

                {/* Navigasi — scrollable area */}
                <nav
                    ref={navRef}
                    className="flex-1 overflow-y-auto p-4 min-h-0"
                    style={{ scrollbarWidth: "thin", scrollbarColor: "#cbd5e1 transparent" }}
                >
                    <ul className="space-y-1">
                        {getMenuItems(t)
                            .filter(isMenuVisible)
                            .map((item) => {
                                const isActive =
                                    pathname === item.href ||
                                    pathname?.startsWith(item.href + "/");
                                const hasChildren =
                                    item.children && item.children.length > 0;
                                const shouldExpand = isSectionActive(item);
                                const Icon = item.icon;

                                // Cek apakah ada child yang aktif (untuk auto-scroll reference)
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
                                            ref={isActive || hasActiveChild ? activeItemRef : undefined}
                                            className={`flex items-center gap-3 rounded-lg px-3 py-2 min-h-[44px] text-sm font-medium transition ${isActive
                                                ? "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                                                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100"
                                                }`}
                                        >
                                            <Icon className="h-5 w-5 shrink-0" />
                                            <span>{item.label}</span>
                                            {hasChildren && (
                                                <ChevronRight
                                                    className={`ml-auto h-4 w-4 text-gray-400 dark:text-gray-500 transition-transform ${shouldExpand
                                                        ? "rotate-90"
                                                        : ""
                                                        }`}
                                                />
                                            )}
                                        </Link>

                                        {/* Sub-menu — auto-expand jika section aktif */}
                                        {hasChildren && shouldExpand && (
                                            <ul className="ml-8 mt-1 space-y-1">
                                                {item.children!.map((child) => {
                                                    const isChildActive =
                                                        pathname === child.href ||
                                                        pathname?.startsWith(child.href + "/");
                                                    return (
                                                        <li key={child.href}>
                                                            <Link
                                                                href={child.href}
                                                                onClick={onClose}
                                                                ref={isChildActive ? activeItemRef : undefined}
                                                                className={`flex min-h-[44px] items-center rounded-lg px-3 py-2 text-sm transition ${isChildActive
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

                {/* Footer — data dari session */}
                <div className="shrink-0 border-t border-gray-200 p-4 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                            {session?.user?.name
                                ? getInitials(session.user.name)
                                : "U"}
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
