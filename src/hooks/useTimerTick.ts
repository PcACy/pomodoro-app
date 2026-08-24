import { useSyncExternalStore } from 'react'
import {
  getTimerTickSnapshot,
  getFlowTickSnapshot,
  subscribeTimerTick,
  subscribeFlowTick,
  type TimerTickSnapshot,
  type FlowTickSnapshot,
} from '../lib/timerStore'

export function useTimerTick(): TimerTickSnapshot {
  return useSyncExternalStore(subscribeTimerTick, getTimerTickSnapshot, getTimerTickSnapshot)
}

export function useFlowTimerTick(): FlowTickSnapshot {
  return useSyncExternalStore(subscribeFlowTick, getFlowTickSnapshot, getFlowTickSnapshot)
}
