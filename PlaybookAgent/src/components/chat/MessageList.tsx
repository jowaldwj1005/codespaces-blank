import { useEffect, useRef } from 'react';
import type { ChatMessage, AgentStatus, PendingToolCall } from '../../types/agent';
import { MessageBubble } from './MessageBubble';
import { ToolCallCard } from './ToolCallCard';
import { ApprovalForm } from './ApprovalForm';

interface MessageListProps {
  messages: ChatMessage[];
  status: AgentStatus;
  pendingApprovals: PendingToolCall[];
  onApprove: (callId: string, editedArgs?: Record<string, unknown>) => void;
  onReject: (callId: string) => void;
}

export function MessageList({ messages, status, pendingApprovals, onApprove, onReject }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, pendingApprovals.length, status]);

  // Filter out system messages from display (they're context, not conversation)
  const visibleMessages = messages.filter(m => m.role !== 'system');

  return (
    <div className="chat-messages">
      {visibleMessages.length === 0 && status === 'idle' && (
        <div className="chat-empty">
          <div className="chat-empty__icon">{'💬'}</div>
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

        return <MessageBubble key={i} message={msg} />;
      })}

      {/* Pending approvals */}
      {pendingApprovals.map(tc => (
        <ApprovalForm
          key={tc.callId}
          toolCall={tc}
          onApprove={onApprove}
          onReject={onReject}
        />
      ))}

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
