const PREFIX = 'smartcalculator-cache';
const CACHE_NAME = PREFIX + '-v1';

// Optional: pre-cache a few known static assets on install.
// Not required for SWR to work — it'll cache things on first fetch anyway.
const PRECACHE_URLS = [
    './',
    './index.html',
];

self.addEventListener('install', (event) => {
    self.skipWaiting();
    if (PRECACHE_URLS.length) {
        event.waitUntil(
            caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
        );
    }
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(
                keys
                    .filter((key) => key.startsWith(PREFIX) && key !== CACHE_NAME)
                    .map((key) => caches.delete(key))
            )
        )
    );
    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    const { request } = event;

    // Only handle GET requests; let everything else pass through.
    if (request.method !== 'GET') return;

    // Skip cross-origin requests (e.g. third-party APIs) if you want them
    // to always hit the network. Remove this check to cache everything.
    const url = new URL(request.url);
    if (url.origin !== self.location.origin) return;

    event.respondWith(staleWhileRevalidate(request));
});

async function staleWhileRevalidate(request) {
    const cache = await caches.open(CACHE_NAME);
    const cachedResponse = await cache.match(request);

    const networkFetch = fetch(request)
        .then((networkResponse) => {
            // Only cache valid, basic (same-origin) responses.
            if (networkResponse && networkResponse.status === 200) {
                cache.put(request, networkResponse.clone());
            }
            return networkResponse;
        })
        .catch(() => {
            // Network failed — fall back to cache if we have it, else rethrow.
            if (cachedResponse) return cachedResponse;
            throw new Error('Network request failed and no cache available');
        });

    // Return cached response immediately if present, otherwise wait on network.
    return cachedResponse || networkFetch;
}