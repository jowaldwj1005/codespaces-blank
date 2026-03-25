/**
 * Agent Loop — Core async loop for the Custom Agent Loop pattern.
 * Uses the Azure OpenAI Responses API (POST /openai/responses).
 * Pure function (no React). Emits events for UI updates.
 *
 * Key differences from Chat Completions:
 * - Input uses `input` array (not `messages`)
 * - System prompt goes in `instructions` (not a system message)
 * - Response has `output` array with typed items (reasoning, message, function_call, web_search_call)
 * - Function call results are sent as `function_call_output` items
 * - Multi-turn can use `previous_response_id` to avoid resending full context
 */

import type {
  AgentDefinition,
  AgentEvent,
  ChatMessage,
  PendingToolCall,
  ToolDefinition,
} from '../types/agent';
import { toResponseTools } from '../types/agent';
import { azureOpenAI, OPENAI_DEFAULTS } from './connectors';
import type {
  ResponsesApiResponse,
  ResponseInputItem,
  ExtendedTokenUsage,
} from './connectors';
import {
  extractResponseText,
  extractFunctionCalls,
  extractReasoningSummaries,
  extractWebSearchCalls,
  extractCitations,
  extractTokenUsage,
} from './connectors';

const MAX_ITERATIONS = 10;

export interface AgentLoopConfig {
  agent: AgentDefinition;
  messages: ChatMessage[];
  onEvent: (event: AgentEvent) => void;
  executeToolCall: (tool: ToolDefinition, args: Record<string, unknown>, callId: string) => Promise<unknown>;
  signal?: AbortSignal;
}

/**
 * Run the agent loop: call Responses API → handle tool calls → repeat until done.
 * Returns the full message history including new messages.
 */
export async function runAgentLoop(config: AgentLoopConfig): Promise<ChatMessage[]> {
  const { agent, onEvent, executeToolCall, signal } = config;
  const messages = [...config.messages];
  const cumulativeTokens: ExtendedTokenUsage = {
    inputTokens: 0, outputTokens: 0, totalTokens: 0,
    reasoningTokens: 0, cachedTokens: 0,
  };

  // Build the Responses API tools array (function tools + optional web_search)
  const responseTools = agent.tools.length > 0 || agent.modelConfig.web_search
    ? toResponseTools(agent.tools, agent.modelConfig.web_search ?? false)
    : undefined;

  // Track the last response ID for multi-turn continuation
  let previousResponseId: string | undefined;

  for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
    if (signal?.aborted) {
      onEvent({ type: 'error', error: 'Agent loop aborted' });
      break;
    }

    onEvent({ type: 'status_change', status: 'thinking' });

    // Build input from messages — Responses API uses `input` array
    const input = buildResponseInput(messages, !!previousResponseId);

    // Build reasoning config — only if agent has it configured
    const reasoningConfig = agent.modelConfig.reasoning_effort
      ? { effort: agent.modelConfig.reasoning_effort, summary: 'auto' as const }
      : undefined;

    // Call Azure OpenAI Responses API
    let response: ResponsesApiResponse;
    try {
      const result = await azureOpenAI.createResponse({
        model: agent.modelConfig.model ?? OPENAI_DEFAULTS.model,
        input,
        instructions: agent.systemPrompt,
        tools: responseTools,
        tool_choice: agent.modelConfig.tool_choice ?? (responseTools ? 'auto' : undefined),
        reasoning: reasoningConfig,
        max_output_tokens: agent.modelConfig.max_output_tokens
          ?? agent.modelConfig.max_completion_tokens
          ?? OPENAI_DEFAULTS.max_output_tokens,
        temperature: agent.modelConfig.temperature,
        previous_response_id: previousResponseId,
        store: true,
      });
      response = result.normalized;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      onEvent({ type: 'error', error: errorMsg });
      onEvent({ type: 'status_change', status: 'error' });
      break;
    }

    // Track response ID for potential continuation
    previousResponseId = response.id;

    // Update token usage
    if (response.usage) {
      const usage = extractTokenUsage(response);
      cumulativeTokens.inputTokens += usage.inputTokens;
      cumulativeTokens.outputTokens += usage.outputTokens;
      cumulativeTokens.totalTokens = cumulativeTokens.inputTokens + cumulativeTokens.outputTokens;
      cumulativeTokens.reasoningTokens += usage.reasoningTokens;
      cumulativeTokens.cachedTokens += usage.cachedTokens;
      onEvent({ type: 'token_update', usage: { ...cumulativeTokens } });
    }

    // Check for API error
    if (response.status === 'failed') {
      onEvent({ type: 'error', error: `API error: ${JSON.stringify(response.error)}` });
      onEvent({ type: 'status_change', status: 'error' });
      break;
    }

    // Process output items in order — reasoning, web_search, function_call, message
    const functionCalls = extractFunctionCalls(response);
    const reasoningSummaries = extractReasoningSummaries(response);
    const webSearchCalls = extractWebSearchCalls(response);
    const responseText = extractResponseText(response);
    const citations = extractCitations(response);

    // Emit reasoning events
    for (const summary of reasoningSummaries) {
      onEvent({ type: 'reasoning', content: summary });
    }

    // Emit web search events as tool calls (visible in UI)
    for (const ws of webSearchCalls) {
      const searchInfo = ws.action?.type === 'search'
        ? `Searched: ${ws.action.queries?.join(', ') ?? ws.action.query ?? 'web'}`
        : ws.action?.type === 'open_page'
          ? `Opened: ${ws.action.url}`
          : 'Web search';
      onEvent({
        type: 'tool_call_started',
        toolCall: {
          callId: ws.id,
          toolName: 'web_search',
          arguments: ws.action as unknown as Record<string, unknown> ?? {},
          status: 'completed',
          requiresApproval: false,
          response: searchInfo,
        },
      });
      onEvent({
        type: 'tool_call_updated',
        callId: ws.id,
        update: { status: 'completed', response: searchInfo },
      });
    }

    // Build assistant message from text output
    const assistantMsg: ChatMessage = {
      role: 'assistant',
      content: responseText || null,
      tool_calls: functionCalls.length > 0
        ? functionCalls.map(fc => ({
            id: fc.call_id,
            type: 'function' as const,
            function: { name: fc.name, arguments: fc.arguments },
          }))
        : undefined,
      reasoning_content: reasoningSummaries.length > 0
        ? reasoningSummaries.join('\n\n')
        : undefined,
      citations: citations.length > 0 ? citations : undefined,
    };
    messages.push(assistantMsg);
    onEvent({ type: 'message_added', message: assistantMsg });

    // If no function calls → done
    if (functionCalls.length === 0) {
      onEvent({ type: 'completed', finalMessage: responseText ?? '' });
      onEvent({ type: 'status_change', status: 'idle' });
      return messages;
    }

    // Handle function calls
    onEvent({ type: 'status_change', status: 'tool_calling' });

    for (const fc of functionCalls) {
      if (signal?.aborted) break;

      const toolDef = agent.tools.find(t => t.name === fc.name);
      let args: Record<string, unknown>;
      try {
        args = JSON.parse(fc.arguments);
      } catch {
        args = { _raw: fc.arguments };
      }

      const pending: PendingToolCall = {
        callId: fc.call_id,
        toolName: fc.name,
        arguments: args,
        status: 'pending',
        requiresApproval: toolDef?.requiresApproval ?? false,
      };
      onEvent({ type: 'tool_call_started', toolCall: pending });

      if (toolDef?.requiresApproval) {
        onEvent({ type: 'status_change', status: 'awaiting_approval' });
      }

      let toolResponse: unknown;
      try {
        if (!toolDef) {
          throw new Error(`Unknown tool: ${fc.name}`);
        }
        onEvent({ type: 'tool_call_updated', callId: fc.call_id, update: { status: 'executing' } });
        toolResponse = await executeToolCall(toolDef, args, fc.call_id);
        onEvent({ type: 'tool_call_updated', callId: fc.call_id, update: { status: 'completed', response: toolResponse } });
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        toolResponse = { error: errorMsg };
        onEvent({ type: 'tool_call_updated', callId: fc.call_id, update: { status: 'error', error: errorMsg } });
      }

      // Add tool response message (for our internal message history)
      const toolMsg: ChatMessage = {
        role: 'tool',
        content: typeof toolResponse === 'string' ? toolResponse : JSON.stringify(toolResponse),
        tool_call_id: fc.call_id,
        name: fc.name,
      };
      messages.push(toolMsg);
      onEvent({ type: 'message_added', message: toolMsg });
    }

    // Loop back — next iteration will send tool results
    onEvent({ type: 'status_change', status: 'thinking' });
  }

  // Safety limit reached
  onEvent({ type: 'error', error: `Agent loop reached max iterations (${MAX_ITERATIONS})` });
  onEvent({ type: 'status_change', status: 'error' });
  return messages;
}

