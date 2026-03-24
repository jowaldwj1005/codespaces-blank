/**
 * useAgentChat — React hook wrapping the Custom Agent Loop.
 * Manages chat state, tool approvals, visualizations, and Dataverse persistence.
 * Supports dynamic tool loading from jw_agenttool junction (hybrid with builtins).
 * Creates jw_toolexecution audit records for HitL traceability.
 */

import { useState, useCallback, useRef } from 'react';
import type {
  AgentDefinition,
  AgentEvent,
  AgentStatus,
  ChatMessage,
  CreateVisualInput,
  PendingToolCall,
  TokenUsage,
  ToolDefinition,
  EndpointType,
} from '../types/agent';
import { runAgentLoop } from '../services/agentLoop';
import { createToolExecutor } from '../services/toolExecutor';
import type { ToolExecutionRecord } from '../services/toolExecutor';
import { jwAgents, getAgentWithTools, createMessage, getThreadMessages, createToolExecution } from '../services/dataverse';
import { BUILTIN_TOOLS, BUILTIN_TOOL_DEFINITIONS } from '../services/builtinTools';

interface AgentChatState {
  messages: ChatMessage[];
  status: AgentStatus;
  tokenUsage: TokenUsage;
  pendingApprovals: PendingToolCall[];
  visualizations: Array<{ id: string; input: CreateVisualInput }>;
  error?: string;
}

interface ApprovalResolver {
  resolve: (decision: { approved: boolean; editedArgs?: Record<string, unknown> }) => void;
}

// Map jw_endpointtype enum values to EndpointType strings
const ENDPOINT_TYPE_MAP: Record<number, EndpointType> = {
  100000000: 'CloudFlow',
  100000001: 'CustomConnector',
  100000002: 'InternalReact',
};

// Map approval state strings to Dataverse choice values
const APPROVAL_STATE_MAP: Record<string, 100000000 | 100000001 | 100000002 | 100000003> = {
  'Pending': 100000000,
  'Approved': 100000001,
  'Rejected': 100000002,
  'AutoExecuted': 100000003,
};

/**
 * Convert a jw_tool Dataverse record (from expanded jw_agenttool) to a ToolDefinition.
 */
function dvToolToDefinition(dvTool: Record<string, unknown>): ToolDefinition {
  let inputSchema: Record<string, unknown> = {};
  try {
    if (dvTool.jw_inputschema) {
      inputSchema = JSON.parse(dvTool.jw_inputschema as string);
    }
  } catch { /* empty schema */ }

  const endpointTypeNum = dvTool.jw_endpointtype as number | undefined;
  const endpointType: EndpointType = ENDPOINT_TYPE_MAP[endpointTypeNum ?? 100000002] ?? 'InternalReact';

  // Boolean: Dataverse may return true/false or 0/1
  const requiresApproval = dvTool.jw_requiresapproval === true ||
    dvTool.jw_requiresapproval === 1 ||
    dvTool.jw_requiresapproval === '1';

  return {
    id: dvTool.jw_toolid as string,
    name: dvTool.jw_name as string,
    description: (dvTool.jw_description as string) ?? '',
    inputSchema,
    requiresApproval,
    endpointType,
    executionTarget: (dvTool.jw_executiontarget as string) ?? undefined,
  };
}

