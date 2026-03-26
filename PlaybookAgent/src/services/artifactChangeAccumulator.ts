/**
 * Artifact Change Accumulator — Tracks user edits to artifacts.
 * Before the next user message is sent, accumulated changes are prepended
 * as compact summaries so the agent knows what was modified.
 *
 * Only tracks changes for interactive artifact types (Tables, SAP_Order, Forms).
 * Does NOT include full payloads to avoid context window bloat.
 */

export interface ArtifactChange {
  artifactId: string;
  artifactName?: string;
  artifactType: string;
  description: string;
  timestamp: number;
}

// ─── Module-level state ──────────────────────────────────────────────────────

const pendingChanges: Map<string, ArtifactChange[]> = new Map();

const INTERACTIVE_TYPES = new Set(['Table', 'SAP_Order', 'Form', 'Invoice']);

// ─── API ─────────────────────────────────────────────────────────────────────

/** Record an artifact change. Only tracked for interactive types. */
export function recordChange(
  artifactId: string,
  artifactType: string,
  description: string,
  artifactName?: string,
): void {
  if (!INTERACTIVE_TYPES.has(artifactType)) return;

  const changes = pendingChanges.get(artifactId) ?? [];
  changes.push({
    artifactId,
    artifactName,
    artifactType,
    description,
    timestamp: Date.now(),
  });
  // Keep only last 10 changes per artifact to prevent accumulation
  if (changes.length > 10) {
    changes.splice(0, changes.length - 10);
  }
  pendingChanges.set(artifactId, changes);
}

/** Get and clear all pending changes, formatted as a compact summary string. */
export function drainChangeSummary(): string | null {
  if (pendingChanges.size === 0) return null;

  const lines: string[] = [];
  for (const [, changes] of pendingChanges) {
    if (changes.length === 0) continue;
    const name = changes[0].artifactName || changes[0].artifactId;
    const type = changes[0].artifactType;
    lines.push(`[Artifact Update: ${type} "${name}"] ${changes.length} edit(s):`);
    for (const c of changes) {
      lines.push(`  - ${c.description}`);
    }
  }

  pendingChanges.clear();

  return lines.length > 0 ? lines.join('\n') : null;
}

/** Check if there are any pending changes. */
export function hasPendingChanges(): boolean {
  return pendingChanges.size > 0;
}
