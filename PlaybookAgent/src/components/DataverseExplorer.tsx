import { useState, useEffect } from 'react';
import { useDataverse } from '../hooks/useDataverse';
import type { DataverseTable } from '../hooks/useDataverse';
import { useCurrentUser } from '../hooks/useCurrentUser';

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
  const {
    data, loading, error, lastAction,
    fetchTable, fetchRecord, fetchMetadata,
    doCreateTeam, doUpdateTeam, doDeleteRecord,
  } = useDataverse();

  // ─── Current user for defaults ───
  const { currentUser } = useCurrentUser();

  // ─── CRUD form state ───
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [teamDesc, setTeamDesc] = useState('');
  const [buId, setBuId] = useState('');
  const [adminId, setAdminId] = useState('');

  // Auto-fill BU and Admin from current user when loaded
  useEffect(() => {
    if (currentUser) {
      if (!buId) setBuId(currentUser.businessunitid);
      if (!adminId) setAdminId(currentUser.systemuserid);
    }
    // Only run when currentUser first loads, not on every buId/adminId change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);
  const [updateTeamId, setUpdateTeamId] = useState('');
  const [updateField, setUpdateField] = useState('name');
  const [updateValue, setUpdateValue] = useState('');
  const [deleteId, setDeleteId] = useState('');
  const [crudMessage, setCrudMessage] = useState<string | null>(null);

  const handleFetchAll = () => {
    setCrudMessage(null);
    fetchTable(selectedTable, {
      top: topN,
      ...(filterStr ? { filter: filterStr } : {}),
    });
  };

  const handleFetchById = () => {
    if (recordId.trim()) {
      setCrudMessage(null);
      fetchRecord(selectedTable, recordId.trim());
    }
  };

  const handleFetchMeta = () => {
    setCrudMessage(null);
    fetchMetadata(selectedTable);
  };

  const handleCreateTeam = async () => {
    if (!teamName.trim() || !buId.trim() || !adminId.trim()) return;
    setCrudMessage(null);
    const result = await doCreateTeam({
      name: teamName.trim(),
      description: teamDesc.trim() || undefined,
      businessUnitId: buId.trim(),
      administratorId: adminId.trim(),
    });
    if (result) {
      setCrudMessage(`Team created: ${(result as unknown as Record<string, unknown>).name ?? 'OK'}`);
      setTeamName('');
      setTeamDesc('');
    }
  };

  const handleUpdateTeam = async () => {
    if (!updateTeamId.trim() || !updateValue.trim()) return;
    setCrudMessage(null);
    const result = await doUpdateTeam(updateTeamId.trim(), { [updateField]: updateValue.trim() });
    if (result) {
      setCrudMessage(`Team updated: ${updateField} = "${updateValue}"`);
    }
  };

  const handleDelete = async () => {
    if (!deleteId.trim()) return;
    setCrudMessage(null);
    const ok = await doDeleteRecord(selectedTable, deleteId.trim());
    if (ok) {
      setCrudMessage(`Record deleted: ${deleteId}`);
      setDeleteId('');
    }
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

      {/* Read Actions */}
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

      {/* CRUD Section */}
      <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: 12, marginTop: 8, marginBottom: 12 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <button
            onClick={() => setShowCreateTeam(!showCreateTeam)}
            style={{ background: '#10b981', color: '#fff', border: 'none' }}
          >
            {showCreateTeam ? 'Hide Create Form' : 'Create Team'}
          </button>
        </div>

        {/* Create Team Form */}
        {showCreateTeam && (
          <div style={{ padding: 8, border: '1px solid #d1fae5', borderRadius: 4, background: '#f0fdf4', marginBottom: 8 }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
              <input type="text" value={teamName} onChange={(e) => setTeamName(e.target.value)} placeholder="Team Name *" style={{ width: 180 }} />
              <input type="text" value={teamDesc} onChange={(e) => setTeamDesc(e.target.value)} placeholder="Description" style={{ width: 200 }} />
              <input type="text" value={buId} onChange={(e) => setBuId(e.target.value)}
                placeholder={currentUser ? `BU: ${currentUser.businessunitid}` : 'Business Unit ID *'}
                title={currentUser ? `Auto-filled from ${currentUser.fullname}` : ''}
                style={{ width: 260 }} />
              <input type="text" value={adminId} onChange={(e) => setAdminId(e.target.value)}
                placeholder={currentUser ? `Admin: ${currentUser.fullname}` : 'Administrator User ID *'}
                title={currentUser ? `Auto-filled: ${currentUser.systemuserid}` : ''}
                style={{ width: 260 }} />
            </div>
            <button onClick={handleCreateTeam} disabled={loading || !teamName.trim() || !buId.trim() || !adminId.trim()}>
              Create
            </button>
          </div>
        )}

        {/* Update Team */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8, flexWrap: 'wrap' }}>
          <strong style={{ fontSize: 12 }}>Update Team:</strong>
          <input type="text" value={updateTeamId} onChange={(e) => setUpdateTeamId(e.target.value)} placeholder="Team ID" style={{ width: 260 }} />
          <select value={updateField} onChange={(e) => setUpdateField(e.target.value)}>
            <option value="name">name</option>
            <option value="description">description</option>
            <option value="emailaddress">emailaddress</option>
          </select>
          <input type="text" value={updateValue} onChange={(e) => setUpdateValue(e.target.value)} placeholder="New Value" style={{ width: 180 }} />
          <button onClick={handleUpdateTeam} disabled={loading || !updateTeamId.trim() || !updateValue.trim()}
            style={{ background: '#f59e0b', color: '#fff', border: 'none' }}>
            Update
          </button>
        </div>

        {/* Delete Record */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <strong style={{ fontSize: 12 }}>Delete ({selectedTable}):</strong>
          <input type="text" value={deleteId} onChange={(e) => setDeleteId(e.target.value)} placeholder="Record ID to delete" style={{ width: 260 }} />
          <button onClick={handleDelete} disabled={loading || !deleteId.trim()}
            style={{ background: '#ef4444', color: '#fff', border: 'none' }}>
            Delete
          </button>
        </div>
      </div>

      {/* CRUD Feedback */}
      {crudMessage ? <div style={{ color: '#10b981', marginBottom: 8, fontWeight: 500 }}>{crudMessage}</div> : null}

      {/* Status */}
      {loading && <div style={{ color: '#f59e0b' }}>Loading... {lastAction ? `(${lastAction})` : ''}</div>}
      {error ? <div style={{ color: '#ef4444' }}>Error: {error}</div> : null}

      {/* Results */}
      {data != null ? (
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
      ) : null}
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
