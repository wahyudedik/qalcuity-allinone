"use client";

import { useState, useEffect, useCallback } from "react";
import {
    CreditCard,
    TrendingUp,
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
} from "lucide-react";

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

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatRupiah(amount: number): string {
    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
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

// ─── Main Component ───────────────────────────────────────────────────────────
export default function PlatformBillingPage() {
    const [plans, setPlans] = useState<Plan[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

    // Form state
    const [formName, setFormName] = useState("");
    const [formSlug, setFormSlug] = useState("");
    const [formDescription, setFormDescription] = useState("");
    const [formPriceMonthly, setFormPriceMonthly] = useState(0);
    const [formPriceYearly, setFormPriceYearly] = useState<number | null>(null);
    const [formMaxUsers, setFormMaxUsers] = useState(5);
    const [formMaxStorage, setFormMaxStorage] = useState<number | null>(null);
    const [formFeatures, setFormFeatures] = useState<Record<string, { enabled: boolean; limit: number | null }>>({});

    const fetchPlans = useCallback(async () => {
        try {
            setLoading(true);
            const res = await fetch("/api/admin/plans");
            const data = await res.json();
            if (data.success) {
                setPlans(data.data);
            }
        } catch {
            console.error("Error fetching plans");
        } finally {
            setLoading(false);
        }
    }, []);

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
            setMessage({ type: "error", text: "Nama dan slug wajib diisi" });
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
                setMessage({ type: "success", text: data.message || "Paket berhasil disimpan" });
                setShowCreateForm(false);
                fetchPlans();
            } else {
                setMessage({ type: "error", text: data.error || "Gagal menyimpan paket" });
            }
        } catch {
            setMessage({ type: "error", text: "Gagal menyimpan paket" });
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (plan: Plan) => {
        if (!confirm(`Hapus paket "${plan.name}"?`)) return;

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
            setMessage({ type: "error", text: "Gagal menghapus paket" });
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

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                        Plan Management
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Kelola paket langganan dan entitlement tenants
                    </p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={fetchPlans}
                        className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                    >
                        <RefreshCw className="h-4 w-4" />
                        Refresh
                    </button>
                    <button
                        onClick={handleCreate}
                        className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                    >
                        <Plus className="h-4 w-4" />
                        Buat Plan
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

            {/* Plans Grid */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {plans.map((plan) => (
                    <div
                        key={plan.id}
                        className={`relative rounded-xl border-2 p-6 ${plan.isActive
                                ? "border-blue-200 bg-white dark:border-blue-800 dark:bg-gray-800"
                                : "border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900 opacity-60"
                            }`}
                    >
                        {/* Plan Header */}
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
                                    {plan.isActive ? "Active" : "Inactive"}
                                </span>
                            </div>
                            {plan.description && (
                                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                    {plan.description}
                                </p>
                            )}
                        </div>

                        {/* Pricing */}
                        <div className="mb-4">
                            <div className="text-2xl font-bold text-gray-900 dark:text-white">
                                {plan.priceMonthly === 0
                                    ? "Gratis"
                                    : formatRupiah(plan.priceMonthly)}
                                {plan.priceMonthly > 0 && (
                                    <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
                                        /bulan
                                    </span>
                                )}
                            </div>
                            {plan.priceYearly && (
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    Tahunan: {formatRupiah(plan.priceYearly)} (hemat{" "}
                                    {Math.round(
                                        ((plan.priceMonthly * 12 - plan.priceYearly) /
                                            (plan.priceMonthly * 12)) *
                                        100
                                    )}
                                    %)
                                </p>
                            )}
                        </div>

                        {/* Limits */}
                        <div className="mb-4 space-y-2 text-sm">
                            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                                <Users className="h-4 w-4" />
                                <span>
                                    {plan.maxUsers === -1
                                        ? "Unlimited"
                                        : `${plan.maxUsers} users`}
                                </span>
                            </div>
                            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                                <Package className="h-4 w-4" />
                                <span>
                                    {plan.maxStorage
                                        ? `${plan.maxStorage} MB storage`
                                        : "Unlimited storage"}
                                </span>
                            </div>
                            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                                <CreditCard className="h-4 w-4" />
                                <span>{plan.tenantCount} tenant aktif</span>
                            </div>
                        </div>

                        {/* Features Summary */}
                        <div className="mb-4">
                            <p className="mb-2 text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                                Features
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
                                        +{plan.features.filter((f) => f.enabled).length - 6} lainnya
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Actions */}
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

            {/* Create/Edit Modal */}
            {showCreateForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl dark:bg-gray-800">
                        <div className="mb-6 flex items-center justify-between">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                                {editingPlan ? "Edit Plan" : "Buat Plan Baru"}
                            </h2>
                            <button
                                onClick={() => setShowCreateForm(false)}
                                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            {/* Basic Info */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Nama *
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
                                        Slug *
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
                                    Deskripsi
                                </label>
                                <textarea
                                    value={formDescription}
                                    onChange={(e) => setFormDescription(e.target.value)}
                                    rows={2}
                                    className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                                />
                            </div>

                            {/* Pricing */}
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Harga/Bulan (Rp)
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
                                        Harga/Tahun (Rp)
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
                                        Max Users (-1 = unlimited)
                                    </label>
                                    <input
                                        type="number"
                                        value={formMaxUsers}
                                        onChange={(e) => setFormMaxUsers(Number(e.target.value))}
                                        className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                                    />
                                </div>
                            </div>

                            {/* Features */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Features
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

                            {/* Save Button */}
                            <div className="flex justify-end gap-2">
                                <button
                                    onClick={() => setShowCreateForm(false)}
                                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                                >
                                    Batal
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
                                    {editingPlan ? "Update" : "Buat"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Empty State */}
            {plans.length === 0 && !loading && (
                <div className="rounded-xl border-2 border-dashed border-gray-300 p-12 text-center dark:border-gray-600">
                    <CreditCard className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
                        Belum ada plan
                    </h3>
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                        Buat plan pertama untuk mengontrol akses fitur tenants.
                    </p>
                    <button
                        onClick={handleCreate}
                        className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                    >
                        <Plus className="h-4 w-4" />
                        Buat Plan
                    </button>
                </div>
            )}
        </div>
    );
}
