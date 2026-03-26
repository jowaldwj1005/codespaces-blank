/**
 * UnifiedSidebar — "Lucid" navigation: single unified sidebar with clear sections.
 *
 * Sections:
 *   Header   — App title + version, burger toggle
 *   Actions  — + New Case, + Explore
 *   Recent   — Last 7 threads (most-recent first)
 *   Cases    — Collapsible tree: case → nested threads
 *   Define   — Agent/Playbook hierarchy with nested tools/instructions
 *   Dev Tools — Compact tool launchers (collapsed by default)
 *
 * Collapse: burger toggles full (260px) → slim rail (48px).
 * Slim rail shows section icons; hover expands as overlay.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { CaseManagerReturn, CaseSummary } from '../../hooks/useCaseManager';
import type { WorkspaceTabsReturn } from '../../hooks/useWorkspaceTabs';
import type { TabType } from '../../hooks/useWorkspaceTabs';
import { ENTITY_REGISTRY } from '../admin/EntityRegistry';
import { getTableService } from '../../services/dataverse';
import type { IGetAllOptions } from '../../services/sdk';

// ─── Types ──────────────────────────────────────────────────────────────────

interface UnifiedSidebarProps {
  caseManager: CaseManagerReturn;
  tabs: WorkspaceTabsReturn;
}

interface AgentRecord { id: string; name: string; toolCount: number; instrCount: number }
interface PlaybookRecord { id: string; name: string; stepCount: number; instrCount: number }

type CollapsedSections = Record<string, boolean>;

// ─── SVG Icons ──────────────────────────────────────────────────────────────

const icons = {
  burger: (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M3 5h12M3 9h12M3 13h12" />
    </svg>
  ),
  plus: (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M7 2v10M2 7h10" />
    </svg>
  ),
  clock: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="8" cy="8" r="6" />
      <path d="M8 4.5V8l2.5 1.5" strokeLinecap="round" />
    </svg>
  ),
  cases: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <rect x="2" y="3" width="12" height="11" rx="2" />
      <path d="M5 3V2a1 1 0 011-1h4a1 1 0 011 1v1" />
    </svg>
  ),
  define: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M8 1l2 3h4l-3 3 1 4-4-2-4 2 1-4-3-3h4z" />
    </svg>
  ),
  devtools: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M5.5 3L2 8l3.5 5M10.5 3L14 8l-3.5 5" />
    </svg>
  ),
  chevron: (open: boolean) => (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"
      style={{ transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }}>
      <path d="M4 2l4 4-4 4" />
    </svg>
  ),
  chat: (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3">
      <path d="M2 2h10a1 1 0 011 1v6a1 1 0 01-1 1H5l-3 2.5V3a1 1 0 011-1z" />
    </svg>
  ),
  search: (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3">
      <circle cx="6" cy="6" r="4" />
      <path d="M9 9l3.5 3.5" strokeLinecap="round" />
    </svg>
  ),
  agent: (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3">
      <rect x="3" y="2" width="8" height="6" rx="2" />
      <circle cx="5.5" cy="5" r="0.8" fill="currentColor" />
      <circle cx="8.5" cy="5" r="0.8" fill="currentColor" />
      <path d="M4 10h6M5 10v2M9 10v2" strokeLinecap="round" />
    </svg>
  ),
  playbook: (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3">
      <rect x="2" y="1" width="10" height="12" rx="1" />
      <path d="M5 4h4M5 7h4M5 10h2" strokeLinecap="round" />
    </svg>
  ),
};

// ─── Dev Tools Config ───────────────────────────────────────────────────────

const DEV_TOOLS: Array<{ type: TabType; label: string; short: string }> = [
  { type: 'debug', label: 'Debug Log', short: 'Debug' },
  { type: 'dataverse', label: 'Dataverse Explorer', short: 'Dataverse' },
  { type: 'mcp', label: 'MCP Explorer', short: 'MCP' },
  { type: 'connectors', label: 'Connector Tester', short: 'Connectors' },
  { type: 'admin', label: 'Admin Panel', short: 'Admin' },
  { type: 'viz', label: 'Visualization', short: 'Viz' },
];

// ─── Component ──────────────────────────────────────────────────────────────

export function UnifiedSidebar({ caseManager, tabs }: UnifiedSidebarProps) {
  const {
    cases, selectedCaseId, caseThreads, agents,
    selectCase, createCase, addThreadToCase,
  } = caseManager;

  // Sidebar state
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem('sidebar-collapsed') === 'true'; } catch { return false; }
  });
  const [hoverExpanded, setHoverExpanded] = useState(false);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Section collapse state
  const [sections, setSections] = useState<CollapsedSections>(() => {
    try {
      const saved = localStorage.getItem('sidebar-sections');
      return saved ? JSON.parse(saved) : { devtools: true };
    } catch { return { devtools: true }; }
  });

  // New case dialog
  const [showNewCase, setShowNewCase] = useState(false);
  const [newCaseTitle, setNewCaseTitle] = useState('');
  const [selectedAgentId, setSelectedAgentId] = useState('');

  // Define section data
  const [agentRecords, setAgentRecords] = useState<AgentRecord[]>([]);
  const [playbookRecords, setPlaybookRecords] = useState<PlaybookRecord[]>([]);
  const [defineLoading, setDefineLoading] = useState(false);
  const defineLoadedRef = useRef(false);

  // Persist collapse state
  useEffect(() => {
    try { localStorage.setItem('sidebar-collapsed', String(collapsed)); } catch { /* noop */ }
  }, [collapsed]);

  useEffect(() => {
    try { localStorage.setItem('sidebar-sections', JSON.stringify(sections)); } catch { /* noop */ }
  }, [sections]);

  // Load define section data
  const loadDefineData = useCallback(async () => {
    if (defineLoadedRef.current) return;
    defineLoadedRef.current = true;
    setDefineLoading(true);
    try {
      const agentEntity = ENTITY_REGISTRY['jw_agent'];
      const agentService = getTableService(agentEntity.pluralApiName);
      const toolService = getTableService(ENTITY_REGISTRY['jw_tool'].pluralApiName);
      const instrService = getTableService(ENTITY_REGISTRY['jw_instruction'].pluralApiName);
      const agentToolService = getTableService(ENTITY_REGISTRY['jw_agenttool'].pluralApiName);
      const playbookService = getTableService(ENTITY_REGISTRY['jw_playbook'].pluralApiName);

      const [agentRes, , instrRes, agentToolRes, playbookRes] = await Promise.all([
        agentService?.getAll({ top: 100 } as IGetAllOptions),
        toolService?.getAll({ top: 200 } as IGetAllOptions),
        instrService?.getAll({ top: 200 } as IGetAllOptions),
        agentToolService?.getAll({ top: 500 } as IGetAllOptions),
        playbookService?.getAll({ top: 100 } as IGetAllOptions),
      ]);

      const allAgents = (agentRes?.data ?? []) as Record<string, unknown>[];
      const allAgentTools = (agentToolRes?.data ?? []) as Record<string, unknown>[];
      const allInstructions = (instrRes?.data ?? []) as Record<string, unknown>[];
      const allPlaybooks = (playbookRes?.data ?? []) as Record<string, unknown>[];

      // Count tools per agent via junction table
      const toolCountByAgent = new Map<string, number>();
      for (const at of allAgentTools) {
        const agentId = at._jw_agentid_value as string;
        if (agentId) toolCountByAgent.set(agentId, (toolCountByAgent.get(agentId) ?? 0) + 1);
      }

      // Count instructions per agent (instructions with agent lookup)
      const instrCountByAgent = new Map<string, number>();
      const instrCountByPlaybook = new Map<string, number>();
      for (const instr of allInstructions) {
        const agentId = instr._jw_agentid_value as string;
        const playbookId = instr._jw_playbookid_value as string;
        if (agentId) instrCountByAgent.set(agentId, (instrCountByAgent.get(agentId) ?? 0) + 1);
        if (playbookId) instrCountByPlaybook.set(playbookId, (instrCountByPlaybook.get(playbookId) ?? 0) + 1);
      }

      setAgentRecords(allAgents.map(a => ({
        id: a.jw_agentid as string,
        name: (a.jw_name ?? 'Unnamed') as string,
        toolCount: toolCountByAgent.get(a.jw_agentid as string) ?? 0,
        instrCount: instrCountByAgent.get(a.jw_agentid as string) ?? 0,
      })));

      setPlaybookRecords(allPlaybooks.map(p => ({
        id: p.jw_playbookid as string,
        name: (p.jw_name ?? 'Unnamed') as string,
        stepCount: instrCountByPlaybook.get(p.jw_playbookid as string) ?? 0,
        instrCount: instrCountByPlaybook.get(p.jw_playbookid as string) ?? 0,
      })));
    } catch {
      // Silent — define section shows empty
    } finally {
      setDefineLoading(false);
    }
  }, []);

  useEffect(() => { loadDefineData(); }, [loadDefineData]);

  // ─── Handlers ────────────────────────────────────────────────────────────

  const toggleCollapse = useCallback(() => {
    setCollapsed(prev => !prev);
    setHoverExpanded(false);
  }, []);

  const toggleSection = useCallback((key: string) => {
    setSections(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const handleHoverEnter = useCallback(() => {
    if (!collapsed) return;
    hoverTimerRef.current = setTimeout(() => setHoverExpanded(true), 150);
  }, [collapsed]);

  const handleHoverLeave = useCallback(() => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    setHoverExpanded(false);
  }, []);

  const defaultAgentId = agents.length > 0 ? agents[0].id : '';
  const effectiveAgentId = selectedAgentId || defaultAgentId;

  const handleCreateCase = async () => {
    if (!effectiveAgentId || !newCaseTitle.trim()) return;
    const result = await createCase({
      title: newCaseTitle.trim(),
      agentId: effectiveAgentId,
    });
    if (result) {
      setShowNewCase(false);
      setNewCaseTitle('');
      if (result.threadId) {
        tabs.openTab({
          type: 'thread-chat',
          label: `${newCaseTitle.trim()} - Thread 1`,
          referenceId: result.threadId,
        });
      }
    }
  };

  const handleOpenExplore = () => {
    tabs.openTab({
      type: 'explore',
      label: 'Explore',
      referenceId: 'explore-' + Date.now(),
    });
  };

  const handleSelectCase = async (caseId: string) => {
    await selectCase(caseId);
  };

  const handleSelectThread = (threadId: string, threadTitle: string) => {
    tabs.openTab({
      type: 'thread-chat',
      label: threadTitle,
      referenceId: threadId,
    });
  };

  const handleOpenDevTool = (type: TabType, label: string) => {
    tabs.openTab({ type, label, referenceId: type, closable: true });
  };

  const handleOpenAgentAdmin = () => {
    tabs.openTab({ type: 'admin', label: 'Admin', referenceId: 'admin', closable: true });
  };

  // ─── Recent Threads ──────────────────────────────────────────────────────

  // Collect recent threads from all open thread-chat tabs + case threads
  const recentThreads = (() => {
    const seen = new Set<string>();
    const items: Array<{ id: string; title: string }> = [];

    // Tabs that are thread-chat (most recently interacted first)
    for (const tab of [...tabs.tabs].reverse()) {
      if (tab.type === 'thread-chat' && !seen.has(tab.referenceId)) {
        seen.add(tab.referenceId);
        items.push({ id: tab.referenceId, title: tab.label });
      }
    }

    // Also include case threads not in tabs
    for (const thread of caseThreads) {
      if (!seen.has(thread.id)) {
        seen.add(thread.id);
        items.push({ id: thread.id, title: thread.title });
      }
    }

    return items.slice(0, 7);
  })();

  // ─── Cases Data ──────────────────────────────────────────────────────────

  const activeCases = cases.filter(c => c.status === 'Active');
  const completedCases = cases.filter(c => c.status === 'Completed');

  // ─── Render Helpers ──────────────────────────────────────────────────────

  const isExpanded = !collapsed || hoverExpanded;
  const sidebarClass = [
    'sidebar',
    collapsed ? 'sidebar--collapsed' : '',
    hoverExpanded ? 'sidebar--hover-expanded' : '',
  ].filter(Boolean).join(' ');

  // ─── JSX ─────────────────────────────────────────────────────────────────

  return (
    <div
      ref={sidebarRef}
      className={sidebarClass}
      onMouseEnter={handleHoverEnter}
      onMouseLeave={handleHoverLeave}
    >
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="sidebar__header">
        <button className="sidebar__burger" onClick={toggleCollapse} title="Toggle sidebar">
          {icons.burger}
        </button>
        {isExpanded && (
          <>
            <span className="sidebar__title">Playbook Agent</span>
            <span className="sidebar__version">v0.13</span>
          </>
        )}
      </div>

      {/* ── Quick Actions ──────────────────────────────────────── */}
      {isExpanded ? (
        <div className="sidebar__actions">
          <button className="sidebar__action-btn sidebar__action-btn--primary" onClick={() => setShowNewCase(!showNewCase)}>
            {icons.plus} New Case
          </button>
          <button className="sidebar__action-btn" onClick={handleOpenExplore}>
            {icons.search} Explore
          </button>
        </div>
      ) : (
        <div className="sidebar__actions sidebar__actions--rail">
          <button className="sidebar__rail-btn" onClick={() => setShowNewCase(true)} title="New Case">
            {icons.plus}
          </button>
        </div>
      )}

      {/* ── New Case Dialog ────────────────────────────────────── */}
      {showNewCase && isExpanded && (
        <div className="sidebar__dialog">
          <input
            type="text"
            className="sidebar__dialog-input"
            value={newCaseTitle}
            onChange={e => setNewCaseTitle(e.target.value)}
            placeholder="Case title..."
            onKeyDown={e => e.key === 'Enter' && handleCreateCase()}
            autoFocus
          />
          <select
            className="sidebar__dialog-select"
            value={effectiveAgentId}
            onChange={e => setSelectedAgentId(e.target.value)}
          >
            {agents.length === 0 && <option value="">No agents — run Seed Data first</option>}
            {agents.map(a => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
          <div className="sidebar__dialog-actions">
            <button className="sidebar__dialog-btn sidebar__dialog-btn--primary" onClick={handleCreateCase} disabled={!effectiveAgentId || !newCaseTitle.trim()}>
              Create
            </button>
            <button className="sidebar__dialog-btn" onClick={() => setShowNewCase(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* ── Scrollable Sections ────────────────────────────────── */}
      <div className="sidebar__sections">

        {/* ── RECENT ──────────────────────────────────────────── */}
        <SidebarSection
          icon={icons.clock}
          label="Recent"

          isExpanded={isExpanded}
          open={!sections.recent}
          onToggle={() => toggleSection('recent')}
        >
          {recentThreads.length === 0 ? (
            <div className="sidebar__empty">No recent threads</div>
          ) : (
            recentThreads.map(t => (
              <button
                key={t.id}
                className={`sidebar__item ${tabs.activeTab?.referenceId === t.id ? 'sidebar__item--active' : ''}`}
                onClick={() => handleSelectThread(t.id, t.title)}
              >
                {icons.chat}
                <span className="sidebar__item-label">{t.title}</span>
              </button>
            ))
          )}
        </SidebarSection>

        {/* ── CASES ──────────────────────────────────────────── */}
        <SidebarSection
          icon={icons.cases}
          label={`Cases`}
          count={cases.length}

          isExpanded={isExpanded}
          open={!sections.cases}
          onToggle={() => toggleSection('cases')}
        >
          {activeCases.length === 0 && completedCases.length === 0 ? (
            <div className="sidebar__empty">No cases yet</div>
          ) : (
            <>
              {activeCases.map(c => (
                <CaseTreeItem
                  key={c.id}
                  caseItem={c}
                  isSelected={c.id === selectedCaseId}
                  threads={c.id === selectedCaseId ? caseThreads : []}
                  activeThreadId={tabs.activeTab?.referenceId}
                  onSelectCase={handleSelectCase}
                  onSelectThread={handleSelectThread}
                  agents={agents}
                  addThreadToCase={addThreadToCase}
                  tabs={tabs}
                />
              ))}
              {completedCases.length > 0 && (
                <div className="sidebar__sub-header">
                  Completed ({completedCases.length})
                </div>
              )}
              {completedCases.map(c => (
                <CaseTreeItem
                  key={c.id}
                  caseItem={c}
                  isSelected={c.id === selectedCaseId}
                  threads={c.id === selectedCaseId ? caseThreads : []}
                  activeThreadId={tabs.activeTab?.referenceId}
                  onSelectCase={handleSelectCase}
                  onSelectThread={handleSelectThread}
                  agents={agents}
                  addThreadToCase={addThreadToCase}
                  tabs={tabs}
                />
              ))}
            </>
          )}
        </SidebarSection>

        {/* ── DEFINE ─────────────────────────────────────────── */}
        <SidebarSection
          icon={icons.define}
          label="Define"

          isExpanded={isExpanded}
          open={!sections.define}
          onToggle={() => toggleSection('define')}
        >
          {defineLoading ? (
            <div className="sidebar__empty">Loading...</div>
          ) : (
            <>
              {/* Agents */}
              {agentRecords.map(a => (
                <button
                  key={a.id}
                  className="sidebar__item sidebar__item--define"
                  onClick={handleOpenAgentAdmin}
                >
                  {icons.agent}
                  <span className="sidebar__item-label">{a.name}</span>
                  <span className="sidebar__item-meta">
                    {a.toolCount}T · {a.instrCount}I
                  </span>
                </button>
              ))}

              {/* Playbooks divider */}
              {playbookRecords.length > 0 && (
                <div className="sidebar__divider">Playbooks</div>
              )}

              {playbookRecords.map(p => (
                <button
                  key={p.id}
                  className="sidebar__item sidebar__item--define"
                  onClick={handleOpenAgentAdmin}
                >
                  {icons.playbook}
                  <span className="sidebar__item-label">{p.name}</span>
                  <span className="sidebar__item-meta">
                    {p.stepCount} steps
                  </span>
                </button>
              ))}

              {agentRecords.length === 0 && playbookRecords.length === 0 && (
                <div className="sidebar__empty">No agents or playbooks</div>
              )}

              {/* Create buttons */}
              <div className="sidebar__define-actions">
                <button className="sidebar__small-btn" onClick={handleOpenAgentAdmin}>
                  {icons.plus} Agent
                </button>
                <button className="sidebar__small-btn" onClick={handleOpenAgentAdmin}>
                  {icons.plus} Playbook
                </button>
              </div>
            </>
          )}
        </SidebarSection>

        {/* ── DEV TOOLS ──────────────────────────────────────── */}
        <SidebarSection
          icon={icons.devtools}
          label="Dev Tools"

          isExpanded={isExpanded}
          open={!sections.devtools}
          onToggle={() => toggleSection('devtools')}
        >
          <div className="sidebar__dev-grid">
            {DEV_TOOLS.map(tool => (
              <button
                key={tool.type}
                className="sidebar__dev-link"
                onClick={() => handleOpenDevTool(tool.type, tool.label)}
              >
                {tool.short}
              </button>
            ))}
          </div>
        </SidebarSection>
      </div>
    </div>
  );
}

// ─── SidebarSection ─────────────────────────────────────────────────────────

interface SidebarSectionProps {
  icon: React.ReactNode;
  label: string;
  count?: number;
  isExpanded: boolean;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

function SidebarSection({ icon, label, count, isExpanded, open, onToggle, children }: SidebarSectionProps) {
  if (!isExpanded) {
    // Slim rail — just show section icon
    return (
      <div className="sidebar__rail-section">
        <span className="sidebar__rail-icon">{icon}</span>
      </div>
    );
  }

  return (
    <div className="sidebar__section">
      <button className="sidebar__section-header" onClick={onToggle}>
        {icons.chevron(open)}
        <span className="sidebar__section-label">{label}</span>
        {count !== undefined && (
          <span className="sidebar__section-count">{count}</span>
        )}
      </button>
      {open && (
        <div className="sidebar__section-body">
          {children}
        </div>
      )}
    </div>
  );
}

// ─── CaseTreeItem ───────────────────────────────────────────────────────────

interface CaseTreeItemProps {
  caseItem: CaseSummary;
  isSelected: boolean;
  threads: Array<{ id: string; title: string; agentName?: string }>;
  activeThreadId?: string;
  onSelectCase: (id: string) => void;
  onSelectThread: (id: string, title: string) => void;
  agents: Array<{ id: string; name: string }>;
  addThreadToCase: (agentId: string, title?: string) => Promise<string | null>;
  tabs: WorkspaceTabsReturn;
}

function CaseTreeItem({ caseItem, isSelected, threads, activeThreadId, onSelectCase, onSelectThread }: CaseTreeItemProps) {
  return (
    <div className="sidebar__case">
      <button
        className={`sidebar__item sidebar__item--case ${isSelected ? 'sidebar__item--active' : ''}`}
        onClick={() => onSelectCase(caseItem.id)}
      >
        {icons.chevron(isSelected)}
        <span className={`sidebar__case-dot sidebar__case-dot--${caseItem.status.toLowerCase()}`} />
        <span className="sidebar__item-label">{caseItem.title}</span>
      </button>

      {/* Nested threads */}
      {isSelected && threads.length > 0 && (
        <div className="sidebar__case-threads">
          {threads.map(t => (
            <button
              key={t.id}
              className={`sidebar__item sidebar__item--thread ${activeThreadId === t.id ? 'sidebar__item--active' : ''}`}
              onClick={() => onSelectThread(t.id, t.title)}
            >
              {icons.chat}
              <span className="sidebar__item-label">{t.title}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
