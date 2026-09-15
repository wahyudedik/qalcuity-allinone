'use client'

import { useEffect, useRef, useState } from 'react'
import QRCodeLib from 'qrcode'

interface QRCodeProps {
    /** The data string to encode (e.g., otpauth:// URI) */
    value: string
    /** Size in pixels (default: 200) */
    size?: number
    /** Error correction level (default: 'M') */
    errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H'
    /** Additional CSS classes */
    className?: string
}

/**
 * Client-side QR Code component using the `qrcode` library.
 * Generates a QR code as a data URL and renders it in an <img> tag.
 */
export function QRCode({
    value,
    size = 200,
    errorCorrectionLevel = 'M',
    className = '',
}: QRCodeProps) {
    const [dataUrl, setDataUrl] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        let cancelled = false

        QRCodeLib.toDataURL(value, {
            width: size,
            margin: 2,
            errorCorrectionLevel,
            color: {
                dark: '#000000',
                light: '#ffffff',
            },
        })
            .then((url) => {
                if (!cancelled) {
                    setDataUrl(url)
                    setError(null)
                }
            })
            .catch((err) => {
                if (!cancelled) {
                    setError(err instanceof Error ? err.message : 'Failed to generate QR code')
                }
            })

        return () => {
            cancelled = true
        }
    }, [value, size, errorCorrectionLevel])

    if (error) {
        return (
            <div className={`flex items-center justify-center bg-red-50 rounded-lg border border-red-200 ${className}`} style={{ width: size, height: size }}>
                <p className="text-xs text-red-500 text-center px-2">{error}</p>
            </div>
        )
    }

    if (!dataUrl) {
        return (
            <div className={`flex items-center justify-center bg-gray-50 rounded-lg border border-gray-200 animate-pulse ${className}`} style={{ width: size, height: size }}>
                <p className="text-xs text-gray-400">Generating...</p>
            </div>
        )
    }

    return (
        <img
            src={dataUrl}
            alt="QR Code"
            width={size}
            height={size}
            className={`rounded-lg ${className}`}
            style={{ imageRendering: 'pixelated' }}
        />
    )
}
