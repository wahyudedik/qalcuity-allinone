"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "@/lib/i18n";
import {
    CreditCard,
    TrendingUp,
    TrendingDown,
    CheckCircle2,
    Clock,
    XCircle,
    RefreshCw,
    Plus,
    Edit3,
    Trash2,
    Save,
    X,
    Users,
    Package,
    Loader2,
    AlertTriangle,
    Download,
    Search,
    ChevronLeft,
    ChevronRight,
    DollarSign,
    BarChart3,
} from "lucide-react";
import { exportToCSV } from "@/lib/export";

// ─── Types ────────────────────────────────────────────────────────────────────
interface PlanFeature {
    id: string;
    featureKey: string;
    enabled: boolean;
    limit: number | null;
}

interface Plan {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    priceMonthly: number;
    priceYearly: number | null;
    maxUsers: number;
    maxStorage: number | null;
    isActive: boolean;
    sortOrder: number;
    features: PlanFeature[];
    tenantCount: number;
    createdAt: string;
    updatedAt: string;
}

interface BillingOverview {
    mrr: number;
    arr: number;
    churnRate: number;
    totalActiveSubscriptions: number;
    totalTenants: number;
    totalOverdueAmount: number;
    overdueCount: number;
}

interface PaymentRecord {
    id: string;
    invoiceNumber: string;
    tenantName: string;
    tenantEmail: string;
    amount: number;
    status: string;
    dueDate: string | null;
    createdAt: string;
}

