/**
 * POS Offline Mode — Service Worker Registration Utility
 *
 * Utility functions untuk register, unregister, dan manage Service Worker.
 * Include cache management helpers untuk debugging dan monitoring.
 *
 * Ref: plans/pos-offline-mode-architecture.md Section 5
 */

// =============================================================================
// Types
// =============================================================================

/** Cache usage stats for a single cache */
export interface CacheStats {
    name: string;
    entries: number;
    size: number;
}

/** Message types for SW communication */
type SWMessageType = 'GET_CACHE_STATS' | 'CLEAR_ALL_CACHES' | 'CLEAR_CACHE' | 'SKIP_WAITING';

/** Message sent to Service Worker */
interface SWMessage {
    type: SWMessageType;
    payload?: { cacheName?: string };
}

// =============================================================================
// Constants
// =============================================================================

/** Service Worker file path (must be in public/ directory) */
const SW_PATH = '/sw.js';

/** SW registration options */
const SW_OPTIONS: RegistrationOptions = {
    scope: '/',
    updateViaCache: 'none', // Always check for SW updates
};

// =============================================================================
// Core Functions
// =============================================================================

/**
 * Check if Service Worker is supported in the current browser.
 *
 * @returns true if Service Worker API is available
 */
export function isServiceWorkerSupported(): boolean {
    return (
        typeof window !== 'undefined' &&
        'serviceWorker' in navigator
    );
}

/**
 * Register the Service Worker.
 *
 * - Registers `/sw.js` with root scope (`/`)
 * - Handles registration errors gracefully
 * - Logs registration state for debugging
 * - Returns null if SW is not supported or registration fails
 *
 * @returns ServiceWorkerRegistration or null if registration fails
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
    if (!isServiceWorkerSupported()) {
        console.warn('[SW] Service Worker not supported in this browser');
        return null;
    }

    try {
        const registration = await navigator.serviceWorker.register(SW_PATH, SW_OPTIONS);

        // Listen for updates
        registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (!newWorker) return;

            console.log('[SW] New Service Worker installing...');

            newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed') {
                    if (navigator.serviceWorker.controller) {
                        // New SW installed but old one still active — update available
                        console.log('[SW] New content available — update ready');
                    } else {
                        // First SW installed — content is cached
                        console.log('[SW] Content cached for offline use');
                    }
                }

                if (newWorker.state === 'activated') {
                    console.log('[SW] Service Worker activated');
                }
            });
        });

        // Listen for controller change (new SW took over)
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            console.log('[SW] Service Worker controller changed — page will reload');
        });

        console.log('[SW] Service Worker registered successfully, scope:', registration.scope);
        return registration;
    } catch (error) {
        console.error('[SW] Service Worker registration failed:', error);
        return null;
    }
}

/**
 * Unregister all Service Workers for this scope.
 *
 * @returns true if unregistration was successful
 */
export async function unregisterServiceWorker(): Promise<boolean> {
    if (!isServiceWorkerSupported()) {
        return false;
    }

    try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        let allUnregistered = true;

        for (const registration of registrations) {
            const success = await registration.unregister();
            if (!success) {
                allUnregistered = false;
                console.warn('[SW] Failed to unregister SW:', registration.scope);
            }
        }

        if (allUnregistered) {
            console.log('[SW] All Service Workers unregistered');
        }

        return allUnregistered;
    } catch (error) {
        console.error('[SW] Error unregistering Service Workers:', error);
        return false;
    }
}

// =============================================================================
// Cache Management
// =============================================================================

/**
 * Get cache usage stats from the Service Worker.
 * Communicates with SW via postMessage.
 *
 * @returns Array of cache stats (name, entries, size)
 */
export async function getCacheUsage(): Promise<CacheStats[]> {
    if (!isServiceWorkerSupported() || !navigator.serviceWorker.controller) {
        return [];
    }

    return sendMessageToSW({ type: 'GET_CACHE_STATS' }) as Promise<CacheStats[]>;
}

