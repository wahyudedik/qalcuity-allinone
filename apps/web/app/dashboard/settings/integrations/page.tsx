'use client'

import { useState } from 'react'
import {
    MessageSquare,
    Mail,
    Calendar,
    ShoppingBag,
    Store,
    Landmark,
    CreditCard,
    BarChart3,
    Package,
    Bike,
    Info,
    Search,
    type LucideIcon,
} from 'lucide-react'

interface Integration {
    id: string
    name: string
    description: string
    icon: LucideIcon
    color: string
    connected: boolean
    category: string
}

const integrations: Integration[] = [
    {
        id: 'whatsapp',
        name: 'WhatsApp Business',
        description: 'Kiriman pesan WhatsApp otomatis untuk invoice dan reminder',
        icon: MessageSquare,
        color: 'bg-green-500',
        connected: true,
        category: 'Komunikasi',
    },
    {
        id: 'email',
        name: 'Email (SMTP)',
        description: 'Kirim email dari alamat domain Anda sendiri',
        icon: Mail,
        color: 'bg-blue-500',
        connected: true,
        category: 'Komunikasi',
    },
    {
        id: 'google-calendar',
        name: 'Google Calendar',
        description: 'Sinkronisasi jadwal dan meeting ke Google Calendar',
        icon: Calendar,
        color: 'bg-red-500',
        connected: false,
        category: 'Produktivitas',
    },
    {
        id: 'shopee',
        name: 'Shopee',
        description: 'Sinkronisasi pesanan dan produk dari Shopee',
        icon: ShoppingBag,
        color: 'bg-orange-500',
        connected: false,
        category: 'Marketplace',
    },
    {
        id: 'tokopedia',
        name: 'Tokopedia',
        description: 'Sinkronisasi pesanan dan produk dari Tokopedia',
        icon: Store,
        color: 'bg-green-600',
        connected: false,
        category: 'Marketplace',
    },
    {
        id: 'bank-bca',
        name: 'Bank BCA',
        description: 'Rekonsiliasi otomatis transaksi bank BCA',
        icon: Landmark,
        color: 'bg-blue-700',
        connected: false,
        category: 'Payment',
    },
    {
        id: 'bank-mandiri',
        name: 'Bank Mandiri',
        description: 'Rekonsiliasi otomatis transaksi bank Mandiri',
        icon: Landmark,
        color: 'bg-blue-800',
        connected: false,
        category: 'Payment',
    },
    {
        id: 'midtrans',
        name: 'Midtrans',
        description: 'Terima pembayaran online via Midtrans',
        icon: CreditCard,
        color: 'bg-purple-600',
        connected: true,
        category: 'Payment',
    },
    {
        id: 'xendit',
        name: 'Xendit',
        description: 'Terima pembayaran online via Xendit',
        icon: CreditCard,
        color: 'bg-indigo-600',
        connected: false,
        category: 'Payment',
    },
    {
        id: 'google-sheets',
        name: 'Google Sheets',
        description: 'Ekspor data ke Google Sheets untuk analisis',
        icon: BarChart3,
        color: 'bg-green-500',
        connected: false,
        category: 'Produktivitas',
    },
    {
        id: 'jne',
        name: 'JNE',
        description: 'Cek ongkos kirim dan lacak pengiriman JNE',
        icon: Package,
        color: 'bg-red-600',
        connected: false,
        category: 'Logistik',
    },
    {
        id: 'grab',
        name: 'Grab Express',
        description: 'Pengiriman instant via Grab Express',
        icon: Bike,
        color: 'bg-green-700',
        connected: false,
        category: 'Logistik',
    },
]

