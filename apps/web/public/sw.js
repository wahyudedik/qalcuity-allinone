/**
 * Qalcuity POS — Service Worker
 *
 * Custom service worker dengan caching strategies untuk POS offline mode.
 * Tanpa library dependency (native Service Worker API).
 *
 * Caching Strategies:
 * - Static Assets: Cache-First (JS, CSS, images, fonts)
 * - POS API (products, sessions, terminals): Network-First with cache fallback
 * - Transaction API: Network-Only (handled by sync queue)
 * - HTML Pages: Network-First with offline fallback
 *
 * Ref: plans/pos-offline-mode-architecture.md Section 5
 */

// =============================================================================
// Cache Versioning
// =============================================================================

const CACHE_VERSION = 'v1';
const STATIC_CACHE = `qalcuity-static-${CACHE_VERSION}`;
const API_PRODUCTS_CACHE = `qalcuity-api-products-${CACHE_VERSION}`;
const API_SESSIONS_CACHE = `qalcuity-api-sessions-${CACHE_VERSION}`;
const API_TERMINALS_CACHE = `qalcuity-api-terminals-${CACHE_VERSION}`;
const PAGES_CACHE = `qalcuity-pages-${CACHE_VERSION}`;
const OFFLINE_CACHE = `qalcuity-offline-${CACHE_VERSION}`;

/** All cache names for lifecycle management */
const ALL_CACHES = [
    STATIC_CACHE,
    API_PRODUCTS_CACHE,
    API_SESSIONS_CACHE,
    API_TERMINALS_CACHE,
    PAGES_CACHE,
    OFFLINE_CACHE,
];

/** Max entries per cache (LRU eviction) */
const MAX_CACHE_ENTRIES = {
    [STATIC_CACHE]: 100,
    [API_PRODUCTS_CACHE]: 1,
    [API_SESSIONS_CACHE]: 1,
    [API_TERMINALS_CACHE]: 1,
    [PAGES_CACHE]: 10,
    [OFFLINE_CACHE]: 1,
};

// =============================================================================
// Cache TTL (Time-To-Live) in milliseconds
// =============================================================================

const TTL = {
    STATIC: 30 * 24 * 60 * 60 * 1000,  // 30 days
    PRODUCTS: 60 * 60 * 1000,            // 1 hour
    SESSIONS: Infinity,                    // Until updated
    TERMINALS: 60 * 60 * 1000,           // 1 hour
    PAGES: 24 * 60 * 60 * 1000,         // 1 day
};

// =============================================================================
// URL Pattern Matchers
// =============================================================================

/**
 * Check if URL is a static asset (JS, CSS, images, fonts, etc.)
 */
function isStaticAsset(url) {
    const pathname = url.pathname;
    return (
        pathname.startsWith('/_next/static/') ||
        pathname.startsWith('/_next/image/') ||
        pathname.endsWith('.js') ||
        pathname.endsWith('.css') ||
        pathname.endsWith('.png') ||
        pathname.endsWith('.jpg') ||
        pathname.endsWith('.jpeg') ||
        pathname.endsWith('.gif') ||
        pathname.endsWith('.svg') ||
        pathname.endsWith('.ico') ||
        pathname.endsWith('.woff') ||
        pathname.endsWith('.woff2') ||
        pathname.endsWith('.ttf') ||
        pathname.endsWith('.eot') ||
        pathname.endsWith('.webp') ||
        pathname.endsWith('.avif')
    );
}

/**
 * Check if URL is a POS API endpoint that should be cached.
 * Returns the cache name or null if not a cacheable POS API.
 */
function getPOSCacheName(url) {
    const pathname = url.pathname;

    if (pathname === '/api/pos/products' || pathname.startsWith('/api/pos/products?')) {
        return API_PRODUCTS_CACHE;
    }
    if (pathname === '/api/pos/sessions' || pathname.startsWith('/api/pos/sessions?') || pathname.startsWith('/api/pos/sessions/')) {
        return API_SESSIONS_CACHE;
    }
    if (pathname === '/api/pos/terminals' || pathname.startsWith('/api/pos/terminals?')) {
        return API_TERMINALS_CACHE;
    }

    return null;
}

