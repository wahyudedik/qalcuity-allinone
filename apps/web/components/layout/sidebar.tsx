"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const menuItems = [
    {
        label: "Dashboard",
        href: "/dashboard",
        icon: "📊",
    },
    {
        label: "Finance",
        href: "/dashboard/finance",
        icon: "💰",
        children: [
            { label: "Overview", href: "/dashboard/finance" },
            { label: "Invoices", href: "/dashboard/finance/invoices" },
            { label: "Quotations", href: "/dashboard/finance/quotations" },
            { label: "Payments", href: "/dashboard/finance/payments" },
            { label: "Purchase Orders", href: "/dashboard/finance/purchase-orders" },
            { label: "Chart of Account", href: "/dashboard/finance/accounts" },
        ],
    },
    {
        label: "Sales & CRM",
        href: "/dashboard/crm",
        icon: "📈",
        children: [
            { label: "Overview", href: "/dashboard/crm" },
            { label: "Pipeline", href: "/dashboard/crm/pipeline" },
            { label: "Leads", href: "/dashboard/crm/leads" },
            { label: "Contacts", href: "/dashboard/crm/contacts" },
            { label: "Deals", href: "/dashboard/crm/deals" },
        ],
    },
    {
        label: "Inventory",
        href: "/dashboard/inventory",
        icon: "📦",
        children: [
            { label: "Overview", href: "/dashboard/inventory" },
            { label: "Products", href: "/dashboard/inventory/products" },
            { label: "Stock", href: "/dashboard/inventory/stock" },
            { label: "Categories", href: "/dashboard/inventory/categories" },
            { label: "Suppliers", href: "/dashboard/inventory/suppliers" },
        ],
    },
    {
        label: "HR & People",
        href: "/dashboard/hr",
        icon: "👥",
        children: [
            { label: "Overview", href: "/dashboard/hr" },
            { label: "Employees", href: "/dashboard/hr/employees" },
            { label: "Attendance", href: "/dashboard/hr/attendance" },
            { label: "Leaves", href: "/dashboard/hr/leaves" },
        ],
    },
    {
        label: "Audit Trail",
        href: "/dashboard/audit",
        icon: "📋",
    },
    {
        label: "Settings",
        href: "/dashboard/settings",
        icon: "⚙️",
    },
];

interface SidebarProps {
    isOpen?: boolean;
    onClose?: () => void;
}

export function Sidebar({ isOpen = false, onClose }: SidebarProps) {
    const pathname = usePathname();

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
                className={`fixed left-0 top-0 z-50 h-screen w-64 border-r border-gray-200 bg-white transition-transform duration-200 ease-in-out lg:translate-x-0 ${isOpen ? "translate-x-0" : "-translate-x-full"
                    }`}
            >
                {/* Logo */}
                <div className="flex h-16 items-center justify-between border-b border-gray-200 px-6">
                    <Link href="/dashboard" className="flex items-center gap-2">
                        <span className="text-2xl">⚡</span>
                        <span className="text-xl font-bold text-gray-900">Qalcuity</span>
                    </Link>
                    {/* Close button for mobile */}
                    <button
                        onClick={onClose}
                        className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 lg:hidden"
                    >
                        <span className="text-xl">✕</span>
                    </button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 overflow-y-auto p-4">
                    <ul className="space-y-1">
                        {menuItems.map((item) => {
                            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                            const hasChildren = item.children && item.children.length > 0;

                            return (
                                <li key={item.href}>
                                    <Link
                                        href={item.href}
                                        onClick={onClose}
                                        className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${isActive
                                            ? "bg-blue-50 text-blue-700"
                                            : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                                            }`}
                                    >
                                        <span className="text-lg">{item.icon}</span>
                                        <span>{item.label}</span>
                                    </Link>

                                    {/* Sub-menu */}
                                    {hasChildren && isActive && (
                                        <ul className="ml-8 mt-1 space-y-1">
                                            {item.children!.map((child) => {
                                                const isChildActive = pathname === child.href;
                                                return (
                                                    <li key={child.href}>
                                                        <Link
                                                            href={child.href}
                                                            onClick={onClose}
                                                            className={`block rounded-lg px-3 py-1.5 text-sm transition ${isChildActive
                                                                ? "bg-blue-50 text-blue-700 font-medium"
                                                                : "text-gray-500 hover:text-gray-700"
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

                {/* Footer */}
                <div className="border-t border-gray-200 p-4">
                    <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700">
                            AD
                        </div>
                        <div className="flex-1 truncate">
                            <p className="text-sm font-medium text-gray-900">Admin</p>
                            <p className="truncate text-xs text-gray-500">admin@qalcuity.com</p>
                        </div>
                    </div>
                </div>
            </aside>
        </>
    );
}
