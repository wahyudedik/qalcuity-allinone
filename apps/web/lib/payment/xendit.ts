/**
 * Xendit Payment Provider
 *
 * Implementasi PaymentProvider untuk integrasi dengan Xendit Invoice API.
 * Menggunakan Xendit REST API v2 untuk membuat invoice dan verifikasi pembayaran.
 *
 * @see https://developers.xendit.co/api-reference/
 */

import crypto from 'crypto';
import type {
    PaymentProvider,
    CreatePaymentParams,
    PaymentResult,
    VerifyPaymentParams,
    PaymentVerifyResult,
    WebhookResult,
} from './provider';
import { logger } from '@/lib/logger';

export class XenditProvider implements PaymentProvider {
    private apiKey: string;
    private callbackToken: string;
    private baseUrl: string;

    constructor() {
        this.apiKey = process.env.XENDIT_SECRET_KEY || '';
        this.callbackToken = process.env.XENDIT_WEBHOOK_SECRET_KEY || '';
        // Xendit uses the same API URL for both test and live; differentiation is by key prefix
        this.baseUrl = 'https://api.xendit.co';
    }

    /**
     * Generate Basic Auth header for Xendit API.
     * Xendit uses Basic Auth with API key as the username and empty password.
     */
    private getAuthHeader(): string {
        return `Basic ${Buffer.from(this.apiKey + ':').toString('base64')}`;
    }

    async createPayment(params: CreatePaymentParams): Promise<PaymentResult> {
        try {
            // Xendit Invoice API — create invoice for one-time payment
            const response = await fetch(`${this.baseUrl}/v2/invoices`, {
                method: 'POST',
                headers: {
                    Authorization: this.getAuthHeader(),
                    'Content-Type': 'application/json',
                    'X-API-Version': process.env.XENDIT_API_VERSION || '2023-07-01',
                },
                body: JSON.stringify({
                    external_id: params.orderId,
                    amount: params.amount,
                    currency: params.currency || 'IDR',
                    description: params.items.map((i) => i.name).join(', '),
                    customer: {
                        given_names: params.customerName,
                        email: params.customerEmail,
                        mobile_number: params.customerPhone,
                    },
                    items: params.items.map((item) => ({
                        name: item.name,
                        quantity: item.quantity,
                        price: item.price,
                    })),
                    success_redirect_url: params.callbackUrl,
                    failure_redirect_url: params.callbackUrl,
                }),
            });

            if (!response.ok) {
                const errorBody = await response.text();
                logger.error('[XenditProvider] createPayment API error', undefined, {
                    status: response.status,
                    body: errorBody,
                });
                return { success: false, error: `Xendit API error (${response.status}): ${errorBody}` };
            }

            const data = await response.json() as {
                id: string;
                status: string;
                invoice_url: string;
            };

            return {
                success: true,
                paymentUrl: data.invoice_url,
                paymentToken: data.id,
            };
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            logger.error('[XenditProvider] createPayment error', error, { detail: message });
            return { success: false, error: message };
        }
    }

    async verifyPayment(params: VerifyPaymentParams): Promise<PaymentVerifyResult> {
        try {
            // Use orderId as Xendit invoice external_id
            const response = await fetch(
                `${this.baseUrl}/v2/invoices?external_id=${encodeURIComponent(params.orderId)}`,
                {
                    headers: {
                        Authorization: this.getAuthHeader(),
                        'X-API-Version': process.env.XENDIT_API_VERSION || '2023-07-01',
                    },
                }
            );

            if (!response.ok) {
                const errorBody = await response.text();
                logger.error('[XenditProvider] verifyPayment API error', undefined, {
                    status: response.status,
                    body: errorBody,
                });
                return {
                    success: false,
                    status: 'FAILED',
                    error: `Xendit verification failed (${response.status}): ${errorBody}`,
                };
            }

            const invoices = await response.json() as Array<{
                id: string;
                status: string;
                amount: number;
                paid_at?: string;
            }>;

            // Get the latest invoice for this external_id
            const invoice = invoices[0];
            if (!invoice) {
                return {
                    success: false,
                    status: 'FAILED',
                    error: 'No invoice found for this order',
                };
            }

            return {
                success: true,
                status: this.mapStatus(invoice.status),
                amount: invoice.amount,
                paidAt: invoice.paid_at ? new Date(invoice.paid_at) : undefined,
            };
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            logger.error('[XenditProvider] verifyPayment error', error, { detail: message });
            return { success: false, status: 'FAILED', error: message };
        }
    }

