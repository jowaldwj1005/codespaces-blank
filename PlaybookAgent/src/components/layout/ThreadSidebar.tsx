import { useState, useEffect } from 'react';
import type { useThreadManager } from '../../hooks/useThreadManager';

type ThreadManagerReturn = ReturnType<typeof useThreadManager>;

type View = 'chat' | 'dataverse' | 'connectors' | 'viz' | 'mcp' | 'debug';

interface ThreadSidebarProps {
  manager: ThreadManagerReturn;
  activeView: View;
  onViewChange: (view: View) => void;
}

const NAV_ITEMS: Array<{ id: View; label: string; icon: string }> = [
  { id: 'dataverse', label: 'Dataverse', icon: '📊' },
  { id: 'connectors', label: 'Connectors', icon: '🔌' },
  { id: 'viz', label: 'Visualization', icon: '📈' },
  { id: 'mcp', label: 'MCP', icon: '🔍' },
  { id: 'debug', label: 'Debug Log', icon: '🐛' },
];

export function ThreadSidebar({ manager, activeView, onViewChange }: ThreadSidebarProps) {
  const {
    threads, activeThreadId, agents,
    loadThreads, loadAgents, newThread, selectThread, deleteThread,
  } = manager;

  const [showNewThread, setShowNewThread] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [threadTitle, setThreadTitle] = useState('');

  useEffect(() => {
    loadThreads();
    loadAgents();
  }, [loadThreads, loadAgents]);

  // Default-select first agent when agents load
  const defaultAgentId = agents.length > 0 ? agents[0].id : '';
  const effectiveAgentId = selectedAgentId || defaultAgentId;

  const handleCreateThread = async () => {
    if (!effectiveAgentId) return;
    await newThread(effectiveAgentId, threadTitle || undefined);
    setShowNewThread(false);
    setThreadTitle('');
    onViewChange('chat');
  };

  const handleSelectThread = (threadId: string) => {
    selectThread(threadId);
    onViewChange('chat');
  };

  // Separate parent threads and sub-threads
  const parentThreads = threads.filter(t => !t.parentThreadId);
  const subThreadMap = new Map<string, typeof threads>();
  threads.filter(t => t.parentThreadId).forEach(t => {
    const existing = subThreadMap.get(t.parentThreadId!) ?? [];
    existing.push(t);
    subThreadMap.set(t.parentThreadId!, existing);
  });

  return (
    <div className="sidebar">
      <div className="sidebar__header">
        <span className="sidebar__title">Threads</span>
      </div>

      <div className="sidebar__threads">
        <button
          className="new-thread-btn"
          onClick={() => setShowNewThread(!showNewThread)}
        >
          + New Thread
        </button>

        {showNewThread && (
          <div className="new-thread-dialog">
            <div className="new-thread-dialog__field">
              <label className="new-thread-dialog__label">Agent</label>
              <select
                value={effectiveAgentId}
                onChange={e => setSelectedAgentId(e.target.value)}
              >
                {agents.length === 0 && <option value="">No agents available</option>}
                {agents.map(a => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
            <div className="new-thread-dialog__field">
              <label className="new-thread-dialog__label">Title (optional)</label>
              <input
                type="text"
                value={threadTitle}
                onChange={e => setThreadTitle(e.target.value)}
                placeholder="Thread title..."
                onKeyDown={e => e.key === 'Enter' && handleCreateThread()}
              />
            </div>
            <div className="new-thread-dialog__actions">
              <button
                className="new-thread-btn"
                style={{ marginBottom: 0 }}
                onClick={handleCreateThread}
                disabled={!effectiveAgentId}
              >
                Create
              </button>
              <button onClick={() => setShowNewThread(false)}>Cancel</button>
            </div>
          </div>
        )}

        {parentThreads.map(thread => (
          <div key={thread.id}>
            <button
              className={`thread-item ${thread.id === activeThreadId && activeView === 'chat' ? 'thread-item--active' : ''}`}
              onClick={() => handleSelectThread(thread.id)}
            >
              <span className="thread-item__title">{thread.title}</span>
              <span className="thread-item__agent">{thread.agentName}</span>
              <span
                className="thread-item__delete"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteThread(thread.id);
                }}
              >
                ×
              </span>
            </button>

            {/* Sub-threads */}
            {subThreadMap.get(thread.id)?.map(sub => (
              <button
                key={sub.id}
                className={`thread-item thread-item--sub ${sub.id === activeThreadId && activeView === 'chat' ? 'thread-item--active' : ''}`}
                onClick={() => handleSelectThread(sub.id)}
              >
                <span className="thread-item__title">{sub.title}</span>
              </button>
            ))}
          </div>
        ))}

        {threads.length === 0 && !showNewThread && (
          <div style={{ padding: 16, textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: 13 }}>
            No threads yet
          </div>
        )}
      </div>

      <div className="sidebar__nav">
        {NAV_ITEMS.map(item => (
          <button
            key={item.id}
            className={`nav-item ${activeView === item.id ? 'nav-item--active' : ''}`}
            onClick={() => onViewChange(item.id)}
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
