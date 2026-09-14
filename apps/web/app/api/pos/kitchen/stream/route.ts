export const dynamic = 'force-dynamic';

/**
 * Kitchen Display — SSE (Server-Sent Events) Stream Endpoint
 *
 * Provides real-time order updates to kitchen display clients.
 * Clients connect via GET /api/pos/kitchen/stream and receive
 * push notifications when orders are created or updated.
 *
 * Architecture:
 * - Subscriber map managed in @/lib/kitchen-pubsub (shared with order CRUD routes)
 * - Auto-cleanup on client disconnect (abort signal)
 * - Heartbeat every 30s to keep connection alive
 * - Polling retained as fallback on client side
 */

import { NextResponse } from 'next/server';
import { requirePermissionForRoute } from '@/lib/session';
import { logger } from '@/lib/logger';
import { sseEncode } from '@/lib/notification-pubsub';
import { kitchenSubscribers } from '@/lib/kitchen-pubsub';

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
                if (!kitchenSubscribers.has(tenantId)) {
                    kitchenSubscribers.set(tenantId, new Set());
                }
                kitchenSubscribers.get(tenantId)!.add(controller);

                // Send initial connection confirmation
                controller.enqueue(sseEncode(JSON.stringify({ type: 'connected', timestamp: Date.now() })));

                logger.info('[Kitchen SSE] Client connected', {
                    tenantId,
                    activeConnections: kitchenSubscribers.get(tenantId)!.size,
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
                    kitchenSubscribers.get(tenantId)?.delete(controller);
                    if (kitchenSubscribers.get(tenantId)?.size === 0) {
                        kitchenSubscribers.delete(tenantId);
                    }
                    try {
                        controller.close();
                    } catch {
                        // Already closed
                    }
                    logger.info('[Kitchen SSE] Client disconnected', {
                        tenantId,
                        remainingConnections: kitchenSubscribers.get(tenantId)?.size ?? 0,
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
        logger.error('[Kitchen SSE] Error establishing stream', error);
        return NextResponse.json(
            { error: 'Failed to establish SSE stream' },
            { status: 500 }
        );
    }
}