/**
 * Check if URL is a POS transaction API (never cache — sync queue handles it).
 */
function isTransactionAPI(url) {
    return url.pathname === '/api/pos/transactions' || url.pathname.startsWith('/api/pos/transactions/');
}

// =============================================================================
// Caching Strategies
// =============================================================================

/**
 * Cache-First strategy.
 * Serve from cache, update cache in background if stale.
 * Used for: static assets (JS, CSS, images, fonts).
 */
async function cacheFirst(request, cacheName, ttl) {
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);

    if (cachedResponse) {
        // Check if cached response is stale
        const cachedDate = new Date(cachedResponse.headers.get('sw-cached-at') || 0);
        const isStale = ttl !== Infinity && (Date.now() - cachedDate.getTime()) > ttl;

        if (!isStale) {
            return cachedResponse;
        }

        // Stale — update cache in background
        updateCacheInBackground(request, cache, cacheName);
        return cachedResponse;
    }

    // Not in cache — fetch from network and cache
    try {
        const networkResponse = await fetchWithTimeout(request, 10000);
        if (networkResponse.ok) {
            const responseToCache = addCacheMetadata(networkResponse.clone());
            await putIntoCache(cache, cacheName, request, responseToCache);
        }
        return networkResponse;
    } catch (error) {
        // Network failed and no cache — return offline error
        return new Response(
            JSON.stringify({ error: 'Offline — resource not available' }),
            { status: 503, headers: { 'Content-Type': 'application/json' } }
        );
    }
}

/**
 * Network-First strategy.
 * Try network, fallback to cache if offline.
 * Used for: POS API (products, sessions, terminals), HTML pages.
 */
async function networkFirst(request, cacheName, ttl) {
    try {
        const networkResponse = await fetchWithTimeout(request, 10000);
        if (networkResponse.ok) {
            const cache = await caches.open(cacheName);
            const responseToCache = addCacheMetadata(networkResponse.clone());
            await putIntoCache(cache, cacheName, request, responseToCache);
        }
        return networkResponse;
    } catch (error) {
        // Network failed — try cache
        const cache = await caches.open(cacheName);
        const cachedResponse = await cache.match(request);

        if (cachedResponse) {
            // Check TTL for cached response
            const cachedDate = new Date(cachedResponse.headers.get('sw-cached-at') || 0);
            const isStale = ttl !== Infinity && (Date.now() - cachedDate.getTime()) > ttl;

            if (!isStale) {
                return cachedResponse;
            }
            // Stale but still usable in offline mode
            return cachedResponse;
        }

        return null; // Caller handles the null case
    }
}

/**
 * Network-First for HTML pages with offline fallback.
 * Used for: HTML navigation requests.
 */
async function networkFirstWithFallback(request) {
    try {
        const networkResponse = await fetchWithTimeout(request, 10000);
        if (networkResponse.ok) {
            const cache = await caches.open(PAGES_CACHE);
            const responseToCache = addCacheMetadata(networkResponse.clone());
            await putIntoCache(cache, PAGES_CACHE, request, responseToCache);
        }
        return networkResponse;
    } catch (error) {
        // Network failed — try page cache
        const cache = await caches.open(PAGES_CACHE);
        const cachedResponse = await cache.match(request);

        if (cachedResponse) {
            return cachedResponse;
        }

        // Return offline page from cache
        const offlineCache = await caches.open(OFFLINE_CACHE);
        const offlinePage = await offlineCache.match('/offline.html');
        if (offlinePage) {
            return offlinePage;
        }

        // Last resort — basic offline response
        return new Response(
            createOfflineHTML(),
            { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
        );
    }
}

/**
 * Network-Only strategy.
 * Never cache — always go to network.
 * Used for: transaction API, other API routes.
 */
async function networkOnly(request) {
    return fetch(request);
}

// =============================================================================
// Cache Helpers
// =============================================================================

/**
 * Add metadata headers to a response for TTL tracking.
 */
function addCacheMetadata(response) {
    const headers = new Headers(response.headers);
    headers.set('sw-cached-at', new Date().toISOString());
    return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
    });
}

