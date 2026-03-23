import { useState } from 'react';

interface SubAgentCardProps {
  agentName: string;
  task: string;
  status: 'running' | 'completed' | 'error';
  result?: string;
  messageCount?: number;
  toolCallCount?: number;
}

export function SubAgentCard({
  agentName,
  task,
  status,
  result,
  messageCount = 0,
  toolCallCount = 0,
}: SubAgentCardProps) {
  const [expanded, setExpanded] = useState(false);

  const statusLabel = status === 'running' ? 'Running...'
    : status === 'completed' ? 'Completed'
    : 'Error';

  return (
    <div className="sub-agent-card">
      <button
        className="sub-agent-card__header"
        onClick={() => setExpanded(!expanded)}
      >
        <span className="sub-agent-card__name">
          {expanded ? '▼' : '▶'} Sub-Agent: {agentName}
        </span>
        <span className={`tool-call-card__status tool-call-card__status--${status === 'running' ? 'executing' : status === 'completed' ? 'completed' : 'error'}`}>
          {statusLabel}
        </span>
      </button>

      {expanded && (
        <div className="sub-agent-card__body">
          <div style={{ marginBottom: 8, color: 'var(--color-text-secondary)' }}>
            <strong>Task:</strong> {task}
          </div>
          <div style={{ marginBottom: 8, fontSize: 12, color: 'var(--color-text-tertiary)' }}>
            {messageCount} messages, {toolCallCount} tool calls
          </div>
          {result && (
            <div style={{
              padding: 8,
              background: 'var(--color-bg-secondary)',
              borderRadius: 'var(--radius-sm)',
              fontSize: 13,
            }}>
              <strong>Result:</strong> {result}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
