/**
 * SemanticRenderer — THE core architectural component of the meta-app.
 *
 * Maps artifact type strings (from jw_artifact.jw_type) to React components.
 * The agent produces typed JSON artifacts → this component decides how to render them.
 * Supports bidirectional editing: user edits → updates the artifact payload.
 */

import { useState, useCallback, useMemo } from 'react';
import { VisualizationCard } from '../chat/VisualizationCard';
import { InteractiveTable } from '../chat/InteractiveTable';
import type { CreateVisualInput } from '../../types/agent';

// ─── Artifact Shape (matches jw_artifact) ────────────────────────────────────

export interface ArtifactData {
  id: string;
  name: string;
  type: string;
  payload: string; // JSON string
  referenceKey?: string;
  caseId?: string;
  parentArtifactId?: string;
  createdOn?: string;
  modifiedOn?: string;
}

// ─── Renderer Registry ───────────────────────────────────────────────────────

interface RendererProps {
  artifact: ArtifactData;
  payload: unknown;
  onPayloadChange?: (newPayload: unknown) => void;
  compact?: boolean;
}

type ArtifactRenderer = React.FC<RendererProps>;

const RENDERER_REGISTRY: Record<string, ArtifactRenderer> = {
  Chart: ChartRenderer,
  Report: MarkdownRenderer,
  Analysis: MarkdownRenderer,
  Markdown: MarkdownRenderer,
  InvoiceTable: TableRenderer,
  InvoiceData: TableRenderer,
  Table: TableRenderer,
  SapOrder: SapOrderRenderer,
  SapApprovalPayload: SapOrderRenderer,
  JSON: JsonTreeRenderer,
  Dashboard: DashboardRenderer,
  Summary: SummaryRenderer,
};

/** The type badge colors for different artifact categories */
const TYPE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  Chart: { bg: '#eef2ff', text: '#4338ca', border: '#c7d2fe' },
  Report: { bg: '#f0fdf4', text: '#166534', border: '#bbf7d0' },
  Analysis: { bg: '#faf5ff', text: '#7c3aed', border: '#ddd6fe' },
  Markdown: { bg: '#f8fafc', text: '#475569', border: '#e2e8f0' },
  InvoiceTable: { bg: '#fff7ed', text: '#c2410c', border: '#fed7aa' },
  InvoiceData: { bg: '#fff7ed', text: '#c2410c', border: '#fed7aa' },
  Table: { bg: '#f0f9ff', text: '#0369a1', border: '#bae6fd' },
  SapOrder: { bg: '#fefce8', text: '#a16207', border: '#fef08a' },
  SapApprovalPayload: { bg: '#fefce8', text: '#a16207', border: '#fef08a' },
  JSON: { bg: '#f1f5f9', text: '#334155', border: '#cbd5e1' },
  Dashboard: { bg: '#ecfdf5', text: '#065f46', border: '#a7f3d0' },
  Summary: { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe' },
};

const DEFAULT_TYPE_COLOR = { bg: '#f8fafc', text: '#64748b', border: '#e2e8f0' };

// ─── Main Component ──────────────────────────────────────────────────────────

interface SemanticRendererProps {
  artifact: ArtifactData;
  onPayloadChange?: (artifactId: string, newPayload: unknown) => void;
  compact?: boolean;
}

export function SemanticRenderer({ artifact, onPayloadChange, compact }: SemanticRendererProps) {
  const payload = useMemo(() => {
    try {
      return JSON.parse(artifact.payload);
    } catch {
      return artifact.payload;
    }
  }, [artifact.payload]);

  const handlePayloadChange = useCallback((newPayload: unknown) => {
    onPayloadChange?.(artifact.id, newPayload);
  }, [artifact.id, onPayloadChange]);

  const Renderer = RENDERER_REGISTRY[artifact.type] ?? JsonTreeRenderer;
  const typeColor = TYPE_COLORS[artifact.type] ?? DEFAULT_TYPE_COLOR;

  return (
    <div className="semantic-renderer">
      <div className="semantic-renderer__header">
        <span
          className="semantic-renderer__type-badge"
          style={{ background: typeColor.bg, color: typeColor.text, borderColor: typeColor.border }}
        >
          {artifact.type}
        </span>
        <span className="semantic-renderer__name">{artifact.name}</span>
        {artifact.modifiedOn && (
          <span className="semantic-renderer__timestamp">
            {new Date(artifact.modifiedOn).toLocaleString()}
          </span>
        )}
      </div>
      <div className="semantic-renderer__body">
        <Renderer
          artifact={artifact}
          payload={payload}
          onPayloadChange={handlePayloadChange}
          compact={compact}
        />
      </div>
    </div>
  );
}

