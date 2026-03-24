import { useState, useMemo, useCallback } from 'react';
import './App.css';
import { AppHeader } from './components/layout/AppHeader';
import { ThreadSidebar } from './components/layout/ThreadSidebar';
import { ChatWorkspace } from './components/chat/ChatWorkspace';
import { SeedPanel } from './components/admin/SeedPanel';
import { AdminWorkspace } from './components/admin/AdminWorkspace';
import { DataverseExplorer } from './components/DataverseExplorer';
import { ConnectorTester } from './components/ConnectorTester';
import { VisualizationPanel } from './components/VisualizationPanel';
import { McpExplorer } from './components/McpExplorer';
import { DebugPanel } from './components/DebugPanel';
import { useThreadManager } from './hooks/useThreadManager';
import { useAgentChat } from './hooks/useAgentChat';

export type MainView = 'chat' | 'admin' | 'dataverse' | 'connectors' | 'viz' | 'mcp' | 'debug';
export type RightPanel = 'none' | 'seed' | 'agent-config' | 'artifacts' | 'case-detail';

function App() {
  const [activeView, setActiveView] = useState<MainView>('chat');
  const [rightPanel, setRightPanel] = useState<RightPanel>('none');
  const threadManager = useThreadManager();
  const chat = useAgentChat(threadManager.activeThreadId);

  const activeAgentId = useMemo(() => {
    if (!threadManager.activeThreadId) return null;
    const thread = threadManager.threads.find(t => t.id === threadManager.activeThreadId);
    return thread?.agentId ?? null;
  }, [threadManager.activeThreadId, threadManager.threads]);

  const toggleRightPanel = useCallback((panel: RightPanel) => {
    setRightPanel(prev => prev === panel ? 'none' : panel);
  }, []);

  return (
    <div className="app">
      <AppHeader
        rightPanel={rightPanel}
        onTogglePanel={toggleRightPanel}
      />

      <div className="app-body">
        <ThreadSidebar
          manager={threadManager}
          activeView={activeView}
          onViewChange={setActiveView}
        />

        <div className="workspace">
          {/* Main content area */}
          <main className={`main-content ${rightPanel !== 'none' ? 'main-content--with-panel' : ''}`}>
            {activeView === 'chat' && (
              <ChatWorkspace
                chat={chat}
                threadId={threadManager.activeThreadId}
                agentId={activeAgentId}
              />
            )}
            {activeView === 'admin' && <AdminWorkspace />}
            {activeView === 'dataverse' && (
              <div className="debug-view"><DataverseExplorer /></div>
            )}
            {activeView === 'connectors' && (
              <div className="debug-view"><ConnectorTester /></div>
            )}
            {activeView === 'viz' && (
              <div className="debug-view"><VisualizationPanel /></div>
            )}
            {activeView === 'mcp' && (
              <div className="debug-view"><McpExplorer /></div>
            )}
            {activeView === 'debug' && (
              <div className="debug-view"><DebugPanel /></div>
            )}
          </main>

          {/* Right context panel */}
          {rightPanel !== 'none' && (
            <aside className="right-panel">
              <div className="right-panel__header">
                <span className="right-panel__title">
                  {rightPanel === 'seed' && 'Seed Data'}
                  {rightPanel === 'agent-config' && 'Agent Config'}
                  {rightPanel === 'artifacts' && 'Artifacts'}
                  {rightPanel === 'case-detail' && 'Case'}
                </span>
                <button
                  className="right-panel__close"
                  onClick={() => setRightPanel('none')}
                >
                  x
                </button>
              </div>
              <div className="right-panel__body">
                {rightPanel === 'seed' && <SeedPanel />}
                {rightPanel === 'agent-config' && (
                  <div className="placeholder-panel">
                    <span className="placeholder-panel__icon">Settings</span>
                    <span>Use the Admin workspace for full agent configuration</span>
                    <button
                      className="admin-btn admin-btn--primary"
                      style={{ marginTop: '12px' }}
                      onClick={() => { setActiveView('admin'); setRightPanel('none'); }}
                    >
                      Open Admin
                    </button>
                  </div>
                )}
                {rightPanel === 'artifacts' && (
                  <div className="placeholder-panel">
                    <span className="placeholder-panel__icon">Artifacts</span>
                    <span>Artifact browser coming soon</span>
                  </div>
                )}
                {rightPanel === 'case-detail' && (
                  <div className="placeholder-panel">
                    <span className="placeholder-panel__icon">Cases</span>
                    <span>Case detail view coming soon</span>
                  </div>
                )}
              </div>
            </aside>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
