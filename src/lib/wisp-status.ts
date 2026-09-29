export type WispStatus =
  { state: "connecting" } | { state: "online"; latency: number } | { state: "offline" };

const PROBE_TIMEOUT = 8000;

/**
 * Opens a WebSocket to a wisp server and resolves with the time until the
 * server's first packet (wisp servers greet every new connection).
 */
export function probeWisp(url: string, timeout = PROBE_TIMEOUT): Promise<WispStatus> {
  return new Promise((resolve) => {
    const started = performance.now();
    let settled = false;
    let socket: WebSocket;

    const finish = (status: WispStatus) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      socket.onmessage = socket.onerror = socket.onclose = null;
      try {
        socket.close();
      } catch {
        // Already closed.
      }
      resolve(status);
    };

    const timer = setTimeout(() => finish({ state: "offline" }), timeout);

    try {
      socket = new WebSocket(url);
    } catch {
      clearTimeout(timer);
      resolve({ state: "offline" });
      return;
    }
    socket.binaryType = "arraybuffer";
    socket.onmessage = () =>
      finish({ state: "online", latency: Math.round(performance.now() - started) });
    socket.onerror = () => finish({ state: "offline" });
    socket.onclose = () => finish({ state: "offline" });
  });
}
