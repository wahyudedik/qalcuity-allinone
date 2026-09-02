"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
    Search,
    Building2,
    Users,
    CreditCard,
    MoreHorizontal,
    Eye,
    Ban,
    CheckCircle2,
    XCircle,
    Plus,
    Filter,
    ChevronLeft,
    ChevronRight,
    RefreshCw,
    ArrowUpDown,
    Loader2,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Tenant {
    id: string;
    name: string;
    email: string;
    plan: string;
    status: "active" | "suspended" | "trial";
    userCount: number;
    mrr: number;
    createdAt: string;
    lastActive: string;
}

type SortField = "name" | "plan" | "status" | "userCount" | "mrr" | "createdAt";
type SortDirection = "asc" | "desc";

// ─── Mock Data ────────────────────────────────────────────────────────────────
const mockTenants: Tenant[] = [
    { id: "t1", name: "PT Maju Bersama", email: "admin@majubersama.co.id", plan: "Enterprise", status: "active", userCount: 25, mrr: 1500000, createdAt: "2026-01-15", lastActive: "2 menit lalu" },
    { id: "t2", name: "CV Sejahtera", email: "info@sejahtera.com", plan: "Professional", status: "active", userCount: 12, mrr: 750000, createdAt: "2026-02-20", lastActive: "1 jam lalu" },
    { id: "t3", name: "PT Digital Nusantara", email: "hello@digitalnusantara.id", plan: "Enterprise", status: "active", userCount: 45, mrr: 2500000, createdAt: "2025-11-10", lastActive: "30 menit lalu" },
    { id: "t4", name: "CV Mitra Jaya", email: "admin@mitrajaya.co.id", plan: "Starter", status: "suspended", userCount: 5, mrr: 0, createdAt: "2026-03-05", lastActive: "7 hari lalu" },
    { id: "t5", name: "PT Global Tech", email: "ops@globaltech.id", plan: "Professional", status: "active", userCount: 18, mrr: 750000, createdAt: "2026-04-12", lastActive: "2 jam lalu" },
    { id: "t6", name: "UD Berkah Jaya", email: "berkah@berkahjaya.com", plan: "Trial", status: "trial", userCount: 3, mrr: 0, createdAt: "2026-08-28", lastActive: "5 menit lalu" },
    { id: "t7", name: "PT Nusantara Solusi", email: "admin@nusantarasolusi.id", plan: "Enterprise", status: "active", userCount: 32, mrr: 1500000, createdAt: "2025-12-01", lastActive: "15 menit lalu" },
    { id: "t8", name: "CV Abadi Makmur", email: "info@abadimakmur.co.id", plan: "Starter", status: "active", userCount: 8, mrr: 250000, createdAt: "2026-06-20", lastActive: "3 jam lalu" },
    { id: "t9", name: "PT Sukses Mandiri", email: "admin@suksesmandiri.id", plan: "Professional", status: "suspended", userCount: 15, mrr: 0, createdAt: "2026-01-30", lastActive: "14 hari lalu" },
    { id: "t10", name: "UD Pelangi Teknologi", email: "hello@pelangitech.com", plan: "Trial", status: "trial", userCount: 2, mrr: 0, createdAt: "2026-08-30", lastActive: "1 jam lalu" },
];

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
    }
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function PlatformTenantsPage() {
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [filterStatus, setFilterStatus] = useState<string>("all");
    const [filterPlan, setFilterPlan] = useState<string>("all");
    const [sortField, setSortField] = useState<SortField>("name");
    const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
    const [currentPage, setCurrentPage] = useState(1);
    const [menuTenantId, setMenuTenantId] = useState<string | null>(null);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
    const pageSize = 8;

    useEffect(() => {
        const timer = setTimeout(() => {
            setTenants(mockTenants);
            setLoading(false);
        }, 500);
        return () => clearTimeout(timer);
    }, []);

    // Filter & Sort
    const filteredTenants = useMemo(() => {
        let result = [...tenants];

        // Search
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            result = result.filter(
                (t) =>
                    t.name.toLowerCase().includes(q) ||
                    t.email.toLowerCase().includes(q)
            );
        }

        // Filter status
        if (filterStatus !== "all") {
            result = result.filter((t) => t.status === filterStatus);
        }

        // Filter plan
        if (filterPlan !== "all") {
            result = result.filter((t) => t.plan === filterPlan);
        }

        // Sort
        result.sort((a, b) => {
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

        return result;
    }, [tenants, searchQuery, filterStatus, filterPlan, sortField, sortDirection]);

    // Pagination
    const totalPages = Math.ceil(filteredTenants.length / pageSize);
    const paginatedTenants = filteredTenants.slice(
        (currentPage - 1) * pageSize,
        currentPage * pageSize
    );

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
        // TODO: API call to suspend tenant
        await new Promise((r) => setTimeout(r, 1000));
        setTenants((prev) =>
            prev.map((t) =>
                t.id === tenantId ? { ...t, status: "suspended" as const, mrr: 0 } : t
            )
        );
        setActionLoading(null);
        setMenuTenantId(null);
        setToast({ message: "Tenant berhasil ditangguhkan", type: "success" });
    };

    const handleReactivate = async (tenantId: string) => {
        setActionLoading(tenantId);
        // TODO: API call to reactivate tenant
        await new Promise((r) => setTimeout(r, 1000));
        setTenants((prev) =>
            prev.map((t) =>
                t.id === tenantId ? { ...t, status: "active" as const } : t
            )
        );
        setActionLoading(null);
        setMenuTenantId(null);
        setToast({ message: "Tenant berhasil diaktifkan kembali", type: "success" });
    };

    if (loading) {
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
                        Tenant Management
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        {filteredTenants.length} total tenants · {filteredTenants.filter((t) => t.status === "active").length} aktif
                    </p>
                </div>
                <button className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-purple-700">
                    <Plus className="h-4 w-4" />
                    Add Tenant
                </button>
            </div>

            {/* Filters */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Cari tenant..."
                        value={searchQuery}
                        onChange={(e) => {
                            setSearchQuery(e.target.value);
                            setCurrentPage(1);
                        }}
                        className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                    />
                </div>
                <select
                    value={filterStatus}
                    onChange={(e) => {
                        setFilterStatus(e.target.value);
                        setCurrentPage(1);
                    }}
                    className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-700 focus:border-purple-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
                >
                    <option value="all">Semua Status</option>
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                    <option value="trial">Trial</option>
                </select>
                <select
                    value={filterPlan}
                    onChange={(e) => {
                        setFilterPlan(e.target.value);
                        setCurrentPage(1);
                    }}
                    className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-700 focus:border-purple-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
                >
                    <option value="all">Semua Plan</option>
                    <option value="Starter">Starter</option>
                    <option value="Professional">Professional</option>
                    <option value="Enterprise">Enterprise</option>
                    <option value="Trial">Trial</option>
                </select>
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
                            {[
                                { field: "name" as SortField, label: "Tenant" },
                                { field: "plan" as SortField, label: "Plan" },
                                { field: "status" as SortField, label: "Status" },
                                { field: "userCount" as SortField, label: "Users" },
                                { field: "mrr" as SortField, label: "MRR" },
                                { field: "createdAt" as SortField, label: "Created" },
                            ].map((col) => (
                                <th
                                    key={col.field}
                                    className="cursor-pointer px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 hover:text-gray-700 dark:text-gray-400"
                                    onClick={() => handleSort(col.field)}
                                >
                                    <span className="flex items-center gap-1">
                                        {col.label}
                                        <ArrowUpDown className="h-3 w-3" />
                                    </span>
                                </th>
                            ))}
                            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                        {paginatedTenants.map((tenant) => (
                            <tr key={tenant.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
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
                                        {tenant.createdAt}
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
                                                <div className="absolute right-0 top-full z-50 mt-1 w-40 rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-800">
                                                    <Link
                                                        href={`/platform/tenants/${tenant.id}`}
                                                        className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700"
                                                        onClick={() => setMenuTenantId(null)}
                                                    >
                                                        <Eye className="h-4 w-4" />
                                                        Detail
                                                    </Link>
                                                    {tenant.status === "active" ? (
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
                                                            Suspend
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
                                                            Reactivate
                                                        </button>
                                                    )}
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
                {paginatedTenants.map((tenant) => (
                    <div
                        key={tenant.id}
                        className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900"
                    >
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                    {tenant.name}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {tenant.email}
                                </p>
                            </div>
                            <StatusBadge status={tenant.status} />
                        </div>
                        <div className="mt-3 grid grid-cols-3 gap-3 text-center">
                            <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Plan</p>
                                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                    {tenant.plan}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Users</p>
                                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                    {tenant.userCount}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400">MRR</p>
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
                                Detail
                            </Link>
                            {tenant.status === "active" ? (
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
                                    Suspend
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
                                    Reactivate
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Empty State */}
            {filteredTenants.length === 0 && (
                <div className="rounded-xl border border-gray-200 bg-white py-12 text-center dark:border-gray-700 dark:bg-gray-900">
                    <Building2 className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600" />
                    <p className="mt-4 text-sm font-medium text-gray-900 dark:text-gray-100">
                        Tidak ada tenant ditemukan
                    </p>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        Coba ubah filter atau search query Anda
                    </p>
                </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Halaman {currentPage} dari {totalPages}
                    </p>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
                        >
                            <ChevronLeft className="h-4 w-4" />
                            Prev
                        </button>
                        <button
                            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
                        >
                            Next
                            <ChevronRight className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            )}

            {/* Toast */}
            {toast && (
                <div className="fixed bottom-4 right-4 z-50">
                    <div
                        className={`flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium text-white shadow-lg ${
                            toast.type === "success"
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
