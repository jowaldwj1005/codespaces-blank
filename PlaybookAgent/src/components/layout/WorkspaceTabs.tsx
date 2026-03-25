/**
 * WorkspaceTabs — Tab bar + tab content routing.
 * Renders the tab strip and dispatches to the correct content component.
 */

import { useState } from 'react';
import type { WorkspaceTabsReturn } from '../../hooks/useWorkspaceTabs';
import type { CaseManagerReturn } from '../../hooks/useCaseManager';
import { ChatWorkspace } from '../chat/ChatWorkspace';
import { CaseCanvas } from '../case/CaseCanvas';
import { AdminWorkspace } from '../admin/AdminWorkspace';
import { DataverseExplorer } from '../DataverseExplorer';
import { ConnectorTester } from '../ConnectorTester';
import { VisualizationPanel } from '../VisualizationPanel';
import { McpExplorer } from '../McpExplorer';
import { DebugPanel } from '../DebugPanel';
import { useAgentChat } from '../../hooks/useAgentChat';

interface WorkspaceTabsProps {
  tabsManager: WorkspaceTabsReturn;
  caseManager: CaseManagerReturn;
}

export function WorkspaceTabs({ tabsManager, caseManager }: WorkspaceTabsProps) {
  const { tabs, activeTabId, activeTab, openTab, closeTab, switchTab, closeOtherTabs, closeAllTabs } = tabsManager;
  const [contextMenuTabId, setContextMenuTabId] = useState<string | null>(null);
  const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 });

  const handleContextMenu = (e: React.MouseEvent, tabId: string) => {
    e.preventDefault();
    setContextMenuTabId(tabId);
    setContextMenuPos({ x: e.clientX, y: e.clientY });
  };

  const closeContextMenu = () => setContextMenuTabId(null);

  return (
    <div className="workspace-tabs" onClick={closeContextMenu}>
      {/* Tab Bar */}
      <div className="workspace-tabs__bar">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`workspace-tab ${tab.id === activeTabId ? 'workspace-tab--active' : ''}`}
            onClick={() => switchTab(tab.id)}
            onContextMenu={(e) => handleContextMenu(e, tab.id)}
            title={tab.label}
          >
            <span className="workspace-tab__icon">{tab.icon}</span>
            <span className="workspace-tab__label">{tab.label}</span>
            {tab.hasUnsavedChanges && (
              <span className="workspace-tab__unsaved" />
            )}
            {tab.closable && (
              <span
                className="workspace-tab__close"
                onClick={(e) => { e.stopPropagation(); closeTab(tab.id); }}
              >
                \u00D7
              </span>
            )}
          </button>
        ))}

        {tabs.length === 0 && (
          <div className="workspace-tabs__empty-hint">
            Select a case or create one to get started
          </div>
        )}
      </div>

      {/* Context Menu */}
      {contextMenuTabId && (
        <div
          className="tab-context-menu"
          style={{ left: contextMenuPos.x, top: contextMenuPos.y }}
          onClick={closeContextMenu}
        >
          <button onClick={() => closeTab(contextMenuTabId)}>Close</button>
          <button onClick={() => closeOtherTabs(contextMenuTabId)}>Close Others</button>
          <button onClick={() => closeAllTabs()}>Close All</button>
        </div>
      )}

      {/* Tab Content */}
      <div className="workspace-tabs__content">
        {activeTab && (
          <TabContent
            tab={activeTab}
            caseManager={caseManager}
            tabsManager={tabsManager}
          />
        )}
        {!activeTab && (
          <div className="workspace-tabs__welcome">
            <h2>Playbook Agent</h2>
            <p>Select a case from the sidebar or create a new one to start.</p>
            <div className="workspace-tabs__welcome-actions">
              <button
                className="new-thread-btn"
                onClick={() => openTab({ type: 'explore', label: 'Explore', referenceId: 'explore-' + Date.now() })}
              >
                Start Exploring
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Tab Content Router ─────────────────────────────────────────────────────

interface TabContentProps {
  tab: NonNullable<WorkspaceTabsReturn['activeTab']>;
  caseManager: CaseManagerReturn;
  tabsManager: WorkspaceTabsReturn;
}

function TabContent({ tab, caseManager, tabsManager }: TabContentProps) {
  switch (tab.type) {
    case 'thread-chat':
      return <ThreadChatTab threadId={tab.referenceId} caseManager={caseManager} />;
    case 'case-canvas':
      return <CaseCanvas caseId={tab.referenceId} caseManager={caseManager} tabsManager={tabsManager} />;
    case 'explore':
      return <ExploreChatTab />;
    case 'artifact-view':
      return <ArtifactViewTab artifactId={tab.referenceId} caseManager={caseManager} />;
    case 'admin':
      return <AdminWorkspace />;
    case 'dataverse':
      return <div className="debug-view"><DataverseExplorer /></div>;
    case 'connectors':
      return <div className="debug-view"><ConnectorTester /></div>;
    case 'viz':
      return <div className="debug-view"><VisualizationPanel /></div>;
    case 'mcp':
      return <div className="debug-view"><McpExplorer /></div>;
    case 'debug':
      return <div className="debug-view"><DebugPanel /></div>;
    default:
      return <div className="placeholder-panel">Unknown tab type: {tab.type}</div>;
  }
}

// ─── Thread Chat Tab Wrapper ────────────────────────────────────────────────

function ThreadChatTab({ threadId, caseManager }: { threadId: string; caseManager: CaseManagerReturn }) {
  const chat = useAgentChat(threadId);

  // Find agent for this thread
  const thread = caseManager.caseThreads.find(t => t.id === threadId);
  const agentId = thread?.agentId ?? null;

  return (
    <ChatWorkspace
      chat={chat}
      threadId={threadId}
      agentId={agentId}
    />
  );
}

// ─── Explore Chat Tab (no case binding) ─────────────────────────────────────

function ExploreChatTab() {
  const chat = useAgentChat(null);

  return (
    <ChatWorkspace
      chat={chat}
      threadId={null}
      agentId={null}
    />
  );
}

// ─── Artifact View Tab ──────────────────────────────────────────────────────

function ArtifactViewTab({ artifactId, caseManager }: { artifactId: string; caseManager: CaseManagerReturn }) {
  const artifact = caseManager.caseArtifacts.find(a => a.id === artifactId);

  if (!artifact) {
    return <div className="placeholder-panel">Artifact not found</div>;
  }

  let payload: unknown = null;
  try {
    payload = artifact.payload ? JSON.parse(artifact.payload) : null;
  } catch {
    payload = artifact.payload;
  }

  return (
    <div className="artifact-full-view">
      <div className="artifact-full-view__header">
        <h2>{artifact.name}</h2>
        <span className="artifact-full-view__type">{artifact.type}</span>
      </div>
      <div className="artifact-full-view__body">
        <pre className="artifact-full-view__payload">
          {typeof payload === 'string' ? payload : JSON.stringify(payload, null, 2)}
        </pre>
      </div>
    </div>
  );
}