/**
 * Clear all caches managed by the Service Worker.
 *
 * @returns Promise that resolves when all caches are cleared
 */
export async function clearAllCaches(): Promise<void> {
    if (!isServiceWorkerSupported() || !navigator.serviceWorker.controller) {
        return;
    }

    await sendMessageToSW({ type: 'CLEAR_ALL_CACHES' });
    console.log('[SW] All caches cleared');
}

/**
 * Clear a specific cache by name.
 *
 * @param cacheName - Name of the cache to clear
 * @returns Promise that resolves when the cache is cleared
 */
export async function clearCache(cacheName: string): Promise<void> {
    if (!isServiceWorkerSupported() || !navigator.serviceWorker.controller) {
        return;
    }

    await sendMessageToSW({ type: 'CLEAR_CACHE', payload: { cacheName } });
    console.log(`[SW] Cache "${cacheName}" cleared`);
}

// =============================================================================
// SW Lifecycle Management
// =============================================================================

/**
 * Force the Service Worker to skip waiting and activate immediately.
 * Useful after deploying a new version.
 *
 * @returns Promise that resolves when the message is sent
 */
export async function updateServiceWorker(): Promise<void> {
    if (!isServiceWorkerSupported() || !navigator.serviceWorker.controller) {
        return;
    }

    // Send skipWaiting message to the waiting SW (if any)
    const registration = await navigator.serviceWorker.getRegistration('/');
    if (registration?.waiting) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        console.log('[SW] Skip waiting sent — new SW will activate');
    } else {
        // No waiting SW — trigger update check
        await registration?.update();
        console.log('[SW] Update check triggered');
    }
}

/**
 * Check if the Service Worker is currently active.
 *
 * @returns true if a Service Worker controller is active
 */
export function isServiceWorkerActive(): boolean {
    return (
        isServiceWorkerSupported() &&
        navigator.serviceWorker.controller !== null
    );
}

/**
 * Get the current Service Worker registration (if any).
 *
 * @returns ServiceWorkerRegistration or null
 */
export async function getRegistration(): Promise<ServiceWorkerRegistration | null> {
    if (!isServiceWorkerSupported()) {
        return null;
    }

    try {
        return (await navigator.serviceWorker.getRegistration('/')) || null;
    } catch {
        return null;
    }
}

// =============================================================================
// Event Listeners
// =============================================================================

/**
 * Callback type for SW state changes.
 */
export type SWStateChangeCallback = (state: string) => void;

/**
 * Listen for Service Worker state changes.
 * Returns an unsubscribe function.
 *
 * @param callback - Function called when SW state changes
 * @returns Unsubscribe function
 */
export function onSWStateChange(callback: SWStateChangeCallback): () => void {
    if (!isServiceWorkerSupported()) {
        return () => { };
    }

    const handler = () => {
        const controller = navigator.serviceWorker.controller;
        if (controller) {
            callback(controller.state);
        }
    };

    navigator.serviceWorker.addEventListener('controllerchange', handler);

    return () => {
        navigator.serviceWorker.removeEventListener('controllerchange', handler);
    };
}

// =============================================================================
// Internal Helpers
// =============================================================================

/**
 * Send a message to the active Service Worker and wait for a response.
 *
 * @param message - Message to send
 * @param timeoutMs - Timeout in milliseconds (default: 5000)
 * @returns Response payload from the SW
 */
function sendMessageToSW(message: SWMessage, timeoutMs = 5000): Promise<unknown> {
    return new Promise((resolve, reject) => {
        if (!navigator.serviceWorker.controller) {
            reject(new Error('No active Service Worker'));
            return;
        }

        const messageChannel = new MessageChannel();
        const timeoutId = setTimeout(() => {
            messageChannel.port1.close();
            reject(new Error('Service Worker message timeout'));
        }, timeoutMs);

        messageChannel.port1.onmessage = (event) => {
            clearTimeout(timeoutId);
            resolve(event.data?.payload);
            messageChannel.port1.close();
        };

        navigator.serviceWorker.controller.postMessage(message, [messageChannel.port2]);
    });
}
