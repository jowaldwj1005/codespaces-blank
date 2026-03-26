import { useState, useCallback, useRef } from 'react';
import type { AgentStatus } from '../../types/agent';

export interface ChatMessageOptions {
  reasoning_effort?: 'low' | 'medium' | 'high';
  web_search?: boolean;
}

interface ChatInputBarProps {
  onSend: (message: string, options?: ChatMessageOptions) => void;
  status: AgentStatus;
  disabled?: boolean;
}

const REASONING_CYCLE: Array<'low' | 'medium' | 'high' | undefined> = [undefined, 'low', 'medium', 'high'];
const REASONING_LABELS: Record<string, string> = {
  low: 'Low',
  medium: 'Med',
  high: 'High',
};

export function ChatInputBar({ onSend, status, disabled }: ChatInputBarProps) {
  const [input, setInput] = useState('');
  const [webSearch, setWebSearch] = useState(false);
  const [reasoningEffort, setReasoningEffort] = useState<'low' | 'medium' | 'high' | undefined>(undefined);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isBusy = status !== 'idle' && status !== 'error';

  const handleSend = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed || isBusy || disabled) return;

    const options: ChatMessageOptions = {};
    if (reasoningEffort) options.reasoning_effort = reasoningEffort;
    if (webSearch) options.web_search = true;

    onSend(trimmed, Object.keys(options).length > 0 ? options : undefined);
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [input, isBusy, disabled, onSend, reasoningEffort, webSearch]);

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

  const cycleReasoning = () => {
    setReasoningEffort(prev => {
      const idx = REASONING_CYCLE.indexOf(prev);
      return REASONING_CYCLE[(idx + 1) % REASONING_CYCLE.length];
    });
  };

  const handleFileClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    // For now, read file content and append to message
    const file = files[0];
    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      const preview = text.length > 2000 ? text.slice(0, 2000) + '\n...(truncated)' : text;
      setInput(prev => prev + (prev ? '\n\n' : '') + `[File: ${file.name}]\n${preview}`);
    };
    reader.readAsText(file);
    // Reset so same file can be re-selected
    e.target.value = '';
  };

  return (
    <div className="chat-input-area">
      {/* Toolbar */}
      <div className="chat-input-toolbar">
        <button
          className={`chat-toolbar-btn ${reasoningEffort ? 'chat-toolbar-btn--active' : ''}`}
          onClick={cycleReasoning}
          title={reasoningEffort ? `Reasoning: ${REASONING_LABELS[reasoningEffort]}` : 'Enable reasoning (click to cycle)'}
          disabled={isBusy}
        >
          <span className="chat-toolbar-btn__icon">{'\u{1F9E0}'}</span>
          {reasoningEffort && (
            <span className="chat-toolbar-btn__label">{REASONING_LABELS[reasoningEffort]}</span>
          )}
        </button>

        <button
          className={`chat-toolbar-btn ${webSearch ? 'chat-toolbar-btn--active' : ''}`}
          onClick={() => setWebSearch(prev => !prev)}
          title={webSearch ? 'Web search enabled' : 'Enable web search'}
          disabled={isBusy}
        >
          <span className="chat-toolbar-btn__icon">{'\u{1F310}'}</span>
          {webSearch && (
            <span className="chat-toolbar-btn__label">Web</span>
          )}
        </button>

        <button
          className="chat-toolbar-btn"
          onClick={handleFileClick}
          title="Attach file"
          disabled={isBusy}
        >
          <span className="chat-toolbar-btn__icon">{'\u{1F4CE}'}</span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          style={{ display: 'none' }}
          onChange={handleFileChange}
          accept=".txt,.csv,.json,.md,.xml,.yaml,.yml,.log,.pdf,.docx"
        />
      </div>

      {/* Input row */}
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
