/**
 * ConfigActivity — AI-assisted configuration panel.
 *
 * Shows definition-layer entities (agents, tools, playbooks, instructions)
 * in a compact tree. Users can:
 *   - Browse existing records (click to open in admin tab)
 *   - Ask the AI to create/edit records via a chat input
 *
 * The AI config chat uses the existing agent loop with a specialized
 * "config" explore thread that has all Dataverse tools available.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { CaseManagerReturn } from '../../../hooks/useCaseManager';
import type { WorkspaceTabsReturn } from '../../../hooks/useWorkspaceTabs';
import { ENTITY_REGISTRY } from '../../admin/EntityRegistry';
import { getTableService } from '../../../services/dataverse';
import type { IGetAllOptions } from '../../../services/sdk';

// Definition-layer entities to show in config panel
const CONFIG_ENTITIES = ['jw_agent', 'jw_tool', 'jw_playbook', 'jw_instruction'] as const;

interface EntitySummary {
  key: string;
  records: Array<{ id: string; name: string }>;
  loading: boolean;
}

interface ConfigActivityProps {
  caseManager: CaseManagerReturn;
  tabs: WorkspaceTabsReturn;
}

export function ConfigActivity({ tabs }: ConfigActivityProps) {
  const [entities, setEntities] = useState<Record<string, EntitySummary>>({});
  const [expandedEntity, setExpandedEntity] = useState<string | null>('jw_agent');
  const [configPrompt, setConfigPrompt] = useState('');
  const loadedRef = useRef(false);

  // Load summary counts for all config entities
  const loadEntities = useCallback(async () => {
    const result: Record<string, EntitySummary> = {};

    for (const key of CONFIG_ENTITIES) {
      result[key] = { key, records: [], loading: true };
    }
    setEntities({ ...result });

    for (const key of CONFIG_ENTITIES) {
      const entity = ENTITY_REGISTRY[key];
      if (!entity) continue;
      try {
        const service = getTableService(entity.pluralApiName);
        if (!service) continue;
        const res = await service.getAll({ top: 100 } as IGetAllOptions);
        const data = (res.data ?? []) as Record<string, unknown>[];
        result[key] = {
          key,
          records: data.map(r => ({
            id: r[entity.primaryKey] as string,
            name: (r[entity.nameField] ?? 'Untitled') as string,
          })),
          loading: false,
        };
      } catch {
        result[key] = { key, records: [], loading: false };
      }
    }
    setEntities({ ...result });
  }, []);

  useEffect(() => {
    if (!loadedRef.current) {
      loadedRef.current = true;
      loadEntities();
    }
  }, [loadEntities]);

  const handleToggleEntity = (key: string) => {
    setExpandedEntity(prev => prev === key ? null : key);
  };

  const handleOpenRecord = () => {
    tabs.openTab({
      type: 'admin',
      label: 'Admin',
      referenceId: 'admin',
      closable: true,
    });
  };

  const handleOpenAdmin = () => {
    tabs.openTab({
      type: 'admin',
      label: 'Admin',
      referenceId: 'admin',
      closable: true,
    });
  };

  const handleAIConfig = () => {
    if (!configPrompt.trim()) return;
    // Open an explore tab with the config prompt pre-filled
    tabs.openTab({
      type: 'explore',
      label: 'AI Config',
      referenceId: 'ai-config-' + Date.now(),
      closable: true,
    });
    // Store prompt to be picked up by the explore chat
    // For now, we clear and let user paste in the chat
    setConfigPrompt('');
  };

  return (
    <div className="config-activity">
      {/* AI Config Input */}
      <div className="act-ai-config">
        <div className="act-ai-config__label">AI-Assisted Configuration</div>
        <div className="act-ai-config__input-row">
          <textarea
            className="act-ai-config__input"
            value={configPrompt}
            onChange={e => setConfigPrompt(e.target.value)}
            placeholder="Describe what you want to create...&#10;e.g. 'Create an agent for invoice processing with SAP tools'"
            rows={3}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleAIConfig();
              }
            }}
          />
          <button
            className="act-ai-config__send"
            onClick={handleAIConfig}
            disabled={!configPrompt.trim()}
            title="Open AI Config chat"
          >
            {'\u{2728}'}
          </button>
        </div>
        <div className="act-ai-config__hint">
          Opens an AI chat that can create agents, tools, playbooks & instructions step by step
        </div>
      </div>

      {/* Entity Tree */}
      <div className="act-entity-tree">
        {CONFIG_ENTITIES.map(key => {
          const entity = ENTITY_REGISTRY[key];
          if (!entity) return null;
          const summary = entities[key];
          const isExpanded = expandedEntity === key;
          const count = summary?.records.length ?? 0;

          return (
            <div key={key} className="act-entity-node">
              <button
                className={`act-entity-node__header ${isExpanded ? 'act-entity-node__header--expanded' : ''}`}
                onClick={() => handleToggleEntity(key)}
              >
                <span className="act-entity-node__chevron">{isExpanded ? '\u25BE' : '\u25B8'}</span>
                <span className="act-entity-node__icon">{entity.icon}</span>
                <span className="act-entity-node__name">{entity.displayNamePlural}</span>
                <span className="act-entity-node__count">
                  {summary?.loading ? '...' : count}
                </span>
              </button>

              {isExpanded && summary && !summary.loading && (
                <div className="act-entity-node__records">
                  {summary.records.map(record => (
                    <button
                      key={record.id}
                      className="act-record-item"
                      onClick={() => handleOpenRecord()}
                      title={record.name}
                    >
                      <span className="act-record-item__name">{record.name}</span>
                    </button>
                  ))}
                  {summary.records.length === 0 && (
                    <div className="act-empty">No {entity.displayNamePlural.toLowerCase()}</div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Admin link */}
      <div className="act-footer-link">
        <button className="act-footer-link__btn" onClick={handleOpenAdmin}>
          Open Full Admin View
        </button>
        <button className="act-footer-link__btn" onClick={loadEntities}>
          Refresh
        </button>
      </div>
    </div>
  );
}
