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
import { requirePermissionForRoute } from '@/lib/session';
import { logger } from '@/lib/logger';
import { notificationSubscribers, sseEncode } from '@/lib/notification-pubsub';

// =============================================================================
// GET — SSE Stream Handler
// =============================================================================

export async function GET(request: Request) {
    try {
        const auth = await requirePermissionForRoute(request);
        if (auth.error || !auth.tenantId) {
            return NextResponse.json(
                { success: false, error: auth.error || 'Unauthorized' },
                { status: auth.status || 401 }
            );
        }

        const tenantId = auth.tenantId;

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
