/**
 * Agent Runtime Types — TypeScript interfaces for the Custom Agent Loop.
 * Maps to jw_ Dataverse entities and Azure OpenAI API shapes.
 */

// ─── Azure OpenAI Compatible Message Types ───────────────────────────────────

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
  name?: string;
  /** Chain-of-thought reasoning summaries from Responses API */
  reasoning_content?: string;
  /** URL citations from web search results (Responses API) */
  citations?: Array<{ url: string; title?: string }>;
}

export interface ToolCall {
  id: string;
  type: 'function';
  function: { name: string; arguments: string };
}

// ─── Tool Definition (maps to jw_tool) ───────────────────────────────────────

export type EndpointType = 'CloudFlow' | 'CustomConnector' | 'InternalReact';

export interface ToolDefinition {
  id: string;
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  requiresApproval: boolean;
  endpointType: EndpointType;
  executionTarget?: string;
}

// ─── Agent Definition (maps to jw_agent + expanded tools) ────────────────────

export interface ModelConfig {
  /** Model deployment name (e.g. 'gpt-5.2', 'o4-mini'). Passed in body for Responses API. */
  model?: string;
  // NOTE: temperature removed — Responses API defaults to 1 internally, not configurable
  max_output_tokens?: number;
  /** @deprecated Use max_output_tokens instead (Responses API naming) */
  max_completion_tokens?: number;
  tool_choice?: 'auto' | 'required' | 'none';
  /** Reasoning effort: 'low' | 'medium' | 'high'. Only set for models that support it. */
  reasoning_effort?: 'low' | 'medium' | 'high';
  /** Enable web search tool for this agent */
  web_search?: boolean;
}

/** Runtime capabilities that can be toggled per agent or globally */
export interface AgentCapabilities {
  /** Allow delete operations on Dataverse records (default: false) */
  allowDelete?: boolean;
}

export interface AgentDefinition {
  id: string;
  name: string;
  systemPrompt: string;
  modelConfig: ModelConfig;
  allowMcp: boolean;
  tools: ToolDefinition[];
  capabilities?: AgentCapabilities;
}

// ─── Agent Loop State ────────────────────────────────────────────────────────

export type AgentStatus =
  | 'idle'
  | 'thinking'
  | 'tool_calling'
  | 'awaiting_approval'
  | 'sub_agent'
  | 'error';

export interface PendingToolCall {
  callId: string;
  toolName: string;
  arguments: Record<string, unknown>;
  status: 'pending' | 'approved' | 'rejected' | 'executing' | 'completed' | 'error';
  requiresApproval: boolean;
  response?: unknown;
  error?: string;
}

export interface TokenUsage {
  /** Responses API: input_tokens */
  inputTokens: number;
  /** Responses API: output_tokens */
  outputTokens: number;
  totalTokens: number;
  /** Tokens used for chain-of-thought reasoning */
  reasoningTokens?: number;
  /** Input tokens served from cache (reduces cost) */
  cachedTokens?: number;
}

export interface AgentLoopState {
  threadId: string;
  agentId: string;
  status: AgentStatus;
  messages: ChatMessage[];
  pendingToolCalls: PendingToolCall[];
  tokenUsage: TokenUsage;
  error?: string;
}

// ─── Agent Events (emitted during loop for UI updates) ───────────────────────

export type AgentEvent =
  | { type: 'status_change'; status: AgentStatus }
  | { type: 'message_added'; message: ChatMessage }
  | { type: 'tool_call_started'; toolCall: PendingToolCall }
  | { type: 'tool_call_updated'; callId: string; update: Partial<PendingToolCall> }
  | { type: 'token_update'; usage: TokenUsage }
  | { type: 'reasoning'; content: string }
  | { type: 'sub_agent_spawned'; threadId: string; agentName: string; task: string }
  | { type: 'sub_agent_event'; threadId: string; event: AgentEvent }
  | { type: 'sub_agent_completed'; threadId: string; result: string }
  | { type: 'visual_created'; visualId: string; input: CreateVisualInput }
  | { type: 'error'; error: string }
  | { type: 'completed'; finalMessage: string };

// ─── create_visual Tool Input ────────────────────────────────────────────────

export interface CreateVisualInput {
  chartType: 'bar' | 'line' | 'pie' | 'area' | 'scatter' | 'radar' | 'treemap' | 'table' | '3d';
  title: string;
  data: Record<string, unknown>[];
  xAxisKey?: string;
  yAxisKey?: string | string[];
  colors?: string[];
  options?: {
    interactive?: boolean;
    stacked?: boolean;
    legend?: boolean;
    sortable?: boolean;
    filterable?: boolean;
    pageSize?: number;
  };
  caseId?: string;
  artifactType?: string;
  artifactName?: string;
}

// ─── Thread Summary (for sidebar) ────────────────────────────────────────────

export interface ThreadSummary {
  id: string;
  title: string;
  agentId: string;
  agentName?: string;
  parentThreadId?: string;
  status: 'Active' | 'Completed' | 'Cancelled';
  createdOn: string;
  modifiedOn: string;
}

// ─── Interactive Cards (ask_user tool) ────────────────────────────────────────

export type InteractiveCard =
  | { type: 'choice'; prompt: string; options: Array<{ label: string; value: string; description?: string }>; allowMultiple?: boolean }
  | { type: 'confirm'; prompt: string; confirmLabel?: string; cancelLabel?: string }
  | { type: 'form'; prompt: string; fields: CardField[] }
  | { type: 'rating'; prompt: string; max?: number };

export interface CardField {
  key: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'boolean';
  options?: string[];
  required?: boolean;
  defaultValue?: unknown;
}

// ─── Azure OpenAI Responses API Tool Format ─────────────────────────────────

import type { ResponseTool } from '../services/connectors';

/** Convert our ToolDefinition array to Responses API format.
 *  Optionally includes web_search as a built-in tool. */
export function toResponseTools(tools: ToolDefinition[], webSearch = false): ResponseTool[] {
  const result: ResponseTool[] = [];

  // Add built-in web_search if enabled
  if (webSearch) {
    result.push({ type: 'web_search' });
  }

  // Add function tools
  for (const t of tools) {
    result.push({
      type: 'function',
      name: t.name,
      description: t.description,
      parameters: t.inputSchema,
    });
  }

  return result;
}
