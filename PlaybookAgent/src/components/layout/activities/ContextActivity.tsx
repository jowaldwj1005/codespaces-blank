/**
 * ContextActivity — Artifacts, case dashboard, seed panel.
 * Replaces the header panel buttons (Seed, Artifacts, Case).
 * Shows context-sensitive content based on active case/thread.
 */

import { useState } from 'react';
import type { CaseManagerReturn } from '../../../hooks/useCaseManager';
import type { WorkspaceTabsReturn } from '../../../hooks/useWorkspaceTabs';
import { SeedPanel } from '../../admin/SeedPanel';
import { ArtifactBrowser } from '../../semantic/ArtifactBrowser';
import { CaseDashboard } from '../../semantic/CaseDashboard';

type ContextTab = 'case' | 'artifacts' | 'seed';

interface ContextActivityProps {
  caseManager: CaseManagerReturn;
  tabs: WorkspaceTabsReturn;
}

const CONTEXT_TABS: Array<{ id: ContextTab; label: string; icon: string }> = [
  { id: 'case', label: 'Case', icon: '\u{1F4CB}' },
  { id: 'artifacts', label: 'Artifacts', icon: '\u{1F4E6}' },
  { id: 'seed', label: 'Seed', icon: '\u{1F331}' },
];

export function ContextActivity({ tabs }: ContextActivityProps) {
  const [activeTab, setActiveTab] = useState<ContextTab>('case');

  // Get active thread from current workspace tab
  const activeThreadId = tabs.activeTab?.type === 'thread-chat'
    ? tabs.activeTab.referenceId
    : null;

  return (
    <div className="context-activity">
      {/* Sub-tab bar */}
      <div className="act-subtabs">
        {CONTEXT_TABS.map(tab => (
          <button
            key={tab.id}
            className={`act-subtab ${activeTab === tab.id ? 'act-subtab--active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="act-subtab-content">
        {activeTab === 'case' && (
          <CaseDashboard
            threadId={activeThreadId}
            onOpenArtifact={() => setActiveTab('artifacts')}
          />
        )}
        {activeTab === 'artifacts' && (
          <ArtifactBrowser threadId={activeThreadId} />
        )}
        {activeTab === 'seed' && (
          <SeedPanel />
        )}
      </div>
    </div>
  );
}
