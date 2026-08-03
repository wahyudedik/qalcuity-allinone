export default function HomePage() {
    return (
        <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
            <div className="container mx-auto flex min-h-screen flex-col items-center justify-center px-4">
                {/* Logo & Hero */}
                <div className="text-center">
                    <div className="mb-8">
                        <h1 className="text-6xl font-bold tracking-tight text-gray-900">
                            Qalcuity
                        </h1>
                        <p className="mt-2 text-xl text-gray-600">
                            All-in-One B2B Operating System
                        </p>
                    </div>

                    <p className="mx-auto max-w-2xl text-lg text-gray-500">
                        Ganti 5–7 tools jadi 1, mobile-first, Coretax-ready, dan AI yang
                        benar-benar kerja.
                    </p>

                    {/* CTA Buttons */}
                    <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:justify-center">
                        <a
                            href="/login"
                            className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-8 py-3 text-base font-semibold text-white shadow-lg transition hover:bg-blue-700 hover:shadow-xl"
                        >
                            Masuk
                        </a>
                        <a
                            href="/register"
                            className="inline-flex items-center justify-center rounded-lg border-2 border-blue-600 px-8 py-3 text-base font-semibold text-blue-600 transition hover:bg-blue-50"
                        >
                            Daftar Gratis
                        </a>
                    </div>
                </div>

                {/* Features Grid */}
                <div className="mt-20 grid max-w-5xl grid-cols-1 gap-8 md:grid-cols-3">
                    <FeatureCard
                        icon="💰"
                        title="Finance & Accounting"
                        description="Invoice, quotation, pajak otomatis, Coretax-ready"
                    />
                    <FeatureCard
                        icon="📈"
                        title="Sales & CRM"
                        description="Pipeline, lead management, customer 360°"
                    />
                    <FeatureCard
                        icon="📦"
                        title="Inventory"
                        description="Stock tracking, purchase order, barcode scan"
                    />
                    <FeatureCard
                        icon="👥"
                        title="HR & People Ops"
                        description="Payroll, attendance, template kontrak"
                    />
                    <FeatureCard
                        icon="🤖"
                        title="AI Built-in"
                        description="Prediksi, anomaly detection, natural language query"
                    />
                    <FeatureCard
                        icon="📱"
                        title="Mobile-first"
                        description="Offline mode, sync otomatis, field-ready"
                    />
                </div>

                {/* Footer */}
                <footer className="mt-20 pb-8 text-center text-sm text-gray-400">
                    © 2026 Qalcuity. All rights reserved.
                </footer>
            </div>
        </main>
    );
}

function FeatureCard({
    icon,
    title,
    description,
}: {
    icon: string;
    title: string;
    description: string;
}) {
    return (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition hover:shadow-md">
            <div className="mb-4 text-4xl">{icon}</div>
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            <p className="mt-2 text-sm text-gray-500">{description}</p>
        </div>
    );
}