export function useAgentChat(threadId: string | null) {
  const [state, setState] = useState<AgentChatState>({
    messages: [],
    status: 'idle',
    tokenUsage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
    pendingApprovals: [],
    visualizations: [],
  });

  const [agent, setAgent] = useState<AgentDefinition | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const approvalResolvers = useRef<Map<string, ApprovalResolver>>(new Map());

  /**
   * Load agent definition from Dataverse including tools.
   * DYNAMIC TOOL LOADING: Attempts to load tools from jw_agenttool junction.
   * Falls back to BUILTIN_TOOL_DEFINITIONS if no tools are linked in Dataverse.
   * InternalReact tools from Dataverse must have a matching handler in BUILTIN_TOOLS.
   */
  const loadAgent = useCallback(async (agentId: string) => {
    try {
      // Try loading with expanded tools first
      let agentRecord: Record<string, unknown> | null = null;
      let dynamicTools: ToolDefinition[] = [];

      try {
        const expandedResult = await getAgentWithTools(agentId);
        agentRecord = expandedResult.data as unknown as Record<string, unknown>;

        // Extract tools from expanded junction records
        const junctionRecords = (agentRecord?.jw_agent_jw_agenttool ?? []) as Array<Record<string, unknown>>;
        for (const junction of junctionRecords) {
          const expandedTool = junction.jw_toolid as Record<string, unknown> | undefined;
          if (expandedTool?.jw_toolid && expandedTool?.jw_name) {
            const toolDef = dvToolToDefinition(expandedTool);

            // For InternalReact tools, verify handler exists
            if (toolDef.endpointType === 'InternalReact' && !BUILTIN_TOOLS[toolDef.name]) {
              continue; // Skip tools without handlers
            }
            dynamicTools.push(toolDef);
          }
        }
      } catch {
        // Expand failed — fall back to simple get
        const simpleResult = await jwAgents.get(agentId);
        agentRecord = simpleResult.data as unknown as Record<string, unknown>;
      }

      if (!agentRecord) throw new Error('Agent not found');

      // Parse model config
      let modelConfig = {};
      try {
        const configStr = agentRecord.jw_modelconfig as string;
        if (configStr) modelConfig = JSON.parse(configStr);
      } catch { /* defaults */ }

      // Hybrid: use dynamic tools if available, otherwise fall back to builtins
      const tools: ToolDefinition[] = dynamicTools.length > 0
        ? dynamicTools
        : [...BUILTIN_TOOL_DEFINITIONS];

      const agentDef: AgentDefinition = {
        id: agentRecord.jw_agentid as string,
        name: agentRecord.jw_name as string,
        systemPrompt: (agentRecord.jw_systemprompt as string) ?? 'You are a helpful assistant.',
        modelConfig: modelConfig as AgentDefinition['modelConfig'],
        allowMcp: agentRecord.jw_allowmcp === true || agentRecord.jw_allowmcp === 1,
        tools,
      };

      setAgent(agentDef);
      return agentDef;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setState(prev => ({ ...prev, error: errorMsg, status: 'error' }));
      return null;
    }
  }, []);

  /** Load existing messages from Dataverse for the thread. */
  const loadMessages = useCallback(async (tid: string) => {
    try {
      const result = await getThreadMessages(tid);
      const records = result.data ?? [];
      const msgs: ChatMessage[] = records.map(r => {
        const msg: ChatMessage = {
          role: (r.jw_role ?? 'user') as ChatMessage['role'],
          content: r.jw_content ?? null,
        };
        if (r.jw_role === 'tool' && r.jw_toolcalls) {
          // tool messages store {tool_call_id} in jw_toolcalls
          try {
            const parsed = JSON.parse(r.jw_toolcalls);
            msg.tool_call_id = parsed.tool_call_id;
          } catch { /* ignore */ }
          msg.name = r.jw_name ?? undefined;
        } else if (r.jw_toolcalls) {
          // assistant messages store tool_calls array
          try { msg.tool_calls = JSON.parse(r.jw_toolcalls); } catch { /* ignore */ }
        }
        return msg;
      });
      setState(prev => ({ ...prev, messages: msgs }));
      return msgs;
    } catch {
      return [];
    }
  }, []);

  /** Handle agent events for UI updates. */
  const handleEvent = useCallback((event: AgentEvent) => {
    switch (event.type) {
      case 'status_change':
        setState(prev => ({ ...prev, status: event.status }));
        break;

      case 'message_added':
        setState(prev => ({
          ...prev,
          messages: [...prev.messages, event.message],
        }));
        break;

      case 'token_update':
        setState(prev => ({ ...prev, tokenUsage: event.usage }));
        break;

      case 'tool_call_started':
        if (event.toolCall.requiresApproval) {
          setState(prev => ({
            ...prev,
            pendingApprovals: [...prev.pendingApprovals, event.toolCall],
          }));
        }
        break;

      case 'tool_call_updated':
        setState(prev => ({
          ...prev,
          pendingApprovals: prev.pendingApprovals.filter(p => p.callId !== event.callId),
        }));
        break;

      case 'visual_created':
        setState(prev => ({
          ...prev,
          visualizations: [...prev.visualizations, { id: event.visualId, input: event.input }],
        }));
        break;

      case 'error':
        setState(prev => ({ ...prev, error: event.error }));
        break;

      case 'completed':
        setState(prev => ({ ...prev, status: 'idle' }));
        break;
    }
  }, []);

  /** Send a user message and run the agent loop. */
  const sendMessage = useCallback(async (content: string) => {
    if (!threadId || !agent) return;

    const userMsg: ChatMessage = { role: 'user', content };
    setState(prev => ({
      ...prev,
      messages: [...prev.messages, userMsg],
      status: 'thinking',
      error: undefined,
    }));

    // Persist user message to Dataverse
    try {
      await createMessage({ threadId, role: 'user', content });
    } catch {
      // Non-critical — continue even if persistence fails
    }

    // Create abort controller
    abortRef.current = new AbortController();

    // Collect tool execution records for post-loop audit
    const toolExecutionRecords: ToolExecutionRecord[] = [];

    // Create tool executor with HitL + audit collection
    const executor = createToolExecutor({
      onEvent: handleEvent,
      onApprovalRequired: (toolCall) => {
        return new Promise<{ approved: boolean; editedArgs?: Record<string, unknown> }>((resolve) => {
          approvalResolvers.current.set(toolCall.callId, { resolve });
        });
      },
      onToolExecuted: (record) => {
        toolExecutionRecords.push(record);
      },
    });

    try {
      const allMessages = [...state.messages, userMsg];
      // Track cumulative token usage for persistence
      let finalTokenUsage: { promptTokens: number; completionTokens: number } | undefined;
      const tokenTrackingHandler = (event: AgentEvent) => {
        handleEvent(event);
        if (event.type === 'token_update') {
          finalTokenUsage = { promptTokens: event.usage.promptTokens, completionTokens: event.usage.completionTokens };
        }
      };

      const resultMessages = await runAgentLoop({
        agent,
        messages: allMessages,
        onEvent: tokenTrackingHandler,
        executeToolCall: executor,
        signal: abortRef.current.signal,
      });

      // Persist new messages and create tool execution audit records
      const newMessages = resultMessages.slice(allMessages.length);
      const persistedMessageIds: Map<number, string> = new Map(); // index → messageId

      // Find the last assistant message to attach token data
      const lastAssistantIdx = newMessages.reduce((acc, msg, i) => msg.role === 'assistant' ? i : acc, -1);

      for (let i = 0; i < newMessages.length; i++) {
        const msg = newMessages[i];
        if (msg.role === 'assistant' || msg.role === 'tool') {
          const isLastAssistant = i === lastAssistantIdx && finalTokenUsage;
          try {
            const msgResult = await createMessage({
              threadId,
              role: msg.role,
              content: msg.content ?? undefined,
              toolCalls: msg.tool_calls ? JSON.stringify(msg.tool_calls) : undefined,
              toolCallId: msg.tool_call_id,
              name: msg.name,
              ...(isLastAssistant ? { tokenPrompt: finalTokenUsage!.promptTokens, tokenCompletion: finalTokenUsage!.completionTokens } : {}),
            });
            const msgId = (msgResult.data as unknown as Record<string, unknown>)?.jw_messageid as string;
            if (msgId) persistedMessageIds.set(i, msgId);
          } catch {
            // Non-critical
          }
        }
      }

      // Create tool execution audit records (post-loop linkage)
      // Link each tool execution to the assistant message that triggered it
      for (const execRecord of toolExecutionRecords) {
        try {
          // Find the assistant message that contains this tool call
          let messageId: string | undefined;
          for (let i = 0; i < newMessages.length; i++) {
            const msg = newMessages[i];
            if (msg.role === 'assistant' && msg.tool_calls?.some(tc => tc.id === execRecord.callId)) {
              messageId = persistedMessageIds.get(i);
              break;
            }
          }

          if (messageId) {
            await createToolExecution({
              messageId,
              toolId: execRecord.toolId ?? 'unknown',
              callId: execRecord.callId,
              requestPayload: JSON.stringify(execRecord.requestPayload),
              approvalState: APPROVAL_STATE_MAP[execRecord.approvalState] ?? 100000003,
              responsePayload: execRecord.responsePayload
                ? JSON.stringify(execRecord.responsePayload)
                : undefined,
            });
          }
        } catch {
          // Non-critical — audit record creation should not break the chat
        }
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setState(prev => ({ ...prev, error: errorMsg, status: 'error' }));
    }
  }, [threadId, agent, state.messages, handleEvent]);

  /** Approve a pending tool call. */
  const approveToolCall = useCallback((callId: string, editedArgs?: Record<string, unknown>) => {
    const resolver = approvalResolvers.current.get(callId);
    if (resolver) {
      resolver.resolve({ approved: true, editedArgs });
      approvalResolvers.current.delete(callId);
    }
  }, []);

  /** Reject a pending tool call. */
  const rejectToolCall = useCallback((callId: string) => {
    const resolver = approvalResolvers.current.get(callId);
    if (resolver) {
      resolver.resolve({ approved: false });
      approvalResolvers.current.delete(callId);
    }
  }, []);

  /** Abort the current agent loop. */
  const abort = useCallback(() => {
    abortRef.current?.abort();
    setState(prev => ({ ...prev, status: 'idle' }));
  }, []);

  return {
    ...state,
    agent,
    loadAgent,
    loadMessages,
    sendMessage,
    approveToolCall,
    rejectToolCall,
    abort,
  };
}
