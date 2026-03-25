import { useState, useEffect, useCallback } from 'react';
import './App.css';
import { AppHeader } from './components/layout/AppHeader';
import { CaseSidebar } from './components/layout/CaseSidebar';
import { WorkspaceTabs } from './components/layout/WorkspaceTabs';
import { SeedPanel } from './components/admin/SeedPanel';
import { ArtifactBrowser } from './components/semantic/ArtifactBrowser';
import { CaseDashboard } from './components/semantic/CaseDashboard';
import { useCaseManager } from './hooks/useCaseManager';
import { useWorkspaceTabs } from './hooks/useWorkspaceTabs';

export type RightPanel = 'none' | 'seed' | 'artifacts' | 'case-detail';

function App() {
  const caseManager = useCaseManager();
  const tabsManager = useWorkspaceTabs();
  const [rightPanel, setRightPanel] = useState<RightPanel>('none');

  // Auto-open context panel when case selected
  useEffect(() => {
    if (caseManager.selectedCaseId) {
      setRightPanel('case-detail');
    }
  }, [caseManager.selectedCaseId]);

  const toggleRightPanel = useCallback((panel: RightPanel) => {
    setRightPanel(prev => prev === panel ? 'none' : panel);
  }, []);

  // Find the active thread ID from the active tab (for right panel context)
  const activeThreadId = tabsManager.activeTab?.type === 'thread-chat'
    ? tabsManager.activeTab.referenceId
    : null;

  return (
    <div className="app">
      <AppHeader
        rightPanel={rightPanel}
        onTogglePanel={toggleRightPanel}
      />

      <div className="app-body">
        {/* Navigator (Left) */}
        <CaseSidebar
          caseManager={caseManager}
          tabs={tabsManager}
        />

        {/* Workspace (Center — Tabbed) */}
        <div className="workspace">
          <main className={`main-content ${rightPanel !== 'none' ? 'main-content--with-panel' : ''}`}>
            <WorkspaceTabs
              tabsManager={tabsManager}
              caseManager={caseManager}
            />
          </main>

          {/* Context Panel (Right) */}
          {rightPanel !== 'none' && (
            <aside className="right-panel">
              <div className="right-panel__header">
                <span className="right-panel__title">
                  {rightPanel === 'seed' && 'Seed Data'}
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
                {rightPanel === 'artifacts' && (
                  <ArtifactBrowser threadId={activeThreadId} />
                )}
                {rightPanel === 'case-detail' && (
                  <CaseDashboard
                    threadId={activeThreadId}
                    onOpenArtifact={() => setRightPanel('artifacts')}
                  />
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
