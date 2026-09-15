export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import type { WhatsAppWebhookEvent } from '@/lib/whatsapp/types';

/**
 * GET /api/webhooks/whatsapp
 *
 * Webhook verification endpoint for Meta Cloud API.
 * Meta sends a challenge request with verify_token to confirm the webhook URL.
 * No authentication needed — Meta verifies via verify_token.
 */
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const mode = searchParams.get('hub.mode');
        const token = searchParams.get('hub.verify_token');
        const challenge = searchParams.get('hub.challenge');

        // Verify the mode and token
        if (mode === 'subscribe' && token) {
            // Check if any tenant has this verify token configured
            const integration = await prisma.tenantIntegration.findFirst({
                where: {
                    type: 'whatsapp',
                    config: {
                        path: ['verifyToken'],
                        equals: token,
                    },
                },
            });

            if (integration) {
                logger.info('[WhatsApp Webhook] Verification successful', { token });
                // Return the challenge to complete verification
                return new NextResponse(challenge || '', {
                    status: 200,
                    headers: { 'Content-Type': 'text/plain' },
                });
            }
        }

        // Verification failed
        logger.warn('[WhatsApp Webhook] Verification failed', { mode, token });
        return NextResponse.json(
            { error: 'Forbidden: Invalid verify token' },
            { status: 403 }
        );
    } catch (error) {
        logger.error('[WhatsApp Webhook] GET error', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

/**
 * POST /api/webhooks/whatsapp
 *
 * Handle incoming webhook events from Meta Cloud API.
 * Processes status updates (delivered, read, failed) and updates
 * WhatsAppMessageLog records accordingly.
 *
 * No authentication needed — Meta verifies via verify_token.
 */
export async function POST(request: Request) {
    try {
        const body: WhatsAppWebhookEvent = await request.json();

        // Validate webhook structure
        if (body.object !== 'whatsapp_business_account') {
            return NextResponse.json({ status: 'ignored' }, { status: 200 });
        }

        // Process each entry
        for (const entry of body.entry || []) {
            for (const change of entry.changes || []) {
                const value = change.value;

                // Process status updates (delivered, read, failed)
                if (value.statuses) {
                    for (const status of value.statuses) {
                        try {
                            await processStatusUpdate(status);
                        } catch (error) {
                            logger.error('[WhatsApp Webhook] Failed to process status', {
                                messageId: status.id,
                                error,
                            });
                        }
                    }
                }

                // Process incoming messages (log only for now)
                if (value.messages) {
                    for (const message of value.messages) {
                        logger.info('[WhatsApp Webhook] Incoming message', {
                            from: message.from,
                            type: message.type,
                            id: message.id,
                        });
                    }
                }
            }
        }

        return NextResponse.json({ status: 'ok' }, { status: 200 });
    } catch (error) {
        logger.error('[WhatsApp Webhook] POST error', error);
        return NextResponse.json({ status: 'error' }, { status: 200 });
        // Return 200 to prevent Meta from retrying
    }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Meta status to internal status mapping */
const STATUS_MAP: Record<string, string> = {
    sent: 'sent',
    delivered: 'delivered',
    read: 'read',
    failed: 'failed',
    pending: 'sent',
};

interface WebhookStatus {
    id: string;
    status: string;
    timestamp: string;
    recipient_id: string;
    errors?: Array<{
        code: number;
        title: string;
        message: string;
    }>;
}

/**
 * Process a status update from the webhook.
 * Updates the WhatsAppMessageLog record with the new status.
 */
async function processStatusUpdate(status: WebhookStatus): Promise<void> {
    const internalStatus = STATUS_MAP[status.status] || status.status;
    const timestamp = new Date(parseInt(status.timestamp, 10) * 1000);

    // Find the message log by messageId (Meta API message ID)
    const existingLog = await prisma.whatsAppMessageLog.findFirst({
        where: {
            messageId: status.id,
        },
    });

    if (!existingLog) {
        logger.warn('[WhatsApp Webhook] Message log not found for messageId', {
            messageId: status.id,
        });
        return;
    }

    // Build update data
    const updateData: Record<string, unknown> = {
        status: internalStatus,
    };

    if (internalStatus === 'delivered') {
        updateData.deliveredAt = timestamp;
    } else if (internalStatus === 'read') {
        updateData.readAt = timestamp;
    } else if (internalStatus === 'failed' && status.errors?.length) {
        updateData.error = status.errors.map((e) => e.message).join('; ');
    }

    await prisma.whatsAppMessageLog.update({
        where: { id: existingLog.id },
        data: updateData,
    });

    logger.info('[WhatsApp Webhook] Status updated', {
        messageId: status.id,
        status: internalStatus,
        tenantId: existingLog.tenantId,
    });
}
