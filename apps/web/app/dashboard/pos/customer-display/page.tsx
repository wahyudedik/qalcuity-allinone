'use client'

import CustomerDisplay from '@/components/pos/customer-display'

/**
 * POS Customer Display Page
 *
 * Full-screen, customer-facing display that shows real-time transaction details.
 * Opened via `window.open()` from the POS Terminal page.
 * Uses BroadcastChannel API to sync with the parent terminal window.
 */
export default function CustomerDisplayPage() {
    return (
        <div className="fixed inset-0 z-[9999]">
            <CustomerDisplay />
        </div>
    )
}
