/**
 * DataverseExplorer — Mini model-driven app for browsing all Dataverse tables.
 * Shows jw_ entities grouped by layer + system tables.
 * Provides record grid, OData filtering, inline detail view with pretty JSON.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { getAllEntities, type EntityDefinition } from '../admin/EntityRegistry';
import { getTableService } from '../../services/dataverse';
import { systemusers, teams, businessunits } from '../../services/dataverse';
import type { IGetAllOptions } from '../../services/sdk';

// System table definitions (not in EntityRegistry)
const SYSTEM_TABLES: EntityDefinition[] = [
  {
    logicalName: 'systemuser', displayName: 'User', displayNamePlural: 'Users',
    pluralApiName: 'systemusers', primaryKey: 'systemuserid', nameField: 'fullname',
    icon: '\u{1F464}', color: '#64748b', layer: 'interaction' as const,
    fields: [], listColumns: ['fullname', 'domainname', 'internalemailaddress'],
  },
  {
    logicalName: 'team', displayName: 'Team', displayNamePlural: 'Teams',
    pluralApiName: 'teams', primaryKey: 'teamid', nameField: 'name',
    icon: '\u{1F465}', color: '#64748b', layer: 'interaction' as const,
    fields: [], listColumns: ['name', 'description'],
  },
  {
    logicalName: 'businessunit', displayName: 'Business Unit', displayNamePlural: 'Business Units',
    pluralApiName: 'businessunits', primaryKey: 'businessunitid', nameField: 'name',
    icon: '\u{1F3E2}', color: '#64748b', layer: 'interaction' as const,
    fields: [], listColumns: ['name'],
  },
];

type ViewMode = 'grid' | 'detail';

export function DataverseExplorer() {
  const jwEntities = getAllEntities();
  const allEntities = [...jwEntities, ...SYSTEM_TABLES];

  const [activeEntity, setActiveEntity] = useState<EntityDefinition>(allEntities[0]);
  const [records, setRecords] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterStr, setFilterStr] = useState('');
  const [topN, setTopN] = useState(50);
  const [selectedRecord, setSelectedRecord] = useState<Record<string, unknown> | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const loadingRef = useRef(false);

  // Load records
  const loadRecords = useCallback(async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    setError(null);
    try {
      const opts: IGetAllOptions = { top: topN };
      if (filterStr.trim()) {
        (opts as Record<string, unknown>).filter = filterStr.trim();
      }

      // Use jw_ table service or system table service
      const systemServices: Record<string, { getAll: (opts?: IGetAllOptions) => Promise<unknown> }> = { systemusers, teams, businessunits };
      const service = getTableService(activeEntity.pluralApiName) ?? systemServices[activeEntity.pluralApiName];

      if (!service) throw new Error(`No service for ${activeEntity.pluralApiName}`);
      const result = await service.getAll(opts) as { data?: unknown[] };
      setRecords((result.data ?? []) as Record<string, unknown>[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setRecords([]);
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [activeEntity, filterStr, topN]);

  useEffect(() => {
    loadRecords();
    setSelectedRecord(null);
    setViewMode('grid');
  }, [activeEntity, loadRecords]);

  // Detect columns from first record
  const columns = records.length > 0
    ? Object.keys(records[0]).filter(k => !k.startsWith('@') && !k.startsWith('_'))
    : activeEntity.listColumns.length > 0 ? activeEntity.listColumns : [];

  // Priority columns first
  const priorityCols = [activeEntity.nameField, activeEntity.primaryKey, 'createdon', 'modifiedon'];
  const sortedColumns = [
    ...priorityCols.filter(c => columns.includes(c)),
    ...columns.filter(c => !priorityCols.includes(c)),
  ];

  const displayColumns = sortedColumns.slice(0, 6); // Max 6 in grid

  // Layer grouping
  const definitionEntities = jwEntities.filter(e => e.layer === 'definition');
  const stateEntities = jwEntities.filter(e => e.layer === 'state');
  const interactionEntities = jwEntities.filter(e => e.layer === 'interaction');

  return (
    <div className="dv-explorer">
      {/* Entity Selector */}
      <div className="dv-explorer__nav">
        <div className="dv-nav-group">
          <div className="dv-nav-group__label">Definition</div>
          {definitionEntities.map(ent => (
            <button
              key={ent.logicalName}
              className={`dv-nav-item ${activeEntity.logicalName === ent.logicalName ? 'dv-nav-item--active' : ''}`}
              onClick={() => setActiveEntity(ent)}
              style={activeEntity.logicalName === ent.logicalName ? { borderColor: ent.color } : undefined}
            >
              <span className="dv-nav-item__icon">{ent.icon}</span>
              <span className="dv-nav-item__name">{ent.displayNamePlural}</span>
            </button>
          ))}
        </div>
        <div className="dv-nav-group">
          <div className="dv-nav-group__label">State</div>
          {stateEntities.map(ent => (
            <button
              key={ent.logicalName}
              className={`dv-nav-item ${activeEntity.logicalName === ent.logicalName ? 'dv-nav-item--active' : ''}`}
              onClick={() => setActiveEntity(ent)}
              style={activeEntity.logicalName === ent.logicalName ? { borderColor: ent.color } : undefined}
            >
              <span className="dv-nav-item__icon">{ent.icon}</span>
              <span className="dv-nav-item__name">{ent.displayNamePlural}</span>
            </button>
          ))}
        </div>
        <div className="dv-nav-group">
          <div className="dv-nav-group__label">Interaction</div>
          {interactionEntities.map(ent => (
            <button
              key={ent.logicalName}
              className={`dv-nav-item ${activeEntity.logicalName === ent.logicalName ? 'dv-nav-item--active' : ''}`}
              onClick={() => setActiveEntity(ent)}
              style={activeEntity.logicalName === ent.logicalName ? { borderColor: ent.color } : undefined}
            >
              <span className="dv-nav-item__icon">{ent.icon}</span>
              <span className="dv-nav-item__name">{ent.displayNamePlural}</span>
            </button>
          ))}
        </div>
        <div className="dv-nav-group">
          <div className="dv-nav-group__label">System</div>
          {SYSTEM_TABLES.map(ent => (
            <button
              key={ent.logicalName}
              className={`dv-nav-item ${activeEntity.logicalName === ent.logicalName ? 'dv-nav-item--active' : ''}`}
              onClick={() => setActiveEntity(ent)}
            >
              <span className="dv-nav-item__icon">{ent.icon}</span>
              <span className="dv-nav-item__name">{ent.displayNamePlural}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="dv-explorer__main">
        {/* Toolbar */}
        <div className="dv-toolbar">
          <div className="dv-toolbar__title">
            <span style={{ color: activeEntity.color }}>{activeEntity.icon}</span>
            {' '}{activeEntity.displayNamePlural}
            <span className="dv-toolbar__count">{records.length} records</span>
          </div>
          <div className="dv-toolbar__controls">
            <input
              type="text"
              className="dv-filter-input"
              value={filterStr}
              onChange={e => setFilterStr(e.target.value)}
              placeholder="OData filter (e.g. jw_name eq 'test')"
              onKeyDown={e => e.key === 'Enter' && loadRecords()}
            />
            <select className="dv-top-select" value={topN} onChange={e => setTopN(Number(e.target.value))}>
              <option value={10}>Top 10</option>
              <option value={25}>Top 25</option>
              <option value={50}>Top 50</option>
              <option value={100}>Top 100</option>
              <option value={250}>Top 250</option>
            </select>
            <button className="dv-btn" onClick={loadRecords} disabled={loading}>
              {loading ? 'Loading...' : 'Refresh'}
            </button>
          </div>
        </div>

        {error && <div className="dv-error">{error}</div>}

        {/* Split view: grid + detail */}
        <div className={`dv-split ${viewMode === 'detail' ? 'dv-split--with-detail' : ''}`}>
          {/* Record Grid */}
          <div className="dv-grid-wrapper">
            <table className="dv-grid">
              <thead>
                <tr>
                  <th className="dv-grid__th dv-grid__th--index">#</th>
                  {displayColumns.map(col => (
                    <th key={col} className="dv-grid__th">{formatColumnName(col)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {records.map((record, i) => {
                  const id = record[activeEntity.primaryKey] as string;
                  const isSelected = selectedRecord?.[activeEntity.primaryKey] === id;
                  return (
                    <tr
                      key={id ?? i}
                      className={`dv-grid__row ${isSelected ? 'dv-grid__row--selected' : ''}`}
                      onClick={() => {
                        setSelectedRecord(record);
                        setViewMode('detail');
                      }}
                    >
                      <td className="dv-grid__td dv-grid__td--index">{i + 1}</td>
                      {displayColumns.map(col => (
                        <td key={col} className="dv-grid__td">
                          {formatCellValue(record[col])}
                        </td>
                      ))}
                    </tr>
                  );
                })}
                {records.length === 0 && !loading && (
                  <tr>
                    <td colSpan={displayColumns.length + 1} className="dv-grid__empty">
                      No records found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Detail Panel */}
          {viewMode === 'detail' && selectedRecord && (
            <div className="dv-detail">
              <div className="dv-detail__header">
                <span className="dv-detail__title">
                  {String(selectedRecord[activeEntity.nameField] ?? selectedRecord[activeEntity.primaryKey] ?? 'Record')}
                </span>
                <button className="dv-detail__close" onClick={() => { setViewMode('grid'); setSelectedRecord(null); }}>
                  x
                </button>
              </div>
              <div className="dv-detail__body">
                {Object.entries(selectedRecord)
                  .filter(([k]) => !k.startsWith('@'))
                  .map(([key, value]) => (
                    <div key={key} className="dv-detail__field">
                      <div className="dv-detail__field-name">{formatColumnName(key)}</div>
                      <div className="dv-detail__field-value">
                        {renderFieldValue(key, value)}
                      </div>
                    </div>
                  ))}
              </div>
              <div className="dv-detail__footer">
                <details>
                  <summary className="dv-detail__raw-toggle">Raw JSON</summary>
                  <pre className="dv-detail__raw">{JSON.stringify(selectedRecord, null, 2)}</pre>
                </details>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatColumnName(col: string): string {
  return col
    .replace(/^jw_/, '')
    .replace(/^_jw_/, '')
    .replace(/_value$/, '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

function formatCellValue(value: unknown): string {
  if (value == null) return '-';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'object') return JSON.stringify(value).slice(0, 60) + '...';
  const str = String(value);
  if (str.length > 80) return str.slice(0, 77) + '...';
  return str;
}

function renderFieldValue(_key: string, value: unknown): React.ReactElement {
  if (value == null) return <span className="dv-null">null</span>;
  if (typeof value === 'boolean') {
    return <span className={`dv-badge ${value ? 'dv-badge--green' : 'dv-badge--red'}`}>{value ? 'Yes' : 'No'}</span>;
  }
  if (typeof value === 'object') {
    return <pre className="dv-json">{JSON.stringify(value, null, 2)}</pre>;
  }
  const str = String(value);
  // Try to detect JSON strings
  if ((str.startsWith('{') || str.startsWith('[')) && str.length > 20) {
    try {
      const parsed = JSON.parse(str);
      return <pre className="dv-json">{JSON.stringify(parsed, null, 2)}</pre>;
    } catch { /* not JSON */ }
  }
  // Long text
  if (str.length > 200) {
    return <pre className="dv-longtext">{str}</pre>;
  }
  // GUID
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)) {
    return <code className="dv-guid">{str}</code>;
  }
  // Date
  if (/^\d{4}-\d{2}-\d{2}T/.test(str)) {
    return <span>{new Date(str).toLocaleString()}</span>;
  }
  return <span>{str}</span>;
}
