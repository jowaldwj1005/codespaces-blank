/**
 * DevToolsActivity — Quick-launch panel for developer tools.
 * Opens tools as workspace tabs (Dataverse, Connectors, Debug, MCP, Viz).
 */

import type { WorkspaceTabsReturn } from '../../../hooks/useWorkspaceTabs';
import type { TabType } from '../../../hooks/useWorkspaceTabs';

interface DevToolsActivityProps {
  tabs: WorkspaceTabsReturn;
}

const DEV_TOOLS: Array<{ type: TabType; label: string; icon: string; description: string }> = [
  { type: 'dataverse', label: 'Dataverse Explorer', icon: '\u{1F4CA}', description: 'Browse all tables, records & fields' },
  { type: 'connectors', label: 'Connector Tester', icon: '\u{1F50C}', description: 'Test OpenAI, Doc Intelligence, SAP' },
  { type: 'debug', label: 'Debug Log', icon: '\u{1F41B}', description: 'SDK calls, events, raw I/O' },
  { type: 'mcp', label: 'MCP Explorer', icon: '\u{1F50D}', description: 'Dataverse MCP tools & schemas' },
  { type: 'viz', label: 'Visualization', icon: '\u{1F4C8}', description: 'Chart & visual preview panel' },
];

export function DevToolsActivity({ tabs }: DevToolsActivityProps) {
  const handleOpen = (type: TabType, label: string) => {
    tabs.openTab({
      type,
      label,
      referenceId: type,
      closable: true,
    });
  };

  return (
    <div className="dev-activity">
      <div className="dev-activity__list">
        {DEV_TOOLS.map(tool => (
          <button
            key={tool.type}
            className="dev-tool-card"
            onClick={() => handleOpen(tool.type, tool.label)}
          >
            <span className="dev-tool-card__icon">{tool.icon}</span>
            <div className="dev-tool-card__info">
              <span className="dev-tool-card__label">{tool.label}</span>
              <span className="dev-tool-card__desc">{tool.description}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
