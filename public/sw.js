const CACHE_NAME = 'cyp-scanner-v2';

// Install: skip waiting immediately
self.addEventListener('install', (event) => {
    console.log('[SW] Installing...');
    self.skipWaiting();
});

// Activate: claim clients and clean old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        Promise.all([
            self.clients.claim(),
            caches.keys().then((cacheNames) => {
                return Promise.all(
                    cacheNames
                        .filter((name) => name.startsWith('cyp-scanner-') && name !== CACHE_NAME)
                        .map((name) => caches.delete(name))
                );
            })
        ])
    );
    console.log('[SW] Activated');
});

// Fetch: cache everything for offline use
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET requests
    if (request.method !== 'GET') return;

    // Skip external requests
    if (url.origin !== location.origin) return;

    // Skip API calls (we want fresh data when online)
    if (url.pathname.startsWith('/api/')) return;

    // For all other requests: network-first with cache fallback
    event.respondWith(
        fetch(request)
            .then((response) => {
                // Cache successful responses
                if (response.ok && response.status === 200) {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(request, clone);
                    });
                }
                return response;
            })
            .catch(async () => {
                // Network failed, try cache
                const cached = await caches.match(request);
                if (cached) {
                    return cached;
                }
                // For navigation, return cached scanner page
                if (request.mode === 'navigate') {
                    const scannerPage = await caches.match('/concert-scan');
                    if (scannerPage) return scannerPage;
                }
                // Return offline error for other requests
                return new Response('Offline', { status: 503 });
            })
    );
});
