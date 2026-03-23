/**
 * useThreadManager — React hook for thread list management.
 * Handles CRUD operations for threads and agent list loading.
 */

import { useState, useCallback } from 'react';
import type { ThreadSummary } from '../types/agent';
import { jwThreads, jwAgents, createThread } from '../services/dataverse';

interface ThreadManagerState {
  threads: ThreadSummary[];
  activeThreadId: string | null;
  agents: Array<{ id: string; name: string }>;
  loading: boolean;
  error?: string;
}

export function useThreadManager() {
  const [state, setState] = useState<ThreadManagerState>({
    threads: [],
    activeThreadId: null,
    agents: [],
    loading: false,
  });

  /** Load all threads from Dataverse. */
  const loadThreads = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: undefined }));
    try {
      const result = await jwThreads.getAll({
        orderBy: ['modifiedon desc'],
      } as Parameters<typeof jwThreads.getAll>[0]);
      const records = result.data ?? [];
      const threads: ThreadSummary[] = records.map(r => {
        const statusMap: Record<number, ThreadSummary['status']> = {
          100000000: 'Active',
          100000001: 'Completed',
          100000002: 'Cancelled',
        };
        return {
          id: r.jw_threadid,
          title: r.jw_title ?? 'Untitled Thread',
          agentId: r._jw_agentid_value ?? '',
          agentName: r.jw_agentidname,
          parentThreadId: r._jw_parentthreadid_value ?? undefined,
          status: statusMap[r.jw_status as number] ?? 'Active',
          createdOn: r.createdon ?? '',
          modifiedOn: r.modifiedon ?? '',
        };
      });
      setState(prev => ({ ...prev, threads, loading: false }));
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setState(prev => ({ ...prev, loading: false, error: errorMsg }));
    }
  }, []);

  /** Load available agents from Dataverse. */
  const loadAgents = useCallback(async () => {
    try {
      const result = await jwAgents.getAll({
        select: ['jw_agentid', 'jw_name'],
      } as Parameters<typeof jwAgents.getAll>[0]);
      const records = result.data ?? [];
      const agents = records.map(r => ({
        id: r.jw_agentid,
        name: r.jw_name,
      }));
      setState(prev => ({ ...prev, agents }));
    } catch {
      // Non-critical — empty agents list
    }
  }, []);

  /** Create a new thread. */
  const newThread = useCallback(async (agentId: string, title?: string) => {
    setState(prev => ({ ...prev, loading: true }));
    try {
      const result = await createThread({
        agentId,
        title: title ?? `Thread ${new Date().toLocaleString()}`,
      });
      const threadId = result.data?.jw_threadid;
      if (threadId) {
        setState(prev => ({ ...prev, activeThreadId: threadId }));
        await loadThreads();
      }
      return threadId ?? null;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setState(prev => ({ ...prev, loading: false, error: errorMsg }));
      return null;
    }
  }, [loadThreads]);

  /** Select an existing thread. */
  const selectThread = useCallback((threadId: string) => {
    setState(prev => ({ ...prev, activeThreadId: threadId }));
  }, []);

  /** Delete a thread. */
  const deleteThread = useCallback(async (threadId: string) => {
    try {
      await jwThreads.delete(threadId);
      setState(prev => ({
        ...prev,
        threads: prev.threads.filter(t => t.id !== threadId),
        activeThreadId: prev.activeThreadId === threadId ? null : prev.activeThreadId,
      }));
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setState(prev => ({ ...prev, error: errorMsg }));
    }
  }, []);

  return {
    ...state,
    loadThreads,
    loadAgents,
    newThread,
    selectThread,
    deleteThread,
  };
}
