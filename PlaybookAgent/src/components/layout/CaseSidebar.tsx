/**
 * CaseSidebar — Case-centric navigation replacing ThreadSidebar.
 * Shows cases grouped by status, threads nested under selected case,
 * agents list, and quick actions.
 */

import { useState, useEffect } from 'react';
import type { CaseManagerReturn } from '../../hooks/useCaseManager';
import type { WorkspaceTabsReturn } from '../../hooks/useWorkspaceTabs';

interface CaseSidebarProps {
  caseManager: CaseManagerReturn;
  tabs: WorkspaceTabsReturn;
}

type SidebarSection = 'cases' | 'agents';

export function CaseSidebar({ caseManager, tabs }: CaseSidebarProps) {
  const {
    cases, selectedCaseId, caseThreads, agents,
    loadCases, loadAgents, selectCase, createCase, addThreadToCase,
  } = caseManager;

  const [showNewCase, setShowNewCase] = useState(false);
  const [showNewThread, setShowNewThread] = useState(false);
  const [newCaseTitle, setNewCaseTitle] = useState('');
  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [newThreadTitle, setNewThreadTitle] = useState('');
  const [expandedSections, setExpandedSections] = useState<Set<SidebarSection>>(
    new Set(['cases'])
  );
  const [showCompleted, setShowCompleted] = useState(false);
  const [showCancelled, setShowCancelled] = useState(false);

  useEffect(() => {
    loadCases();
    loadAgents();
  }, [loadCases, loadAgents]);

  const defaultAgentId = agents.length > 0 ? agents[0].id : '';
  const effectiveAgentId = selectedAgentId || defaultAgentId;

  // Group cases by status
  const activeCases = cases.filter(c => c.status === 'Active');
  const completedCases = cases.filter(c => c.status === 'Completed');
  const cancelledCases = cases.filter(c => c.status === 'Cancelled');

  const toggleSection = (section: SidebarSection) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  };

  const handleSelectCase = async (caseId: string) => {
    await selectCase(caseId);
    // Open case canvas tab
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
      // Open the thread in a tab
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

  const handleOpenTool = (type: 'admin' | 'dataverse' | 'connectors' | 'viz' | 'mcp' | 'debug', label: string) => {
    tabs.openTab({
      type,
      label,
      referenceId: type,
      closable: true,
    });
  };

  const renderCaseItem = (c: typeof cases[0]) => (
    <button
      key={c.id}
      className={`case-item ${c.id === selectedCaseId ? 'case-item--active' : ''}`}
      onClick={() => handleSelectCase(c.id)}
    >
      <span className={`case-item__dot case-item__dot--${c.status.toLowerCase()}`} />
      <span className="case-item__title">{c.title}</span>
      {c.playbookName && (
        <span className="case-item__playbook">{c.playbookName}</span>
      )}
    </button>
  );

  return (
    <div className="sidebar case-sidebar">
      {/* Cases Section */}
      <div className="sidebar__section">
        <button
          className="sidebar__section-header"
          onClick={() => toggleSection('cases')}
        >
          <span>{expandedSections.has('cases') ? '\u25BE' : '\u25B8'} CASES</span>
          <span className="sidebar__count">{cases.length}</span>
        </button>

        {expandedSections.has('cases') && (
          <div className="sidebar__section-body">
            {/* Active cases */}
            {activeCases.map(renderCaseItem)}

            {/* Completed (collapsed) */}
            {completedCases.length > 0 && (
              <>
                <button
                  className="sidebar__group-toggle"
                  onClick={() => setShowCompleted(!showCompleted)}
                >
                  {showCompleted ? '\u25BE' : '\u25B8'} Completed ({completedCases.length})
                </button>
                {showCompleted && completedCases.map(renderCaseItem)}
              </>
            )}

            {/* Cancelled (collapsed) */}
            {cancelledCases.length > 0 && (
              <>
                <button
                  className="sidebar__group-toggle"
                  onClick={() => setShowCancelled(!showCancelled)}
                >
                  {showCancelled ? '\u25BE' : '\u25B8'} Cancelled ({cancelledCases.length})
                </button>
                {showCancelled && cancelledCases.map(renderCaseItem)}
              </>
            )}

            {cases.length === 0 && (
              <div className="sidebar__empty">No cases yet</div>
            )}
          </div>
        )}
      </div>

      {/* Threads for selected case */}
      {selectedCaseId && (
        <div className="sidebar__section">
          <div className="sidebar__section-header sidebar__section-header--static">
            <span>THREADS</span>
            <button
              className="sidebar__add-btn"
              onClick={() => setShowNewThread(!showNewThread)}
              title="Add thread to case"
            >
              +
            </button>
          </div>

          {showNewThread && (
            <div className="new-thread-dialog">
              <div className="new-thread-dialog__field">
                <label className="new-thread-dialog__label">Agent</label>
                <select
                  value={effectiveAgentId}
                  onChange={e => setSelectedAgentId(e.target.value)}
                >
                  {agents.length === 0 && <option value="">No agents</option>}
                  {agents.map(a => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>
              <div className="new-thread-dialog__field">
                <label className="new-thread-dialog__label">Title</label>
                <input
                  type="text"
                  value={newThreadTitle}
                  onChange={e => setNewThreadTitle(e.target.value)}
                  placeholder="Thread title..."
                  onKeyDown={e => e.key === 'Enter' && handleAddThread()}
                />
              </div>
              <div className="new-thread-dialog__actions">
                <button className="new-thread-btn" style={{ marginBottom: 0 }} onClick={handleAddThread}>
                  Create
                </button>
                <button onClick={() => setShowNewThread(false)}>Cancel</button>
              </div>
            </div>
          )}

          <div className="sidebar__section-body">
            {caseThreads.map(thread => (
              <button
                key={thread.id}
                className={`thread-item ${tabs.activeTab?.referenceId === thread.id ? 'thread-item--active' : ''}`}
                onClick={() => handleSelectThread(thread.id, thread.title)}
              >
                <span className="thread-item__icon">{'\u{1F4AC}'}</span>
                <span className="thread-item__title">{thread.title}</span>
                <span className="thread-item__agent">{thread.agentName}</span>
              </button>
            ))}
            {caseThreads.length === 0 && (
              <div className="sidebar__empty">No threads</div>
            )}
          </div>
        </div>
      )}

      {/* Agents Section */}
      <div className="sidebar__section">
        <button
          className="sidebar__section-header"
          onClick={() => toggleSection('agents')}
        >
          <span>{expandedSections.has('agents') ? '\u25BE' : '\u25B8'} AGENTS</span>
        </button>
        {expandedSections.has('agents') && (
          <div className="sidebar__section-body">
            {agents.map(a => (
              <div key={a.id} className="agent-item">
                <span className="agent-item__icon">{'\u{1F916}'}</span>
                <span className="agent-item__name">{a.name}</span>
              </div>
            ))}
            {agents.length === 0 && (
              <div className="sidebar__empty">No agents</div>
            )}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="sidebar__actions">
        <button className="new-thread-btn" onClick={() => setShowNewCase(!showNewCase)}>
          + New Case
        </button>
        <button className="new-thread-btn new-thread-btn--secondary" onClick={handleOpenExplore}>
          + Explore
        </button>
      </div>

      {/* New Case Dialog */}
      {showNewCase && (
        <div className="new-case-dialog">
          <div className="new-thread-dialog__field">
            <label className="new-thread-dialog__label">Case Title</label>
            <input
              type="text"
              value={newCaseTitle}
              onChange={e => setNewCaseTitle(e.target.value)}
              placeholder="Case title..."
              onKeyDown={e => e.key === 'Enter' && handleCreateCase()}
              autoFocus
            />
          </div>
          <div className="new-thread-dialog__field">
            <label className="new-thread-dialog__label">Agent</label>
            <select
              value={effectiveAgentId}
              onChange={e => setSelectedAgentId(e.target.value)}
            >
              {agents.length === 0 && <option value="">No agents</option>}
              {agents.map(a => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>
          <div className="new-thread-dialog__actions">
            <button
              className="new-thread-btn"
              style={{ marginBottom: 0 }}
              onClick={handleCreateCase}
              disabled={!effectiveAgentId || !newCaseTitle.trim()}
            >
              Create Case
            </button>
            <button onClick={() => setShowNewCase(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* Dev Tools Nav */}
      <div className="sidebar__nav">
        <button className="nav-item" onClick={() => handleOpenTool('admin', 'Admin')}>
          <span>{'\u2699\uFE0F'}</span><span>Admin</span>
        </button>
        <button className="nav-item" onClick={() => handleOpenTool('dataverse', 'Dataverse')}>
          <span>{'\u{1F4CA}'}</span><span>Dataverse</span>
        </button>
        <button className="nav-item" onClick={() => handleOpenTool('debug', 'Debug')}>
          <span>{'\u{1F41B}'}</span><span>Debug</span>
        </button>
      </div>
    </div>
  );
}
