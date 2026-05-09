// Self-uninstalling service worker.
// When a browser visits a page that previously registered an SW, it checks for an updated
// sw.js INDEPENDENTLY of any cached HTML. When that check finds this new content, the
// browser installs this SW, activates it, and the activate handler immediately clears
// all caches and unregisters this SW. From the next page load onward there is no SW.
// Result: phones with stale SW caching old HTML get a one-time cleanup, and SidePocket
// becomes a regular website that always loads fresh from Vercel.

self.addEventListener('install', function(event) {
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  event.waitUntil((async function() {
    try {
      var keys = await caches.keys();
      await Promise.all(keys.map(function(k){ return caches.delete(k); }));
    } catch(e) {}
    try { await self.registration.unregister(); } catch(e) {}
    try {
      var clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      clients.forEach(function(c){
        try { c.navigate(c.url); } catch(e) {}
      });
    } catch(e) {}
  })());
});

// While this SW is briefly active before it unregisters itself, pass all fetches through
// to the network without caching. Prevents the old caching SW's behavior from leaking
// through during the install/activate window.
self.addEventListener('fetch', function(event) {
  event.respondWith(fetch(event.request).catch(function(){ return new Response('', { status: 503 }); }));
});