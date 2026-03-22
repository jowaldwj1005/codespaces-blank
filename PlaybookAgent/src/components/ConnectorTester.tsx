import { useState } from 'react';
import { useConnectors } from '../hooks/useConnectors';
import { OPENAI_DEFAULTS } from '../services/connectors';

type ConnectorType = 'openai' | 'docint' | 'sap';

interface DocIntResult {
  operationId?: string | null;
  status?: string;
  content?: string | null;
  analyzeResult?: unknown;
  raw?: unknown;
}

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

  // Type-narrow the doc intelligence result
  const docResult: DocIntResult | null =
    connector === 'docint' && result != null && typeof result === 'object'
      ? (result as DocIntResult)
      : null;

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
            Features: ocrHighResolution | Output: markdown | Auto-polls until complete (up to 60s).
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

      {/* ─── Doc Intelligence: rendered content ─── */}
      {docResult != null ? (
        <div>
          {/* Status badge */}
          <div style={{ marginBottom: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{
              padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600,
              background: docResult.status === 'succeeded' ? '#d1fae5' : docResult.status === 'failed' ? '#fef2f2' : '#fef3c7',
              color: docResult.status === 'succeeded' ? '#065f46' : docResult.status === 'failed' ? '#991b1b' : '#92400e',
            }}>
              {docResult.status ?? 'unknown'}
            </span>
            {docResult.operationId ? (
              <span style={{ fontSize: 11, color: '#888' }}>ID: {docResult.operationId}</span>
            ) : null}
          </div>

          {/* Rendered markdown content */}
          {docResult.content ? (
            <div style={{ marginBottom: 8 }}>
              <strong>Extracted Content (rendered):</strong>
              <div
                style={{
                  marginTop: 4,
                  padding: 12,
                  background: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: 4,
                  maxHeight: 400,
                  overflow: 'auto',
                  fontSize: 13,
                  lineHeight: 1.6,
                }}
                dangerouslySetInnerHTML={{ __html: markdownToHtml(docResult.content) }}
              />
            </div>
          ) : null}

          {/* Raw content string */}
          {docResult.content ? (
            <details style={{ marginBottom: 8 }}>
              <summary style={{ cursor: 'pointer', fontWeight: 500 }}>Raw Content (text)</summary>
              <pre style={{
                marginTop: 4, padding: 8, background: '#f0fdf4', borderRadius: 4,
                fontSize: 11, overflow: 'auto', maxHeight: 300, whiteSpace: 'pre-wrap',
              }}>
                {docResult.content}
              </pre>
            </details>
          ) : null}

          {/* Full analyzeResult */}
          {docResult.analyzeResult != null ? (
            <details style={{ marginBottom: 8 }}>
              <summary style={{ cursor: 'pointer', fontWeight: 500 }}>analyzeResult (full)</summary>
              <pre style={{
                marginTop: 4, padding: 8, background: '#f9fafb', borderRadius: 4,
                fontSize: 11, overflow: 'auto', maxHeight: 300,
              }}>
                {JSON.stringify(docResult.analyzeResult, null, 2)}
              </pre>
            </details>
          ) : null}

          {/* Raw response */}
          <details>
            <summary style={{ cursor: 'pointer', fontWeight: 500, color: '#888' }}>Raw SDK Response</summary>
            <pre style={{
              marginTop: 4, padding: 8, background: '#f9fafb', borderRadius: 4,
              fontSize: 11, overflow: 'auto', maxHeight: 300,
            }}>
              {JSON.stringify(docResult.raw, null, 2)}
            </pre>
          </details>
        </div>
      ) : null}

      {/* ─── Non-DocInt: generic result ─── */}
      {connector !== 'docint' && result != null ? (
        <details open style={{ marginTop: 8 }}>
          <summary style={{ cursor: 'pointer', fontWeight: 500 }}>Response</summary>
          <pre
            style={{
              marginTop: 4, padding: 8, background: '#f9fafb', borderRadius: 4,
              fontSize: 11, overflow: 'auto', maxHeight: 400,
            }}
          >
            {JSON.stringify(result, null, 2)}
          </pre>
        </details>
      ) : null}
    </div>
  );
}

/**
 * Minimal markdown-to-HTML converter for Doc Intelligence output.
 * Handles: headings, tables (passthrough), paragraphs, bold, newlines.
 * Doc Intelligence returns actual <table> HTML in its markdown output.
 */
function markdownToHtml(md: string): string {
  return md
    .split('\n')
    .map((line) => {
      // Headings
      if (line.startsWith('# ')) return `<h2>${esc(line.slice(2))}</h2>`;
      if (line.startsWith('## ')) return `<h3>${esc(line.slice(3))}</h3>`;
      if (line.startsWith('### ')) return `<h4>${esc(line.slice(4))}</h4>`;
      // HTML table tags — pass through as-is
      if (/^<\/?t[rdh]/.test(line.trim()) || /^<\/?table/.test(line.trim())) return line;
      // Empty line
      if (line.trim() === '') return '<br/>';
      // HTML comments (page footers etc) — pass through
      if (line.trim().startsWith('<!--')) return `<div style="color:#999;font-size:11px">${esc(line)}</div>`;
      // Regular paragraph
      return `<p style="margin:2px 0">${esc(line)}</p>`;
    })
    .join('\n');
}

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
}
