import { useEffect } from 'react';
import './App.css';
import { UnifiedSidebar } from './components/sidebar/UnifiedSidebar';
import { WorkspaceTabs } from './components/layout/WorkspaceTabs';
import { useCaseManager } from './hooks/useCaseManager';
import { useWorkspaceTabs } from './hooks/useWorkspaceTabs';

function App() {
  const caseManager = useCaseManager();
  const tabsManager = useWorkspaceTabs();

  // Load initial data
  useEffect(() => {
    caseManager.loadCases();
    caseManager.loadAgents();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="app app--lucid">
      {/* Unified Sidebar (Left) — "Lucid" design */}
      <UnifiedSidebar
        caseManager={caseManager}
        tabs={tabsManager}
      />

      {/* Workspace (Center — Tabbed) */}
      <main className="main-content">
        <WorkspaceTabs
          tabsManager={tabsManager}
          caseManager={caseManager}
        />
      </main>
    </div>
  );
}

export default App;
