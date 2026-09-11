import Link from 'next/link';
import {
    Calculator,
    Users,
    Package,
    UserCheck,
    Monitor,
    BarChart3,
    Brain,
    Wrench,
    FolderKanban,
    CheckCircle,
    CreditCard,
    Settings,
    ArrowRight,
    Shield,
    Smartphone,
    MapPin,
    Link as LinkIcon,
    Globe,
    Mail,
    MessageSquare,
    Database,
    Sparkles,
} from 'lucide-react';

/* ─── Data ─────────────────────────────────────────────────────────────────── */

const MODULES = [
    {
        icon: Calculator,
        name: 'Finance',
        color: 'bg-blue-50 text-blue-600',
        features: ['Invoice & Pembayaran', 'Purchase Order', 'Jurnal & Rekonsiliasi', 'Pajak & Recurring'],
    },
    {
        icon: Users,
        name: 'CRM',
        color: 'bg-emerald-50 text-emerald-600',
        features: ['Kontak & Leads', 'Deals & Pipeline', 'Aktivitas & Follow-up', 'Customer 360°'],
    },
    {
        icon: Package,
        name: 'Inventory',
        color: 'bg-purple-50 text-purple-600',
        features: ['Produk & Stok', 'Opname & Gudang', 'Kategori & Supplier', 'Multi-warehouse'],
    },
    {
        icon: UserCheck,
        name: 'HR',
        color: 'bg-rose-50 text-rose-600',
        features: ['Karyawan', 'Absensi & Cuti', 'Payroll', 'Performance Review'],
    },
    {
        icon: Monitor,
        name: 'POS',
        color: 'bg-amber-50 text-amber-600',
        features: ['Transaksi Cepat', 'Kitchen Display', 'Meja & Loyalty', 'Offline Mode'],
    },
    {
        icon: BarChart3,
        name: 'Analytics',
        color: 'bg-cyan-50 text-cyan-600',
        features: ['Dashboard KPI', 'Custom Charts', 'Data Explorer', 'Scheduled Reports'],
    },
    {
        icon: Brain,
        name: 'AI',
        color: 'bg-violet-50 text-violet-600',
        features: ['AI Chat & Query', 'Anomaly Detection', 'Document Extraction', 'Predictions'],
    },
    {
        icon: Wrench,
        name: 'Field Service',
        color: 'bg-orange-50 text-orange-600',
        features: ['Job Management', 'Checklists', 'Technician Schedule', 'Status Tracking'],
    },
    {
        icon: FolderKanban,
        name: 'Projects',
        color: 'bg-teal-50 text-teal-600',
        features: ['Projects & Tasks', 'Timesheet', 'Gantt Chart', 'Team Collaboration'],
    },
    {
        icon: CheckCircle,
        name: 'Approvals',
        color: 'bg-green-50 text-green-600',
        features: ['Multi-level Approval', 'Auto-approval Rules', 'Approval History', 'Configurable Flow'],
    },
    {
        icon: CreditCard,
        name: 'Billing',
        color: 'bg-pink-50 text-pink-600',
        features: ['Subscription Mgmt', 'Plan Management', 'Payment Gateway', 'Invoice Billing'],
    },
    {
        icon: Settings,
        name: 'Settings',
        color: 'bg-gray-50 text-gray-600',
        features: ['Company Setup', 'Team & Roles', 'Security & Audit', 'Integrations'],
    },
] as const;

const USP_ITEMS = [
    {
        icon: LinkIcon,
        title: 'Truly Integrated',
        desc: 'Data mengalir antar modul. Invoice otomatis update stok & jurnal. Tidak ada data silo.',
    },
    {
        icon: Brain,
        title: 'AI-Powered',
        desc: 'Anomaly detection, document extraction, smart predictions — built-in, bukan add-on.',
    },
    {
        icon: Shield,
        title: 'Multi-tenant Secure',
        desc: 'RBAC 3-layer, audit trail, AES-256 encryption. UU PDP & GDPR ready.',
    },
    {
        icon: Smartphone,
        title: 'Mobile-First',
        desc: 'Akses dari mana saja. POS offline mode untuk area tanpa internet.',
    },
    {
        icon: Settings,
        title: 'Industry Configurable',
        desc: '10+ industry packs: Retail, Restaurant, Manufacturing, Konstruksi, dan lainnya.',
    },
    {
        icon: MapPin,
        title: 'Indonesian Ready',
        desc: 'Coretax-ready, Rupiah, Pajak Indonesia, integrasi lokal Midtrans & Xendit.',
    },
] as const;

