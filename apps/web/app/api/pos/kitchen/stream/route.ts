export const dynamic = 'force-dynamic';

/**
 * Kitchen Display — SSE (Server-Sent Events) Stream Endpoint
 *
 * Provides real-time order updates to kitchen display clients.
 * Clients connect via GET /api/pos/kitchen/stream and receive
 * push notifications when orders are created or updated.
 *
 * Architecture:
 * - In-memory subscriber map keyed by tenantId
 * - notifyKitchenUpdate() exported for use by order CRUD routes
 * - Auto-cleanup on client disconnect (abort signal)
 * - Heartbeat every 30s to keep connection alive
 * - Polling retained as fallback on client side
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
const subscribers = new Map<string, Set<ReadableStreamDefaultController<Uint8Array>>>();

/**
 * Notify all kitchen display subscribers for a given tenant.
 * Called after order create/update/delete to push real-time updates.
 *
 * @param tenantId - The tenant whose subscribers should be notified
 */
export function notifyKitchenUpdate(tenantId: string): void {
    const tenantSubscribers = subscribers.get(tenantId);
    if (!tenantSubscribers || tenantSubscribers.size === 0) return;

    const payload = JSON.stringify({ type: 'update', timestamp: Date.now() });
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
        subscribers.delete(tenantId);
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
                if (!subscribers.has(tenantId)) {
                    subscribers.set(tenantId, new Set());
                }
                subscribers.get(tenantId)!.add(controller);

                // Send initial connection confirmation
                controller.enqueue(sseEncode(JSON.stringify({ type: 'connected', timestamp: Date.now() })));

                logger.info('[Kitchen SSE] Client connected', {
                    tenantId,
                    activeConnections: subscribers.get(tenantId)!.size,
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
                    subscribers.get(tenantId)?.delete(controller);
                    if (subscribers.get(tenantId)?.size === 0) {
                        subscribers.delete(tenantId);
                    }
                    try {
                        controller.close();
                    } catch {
                        // Already closed
                    }
                    logger.info('[Kitchen SSE] Client disconnected', {
                        tenantId,
                        remainingConnections: subscribers.get(tenantId)?.size ?? 0,
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
