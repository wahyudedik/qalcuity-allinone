'use client';

/**
 * POS Top Products — Top 10 products table dengan bar visualization
 *
 * Shows quantity sold + revenue for each product.
 * Uses bar visualization for quick comparison.
 */

import { useState, useEffect } from 'react';
import { Package, TrendingUp } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import { formatCurrency, formatNumber } from '@/lib/utils';

interface TopProduct {
    productId: string;
    productName: string;
    productSku: string;
    totalQuantity: number;
    totalRevenue: number;
    avgUnitPrice: number;
    transactionCount: number;
}

interface PosTopProductsProps {
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
}

export function PosTopProducts({ dateFrom, dateTo, limit = 10 }: PosTopProductsProps) {
    const [products, setProducts] = useState<TopProduct[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<'revenue' | 'quantity'>('revenue');

    useEffect(() => {
        async function fetchProducts() {
            setLoading(true);
            try {
                const params = new URLSearchParams({ limit: String(limit) });
                if (dateFrom) params.set('dateFrom', dateFrom);
                if (dateTo) params.set('dateTo', dateTo);

                const res = await fetch(`/api/pos/analytics/products?${params.toString()}`);
                if (res.ok) {
                    const json = await res.json();
                    if (json.success) {
                        setProducts(json.data.topProducts);
                    }
                }
            } catch {
                // Silently handle errors
            } finally {
                setLoading(false);
            }
        }
        fetchProducts();
    }, [dateFrom, dateTo, limit]);

    if (loading) {
        return (
            <div className="space-y-3">
                <div className="h-6 w-40 bg-gray-200 rounded animate-pulse" />
                {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3">
                        <div className="h-4 w-8 bg-gray-200 rounded animate-pulse" />
                        <div className="h-4 flex-1 bg-gray-200 rounded animate-pulse" />
                        <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
                    </div>
                ))}
            </div>
        );
    }

    if (products.length === 0) {
        return (
            <EmptyState
                icon={Package}
                title="Belum ada data produk"
                description="Data produk terlaris akan muncul setelah ada penjualan"
            />
        );
    }

    const maxValue = viewMode === 'revenue'
        ? Math.max(...products.map((p) => p.totalRevenue), 1)
        : Math.max(...products.map((p) => p.totalQuantity), 1);

    return (
        <div className="space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Produk Terlaris
                </h3>
                <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <button
                        onClick={() => setViewMode('revenue')}
                        className={`px-2 py-1 text-xs font-medium transition-colors ${viewMode === 'revenue'
                                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                                : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800'
                            }`}
                    >
                        Revenue
                    </button>
                    <button
                        onClick={() => setViewMode('quantity')}
                        className={`px-2 py-1 text-xs font-medium transition-colors ${viewMode === 'quantity'
                                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                                : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800'
                            }`}
                    >
                        Qty
                    </button>
                </div>
            </div>

            {/* Product list */}
            <div className="space-y-2">
                {products.map((product, index) => {
                    const value = viewMode === 'revenue' ? product.totalRevenue : product.totalQuantity;
                    const barWidth = maxValue > 0 ? (value / maxValue) * 100 : 0;

                    return (
                        <div
                            key={product.productId}
                            className="flex items-center gap-3 rounded-lg border border-gray-100 bg-gray-50 p-2.5 dark:border-gray-700 dark:bg-gray-800/50"
                        >
                            {/* Rank */}
                            <span className={`text-xs font-bold w-6 text-center shrink-0 ${index === 0 ? 'text-yellow-500' :
                                    index === 1 ? 'text-gray-400' :
                                        index === 2 ? 'text-amber-600' :
                                            'text-gray-400 dark:text-gray-500'
                                }`}>
                                #{index + 1}
                            </span>

                            {/* Product info + bar */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                                        {product.productName}
                                    </span>
                                    <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 ml-2 shrink-0">
                                        {viewMode === 'revenue'
                                            ? formatCurrency(product.totalRevenue)
                                            : `${formatNumber(product.totalQuantity)} pcs`
                                        }
                                    </span>
                                </div>
                                {/* Bar */}
                                <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full rounded-full transition-all duration-500 ${index < 3 ? 'bg-blue-500' : 'bg-blue-300 dark:bg-blue-700'
                                            }`}
                                        style={{ width: `${Math.max(barWidth, 2)}%` }}
                                    />
                                </div>
                                {/* Sub details */}
                                <div className="flex items-center gap-3 mt-1">
                                    <span className="text-[10px] text-gray-400 dark:text-gray-500">
                                        {product.transactionCount} transaksi
                                    </span>
                                    <span className="text-[10px] text-gray-400 dark:text-gray-500">
                                        Avg {formatCurrency(product.avgUnitPrice)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