/**
 * Put a response into cache with LRU eviction.
 * If cache exceeds max entries, removes the oldest entry.
 */
async function putIntoCache(cache, cacheName, request, response) {
    const maxEntries = MAX_CACHE_ENTRIES[cacheName] || 50;

    await cache.put(request, response);

    // LRU eviction: check if we exceed max entries
    const keys = await cache.keys();
    if (keys.length > maxEntries) {
        // Remove oldest entries (first in cache = oldest)
        const entriesToRemove = keys.length - maxEntries;
        for (let i = 0; i < entriesToRemove; i++) {
            await cache.delete(keys[i]);
        }
    }
}

/**
 * Fetch with timeout to prevent hanging requests.
 */
function fetchWithTimeout(request, timeoutMs) {
    return Promise.race([
        fetch(request),
        new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Network timeout')), timeoutMs)
        ),
    ]);
}

/**
 * Update cache in background (non-blocking).
 */
function updateCacheInBackground(request, cache, cacheName) {
    fetchWithTimeout(request, 15000)
        .then(async (networkResponse) => {
            if (networkResponse.ok) {
                const responseToCache = addCacheMetadata(networkResponse.clone());
                await putIntoCache(cache, cacheName, request, responseToCache);
            }
        })
        .catch(() => {
            // Background update failed — silently ignore
        });
}

/**
 * Generate a basic offline HTML page.
 */
