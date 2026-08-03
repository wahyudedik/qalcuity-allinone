'use client'

import Link from 'next/link'

const summaryCards = [
    { title: 'Total Produk', value: '248', icon: '📦', color: 'text-blue-600', href: '/dashboard/inventory/products' },
    { title: 'Stok Tersedia', value: '12,450', icon: '📋', color: 'text-green-600', href: '/dashboard/inventory/stock' },
    { title: 'Stok Menipis', value: '18', icon: '⚠️', color: 'text-yellow-600', href: '/dashboard/inventory/stock' },
    { title: 'Stok Habis', value: '5', icon: '🔴', color: 'text-red-600', href: '/dashboard/inventory/stock' },
]

const lowStockItems = [
    { name: 'Widget A', sku: 'SKU-001', current: 15, min: 50, status: 'critical' },
    { name: 'Component B', sku: 'SKU-023', current: 8, min: 30, status: 'critical' },
    { name: 'Part C', sku: 'SKU-045', current: 25, min: 100, status: 'warning' },
    { name: 'Module D', sku: 'SKU-067', current: 12, min: 40, status: 'critical' },
    { name: 'Kit E', sku: 'SKU-089', current: 45, min: 50, status: 'warning' },
]

const recentMovements = [
    { type: 'in', product: 'Widget A', qty: 100, date: '3 Agt 2026', ref: 'PO-2026-001' },
    { type: 'out', product: 'Component B', qty: 50, date: '3 Agt 2026', ref: 'INV-2026-001' },
    { type: 'in', product: 'Part C', qty: 200, date: '2 Agt 2026', ref: 'PO-2026-002' },
    { type: 'out', product: 'Module D', qty: 30, date: '2 Agt 2026', ref: 'INV-2026-003' },
    { type: 'adjustment', product: 'Kit E', qty: -5, date: '1 Agt 2026', ref: 'ADJ-001' },
]

export default function InventoryPage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Inventory Overview</h1>
                <p className="text-gray-500">Ringkasan stok dan persediaan produk</p>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {summaryCards.map((card) => (
                    <Link key={card.title} href={card.href} className="rounded-xl border border-gray-200 bg-white p-4 transition-shadow hover:shadow-md">
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-500">{card.title}</span>
                            <span className="text-2xl">{card.icon}</span>
                        </div>
                        <p className={`mt-2 text-2xl font-bold ${card.color}`}>{card.value}</p>
                    </Link>
                ))}
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {/* Low Stock Alert */}
                <div className="rounded-xl border border-gray-200 bg-white">
                    <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
                        <h2 className="font-semibold text-gray-900">⚠️ Stok Menipis</h2>
                        <Link href="/dashboard/inventory/stock" className="text-sm text-blue-600 hover:underline">Lihat Semua →</Link>
                    </div>
                    <div className="divide-y divide-gray-100">
                        {lowStockItems.map((item) => (
                            <div key={item.sku} className="flex items-center justify-between px-4 py-3">
                                <div>
                                    <p className="font-medium text-gray-900">{item.name}</p>
                                    <p className="text-xs text-gray-500">{item.sku}</p>
                                </div>
                                <div className="text-right">
                                    <p className={`text-sm font-semibold ${item.status === 'critical' ? 'text-red-600' : 'text-yellow-600'}`}>
                                        {item.current} / {item.min}
                                    </p>
                                    <button className="text-xs text-blue-600 hover:underline">Reorder</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Recent Movements */}
                <div className="rounded-xl border border-gray-200 bg-white">
                    <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
                        <h2 className="font-semibold text-gray-900">📋 Pergerakan Stok Terbaru</h2>
                        <Link href="/dashboard/inventory/stock" className="text-sm text-blue-600 hover:underline">Lihat Semua →</Link>
                    </div>
                    <div className="divide-y divide-gray-100">
                        {recentMovements.map((m, i) => (
                            <div key={i} className="flex items-center gap-3 px-4 py-3">
                                <span className={`flex h-8 w-8 items-center justify-center rounded-full text-sm ${m.type === 'in' ? 'bg-green-100 text-green-700' : m.type === 'out' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                    {m.type === 'in' ? '↓' : m.type === 'out' ? '↑' : '↺'}
                                </span>
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-gray-900">{m.product}</p>
                                    <p className="text-xs text-gray-500">{m.ref} · {m.date}</p>
                                </div>
                                <span className={`text-sm font-semibold ${m.type === 'in' ? 'text-green-600' : m.type === 'out' ? 'text-red-600' : 'text-yellow-600'}`}>
                                    {m.type === 'in' ? '+' : m.type === 'out' ? '-' : ''}{m.qty}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}
