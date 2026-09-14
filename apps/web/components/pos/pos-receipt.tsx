'use client'

import { useRef, useCallback } from 'react'
import { Printer, X, Download, Share2 } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

export interface POSReceiptItem {
    name: string
    quantity: number
    unitPrice: number
    total: number
    taxRate?: number
}

export interface POSReceiptData {
    id: string
    transactionNumber: string
    createdAt: string
    items: POSReceiptItem[]
    subtotal: number
    discount?: number
    taxAmount: number
    total: number
    paymentMethod: string
    paymentAmount: number
    change: number
    customerName?: string
    cashierName?: string
    storeName?: string
    storeAddress?: string
    storePhone?: string
    notes?: string
}

interface POSReceiptProps {
    transaction: POSReceiptData
    onClose?: () => void
    onPrint?: () => void
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
    CASH: 'Tunai',
    CARD: 'Kartu',
    QRIS: 'QRIS',
    E_WALLET: 'E-Wallet',
    BANK_TRANSFER: 'Transfer Bank',
}

function formatReceiptDate(dateStr: string): string {
    const d = new Date(dateStr)
    const day = String(d.getDate()).padStart(2, '0')
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const year = d.getFullYear()
    const hours = String(d.getHours()).padStart(2, '0')
    const minutes = String(d.getMinutes()).padStart(2, '0')
    return `${day}/${month}/${year} ${hours}:${minutes}`
}

function padRight(str: string, len: number): string {
    if (str.length >= len) return str.substring(0, len)
    return str + ' '.repeat(len - str.length)
}

function padLeft(str: string, len: number): string {
    if (str.length >= len) return str.substring(0, len)
    return ' '.repeat(len - str.length) + str
}

function padBoth(str: string, len: number): string {
    if (str.length >= len) return str.substring(0, len)
    const leftPad = Math.floor((len - str.length) / 2)
    const rightPad = len - str.length - leftPad
    return ' '.repeat(leftPad) + str + ' '.repeat(rightPad)
}

const RECEIPT_WIDTH = 32 // characters for 80mm thermal

