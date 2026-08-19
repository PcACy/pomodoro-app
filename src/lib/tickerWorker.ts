const WORKER_CODE = `
let timer = null;
self.onmessage = function (e) {
  var msg = e.data;
  if (msg.type === 'start') {
    if (timer !== null) return;
    timer = self.setInterval(function () {
      self.postMessage({ type: 'tick', now: Date.now() });
    }, 250);
  } else if (msg.type === 'stop') {
    if (timer !== null) { self.clearInterval(timer); timer = null; }
  }
};
`

let worker: Worker | null = null

/**
 * Difference-based ticking: the worker only reports wall-clock timestamps.
 * The main thread computes remaining time from a fixed target end timestamp,
 * so the countdown stays exact even when background tabs throttle the worker.
 */
export function getTickerWorker(): Worker {
  if (!worker) {
    const blob = new Blob([WORKER_CODE], { type: 'application/javascript' })
    worker = new Worker(URL.createObjectURL(blob))
  }
  return worker
}