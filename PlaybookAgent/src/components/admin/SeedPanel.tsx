/**
 * SeedPanel — Transparent, controllable seed data creation.
 * Shows a preview of all records, toggles per record, real-time status.
 */

import { useState, useCallback } from 'react';
import type { SeedRecord } from '../../services/seedData';
import { getGeneralAssistantSeedData, executeSeed } from '../../services/seedData';

type RecordStatus = SeedRecord['status'];

const STATUS_ICONS: Record<string, string> = {
  exists: '●',
  created: '✓',
  error: '✗',
  skipped: '○',
};

const STATUS_CLASSES: Record<string, string> = {
  exists: 'seed-status--exists',
  created: 'seed-status--created',
  error: 'seed-status--error',
  skipped: 'seed-status--skipped',
};

const TYPE_LABELS: Record<string, string> = {
  agent: 'Agent',
  tool: 'Tool',
  playbook: 'Playbook',
  instruction: 'Instruction',
  agent_tool_link: 'Link',
};

export function SeedPanel() {
  const [records, setRecords] = useState<(SeedRecord & { enabled: boolean })[]>(() =>
    getGeneralAssistantSeedData().map(r => ({ ...r, enabled: true }))
  );
  const [running, setRunning] = useState(false);
  const [completed, setCompleted] = useState(false);

  const toggleRecord = useCallback((index: number) => {
    setRecords(prev => prev.map((r, i) => i === index ? { ...r, enabled: !r.enabled } : r));
  }, []);

  const toggleAll = useCallback((enabled: boolean) => {
    setRecords(prev => prev.map(r => ({ ...r, enabled })));
  }, []);

  const handleExecute = useCallback(async () => {
    setRunning(true);
    setCompleted(false);

    const enabledRecords = records.filter(r => r.enabled);
    const disabledNames = new Set(records.filter(r => !r.enabled).map(r => r.name));

    const results = await executeSeed(
      enabledRecords,
      (record, _index) => {
        // Update status in real-time
        setRecords(prev => prev.map(r =>
          r.name === record.name ? { ...r, status: record.status, recordId: record.recordId, error: record.error } : r
        ));
      }
    );

    // Mark disabled records as skipped
    setRecords(prev => prev.map(r => {
      if (disabledNames.has(r.name)) {
        return { ...r, status: 'skipped' as RecordStatus };
      }
      const result = results.find(res => res.name === r.name);
      return result ? { ...r, status: result.status, recordId: result.recordId, error: result.error } : r;
    }));

    setRunning(false);
    setCompleted(true);
  }, [records]);

  const handleReset = useCallback(() => {
    setRecords(getGeneralAssistantSeedData().map(r => ({ ...r, enabled: true })));
    setCompleted(false);
  }, []);

  const summary = {
    total: records.length,
    enabled: records.filter(r => r.enabled).length,
    created: records.filter(r => r.status === 'created').length,
    exists: records.filter(r => r.status === 'exists').length,
    errors: records.filter(r => r.status === 'error').length,
  };

  return (
    <div className="seed-panel">
      <div className="seed-panel__header">
        <div>
          <h2 className="seed-panel__title">Seed Data</h2>
          <p className="seed-panel__subtitle">
            Bootstrap Dataverse with test data. Existing records are updated, not duplicated.
          </p>
        </div>
        <div className="seed-panel__actions">
          {!completed ? (
            <>
              <button
                className="btn btn--ghost"
                onClick={() => toggleAll(records.some(r => !r.enabled))}
                disabled={running}
              >
                {records.every(r => r.enabled) ? 'Deselect All' : 'Select All'}
              </button>
              <button
                className="btn btn--primary"
                onClick={handleExecute}
                disabled={running || summary.enabled === 0}
              >
                {running ? 'Creating...' : `Apply (${summary.enabled} records)`}
              </button>
            </>
          ) : (
            <>
              <span className="seed-panel__summary-text">
                {summary.created} created, {summary.exists} existed, {summary.errors} errors
              </span>
              <button className="btn btn--ghost" onClick={handleReset}>
                Reset
              </button>
            </>
          )}
        </div>
      </div>

      <div className="seed-panel__list">
        {records.map((record, i) => (
          <div
            key={record.name}
            className={`seed-item ${!record.enabled ? 'seed-item--disabled' : ''} ${record.status ? 'seed-item--done' : ''}`}
          >
            <label className="seed-item__toggle">
              <input
                type="checkbox"
                checked={record.enabled}
                onChange={() => toggleRecord(i)}
                disabled={running || completed}
              />
            </label>

            <span className={`seed-item__type seed-item__type--${record.type}`}>
              {TYPE_LABELS[record.type]}
            </span>

            <span className="seed-item__name">{record.name}</span>

            {record.status && (
              <span className={`seed-status ${STATUS_CLASSES[record.status] ?? ''}`}>
                {STATUS_ICONS[record.status] ?? '?'} {record.status}
              </span>
            )}

            {record.error && (
              <span className="seed-item__error-wrapper">
                <span className="seed-item__error">
                  {record.error.slice(0, 50)}{record.error.length > 50 ? '…' : ''}
                </span>
                <span className="seed-item__error-tooltip">{record.error}</span>
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
