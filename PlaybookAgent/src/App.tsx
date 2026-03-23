import { useState } from 'react';
import { DataverseExplorer } from './components/DataverseExplorer';
import { ConnectorTester } from './components/ConnectorTester';
import { VisualizationPanel } from './components/VisualizationPanel';
import { McpExplorer } from './components/McpExplorer';
import { DebugPanel } from './components/DebugPanel';

const APP_VERSION = '0.3.0';

type Tab = 'dataverse' | 'connectors' | 'viz' | 'mcp' | 'debug';

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('dataverse');

  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', padding: 16, maxWidth: 1200, margin: '0 auto' }}>
      <header style={{ marginBottom: 16, borderBottom: '2px solid #6366f1', paddingBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, color: '#1e1b4b' }}>
            Playbook Agent — MVP Debug Console
          </h1>
          <p style={{ margin: '4px 0 0', color: '#666', fontSize: 13 }}>
            Dataverse CRUD + Connector testing with full debug tracing
          </p>
        </div>
        <span style={{ fontSize: 11, color: '#6366f1', background: '#eef2ff', padding: '2px 8px', borderRadius: 4, fontWeight: 600 }}>
          v{APP_VERSION}
        </span>
      </header>

      {/* Tab bar */}
      <nav style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
        {(
          [
            { id: 'dataverse', label: 'Dataverse Explorer' },
            { id: 'connectors', label: 'Connector Tester' },
            { id: 'viz', label: 'Visualization' },
            { id: 'mcp', label: 'MCP Explorer' },
            { id: 'debug', label: 'Debug Log' },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '8px 16px',
              border: 'none',
              borderBottom: activeTab === tab.id ? '2px solid #6366f1' : '2px solid transparent',
              background: activeTab === tab.id ? '#eef2ff' : 'transparent',
              color: activeTab === tab.id ? '#4338ca' : '#555',
              cursor: 'pointer',
              fontWeight: activeTab === tab.id ? 600 : 400,
              fontSize: 14,
              borderRadius: '4px 4px 0 0',
            }}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Tab content */}
      <main style={{ padding: 12, border: '1px solid #e5e7eb', borderRadius: 4, background: '#fff', minHeight: 400 }}>
        {activeTab === 'dataverse' && <DataverseExplorer />}
        {activeTab === 'connectors' && <ConnectorTester />}
        {activeTab === 'viz' && <VisualizationPanel />}
        {activeTab === 'mcp' && <McpExplorer />}
        {activeTab === 'debug' && <DebugPanel />}
      </main>

      <footer style={{ marginTop: 12, textAlign: 'center', color: '#999', fontSize: 11 }}>
        All operations traced via Debug Event Bus — switch to Debug Log tab to inspect requests/responses
      </footer>
    </div>
  );
}

export default App;
