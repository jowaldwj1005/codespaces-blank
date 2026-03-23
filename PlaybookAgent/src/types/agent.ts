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
  temperature?: number;
  max_completion_tokens?: number;
  tool_choice?: 'auto' | 'required' | 'none' | { type: 'function'; function: { name: string } };
}

export interface AgentDefinition {
  id: string;
  name: string;
  systemPrompt: string;
  modelConfig: ModelConfig;
  allowMcp: boolean;
  tools: ToolDefinition[];
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
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
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

// ─── Azure OpenAI Tool Format (for API request) ──────────────────────────────

export interface OpenAIToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

/** Convert our ToolDefinition to Azure OpenAI format. */
export function toOpenAITools(tools: ToolDefinition[]): OpenAIToolDefinition[] {
  return tools.map(t => ({
    type: 'function' as const,
    function: {
      name: t.name,
      description: t.description,
      parameters: t.inputSchema,
    },
  }));
}
