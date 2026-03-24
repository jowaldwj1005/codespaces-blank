/**
 * DebugPanel — Enhanced debug console with source filters, collapsible JSON,
 * search, and stats bar. Shows every SDK/connector/agent-loop operation.
 */

import { useState, useMemo } from 'react';
import { useDebugLog } from '../hooks/useDebugLog';
import type { DebugEvent } from '../services/debugEventBus';

type SourceFilter = 'all' | 'dataverse' | 'connector' | 'agent-loop';
type StatusFilter = 'all' | 'success' | 'error' | 'pending';

const STATUS_COLORS: Record<string, string> = {
  pending: '#f59e0b',
  success: '#10b981',
  error: '#ef4444',
};

const SOURCE_COLORS: Record<string, string> = {
  dataverse: '#0ea5e9',
  connector: '#8b5cf6',
  'agent-loop': '#f97316',
};

const SOURCE_LABELS: Record<string, string> = {
  all: 'All',
  dataverse: 'Dataverse',
  connector: 'Connectors',
  'agent-loop': 'Agent Loop',
};

function JsonBlock({ data, label, bg }: { data: unknown; label: string; bg: string }) {
  const [open, setOpen] = useState(false);
  if (data === undefined || data === null) return null;

  const json = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
  const lines = json.split('\n').length;
  const isLarge = lines > 8;

  return (
    <div style={{ marginTop: 4 }}>
      <div
        onClick={() => setOpen(!open)}
        style={{
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          fontSize: 11,
          fontWeight: 600,
          color: '#6b7280',
          userSelect: 'none',
        }}
      >
        <span style={{ fontSize: 9, transition: 'transform 0.15s', transform: open ? 'rotate(90deg)' : 'rotate(0deg)' }}>
          ▶
        </span>
        {label}
        <span style={{ fontWeight: 400, color: '#9ca3af' }}>
          ({lines} lines)
        </span>
      </div>
      {open && (
        <pre
          style={{
            background: bg,
            padding: 8,
            borderRadius: 4,
            overflow: 'auto',
            maxHeight: isLarge ? 300 : 200,
            fontSize: 11,
            lineHeight: 1.4,
            margin: '4px 0 0 0',
            border: '1px solid #e5e7eb',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        >
          {json}
        </pre>
      )}
    </div>
  );
}

function EventCard({ evt }: { evt: DebugEvent }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      style={{
        marginBottom: 2,
        padding: '6px 8px',
        borderRadius: 6,
        borderLeft: `3px solid ${STATUS_COLORS[evt.status] || '#888'}`,
        background: evt.status === 'error' ? '#fef2f2' : '#fafafa',
        transition: 'background 0.15s',
      }}
    >
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          userSelect: 'none',
        }}
      >
        <span
          style={{
            fontSize: 9,
            padding: '1px 5px',
            borderRadius: 3,
            fontWeight: 700,
            color: '#fff',
            background: STATUS_COLORS[evt.status] ?? '#888',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}
        >
          {evt.status}
        </span>
        <span
          style={{
            fontSize: 9,
            padding: '1px 5px',
            borderRadius: 3,
            fontWeight: 600,
            color: SOURCE_COLORS[evt.source] ?? '#666',
            background: `${SOURCE_COLORS[evt.source] ?? '#666'}18`,
            border: `1px solid ${SOURCE_COLORS[evt.source] ?? '#666'}30`,
          }}
        >
          {evt.source}
        </span>
        <span style={{ flex: 1, fontSize: 12, fontWeight: 500, color: '#1f2937' }}>
          {evt.operation}
        </span>
        {evt.durationMs != null && (
          <span style={{ fontSize: 10, color: '#9ca3af', fontVariantNumeric: 'tabular-nums' }}>
            {evt.durationMs}ms
          </span>
        )}
        <span style={{ fontSize: 10, color: '#d1d5db', transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.15s' }}>
          ▶
        </span>
      </div>

      {expanded && (
        <div style={{ marginTop: 6, paddingLeft: 4 }}>
          <JsonBlock data={evt.input} label="Request" bg="#f3f4f6" />
          {evt.normalizedResult !== undefined && (
            <JsonBlock data={evt.normalizedResult} label="Response" bg="#f0fdf4" />
          )}
          {evt.error && (
            <div style={{ marginTop: 4 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#dc2626' }}>Error</div>
              <pre style={{ background: '#fef2f2', padding: 6, borderRadius: 4, color: '#dc2626', fontSize: 11, margin: '2px 0 0 0', border: '1px solid #fecaca' }}>
                {evt.error}
              </pre>
            </div>
          )}
          {evt.rawResult !== undefined && (
            <JsonBlock data={evt.rawResult} label="Raw Result" bg="#f9fafb" />
          )}
        </div>
      )}
    </div>
  );
}

export function DebugPanel() {
  const { events, clear } = useDebugLog();
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    let result = [...events].reverse();
    if (sourceFilter !== 'all') {
      result = result.filter(e => e.source === sourceFilter);
    }
    if (statusFilter !== 'all') {
      result = result.filter(e => e.status === statusFilter);
    }
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(e =>
        e.operation.toLowerCase().includes(q) ||
        JSON.stringify(e.input ?? '').toLowerCase().includes(q)
      );
    }
    return result;
  }, [events, sourceFilter, statusFilter, search]);

  // Stats
  const stats = useMemo(() => {
    const total = events.length;
    const errors = events.filter(e => e.status === 'error').length;
    const pending = events.filter(e => e.status === 'pending').length;
    const durations = events.filter(e => e.durationMs != null).map(e => e.durationMs!);
    const avgMs = durations.length > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0;
    const bySource = {
      dataverse: events.filter(e => e.source === 'dataverse').length,
      connector: events.filter(e => e.source === 'connector').length,
      'agent-loop': events.filter(e => e.source === 'agent-loop').length,
    };
    return { total, errors, pending, avgMs, bySource };
  }, [events]);

  const filterBtnStyle = (active: boolean, color?: string): React.CSSProperties => ({
    padding: '3px 8px',
    fontSize: 10,
    fontWeight: active ? 700 : 500,
    borderRadius: 4,
    border: `1px solid ${active ? (color ?? '#3b82f6') : '#d1d5db'}`,
    background: active ? `${color ?? '#3b82f6'}15` : 'transparent',
    color: active ? (color ?? '#3b82f6') : '#6b7280',
    cursor: 'pointer',
  });

  return (
    <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif', fontSize: 12, height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Stats Bar */}
      <div style={{
        display: 'flex',
        gap: 12,
        padding: '8px 12px',
        background: '#f8fafc',
        borderBottom: '1px solid #e2e8f0',
        borderRadius: '8px 8px 0 0',
        fontSize: 11,
        color: '#64748b',
      }}>
        <span><strong>{stats.total}</strong> events</span>
        {stats.errors > 0 && <span style={{ color: '#ef4444' }}><strong>{stats.errors}</strong> errors</span>}
        {stats.pending > 0 && <span style={{ color: '#f59e0b' }}><strong>{stats.pending}</strong> pending</span>}
        <span>avg <strong>{stats.avgMs}ms</strong></span>
        <span style={{ color: SOURCE_COLORS.dataverse }}>DV:{stats.bySource.dataverse}</span>
        <span style={{ color: SOURCE_COLORS.connector }}>Con:{stats.bySource.connector}</span>
        <span style={{ color: SOURCE_COLORS['agent-loop'] }}>AL:{stats.bySource['agent-loop']}</span>
        <span style={{ marginLeft: 'auto' }}>
          <button onClick={clear} style={{ fontSize: 10, padding: '2px 8px', border: '1px solid #d1d5db', borderRadius: 4, background: '#fff', cursor: 'pointer' }}>
            Clear
          </button>
        </span>
      </div>

      {/* Filter Bar */}
      <div style={{
        display: 'flex',
        gap: 4,
        padding: '6px 12px',
        background: '#fff',
        borderBottom: '1px solid #e2e8f0',
        flexWrap: 'wrap',
        alignItems: 'center',
      }}>
        {/* Source filters */}
        {(['all', 'dataverse', 'connector', 'agent-loop'] as SourceFilter[]).map(s => (
          <button
            key={s}
            onClick={() => setSourceFilter(s)}
            style={filterBtnStyle(sourceFilter === s, SOURCE_COLORS[s])}
          >
            {SOURCE_LABELS[s]}
          </button>
        ))}

        <span style={{ width: 1, height: 16, background: '#e2e8f0', margin: '0 4px' }} />

        {/* Status filters */}
        {(['all', 'success', 'error', 'pending'] as StatusFilter[]).map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            style={filterBtnStyle(statusFilter === s, STATUS_COLORS[s])}
          >
            {s === 'all' ? 'All Status' : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}

        {/* Search */}
        <input
          type="text"
          placeholder="Search operations..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            marginLeft: 'auto',
            padding: '3px 8px',
            fontSize: 11,
            border: '1px solid #d1d5db',
            borderRadius: 4,
            width: 180,
            outline: 'none',
          }}
        />
      </div>

      {/* Event List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 12px' }}>
        {filtered.length === 0 && (
          <div style={{ color: '#9ca3af', fontStyle: 'italic', textAlign: 'center', padding: 24 }}>
            {events.length === 0
              ? 'No events yet. Perform a Dataverse or Connector operation.'
              : 'No events match your filters.'}
          </div>
        )}

        {filtered.map((evt, idx) => (
          <EventCard key={`${evt.id}_${idx}`} evt={evt} />
        ))}
      </div>
    </div>
  );
}
