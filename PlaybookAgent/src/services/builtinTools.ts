/**
 * Built-in Tools — InternalReact tool handlers executed directly in the browser.
 * These include MCP bridges, visualization, and sub-agent delegation.
 */

import type { CreateVisualInput, ToolDefinition, AgentCapabilities } from '../types/agent';
import { searchDataverseTables, getTableSchema, executeDataverseQuery } from './dataverseMcp';
import { createArtifact } from './dataverse';
import type { IOperationResult } from '@microsoft/power-apps/data';
import * as dv from './dataverse';
import { sapOData, azureDocIntelligence } from './connectors';
import { lookupBind, escapeOData } from './sdk';

// ─── Tool Handler Type ───────────────────────────────────────────────────────

type ToolHandler = (args: Record<string, unknown>) => Promise<unknown>;

// ─── Tool Registry ───────────────────────────────────────────────────────────

export const BUILTIN_TOOLS: Record<string, ToolHandler> = {
  create_visual: handleCreateVisual,
  exit: handleExit,
  search_dataverse: handleSearchDataverse,
  get_table_schema: handleGetTableSchema,
  execute_dataverse_query: handleExecuteDataverseQuery,
  delete_dataverse_record: handleDeleteDataverseRecord,
  create_dataverse_record: handleCreateDataverseRecord,
  update_dataverse_record: handleUpdateDataverseRecord,
  link_agent_tool: handleLinkAgentTool,
  // Connector tools
  query_sap: handleQuerySap,
  analyze_document: handleAnalyzeDocument,
  // Playbook & Case tools
  start_playbook: handleStartPlaybook,
  complete_instruction: handleCompleteInstruction,
  // Artifact tools
  save_artifact: handleSaveArtifact,
};

// ─── Capability-Gated Tools ────────────────────────────────────────────────
// Tools that are only available when specific capabilities are enabled.

/** Returns the subset of BUILTIN_TOOL_DEFINITIONS available given capabilities */
export function getToolsForCapabilities(capabilities?: AgentCapabilities): ToolDefinition[] {
  if (capabilities?.allowDelete) {
    return BUILTIN_TOOL_DEFINITIONS;
  }
  return BUILTIN_TOOL_DEFINITIONS.filter(t => t.name !== 'delete_dataverse_record');
}

// ─── Handlers ────────────────────────────────────────────────────────────────

