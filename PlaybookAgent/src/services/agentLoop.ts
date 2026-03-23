/**
 * Agent Loop — Core async loop for the Custom Agent Loop pattern.
 * Pure function (no React). Calls Azure OpenAI, handles tool calls iteratively,
 * emits events for UI updates, and persists messages to Dataverse.
 */

import type {
  AgentDefinition,
  AgentEvent,
  ChatMessage,
  PendingToolCall,
  TokenUsage,
  ToolCall,
  ToolDefinition,
} from '../types/agent';
import { toOpenAITools } from '../types/agent';
import { azureOpenAI } from './connectors';
import type { ChatCompletionResponse } from './connectors';

const MAX_ITERATIONS = 10;

export interface AgentLoopConfig {
  agent: AgentDefinition;
  messages: ChatMessage[];
  onEvent: (event: AgentEvent) => void;
  executeToolCall: (tool: ToolDefinition, args: Record<string, unknown>, callId: string) => Promise<unknown>;
  signal?: AbortSignal;
}

/**
 * Run the agent loop: call LLM → handle tool calls → repeat until done or limit.
 * Returns the full message history including new messages.
 */
export async function runAgentLoop(config: AgentLoopConfig): Promise<ChatMessage[]> {
  const { agent, onEvent, executeToolCall, signal } = config;
  const messages = [...config.messages];
  const cumulativeTokens: TokenUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };

  // Ensure system prompt is first message
  if (messages.length === 0 || messages[0].role !== 'system') {
    const systemMsg: ChatMessage = { role: 'system', content: agent.systemPrompt };
    messages.unshift(systemMsg);
    onEvent({ type: 'message_added', message: systemMsg });
  }

  const openAITools = agent.tools.length > 0 ? toOpenAITools(agent.tools) : undefined;

  for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
    if (signal?.aborted) {
      onEvent({ type: 'error', error: 'Agent loop aborted' });
      break;
    }

    onEvent({ type: 'status_change', status: 'thinking' });

    // Call Azure OpenAI
    let response: ChatCompletionResponse;
    try {
      const result = await azureOpenAI.chatCompletion({
        messages: messages.map(m => ({
          role: m.role,
          content: m.content ?? '',
          ...(m.tool_calls ? { tool_calls: m.tool_calls } : {}),
          ...(m.tool_call_id ? { tool_call_id: m.tool_call_id } : {}),
          ...(m.name ? { name: m.name } : {}),
        })),
        temperature: agent.modelConfig.temperature,
        max_completion_tokens: agent.modelConfig.max_completion_tokens,
        tools: openAITools,
        tool_choice: agent.modelConfig.tool_choice ?? (openAITools ? 'auto' : undefined),
      });
      response = result.normalized;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      onEvent({ type: 'error', error: errorMsg });
      onEvent({ type: 'status_change', status: 'error' });
      break;
    }

    // Update token usage
    if (response.usage) {
      cumulativeTokens.promptTokens += response.usage.prompt_tokens ?? 0;
      cumulativeTokens.completionTokens += response.usage.completion_tokens ?? 0;
      cumulativeTokens.totalTokens += (response.usage.prompt_tokens ?? 0) + (response.usage.completion_tokens ?? 0);
      onEvent({ type: 'token_update', usage: { ...cumulativeTokens } });
    }

    const choice = response.choices?.[0];
    if (!choice?.message) {
      onEvent({ type: 'error', error: 'No response from LLM' });
      onEvent({ type: 'status_change', status: 'error' });
      break;
    }

    const assistantMsg: ChatMessage = {
      role: 'assistant',
      content: choice.message.content ?? null,
      tool_calls: choice.message.tool_calls as ToolCall[] | undefined,
    };
    messages.push(assistantMsg);
    onEvent({ type: 'message_added', message: assistantMsg });

    // If no tool calls → done
    if (!choice.message.tool_calls || choice.message.tool_calls.length === 0) {
      onEvent({ type: 'completed', finalMessage: choice.message.content ?? '' });
      onEvent({ type: 'status_change', status: 'idle' });
      return messages;
    }

    // Handle tool calls
    onEvent({ type: 'status_change', status: 'tool_calling' });

    for (const toolCall of choice.message.tool_calls) {
      if (signal?.aborted) break;

      const toolDef = agent.tools.find(t => t.name === toolCall.function.name);
      let args: Record<string, unknown>;
      try {
        args = JSON.parse(toolCall.function.arguments);
      } catch {
        args = { _raw: toolCall.function.arguments };
      }

      const pending: PendingToolCall = {
        callId: toolCall.id,
        toolName: toolCall.function.name,
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
          throw new Error(`Unknown tool: ${toolCall.function.name}`);
        }
        onEvent({ type: 'tool_call_updated', callId: toolCall.id, update: { status: 'executing' } });
        toolResponse = await executeToolCall(toolDef, args, toolCall.id);
        onEvent({ type: 'tool_call_updated', callId: toolCall.id, update: { status: 'completed', response: toolResponse } });
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        toolResponse = { error: errorMsg };
        onEvent({ type: 'tool_call_updated', callId: toolCall.id, update: { status: 'error', error: errorMsg } });
      }

      // Add tool response message
      const toolMsg: ChatMessage = {
        role: 'tool',
        content: typeof toolResponse === 'string' ? toolResponse : JSON.stringify(toolResponse),
        tool_call_id: toolCall.id,
        name: toolCall.function.name,
      };
      messages.push(toolMsg);
      onEvent({ type: 'message_added', message: toolMsg });
    }

    // Loop back for next LLM call with tool responses
  }

  // Safety limit reached
  if (messages.length > 0) {
    const lastMsg = messages[messages.length - 1];
    if (lastMsg.role !== 'assistant' || lastMsg.tool_calls) {
      onEvent({ type: 'error', error: `Agent loop reached max iterations (${MAX_ITERATIONS})` });
      onEvent({ type: 'status_change', status: 'error' });
    }
  }

  return messages;
}
