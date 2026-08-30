'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
    Package,
    ClipboardList,
    AlertTriangle,
    CircleOff,
    Users,
    Tag,
    AlertCircle,
    Inbox,
} from 'lucide-react'
import { useTranslation } from '@/lib/i18n'
import { formatNumber, formatDate } from '@/lib/utils'

interface Product {
    id: string
    sku: string
    name: string
    description: string
    unit: string
    price: number
    cost: number
    stock: number
    minStock: number
    isActive: boolean
    categoryId: string
    categoryName: string | null
    isLowStock: boolean
    createdAt: string
}

interface Supplier {
    id: string
    name: string
    contactPerson: string
    email: string
    phone: string
    isActive: boolean
    totalOrders: number
}

interface Category {
    id: string
    name: string
    description: string
    productCount: number
    totalValue: number
}

export default function InventoryPage() {
    const { t } = useTranslation()
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [products, setProducts] = useState<Product[]>([])
    const [suppliers, setSuppliers] = useState<Supplier[]>([])
    const [categories, setCategories] = useState<Category[]>([])
    const [productTotal, setProductTotal] = useState(0)

    useEffect(() => {
        async function fetchData() {
            try {
                const [productsRes, suppliersRes, categoriesRes] = await Promise.all([
                    fetch('/api/inventory/products?limit=100'),
                    fetch('/api/inventory/suppliers?limit=100'),
                    fetch('/api/inventory/categories'),
                ])

                if (!productsRes.ok || !suppliersRes.ok || !categoriesRes.ok) {
                    throw new Error('Gagal memuat data inventaris')
                }

                const productsJson = await productsRes.json()
                const suppliersJson = await suppliersRes.json()
                const categoriesJson = await categoriesRes.json()

                setProducts(
                    productsJson.success && Array.isArray(productsJson.data)
                        ? productsJson.data
                        : []
                )
                setProductTotal(productsJson.total || 0)
                setSuppliers(
                    suppliersJson.success && Array.isArray(suppliersJson.data)
                        ? suppliersJson.data
                        : []
                )
                setCategories(
                    categoriesJson.success && Array.isArray(categoriesJson.data)
                        ? categoriesJson.data
                        : []
                )
            } catch (err) {
                setError(
                    err instanceof Error ? err.message : 'Gagal memuat data'
                )
            } finally {
                setLoading(false)
            }
        }
        fetchData()
    }, [])

    // Hitung summary dari data real
    const totalProducts = productTotal
    const totalStock = products.reduce((sum, p) => sum + (Number(p.stock) || 0), 0)
    const lowStockItems = products.filter((p) => p.isLowStock)
    const lowStockCount = lowStockItems.length
    const outOfStockCount = products.filter((p) => Number(p.stock) === 0).length
    const totalSuppliers = suppliers.length
    const totalCategories = categories.length

    const summaryCards = [
        { titleKey: 'inventory.overview.totalProducts', value: formatNumber(totalProducts), icon: Package, color: 'text-blue-600', href: '/dashboard/inventory/products' },
        { titleKey: 'inventory.overview.availableStock', value: formatNumber(totalStock), icon: ClipboardList, color: 'text-green-600', href: '/dashboard/inventory/stock' },
        { titleKey: 'inventory.overview.lowStock', value: String(lowStockCount), icon: AlertTriangle, color: 'text-yellow-600', href: '/dashboard/inventory/stock' },
        { titleKey: 'inventory.overview.outOfStock', value: String(outOfStockCount), icon: CircleOff, color: 'text-red-600', href: '/dashboard/inventory/stock' },
    ]

    // Recent products (5 terbaru)
    const recentProducts = products.slice(0, 5)

    // Loading state
    if (loading) {
        return (
            <div className="space-y-6">
                <div>
                    <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
                    <div className="h-4 w-64 bg-gray-200 rounded animate-pulse mt-2" />
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                            <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
                            <div className="h-7 w-20 bg-gray-200 rounded animate-pulse mt-2" />
                        </div>
                    ))}
                </div>
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    {Array.from({ length: 2 }).map((_, i) => (
                        <div key={i} className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
                            <div className="p-4">
                                <div className="h-5 w-32 bg-gray-200 rounded animate-pulse mb-4" />
                                {Array.from({ length: 5 }).map((_, j) => (
                                    <div key={j} className="flex justify-between py-3 border-b border-gray-100 dark:border-gray-700 last:border-0">
                                        <div className="h-4 w-40 bg-gray-200 rounded animate-pulse" />
                                        <div className="h-4 w-16 bg-gray-200 rounded animate-pulse" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )
    }

    // Error state
    if (error) {
        return (
            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('inventory.overview.title')}</h1>
                    <p className="text-gray-500 dark:text-gray-400">{t('inventory.overview.subtitle')}</p>
                </div>
                <div className="rounded-xl border border-red-200 bg-red-50 p-6 dark:border-red-800 dark:bg-red-900/20">
                    <div className="flex items-center gap-3">
                        <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                        <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('inventory.overview.title')}</h1>
                <p className="text-gray-500 dark:text-gray-400">{t('inventory.overview.subtitle')}</p>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {summaryCards.map((card) => {
                    const Icon = card.icon
                    return (
                        <Link key={card.titleKey} href={card.href} className="rounded-xl border border-gray-200 bg-white p-4 transition-shadow hover:shadow-md dark:border-gray-700 dark:bg-gray-800">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-500 dark:text-gray-400">{t(card.titleKey)}</span>
                                <Icon className={`h-6 w-6 ${card.color}`} />
                            </div>
                            <p className={`mt-2 text-2xl font-bold ${card.color}`}>{card.value}</p>
                        </Link>
                    )
                })}
            </div>

            {/* Extra Info Cards: Suppliers & Categories */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                    <div className="flex items-center gap-2">
                        <Users className="h-5 w-5 text-blue-600" />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Total Suppliers</span>
                    </div>
                    <p className="mt-2 text-2xl font-bold text-blue-600">{formatNumber(totalSuppliers)}</p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                    <div className="flex items-center gap-2">
                        <Tag className="h-5 w-5 text-purple-600" />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Total Kategori</span>
                    </div>
                    <p className="mt-2 text-2xl font-bold text-purple-600">{formatNumber(totalCategories)}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {/* Low Stock Alert */}
                <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
                    <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-700">
                        <h2 className="flex items-center gap-2 font-semibold text-gray-900 dark:text-gray-100">
                            <AlertTriangle className="h-4 w-4 text-yellow-500" />
                            {t('inventory.overview.lowStockItems')}
                        </h2>
                        <Link href="/dashboard/inventory/stock" className="text-sm text-blue-600 hover:underline">{t('inventory.overview.viewAll')}</Link>
                    </div>
                    <div className="divide-y divide-gray-100 dark:divide-gray-700">
                        {lowStockItems.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-8 text-gray-500 dark:text-gray-400">
                                <Inbox className="h-8 w-8 mb-2" />
                                <p className="text-sm">Semua stok dalam kondisi aman</p>
                            </div>
                        ) : (
                            lowStockItems.slice(0, 5).map((item) => {
                                const isCritical = Number(item.stock) <= Number(item.minStock) * 0.5
                                return (
                                    <div key={item.id} className="flex items-center justify-between px-4 py-3">
                                        <div>
                                            <p className="font-medium text-gray-900 dark:text-gray-100">{item.name}</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">{item.sku}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className={`text-sm font-semibold ${isCritical ? 'text-red-600' : 'text-yellow-600'}`}>
                                                {formatNumber(Number(item.stock))} / {formatNumber(Number(item.minStock))}
                                            </p>
                                            <Link href="/dashboard/inventory/stock" className="text-xs text-blue-600 hover:underline">{t('inventory.overview.reorder')}</Link>
                                        </div>
                                    </div>
                                )
                            })
                        )}
                    </div>
                </div>

                {/* Recent Products */}
                <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
                    <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-700">
                        <h2 className="flex items-center gap-2 font-semibold text-gray-900 dark:text-gray-100">
                            <Package className="h-4 w-4 text-blue-500" />
                            {t('inventory.overview.recentProducts') || 'Produk Terbaru'}
                        </h2>
                        <Link href="/dashboard/inventory/products" className="text-sm text-blue-600 hover:underline">{t('inventory.overview.viewAll')}</Link>
                    </div>
                    <div className="divide-y divide-gray-100 dark:divide-gray-700">
                        {recentProducts.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-8 text-gray-500 dark:text-gray-400">
                                <Inbox className="h-8 w-8 mb-2" />
                                <p className="text-sm">Belum ada produk</p>
                            </div>
                        ) : (
                            recentProducts.map((product) => (
                                <div key={product.id} className="flex items-center justify-between px-4 py-3">
                                    <div>
                                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{product.name}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                            {product.sku} · {product.categoryName || 'Tanpa kategori'} · {formatDate(product.createdAt)}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                            Stok: {formatNumber(Number(product.stock))} {product.unit}
                                        </p>
                                        {product.isLowStock && (
                                            <span className="inline-block rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800">
                                                Low Stock
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
