import { useState } from 'react';
import { useConnectors } from '../hooks/useConnectors';

type ConnectorType = 'openai' | 'docint' | 'sap';

export function ConnectorTester() {
  const [connector, setConnector] = useState<ConnectorType>('openai');
  const { result, loading, error, callOpenAI, callDocIntelligence, callSapOData } = useConnectors();

  // ─── OpenAI defaults ───
  const [chatMessage, setChatMessage] = useState('Hello, who are you?');

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
          temperature: 0.7,
          max_tokens: 200,
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
        <div style={{ marginBottom: 12 }}>
          <label>
            Message:{' '}
            <input
              type="text"
              value={chatMessage}
              onChange={(e) => setChatMessage(e.target.value)}
              style={{ width: 400 }}
            />
          </label>
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

      {/* Status */}
      {error && <div style={{ color: '#ef4444', marginBottom: 8 }}>Error: {error}</div>}

      {/* Result */}
      {result != null ? (
        <details open style={{ marginTop: 8 }}>
          <summary style={{ cursor: 'pointer', fontWeight: 500 }}>Response</summary>
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
