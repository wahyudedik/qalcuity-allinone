'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { formatCurrency, formatDate } from '@/lib/utils'
import { useTranslation } from '@/lib/i18n'
import { ArrowLeft, Star, Pencil, Package, ClipboardList, Mail, Phone, MapPin, Trash2 } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

interface SupplierDetail {
    id: string
    name: string
    contactPerson: string
    email: string
    phone: string
    address: string
    category: string
    rating: number
    status: string
    totalOrders: number
    lastOrder: string
    createdAt: string
    products: Array<{ name: string; price: number; leadTime: string }>
}

export default function SupplierDetailPage({ params }: { params: { id: string } }) {
    const { t } = useTranslation()
    const { data: session } = useSession()
    const canMutate = session?.user?.role !== 'VIEWER'
    const router = useRouter()
    const [supplier, setSupplier] = useState<SupplierDetail | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

    useEffect(() => {
        const fetchSupplier = async () => {
            try {
                const response = await fetch(`/api/inventory/suppliers/${params.id}`)
                const data = await response.json()
                if (data.success) {
                    setSupplier(data.data)
                } else {
                    setError(t('inventory.supplierDetail.error'))
                }
            } catch {
                setError(t('inventory.supplierDetail.errorLoad'))
            } finally {
                setLoading(false)
            }
        }
        fetchSupplier()
    }, [params.id, t])

    const handleDelete = async () => {
        setShowDeleteConfirm(true)
    }

    const confirmDelete = async () => {
        try {
            const res = await fetch(`/api/inventory/suppliers/${params.id}`, { method: 'DELETE' })
            const data = await res.json()
            if (data.success) {
                setToast({ message: t('inventory.supplierDetail.deleteSuccess'), type: 'success' })
                router.push('/dashboard/inventory/suppliers')
            } else {
                setToast({ message: data.error || t('inventory.supplierDetail.deleteError'), type: 'error' })
            }
        } catch {
            setToast({ message: t('inventory.supplierDetail.deleteError'), type: 'error' })
        }
    }

    if (loading) {
        return (
            <div className="p-6">
                <div className="h-6 w-32 animate-pulse rounded bg-gray-200" />
                <div className="mt-4 h-48 animate-pulse rounded-xl bg-gray-100" />
            </div>
        )
    }

    if (error || !supplier) {
        return (
            <div className="flex h-64 items-center justify-center">
                <div className="text-center">
                    <p className="text-lg text-gray-600">{error || t('inventory.supplierDetail.error')}</p>
                    <Link href="/dashboard/inventory/suppliers" className="mt-4 inline-block text-blue-600 hover:text-blue-800">
                        ← {t('inventory.supplierDetail.backToSuppliers')}
                    </Link>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6 p-6">
            {/* Header */}
            <div>
                <Link href="/dashboard/inventory/suppliers" className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900">
                    <ArrowLeft className="h-4 w-4" />
                    {t('inventory.supplierDetail.backToSuppliers')}
                </Link>
                <div className="mt-4 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">{supplier.name}</h1>
                        <p className="text-sm text-gray-500">{supplier.category} • {supplier.contactPerson}</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="text-right">
                            <p className="text-sm text-gray-500">{t('inventory.supplierDetail.rating')}</p>
                            <div className="flex items-center gap-1">
                                {Array.from({ length: 5 }, (_, i) => (
                                    <Star key={i} className={`h-4 w-4 ${i < Math.round(supplier.rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
                                ))}
                                <span className="ml-1 text-sm font-medium text-gray-700">{supplier.rating}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                {/* Main Info */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Contact Info */}
                    <div className="rounded-xl border border-gray-200 bg-white p-6">
                        <h3 className="text-lg font-semibold text-gray-900">{t('inventory.supplierDetail.contactInfo')}</h3>
                        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div>
                                <p className="text-sm text-gray-500">{t('inventory.supplierDetail.contactPerson')}</p>
                                <p className="font-medium text-gray-900">{supplier.contactPerson}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <Mail className="h-4 w-4 text-gray-400" />
                                <div>
                                    <p className="text-sm text-gray-500">{t('inventory.supplierDetail.email')}</p>
                                    <p className="font-medium text-gray-900">{supplier.email}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Phone className="h-4 w-4 text-gray-400" />
                                <div>
                                    <p className="text-sm text-gray-500">{t('inventory.supplierDetail.phone')}</p>
                                    <p className="font-medium text-gray-900">{supplier.phone}</p>
                                </div>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">{t('inventory.supplierDetail.category')}</p>
                                <p className="font-medium text-gray-900">{supplier.category}</p>
                            </div>
                            <div className="flex items-start gap-2 sm:col-span-2">
                                <MapPin className="mt-1 h-4 w-4 text-gray-400" />
                                <div>
                                    <p className="text-sm text-gray-500">{t('inventory.supplierDetail.address')}</p>
                                    <p className="font-medium text-gray-900">{supplier.address}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Products */}
                    {supplier.products.length > 0 && (
                        <div className="rounded-xl border border-gray-200 bg-white p-6">
                            <h3 className="text-lg font-semibold text-gray-900">{t('inventory.supplierDetail.suppliedProducts')}</h3>
                            <div className="mt-4 overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="border-b border-gray-200 bg-gray-50">
                                        <tr>
                                            <th className="px-4 py-3 font-medium text-gray-600">{t('inventory.supplierDetail.product')}</th>
                                            <th className="px-4 py-3 text-right font-medium text-gray-600">{t('inventory.supplierDetail.price')}</th>
                                            <th className="px-4 py-3 text-center font-medium text-gray-600">{t('inventory.supplierDetail.leadTime')}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {supplier.products.map((product, idx) => (
                                            <tr key={idx} className="hover:bg-gray-50">
                                                <td className="px-4 py-3 font-medium text-gray-900">{product.name}</td>
                                                <td className="px-4 py-3 text-right text-gray-900">{formatCurrency(Number(product.price))}</td>
                                                <td className="px-4 py-3 text-center text-gray-600">{product.leadTime}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Order Stats */}
                    <div className="rounded-xl border border-gray-200 bg-white p-6">
                        <h3 className="text-lg font-semibold text-gray-900">{t('inventory.supplierDetail.orderStats')}</h3>
                        <div className="mt-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-500">{t('inventory.supplierDetail.totalOrders')}</span>
                                <span className="text-lg font-bold text-gray-900">{supplier.totalOrders}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-500">{t('inventory.supplierDetail.lastOrder')}</span>
                                <span className="text-sm text-gray-900">{formatDate(supplier.lastOrder)}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-500">{t('inventory.supplierDetail.rating')}</span>
                                <div className="flex items-center gap-1">
                                    {Array.from({ length: 5 }, (_, i) => (
                                        <Star key={i} className={`h-3 w-3 ${i < Math.round(supplier.rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
                                    ))}
                                    <span className="ml-1 text-sm text-gray-700">{supplier.rating}/5</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Quick Info */}
                    <div className="rounded-xl border border-gray-200 bg-white p-6">
                        <h3 className="text-lg font-semibold text-gray-900">{t('inventory.supplierDetail.details')}</h3>
                        <div className="mt-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-500">{t('inventory.supplierDetail.supplierId')}</span>
                                <span className="font-mono text-sm text-gray-900">{supplier.id}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-500">{t('inventory.supplierDetail.createdAt')}</span>
                                <span className="text-sm text-gray-900">{formatDate(supplier.createdAt)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="rounded-xl border border-gray-200 bg-white p-6">
                        <h3 className="text-lg font-semibold text-gray-900">{t('inventory.supplierDetail.actions')}</h3>
                        <div className="mt-4 space-y-3">
                            <button
                                onClick={() => router.push(`/dashboard/inventory/suppliers/${params.id}/edit`)}
                                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                            >
                                <Pencil className="h-4 w-4" />
                                {t('inventory.supplierDetail.edit')}
                            </button>
                            <Link
                                href="/dashboard/finance/purchase-orders"
                                className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                            >
                                <Package className="h-4 w-4" />
                                {t('inventory.supplierDetail.createPO')}
                            </Link>
                            <button
                                onClick={() => router.push('/dashboard/finance/purchase-orders')}
                                className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                            >
                                <ClipboardList className="h-4 w-4" />
                                {t('inventory.supplierDetail.orderHistory')}
                            </button>
                            {canMutate && (
                                <button onClick={handleDelete} className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50">
                                    <Trash2 className="h-4 w-4" />
                                    {t('inventory.supplierDetail.delete')}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Delete Confirm Dialog */}
            <ConfirmDialog
                isOpen={showDeleteConfirm}
                onClose={() => setShowDeleteConfirm(false)}
                onConfirm={confirmDelete}
                title="Konfirmasi Hapus"
                message={t('inventory.supplierDetail.confirmDelete')}
                confirmText="Hapus"
                cancelText="Batal"
                variant="danger"
            />
        </div>
    )
}