function createOfflineHTML() {
    return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Qalcuity — Offline</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex; align-items: center; justify-content: center;
      min-height: 100vh; background: #f5f5f5; color: #333;
    }
    .container {
      text-align: center; padding: 2rem; max-width: 400px;
    }
    .icon { font-size: 4rem; margin-bottom: 1rem; }
    h1 { font-size: 1.5rem; margin-bottom: 0.5rem; }
    p { color: #666; line-height: 1.6; margin-bottom: 1.5rem; }
    .btn {
      display: inline-block; padding: 0.75rem 1.5rem;
      background: #2563eb; color: #fff; border: none; border-radius: 0.5rem;
      font-size: 1rem; cursor: pointer; text-decoration: none;
    }
    .btn:hover { background: #1d4ed8; }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">📡</div>
    <h1>Koneksi Terputus</h1>
    <p>Anda sedang offline. Beberapa fitur mungkin tidak tersedia sampai koneksi internet pulih.</p>
    <button class="btn" onclick="location.reload()">Coba Lagi</button>
  </div>
</body>
</html>`;
}

// =============================================================================
// Message Handler (for cache management from main thread)
// =============================================================================

self.addEventListener('message', (event) => {
    const { type, payload } = event.data || {};

    switch (type) {
        case 'GET_CACHE_STATS':
            getCacheStats().then((stats) => {
                event.source.postMessage({ type: 'CACHE_STATS', payload: stats });
            });
            break;

        case 'CLEAR_ALL_CACHES':
            clearAllCaches().then(() => {
                event.source.postMessage({ type: 'CACHES_CLEARED' });
            });
            break;

        case 'CLEAR_CACHE':
            if (payload && payload.cacheName) {
                caches.delete(payload.cacheName).then(() => {
                    event.source.postMessage({ type: 'CACHE_CLEARED', payload: { cacheName: payload.cacheName } });
                });
            }
            break;

        case 'SKIP_WAITING':
            self.skipWaiting();
            break;

        default:
            break;
    }
});

/**
 * Get cache usage stats for all caches.
 */
async function getCacheStats() {
    const stats = [];
    for (const cacheName of ALL_CACHES) {
        try {
            const cache = await caches.open(cacheName);
            const keys = await cache.keys();
            let totalSize = 0;

            for (const request of keys) {
                const response = await cache.match(request);
                if (response) {
                    const blob = await response.blob();
                    totalSize += blob.size;
                }
            }

            stats.push({
                name: cacheName,
                entries: keys.length,
                size: totalSize,
            });
        } catch {
            stats.push({ name: cacheName, entries: 0, size: 0 });
        }
    }
    return stats;
}

/**
 * Clear all caches.
 */
async function clearAllCaches() {
    for (const cacheName of ALL_CACHES) {
        await caches.delete(cacheName);
    }
}

// =============================================================================
// Install Event — Pre-cache essential assets
// =============================================================================

self.addEventListener('install', (event) => {
    event.waitUntil(
        (async () => {
            const cache = await caches.open(STATIC_CACHE);

            // Pre-cache the offline page
            const offlineResponse = new Response(createOfflineHTML(), {
                headers: { 'Content-Type': 'text/html; charset=utf-8' },
            });
            await cache.put('/offline.html', offlineResponse);

            // Skip waiting to activate immediately
            self.skipWaiting();
        })()
    );
});

// =============================================================================
// Activate Event — Clean up old caches
// =============================================================================

self.addEventListener('activate', (event) => {
    event.waitUntil(
        (async () => {
            // Remove old caches that don't match current version
            const cacheNames = await caches.keys();
            const oldCaches = cacheNames.filter(
                (name) => !ALL_CACHES.includes(name) && name.startsWith('qalcuity-')
            );

            await Promise.all(
                oldCaches.map((name) => caches.delete(name))
            );

            // Claim all clients immediately
            await self.clients.claim();
        })()
    );
});

// =============================================================================
// Fetch Event — Route requests to appropriate caching strategy
// =============================================================================

self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET requests for caching (but allow POST for navigation)
    if (request.method !== 'GET' && request.method !== 'POST') {
        return;
    }

    // Skip cross-origin requests (except same-origin)
    if (url.origin !== self.location.origin) {
        return;
    }

    // Skip chrome-extension and other non-http schemes
    if (!url.protocol.startsWith('http')) {
        return;
    }

    // Rule 1: Static Assets → Cache-First
    if (isStaticAsset(url)) {
        event.respondWith(cacheFirst(request, STATIC_CACHE, TTL.STATIC));
        return;
    }

    // Rule 2: POS Products API → Network-First with cache fallback
    // Rule 3: POS Sessions API → Network-First with cache fallback
    // Rule 4: POS Terminals API → Network-First with cache fallback
    const posCacheName = getPOSCacheName(url);
    if (posCacheName) {
        const ttl =
            posCacheName === API_PRODUCTS_CACHE ? TTL.PRODUCTS :
                posCacheName === API_SESSIONS_CACHE ? TTL.SESSIONS :
                    posCacheName === API_TERMINALS_CACHE ? TTL.TERMINALS :
                        TTL.PRODUCTS;

        event.respondWith(
            (async () => {
                const response = await networkFirst(request, posCacheName, ttl);
                if (response) {
                    return response;
                }
                // No cache available — return error
                return new Response(
                    JSON.stringify({ error: 'Data tidak tersedia offline', offline: true }),
                    { status: 503, headers: { 'Content-Type': 'application/json' } }
                );
            })()
        );
        return;
    }

    // Rule 5: Transaction API → Network-Only (handled by sync queue)
    if (isTransactionAPI(url)) {
        event.respondWith(networkOnly(request));
        return;
    }

    // Rule 6: Other API routes → Network-Only (don't cache non-POS APIs)
    if (url.pathname.startsWith('/api/')) {
        event.respondWith(networkOnly(request));
        return;
    }

    // Rule 7: HTML Pages (navigation) → Network-First with offline fallback
    if (request.mode === 'navigate') {
        event.respondWith(networkFirstWithFallback(request));
        return;
    }

    // Default: Network-First for everything else
    event.respondWith(
        (async () => {
            const response = await networkFirst(request, STATIC_CACHE, TTL.STATIC);
            if (response) {
                return response;
            }
            return fetch(request);
        })()
    );
});
