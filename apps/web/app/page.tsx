import Link from 'next/link';
import { DollarSign, TrendingUp, Package, Users, Bot, Smartphone, Rocket, FlaskConical, CheckCircle } from 'lucide-react';

export default function HomePage() {
    return (
        <main className="min-h-screen bg-white">
            {/* Navbar */}
            <nav className="sticky top-0 z-50 border-b border-gray-100 bg-white/80 backdrop-blur-md">
                <div className="container mx-auto flex items-center justify-between px-4 py-4">
                    <div className="flex items-center gap-2">
                        <img src="/logo.png" alt="Qalcuity" className="h-8 w-8 object-contain" />
                        <span className="text-2xl font-bold text-gray-900">Qalcuity</span>
                        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                            Beta
                        </span>
                    </div>
                    <div className="hidden items-center gap-8 md:flex">
                        <Link href="#features" className="text-sm text-gray-600 hover:text-gray-900">
                            Fitur
                        </Link>
                        <Link href="#pricing" className="text-sm text-gray-600 hover:text-gray-900">
                            Harga
                        </Link>
                        <Link href="#how-it-works" className="text-sm text-gray-600 hover:text-gray-900">
                            Cara Kerja
                        </Link>
                    </div>
                    <div className="flex items-center gap-3">
                        <Link
                            href="/login"
                            className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
                        >
                            Masuk
                        </Link>
                        <Link
                            href="/register"
                            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
                        >
                            Daftar Gratis
                        </Link>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="bg-gradient-to-br from-blue-50 via-white to-indigo-50 px-4 py-20 md:py-32">
                <div className="container mx-auto text-center">
                    <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-blue-100 px-4 py-2 text-sm text-blue-700">
                        <Rocket className="w-4 h-4" />
                        <span>Sekarang dalam masa Beta — Daftar gratis!</span>
                    </div>
                    <h1 className="mx-auto max-w-4xl text-4xl font-bold tracking-tight text-gray-900 md:text-6xl">
                        All-in-One B2B{' '}
                        <span className="text-blue-600">Operating System</span>
                    </h1>
                    <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-500 md:text-xl">
                        Ganti 5–7 tools jadi 1. Kelola Finance, Sales, Inventory, HR dalam satu
                        platform. Mobile-first, Coretax-ready, dan AI yang benar-benar kerja.
                    </p>
                    <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
                        <Link
                            href="/register"
                            className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-8 py-3.5 text-base font-semibold text-white shadow-lg transition hover:bg-blue-700 hover:shadow-xl"
                        >
                            Mulai Gratis →
                        </Link>
                        <Link
                            href="/login?email=demo@qalcuity.com&password=demo123"
                            className="inline-flex items-center justify-center rounded-lg border-2 border-blue-200 bg-blue-50 px-8 py-3.5 text-base font-semibold text-blue-700 transition hover:border-blue-300 hover:bg-blue-100"
                        >
                            <FlaskConical className="w-4 h-4 inline" /> Coba Demo
                        </Link>
                    </div>
                    <p className="mt-4 text-sm text-gray-400">Tanpa kartu kredit. Gratis selamanya untuk plan Basic.</p>
                </div>
            </section>

            {/* Trusted By */}
            <section className="border-y border-gray-100 bg-gray-50 py-8">
                <div className="container mx-auto px-4 text-center">
                    <p className="mb-6 text-sm text-gray-400">Dipercaya oleh 50+ bisnis Indonesia</p>
                    <div className="flex flex-wrap items-center justify-center gap-8 opacity-40">
                        {['PT Maju Jaya', 'CV Berkah', 'PT Sejahtera', 'PT Abadi', 'CV Sentosa'].map((name) => (
                            <span key={name} className="text-lg font-bold text-gray-500">
                                {name}
                            </span>
                        ))}
                    </div>
                </div>
            </section>

            {/* Features Grid */}
            <section id="features" className="px-4 py-20">
                <div className="container mx-auto">
                    <div className="mb-12 text-center">
                        <h2 className="text-3xl font-bold text-gray-900 md:text-4xl">Semua yang Anda Butuhkan</h2>
                        <p className="mt-4 text-lg text-gray-500">
                            Satu platform untuk seluruh operasional bisnis Anda
                        </p>
                    </div>
                    <div className="grid max-w-6xl grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                        <FeatureCard
                            icon={<DollarSign className="w-7 h-7" />}
                            title="Finance & Accounting"
                            description="Invoice, quotation, pajak otomatis, Coretax-ready, laporan keuangan real-time"
                            color="blue"
                        />
                        <FeatureCard
                            icon={<TrendingUp className="w-7 h-7" />}
                            title="Sales & CRM"
                            description="Pipeline visual, lead management, customer 360°, win probability prediction"
                            color="green"
                        />
                        <FeatureCard
                            icon={<Package className="w-7 h-7" />}
                            title="Inventory"
                            description="Stock tracking, purchase order, demand forecasting, multi-warehouse"
                            color="purple"
                        />
                        <FeatureCard
                            icon={<Users className="w-7 h-7" />}
                            title="HR & People Ops"
                            description="Payroll, attendance GPS, cuti online, template kontrak, performance review"
                            color="red"
                        />
                        <FeatureCard
                            icon={<Bot className="w-7 h-7" />}
                            title="AI Built-in"
                            description="Natural language query, anomaly detection, cash flow prediction, auto-categorize"
                            color="amber"
                        />
                        <FeatureCard
                            icon={<Smartphone className="w-7 h-7" />}
                            title="Mobile-first"
                            description="Offline mode, sync otomatis, field-ready untuk sales & tim lapangan"
                            color="indigo"
                        />
                    </div>
                </div>
            </section>

            {/* How It Works */}
            <section id="how-it-works" className="bg-gray-50 px-4 py-20">
                <div className="container mx-auto">
                    <div className="mb-12 text-center">
                        <h2 className="text-3xl font-bold text-gray-900 md:text-4xl">Cara Kerja</h2>
                        <p className="mt-4 text-lg text-gray-500">Mulai dalam 3 langkah mudah</p>
                    </div>
                    <div className="mx-auto grid max-w-4xl grid-cols-1 gap-8 md:grid-cols-3">
                        <StepCard
                            step="1"
                            title="Daftar Akun"
                            description="Buat akun gratis dalam 30 detik. Tidak perlu kartu kredit."
                        />
                        <StepCard
                            step="2"
                            title="Setup Bisnis"
                            description="Isi data perusahaan, tambah produk, dan undang tim Anda."
                        />
                        <StepCard
                            step="3"
                            title="Mulai Kerja"
                            description="Gunakan semua fitur langsung. AI akan membantu Anda bekerja lebih cerdas."
                        />
                    </div>
                </div>
            </section>

            {/* Pricing */}
            <section id="pricing" className="px-4 py-20">
                <div className="container mx-auto">
                    <div className="mb-12 text-center">
                        <h2 className="text-3xl font-bold text-gray-900 md:text-4xl">Harga Sederhana</h2>
                        <p className="mt-4 text-lg text-gray-500">
                            Pilih plan sesuai kebutuhan bisnis Anda
                        </p>
                    </div>
                    <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-3">
                        <PricingCard
                            name="Starter"
                            price="Rp 199K"
                            period="/bulan"
                            description="Untuk UMKM yang baru mulai"
                            features={[
                                '1 pengguna',
                                'Finance module',
                                'Basic reports',
                                'Email support',
                            ]}
                            cta="Mulai Gratis"
                            popular={false}
                        />
                        <PricingCard
                            name="Business"
                            price="Rp 499K"
                            period="/bulan"
                            description="Untuk UKM yang berkembang"
                            features={[
                                '5 pengguna',
                                'Semua modul',
                                'AI features',
                                'Mobile app',
                                'Priority support',
                                'API access',
                            ]}
                            cta="Pilih Business"
                            popular={true}
                        />
                        <PricingCard
                            name="Enterprise"
                            price="Custom"
                            period=""
                            description="Untuk perusahaan besar"
                            features={[
                                'Unlimited pengguna',
                                'Semua modul',
                                'Advanced AI',
                                'Custom integration',
                                'Dedicated support',
                                'SLA guarantee',
                            ]}
                            cta="Hubungi Sales"
                            popular={false}
                        />
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="bg-blue-600 px-4 py-20">
                <div className="container mx-auto text-center">
                    <h2 className="text-3xl font-bold text-white md:text-4xl">
                        Siap Mengubah Bisnis Anda?
                    </h2>
                    <p className="mx-auto mt-4 max-w-xl text-lg text-blue-100">
                        Bergabung dengan 50+ bisnis Indonesia yang sudah menggunakan Qalcuity.
                        Mulai gratis hari ini.
                    </p>
                    <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
                        <Link
                            href="/register"
                            className="inline-flex items-center justify-center rounded-lg bg-white px-8 py-3.5 text-base font-semibold text-blue-600 shadow-lg transition hover:bg-gray-50"
                        >
                            Daftar Gratis Sekarang →
                        </Link>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="border-t border-gray-100 bg-gray-50 px-4 py-12">
                <div className="container mx-auto">
                    <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
                        <div>
                            <h3 className="mb-4 text-sm font-semibold text-gray-900">Produk</h3>
                            <ul className="space-y-2 text-sm text-gray-500">
                                <li><Link href="#features" className="hover:text-gray-700">Fitur</Link></li>
                                <li><Link href="#pricing" className="hover:text-gray-700">Harga</Link></li>
                                <li><span className="text-gray-400 cursor-not-allowed">Integrasi</span></li>
                                <li><span className="text-gray-400 cursor-not-allowed">Changelog</span></li>
                            </ul>
                        </div>
                        <div>
                            <h3 className="mb-4 text-sm font-semibold text-gray-900">Modul</h3>
                            <ul className="space-y-2 text-sm text-gray-500">
                                <li><Link href="/dashboard/finance" className="hover:text-gray-700">Finance</Link></li>
                                <li><Link href="/dashboard/crm" className="hover:text-gray-700">CRM</Link></li>
                                <li><Link href="/dashboard/inventory" className="hover:text-gray-700">Inventory</Link></li>
                                <li><Link href="/dashboard/hr" className="hover:text-gray-700">HR</Link></li>
                            </ul>
                        </div>
                        <div>
                            <h3 className="mb-4 text-sm font-semibold text-gray-900">Perusahaan</h3>
                            <ul className="space-y-2 text-sm text-gray-500">
                                <li><span className="text-gray-400 cursor-not-allowed">Tentang Kami</span></li>
                                <li><span className="text-gray-400 cursor-not-allowed">Blog</span></li>
                                <li><span className="text-gray-400 cursor-not-allowed">Karir</span></li>
                                <li><span className="text-gray-400 cursor-not-allowed">Kontak</span></li>
                            </ul>
                        </div>
                        <div>
                            <h3 className="mb-4 text-sm font-semibold text-gray-900">Legal</h3>
                            <ul className="space-y-2 text-sm text-gray-500">
                                <li><span className="text-gray-400 cursor-not-allowed">Privacy Policy</span></li>
                                <li><span className="text-gray-400 cursor-not-allowed">Terms of Service</span></li>
                                <li><span className="text-gray-400 cursor-not-allowed">SLA</span></li>
                            </ul>
                        </div>
                    </div>
                    <div className="mt-8 border-t border-gray-200 pt-8 text-center text-sm text-gray-400">
                        © 2026 Qalcuity. All rights reserved. Made with <span className="text-red-400">&#9829;</span> in Indonesia.
                    </div>
                </div>
            </footer>
        </main>
    );
}

