import { useEffect, useRef, useState } from 'react';
import type { ChatMessage, AgentStatus, AttachmentMeta, PendingToolCall, InteractiveCard as ICard } from '../../types/agent';
import { MessageBubble } from './MessageBubble';
import { ToolCallCard } from './ToolCallCard';
import { ApprovalForm } from './ApprovalForm';
import { InteractiveCard } from './InteractiveCard';

function getFileIcon(mimeType: string): string {
  if (mimeType.startsWith('image/')) return '\u{1F5BC}\u{FE0F}';
  if (mimeType === 'application/pdf') return '\u{1F4C4}';
  if (mimeType.includes('word') || mimeType.includes('document')) return '\u{1F4DD}';
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return '\u{1F4CA}';
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return '\u{1F4CA}';
  return '\u{1F4CE}';
}

function AttachmentCard({ meta }: { meta: AttachmentMeta }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={`attachment-card ${meta.failed ? 'attachment-card--failed' : ''}`}>
      <button className="attachment-card__header" onClick={() => setExpanded(e => !e)}>
        <span className="attachment-card__icon">{getFileIcon(meta.mimeType)}</span>
        <span className="attachment-card__name">{meta.fileName}</span>
        {!meta.failed && (
          <span className="attachment-card__badge">Analyzed</span>
        )}
        {meta.failed && (
          <span className="attachment-card__badge attachment-card__badge--error">Failed</span>
        )}
        <span className="attachment-card__chevron">{expanded ? '\u25BC' : '\u25B6'}</span>
      </button>
      {expanded && (
        <div className="attachment-card__body">
          {meta.failed ? (
            <span className="attachment-card__error">
              {meta.errorMessage ?? 'Analysis failed'}
            </span>
          ) : (
            <div className="attachment-card__stats">
              {meta.pageCount != null && (
                <span className="attachment-card__stat">{meta.pageCount} page{meta.pageCount !== 1 ? 's' : ''}</span>
              )}
              {meta.tableCount != null && (
                <span className="attachment-card__stat">{meta.tableCount} table{meta.tableCount !== 1 ? 's' : ''}</span>
              )}
              {meta.charCount != null && (
                <span className="attachment-card__stat">{meta.charCount.toLocaleString()} chars</span>
              )}
              {meta.artifactId && (
                <span className="attachment-card__stat attachment-card__stat--id">
                  ID: {meta.artifactId.slice(0, 8)}…
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface MessageListProps {
  messages: ChatMessage[];
  status: AgentStatus;
  pendingApprovals: PendingToolCall[];
  onApprove: (callId: string, editedArgs?: Record<string, unknown>) => void;
  onReject: (callId: string) => void;
}

/** Collapsible info banner for system messages */
function SystemMessageBanner({ message }: { message: ChatMessage }) {
  const [expanded, setExpanded] = useState(false);
  const content = message.content ?? '';
  const preview = content.length > 100 ? content.slice(0, 100) + '...' : content;

  return (
    <div className="system-message-banner" onClick={() => setExpanded(!expanded)}>
      <div className="system-message-banner__header">
        <span className="system-message-banner__icon">SYS</span>
        <span className="system-message-banner__label">System Prompt</span>
        <span className="system-message-banner__toggle">{expanded ? 'collapse' : 'expand'}</span>
      </div>
      {expanded ? (
        <pre className="system-message-banner__content">{content}</pre>
      ) : (
        <div className="system-message-banner__preview">{preview}</div>
      )}
    </div>
  );
}

export function MessageList({ messages, status, pendingApprovals, onApprove, onReject }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, pendingApprovals.length, status]);

  // Separate system messages for collapsed display, keep others as visible
  const visibleMessages = messages.filter(m => m.role !== 'system');
  const systemMessages = messages.filter(m => m.role === 'system');

  return (
    <div className="chat-messages">
      {/* System messages shown as collapsible banners */}
      {systemMessages.map((msg, i) => (
        <SystemMessageBanner key={`sys-${i}`} message={msg} />
      ))}

      {visibleMessages.length === 0 && status === 'idle' && (
        <div className="chat-empty">
          <div className="chat-empty__icon">{'chat'}</div>
          <div className="chat-empty__text">Start a conversation</div>
        </div>
      )}

      {visibleMessages.map((msg, i) => {
        // Render tool calls inline after assistant messages
        if (msg.role === 'assistant' && msg.tool_calls) {
          return (
            <div key={i}>
              {msg.content && <MessageBubble message={msg} />}
              {msg.tool_calls.map(tc => {
                // Find matching tool response
                const responseMsg = messages.find(
                  m => m.role === 'tool' && m.tool_call_id === tc.id
                );
                let parsedResponse: unknown;
                if (responseMsg?.content) {
                  try {
                    parsedResponse = JSON.parse(responseMsg.content);
                  } catch {
                    parsedResponse = responseMsg.content;
                  }
                }
                return (
                  <ToolCallCard
                    key={tc.id}
                    toolCall={tc}
                    status={responseMsg ? 'completed' : 'executing'}
                    response={parsedResponse}
                  />
                );
              })}
            </div>
          );
        }

        // Skip tool messages (rendered inline with their parent assistant message)
        if (msg.role === 'tool') return null;

        if (msg.role === 'user' && msg.attachmentMeta) {
          return (
            <div key={i}>
              <MessageBubble message={msg} />
              <AttachmentCard meta={msg.attachmentMeta} />
            </div>
          );
        }

        return <MessageBubble key={i} message={msg} />;
      })}

      {/* Pending approvals & interactive cards */}
      {pendingApprovals.map(tc => {
        // Detect ask_user interactive cards
        if (tc.toolName === 'ask_user') {
          const card = tc.arguments as unknown as ICard;
          return (
            <InteractiveCard
              key={tc.callId}
              card={card}
              onRespond={(response) => {
                // Pass user response back as edited args with the response data
                onApprove(tc.callId, { _user_response: response });
              }}
            />
          );
        }
        return (
          <ApprovalForm
            key={tc.callId}
            toolCall={tc}
            onApprove={onApprove}
            onReject={onReject}
          />
        );
      })}

      {/* Thinking indicator */}
      {(status === 'thinking' || status === 'tool_calling') && (
        <div className="thinking-indicator">
          <div className="thinking-dots">
            <span />
            <span />
            <span />
          </div>
          {status === 'thinking' ? 'Thinking...' : 'Executing tools...'}
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
