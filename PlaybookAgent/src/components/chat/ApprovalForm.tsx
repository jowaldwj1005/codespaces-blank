/**
 * ApprovalForm — Human-in-the-Loop approval UI.
 * Renders structured forms for known tool types (SAP, Dataverse, etc.)
 * Falls back to JSON editor for unknown tools.
 */

import { useState, useMemo } from 'react';
import type { PendingToolCall } from '../../types/agent';

interface ApprovalFormProps {
  toolCall: PendingToolCall;
  onApprove: (callId: string, editedArgs?: Record<string, unknown>) => void;
  onReject: (callId: string) => void;
}

/** Registry of tool-specific field schemas for structured rendering */
const TOOL_FIELD_SCHEMAS: Record<string, FieldDef[]> = {
  query_sap: [
    { key: 'method', label: 'HTTP Method', type: 'select', options: ['GET', 'POST', 'PATCH', 'DELETE'] },
    { key: 'endpoint', label: 'OData Endpoint', type: 'text' },
    { key: 'queryString', label: 'Query Parameters', type: 'text' },
    { key: 'body', label: 'Request Body', type: 'json' },
  ],
  create_dataverse_record: [
    { key: 'table', label: 'Table Name', type: 'text' },
    { key: 'data', label: 'Record Data', type: 'json' },
  ],
  update_dataverse_record: [
    { key: 'table', label: 'Table Name', type: 'text' },
    { key: 'id', label: 'Record ID', type: 'text' },
    { key: 'data', label: 'Update Data', type: 'json' },
  ],
  analyze_document: [
    { key: 'documentUrl', label: 'Document URL', type: 'text' },
    { key: 'modelId', label: 'Model', type: 'select', options: ['prebuilt-invoice', 'prebuilt-receipt', 'prebuilt-layout', 'prebuilt-read'] },
  ],
  save_artifact: [
    { key: 'type', label: 'Artifact Type', type: 'text' },
    { key: 'name', label: 'Name', type: 'text' },
    { key: 'payload', label: 'Payload', type: 'json' },
    { key: 'caseId', label: 'Case ID', type: 'text' },
  ],
  start_playbook: [
    { key: 'playbookId', label: 'Playbook ID', type: 'text' },
    { key: 'title', label: 'Case Title', type: 'text' },
  ],
  link_agent_tool: [
    { key: 'agentId', label: 'Agent ID', type: 'text' },
    { key: 'toolId', label: 'Tool ID', type: 'text' },
  ],
};

interface FieldDef {
  key: string;
  label: string;
  type: 'text' | 'number' | 'json' | 'boolean' | 'select';
  options?: string[];
}

