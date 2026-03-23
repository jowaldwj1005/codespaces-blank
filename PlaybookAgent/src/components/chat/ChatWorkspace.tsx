import { useEffect } from 'react';
import type { AgentStatus, TokenUsage } from '../../types/agent';
import { MessageList } from './MessageList';
import { ChatInputBar } from './ChatInputBar';
import { TokenCounter } from './TokenCounter';
import type { useAgentChat } from '../../hooks/useAgentChat';

type AgentChatReturn = ReturnType<typeof useAgentChat>;

interface ChatWorkspaceProps {
  chat: AgentChatReturn;
  threadId: string | null;
  agentId: string | null;
}

const STATUS_LABELS: Record<AgentStatus, string> = {
  idle: 'Ready',
  thinking: 'Thinking...',
  tool_calling: 'Executing tools...',
  awaiting_approval: 'Awaiting approval',
  sub_agent: 'Sub-agent running...',
  error: 'Error',
};

export function ChatWorkspace({ chat, threadId, agentId }: ChatWorkspaceProps) {
  const {
    messages, status, tokenUsage, pendingApprovals, agent,
    loadAgent, loadMessages, sendMessage, approveToolCall, rejectToolCall,
    error,
  } = chat;

  // Load agent and messages when thread/agent changes
  useEffect(() => {
    if (agentId) {
      loadAgent(agentId);
    }
  }, [agentId, loadAgent]);

  useEffect(() => {
    if (threadId) {
      loadMessages(threadId);
    }
  }, [threadId, loadMessages]);

  if (!threadId) {
    return (
      <div className="chat-workspace">
        <div className="chat-empty" style={{ flex: 1 }}>
          <div className="chat-empty__icon">{'🤖'}</div>
          <div className="chat-empty__text">Select or create a thread to start chatting</div>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-workspace">
      <div className="chat-header">
        <div>
          <span className="chat-header__agent">{agent?.name ?? 'Loading agent...'}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <TokenCounter usage={tokenUsage as TokenUsage} />
          <div className="chat-header__status">
            <span className={`status-dot status-dot--${status}`} />
            {STATUS_LABELS[status as AgentStatus]}
          </div>
        </div>
      </div>

      {error && (
        <div style={{
          padding: '8px 16px',
          background: 'var(--color-error-bg)',
          color: 'var(--color-error)',
          fontSize: 13,
          borderBottom: '1px solid var(--color-border)',
        }}>
          {error}
        </div>
      )}

      <MessageList
        messages={messages}
        status={status as AgentStatus}
        pendingApprovals={pendingApprovals}
        onApprove={approveToolCall}
        onReject={rejectToolCall}
      />

      <ChatInputBar
        onSend={sendMessage}
        status={status as AgentStatus}
        disabled={!agent}
      />
    </div>
  );
}
