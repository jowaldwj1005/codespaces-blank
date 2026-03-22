import { useDebugLog } from '../hooks/useDebugLog';
import type { DebugEvent } from '../services/debugEventBus';

const statusColors: Record<string, string> = {
  pending: '#f59e0b',
  success: '#10b981',
  error: '#ef4444',
};

function hasInput(evt: DebugEvent): boolean {
  return evt.input !== undefined && evt.input !== null;
}

export function DebugPanel() {
  const { events, clear } = useDebugLog();
  const reversed = [...events].reverse();

  return (
    <div style={{ fontFamily: 'monospace', fontSize: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <strong>Debug Log ({events.length} events)</strong>
        <button onClick={clear} style={{ fontSize: 11, padding: '2px 8px' }}>
          Clear
        </button>
      </div>

      {reversed.length === 0 && (
        <div style={{ color: '#888', fontStyle: 'italic' }}>
          No events yet. Perform a Dataverse or Connector operation.
        </div>
      )}

      <div style={{ maxHeight: 400, overflowY: 'auto' }}>
        {reversed.map((evt) => (
          <details
            key={evt.id}
            style={{
              marginBottom: 4,
              padding: 6,
              border: '1px solid #ddd',
              borderRadius: 4,
              borderLeft: `3px solid ${statusColors[evt.status] || '#888'}`,
              background: '#fafafa',
            }}
          >
            <summary style={{ cursor: 'pointer' }}>
              <span style={{ color: statusColors[evt.status], fontWeight: 'bold' }}>
                [{evt.status.toUpperCase()}]
              </span>{' '}
              <span style={{ color: evt.source === 'connector' ? '#6366f1' : '#0ea5e9' }}>
                [{evt.source}]
              </span>{' '}
              {evt.operation}
              {evt.durationMs != null && (
                <span style={{ color: '#888' }}> ({evt.durationMs}ms)</span>
              )}
            </summary>
            <div style={{ marginTop: 4, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
              {hasInput(evt) ? (
                <div>
                  <strong>Input:</strong>
                  <pre style={{ background: '#f3f4f6', padding: 4, borderRadius: 3, overflow: 'auto', maxHeight: 200 }}>
                    {JSON.stringify(evt.input, null, 2)}
                  </pre>
                </div>
              ) : null}
              {evt.normalizedResult !== undefined ? (
                <div>
                  <strong>Normalized Result:</strong>
                  <pre style={{ background: '#f0fdf4', padding: 4, borderRadius: 3, overflow: 'auto', maxHeight: 200 }}>
                    {JSON.stringify(evt.normalizedResult, null, 2)}
                  </pre>
                </div>
              ) : null}
              {evt.error ? (
                <div>
                  <strong>Error:</strong>
                  <pre style={{ background: '#fef2f2', padding: 4, borderRadius: 3, color: '#dc2626' }}>
                    {evt.error}
                  </pre>
                </div>
              ) : null}
              {evt.rawResult !== undefined ? (
                <details style={{ marginTop: 4 }}>
                  <summary style={{ cursor: 'pointer', color: '#888' }}>Raw Result</summary>
                  <pre style={{ background: '#f9fafb', padding: 4, borderRadius: 3, overflow: 'auto', maxHeight: 200 }}>
                    {JSON.stringify(evt.rawResult, null, 2)}
                  </pre>
                </details>
              ) : null}
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}
