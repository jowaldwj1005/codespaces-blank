/**
 * ActivitySidebar — VS Code-style activity bar with icon rail + content panel.
 *
 * Activities:
 *   Chat   — Cases, threads, explore (main workflow)
 *   Config — Agents, tools, playbooks, instructions + AI-assisted creation
 *   Context — Artifacts, case dashboard, seed data
 *   Dev    — Dataverse explorer, connector tester, debug, MCP
 *
 * Clicking same icon collapses sidebar to icon-rail-only mode.
 */

import { useState, useCallback } from 'react';
import type { CaseManagerReturn } from '../../hooks/useCaseManager';
import type { WorkspaceTabsReturn } from '../../hooks/useWorkspaceTabs';
import { ChatActivity } from './activities/ChatActivity';
import { ConfigActivity } from './activities/ConfigActivity';
import { ContextActivity } from './activities/ContextActivity';
import { DevToolsActivity } from './activities/DevToolsActivity';

export type ActivityId = 'chat' | 'config' | 'context' | 'dev';

interface ActivityDef {
  id: ActivityId;
  icon: string;
  label: string;
  shortcut?: string;
}

const ACTIVITIES: ActivityDef[] = [
  { id: 'chat', icon: '\u{1F4AC}', label: 'Chat', shortcut: 'Ctrl+1' },
  { id: 'config', icon: '\u{2699}\u{FE0F}', label: 'Configure', shortcut: 'Ctrl+2' },
  { id: 'context', icon: '\u{1F4CB}', label: 'Context', shortcut: 'Ctrl+3' },
  { id: 'dev', icon: '\u{1F6E0}\u{FE0F}', label: 'Dev Tools', shortcut: 'Ctrl+4' },
];

export interface ActivitySidebarProps {
  caseManager: CaseManagerReturn;
  tabs: WorkspaceTabsReturn;
}

export function ActivitySidebar({ caseManager, tabs }: ActivitySidebarProps) {
  const [activeActivity, setActiveActivity] = useState<ActivityId | null>('chat');

  const handleActivityClick = useCallback((id: ActivityId) => {
    setActiveActivity(prev => prev === id ? null : id);
  }, []);

  const isExpanded = activeActivity !== null;

  return (
    <div className={`activity-sidebar ${isExpanded ? 'activity-sidebar--expanded' : ''}`}>
      {/* Icon Rail — always visible */}
      <div className="activity-rail">
        {ACTIVITIES.map(activity => (
          <button
            key={activity.id}
            className={`activity-rail__btn ${activeActivity === activity.id ? 'activity-rail__btn--active' : ''}`}
            onClick={() => handleActivityClick(activity.id)}
            title={`${activity.label}${activity.shortcut ? ` (${activity.shortcut})` : ''}`}
          >
            <span className="activity-rail__icon">{activity.icon}</span>
          </button>
        ))}
      </div>

      {/* Content Panel — slides in/out */}
      {isExpanded && (
        <div className="activity-panel">
          <div className="activity-panel__header">
            <span className="activity-panel__title">
              {ACTIVITIES.find(a => a.id === activeActivity)?.label}
            </span>
          </div>
          <div className="activity-panel__body">
            {activeActivity === 'chat' && (
              <ChatActivity caseManager={caseManager} tabs={tabs} />
            )}
            {activeActivity === 'config' && (
              <ConfigActivity caseManager={caseManager} tabs={tabs} />
            )}
            {activeActivity === 'context' && (
              <ContextActivity caseManager={caseManager} tabs={tabs} />
            )}
            {activeActivity === 'dev' && (
              <DevToolsActivity tabs={tabs} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
