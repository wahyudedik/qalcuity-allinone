'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { formatCurrency } from '@/lib/utils'
import { useTranslation } from '@/lib/i18n'
import { useSession } from 'next-auth/react'
import {
    Search, ShoppingCart, Plus, Minus, Trash2, X, CreditCard,
    Banknote, Smartphone, QrCode, Check, Loader2, Package, ArrowRight,
    Receipt, AlertCircle,
} from 'lucide-react'

type Product = {
    id: string
    name: string
    sku: string
    price: number
    stock: number
    unit: string
    categoryName: string | null
}

type CartItem = {
    productId: string
    productName: string
    productSku: string
    quantity: number
    unitPrice: number
    discountAmount: number
    taxRate: number
}

type Session = {
    id: string
    terminalId: string
    terminalName: string
    terminalCode: string
    cashierName: string
    status: string
    openingCash: number
    openedAt: string
}

type TransactionResult = {
    id: string
    transactionNo: string
    totalAmount: number
    paidAmount: number
    changeAmount: number
    paymentMethod: string
    status: string
    createdAt: string
}

const PAYMENT_METHODS = [
    { key: 'CASH', label: 'Tunai', icon: Banknote },
    { key: 'CARD', label: 'Kartu', icon: CreditCard },
    { key: 'QRIS', label: 'QRIS', icon: QrCode },
    { key: 'E_WALLET', label: 'E-Wallet', icon: Smartphone },
]

