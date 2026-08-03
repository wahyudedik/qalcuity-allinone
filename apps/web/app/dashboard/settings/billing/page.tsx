'use client'

import { useState } from 'react'

const plans = [
    {
        id: 'starter',
        name: 'Starter',
        price: 299000,
        period: 'bulan',
        features: [
            '1 Admin',
            '3 User',
            'Finance & Accounting',
            'Sales & CRM (Basic)',
            'Inventory (Basic)',
            '100MB Storage',
            'Email Support',
        ],
        highlighted: false,
    },
    {
        id: 'growth',
        name: 'Growth',
        price: 799000,
        period: 'bulan',
        features: [
            '2 Admin',
            '10 User',
            'Semua modul Starter',
            'HR & People Ops',
            'Project Management',
            'AI Features (Basic)',
            '1GB Storage',
            'Priority Support',
            'API Access',
        ],
        highlighted: true,
    },
    {
        id: 'business',
        name: 'Business',
        price: 1999000,
        period: 'bulan',
        features: [
            '5 Admin',
            '25 User',
            'Semua modul Growth',
            'Customer Support',
            'AI Features (Advanced)',
            'Custom Reports',
            '10GB Storage',
            'Phone Support',
            'White-label Ready',
        ],
        highlighted: false,
    },
]

export default function BillingSettingsPage() {
    const [currentPlan] = useState('growth')

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
        }).format(amount)
    }

    return (
        <div className="space-y-6">
            {/* Current Plan */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900">Paket Saat Ini</h2>
                        <p className="text-sm text-gray-600 mt-1">Kelola langganan Anda</p>
                    </div>
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-700">
                        Growth Plan
                    </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 pt-4 border-t border-gray-200">
                    <div>
                        <div className="text-sm text-gray-600">Tagihan Bulanan</div>
                        <div className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(799000)}</div>
                    </div>
                    <div>
                        <div className="text-sm text-gray-600">User Digunakan</div>
                        <div className="text-2xl font-bold text-gray-900 mt-1">7 / 10</div>
                    </div>
                    <div>
                        <div className="text-sm text-gray-600">Storage</div>
                        <div className="text-2xl font-bold text-gray-900 mt-1">256MB / 1GB</div>
                    </div>
                    <div>
                        <div className="text-sm text-gray-600">Pembayaran Berikutnya</div>
                        <div className="text-2xl font-bold text-gray-900 mt-1">3 Sep 2026</div>
                    </div>
                </div>

                <div className="flex gap-3 mt-6">
                    <button className="px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
                        Upgrade Plan
                    </button>
                    <button className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                        Lihat Invoice
                    </button>
                </div>
            </div>

            {/* Available Plans */}
            <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Paket Tersedia</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {plans.map((plan) => (
                        <div
                            key={plan.id}
                            className={`bg-white rounded-xl border-2 p-6 ${plan.highlighted
                                    ? 'border-blue-500 shadow-lg'
                                    : currentPlan === plan.id
                                        ? 'border-green-500'
                                        : 'border-gray-200'
                                }`}
                        >
                            {plan.highlighted && (
                                <div className="inline-block px-3 py-1 bg-blue-600 text-white text-xs font-medium rounded-full mb-4">
                                    Populer
                                </div>
                            )}
                            {currentPlan === plan.id && (
                                <div className="inline-block px-3 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full mb-4">
                                    Paket Anda
                                </div>
                            )}

                            <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
                            <div className="mt-2">
                                <span className="text-3xl font-bold text-gray-900">{formatCurrency(plan.price)}</span>
                                <span className="text-gray-600">/{plan.period}</span>
                            </div>

                            <ul className="mt-6 space-y-3">
                                {plan.features.map((feature, idx) => (
                                    <li key={idx} className="flex items-start gap-3">
                                        <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                        <span className="text-sm text-gray-700">{feature}</span>
                                    </li>
                                ))}
                            </ul>

                            <button
                                className={`w-full mt-6 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${currentPlan === plan.id
                                        ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                                        : plan.highlighted
                                            ? 'bg-blue-600 text-white hover:bg-blue-700'
                                            : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                                    }`}
                                disabled={currentPlan === plan.id}
                            >
                                {currentPlan === plan.id ? 'Paket Aktif' : 'Pilih Paket'}
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* Payment Method */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Metode Pembayaran</h2>
                <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-8 bg-blue-600 rounded flex items-center justify-center">
                            <span className="text-white text-xs font-bold">VISA</span>
                        </div>
                        <div>
                            <div className="font-medium text-gray-900">Visa **** 4242</div>
                            <div className="text-sm text-gray-500">Expires 12/2028</div>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800">
                            Edit
                        </button>
                        <button className="px-3 py-1.5 text-sm text-red-600 hover:text-red-700">
                            Hapus
                        </button>
                    </div>
                </div>
                <button className="mt-4 text-sm text-blue-600 hover:text-blue-700 font-medium">
                    + Tambah Metode Pembayaran
                </button>
            </div>

            {/* Invoice History */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Riwayat Invoice</h2>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-gray-200">
                                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Invoice</th>
                                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Tanggal</th>
                                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Jumlah</th>
                                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Status</th>
                                <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            <tr>
                                <td className="py-3 px-4 text-sm text-gray-900">INV-2026-008</td>
                                <td className="py-3 px-4 text-sm text-gray-600">3 Agustus 2026</td>
                                <td className="py-3 px-4 text-sm text-gray-900">{formatCurrency(799000)}</td>
                                <td className="py-3 px-4">
                                    <span className="inline-flex px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-full">
                                        Lunas
                                    </span>
                                </td>
                                <td className="py-3 px-4 text-right">
                                    <button className="text-sm text-blue-600 hover:text-blue-700">Download</button>
                                </td>
                            </tr>
                            <tr>
                                <td className="py-3 px-4 text-sm text-gray-900">INV-2026-007</td>
                                <td className="py-3 px-4 text-sm text-gray-600">3 Juli 2026</td>
                                <td className="py-3 px-4 text-sm text-gray-900">{formatCurrency(799000)}</td>
                                <td className="py-3 px-4">
                                    <span className="inline-flex px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-full">
                                        Lunas
                                    </span>
                                </td>
                                <td className="py-3 px-4 text-right">
                                    <button className="text-sm text-blue-600 hover:text-blue-700">Download</button>
                                </td>
                            </tr>
                            <tr>
                                <td className="py-3 px-4 text-sm text-gray-900">INV-2026-006</td>
                                <td className="py-3 px-4 text-sm text-gray-600">3 Juni 2026</td>
                                <td className="py-3 px-4 text-sm text-gray-900">{formatCurrency(799000)}</td>
                                <td className="py-3 px-4">
                                    <span className="inline-flex px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-full">
                                        Lunas
                                    </span>
                                </td>
                                <td className="py-3 px-4 text-right">
                                    <button className="text-sm text-blue-600 hover:text-blue-700">Download</button>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
