/**
 * Tool Executor — Routes tool calls to the correct handler (builtin, connector, or flow)
 * and manages Human-in-the-Loop (HitL) approval for tools that require it.
 * Emits tool execution audit records for traceability.
 */

import type { ToolDefinition, PendingToolCall, AgentEvent } from '../types/agent';
import { BUILTIN_TOOLS } from './builtinTools';
import { azureOpenAI, azureDocIntelligence, sapOData } from './connectors';
import type { ResponsesApiRequest, AnalyzeDocumentRequest, SapODataRequest } from './connectors';
import { emitDebugEvent, generateEventId } from './debugEventBus';

type ApprovalCallback = (
  toolCall: PendingToolCall
) => Promise<{ approved: boolean; editedArgs?: Record<string, unknown> }>;

/** Metadata collected during tool execution for audit trail */
export interface ToolExecutionRecord {
  callId: string;
  toolName: string;
  toolId?: string;
  requestPayload: Record<string, unknown>;
  responsePayload?: unknown;
  approvalState: 'Pending' | 'Approved' | 'Rejected' | 'AutoExecuted';
  durationMs: number;
  error?: string;
}

export interface ToolExecutorConfig {
  onEvent: (event: AgentEvent) => void;
  onApprovalRequired: ApprovalCallback;
  /** Called after each tool execution with audit data (for HitL persistence) */
  onToolExecuted?: (record: ToolExecutionRecord) => void;
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
    const startTime = Date.now();
    let approvalState: ToolExecutionRecord['approvalState'] = 'AutoExecuted';

    // If tool requires approval, wait for HitL
    if (tool.requiresApproval) {
      approvalState = 'Pending';
      const pending: PendingToolCall = {
        callId,
        toolName: tool.name,
        arguments: args,
        status: 'pending',
        requiresApproval: true,
      };

      const decision = await config.onApprovalRequired(pending);

      if (!decision.approved) {
        approvalState = 'Rejected';
        const record: ToolExecutionRecord = {
          callId,
          toolName: tool.name,
          toolId: tool.id,
          requestPayload: args,
          approvalState,
          durationMs: Date.now() - startTime,
        };
        config.onToolExecuted?.(record);
        return { error: 'Tool call rejected by user', rejected: true };
      }

      approvalState = 'Approved';
      // Use edited args if provided
      if (decision.editedArgs) {
        args = decision.editedArgs;
      }
    }

    // Route to handler based on endpoint type
    let response: unknown;
    let error: string | undefined;
    try {
      switch (tool.endpointType) {
        case 'InternalReact':
          response = await executeBuiltinTool(tool.name, args);
          break;
        case 'CustomConnector':
          response = await executeConnectorTool(tool, args);
          break;
        case 'CloudFlow':
          response = await executeCloudFlowTool(tool, args);
          break;
        default:
          throw new Error(`Unknown endpoint type: ${tool.endpointType}`);
      }
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
      response = { error };
    }

    // Emit visual_created event for create_visual tool
    if (tool.name === 'create_visual' && response && typeof response === 'object' && 'visualId' in (response as Record<string, unknown>)) {
      const visualResponse = response as Record<string, unknown>;
      config.onEvent({
        type: 'visual_created',
        visualId: visualResponse.visualId as string,
        input: args as unknown as import('../types/agent').CreateVisualInput,
      });
    }

    // Emit audit record
    const record: ToolExecutionRecord = {
      callId,
      toolName: tool.name,
      toolId: tool.id,
      requestPayload: args,
      responsePayload: response,
      approvalState,
      durationMs: Date.now() - startTime,
      error,
    };
    config.onToolExecuted?.(record);

    if (error) throw new Error(error);
    return response;
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

// ─── Connector Tool Routing ──────────────────────────────────────────────────
// Routes CustomConnector tools to the actual connector wrappers based on executionTarget.

const CONNECTOR_HANDLERS: Record<string, (args: Record<string, unknown>) => Promise<unknown>> = {
  'AzureOpenAI.createResponse': async (args) => {
    const result = await azureOpenAI.createResponse(args as unknown as ResponsesApiRequest);
    return result.normalized;
  },
  'AzureDocIntelligence.analyzeDocument': async (args) => {
    const result = await azureDocIntelligence.analyzeDocument(args as unknown as AnalyzeDocumentRequest);
    return { operationId: result.operationId, normalized: result.normalized };
  },
  'AzureDocIntelligence.analyzeAndWait': async (args) => {
    return azureDocIntelligence.analyzeAndWait(args as unknown as AnalyzeDocumentRequest);
  },
  'AzureDocIntelligence.getAnalyzeResult': async (args) => {
    const result = await azureDocIntelligence.getAnalyzeResult(args.resultId as string);
    return result.normalized;
  },
  'SAPOData.execute': async (args) => {
    const result = await sapOData.execute(args as unknown as SapODataRequest);
    return result.normalized;
  },
};

async function executeConnectorTool(
  tool: ToolDefinition,
  args: Record<string, unknown>
): Promise<unknown> {
  const target = tool.executionTarget;
  if (!target) {
    throw new Error(`Connector tool "${tool.name}" has no executionTarget configured`);
  }

  const handler = CONNECTOR_HANDLERS[target];
  if (handler) {
    const evtId = generateEventId();
    emitDebugEvent({
      id: evtId,
      timestamp: Date.now(),
      operation: `ConnectorTool.${tool.name} → ${target}`,
      source: 'connector',
      status: 'pending',
      input: args,
    });

    try {
      const result = await handler(args);
      emitDebugEvent({
        id: evtId,
        timestamp: Date.now(),
        operation: `ConnectorTool.${tool.name} → ${target}`,
        source: 'connector',
        status: 'success',
        input: args,
        normalizedResult: result,
      });
      return result;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      emitDebugEvent({
        id: evtId,
        timestamp: Date.now(),
        operation: `ConnectorTool.${tool.name} → ${target}`,
        source: 'connector',
        status: 'error',
        input: args,
        error: errorMsg,
      });
      throw err;
    }
  }

  // Fallback: try to call the connector generically via normalizeConnectorResponse
  throw new Error(
    `No handler for connector target "${target}". ` +
    `Available targets: ${Object.keys(CONNECTOR_HANDLERS).join(', ')}`
  );
}

async function executeCloudFlowTool(
  tool: ToolDefinition,
  _args: Record<string, unknown>
): Promise<unknown> {
  // CloudFlow tools will trigger Power Automate flows.
  // Future: use HTTP with Entra ID preauthorized connector
  throw new Error(
    `Cloud flow tool "${tool.name}" is not yet implemented. ` +
    `Target: ${tool.executionTarget}. Power Automate flow integration is planned for a future release.`
  );
}
