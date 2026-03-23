import { useState, useCallback, useRef } from 'react';
import type { AgentStatus } from '../../types/agent';

interface ChatInputBarProps {
  onSend: (message: string) => void;
  status: AgentStatus;
  disabled?: boolean;
}

export function ChatInputBar({ onSend, status, disabled }: ChatInputBarProps) {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isBusy = status !== 'idle' && status !== 'error';

  const handleSend = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed || isBusy || disabled) return;
    onSend(trimmed);
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [input, isBusy, disabled, onSend]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    // Auto-resize
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  };

  return (
    <div className="chat-input-area">
      <div className="chat-input-bar">
        <textarea
          ref={textareaRef}
          className="chat-input-bar__input"
          value={input}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder={isBusy ? 'Agent is working...' : 'Type a message...'}
          disabled={isBusy || disabled}
          rows={1}
        />
        <button
          className="chat-input-bar__send"
          onClick={handleSend}
          disabled={!input.trim() || isBusy || disabled}
        >
          Send
        </button>
      </div>
    </div>
  );
}
