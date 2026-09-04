"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
    Search,
    Building2,
    CreditCard,
    MoreHorizontal,
    Eye,
    Ban,
    CheckCircle2,
    XCircle,
    Plus,
    ChevronLeft,
    ChevronRight,
    RefreshCw,
    ArrowUpDown,
    Loader2,
    AlertTriangle,
    Download,
    Trash2,
    SquareCheck,
    Square,
} from "lucide-react";
import { exportToCSV } from "@/lib/export";
import { useTranslation } from "@/lib/i18n";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Tenant {
    id: string;
    name: string;
    email: string;
    slug: string;
    plan: string;
    status: "active" | "suspended" | "trial" | "cancelled" | "pending_payment";
    userCount: number;
    mrr: number;
    createdAt: string;
    updatedAt: string;
}

interface Pagination {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

type SortField = "name" | "plan" | "status" | "userCount" | "mrr" | "createdAt";
type SortDirection = "asc" | "desc";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatRupiah(amount: number): string {
    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
}

function StatusBadge({ status }: { status: Tenant["status"] }) {
    switch (status) {
        case "active":
            return (
                <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                    <CheckCircle2 className="h-3 w-3" />
                    Active
                </span>
            );
        case "suspended":
            return (
                <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400">
                    <XCircle className="h-3 w-3" />
                    Suspended
                </span>
            );
        case "trial":
            return (
                <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
                    <CheckCircle2 className="h-3 w-3" />
                    Trial
                </span>
            );
        case "cancelled":
            return (
                <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                    <XCircle className="h-3 w-3" />
                    Cancelled
                </span>
            );
        case "pending_payment":
            return (
                <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-medium text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
                    <AlertTriangle className="h-3 w-3" />
                    Pending
                </span>
            );
        default:
            return (
                <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                    {status}
                </span>
            );
    }
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function PlatformTenantsPage() {
    const { t } = useTranslation();
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [filterStatus, setFilterStatus] = useState<string>("all");
    const [filterPlan, setFilterPlan] = useState<string>("all");
    const [sortField, setSortField] = useState<SortField>("name");
    const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
    const [currentPage, setCurrentPage] = useState(1);
    const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 10, total: 0, totalPages: 0 });
    const [menuTenantId, setMenuTenantId] = useState<string | null>(null);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [bulkActionLoading, setBulkActionLoading] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
    const pageSize = 10;

    const fetchTenants = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const params = new URLSearchParams();
            params.set("page", String(currentPage));
            params.set("limit", String(pageSize));
            if (searchQuery) params.set("search", searchQuery);
            if (filterStatus !== "all") params.set("status", filterStatus);
            if (filterPlan !== "all") params.set("plan", filterPlan);

            const res = await fetch(`/api/platform/tenants?${params.toString()}`);
            const data = await res.json();

