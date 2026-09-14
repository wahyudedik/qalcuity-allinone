/**
 * Kitchen PubSub — SSE kitchen order broadcasting
 *
 * In-memory subscriber map keyed by tenantId.
 * Used by the SSE stream endpoint and kitchen order CRUD routes.
 *
 * Architecture:
 * - kitchenSubscribers: Map<tenantId, Set<ReadableStreamDefaultController>>
 * - notifyKitchenUpdate() for pushing real-time updates
 * - sseEncode() imported from notification-pubsub (shared helper)
 */

import { sseEncode } from '@/lib/notification-pubsub';

// =============================================================================
// Subscriber Management
// =============================================================================

/** In-memory subscribers per tenant — controller set per tenantId */
export const kitchenSubscribers = new Map<string, Set<ReadableStreamDefaultController<Uint8Array>>>();

/**
 * Notify all kitchen display subscribers for a given tenant.
 * Called after order create/update/delete to push real-time updates.
 *
 * @param tenantId - The tenant whose subscribers should be notified
 */
export function notifyKitchenUpdate(tenantId: string): void {
    const tenantSubscribers = kitchenSubscribers.get(tenantId);
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
        kitchenSubscribers.delete(tenantId);
    }
}