export default function POSReceipt({ transaction, onClose, onPrint }: POSReceiptProps) {
    const receiptRef = useRef<HTMLDivElement>(null)

    const handlePrint = useCallback(() => {
        onPrint?.()
        window.print()
    }, [onPrint])

    const handleShare = useCallback(async () => {
        const shareText = buildPlainTextReceipt(transaction)
        if ('share' in navigator) {
            try {
                await navigator.share({
                    title: `Struk ${transaction.transactionNumber}`,
                    text: shareText,
                })
            } catch {
                // User cancelled or share failed — silent fail
            }
        }
    }, [transaction])

    const handleDownload = useCallback(() => {
        const plainText = buildPlainTextReceipt(transaction)
        const blob = new Blob([plainText], { type: 'text/plain;charset=utf-8' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `struk-${transaction.transactionNumber}.txt`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
    }, [transaction])

    const separator = '─'.repeat(RECEIPT_WIDTH)

    return (
        <>
            {/* Print-only receipt */}
            <div ref={receiptRef} className="receipt-container">
                {/* Store Header */}
                <div className="text-center">
                    {transaction.storeName && (
                        <div className="font-bold text-base leading-tight">{transaction.storeName}</div>
                    )}
                    {transaction.storeAddress && (
                        <div className="text-xs leading-tight">{transaction.storeAddress}</div>
                    )}
                    {transaction.storePhone && (
                        <div className="text-xs leading-tight">Telp: {transaction.storePhone}</div>
                    )}
                </div>

                <div className="my-1">{separator}</div>

                {/* Transaction Info */}
                <div className="text-xs leading-relaxed">
                    <div className="flex justify-between">
                        <span>No</span>
                        <span className="font-medium">{transaction.transactionNumber}</span>
                    </div>
                    <div className="flex justify-between">
                        <span>Tanggal</span>
                        <span>{formatReceiptDate(transaction.createdAt)}</span>
                    </div>
                    {transaction.cashierName && (
                        <div className="flex justify-between">
                            <span>Kasir</span>
                            <span>{transaction.cashierName}</span>
                        </div>
                    )}
                    {transaction.customerName && transaction.customerName !== '-' && (
                        <div className="flex justify-between">
                            <span>Pelanggan</span>
                            <span>{transaction.customerName}</span>
                        </div>
                    )}
                </div>

                <div className="my-1">{separator}</div>

                {/* Items Header */}
                <div className="text-xs font-bold">
                    <div className="flex justify-between">
                        <span>Barang</span>
                        <span>Qty   Harga</span>
                    </div>
                </div>

                <div className="text-xs">{separator}</div>

                {/* Items */}
                <div className="text-xs leading-relaxed">
                    {transaction.items.map((item, idx) => (
                        <div key={idx} className="mb-1">
                            <div className="flex justify-between">
                                <span className="max-w-[180px] truncate">{item.name}</span>
                            </div>
                            <div className="flex justify-between pl-2">
                                <span>{item.quantity} x {formatCurrency(item.unitPrice)}</span>
                                <span className="font-medium">{formatCurrency(item.total)}</span>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="my-1">{separator}</div>

                {/* Totals */}
                <div className="text-xs leading-relaxed">
                    <div className="flex justify-between">
                        <span>Subtotal</span>
                        <span>{formatCurrency(transaction.subtotal)}</span>
                    </div>
                    {transaction.discount && transaction.discount > 0 && (
                        <div className="flex justify-between">
                            <span>Diskon</span>
                            <span>-{formatCurrency(transaction.discount)}</span>
                        </div>
                    )}
                    {transaction.taxAmount > 0 && (
                        <div className="flex justify-between">
                            <span>Pajak</span>
                            <span>{formatCurrency(transaction.taxAmount)}</span>
                        </div>
                    )}
                </div>

                <div className="my-1">{separator}</div>

                {/* Total */}
                <div className="text-xs">
                    <div className="flex justify-between font-bold text-sm">
                        <span>TOTAL</span>
                        <span>{formatCurrency(transaction.total)}</span>
                    </div>
                </div>

                <div className="my-1">{separator}</div>

                {/* Payment */}
                <div className="text-xs leading-relaxed">
                    <div className="flex justify-between">
                        <span>{PAYMENT_METHOD_LABELS[transaction.paymentMethod] || transaction.paymentMethod}</span>
                        <span>{formatCurrency(transaction.paymentAmount)}</span>
                    </div>
                    {transaction.change > 0 && (
                        <div className="flex justify-between">
                            <span>Kembali</span>
                            <span className="font-bold">{formatCurrency(transaction.change)}</span>
                        </div>
                    )}
                </div>

                {transaction.notes && (
                    <>
                        <div className="my-1">{separator}</div>
                        <div className="text-xs">
                            <div className="font-medium">Catatan:</div>
                            <div className="break-words">{transaction.notes}</div>
                        </div>
                    </>
                )}

                <div className="my-1">{separator}</div>

                {/* Footer */}
                <div className="text-center text-xs leading-relaxed">
                    <div className="font-medium">Terima kasih atas kunjungan Anda!</div>
                    <div>Simpan struk ini untuk klaim garansi</div>
                    <div>atau pengembalian barang.</div>
                </div>
            </div>

            {/* Screen-only buttons (hidden during print) */}
            <div className="no-print">
                {/* Action buttons */}
                <div className="flex gap-2 mt-4">
                    <button
                        onClick={handlePrint}
                        className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
                    >
                        <Printer className="h-4 w-4" />
                        Cetak Struk
                    </button>
                    {'share' in navigator && (
                        <button
                            onClick={handleShare}
                            className="flex items-center justify-center gap-2 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700"
                        >
                            <Share2 className="h-4 w-4" />
                        </button>
                    )}
                    <button
                        onClick={handleDownload}
                        className="flex items-center justify-center gap-2 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700"
                        title="Download sebagai teks"
                    >
                        <Download className="h-4 w-4" />
                    </button>
                </div>

                {onClose && (
                    <button
                        onClick={onClose}
                        className="w-full mt-2 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium hover:bg-gray-50 dark:border-gray-600"
                    >
                        Tutup
                    </button>
                )}
            </div>
        </>
    )
}

/**
 * Build a plain text receipt for sharing/downloading
 */
function buildPlainTextReceipt(t: POSReceiptData): string {
    const W = 32
    const lines: string[] = []

    const sep = '─'.repeat(W)

    // Store header
    if (t.storeName) lines.push(padBoth(t.storeName, W))
    if (t.storeAddress) lines.push(padBoth(t.storeAddress, W))
    if (t.storePhone) lines.push(padBoth(`Telp: ${t.storePhone}`, W))
    lines.push(sep)

    // Transaction info
    lines.push(`${padRight('No', 10)}${padLeft(t.transactionNumber, W - 10)}`)
    lines.push(`${padRight('Tanggal', 10)}${padLeft(formatReceiptDate(t.createdAt), W - 10)}`)
    if (t.cashierName) lines.push(`${padRight('Kasir', 10)}${padLeft(t.cashierName, W - 10)}`)
    if (t.customerName && t.customerName !== '-') {
        lines.push(`${padRight('Pelanggan', 10)}${padLeft(t.customerName, W - 10)}`)
    }
    lines.push(sep)

    // Items
    lines.push(`${padRight('Barang', 16)}${padLeft('Qty  Harga', W - 16)}`)
    lines.push(sep)

    for (const item of t.items) {
        const name = item.name.length > W ? item.name.substring(0, W) : item.name
        lines.push(name)
        const qtyPrice = `${item.quantity} x ${formatCurrency(item.unitPrice)}`
        const total = formatCurrency(item.total)
        lines.push(`  ${padRight(qtyPrice, W - 2 - total.length)}${total}`)
    }

    lines.push(sep)

    // Totals
    lines.push(`${padRight('Subtotal', 16)}${padLeft(formatCurrency(t.subtotal), W - 16)}`)
    if (t.discount && t.discount > 0) {
        lines.push(`${padRight('Diskon', 16)}${padLeft(`-${formatCurrency(t.discount)}`, W - 16)}`)
    }
    if (t.taxAmount > 0) {
        lines.push(`${padRight('Pajak', 16)}${padLeft(formatCurrency(t.taxAmount), W - 16)}`)
    }
    lines.push(sep)

    // Total
    lines.push(`${padRight('TOTAL', 16)}${padLeft(formatCurrency(t.total), W - 16)}`)
    lines.push(sep)

    // Payment
    const methodLabel = PAYMENT_METHOD_LABELS[t.paymentMethod] || t.paymentMethod
    lines.push(`${padRight(methodLabel, 16)}${padLeft(formatCurrency(t.paymentAmount), W - 16)}`)
    if (t.change > 0) {
        lines.push(`${padRight('Kembali', 16)}${padLeft(formatCurrency(t.change), W - 16)}`)
    }
    lines.push(sep)

    // Footer
    lines.push(padBoth('Terima kasih!', W))
    lines.push(padBoth('Simpan struk ini', W))
    lines.push(padBoth('untuk klaim garansi', W))

    return lines.join('\n')
}
