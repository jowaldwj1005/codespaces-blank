/**
 * ChatActivity — Cases, threads, and explore.
 * Main workflow panel: select a case, see its threads, create new ones.
 */

import { useState, useEffect } from 'react';
import type { CaseManagerReturn } from '../../../hooks/useCaseManager';
import type { WorkspaceTabsReturn } from '../../../hooks/useWorkspaceTabs';

interface ChatActivityProps {
  caseManager: CaseManagerReturn;
  tabs: WorkspaceTabsReturn;
}

export function ChatActivity({ caseManager, tabs }: ChatActivityProps) {
  const {
    cases, selectedCaseId, caseThreads, agents,
    loadCases, loadAgents, selectCase, createCase, addThreadToCase,
  } = caseManager;

  const [showNewCase, setShowNewCase] = useState(false);
  const [showNewThread, setShowNewThread] = useState(false);
  const [newCaseTitle, setNewCaseTitle] = useState('');
  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [newThreadTitle, setNewThreadTitle] = useState('');
  const [showCompleted, setShowCompleted] = useState(false);
  const [showCancelled, setShowCancelled] = useState(false);

  useEffect(() => {
    loadCases();
    loadAgents();
  }, [loadCases, loadAgents]);

  const defaultAgentId = agents.length > 0 ? agents[0].id : '';
  const effectiveAgentId = selectedAgentId || defaultAgentId;

  const activeCases = cases.filter(c => c.status === 'Active');
  const completedCases = cases.filter(c => c.status === 'Completed');
  const cancelledCases = cases.filter(c => c.status === 'Cancelled');

  const handleSelectCase = async (caseId: string) => {
    await selectCase(caseId);
    tabs.openTab({
      type: 'case-canvas',
      label: cases.find(c => c.id === caseId)?.title ?? 'Case',
      referenceId: caseId,
    });
  };

  const handleSelectThread = (threadId: string, threadTitle: string) => {
    tabs.openTab({
      type: 'thread-chat',
      label: threadTitle,
      referenceId: threadId,
    });
  };

  const handleCreateCase = async () => {
    if (!effectiveAgentId || !newCaseTitle.trim()) return;
    const result = await createCase({
      title: newCaseTitle.trim(),
      agentId: effectiveAgentId,
    });
    if (result) {
      setShowNewCase(false);
      setNewCaseTitle('');
      if (result.threadId) {
        tabs.openTab({
          type: 'thread-chat',
          label: `${newCaseTitle.trim()} - Thread 1`,
          referenceId: result.threadId,
        });
      }
    }
  };

  const handleAddThread = async () => {
    if (!effectiveAgentId) return;
    const threadId = await addThreadToCase(effectiveAgentId, newThreadTitle || undefined);
    if (threadId) {
      setShowNewThread(false);
      setNewThreadTitle('');
      tabs.openTab({
        type: 'thread-chat',
        label: newThreadTitle || 'New Thread',
        referenceId: threadId,
      });
    }
  };

  const handleOpenExplore = () => {
    tabs.openTab({
      type: 'explore',
      label: 'Explore',
      referenceId: 'explore-' + Date.now(),
    });
  };

  const renderCaseItem = (c: typeof cases[0]) => (
    <button
      key={c.id}
      className={`act-item ${c.id === selectedCaseId ? 'act-item--active' : ''}`}
      onClick={() => handleSelectCase(c.id)}
    >
      <span className={`act-item__dot act-item__dot--${c.status.toLowerCase()}`} />
      <span className="act-item__label">{c.title}</span>
      {c.playbookName && (
        <span className="act-item__badge">{c.playbookName}</span>
      )}
    </button>
  );

  return (
    <div className="chat-activity">
      {/* Quick Actions */}
      <div className="act-actions">
        <button className="act-actions__btn act-actions__btn--primary" onClick={() => setShowNewCase(!showNewCase)}>
          + New Case
        </button>
        <button className="act-actions__btn" onClick={handleOpenExplore}>
          + Explore
        </button>
      </div>

      {/* New Case Dialog */}
      {showNewCase && (
        <div className="act-dialog">
          <input
            type="text"
            className="act-dialog__input"
            value={newCaseTitle}
            onChange={e => setNewCaseTitle(e.target.value)}
            placeholder="Case title..."
            onKeyDown={e => e.key === 'Enter' && handleCreateCase()}
            autoFocus
          />
          <select
            className="act-dialog__select"
            value={effectiveAgentId}
            onChange={e => setSelectedAgentId(e.target.value)}
          >
            {agents.length === 0 && <option value="">No agents</option>}
            {agents.map(a => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
          <div className="act-dialog__actions">
            <button className="act-dialog__btn act-dialog__btn--primary" onClick={handleCreateCase} disabled={!effectiveAgentId || !newCaseTitle.trim()}>
              Create
            </button>
            <button className="act-dialog__btn" onClick={() => setShowNewCase(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* Cases List */}
      <div className="act-section">
        <div className="act-section__header">
          <span>Active Cases</span>
          <span className="act-section__count">{activeCases.length}</span>
        </div>
        <div className="act-section__body">
          {activeCases.map(renderCaseItem)}
          {activeCases.length === 0 && (
            <div className="act-empty">No active cases</div>
          )}
        </div>
      </div>

      {/* Completed / Cancelled toggle */}
      {completedCases.length > 0 && (
        <div className="act-section">
          <button className="act-section__toggle" onClick={() => setShowCompleted(!showCompleted)}>
            {showCompleted ? '\u25BE' : '\u25B8'} Completed ({completedCases.length})
          </button>
          {showCompleted && (
            <div className="act-section__body">
              {completedCases.map(renderCaseItem)}
            </div>
          )}
        </div>
      )}
      {cancelledCases.length > 0 && (
        <div className="act-section">
          <button className="act-section__toggle" onClick={() => setShowCancelled(!showCancelled)}>
            {showCancelled ? '\u25BE' : '\u25B8'} Cancelled ({cancelledCases.length})
          </button>
          {showCancelled && (
            <div className="act-section__body">
              {cancelledCases.map(renderCaseItem)}
            </div>
          )}
        </div>
      )}

      {/* Threads for selected case */}
      {selectedCaseId && (
        <div className="act-section act-section--threads">
          <div className="act-section__header">
            <span>Threads</span>
            <button className="act-section__add" onClick={() => setShowNewThread(!showNewThread)} title="Add thread">+</button>
          </div>

          {showNewThread && (
            <div className="act-dialog">
              <input
                type="text"
                className="act-dialog__input"
                value={newThreadTitle}
                onChange={e => setNewThreadTitle(e.target.value)}
                placeholder="Thread title..."
                onKeyDown={e => e.key === 'Enter' && handleAddThread()}
              />
              <select
                className="act-dialog__select"
                value={effectiveAgentId}
                onChange={e => setSelectedAgentId(e.target.value)}
              >
                {agents.map(a => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
              <div className="act-dialog__actions">
                <button className="act-dialog__btn act-dialog__btn--primary" onClick={handleAddThread}>Create</button>
                <button className="act-dialog__btn" onClick={() => setShowNewThread(false)}>Cancel</button>
              </div>
            </div>
          )}

          <div className="act-section__body">
            {caseThreads.map(thread => (
              <button
                key={thread.id}
                className={`act-item ${tabs.activeTab?.referenceId === thread.id ? 'act-item--active' : ''}`}
                onClick={() => handleSelectThread(thread.id, thread.title)}
              >
                <span className="act-item__icon">{'\u{1F4AC}'}</span>
                <span className="act-item__label">{thread.title}</span>
                <span className="act-item__sub">{thread.agentName}</span>
              </button>
            ))}
            {caseThreads.length === 0 && (
              <div className="act-empty">No threads</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
