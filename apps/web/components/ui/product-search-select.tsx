'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Search, X, Package } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

export interface ProductOption {
    id: string
    sku: string
    name: string
    unit: string
    price: number
    cost: number
    stock: number
}

interface ProductSearchSelectProps {
    value: string          // selected product ID
    onSelect: (product: ProductOption) => void
    onClear: () => void
    placeholder?: string
    disabled?: boolean
}

export function ProductSearchSelect({
    value,
    onSelect,
    onClear,
    placeholder = 'Cari produk (nama/SKU)...',
    disabled = false,
}: ProductSearchSelectProps) {
    const [query, setQuery] = useState('')
    const [results, setResults] = useState<ProductOption[]>([])
    const [isOpen, setIsOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [selectedName, setSelectedName] = useState('')
    const inputRef = useRef<HTMLInputElement>(null)
    const dropdownRef = useRef<HTMLDivElement>(null)
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    // Close dropdown on outside click
    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const searchProducts = useCallback(async (q: string) => {
        if (!q || q.trim().length < 1) {
            setResults([])
            setIsOpen(false)
            return
        }

        setIsLoading(true)
        try {
            const res = await fetch(`/api/inventory/products/search?q=${encodeURIComponent(q)}&limit=10`)
            const data = await res.json()
            if (data.success && data.data) {
                setResults(data.data)
                setIsOpen(data.data.length > 0)
            }
        } catch {
            // Graceful fallback — no results
        } finally {
            setIsLoading(false)
        }
    }, [])

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value
        setQuery(val)

        if (debounceRef.current) clearTimeout(debounceRef.current)
        debounceRef.current = setTimeout(() => {
            searchProducts(val)
        }, 300)
    }

    const handleSelect = (product: ProductOption) => {
        setSelectedName(`${product.name} (${product.sku})`)
        setQuery('')
        setResults([])
        setIsOpen(false)
        onSelect(product)
    }

    const handleClear = () => {
        setSelectedName('')
        setQuery('')
        setResults([])
        setIsOpen(false)
        onClear()
    }

    // If a product is selected, show the selected name
    const displayValue = selectedName || query

    return (
        <div className="relative" ref={dropdownRef}>
            <div className="flex items-center gap-1">
                <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                        ref={inputRef}
                        type="text"
                        value={displayValue}
                        onChange={selectedName ? undefined : handleInputChange}
                        onFocus={() => {
                            if (!selectedName && query && results.length > 0) {
                                setIsOpen(true)
                            }
                        }}
                        disabled={disabled}
                        className="w-full rounded-lg border border-gray-300 py-2 pl-8 pr-8 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                        placeholder={selectedName ? '' : placeholder}
                        readOnly={!!selectedName}
                    />
                    {selectedName && !disabled && (
                        <button
                            type="button"
                            onClick={handleClear}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    )}
                </div>
            </div>

            {/* Dropdown */}
            {isOpen && results.length > 0 && (
                <div className="absolute z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
                    {isLoading && (
                        <div className="px-4 py-2 text-sm text-gray-500">Mencari...</div>
                    )}
                    {!isLoading && results.map((product) => (
                        <button
                            key={product.id}
                            type="button"
                            onClick={() => handleSelect(product)}
                            className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-blue-50 transition-colors"
                        >
                            <Package className="h-4 w-4 flex-shrink-0 text-gray-400" />
                            <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-gray-900 truncate">
                                    {product.name}
                                </div>
                                <div className="text-xs text-gray-500">
                                    SKU: {product.sku} &middot; {product.unit} &middot; Stok: {product.stock}
                                </div>
                            </div>
                            <div className="flex-shrink-0 text-sm font-medium text-gray-700">
                                {formatCurrency(product.price)}
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    )
}
