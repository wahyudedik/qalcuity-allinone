/**
 * Midtrans Payment Provider
 *
 * Implementasi PaymentProvider untuk integrasi dengan Midtrans Snap API.
 * Menggunakan midtrans-client library.
 *
 * @see https://docs.midtrans.com/
 */

import { Snap } from 'midtrans-client';
import type {
    PaymentProvider,
    CreatePaymentParams,
    PaymentResult,
    VerifyPaymentParams,
    PaymentVerifyResult,
    WebhookResult,
} from './provider';

export class MidtransProvider implements PaymentProvider {
    private snap: Snap;

    constructor() {
        this.snap = new Snap({
            isProduction: process.env.MIDTRANS_IS_PRODUCTION === 'true',
            serverKey: process.env.MIDTRANS_SERVER_KEY || '',
            clientKey: process.env.MIDTRANS_CLIENT_KEY || '',
        });
    }

    async createPayment(params: CreatePaymentParams): Promise<PaymentResult> {
        try {
            const transaction = await this.snap.createTransaction({
                transaction_details: {
                    order_id: params.orderId,
                    gross_amount: params.amount,
                },
                customer_details: {
                    first_name: params.customerName,
                    email: params.customerEmail,
                    phone: params.customerPhone,
                },
                item_details: params.items.map((item) => ({
                    id: item.name,
                    name: item.name,
                    price: item.price,
                    quantity: item.quantity,
                })),
                callbacks: params.callbackUrl
                    ? { finish: params.callbackUrl }
                    : undefined,
            });

            return {
                success: true,
                paymentUrl: transaction.redirect_url,
                paymentToken: transaction.token,
            };
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            console.error('[MidtransProvider] createPayment error:', message);
            return { success: false, error: message };
        }
    }

    async verifyPayment(params: VerifyPaymentParams): Promise<PaymentVerifyResult> {
        try {
            const status = await this.snap.transaction.status(params.orderId);
            return {
                success: true,
                status: this.mapStatus(status.transaction_status),
                amount: Number(status.gross_amount),
                paidAt: status.settlement_time
                    ? new Date(status.settlement_time)
                    : undefined,
            };
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            console.error('[MidtransProvider] verifyPayment error:', message);
            return { success: false, status: 'FAILED', error: message };
        }
    }

    async handleWebhook(payload: unknown, signature: string): Promise<WebhookResult> {
        try {
            const data = payload as {
                order_id: string;
                transaction_status: string;
                gross_amount: string;
                transaction_id: string;
                signature_key: string;
            };

            // Verify signature (simplified — in production, verify against Midtrans signature key)
            if (data.signature_key !== signature) {
                console.warn('[MidtransProvider] Webhook signature mismatch');
                return {
                    success: false,
                    orderId: data.order_id,
                    status: 'FAILED',
                    error: 'Invalid signature',
                };
            }

            const status = this.mapStatus(data.transaction_status);
            return {
                success: true,
                orderId: data.order_id,
                status: status === 'SUCCESS' ? 'SUCCESS' : status === 'PENDING' ? 'PENDING' : 'FAILED',
                amount: data.gross_amount ? Number(data.gross_amount) : undefined,
            };
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            console.error('[MidtransProvider] handleWebhook error:', message);
            return {
                success: false,
                orderId: '',
                status: 'FAILED',
                error: message,
            };
        }
    }

    /**
     * Map Midtrans transaction status ke unified status.
     *
     * @see https://docs.midtrans.com/#blacklist-card
     */
    private mapStatus(
        midtransStatus: string
    ): 'PENDING' | 'SUCCESS' | 'FAILED' | 'EXPIRED' {
        switch (midtransStatus) {
            case 'capture':
                return 'SUCCESS';
            case 'settlement':
                return 'SUCCESS';
            case 'pending':
                return 'PENDING';
            case 'deny':
                return 'FAILED';
            case 'expire':
                return 'EXPIRED';
            case 'cancel':
                return 'FAILED';
            default:
                return 'PENDING';
        }
    }
}