const PRICING_PLANS = [
    {
        name: 'Free',
        price: 'Rp 0',
        period: '/bulan',
        description: 'Untuk mulai',
        maxUsers: 3,
        maxStorage: '500 MB',
        cta: 'Daftar Gratis',
        popular: false,
        features: [
            'Invoice & Pembayaran (50/bulan)',
            'Kontak (100) & Leads (20)',
            'Produk (50) & Stok',
            'Kategori (10)',
            '3 pengguna',
            '500 MB storage',
        ],
    },
    {
        name: 'Pro',
        price: 'Rp 299K',
        period: '/bulan',
        description: 'Untuk tumbuh',
        maxUsers: 20,
        maxStorage: '5 GB',
        cta: 'Mulai Trial',
        popular: true,
        features: [
            'Semua fitur Free',
            'Invoice & Pembayaran unlimited',
            'Purchase Order & Jurnal',
            'Laporan & Rekonsiliasi',
            'Deals, Pipeline & Supplier',
            'HR (Karyawan, Absensi, Cuti)',
            'AI Chat (100/bulan) & Extraction',
            'WhatsApp & Email integration',
            '20 pengguna · 5 GB storage',
        ],
    },
    {
        name: 'Enterprise',
        price: 'Rp 999K',
        period: '/bulan',
        description: 'Untuk scale',
        maxUsers: -1,
        maxStorage: 'Unlimited',
        cta: 'Hubungi Kami',
        popular: false,
        features: [
            'Semua fitur Pro',
            'Payroll & Advanced HR',
            'AI unlimited (chat, extraction)',
            'Predictions & Anomaly Detection',
            'Payment Gateway integration',
            'Platform Admin & Monitoring',
            'Unlimited pengguna & storage',
            'Dedicated support & SLA',
        ],
    },
] as const;

const FAQ_ITEMS = [
    {
        q: 'Apakah ada free trial?',
        a: 'Ya, kami menyediakan 14 hari free trial untuk plan Pro. Anda bisa menikmati semua fitur Pro tanpa batasan selama masa trial.',
    },
    {
        q: 'Bagaimana dengan keamanan data?',
        a: 'Kami menggunakan multi-tenant isolation, RBAC 3-layer (middleware + API + UI), enkripsi AES-256, dan audit trail lengkap. Platform kami UU PDP & GDPR ready.',
    },
    {
        q: 'Bisakah diakses dari mobile?',
        a: 'Ya! Qalcuity tersedia sebagai mobile app (React Native) yang bisa diakses dari iOS dan Android. POS juga mendukung offline mode untuk area tanpa internet.',
    },
    {
        q: 'Apakah ada integrasi payment gateway?',
        a: 'Ya, kami terintegrasi dengan Midtrans dan Xendit. Integrasi ini tersedia di plan Enterprise.',
    },
    {
        q: 'Bagaimana dengan support?',
        a: 'Kami menyediakan email support untuk semua plan, documentation lengkap, dan knowledge base. Plan Enterprise mendapatkan dedicated support dan SLA guarantee.',
    },
    {
        q: 'Bisakah migrate dari software lain?',
        a: 'Ya! Anda bisa mengimpor data dari CSV/Excel. Tim kami siap membantu proses migrasi untuk plan Enterprise.',
    },
];

const INTEGRATIONS = [
    { icon: CreditCard, name: 'Midtrans', category: 'Payment' },
    { icon: CreditCard, name: 'Xendit', category: 'Payment' },
    { icon: MessageSquare, name: 'WhatsApp', category: 'Communication' },
    { icon: Mail, name: 'Email (SMTP)', category: 'Communication' },
    { icon: Globe, name: 'Web App', category: 'Platform' },
    { icon: Smartphone, name: 'Mobile (RN)', category: 'Platform' },
    { icon: Monitor, name: 'Desktop (Electron)', category: 'Platform' },
    { icon: Database, name: 'PostgreSQL', category: 'Database' },
];

