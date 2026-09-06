'use client';

/**
 * POS Customer Insights — Customer analytics cards
 *
 * Shows repeat rate, avg spend, top customers, loyalty stats.
 * Cards layout with key metrics.
 */

import { useState, useEffect } from 'react';
import { Users, UserCheck, Repeat, Star, Award, TrendingUp } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import { formatCurrency, formatNumber } from '@/lib/utils';

interface CustomerSummary {
    totalCustomers: number;
    totalTransactions: number;
    repeatCustomers: number;
    repeatRate: number;
    newCustomers: number;
    returningCustomers: number;
    avgCustomerSpend: number;
}

interface TopCustomer {
    customerName: string;
    customerPhone: string;
    totalSpend: number;
    transactionCount: number;
    avgSpend: number;
    firstPurchase: string;
    lastPurchase: string;
}

interface LoyaltyData {
    totalMembers: number;
    totalPoints: number;
    avgPoints: number;
    totalSpent: number;
    tierBreakdown: Array<{ tier: string; count: number }>;
}

interface CustomerData {
    summary: CustomerSummary;
    topCustomers: TopCustomer[];
    loyalty: LoyaltyData;
}

interface PosCustomerInsightsProps {
    dateFrom?: string;
    dateTo?: string;
}

const TIER_COLORS: Record<string, string> = {
    BRONZE: 'bg-amber-600',
    SILVER: 'bg-gray-400',
    GOLD: 'bg-yellow-500',
    PLATINUM: 'bg-purple-500',
};

const TIER_LABELS: Record<string, string> = {
    BRONZE: 'Bronze',
    SILVER: 'Silver',
    GOLD: 'Gold',
    PLATINUM: 'Platinum',
};

export function PosCustomerInsights({ dateFrom, dateTo }: PosCustomerInsightsProps) {
    const [data, setData] = useState<CustomerData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchCustomers() {
            setLoading(true);
            try {
                const params = new URLSearchParams();
                if (dateFrom) params.set('dateFrom', dateFrom);
                if (dateTo) params.set('dateTo', dateTo);

                const res = await fetch(`/api/pos/analytics/customers?${params.toString()}`);
                if (res.ok) {
                    const json = await res.json();
                    if (json.success) {
                        setData(json.data);
                    }
                }
            } catch {
                // Silently handle errors
            } finally {
                setLoading(false);
            }
        }
        fetchCustomers();
    }, [dateFrom, dateTo]);

    if (loading) {
        return (
            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="h-24 bg-gray-200 rounded-xl animate-pulse" />
                    ))}
                </div>
                <div className="h-48 bg-gray-200 rounded-xl animate-pulse" />
            </div>
        );
    }

    if (!data) {
        return (
            <EmptyState
                icon={Users}
                title="Belum ada data pelanggan"
                description="Data analytics pelanggan akan muncul setelah ada transaksi dengan data pelanggan"
            />
        );
    }

    const { summary, topCustomers, loyalty } = data;

    return (
        <div className="space-y-4">
            {/* Summary cards */}
            <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                    <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                        <Users className="h-4 w-4" />
                        <span className="text-xs">Total Pelanggan</span>
                    </div>
                    <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-gray-100">
                        {formatNumber(summary.totalCustomers)}
                    </p>
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">
                        {summary.totalTransactions} total transaksi
                    </p>
                </div>

                <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                    <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                        <Repeat className="h-4 w-4" />
                        <span className="text-xs">Repeat Rate</span>
                    </div>
                    <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-gray-100">
                        {summary.repeatRate.toFixed(1)}%
                    </p>
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">
                        {summary.repeatCustomers} pelanggan repeat
                    </p>
                </div>

                <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                    <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                        <TrendingUp className="h-4 w-4" />
                        <span className="text-xs">Avg Spend</span>
                    </div>
                    <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-gray-100">
                        {formatCurrency(summary.avgCustomerSpend)}
                    </p>
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">
                        per pelanggan
                    </p>
                </div>

                <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                    <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                        <UserCheck className="h-4 w-4" />
                        <span className="text-xs">New vs Returning</span>
                    </div>
                    <p className="mt-2 text-lg font-bold text-gray-900 dark:text-gray-100">
                        {summary.newCustomers} / {summary.returningCustomers}
                    </p>
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">
                        baru / kembali
                    </p>
                </div>
            </div>

            {/* Top customers */}
            {topCustomers.length > 0 && (
                <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                        Pelanggan Teratas
                    </h4>
                    <div className="space-y-2">
                        {topCustomers.map((customer, index) => (
                            <div
                                key={`${customer.customerName}-${index}`}
                                className="flex items-center gap-3 rounded-lg bg-gray-50 p-2.5 dark:bg-gray-800/50"
                            >
                                <span className={`text-xs font-bold w-6 text-center shrink-0 ${index === 0 ? 'text-yellow-500' :
                                        index === 1 ? 'text-gray-400' :
                                            index === 2 ? 'text-amber-600' :
                                                'text-gray-400 dark:text-gray-500'
                                    }`}>
                                    #{index + 1}
                                </span>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                                        {customer.customerName}
                                    </p>
                                    <p className="text-[10px] text-gray-400 dark:text-gray-500">
                                        {customer.transactionCount} transaksi · Avg {formatCurrency(customer.avgSpend)}
                                    </p>
                                </div>
                                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 shrink-0">
                                    {formatCurrency(customer.totalSpend)}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Loyalty stats */}
            {loyalty.totalMembers > 0 && (
                <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                    <div className="flex items-center gap-2 mb-3">
                        <Award className="h-4 w-4 text-yellow-500" />
                        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                            Program Loyalitas
                        </h4>
                    </div>

                    <div className="grid grid-cols-3 gap-3 mb-3">
                        <div className="text-center">
                            <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                                {formatNumber(loyalty.totalMembers)}
                            </p>
                            <p className="text-[10px] text-gray-400">Member</p>
                        </div>
                        <div className="text-center">
                            <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                                {formatNumber(loyalty.totalPoints)}
                            </p>
                            <p className="text-[10px] text-gray-400">Total Poin</p>
                        </div>
                        <div className="text-center">
                            <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                                {formatCurrency(loyalty.totalSpent)}
                            </p>
                            <p className="text-[10px] text-gray-400">Total Belanja</p>
                        </div>
                    </div>

                    {/* Tier breakdown */}
                    {loyalty.tierBreakdown.length > 0 && (
                        <div className="space-y-1.5">
                            {loyalty.tierBreakdown.map((tier) => {
                                const pct = loyalty.totalMembers > 0
                                    ? (tier.count / loyalty.totalMembers) * 100
                                    : 0;
                                return (
                                    <div key={tier.tier} className="flex items-center gap-2">
                                        <div className={`w-2 h-2 rounded-full shrink-0 ${TIER_COLORS[tier.tier] || 'bg-gray-400'}`} />
                                        <span className="text-xs text-gray-600 dark:text-gray-400 w-16">
                                            {TIER_LABELS[tier.tier] || tier.tier}
                                        </span>
                                        <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full ${TIER_COLORS[tier.tier] || 'bg-gray-400'}`}
                                                style={{ width: `${Math.max(pct, 2)}%` }}
                                            />
                                        </div>
                                        <span className="text-xs text-gray-500 dark:text-gray-400 w-8 text-right">
                                            {tier.count}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
