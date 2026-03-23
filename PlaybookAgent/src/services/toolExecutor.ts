/**
 * Tool Executor — Routes tool calls to the correct handler (builtin, connector, or flow)
 * and manages Human-in-the-Loop (HitL) approval for tools that require it.
 */

import type { ToolDefinition, PendingToolCall, AgentEvent } from '../types/agent';
import { BUILTIN_TOOLS } from './builtinTools';

type ApprovalCallback = (
  toolCall: PendingToolCall
) => Promise<{ approved: boolean; editedArgs?: Record<string, unknown> }>;

export interface ToolExecutorConfig {
  onEvent: (event: AgentEvent) => void;
  onApprovalRequired: ApprovalCallback;
}

/**
 * Create a tool executor function bound to the given config.
 * Returns a function that can be passed to runAgentLoop's executeToolCall param.
 */
export function createToolExecutor(config: ToolExecutorConfig) {
  return async function executeToolCall(
    tool: ToolDefinition,
    args: Record<string, unknown>,
    callId: string
  ): Promise<unknown> {
    // If tool requires approval, wait for HitL
    if (tool.requiresApproval) {
      const pending: PendingToolCall = {
        callId,
        toolName: tool.name,
        arguments: args,
        status: 'pending',
        requiresApproval: true,
      };

      const decision = await config.onApprovalRequired(pending);

      if (!decision.approved) {
        return { error: 'Tool call rejected by user', rejected: true };
      }

      // Use edited args if provided
      if (decision.editedArgs) {
        args = decision.editedArgs;
      }
    }

    // Route to handler based on endpoint type
    switch (tool.endpointType) {
      case 'InternalReact':
        return executeBuiltinTool(tool.name, args);

      case 'CustomConnector':
        return executeConnectorTool(tool, args);

      case 'CloudFlow':
        return executeCloudFlowTool(tool, args);

      default:
        throw new Error(`Unknown endpoint type: ${tool.endpointType}`);
    }
  };
}

async function executeBuiltinTool(
  toolName: string,
  args: Record<string, unknown>
): Promise<unknown> {
  const handler = BUILTIN_TOOLS[toolName];
  if (!handler) {
    throw new Error(`Unknown builtin tool: ${toolName}`);
  }
  return handler(args);
}

async function executeConnectorTool(
  tool: ToolDefinition,
  args: Record<string, unknown>
): Promise<unknown> {
  // For now, return a placeholder. Connector tool execution will be wired up
  // when specific connector tools (SAP, Doc Intelligence) are defined in Dataverse.
  return {
    status: 'not_implemented',
    message: `Connector tool "${tool.name}" execution not yet wired. Target: ${tool.executionTarget}`,
    args,
  };
}

async function executeCloudFlowTool(
  tool: ToolDefinition,
  args: Record<string, unknown>
): Promise<unknown> {
  // CloudFlow tools will trigger Power Automate flows.
  // For now, return a placeholder.
  return {
    status: 'not_implemented',
    message: `Cloud flow tool "${tool.name}" execution not yet wired. Target: ${tool.executionTarget}`,
    args,
  };
}