/* ─── Page ─────────────────────────────────────────────────────────────────── */

export default function HomePage() {
    return (
        <main className="min-h-screen bg-white">
            {/* ════════════════════════════════════════════════════════════════════════
          NAVBAR
      ════════════════════════════════════════════════════════════════════════ */}
            <nav className="sticky top-0 z-50 border-b border-gray-100 bg-white/80 backdrop-blur-md">
                <div className="container mx-auto flex items-center justify-between px-4 py-4">
                    <div className="flex items-center gap-2">
                        <img src="/logo.png" alt="Qalcuity" className="h-8 w-8 object-contain" />
                        <span className="text-2xl font-bold text-gray-900">Qalcuity</span>
                    </div>
                    <div className="hidden items-center gap-8 md:flex">
                        <Link href="#features" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
                            Fitur
                        </Link>
                        <Link href="#modules" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
                            Modul
                        </Link>
                        <Link href="#pricing" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
                            Harga
                        </Link>
                        <Link href="#how-it-works" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
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

            {/* ════════════════════════════════════════════════════════════════════════
          HERO SECTION
      ════════════════════════════════════════════════════════════════════════ */}
            <section className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-indigo-50 px-4 py-20 md:py-32">
                {/* Animated gradient orbs */}
                <div className="pointer-events-none absolute inset-0 overflow-hidden">
                    <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-blue-200/30 blur-3xl animate-pulse" />
                    <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-indigo-200/30 blur-3xl animate-pulse [animation-delay:1s]" />
                    <div className="absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-100/20 blur-3xl animate-pulse [animation-delay:2s]" />
                </div>

                <div className="container relative mx-auto text-center">
                    <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-blue-100 px-4 py-2 text-sm font-medium text-blue-700">
                        <Sparkles className="h-4 w-4" />
                        <span>Business Operating System all-in-one untuk Indonesia</span>
                    </div>
                    <h1 className="mx-auto max-w-4xl text-4xl font-bold tracking-tight text-gray-900 md:text-6xl lg:text-7xl">
                        Satu Platform,{' '}
                        <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                            Semua Bisnis Berjalan
                        </span>
                    </h1>
                    <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-500 md:text-xl">
                        Finance, CRM, Inventory, HR, POS, Analytics, AI — semuanya terintegrasi.
                        Tanpa ribet, tanpa kompromi.
                    </p>
                    <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
                        <Link
                            href="/register"
                            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-8 py-3.5 text-base font-semibold text-white shadow-lg transition hover:bg-blue-700 hover:shadow-xl"
                        >
                            Mulai Gratis
                            <ArrowRight className="h-4 w-4" />
                        </Link>
                        <Link
                            href="#modules"
                            className="inline-flex items-center gap-2 rounded-lg border-2 border-gray-200 bg-white px-8 py-3.5 text-base font-semibold text-gray-700 transition hover:border-gray-300 hover:bg-gray-50"
                        >
                            Lihat Modul
                        </Link>
                    </div>
                    <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-gray-400">
                        <span>75+ database models</span>
                        <span className="hidden sm:inline">•</span>
                        <span>200+ API endpoints</span>
                        <span className="hidden sm:inline">•</span>
                        <span>120+ validations</span>
                        <span className="hidden sm:inline">•</span>
                        <span>63 E2E tests</span>
                    </div>
                </div>
            </section>

            {/* ════════════════════════════════════════════════════════════════════════
          TRUSTED BY
      ════════════════════════════════════════════════════════════════════════ */}
            <section className="border-y border-gray-100 bg-gray-50 py-10">
                <div className="container mx-auto px-4 text-center">
                    <p className="mb-6 text-sm font-medium text-gray-400">Dipercaya oleh berbagai industri di Indonesia</p>
                    <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4 opacity-40">
                        {['Retail', 'Restaurant', 'Manufacturing', 'Construction', 'Healthcare', 'Services'].map((name) => (
                            <span key={name} className="text-lg font-bold tracking-wide text-gray-500 uppercase">
                                {name}
                            </span>
                        ))}
                    </div>
                </div>
            </section>

            {/* ════════════════════════════════════════════════════════════════════════
          ALL MODULES SHOWCASE
      ════════════════════════════════════════════════════════════════════════ */}
            <section id="modules" className="px-4 py-20">
                <div className="container mx-auto">
                    <div className="mb-12 text-center">
                        <h2 className="text-3xl font-bold text-gray-900 md:text-4xl">12 Modul Lengkap</h2>
                        <p className="mt-4 text-lg text-gray-500">
                            Semua yang Anda butuhkan untuk menjalankan bisnis — dalam satu platform
                        </p>
                    </div>
                    <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {MODULES.map((mod) => {
                            const Icon = mod.icon;
                            return (
                                <div
                                    key={mod.name}
                                    className="group rounded-xl border border-gray-100 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
                                >
                                    <div className={`mb-4 inline-flex rounded-lg p-3 ${mod.color}`}>
                                        <Icon className="h-6 w-6" />
                                    </div>
                                    <h3 className="text-lg font-semibold text-gray-900">{mod.name}</h3>
                                    <ul className="mt-3 space-y-1.5">
                                        {mod.features.map((f) => (
                                            <li key={f} className="flex items-center gap-2 text-sm text-gray-500">
                                                <CheckCircle className="h-3.5 w-3.5 flex-shrink-0 text-green-400" />
                                                {f}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* ════════════════════════════════════════════════════════════════════════
          KEY FEATURES / WHY QALCUITY
      ════════════════════════════════════════════════════════════════════════ */}
            <section id="features" className="bg-gray-50 px-4 py-20">
                <div className="container mx-auto">
                    <div className="mb-12 text-center">
                        <h2 className="text-3xl font-bold text-gray-900 md:text-4xl">Mengapa Qalcuity?</h2>
                        <p className="mt-4 text-lg text-gray-500">
                            Bukan sekadar ERP — ini adalah Business Operating System yang sesungguhnya
                        </p>
                    </div>
                    <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {USP_ITEMS.map((item) => {
                            const Icon = item.icon;
                            return (
                                <div
                                    key={item.title}
                                    className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
                                >
                                    <div className="mb-4 inline-flex rounded-lg bg-blue-50 p-3 text-blue-600">
                                        <Icon className="h-6 w-6" />
                                    </div>
                                    <h3 className="text-lg font-semibold text-gray-900">{item.title}</h3>
                                    <p className="mt-2 text-sm leading-relaxed text-gray-500">{item.desc}</p>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* ════════════════════════════════════════════════════════════════════════
          HOW IT WORKS
      ════════════════════════════════════════════════════════════════════════ */}
            <section id="how-it-works" className="px-4 py-20">
                <div className="container mx-auto">
                    <div className="mb-12 text-center">
                        <h2 className="text-3xl font-bold text-gray-900 md:text-4xl">Cara Kerja</h2>
                        <p className="mt-4 text-lg text-gray-500">Mulai dalam 3 langkah mudah</p>
                    </div>
                    <div className="mx-auto grid max-w-4xl grid-cols-1 gap-8 md:grid-cols-3">
                        <div className="text-center">
                            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-lg font-bold text-white">
                                1
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900">Daftar Gratis</h3>
                            <p className="mt-2 text-sm text-gray-500">
                                30 detik, tanpa kartu kredit. Langsung aktif.
                            </p>
                        </div>
                        <div className="text-center">
                            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-lg font-bold text-white">
                                2
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900">Setup Instan</h3>
                            <p className="mt-2 text-sm text-gray-500">
                                Import data dari CSV/Excel atau mulai dari nol.
                            </p>
                        </div>
                        <div className="text-center">
                            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-lg font-bold text-white">
                                3
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900">Bisnis Berjalan</h3>
                            <p className="mt-2 text-sm text-gray-500">
                                Semua modul terintegrasi, AI membantu Anda bekerja lebih cerdas.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* ════════════════════════════════════════════════════════════════════════
          PRICING — synced with entitlements-config.ts
      ════════════════════════════════════════════════════════════════════════ */}
            <section id="pricing" className="bg-gray-50 px-4 py-20">
                <div className="container mx-auto">
                    <div className="mb-12 text-center">
                        <h2 className="text-3xl font-bold text-gray-900 md:text-4xl">Harga Sederhana</h2>
                        <p className="mt-4 text-lg text-gray-500">Pilih plan sesuai kebutuhan bisnis Anda</p>
                    </div>
                    <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-3">
                        {PRICING_PLANS.map((plan) => (
                            <div
                                key={plan.name}
                                className={`relative rounded-xl border-2 p-6 transition ${plan.popular
                                        ? 'border-blue-600 shadow-lg'
                                        : 'border-gray-200 bg-white shadow-sm hover:shadow-md'
                                    }`}
                            >
                                {plan.popular && (
                                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-blue-600 px-4 py-1 text-xs font-semibold text-white">
                                        Paling Populer
                                    </div>
                                )}
                                <h3 className="text-lg font-semibold text-gray-900">{plan.name}</h3>
                                <p className="mt-1 text-sm text-gray-500">{plan.description}</p>
                                <div className="mt-4">
                                    <span className="text-3xl font-bold text-gray-900">{plan.price}</span>
                                    <span className="text-sm text-gray-500">{plan.period}</span>
                                </div>
                                <p className="mt-1 text-xs text-gray-400">
                                    {plan.maxUsers === -1 ? 'Unlimited' : `${plan.maxUsers} pengguna`} · {plan.maxStorage} storage
                                </p>
                                <ul className="mt-6 space-y-3">
                                    {plan.features.map((feature) => (
                                        <li key={feature} className="flex items-start gap-2 text-sm text-gray-600">
                                            <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-500" />
                                            {feature}
                                        </li>
                                    ))}
                                </ul>
                                <Link
                                    href="/register"
                                    className={`mt-6 block w-full rounded-lg py-2.5 text-center text-sm font-semibold transition ${plan.popular
                                            ? 'bg-blue-600 text-white hover:bg-blue-700'
                                            : 'border border-gray-200 text-gray-700 hover:bg-gray-50'
                                        }`}
                                >
                                    {plan.cta}
                                </Link>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ════════════════════════════════════════════════════════════════════════
          INTEGRATIONS
      ════════════════════════════════════════════════════════════════════════ */}
            <section className="px-4 py-20">
                <div className="container mx-auto">
                    <div className="mb-12 text-center">
                        <h2 className="text-3xl font-bold text-gray-900 md:text-4xl">Integrasi yang Tersedia</h2>
                        <p className="mt-4 text-lg text-gray-500">
                            Terhubung dengan tools yang sudah Anda gunakan
                        </p>
                    </div>
                    <div className="mx-auto grid max-w-4xl grid-cols-2 gap-4 sm:grid-cols-4">
                        {INTEGRATIONS.map((intg) => {
                            const Icon = intg.icon;
                            return (
                                <div
                                    key={intg.name}
                                    className="flex flex-col items-center gap-2 rounded-xl border border-gray-100 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md"
                                >
                                    <Icon className="h-8 w-8 text-gray-400" />
                                    <span className="text-sm font-medium text-gray-700">{intg.name}</span>
                                    <span className="text-xs text-gray-400">{intg.category}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* ════════════════════════════════════════════════════════════════════════
          FAQ — using native HTML details/summary (no client JS needed)
      ════════════════════════════════════════════════════════════════════════ */}
            <section className="bg-gray-50 px-4 py-20">
                <div className="container mx-auto">
                    <div className="mb-12 text-center">
                        <h2 className="text-3xl font-bold text-gray-900 md:text-4xl">Pertanyaan Umum</h2>
                        <p className="mt-4 text-lg text-gray-500">Jawaban untuk pertanyaan yang sering ditanyakan</p>
                    </div>
                    <div className="mx-auto max-w-3xl space-y-4">
                        {FAQ_ITEMS.map((item) => (
                            <details
                                key={item.q}
                                className="group rounded-xl border border-gray-200 bg-white transition-shadow hover:shadow-sm"
                            >
                                <summary className="flex cursor-pointer items-center justify-between px-6 py-4 text-left list-none">
                                    <span className="text-base font-medium text-gray-900">{item.q}</span>
                                    <span className="ml-4 flex-shrink-0 text-gray-400 transition-transform group-open:rotate-180">
                                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </span>
                                </summary>
                                <div className="px-6 pb-4">
                                    <p className="text-sm leading-relaxed text-gray-500">{item.a}</p>
                                </div>
                            </details>
                        ))}
                    </div>
                </div>
            </section>

            {/* ════════════════════════════════════════════════════════════════════════
          FINAL CTA
      ════════════════════════════════════════════════════════════════════════ */}
            <section className="bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-20">
                <div className="container mx-auto text-center">
                    <h2 className="text-3xl font-bold text-white md:text-4xl">Siap Mengubah Bisnis Anda?</h2>
                    <p className="mx-auto mt-4 max-w-xl text-lg text-blue-100">
                        Mulai gratis sekarang. Tanpa kartu kredit.
                    </p>
                    <div className="mt-8">
                        <Link
                            href="/register"
                            className="inline-flex items-center gap-2 rounded-lg bg-white px-8 py-3.5 text-base font-semibold text-blue-600 shadow-lg transition hover:bg-gray-50"
                        >
                            Daftar Gratis
                            <ArrowRight className="h-4 w-4" />
                        </Link>
                    </div>
                </div>
            </section>

            {/* ════════════════════════════════════════════════════════════════════════
          FOOTER
      ════════════════════════════════════════════════════════════════════════ */}
            <footer className="border-t border-gray-100 bg-gray-50 px-4 py-12">
                <div className="container mx-auto">
                    <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
                        <div>
                            <h3 className="mb-4 text-sm font-semibold text-gray-900">Product</h3>
                            <ul className="space-y-2 text-sm text-gray-500">
                                <li>
                                    <Link href="#features" className="hover:text-gray-700 transition-colors">
                                        Fitur
                                    </Link>
                                </li>
                                <li>
                                    <Link href="#pricing" className="hover:text-gray-700 transition-colors">
                                        Harga
                                    </Link>
                                </li>
                                <li>
                                    <Link href="#modules" className="hover:text-gray-700 transition-colors">
                                        Integrasi
                                    </Link>
                                </li>
                                <li>
                                    <span className="text-gray-400">Mobile App</span>
                                </li>
                            </ul>
                        </div>
                        <div>
                            <h3 className="mb-4 text-sm font-semibold text-gray-900">Company</h3>
                            <ul className="space-y-2 text-sm text-gray-500">
                                <li>
                                    <span className="text-gray-400">Tentang Kami</span>
                                </li>
                                <li>
                                    <span className="text-gray-400">Blog</span>
                                </li>
                                <li>
                                    <span className="text-gray-400">Karir</span>
                                </li>
                                <li>
                                    <span className="text-gray-400">Kontak</span>
                                </li>
                            </ul>
                        </div>
                        <div>
                            <h3 className="mb-4 text-sm font-semibold text-gray-900">Resources</h3>
                            <ul className="space-y-2 text-sm text-gray-500">
                                <li>
                                    <span className="text-gray-400">Dokumentasi</span>
                                </li>
                                <li>
                                    <span className="text-gray-400">API Reference</span>
                                </li>
                                <li>
                                    <span className="text-gray-400">Changelog</span>
                                </li>
                                <li>
                                    <span className="text-gray-400">Status</span>
                                </li>
                            </ul>
                        </div>
                        <div>
                            <h3 className="mb-4 text-sm font-semibold text-gray-900">Legal</h3>
                            <ul className="space-y-2 text-sm text-gray-500">
                                <li>
                                    <Link href="/privacy" className="hover:text-gray-700 transition-colors">
                                        Privacy Policy
                                    </Link>
                                </li>
                                <li>
                                    <Link href="/terms" className="hover:text-gray-700 transition-colors">
                                        Terms & Conditions
                                    </Link>
                                </li>
                            </ul>
                        </div>
                    </div>
                    <div className="mt-8 border-t border-gray-200 pt-8 text-center text-sm text-gray-400">
                        &copy; 2026 Qalcuity. All rights reserved.
                    </div>
                </div>
            </footer>
        </main>
    );
}
