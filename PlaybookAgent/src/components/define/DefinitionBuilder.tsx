/**
 * DefinitionBuilder — Creation wizard for new Agents or Playbooks.
 *
 * Two-panel layout:
 *   Left: Step-by-step form (name, description, config)
 *   Right: Live preview card
 *
 * On submit: creates the record in Dataverse and opens it in AgentCanvas.
 */

import { useState, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import { EntityCard } from './EntityCard';
import { jwAgents, jwPlaybooks } from '../../services/dataverse';
import toast from 'react-hot-toast';
import type { WorkspaceTabsReturn } from '../../hooks/useWorkspaceTabs';

// ─── Types ──────────────────────────────────────────────────────────────────

type EntityType = 'agent' | 'playbook';

interface DefinitionBuilderProps {
  entityType: EntityType;
  tabs: WorkspaceTabsReturn;
  onCreated?: (id: string) => void;
}

// ─── SVG Icons ──────────────────────────────────────────────────────────────

const icons = {
  agent: (
    <svg width="20" height="20" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3">
      <rect x="3" y="2" width="8" height="6" rx="2" />
      <circle cx="5.5" cy="5" r="0.8" fill="currentColor" />
      <circle cx="8.5" cy="5" r="0.8" fill="currentColor" />
      <path d="M4 10h6M5 10v2M9 10v2" strokeLinecap="round" />
    </svg>
  ),
  playbook: (
    <svg width="20" height="20" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3">
      <rect x="2" y="1" width="10" height="12" rx="1" />
      <path d="M5 4h4M5 7h4M5 10h2" strokeLinecap="round" />
    </svg>
  ),
  check: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M3 8l4 4 6-7" />
    </svg>
  ),
};

const DEFAULT_MODEL_CONFIG = `{
  "model": "gpt-5.2",
  "max_output_tokens": 4096,
  "tool_choice": "auto",
  "web_search": true,
  "reasoning_effort": "medium"
}`;

// ─── Component ──────────────────────────────────────────────────────────────

