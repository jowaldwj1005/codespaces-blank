/**
 * useCaseManager — React hook for case-centric navigation.
 * Loads cases, threads per case, artifacts, and manages selection state.
 * This replaces the thread-first navigation with case-first.
 */

import { useState, useCallback } from 'react';
import {
  jwCases, jwThreads, jwThreadCases, jwArtifacts, jwAgents,
  createThread,
} from '../services/dataverse';
import { lookupBind } from '../services/sdk';
import type { ThreadSummary } from '../types/agent';
import type { Jw_threadcasesBase } from '../generated/models/Jw_threadcasesModel';

// ─── Types ──────────────────────────────────────────────────────────────────

export type CaseStatus = 'Active' | 'Completed' | 'Cancelled';

export interface CaseSummary {
  id: string;
  title: string;
  status: CaseStatus;
  playbookId?: string;
  playbookName?: string;
  contextData?: string;
  artifactCount: number;
  threadCount: number;
  createdOn: string;
  modifiedOn: string;
}

export interface ArtifactSummary {
  id: string;
  name: string;
  type: string;
  caseId?: string;
  payload?: string;
  referenceKey?: string;
  createdOn: string;
}

interface CaseManagerState {
  cases: CaseSummary[];
  selectedCaseId: string | null;
  caseThreads: ThreadSummary[];
  caseArtifacts: ArtifactSummary[];
  agents: Array<{ id: string; name: string }>;
  loading: boolean;
  error?: string;
}

const STATUS_MAP: Record<string, CaseStatus> = {
  '100000000': 'Active',
  '100000001': 'Completed',
  '100000002': 'Cancelled',
};

const THREAD_STATUS_MAP: Record<string, ThreadSummary['status']> = {
  '100000000': 'Active',
  '100000001': 'Completed',
  '100000002': 'Cancelled',
};

