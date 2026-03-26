import { useState } from 'react';
import type { ToolCall, CreateVisualInput } from '../../types/agent';
import { VisualizationCard } from './VisualizationCard';

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
function summarizeResponse(response: unknown, toolName: string): string | null {
  if (response == null) return null;
  if (typeof response === 'string') return response.length > 80 ? response.slice(0, 80) + '...' : response;
  if (typeof response !== 'object') return String(response);

  const obj = response as Record<string, unknown>;

  // Tool-specific summaries
  if (toolName === 'create_visual' && obj.visualId) return `Chart created: ${obj.chartType ?? 'chart'}`;
  if (toolName === 'run_data_code' && obj.success) return 'Code executed successfully';

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

// ─── Terminal Display for run_data_code ──────────────────────────────────────

function TerminalDisplay({ args, response }: { args: Record<string, unknown>; response: Record<string, unknown> }) {
  const code = (args.code as string) ?? '';
  const logs = (response.logs as string[]) ?? [];
  const result = response.result;
  const error = response.error as string | undefined;
  const duration = response.durationMs as number | undefined;

  return (
    <div className="tool-call-card__terminal">
      <div className="tool-call-card__terminal-header">
        <span className="tool-call-card__terminal-dot tool-call-card__terminal-dot--red" />
        <span className="tool-call-card__terminal-dot tool-call-card__terminal-dot--yellow" />
        <span className="tool-call-card__terminal-dot tool-call-card__terminal-dot--green" />
        <span className="tool-call-card__terminal-title">Code Execution</span>
        {duration !== undefined && (
          <span className="tool-call-card__terminal-duration">{duration}ms</span>
        )}
      </div>
      <pre className="tool-call-card__terminal-input">{code}</pre>
      {logs.length > 0 && (
        <div className="tool-call-card__terminal-output">
          <div className="tool-call-card__terminal-label">console.log</div>
          {logs.map((log, i) => (
            <pre key={i} className="tool-call-card__terminal-log">{log}</pre>
          ))}
        </div>
      )}
      {result !== undefined && !error && (
        <div className="tool-call-card__terminal-output">
          <div className="tool-call-card__terminal-label">Return value</div>
          <pre className="tool-call-card__terminal-result">
            {typeof result === 'string' ? result : JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
      {error && (
        <div className="tool-call-card__terminal-error">
          <div className="tool-call-card__terminal-label">Error</div>
          <pre>{error}</pre>
        </div>
      )}
    </div>
  );
}

// ─── Inline Visualization for create_visual ─────────────────────────────────

function VisualDisplay({ args }: { args: Record<string, unknown> }) {
  const input: CreateVisualInput = {
    chartType: (args.chartType ?? 'bar') as CreateVisualInput['chartType'],
    title: (args.title ?? 'Chart') as string,
    data: (args.data ?? []) as Record<string, unknown>[],
    xAxisKey: args.xAxisKey as string | undefined,
    yAxisKey: args.yAxisKey as string | string[] | undefined,
    colors: args.colors as string[] | undefined,
    options: args.options as CreateVisualInput['options'],
  };

  return <VisualizationCard input={input} />;
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function ToolCallCard({ toolCall, status = 'completed', response }: ToolCallCardProps) {
  const [expanded, setExpanded] = useState(false);
  const toolName = toolCall.function.name;

  let parsedArgs: Record<string, unknown>;
  try {
    parsedArgs = JSON.parse(toolCall.function.arguments);
  } catch {
    parsedArgs = { _raw: toolCall.function.arguments };
  }

  const statusClass = status === 'error' ? 'error'
    : status === 'executing' ? 'executing'
    : status === 'pending' ? 'pending'
    : 'completed';

  const summary = response !== undefined ? summarizeResponse(response, toolName) : null;
  const isError = typeof response === 'object' && response !== null && 'error' in (response as Record<string, unknown>);

  // Determine if this tool has a special inline display
  const hasVisual = toolName === 'create_visual' && status === 'completed' && !isError;
  const hasTerminal = toolName === 'run_data_code' && status === 'completed' && response != null;

  return (
    <div className={`tool-call-card ${isError ? 'tool-call-card--error' : ''}`}>
      <button
        className="tool-call-card__header"
        onClick={() => setExpanded(!expanded)}
      >
        <span className="tool-call-card__name">
          {expanded ? '\u25BC' : '\u25B6'} {toolName}
        </span>
        {summary && !expanded && (
          <span className="tool-call-card__summary">{summary}</span>
        )}
        <span className={`tool-call-card__status tool-call-card__status--${statusClass}`}>
          {status}
        </span>
      </button>

      {/* Inline visualization — always shown when available */}
      {hasVisual && <VisualDisplay args={parsedArgs} />}

      {/* Terminal display — always shown when available */}
      {hasTerminal && <TerminalDisplay args={parsedArgs} response={response as Record<string, unknown>} />}

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
