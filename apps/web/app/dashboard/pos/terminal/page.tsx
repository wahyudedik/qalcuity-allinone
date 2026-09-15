'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { formatCurrency } from '@/lib/utils'
import { useTranslation } from '@/lib/i18n'
import { useSession } from 'next-auth/react'
import {
    Search, ShoppingCart, Plus, Minus, Trash2, X, CreditCard,
    Banknote, Smartphone, QrCode, Check, Loader2, Package, ArrowRight,
    Receipt, AlertCircle, ScanLine, Wallet, AlertTriangle, Edit3,
    Percent, Tag, Ticket, BadgePercent, WifiOff, RefreshCw,
    Clock, AlertOctagon, Monitor,
} from 'lucide-react'
import { OfflineIndicator } from '@/components/pos/offline-indicator'
import { SyncStatusBadge } from '@/components/pos/sync-status-badge'
import POSReceipt, { type POSReceiptData } from '@/components/pos/pos-receipt'
import { usePosOffline } from '@/hooks/use-pos-offline'
import { usePosProducts } from '@/hooks/use-pos-products'

type Product = {
    id: string
    name: string
    sku: string
    price: number
    stock: number
    minStock: number
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

const PAYMENT_METHOD_CONFIGS = [
    { key: 'CASH', i18nKey: 'pos.terminal.methods.CASH', icon: Banknote },
    { key: 'CARD', i18nKey: 'pos.terminal.methods.CARD', icon: CreditCard },
    { key: 'QRIS', i18nKey: 'pos.terminal.methods.QRIS', icon: QrCode },
    { key: 'E_WALLET', i18nKey: 'pos.terminal.methods.E_WALLET', icon: Smartphone },
]

export default function POSTerminalPage() {
    const { t } = useTranslation()
    const paymentMethods = PAYMENT_METHOD_CONFIGS.map(m => ({ ...m, label: t(m.i18nKey) }))
    const { data: session } = useSession()
    const searchInputRef = useRef<HTMLInputElement>(null)
    const barcodeInputRef = useRef<HTMLInputElement>(null)

    // Offline mode hooks
    const {
        isOnline,
        syncStatus,
        pendingCount,
        syncNow,
        createOfflineTransaction,
    } = usePosOffline()
    const {
        products: allProducts,
        loading: loadingProducts,
        error: productsError,
        fromCache: productsFromCache,
        fetchProducts: refreshProducts,
        searchProducts,
    } = usePosProducts()

    // State
    const [displayProducts, setDisplayProducts] = useState<Product[]>([])
    const [cart, setCart] = useState<CartItem[]>([])
    const [searchQuery, setSearchQuery] = useState('')
    const [barcodeInput, setBarcodeInput] = useState('')
    const [scannedProductName, setScannedProductName] = useState<string | null>(null)

    // Session state
    const [terminals, setTerminals] = useState<{ id: string; name: string; code: string; status: string }[]>([])
    const [currentSession, setCurrentSession] = useState<Session | null>(null)
    const [showSessionModal, setShowSessionModal] = useState(false)
    const [selectedTerminal, setSelectedTerminal] = useState('')
    const [openingCash, setOpeningCash] = useState<number>(0)
    const [openingSession, setOpeningSession] = useState(false)

    // Discount state (order-level)
    const [orderDiscountType, setOrderDiscountType] = useState<'PERCENTAGE' | 'FIXED' | null>(null)
    const [orderDiscountValue, setOrderDiscountValue] = useState<number>(0)
    const [showDiscountInput, setShowDiscountInput] = useState(false)

    // Promo code state
    const [promoCode, setPromoCode] = useState('')
    const [promoApplied, setPromoApplied] = useState<{ code: string; discountAmount: number } | null>(null)
    const [promoLoading, setPromoLoading] = useState(false)

    // Payment state
    const [showPaymentModal, setShowPaymentModal] = useState(false)
    const [paymentMethod, setPaymentMethod] = useState('CASH')
    const [paidAmount, setPaidAmount] = useState<number>(0)
    const [processing, setProcessing] = useState(false)

    // Split payment state
    const [splitPayment, setSplitPayment] = useState(false)
    const [splitPayments, setSplitPayments] = useState<{ method: string; amount: number }[]>([])

    // Receipt state
    const [showReceipt, setShowReceipt] = useState(false)
    const [lastTransaction, setLastTransaction] = useState<TransactionResult | null>(null)
    const [receiptData, setReceiptData] = useState<POSReceiptData | null>(null)

    // Customer Display state
    const customerDisplayRef = useRef<Window | null>(null)
    const broadcastChannelRef = useRef<BroadcastChannel | null>(null)

    // Stock adjustment state
    const [showStockAdjustModal, setShowStockAdjustModal] = useState(false)
    const [adjustProduct, setAdjustProduct] = useState<Product | null>(null)
    const [adjustType, setAdjustType] = useState<string>('OTHER')
    const [adjustQuantity, setAdjustQuantity] = useState<number>(0)
    const [adjustNotes, setAdjustNotes] = useState('')
    const [adjustingStock, setAdjustingStock] = useState(false)

    // Toast
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

    // Initialize BroadcastChannel for customer display sync
    useEffect(() => {
        const channel = new BroadcastChannel('pos-customer-display')
        broadcastChannelRef.current = channel
        return () => {
            channel.close()
        }
    }, [])


    // Open customer display in new window
    const handleOpenCustomerDisplay = useCallback(() => {
        // If already open and not closed, focus it
        if (customerDisplayRef.current && !customerDisplayRef.current.closed) {
            customerDisplayRef.current.focus()
            return
        }
        const url = '/dashboard/pos/customer-display'
        customerDisplayRef.current = window.open(
            url,
            'pos-customer-display',
            'width=800,height=600,menubar=no,toolbar=no,location=no,status=no,resizable=yes,scrollbars=yes'
        )
    }, [])

    // Close customer display on unmount
    useEffect(() => {
        return () => {
            if (customerDisplayRef.current && !customerDisplayRef.current.closed) {
                customerDisplayRef.current.close()
            }
        }
    }, [])

    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 3000)
            return () => clearTimeout(timer)
        }
    }, [toast])

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
        fetchTerminals()
    }, [fetchTerminals])

    // Sync display products with all products when not searching
    useEffect(() => {
        if (!searchQuery.trim()) {
            setDisplayProducts(allProducts)
        }
    }, [allProducts, searchQuery])

    // Search debounce — uses IndexedDB cache (works offline)
    useEffect(() => {
        if (!searchQuery.trim()) {
            setDisplayProducts(allProducts)
            return
        }
        const timer = setTimeout(async () => {
            const results = await searchProducts(searchQuery)
            setDisplayProducts(results as Product[])
        }, 300)
        return () => clearTimeout(timer)
    }, [searchQuery, searchProducts, allProducts])

    // Cart operations
    const addToCart = useCallback((product: Product) => {
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
    }, [currentSession, t])

    // Barcode scanning — find product by SKU (exact match) and add to cart
    const handleBarcodeScan = useCallback(async (barcode: string) => {
        const trimmed = barcode.trim()
        if (!trimmed) return

        if (!currentSession) {
            setToast({ message: t('pos.terminal.openSession') || 'Buka sesi terlebih dahulu', type: 'error' })
            setBarcodeInput('')
            barcodeInputRef.current?.focus()
            return
        }

        // Search products by SKU (exact match preferred, then partial)
        const results = await searchProducts(trimmed)
        const matchedProduct = results.find(
            (p) => p.sku.toLowerCase() === trimmed.toLowerCase()
        ) || results[0] || null

        if (matchedProduct && matchedProduct.sku.toLowerCase() === trimmed.toLowerCase()) {
            addToCart(matchedProduct as Product)
            // Brief visual feedback
            setScannedProductName(matchedProduct.name)
            setTimeout(() => setScannedProductName(null), 1500)
        } else {
            setToast({
                message: t('pos.terminal.barcode.notFound') || 'Produk tidak ditemukan',
                type: 'error',
            })
        }

        setBarcodeInput('')
        // Re-focus for next scan (use setTimeout to ensure input is cleared first)
        setTimeout(() => barcodeInputRef.current?.focus(), 50)
    }, [currentSession, searchProducts, addToCart, t])

    // Auto-focus barcode input on mount and after scan
    useEffect(() => {
        if (currentSession) {
            barcodeInputRef.current?.focus()
        }
    }, [currentSession, scannedProductName])

    const updateQuantity = (productId: string, delta: number) => {
        setCart((prev) => {
            const item = prev.find((i) => i.productId === productId)
            if (!item) return prev
            const product = displayProducts.find((p) => p.id === productId)
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
        clearDiscountAndPromo()
    }

    // Calculations
    const subtotal = cart.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)
    const totalItemDiscount = cart.reduce((sum, item) => sum + item.discountAmount, 0)
    const totalTax = cart.reduce((sum, item) => sum + (item.quantity * item.unitPrice - item.discountAmount) * (item.taxRate / 100), 0)

    // Calculate order-level discount
    let orderDiscountAmount = 0
    if (orderDiscountType && orderDiscountValue > 0) {
        const baseForDiscount = subtotal - totalItemDiscount
        if (orderDiscountType === 'PERCENTAGE') {
            orderDiscountAmount = Math.round(baseForDiscount * (orderDiscountValue / 100))
            if (orderDiscountAmount > baseForDiscount) orderDiscountAmount = baseForDiscount
        } else {
            orderDiscountAmount = Math.min(orderDiscountValue, baseForDiscount)
        }
    }

    // Promo discount (from applied promo)
    const promoDiscountAmount = promoApplied?.discountAmount || 0

    // Total discount = item discount + order discount + promo discount
    const totalDiscount = totalItemDiscount + orderDiscountAmount + promoDiscountAmount
    const total = subtotal - totalDiscount + totalTax
    const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0)

    // Send cart updates to customer display whenever cart changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => {
        if (!broadcastChannelRef.current) return
        broadcastChannelRef.current.postMessage({
            type: 'cart_update',
            items: cart,
            subtotal,
            discount: totalDiscount,
            promo: promoApplied,
            total,
            storeName: session?.user?.name || '',
        } satisfies {
            type: 'cart_update'
            items: CartItem[]
            subtotal: number
            discount: number
            promo: { code: string; discountAmount: number } | null
            total: number
            storeName: string
        })
    }, [cart, subtotal, totalDiscount, promoApplied, total, session?.user?.name])

    // Clear promo when cart changes (discount/promo are mutually exclusive)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const clearDiscountAndPromo = useCallback(() => {
        setOrderDiscountType(null)
        setOrderDiscountValue(0)
        setShowDiscountInput(false)
        setPromoCode('')
        setPromoApplied(null)
    }, [])

    // Apply promo code (MVP: client-side validation, backend re-validates on submit)
    const handleApplyPromo = async () => {
        if (!promoCode.trim()) {
            setToast({ message: t('pos.terminal.promo.placeholder'), type: 'error' })
            return
        }
        if (orderDiscountType) {
            setToast({ message: t('pos.terminal.discount.cannotCombine'), type: 'error' })
            return
        }

        setPromoLoading(true)
        try {
            const code = promoCode.toUpperCase().trim()
            const baseForDiscount = subtotal - totalItemDiscount

            // MVP hardcoded promo validation (backend re-validates)
            const promoCodes: Record<string, { type: 'PERCENTAGE' | 'FIXED'; value: number; maxDiscount?: number; minOrder?: number }> = {
                'DISKON10': { type: 'PERCENTAGE', value: 10, maxDiscount: 50000 },
                'HEMAT20': { type: 'PERCENTAGE', value: 20, maxDiscount: 100000 },
                'POTONGAN5K': { type: 'FIXED', value: 5000, minOrder: 25000 },
                'POTONGAN10K': { type: 'FIXED', value: 10000, minOrder: 50000 },
                'GRATIS5': { type: 'PERCENTAGE', value: 5 },
            }

            const promo = promoCodes[code]
            if (!promo) {
                setToast({ message: t('pos.terminal.promo.invalid'), type: 'error' })
                return
            }

            if (promo.minOrder && baseForDiscount < promo.minOrder) {
                setToast({ message: `${t('pos.terminal.promo.minOrder')}: ${formatCurrency(promo.minOrder)}`, type: 'error' })
                return
            }

            let discount = 0
            if (promo.type === 'PERCENTAGE') {
                discount = Math.round(baseForDiscount * (promo.value / 100))
                if (promo.maxDiscount && discount > promo.maxDiscount) {
                    discount = promo.maxDiscount
                }
            } else {
                discount = Math.min(promo.value, baseForDiscount)
            }

            setPromoApplied({ code, discountAmount: discount })
            setToast({ message: `${t('pos.terminal.promo.applied')}: ${code} (−${formatCurrency(discount)})`, type: 'success' })
        } catch {
            setToast({ message: t('pos.terminal.promo.invalid'), type: 'error' })
        } finally {
            setPromoLoading(false)
        }
    }

    const handleRemovePromo = () => {
        setPromoCode('')
        setPromoApplied(null)
        setToast({ message: t('pos.terminal.promo.removed'), type: 'success' })
    }

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

    // Split payment helpers
    const splitPaymentTotal = splitPayments.reduce((sum, p) => sum + p.amount, 0)
    const splitPaymentRemaining = total - splitPaymentTotal
    const isSplitPaymentValid = splitPayment && splitPayments.length >= 2 && Math.abs(splitPaymentRemaining) < 0.01

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

        // Build request body
        const requestBody: Record<string, unknown> = {
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
            notes: null,
        }

        // Send order-level discount or promo code (mutually exclusive)
        if (orderDiscountType && orderDiscountValue > 0 && !promoApplied) {
            requestBody.discountType = orderDiscountType
            requestBody.discountValue = orderDiscountValue
        } else if (promoApplied) {
            requestBody.promoCode = promoApplied.code
        }

        if (splitPayment && isSplitPaymentValid) {
            // Split payment: send payments array
            requestBody.payments = splitPayments
            requestBody.paidAmount = splitPaymentTotal
        } else {
            // Single payment
            if (paymentMethod === 'CASH' && paidAmount < total) {
                setToast({ message: 'Jumlah bayar kurang dari total', type: 'error' })
                return
            }
            requestBody.paymentMethod = paymentMethod
            requestBody.paidAmount = paymentMethod === 'CASH' ? paidAmount : total
        }

        setProcessing(true)
        // Notify customer display: payment processing
        broadcastChannelRef.current?.postMessage({ type: 'payment_processing' } satisfies { type: 'payment_processing' })
        try {
            // Offline-aware transaction creation: queues if offline, sends directly if online
            const idempotencyKey = `tx-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`

            const offlineTx = {
                id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
                localId: `local-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
                sessionId: currentSession.id,
                terminalId: currentSession.terminalId,
                items: cart.map((item) => ({
                    productId: item.productId,
                    productName: item.productName,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    total: item.quantity * item.unitPrice - item.discountAmount,
                })),
                paymentMethod: splitPayment ? 'SPLIT' : paymentMethod,
                paidAmount: splitPayment ? splitPaymentTotal : (paymentMethod === 'CASH' ? paidAmount : total),
                subtotal,
                discountAmount: totalDiscount,
                taxAmount: totalTax,
                totalAmount: total,
                changeAmount: changeAmount,
                notes: null,
                status: 'PENDING' as const,
                tenantId: session?.user?.tenantId || '',
                createdBy: session?.user?.id || '',
                createdAt: new Date().toISOString(),
                idempotencyKey,
                syncedAt: null,
                serverId: null,
                serverTransactionNo: null,
                syncError: null,
                retryCount: 0,
            }

            if (!isOnline) {
                // Offline: save to IndexedDB and queue for sync
                await createOfflineTransaction(offlineTx)
                setShowPaymentModal(false)
                setCart([])
                setPaidAmount(0)
                setSplitPayment(false)
                setSplitPayments([])
                clearDiscountAndPromo()
                setToast({
                    message: `${t('pos.terminal.offline.savedLocally')} — ${t('pos.terminal.offline.willSync')}`,
                    type: 'success',
                })
                // Build basic receipt data for offline transaction
                const offlineReceiptData: POSReceiptData = {
                    id: offlineTx.localId,
                    transactionNumber: offlineTx.localId,
                    createdAt: offlineTx.createdAt,
                    items: offlineTx.items.map((item) => ({
                        name: item.productName,
                        quantity: item.quantity,
                        unitPrice: item.unitPrice,
                        total: item.total,
                    })),
                    subtotal,
                    discount: totalDiscount,
                    taxAmount: totalTax,
                    total,
                    paymentMethod: offlineTx.paymentMethod,
                    paymentAmount: offlineTx.paidAmount,
                    change: changeAmount,
                    cashierName: currentSession.cashierName,
                }
                // Notify customer display: payment success (offline)
                broadcastChannelRef.current?.postMessage({
                    type: 'payment_success',
                    transaction: offlineReceiptData,
                } satisfies {
                    type: 'payment_success'
                    transaction: POSReceiptData
                })
                setReceiptData(offlineReceiptData)
                setShowReceipt(true)
                setProcessing(false)
                return
            }

            // Online: send directly to server
            const response = await fetch('/api/pos/transactions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Idempotency-Key': idempotencyKey,
                },
                body: JSON.stringify(requestBody),
            })
            const data = await response.json()
            if (data.success) {
                setLastTransaction(data.data)
                setShowPaymentModal(false)
                setCart([])
                setPaidAmount(0)
                setSplitPayment(false)
                setSplitPayments([])
                clearDiscountAndPromo()
                void refreshProducts() // Refresh stock
                setToast({ message: 'Transaksi berhasil!', type: 'success' })

                // Notify customer display: payment success
                broadcastChannelRef.current?.postMessage({
                    type: 'payment_success',
                    transaction: {
                        id: data.data.id,
                        transactionNumber: data.data.transactionNo,
                        createdAt: data.data.createdAt,
                        items: data.data.items.map((item: { productName: string; quantity: number; unitPrice: number; subtotal: number; taxRate?: number }) => ({
                            name: item.productName,
                            quantity: item.quantity,
                            unitPrice: item.unitPrice,
                            total: item.subtotal,
                            taxRate: item.taxRate,
                        })),
                        subtotal: data.data.subtotal,
                        discount: data.data.discountAmount,
                        taxAmount: data.data.taxAmount,
                        total: data.data.totalAmount,
                        paymentMethod: data.data.paymentMethod,
                        paymentAmount: data.data.paidAmount,
                        change: data.data.changeAmount,
                        customerName: data.data.customerName,
                        cashierName: data.data.cashierName,
                        storeName: data.data.storeName,
                        storeAddress: data.data.storeAddress,
                        storePhone: data.data.storePhone,
                        notes: data.data.notes,
                    },
                } satisfies {
                    type: 'payment_success'
                    transaction: POSReceiptData
                })

                // Fetch full transaction details for receipt
                try {
                    const detailRes = await fetch(`/api/pos/transactions/${data.data.id}`)
                    const detailData = await detailRes.json()
                    if (detailData.success) {
                        const d = detailData.data
                        setReceiptData({
                            id: d.id,
                            transactionNumber: d.transactionNo,
                            createdAt: d.createdAt,
                            items: d.items.map((item: { productName: string; quantity: number; unitPrice: number; subtotal: number; taxRate?: number }) => ({
                                name: item.productName,
                                quantity: item.quantity,
                                unitPrice: item.unitPrice,
                                total: item.subtotal,
                                taxRate: item.taxRate,
                            })),
                            subtotal: d.subtotal,
                            discount: d.discountAmount,
                            taxAmount: d.taxAmount,
                            total: d.totalAmount,
                            paymentMethod: d.paymentMethod,
                            paymentAmount: d.paidAmount,
                            change: d.changeAmount,
                            customerName: d.customerName,
                            cashierName: d.cashierName,
                            storeName: d.storeName,
                            storeAddress: d.storeAddress,
                            storePhone: d.storePhone,
                            notes: d.notes,
                        })
                    }
                } catch {
                    // Silent fail — receipt will show basic info
                }
                setShowReceipt(true)
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
                setShowStockAdjustModal(false)
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [])

    // Open stock adjustment modal
    const openStockAdjustModal = useCallback((product: Product, e: React.MouseEvent) => {
        e.stopPropagation() // Prevent adding to cart
        setAdjustProduct(product)
        setAdjustType('OTHER')
        setAdjustQuantity(0)
        setAdjustNotes('')
        setShowStockAdjustModal(true)
    }, [])

    // Submit stock adjustment
    const handleStockAdjustment = async () => {
        if (!adjustProduct) return
        if (adjustQuantity === 0) {
            setToast({ message: t('pos.terminal.stockAdjustment.quantityError') || 'Jumlah tidak boleh 0', type: 'error' })
            return
        }
        if (!adjustNotes.trim()) {
            setToast({ message: t('pos.terminal.stockAdjustment.notesRequired') || 'Catatan wajib diisi', type: 'error' })
            return
        }

        setAdjustingStock(true)
        try {
            const response = await fetch('/api/pos/stock-adjustment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    productId: adjustProduct.id,
                    adjustmentType: adjustType,
                    quantity: adjustQuantity,
                    notes: adjustNotes.trim(),
                }),
            })
            const data = await response.json()
            if (data.success) {
                setShowStockAdjustModal(false)
                setAdjustProduct(null)
                setToast({ message: t('pos.terminal.stockAdjustment.success') || 'Stok berhasil disesuaikan', type: 'success' })
                void refreshProducts() // Refresh stock
            } else {
                setToast({ message: data.error || 'Gagal menyesuaikan stok', type: 'error' })
            }
        } catch {
            setToast({ message: 'Gagal menyesuaikan stok. Periksa koneksi.', type: 'error' })
        } finally {
            setAdjustingStock(false)
        }
    }

    const changeAmount = splitPayment
        ? (splitPaymentTotal > total ? splitPaymentTotal - total : 0)
        : (paymentMethod === 'CASH' && paidAmount > total ? paidAmount - total : 0)

    return (
        <div className="flex flex-col h-[calc(100vh-12rem)] bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            {/* Offline Indicator */}
            <OfflineIndicator />

            {/* Cached Products Indicator */}
            {!isOnline && productsFromCache && (
                <div className="flex items-center gap-2 px-4 py-2 text-xs text-amber-700 bg-amber-50 border-b border-amber-200">
                    <WifiOff className="h-3.5 w-3.5 flex-shrink-0" />
                    <span className="font-medium">{t('pos.terminal.offline.cachedProducts')}</span>
                </div>
            )}

            {/* Pending Sync Banner */}
            {!isOnline && pendingCount > 0 && (
                <div className="flex items-center justify-between px-4 py-2 text-xs text-blue-700 bg-blue-50 border-b border-blue-200">
                    <div className="flex items-center gap-2">
                        <Clock className="h-3.5 w-3.5 flex-shrink-0" />
                        <span>
                            {pendingCount} {t('pos.terminal.offline.willSync')}
                        </span>
                    </div>
                    <button
                        onClick={() => void syncNow()}
                        className="flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-blue-700 bg-blue-100 rounded hover:bg-blue-200 transition-colors"
                        type="button"
                    >
                        <RefreshCw className="h-3 w-3" />
                        {t('pos.terminal.sync.syncing')}
                    </button>
                </div>
            )}

            {/* Graceful Degradation Warnings */}
            {!isOnline && (
                <div className="flex flex-wrap items-center gap-2 px-4 py-2 text-xs text-orange-700 bg-orange-50 border-b border-orange-200">
                    <AlertOctagon className="h-3.5 w-3.5 flex-shrink-0" />
                    <span className="font-medium">{t('pos.terminal.offline.mode')}</span>
                    <span className="text-orange-600">—</span>
                    <span className="text-orange-600">{t('pos.terminal.offline.tableDisabled')}</span>
                    <span className="text-orange-400">|</span>
                    <span className="text-orange-600">{t('pos.terminal.offline.kitchenDisabled')}</span>
                    <span className="text-orange-400">|</span>
                    <span className="text-orange-600">{t('pos.terminal.offline.stockUnavailable')}</span>
                </div>
            )}

            {/* Toast */}
            {toast && (
                <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium text-white shadow-lg ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
                    {toast.type === 'success' ? <Check className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                    {toast.message}
                </div>
            )}

            {/* Content area (flex-row) */}
            <div className="flex flex-1 min-h-0">
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
                                    {t('pos.terminal.sessionActive')}
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
                                {t('pos.terminal.openSession')}
                            </button>
                        )}
                    </div>

                    {/* Barcode Scanner Input */}
                    <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-800 bg-blue-50/50 dark:bg-blue-900/10">
                        <div className="relative">
                            <ScanLine className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-blue-500" />
                            <input
                                ref={barcodeInputRef}
                                type="text"
                                placeholder={t('pos.terminal.barcode.placeholder') || 'Scan barcode atau ketik manual...'}
                                value={barcodeInput}
                                onChange={(e) => setBarcodeInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault()
                                        handleBarcodeScan(barcodeInput)
                                    }
                                }}
                                className="w-full rounded-lg border border-blue-300 bg-white py-2.5 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-blue-600 dark:bg-gray-800 dark:text-white dark:focus:ring-blue-400"
                                autoComplete="off"
                                autoCorrect="off"
                                autoCapitalize="off"
                                spellCheck={false}
                            />
                            {scannedProductName && (
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 rounded-md bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400 animate-pulse">
                                    <Check className="h-3 w-3" />
                                    {scannedProductName}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Search Bar */}
                    <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                            <input
                                ref={searchInputRef}
                                type="text"
                                placeholder={t('pos.terminal.searchPlaceholder')}
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
                        ) : productsError ? (
                            <div className="flex flex-col items-center justify-center h-64 text-center">
                                <AlertCircle className="h-12 w-12 text-red-400 mb-3" />
                                <p className="text-sm text-gray-500">{productsError}</p>
                                <button onClick={() => void refreshProducts()} className="mt-3 text-sm text-blue-600 hover:underline">
                                    {t('pos.terminal.retry')}
                                </button>
                            </div>
                        ) : displayProducts.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-64 text-center">
                                <Package className="h-12 w-12 text-gray-300 dark:text-gray-600 mb-3" />
                                <p className="text-sm text-gray-500">{t('pos.terminal.noProducts')}</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                {displayProducts.map((product) => {
                                    const isOutOfStock = product.stock <= 0
                                    const isLowStock = !isOutOfStock && product.minStock > 0 && product.stock <= product.minStock
                                    return (
                                        <div
                                            key={product.id}
                                            className={`group relative flex flex-col items-start rounded-lg border p-3 text-left transition-all hover:shadow-md ${isOutOfStock
                                                ? 'border-gray-200 bg-gray-50 opacity-50 dark:border-gray-700 dark:bg-gray-800'
                                                : 'border-gray-200 bg-white hover:border-blue-300 hover:ring-1 hover:ring-blue-200 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-blue-600'
                                                }`}
                                        >
                                            {/* Stock badges */}
                                            {isOutOfStock && (
                                                <span className="absolute top-2 right-2 rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-600 dark:bg-red-900/30 dark:text-red-400">
                                                    {t('pos.terminal.outOfStock')}
                                                </span>
                                            )}
                                            {isLowStock && (
                                                <span className="absolute top-2 right-2 rounded bg-yellow-100 px-1.5 py-0.5 text-[10px] font-medium text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400">
                                                    <AlertTriangle className="inline h-3 w-3 mr-0.5 -mt-0.5" />
                                                    {t('pos.terminal.stockAdjustment.lowStock')} {product.stock}
                                                </span>
                                            )}

                                            {/* Product image area */}
                                            <button
                                                onClick={() => addToCart(product)}
                                                disabled={isOutOfStock || !currentSession}
                                                className="w-full cursor-pointer disabled:cursor-not-allowed"
                                            >
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

                                            {/* Stock adjust button */}
                                            <button
                                                onClick={(e) => openStockAdjustModal(product, e)}
                                                className="mt-2 w-full flex items-center justify-center gap-1 rounded-md border border-dashed border-gray-300 dark:border-gray-600 px-2 py-1 text-[11px] font-medium text-gray-500 hover:border-orange-400 hover:text-orange-600 hover:bg-orange-50 dark:hover:border-orange-600 dark:hover:text-orange-400 dark:hover:bg-orange-900/20 transition-colors"
                                            >
                                                <Edit3 className="h-3 w-3" />
                                                {t('pos.terminal.stockAdjustment.title')}
                                            </button>
                                        </div>
                                    )
                                })}
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
                            <SyncStatusBadge />
                        </div>
                        {cart.length > 0 && (
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={handleOpenCustomerDisplay}
                                    className="inline-flex items-center gap-1 rounded-md border border-gray-300 dark:border-gray-600 px-2 py-1 text-xs font-medium text-gray-600 dark:text-gray-400 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:border-blue-600 dark:hover:text-blue-400 dark:hover:bg-blue-900/20 transition-colors"
                                    title={t('pos.customerDisplay.openInNewTab')}
                                >
                                    <Monitor className="h-3.5 w-3.5" />
                                    {t('pos.customerDisplay.open')}
                                </button>
                                <button onClick={clearCart} className="text-xs text-red-500 hover:text-red-700">
                                    {t('pos.terminal.clearAll')}
                                </button>
                            </div>
                        )}
                        {cart.length === 0 && currentSession && (
                            <button
                                onClick={handleOpenCustomerDisplay}
                                className="inline-flex items-center gap-1 rounded-md border border-gray-300 dark:border-gray-600 px-2 py-1 text-xs font-medium text-gray-600 dark:text-gray-400 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:border-blue-600 dark:hover:text-blue-400 dark:hover:bg-blue-900/20 transition-colors"
                                title={t('pos.customerDisplay.openInNewTab')}
                            >
                                <Monitor className="h-3.5 w-3.5" />
                                {t('pos.customerDisplay.open')}
                            </button>
                        )}
                    </div>

                    {/* Cart Items */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-2">
                        {cart.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-center py-8">
                                <ShoppingCart className="h-10 w-10 text-gray-300 dark:text-gray-600 mb-3" />
                                <p className="text-sm text-gray-400">{t('pos.terminal.emptyCart')}</p>
                                <p className="text-xs text-gray-400 mt-1">{t('pos.terminal.emptyCartHint')}</p>
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
                            {/* Discount & Promo Section */}
                            <div className="space-y-2">
                                {/* Discount Toggle */}
                                {!promoApplied && (
                                    <div>
                                        {!showDiscountInput ? (
                                            <button
                                                onClick={() => setShowDiscountInput(true)}
                                                className="w-full flex items-center gap-2 rounded-lg border border-dashed border-gray-300 dark:border-gray-600 px-3 py-2 text-xs font-medium text-gray-500 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:border-blue-600 dark:hover:text-blue-400 dark:hover:bg-blue-900/20 transition-colors"
                                            >
                                                <BadgePercent className="h-3.5 w-3.5" />
                                                {t('pos.terminal.discount.apply')}
                                            </button>
                                        ) : (
                                            <div className="rounded-lg border border-gray-200 dark:border-gray-600 p-2.5 space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                                                        <BadgePercent className="h-3.5 w-3.5 text-blue-600" />
                                                        {t('pos.terminal.discount.label')}
                                                    </span>
                                                    <button
                                                        onClick={() => {
                                                            setShowDiscountInput(false)
                                                            setOrderDiscountType(null)
                                                            setOrderDiscountValue(0)
                                                        }}
                                                        className="text-gray-400 hover:text-red-500"
                                                    >
                                                        <X className="h-3.5 w-3.5" />
                                                    </button>
                                                </div>
                                                <div className="flex gap-1.5">
                                                    <button
                                                        onClick={() => setOrderDiscountType('PERCENTAGE')}
                                                        className={`flex-1 rounded-md px-2 py-1.5 text-[11px] font-medium transition-colors ${orderDiscountType === 'PERCENTAGE'
                                                            ? 'bg-blue-100 text-blue-700 border border-blue-300 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-600'
                                                            : 'bg-gray-100 text-gray-600 border border-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:border-gray-600'
                                                            }`}
                                                    >
                                                        <Percent className="inline h-3 w-3 mr-0.5 -mt-0.5" />
                                                        {t('pos.terminal.discount.percentage')}
                                                    </button>
                                                    <button
                                                        onClick={() => setOrderDiscountType('FIXED')}
                                                        className={`flex-1 rounded-md px-2 py-1.5 text-[11px] font-medium transition-colors ${orderDiscountType === 'FIXED'
                                                            ? 'bg-blue-100 text-blue-700 border border-blue-300 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-600'
                                                            : 'bg-gray-100 text-gray-600 border border-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:border-gray-600'
                                                            }`}
                                                    >
                                                        Rp
                                                    </button>
                                                </div>
                                                {orderDiscountType && (
                                                    <div className="relative">
                                                        {orderDiscountType === 'FIXED' && (
                                                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400">Rp</span>
                                                        )}
                                                        <input
                                                            type="number"
                                                            value={orderDiscountValue || ''}
                                                            onChange={(e) => {
                                                                const val = Number(e.target.value)
                                                                if (orderDiscountType === 'PERCENTAGE') {
                                                                    setOrderDiscountValue(Math.min(Math.max(val, 0), 100))
                                                                } else {
                                                                    setOrderDiscountValue(Math.max(val, 0))
                                                                }
                                                            }}
                                                            placeholder={orderDiscountType === 'PERCENTAGE' ? '0-100' : '0'}
                                                            min="0"
                                                            max={orderDiscountType === 'PERCENTAGE' ? 100 : undefined}
                                                            className={`w-full rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white ${orderDiscountType === 'FIXED' ? 'pl-7' : ''}`}
                                                        />
                                                    </div>
                                                )}
                                                {orderDiscountType && orderDiscountValue > 0 && (
                                                    <p className="text-[11px] text-green-600 dark:text-green-400">
                                                        {t('pos.terminal.discount.amount')}: −{formatCurrency(orderDiscountAmount)}
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Promo Code Input */}
                                {!orderDiscountType && (
                                    <div>
                                        {promoApplied ? (
                                            <div className="flex items-center justify-between rounded-lg border border-green-200 bg-green-50 dark:border-green-700 dark:bg-green-900/20 px-3 py-2">
                                                <div className="flex items-center gap-1.5">
                                                    <Ticket className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                                                    <span className="text-xs font-medium text-green-700 dark:text-green-400">
                                                        {promoApplied.code} (−{formatCurrency(promoApplied.discountAmount)})
                                                    </span>
                                                </div>
                                                <button
                                                    onClick={handleRemovePromo}
                                                    className="text-green-500 hover:text-red-500"
                                                >
                                                    <X className="h-3.5 w-3.5" />
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex gap-1.5">
                                                <div className="relative flex-1">
                                                    <Tag className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                                                    <input
                                                        type="text"
                                                        value={promoCode}
                                                        onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') {
                                                                e.preventDefault()
                                                                void handleApplyPromo()
                                                            }
                                                        }}
                                                        placeholder={t('pos.terminal.promo.placeholder')}
                                                        disabled={promoLoading}
                                                        className="w-full rounded-lg border border-gray-300 bg-white py-1.5 pl-8 pr-2 text-xs focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                                                    />
                                                </div>
                                                <button
                                                    onClick={() => void handleApplyPromo()}
                                                    disabled={promoLoading || !promoCode.trim()}
                                                    className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50 flex items-center gap-1"
                                                >
                                                    {promoLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                                                    {t('pos.terminal.promo.apply')}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Summary Lines */}
                            <div className="space-y-1.5 text-sm">
                                <div className="flex justify-between text-gray-600 dark:text-gray-400">
                                    <span>{t('pos.terminal.subtotal')} ({itemCount} {t('pos.terminal.discount.items') || 'item'})</span>
                                    <span>{formatCurrency(subtotal)}</span>
                                </div>
                                {totalItemDiscount > 0 && (
                                    <div className="flex justify-between text-red-500">
                                        <span>{t('pos.terminal.discount.itemDiscount')}</span>
                                        <span>-{formatCurrency(totalItemDiscount)}</span>
                                    </div>
                                )}
                                {orderDiscountAmount > 0 && orderDiscountType && (
                                    <div className="flex justify-between text-red-500">
                                        <span>
                                            {t('pos.terminal.discount.applied')} ({orderDiscountType === 'PERCENTAGE' ? `${orderDiscountValue}%` : formatCurrency(orderDiscountValue)})
                                        </span>
                                        <span>-{formatCurrency(orderDiscountAmount)}</span>
                                    </div>
                                )}
                                {promoApplied && promoDiscountAmount > 0 && (
                                    <div className="flex justify-between text-green-600 dark:text-green-400">
                                        <span>{t('pos.terminal.promo.applied')} ({promoApplied.code})</span>
                                        <span>-{formatCurrency(promoDiscountAmount)}</span>
                                    </div>
                                )}
                                {totalTax > 0 && (
                                    <div className="flex justify-between text-gray-600 dark:text-gray-400">
                                        <span>{t('pos.terminal.tax')}</span>
                                        <span>{formatCurrency(totalTax)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between border-t border-gray-200 dark:border-gray-700 pt-2 text-lg font-bold text-gray-900 dark:text-white">
                                    <span>{t('pos.terminal.totalBelanja')}</span>
                                    <span>{formatCurrency(total)}</span>
                                </div>
                            </div>

                            <button
                                onClick={() => {
                                    setPaidAmount(total)
                                    setSplitPayment(false)
                                    setSplitPayments([])
                                    setShowPaymentModal(true)
                                }}
                                disabled={!currentSession}
                                className="w-full flex items-center justify-center gap-2 rounded-lg bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Receipt className="h-4 w-4" />
                                {t('pos.terminal.pay')}
                                <span className="ml-1">{formatCurrency(total)}</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* SESSION MODAL */}
            {showSessionModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowSessionModal(false)}>
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('pos.terminal.openSessionTitle')}</h3>
                            <button onClick={() => setShowSessionModal(false)} className="text-gray-400 hover:text-gray-600">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="space-y-3">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('pos.terminal.terminal')}</label>
                                <select
                                    value={selectedTerminal}
                                    onChange={(e) => setSelectedTerminal(e.target.value)}
                                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                                >
                                    <option value="">{t('pos.terminal.selectTerminal')}</option>
                                    {terminals.map((terminal) => (
                                        <option key={terminal.id} value={terminal.id}>
                                            {terminal.name} ({terminal.code})
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('pos.terminal.openingCash')}</label>
                                <input
                                    type="number"
                                    value={openingCash || ''}
                                    onChange={(e) => setOpeningCash(Number(e.target.value))}
                                    placeholder={t('pos.terminal.openingCashPlaceholder')}
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
                                {t('common.cancel')}
                            </button>
                            <button
                                onClick={handleOpenSession}
                                disabled={openingSession || !selectedTerminal}
                                className="flex-1 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                            >
                                {openingSession ? t('pos.terminal.opening') : t('pos.terminal.openSession')}
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
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('pos.terminal.paymentTitle')}</h3>
                            {!processing && (
                                <button onClick={() => setShowPaymentModal(false)} className="text-gray-400 hover:text-gray-600">
                                    <X className="h-5 w-5" />
                                </button>
                            )}
                        </div>

                        {/* Total */}
                        <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 p-4 text-center">
                            <p className="text-sm text-blue-600 dark:text-blue-400">{t('pos.terminal.totalBelanja')}</p>
                            <p className="text-3xl font-bold text-blue-700 dark:text-blue-300">{formatCurrency(total)}</p>
                        </div>

                        {/* Split Payment Toggle */}
                        <div className="flex items-center justify-between rounded-lg border border-gray-200 dark:border-gray-600 px-3 py-2.5">
                            <div className="flex items-center gap-2">
                                <Wallet className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('pos.terminal.splitPayment.toggle')}</span>
                            </div>
                            <button
                                type="button"
                                role="switch"
                                aria-checked={splitPayment}
                                onClick={() => {
                                    if (!splitPayment) {
                                        // Enable split payment: initialize with 2 rows
                                        setSplitPayments([
                                            { method: 'CASH', amount: Math.ceil(total / 2 / 1000) * 1000 },
                                            { method: 'CARD', amount: total - Math.ceil(total / 2 / 1000) * 1000 },
                                        ])
                                    } else {
                                        // Disable split payment
                                        setSplitPayments([])
                                    }
                                    setSplitPayment(!splitPayment)
                                }}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${splitPayment ? 'bg-purple-600' : 'bg-gray-300 dark:bg-gray-600'}`}
                            >
                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${splitPayment ? 'translate-x-6' : 'translate-x-1'}`} />
                            </button>
                        </div>

                        {/* Single Payment Mode */}
                        {!splitPayment && (
                            <>
                                {/* Payment Method */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('pos.terminal.paymentMethod')}</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {paymentMethods.map((method) => {
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
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('pos.terminal.paidAmount')}</label>
                                        <input
                                            type="number"
                                            value={paidAmount || ''}
                                            onChange={(e) => setPaidAmount(Number(e.target.value))}
                                            min="0"
                                            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                                        />
                                        {paidAmount >= total && (
                                            <p className="mt-1.5 text-sm text-green-600 dark:text-green-400">
                                                {t('pos.terminal.change')}: {formatCurrency(changeAmount)}
                                            </p>
                                        )}
                                        {paidAmount > 0 && paidAmount < total && (
                                            <p className="mt-1.5 text-sm text-red-500">
                                                {t('pos.terminal.shortage')}: {formatCurrency(total - paidAmount)}
                                            </p>
                                        )}
                                        {/* Quick amount buttons */}
                                        <div className="flex gap-2 mt-2">
                                            <button
                                                onClick={() => setPaidAmount(total)}
                                                className="flex-1 rounded-lg border border-gray-200 px-2 py-1.5 text-xs font-medium hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700"
                                            >
                                                {t('pos.terminal.exactAmount')}
                                            </button>
                                            <button
                                                onClick={() => {
                                                    const rounded = Math.ceil(total / 10000) * 10000
                                                    setPaidAmount(rounded)
                                                }}
                                                className="flex-1 rounded-lg border border-gray-200 px-2 py-1.5 text-xs font-medium hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700"
                                            >
                                                {t('pos.terminal.roundTo')} {formatCurrency(Math.ceil(total / 10000) * 10000)}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}

                        {/* Split Payment Mode */}
                        {splitPayment && (
                            <div className="space-y-3">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('pos.terminal.splitPayment.methodLabel')}</label>
                                {splitPayments.map((entry, idx) => (
                                    <div key={idx} className="flex items-center gap-2">
                                        <span className="text-xs font-medium text-gray-500 w-5 text-center">{idx + 1}.</span>
                                        <select
                                            value={entry.method}
                                            onChange={(e) => {
                                                const updated = [...splitPayments]
                                                updated[idx] = { ...updated[idx], method: e.target.value }
                                                setSplitPayments(updated)
                                            }}
                                            className="rounded-lg border border-gray-300 bg-white px-2 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white w-28"
                                        >
                                            {PAYMENT_METHOD_CONFIGS.map((m) => (
                                                <option key={m.key} value={m.key}>{m.key.replace('_', ' ')}</option>
                                            ))}
                                        </select>
                                        <div className="relative flex-1">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">Rp</span>
                                            <input
                                                type="number"
                                                value={entry.amount || ''}
                                                onChange={(e) => {
                                                    const updated = [...splitPayments]
                                                    updated[idx] = { ...updated[idx], amount: Number(e.target.value) }
                                                    setSplitPayments(updated)
                                                }}
                                                min="0"
                                                className="w-full rounded-lg border border-gray-300 bg-white pl-10 pr-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                                            />
                                        </div>
                                        {splitPayments.length > 2 && (
                                            <button
                                                onClick={() => setSplitPayments(splitPayments.filter((_, i) => i !== idx))}
                                                className="h-8 w-8 flex items-center justify-center rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 flex-shrink-0"
                                            >
                                                <X className="h-4 w-4" />
                                            </button>
                                        )}
                                    </div>
                                ))}

                                {/* Remaining amount */}
                                <div className={`flex justify-between text-sm px-1 ${splitPaymentRemaining < -0.01 ? 'text-red-500' : splitPaymentRemaining > 0.01 ? 'text-orange-500' : 'text-green-600 dark:text-green-400'}`}>
                                    <span>{t('pos.terminal.splitPayment.remaining')}</span>
                                    <span className="font-medium">{formatCurrency(Math.abs(splitPaymentRemaining))}</span>
                                </div>

                                {/* Add Method button */}
                                {splitPayments.length < 5 && (
                                    <button
                                        onClick={() => {
                                            setSplitPayments([
                                                ...splitPayments,
                                                { method: 'CASH', amount: Math.max(0, splitPaymentRemaining) },
                                            ])
                                        }}
                                        className="w-full flex items-center justify-center gap-2 rounded-lg border border-dashed border-purple-300 dark:border-purple-600 px-3 py-2 text-sm font-medium text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20"
                                    >
                                        <Plus className="h-4 w-4" />
                                        {t('pos.terminal.splitPayment.addMethod')}
                                    </button>
                                )}
                            </div>
                        )}

                        {/* Process Button */}
                        <button
                            onClick={handlePayment}
                            disabled={processing || (!splitPayment && paymentMethod === 'CASH' && paidAmount < total) || (splitPayment && !isSplitPaymentValid)}
                            className="w-full flex items-center justify-center gap-2 rounded-lg bg-green-600 py-3 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
                        >
                            {processing ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    {t('pos.terminal.processing')}
                                </>
                            ) : (
                                <>
                                    <Check className="h-4 w-4" />
                                    {t('pos.terminal.processPayment')}
                                    <span className="ml-1">{formatCurrency(total)}</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            )}

            {/* RECEIPT MODAL */}
            {showReceipt && receiptData && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowReceipt(false)}>
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-sm max-h-[90vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-4 no-print">
                            <div className="flex items-center gap-2">
                                <Check className="h-5 w-5 text-green-600" />
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('pos.terminal.transactionSuccess')}</h3>
                            </div>
                            <button onClick={() => setShowReceipt(false)} className="text-gray-400 hover:text-gray-600">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <POSReceipt
                            transaction={receiptData}
                            onClose={() => setShowReceipt(false)}
                        />
                    </div>
                </div>
            )}

            {/* STOCK ADJUSTMENT MODAL */}
            {showStockAdjustModal && adjustProduct && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => !adjustingStock && setShowStockAdjustModal(false)}>
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Package className="h-5 w-5 text-orange-600" />
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                    {t('pos.terminal.stockAdjustment.title')}
                                </h3>
                            </div>
                            {!adjustingStock && (
                                <button onClick={() => setShowStockAdjustModal(false)} className="text-gray-400 hover:text-gray-600">
                                    <X className="h-5 w-5" />
                                </button>
                            )}
                        </div>

                        {/* Product Info */}
                        <div className="rounded-lg bg-gray-50 dark:bg-gray-700/50 p-4">
                            <p className="text-sm font-medium text-gray-900 dark:text-white">{adjustProduct.name}</p>
                            <p className="text-xs text-gray-400 mt-0.5">SKU: {adjustProduct.sku}</p>
                            <div className="flex items-center gap-4 mt-2">
                                <div>
                                    <p className="text-[11px] text-gray-400 uppercase tracking-wide">{t('pos.terminal.stockAdjustment.currentStock')}</p>
                                    <p className={`text-lg font-bold ${adjustProduct.stock <= 0 ? 'text-red-600 dark:text-red-400' : adjustProduct.minStock > 0 && adjustProduct.stock <= adjustProduct.minStock ? 'text-yellow-600 dark:text-yellow-400' : 'text-gray-900 dark:text-white'}`}>
                                        {adjustProduct.stock}
                                    </p>
                                </div>
                                {adjustProduct.minStock > 0 && (
                                    <div>
                                        <p className="text-[11px] text-gray-400 uppercase tracking-wide">Min Stok</p>
                                        <p className="text-lg font-bold text-gray-500 dark:text-gray-400">{adjustProduct.minStock}</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Adjustment Type */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                {t('pos.terminal.stockAdjustment.type')}
                            </label>
                            <select
                                value={adjustType}
                                onChange={(e) => setAdjustType(e.target.value)}
                                disabled={adjustingStock}
                                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                            >
                                <option value="SPOILAGE">{t('pos.terminal.stockAdjustment.typeOptions.spoilage')}</option>
                                <option value="SAMPLE">{t('pos.terminal.stockAdjustment.typeOptions.sample')}</option>
                                <option value="DAMAGE">{t('pos.terminal.stockAdjustment.typeOptions.damage')}</option>
                                <option value="THEFT">{t('pos.terminal.stockAdjustment.typeOptions.theft')}</option>
                                <option value="OTHER">{t('pos.terminal.stockAdjustment.typeOptions.other')}</option>
                            </select>
                        </div>

                        {/* Quantity */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                {t('pos.terminal.stockAdjustment.quantity')}
                            </label>
                            <input
                                type="number"
                                value={adjustQuantity || ''}
                                onChange={(e) => setAdjustQuantity(Number(e.target.value))}
                                disabled={adjustingStock}
                                placeholder="0"
                                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                            />
                            <p className="mt-1 text-xs text-gray-400">
                                {t('pos.terminal.stockAdjustment.quantityHelp')}
                            </p>
                            {adjustQuantity !== 0 && (
                                <p className={`mt-1 text-xs font-medium ${adjustQuantity > 0 ? 'text-green-600 dark:text-green-400' : adjustProduct.stock + adjustQuantity < 0 ? 'text-red-600 dark:text-red-400' : 'text-orange-600 dark:text-orange-400'}`}>
                                    {adjustQuantity > 0 ? '+' : ''}{adjustQuantity} → {adjustProduct.stock + adjustQuantity}
                                </p>
                            )}
                        </div>

                        {/* Notes */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                {t('pos.terminal.stockAdjustment.notes')} *
                            </label>
                            <textarea
                                value={adjustNotes}
                                onChange={(e) => setAdjustNotes(e.target.value)}
                                disabled={adjustingStock}
                                placeholder={t('pos.terminal.stockAdjustment.notesPlaceholder')}
                                rows={3}
                                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm resize-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                            />
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowStockAdjustModal(false)}
                                disabled={adjustingStock}
                                className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700 disabled:opacity-50"
                            >
                                {t('common.cancel')}
                            </button>
                            <button
                                onClick={handleStockAdjustment}
                                disabled={adjustingStock || adjustQuantity === 0 || !adjustNotes.trim()}
                                className="flex-1 rounded-lg bg-orange-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {adjustingStock ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        {t('pos.terminal.processing')}
                                    </>
                                ) : (
                                    <>
                                        <Check className="h-4 w-4" />
                                        {t('pos.terminal.stockAdjustment.submit')}
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