export function useCaseManager() {
  const [state, setState] = useState<CaseManagerState>({
    cases: [],
    selectedCaseId: null,
    caseThreads: [],
    caseArtifacts: [],
    agents: [],
    loading: false,
  });

  // ─── Load all cases ────────────────────────────────────────────────────────

  const loadCases = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: undefined }));
    try {
      const result = await jwCases.getAll({
        orderBy: ['modifiedon desc'],
      } as Parameters<typeof jwCases.getAll>[0]);
      const records = result.data ?? [];

      const cases: CaseSummary[] = records.map(r => ({
        id: r.jw_caseid,
        title: r.jw_title ?? 'Untitled Case',
        status: STATUS_MAP[String(r.jw_status)] ?? 'Active',
        playbookId: r._jw_playbookid_value ?? undefined,
        playbookName: r.jw_playbookidname ?? undefined,
        contextData: r.jw_contextdata ?? undefined,
        artifactCount: 0, // Will be enriched later
        threadCount: 0,
        createdOn: r.createdon ?? '',
        modifiedOn: r.modifiedon ?? '',
      }));

      setState(prev => ({ ...prev, cases, loading: false }));
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setState(prev => ({ ...prev, loading: false, error: errorMsg }));
    }
  }, []);

  // ─── Load agents ───────────────────────────────────────────────────────────

  const loadAgents = useCallback(async () => {
    try {
      const result = await jwAgents.getAll({
        select: ['jw_agentid', 'jw_name'],
      } as Parameters<typeof jwAgents.getAll>[0]);
      const records = result.data ?? [];
      const agents = records.map(r => ({ id: r.jw_agentid, name: r.jw_name }));
      setState(prev => ({ ...prev, agents }));
    } catch {
      // Non-critical
    }
  }, []);

  // ─── Select a case → load its threads + artifacts ─────────────────────────

  const selectCase = useCallback(async (caseId: string | null) => {
    setState(prev => ({ ...prev, selectedCaseId: caseId, caseThreads: [], caseArtifacts: [] }));
    if (!caseId) return;

    try {
      // Load thread-case junctions for this case
      const tcResult = await jwThreadCases.getAll({
        filter: `_jw_caseid_value eq '${caseId}'`,
      } as Parameters<typeof jwThreadCases.getAll>[0]);
      const junctions = tcResult.data ?? [];
      const threadIds = junctions.map(j => j._jw_threadid_value).filter(Boolean) as string[];

      // Load threads for those IDs
      let threads: ThreadSummary[] = [];
      if (threadIds.length > 0) {
        const threadFilter = threadIds.map(id => `jw_threadid eq '${id}'`).join(' or ');
        const tResult = await jwThreads.getAll({
          filter: threadFilter,
          orderBy: ['modifiedon desc'],
        } as Parameters<typeof jwThreads.getAll>[0]);
        threads = (tResult.data ?? []).map(r => ({
          id: r.jw_threadid,
          title: r.jw_title ?? 'Untitled Thread',
          agentId: r._jw_agentid_value ?? '',
          agentName: r.jw_agentidname,
          parentThreadId: r._jw_parentthreadid_value ?? undefined,
          status: THREAD_STATUS_MAP[String(r.jw_status)] ?? 'Active',
          createdOn: r.createdon ?? '',
          modifiedOn: r.modifiedon ?? '',
        }));
      }

      // Load artifacts for this case
      const aResult = await jwArtifacts.getAll({
        filter: `_jw_caseid_value eq '${caseId}'`,
        orderBy: ['createdon desc'],
      } as Parameters<typeof jwArtifacts.getAll>[0]);
      const artifacts: ArtifactSummary[] = (aResult.data ?? []).map(r => ({
        id: r.jw_artifactid,
        name: r.jw_name ?? 'Untitled',
        type: r.jw_type ?? 'Unknown',
        caseId: r._jw_caseid_value ?? undefined,
        payload: r.jw_payload ?? undefined,
        referenceKey: r.jw_referencekey ?? undefined,
        createdOn: r.createdon ?? '',
      }));

      setState(prev => ({
        ...prev,
        caseThreads: threads,
        caseArtifacts: artifacts,
      }));
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setState(prev => ({ ...prev, error: errorMsg }));
    }
  }, []);

  // ─── Create a new case with auto-created first thread ─────────────────────

  const createCase = useCallback(async (opts: {
    title: string;
    agentId: string;
    playbookId?: string;
  }) => {
    setState(prev => ({ ...prev, loading: true }));
    try {
      // Create the case
      const caseRecord: Record<string, unknown> = {
        jw_title: opts.title,
        jw_status: '100000000', // Active
      };
      if (opts.playbookId) {
        caseRecord['jw_playbookid@odata.bind'] = lookupBind('jw_playbooks', opts.playbookId);
      }
      const caseResult = await jwCases.create(
        caseRecord as unknown as Parameters<typeof jwCases.create>[0]
      );
      const caseId = caseResult.data?.jw_caseid;
      if (!caseId) throw new Error('Failed to create case');

      // Create a first thread for this case
      const threadResult = await createThread({
        agentId: opts.agentId,
        title: `${opts.title} - Thread 1`,
      });
      const threadId = threadResult.data?.jw_threadid;

      // Link thread to case via junction
      if (threadId) {
        const junctionRecord: Record<string, unknown> = {
          'jw_caseid@odata.bind': lookupBind('jw_cases', caseId),
          'jw_threadid@odata.bind': lookupBind('jw_threads', threadId),
          jw_name: `${opts.title} - Thread 1`,
        };
        await jwThreadCases.create(
          junctionRecord as unknown as Omit<Jw_threadcasesBase, 'jw_threadcaseid'>
        );
      }

      // Refresh and select the new case
      await loadCases();
      await selectCase(caseId);

      setState(prev => ({ ...prev, loading: false }));
      return { caseId, threadId: threadId ?? null };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setState(prev => ({ ...prev, loading: false, error: errorMsg }));
      return null;
    }
  }, [loadCases, selectCase]);

  // ─── Add a new thread to selected case ────────────────────────────────────

  const addThreadToCase = useCallback(async (agentId: string, title?: string) => {
    const caseId = state.selectedCaseId;
    if (!caseId) return null;

    try {
      const caseName = state.cases.find(c => c.id === caseId)?.title ?? 'Case';
      const threadTitle = title ?? `${caseName} - Thread ${state.caseThreads.length + 1}`;

      const threadResult = await createThread({ agentId, title: threadTitle });
      const threadId = threadResult.data?.jw_threadid;

      if (threadId) {
        const junctionRecord: Record<string, unknown> = {
          'jw_caseid@odata.bind': lookupBind('jw_cases', caseId),
          'jw_threadid@odata.bind': lookupBind('jw_threads', threadId),
          jw_name: threadTitle,
        };
        await jwThreadCases.create(
          junctionRecord as unknown as Omit<Jw_threadcasesBase, 'jw_threadcaseid'>
        );

        // Refresh threads for current case
        await selectCase(caseId);
      }

      return threadId ?? null;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setState(prev => ({ ...prev, error: errorMsg }));
      return null;
    }
  }, [state.selectedCaseId, state.cases, state.caseThreads.length, selectCase]);

  // ─── Update case status ───────────────────────────────────────────────────

  const updateCaseStatus = useCallback(async (caseId: string, status: CaseStatus) => {
    const statusMap: Record<CaseStatus, string> = {
      'Active': '100000000',
      'Completed': '100000001',
      'Cancelled': '100000002',
    };
    try {
      await jwCases.update(caseId, {
        jw_status: statusMap[status],
      } as Parameters<typeof jwCases.update>[1]);
      await loadCases();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setState(prev => ({ ...prev, error: errorMsg }));
    }
  }, [loadCases]);

  return {
    ...state,
    loadCases,
    loadAgents,
    selectCase,
    createCase,
    addThreadToCase,
    updateCaseStatus,
  };
}

export type CaseManagerReturn = ReturnType<typeof useCaseManager>;
