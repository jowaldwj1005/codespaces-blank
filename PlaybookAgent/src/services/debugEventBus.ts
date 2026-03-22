/**
 * Debug Event Bus - Central observability for all SDK operations.
 * Every Dataverse CRUD call and connector invocation emits a structured event.
 */

export interface DebugEvent {
  id: string;
  timestamp: number;
  operation: string;
  source: 'dataverse' | 'connector';
  status: 'pending' | 'success' | 'error';
  durationMs?: number;
  input?: unknown;
  normalizedResult?: unknown;
  rawResult?: unknown;
  error?: string;
}

type DebugEventListener = (event: DebugEvent) => void;

let idCounter = 0;

const listeners: Set<DebugEventListener> = new Set();
const eventLog: DebugEvent[] = [];
const MAX_LOG_SIZE = 200;

export function generateEventId(): string {
  return `evt_${++idCounter}_${Date.now()}`;
}

export function emitDebugEvent(event: DebugEvent): void {
  eventLog.push(event);
  if (eventLog.length > MAX_LOG_SIZE) {
    eventLog.splice(0, eventLog.length - MAX_LOG_SIZE);
  }
  listeners.forEach((fn) => {
    try {
      fn(event);
    } catch {
      // listener errors must not break SDK flow
    }
  });
}

export function onDebugEvent(listener: DebugEventListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getDebugLog(): readonly DebugEvent[] {
  return eventLog;
}

export function clearDebugLog(): void {
  eventLog.length = 0;
}
