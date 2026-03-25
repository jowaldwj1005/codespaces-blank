/**
 * AgentConfig — Specialized agent editor with tool binding UI.
 * Extends RecordForm with:
 *  - Tool binding checkboxes (creates/deletes jw_agenttool junction records)
 *  - System prompt preview
 *  - "Test in Chat" quick action
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Editor from '@monaco-editor/react';
import type { EntityField } from './EntityRegistry';
import { ENTITY_REGISTRY } from './EntityRegistry';
import {
  jwAgents, jwTools, jwAgentTools, linkAgentTool,
} from '../../services/dataverse';
import toast from 'react-hot-toast';

interface ToolBinding {
  toolId: string;
  toolName: string;
  description: string;
  endpointType: string;
  bound: boolean;
  junctionId?: string;
}

interface AgentConfigProps {
  agentId: string | null;
  onTestInChat?: (agentId: string) => void;
  lookupResolver?: (field: EntityField) => Promise<Array<{ id: string; name: string }>>;
}

export function AgentConfig({ agentId, onTestInChat }: AgentConfigProps) {
  const [agent, setAgent] = useState<Record<string, unknown> | null>(null);
  const [formData, setFormData] = useState({
    jw_name: '',
    jw_systemprompt: '',
    jw_modelconfig: '{\n  "temperature": 0.7,\n  "max_completion_tokens": 2000,\n  "tool_choice": "auto"\n}',
    jw_allowmcp: false,
  });
  const [tools, setTools] = useState<ToolBinding[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'prompt' | 'tools'>('general');

  const loadAgent = useCallback(async () => {
    if (!agentId) return;
    setLoading(true);
    try {
      const [agentRes, toolsRes, junctionRes] = await Promise.all([
        jwAgents.get(agentId),
        jwTools.getAll(),
        jwAgentTools.getAll({ filter: `_jw_agentid_value eq '${agentId}'` } as never),
      ]);
      const a = agentRes.data;
      if (a) {
        setAgent(a as unknown as Record<string, unknown>);
        setFormData({
          jw_name: a.jw_name ?? '',
          jw_systemprompt: a.jw_systemprompt ?? '',
          jw_modelconfig: a.jw_modelconfig ?? '{}',
          jw_allowmcp: (a.jw_allowmcp as unknown) === 1 || (a.jw_allowmcp as unknown) === true,
        });
      }
      const allTools = (toolsRes.data ?? []) as unknown as Array<Record<string, unknown>>;
      const boundJunctions = (junctionRes.data ?? []) as unknown as Array<Record<string, unknown>>;
      const boundToolIds = new Set(boundJunctions.map(j => j._jw_toolid_value as string));

      setTools(allTools.map(t => ({
        toolId: t.jw_toolid as string,
        toolName: t.jw_name as string,
        description: (t.jw_description as string)?.slice(0, 100) ?? '',
        endpointType: t.jw_endpointtypename as string ?? 'Unknown',
        bound: boundToolIds.has(t.jw_toolid as string),
        junctionId: boundJunctions.find(j => j._jw_toolid_value === t.jw_toolid)?.jw_agenttoolid as string | undefined,
      })));
    } catch (err) {
      toast.error('Failed to load agent: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  useEffect(() => { loadAgent(); }, [loadAgent]);

  const handleSave = async () => {
    if (!agentId) return;
    setSaving(true);
    try {
      await jwAgents.update(agentId, {
        jw_name: formData.jw_name,
        jw_systemprompt: formData.jw_systemprompt,
        jw_modelconfig: formData.jw_modelconfig,
        jw_allowmcp: formData.jw_allowmcp,
      } as never);
      toast.success('Agent saved');
    } catch (err) {
      toast.error('Save failed: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setSaving(false);
    }
  };

  const toggleToolBinding = async (tool: ToolBinding) => {
    if (!agentId) return;
    try {
      if (tool.bound && tool.junctionId) {
        await jwAgentTools.delete(tool.junctionId);
        toast.success(`Unlinked ${tool.toolName}`);
      } else {
        await linkAgentTool(agentId, tool.toolId);
        toast.success(`Linked ${tool.toolName}`);
      }
      await loadAgent();
    } catch (err) {
      toast.error('Failed: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  if (loading) {
    return (
      <div className="agent-config agent-config--loading">
        <div className="record-list__spinner" />
        <span>Loading agent configuration...</span>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="agent-config agent-config--empty">
        <span style={{ fontSize: '2rem' }}>{ENTITY_REGISTRY.jw_agent.icon}</span>
        <p>Select an agent from the list to configure</p>
      </div>
    );
  }

  return (
    <div className="agent-config">
      <div className="agent-config__header">
        <div className="agent-config__title-row">
          <span className="agent-config__icon">{ENTITY_REGISTRY.jw_agent.icon}</span>
          <input
            className="agent-config__name-input"
            value={formData.jw_name}
            onChange={e => setFormData(prev => ({ ...prev, jw_name: e.target.value }))}
            placeholder="Agent Name"
          />
        </div>
        <div className="agent-config__actions">
          {onTestInChat && agentId && (
            <button
              className="admin-btn admin-btn--outline"
              onClick={() => onTestInChat(agentId)}
            >
              Test in Chat
            </button>
          )}
          <button
            className="admin-btn admin-btn--primary"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      <div className="agent-config__tabs">
        {(['general', 'prompt', 'tools'] as const).map(tab => (
          <button
            key={tab}
            className={`agent-config__tab ${activeTab === tab ? 'agent-config__tab--active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab === 'general' && 'General'}
            {tab === 'prompt' && 'System Prompt'}
            {tab === 'tools' && `Tools (${tools.filter(t => t.bound).length}/${tools.length})`}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          className="agent-config__content"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.15 }}
        >
          {activeTab === 'general' && (
            <div className="agent-config__general">
              <div className="form-field">
                <label className="form-field__label">Allow MCP Discovery</label>
                <span className="form-field__hint">Auto-append Dataverse search/schema/query tools</span>
                <label className="form-field__toggle">
                  <input
                    type="checkbox"
                    checked={formData.jw_allowmcp}
                    onChange={e => setFormData(prev => ({ ...prev, jw_allowmcp: e.target.checked }))}
                  />
                  <span className="form-field__toggle-track">
                    <span className="form-field__toggle-thumb" />
                  </span>
                  <span className="form-field__toggle-label">
                    {formData.jw_allowmcp ? 'Enabled' : 'Disabled'}
                  </span>
                </label>
              </div>

              <div className="form-field">
                <label className="form-field__label">Model Configuration</label>
                <span className="form-field__hint">temperature, max_completion_tokens, tool_choice</span>
                <div className="form-field__monaco-wrap">
                  <Editor
                    height="140px"
                    language="json"
                    value={formData.jw_modelconfig}
                    onChange={v => setFormData(prev => ({ ...prev, jw_modelconfig: v ?? '' }))}
                    theme="vs-dark"
                    loading={<div className="form-field__monaco-loading">Loading editor...</div>}
                    options={{
                      minimap: { enabled: false },
                      fontSize: 13,
                      lineNumbers: 'on',
                      scrollBeyondLastLine: false,
                      wordWrap: 'on',
                      padding: { top: 8, bottom: 8 },
                      renderLineHighlight: 'none',
                      automaticLayout: true,
                    }}
                  />
                </div>
              </div>

              <div className="agent-config__meta">
                <span>ID: {agentId?.slice(0, 8)}...</span>
                <span>Created: {agent.createdon ? new Date(agent.createdon as string).toLocaleString() : 'Unknown'}</span>
              </div>
            </div>
          )}

          {activeTab === 'prompt' && (
            <div className="agent-config__prompt">
              <div className="form-field__monaco-wrap agent-config__prompt-editor">
                <Editor
                  height="100%"
                  language="markdown"
                  value={formData.jw_systemprompt}
                  onChange={v => setFormData(prev => ({ ...prev, jw_systemprompt: v ?? '' }))}
                  theme="vs-dark"
                  loading={<div className="form-field__monaco-loading">Loading editor...</div>}
                  options={{
                    minimap: { enabled: false },
                    fontSize: 13,
                    lineNumbers: 'off',
                    scrollBeyondLastLine: false,
                    wordWrap: 'on',
                    padding: { top: 12, bottom: 12 },
                    renderLineHighlight: 'none',
                    automaticLayout: true,
                  }}
                />
              </div>
              <div className="agent-config__prompt-stats">
                ~{Math.ceil((formData.jw_systemprompt?.length ?? 0) / 4)} tokens
              </div>
            </div>
          )}

          {activeTab === 'tools' && (
            <div className="agent-config__tools">
              {tools.length === 0 ? (
                <p className="agent-config__tools-empty">No tools defined yet. Create tools first.</p>
              ) : (
                <div className="agent-config__tool-grid">
                  {tools.map(tool => (
                    <motion.div
                      key={tool.toolId}
                      className={`tool-card ${tool.bound ? 'tool-card--bound' : ''}`}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={() => toggleToolBinding(tool)}
                    >
                      <div className="tool-card__header">
                        <label className="tool-card__checkbox">
                          <input
                            type="checkbox"
                            checked={tool.bound}
                            onChange={() => toggleToolBinding(tool)}
                            onClick={e => e.stopPropagation()}
                          />
                          <span className="tool-card__checkmark" />
                        </label>
                        <code className="tool-card__name">{tool.toolName}</code>
                        <span className="tool-card__type">{tool.endpointType}</span>
                      </div>
                      {tool.description && (
                        <p className="tool-card__desc">{tool.description}</p>
                      )}
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
