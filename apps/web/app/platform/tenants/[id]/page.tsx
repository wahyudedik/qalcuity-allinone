"use client";

import { useState, useEffect, useCallback } from "react";
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
    Globe,
    MapPin,
    Send,
    ArrowRightLeft,
    TrendingUp,
    TrendingDown,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface TenantUser {
    id: string;
    name: string;
    email: string;
    role: string;
}

interface TenantSubscription {
    id: string;
    plan: string;
    status: string;
    startDate: string;
    endDate: string | null;
    price: number;
}

interface TenantActivity {
    id: string;
    action: string;
    entity: string;
    entityId: string;
    ipAddress: string | null;
    createdAt: string;
}

interface TenantDetail {
    id: string;
    name: string;
    email: string;
    slug: string;
    phone: string | null;
    website: string | null;
    address: string | null;
    status: "active" | "suspended" | "trial" | "cancelled" | "pending_payment";
    plan: string;
    planPrice: number;
    createdAt: string;
    updatedAt: string;
    stats: {
        totalUsers: number;
        totalInvoices: number;
        totalContacts: number;
        totalProducts: number;
    };
    users: TenantUser[];
    subscriptions: TenantSubscription[];
    recentActivity: TenantActivity[];
}

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
        default:
            return (
                <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                    {status}
                </span>
            );
    }
}

