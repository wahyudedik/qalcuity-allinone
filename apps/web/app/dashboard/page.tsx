export default function DashboardPage() {
    return (
        <div className="space-y-6">
            {/* Page Title */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
                <p className="text-sm text-gray-500">
                    Selamat datang kembali! Berikut ringkasan bisnis Anda hari ini.
                </p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                    title="Total Revenue"
                    value="Rp 45.750.000"
                    change="+12.5%"
                    changeType="positive"
                    icon="💰"
                />
                <StatCard
                    title="Outstanding Invoice"
                    value="Rp 15.500.000"
                    change="12 invoice"
                    changeType="neutral"
                    icon="📄"
                />
                <StatCard
                    title="Active Deals"
                    value="28"
                    change="+3 minggu ini"
                    changeType="positive"
                    icon="📈"
                />
                <StatCard
                    title="Stock Items"
                    value="156"
                    change="5 low stock"
                    changeType="warning"
                    icon="📦"
                />
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {/* Revenue Chart */}
                <div className="rounded-xl border border-gray-200 bg-white p-6">
                    <h3 className="text-lg font-semibold text-gray-900">Revenue</h3>
                    <p className="text-sm text-gray-500">6 bulan terakhir</p>
                    <div className="mt-4 flex h-48 items-end gap-2">
                        {[40, 65, 45, 80, 60, 95].map((height, i) => (
                            <div key={i} className="flex flex-1 flex-col items-center gap-1">
                                <div
                                    className="w-full rounded-t bg-blue-500 transition-all hover:bg-blue-600"
                                    style={{ height: `${height}%` }}
                                />
                                <span className="text-xs text-gray-400">
                                    {["Jan", "Feb", "Mar", "Apr", "Mei", "Jun"][i]}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Recent Activity */}
                <div className="rounded-xl border border-gray-200 bg-white p-6">
                    <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
                    <p className="text-sm text-gray-500">Aktivitas terbaru</p>
                    <div className="mt-4 space-y-4">
                        <ActivityItem
                            icon="📄"
                            text="Invoice #INV-001 dikirim ke PT Maju Jaya"
                            time="2 jam lalu"
                        />
                        <ActivityItem
                            icon="💰"
                            text="Pembayaran diterima dari CV Berkah - Rp 5.250.000"
                            time="4 jam lalu"
                        />
                        <ActivityItem
                            icon="📦"
                            text="Stock Widget A menipis (15 unit tersisa)"
                            time="6 jam lalu"
                        />
                        <ActivityItem
                            icon="👤"
                            text="Lead baru: PT Sejahtera dari website"
                            time="8 jam lalu"
                        />
                        <ActivityItem
                            icon="✅"
                            text="Deal PT ABC ditutup - Rp 50.000.000"
                            time="1 hari lalu"
                        />
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="rounded-xl border border-gray-200 bg-white p-6">
                <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <QuickAction href="/dashboard/finance/invoices" icon="📄" label="Buat Invoice" />
                    <QuickAction href="/dashboard/crm/leads" icon="👤" label="Kelola Lead" />
                    <QuickAction href="/dashboard/inventory/products" icon="📦" label="Kelola Produk" />
                    <QuickAction href="/dashboard/finance/payments" icon="💰" label="Catat Pembayaran" />
                </div>
            </div>
        </div>
    );
}

function StatCard({
    title,
    value,
    change,
    changeType,
    icon,
}: {
    title: string;
    value: string;
    change: string;
    changeType: "positive" | "negative" | "warning" | "neutral";
    icon: string;
}) {
    const changeColors = {
        positive: "text-green-600",
        negative: "text-red-600",
        warning: "text-yellow-600",
        neutral: "text-gray-600",
    };

    return (
        <div className="rounded-xl border border-gray-200 bg-white p-6 transition hover:shadow-md">
            <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-500">{title}</span>
                <span className="text-2xl">{icon}</span>
            </div>
            <div className="mt-2">
                <p className="text-2xl font-bold text-gray-900">{value}</p>
                <p className={`mt-1 text-sm ${changeColors[changeType]}`}>{change}</p>
            </div>
        </div>
    );
}

function ActivityItem({
    icon,
    text,
    time,
}: {
    icon: string;
    text: string;
    time: string;
}) {
    return (
        <div className="flex items-start gap-3">
            <span className="mt-0.5 text-lg">{icon}</span>
            <div className="flex-1">
                <p className="text-sm text-gray-700">{text}</p>
                <p className="text-xs text-gray-400">{time}</p>
            </div>
        </div>
    );
}

function QuickAction({
    href,
    icon,
    label,
}: {
    href: string;
    icon: string;
    label: string;
}) {
    return (
        <a
            href={href}
            className="flex flex-col items-center gap-2 rounded-lg border border-gray-200 p-4 transition hover:border-blue-300 hover:bg-blue-50"
        >
            <span className="text-2xl">{icon}</span>
            <span className="text-sm font-medium text-gray-700">{label}</span>
        </a>
    );
}
