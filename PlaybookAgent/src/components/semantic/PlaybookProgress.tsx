/**
 * PlaybookProgress — Inline chat component showing playbook instruction checklist.
 * Renders inside the message area when a playbook is active on the thread's case.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { jwThreadCases, jwCases, jwPlaybooks, jwInstructions } from '../../services/dataverse';

interface PlaybookProgressProps {
  threadId: string;
}

interface ProgressState {
  playbookName: string;
  caseTitle: string;
  caseStatus: number;
  instructions: { id: string; name: string; type: string; completed: boolean }[];
}

export function PlaybookProgress({ threadId }: PlaybookProgressProps) {
  const [state, setState] = useState<ProgressState | null>(null);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState(false);

  const load = useCallback(async () => {
    try {
      // Find case linked to this thread
      const tcResult = await jwThreadCases.getAll({
        filter: `_jw_threadid_value eq '${threadId}'`,
        top: 1,
      });
      if (!tcResult.data || tcResult.data.length === 0) {
        setState(null);
        return;
      }

      const tc = tcResult.data[0] as unknown as Record<string, unknown>;
      const caseId = tc._jw_caseid_value as string;
      if (!caseId) { setState(null); return; }

      // Load case
      const caseResult = await jwCases.get(caseId);
      if (!caseResult.data) { setState(null); return; }

      const c = caseResult.data as unknown as Record<string, unknown>;
      const playbookId = c._jw_playbookid_value as string | null;
      if (!playbookId) { setState(null); return; }

      // Load playbook
      const pbResult = await jwPlaybooks.get(playbookId);
      const pb = pbResult.data as unknown as Record<string, unknown> | undefined;

      // Load instructions
      const instrResult = await jwInstructions.getAll({
        filter: `_jw_playbookid_value eq '${playbookId}'`,
        orderBy: ['createdon asc'],
      });

      // Parse completion from case context
      let completedIds: string[] = [];
      try {
        const ctx = JSON.parse((c.jw_contextdata ?? '{}') as string);
        completedIds = ctx.completedInstructions ?? [];
      } catch { /* ignore */ }

      const instrRecords = (instrResult.data ?? []) as unknown as Record<string, unknown>[];

      setState({
        playbookName: (pb?.jw_name ?? 'Playbook') as string,
        caseTitle: (c.jw_title ?? '') as string,
        caseStatus: (c.jw_status ?? 100000000) as number,
        instructions: instrRecords.map(i => ({
          id: i.jw_instructionid as string,
          name: (i.jw_name ?? 'Step') as string,
          type: (i.jw_type ?? '') as string,
          completed: completedIds.includes(i.jw_instructionid as string),
        })),
      });
    } catch (err) {
      console.error('PlaybookProgress load error:', err);
      setState(null);
    } finally {
      setLoading(false);
    }
  }, [threadId]);

  useEffect(() => { load(); }, [load]);

  // Refresh every 8s while active
  useEffect(() => {
    if (!state || state.caseStatus !== 100000000) return; // Only refresh active cases
    const interval = setInterval(load, 8000);
    return () => clearInterval(interval);
  }, [state, load]);

  const { completedCount, totalCount, percent } = useMemo(() => {
    if (!state) return { completedCount: 0, totalCount: 0, percent: 0 };
    const completed = state.instructions.filter(i => i.completed).length;
    return {
      completedCount: completed,
      totalCount: state.instructions.length,
      percent: state.instructions.length > 0
        ? Math.round((completed / state.instructions.length) * 100)
        : 0,
    };
  }, [state]);

  if (loading || !state) return null;

  const isComplete = state.caseStatus === 100000001;

  return (
    <div className={`playbook-progress ${isComplete ? 'playbook-progress--complete' : ''}`}>
      <button
        className="playbook-progress__header"
        onClick={() => setCollapsed(!collapsed)}
      >
        <div className="playbook-progress__header-left">
          <span className="playbook-progress__icon">
            {isComplete ? '✓' : '▶'}
          </span>
          <span className="playbook-progress__title">{state.playbookName}</span>
        </div>
        <div className="playbook-progress__header-right">
          <span className="playbook-progress__counter">
            {completedCount}/{totalCount}
          </span>
          <span className="playbook-progress__chevron">
            {collapsed ? '▶' : '▼'}
          </span>
        </div>
      </button>

      {/* Mini progress bar always visible */}
      <div className="playbook-progress__bar">
        <div
          className="playbook-progress__bar-fill"
          style={{ width: `${percent}%` }}
        />
      </div>

      {!collapsed && (
        <div className="playbook-progress__steps">
          {state.instructions.map((instr, idx) => (
            <div
              key={instr.id}
              className={`playbook-progress__step ${instr.completed ? 'playbook-progress__step--done' : ''}`}
            >
              <span className="playbook-progress__step-number">{idx + 1}</span>
              <span className="playbook-progress__step-check">
                {instr.completed ? '✓' : '○'}
              </span>
              <span className="playbook-progress__step-name">{instr.name}</span>
              {instr.type && (
                <span className="playbook-progress__step-type">{instr.type}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