    async handleWebhook(payload: unknown, signature: string): Promise<WebhookResult> {
        try {
            const data = payload as Record<string, unknown>;

            const externalId = (data.external_id as string) || '';
            const status = (data.status as string) || '';
            const amount = (data.amount as number) || 0;

            // Verify callback token — Xendit sends X-Callback-Token header
            // Fail-closed: reject if callback token is not configured
            if (!this.callbackToken) {
                logger.error('[XenditProvider] XENDIT_WEBHOOK_SECRET_KEY not configured — rejecting webhook');
                return {
                    success: false,
                    orderId: externalId,
                    status: 'FAILED',
                    error: 'Payment provider not configured',
                };
            }

            if (!signature) {
                logger.warn('[XenditProvider] Webhook missing callback token');
                return {
                    success: false,
                    orderId: externalId,
                    status: 'FAILED',
                    error: 'Missing callback token',
                };
            }

            // Timing-safe comparison to prevent timing attacks
            try {
                const expectedBuf = Buffer.from(this.callbackToken, 'hex');
                const actualBuf = Buffer.from(signature, 'hex');

                // If hex lengths differ, try UTF-8 comparison (Xendit tokens may be plain strings)
                if (expectedBuf.length !== actualBuf.length) {
                    // Fall back to string-level timing-safe comparison
                    const expectedStr = Buffer.from(this.callbackToken, 'utf8');
                    const actualStr = Buffer.from(signature, 'utf8');
                    if (expectedStr.length !== actualStr.length || !crypto.timingSafeEqual(expectedStr, actualStr)) {
                        logger.error(`[XenditProvider] Webhook callback token mismatch for invoice: ${externalId}`);
                        return {
                            success: false,
                            orderId: externalId,
                            status: 'FAILED',
                            error: 'Invalid callback token',
                        };
                    }
                } else if (!crypto.timingSafeEqual(expectedBuf, actualBuf)) {
                    logger.error(`[XenditProvider] Webhook callback token mismatch for invoice: ${externalId}`);
                    return {
                        success: false,
                        orderId: externalId,
                        status: 'FAILED',
                        error: 'Invalid callback token',
                    };
                }
            } catch {
                // Buffer creation failed — do string-level timing-safe comparison as fallback
                const expectedBuf = Buffer.from(this.callbackToken, 'utf8');
                const actualBuf = Buffer.from(signature, 'utf8');
                if (expectedBuf.length !== actualBuf.length || !crypto.timingSafeEqual(expectedBuf, actualBuf)) {
                    logger.error(`[XenditProvider] Webhook callback token mismatch for invoice: ${externalId}`);
                    return {
                        success: false,
                        orderId: externalId,
                        status: 'FAILED',
                        error: 'Invalid callback token',
                    };
                }
            }

            const mappedStatus = this.mapStatus(status);
            return {
                success: true,
                orderId: externalId,
                status: mappedStatus === 'SUCCESS' ? 'SUCCESS' : mappedStatus === 'PENDING' ? 'PENDING' : 'FAILED',
                amount,
            };
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            logger.error('[XenditProvider] handleWebhook error', error, { detail: message });
            return {
                success: false,
                orderId: '',
                status: 'FAILED',
                error: message,
            };
        }
    }

    /**
     * Map Xendit invoice status to unified payment status.
     *
     * @see https://developers.xendit.co/api-reference/#invoice-status
     */
    private mapStatus(
        xenditStatus: string
    ): 'PENDING' | 'SUCCESS' | 'FAILED' | 'EXPIRED' {
        switch (xenditStatus) {
            case 'PAID':
                return 'SUCCESS';
            case 'PENDING':
                return 'PENDING';
            case 'EXPIRED':
                return 'EXPIRED';
            case 'VOIDED':
                return 'FAILED';
            default:
                return 'PENDING';
        }
    }
}
