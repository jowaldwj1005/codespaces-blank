/**
 * MCP Explorer - Interactive testing UI for Dataverse MCP tools.
 * Allows manual invocation of search_tables, get_schema, and execute_query.
 */

import { useState } from 'react';
import { useMcp } from '../hooks/useMcp';

type McpTool = 'search' | 'schema' | 'query';

export function McpExplorer() {
  const { searchResult, schema, queryResult, loading, error, search, fetchSchema, query } = useMcp();
  const [activeTool, setActiveTool] = useState<McpTool>('search');

  // Search state
  const [intent, setIntent] = useState('');

  // Schema state
  const [schemaTable, setSchemaTable] = useState('');

  // Query state
  const [queryTable, setQueryTable] = useState('systemusers');
  const [queryFilter, setQueryFilter] = useState('');
  const [querySelect, setQuerySelect] = useState('');
  const [queryTop, setQueryTop] = useState(10);

  const handleExecute = () => {
    switch (activeTool) {
      case 'search':
        if (intent.trim()) search(intent.trim());
        break;
      case 'schema':
        if (schemaTable.trim()) fetchSchema(schemaTable.trim());
        break;
      case 'query':
        query(queryTable, {
          filter: queryFilter.trim() || undefined,
          select: querySelect.trim() ? querySelect.split(',').map((s) => s.trim()) : undefined,
          top: queryTop,
        });
        break;
    }
  };

  return (
    <div>
      <h3>Dataverse MCP Explorer</h3>
      <p style={{ fontSize: 12, color: '#666', marginBottom: 12 }}>
        Test the three MCP tools that give AI agents Dataverse discovery capabilities.
        In production, the LLM calls these as tool functions.
      </p>

      {/* Tool selector */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
        {([
          { id: 'search', label: 'search_tables' },
          { id: 'schema', label: 'get_schema' },
          { id: 'query', label: 'execute_query' },
        ] as const).map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTool(t.id)}
            style={{
              padding: '4px 12px',
              background: activeTool === t.id ? '#6366f1' : '#e5e7eb',
              color: activeTool === t.id ? '#fff' : '#333',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer',
              fontSize: 12,
              fontFamily: 'monospace',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tool inputs */}
      {activeTool === 'search' && (
        <div style={{ marginBottom: 12 }}>
          <label>
            Intent:{' '}
            <input
              type="text"
              value={intent}
              onChange={(e) => setIntent(e.target.value)}
              placeholder="e.g. 'find all users in a team' or 'SAP order tools'"
              style={{ width: 400 }}
              onKeyDown={(e) => e.key === 'Enter' && handleExecute()}
            />
          </label>
          <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>
            Maps natural language intent to matching Dataverse table names (keyword-based).
          </div>
        </div>
      )}

      {activeTool === 'schema' && (
        <div style={{ marginBottom: 12 }}>
          <label>
            Logical Name:{' '}
            <input
              type="text"
              value={schemaTable}
              onChange={(e) => setSchemaTable(e.target.value)}
              placeholder="e.g. jw_agent, systemuser, jw_artifact"
              style={{ width: 300 }}
              onKeyDown={(e) => e.key === 'Enter' && handleExecute()}
            />
          </label>
          <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>
            Returns minified schema (columns, types, lookups). Uses live metadata when available, static fallback otherwise.
          </div>
        </div>
      )}

      {activeTool === 'query' && (
        <div style={{ marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <label>
              Table:{' '}
              <select value={queryTable} onChange={(e) => setQueryTable(e.target.value)}>
                <option value="systemusers">systemusers</option>
                <option value="teams">teams</option>
                <option value="businessunits">businessunits</option>
              </select>
            </label>
            <label>
              $top:{' '}
              <input
                type="number"
                value={queryTop}
                onChange={(e) => setQueryTop(Number(e.target.value) || 10)}
                style={{ width: 60 }}
                min={1}
                max={50}
              />
            </label>
          </div>
          <label>
            $filter:{' '}
            <input
              type="text"
              value={queryFilter}
              onChange={(e) => setQueryFilter(e.target.value)}
              placeholder="e.g. contains(fullname, 'John')"
              style={{ width: '100%' }}
            />
          </label>
          <label>
            $select (comma-separated):{' '}
            <input
              type="text"
              value={querySelect}
              onChange={(e) => setQuerySelect(e.target.value)}
              placeholder="e.g. fullname,internalemailaddress"
              style={{ width: '100%' }}
            />
          </label>
          <div style={{ fontSize: 11, color: '#ef4444' }}>
            Read-only queries only. Writes must go through HitL ToolExecution flow.
          </div>
        </div>
      )}

      {/* Execute */}
      <button onClick={handleExecute} disabled={loading} style={{ marginBottom: 12 }}>
        {loading ? 'Executing...' : 'Execute MCP Tool'}
      </button>

      {/* Error */}
      {error && <div style={{ color: '#ef4444', marginBottom: 8 }}>Error: {error}</div>}

      {/* Results */}
      {activeTool === 'search' && searchResult && (
        <div>
          <div style={{ fontSize: 12, marginBottom: 8 }}>
            Found <strong>{searchResult.tables.length}</strong> tables
            {searchResult.matchedKeywords.length > 0 && (
              <> matching: <span style={{ color: '#6366f1' }}>{searchResult.matchedKeywords.join(', ')}</span></>
            )}
          </div>
          {searchResult.tables.map((t) => (
            <div
              key={t.logicalName}
              style={{
                padding: 8,
                marginBottom: 4,
                background: '#f9fafb',
                border: '1px solid #e5e7eb',
                borderRadius: 4,
                fontSize: 12,
              }}
            >
              <strong style={{ color: '#4338ca' }}>{t.logicalName}</strong>
              <span style={{ color: '#888', marginLeft: 8 }}>({t.pluralName})</span>
              <div style={{ color: '#555', marginTop: 2 }}>{t.description}</div>
              <div style={{ fontSize: 10, color: '#aaa', marginTop: 2 }}>
                PK: {t.primaryKey} | Keywords: {t.keywords.join(', ')}
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTool === 'schema' && schema && (
        <div>
          <div style={{ fontSize: 12, marginBottom: 8 }}>
            <strong style={{ color: '#4338ca' }}>{schema.displayName}</strong>
            <span style={{ color: '#888', marginLeft: 8 }}>
              {schema.logicalName} ({schema.pluralName})
            </span>
          </div>
          <table style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f3f4f6', textAlign: 'left' }}>
                <th style={{ padding: '4px 8px', border: '1px solid #e5e7eb' }}>Column</th>
                <th style={{ padding: '4px 8px', border: '1px solid #e5e7eb' }}>Type</th>
                <th style={{ padding: '4px 8px', border: '1px solid #e5e7eb' }}>Description</th>
                <th style={{ padding: '4px 8px', border: '1px solid #e5e7eb' }}>Lookup</th>
              </tr>
            </thead>
            <tbody>
              {schema.columns.map((col) => (
                <tr key={col.logicalName}>
                  <td style={{ padding: '4px 8px', border: '1px solid #e5e7eb', fontFamily: 'monospace' }}>
                    {col.logicalName}
                  </td>
                  <td style={{ padding: '4px 8px', border: '1px solid #e5e7eb' }}>{col.type}</td>
                  <td style={{ padding: '4px 8px', border: '1px solid #e5e7eb', color: '#666' }}>
                    {col.description ?? '—'}
                  </td>
                  <td style={{ padding: '4px 8px', border: '1px solid #e5e7eb' }}>
                    {col.isLookup ? col.lookupTarget : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTool === 'query' && queryResult && (
        <div>
          <div style={{ fontSize: 12, marginBottom: 8 }}>
            Returned <strong>{queryResult.records.length}</strong> records
            {queryResult.truncated && <span style={{ color: '#f59e0b' }}> (truncated)</span>}
          </div>
          <pre style={{
            padding: 8,
            background: '#f9fafb',
            border: '1px solid #e5e7eb',
            borderRadius: 4,
            fontSize: 11,
            overflow: 'auto',
            maxHeight: 400,
          }}>
            {JSON.stringify(queryResult.records, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
