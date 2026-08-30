/**
 * Payment Gateway Abstraction Layer
 *
 * Menyediakan interface统一 untuk integrasi dengan berbagai payment gateway
 * (Midtrans, Xendit). Menggunakan factory pattern untuk memilih provider
 * berdasarkan environment variable PAYMENT_PROVIDER.
 *
 * @see docs/ARCHITECTURE.md
 */

import { MidtransProvider } from './midtrans';
import { MockPaymentProvider } from './mock';

// ============================================================
// Payment Provider Interfaces
// ============================================================

export interface PaymentProvider {
    createPayment(params: CreatePaymentParams): Promise<PaymentResult>;
    verifyPayment(params: VerifyPaymentParams): Promise<PaymentVerifyResult>;
    handleWebhook(payload: unknown, signature: string): Promise<WebhookResult>;
}

export interface CreatePaymentParams {
    orderId: string;
    amount: number;
    currency: string;
    customerName: string;
    customerEmail: string;
    customerPhone?: string;
    items: Array<{ name: string; price: number; quantity: number }>;
    callbackUrl?: string;
}

export interface PaymentResult {
    success: boolean;
    paymentUrl?: string;
    paymentToken?: string;
    error?: string;
}

export interface VerifyPaymentParams {
    orderId: string;
    transactionId?: string;
}

export interface PaymentVerifyResult {
    success: boolean;
    status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'EXPIRED';
    amount?: number;
    paidAt?: Date;
    error?: string;
}

export interface WebhookResult {
    success: boolean;
    orderId: string;
    status: 'SUCCESS' | 'FAILED' | 'PENDING';
    amount?: number;
    error?: string;
}

// ============================================================
// Factory Function
// ============================================================

/**
 * Mendapatkan payment provider berdasarkan environment variable.
 *
 * Supported providers:
 * - `midtrans`: Integrasi dengan Midtrans (production/sandbox)
 * - `xendit`: Integrasi dengan Xendit (coming soon)
 * - `mock`: Mock provider untuk development/testing
 *
 * @returns PaymentProvider instance
 */
export function getPaymentProvider(): PaymentProvider {
    const provider = process.env.PAYMENT_PROVIDER || 'mock';

    switch (provider) {
        case 'midtrans':
            return new MidtransProvider();
        case 'xendit':
            // Xendit provider coming soon, fallback to mock
            console.warn('[PaymentProvider] Xendit provider not yet implemented, using mock');
            return new MockPaymentProvider();
        default:
            return new MockPaymentProvider();
    }
}
