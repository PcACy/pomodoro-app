const WORKER_CODE = `
let timer = null;
var activeClients = {};
var clientCount = 0;

function tick() {
  var now = Date.now();
  self.postMessage({ type: 'tick', now: now });
  // Self-healing cadence: schedule the next wakeup relative to wall-clock time,
  // so throttling / system sleep does not accumulate interval drift while awake.
  // Stopping is handled by 'stop' clearing the pending timeout below, so a tick
  // can never fire after the worker was told to stop.
  var elapsed = Date.now() - now;
  timer = setTimeout(tick, Math.max(50, 250 - elapsed));
}

self.onmessage = function (e) {
  var msg = e.data;
  if (!msg) return;
  var id = msg.id || 'default';
  if (msg.type === 'start') {
    if (!activeClients[id]) {
      activeClients[id] = true;
      clientCount++;
    }
    if (timer === null && clientCount > 0) {
      tick();
    }
  } else if (msg.type === 'stop') {
    if (activeClients[id]) {
      delete activeClients[id];
      clientCount--;
    }
    if (clientCount <= 0 && timer !== null) {
      clearTimeout(timer);
      timer = null;
      clientCount = 0;
    }
  }
};
`

let worker: Worker | null = null

/**
 * Difference-based ticking: the worker only reports wall-clock timestamps.
 * The main thread computes remaining time from a fixed target end timestamp,
 * so the countdown stays exact even when background tabs throttle the worker
 * or the system sleeps between wakeups.
 */
export function getTickerWorker(): Worker {
  if (!worker) {
    const blob = new Blob([WORKER_CODE], { type: 'application/javascript' })
    worker = new Worker(URL.createObjectURL(blob))
  }
  return worker
}