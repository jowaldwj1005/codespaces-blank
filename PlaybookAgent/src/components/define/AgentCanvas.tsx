/**
 * AgentCanvas — Rich agent configuration view opened from sidebar "Define" section.
 *
 * Shows: agent info card, linked tools, linked instructions, model config.
 * Allows inline editing, tool binding toggle, and "Test in Chat" action.
 */

import { useState, useEffect, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import { EntityCard } from './EntityCard';
import { ENTITY_REGISTRY } from '../admin/EntityRegistry';
import { jwAgents, jwTools, jwAgentTools, jwInstructions, linkAgentTool } from '../../services/dataverse';
import toast from 'react-hot-toast';
import type { WorkspaceTabsReturn } from '../../hooks/useWorkspaceTabs';

// ─── Types ──────────────────────────────────────────────────────────────────

interface ToolBinding {
  toolId: string;
  name: string;
  description: string;
  endpointType: string;
  bound: boolean;
  junctionId?: string;
}

interface InstructionRecord {
  id: string;
  name: string;
  type: string;
  tags: string;
}

interface AgentCanvasProps {
  agentId: string;
  tabs: WorkspaceTabsReturn;
}

// ─── SVG Icons ──────────────────────────────────────────────────────────────

const icons = {
  tool: (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3">
      <path d="M8.5 2.5l3 3-7.5 7.5H1v-3z" strokeLinejoin="round" />
    </svg>
  ),
  instruction: (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3">
      <rect x="2" y="1" width="10" height="12" rx="1" />
      <path d="M5 4h4M5 7h4M5 10h2" strokeLinecap="round" />
    </svg>
  ),
  link: (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.3">
      <path d="M5 7l2-2M3.5 6.5l-1 1a2 2 0 002.8 2.8l1-1M7.5 5.5l1-1a2 2 0 00-2.8-2.8l-1 1" />
    </svg>
  ),
  unlink: (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.3">
      <path d="M3.5 6.5l-1 1a2 2 0 002.8 2.8l1-1M7.5 5.5l1-1a2 2 0 00-2.8-2.8l-1 1M2 2l8 8" />
    </svg>
  ),
};

const ENDPOINT_LABELS: Record<string, string> = {
  '100000000': 'Cloud Flow',
  '100000001': 'Connector',
  '100000002': 'Builtin',
};

// ─── Component ──────────────────────────────────────────────────────────────

export function AgentCanvas({ agentId, tabs }: AgentCanvasProps) {
  const [agent, setAgent] = useState<Record<string, unknown> | null>(null);
  const [tools, setTools] = useState<ToolBinding[]>([]);
  const [instructions, setInstructions] = useState<InstructionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Editable fields
  const [name, setName] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [modelConfig, setModelConfig] = useState('{}');
  const [allowMcp, setAllowMcp] = useState(false);

  // Active section
  const [activeSection, setActiveSection] = useState<'overview' | 'prompt' | 'tools' | 'instructions'>('overview');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [agentRes, toolsRes, junctionRes, instrRes] = await Promise.all([
        jwAgents.get(agentId),
        jwTools.getAll(),
        jwAgentTools.getAll({ filter: `_jw_agentid_value eq '${agentId}'` } as never),
        jwInstructions.getAll({ top: 50 } as never),
      ]);

      const a = agentRes.data;
      if (a) {
        setAgent(a as unknown as Record<string, unknown>);
        setName(a.jw_name ?? '');
        setSystemPrompt(a.jw_systemprompt ?? '');
        setModelConfig(a.jw_modelconfig ?? '{}');
        setAllowMcp((a.jw_allowmcp as unknown) === 1 || (a.jw_allowmcp as unknown) === true);
      }

      const allTools = (toolsRes.data ?? []) as unknown as Array<Record<string, unknown>>;
      const junctions = (junctionRes.data ?? []) as unknown as Array<Record<string, unknown>>;
      const boundToolIds = new Set(junctions.map(j => j._jw_toolid_value as string));

      setTools(allTools.map(t => ({
        toolId: t.jw_toolid as string,
        name: t.jw_name as string,
        description: (t.jw_description as string)?.slice(0, 120) ?? '',
        endpointType: ENDPOINT_LABELS[String(t.jw_endpointtype)] ?? 'Unknown',
        bound: boundToolIds.has(t.jw_toolid as string),
        junctionId: junctions.find(j => j._jw_toolid_value === t.jw_toolid)?.jw_agenttoolid as string | undefined,
      })));

      const allInstr = (instrRes.data ?? []) as unknown as Array<Record<string, unknown>>;
      setInstructions(allInstr.map(i => ({
        id: i.jw_instructionid as string,
        name: (i.jw_name ?? 'Unnamed') as string,
        type: (i.jw_type ?? '') as string,
        tags: (i.jw_tags ?? '') as string,
      })));
    } catch (err) {
      toast.error('Failed to load agent: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await jwAgents.update(agentId, {
        jw_name: name,
        jw_systemprompt: systemPrompt,
        jw_modelconfig: modelConfig,
        jw_allowmcp: allowMcp,
      } as never);
      toast.success('Agent saved');
    } catch (err) {
      toast.error('Save failed: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setSaving(false);
    }
  };

  const toggleTool = async (tool: ToolBinding) => {
    try {
      if (tool.bound && tool.junctionId) {
        await jwAgentTools.delete(tool.junctionId);
        toast.success(`Unlinked ${tool.name}`);
      } else {
        await linkAgentTool(agentId, tool.toolId);
        toast.success(`Linked ${tool.name}`);
      }
      await load();
    } catch (err) {
      toast.error('Failed: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleTestInChat = () => {
    tabs.openTab({
      type: 'explore',
      label: `Test: ${name}`,
      referenceId: `test-${agentId}-${Date.now()}`,
    });
  };

  if (loading) {
    return (
      <div className="agent-canvas agent-canvas--loading">
        <div className="record-list__spinner" />
        <span>Loading agent...</span>
      </div>
    );
  }

  if (!agent) {
    return <div className="agent-canvas agent-canvas--empty">Agent not found</div>;
  }

  const boundCount = tools.filter(t => t.bound).length;
  const promptTokens = Math.ceil((systemPrompt?.length ?? 0) / 4);

  return (
    <div className="agent-canvas">
      {/* Header */}
      <div className="agent-canvas__header">
        <div className="agent-canvas__title-row">
          <span className="agent-canvas__icon">{ENTITY_REGISTRY.jw_agent.icon}</span>
          <input
            className="agent-canvas__name-input"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Agent Name"
          />
        </div>
        <div className="agent-canvas__header-actions">
          <button className="define-btn define-btn--outline" onClick={handleTestInChat}>
            Test in Chat
          </button>
          <button className="define-btn define-btn--primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {/* Quick stats */}
      <div className="agent-canvas__stats">
        <span className="agent-canvas__stat">
          {icons.tool} {boundCount} tools
        </span>
        <span className="agent-canvas__stat">
          {icons.instruction} {instructions.length} instructions
        </span>
        <span className="agent-canvas__stat">
          ~{promptTokens} prompt tokens
        </span>
        <span className="agent-canvas__stat">
          MCP: {allowMcp ? 'On' : 'Off'}
        </span>
      </div>

      {/* Section tabs */}
      <div className="agent-canvas__tabs">
        {(['overview', 'prompt', 'tools', 'instructions'] as const).map(s => (
          <button
            key={s}
            className={`agent-canvas__tab ${activeSection === s ? 'agent-canvas__tab--active' : ''}`}
            onClick={() => setActiveSection(s)}
          >
            {s === 'overview' && 'Overview'}
            {s === 'prompt' && 'System Prompt'}
            {s === 'tools' && `Tools (${boundCount})`}
            {s === 'instructions' && `Instructions (${instructions.length})`}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="agent-canvas__content">
        {activeSection === 'overview' && (
          <div className="agent-canvas__overview">
            <div className="agent-canvas__field">
              <label>Model Configuration</label>
              <div className="agent-canvas__monaco-wrap">
                <Editor
                  height="120px"
                  language="json"
                  value={modelConfig}
                  onChange={v => setModelConfig(v ?? '')}
                  theme="vs-dark"
                  loading={<div className="agent-canvas__editor-loading">Loading...</div>}
                  options={{
                    minimap: { enabled: false },
                    fontSize: 13,
                    lineNumbers: 'off',
                    scrollBeyondLastLine: false,
                    wordWrap: 'on',
                    padding: { top: 8, bottom: 8 },
                    renderLineHighlight: 'none',
                    automaticLayout: true,
                  }}
                />
              </div>
            </div>

            <div className="agent-canvas__field">
              <label>
                MCP Discovery
                <label className="agent-canvas__toggle">
                  <input type="checkbox" checked={allowMcp} onChange={e => setAllowMcp(e.target.checked)} />
                  <span className="agent-canvas__toggle-track"><span className="agent-canvas__toggle-thumb" /></span>
                </label>
              </label>
              <span className="agent-canvas__hint">Auto-append Dataverse search, schema, and query tools</span>
            </div>

            <div className="agent-canvas__meta">
              <span>ID: {agentId.slice(0, 8)}...</span>
              {typeof agent.createdon === 'string' && <span>Created: {new Date(agent.createdon).toLocaleDateString()}</span>}
            </div>
          </div>
        )}

        {activeSection === 'prompt' && (
          <div className="agent-canvas__prompt">
            <div className="agent-canvas__monaco-wrap agent-canvas__prompt-editor">
              <Editor
                height="100%"
                language="markdown"
                value={systemPrompt}
                onChange={v => setSystemPrompt(v ?? '')}
                theme="vs-dark"
                loading={<div className="agent-canvas__editor-loading">Loading...</div>}
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
            <div className="agent-canvas__prompt-stats">~{promptTokens} tokens</div>
          </div>
        )}

        {activeSection === 'tools' && (
          <div className="agent-canvas__tools">
            {tools.length === 0 ? (
              <div className="agent-canvas__empty">No tools defined. Create tools in Admin first.</div>
            ) : (
              <div className="agent-canvas__tool-grid">
                {tools.map(tool => (
                  <EntityCard
                    key={tool.toolId}
                    icon={icons.tool}
                    title={tool.name}
                    subtitle={tool.description}
                    meta={tool.endpointType}
                    selected={tool.bound}
                    onClick={() => toggleTool(tool)}
                    badges={tool.bound ? [{ label: 'Linked', color: '#10b981' }] : []}
                    actions={[{
                      label: tool.bound ? 'Unlink' : 'Link',
                      onClick: () => toggleTool(tool),
                      variant: tool.bound ? 'danger' : 'primary',
                    }]}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {activeSection === 'instructions' && (
          <div className="agent-canvas__instructions">
            {instructions.length === 0 ? (
              <div className="agent-canvas__empty">
                No instructions linked to this agent.
                <br />
                Create instructions in Admin and link them via the agent lookup field.
              </div>
            ) : (
              <div className="agent-canvas__instr-grid">
                {instructions.map(instr => (
                  <EntityCard
                    key={instr.id}
                    icon={icons.instruction}
                    title={instr.name}
                    meta={instr.type}
                    badges={instr.tags ? instr.tags.split(',').map(t => ({ label: t.trim() })) : []}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
