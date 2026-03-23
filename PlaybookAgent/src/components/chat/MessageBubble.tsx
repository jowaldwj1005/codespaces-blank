import type { ChatMessage } from '../../types/agent';

export function MessageBubble({ message }: { message: ChatMessage }) {
  if (message.role === 'system') {
    return (
      <div className="message message--system">
        <div className="message__content">{message.content}</div>
      </div>
    );
  }

  if (message.role === 'tool') {
    // Tool responses rendered by ToolCallCard, skip here
    return null;
  }

  const isUser = message.role === 'user';

  return (
    <div className={`message message--${message.role}`}>
      <div className={`message__avatar message__avatar--${message.role}`}>
        {isUser ? 'U' : 'A'}
      </div>
      <div className="message__content">
        {message.content || '(no content)'}
      </div>
    </div>
  );
}
