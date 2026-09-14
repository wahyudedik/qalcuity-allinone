export const dynamic = 'force-dynamic';

/**
 * Notification Center — SSE (Server-Sent Events) Stream Endpoint
 *
 * Provides real-time notification updates to connected clients.
 * Clients connect via GET /api/notifications/stream and receive
 * push notifications when new InAppNotification records are created.
 *
 * Architecture:
 * - In-memory subscriber map keyed by tenantId
 * - notifyNewNotification() exported for use by notification-creating routes
 * - Auto-cleanup on client disconnect (abort signal)
 * - Heartbeat every 30s to keep connection alive
 * - Polling retained as fallback on client side (60s interval)
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logger } from '@/lib/logger';

// =============================================================================
// Helpers
// =============================================================================

const encoder = new TextEncoder();

/** Encode a string to Uint8Array for ReadableStream controller */
function sseEncode(data: string): Uint8Array {
    return encoder.encode(`data: ${data}\n\n`);
}

// =============================================================================
// Subscriber Management
// =============================================================================

/** In-memory subscribers per tenant — controller set per tenantId */
const notificationSubscribers = new Map<string, Set<ReadableStreamDefaultController<Uint8Array>>>();

/**
 * Notify all notification subscribers for a given tenant.
 * Called after InAppNotification creation to push real-time updates.
 *
 * @param tenantId - The tenant whose subscribers should be notified
 * @param notification - Optional notification details for the payload
 */
export function notifyNewNotification(
    tenantId: string,
    notification?: { id: string; title: string; type: string }
): void {
    const tenantSubscribers = notificationSubscribers.get(tenantId);
    if (!tenantSubscribers || tenantSubscribers.size === 0) return;

    const payload = JSON.stringify({
        type: 'new_notification',
        timestamp: Date.now(),
        notification,
    });
    const encoded = sseEncode(payload);
    const deadControllers: ReadableStreamDefaultController<Uint8Array>[] = [];

    tenantSubscribers.forEach((controller) => {
        try {
            controller.enqueue(encoded);
        } catch {
            // Controller already closed — mark for cleanup
            deadControllers.push(controller);
        }
    });

    // Cleanup dead controllers
    for (const dead of deadControllers) {
        tenantSubscribers.delete(dead);
    }
    if (tenantSubscribers.size === 0) {
        notificationSubscribers.delete(tenantId);
    }
}

// =============================================================================
// GET — SSE Stream Handler
// =============================================================================

export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.tenantId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const tenantId = session.user.tenantId;

        const stream = new ReadableStream<Uint8Array>({
            start(controller) {
                // Register subscriber
                if (!notificationSubscribers.has(tenantId)) {
                    notificationSubscribers.set(tenantId, new Set());
                }
                notificationSubscribers.get(tenantId)!.add(controller);

                // Send initial connection confirmation
                controller.enqueue(sseEncode(JSON.stringify({ type: 'connected', timestamp: Date.now() })));

                logger.info('[Notification SSE] Client connected', {
                    tenantId,
                    activeConnections: notificationSubscribers.get(tenantId)!.size,
                });

                // Send heartbeat every 30s to keep connection alive
                const heartbeatId = setInterval(() => {
                    try {
                        controller.enqueue(sseEncode(JSON.stringify({ type: 'heartbeat', timestamp: Date.now() })));
                    } catch {
                        clearInterval(heartbeatId);
                    }
                }, 30_000);

                // Cleanup on client disconnect
                request.signal.addEventListener('abort', () => {
                    clearInterval(heartbeatId);
                    notificationSubscribers.get(tenantId)?.delete(controller);
                    if (notificationSubscribers.get(tenantId)?.size === 0) {
                        notificationSubscribers.delete(tenantId);
                    }
                    try {
                        controller.close();
                    } catch {
                        // Already closed
                    }
                    logger.info('[Notification SSE] Client disconnected', {
                        tenantId,
                        remainingConnections: notificationSubscribers.get(tenantId)?.size ?? 0,
                    });
                });
            },
            cancel() {
                // Cleanup handled by abort listener
            },
        });

        return new Response(stream, {
            status: 200,
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache, no-transform',
                'Connection': 'keep-alive',
                'X-Accel-Buffering': 'no', // Disable nginx buffering
            },
        });
    } catch (error) {
        logger.error('[Notification SSE] Error establishing stream', error);
        return NextResponse.json(
            { error: 'Failed to establish SSE stream' },
            { status: 500 }
        );
    }
}
