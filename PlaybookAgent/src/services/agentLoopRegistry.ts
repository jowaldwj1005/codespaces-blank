/**
 * Agent Loop Registry — Global singleton tracking running agent loops.
 * Follows the same pattern as debugEventBus.ts.
 *
 * Enables:
 * - Chat sessions persisting across tab switches (unmount doesn't kill loop)
 * - Tab notification badges when background agent completes
 * - Multiple concurrent loops for different threads
 */

export interface AgentLoopEntry {
  threadId: string;
  status: 'running' | 'awaiting_approval' | 'completed' | 'error';
  startedAt: number;
  completedAt?: number;
  completionMessage?: string;
  error?: string;
  abortController: AbortController;
  /** Whether the completion has been acknowledged by the UI */
  acknowledged: boolean;
}

type LoopChangeListener = (threadId: string, entry: AgentLoopEntry) => void;

// ─── Module-level state ──────────────────────────────────────────────────────

const registry = new Map<string, AgentLoopEntry>();
const listeners = new Set<LoopChangeListener>();

// ─── Registry API ────────────────────────────────────────────────────────────

/** Register a new running agent loop for a thread. */
export function registerLoop(threadId: string, abortController: AbortController): void {
  const entry: AgentLoopEntry = {
    threadId,
    status: 'running',
    startedAt: Date.now(),
    abortController,
    acknowledged: false,
  };
  registry.set(threadId, entry);
  notify(threadId, entry);
}

/** Update an existing loop entry (e.g., status change). */
export function updateLoop(threadId: string, update: Partial<Omit<AgentLoopEntry, 'threadId' | 'abortController'>>): void {
  const existing = registry.get(threadId);
  if (!existing) return;
  const updated = { ...existing, ...update };
  registry.set(threadId, updated);
  notify(threadId, updated);
}

/** Get the current loop entry for a thread. */
export function getLoop(threadId: string): AgentLoopEntry | undefined {
  return registry.get(threadId);
}

/** Get all active (non-acknowledged) loop entries. */
export function getActiveLoops(): AgentLoopEntry[] {
  return Array.from(registry.values()).filter(e => !e.acknowledged);
}

/** Mark a loop as acknowledged (user has seen the result). */
export function acknowledgeLoop(threadId: string): void {
  const existing = registry.get(threadId);
  if (existing) {
    const updated = { ...existing, acknowledged: true };
    registry.set(threadId, updated);
    notify(threadId, updated);
  }
}

/** Clear a loop entry entirely. */
export function clearLoop(threadId: string): void {
  registry.delete(threadId);
}

/** Subscribe to loop changes. Returns unsubscribe function. */
export function onLoopChange(listener: LoopChangeListener): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

// ─── Internal ────────────────────────────────────────────────────────────────

function notify(threadId: string, entry: AgentLoopEntry): void {
  listeners.forEach(fn => {
    try { fn(threadId, entry); } catch { /* listener errors must not propagate */ }
  });
}
