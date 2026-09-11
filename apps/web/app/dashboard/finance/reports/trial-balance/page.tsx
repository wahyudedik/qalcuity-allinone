'use client'

import { useState, useEffect } from 'react'
import { useTranslation } from '@/lib/i18n'
import { formatCurrency } from '@/lib/utils'
import Link from 'next/link'
import {
    ArrowLeft,
    ClipboardList,
    CheckCircle,
    XCircle,
} from 'lucide-react'

interface TrialBalanceAccount {
    accountId: string
    accountCode: string
    accountName: string
    accountType: string
    totalDebit: number
    totalCredit: number
    balance: number
    balanceType: 'debit' | 'credit'
}

interface TrialBalanceData {
    accounts: TrialBalanceAccount[]
    totalDebit: number
    totalCredit: number
    isBalanced: boolean
    dateFrom: string | null
    dateTo: string | null
    generatedAt: string
}

const accountTypeLabels: Record<string, string> = {
    ASSET: 'Aset',
    LIABILITY: 'Kewajiban',
    EQUITY: 'Ekuitas',
    REVENUE: 'Pendapatan',
    EXPENSE: 'Beban',
}

const accountTypeColors: Record<string, string> = {
    ASSET: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    LIABILITY: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
    EQUITY: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
    REVENUE: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    EXPENSE: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
}

export default function TrialBalancePage() {
    const { t } = useTranslation()
    const [data, setData] = useState<TrialBalanceData | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [includeZero, setIncludeZero] = useState(false)

    useEffect(() => {
        async function fetchData() {
            try {
                setLoading(true)
                const params = new URLSearchParams()
                if (includeZero) params.set('includeZeroBalance', 'true')
                const res = await fetch(`/api/finance/reports/trial-balance?${params.toString()}`)
                if (!res.ok) throw new Error('Gagal memuat neraca saldo')
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
    }, [includeZero])

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
                <div className="h-4 w-64 bg-gray-200 rounded animate-pulse mt-2" />
                <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                    <div className="space-y-2">
                        {Array.from({ length: 10 }).map((_, j) => (
                            <div key={j} className="h-4 w-full bg-gray-100 rounded animate-pulse" />
                        ))}
                    </div>
                </div>
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
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Neraca Saldo</h1>
                </div>
                <div className="rounded-xl border border-red-200 bg-red-50 p-6 dark:border-red-800 dark:bg-red-900/20">
                    <div className="flex items-center gap-3">
                        <span className="text-red-600 dark:text-red-400 text-lg">⚠</span>
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
                            <ClipboardList className="h-6 w-6" />
                            {t('finance.reports.trialBalance.title') || 'Neraca Saldo'}
                        </h1>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                            {data.dateFrom && data.dateTo
                                ? `${new Date(data.dateFrom).toLocaleDateString('id-ID')} — ${new Date(data.dateTo).toLocaleDateString('id-ID')}`
                                : 'Semua Periode'}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <input
                            type="checkbox"
                            checked={includeZero}
                            onChange={(e) => setIncludeZero(e.target.checked)}
                            className="rounded border-gray-300 dark:border-gray-600"
                        />
                        Tampilkan saldo nol
                    </label>
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

            {/* Trial Balance Table */}
            <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
                                <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Kode</th>
                                <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Nama Akun</th>
                                <th className="px-4 py-3 text-center font-medium text-gray-500 dark:text-gray-400">Tipe</th>
                                <th className="px-4 py-3 text-right font-medium text-gray-500 dark:text-gray-400">Debit</th>
                                <th className="px-4 py-3 text-right font-medium text-gray-500 dark:text-gray-400">Kredit</th>
                                <th className="px-4 py-3 text-right font-medium text-gray-500 dark:text-gray-400">Saldo</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.accounts.map((acc) => (
                                <tr key={acc.accountId} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                    <td className="px-4 py-3 font-mono text-xs text-gray-600 dark:text-gray-300">{acc.accountCode}</td>
                                    <td className="px-4 py-3 text-gray-900 dark:text-white">{acc.accountName}</td>
                                    <td className="px-4 py-3 text-center">
                                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${accountTypeColors[acc.accountType] || 'bg-gray-100 text-gray-800'}`}>
                                            {accountTypeLabels[acc.accountType] || acc.accountType}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-right font-mono text-gray-900 dark:text-white">
                                        {acc.totalDebit > 0 ? formatCurrency(acc.totalDebit) : '-'}
                                    </td>
                                    <td className="px-4 py-3 text-right font-mono text-gray-900 dark:text-white">
                                        {acc.totalCredit > 0 ? formatCurrency(acc.totalCredit) : '-'}
                                    </td>
                                    <td className="px-4 py-3 text-right font-mono font-semibold text-gray-900 dark:text-white">
                                        {formatCurrency(acc.balance)}
                                        <span className={`ml-1 text-xs ${acc.balanceType === 'debit' ? 'text-blue-600 dark:text-blue-400' : 'text-orange-600 dark:text-orange-400'}`}>
                                            {acc.balanceType === 'debit' ? 'D' : 'K'}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr className="bg-gray-50 dark:bg-gray-800/50 border-t-2 border-gray-300 dark:border-gray-600 font-bold">
                                <td colSpan={3} className="px-4 py-3 text-right text-gray-900 dark:text-white">Total</td>
                                <td className="px-4 py-3 text-right font-mono text-gray-900 dark:text-white">{formatCurrency(data.totalDebit)}</td>
                                <td className="px-4 py-3 text-right font-mono text-gray-900 dark:text-white">{formatCurrency(data.totalCredit)}</td>
                                <td className="px-4 py-3 text-right font-mono text-gray-900 dark:text-white">
                                    {formatCurrency(Math.abs(data.totalDebit - data.totalCredit))}
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>

            {/* Balance Check */}
            <div className={`rounded-xl border p-4 ${data.isBalanced
                ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20'
                : 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20'
                }`}>
                <div className="flex items-center gap-3">
                    {data.isBalanced ? (
                        <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                    ) : (
                        <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                    )}
                    <div>
                        <p className={`text-sm font-medium ${data.isBalanced ? 'text-green-800 dark:text-green-300' : 'text-red-800 dark:text-red-300'}`}>
                            {data.isBalanced
                                ? `Neraca saldo seimbang — Total Debit: ${formatCurrency(data.totalDebit)} = Total Kredit: ${formatCurrency(data.totalCredit)}`
                                : `Neraca saldo TIDAK seimbang — Selisih: ${formatCurrency(Math.abs(data.totalDebit - data.totalCredit))}`}
                        </p>
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
