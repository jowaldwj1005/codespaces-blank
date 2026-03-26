import { useState, useEffect, useMemo } from 'react';
import type { ChatMessage } from '../../types/agent';

// ─── Markdown Renderer ───────────────────────────────────────────────────────

/** Parse markdown to HTML with syntax highlighting hints */
function renderMarkdown(text: string): string {
  if (!text) return '';

  // Escape HTML first
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Code blocks with language tag
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_match, lang, code) => {
    const langClass = lang ? ` data-lang="${lang}"` : '';
    const langLabel = lang ? `<span class="md-code-lang">${lang}</span>` : '';
    return `${langLabel}<pre class="md-code-block"${langClass}><code>${code.trim()}</code></pre>`;
  });

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code class="md-inline-code">$1</code>');

  // Headers (h1-h3)
  html = html.replace(/^### (.+)$/gm, '<h4 class="md-h4">$1</h4>');
  html = html.replace(/^## (.+)$/gm, '<h3 class="md-h3">$1</h3>');
  html = html.replace(/^# (.+)$/gm, '<h2 class="md-h2">$1</h2>');

  // Bold & italic
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

  // Strikethrough
  html = html.replace(/~~(.+?)~~/g, '<del>$1</del>');

  // Links (sanitize: only allow http/https/mailto — block javascript: etc.)
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, label, url) => {
    const safeUrl = /^(https?:\/\/|mailto:|#)/.test(url) ? url : '#';
    return `<a href="${safeUrl}" target="_blank" rel="noopener noreferrer" class="md-link">${label}</a>`;
  });

  // Blockquotes
  html = html.replace(/^&gt; (.+)$/gm, '<blockquote class="md-blockquote">$1</blockquote>');

  // Horizontal rules
  html = html.replace(/^---$/gm, '<hr class="md-hr" />');

  // Unordered lists
  html = html.replace(/^[*-] (.+)$/gm, '<li class="md-li">$1</li>');
  html = html.replace(/((?:<li class="md-li">.*<\/li>\n?)+)/g, '<ul class="md-ul">$1</ul>');

  // Ordered lists
  html = html.replace(/^\d+\. (.+)$/gm, '<li class="md-oli">$1</li>');
  html = html.replace(/((?:<li class="md-oli">.*<\/li>\n?)+)/g, '<ol class="md-ol">$1</ol>');

  // Tables (GFM)
  html = html.replace(/^(\|.+\|)\n(\|[-| :]+\|)\n((?:\|.+\|\n?)+)/gm, (_match, header, _sep, body) => {
    const ths = (header as string).split('|').filter(Boolean).map((c: string) => `<th>${c.trim()}</th>`).join('');
    const rows = (body as string).trim().split('\n').map((row: string) => {
      const tds = row.split('|').filter(Boolean).map((c: string) => `<td>${c.trim()}</td>`).join('');
      return `<tr>${tds}</tr>`;
    }).join('');
    return `<table class="md-table"><thead><tr>${ths}</tr></thead><tbody>${rows}</tbody></table>`;
  });

  // Paragraphs (double newline)
  html = html.replace(/\n\n/g, '</p><p class="md-p">');

  // Single newlines to <br>
  html = html.replace(/\n/g, '<br/>');

  return `<p class="md-p">${html}</p>`;
}

// ─── Streaming Simulator ─────────────────────────────────────────────────────

/**
 * Module-level set of message IDs that have already been streamed.
 * Survives component unmount/remount (tab switches) so messages don't re-stream.
 */
const _streamedMessages = new Set<string>();

/** Simulates streaming by revealing content progressively. Only for genuinely new messages. */
function useStreamingText(text: string, isNew: boolean, speed = 4): { displayed: string; done: boolean } {
  const [charIndex, setCharIndex] = useState(isNew ? 0 : text.length);

  useEffect(() => {
    if (!isNew || charIndex >= text.length) return;

    // Fast adaptive speed: minimal delays for whitespace
    const nextChar = text[charIndex];
    const delay = nextChar === '\n' ? 8 : nextChar === ' ' ? speed * 0.2 : speed;

    // Advance in bigger chunks for fast rendering
    const chunkSize = text.length > 300 ? 5 : text.length > 100 ? 3 : 2;

    const timeout = setTimeout(() => {
      setCharIndex(prev => Math.min(prev + chunkSize, text.length));
    }, delay);

    return () => clearTimeout(timeout);
  }, [charIndex, text, isNew, speed]);

  // Reset if text changes (only for new messages)
  useEffect(() => {
    if (isNew) setCharIndex(0);
  }, [text, isNew]);

  return {
    displayed: text.slice(0, charIndex),
    done: charIndex >= text.length,
  };
}

// ─── Reasoning Thought Bubble ────────────────────────────────────────────────

function ReasoningBubble({ content }: { content: string }) {
  const [expanded, setExpanded] = useState(false);
  const preview = content.length > 120 ? content.slice(0, 120) + '...' : content;

  return (
    <div className="reasoning-bubble" onClick={() => setExpanded(!expanded)}>
      <div className="reasoning-bubble__header">
        <span className="reasoning-bubble__icon">&#x1f9e0;</span>
        <span className="reasoning-bubble__label">Reasoning</span>
        <span className="reasoning-bubble__toggle">{expanded ? 'hide' : 'show'}</span>
      </div>
      <div className={`reasoning-bubble__content ${expanded ? 'reasoning-bubble__content--expanded' : ''}`}>
        {expanded ? content : preview}
      </div>
    </div>
  );
}

// ─── Message Bubble Component ────────────────────────────────────────────────

export function MessageBubble({ message }: { message: ChatMessage }) {
  if (message.role === 'system') {
    return (
      <div className="message message--system">
        <div className="message__content">{message.content}</div>
      </div>
    );
  }

  if (message.role === 'tool') {
    return null;
  }

  const isUser = message.role === 'user';
  const isAssistant = message.role === 'assistant';

  // Generate stable message ID for tracking — survives tab switches via module-level Set
  const msgId = useMemo(() => {
    const content = message.content ?? '';
    return `${message.role}-${content.slice(0, 50)}-${content.length}`;
  }, [message.role, message.content]);

  // Only stream genuinely new assistant messages (module-level set survives remount)
  const isNew = isAssistant && !_streamedMessages.has(msgId);
  const { displayed, done } = useStreamingText(message.content ?? '', isNew);

  useEffect(() => {
    if (done && isAssistant) {
      _streamedMessages.add(msgId);
      // Bound the set to prevent unbounded growth
      if (_streamedMessages.size > 500) {
        const entries = Array.from(_streamedMessages);
        _streamedMessages.clear();
        for (const e of entries.slice(-250)) _streamedMessages.add(e);
      }
    }
  }, [done, msgId, isAssistant]);


  // Parse markdown only AFTER streaming completes — partial markdown creates broken HTML
  const isStreaming = isNew && !done;
  const renderedHtml = useMemo(() => {
    if (!isAssistant || isStreaming) return null;
    return renderMarkdown(message.content ?? '');
  }, [message.content, isAssistant, isStreaming]);

  return (
    <div className={`message message--${message.role} ${isStreaming ? 'message--streaming' : ''}`}>
      <div className={`message__avatar message__avatar--${message.role}`}>
        {isUser ? 'U' : 'A'}
      </div>
      <div className="message__content-wrapper">
        {/* Reasoning thought bubble (o-series models) */}
        {isAssistant && message.reasoning_content && (
          <ReasoningBubble content={message.reasoning_content} />
        )}

        {/* During streaming: plain text. After done: full markdown. */}
        {isAssistant && isStreaming ? (
          <div className="message__content message__content--streaming">
            {displayed}
          </div>
        ) : isAssistant && renderedHtml ? (
          <div
            className="message__content message__content--markdown"
            dangerouslySetInnerHTML={{ __html: renderedHtml }}
          />
        ) : (
          <div className="message__content">
            {message.content || '(no content)'}
          </div>
        )}

        {/* URL Citations from web search */}
        {isAssistant && message.citations && message.citations.length > 0 && (
          <div className="message__citations">
            <span className="message__citations-label">Sources:</span>
            {message.citations.map((c, i) => (
              <a
                key={i}
                href={c.url}
                target="_blank"
                rel="noopener noreferrer"
                className="message__citation-link"
              >
                {c.title ?? new URL(c.url).hostname}
              </a>
            ))}
          </div>
        )}

        {/* Streaming cursor */}
        {isNew && !done && (
          <span className="streaming-cursor" />
        )}
      </div>
    </div>
  );
}