function FeatureCard({
    icon,
    title,
    description,
    color,
}: {
    icon: React.ReactNode;
    title: string;
    description: string;
    color: string;
}) {
    const colorMap: Record<string, string> = {
        blue: 'bg-blue-50 text-blue-600',
        green: 'bg-green-50 text-green-600',
        purple: 'bg-purple-50 text-purple-600',
        red: 'bg-red-50 text-red-600',
        amber: 'bg-amber-50 text-amber-600',
        indigo: 'bg-indigo-50 text-indigo-600',
    };

    return (
        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm transition hover:shadow-md">
            <div className={`mb-4 inline-flex rounded-lg p-3 ${colorMap[color] || 'bg-gray-50 text-gray-600'}`}>
                {icon}
            </div>
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-gray-500">{description}</p>
        </div>
    );
}

function StepCard({ step, title, description }: { step: string; title: string; description: string }) {
    return (
        <div className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-lg font-bold text-white">
                {step}
            </div>
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            <p className="mt-2 text-sm text-gray-500">{description}</p>
        </div>
    );
}

function PricingCard({
    name,
    price,
    period,
    description,
    features,
    cta,
    popular,
}: {
    name: string;
    price: string;
    period: string;
    description: string;
    features: string[];
    cta: string;
    popular: boolean;
}) {
    return (
        <div
            className={`relative rounded-xl border-2 p-6 transition ${popular
                ? 'border-blue-600 shadow-lg'
                : 'border-gray-100 bg-white shadow-sm hover:shadow-md'
                }`}
        >
            {popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-blue-600 px-4 py-1 text-xs font-semibold text-white">
                    Paling Populer
                </div>
            )}
            <h3 className="text-lg font-semibold text-gray-900">{name}</h3>
            <p className="mt-1 text-sm text-gray-500">{description}</p>
            <div className="mt-4">
                <span className="text-3xl font-bold text-gray-900">{price}</span>
                {period && <span className="text-sm text-gray-500">{period}</span>}
            </div>
            <ul className="mt-6 space-y-3">
                {features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm text-gray-600">
                        <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                        {feature}
                    </li>
                ))}
            </ul>
            <Link
                href="/register"
                className={`mt-6 block w-full rounded-lg py-2.5 text-center text-sm font-semibold transition ${popular
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'border border-gray-200 text-gray-700 hover:bg-gray-50'
                    }`}
            >
                {cta}
            </Link>
        </div>
    );
}