async function handleCreateVisual(args: Record<string, unknown>): Promise<unknown> {
  const input = args as unknown as CreateVisualInput;

  if (!input.chartType || !input.title || !input.data) {
    return { error: 'Missing required fields: chartType, title, data' };
  }

  const visualId = `vis_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  // Save as artifact when caseId is provided (default type: Chart)
  let artifactId: string | undefined;
  let artifactError: string | undefined;
  if (input.caseId) {
    try {
      const result = await createArtifact({
        type: input.artifactType ?? 'Chart',
        name: input.artifactName ?? input.title,
        payload: JSON.stringify(input),
        caseId: input.caseId,
      });
      artifactId = result.data?.jw_artifactid;
    } catch (err) {
      artifactError = err instanceof Error ? err.message : String(err);
    }
  }

  return { visualId, artifactId, artifactError, chartType: input.chartType, title: input.title };
}

async function handleExit(args: Record<string, unknown>): Promise<unknown> {
  return {
    exitSignal: true,
    result: args.result ?? 'Task completed',
    status: args.status ?? 'success',
  };
}

async function handleSearchDataverse(args: Record<string, unknown>): Promise<unknown> {
  const intent = (args.intent ?? args.query ?? '') as string;
  if (!intent) return { error: 'Missing intent/query parameter' };
  return searchDataverseTables(intent);
}

async function handleGetTableSchema(args: Record<string, unknown>): Promise<unknown> {
  const logicalName = (args.logicalName ?? args.table ?? '') as string;
  if (!logicalName) return { error: 'Missing logicalName/table parameter' };
  return getTableSchema(logicalName);
}

// Map of table plural names to their getAll functions
const TABLE_GETALL_MAP: Record<string, (opts: unknown) => Promise<IOperationResult<unknown[]>>> = {
  systemusers: (opts) => dv.systemusers.getAll(opts as Parameters<typeof dv.systemusers.getAll>[0]) as Promise<IOperationResult<unknown[]>>,
  teams: (opts) => dv.teams.getAll(opts as Parameters<typeof dv.teams.getAll>[0]) as Promise<IOperationResult<unknown[]>>,
  businessunits: (opts) => dv.businessunits.getAll(opts as Parameters<typeof dv.businessunits.getAll>[0]) as Promise<IOperationResult<unknown[]>>,
  jw_agents: (opts) => dv.jwAgents.getAll(opts as Parameters<typeof dv.jwAgents.getAll>[0]) as Promise<IOperationResult<unknown[]>>,
  jw_tools: (opts) => dv.jwTools.getAll(opts as Parameters<typeof dv.jwTools.getAll>[0]) as Promise<IOperationResult<unknown[]>>,
  jw_cases: (opts) => dv.jwCases.getAll(opts as Parameters<typeof dv.jwCases.getAll>[0]) as Promise<IOperationResult<unknown[]>>,
  jw_threads: (opts) => dv.jwThreads.getAll(opts as Parameters<typeof dv.jwThreads.getAll>[0]) as Promise<IOperationResult<unknown[]>>,
  jw_messages: (opts) => dv.jwMessages.getAll(opts as Parameters<typeof dv.jwMessages.getAll>[0]) as Promise<IOperationResult<unknown[]>>,
  jw_artifacts: (opts) => dv.jwArtifacts.getAll(opts as Parameters<typeof dv.jwArtifacts.getAll>[0]) as Promise<IOperationResult<unknown[]>>,
  jw_playbooks: (opts) => dv.jwPlaybooks.getAll(opts as Parameters<typeof dv.jwPlaybooks.getAll>[0]) as Promise<IOperationResult<unknown[]>>,
  jw_instructions: (opts) => dv.jwInstructions.getAll(opts as Parameters<typeof dv.jwInstructions.getAll>[0]) as Promise<IOperationResult<unknown[]>>,
  jw_toolexecutions: (opts) => dv.jwToolExecutions.getAll(opts as Parameters<typeof dv.jwToolExecutions.getAll>[0]) as Promise<IOperationResult<unknown[]>>,
  jw_documents: (opts) => dv.jwDocuments.getAll(opts as Parameters<typeof dv.jwDocuments.getAll>[0]) as Promise<IOperationResult<unknown[]>>,
  jw_agenttools: (opts) => dv.jwAgentTools.getAll(opts as Parameters<typeof dv.jwAgentTools.getAll>[0]) as Promise<IOperationResult<unknown[]>>,
  jw_threadcases: (opts) => dv.jwThreadCases.getAll(opts as Parameters<typeof dv.jwThreadCases.getAll>[0]) as Promise<IOperationResult<unknown[]>>,
};

async function handleExecuteDataverseQuery(args: Record<string, unknown>): Promise<unknown> {
  const tablePluralName = (args.tablePluralName ?? args.table ?? '') as string;
  if (!tablePluralName) return { error: 'Missing tablePluralName/table parameter' };

  const getAllFn = TABLE_GETALL_MAP[tablePluralName];
  if (!getAllFn) return { error: `Unknown table: ${tablePluralName}` };

  const selectRaw = args.select;
  const selectArr = typeof selectRaw === 'string' ? selectRaw.split(',').map(s => s.trim()) : selectRaw as string[] | undefined;

  return executeDataverseQuery(tablePluralName, {
    select: selectArr,
    filter: args.filter as string | undefined,
    top: args.top as number | undefined,
    orderBy: args.orderBy as string | undefined,
  }, getAllFn);
}

// Map of table plural names to their delete functions
const TABLE_DELETE_MAP: Record<string, (id: string) => Promise<void>> = {
  jw_agents: (id) => dv.jwAgents.delete(id),
  jw_tools: (id) => dv.jwTools.delete(id),
  jw_cases: (id) => dv.jwCases.delete(id),
  jw_threads: (id) => dv.jwThreads.delete(id),
  jw_messages: (id) => dv.jwMessages.delete(id),
  jw_artifacts: (id) => dv.jwArtifacts.delete(id),
  jw_playbooks: (id) => dv.jwPlaybooks.delete(id),
  jw_instructions: (id) => dv.jwInstructions.delete(id),
  jw_toolexecutions: (id) => dv.jwToolExecutions.delete(id),
  jw_documents: (id) => dv.jwDocuments.delete(id),
  jw_agenttools: (id) => dv.jwAgentTools.delete(id),
  jw_threadcases: (id) => dv.jwThreadCases.delete(id),
};

async function handleDeleteDataverseRecord(args: Record<string, unknown>): Promise<unknown> {
  const tablePluralName = (args.tablePluralName ?? args.table ?? '') as string;
  const recordId = (args.recordId ?? args.id ?? '') as string;

  if (!tablePluralName) return { error: 'Missing tablePluralName parameter' };
  if (!recordId) return { error: 'Missing recordId parameter' };

  const deleteFn = TABLE_DELETE_MAP[tablePluralName];
  if (!deleteFn) return { error: `Unknown or protected table: ${tablePluralName}. Deletable tables: ${Object.keys(TABLE_DELETE_MAP).join(', ')}` };

  await deleteFn(recordId);
  return { success: true, deleted: { table: tablePluralName, id: recordId } };
}

// ─── CRUD Tools: Create, Update, Link ─────────────────────────────────────────

// Map of table plural names to their create functions
const TABLE_CREATE_MAP: Record<string, (data: unknown) => Promise<{ data?: unknown; success?: boolean }>> = {
  jw_agents: (data) => dv.jwAgents.create(data as never),
  jw_tools: (data) => dv.jwTools.create(data as never),
  jw_playbooks: (data) => dv.jwPlaybooks.create(data as never),
  jw_instructions: (data) => dv.jwInstructions.create(data as never),
  jw_cases: (data) => dv.jwCases.create(data as never),
  jw_artifacts: (data) => dv.jwArtifacts.create(data as never),
};

const TABLE_UPDATE_MAP: Record<string, (id: string, data: unknown) => Promise<{ success?: boolean }>> = {
  jw_agents: (id, data) => dv.jwAgents.update(id, data as never),
  jw_tools: (id, data) => dv.jwTools.update(id, data as never),
  jw_playbooks: (id, data) => dv.jwPlaybooks.update(id, data as never),
  jw_instructions: (id, data) => dv.jwInstructions.update(id, data as never),
  jw_cases: (id, data) => dv.jwCases.update(id, data as never),
  jw_artifacts: (id, data) => dv.jwArtifacts.update(id, data as never),
};

async function handleCreateDataverseRecord(args: Record<string, unknown>): Promise<unknown> {
  const tablePluralName = (args.tablePluralName ?? args.table ?? '') as string;
  const data = (args.data ?? args.record) as Record<string, unknown>;

  if (!tablePluralName) return { error: 'Missing tablePluralName parameter' };
  if (!data || typeof data !== 'object') return { error: 'Missing data parameter (object)' };

  const createFn = TABLE_CREATE_MAP[tablePluralName];
  if (!createFn) return { error: `Cannot create in table: ${tablePluralName}. Creatable: ${Object.keys(TABLE_CREATE_MAP).join(', ')}` };

  // Handle boolean fields (Dataverse requires true/false, not 0/1)
  const cleanData: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(data)) {
    if (key.includes('allowmcp') || key.includes('requiresapproval')) {
      cleanData[key] = val === true || val === 1 || val === '1' || val === 'true';
    } else {
      cleanData[key] = val;
    }
  }

  const result = await createFn(cleanData);
  return { success: true, created: { table: tablePluralName, record: result.data } };
}

async function handleUpdateDataverseRecord(args: Record<string, unknown>): Promise<unknown> {
  const tablePluralName = (args.tablePluralName ?? args.table ?? '') as string;
  const recordId = (args.recordId ?? args.id ?? '') as string;
  const data = (args.data ?? args.record) as Record<string, unknown>;

  if (!tablePluralName) return { error: 'Missing tablePluralName parameter' };
  if (!recordId) return { error: 'Missing recordId parameter' };
  if (!data || typeof data !== 'object') return { error: 'Missing data parameter (object)' };

  const updateFn = TABLE_UPDATE_MAP[tablePluralName];
  if (!updateFn) return { error: `Cannot update table: ${tablePluralName}. Updatable: ${Object.keys(TABLE_UPDATE_MAP).join(', ')}` };

  // Handle boolean fields
  const cleanData: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(data)) {
    if (key.includes('allowmcp') || key.includes('requiresapproval')) {
      cleanData[key] = val === true || val === 1 || val === '1' || val === 'true';
    } else {
      cleanData[key] = val;
    }
  }

  await updateFn(recordId, cleanData);
  return { success: true, updated: { table: tablePluralName, id: recordId } };
}

async function handleLinkAgentTool(args: Record<string, unknown>): Promise<unknown> {
  const agentId = (args.agentId ?? '') as string;
  const toolId = (args.toolId ?? '') as string;

  if (!agentId) return { error: 'Missing agentId parameter' };
  if (!toolId) return { error: 'Missing toolId parameter' };

  try {
    await dv.linkAgentTool(agentId, toolId);
    return { success: true, linked: { agentId, toolId } };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('duplicate') || msg.includes('already exists')) {
      return { success: true, message: 'Link already exists', agentId, toolId };
    }
    throw err;
  }
}

// ─── Connector Tool Handlers ─────────────────────────────────────────────────

async function handleQuerySap(args: Record<string, unknown>): Promise<unknown> {
  const method = ((args.method ?? 'GET') as string).toUpperCase() as 'GET' | 'POST' | 'PATCH' | 'DELETE';
  const relativePath = (args.relativePath ?? args.path ?? '') as string;
  if (!relativePath) return { error: 'Missing relativePath parameter' };

  const queryString = (args.queryString ?? args.query ?? '') as string;
  const body = args.body as unknown;
  const headers = args.headers as Record<string, string> | undefined;

  try {
    const result = await sapOData.execute({
      method,
      relativePath,
      queryString: queryString || undefined,
      body: body || undefined,
      headers,
    });
    return { success: true, data: result.normalized };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

async function handleAnalyzeDocument(args: Record<string, unknown>): Promise<unknown> {
  const urlSource = (args.urlSource ?? args.url ?? '') as string;
  const base64Source = (args.base64Source ?? args.base64 ?? '') as string;

  if (!urlSource && !base64Source) {
    return { error: 'Provide either urlSource (URL) or base64Source (base64-encoded document)' };
  }

  try {
    const result = await azureDocIntelligence.analyzeAndWait({
      urlSource: urlSource || undefined,
      base64Source: base64Source || undefined,
    });

    if (result.status === 'succeeded') {
      return {
        success: true,
        status: result.status,
        content: result.content,
        pageCount: (result.analyzeResult as Record<string, unknown>)?.pages
          ? ((result.analyzeResult as Record<string, unknown>).pages as unknown[]).length
          : undefined,
      };
    }
    return {
      success: false,
      status: result.status,
      error: result.status === 'timeout' ? 'Analysis timed out after 60s' : 'Analysis failed',
    };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

// ─── Playbook & Case Handlers ────────────────────────────────────────────────

async function handleStartPlaybook(args: Record<string, unknown>): Promise<unknown> {
  const playbookId = (args.playbookId ?? '') as string;
  const threadId = (args.threadId ?? '') as string;
  const title = (args.title ?? '') as string;

  if (!playbookId) return { error: 'Missing playbookId parameter' };
  if (!threadId) return { error: 'Missing threadId parameter — pass the current thread ID' };

  try {
    // 1. Load playbook
    const playbookResult = await dv.jwPlaybooks.get(playbookId);
    const playbook = playbookResult.data;
    if (!playbook) return { error: `Playbook ${playbookId} not found` };

    // 2. Create case linked to playbook
    const caseRecord: Record<string, unknown> = {
      jw_title: title || `${playbook.jw_name || 'Unnamed Playbook'} — Case`,
      jw_status: 100000000, // Active
      'jw_playbookid@odata.bind': lookupBind('jw_playbooks', playbookId),
    };
    const caseResult = await dv.jwCases.create(caseRecord as never);
    const caseId = (caseResult.data as unknown as Record<string, unknown>)?.jw_caseid as string;
    if (!caseId) return { error: 'Failed to create case — no ID returned' };

    // 3. Link thread to case via jw_threadcases
    const threadCaseRecord: Record<string, unknown> = {
      'jw_threadid@odata.bind': lookupBind('jw_threads', threadId),
      'jw_caseid@odata.bind': lookupBind('jw_cases', caseId),
      jw_name: `${playbook.jw_name || 'Playbook'} link`,
    };
    await dv.jwThreadCases.create(threadCaseRecord as never);

    // 4. Load instructions for the playbook
    const instrResult = await dv.jwInstructions.getAll({
      filter: `_jw_playbookid_value eq '${escapeOData(playbookId)}' and statecode eq 0`,
      orderBy: ['jw_name asc'],
    });
    const instructions = (instrResult.data ?? []).map(i => ({
      id: i.jw_instructionid,
      name: i.jw_name,
      type: i.jw_type,
      content: i.jw_content,
      tags: i.jw_tags,
    }));

    // 5. Initialize case context with instruction tracking
    const contextData = {
      playbookId,
      playbookName: playbook.jw_name,
      instructions: instructions.map(i => ({ ...i, completed: false })),
      startedAt: new Date().toISOString(),
    };
    await dv.jwCases.update(caseId, { jw_contextdata: JSON.stringify(contextData) } as never);

    return {
      success: true,
      caseId,
      playbookName: playbook.jw_name,
      instructionCount: instructions.length,
      instructions,
      message: `Started playbook "${playbook.jw_name}" with ${instructions.length} instructions. Case created.`,
    };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

async function handleCompleteInstruction(args: Record<string, unknown>): Promise<unknown> {
  const caseId = (args.caseId ?? '') as string;
  const instructionId = (args.instructionId ?? '') as string;
  const notes = (args.notes ?? '') as string;

  if (!caseId) return { error: 'Missing caseId parameter' };
  if (!instructionId) return { error: 'Missing instructionId parameter' };

  try {
    // Load current case context
    const caseResult = await dv.jwCases.get(caseId);
    const caseRecord = caseResult.data as unknown as Record<string, unknown>;
    if (!caseRecord) return { error: 'Case not found' };

    let contextData: Record<string, unknown> = {};
    try {
      contextData = JSON.parse((caseRecord.jw_contextdata as string) ?? '{}');
    } catch { /* start fresh */ }

    // Mark instruction as completed
    const instructions = (contextData.instructions as Array<Record<string, unknown>>) ?? [];
    const found = instructions.find(i => i.id === instructionId);
    if (!found) {
      return { error: `Instruction "${instructionId}" not found in case context. Available: ${instructions.map(i => i.id).join(', ') || '(none)'}` };
    }
    found.completed = true;
    found.completedAt = new Date().toISOString();
    if (notes) found.notes = notes;

    const total = instructions.length;
    const completed = instructions.filter(i => i.completed).length;

    // Update case context
    contextData.instructions = instructions;
    contextData.lastUpdated = new Date().toISOString();
    await dv.jwCases.update(caseId, { jw_contextdata: JSON.stringify(contextData) } as never);

    // If all instructions completed, update case status
    if (completed === total && total > 0) {
      await dv.jwCases.update(caseId, { jw_status: 100000001 } as never); // Completed
    }

    return {
      success: true,
      instructionId,
      completed,
      total,
      allDone: completed === total,
      message: `Instruction completed (${completed}/${total})${completed === total ? ' — all instructions done, case marked complete' : ''}`,
    };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

// ─── Artifact Handler ────────────────────────────────────────────────────────

async function handleSaveArtifact(args: Record<string, unknown>): Promise<unknown> {
  const type = (args.type ?? '') as string;
  const name = (args.name ?? args.title ?? '') as string;
  const payload = args.payload;
  const caseId = (args.caseId ?? '') as string;
  const parentArtifactId = (args.parentArtifactId ?? '') as string;
  const referenceKey = (args.referenceKey ?? '') as string;

  if (!type) return { error: 'Missing type parameter (e.g. "Chart", "Report", "Invoice", "SAP_Order", "Document")' };

  const payloadStr = typeof payload === 'string' ? payload : JSON.stringify(payload);

  try {
    const result = await createArtifact({
      type,
      name: name || `${type} artifact`,
      payload: payloadStr,
      caseId: caseId || undefined,
      parentArtifactId: parentArtifactId || undefined,
      referenceKey: referenceKey || undefined,
    });
    const artifactId = (result.data as unknown as Record<string, unknown>)?.jw_artifactid;
    return {
      success: true,
      artifactId,
      type,
      name,
      message: `Artifact "${name || type}" saved${caseId ? ' and linked to case' : ''}`,
    };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

// ─── Built-in Tool Definitions (for agent config) ────────────────────────────

export const BUILTIN_TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    id: 'builtin_create_visual',
    name: 'create_visual',
    description: 'Create a visualization (chart or table) from data. Supports bar, line, pie, area, scatter, radar, treemap, table, and 3d chart types. Data is rendered inline in the chat. Optionally save as an artifact linked to a case.',
    inputSchema: {
      type: 'object',
      required: ['chartType', 'title', 'data'],
      properties: {
        chartType: { type: 'string', enum: ['bar', 'line', 'pie', 'area', 'scatter', 'radar', 'treemap', 'table', '3d'] },
        title: { type: 'string' },
        data: { type: 'array', items: { type: 'object' } },
        xAxisKey: { type: 'string' },
        yAxisKey: { oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }] },
        colors: { type: 'array', items: { type: 'string' } },
        options: {
          type: 'object',
          properties: {
            interactive: { type: 'boolean' },
            stacked: { type: 'boolean' },
            legend: { type: 'boolean' },
            sortable: { type: 'boolean' },
            filterable: { type: 'boolean' },
            pageSize: { type: 'integer' },
          },
        },
        caseId: { type: 'string', description: 'Optional: Link to existing jw_case' },
        artifactType: { type: 'string', description: 'Optional: Artifact type for SemanticRenderer' },
        artifactName: { type: 'string', description: 'Optional: Name for the artifact' },
      },
    },
    requiresApproval: false,
    endpointType: 'InternalReact',
  },
  {
    id: 'builtin_search_dataverse',
    name: 'search_dataverse',
    description: 'Search for Dataverse tables by intent. Returns matching tables with schema info.',
    inputSchema: {
      type: 'object',
      required: ['intent'],
      properties: {
        intent: { type: 'string', description: 'Natural language search intent' },
      },
    },
    requiresApproval: false,
    endpointType: 'InternalReact',
  },
  {
    id: 'builtin_get_table_schema',
    name: 'get_table_schema',
    description: 'Get the schema (columns, types, keys) of a Dataverse table.',
    inputSchema: {
      type: 'object',
      required: ['logicalName'],
      properties: {
        logicalName: { type: 'string', description: 'Logical name of the table (e.g. jw_agents)' },
      },
    },
    requiresApproval: false,
    endpointType: 'InternalReact',
  },
  {
    id: 'builtin_execute_dataverse_query',
    name: 'execute_dataverse_query',
    description: 'Execute an OData query against a Dataverse table. Returns up to 50 records.',
    inputSchema: {
      type: 'object',
      required: ['tablePluralName'],
      properties: {
        tablePluralName: { type: 'string', description: 'Plural name of the table (e.g. jw_agents)' },
        select: { type: 'string', description: 'OData $select fields' },
        filter: { type: 'string', description: 'OData $filter expression' },
        top: { type: 'integer', description: 'Max records to return (max 50)' },
        orderBy: { type: 'string', description: 'OData $orderby expression' },
      },
    },
    requiresApproval: false,
    endpointType: 'InternalReact',
  },
  {
    id: 'builtin_exit',
    name: 'exit',
    description: 'Signal that your task is complete and return the result to the parent agent. Only available to sub-agents.',
    inputSchema: {
      type: 'object',
      required: ['result'],
      properties: {
        result: { type: 'string', description: 'The final result to return' },
        status: { type: 'string', enum: ['success', 'partial', 'error'] },
      },
    },
    requiresApproval: false,
    endpointType: 'InternalReact',
  },
  {
    id: 'builtin_delete_dataverse_record',
    name: 'delete_dataverse_record',
    description: 'Delete a record from a Dataverse table. DESTRUCTIVE — only available when delete capability is enabled for this agent. Always confirm with the user before deleting.',
    inputSchema: {
      type: 'object',
      required: ['tablePluralName', 'recordId'],
      properties: {
        tablePluralName: { type: 'string', description: 'Plural name of the table (e.g. jw_agents)' },
        recordId: { type: 'string', description: 'GUID of the record to delete' },
      },
    },
    requiresApproval: true, // Always requires HitL approval
    endpointType: 'InternalReact',
  },
  {
    id: 'builtin_create_dataverse_record',
    name: 'create_dataverse_record',
    description: 'Create a new record in a Dataverse table. Use this to create agents, tools, playbooks, instructions, cases, or artifacts. For boolean fields (jw_allowmcp, jw_requiresapproval) use true/false. For lookup fields use @odata.bind syntax (e.g. "jw_playbookid@odata.bind": "/jw_playbooks(guid)").',
    inputSchema: {
      type: 'object',
      required: ['tablePluralName', 'data'],
      properties: {
        tablePluralName: { type: 'string', description: 'Plural API name: jw_agents, jw_tools, jw_playbooks, jw_instructions, jw_cases, jw_artifacts' },
        data: { type: 'object', description: 'Field values to set. Use exact Dataverse column names (e.g. jw_name, jw_systemprompt).' },
      },
    },
    requiresApproval: true,
    endpointType: 'InternalReact',
  },
  {
    id: 'builtin_update_dataverse_record',
    name: 'update_dataverse_record',
    description: 'Update an existing record in a Dataverse table. Only include fields you want to change.',
    inputSchema: {
      type: 'object',
      required: ['tablePluralName', 'recordId', 'data'],
      properties: {
        tablePluralName: { type: 'string', description: 'Plural API name of the table' },
        recordId: { type: 'string', description: 'GUID of the record to update' },
        data: { type: 'object', description: 'Fields to update with new values' },
      },
    },
    requiresApproval: true,
    endpointType: 'InternalReact',
  },
  {
    id: 'builtin_link_agent_tool',
    name: 'link_agent_tool',
    description: 'Link a tool to an agent by creating a jw_agenttool junction record. This makes the tool available to the agent during conversations.',
    inputSchema: {
      type: 'object',
      required: ['agentId', 'toolId'],
      properties: {
        agentId: { type: 'string', description: 'GUID of the agent' },
        toolId: { type: 'string', description: 'GUID of the tool' },
      },
    },
    requiresApproval: false,
    endpointType: 'InternalReact',
  },
  // ─── Connector Tools ────────────────────────────────────────────────────────
  {
    id: 'builtin_query_sap',
    name: 'query_sap',
    description: 'Query SAP via OData. Uses the SAP OData custom connector (Power Automate proxy flow). Default method: GET. For write operations (POST/PATCH/DELETE), requires HitL approval.',
    inputSchema: {
      type: 'object',
      required: ['relativePath'],
      properties: {
        method: { type: 'string', enum: ['GET', 'POST', 'PATCH', 'DELETE'], description: 'HTTP method (default: GET)' },
        relativePath: { type: 'string', description: 'SAP relative path, e.g. "/API_SALES_ORDER_SRV/A_SalesOrder"' },
        queryString: { type: 'string', description: 'OData query, e.g. "$top=10&$filter=SalesOrder eq \'123\'"' },
        body: { type: 'object', description: 'Request body for POST/PATCH' },
        headers: { type: 'object', description: 'Custom request headers' },
      },
    },
    requiresApproval: true,
    endpointType: 'InternalReact',
  },
  {
    id: 'builtin_analyze_document',
    name: 'analyze_document',
    description: 'Analyze a document using Azure Document Intelligence (OCR + layout). Provide a URL or base64-encoded content. Returns extracted text as markdown. Supports PDF, images, Office docs.',
    inputSchema: {
      type: 'object',
      properties: {
        urlSource: { type: 'string', description: 'Public URL of the document to analyze' },
        base64Source: { type: 'string', description: 'Base64-encoded document content' },
      },
    },
    requiresApproval: false,
    endpointType: 'InternalReact',
  },
  // ─── Playbook & Case Tools ──────────────────────────────────────────────────
  {
    id: 'builtin_start_playbook',
    name: 'start_playbook',
    description: 'Start a playbook execution. Creates a case linked to the playbook, links the current thread to the case, and loads all instructions. Returns the instruction list for step-by-step execution.',
    inputSchema: {
      type: 'object',
      required: ['playbookId', 'threadId'],
      properties: {
        playbookId: { type: 'string', description: 'GUID of the playbook to execute' },
        threadId: { type: 'string', description: 'GUID of the current thread' },
        title: { type: 'string', description: 'Optional case title (defaults to playbook name)' },
      },
    },
    requiresApproval: true,
    endpointType: 'InternalReact',
  },
  {
    id: 'builtin_complete_instruction',
    name: 'complete_instruction',
    description: 'Mark a playbook instruction as completed. Updates the case context data with completion status. When all instructions are done, marks the case as completed.',
    inputSchema: {
      type: 'object',
      required: ['caseId', 'instructionId'],
      properties: {
        caseId: { type: 'string', description: 'GUID of the active case' },
        instructionId: { type: 'string', description: 'GUID of the instruction to mark complete' },
        notes: { type: 'string', description: 'Optional completion notes or findings' },
      },
    },
    requiresApproval: false,
    endpointType: 'InternalReact',
  },
  // ─── Artifact Tools ─────────────────────────────────────────────────────────
  {
    id: 'builtin_save_artifact',
    name: 'save_artifact',
    description: 'Save an artifact (report, analysis, extracted data, generated content) to Dataverse. Optionally link to a case. Artifacts are versioned — set parentArtifactId for updates. Types: Chart, Report, Invoice, SAP_Order, Document, Analysis, Summary, Custom.',
    inputSchema: {
      type: 'object',
      required: ['type'],
      properties: {
        type: { type: 'string', description: 'Artifact type (e.g. "Chart", "Report", "Invoice", "SAP_Order", "Document", "Analysis")' },
        name: { type: 'string', description: 'Display name for the artifact' },
        payload: { description: 'Artifact content — string or JSON object' },
        caseId: { type: 'string', description: 'Optional: link to a jw_case' },
        parentArtifactId: { type: 'string', description: 'Optional: parent artifact (for versioning)' },
        referenceKey: { type: 'string', description: 'Optional: external reference key' },
      },
    },
    requiresApproval: false,
    endpointType: 'InternalReact',
  },
];
