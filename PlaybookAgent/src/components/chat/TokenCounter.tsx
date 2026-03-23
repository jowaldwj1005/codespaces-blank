import type { TokenUsage } from '../../types/agent';

function formatNumber(n: number): string {
  return n.toLocaleString();
}

export function TokenCounter({ usage }: { usage: TokenUsage }) {
  if (usage.totalTokens === 0) return null;

  return (
    <div className="token-counter">
      <div className="token-counter__item">
        <span>Prompt:</span>
        <span className="token-counter__value">{formatNumber(usage.promptTokens)}</span>
      </div>
      <span className="token-counter__separator">|</span>
      <div className="token-counter__item">
        <span>Completion:</span>
        <span className="token-counter__value">{formatNumber(usage.completionTokens)}</span>
      </div>
      <span className="token-counter__separator">|</span>
      <div className="token-counter__item">
        <span>Total:</span>
        <span className="token-counter__value">{formatNumber(usage.totalTokens)}</span>
      </div>
    </div>
  );
}