// ─── Input Builder ──────────────────────────────────────────────────────────

/**
 * Convert our ChatMessage array to Responses API input format.
 * When using previous_response_id, only send new messages since last response.
 */
function buildResponseInput(messages: ChatMessage[], hasPreviousId: boolean): ResponseInputItem[] {
  const input: ResponseInputItem[] = [];

  // If continuing from previous response, only send tool results + new user messages
  const startIdx = hasPreviousId
    ? findLastAssistantIndex(messages) + 1
    : 0;

  for (let i = startIdx; i < messages.length; i++) {
    const msg = messages[i];

    switch (msg.role) {
      case 'system':
        // System prompt goes in `instructions`, not input — skip
        break;

      case 'user':
        input.push({
          type: 'message',
          role: 'user',
          content: typeof msg.content === 'string'
            ? [{ type: 'input_text', text: msg.content }]
            : [{ type: 'input_text', text: msg.content ?? '' }],
        });
        break;

      case 'tool':
        // Tool results → function_call_output
        if (msg.tool_call_id) {
          input.push({
            type: 'function_call_output',
            call_id: msg.tool_call_id,
            output: msg.content ?? '',
          });
        }
        break;

      case 'assistant':
        // Skip assistant messages — they're in the API's response history
        // (previous_response_id handles continuation)
        // But on first call without previous_response_id, we need them for context
        if (!hasPreviousId && msg.content) {
          input.push({
            type: 'message',
            role: 'developer',
            content: [{ type: 'input_text', text: `[Previous assistant response]: ${msg.content}` }],
          });
        }
        break;
    }
  }

  return input;
}

function findLastAssistantIndex(messages: ChatMessage[]): number {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === 'assistant') return i;
  }
  return -1;
}

// Re-export for backward compat
export type { ExtendedTokenUsage };
