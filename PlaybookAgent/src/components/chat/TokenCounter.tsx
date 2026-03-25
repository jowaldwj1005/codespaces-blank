import { useState } from 'react';
import type { TokenUsage } from '../../types/agent';

function formatNumber(n: number): string {
  return n.toLocaleString();
}

export function TokenCounter({ usage }: { usage: TokenUsage }) {
  const [expanded, setExpanded] = useState(false);
  if (usage.totalTokens === 0) return null;

  const hasReasoning = (usage.reasoningTokens ?? 0) > 0;
  const hasCached = (usage.cachedTokens ?? 0) > 0;
  const hasExtended = hasReasoning || hasCached;

  return (
    <div
      className="token-counter"
      onClick={() => hasExtended && setExpanded(!expanded)}
      style={{ cursor: hasExtended ? 'pointer' : 'default' }}
      title={hasExtended ? 'Click for token breakdown' : undefined}
    >
      <div className="token-counter__item">
        <span>Prompt:</span>
        <span className="token-counter__value">
          {formatNumber(usage.promptTokens)}
          {hasCached && (
            <span className="token-counter__badge token-counter__badge--cached" title="Cached (free)">
              {formatNumber(usage.cachedTokens!)} cached
            </span>
          )}
        </span>
      </div>
      <span className="token-counter__separator">|</span>
      <div className="token-counter__item">
        <span>Completion:</span>
        <span className="token-counter__value">
          {formatNumber(usage.completionTokens)}
          {hasReasoning && expanded && (
            <span className="token-counter__badge token-counter__badge--reasoning" title="Reasoning tokens">
              {formatNumber(usage.reasoningTokens!)} reasoning
            </span>
          )}
        </span>
      </div>
      <span className="token-counter__separator">|</span>
      <div className="token-counter__item">
        <span>Total:</span>
        <span className="token-counter__value">{formatNumber(usage.totalTokens)}</span>
      </div>
    </div>
  );
}
