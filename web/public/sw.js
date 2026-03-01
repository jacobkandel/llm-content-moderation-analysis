const CACHE_NAME = 'moderation-bias-cache-v1';
const JSON_URLS = [
    '/summary_stats.json',
    '/spectrum_data.json',
    '/heatmap_matrix.json',
    '/prompts_list.json.gz',
    '/compare_data.json',
    '/reliability_scores.json',
    '/consensus_stats.json',
    '/political_compass.json',
    '/paternalism.json',
    '/clusters.json',
    '/drift_report.json'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            // Background prefetch for core JSONs (non-blocking) //
            return cache.addAll(JSON_URLS.map(url => new Request(url, { cache: 'no-cache' })))
                .catch(err => console.error('SW Install Error:', err));
        })
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// Stale-While-Revalidate caching strategy for JSONs
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Only cache GET requests for JSON/CSV/GZ files from our origin
    if (event.request.method === 'GET' &&
        url.origin === location.origin &&
        (url.pathname.endsWith('.json') || url.pathname.endsWith('.csv') || url.pathname.endsWith('.gz'))) {

        event.respondWith(
            caches.open(CACHE_NAME).then((cache) => {
                return cache.match(event.request).then((cachedResponse) => {
                    const fetchPromise = fetch(event.request).then((networkResponse) => {
                        // Put a copy of the new response in the cache
                        cache.put(event.request, networkResponse.clone());
                        return networkResponse;
                    }).catch(() => {
                        // Ignore network errors in the background
                    });

                    // Return the cached response immediately, or wait for the network one
                    return cachedResponse || fetchPromise;
                });
            })
        );
    }
});
