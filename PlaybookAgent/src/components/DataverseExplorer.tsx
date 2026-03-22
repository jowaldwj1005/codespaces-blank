import { useState } from 'react';
import { useDataverse } from '../hooks/useDataverse';
import type { DataverseTable } from '../hooks/useDataverse';

const AVAILABLE_TABLES: { value: DataverseTable; label: string }[] = [
  { value: 'systemusers', label: 'System Users' },
  { value: 'teams', label: 'Teams' },
  { value: 'businessunits', label: 'Business Units' },
];

export function DataverseExplorer() {
  const [selectedTable, setSelectedTable] = useState<DataverseTable>('systemusers');
  const [topN, setTopN] = useState(5);
  const [filterStr, setFilterStr] = useState('');
  const [recordId, setRecordId] = useState('');
  const { data, loading, error, fetchTable, fetchRecord, fetchMetadata } = useDataverse();

  const handleFetchAll = () => {
    fetchTable(selectedTable, {
      top: topN,
      ...(filterStr ? { filter: filterStr } : {}),
    });
  };

  const handleFetchById = () => {
    if (recordId.trim()) {
      fetchRecord(selectedTable, recordId.trim());
    }
  };

  const handleFetchMeta = () => {
    fetchMetadata(selectedTable);
  };

  return (
    <div>
      <h3>Dataverse Explorer</h3>

      {/* Table Selector */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' }}>
        <label>
          Table:{' '}
          <select
            value={selectedTable}
            onChange={(e) => setSelectedTable(e.target.value as DataverseTable)}
          >
            {AVAILABLE_TABLES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          Top:{' '}
          <input
            type="number"
            value={topN}
            onChange={(e) => setTopN(Number(e.target.value) || 5)}
            style={{ width: 50 }}
            min={1}
            max={100}
          />
        </label>

        <label>
          Filter:{' '}
          <input
            type="text"
            value={filterStr}
            onChange={(e) => setFilterStr(e.target.value)}
            placeholder="e.g. firstname eq 'John'"
            style={{ width: 200 }}
          />
        </label>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <button onClick={handleFetchAll} disabled={loading}>
          List Records
        </button>
        <button onClick={handleFetchMeta} disabled={loading}>
          Get Metadata
        </button>

        <span style={{ borderLeft: '1px solid #ccc', margin: '0 4px' }} />

        <input
          type="text"
          value={recordId}
          onChange={(e) => setRecordId(e.target.value)}
          placeholder="Record ID (GUID)"
          style={{ width: 280 }}
        />
        <button onClick={handleFetchById} disabled={loading || !recordId.trim()}>
          Get by ID
        </button>
      </div>

      {/* Status */}
      {loading && <div style={{ color: '#f59e0b' }}>Loading...</div>}
      {error && <div style={{ color: '#ef4444' }}>Error: {error}</div>}

      {/* Results */}
      {data && (
        <div>
          <div style={{ marginBottom: 4, color: '#666' }}>
            {data.length} record(s) returned
          </div>
          <div style={{ maxHeight: 500, overflowY: 'auto' }}>
            {data.map((record, i) => (
              <details
                key={i}
                style={{
                  marginBottom: 4,
                  padding: 8,
                  border: '1px solid #e5e7eb',
                  borderRadius: 4,
                  background: '#fff',
                }}
              >
                <summary style={{ cursor: 'pointer', fontWeight: 500 }}>
                  Record {i + 1}:{' '}
                  {renderRecordSummary(record as Record<string, unknown>, selectedTable)}
                </summary>
                <pre
                  style={{
                    marginTop: 4,
                    padding: 8,
                    background: '#f9fafb',
                    borderRadius: 4,
                    fontSize: 11,
                    overflow: 'auto',
                    maxHeight: 300,
                  }}
                >
                  {JSON.stringify(record, null, 2)}
                </pre>
              </details>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function renderRecordSummary(record: Record<string, unknown>, table: DataverseTable): string {
  switch (table) {
    case 'systemusers':
      return String(record.fullname || record.domainname || record.systemuserid || '(unknown)');
    case 'teams':
      return String(record.name || record.teamid || '(unknown)');
    case 'businessunits':
      return String(record.name || record.businessunitid || '(unknown)');
    default:
      return '(record)';
  }
}
