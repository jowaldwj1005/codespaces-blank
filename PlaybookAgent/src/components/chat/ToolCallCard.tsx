import { useState } from 'react';
import type { ToolCall } from '../../types/agent';

interface ToolCallCardProps {
  toolCall: ToolCall;
  status?: string;
  response?: unknown;
}

/** Format a JSON value with syntax highlighting hints */
function formatJson(value: unknown): string {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

/** Extract a short summary from a tool response */
function summarizeResponse(response: unknown): string | null {
  if (response == null) return null;
  if (typeof response === 'string') return response.length > 80 ? response.slice(0, 80) + '...' : response;
  if (typeof response !== 'object') return String(response);

  const obj = response as Record<string, unknown>;

  // Common success pattern
  if (obj.success && obj.message) return String(obj.message);
  if (obj.success && obj.result) {
    const r = obj.result;
    if (typeof r === 'string') return r.length > 80 ? r.slice(0, 80) + '...' : r;
    if (Array.isArray(r)) return `${r.length} items returned`;
    return 'Result returned';
  }
  if (obj.error) return `Error: ${String(obj.error).slice(0, 60)}`;
  if (obj.message) return String(obj.message).slice(0, 80);

  // Data patterns
  if (Array.isArray(obj.data)) return `${obj.data.length} records`;
  if (obj.recordCount !== undefined) return `${obj.recordCount} records found`;
  if (obj.tables && Array.isArray(obj.tables)) return `${obj.tables.length} tables found`;

  return null;
}

export function ToolCallCard({ toolCall, status = 'completed', response }: ToolCallCardProps) {
  const [expanded, setExpanded] = useState(false);

  let parsedArgs: unknown;
  try {
    parsedArgs = JSON.parse(toolCall.function.arguments);
  } catch {
    parsedArgs = toolCall.function.arguments;
  }

  const statusClass = status === 'error' ? 'error'
    : status === 'executing' ? 'executing'
    : status === 'pending' ? 'pending'
    : 'completed';

  const summary = response !== undefined ? summarizeResponse(response) : null;
  const isError = typeof response === 'object' && response !== null && 'error' in (response as Record<string, unknown>);

  return (
    <div className={`tool-call-card ${isError ? 'tool-call-card--error' : ''}`}>
      <button
        className="tool-call-card__header"
        onClick={() => setExpanded(!expanded)}
      >
        <span className="tool-call-card__name">
          {expanded ? '\u25BC' : '\u25B6'} {toolCall.function.name}
        </span>
        {summary && !expanded && (
          <span className="tool-call-card__summary">{summary}</span>
        )}
        <span className={`tool-call-card__status tool-call-card__status--${statusClass}`}>
          {status}
        </span>
      </button>

      {expanded && (
        <div className="tool-call-card__body">
          <div className="tool-call-card__section">
            <div className="tool-call-card__label">Arguments</div>
            <pre className="tool-call-card__json">
              {formatJson(parsedArgs)}
            </pre>
          </div>
          {response !== undefined && (
            <div className="tool-call-card__section">
              <div className="tool-call-card__label">Response</div>
              <pre className={`tool-call-card__json ${isError ? 'tool-call-card__json--error' : ''}`}>
                {formatJson(response)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
