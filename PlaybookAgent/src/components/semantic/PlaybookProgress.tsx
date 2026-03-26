/**
 * PlaybookProgress — Inline playbook instruction checklist.
 * Used in ChatWorkspace (pass threadId) and CaseCanvas (pass caseId directly).
 * When onCompleteInstruction is provided, steps become interactive checkboxes.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { jwThreadCases, jwCases, jwPlaybooks, jwInstructions } from '../../services/dataverse';

interface PlaybookProgressProps {
  /** Pass either threadId (chat view) or caseId (CaseCanvas) */
  threadId?: string;
  caseId?: string;
  /** When provided, incomplete steps are clickable to mark done */
  onCompleteInstruction?: (instructionId: string, caseId: string) => Promise<void>;
}

interface ProgressState {
  caseId: string;
  playbookName: string;
  caseTitle: string;
  caseStatus: string;
  instructions: { id: string; name: string; type: string; completed: boolean }[];
}

export function PlaybookProgress({ threadId, caseId: propCaseId, onCompleteInstruction }: PlaybookProgressProps) {
  const [state, setState] = useState<ProgressState | null>(null);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState(false);
  const [completing, setCompleting] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      let resolvedCaseId: string | null = null;

      if (propCaseId) {
        resolvedCaseId = propCaseId;
      } else if (threadId) {
        const tcResult = await jwThreadCases.getAll({
          filter: `_jw_threadid_value eq '${threadId}'`,
          top: 1,
        });
        if (!tcResult.data || tcResult.data.length === 0) { setState(null); return; }
        const tc = tcResult.data[0] as unknown as Record<string, unknown>;
        resolvedCaseId = (tc._jw_caseid_value as string) ?? null;
      }

      if (!resolvedCaseId) { setState(null); return; }

      const caseResult = await jwCases.get(resolvedCaseId);
      if (!caseResult.data) { setState(null); return; }

      const c = caseResult.data as unknown as Record<string, unknown>;
      const playbookId = c._jw_playbookid_value as string | null;
      if (!playbookId) { setState(null); return; }

      const pbResult = await jwPlaybooks.get(playbookId);
      const pb = pbResult.data as unknown as Record<string, unknown> | undefined;

      const instrResult = await jwInstructions.getAll({
        filter: `_jw_playbookid_value eq '${playbookId}'`,
        orderBy: ['createdon asc'],
      });

      let completedIds: string[] = [];
      try {
        const ctx = JSON.parse((c.jw_contextdata ?? '{}') as string);
        completedIds = ctx.completedInstructions ?? [];
      } catch { /* ignore */ }

      const instrRecords = (instrResult.data ?? []) as unknown as Record<string, unknown>[];

      setState({
        caseId: resolvedCaseId,
        playbookName: (pb?.jw_name ?? 'Playbook') as string,
        caseTitle: (c.jw_title ?? '') as string,
        caseStatus: String(c.jw_status ?? '100000000'),
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
  }, [threadId, propCaseId]);

  useEffect(() => { load(); }, [load]);

  // Auto-refresh every 8s while case is active (only in read-only/chat mode)
  useEffect(() => {
    if (!state || state.caseStatus !== '100000000') return;
    if (onCompleteInstruction) return; // CaseCanvas manages its own refresh
    const interval = setInterval(load, 8000);
    return () => clearInterval(interval);
  }, [state, load, onCompleteInstruction]);

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

  const handleStepClick = async (instrId: string) => {
    if (!onCompleteInstruction || !state || completing) return;
    setCompleting(instrId);
    try {
      await onCompleteInstruction(instrId, state.caseId);
      await load();
    } finally {
      setCompleting(null);
    }
  };

  if (loading || !state) return null;

  const isComplete = state.caseStatus === '100000001';
  const interactive = !!onCompleteInstruction;

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
          {state.instructions.map((instr, idx) => {
            const isCompleting = completing === instr.id;
            const clickable = interactive && !instr.completed && !completing;
            return (
              <div
                key={instr.id}
                className={[
                  'playbook-progress__step',
                  instr.completed ? 'playbook-progress__step--done' : '',
                  clickable ? 'playbook-progress__step--clickable' : '',
                  isCompleting ? 'playbook-progress__step--completing' : '',
                ].join(' ')}
                onClick={clickable ? () => handleStepClick(instr.id) : undefined}
                title={clickable ? 'Click to mark as complete' : undefined}
              >
                <span className="playbook-progress__step-number">{idx + 1}</span>
                <span className="playbook-progress__step-check">
                  {isCompleting ? '…' : instr.completed ? '✓' : interactive ? '☐' : '○'}
                </span>
                <span className="playbook-progress__step-name">{instr.name}</span>
                {instr.type && (
                  <span className="playbook-progress__step-type">{instr.type}</span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
