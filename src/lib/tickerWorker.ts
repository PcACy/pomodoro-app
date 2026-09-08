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

interface TickerControlMessage {
  type?: string
  id?: string
}

/**
 * Fallback ticker when a real Worker cannot be created (e.g. CSP blocking
 * blob: workers): a refcounted setInterval behind the same interface, so the
 * timer keeps running instead of crashing the effect that requested it.
 */
function createFallbackTicker(): Worker {
  const listeners = new Set<(e: MessageEvent) => void>()
  const clients = new Set<string>()
  let timer: ReturnType<typeof setInterval> | null = null
  const tick = () => {
    const evt = { data: { type: 'tick', now: Date.now() } } as MessageEvent
    listeners.forEach((l) => {
      try {
        l(evt)
      } catch {
        /* listener failure non-fatal */
      }
    })
  }
  const asListener = (fn: EventListener): ((e: MessageEvent) => void) => fn as (e: MessageEvent) => void
  const api = {
    postMessage: (msg: TickerControlMessage) => {
      if (!msg) return
      if (msg.type === 'start') {
        clients.add(msg.id ?? 'default')
        if (timer == null) timer = setInterval(tick, 250)
      } else if (msg.type === 'stop') {
        clients.delete(msg.id ?? 'default')
        if (clients.size === 0 && timer != null) {
          clearInterval(timer)
          timer = null
        }
      }
    },
    addEventListener: (_type: string, listener: EventListener) => {
      listeners.add(asListener(listener))
    },
    removeEventListener: (_type: string, listener: EventListener) => {
      listeners.delete(asListener(listener))
    },
    terminate: () => {
      if (timer != null) clearInterval(timer)
      timer = null
      listeners.clear()
      clients.clear()
    },
  }
  return api as unknown as Worker
}

/**
 * Difference-based ticking: the worker only reports wall-clock timestamps.
 * The main thread computes remaining time from a fixed target end timestamp,
 * so the countdown stays exact even when background tabs throttle the worker
 * or the system sleeps between wakeups.
 */
export function getTickerWorker(): Worker {
  if (!worker) {
    try {
      const blob = new Blob([WORKER_CODE], { type: 'application/javascript' })
      const blobUrl = URL.createObjectURL(blob)
      worker = new Worker(blobUrl)
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000)
      worker.onerror = (err) => {
        console.warn('[tickerWorker] Worker error encountered, resetting instance:', err)
        terminateTickerWorker()
      }
    } catch (err) {
      console.warn('[tickerWorker] Worker creation failed, using interval fallback:', err)
      worker = createFallbackTicker()
    }
  }
  return worker
}

function terminateTickerWorker(): void {
  if (worker) {
    try {
      worker.terminate()
    } catch {
      /* ignore */
    }
    worker = null
  }
}