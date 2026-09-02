'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from '@/lib/i18n'
import {
    BookOpen,
    Search,
    Loader2,
    AlertCircle,
    Inbox,
    ChevronDown,
    ChevronRight,
    Hash,
    Layers,
    Calculator,
    Database,
    Type,
    Tag,
} from 'lucide-react'

/* ============================================
   TYPES
   ============================================ */

interface DictionaryEntry {
    id: string
    name: string
    type: string
    category: string
    businessDef: string
    technicalDef: string | null
    example: string | null
    sourceModule: string
    sourceModel: string
    sourceField: string | null
    formula: string | null
    dependencies: string | null
    upstreamDeps: string | null
    downstreamDeps: string | null
    freshness: string | null
    reliability: string | null
    lastVerified: string | null
    owner: string | null
    department: string | null
    isActive: boolean
    createdAt: string
    updatedAt: string
}

interface DictionaryResponse {
    success: boolean
    data: DictionaryEntry[]
}

/* ============================================
   HELPERS
   ============================================ */

function getTypeIcon(type: string): typeof Hash {
    switch (type) {
        case 'metric': return Hash
        case 'dimension': return Layers
        case 'measure': return Calculator
        case 'dataset': return Database
        case 'field': return Type
        default: return Hash
    }
}

function getTypeColor(type: string): string {
    switch (type) {
        case 'metric': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
        case 'dimension': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
        case 'measure': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
        case 'dataset': return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
        case 'field': return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400'
        default: return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400'
    }
}

function getCategoryColor(category: string): string {
    switch (category) {
        case 'finance': return 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'
        case 'sales': return 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
        case 'inventory': return 'bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400'
        case 'hr': return 'bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400'
        case 'crm': return 'bg-cyan-50 text-cyan-700 dark:bg-cyan-900/20 dark:text-cyan-400'
        default: return 'bg-gray-50 text-gray-700 dark:bg-gray-700 dark:text-gray-400'
    }
}

function getReliabilityColor(reliability: string | null): string {
    switch (reliability) {
        case 'HIGH': return 'text-green-600 dark:text-green-400'
        case 'MEDIUM': return 'text-yellow-600 dark:text-yellow-400'
        case 'LOW': return 'text-red-600 dark:text-red-400'
        default: return 'text-gray-400 dark:text-gray-500'
    }
}

/* ============================================
   MAIN PAGE
   ============================================ */