/** Utility to get the type color for external use (e.g. artifact list badges) */
export function getArtifactTypeColor(type: string) {
  return TYPE_COLORS[type] ?? DEFAULT_TYPE_COLOR;
}

/** Get all registered artifact types */
export function getRegisteredTypes(): string[] {
  return Object.keys(RENDERER_REGISTRY);
}

// ─── Chart Renderer ──────────────────────────────────────────────────────────

function ChartRenderer({ payload, compact }: RendererProps) {
  const input = payload as CreateVisualInput;
  if (compact) {
    return (
      <div className="semantic-renderer__compact-preview">
        <span className="semantic-renderer__compact-icon">chart</span>
        <span>{input.title || 'Chart'}</span>
      </div>
    );
  }
  return <VisualizationCard input={input} />;
}

// ─── Markdown / Report / Analysis Renderer ───────────────────────────────────

function MarkdownRenderer({ payload, compact }: RendererProps) {
  const content = typeof payload === 'string' ? payload : (payload as { content?: string })?.content ?? JSON.stringify(payload, null, 2);

  if (compact) {
    return (
      <div className="semantic-renderer__compact-preview">
        <span className="semantic-renderer__compact-icon">doc</span>
        <span>{content.slice(0, 80)}{content.length > 80 ? '...' : ''}</span>
      </div>
    );
  }

  return (
    <div className="semantic-renderer__markdown">
      <MarkdownContent content={content} />
    </div>
  );
}

