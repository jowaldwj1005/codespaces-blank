import { useState, useMemo } from 'react';
import './App.css';
import { AppHeader } from './components/layout/AppHeader';
import { ThreadSidebar } from './components/layout/ThreadSidebar';
import { ChatWorkspace } from './components/chat/ChatWorkspace';
import { DataverseExplorer } from './components/DataverseExplorer';
import { ConnectorTester } from './components/ConnectorTester';
import { VisualizationPanel } from './components/VisualizationPanel';
import { McpExplorer } from './components/McpExplorer';
import { DebugPanel } from './components/DebugPanel';
import { useThreadManager } from './hooks/useThreadManager';
import { useAgentChat } from './hooks/useAgentChat';

type View = 'chat' | 'dataverse' | 'connectors' | 'viz' | 'mcp' | 'debug';

function App() {
  const [activeView, setActiveView] = useState<View>('chat');
  const threadManager = useThreadManager();
  const chat = useAgentChat(threadManager.activeThreadId);

  // Resolve the agent ID from the active thread
  const activeAgentId = useMemo(() => {
    if (!threadManager.activeThreadId) return null;
    const thread = threadManager.threads.find(t => t.id === threadManager.activeThreadId);
    return thread?.agentId ?? null;
  }, [threadManager.activeThreadId, threadManager.threads]);

  return (
    <div className="app">
      <AppHeader />

      <div className="app-body">
        <ThreadSidebar
          manager={threadManager}
          activeView={activeView}
          onViewChange={setActiveView}
        />

        <main className="main-content">
          {activeView === 'chat' && (
            <ChatWorkspace
              chat={chat}
              threadId={threadManager.activeThreadId}
              agentId={activeAgentId}
            />
          )}
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
      </div>
    </div>
  );
}

export default App;
