/**
 * SDK Wrapper - Single integration boundary for all Power Platform SDK calls.
 * All Dataverse CRUD and connector operations go through this module.
 * Emits debug events for every operation.
 */

import type { IGetOptions, IGetAllOptions } from '../generated/models/CommonModels';
import type { IOperationResult } from '@microsoft/power-apps/data';
import { emitDebugEvent, generateEventId } from './debugEventBus';

// ─── Dataverse Table Constants ───────────────────────────────────────────────
// Central registry of table names and primary key fields.
// As jw_ entities are added via PAC CLI, register them here.

export const TABLES = {
  systemusers: { name: 'systemusers', primaryKey: 'systemuserid' },
  teams: { name: 'teams', primaryKey: 'teamid' },
  businessunits: { name: 'businessunits', primaryKey: 'businessunitid' },
  jw_agents: { name: 'jw_agents', primaryKey: 'jw_agentid' },
  jw_tools: { name: 'jw_tools', primaryKey: 'jw_toolid' },
  jw_playbooks: { name: 'jw_playbooks', primaryKey: 'jw_playbookid' },
  jw_instructions: { name: 'jw_instructions', primaryKey: 'jw_instructionid' },
  jw_agenttools: { name: 'jw_agenttools', primaryKey: 'jw_agenttoolid' },
  jw_cases: { name: 'jw_cases', primaryKey: 'jw_caseid' },
  jw_artifacts: { name: 'jw_artifacts', primaryKey: 'jw_artifactid' },
  jw_documents: { name: 'jw_documents', primaryKey: 'jw_documentid' },
  jw_threadcases: { name: 'jw_threadcases', primaryKey: 'jw_threadcaseid' },
  jw_threads: { name: 'jw_threads', primaryKey: 'jw_threadid' },
  jw_messages: { name: 'jw_messages', primaryKey: 'jw_messageid' },
  jw_toolexecutions: { name: 'jw_toolexecutions', primaryKey: 'jw_toolexecutionid' },
} as const;

export type TableName = keyof typeof TABLES;

// ─── OData Helpers ───────────────────────────────────────────────────────────

/** Escape a string value for use in OData filter expressions. */
export function escapeOData(value: string): string {
  return value.replace(/'/g, "''");
}

/** Build an @odata.bind path for a lookup field. */
export function lookupBind(tablePluralName: string, id: string): string {
  return `/${tablePluralName}(${id})`;
}

// ─── Traced SDK Wrappers ─────────────────────────────────────────────────────
// These wrap the generated service calls with debug event emission.

export async function tracedOperation<T>(
  operation: string,
  source: 'dataverse' | 'connector',
  input: unknown,
  fn: () => Promise<IOperationResult<T>>
): Promise<IOperationResult<T>> {
  const eventId = generateEventId();
  const startTime = Date.now();

  emitDebugEvent({
    id: eventId,
    timestamp: startTime,
    operation,
    source,
    status: 'pending',
    input,
  });

  try {
    const result = await fn();

    // Dataverse SDK resolves the promise even on failure — check success flag
    const raw = result as unknown as Record<string, unknown>;
    if ('success' in raw && !raw.success) {
      const errMsg = raw.error
        ? JSON.stringify(raw.error)
        : `${operation} returned success: false`;
      emitDebugEvent({
        id: eventId,
        timestamp: startTime,
        operation,
        source,
        status: 'error',
        durationMs: Date.now() - startTime,
        input,
        error: errMsg,
        rawResult: result,
      });
      throw new Error(errMsg);
    }

    emitDebugEvent({
      id: eventId,
      timestamp: startTime,
      operation,
      source,
      status: 'success',
      durationMs: Date.now() - startTime,
      input,
      normalizedResult: result.data,
      rawResult: result,
    });
    return result;
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    emitDebugEvent({
      id: eventId,
      timestamp: startTime,
      operation,
      source,
      status: 'error',
      durationMs: Date.now() - startTime,
      input,
      error: errorMessage,
    });
    throw err;
  }
}

export async function tracedVoidOperation(
  operation: string,
  source: 'dataverse' | 'connector',
  input: unknown,
  fn: () => Promise<void>
): Promise<void> {
  const eventId = generateEventId();
  const startTime = Date.now();

  emitDebugEvent({
    id: eventId,
    timestamp: startTime,
    operation,
    source,
    status: 'pending',
    input,
  });

  try {
    await fn();
    emitDebugEvent({
      id: eventId,
      timestamp: startTime,
      operation,
      source,
      status: 'success',
      durationMs: Date.now() - startTime,
      input,
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    emitDebugEvent({
      id: eventId,
      timestamp: startTime,
      operation,
      source,
      status: 'error',
      durationMs: Date.now() - startTime,
      input,
      error: errorMessage,
    });
    throw err;
  }
}

// Re-export types for convenience
export type { IGetOptions, IGetAllOptions, IOperationResult };
