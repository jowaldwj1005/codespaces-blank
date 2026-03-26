/**
 * ConnectorTester — Dedicated test panels for each connector.
 * - Azure OpenAI (Responses API): tool calls, reasoning, pretty JSON output
 * - Doc Intelligence: polling status, markdown rendering
 * - SAP OData: RPC envelope testing
 */

import { useState } from 'react';
import { OPENAI_DEFAULTS } from '../../services/connectors';
import { azureOpenAI, azureDocIntelligence, sapOData } from '../../services/connectors';
import type { ResponsesApiRequest, ResponsesApiResponse, SapODataRequest, AnalyzeDocumentRequest } from '../../services/connectors';

interface DocIntResult {
  status?: string;
  content?: string | null;
  analyzeResult?: Record<string, unknown>;
  operationId?: string | null;
  raw?: Record<string, unknown>;
}

type ConnectorTab = 'openai' | 'docint' | 'sap';

export function ConnectorTester() {
  const [activeTab, setActiveTab] = useState<ConnectorTab>('openai');

  return (
    <div className="ct">
      {/* Tab Bar */}
      <div className="ct__tabs">
        {([
          { id: 'openai' as const, label: 'Azure OpenAI', icon: '\u{1F916}', color: '#8b5cf6' },
          { id: 'docint' as const, label: 'Doc Intelligence', icon: '\u{1F4C4}', color: '#10b981' },
          { id: 'sap' as const, label: 'SAP OData', icon: '\u{1F4E6}', color: '#f59e0b' },
        ]).map(tab => (
          <button
            key={tab.id}
            className={`ct__tab ${activeTab === tab.id ? 'ct__tab--active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
            style={activeTab === tab.id ? { borderBottomColor: tab.color } : undefined}
          >
            <span>{tab.icon}</span> {tab.label}
          </button>
        ))}
      </div>

      {/* Panel Content */}
      <div className="ct__panel">
        {activeTab === 'openai' && <OpenAIPanel />}
        {activeTab === 'docint' && <DocIntPanel />}
        {activeTab === 'sap' && <SapPanel />}
      </div>
    </div>
  );
}

// ─── OpenAI Responses API Panel ──────────────────────────────────────────────

function OpenAIPanel() {
  const [message, setMessage] = useState('Hello! What can you do?');
  const [instructions, setInstructions] = useState('You are a helpful assistant. Use Markdown formatting in your response.');
  const [model, setModel] = useState<string>(OPENAI_DEFAULTS.model);
  const [maxTokens, setMaxTokens] = useState<number>(OPENAI_DEFAULTS.max_output_tokens);
  const [webSearch, setWebSearch] = useState(false);
  const [reasoningEffort, setReasoningEffort] = useState<string>('');
  const [showToolDef, setShowToolDef] = useState(false);
  const [toolJson, setToolJson] = useState('[\n  {\n    "type": "function",\n    "name": "get_weather",\n    "description": "Get current weather for a location",\n    "parameters": {\n      "type": "object",\n      "properties": {\n        "location": { "type": "string", "description": "City name" }\n      },\n      "required": ["location"]\n    }\n  }\n]');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<ResponsesApiResponse | null>(null);
  const [rawResponse, setRawResponse] = useState<unknown>(null);
  const [requestPayload, setRequestPayload] = useState<ResponsesApiRequest | null>(null);

  const handleSend = async () => {
    setLoading(true);
    setError(null);
    setResponse(null);

    const request: ResponsesApiRequest = {
      model,
      instructions: instructions || undefined,
      input: [
        { type: 'message', role: 'user', content: [{ type: 'input_text', text: message }] },
      ],
      max_output_tokens: maxTokens,
      store: true,
    };

    // Add web search
    if (webSearch) {
      request.tools = [{ type: 'web_search', search_context_size: 'medium' }];
    }

    // Add custom tools
    if (showToolDef && toolJson.trim()) {
      try {
        const tools = JSON.parse(toolJson);
        request.tools = [...(request.tools ?? []), ...tools];
      } catch {
        setError('Invalid tool JSON');
        setLoading(false);
        return;
      }
    }

    // Add reasoning
    if (reasoningEffort) {
      request.reasoning = { effort: reasoningEffort as 'low' | 'medium' | 'high', summary: 'auto' };
    }

    setRequestPayload(request);

    try {
      const result = await azureOpenAI.createResponse(request);
      setResponse(result.normalized);
      setRawResponse(result.raw);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  // Extract output items for display
  const outputItems = response?.output ?? [];
  const reasoningItems = outputItems.filter(i => i.type === 'reasoning');
  const messageItems = outputItems.filter(i => i.type === 'message');
  const functionCalls = outputItems.filter(i => i.type === 'function_call');
  const webSearchItems = outputItems.filter(i => i.type === 'web_search_call');

  return (
    <div className="ct-openai">
      {/* Config */}
      <div className="ct-config">
        <div className="ct-config__row">
          <label className="ct-label">
            Model
            <input className="ct-input" value={model} onChange={e => setModel(e.target.value)} />
          </label>
          <label className="ct-label">
            Max Tokens
            <input className="ct-input ct-input--sm" type="number" value={maxTokens} onChange={e => setMaxTokens(Number(e.target.value))} min={1} max={16000} />
          </label>
          <label className="ct-label">
            Reasoning
            <select className="ct-select" value={reasoningEffort} onChange={e => setReasoningEffort(e.target.value)}>
              <option value="">None</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </label>
        </div>

        <label className="ct-label">
          Instructions (system prompt)
          <textarea className="ct-textarea ct-textarea--sm" value={instructions} onChange={e => setInstructions(e.target.value)} rows={2} />
        </label>

        <div className="ct-config__toggles">
          <label className="ct-toggle">
            <input type="checkbox" checked={webSearch} onChange={e => setWebSearch(e.target.checked)} />
            Web Search
          </label>
          <label className="ct-toggle">
            <input type="checkbox" checked={showToolDef} onChange={e => setShowToolDef(e.target.checked)} />
            Custom Tools
          </label>
        </div>

        {showToolDef && (
          <label className="ct-label">
            Tool Definitions (JSON array)
            <textarea className="ct-textarea ct-textarea--code" value={toolJson} onChange={e => setToolJson(e.target.value)} rows={8} />
          </label>
        )}

        <label className="ct-label">
          Message
          <div className="ct-message-row">
            <textarea className="ct-textarea" value={message} onChange={e => setMessage(e.target.value)} rows={3} placeholder="Type your message..." />
            <button className="ct-send-btn" onClick={handleSend} disabled={loading || !message.trim()}>
              {loading ? 'Sending...' : 'Send'}
            </button>
          </div>
        </label>
      </div>

      {/* Error */}
      {error && <div className="ct-error">{error}</div>}

      {/* Response Display */}
      {response && (
        <div className="ct-response">
          {/* Status bar */}
          <div className="ct-response__status">
            <span className={`ct-badge ct-badge--${response.status === 'completed' ? 'green' : 'red'}`}>
              {response.status}
            </span>
            <span className="ct-response__id">ID: {response.id}</span>
            {response.usage && (
              <span className="ct-response__tokens">
                In: {response.usage.input_tokens} | Out: {response.usage.output_tokens}
                {response.usage.output_tokens_details?.reasoning_tokens
                  ? ` (${response.usage.output_tokens_details.reasoning_tokens} reasoning)`
                  : ''}
                {response.usage.input_tokens_details?.cached_tokens
                  ? ` | Cached: ${response.usage.input_tokens_details.cached_tokens}`
                  : ''}
              </span>
            )}
          </div>

          {/* Reasoning */}
          {reasoningItems.length > 0 && (
            <div className="ct-section">
              <div className="ct-section__header ct-section__header--amber">Chain of Thought</div>
              {reasoningItems.map((item, i) => (
                <div key={i} className="ct-reasoning">
                  {(item as { summary?: Array<{ text?: string; type?: string }> }).summary?.map((s, j) => (
                    <div key={j} className="ct-reasoning__text">{s.text}</div>
                  ))}
                </div>
              ))}
            </div>
          )}

          {/* Web Search */}
          {webSearchItems.length > 0 && (
            <div className="ct-section">
              <div className="ct-section__header ct-section__header--blue">Web Search</div>
              {webSearchItems.map((item, i) => {
                const ws = item as { id: string; status?: string; action?: Record<string, unknown> };
                return (
                  <div key={i} className="ct-websearch">
                    <span className="ct-badge ct-badge--blue">{ws.status}</span>
                    <pre className="ct-json ct-json--sm">{JSON.stringify(ws.action, null, 2)}</pre>
                  </div>
                );
              })}
            </div>
          )}

          {/* Function Calls */}
          {functionCalls.length > 0 && (
            <div className="ct-section">
              <div className="ct-section__header ct-section__header--purple">Function Calls</div>
              {functionCalls.map((item, i) => {
                const fc = item as { name?: string; call_id?: string; arguments?: string; status?: string };
                let parsedArgs: unknown;
                try { parsedArgs = JSON.parse(fc.arguments ?? '{}'); } catch { parsedArgs = fc.arguments; }
                return (
                  <div key={i} className="ct-function-call">
                    <div className="ct-function-call__header">
                      <code className="ct-function-call__name">{fc.name}</code>
                      <span className="ct-badge ct-badge--purple">{fc.status}</span>
                      <span className="ct-function-call__id">{fc.call_id}</span>
                    </div>
                    <pre className="ct-json">{JSON.stringify(parsedArgs, null, 2)}</pre>
                  </div>
                );
              })}
            </div>
          )}

          {/* Assistant Message */}
          {messageItems.length > 0 && (
            <div className="ct-section">
              <div className="ct-section__header">Assistant Response</div>
              {messageItems.map((item, i) => {
                const msg = item as { content?: Array<{ type?: string; text?: string; annotations?: unknown[] }> };
                return (
                  <div key={i} className="ct-message-output">
                    {msg.content?.map((c, j) => (
                      <div key={j}>
                        {c.type === 'output_text' && (
                          <div className="ct-message-output__text">{c.text}</div>
                        )}
                        {c.annotations && c.annotations.length > 0 && (
                          <div className="ct-citations">
                            <strong>Citations:</strong>
                            {(c.annotations as Array<{ type?: string; url?: string; title?: string }>)
                              .filter(a => a.type === 'url_citation')
                              .map((a, k) => (
                                <div key={k} className="ct-citation">
                                  <span className="ct-citation__title">{a.title ?? a.url}</span>
                                  <code className="ct-citation__url">{a.url}</code>
                                </div>
                              ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          )}

          {/* Raw JSON panels */}
          <div className="ct-raw-panels">
            <details className="ct-raw-details">
              <summary>Request Payload</summary>
              <pre className="ct-json">{JSON.stringify(requestPayload, null, 2)}</pre>
            </details>
            <details className="ct-raw-details">
              <summary>Normalized Response</summary>
              <pre className="ct-json">{JSON.stringify(response, null, 2)}</pre>
            </details>
            <details className="ct-raw-details">
              <summary>Raw SDK Response</summary>
              <pre className="ct-json">{JSON.stringify(rawResponse, null, 2)}</pre>
            </details>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Doc Intelligence Panel ──────────────────────────────────────────────────

function DocIntPanel() {
  const [docUrl, setDocUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pollingStatus, setPollingStatus] = useState<string | null>(null);
  const [result, setResult] = useState<DocIntResult | null>(null);
  const handleAnalyze = async () => {
    if (!docUrl.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setPollingStatus('Submitting document...');

    try {
      setPollingStatus('Analyzing document (polling every 2s)...');
      const response = await azureDocIntelligence.analyzeAndWait(
        { urlSource: docUrl.trim() } as AnalyzeDocumentRequest,
      );
      setResult(response as DocIntResult);
      if (response.status === 'failed') setError('Analysis failed');
      if (response.status === 'timeout') setError('Polling timed out');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
      setPollingStatus(null);
    }
  };

  const handleSubmitOnly = async () => {
    if (!docUrl.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setPollingStatus(null);

    try {
      const response = await azureDocIntelligence.analyzeDocument(
        { urlSource: docUrl.trim() } as AnalyzeDocumentRequest,
      );
      setResult({ operationId: response.operationId, status: 'submitted', raw: response as Record<string, unknown> });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ct-docint">
      <div className="ct-config">
        <label className="ct-label">
          Document URL
          <input className="ct-input" value={docUrl} onChange={e => setDocUrl(e.target.value)}
            placeholder="https://example.com/document.pdf" />
        </label>
        <div className="ct-config__info">
          Features: ocrHighResolution | Output: markdown | Auto-polls until complete (up to 60s)
        </div>
        <div className="ct-config__actions">
          <button className="ct-send-btn" onClick={handleAnalyze} disabled={loading || !docUrl.trim()}>
            {loading ? 'Processing...' : 'Analyze & Wait'}
          </button>
          <button className="ct-btn ct-btn--secondary" onClick={handleSubmitOnly} disabled={loading || !docUrl.trim()}>
            Submit Only
          </button>
        </div>
      </div>

      {/* Polling Status */}
      {pollingStatus && (
        <div className="ct-polling">
          <div className="ct-polling__spinner" />
          <span>{pollingStatus}</span>
        </div>
      )}

      {error && <div className="ct-error">{error}</div>}

      {result && (
        <div className="ct-response">
          {/* Status */}
          <div className="ct-response__status">
            <span className={`ct-badge ct-badge--${result.status === 'succeeded' ? 'green' : result.status === 'failed' ? 'red' : 'amber'}`}>
              {result.status}
            </span>
            {result.operationId && <span className="ct-response__id">Op: {result.operationId}</span>}
          </div>

          {/* Rendered Content */}
          {result.content && (
            <div className="ct-section">
              <div className="ct-section__header ct-section__header--green">Extracted Content</div>
              <div
                className="ct-docint__rendered"
                dangerouslySetInnerHTML={{ __html: markdownToHtml(result.content) }}
              />
            </div>
          )}

          {/* Raw Content */}
          {result.content && (
            <details className="ct-raw-details">
              <summary>Raw Markdown</summary>
              <pre className="ct-json">{result.content}</pre>
            </details>
          )}

          {/* analyzeResult */}
          {result.analyzeResult && (
            <details className="ct-raw-details">
              <summary>analyzeResult (full)</summary>
              <pre className="ct-json">{JSON.stringify(result.analyzeResult, null, 2)}</pre>
            </details>
          )}

          {/* Raw SDK */}
          <details className="ct-raw-details">
            <summary>Raw SDK Response</summary>
            <pre className="ct-json">{JSON.stringify(result.raw, null, 2)}</pre>
          </details>
        </div>
      )}
    </div>
  );
}

// ─── SAP OData Panel ─────────────────────────────────────────────────────────

function SapPanel() {
  const [method, setMethod] = useState<'GET' | 'POST' | 'PATCH' | 'DELETE'>('GET');
  const [path, setPath] = useState('');
  const [queryString, setQueryString] = useState('');
  const [body, setBody] = useState('');
  const [headers, setHeaders] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<unknown>(null);

  const handleExecute = async () => {
    if (!path.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);

    const request: SapODataRequest = {
      method,
      relativePath: path.trim(),
    };
    if (queryString.trim()) request.queryString = queryString.trim();
    if (body.trim()) {
      try { request.body = JSON.parse(body.trim()); }
      catch { request.body = body.trim(); }
    }
    if (headers.trim()) {
      try { request.headers = JSON.parse(headers.trim()); }
      catch { /* ignore */ }
    }

    try {
      const response = await sapOData.execute(request);
      setResult(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ct-sap">
      <div className="ct-config">
        <div className="ct-config__info ct-config__info--amber">
          Connector sends POST to Power Automate flow. The <code>method</code> field tells the flow which HTTP verb to use against SAP.
        </div>

        <div className="ct-config__row">
          <label className="ct-label">
            Method
            <select className="ct-select" value={method} onChange={e => setMethod(e.target.value as typeof method)}>
              <option>GET</option>
              <option>POST</option>
              <option>PATCH</option>
              <option>DELETE</option>
            </select>
          </label>
          <label className="ct-label ct-label--grow">
            Relative Path
            <input className="ct-input" value={path} onChange={e => setPath(e.target.value)}
              placeholder="/API_SALES_ORDER_SRV/A_SalesOrder" />
          </label>
        </div>

        <label className="ct-label">
          Query String
          <input className="ct-input" value={queryString} onChange={e => setQueryString(e.target.value)}
            placeholder="$top=10&$filter=SalesOrder eq '123'" />
        </label>

        <label className="ct-label">
          Body (JSON)
          <textarea className="ct-textarea ct-textarea--code" value={body} onChange={e => setBody(e.target.value)}
            placeholder='{"key": "value"}' rows={3} />
        </label>

        <details>
          <summary className="ct-details-toggle">Headers (JSON) — may not be supported</summary>
          <textarea className="ct-textarea ct-textarea--code" value={headers} onChange={e => setHeaders(e.target.value)}
            placeholder='{"X-Custom": "value"}' rows={2} />
        </details>

        <button className="ct-send-btn" onClick={handleExecute} disabled={loading || !path.trim()}>
          {loading ? 'Executing...' : 'Execute'}
        </button>
      </div>

      {error && <div className="ct-error">{error}</div>}

      {result != null && (
        <div className="ct-response">
          <div className="ct-section__header">Response</div>
          <pre className="ct-json">{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}

// ─── Markdown Helpers ────────────────────────────────────────────────────────

function markdownToHtml(md: string): string {
  return md
    .split('\n')
    .map(line => {
      if (line.startsWith('# ')) return `<h2>${esc(line.slice(2))}</h2>`;
      if (line.startsWith('## ')) return `<h3>${esc(line.slice(3))}</h3>`;
      if (line.startsWith('### ')) return `<h4>${esc(line.slice(4))}</h4>`;
      if (/^<\/?t[rdh]/.test(line.trim()) || /^<\/?table/.test(line.trim())) return line;
      if (line.trim() === '') return '<br/>';
      if (line.trim().startsWith('<!--')) return `<div style="color:#999;font-size:11px">${esc(line)}</div>`;
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
