const CACHE_NAME = "expense-tracker-shell-v1";
const APP_SHELL_FILES = [
    "./",
    "./index.html",
    "./login.html",
    "./signup.html",
    "./manifest.webmanifest",
    "./assets/css/styles.css",
    "./assets/js/pwa.js",
    "./assets/js/commonHeaderComponent.js",
    "./assets/js/auth.js",
    "./assets/js/app.js",
    "./assets/js/financeInsightsComponent.js",
    "./assets/js/userManagementComponent.js",
    "./assets/icons/wallet.png",
    "./assets/icons/wallet-192.png",
    "./assets/icons/wallet-512.png"
];

function isSameOrigin(url) {
    return url.origin === self.location.origin;
}

function isApiRequest(url) {
    return url.pathname.includes("/api/");
}

self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(APP_SHELL_FILES))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys().then((names) => Promise.all(
            names
                .filter((name) => name !== CACHE_NAME)
                .map((name) => caches.delete(name))
        )).then(() => self.clients.claim())
    );
});

self.addEventListener("fetch", (event) => {
    const { request } = event;

    if (request.method !== "GET") {
        return;
    }

    const url = new URL(request.url);

    if (!isSameOrigin(url) || isApiRequest(url)) {
        return;
    }

    if (request.mode === "navigate") {
        event.respondWith(
            fetch(request).catch(() => caches.match(request).then((cachedPage) => {
                return cachedPage || caches.match("./index.html");
            }))
        );
        return;
    }

    event.respondWith(
        caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
                return cachedResponse;
            }

            return fetch(request).then((networkResponse) => {
                if (networkResponse && networkResponse.status === 200 && networkResponse.type === "basic") {
                    const copy = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
                }
                return networkResponse;
            });
        })
    );
});
