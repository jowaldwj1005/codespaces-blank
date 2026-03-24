/**
 * ArtifactBrowser — Right panel showing all artifacts for the active case/thread.
 * Renders each artifact using SemanticRenderer. New artifacts appear in real-time.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { SemanticRenderer, getArtifactTypeColor } from './SemanticRenderer';
import type { ArtifactData } from './SemanticRenderer';
import { jwArtifacts, jwThreadCases } from '../../services/dataverse';
import type { Jw_artifacts } from '../../generated/models/Jw_artifactsModel';

interface ArtifactBrowserProps {
  threadId: string | null;
  caseId?: string | null;
}

export function ArtifactBrowser({ threadId, caseId }: ArtifactBrowserProps) {
  const [artifacts, setArtifacts] = useState<ArtifactData[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string | null>(null);

  // Load artifacts for the active case, or discover case from thread
  const loadArtifacts = useCallback(async () => {
    setLoading(true);
    try {
      let targetCaseId = caseId;

      // If no caseId provided, try to find cases linked to this thread
      if (!targetCaseId && threadId) {
        const tcResult = await jwThreadCases.getAll({
          filter: `_jw_threadid_value eq '${threadId}'`,
          top: 1,
        });
        if (tcResult.data && tcResult.data.length > 0) {
          const tc = tcResult.data[0] as unknown as Record<string, unknown>;
          targetCaseId = tc._jw_caseid_value as string;
        }
      }

      if (targetCaseId) {
        // Load artifacts for this case
        const result = await jwArtifacts.getAll({
          filter: `_jw_caseid_value eq '${targetCaseId}'`,
          orderBy: ['modifiedon desc'],
        });
        if (result.data) {
          setArtifacts(mapArtifacts(result.data as Jw_artifacts[]));
        }
      } else {
        // No case context — load all recent artifacts
        const result = await jwArtifacts.getAll({
          orderBy: ['modifiedon desc'],
          top: 20,
        });
        if (result.data) {
          setArtifacts(mapArtifacts(result.data as Jw_artifacts[]));
        }
      }
    } catch (err) {
      console.error('Failed to load artifacts:', err);
    } finally {
      setLoading(false);
    }
  }, [threadId, caseId]);

  useEffect(() => {
    loadArtifacts();
  }, [loadArtifacts]);

  // Auto-refresh every 10s for live updates
  useEffect(() => {
    const interval = setInterval(loadArtifacts, 10000);
    return () => clearInterval(interval);
  }, [loadArtifacts]);

  // Unique types for filtering
  const uniqueTypes = useMemo(() => {
    const types = new Set(artifacts.map(a => a.type));
    return Array.from(types).sort();
  }, [artifacts]);

  const filteredArtifacts = filterType
    ? artifacts.filter(a => a.type === filterType)
    : artifacts;

  if (!threadId) {
    return (
      <div className="artifact-browser__empty">
        Select a thread to see artifacts
      </div>
    );
  }

  return (
    <div className="artifact-browser">
      {/* Header controls */}
      <div className="artifact-browser__controls">
        <button
          className="artifact-browser__refresh"
          onClick={loadArtifacts}
          disabled={loading}
        >
          {loading ? 'Loading...' : 'Refresh'}
        </button>
        <span className="artifact-browser__count">
          {artifacts.length} artifact{artifacts.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Type filter chips */}
      {uniqueTypes.length > 1 && (
        <div className="artifact-browser__filters">
          <button
            className={`artifact-browser__filter-chip ${!filterType ? 'artifact-browser__filter-chip--active' : ''}`}
            onClick={() => setFilterType(null)}
          >
            All
          </button>
          {uniqueTypes.map(type => {
            const color = getArtifactTypeColor(type);
            return (
              <button
                key={type}
                className={`artifact-browser__filter-chip ${filterType === type ? 'artifact-browser__filter-chip--active' : ''}`}
                style={filterType === type ? { background: color.bg, color: color.text, borderColor: color.border } : {}}
                onClick={() => setFilterType(filterType === type ? null : type)}
              >
                {type}
              </button>
            );
          })}
        </div>
      )}

      {/* Artifact list */}
      <div className="artifact-browser__list">
        {filteredArtifacts.length === 0 ? (
          <div className="artifact-browser__empty">
            {loading ? 'Loading artifacts...' : 'No artifacts yet'}
          </div>
        ) : (
          filteredArtifacts.map(artifact => (
            <div
              key={artifact.id}
              className={`artifact-browser__item ${expandedId === artifact.id ? 'artifact-browser__item--expanded' : ''}`}
            >
              <button
                className="artifact-browser__item-header"
                onClick={() => setExpandedId(expandedId === artifact.id ? null : artifact.id)}
              >
                <ArtifactTypeBadge type={artifact.type} />
                <span className="artifact-browser__item-name">{artifact.name || 'Untitled'}</span>
                <span className="artifact-browser__item-chevron">
                  {expandedId === artifact.id ? '▼' : '▶'}
                </span>
              </button>
              {expandedId === artifact.id && (
                <div className="artifact-browser__item-body">
                  <SemanticRenderer artifact={artifact} />
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function ArtifactTypeBadge({ type }: { type: string }) {
  const color = getArtifactTypeColor(type);
  return (
    <span
      className="artifact-type-badge"
      style={{ background: color.bg, color: color.text, borderColor: color.border }}
    >
      {type}
    </span>
  );
}

function mapArtifacts(records: Jw_artifacts[]): ArtifactData[] {
  return records.map(r => {
    const rec = r as unknown as Record<string, unknown>;
    return {
      id: (rec.jw_artifactid ?? rec.Id ?? '') as string,
      name: (rec.jw_name ?? '') as string,
      type: (rec.jw_type ?? 'JSON') as string,
      payload: (rec.jw_payload ?? '{}') as string,
      referenceKey: rec.jw_referencekey as string | undefined,
      caseId: rec._jw_caseid_value as string | undefined,
      parentArtifactId: rec._jw_parentartifactid_value as string | undefined,
      createdOn: rec.createdon as string | undefined,
      modifiedOn: rec.modifiedon as string | undefined,
    };
  });
}

export { ArtifactTypeBadge };
