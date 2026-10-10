// Phosphur service worker: routes proxied requests to the Scramjet controller.
importScripts("/vendor/controller/controller.sw.js");

// Stopgap for scramjet-controller 0.0.14, until MercuryWorkshop/scramjet#211 is released.
// Browsers stop an idle worker, and the fresh one doesn't know the shell's controller until
// the shell registers again, ~100 ms after the worker starts. The request that woke the
// worker would reach the server and 404, so hold proxied requests until it registers.
// Delete this once the controller handles it itself; the e2e test "survives the service
// worker restarting" must still pass without it.

/** The controller's default frame prefix; Phosphur doesn't set config.prefix. */
const PREFIX = "/~/sj/";
const REGISTER_TIMEOUT = 5000;
const POLL_INTERVAL = 25;

addEventListener("fetch", (event) => {
  if ($scramjetController.shouldRoute(event)) {
    event.respondWith($scramjetController.route(event));
  } else if (isProxied(event.request)) {
    event.respondWith(routeOnceRegistered(event));
  }
});

// request.url is always absolute and normalized, so a prefix check is enough.
function isProxied(request) {
  return request.url.startsWith(location.origin + PREFIX);
}

// Polls rather than asking the shell to register: the controller re-registers on every revive
// message, and a second registration drops a request already sent over the first.
async function routeOnceRegistered(event) {
  const deadline = Date.now() + REGISTER_TIMEOUT;
  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL));
    if ($scramjetController.shouldRoute(event)) return $scramjetController.route(event);
  }
  // Nothing claimed it, so let it through as if it had never been held.
  return fetch(event.request);
}
