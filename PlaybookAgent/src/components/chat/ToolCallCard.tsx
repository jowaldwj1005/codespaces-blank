import { useState } from 'react';
import type { ToolCall } from '../../types/agent';

interface ToolCallCardProps {
  toolCall: ToolCall;
  status?: string;
  response?: unknown;
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

  return (
    <div className="tool-call-card">
      <button
        className="tool-call-card__header"
        onClick={() => setExpanded(!expanded)}
      >
        <span className="tool-call-card__name">
          {expanded ? '▼' : '▶'} {toolCall.function.name}
        </span>
        <span className={`tool-call-card__status tool-call-card__status--${statusClass}`}>
          {status}
        </span>
      </button>

      {expanded && (
        <div className="tool-call-card__body">
          <div className="tool-call-card__section">
            <div className="tool-call-card__label">Arguments</div>
            <pre className="tool-call-card__json">
              {JSON.stringify(parsedArgs, null, 2)}
            </pre>
          </div>
          {response !== undefined && (
            <div className="tool-call-card__section">
              <div className="tool-call-card__label">Response</div>
              <pre className="tool-call-card__json">
                {typeof response === 'string' ? response : JSON.stringify(response, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
