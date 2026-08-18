'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { formatCurrency } from '@/lib/utils'
import { useTranslation } from '@/lib/i18n'
import { Search, Plus, Star, AlertTriangle, Building2 } from 'lucide-react'

type Supplier = {
    id: string
    name: string
    contactPerson: string
    email: string
    phone: string
    address: string
    rating: number
    totalOrders: number
    totalSpent: number
    status: string
    createdAt: string
}

export default function SuppliersPage() {
    const { t } = useTranslation()
    const [suppliers, setSuppliers] = useState<Supplier[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [searchQuery, setSearchQuery] = useState('')
    const [filterStatus, setFilterStatus] = useState('all')

    useEffect(() => {
        fetchSuppliers()
    }, [])

    const fetchSuppliers = async () => {
        try {
            setLoading(true)
            const response = await fetch('/api/inventory/suppliers')
            const data = await response.json()
            if (data.success) {
                setSuppliers(data.data)
            } else {
                setError(t('inventory.suppliers.error'))
            }
        } catch {
            setError(t('inventory.suppliers.errorHint'))
        } finally {
            setLoading(false)
        }
    }

    const filtered = suppliers.filter((s) => {
        const matchStatus = filterStatus === 'all' || s.status === filterStatus
        const matchSearch = searchQuery === '' ||
            s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            s.contactPerson.toLowerCase().includes(searchQuery.toLowerCase())
        return matchStatus && matchSearch
    })

    const stats = {
        total: suppliers.length,
        active: suppliers.filter(s => s.status === 'active').length,
        inactive: suppliers.filter(s => s.status === 'inactive').length,
        totalSpent: suppliers.reduce((sum, s) => sum + s.totalSpent, 0),
    }

    const renderStars = (rating: number) => {
        return Array.from({ length: 5 }, (_, i) => (
            <Star
                key={i}
                className={`h-4 w-4 ${i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
            />
        ))
    }

    if (loading) {
        return (
            <div className="space-y-6 p-6">
                <div className="animate-pulse">
                    <div className="h-8 bg-gray-200 rounded w-48 mb-4"></div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="h-24 bg-gray-200 rounded-xl"></div>
                        ))}
                    </div>
                    <div className="h-96 bg-gray-200 rounded-xl"></div>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="p-6">
                <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
                    <AlertTriangle className="mx-auto mb-2 h-8 w-8 text-red-500" />
                    <p className="text-red-600">{error}</p>
                    <button
                        onClick={fetchSuppliers}
                        className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                    >
                        {t('inventory.suppliers.retry')}
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">{t('inventory.suppliers.title')}</h1>
                    <p className="text-gray-500">{stats.total} {t('inventory.suppliers.subtitle')}</p>
                </div>
                <button className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700">
                    <Plus className="h-4 w-4" />
                    {t('inventory.suppliers.addSupplier')}
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                    <p className="text-sm text-gray-500">{t('inventory.suppliers.totalSuppliers')}</p>
                    <p className="mt-1 text-2xl font-bold text-gray-900">{stats.total}</p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                    <p className="text-sm text-gray-500">{t('inventory.suppliers.active')}</p>
                    <p className="mt-1 text-2xl font-bold text-green-600">{stats.active}</p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                    <p className="text-sm text-gray-500">{t('inventory.suppliers.inactive')}</p>
                    <p className="mt-1 text-2xl font-bold text-gray-500">{stats.inactive}</p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                    <p className="text-sm text-gray-500">{t('inventory.suppliers.totalSpend')}</p>
                    <p className="mt-1 text-xl font-bold text-blue-600">{formatCurrency(stats.totalSpent)}</p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-4 sm:flex-row sm:items-center">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder={t('inventory.suppliers.searchPlaceholder')}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 pl-9 pr-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                </div>
                <div className="flex gap-2">
                    {['all', 'active', 'inactive'].map((status) => (
                        <button
                            key={status}
                            onClick={() => setFilterStatus(status)}
                            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${filterStatus === status
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                        >
                            {status === 'all' ? t('inventory.suppliers.allStatuses') : status === 'active' ? t('inventory.suppliers.active') : t('inventory.suppliers.inactive')}
                        </button>
                    ))}
                </div>
            </div>

            {/* Suppliers Table */}
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="border-b border-gray-200 bg-gray-50">
                                <th className="px-4 py-3 font-medium text-gray-600">{t('inventory.suppliers.supplier')}</th>
                                <th className="px-4 py-3 font-medium text-gray-600">{t('inventory.suppliers.contact')}</th>
                                <th className="px-4 py-3 font-medium text-gray-600">{t('inventory.suppliers.rating')}</th>
                                <th className="px-4 py-3 text-right font-medium text-gray-600">{t('inventory.suppliers.totalOrder')}</th>
                                <th className="px-4 py-3 text-right font-medium text-gray-600">{t('inventory.suppliers.totalSpent')}</th>
                                <th className="px-4 py-3 text-center font-medium text-gray-600">{t('inventory.suppliers.status')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-12 text-center text-gray-500">
                                        <Building2 className="mx-auto mb-2 h-8 w-8 text-gray-400" />
                                        {t('inventory.suppliers.noSuppliers')}
                                    </td>
                                </tr>
                            ) : (
                                filtered.map((supplier) => (
                                    <tr key={supplier.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3">
                                            <div>
                                                <Link href={`/dashboard/inventory/suppliers/${supplier.id}`} className="font-medium text-blue-600 hover:text-blue-800">
                                                    {supplier.name}
                                                </Link>
                                                <p className="text-xs text-gray-500">{supplier.email}</p>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div>
                                                <p className="text-gray-900">{supplier.contactPerson}</p>
                                                <p className="text-xs text-gray-500">{supplier.phone}</p>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-1">
                                                {renderStars(supplier.rating)}
                                                <span className="ml-1 text-xs text-gray-500">({supplier.rating})</span>
                                            </div>
                                        </td>
                                        <td className="whitespace-nowrap px-4 py-3 text-right font-medium">{supplier.totalOrders}</td>
                                        <td className="whitespace-nowrap px-4 py-3 text-right font-medium">{formatCurrency(supplier.totalSpent)}</td>
                                        <td className="whitespace-nowrap px-4 py-3 text-center">
                                            <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${supplier.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                                {supplier.status === 'active' ? t('inventory.suppliers.active') : t('inventory.suppliers.inactive')}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