export function ApprovalForm({ toolCall, onApprove, onReject }: ApprovalFormProps) {
  const [mode, setMode] = useState<'structured' | 'json'>('structured');
  const [editedArgs, setEditedArgs] = useState<Record<string, unknown>>({ ...toolCall.arguments });
  const [editedJson, setEditedJson] = useState(JSON.stringify(toolCall.arguments, null, 2));
  const [jsonError, setJsonError] = useState<string | null>(null);

  const fieldSchema = TOOL_FIELD_SCHEMAS[toolCall.toolName];
  const hasStructuredView = !!fieldSchema;

  // Merge schema fields with actual args to show unknown fields too
  const allFields = useMemo(() => {
    if (!fieldSchema) return null;
    const schemaKeys = new Set(fieldSchema.map(f => f.key));
    const extraFields: FieldDef[] = Object.keys(editedArgs)
      .filter(k => !schemaKeys.has(k))
      .map(k => ({
        key: k,
        label: formatLabel(k),
        type: (typeof editedArgs[k] === 'object' ? 'json' : 'text') as FieldDef['type'],
      }));
    return [...fieldSchema, ...extraFields];
  }, [fieldSchema, editedArgs]);

  const handleApprove = () => {
    if (mode === 'json') {
      try {
        const parsed = JSON.parse(editedJson);
        onApprove(toolCall.callId, parsed);
      } catch (err) {
        setJsonError(err instanceof Error ? err.message : 'Invalid JSON');
        return;
      }
    } else {
      onApprove(toolCall.callId, editedArgs);
    }
  };

  const updateField = (key: string, value: unknown) => {
    setEditedArgs(prev => ({ ...prev, [key]: value }));
  };

  const toolCategory = getToolCategory(toolCall.toolName);

  return (
    <div className={`approval-form approval-form--${toolCategory}`}>
      <div className="approval-form__header">
        <div className="approval-form__title-row">
          <span className={`approval-form__category-badge approval-form__category-badge--${toolCategory}`}>
            {toolCategory}
          </span>
          <span className="approval-form__title">
            {toolCall.toolName}
          </span>
        </div>
        {hasStructuredView && (
          <div className="approval-form__mode-toggle">
            <button
              className={`approval-form__mode-btn ${mode === 'structured' ? 'approval-form__mode-btn--active' : ''}`}
              onClick={() => setMode('structured')}
            >
              Form
            </button>
            <button
              className={`approval-form__mode-btn ${mode === 'json' ? 'approval-form__mode-btn--active' : ''}`}
              onClick={() => {
                setMode('json');
                setEditedJson(JSON.stringify(editedArgs, null, 2));
              }}
            >
              JSON
            </button>
          </div>
        )}
      </div>

      <div className="approval-form__payload">
        {mode === 'structured' && allFields ? (
          <div className="approval-form__fields">
            {allFields.map(field => (
              <div key={field.key} className="approval-form__field">
                <label className="approval-form__field-label">{field.label}</label>
                <FieldInput
                  field={field}
                  value={editedArgs[field.key]}
                  onChange={(val) => updateField(field.key, val)}
                />
              </div>
            ))}
          </div>
        ) : (
          <>
            <textarea
              className="approval-form__editor"
              value={editedJson}
              onChange={(e) => {
                setEditedJson(e.target.value);
                setJsonError(null);
              }}
            />
            {jsonError && (
              <div className="approval-form__error">{jsonError}</div>
            )}
          </>
        )}
      </div>

      <div className="approval-form__actions">
        <button className="approval-form__approve" onClick={handleApprove}>
          Approve
        </button>
        <button className="approval-form__reject" onClick={() => onReject(toolCall.callId)}>
          Reject
        </button>
      </div>
    </div>
  );
}

// ─── Field Input Component ───────────────────────────────────────────────────

function FieldInput({ field, value, onChange }: { field: FieldDef; value: unknown; onChange: (val: unknown) => void }) {
  switch (field.type) {
    case 'select':
      return (
        <select
          className="approval-form__field-select"
          value={String(value ?? '')}
          onChange={e => onChange(e.target.value)}
        >
          <option value="">— Select —</option>
          {field.options?.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      );

    case 'boolean':
      return (
        <label className="approval-form__field-checkbox">
          <input
            type="checkbox"
            checked={!!value}
            onChange={e => onChange(e.target.checked)}
          />
          <span>{value ? 'Yes' : 'No'}</span>
        </label>
      );

    case 'number':
      return (
        <input
          className="approval-form__field-input"
          type="number"
          value={String(value ?? '')}
          onChange={e => onChange(Number(e.target.value))}
        />
      );

    case 'json': {
      const jsonStr = typeof value === 'string' ? value : JSON.stringify(value ?? {}, null, 2);
      return (
        <textarea
          className="approval-form__field-json"
          value={jsonStr}
          onChange={e => {
            try {
              onChange(JSON.parse(e.target.value));
            } catch {
              // Keep as string while editing
              onChange(e.target.value);
            }
          }}
          rows={Math.min(8, jsonStr.split('\n').length + 1)}
        />
      );
    }

    default:
      return (
        <input
          className="approval-form__field-input"
          type="text"
          value={String(value ?? '')}
          onChange={e => onChange(e.target.value)}
        />
      );
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getToolCategory(toolName: string): string {
  if (toolName.includes('sap')) return 'sap';
  if (toolName.includes('dataverse') || toolName.includes('link_agent')) return 'dataverse';
  if (toolName.includes('document') || toolName.includes('analyze')) return 'docint';
  if (toolName.includes('artifact') || toolName.includes('playbook') || toolName.includes('instruction')) return 'agent';
  return 'default';
}

function formatLabel(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .replace(/^\w/, c => c.toUpperCase())
    .trim();
}
