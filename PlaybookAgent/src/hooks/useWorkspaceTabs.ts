/**
 * useWorkspaceTabs — Tab state management for the workspace center panel.
 * Supports multiple tab types: case canvas, thread chat, artifact view, explore, admin, debug.
 */

import { useState, useCallback } from 'react';

// ─── Types ──────────────────────────────────────────────────────────────────

export type TabType =
  | 'case-canvas'
  | 'thread-chat'
  | 'artifact-view'
  | 'explore'
  | 'admin'
  | 'dataverse'
  | 'connectors'
  | 'viz'
  | 'mcp'
  | 'debug';

export interface WorkspaceTab {
  id: string;
  type: TabType;
  label: string;
  icon: string;
  /** Reference ID (caseId for canvas, threadId for chat, artifactId for view) */
  referenceId: string;
  closable: boolean;
  hasUnsavedChanges?: boolean;
}

interface TabsState {
  tabs: WorkspaceTab[];
  activeTabId: string | null;
}

const TAB_ICONS: Record<TabType, string> = {
  'case-canvas': '\u{1F4CB}',
  'thread-chat': '\u{1F4AC}',
  'artifact-view': '\u{1F4CA}',
  'explore': '\u{1F50D}',
  'admin': '\u{2699}\u{FE0F}',
  'dataverse': '\u{1F4CA}',
  'connectors': '\u{1F50C}',
  'viz': '\u{1F4C8}',
  'mcp': '\u{1F50D}',
  'debug': '\u{1F41B}',
};

let nextTabId = 1;
function generateTabId(): string {
  return `tab-${nextTabId++}`;
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useWorkspaceTabs() {
  const [state, setState] = useState<TabsState>({
    tabs: [],
    activeTabId: null,
  });

  /** Open a new tab or switch to existing one with same type+referenceId */
  const openTab = useCallback((opts: {
    type: TabType;
    label: string;
    referenceId: string;
    closable?: boolean;
    icon?: string;
  }): string => {
    let tabId = '';
    setState(prev => {
      // Check if tab with same type+referenceId already exists
      const existing = prev.tabs.find(
        t => t.type === opts.type && t.referenceId === opts.referenceId
      );
      if (existing) {
        tabId = existing.id;
        return { ...prev, activeTabId: existing.id };
      }

      // Create new tab
      const newTab: WorkspaceTab = {
        id: generateTabId(),
        type: opts.type,
        label: opts.label,
        icon: opts.icon ?? TAB_ICONS[opts.type] ?? '',
        referenceId: opts.referenceId,
        closable: opts.closable ?? true,
      };
      tabId = newTab.id;
      return {
        tabs: [...prev.tabs, newTab],
        activeTabId: newTab.id,
      };
    });
    return tabId;
  }, []);

  /** Close a tab. Switches to nearest tab if closing active tab. */
  const closeTab = useCallback((tabId: string) => {
    setState(prev => {
      const idx = prev.tabs.findIndex(t => t.id === tabId);
      if (idx === -1) return prev;

      const tab = prev.tabs[idx];
      if (!tab.closable) return prev;

      const newTabs = prev.tabs.filter(t => t.id !== tabId);
      let newActiveId = prev.activeTabId;

      if (prev.activeTabId === tabId) {
        // Switch to nearest tab
        if (newTabs.length === 0) {
          newActiveId = null;
        } else if (idx < newTabs.length) {
          newActiveId = newTabs[idx].id;
        } else {
          newActiveId = newTabs[newTabs.length - 1].id;
        }
      }

      return { tabs: newTabs, activeTabId: newActiveId };
    });
  }, []);

  /** Switch to a tab by ID */
  const switchTab = useCallback((tabId: string) => {
    setState(prev => ({ ...prev, activeTabId: tabId }));
  }, []);

  /** Close all closable tabs */
  const closeAllTabs = useCallback(() => {
    setState(prev => {
      const remaining = prev.tabs.filter(t => !t.closable);
      return {
        tabs: remaining,
        activeTabId: remaining.length > 0 ? remaining[0].id : null,
      };
    });
  }, []);

  /** Close all tabs except the given one */
  const closeOtherTabs = useCallback((tabId: string) => {
    setState(prev => {
      const remaining = prev.tabs.filter(t => t.id === tabId || !t.closable);
      return { tabs: remaining, activeTabId: tabId };
    });
  }, []);

  /** Update a tab's label or unsaved state */
  const updateTab = useCallback((tabId: string, update: Partial<Pick<WorkspaceTab, 'label' | 'hasUnsavedChanges'>>) => {
    setState(prev => ({
      ...prev,
      tabs: prev.tabs.map(t => t.id === tabId ? { ...t, ...update } : t),
    }));
  }, []);

  const activeTab = state.tabs.find(t => t.id === state.activeTabId) ?? null;

  return {
    tabs: state.tabs,
    activeTabId: state.activeTabId,
    activeTab,
    openTab,
    closeTab,
    switchTab,
    closeAllTabs,
    closeOtherTabs,
    updateTab,
  };
}

export type WorkspaceTabsReturn = ReturnType<typeof useWorkspaceTabs>;
