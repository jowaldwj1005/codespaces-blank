import { useEffect } from 'react';
import './App.css';
import { AppHeader } from './components/layout/AppHeader';
import { ActivitySidebar } from './components/layout/ActivitySidebar';
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
    <div className="app">
      <AppHeader />

      <div className="app-body">
        {/* Activity Sidebar (Left) — icon rail + collapsible content panel */}
        <ActivitySidebar
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
    </div>
  );
}

export default App;