            if (data.success && data.data) {
                setTenants(data.data);
                setPagination(data.pagination);
            } else {
                setError(data.error || t('platform.tenantsPage.errorFetch'));
                setTenants([]);
            }
        } catch {
            setError(t('platform.tenantsPage.errorContact'));
            setTenants([]);
        } finally {
            setLoading(false);
        }
    }, [currentPage, searchQuery, filterStatus, filterPlan]);

    useEffect(() => {
        fetchTenants();
    }, [fetchTenants]);

    // Reset to page 1 when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, filterStatus, filterPlan]);

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortDirection(sortDirection === "asc" ? "desc" : "asc");
        } else {
            setSortField(field);
            setSortDirection("asc");
        }
    };

    const handleSuspend = async (tenantId: string) => {
        setActionLoading(tenantId);
        try {
            const res = await fetch(`/api/platform/tenants/${tenantId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: "SUSPENDED" }),
            });
            const data = await res.json();
            if (data.success) {
                setTenants((prev) =>
                    prev.map((t) =>
                        t.id === tenantId ? { ...t, status: "suspended" as const, mrr: 0 } : t
                    )
                );
                setToast({ message: t('platform.tenantsPage.successSuspended'), type: "success" });
            } else {
                setToast({ message: data.error || t('platform.tenantsPage.errorSuspend'), type: "error" });
            }
        } catch {
            setToast({ message: t('platform.tenantsPage.errorContact'), type: "error" });
        } finally {
            setActionLoading(null);
            setMenuTenantId(null);
        }
    };

    const handleReactivate = async (tenantId: string) => {
        setActionLoading(tenantId);
        try {
            const res = await fetch(`/api/platform/tenants/${tenantId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: "ACTIVE" }),
            });
            const data = await res.json();
            if (data.success) {
                fetchTenants();
                setToast({ message: t('platform.tenantsPage.successReactivated'), type: "success" });
            } else {
                setToast({ message: data.error || t('platform.tenantsPage.errorReactivate'), type: "error" });
            }
        } catch {
            setToast({ message: t('platform.tenantsPage.errorContact'), type: "error" });
        } finally {
            setActionLoading(null);
            setMenuTenantId(null);
        }
    };

    const handleDelete = async (tenantId: string) => {
        setActionLoading(tenantId);
        try {
            const res = await fetch(`/api/platform/tenants/${tenantId}`, {
                method: "DELETE",
            });
            const data = await res.json();
            if (data.success) {
                setTenants((prev) => prev.filter((t) => t.id !== tenantId));
                setToast({ message: t('platform.tenantsPage.successDeleted'), type: "success" });
            } else {
                setToast({ message: data.error || t('platform.tenantsPage.errorDelete'), type: "error" });
            }
        } catch {
            setToast({ message: t('platform.tenantsPage.errorContact'), type: "error" });
        } finally {
            setActionLoading(null);
            setShowDeleteConfirm(null);
            setMenuTenantId(null);
        }
    };

    // Bulk actions
    const handleSelectAll = () => {
        if (selectedIds.size === tenants.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(tenants.map((t) => t.id)));
        }
    };

    const handleSelectOne = (id: string) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    const handleBulkSuspend = async () => {
        if (selectedIds.size === 0) return;
        setBulkActionLoading(true);
        try {
            const promises = Array.from(selectedIds).map((id) =>
                fetch(`/api/platform/tenants/${id}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ status: "SUSPENDED" }),
                })
            );
            await Promise.all(promises);
            setSelectedIds(new Set());
            fetchTenants();
            setToast({ message: t('platform.tenantsPage.successSuspended'), type: "success" });
        } catch {
            setToast({ message: t('platform.tenantsPage.errorBulkSuspend'), type: "error" });
        } finally {
            setBulkActionLoading(false);
        }
    };

    // CSV Export
    const handleExport = () => {
        const exportData = tenants.map((t) => ({
            name: t.name,
            email: t.email,
            slug: t.slug,
            plan: t.plan,
            status: t.status,
            userCount: t.userCount,
            mrr: t.mrr,
            createdAt: t.createdAt,
            updatedAt: t.updatedAt,
        }));
        exportToCSV(exportData, `tenants-export-${new Date().toISOString().split("T")[0]}`);
        setToast({ message: t('platform.tenantsPage.exportSuccess'), type: "success" });
    };

    // Client-side sort for current page display
    const sortedTenants = [...tenants].sort((a, b) => {
        const aVal = a[sortField];
        const bVal = b[sortField];
        if (typeof aVal === "string" && typeof bVal === "string") {
            return sortDirection === "asc"
                ? aVal.localeCompare(bVal)
                : bVal.localeCompare(aVal);
        }
        if (typeof aVal === "number" && typeof bVal === "number") {
            return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
        }
        return 0;
    });

    const totalPages = pagination.totalPages;
    const totalActive = tenants.filter((t) => t.status === "active").length;

    if (loading && tenants.length === 0) {
        return (
            <div className="flex items-center justify-center h-64">
                <RefreshCw className="h-6 w-6 animate-spin text-purple-600" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                        {t('platform.tenantsPage.title')}
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        {pagination.total} {t('platform.tenantsPage.subtitle')} · {totalActive} {t('platform.tenantsPage.active')}
                    </p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={handleExport}
                        className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                    >
                        <Download className="h-4 w-4" />
                        {t('platform.tenantsPage.exportCsv')}
                    </button>
                    <button className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-purple-700">
                        <Plus className="h-4 w-4" />
                        {t('platform.tenantsPage.addTenant')}
                    </button>
                </div>
            </div>

            {/* Error Banner */}
            {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
                    <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" />
                        <p className="font-medium">{error}</p>
                    </div>
                    <button
                        onClick={fetchTenants}
                        className="mt-2 text-sm font-medium underline hover:no-underline"
                    >
                        {t('platform.tenantsPage.retry')}
                    </button>
                </div>
            )}

            {/* Bulk Actions Bar */}
            {selectedIds.size > 0 && (
                <div className="flex items-center gap-3 rounded-lg border border-purple-200 bg-purple-50 px-4 py-3 dark:border-purple-800 dark:bg-purple-900/20">
                    <span className="text-sm font-medium text-purple-700 dark:text-purple-300">
                        {selectedIds.size} {t('platform.tenantsPage.selected')}
                    </span>
                    <button
                        onClick={handleBulkSuspend}
                        disabled={bulkActionLoading}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-700 dark:bg-gray-800 dark:text-red-400"
                    >
                        {bulkActionLoading ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                            <Ban className="h-3 w-3" />
                        )}
                        {t('platform.tenantsPage.suspendSelected')}
                    </button>
                    <button
                        onClick={() => setSelectedIds(new Set())}
                        className="text-xs font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400"
                    >
                        {t('platform.tenantsPage.clearSelection')}
                    </button>
                </div>
            )}

            {/* Filters */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder={t('platform.tenantsPage.searchPlaceholder')}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                    />
                </div>
                <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-700 focus:border-purple-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
                >
                    <option value="all">{t('platform.tenantsPage.allStatus')}</option>
                    <option value="active">{t('platform.tenantsPage.statusActive')}</option>
                    <option value="suspended">{t('platform.tenantsPage.statusSuspended')}</option>
                    <option value="trial">{t('platform.tenantsPage.statusTrial')}</option>
                    <option value="cancelled">{t('platform.tenantsPage.statusCancelled')}</option>
                    <option value="pending_payment">{t('platform.tenantsPage.filterPendingPayment')}</option>
                </select>
                <select
                    value={filterPlan}
                    onChange={(e) => setFilterPlan(e.target.value)}
                    className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-700 focus:border-purple-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
                >
                    <option value="all">{t('platform.tenantsPage.allPlan')}</option>
                    <option value="starter">Starter</option>
                    <option value="professional">Professional</option>
                    <option value="enterprise">Enterprise</option>
                </select>
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
                            <th className="px-4 py-3 text-left">
                                <button
                                    onClick={handleSelectAll}
                                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                >
                                    {selectedIds.size === tenants.length && tenants.length > 0 ? (
                                        <SquareCheck className="h-4 w-4 text-purple-600" />
                                    ) : (
                                        <Square className="h-4 w-4" />
                                    )}
                                </button>
                            </th>
                            {[
                                { field: "name" as SortField, label: t('platform.tenantsPage.colTenant') },
                                { field: "plan" as SortField, label: t('platform.tenantsPage.colPlan') },
                                { field: "status" as SortField, label: t('platform.tenantsPage.colStatus') },
                                { field: "userCount" as SortField, label: t('platform.tenantsPage.colUsers') },
                                { field: "mrr" as SortField, label: t('platform.tenantsPage.colMrr') },
                                { field: "createdAt" as SortField, label: t('platform.tenantsPage.colCreated') },
                            ].map((col) => (
                                <th
                                    key={col.field}
                                    className="cursor-pointer px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 hover:text-gray-700 dark:text-gray-400"
                                    onClick={() => handleSort(col.field)}
                                >
                                    <span className="flex items-center gap-1">
                                        {col.label}
                                        <ArrowUpDown className={`h-3 w-3 ${sortField === col.field ? "text-purple-600" : ""}`} />
                                        {sortField === col.field && (
                                            <span className="text-[10px]">{sortDirection === "asc" ? "↑" : "↓"}</span>
                                        )}
                                    </span>
                                </th>
                            ))}
                            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                {t('platform.tenantsPage.colActions')}
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                        {sortedTenants.map((tenant) => (
                            <tr key={tenant.id} className={`hover:bg-gray-50 dark:hover:bg-gray-800/50 ${selectedIds.has(tenant.id) ? "bg-purple-50 dark:bg-purple-900/10" : ""}`}>
                                <td className="px-4 py-3">
                                    <button
                                        onClick={() => handleSelectOne(tenant.id)}
                                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                    >
                                        {selectedIds.has(tenant.id) ? (
                                            <SquareCheck className="h-4 w-4 text-purple-600" />
                                        ) : (
                                            <Square className="h-4 w-4" />
                                        )}
                                    </button>
                                </td>
                                <td className="px-4 py-3">
                                    <div>
                                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                            {tenant.name}
                                        </p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                            {tenant.email}
                                        </p>
                                    </div>
                                </td>
                                <td className="px-4 py-3">
                                    <span className="text-sm text-gray-700 dark:text-gray-300">
                                        {tenant.plan}
                                    </span>
                                </td>
                                <td className="px-4 py-3">
                                    <StatusBadge status={tenant.status} />
                                </td>
                                <td className="px-4 py-3">
                                    <span className="text-sm text-gray-700 dark:text-gray-300">
                                        {tenant.userCount}
                                    </span>
                                </td>
                                <td className="px-4 py-3">
                                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                        {tenant.mrr > 0 ? formatRupiah(tenant.mrr) : "-"}
                                    </span>
                                </td>
                                <td className="px-4 py-3">
                                    <span className="text-sm text-gray-500 dark:text-gray-400">
                                        {new Date(tenant.createdAt).toLocaleDateString("id-ID")}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-right">
                                    <div className="relative inline-block">
                                        <button
                                            onClick={() =>
                                                setMenuTenantId(
                                                    menuTenantId === tenant.id ? null : tenant.id
                                                )
                                            }
                                            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
                                        >
                                            <MoreHorizontal className="h-4 w-4" />
                                        </button>
                                        {menuTenantId === tenant.id && (
                                            <>
                                                <div
                                                    className="fixed inset-0 z-40"
                                                    onClick={() => setMenuTenantId(null)}
                                                />
                                                <div className="absolute right-0 top-full z-50 mt-1 w-44 rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-800">
                                                    <Link
                                                        href={`/platform/tenants/${tenant.id}`}
                                                        className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700"
                                                        onClick={() => setMenuTenantId(null)}
                                                    >
                                                        <Eye className="h-4 w-4" />
                                                        {t('platform.tenantsPage.detail')}
                                                    </Link>
                                                    {tenant.status === "active" || tenant.status === "trial" ? (
                                                        <button
                                                            onClick={() => handleSuspend(tenant.id)}
                                                            disabled={actionLoading === tenant.id}
                                                            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 disabled:opacity-50"
                                                        >
                                                            {actionLoading === tenant.id ? (
                                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                            ) : (
                                                                <Ban className="h-4 w-4" />
                                                            )}
                                                            {t('platform.tenantsPage.suspend')}
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={() => handleReactivate(tenant.id)}
                                                            disabled={actionLoading === tenant.id}
                                                            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-green-600 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/20 disabled:opacity-50"
                                                        >
                                                            {actionLoading === tenant.id ? (
                                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                            ) : (
                                                                <CheckCircle2 className="h-4 w-4" />
                                                            )}
                                                            {t('platform.tenantsPage.reactivate')}
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => {
                                                            setMenuTenantId(null);
                                                            setShowDeleteConfirm(tenant.id);
                                                        }}
                                                        className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                        {t('platform.tenantsPage.deleteAction')}
                                                    </button>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Mobile Cards */}
            <div className="space-y-3 md:hidden">
                {sortedTenants.map((tenant) => (
                    <div
                        key={tenant.id}
                        className={`rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900 ${selectedIds.has(tenant.id) ? "border-purple-300 dark:border-purple-700" : ""}`}
                    >
                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => handleSelectOne(tenant.id)}
                                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                >
                                    {selectedIds.has(tenant.id) ? (
                                        <SquareCheck className="h-4 w-4 text-purple-600" />
                                    ) : (
                                        <Square className="h-4 w-4" />
                                    )}
                                </button>
                                <div>
                                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                        {tenant.name}
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        {tenant.email}
                                    </p>
                                </div>
                            </div>
                            <StatusBadge status={tenant.status} />
                        </div>
                        <div className="mt-3 grid grid-cols-3 gap-3 text-center">
                            <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400">{t('platform.tenantsPage.colPlan')}</p>
                                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                    {tenant.plan}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400">{t('platform.tenantsPage.colUsers')}</p>
                                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                    {tenant.userCount}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400">{t('platform.tenantsPage.colMrr')}</p>
                                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                    {tenant.mrr > 0 ? formatRupiah(tenant.mrr) : "-"}
                                </p>
                            </div>
                        </div>
                        <div className="mt-3 flex gap-2">
                            <Link
                                href={`/platform/tenants/${tenant.id}`}
                                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                            >
                                <Eye className="h-3.5 w-3.5" />
                                {t('platform.tenantsPage.detail')}
                            </Link>
                            {tenant.status === "active" || tenant.status === "trial" ? (
                                <button
                                    onClick={() => handleSuspend(tenant.id)}
                                    disabled={actionLoading === tenant.id}
                                    className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
                                >
                                    {actionLoading === tenant.id ? (
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                        <Ban className="h-3.5 w-3.5" />
                                    )}
                                    {t('platform.tenantsPage.suspend')}
                                </button>
                            ) : (
                                <button
                                    onClick={() => handleReactivate(tenant.id)}
                                    disabled={actionLoading === tenant.id}
                                    className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-green-200 px-3 py-2 text-xs font-medium text-green-600 hover:bg-green-50 disabled:opacity-50 dark:border-green-800 dark:text-green-400 dark:hover:bg-green-900/20"
                                >
                                    {actionLoading === tenant.id ? (
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                        <CheckCircle2 className="h-3.5 w-3.5" />
                                    )}
                                    {t('platform.tenantsPage.reactivate')}
                                </button>
                            )}
                            <button
                                onClick={() => setShowDeleteConfirm(tenant.id)}
                                className="flex items-center justify-center rounded-lg border border-red-200 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
                            >
                                <Trash2 className="h-3.5 w-3.5" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Empty State */}
            {tenants.length === 0 && !loading && (
                <div className="rounded-xl border border-gray-200 bg-white py-12 text-center dark:border-gray-700 dark:bg-gray-900">
                    <Building2 className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600" />
                    <p className="mt-4 text-sm font-medium text-gray-900 dark:text-gray-100">
                        {t('platform.tenantsPage.noTenants')}
                    </p>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        {t('platform.tenantsPage.noTenantsHint')}
                    </p>
                </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        {t('platform.tenantsPage.paginationText')} {currentPage} {t('platform.tenantsPage.paginationOf')} {totalPages} · {pagination.total} {t('platform.tenantsPage.subtitle')}
                    </p>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
                        >
                            <ChevronLeft className="h-4 w-4" />
                            {t('platform.tenantsPage.prev')}
                        </button>
                        <button
                            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
                        >
                            {t('platform.tenantsPage.next')}
                            <ChevronRight className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-gray-800">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                                <Trash2 className="h-5 w-5 text-red-600 dark:text-red-400" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                    {t('platform.tenantsPage.confirmDelete')}
                                </h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    {t('platform.tenantsPage.deleteWarning')}
                                </p>
                            </div>
                        </div>
                        <p className="mt-4 text-sm text-gray-700 dark:text-gray-300">
                            {t('platform.tenantsPage.deleteDescription')}
                        </p>
                        <div className="mt-6 flex justify-end gap-2">
                            <button
                                onClick={() => setShowDeleteConfirm(null)}
                                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                            >
                                {t('platform.tenantsPage.cancel')}
                            </button>
                            <button
                                onClick={() => showDeleteConfirm && handleDelete(showDeleteConfirm)}
                                disabled={actionLoading === showDeleteConfirm}
                                className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                            >
                                {actionLoading === showDeleteConfirm ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Trash2 className="h-4 w-4" />
                                )}
                                {t('platform.tenantsPage.delete')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Toast */}
            {toast && (
                <div className="fixed bottom-4 right-4 z-50">
                    <div
                        className={`flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium text-white shadow-lg ${toast.type === "success"
                            ? "bg-green-600"
                            : "bg-red-600"
                            }`}
                    >
                        {toast.message}
                        <button
                            onClick={() => setToast(null)}
                            className="ml-2 hover:opacity-75"
                        >
                            ×
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