export default function DictionaryPage() {
    const { t } = useTranslation()
    const [entries, setEntries] = useState<DictionaryEntry[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [searchQuery, setSearchQuery] = useState('')
    const [categoryFilter, setCategoryFilter] = useState<string>('all')
    const [typeFilter, setTypeFilter] = useState<string>('all')
    const [expandedId, setExpandedId] = useState<string | null>(null)

    const fetchEntries = useCallback(async () => {
        try {
            setLoading(true)
            setError(null)
            const params = new URLSearchParams()
            if (searchQuery) params.set('search', searchQuery)
            if (categoryFilter !== 'all') params.set('category', categoryFilter)
            if (typeFilter !== 'all') params.set('type', typeFilter)
            const res = await fetch(`/api/analytics/dictionary?${params}`)
            const json: DictionaryResponse = await res.json()
            if (!res.ok || !json.success) {
                throw new Error('Failed to load dictionary')
            }
            setEntries(json.data)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error')
        } finally {
            setLoading(false)
        }
    }, [searchQuery, categoryFilter, typeFilter])

    useEffect(() => {
        const debounce = setTimeout(() => {
            fetchEntries()
        }, 300)
        return () => clearTimeout(debounce)
    }, [fetchEntries])

    const categories = ['all', 'finance', 'sales', 'inventory', 'hr', 'crm'] as const
    const types = ['all', 'metric', 'dimension', 'measure', 'dataset', 'field'] as const

    /* ---------- Category counts ---------- */
    const categoryCounts = entries.reduce<Record<string, number>>((acc, e) => {
        acc[e.category] = (acc[e.category] || 0) + 1
        return acc
    }, {})

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('analytics.dictionary.title')}</h1>
                <p className="text-gray-500 dark:text-gray-400">{t('analytics.dictionary.subtitle')}</p>
            </div>

            {/* Filters Row */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                {/* Search */}
                <div className="relative flex-1 max-w-md">
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder={t('analytics.dictionary.searchPlaceholder')}
                        className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 pl-10 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                    />
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                </div>

                {/* Category Filter */}
                <div className="flex flex-wrap gap-1.5">
                    {categories.map((cat) => (
                        <button
                            key={cat}
                            onClick={() => setCategoryFilter(cat)}
                            className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${categoryFilter === cat
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                                }`}
                        >
                            {cat === 'all' ? t('analytics.dictionary.categories.all') : (t(`analytics.dictionary.categories.${cat}`) || cat)}
                            <span className="text-xs opacity-70">
                                {cat === 'all' ? entries.length : (categoryCounts[cat] || 0)}
                            </span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Type Filter */}
            <div className="flex flex-wrap gap-1.5">
                {types.map((type) => (
                    <button
                        key={type}
                        onClick={() => setTypeFilter(type)}
                        className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${typeFilter === type
                                ? 'bg-gray-800 text-white dark:bg-gray-200 dark:text-gray-900'
                                : 'border border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700'
                            }`}
                    >
                        {type === 'all' ? t('analytics.common.all') : (t(`analytics.dictionary.types.${type}`) || type)}
                    </button>
                ))}
            </div>

            {/* Loading State */}
            {loading && (
                <div className="space-y-3">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <div key={i} className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-gray-200 rounded-lg animate-pulse dark:bg-gray-700" />
                                <div className="flex-1 space-y-2">
                                    <div className="h-4 w-40 bg-gray-200 rounded animate-pulse dark:bg-gray-700" />
                                    <div className="h-3 w-64 bg-gray-200 rounded animate-pulse dark:bg-gray-700" />
                                </div>
                                <div className="h-6 w-16 bg-gray-200 rounded-full animate-pulse dark:bg-gray-700" />
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Error State */}
            {error && !loading && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-6 dark:border-red-800 dark:bg-red-900/20">
                    <div className="flex items-center gap-3">
                        <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                        <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
                    </div>
                </div>
            )}

            {/* Empty State */}
            {!loading && !error && entries.length === 0 && (
                <div className="flex flex-col items-center justify-center rounded-xl border border-gray-200 bg-white py-16 dark:border-gray-700 dark:bg-gray-800">
                    <Inbox className="h-12 w-12 text-gray-300 dark:text-gray-600" />
                    <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
                        {t('analytics.dictionary.empty.title')}
                    </h3>
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                        {t('analytics.dictionary.empty.description')}
                    </p>
                </div>
            )}

            {/* Dictionary List */}
            {!loading && !error && entries.length > 0 && (
                <div className="space-y-2">
                    {entries.map((entry) => {
                        const TypeIcon = getTypeIcon(entry.type)
                        const typeColor = getTypeColor(entry.type)
                        const catColor = getCategoryColor(entry.category)
                        const isExpanded = expandedId === entry.id
                        return (
                            <div
                                key={entry.id}
                                className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
                            >
                                {/* Entry Header */}
                                <button
                                    onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                                    className="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50"
                                >
                                    <div className={`rounded-lg p-2 ${typeColor}`}>
                                        <TypeIcon className="h-4 w-4" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-medium text-gray-900 dark:text-gray-100 truncate">{entry.name}</h3>
                                            <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${typeColor}`}>
                                                {t(`analytics.dictionary.types.${entry.type}`) || entry.type}
                                            </span>
                                            <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${catColor}`}>
                                                {t(`analytics.dictionary.categories.${entry.category}`) || entry.category}
                                            </span>
                                        </div>
                                        <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400 truncate">
                                            {entry.businessDef}
                                        </p>
                                    </div>
                                    {entry.reliability && (
                                        <span className={`text-xs font-medium ${getReliabilityColor(entry.reliability)}`}>
                                            {t(`analytics.dictionary.reliability.${entry.reliability}`) || entry.reliability}
                                        </span>
                                    )}
                                    {isExpanded ? (
                                        <ChevronDown className="h-4 w-4 text-gray-400" />
                                    ) : (
                                        <ChevronRight className="h-4 w-4 text-gray-400" />
                                    )}
                                </button>

                                {/* Expanded Details */}
                                {isExpanded && (
                                    <div className="border-t border-gray-100 px-4 py-4 dark:border-gray-700">
                                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                            <div>
                                                <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                                                    {t('analytics.dictionary.fields.definition')}
                                                </label>
                                                <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">{entry.businessDef}</p>
                                            </div>
                                            {entry.technicalDef && (
                                                <div>
                                                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                                                        {t('analytics.dictionary.fields.technicalDef')}
                                                    </label>
                                                    <p className="mt-1 font-mono text-sm text-gray-900 dark:text-gray-100">{entry.technicalDef}</p>
                                                </div>
                                            )}
                                            <div>
                                                <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                                                    {t('analytics.dictionary.fields.source')}
                                                </label>
                                                <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                                                    {entry.sourceModule} / {entry.sourceModel}
                                                    {entry.sourceField && ` / ${entry.sourceField}`}
                                                </p>
                                            </div>
                                            {entry.formula && (
                                                <div>
                                                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                                                        {t('analytics.dictionary.fields.formula')}
                                                    </label>
                                                    <p className="mt-1 font-mono text-sm text-gray-900 dark:text-gray-100">{entry.formula}</p>
                                                </div>
                                            )}
                                            {entry.freshness && (
                                                <div>
                                                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                                                        {t('analytics.dictionary.fields.freshness')}
                                                    </label>
                                                    <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                                                        {t(`analytics.dictionary.freshness.${entry.freshness}`) || entry.freshness}
                                                    </p>
                                                </div>
                                            )}
                                            {entry.owner && (
                                                <div>
                                                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                                                        {t('analytics.dictionary.fields.owner')}
                                                    </label>
                                                    <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">{entry.owner}</p>
                                                </div>
                                            )}
                                        </div>
                                        {entry.dependencies && (
                                            <div className="mt-4">
                                                <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                                                    Dependencies
                                                </label>
                                                <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">{entry.dependencies}</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
