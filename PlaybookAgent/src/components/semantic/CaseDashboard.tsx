/**
 * CaseDashboard — Right panel showing case lifecycle, playbook progress,
 * linked artifacts, and context data for the active case.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { jwCases, jwArtifacts, jwThreadCases, jwPlaybooks, jwInstructions } from '../../services/dataverse';
import { getArtifactTypeColor } from './SemanticRenderer';
// Dataverse model types used via `as unknown as Record<string, unknown>` pattern

interface CaseDashboardProps {
  threadId: string | null;
  caseId?: string | null;
  onOpenArtifact?: (artifactId: string) => void;
}

interface CaseData {
  id: string;
  title: string;
  status: string;
  contextData: Record<string, unknown> | null;
  playbookId: string | null;
  createdOn: string;
  modifiedOn: string;
}

interface PlaybookData {
  id: string;
  name: string;
  description: string;
}

interface InstructionProgress {
  id: string;
  name: string;
  type: string;
  completed: boolean;
}

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  '100000000': { label: 'Active', color: '#059669', bg: '#ecfdf5' },
  '100000001': { label: 'Completed', color: '#6366f1', bg: '#eef2ff' },
  '100000002': { label: 'Cancelled', color: '#dc2626', bg: '#fef2f2' },
};

export function CaseDashboard({ threadId, caseId: propCaseId, onOpenArtifact }: CaseDashboardProps) {
  const [caseData, setCaseData] = useState<CaseData | null>(null);
  const [playbook, setPlaybook] = useState<PlaybookData | null>(null);
  const [instructions, setInstructions] = useState<InstructionProgress[]>([]);
  const [artifacts, setArtifacts] = useState<{ id: string; name: string; type: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [contextExpanded, setContextExpanded] = useState(false);
  const [activeCaseId, setActiveCaseId] = useState<string | null>(propCaseId ?? null);

  // Discover case from thread if not provided
  const discoverCase = useCallback(async () => {
    if (propCaseId) {
      setActiveCaseId(propCaseId);
      return;
    }
    if (!threadId) return;

    try {
      const tcResult = await jwThreadCases.getAll({
        filter: `_jw_threadid_value eq '${threadId}'`,
        top: 1,
      });
      if (tcResult.data && tcResult.data.length > 0) {
        const tc = tcResult.data[0] as unknown as Record<string, unknown>;
        setActiveCaseId(tc._jw_caseid_value as string);
      }
    } catch (err) {
      console.error('Failed to discover case:', err);
    }
  }, [threadId, propCaseId]);

  // Load case data
  const loadCase = useCallback(async () => {
    if (!activeCaseId) return;
    setLoading(true);

    try {
      // Load case
      const caseResult = await jwCases.get(activeCaseId);
      if (caseResult.data) {
        const c = caseResult.data as unknown as Record<string, unknown>;
        let contextData: Record<string, unknown> | null = null;
        try {
          contextData = c.jw_contextdata ? JSON.parse(c.jw_contextdata as string) : null;
        } catch { /* ignore */ }

        const cData: CaseData = {
          id: c.jw_caseid as string,
          title: (c.jw_title ?? 'Untitled Case') as string,
          status: String(c.jw_status ?? '100000000'),
          contextData,
          playbookId: c._jw_playbookid_value as string | null,
          createdOn: c.createdon as string,
          modifiedOn: c.modifiedon as string,
        };
        setCaseData(cData);

        // Load playbook if linked
        if (cData.playbookId) {
          const pbResult = await jwPlaybooks.get(cData.playbookId);
          if (pbResult.data) {
            const pb = pbResult.data as unknown as Record<string, unknown>;
            setPlaybook({
              id: pb.jw_playbookid as string,
              name: (pb.jw_name ?? '') as string,
              description: (pb.jw_description ?? '') as string,
            });
          }

          // Load instructions for this playbook
          const instrResult = await jwInstructions.getAll({
            filter: `_jw_playbookid_value eq '${cData.playbookId}'`,
            orderBy: ['createdon asc'],
          });
          if (instrResult.data) {
            const instrRecords = instrResult.data as unknown as Record<string, unknown>[];
            // Check completion status from case contextData
            const completedInstructions = (cData.contextData?.completedInstructions ?? []) as string[];

            setInstructions(instrRecords.map(instr => ({
              id: instr.jw_instructionid as string,
              name: (instr.jw_name ?? 'Instruction') as string,
              type: (instr.jw_type ?? '') as string,
              completed: completedInstructions.includes(instr.jw_instructionid as string),
            })));
          }
        }

        // Load artifacts for this case
        const artResult = await jwArtifacts.getAll({
          filter: `_jw_caseid_value eq '${activeCaseId}'`,
          orderBy: ['modifiedon desc'],
        });
        if (artResult.data) {
          setArtifacts((artResult.data as unknown as Record<string, unknown>[]).map(a => ({
            id: a.jw_artifactid as string,
            name: (a.jw_name ?? 'Untitled') as string,
            type: (a.jw_type ?? 'JSON') as string,
          })));
        }
      }
    } catch (err) {
      console.error('Failed to load case:', err);
    } finally {
      setLoading(false);
    }
  }, [activeCaseId]);

  useEffect(() => { discoverCase(); }, [discoverCase]);
  useEffect(() => { loadCase(); }, [loadCase]);

  // Auto-refresh every 10s
  useEffect(() => {
    if (!activeCaseId) return;
    const interval = setInterval(loadCase, 10000);
    return () => clearInterval(interval);
  }, [activeCaseId, loadCase]);

  // Playbook progress percentage
  const progressPercent = useMemo(() => {
    if (instructions.length === 0) return 0;
    return Math.round((instructions.filter(i => i.completed).length / instructions.length) * 100);
  }, [instructions]);

  if (!threadId) {
    return (
      <div className="case-dashboard__empty">
        Select a thread to see case details
      </div>
    );
  }

  if (loading && !caseData) {
    return (
      <div className="case-dashboard__empty">
        Loading case...
      </div>
    );
  }

  if (!caseData) {
    return (
      <div className="case-dashboard__empty">
        <div className="case-dashboard__empty-icon">No active case</div>
        <div className="case-dashboard__empty-text">
          Start a playbook or create a case to see details here
        </div>
      </div>
    );
  }

  const statusInfo = STATUS_MAP[String(caseData.status)] ?? STATUS_MAP['100000000'];

  return (
    <div className="case-dashboard">
      {/* Case header */}
      <div className="case-dashboard__header">
        <h3 className="case-dashboard__title">{caseData.title}</h3>
        <span
          className="case-dashboard__status-badge"
          style={{ background: statusInfo.bg, color: statusInfo.color }}
        >
          {statusInfo.label}
        </span>
      </div>

      {/* Playbook progress */}
      {playbook && (
        <div className="case-dashboard__section">
          <div className="case-dashboard__section-header">
            <span className="case-dashboard__section-title">Playbook</span>
            <span className="case-dashboard__section-subtitle">{playbook.name}</span>
          </div>

          {/* Progress bar */}
          <div className="case-dashboard__progress">
            <div className="case-dashboard__progress-bar">
              <div
                className="case-dashboard__progress-fill"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className="case-dashboard__progress-label">
              {instructions.filter(i => i.completed).length}/{instructions.length} steps ({progressPercent}%)
            </span>
          </div>

          {/* Instruction checklist */}
          <div className="case-dashboard__checklist">
            {instructions.map(instr => (
              <div
                key={instr.id}
                className={`case-dashboard__check-item ${instr.completed ? 'case-dashboard__check-item--done' : ''}`}
              >
                <span className="case-dashboard__check-icon">
                  {instr.completed ? '✓' : '○'}
                </span>
                <span className="case-dashboard__check-label">{instr.name}</span>
                {instr.type && (
                  <span className="case-dashboard__check-type">{instr.type}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Linked artifacts */}
      <div className="case-dashboard__section">
        <div className="case-dashboard__section-header">
          <span className="case-dashboard__section-title">Artifacts</span>
          <span className="case-dashboard__section-count">{artifacts.length}</span>
        </div>
        {artifacts.length === 0 ? (
          <div className="case-dashboard__empty-section">No artifacts yet</div>
        ) : (
          <div className="case-dashboard__artifact-list">
            {artifacts.map(art => {
              const typeColor = getArtifactTypeColor(art.type);
              return (
                <button
                  key={art.id}
                  className="case-dashboard__artifact-item"
                  onClick={() => onOpenArtifact?.(art.id)}
                >
                  <span
                    className="artifact-type-badge artifact-type-badge--sm"
                    style={{ background: typeColor.bg, color: typeColor.text, borderColor: typeColor.border }}
                  >
                    {art.type}
                  </span>
                  <span className="case-dashboard__artifact-name">{art.name}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Context data */}
      {caseData.contextData && (
        <div className="case-dashboard__section">
          <button
            className="case-dashboard__section-header case-dashboard__section-header--clickable"
            onClick={() => setContextExpanded(!contextExpanded)}
          >
            <span className="case-dashboard__section-title">Context Data</span>
            <span>{contextExpanded ? '▼' : '▶'}</span>
          </button>
          {contextExpanded && (
            <pre className="case-dashboard__context-json">
              {JSON.stringify(caseData.contextData, null, 2)}
            </pre>
          )}
        </div>
      )}

      {/* Metadata */}
      <div className="case-dashboard__meta">
        <div className="case-dashboard__meta-item">
          <span className="case-dashboard__meta-label">Created</span>
          <span className="case-dashboard__meta-value">
            {new Date(caseData.createdOn).toLocaleString()}
          </span>
        </div>
        <div className="case-dashboard__meta-item">
          <span className="case-dashboard__meta-label">Modified</span>
          <span className="case-dashboard__meta-value">
            {new Date(caseData.modifiedOn).toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
}