export default function IntegrationsSettingsPage() {
    const [search, setSearch] = useState('')
    const [activeCategory, setActiveCategory] = useState('Semua')

    const categories = ['Semua', ...new Set(integrations.map(i => i.category))]

    const filteredIntegrations = integrations.filter(i => {
        const matchesSearch = i.name.toLowerCase().includes(search.toLowerCase()) ||
            i.description.toLowerCase().includes(search.toLowerCase())
        const matchesCategory = activeCategory === 'Semua' || i.category === activeCategory
        return matchesSearch && matchesCategory
    })

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Integrasi</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Hubungkan Qalcuity dengan layanan pihak ketiga. Anda mengelola API key sendiri.
                </p>
            </div>

            {/* Notice */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 dark:bg-blue-900/20 dark:border-blue-800">
                <div className="flex items-start gap-3">
                    <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
                    <div>
                        <h3 className="font-medium text-blue-900 dark:text-blue-300">Tentang Integrasi</h3>
                        <p className="text-sm text-blue-700 dark:text-blue-400 mt-1">
                            Semua integrasi dikelola oleh Anda sendiri. Qalcuity menyediakan tempat untuk menghubungkan
                            API key dari layanan pihak ketiga. Biaya API key dibayar langsung ke provider masing-masing.
                        </p>
                    </div>
                </div>
            </div>

            {/* Search and Filter */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Cari integrasi..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                    />
                </div>
                <div className="flex gap-2 flex-wrap">
                    {categories.map((cat) => (
                        <button
                            key={cat}
                            onClick={() => setActiveCategory(cat)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeCategory === cat
                                ? 'bg-blue-600 text-white'
                                : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700'
                                }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            </div>

            {/* Connected */}
            <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">Terhubung</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredIntegrations.filter(i => i.connected).map((integration) => (
                        <IntegrationCard key={integration.id} integration={integration} />
                    ))}
                </div>
                {filteredIntegrations.filter(i => i.connected).length === 0 && (
                    <p className="text-sm text-gray-500 text-center py-4">Belum ada integrasi terhubung</p>
                )}
            </div>

            {/* Available */}
            <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">Tersedia</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredIntegrations.filter(i => !i.connected).map((integration) => (
                        <IntegrationCard key={integration.id} integration={integration} />
                    ))}
                </div>
            </div>
        </div>
    )
}

function IntegrationCard({ integration }: { integration: Integration }) {
    const [showConfig, setShowConfig] = useState(false)
    const Icon = integration.icon

    return (
        <div className="bg-white border border-gray-200 rounded-xl p-4 dark:bg-gray-800 dark:border-gray-700">
            <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 ${integration.color} rounded-xl flex items-center justify-center`}>
                        <Icon className="h-6 w-6 text-white" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h4 className="font-medium text-gray-900 dark:text-gray-100">{integration.name}</h4>
                            <span className="text-xs text-gray-500 bg-gray-100 dark:bg-gray-700 dark:text-gray-400 px-2 py-0.5 rounded-full">
                                {integration.category}
                            </span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{integration.description}</p>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-3 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                {integration.connected ? (
                    <>
                        <span className="inline-flex items-center gap-1.5 text-sm text-green-600">
                            <span className="w-2 h-2 bg-green-500 rounded-full" />
                            Terhubung
                        </span>
                        <button
                            onClick={() => setShowConfig(!showConfig)}
                            className="ml-auto text-sm text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                        >
                            Pengaturan
                        </button>
                        <button className="text-sm text-red-600 hover:text-red-700">
                            Putuskan
                        </button>
                    </>
                ) : (
                    <button
                        onClick={() => setShowConfig(!showConfig)}
                        className="ml-auto px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        Hubungkan
                    </button>
                )}
            </div>

            {/* Config Panel */}
            {showConfig && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200 dark:bg-gray-700/50 dark:border-gray-600">
                    <h5 className="font-medium text-gray-900 dark:text-gray-100 mb-3">
                        {integration.connected ? 'Konfigurasi' : 'Hubungkan'} {integration.name}
                    </h5>
                    <div className="space-y-3">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                API Key
                            </label>
                            <input
                                type="password"
                                placeholder="Masukkan API Key"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                API Secret (opsional)
                            </label>
                            <input
                                type="password"
                                placeholder="Masukkan API Secret"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                            />
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            API key Anda dienkripsi dan disimpan dengan aman. Hanya digunakan untuk komunikasi dengan {integration.name}.
                        </p>
                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => setShowConfig(false)}
                                className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                            >
                                Batal
                            </button>
                            <button className="px-4 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
                                {integration.connected ? 'Simpan' : 'Hubungkan'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
