/**
 * Built-in Tools — InternalReact tool handlers executed directly in the browser.
 * These include MCP bridges, visualization, and sub-agent delegation.
 */

import type { CreateVisualInput, ToolDefinition } from '../types/agent';
import { searchDataverseTables, getTableSchema, executeDataverseQuery } from './dataverseMcp';
import { createArtifact } from './dataverse';
import type { IOperationResult } from '@microsoft/power-apps/data';
import * as dv from './dataverse';

// ─── Tool Handler Type ───────────────────────────────────────────────────────

type ToolHandler = (args: Record<string, unknown>) => Promise<unknown>;

// ─── Tool Registry ───────────────────────────────────────────────────────────

export const BUILTIN_TOOLS: Record<string, ToolHandler> = {
  create_visual: handleCreateVisual,
  exit: handleExit,
  search_dataverse: handleSearchDataverse,
  get_table_schema: handleGetTableSchema,
  execute_dataverse_query: handleExecuteDataverseQuery,
};

// ─── Handlers ────────────────────────────────────────────────────────────────

async function handleCreateVisual(args: Record<string, unknown>): Promise<unknown> {
  const input = args as unknown as CreateVisualInput;

  if (!input.chartType || !input.title || !input.data) {
    return { error: 'Missing required fields: chartType, title, data' };
  }

  const visualId = `vis_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  // Optionally save as artifact
  let artifactId: string | undefined;
  if (input.caseId && input.artifactType) {
    try {
      const result = await createArtifact({
        type: input.artifactType,
        name: input.artifactName ?? input.title,
        payload: JSON.stringify(input),
        caseId: input.caseId,
      });
      artifactId = result.data?.jw_artifactid;
    } catch {
      // Non-critical — visual still renders even if artifact save fails
    }
  }

  return { visualId, artifactId, chartType: input.chartType, title: input.title };
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
];
