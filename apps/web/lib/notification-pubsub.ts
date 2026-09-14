/**
 * Notification PubSub — SSE notification broadcasting
 *
 * In-memory subscriber map keyed by tenantId.
 * Used by the SSE stream endpoint and notification-creating routes.
 *
 * Architecture:
 * - notificationSubscribers: Map<tenantId, Set<ReadableStreamDefaultController>>
 * - notifyNewNotification() for pushing real-time updates
 * - sseEncode() helper for SSE data formatting
 */

const encoder = new TextEncoder();

/** Encode a string to Uint8Array for ReadableStream controller */
export function sseEncode(data: string): Uint8Array {
    return encoder.encode(`data: ${data}\n\n`);
}

// =============================================================================
// Subscriber Management
// =============================================================================

/** In-memory subscribers per tenant — controller set per tenantId */
export const notificationSubscribers = new Map<string, Set<ReadableStreamDefaultController<Uint8Array>>>();

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
