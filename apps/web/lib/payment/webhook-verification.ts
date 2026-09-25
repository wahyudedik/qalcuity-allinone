/**
 * Payment Webhook Signature Verification Utilities
 *
 * Shared utilities for verifying payment webhook signatures/tokens.
 * All verification uses timing-safe comparison to prevent timing attacks.
 *
 * Security: Every verification failure is logged as a security event.
 *
 * @see apps/web/lib/payment/midtrans.ts
 * @see apps/web/lib/payment/xendit.ts
 */

import crypto from 'crypto';
import { logger } from '@/lib/logger';
import { logAudit } from '@/lib/audit';

// ============================================================
// Types
// ============================================================

export interface WebhookVerificationResult {
    valid: boolean;
    error?: string;
}

// ============================================================
// Midtrans Signature Verification
// ============================================================

/**
 * Verify Midtrans webhook signature using SHA-512.
 *
 * Midtrans sends `X-Signature` header containing a SHA-512 hash of:
 *   SHA512(order_id + status_code + gross_amount + server_key)
 *
 * @param body - Parsed webhook body (must contain order_id, status_code, gross_amount)
 * @param signatureHeader - Value of X-Signature header from request
 * @returns WebhookVerificationResult
 *
 * @see https://docs.midtrans.com/#webhook-notification
 */
export function verifyMidtransSignature(
    body: Record<string, unknown>,
    signatureHeader: string | null
): WebhookVerificationResult {
    // 1. Check that server key is configured
    const serverKey = process.env.MIDTRANS_SERVER_KEY;
    if (!serverKey) {
        logger.error('[WebhookVerify] MIDTRANS_SERVER_KEY is not configured — rejecting all webhooks');
        return { valid: false, error: 'Payment provider not configured' };
    }

    // 2. Check that signature header is present
    if (!signatureHeader) {
        logger.warn('[WebhookVerify] Midtrans webhook missing X-Signature header');
        return { valid: false, error: 'Missing X-Signature header' };
    }

    // 3. Extract required fields from body
    const orderId = String(body.order_id || '');
    const statusCode = String(body.status_code || '');
    const grossAmount = String(body.gross_amount || '');

    if (!orderId || !statusCode || !grossAmount) {
        logger.warn('[WebhookVerify] Midtrans webhook body missing required fields for signature verification');
        return { valid: false, error: 'Missing required fields for signature verification' };
    }

    // 4. Compute expected signature: SHA512(order_id + status_code + gross_amount + server_key)
    const input = `${orderId}${statusCode}${grossAmount}${serverKey}`;
    const expectedSignature = crypto.createHash('sha512').update(input).digest('hex');

    // 5. Timing-safe comparison to prevent timing attacks
    return timingSafeCompare(expectedSignature, signatureHeader, 'Midtrans');
}

// ============================================================
// Xendit Token Verification
// ============================================================

/**
 * Verify Xendit webhook callback token.
 *
 * Xendit sends `X-Callback-Token` header containing a token that must match
 * the configured callback token in XENDIT_WEBHOOK_SECRET_KEY.
 *
 * For additional security, Xendit also supports HMAC verification:
 *   HMAC-SHA256(rawBody, callbackToken)
 * sent in the `X-Callback-HMAC` header.
 *
 * @param callbackTokenHeader - Value of X-Callback-Token header
 * @param hmacHeader - Value of X-Callback-HMAC header (optional, for HMAC verification)
 * @param rawBody - Raw request body string (for HMAC verification)
 * @returns WebhookVerificationResult
 *
 * @see https://developers.xendit.co/api-reference/#invoice-callbacks
 */
export function verifyXenditToken(
    callbackTokenHeader: string | null,
    hmacHeader: string | null,
    rawBody: string
): WebhookVerificationResult {
    // 1. Check that callback token is configured
    const configuredToken = process.env.XENDIT_WEBHOOK_SECRET_KEY;
    if (!configuredToken) {
        logger.error('[WebhookVerify] XENDIT_WEBHOOK_SECRET_KEY is not configured — rejecting all webhooks');
        return { valid: false, error: 'Payment provider not configured' };
    }

    // 2. Verify via HMAC if X-Callback-HMAC header is present (preferred method)
    if (hmacHeader) {
        const expectedHmac = crypto
            .createHmac('sha256', configuredToken)
            .update(rawBody, 'utf8')
            .digest('hex');

        const hmacResult = timingSafeCompare(expectedHmac, hmacHeader, 'Xendit HMAC');
        if (hmacResult.valid) {
            return hmacResult;
        }

        // If HMAC is present but invalid, reject immediately (don't fall back to token)
        logger.warn('[WebhookVerify] Xendit HMAC verification failed — not falling back to token');
        return hmacResult;
    }

    // 3. Fall back to callback token verification
    if (!callbackTokenHeader) {
        logger.warn('[WebhookVerify] Xendit webhook missing both X-Callback-HMAC and X-Callback-Token headers');
        return { valid: false, error: 'Missing callback token/HMAC header' };
    }

    return timingSafeCompare(configuredToken, callbackTokenHeader, 'Xendit token');
}

// ============================================================
// Shared Utility
// ============================================================

/**
 * Timing-safe string comparison to prevent timing attacks.
 * Compares hex-encoded strings using crypto.timingSafeEqual.
 *
 * @param expected - The expected value (hex-encoded)
 * @param actual - The actual value from the request
 * @param providerName - Provider name for logging (e.g., 'Midtrans', 'Xendit')
 * @returns WebhookVerificationResult
 */
function timingSafeCompare(
    expected: string,
    actual: string,
    providerName: string
): WebhookVerificationResult {
    try {
        // Convert hex strings to Buffers for timing-safe comparison
        const expectedBuf = Buffer.from(expected, 'hex');
        const actualBuf = Buffer.from(actual, 'hex');

        // If lengths differ, it's definitely not a match
        if (expectedBuf.length !== actualBuf.length) {
            logSecurityEvent(providerName, 'Signature length mismatch');
            return { valid: false, error: 'Invalid signature' };
        }

        const isValid = crypto.timingSafeEqual(expectedBuf, actualBuf);

        if (!isValid) {
            logSecurityEvent(providerName, 'Signature mismatch');
            return { valid: false, error: 'Invalid signature' };
        }

        return { valid: true };
    } catch {
        // Buffer creation failed (invalid hex) — signature is invalid
        logSecurityEvent(providerName, 'Invalid signature format');
        return { valid: false, error: 'Invalid signature format' };
    }
}

/**
 * Log a security event for failed webhook verification attempts.
 * Logs to both the logger and the audit trail.
 *
 * @param provider - Payment provider name
 * @param reason - Description of the security event
 */
function logSecurityEvent(provider: string, reason: string): void {
    logger.error(`[SECURITY] ${provider} webhook verification failed: ${reason}`);

    // Log to audit trail for security monitoring
    // Note: request is not available here since this is a shared utility
    void logAudit({
        userId: 'system',
        tenantId: 'unknown',
        action: 'WEBHOOK_SIGNATURE_FAILED',
        entity: 'PaymentWebhook',
        entityId: provider,
        oldValues: {} as Record<string, unknown>,
        newValues: {
            provider,
            reason,
            timestamp: new Date().toISOString(),
        } as Record<string, unknown>,
    });
}
