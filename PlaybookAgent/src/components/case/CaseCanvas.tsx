/**
 * CaseCanvas — Living report view for a case.
 * Shows case metadata, playbook progress, pinned artifacts as cards,
 * case notes, and activity timeline.
 */

import { useMemo } from 'react';
import type { CaseManagerReturn } from '../../hooks/useCaseManager';
import type { WorkspaceTabsReturn } from '../../hooks/useWorkspaceTabs';

interface CaseCanvasProps {
  caseId: string;
  caseManager: CaseManagerReturn;
  tabsManager: WorkspaceTabsReturn;
}

export function CaseCanvas({ caseId, caseManager, tabsManager }: CaseCanvasProps) {
  const { cases, caseThreads, caseArtifacts } = caseManager;

  const caseData = useMemo(() => cases.find(c => c.id === caseId), [cases, caseId]);

  if (!caseData) {
    return (
      <div className="case-canvas case-canvas--empty">
        <p>Case not found</p>
      </div>
    );
  }

  const handleOpenThread = (threadId: string, title: string) => {
    tabsManager.openTab({
      type: 'thread-chat',
      label: title,
      referenceId: threadId,
    });
  };

  const handleOpenArtifact = (artifactId: string, name: string) => {
    tabsManager.openTab({
      type: 'artifact-view',
      label: name,
      referenceId: artifactId,
    });
  };

  const statusColors: Record<string, string> = {
    'Active': 'var(--color-success, #22c55e)',
    'Completed': 'var(--color-primary, #3b82f6)',
    'Cancelled': 'var(--color-text-tertiary, #9ca3af)',
  };

  return (
    <div className="case-canvas">
      {/* Header */}
      <div className="case-canvas__header">
        <div className="case-canvas__title-row">
          <h1 className="case-canvas__title">{caseData.title}</h1>
          <span
            className="case-canvas__status"
            style={{ backgroundColor: statusColors[caseData.status] }}
          >
            {caseData.status}
          </span>
        </div>
        <div className="case-canvas__meta">
          {caseData.playbookName && (
            <span className="case-canvas__meta-item">
              Playbook: {caseData.playbookName}
            </span>
          )}
          <span className="case-canvas__meta-item">
            Created: {new Date(caseData.createdOn).toLocaleDateString()}
          </span>
          <span className="case-canvas__meta-item">
            Modified: {new Date(caseData.modifiedOn).toLocaleDateString()}
          </span>
        </div>
      </div>

      {/* Canvas Grid */}
      <div className="case-canvas__grid">
        {/* Threads Card */}
        <div className="case-canvas__card">
          <h3 className="case-canvas__card-title">Threads ({caseThreads.length})</h3>
          <div className="case-canvas__card-body">
            {caseThreads.map(thread => (
              <button
                key={thread.id}
                className="case-canvas__thread-item"
                onClick={() => handleOpenThread(thread.id, thread.title)}
              >
                <span className={`case-canvas__thread-status case-canvas__thread-status--${thread.status.toLowerCase()}`} />
                <span className="case-canvas__thread-title">{thread.title}</span>
                <span className="case-canvas__thread-agent">{thread.agentName}</span>
              </button>
            ))}
            {caseThreads.length === 0 && (
              <div className="case-canvas__empty">No threads yet</div>
            )}
          </div>
        </div>

        {/* Artifacts Card */}
        <div className="case-canvas__card">
          <h3 className="case-canvas__card-title">Artifacts ({caseArtifacts.length})</h3>
          <div className="case-canvas__card-body">
            {caseArtifacts.map(artifact => (
              <button
                key={artifact.id}
                className="case-canvas__artifact-item"
                onClick={() => handleOpenArtifact(artifact.id, artifact.name)}
              >
                <span className="case-canvas__artifact-icon">
                  {getArtifactIcon(artifact.type)}
                </span>
                <span className="case-canvas__artifact-name">{artifact.name}</span>
                <span className="case-canvas__artifact-type">{artifact.type}</span>
              </button>
            ))}
            {caseArtifacts.length === 0 && (
              <div className="case-canvas__empty">No artifacts yet</div>
            )}
          </div>
        </div>

        {/* Context Data Card */}
        {caseData.contextData && (
          <div className="case-canvas__card case-canvas__card--wide">
            <h3 className="case-canvas__card-title">Context</h3>
            <div className="case-canvas__card-body">
              <pre className="case-canvas__context-data">
                {formatContext(caseData.contextData)}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function getArtifactIcon(type: string): string {
  const icons: Record<string, string> = {
    'Chart': '\u{1F4CA}',
    'Table': '\u{1F4CB}',
    'Document': '\u{1F4C4}',
    'Analysis': '\u{1F4DD}',
    'Query': '\u{1F50D}',
    'Code': '\u{1F4BB}',
    'Image': '\u{1F5BC}\u{FE0F}',
  };
  return icons[type] ?? '\u{1F4E6}';
}

function formatContext(data: string): string {
  try {
    return JSON.stringify(JSON.parse(data), null, 2);
  } catch {
    return data;
  }
}
