'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslation } from '@/lib/i18n'
import {
    Search,
    Receipt,
    TrendingUp,
    Target,
    Users,
    Package,
    UserCheck,
    type LucideIcon,
} from 'lucide-react'

type SearchResult = {
    id: string
    title: string
    subtitle: string
    type: string
    href: string
    icon: string
}

// Map icon names (from API) to Lucide components
const iconMap: Record<string, LucideIcon> = {
    receipt: Receipt,
    'trending-up': TrendingUp,
    target: Target,
    users: Users,
    package: Package,
    'user-check': UserCheck,
}

const typeColors: Record<string, string> = {
    Invoice: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    Deal: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    Lead: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    Contact: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    Product: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    Employee: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
}

interface SearchModalProps {
    isOpen: boolean
    onClose: () => void
}

export function SearchModal({ isOpen, onClose }: SearchModalProps) {
    const [query, setQuery] = useState('')
    const [results, setResults] = useState<SearchResult[]>([])
    const [loading, setLoading] = useState(false)
    const [selectedIndex, setSelectedIndex] = useState(0)
    const inputRef = useRef<HTMLInputElement>(null)
    const router = useRouter()
    const { t } = useTranslation()

    // Focus input when modal opens
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 100)
            setQuery('')
            setResults([])
            setSelectedIndex(0)
        }
    }, [isOpen])

    // Search with debounce
    useEffect(() => {
        if (query.trim().length < 2) {
            setResults([])
            return
        }

        const timer = setTimeout(async () => {
            setLoading(true)
            try {
                const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`)
                const data = await response.json()
                if (data.success) {
                    setResults(data.data)
                    setSelectedIndex(0)
                }
            } catch {
                // Silently fail
            } finally {
                setLoading(false)
            }
        }, 300)

        return () => clearTimeout(timer)
    }, [query])

    // Keyboard navigation
    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault()
            setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1))
        } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setSelectedIndex((prev) => Math.max(prev - 1, 0))
        } else if (e.key === 'Enter' && results[selectedIndex]) {
            e.preventDefault()
            router.push(results[selectedIndex].href)
            onClose()
        } else if (e.key === 'Escape') {
            onClose()
        }
    }, [results, selectedIndex, router, onClose])

    if (!isOpen) return null

    // Group results by type
    const groupedResults: Record<string, SearchResult[]> = {}
    results.forEach((r) => {
        if (!groupedResults[r.type]) groupedResults[r.type] = []
        groupedResults[r.type].push(r)
    })

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />

            {/* Modal */}
            <div className="relative w-full max-w-lg mx-4 bg-white rounded-xl shadow-2xl overflow-hidden dark:bg-gray-900">
                {/* Search Input */}
                <div className="flex items-center gap-3 border-b border-gray-200 px-4 py-3 dark:border-gray-700">
                    <Search className="h-5 w-5 text-gray-400 shrink-0" />
                    <input
                        ref={inputRef}
                        type="text"
                        placeholder={t('search.placeholder') || "Cari invoice, deal, kontak, produk..."}
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                        className="flex-1 text-sm text-gray-900 placeholder-gray-400 outline-none dark:text-gray-100"
                    />
                    <kbd className="rounded border border-gray-200 px-1.5 py-0.5 text-xs font-medium text-gray-400 dark:border-gray-700 dark:text-gray-500">
                        ESC
                    </kbd>
                </div>

                {/* Results */}
                <div className="max-h-80 overflow-y-auto">
                    {loading && (
                        <div className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                            <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                            {t('search.searching') || "Mencari..."}
                        </div>
                    )}

                    {!loading && query.trim().length >= 2 && results.length === 0 && (
                        <div className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                            {t('search.noResults') || "Tidak ada hasil untuk"} "{query}"
                        </div>
                    )}

                    {!loading && query.trim().length < 2 && (
                        <div className="px-4 py-8 text-center text-sm text-gray-400 dark:text-gray-500">
                            {t('search.minChars') || "Ketik minimal 2 karakter untuk mulai mencari"}
                        </div>
                    )}

                    {!loading && Object.entries(groupedResults).map(([type, items]) => (
                        <div key={type}>
                            <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800 text-xs font-medium text-gray-500 uppercase tracking-wider">
                                {type}
                            </div>
                            {items.map((result) => {
                                const globalIndex = results.indexOf(result)
                                const IconComponent = iconMap[result.icon]
                                return (
                                    <button
                                        key={`${result.type}-${result.id}`}
                                        onClick={() => {
                                            router.push(result.href)
                                            onClose()
                                        }}
                                        className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${globalIndex === selectedIndex
                                            ? 'bg-blue-50 dark:bg-blue-900/20'
                                            : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                                            }`}
                                    >
                                        {IconComponent ? (
                                            <IconComponent className="h-5 w-5 text-gray-400 shrink-0" />
                                        ) : (
                                            <span className="text-lg">{result.icon}</span>
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{result.title}</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{result.subtitle}</p>
                                        </div>
                                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${typeColors[result.type] || 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'}`}>
                                            {result.type}
                                        </span>
                                    </button>
                                )
                            })}
                        </div>
                    ))}
                </div>

                {/* Footer */}
                <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-2 flex items-center gap-4 text-xs text-gray-400">
                    <span className="flex items-center gap-1">
                        <kbd className="rounded border border-gray-200 dark:border-gray-700 px-1 py-0.5">↑↓</kbd> {t('search.navigate') || "navigasi"}
                    </span>
                    <span className="flex items-center gap-1">
                        <kbd className="rounded border border-gray-200 dark:border-gray-700 px-1 py-0.5">↵</kbd> {t('search.open') || "buka"}
                    </span>
                    <span className="flex items-center gap-1">
                        <kbd className="rounded border border-gray-200 dark:border-gray-700 px-1 py-0.5">esc</kbd> {t('search.close') || "tutup"}
                    </span>
                </div>
            </div>
        </div>
    )
}
