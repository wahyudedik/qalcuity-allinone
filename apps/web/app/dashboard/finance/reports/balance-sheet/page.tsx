'use client'

import { useState, useEffect } from 'react'
import { useTranslation } from '@/lib/i18n'
import { formatCurrency } from '@/lib/utils'
import Link from 'next/link'
import {
    ArrowLeft,
    Scale,
    Download,
    Loader2,
    AlertCircle,
    CheckCircle,
    XCircle,
} from 'lucide-react'

interface BalanceSheetAccount {
    accountId: string
    accountCode: string
    accountName: string
    balance: number
}

interface BalanceSheetSection {
    label: string
    accounts: BalanceSheetAccount[]
    total: number
}

interface BalanceSheetData {
    assets: {
        current: BalanceSheetSection
        nonCurrent: BalanceSheetSection
        total: number
    }
    liabilities: {
        current: BalanceSheetSection
        longTerm: BalanceSheetSection
        total: number
    }
    equity: BalanceSheetSection
    totalLiabilitiesAndEquity: number
    isBalanced: boolean
    date: string
    generatedAt: string
}

function AccountTable({ accounts }: { accounts: BalanceSheetAccount[] }) {
    if (accounts.length === 0) {
        return (
            <p className="text-sm text-gray-500 dark:text-gray-400 italic py-2">
                Tidak ada akun
            </p>
        )
    }
    return (
        <table className="w-full text-sm">
            <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="py-2 px-3 text-left font-medium text-gray-500 dark:text-gray-400">Kode</th>
                    <th className="py-2 px-3 text-left font-medium text-gray-500 dark:text-gray-400">Nama Akun</th>
                    <th className="py-2 px-3 text-right font-medium text-gray-500 dark:text-gray-400">Saldo</th>
                </tr>
            </thead>
            <tbody>
                {accounts.map((acc) => (
                    <tr key={acc.accountId} className="border-b border-gray-100 dark:border-gray-800">
                        <td className="py-2 px-3 text-gray-600 dark:text-gray-300 font-mono text-xs">{acc.accountCode}</td>
                        <td className="py-2 px-3 text-gray-900 dark:text-white">{acc.accountName}</td>
                        <td className="py-2 px-3 text-right text-gray-900 dark:text-white font-mono">{formatCurrency(acc.balance)}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    )
}

function SectionBlock({ title, section, bgColor = 'bg-white' }: { title: string; section: BalanceSheetSection; bgColor?: string }) {
    return (
        <div className={`${bgColor} rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden`}>
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">{section.label || title}</h3>
            </div>
            <div className="p-4">
                <AccountTable accounts={section.accounts} />
                <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Total {title}</span>
                    <span className="text-sm font-bold text-gray-900 dark:text-white font-mono">{formatCurrency(section.total)}</span>
                </div>
            </div>
        </div>
    )
}

export default function BalanceSheetPage() {
    const { t } = useTranslation()
    const [data, setData] = useState<BalanceSheetData | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        async function fetchData() {
            try {
                const res = await fetch('/api/finance/reports/balance-sheet')
                if (!res.ok) throw new Error('Gagal memuat neraca')
                const json = await res.json()
                if (json.success && json.data) {
                    setData(json.data)
                } else {
                    throw new Error(json.error || 'Gagal memuat data')
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Terjadi kesalahan')
            } finally {
                setLoading(false)
            }
        }
        fetchData()
    }, [])

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
                <div className="h-4 w-64 bg-gray-200 rounded animate-pulse mt-2" />
                {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                        <div className="h-5 w-40 bg-gray-200 rounded animate-pulse mb-4" />
                        <div className="space-y-2">
                            {Array.from({ length: 3 }).map((_, j) => (
                                <div key={j} className="h-4 w-full bg-gray-100 rounded animate-pulse" />
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        )
    }

    if (error) {
        return (
            <div className="space-y-6">
                <div className="flex items-center gap-2">
                    <Link href="/dashboard/finance/reports" className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                        <ArrowLeft className="h-5 w-5" />
                    </Link>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Neraca</h1>
                </div>
                <div className="rounded-xl border border-red-200 bg-red-50 p-6 dark:border-red-800 dark:bg-red-900/20">
                    <div className="flex items-center gap-3">
                        <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                        <div>
                            <p className="text-sm font-medium text-red-800 dark:text-red-300">{error}</p>
                            <button onClick={() => window.location.reload()} className="mt-2 text-sm text-red-600 hover:text-red-800 underline dark:text-red-400">
                                Coba Lagi
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    if (!data) return null

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Link href="/dashboard/finance/reports" className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                        <ArrowLeft className="h-5 w-5" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <Scale className="h-6 w-6" />
                            {t('finance.reports.balanceSheet.title') || 'Neraca'}
                        </h1>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                            Per {new Date(data.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {data.isBalanced ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-400">
                            <CheckCircle className="h-3 w-3" />
                            Seimbang
                        </span>
                    ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-800 dark:bg-red-900/30 dark:text-red-400">
                            <XCircle className="h-3 w-3" />
                            Tidak Seimbang
                        </span>
                    )}
                </div>
            </div>

            {/* Assets */}
            <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-3">Aset (Assets)</h2>
                <div className="space-y-4">
                    <SectionBlock title="Aset Lancar" section={data.assets.current} bgColor="bg-blue-50/50 dark:bg-blue-900/10" />
                    <SectionBlock title="Aset Tidak Lancar" section={data.assets.nonCurrent} bgColor="bg-blue-50/50 dark:bg-blue-900/10" />
                    <div className="rounded-lg border-2 border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20 px-4 py-3">
                        <div className="flex justify-between items-center">
                            <span className="text-sm font-bold text-blue-800 dark:text-blue-300">Total Aset</span>
                            <span className="text-lg font-bold text-blue-900 dark:text-blue-200 font-mono">{formatCurrency(data.assets.total)}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Liabilities */}
            <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-3">Kewajiban (Liabilities)</h2>
                <div className="space-y-4">
                    <SectionBlock title="Kewajiban Lancar" section={data.liabilities.current} bgColor="bg-orange-50/50 dark:bg-orange-900/10" />
                    <SectionBlock title="Kewajiban Jangka Panjang" section={data.liabilities.longTerm} bgColor="bg-orange-50/50 dark:bg-orange-900/10" />
                    <div className="rounded-lg border-2 border-orange-300 dark:border-orange-700 bg-orange-50 dark:bg-orange-900/20 px-4 py-3">
                        <div className="flex justify-between items-center">
                            <span className="text-sm font-bold text-orange-800 dark:text-orange-300">Total Kewajiban</span>
                            <span className="text-lg font-bold text-orange-900 dark:text-orange-200 font-mono">{formatCurrency(data.liabilities.total)}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Equity */}
            <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-3">Ekuitas (Equity)</h2>
                <div className="space-y-4">
                    <SectionBlock title="Ekuitas" section={data.equity} bgColor="bg-purple-50/50 dark:bg-purple-900/10" />
                </div>
            </div>

            {/* Summary */}
            <div className="rounded-xl border-2 border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50 p-6">
                <div className="space-y-3">
                    <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Kewajiban + Ekuitas</span>
                        <span className="text-sm font-bold text-gray-900 dark:text-white font-mono">{formatCurrency(data.totalLiabilitiesAndEquity)}</span>
                    </div>
                    <div className="flex justify-between items-center pt-3 border-t border-gray-300 dark:border-gray-600">
                        <span className="text-base font-bold text-gray-900 dark:text-white">Total Aset</span>
                        <span className="text-lg font-bold text-gray-900 dark:text-white font-mono">{formatCurrency(data.assets.total)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-base font-bold text-gray-900 dark:text-white">Total Kewajiban + Ekuitas</span>
                        <span className="text-lg font-bold text-gray-900 dark:text-white font-mono">{formatCurrency(data.totalLiabilitiesAndEquity)}</span>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <p className="text-xs text-gray-400 dark:text-gray-500 text-right">
                Dibuat: {new Date(data.generatedAt).toLocaleString('id-ID')}
            </p>
        </div>
    )
}
