/**
 * useAgentChat — React hook wrapping the Custom Agent Loop.
 * Manages chat state, tool approvals, visualizations, and Dataverse persistence.
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
} from '../types/agent';
import { runAgentLoop } from '../services/agentLoop';
import { createToolExecutor } from '../services/toolExecutor';
import { jwAgents, createMessage, getThreadMessages } from '../services/dataverse';
import { BUILTIN_TOOL_DEFINITIONS } from '../services/builtinTools';

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

  /** Load agent definition from Dataverse including tools. */
  const loadAgent = useCallback(async (agentId: string) => {
    try {
      const result = await jwAgents.get(agentId);
      const agentRecord = result.data;
      if (!agentRecord) throw new Error('Agent not found');

      // Parse model config
      let modelConfig = {};
      try {
        if (agentRecord.jw_modelconfig) {
          modelConfig = JSON.parse(agentRecord.jw_modelconfig);
        }
      } catch {
        // Use defaults
      }

      // For now, use builtin tools. Later: load from jw_agenttool junction
      const tools: ToolDefinition[] = [...BUILTIN_TOOL_DEFINITIONS];

      const agentDef: AgentDefinition = {
        id: agentRecord.jw_agentid,
        name: agentRecord.jw_name,
        systemPrompt: agentRecord.jw_systemprompt ?? 'You are a helpful assistant.',
        modelConfig: modelConfig as AgentDefinition['modelConfig'],
        allowMcp: agentRecord.jw_allowmcp === 1,
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

    // Create tool executor with HitL
    const executor = createToolExecutor({
      onEvent: handleEvent,
      onApprovalRequired: (toolCall) => {
        return new Promise<{ approved: boolean; editedArgs?: Record<string, unknown> }>((resolve) => {
          approvalResolvers.current.set(toolCall.callId, { resolve });
          // The UI will show ApprovalForm and call approveToolCall/rejectToolCall
        });
      },
    });

    try {
      const allMessages = [...state.messages, userMsg];
      const resultMessages = await runAgentLoop({
        agent,
        messages: allMessages,
        onEvent: handleEvent,
        executeToolCall: executor,
        signal: abortRef.current.signal,
      });

      // Persist assistant messages to Dataverse
      const newMessages = resultMessages.slice(allMessages.length);
      for (const msg of newMessages) {
        if (msg.role === 'assistant' || msg.role === 'tool') {
          try {
            await createMessage({
              threadId,
              role: msg.role,
              content: msg.content ?? undefined,
              toolCalls: msg.tool_calls ? JSON.stringify(msg.tool_calls) : undefined,
              toolCallId: msg.tool_call_id,
              name: msg.name,
            });
          } catch {
            // Non-critical
          }
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
