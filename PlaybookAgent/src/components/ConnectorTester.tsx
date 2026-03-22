import { useState } from 'react';
import { useConnectors } from '../hooks/useConnectors';
import { OPENAI_DEFAULTS } from '../services/connectors';

type ConnectorType = 'openai' | 'docint' | 'sap';

export function ConnectorTester() {
  const [connector, setConnector] = useState<ConnectorType>('openai');
  const { result, loading, error, pollingStatus, callOpenAI, callDocIntelligence, callSapOData } = useConnectors();

  // ─── OpenAI defaults ───
  const [chatMessage, setChatMessage] = useState('Hello, who are you?');
  const [maxTokens, setMaxTokens] = useState<number>(OPENAI_DEFAULTS.max_completion_tokens);
  const [temperature, setTemperature] = useState<number>(OPENAI_DEFAULTS.temperature);

  // ─── Doc Intelligence defaults ───
  const [docUrl, setDocUrl] = useState('');

  // ─── SAP defaults ───
  const [sapPath, setSapPath] = useState('');
  const [sapMethod, setSapMethod] = useState<'GET' | 'POST' | 'PATCH' | 'DELETE'>('GET');

  const handleTest = () => {
    switch (connector) {
      case 'openai':
        callOpenAI({
          messages: [
            { role: 'system', content: 'You are a helpful assistant.' },
            { role: 'user', content: chatMessage },
          ],
          temperature,
          max_completion_tokens: maxTokens,
        });
        break;
      case 'docint':
        if (docUrl.trim()) {
          callDocIntelligence({ urlSource: docUrl.trim() });
        }
        break;
      case 'sap':
        if (sapPath.trim()) {
          callSapOData({
            method: sapMethod,
            relativePath: sapPath.trim(),
          });
        }
        break;
    }
  };

  return (
    <div>
      <h3>Connector Tester</h3>

      {/* Connector selector */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        {(
          [
            { value: 'openai', label: 'Azure OpenAI' },
            { value: 'docint', label: 'Document Intelligence' },
            { value: 'sap', label: 'SAP OData' },
          ] as const
        ).map((c) => (
          <button
            key={c.value}
            onClick={() => setConnector(c.value)}
            style={{
              padding: '4px 12px',
              background: connector === c.value ? '#6366f1' : '#e5e7eb',
              color: connector === c.value ? '#fff' : '#333',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer',
            }}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Connector-specific inputs */}
      {connector === 'openai' && (
        <div style={{ marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <label>
            Message:{' '}
            <input
              type="text"
              value={chatMessage}
              onChange={(e) => setChatMessage(e.target.value)}
              style={{ width: 400 }}
            />
          </label>
          <div style={{ display: 'flex', gap: 12 }}>
            <label>
              max_completion_tokens:{' '}
              <input
                type="number"
                value={maxTokens}
                onChange={(e) => setMaxTokens(Number(e.target.value) || 200)}
                style={{ width: 80 }}
                min={1}
                max={16000}
              />
            </label>
            <label>
              temperature:{' '}
              <input
                type="number"
                value={temperature}
                onChange={(e) => setTemperature(Number(e.target.value))}
                style={{ width: 60 }}
                min={0}
                max={2}
                step={0.1}
              />
            </label>
          </div>
        </div>
      )}

      {connector === 'docint' && (
        <div style={{ marginBottom: 12 }}>
          <label>
            Document URL:{' '}
            <input
              type="text"
              value={docUrl}
              onChange={(e) => setDocUrl(e.target.value)}
              placeholder="https://example.com/document.pdf"
              style={{ width: 400 }}
            />
          </label>
          <div style={{ fontSize: 11, color: '#666', marginTop: 4 }}>
            Submits document, then polls for result automatically (up to 60s).
          </div>
        </div>
      )}

      {connector === 'sap' && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center' }}>
          <label>
            Method:{' '}
            <select value={sapMethod} onChange={(e) => setSapMethod(e.target.value as typeof sapMethod)}>
              <option>GET</option>
              <option>POST</option>
              <option>PATCH</option>
              <option>DELETE</option>
            </select>
          </label>
          <label>
            Path:{' '}
            <input
              type="text"
              value={sapPath}
              onChange={(e) => setSapPath(e.target.value)}
              placeholder="/sap/opu/odata/sap/..."
              style={{ width: 350 }}
            />
          </label>
        </div>
      )}

      {/* Execute */}
      <button onClick={handleTest} disabled={loading} style={{ marginBottom: 12 }}>
        {loading ? 'Calling...' : 'Test Connector'}
      </button>

      {/* Polling status */}
      {pollingStatus ? (
        <div style={{ color: '#6366f1', marginBottom: 8 }}>{pollingStatus}</div>
      ) : null}

      {/* Status */}
      {error ? <div style={{ color: '#ef4444', marginBottom: 8 }}>Error: {error}</div> : null}

      {/* Extracted content (Doc Intelligence) */}
      {connector === 'docint' && result != null && typeof result === 'object' && 'content' in (result as Record<string, unknown>) ? (
        <div style={{ marginBottom: 8 }}>
          <strong>Extracted Text:</strong>
          <pre
            style={{
              marginTop: 4,
              padding: 8,
              background: '#f0fdf4',
              borderRadius: 4,
              fontSize: 12,
              overflow: 'auto',
              maxHeight: 300,
              whiteSpace: 'pre-wrap',
            }}
          >
            {(result as Record<string, unknown>).content as string ?? '(no content extracted)'}
          </pre>
        </div>
      ) : null}

      {/* Raw Result */}
      {result != null ? (
        <details style={{ marginTop: 8 }}>
          <summary style={{ cursor: 'pointer', fontWeight: 500 }}>Full Response</summary>
          <pre
            style={{
              marginTop: 4,
              padding: 8,
              background: '#f9fafb',
              borderRadius: 4,
              fontSize: 11,
              overflow: 'auto',
              maxHeight: 400,
            }}
          >
            {JSON.stringify(result, null, 2)}
          </pre>
        </details>
      ) : null}
    </div>
  );
}