function RoleBadge({ role }: { role: string }) {
    switch (role) {
        case "ADMIN":
            return (
                <span className="inline-flex items-center rounded bg-blue-100 px-1.5 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                    Admin
                </span>
            );
        case "MEMBER":
            return (
                <span className="inline-flex items-center rounded bg-green-100 px-1.5 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                    Member
                </span>
            );
        case "VIEWER":
            return (
                <span className="inline-flex items-center rounded bg-gray-100 px-1.5 py-0.5 text-xs font-medium text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                    Viewer
                </span>
            );
        default:
            return (
                <span className="inline-flex items-center rounded bg-gray-100 px-1.5 py-0.5 text-xs font-medium text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                    {role}
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
    const [error, setError] = useState<string | null>(null);
    const [actionLoading, setActionLoading] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
    const [showNotificationModal, setShowNotificationModal] = useState(false);
    const [notificationMessage, setNotificationMessage] = useState("");
    const [notificationSubject, setNotificationSubject] = useState("");
    const [showPlanModal, setShowPlanModal] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState("");
    const [plans, setPlans] = useState<{ id: string; name: string; slug: string; price: number }[]>([]);

    const fetchTenant = useCallback(async () => {
        if (!tenantId) return;
        try {
            setLoading(true);
            setError(null);
            const res = await fetch(`/api/platform/tenants/${tenantId}`);
            const data = await res.json();
            if (data.success && data.data) {
                setTenant(data.data);
            } else {
                setError(data.error || "Gagal mengambil data tenant");
            }
        } catch {
            setError("Gagal menghubungi server");
        } finally {
            setLoading(false);
        }
    }, [tenantId]);

    const fetchPlans = useCallback(async () => {
        try {
            const res = await fetch("/api/platform/plans");
            const data = await res.json();
            if (data.success) {
                setPlans(data.data.map((p: { id: string; name: string; slug: string; priceMonthly: number }) => ({
                    id: p.id,
                    name: p.name,
                    slug: p.slug,
                    price: p.priceMonthly,
                })));
            }
        } catch {
            // Silent fail for plans
        }
    }, []);

    useEffect(() => {
        fetchTenant();
        fetchPlans();
    }, [fetchTenant, fetchPlans]);

    const handleSuspend = async () => {
        if (!tenant) return;
        setActionLoading(true);
        try {
            const res = await fetch(`/api/platform/tenants/${tenant.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: "SUSPENDED" }),
            });
            const data = await res.json();
            if (data.success) {
                setTenant({ ...tenant, status: "suspended", planPrice: 0 });
                setToast({ message: "Tenant berhasil ditangguhkan", type: "success" });
            } else {
                setToast({ message: data.error || "Gagal menangguhkan tenant", type: "error" });
            }
        } catch {
            setToast({ message: "Gagal menghubungi server", type: "error" });
        } finally {
            setActionLoading(false);
        }
    };

    const handleReactivate = async () => {
        if (!tenant) return;
        setActionLoading(true);
        try {
            const res = await fetch(`/api/platform/tenants/${tenant.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: "ACTIVE" }),
            });
            const data = await res.json();
            if (data.success) {
                fetchTenant();
                setToast({ message: "Tenant berhasil diaktifkan kembali", type: "success" });
            } else {
                setToast({ message: data.error || "Gagal mengaktifkan tenant", type: "error" });
            }
        } catch {
            setToast({ message: "Gagal menghubungi server", type: "error" });
        } finally {
            setActionLoading(false);
        }
    };

    const handleSendNotification = async () => {
        if (!notificationSubject || !notificationMessage) {
            setToast({ message: "Subjek dan pesan wajib diisi", type: "error" });
            return;
        }
        setActionLoading(true);
        try {
            // Use the existing email system
            const res = await fetch("/api/platform/tenants/" + tenantId + "/notify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    subject: notificationSubject,
                    message: notificationMessage,
                }),
            });
            const data = await res.json();
            if (data.success) {
                setToast({ message: "Notifikasi berhasil dikirim", type: "success" });
                setShowNotificationModal(false);
                setNotificationMessage("");
                setNotificationSubject("");
            } else {
                setToast({ message: data.error || "Gagal mengirim notifikasi", type: "error" });
            }
        } catch {
            setToast({ message: "Gagal mengirim notifikasi", type: "error" });
        } finally {
            setActionLoading(false);
        }
    };

    const handleChangePlan = async () => {
        if (!selectedPlan || !tenant) return;
        setActionLoading(true);
        try {
            const res = await fetch(`/api/platform/tenants/${tenant.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ currentPlanSlug: selectedPlan }),
            });
            const data = await res.json();
            if (data.success) {
                fetchTenant();
                setShowPlanModal(false);
                setToast({ message: "Plan berhasil diubah", type: "success" });
            } else {
                setToast({ message: data.error || "Gagal mengubah plan", type: "error" });
            }
        } catch {
            setToast({ message: "Gagal mengubah plan", type: "error" });
        } finally {
            setActionLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <RefreshCw className="h-6 w-6 animate-spin text-purple-600" />
            </div>
        );
    }

    if (error || !tenant) {
        return (
            <div className="text-center py-12">
                <Building2 className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600" />
                <p className="mt-4 text-sm font-medium text-gray-900 dark:text-gray-100">
                    {error || "Tenant tidak ditemukan"}
                </p>
                <Link href="/platform/tenants" className="mt-4 inline-block text-sm text-purple-600 hover:text-purple-700">
                    Kembali ke daftar tenant
                </Link>
            </div>
        );
    }

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
                            {tenant.email} · {tenant.plan}
                        </p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setShowNotificationModal(true)}
                        className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                    >
                        <Send className="h-4 w-4" />
                        Send Notification
                    </button>
                    <button
                        onClick={() => {
                            setSelectedPlan(tenant.plan);
                            setShowPlanModal(true);
                        }}
                        className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                    >
                        <ArrowRightLeft className="h-4 w-4" />
                        Change Plan
                    </button>
                    {tenant.status === "active" || tenant.status === "trial" ? (
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
                                {tenant.stats.totalUsers}
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
                                {tenant.planPrice > 0 ? formatRupiah(tenant.planPrice) : "-"}
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
                                {tenant.stats.totalInvoices.toLocaleString()}
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
                                {tenant.stats.totalProducts}
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
                            { icon: Globe, label: "Website", value: tenant.website || "-" },
                            { icon: MapPin, label: "Alamat", value: tenant.address || "-" },
                            { icon: CreditCard, label: "Plan", value: tenant.plan },
                            { icon: Calendar, label: "Terdaftar", value: new Date(tenant.createdAt).toLocaleDateString("id-ID", { year: "numeric", month: "long", day: "numeric" }) },
                            { icon: Clock, label: "Terakhir Update", value: new Date(tenant.updatedAt).toLocaleDateString("id-ID", { year: "numeric", month: "long", day: "numeric" }) },
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

                {/* Users + Subscriptions + Activity */}
                <div className="space-y-6">
                    {/* Users List */}
                    <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
                        <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                                Users ({tenant.users.length})
                            </h2>
                        </div>
                        <div className="divide-y divide-gray-100 dark:divide-gray-800">
                            {tenant.users.length === 0 ? (
                                <div className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                                    Belum ada user
                                </div>
                            ) : (
                                tenant.users.map((user) => (
                                    <div key={user.id} className="flex items-center justify-between px-6 py-3">
                                        <div>
                                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                                {user.name}
                                            </p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                                {user.email}
                                            </p>
                                        </div>
                                        <RoleBadge role={user.role} />
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Subscriptions */}
                    <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
                        <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                                Subscriptions & Billing
                            </h2>
                        </div>
                        <div className="divide-y divide-gray-100 dark:divide-gray-800">
                            {tenant.subscriptions.length === 0 ? (
                                <div className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                                    Belum ada subscription
                                </div>
                            ) : (
                                tenant.subscriptions.map((sub) => (
                                    <div key={sub.id} className="px-6 py-3">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                                    {sub.plan}
                                                </p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                                    {new Date(sub.startDate).toLocaleDateString("id-ID")} - {sub.endDate ? new Date(sub.endDate).toLocaleDateString("id-ID") : "Berlangsung"}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${sub.status === "ACTIVE"
                                                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                                    : sub.status === "TRIAL"
                                                        ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                                                        : sub.status === "SUSPENDED"
                                                            ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                                            : "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
                                                    }`}>
                                                    {sub.status}
                                                </span>
                                                <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                                                    {sub.price > 0 ? formatRupiah(sub.price) : "Free"}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Recent Activity */}
                    <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
                        <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                                Recent Activity
                            </h2>
                        </div>
                        <div className="divide-y divide-gray-100 dark:divide-gray-800">
                            {tenant.recentActivity.length === 0 ? (
                                <div className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                                    Belum ada aktivitas
                                </div>
                            ) : (
                                tenant.recentActivity.map((log) => (
                                    <div key={log.id} className="flex items-start gap-3 px-6 py-3">
                                        <div className="mt-0.5 rounded-full bg-gray-100 p-1.5 dark:bg-gray-800">
                                            <Activity className="h-3 w-3 text-gray-500 dark:text-gray-400" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm text-gray-900 dark:text-gray-100">
                                                <span className="font-medium">{log.action}</span>
                                                {" "}on {log.entity}
                                            </p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                                {log.ipAddress && `IP: ${log.ipAddress} · `}
                                                {new Date(log.createdAt).toLocaleString("id-ID")}
                                            </p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
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
                <div className="flex flex-wrap gap-3 p-4">
                    <button
                        onClick={() => setShowNotificationModal(true)}
                        className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                    >
                        <Send className="h-4 w-4 text-blue-500" />
                        Send Notification
                    </button>
                    <button
                        onClick={() => setShowPlanModal(true)}
                        className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                    >
                        <ArrowRightLeft className="h-4 w-4 text-purple-500" />
                        Change Plan
                    </button>
                    <button className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800">
                        <Shield className="h-4 w-4 text-orange-500" />
                        Reset Password Admin
                    </button>
                    <Link
                        href="/platform/monitoring"
                        className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                    >
                        <Activity className="h-4 w-4 text-green-500" />
                        View Audit Log
                    </Link>
                    <button className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800">
                        <FileText className="h-4 w-4 text-purple-500" />
                        Export Data
                    </button>
                </div>
            </div>

            {/* Notification Modal */}
            {showNotificationModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-gray-800">
                        <div className="mb-6 flex items-center justify-between">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                                Kirim Notifikasi
                            </h2>
                            <button
                                onClick={() => setShowNotificationModal(false)}
                                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                            >
                                ×
                            </button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Kepada
                                </label>
                                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                    {tenant.email}
                                </p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Subjek *
                                </label>
                                <input
                                    type="text"
                                    value={notificationSubject}
                                    onChange={(e) => setNotificationSubject(e.target.value)}
                                    placeholder="Subjek notifikasi..."
                                    className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Pesan *
                                </label>
                                <textarea
                                    value={notificationMessage}
                                    onChange={(e) => setNotificationMessage(e.target.value)}
                                    rows={4}
                                    placeholder="Tulis pesan notifikasi..."
                                    className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                                />
                            </div>
                            <div className="flex justify-end gap-2">
                                <button
                                    onClick={() => setShowNotificationModal(false)}
                                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                                >
                                    Batal
                                </button>
                                <button
                                    onClick={handleSendNotification}
                                    disabled={actionLoading || !notificationSubject || !notificationMessage}
                                    className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50"
                                >
                                    {actionLoading ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <Send className="h-4 w-4" />
                                    )}
                                    Kirim
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Change Plan Modal */}
            {showPlanModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-gray-800">
                        <div className="mb-6 flex items-center justify-between">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                                Ubah Plan
                            </h2>
                            <button
                                onClick={() => setShowPlanModal(false)}
                                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                            >
                                ×
                            </button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Plan Saat Ini
                                </label>
                                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                    {tenant.plan}
                                </p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Plan Baru
                                </label>
                                <select
                                    value={selectedPlan}
                                    onChange={(e) => setSelectedPlan(e.target.value)}
                                    className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                                >
                                    {plans.map((plan) => (
                                        <option key={plan.slug} value={plan.slug}>
                                            {plan.name} - {plan.price > 0 ? formatRupiah(plan.price) : "Free"}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex justify-end gap-2">
                                <button
                                    onClick={() => setShowPlanModal(false)}
                                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                                >
                                    Batal
                                </button>
                                <button
                                    onClick={handleChangePlan}
                                    disabled={actionLoading || !selectedPlan || selectedPlan === tenant.plan}
                                    className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50"
                                >
                                    {actionLoading ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <ArrowRightLeft className="h-4 w-4" />
                                    )}
                                    Ubah Plan
                                </button>
                            </div>
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
