self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map((name) => caches.delete(name)));
    await self.registration.unregister();

    const openClients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const client of openClients) {
      client.navigate(client.url);
    }
  })());
});