interface OverdueInvoice {
    id: string;
    invoiceNumber: string;
    tenantName: string;
    amount: number;
    dueDate: string | null;
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

function PaymentStatusBadge({ status }: { status: string }) {
    switch (status.toUpperCase()) {
        case "PAID":
            return (
                <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                    <CheckCircle2 className="h-3 w-3" />
                    Paid
                </span>
            );
        case "UNPAID":
        case "PARTIAL":
            return (
                <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
                    <Clock className="h-3 w-3" />
                    {status}
                </span>
            );
        case "OVERDUE":
            return (
                <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400">
                    <XCircle className="h-3 w-3" />
                    Overdue
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

const FEATURE_LABELS: Record<string, string> = {
    "finance.invoices": "Invoices",
    "finance.payments": "Payments",
    "finance.purchase-orders": "Purchase Orders",
    "finance.journal-entries": "Journal Entries",
    "finance.reports": "Finance Reports",
    "finance.reconciliation": "Reconciliation",
    "crm.contacts": "Contacts",
    "crm.leads": "Leads",
    "crm.deals": "Deals",
    "crm.pipeline": "Pipeline",
    "inventory.products": "Products",
    "inventory.stock": "Stock Management",
    "inventory.suppliers": "Suppliers",
    "inventory.categories": "Categories",
    "hr.employees": "Employees",
    "hr.attendance": "Attendance",
    "hr.leaves": "Leave Management",
    "hr.payroll": "Payroll",
    "ai.chat": "AI Chat",
    "ai.document-extraction": "Document Extraction",
    "ai.predictions": "Predictions",
    "integration.whatsapp": "WhatsApp",
    "integration.email": "Email",
    "integration.payment": "Payment Gateway",
    "platform.admin": "Platform Admin",
    "platform.billing": "Billing Management",
    "platform.monitoring": "Monitoring",
};

const FEATURE_GROUPS = [
    { label: "Finance", keys: ["finance.invoices", "finance.payments", "finance.purchase-orders", "finance.journal-entries", "finance.reports", "finance.reconciliation"] },
    { label: "CRM", keys: ["crm.contacts", "crm.leads", "crm.deals", "crm.pipeline"] },
    { label: "Inventory", keys: ["inventory.products", "inventory.stock", "inventory.suppliers", "inventory.categories"] },
    { label: "HR", keys: ["hr.employees", "hr.attendance", "hr.leaves", "hr.payroll"] },
    { label: "AI", keys: ["ai.chat", "ai.document-extraction", "ai.predictions"] },
    { label: "Integrations", keys: ["integration.whatsapp", "integration.email", "integration.payment"] },
    { label: "Platform", keys: ["platform.admin", "platform.billing", "platform.monitoring"] },
];

type BillingTab = "overview" | "plans" | "payments" | "overdue";

// ─── Main Component ───────────────────────────────────────────────────────────
export default function PlatformBillingPage() {
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState<BillingTab>("overview");
    const [loading, setLoading] = useState(true);

    // Billing overview state
    const [billing, setBilling] = useState<BillingOverview | null>(null);

    // Plans state
    const [plans, setPlans] = useState<Plan[]>([]);
    const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

    // Payment history state
    const [payments, setPayments] = useState<PaymentRecord[]>([]);
    const [paymentsPagination, setPaymentsPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
    const [paymentFilter, setPaymentFilter] = useState("");
    const [paymentPage, setPaymentPage] = useState(1);
    const [overdueInvoices, setOverdueInvoices] = useState<OverdueInvoice[]>([]);

    // Form state
    const [formName, setFormName] = useState("");
    const [formSlug, setFormSlug] = useState("");
    const [formDescription, setFormDescription] = useState("");
    const [formPriceMonthly, setFormPriceMonthly] = useState(0);
    const [formPriceYearly, setFormPriceYearly] = useState<number | null>(null);
    const [formMaxUsers, setFormMaxUsers] = useState(5);
    const [formMaxStorage, setFormMaxStorage] = useState<number | null>(null);
    const [formFeatures, setFormFeatures] = useState<Record<string, { enabled: boolean; limit: number | null }>>({});

    const fetchBilling = useCallback(async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (paymentFilter) params.set("status", paymentFilter);
            params.set("page", String(paymentPage));
            params.set("limit", "20");

            const res = await fetch(`/api/platform/billing?${params.toString()}`);
            const data = await res.json();
            if (data.success && data.data) {
                setBilling(data.data.overview);
                setPayments(data.data.paymentHistory);
                setPaymentsPagination(data.data.pagination);
                setOverdueInvoices(data.data.overdueInvoices);
            }
        } catch {
            console.error("Error fetching billing data");
        } finally {
            setLoading(false);
        }
    }, [paymentFilter, paymentPage]);

    const fetchPlans = useCallback(async () => {
        try {
            const res = await fetch("/api/platform/plans");
            const data = await res.json();
            if (data.success) {
                setPlans(data.data);
            }
        } catch {
            console.error("Error fetching plans");
        }
    }, []);

    useEffect(() => {
        fetchBilling();
    }, [fetchBilling]);

    useEffect(() => {
        fetchPlans();
    }, [fetchPlans]);

    const initFormFeatures = (plan?: Plan) => {
        const features: Record<string, { enabled: boolean; limit: number | null }> = {};
        for (const group of FEATURE_GROUPS) {
            for (const key of group.keys) {
                const existing = plan?.features.find((f) => f.featureKey === key);
                features[key] = {
                    enabled: existing?.enabled ?? false,
                    limit: existing?.limit ?? null,
                };
            }
        }
        setFormFeatures(features);
    };

    const handleCreate = () => {
        setEditingPlan(null);
        setFormName("");
        setFormSlug("");
        setFormDescription("");
        setFormPriceMonthly(0);
        setFormPriceYearly(null);
        setFormMaxUsers(5);
        setFormMaxStorage(null);
        initFormFeatures();
        setShowCreateForm(true);
    };

    const handleEdit = (plan: Plan) => {
        setEditingPlan(plan);
        setFormName(plan.name);
        setFormSlug(plan.slug);
        setFormDescription(plan.description || "");
        setFormPriceMonthly(plan.priceMonthly);
        setFormPriceYearly(plan.priceYearly);
        setFormMaxUsers(plan.maxUsers);
        setFormMaxStorage(plan.maxStorage);
        initFormFeatures(plan);
        setShowCreateForm(true);
    };

    const handleSave = async () => {
        if (!formName || !formSlug) {
            setMessage({ type: "error", text: t('platform.billingPage.validationNameSlugRequired') });
            return;
        }

        setSaving(true);
        try {
            const features = Object.entries(formFeatures).map(([featureKey, f]) => ({
                featureKey,
                enabled: f.enabled,
                limit: f.limit,
            }));

            const body = {
                name: formName,
                slug: formSlug,
                description: formDescription || null,
                priceMonthly: formPriceMonthly,
                priceYearly: formPriceYearly,
                maxUsers: formMaxUsers,
                maxStorage: formMaxStorage,
                features,
            };

            const url = editingPlan ? `/api/admin/plans/${editingPlan.id}` : "/api/admin/plans";
            const method = editingPlan ? "PUT" : "POST";

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });

            const data = await res.json();
            if (data.success) {
                setMessage({ type: "success", text: data.message || t('platform.billingPage.successSaved') });
                setShowCreateForm(false);
                fetchPlans();
            } else {
                setMessage({ type: "error", text: data.error || t('platform.billingPage.errorSave') });
            }
        } catch {
            setMessage({ type: "error", text: t('platform.billingPage.errorSave') });
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (plan: Plan) => {
        if (!confirm(`${t('platform.billingPage.confirmDelete')} "${plan.name}"?`)) return;

        try {
            const res = await fetch(`/api/admin/plans/${plan.id}`, { method: "DELETE" });
            const data = await res.json();
            if (data.success) {
                setMessage({ type: "success", text: data.message });
                fetchPlans();
            } else {
                setMessage({ type: "error", text: data.error });
            }
        } catch {
            setMessage({ type: "error", text: t('platform.billingPage.errorDelete') });
        }
    };

    const toggleFeature = (key: string) => {
        setFormFeatures((prev) => ({
            ...prev,
            [key]: { ...prev[key], enabled: !prev[key].enabled },
        }));
    };

    const setFeatureLimit = (key: string, limit: number | null) => {
        setFormFeatures((prev) => ({
            ...prev,
            [key]: { ...prev[key], limit },
        }));
    };

    const handleExportPayments = () => {
        const exportData = payments.map((p) => ({
            invoiceNumber: p.invoiceNumber,
            tenantName: p.tenantName,
            tenantEmail: p.tenantEmail,
            amount: p.amount,
            status: p.status,
            dueDate: p.dueDate || "",
            createdAt: p.createdAt,
        }));
        exportToCSV(exportData, `billing-payments-${new Date().toISOString().split("T")[0]}`);
        setMessage({ type: "success", text: t('platform.billingPage.exportSuccess') });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            </div>
        );
    }

    const tabs: { id: BillingTab; label: string; icon: React.ElementType }[] = [
        { id: "overview", label: t('platform.billingPage.tabOverview'), icon: BarChart3 },
        { id: "plans", label: t('platform.billingPage.tabPlans'), icon: Package },
        { id: "payments", label: t('platform.billingPage.tabPayments'), icon: CreditCard },
        { id: "overdue", label: t('platform.billingPage.tabOverdue'), icon: AlertTriangle },
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                        {t('platform.billingPage.title')}
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        {t('platform.billingPage.subtitle')}
                    </p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => { fetchBilling(); fetchPlans(); }}
                        className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                    >
                        <RefreshCw className="h-4 w-4" />
                        {t('platform.billingPage.refresh')}
                    </button>
                </div>
            </div>

            {/* Message */}
            {message && (
                <div
                    className={`rounded-lg p-4 ${message.type === "success"
                        ? "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                        : "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400"
                        }`}
                >
                    {message.text}
                    <button
                        onClick={() => setMessage(null)}
                        className="ml-2 font-bold"
                    >
                        ×
                    </button>
                </div>
            )}

            {/* Tabs */}
            <div className="flex gap-1 rounded-lg border border-gray-200 bg-gray-50 p-1 dark:border-gray-700 dark:bg-gray-800">
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition ${activeTab === tab.id
                                ? "bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white"
                                : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                                }`}
                        >
                            <Icon className="h-4 w-4" />
                            {tab.label}
                            {tab.id === "overdue" && overdueInvoices.length > 0 && (
                                <span className="ml-1 rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-600 dark:bg-red-900/30 dark:text-red-400">
                                    {overdueInvoices.length}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Tab Content */}
            {activeTab === "overview" && billing && (
                <div className="space-y-6">
                    {/* Revenue Stats */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                        MRR
                                    </p>
                                    <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
                                        {formatRupiah(billing.mrr)}
                                    </p>
                                    <p className="mt-1 flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                                        <TrendingUp className="h-3 w-3" />
                                        {t('platform.billingPage.monthlyRecurringRevenue')}
                                    </p>
                                </div>
                                <div className="rounded-lg bg-green-100 p-3 dark:bg-green-900/30">
                                    <DollarSign className="h-6 w-6 text-green-600 dark:text-green-400" />
                                </div>
                            </div>
                        </div>
                        <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                        ARR
                                    </p>
                                    <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
                                        {formatRupiah(billing.arr)}
                                    </p>
                                    <p className="mt-1 flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                                        <TrendingUp className="h-3 w-3" />
                                        {t('platform.billingPage.annualRecurringRevenue')}
                                    </p>
                                </div>
                                <div className="rounded-lg bg-blue-100 p-3 dark:bg-blue-900/30">
                                    <BarChart3 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                                </div>
                            </div>
                        </div>
                        <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                        {t('platform.billingPage.churnRate')}
                                    </p>
                                    <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
                                        {billing.churnRate}%
                                    </p>
                                    <p className="mt-1 flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                                        <TrendingDown className="h-3 w-3" />
                                        {t('platform.billingPage.last30Days')}
                                    </p>
                                </div>
                                <div className="rounded-lg bg-yellow-100 p-3 dark:bg-yellow-900/30">
                                    <Users className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                                </div>
                            </div>
                        </div>
                        <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                        {t('platform.billingPage.activeSubscriptions')}
                                    </p>
                                    <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
                                        {billing.totalActiveSubscriptions}
                                    </p>
                                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                        {t('platform.billingPage.fromTenants')} {billing.totalTenants}
                                    </p>
                                </div>
                                <div className="rounded-lg bg-purple-100 p-3 dark:bg-purple-900/30">
                                    <CreditCard className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Overdue Alert */}
                    {billing.overdueCount > 0 && (
                        <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
                            <div className="flex items-center gap-3">
                                <AlertTriangle className="h-5 w-5 text-red-500" />
                                <div>
                                    <p className="text-sm font-semibold text-red-800 dark:text-red-300">
                                        {billing.overdueCount} {t('platform.billingPage.overdueCount')}
                                    </p>
                                    <p className="text-xs text-red-600 dark:text-red-400">
                                        {t('platform.billingPage.overdueTotalAttention')} {formatRupiah(billing.totalOverdueAmount)}
                                    </p>
                                </div>
                                <button
                                    onClick={() => setActiveTab("overdue")}
                                    className="ml-auto rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700"
                                >
                                    {t('platform.billingPage.viewDetail')}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {activeTab === "plans" && (
                <div className="space-y-6">
                    <div className="flex justify-end">
                        <button
                            onClick={handleCreate}
                            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                        >
                            <Plus className="h-4 w-4" />
                            {t('platform.billingPage.createPlan')}
                        </button>
                    </div>

                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {plans.map((plan) => (
                            <div
                                key={plan.id}
                                className={`relative rounded-xl border-2 p-6 ${plan.isActive
                                    ? "border-blue-200 bg-white dark:border-blue-800 dark:bg-gray-800"
                                    : "border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900 opacity-60"
                                    }`}
                            >
                                <div className="mb-4">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                                            {plan.name}
                                        </h3>
                                        <span
                                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${plan.isActive
                                                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                                : "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
                                                }`}
                                        >
                                            {plan.isActive ? t('platform.billingPage.active') : t('platform.billingPage.inactive')}
                                        </span>
                                    </div>
                                    {plan.description && (
                                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                            {plan.description}
                                        </p>
                                    )}
                                </div>

                                <div className="mb-4">
                                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                                        {plan.priceMonthly === 0
                                            ? t('platform.billingPage.free')
                                            : formatRupiah(plan.priceMonthly)}
                                        {plan.priceMonthly > 0 && (
                                            <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
                                                {t('platform.billingPage.perMonth')}
                                            </span>
                                        )}
                                    </div>
                                    {plan.priceYearly && (
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                            {t('platform.billingPage.yearly')}: {formatRupiah(plan.priceYearly)} ({t('platform.billingPage.savePercent')}{" "}
                                            {Math.round(
                                                ((plan.priceMonthly * 12 - plan.priceYearly) /
                                                    (plan.priceMonthly * 12)) *
                                                100
                                            )}
                                            %)
                                        </p>
                                    )}
                                </div>

                                <div className="mb-4 space-y-2 text-sm">
                                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                                        <Users className="h-4 w-4" />
                                        <span>
                                            {plan.maxUsers === -1
                                                ? t('platform.billingPage.unlimited')
                                                : `${plan.maxUsers} users`}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                                        <Package className="h-4 w-4" />
                                        <span>
                                            {plan.maxStorage
                                                ? `${plan.maxStorage} MB storage`
                                                : t('platform.billingPage.unlimitedStorage')}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                                        <CreditCard className="h-4 w-4" />
                                        <span>{plan.tenantCount} {t('platform.billingPage.activeTenant')}</span>
                                    </div>
                                </div>

                                <div className="mb-4">
                                    <p className="mb-2 text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                                        {t('platform.billingPage.featuresLabel')}
                                    </p>
                                    <div className="flex flex-wrap gap-1">
                                        {plan.features
                                            .filter((f) => f.enabled)
                                            .slice(0, 6)
                                            .map((f) => (
                                                <span
                                                    key={f.id}
                                                    className="inline-flex items-center gap-1 rounded bg-blue-50 px-1.5 py-0.5 text-xs text-blue-700 dark:bg-blue-900/20 dark:text-blue-400"
                                                >
                                                    <CheckCircle2 className="h-3 w-3" />
                                                    {FEATURE_LABELS[f.featureKey] || f.featureKey}
                                                </span>
                                            ))}
                                        {plan.features.filter((f) => f.enabled).length > 6 && (
                                            <span className="text-xs text-gray-500">
                                                {t('platform.billingPage.andMore')} {plan.features.filter((f) => f.enabled).length - 6}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleEdit(plan)}
                                        className="flex-1 inline-flex items-center justify-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                                    >
                                        <Edit3 className="h-4 w-4" />
                                        Edit
                                    </button>
                                    <button
                                        onClick={() => handleDelete(plan)}
                                        className="inline-flex items-center justify-center rounded-lg border border-red-300 bg-white px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 dark:border-red-700 dark:bg-gray-700 dark:text-red-400 dark:hover:bg-red-900/20"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {activeTab === "payments" && (
                <div className="space-y-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex gap-2">
                            <select
                                value={paymentFilter}
                                onChange={(e) => { setPaymentFilter(e.target.value); setPaymentPage(1); }}
                                className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-700 focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
                            >
                                <option value="">{t('platform.billingPage.allStatus')}</option>
                                <option value="PAID">Paid</option>
                                <option value="UNPAID">Unpaid</option>
                                <option value="PARTIAL">Partial</option>
                                <option value="OVERDUE">Overdue</option>
                            </select>
                        </div>
                        <button
                            onClick={handleExportPayments}
                            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                        >
                            <Download className="h-4 w-4" />
                            Export CSV
                        </button>
                    </div>

                    {/* Desktop Table */}
                    <div className="hidden md:block overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
                                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                        Invoice
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                        Tenant
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                        Amount
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                        Status
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                        Due Date
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                        Created
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                {payments.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                                            {t('platform.billingPage.noPaymentData')}
                                        </td>
                                    </tr>
                                ) : (
                                    payments.map((payment) => (
                                        <tr key={payment.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                            <td className="px-4 py-3">
                                                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                                    {payment.invoiceNumber}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div>
                                                    <p className="text-sm text-gray-900 dark:text-gray-100">
                                                        {payment.tenantName}
                                                    </p>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                                        {payment.tenantEmail}
                                                    </p>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                                    {formatRupiah(payment.amount)}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <PaymentStatusBadge status={payment.status} />
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="text-sm text-gray-500 dark:text-gray-400">
                                                    {payment.dueDate
                                                        ? new Date(payment.dueDate).toLocaleDateString("id-ID")
                                                        : "-"}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="text-sm text-gray-500 dark:text-gray-400">
                                                    {new Date(payment.createdAt).toLocaleDateString("id-ID")}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile Cards */}
                    <div className="space-y-3 md:hidden">
                        {payments.length === 0 ? (
                            <div className="rounded-xl border border-gray-200 bg-white py-8 text-center dark:border-gray-700 dark:bg-gray-900">
                                <CreditCard className="mx-auto h-8 w-8 text-gray-300 dark:text-gray-600" />
                                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                                    {t('platform.billingPage.noPaymentData')}
                                </p>
                            </div>
                        ) : (
                            payments.map((payment) => (
                                <div
                                    key={payment.id}
                                    className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900"
                                >
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                                {payment.invoiceNumber}
                                            </p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                                {payment.tenantName}
                                            </p>
                                        </div>
                                        <PaymentStatusBadge status={payment.status} />
                                    </div>
                                    <div className="mt-3 flex items-center justify-between">
                                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                            {formatRupiah(payment.amount)}
                                        </span>
                                        <span className="text-xs text-gray-500 dark:text-gray-400">
                                            {payment.dueDate
                                                ? `Due: ${new Date(payment.dueDate).toLocaleDateString("id-ID")}`
                                                : new Date(payment.createdAt).toLocaleDateString("id-ID")}
                                        </span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Pagination */}
                    {paymentsPagination.totalPages > 1 && (
                        <div className="flex items-center justify-between">
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                {t('platform.billingPage.paginationOf')} {paymentPage} {t('platform.billingPage.paginationOf')} {paymentsPagination.totalPages} · {paymentsPagination.total}
                            </p>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setPaymentPage((p) => Math.max(1, p - 1))}
                                    disabled={paymentPage === 1}
                                    className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                    {t('platform.billingPage.prev')}
                                </button>
                                <button
                                    onClick={() => setPaymentPage((p) => Math.min(paymentsPagination.totalPages, p + 1))}
                                    disabled={paymentPage === paymentsPagination.totalPages}
                                    className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
                                >
                                    {t('platform.billingPage.next')}
                                    <ChevronRight className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {activeTab === "overdue" && (
                <div className="space-y-4">
                    {overdueInvoices.length === 0 ? (
                        <div className="rounded-xl border border-gray-200 bg-white py-12 text-center dark:border-gray-700 dark:bg-gray-900">
                            <CheckCircle2 className="mx-auto h-12 w-12 text-green-400" />
                            <p className="mt-4 text-sm font-medium text-gray-900 dark:text-gray-100">
                                {t('platform.billingPage.noOverdue')}
                            </p>
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                {t('platform.billingPage.allOnTime')}
                            </p>
                        </div>
                    ) : (
                        <>
                            <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
                                <div className="flex items-center gap-3">
                                    <AlertTriangle className="h-5 w-5 text-red-500" />
                                    <div>
                                        <p className="text-sm font-semibold text-red-800 dark:text-red-300">
                                            {overdueInvoices.length} invoice overdue — total {formatRupiah(
                                                overdueInvoices.reduce((sum, inv) => sum + inv.amount, 0)
                                            )}
                                        </p>
                                        <p className="text-xs text-red-600 dark:text-red-400">
                                            {t('platform.billingPage.needsAttention')}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
                                            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                                Invoice
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                                Tenant
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                                Amount
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                                Due Date
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                        {overdueInvoices.map((inv) => (
                                            <tr key={inv.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                                <td className="px-4 py-3">
                                                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                                        {inv.invoiceNumber}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className="text-sm text-gray-700 dark:text-gray-300">
                                                        {inv.tenantName}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className="text-sm font-medium text-red-600 dark:text-red-400">
                                                        {formatRupiah(inv.amount)}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className="text-sm text-red-600 dark:text-red-400">
                                                        {inv.dueDate
                                                            ? new Date(inv.dueDate).toLocaleDateString("id-ID")
                                                            : "-"}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* Create/Edit Modal */}
            {showCreateForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl dark:bg-gray-800">
                        <div className="mb-6 flex items-center justify-between">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                                {editingPlan ? t('platform.billingPage.editPlan') : t('platform.billingPage.createNewPlan')}
                            </h2>
                            <button
                                onClick={() => setShowCreateForm(false)}
                                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                        {t('platform.billingPage.form.name')}
                                    </label>
                                    <input
                                        type="text"
                                        value={formName}
                                        onChange={(e) => setFormName(e.target.value)}
                                        className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                        {t('platform.billingPage.form.slug')}
                                    </label>
                                    <input
                                        type="text"
                                        value={formSlug}
                                        onChange={(e) => setFormSlug(e.target.value)}
                                        className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    {t('platform.billingPage.form.description')}
                                </label>
                                <textarea
                                    value={formDescription}
                                    onChange={(e) => setFormDescription(e.target.value)}
                                    rows={2}
                                    className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                                />
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                        {t('platform.billingPage.form.priceMonthly')}
                                    </label>
                                    <input
                                        type="number"
                                        value={formPriceMonthly}
                                        onChange={(e) => setFormPriceMonthly(Number(e.target.value))}
                                        className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                        {t('platform.billingPage.form.priceYearly')}
                                    </label>
                                    <input
                                        type="number"
                                        value={formPriceYearly ?? ""}
                                        onChange={(e) =>
                                            setFormPriceYearly(
                                                e.target.value ? Number(e.target.value) : null
                                            )
                                        }
                                        className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                        {t('platform.billingPage.form.maxUsers')}
                                    </label>
                                    <input
                                        type="number"
                                        value={formMaxUsers}
                                        onChange={(e) => setFormMaxUsers(Number(e.target.value))}
                                        className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    {t('platform.billingPage.form.features')}
                                </label>
                                <div className="space-y-3 max-h-[300px] overflow-y-auto rounded-lg border border-gray-200 p-3 dark:border-gray-600">
                                    {FEATURE_GROUPS.map((group) => (
                                        <div key={group.label}>
                                            <p className="mb-1 text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
                                                {group.label}
                                            </p>
                                            <div className="space-y-1">
                                                {group.keys.map((key) => (
                                                    <div
                                                        key={key}
                                                        className="flex items-center justify-between rounded px-2 py-1 hover:bg-gray-50 dark:hover:bg-gray-700"
                                                    >
                                                        <label className="flex items-center gap-2 text-sm">
                                                            <input
                                                                type="checkbox"
                                                                checked={
                                                                    formFeatures[key]?.enabled ?? false
                                                                }
                                                                onChange={() => toggleFeature(key)}
                                                                className="rounded"
                                                            />
                                                            {FEATURE_LABELS[key] || key}
                                                        </label>
                                                        {formFeatures[key]?.enabled && (
                                                            <input
                                                                type="number"
                                                                placeholder="∞"
                                                                value={
                                                                    formFeatures[key]?.limit ?? ""
                                                                }
                                                                onChange={(e) =>
                                                                    setFeatureLimit(
                                                                        key,
                                                                        e.target.value
                                                                            ? Number(e.target.value)
                                                                            : null
                                                                    )
                                                                }
                                                                className="w-20 rounded border border-gray-300 px-2 py-0.5 text-xs dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                                                            />
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="flex justify-end gap-2">
                                <button
                                    onClick={() => setShowCreateForm(false)}
                                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                                >
                                    {t('platform.billingPage.form.cancel')}
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                                >
                                    {saving ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <Save className="h-4 w-4" />
                                    )}
                                    {editingPlan ? t('platform.billingPage.form.update') : t('platform.billingPage.form.create')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
