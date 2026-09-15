'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { formatCurrency } from '@/lib/utils'
import { useTranslation } from '@/lib/i18n'
import { Check, Wifi, WifiOff, Loader2, ShoppingCart } from 'lucide-react'
import POSReceipt, { type POSReceiptData } from '@/components/pos/pos-receipt'

/* ─── BroadcastChannel Message Types ─── */

type CartItem = {
    productId: string
    productName: string
    productSku: string
    quantity: number
    unitPrice: number
    discountAmount: number
    taxRate: number
}

type CartUpdateMessage = {
    type: 'cart_update'
    items: CartItem[]
    subtotal: number
    discount: number
    promo: { code: string; discountAmount: number } | null
    total: number
    storeName: string
}

type PaymentProcessingMessage = {
    type: 'payment_processing'
}

type PaymentSuccessMessage = {
    type: 'payment_success'
    transaction: POSReceiptData
}

type ClearMessage = {
    type: 'clear'
}

type DisplayMessage =
    | CartUpdateMessage
    | PaymentProcessingMessage
    | PaymentSuccessMessage
    | ClearMessage

/* ─── Display Status ─── */

type DisplayStatus = 'waiting' | 'processing' | 'success' | 'empty'

/* ─── Component ─── */

export default function CustomerDisplay() {
    const { t } = useTranslation()

    // State
    const [items, setItems] = useState<CartItem[]>([])
    const [subtotal, setSubtotal] = useState(0)
    const [discount, setDiscount] = useState(0)
    const [promo, setPromo] = useState<{ code: string; discountAmount: number } | null>(null)
    const [total, setTotal] = useState(0)
    const [storeName, setStoreName] = useState('')
    const [status, setStatus] = useState<DisplayStatus>('empty')
    const [receiptData, setReceiptData] = useState<POSReceiptData | null>(null)
    const [connected, setConnected] = useState(true)
    const [lastUpdate, setLastUpdate] = useState<Date>(new Date())

    const channelRef = useRef<BroadcastChannel | null>(null)

    // Connect to BroadcastChannel
    useEffect(() => {
        const channel = new BroadcastChannel('pos-customer-display')
        channelRef.current = channel

        const handleMessage = (event: MessageEvent<DisplayMessage>) => {
            const msg = event.data
            setLastUpdate(new Date())
            setConnected(true)

            switch (msg.type) {
                case 'cart_update':
                    setItems(msg.items)
                    setSubtotal(msg.subtotal)
                    setDiscount(msg.discount)
                    setPromo(msg.promo)
                    setTotal(msg.total)
                    if (msg.storeName) setStoreName(msg.storeName)
                    setStatus(msg.items.length > 0 ? 'waiting' : 'empty')
                    break
                case 'payment_processing':
                    setStatus('processing')
                    break
                case 'payment_success':
                    setStatus('success')
                    setReceiptData(msg.transaction)
                    break
                case 'clear':
                    setItems([])
                    setSubtotal(0)
                    setDiscount(0)
                    setPromo(null)
                    setTotal(0)
                    setReceiptData(null)
                    setStatus('empty')
                    break
            }
        }

        channel.addEventListener('message', handleMessage)

        // Heartbeat check — detect disconnect if no message for 35s
        const heartbeatInterval = setInterval(() => {
            const elapsed = Date.now() - lastUpdate.getTime()
            if (elapsed > 35000) {
                setConnected(false)
            }
        }, 5000)

        return () => {
            channel.removeEventListener('message', handleMessage)
            channel.close()
            clearInterval(heartbeatInterval)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // Auto-refresh reconnect signal
    useEffect(() => {
        const interval = setInterval(() => {
            // Send a ping to parent to verify connection
            channelRef.current?.postMessage({ type: 'customer_display_ping' })
        }, 30000)
        return () => clearInterval(interval)
    }, [])

    const handleReceiptClose = useCallback(() => {
        setReceiptData(null)
    }, [])

    // ─── Status Messages ───

    const statusMessage = (() => {
        switch (status) {
            case 'waiting':
                return t('pos.customerDisplay.waitingPayment')
            case 'processing':
                return (
                    <span className="flex items-center gap-2">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        {t('pos.terminal.processing')}
                    </span>
                )
            case 'success':
                return t('pos.customerDisplay.paymentSuccess')
            case 'empty':
            default:
                return ''
        }
    })()

    // ─── Render ───

    if (status === 'success' && receiptData) {
        return (
            <div className="min-h-screen bg-gray-950 flex items-center justify-center p-8">
                <div className="w-full max-w-lg">
                    {/* Success Header */}
                    <div className="text-center mb-6">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/20 mb-4">
                            <Check className="h-8 w-8 text-green-400" />
                        </div>
                        <h1 className="text-2xl font-bold text-green-400">
                            {t('pos.customerDisplay.thankYou')}
                        </h1>
                        <p className="text-gray-400 mt-2">{t('pos.customerDisplay.receipt')}</p>
                    </div>

                    {/* Receipt */}
                    <div className="bg-white rounded-xl p-6 shadow-2xl">
                        <POSReceipt
                            transaction={receiptData}
                            onClose={handleReceiptClose}
                        />
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-950 text-white flex flex-col">
            {/* Connection Status */}
            <div className={`flex items-center justify-center gap-2 py-2 text-xs font-medium transition-colors ${connected
                ? 'bg-green-900/30 text-green-400'
                : 'bg-red-900/30 text-red-400'
                }`}>
                {connected ? (
                    <>
                        <Wifi className="h-3 w-3" />
                        {t('pos.customerDisplay.title')}
                    </>
                ) : (
                    <>
                        <WifiOff className="h-3 w-3" />
                        {t('pos.customerDisplay.disconnected')} — {t('pos.customerDisplay.reconnecting')}
                    </>
                )}
            </div>

            {/* Store Name */}
            {storeName && (
                <div className="text-center py-6 border-b border-gray-800">
                    <h1 className="text-3xl font-bold tracking-wide text-white">
                        {storeName}
                    </h1>
                </div>
            )}

            {/* Main Content */}
            <div className="flex-1 flex flex-col justify-center px-8 py-6 max-w-3xl mx-auto w-full">
                {items.length === 0 ? (
                    /* Empty State */
                    <div className="text-center py-16">
                        <ShoppingCart className="h-16 w-16 text-gray-700 mx-auto mb-4" />
                        <p className="text-xl text-gray-500">
                            {t('pos.customerDisplay.title')}
                        </p>
                    </div>
                ) : (
                    <>
                        {/* Cart Items */}
                        <div className="space-y-4 mb-8">
                            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
                                {t('pos.customerDisplay.items')}
                            </h2>
                            <div className="space-y-3">
                                {items.map((item) => (
                                    <div
                                        key={item.productId}
                                        className="flex items-center justify-between py-3 border-b border-gray-800/50"
                                    >
                                        <div className="flex-1 min-w-0">
                                            <p className="text-lg font-medium text-white truncate">
                                                {item.productName}
                                            </p>
                                            <p className="text-sm text-gray-400">
                                                {item.quantity} × {formatCurrency(item.unitPrice)}
                                            </p>
                                        </div>
                                        <p className="text-lg font-semibold text-white ml-4">
                                            {formatCurrency(item.quantity * item.unitPrice)}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Summary */}
                        <div className="space-y-3 border-t border-gray-800 pt-6">
                            {/* Subtotal */}
                            <div className="flex justify-between text-lg text-gray-300">
                                <span>{t('pos.customerDisplay.subtotal')}</span>
                                <span>{formatCurrency(subtotal)}</span>
                            </div>

                            {/* Discount */}
                            {discount > 0 && (
                                <div className="flex justify-between text-lg text-red-400">
                                    <span>{t('pos.customerDisplay.discount')}</span>
                                    <span>-{formatCurrency(discount)}</span>
                                </div>
                            )}

                            {/* Promo */}
                            {promo && promo.discountAmount > 0 && (
                                <div className="flex justify-between text-lg text-green-400">
                                    <span>
                                        {t('pos.customerDisplay.promo')} ({promo.code})
                                    </span>
                                    <span>-{formatCurrency(promo.discountAmount)}</span>
                                </div>
                            )}

                            {/* Total */}
                            <div className="flex justify-between text-3xl font-bold text-white pt-4 border-t border-gray-700">
                                <span>{t('pos.customerDisplay.total')}</span>
                                <span className="text-green-400">{formatCurrency(total)}</span>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Status Bar */}
            {statusMessage && (
                <div className={`flex items-center justify-center py-4 text-lg font-semibold transition-colors ${status === 'processing'
                    ? 'bg-yellow-900/30 text-yellow-400'
                    : status === 'success'
                        ? 'bg-green-900/30 text-green-400'
                        : 'bg-blue-900/30 text-blue-400'
                    }`}>
                    {statusMessage}
                </div>
            )}
        </div>
    )
}