export default function POSTerminalPage() {
    const { t } = useTranslation()
    const { data: session } = useSession()
    const searchInputRef = useRef<HTMLInputElement>(null)

    // State
    const [products, setProducts] = useState<Product[]>([])
    const [cart, setCart] = useState<CartItem[]>([])
    const [searchQuery, setSearchQuery] = useState('')
    const [loadingProducts, setLoadingProducts] = useState(true)
    const [error, setError] = useState<string | null>(null)

    // Session state
    const [terminals, setTerminals] = useState<{ id: string; name: string; code: string; status: string }[]>([])
    const [currentSession, setCurrentSession] = useState<Session | null>(null)
    const [showSessionModal, setShowSessionModal] = useState(false)
    const [selectedTerminal, setSelectedTerminal] = useState('')
    const [openingCash, setOpeningCash] = useState<number>(0)
    const [openingSession, setOpeningSession] = useState(false)

    // Payment state
    const [showPaymentModal, setShowPaymentModal] = useState(false)
    const [paymentMethod, setPaymentMethod] = useState('CASH')
    const [paidAmount, setPaidAmount] = useState<number>(0)
    const [processing, setProcessing] = useState(false)

    // Receipt state
    const [showReceipt, setShowReceipt] = useState(false)
    const [lastTransaction, setLastTransaction] = useState<TransactionResult | null>(null)

    // Toast
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 3000)
            return () => clearTimeout(timer)
        }
    }, [toast])

    // Fetch products
    const fetchProducts = useCallback(async () => {
        try {
            setLoadingProducts(true)
            setError(null)
            const params = new URLSearchParams()
            if (searchQuery) params.set('search', searchQuery)
            const response = await fetch(`/api/pos/products?${params.toString()}`)
            const data = await response.json()
            if (data.success) {
                setProducts(data.data)
            } else {
                setError(data.error || 'Gagal memuat data produk')
            }
        } catch {
            setError('Gagal memuat data produk. Periksa koneksi jaringan Anda.')
        } finally {
            setLoadingProducts(false)
        }
    }, [searchQuery])

    // Fetch terminals
    const fetchTerminals = useCallback(async () => {
        try {
            const response = await fetch('/api/pos/terminals')
            const data = await response.json()
            if (data.success) {
                setTerminals(data.data.filter((t: { status: string }) => t.status === 'ACTIVE'))
            }
        } catch {
            // Silent fail
        }
    }, [])

    useEffect(() => {
        fetchProducts()
        fetchTerminals()
    }, [fetchProducts, fetchTerminals])

    // Search debounce
    useEffect(() => {
        const timer = setTimeout(() => {
            fetchProducts()
        }, 300)
        return () => clearTimeout(timer)
    }, [searchQuery, fetchProducts])

    // Cart operations
    const addToCart = (product: Product) => {
        if (product.stock <= 0) {
            setToast({ message: 'Stok produk habis', type: 'error' })
            return
        }
        if (!currentSession) {
            setToast({ message: 'Buka sesi terlebih dahulu', type: 'error' })
            return
        }

        setCart((prev) => {
            const existing = prev.find((item) => item.productId === product.id)
            if (existing) {
                if (existing.quantity >= product.stock) {
                    setToast({ message: `Stok tidak mencukupi. Tersedia: ${product.stock}`, type: 'error' })
                    return prev
                }
                return prev.map((item) =>
                    item.productId === product.id
                        ? { ...item, quantity: item.quantity + 1 }
                        : item
                )
            }
            return [
                ...prev,
                {
                    productId: product.id,
                    productName: product.name,
                    productSku: product.sku,
                    quantity: 1,
                    unitPrice: product.price,
                    discountAmount: 0,
                    taxRate: 0,
                },
            ]
        })
    }

    const updateQuantity = (productId: string, delta: number) => {
        setCart((prev) => {
            const item = prev.find((i) => i.productId === productId)
            if (!item) return prev
            const product = products.find((p) => p.id === productId)
            const newQty = item.quantity + delta
            if (newQty <= 0) return prev.filter((i) => i.productId !== productId)
            if (product && newQty > product.stock) {
                setToast({ message: `Stok tidak mencukupi. Tersedia: ${product.stock}`, type: 'error' })
                return prev
            }
            return prev.map((i) =>
                i.productId === productId ? { ...i, quantity: newQty } : i
            )
        })
    }

    const removeItem = (productId: string) => {
        setCart((prev) => prev.filter((i) => i.productId !== productId))
    }

    const clearCart = () => {
        setCart([])
    }

    // Calculations
    const subtotal = cart.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)
    const totalDiscount = cart.reduce((sum, item) => sum + item.discountAmount, 0)
    const totalTax = cart.reduce((sum, item) => sum + (item.quantity * item.unitPrice - item.discountAmount) * (item.taxRate / 100), 0)
    const total = subtotal - totalDiscount + totalTax
    const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0)

    // Open session
    const handleOpenSession = async () => {
        if (!selectedTerminal) {
            setToast({ message: 'Pilih terminal terlebih dahulu', type: 'error' })
            return
        }

        setOpeningSession(true)
        try {
            const response = await fetch('/api/pos/sessions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ terminalId: selectedTerminal, openingCash }),
            })
            const data = await response.json()
            if (data.success) {
                setCurrentSession(data.data)
                setShowSessionModal(false)
                setToast({ message: 'Sesi berhasil dibuka', type: 'success' })
            } else {
                setToast({ message: data.error || 'Gagal membuka sesi', type: 'error' })
            }
        } catch {
            setToast({ message: 'Gagal membuka sesi. Periksa koneksi.', type: 'error' })
        } finally {
            setOpeningSession(false)
        }
    }

    // Process payment
    const handlePayment = async () => {
        if (cart.length === 0) {
            setToast({ message: 'Keranjang kosong', type: 'error' })
            return
        }
        if (!currentSession) {
            setToast({ message: 'Buka sesi terlebih dahulu', type: 'error' })
            return
        }
        if (paymentMethod === 'CASH' && paidAmount < total) {
            setToast({ message: 'Jumlah bayar kurang dari total', type: 'error' })
            return
        }

        setProcessing(true)
        try {
            const response = await fetch('/api/pos/transactions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sessionId: currentSession.id,
                    items: cart.map((item) => ({
                        productId: item.productId,
                        productName: item.productName,
                        productSku: item.productSku,
                        quantity: item.quantity,
                        unitPrice: item.unitPrice,
                        discountAmount: item.discountAmount,
                        taxRate: item.taxRate,
                    })),
                    paymentMethod,
                    paidAmount: paymentMethod === 'CASH' ? paidAmount : total,
                    notes: null,
                }),
            })
            const data = await response.json()
            if (data.success) {
                setLastTransaction(data.data)
                setShowPaymentModal(false)
                setShowReceipt(true)
                setCart([])
                setPaidAmount(0)
                fetchProducts() // Refresh stock
                setToast({ message: 'Transaksi berhasil!', type: 'success' })
            } else {
                setToast({ message: data.error || 'Gagal memproses transaksi', type: 'error' })
            }
        } catch {
            setToast({ message: 'Gagal memproses transaksi. Periksa koneksi.', type: 'error' })
        } finally {
            setProcessing(false)
        }
    }

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setShowPaymentModal(false)
                setShowReceipt(false)
                setShowSessionModal(false)
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [])

    const changeAmount = paymentMethod === 'CASH' && paidAmount > total ? paidAmount - total : 0

    return (
        <div className="flex h-[calc(100vh-12rem)] bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            {/* Toast */}
            {toast && (
                <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium text-white shadow-lg ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
                    {toast.type === 'success' ? <Check className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                    {toast.message}
                </div>
            )}

            {/* LEFT SIDE: Product Grid */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 px-4 py-3">
                    <div className="flex items-center gap-3">
                        <Package className="h-5 w-5 text-blue-600" />
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                            {t('pos.terminal.title') || 'Pilih Produk'}
                        </h2>
                    </div>
                    {currentSession && (
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                            <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                                Sesi Aktif
                            </span>
                            <span className="text-gray-400">|</span>
                            <span>{currentSession.terminalName}</span>
                        </div>
                    )}
                    {!currentSession && (
                        <button
                            onClick={() => setShowSessionModal(true)}
                            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                        >
                            <Plus className="h-4 w-4" />
                            Buka Sesi
                        </button>
                    )}
                </div>

                {/* Search Bar */}
                <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                        <input
                            ref={searchInputRef}
                            type="text"
                            placeholder="Cari produk berdasarkan nama atau SKU..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                        />
                    </div>
                </div>

                {/* Product Grid */}
                <div className="flex-1 overflow-y-auto p-4">
                    {loadingProducts ? (
                        <div className="flex items-center justify-center h-64">
                            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                        </div>
                    ) : error ? (
                        <div className="flex flex-col items-center justify-center h-64 text-center">
                            <AlertCircle className="h-12 w-12 text-red-400 mb-3" />
                            <p className="text-sm text-gray-500">{error}</p>
                            <button onClick={fetchProducts} className="mt-3 text-sm text-blue-600 hover:underline">
                                Coba Lagi
                            </button>
                        </div>
                    ) : products.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 text-center">
                            <Package className="h-12 w-12 text-gray-300 dark:text-gray-600 mb-3" />
                            <p className="text-sm text-gray-500">Tidak ada produk ditemukan</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                            {products.map((product) => (
                                <button
                                    key={product.id}
                                    onClick={() => addToCart(product)}
                                    disabled={product.stock <= 0 || !currentSession}
                                    className={`group relative flex flex-col items-start rounded-lg border p-3 text-left transition-all hover:shadow-md ${product.stock <= 0
                                            ? 'border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed dark:border-gray-700 dark:bg-gray-800'
                                            : 'border-gray-200 bg-white hover:border-blue-300 hover:ring-1 hover:ring-blue-200 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-blue-600'
                                        }`}
                                >
                                    {product.stock <= 0 && (
                                        <span className="absolute top-2 right-2 rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-600">
                                            HABIS
                                        </span>
                                    )}
                                    {product.stock > 0 && product.stock <= 5 && (
                                        <span className="absolute top-2 right-2 rounded bg-yellow-100 px-1.5 py-0.5 text-[10px] font-medium text-yellow-600">
                                            SISA {product.stock}
                                        </span>
                                    )}
                                    <div className="w-full rounded-md bg-gray-100 dark:bg-gray-700 px-2 py-4 text-center mb-2">
                                        <Package className="h-6 w-6 mx-auto text-gray-400" />
                                    </div>
                                    <p className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2 w-full">
                                        {product.name}
                                    </p>
                                    <p className="text-[11px] text-gray-400 mt-0.5">{product.sku}</p>
                                    <p className="text-sm font-bold text-blue-600 dark:text-blue-400 mt-1">
                                        {formatCurrency(product.price)}
                                    </p>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* RIGHT SIDE: Cart */}
            <div className="w-96 flex flex-col border-l border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                {/* Cart Header */}
                <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 px-4 py-3">
                    <div className="flex items-center gap-2">
                        <ShoppingCart className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                            {t('pos.terminal.cart') || 'Keranjang'}
                        </h3>
                        {itemCount > 0 && (
                            <span className="inline-flex items-center justify-center rounded-full bg-blue-600 px-2 py-0.5 text-xs font-medium text-white">
                                {itemCount}
                            </span>
                        )}
                    </div>
                    {cart.length > 0 && (
                        <button onClick={clearCart} className="text-xs text-red-500 hover:text-red-700">
                            Hapus Semua
                        </button>
                    )}
                </div>

                {/* Cart Items */}
                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                    {cart.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center py-8">
                            <ShoppingCart className="h-10 w-10 text-gray-300 dark:text-gray-600 mb-3" />
                            <p className="text-sm text-gray-400">Keranjang kosong</p>
                            <p className="text-xs text-gray-400 mt-1">Klik produk untuk menambahkan</p>
                        </div>
                    ) : (
                        cart.map((item) => (
                            <div key={item.productId} className="flex items-center gap-3 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-3">
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                        {item.productName}
                                    </p>
                                    <p className="text-xs text-gray-400">{formatCurrency(item.unitPrice)}</p>
                                </div>
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => updateQuantity(item.productId, -1)}
                                        className="h-7 w-7 flex items-center justify-center rounded-md border border-gray-300 hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-700"
                                    >
                                        <Minus className="h-3 w-3" />
                                    </button>
                                    <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                                    <button
                                        onClick={() => updateQuantity(item.productId, 1)}
                                        className="h-7 w-7 flex items-center justify-center rounded-md border border-gray-300 hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-700"
                                    >
                                        <Plus className="h-3 w-3" />
                                    </button>
                                </div>
                                <p className="text-sm font-semibold text-gray-900 dark:text-white w-24 text-right">
                                    {formatCurrency(item.quantity * item.unitPrice)}
                                </p>
                                <button
                                    onClick={() => removeItem(item.productId)}
                                    className="h-7 w-7 flex items-center justify-center rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                </button>
                            </div>
                        ))
                    )}
                </div>

                {/* Cart Summary */}
                {cart.length > 0 && (
                    <div className="border-t border-gray-200 dark:border-gray-700 p-4 space-y-3">
                        <div className="space-y-1.5 text-sm">
                            <div className="flex justify-between text-gray-600 dark:text-gray-400">
                                <span>Subtotal ({itemCount} item)</span>
                                <span>{formatCurrency(subtotal)}</span>
                            </div>
                            {totalDiscount > 0 && (
                                <div className="flex justify-between text-red-500">
                                    <span>Diskon</span>
                                    <span>-{formatCurrency(totalDiscount)}</span>
                                </div>
                            )}
                            {totalTax > 0 && (
                                <div className="flex justify-between text-gray-600 dark:text-gray-400">
                                    <span>Pajak</span>
                                    <span>{formatCurrency(totalTax)}</span>
                                </div>
                            )}
                            <div className="flex justify-between border-t border-gray-200 dark:border-gray-700 pt-2 text-lg font-bold text-gray-900 dark:text-white">
                                <span>Total</span>
                                <span>{formatCurrency(total)}</span>
                            </div>
                        </div>

                        <button
                            onClick={() => {
                                setPaidAmount(total)
                                setShowPaymentModal(true)
                            }}
                            disabled={!currentSession}
                            className="w-full flex items-center justify-center gap-2 rounded-lg bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Receipt className="h-4 w-4" />
                            Bayar
                            <span className="ml-1">{formatCurrency(total)}</span>
                        </button>
                    </div>
                )}
            </div>

            {/* SESSION MODAL */}
            {showSessionModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowSessionModal(false)}>
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Buka Sesi Kasir</h3>
                            <button onClick={() => setShowSessionModal(false)} className="text-gray-400 hover:text-gray-600">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="space-y-3">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Terminal</label>
                                <select
                                    value={selectedTerminal}
                                    onChange={(e) => setSelectedTerminal(e.target.value)}
                                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                                >
                                    <option value="">Pilih Terminal</option>
                                    {terminals.map((terminal) => (
                                        <option key={terminal.id} value={terminal.id}>
                                            {terminal.name} ({terminal.code})
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Uang Awal (Opening Cash)</label>
                                <input
                                    type="number"
                                    value={openingCash || ''}
                                    onChange={(e) => setOpeningCash(Number(e.target.value))}
                                    placeholder="Masukkan jumlah uang awal"
                                    min="0"
                                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                                />
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowSessionModal(false)}
                                className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700"
                            >
                                Batal
                            </button>
                            <button
                                onClick={handleOpenSession}
                                disabled={openingSession || !selectedTerminal}
                                className="flex-1 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                            >
                                {openingSession ? 'Membuka...' : 'Buka Sesi'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* PAYMENT MODAL */}
            {showPaymentModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => !processing && setShowPaymentModal(false)}>
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Pembayaran</h3>
                            {!processing && (
                                <button onClick={() => setShowPaymentModal(false)} className="text-gray-400 hover:text-gray-600">
                                    <X className="h-5 w-5" />
                                </button>
                            )}
                        </div>

                        {/* Total */}
                        <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 p-4 text-center">
                            <p className="text-sm text-blue-600 dark:text-blue-400">Total Belanja</p>
                            <p className="text-3xl font-bold text-blue-700 dark:text-blue-300">{formatCurrency(total)}</p>
                        </div>

                        {/* Payment Method */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Metode Pembayaran</label>
                            <div className="grid grid-cols-2 gap-2">
                                {PAYMENT_METHODS.map((method) => {
                                    const Icon = method.icon
                                    return (
                                        <button
                                            key={method.key}
                                            onClick={() => {
                                                setPaymentMethod(method.key)
                                                if (method.key !== 'CASH') setPaidAmount(total)
                                            }}
                                            className={`flex items-center justify-center gap-2 rounded-lg border-2 px-3 py-2.5 text-sm font-medium transition-all ${paymentMethod === method.key
                                                    ? 'border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                                    : 'border-gray-200 text-gray-600 hover:border-gray-300 dark:border-gray-600 dark:text-gray-400'
                                                }`}
                                        >
                                            <Icon className="h-4 w-4" />
                                            {method.label}
                                        </button>
                                    )
                                })}
                            </div>
                        </div>

                        {/* Paid Amount (for CASH) */}
                        {paymentMethod === 'CASH' && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Jumlah Bayar</label>
                                <input
                                    type="number"
                                    value={paidAmount || ''}
                                    onChange={(e) => setPaidAmount(Number(e.target.value))}
                                    min="0"
                                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                                />
                                {paidAmount >= total && (
                                    <p className="mt-1.5 text-sm text-green-600 dark:text-green-400">
                                        Kembalian: {formatCurrency(changeAmount)}
                                    </p>
                                )}
                                {paidAmount > 0 && paidAmount < total && (
                                    <p className="mt-1.5 text-sm text-red-500">
                                        Kurang: {formatCurrency(total - paidAmount)}
                                    </p>
                                )}
                                {/* Quick amount buttons */}
                                <div className="flex gap-2 mt-2">
                                    <button
                                        onClick={() => setPaidAmount(total)}
                                        className="flex-1 rounded-lg border border-gray-200 px-2 py-1.5 text-xs font-medium hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700"
                                    >
                                        Uang Pas
                                    </button>
                                    <button
                                        onClick={() => {
                                            const rounded = Math.ceil(total / 10000) * 10000
                                            setPaidAmount(rounded)
                                        }}
                                        className="flex-1 rounded-lg border border-gray-200 px-2 py-1.5 text-xs font-medium hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700"
                                    >
                                        Bulatkan ke {formatCurrency(Math.ceil(total / 10000) * 10000)}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Process Button */}
                        <button
                            onClick={handlePayment}
                            disabled={processing || (paymentMethod === 'CASH' && paidAmount < total)}
                            className="w-full flex items-center justify-center gap-2 rounded-lg bg-green-600 py-3 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
                        >
                            {processing ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Memproses...
                                </>
                            ) : (
                                <>
                                    <Check className="h-4 w-4" />
                                    Proses Pembayaran
                                </>
                            )}
                        </button>
                    </div>
                </div>
            )}

            {/* RECEIPT MODAL */}
            {showReceipt && lastTransaction && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowReceipt(false)}>
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-sm p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
                        <div className="text-center">
                            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                                <Check className="h-6 w-6 text-green-600 dark:text-green-400" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Transaksi Berhasil!</h3>
                            <p className="text-sm text-gray-500 mt-1">{lastTransaction.transactionNo}</p>
                        </div>

                        <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-500">Metode</span>
                                <span className="font-medium">{lastTransaction.paymentMethod}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">Total</span>
                                <span className="font-bold">{formatCurrency(lastTransaction.totalAmount)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">Bayar</span>
                                <span>{formatCurrency(lastTransaction.paidAmount)}</span>
                            </div>
                            {lastTransaction.changeAmount > 0 && (
                                <div className="flex justify-between text-green-600 dark:text-green-400">
                                    <span>Kembalian</span>
                                    <span className="font-bold">{formatCurrency(lastTransaction.changeAmount)}</span>
                                </div>
                            )}
                        </div>

                        <button
                            onClick={() => setShowReceipt(false)}
                            className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
                        >
                            Tutup & Lanjut
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
