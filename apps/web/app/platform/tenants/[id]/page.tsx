"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
    ArrowLeft,
    Building2,
    Users,
    CreditCard,
    Mail,
    Calendar,
    Activity,
    Ban,
    CheckCircle2,
    Loader2,
    RefreshCw,
    Clock,
    FileText,
    Package,
    Shield,
    Settings,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface TenantDetail {
    id: string;
    name: string;
    email: string;
    phone: string;
    address: string;
    plan: string;
    status: "active" | "suspended" | "trial";
    industry: string;
    createdAt: string;
    lastActive: string;
    userCount: number;
    activeUsers: number;
    mrr: number;
    totalInvoices: number;
    totalProducts: number;
    totalEmployees: number;
    storageUsed: number; // in MB
    storageLimit: number; // in MB
    apiCalls: number;
    loginCount: number;
}

// ─── Mock Data ────────────────────────────────────────────────────────────────
const mockTenantDetail: TenantDetail = {
    id: "t1",
    name: "PT Maju Bersama",
    email: "admin@majubersama.co.id",
    phone: "+62 21 5555 1234",
    address: "Jl. Sudirman No. 123, Jakarta Selatan",
    plan: "Enterprise",
    status: "active",
    industry: "Manufacturing",
    createdAt: "15 Januari 2026",
    lastActive: "2 menit lalu",
    userCount: 25,
    activeUsers: 18,
    mrr: 1500000,
    totalInvoices: 1247,
    totalProducts: 89,
    totalEmployees: 45,
    storageUsed: 2048,
    storageLimit: 10240,
    apiCalls: 15420,
    loginCount: 892,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatRupiah(amount: number): string {
    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
}

function StatusBadge({ status }: { status: TenantDetail["status"] }) {
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
                    <Ban className="h-3 w-3" />
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
export default function PlatformTenantDetailPage() {
    const params = useParams();
    const tenantId = params?.id as string;
    const [tenant, setTenant] = useState<TenantDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

    useEffect(() => {
        const timer = setTimeout(() => {
            setTenant({ ...mockTenantDetail, id: tenantId });
            setLoading(false);
        }, 500);
        return () => clearTimeout(timer);
    }, [tenantId]);

    const handleSuspend = async () => {
        if (!tenant) return;
        setActionLoading(true);
        await new Promise((r) => setTimeout(r, 1000));
        setTenant({ ...tenant, status: "suspended", mrr: 0 });
        setActionLoading(false);
        setToast({ message: "Tenant berhasil ditangguhkan", type: "success" });
    };

    const handleReactivate = async () => {
        if (!tenant) return;
        setActionLoading(true);
        await new Promise((r) => setTimeout(r, 1000));
        setTenant({ ...tenant, status: "active", mrr: 1500000 });
        setActionLoading(false);
        setToast({ message: "Tenant berhasil diaktifkan kembali", type: "success" });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <RefreshCw className="h-6 w-6 animate-spin text-purple-600" />
            </div>
        );
    }

    if (!tenant) {
        return (
            <div className="text-center py-12">
                <Building2 className="mx-auto h-12 w-12 text-gray-300" />
                <p className="mt-4 text-sm font-medium text-gray-900 dark:text-gray-100">
                    Tenant tidak ditemukan
                </p>
                <Link href="/platform/tenants" className="mt-4 text-sm text-purple-600 hover:text-purple-700">
                    Kembali ke daftar tenant
                </Link>
            </div>
        );
    }

    const storagePercent = Math.round((tenant.storageUsed / tenant.storageLimit) * 100);

    return (
        <div className="space-y-6">
            {/* Back Link */}
            <Link
                href="/platform/tenants"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
                <ArrowLeft className="h-4 w-4" />
                Kembali ke Tenant List
            </Link>

            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-100 dark:bg-purple-900/30">
                        <Building2 className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                                {tenant.name}
                            </h1>
                            <StatusBadge status={tenant.status} />
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            {tenant.email} · {tenant.industry}
                        </p>
                    </div>
                </div>
                <div className="flex gap-2">
                    {tenant.status === "active" ? (
                        <button
                            onClick={handleSuspend}
                            disabled={actionLoading}
                            className="inline-flex items-center gap-2 rounded-lg border border-red-300 bg-white px-4 py-2.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-700 dark:bg-gray-800 dark:text-red-400 dark:hover:bg-red-900/20"
                        >
                            {actionLoading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Ban className="h-4 w-4" />
                            )}
                            Suspend Tenant
                        </button>
                    ) : (
                        <button
                            onClick={handleReactivate}
                            disabled={actionLoading}
                            className="inline-flex items-center gap-2 rounded-lg border border-green-300 bg-white px-4 py-2.5 text-sm font-medium text-green-700 hover:bg-green-50 disabled:opacity-50 dark:border-green-700 dark:bg-gray-800 dark:text-green-400 dark:hover:bg-green-900/20"
                        >
                            {actionLoading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <CheckCircle2 className="h-4 w-4" />
                            )}
                            Reactivate Tenant
                        </button>
                    )}
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
                    <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-blue-100 p-2 dark:bg-blue-900/30">
                            <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Users</p>
                            <p className="text-lg font-bold text-gray-900 dark:text-white">
                                {tenant.activeUsers}/{tenant.userCount}
                            </p>
                        </div>
                    </div>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
                    <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-green-100 p-2 dark:bg-green-900/30">
                            <CreditCard className="h-5 w-5 text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">MRR</p>
                            <p className="text-lg font-bold text-gray-900 dark:text-white">
                                {tenant.mrr > 0 ? formatRupiah(tenant.mrr) : "-"}
                            </p>
                        </div>
                    </div>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
                    <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-purple-100 p-2 dark:bg-purple-900/30">
                            <FileText className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Invoices</p>
                            <p className="text-lg font-bold text-gray-900 dark:text-white">
                                {tenant.totalInvoices.toLocaleString()}
                            </p>
                        </div>
                    </div>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
                    <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-yellow-100 p-2 dark:bg-yellow-900/30">
                            <Package className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Products</p>
                            <p className="text-lg font-bold text-gray-900 dark:text-white">
                                {tenant.totalProducts}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Two Column Layout */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {/* Tenant Info */}
                <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
                    <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                            Tenant Information
                        </h2>
                    </div>
                    <div className="divide-y divide-gray-100 dark:divide-gray-800">
                        {[
                            { icon: Mail, label: "Email", value: tenant.email },
                            { icon: Settings, label: "Telepon", value: tenant.phone },
                            { icon: Building2, label: "Alamat", value: tenant.address },
                            { icon: FileText, label: "Industri", value: tenant.industry },
                            { icon: CreditCard, label: "Plan", value: tenant.plan },
                            { icon: Calendar, label: "Terdaftar", value: tenant.createdAt },
                            { icon: Clock, label: "Terakhir Aktif", value: tenant.lastActive },
                        ].map((item) => (
                            <div key={item.label} className="flex items-center gap-4 px-6 py-3">
                                <item.icon className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                                <div className="flex-1">
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        {item.label}
                                    </p>
                                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                        {item.value}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Usage & Activity */}
                <div className="space-y-6">
                    {/* Storage Usage */}
                    <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
                        <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                                Storage Usage
                            </h2>
                        </div>
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm text-gray-500 dark:text-gray-400">
                                    {(tenant.storageUsed / 1024).toFixed(1)} GB dari {(tenant.storageLimit / 1024).toFixed(0)} GB
                                </span>
                                <span className="text-sm font-medium text-gray-900 dark:text-white">
                                    {storagePercent}%
                                </span>
                            </div>
                            <div className="h-3 rounded-full bg-gray-100 dark:bg-gray-800">
                                <div
                                    className={`h-3 rounded-full ${storagePercent > 80
                                            ? "bg-red-500"
                                            : storagePercent > 60
                                                ? "bg-yellow-500"
                                                : "bg-green-500"
                                        }`}
                                    style={{ width: `${storagePercent}%` }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Activity Summary */}
                    <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
                        <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                                Activity Summary
                            </h2>
                        </div>
                        <div className="divide-y divide-gray-100 dark:divide-gray-800">
                            <div className="flex items-center justify-between px-6 py-3">
                                <span className="text-sm text-gray-500 dark:text-gray-400">
                                    Total Employees
                                </span>
                                <span className="text-sm font-medium text-gray-900 dark:text-white">
                                    {tenant.totalEmployees}
                                </span>
                            </div>
                            <div className="flex items-center justify-between px-6 py-3">
                                <span className="text-sm text-gray-500 dark:text-gray-400">
                                    API Calls (bulan ini)
                                </span>
                                <span className="text-sm font-medium text-gray-900 dark:text-white">
                                    {tenant.apiCalls.toLocaleString()}
                                </span>
                            </div>
                            <div className="flex items-center justify-between px-6 py-3">
                                <span className="text-sm text-gray-500 dark:text-gray-400">
                                    Login Count (bulan ini)
                                </span>
                                <span className="text-sm font-medium text-gray-900 dark:text-white">
                                    {tenant.loginCount.toLocaleString()}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
                        <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                                Quick Actions
                            </h2>
                        </div>
                        <div className="p-4 space-y-2">
                            <button className="flex w-full items-center gap-3 rounded-lg border border-gray-200 px-4 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800">
                                <Shield className="h-4 w-4 text-blue-500" />
                                Reset Password Admin
                            </button>
                            <button className="flex w-full items-center gap-3 rounded-lg border border-gray-200 px-4 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800">
                                <Activity className="h-4 w-4 text-green-500" />
                                View Audit Log
                            </button>
                            <button className="flex w-full items-center gap-3 rounded-lg border border-gray-200 px-4 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800">
                                <FileText className="h-4 w-4 text-purple-500" />
                                Export Data
                            </button>
                        </div>
                    </div>
                </div>
            </div>

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
