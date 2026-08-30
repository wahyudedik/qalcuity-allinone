/**
 * Mock Payment Provider
 *
 * Provider simulasi untuk development dan testing.
 * Selalu mengembalikan success response tanpa integrasi nyata.
 *
 * Gunakan PAYMENT_PROVIDER=mock di .env untuk menggunakan provider ini.
 */

import type {
    PaymentProvider,
    CreatePaymentParams,
    PaymentResult,
    VerifyPaymentParams,
    PaymentVerifyResult,
    WebhookResult,
} from './provider';

export class MockPaymentProvider implements PaymentProvider {
    async createPayment(params: CreatePaymentParams): Promise<PaymentResult> {
        console.log(
            `[MockPayment] Creating payment for order ${params.orderId} - ${params.currency} ${params.amount}`
        );

        const paymentToken = `mock_token_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

        return {
            success: true,
            paymentUrl: `https://mock-payment.example.com/pay/${params.orderId}?token=${paymentToken}`,
            paymentToken,
        };
    }

    async verifyPayment(params: VerifyPaymentParams): Promise<PaymentVerifyResult> {
        console.log(`[MockPayment] Verifying payment for order ${params.orderId}`);

        return {
            success: true,
            status: 'SUCCESS',
            amount: 0,
            paidAt: new Date(),
        };
    }

    async handleWebhook(payload: unknown, signature: string): Promise<WebhookResult> {
        const data = payload as { order_id?: string };
        console.log(`[MockPayment] Processing webhook for order ${data?.order_id || 'unknown'}`);

        return {
            success: true,
            orderId: data?.order_id || `mock_order_${Date.now()}`,
            status: 'SUCCESS',
        };
    }
}