export function DefinitionBuilder({ entityType, tabs, onCreated }: DefinitionBuilderProps) {
  const isAgent = entityType === 'agent';

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [modelConfig, setModelConfig] = useState(DEFAULT_MODEL_CONFIG);
  const [allowMcp, setAllowMcp] = useState(true);
  const [creating, setCreating] = useState(false);
  const [step, setStep] = useState(1);

  const totalSteps = isAgent ? 3 : 2;

  const handleCreate = useCallback(async () => {
    if (!name.trim()) {
      toast.error('Name is required');
      return;
    }
    setCreating(true);
    try {
      if (isAgent) {
        const result = await jwAgents.create({
          jw_name: name.trim(),
          jw_systemprompt: systemPrompt,
          jw_modelconfig: modelConfig,
          jw_allowmcp: allowMcp,
        } as never);
        const newId = (result.data as unknown as Record<string, unknown>)?.jw_agentid as string;
        toast.success(`Agent "${name}" created`);
        if (newId) {
          onCreated?.(newId);
          // Open the new agent in AgentCanvas
          tabs.openTab({
            type: 'agent-canvas' as never,
            label: name.trim(),
            referenceId: newId,
          });
        }
      } else {
        const result = await jwPlaybooks.create({
          jw_name: name.trim(),
          jw_description: description,
        } as never);
        const newId = (result.data as unknown as Record<string, unknown>)?.jw_playbookid as string;
        toast.success(`Playbook "${name}" created`);
        if (newId) {
          onCreated?.(newId);
          // Open admin to manage the playbook
          tabs.openTab({
            type: 'admin',
            label: 'Admin',
            referenceId: 'jw_playbook',
            closable: true,
          });
        }
      }
    } catch (err) {
      toast.error('Create failed: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setCreating(false);
    }
  }, [name, description, systemPrompt, modelConfig, allowMcp, isAgent, tabs, onCreated]);

  const canAdvance = step === 1 ? name.trim().length > 0 : true;

  return (
    <div className="def-builder">
      {/* Left: Form */}
      <div className="def-builder__form">
        <div className="def-builder__form-header">
          <span className="def-builder__form-icon">{isAgent ? icons.agent : icons.playbook}</span>
          <h2 className="def-builder__form-title">
            New {isAgent ? 'Agent' : 'Playbook'}
          </h2>
          <span className="def-builder__step-indicator">
            Step {step}/{totalSteps}
          </span>
        </div>

        {/* Step 1: Name & Description */}
        {step === 1 && (
          <div className="def-builder__step">
            <div className="def-builder__field">
              <label className="def-builder__label">Name *</label>
              <input
                className="def-builder__input"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder={isAgent ? 'e.g. Invoice Processing Agent' : 'e.g. Invoice Approval Flow'}
                autoFocus
              />
            </div>

            <div className="def-builder__field">
              <label className="def-builder__label">Description</label>
              <textarea
                className="def-builder__textarea"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder={isAgent ? 'What does this agent do?' : 'What workflow does this playbook define?'}
                rows={3}
              />
            </div>
          </div>
        )}

        {/* Step 2 (Agent): System Prompt */}
        {step === 2 && isAgent && (
          <div className="def-builder__step">
            <div className="def-builder__field">
              <label className="def-builder__label">System Prompt</label>
              <span className="def-builder__hint">Instructions that define how the agent behaves</span>
              <div className="def-builder__monaco-wrap">
                <Editor
                  height="200px"
                  language="markdown"
                  value={systemPrompt}
                  onChange={v => setSystemPrompt(v ?? '')}
                  theme="vs-dark"
                  loading={<div className="def-builder__editor-loading">Loading...</div>}
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
          </div>
        )}

        {/* Step 2 (Playbook) or Step 3 (Agent): Config */}
        {((step === 2 && !isAgent) || (step === 3 && isAgent)) && (
          <div className="def-builder__step">
            {isAgent && (
              <>
                <div className="def-builder__field">
                  <label className="def-builder__label">Model Configuration</label>
                  <div className="def-builder__monaco-wrap">
                    <Editor
                      height="140px"
                      language="json"
                      value={modelConfig}
                      onChange={v => setModelConfig(v ?? '')}
                      theme="vs-dark"
                      loading={<div className="def-builder__editor-loading">Loading...</div>}
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

                <div className="def-builder__field def-builder__field--inline">
                  <label className="def-builder__label">MCP Discovery</label>
                  <label className="def-builder__toggle">
                    <input type="checkbox" checked={allowMcp} onChange={e => setAllowMcp(e.target.checked)} />
                    <span className="def-builder__toggle-track"><span className="def-builder__toggle-thumb" /></span>
                    <span>{allowMcp ? 'Enabled' : 'Disabled'}</span>
                  </label>
                </div>
              </>
            )}

            {!isAgent && (
              <div className="def-builder__field">
                <p className="def-builder__info">
                  Your playbook is ready to be created. After creation, you can add instructions
                  (steps) to define the workflow.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Navigation */}
        <div className="def-builder__nav">
          {step > 1 && (
            <button className="define-btn define-btn--outline" onClick={() => setStep(s => s - 1)}>
              Back
            </button>
          )}
          <div className="def-builder__nav-spacer" />
          {step < totalSteps ? (
            <button
              className="define-btn define-btn--primary"
              onClick={() => setStep(s => s + 1)}
              disabled={!canAdvance}
            >
              Next
            </button>
          ) : (
            <button
              className="define-btn define-btn--primary"
              onClick={handleCreate}
              disabled={creating || !name.trim()}
            >
              {creating ? 'Creating...' : `Create ${isAgent ? 'Agent' : 'Playbook'}`}
            </button>
          )}
        </div>
      </div>

      {/* Right: Live Preview */}
      <div className="def-builder__preview">
        <div className="def-builder__preview-header">Preview</div>
        <EntityCard
          icon={isAgent ? icons.agent : icons.playbook}
          title={name || (isAgent ? 'New Agent' : 'New Playbook')}
          subtitle={description || undefined}
          badges={[
            ...(isAgent && allowMcp ? [{ label: 'MCP', color: '#10b981' }] : []),
            ...(isAgent ? [{ label: 'No tools yet' }] : [{ label: 'No steps yet' }]),
          ]}
        >
          {isAgent && systemPrompt && (
            <div className="def-builder__preview-prompt">
              {systemPrompt.slice(0, 150)}{systemPrompt.length > 150 ? '...' : ''}
            </div>
          )}
        </EntityCard>

        {/* Creation checklist */}
        <div className="def-builder__checklist">
          <div className="def-builder__check-title">After creation:</div>
          {isAgent ? (
            <>
              <div className="def-builder__check-item">{icons.check} Link tools to define capabilities</div>
              <div className="def-builder__check-item">{icons.check} Add instructions for domain knowledge</div>
              <div className="def-builder__check-item">{icons.check} Test in chat to validate behavior</div>
            </>
          ) : (
            <>
              <div className="def-builder__check-item">{icons.check} Add instruction steps to define the workflow</div>
              <div className="def-builder__check-item">{icons.check} Link to cases to execute the playbook</div>
              <div className="def-builder__check-item">{icons.check} Assign agents to handle each step</div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