/** Simple markdown-to-HTML renderer for common patterns */
function MarkdownContent({ content }: { content: string }) {
  const html = useMemo(() => {
    let result = content
      // Escape HTML
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      // Headers
      .replace(/^### (.+)$/gm, '<h4>$1</h4>')
      .replace(/^## (.+)$/gm, '<h3>$1</h3>')
      .replace(/^# (.+)$/gm, '<h2>$1</h2>')
      // Bold and italic
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      // Code blocks
      .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code class="lang-$1">$2</code></pre>')
      // Inline code
      .replace(/`(.+?)`/g, '<code>$1</code>')
      // Unordered lists
      .replace(/^[*-] (.+)$/gm, '<li>$1</li>')
      // Ordered lists
      .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
      // Horizontal rules
      .replace(/^---$/gm, '<hr />')
      // Paragraphs (double newline)
      .replace(/\n\n/g, '</p><p>')
      // Single newlines within paragraphs
      .replace(/\n/g, '<br />');

    // Wrap consecutive <li> elements in <ul>
    result = result.replace(/((?:<li>.*?<\/li>\s*)+)/g, '<ul>$1</ul>');

    return `<p>${result}</p>`;
  }, [content]);

  return <div className="markdown-body" dangerouslySetInnerHTML={{ __html: html }} />;
}

// ─── Table Renderer ──────────────────────────────────────────────────────────

function TableRenderer({ payload, compact }: RendererProps) {
  const data = useMemo(() => {
    if (Array.isArray(payload)) return payload;
    const p = payload as Record<string, unknown>;
    if (p?.items && Array.isArray(p.items)) return p.items as Record<string, unknown>[];
    if (p?.rows && Array.isArray(p.rows)) return p.rows as Record<string, unknown>[];
    if (p?.data && Array.isArray(p.data)) return p.data as Record<string, unknown>[];
    return [payload as Record<string, unknown>];
  }, [payload]);

  const title = (payload as Record<string, unknown>)?.title as string | undefined;

  if (compact) {
    return (
      <div className="semantic-renderer__compact-preview">
        <span className="semantic-renderer__compact-icon">table</span>
        <span>{title || `${data.length} rows`}</span>
      </div>
    );
  }

  return (
    <div>
      {title && <div className="semantic-renderer__section-title">{title}</div>}
      <InteractiveTable
        data={data}
        sortable
        filterable
        pageSize={10}
      />
    </div>
  );
}

// ─── SAP Order Renderer ──────────────────────────────────────────────────────

function SapOrderRenderer({ payload, onPayloadChange, compact }: RendererProps) {
  const data = payload as Record<string, unknown>;
  const [editMode, setEditMode] = useState(false);

  if (compact) {
    return (
      <div className="semantic-renderer__compact-preview">
        <span className="semantic-renderer__compact-icon">sap</span>
        <span>{String(data.orderNumber || data.OrderNumber || 'SAP Order')}</span>
      </div>
    );
  }

  const fields = Object.entries(data).filter(([key]) => !key.startsWith('_'));

  return (
    <div className="semantic-renderer__form">
      <div className="semantic-renderer__form-header">
        <span>SAP Order Details</span>
        {onPayloadChange && (
          <button
            className="semantic-renderer__edit-btn"
            onClick={() => setEditMode(!editMode)}
          >
            {editMode ? 'Done' : 'Edit'}
          </button>
        )}
      </div>
      <div className="semantic-renderer__form-grid">
        {fields.map(([key, value]) => (
          <div key={key} className="semantic-renderer__form-field">
            <label className="semantic-renderer__field-label">{formatFieldLabel(key)}</label>
            {editMode ? (
              <input
                className="semantic-renderer__field-input"
                value={String(value ?? '')}
                onChange={(e) => onPayloadChange?.({ ...data, [key]: e.target.value })}
              />
            ) : (
              <span className="semantic-renderer__field-value">
                {formatFieldValue(value)}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── JSON Tree Renderer ──────────────────────────────────────────────────────

function JsonTreeRenderer({ payload, compact }: RendererProps) {
  const [expanded, setExpanded] = useState(true);
  const jsonStr = typeof payload === 'string' ? payload : JSON.stringify(payload, null, 2);
  const lineCount = jsonStr.split('\n').length;

  if (compact) {
    return (
      <div className="semantic-renderer__compact-preview">
        <span className="semantic-renderer__compact-icon">json</span>
        <span>{lineCount} lines</span>
      </div>
    );
  }

  return (
    <div className="semantic-renderer__json">
      <button
        className="semantic-renderer__json-toggle"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? 'Collapse' : 'Expand'} ({lineCount} lines)
      </button>
      {expanded && (
        <pre className="semantic-renderer__json-content">{jsonStr}</pre>
      )}
    </div>
  );
}

// ─── Dashboard Renderer ──────────────────────────────────────────────────────

function DashboardRenderer({ payload, compact }: RendererProps) {
  const data = payload as { title?: string; artifactIds?: string[]; widgets?: unknown[] };

  if (compact) {
    return (
      <div className="semantic-renderer__compact-preview">
        <span className="semantic-renderer__compact-icon">grid</span>
        <span>{data.title || 'Dashboard'}</span>
      </div>
    );
  }

  return (
    <div className="semantic-renderer__dashboard">
      {data.title && <h3 className="semantic-renderer__section-title">{data.title}</h3>}
      <div className="semantic-renderer__dashboard-hint">
        Dashboard with {data.artifactIds?.length ?? data.widgets?.length ?? 0} widgets.
        Linked artifacts will render here when loaded.
      </div>
    </div>
  );
}

// ─── Summary Renderer ────────────────────────────────────────────────────────

function SummaryRenderer({ payload, compact }: RendererProps) {
  const data = payload as Record<string, unknown>;
  const content = (data.content ?? data.summary ?? data.text ?? JSON.stringify(data, null, 2)) as string;

  if (compact) {
    return (
      <div className="semantic-renderer__compact-preview">
        <span className="semantic-renderer__compact-icon">sum</span>
        <span>{String(content).slice(0, 60)}...</span>
      </div>
    );
  }

  return (
    <div className="semantic-renderer__summary">
      {data.title ? <h4 className="semantic-renderer__section-title">{String(data.title)}</h4> : null}
      <MarkdownContent content={typeof content === 'string' ? content : JSON.stringify(content, null, 2)} />
      {Array.isArray(data.keyPoints) && (
        <div className="semantic-renderer__key-points">
          <h5>Key Points</h5>
          <ul>
            {(data.keyPoints as string[]).map((point, i) => (
              <li key={i}>{point}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatFieldLabel(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .replace(/^\w/, c => c.toUpperCase())
    .trim();
}

function formatFieldValue(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number') return value.toLocaleString();
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}
