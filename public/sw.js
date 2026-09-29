// Phosphur service worker: routes proxied requests to the Scramjet controller.
importScripts("/vendor/controller/controller.sw.js");

addEventListener("fetch", (event) => {
  if ($scramjetController.shouldRoute(event)) {
    event.respondWith($scramjetController.route(event));
  }
});
