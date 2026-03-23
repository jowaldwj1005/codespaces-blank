/**
 * Seed Data Service — Creates initial Dataverse records for testing.
 * Idempotent: checks for existing records by name before creating.
 * Traceable: emits events for every operation via debugEventBus.
 */

import {
  jwAgents, jwTools, jwPlaybooks, jwInstructions,
  linkAgentTool,
} from './dataverse';
import type { Jw_agents } from '../generated/models/Jw_agentsModel';
import type { Jw_tools } from '../generated/models/Jw_toolsModel';

// ─── Seed Record Types ──────────────────────────────────────────────────────

export interface SeedRecord {
  type: 'agent' | 'tool' | 'playbook' | 'instruction' | 'agent_tool_link';
  name: string;
  data: Record<string, unknown>;
  /** Populated after seed execution */
  status?: 'exists' | 'created' | 'error' | 'skipped';
  /** If status is 'exists' or 'created', the record ID */
  recordId?: string;
  error?: string;
  /** For agent_tool_link: references to agent and tool names */
  agentName?: string;
  toolName?: string;
}

export type SeedProgress = (record: SeedRecord, index: number, total: number) => void;

// ─── General Assistant Seed Data ────────────────────────────────────────────

const GENERAL_ASSISTANT_PROMPT = `You are the Playbook Agent General Assistant. You help users explore and work with Dataverse data, create visualizations, and answer questions.

## Your Capabilities
- **search_dataverse**: Find relevant tables by describing what you're looking for
- **get_table_schema**: Inspect table structure (columns, types, keys)
- **execute_dataverse_query**: Run OData queries to retrieve data
- **create_visual**: Create inline charts and tables from data

## How to Work
1. When asked about data, first search for relevant tables
2. Inspect the schema to understand available columns
3. Query the data with appropriate filters
4. Visualize results when it makes sense — prefer charts for trends, tables for details
5. Always explain what you found and what it means

## Communication Style
- Clear and concise
- Bilingual: respond in the language the user writes in (German or English)
- Show your reasoning — explain which tables you're querying and why
- Proactively suggest follow-up analyses when you spot interesting patterns`;

export function getGeneralAssistantSeedData(): SeedRecord[] {
  return [
    // ─── Tools ────────────────────────────────────────────────────────
    {
      type: 'tool',
      name: 'search_dataverse',
      data: {
        jw_name: 'search_dataverse',
        jw_description: 'Search for Dataverse tables by intent. Returns matching tables with schema info.',
        jw_endpointtype: 100000002, // InternalReact
        jw_requiresapproval: false,
        jw_inputschema: JSON.stringify({
          type: 'object',
          required: ['intent'],
          properties: {
            intent: { type: 'string', description: 'Natural language search intent' },
          },
        }),
      },
    },
    {
      type: 'tool',
      name: 'get_table_schema',
      data: {
        jw_name: 'get_table_schema',
        jw_description: 'Get the schema (columns, types, keys) of a Dataverse table.',
        jw_endpointtype: 100000002,
        jw_requiresapproval: false,
        jw_inputschema: JSON.stringify({
          type: 'object',
          required: ['logicalName'],
          properties: {
            logicalName: { type: 'string', description: 'Logical name of the table (e.g. jw_agents)' },
          },
        }),
      },
    },
    {
      type: 'tool',
      name: 'execute_dataverse_query',
      data: {
        jw_name: 'execute_dataverse_query',
        jw_description: 'Execute an OData query against a Dataverse table. Returns up to 50 records.',
        jw_endpointtype: 100000002,
        jw_requiresapproval: false,
        jw_inputschema: JSON.stringify({
          type: 'object',
          required: ['tablePluralName'],
          properties: {
            tablePluralName: { type: 'string', description: 'Plural name of the table (e.g. jw_agents)' },
            select: { type: 'string', description: 'Comma-separated column names' },
            filter: { type: 'string', description: 'OData $filter expression' },
            top: { type: 'integer', description: 'Max records (max 50)' },
            orderBy: { type: 'string', description: 'OData $orderby expression' },
          },
        }),
      },
    },
    {
      type: 'tool',
      name: 'create_visual',
      data: {
        jw_name: 'create_visual',
        jw_description: 'Create a visualization (chart or table) from data. Supports bar, line, pie, area, scatter, radar, treemap, table types. Rendered inline in the chat.',
        jw_endpointtype: 100000002,
        jw_requiresapproval: false,
        jw_inputschema: JSON.stringify({
          type: 'object',
          required: ['chartType', 'title', 'data'],
          properties: {
            chartType: { type: 'string', enum: ['bar', 'line', 'pie', 'area', 'scatter', 'radar', 'treemap', 'table'] },
            title: { type: 'string' },
            data: { type: 'array', items: { type: 'object' } },
            xAxisKey: { type: 'string' },
            yAxisKey: { oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }] },
            colors: { type: 'array', items: { type: 'string' } },
            options: { type: 'object' },
          },
        }),
      },
    },
    // ─── Agent ────────────────────────────────────────────────────────
    {
      type: 'agent',
      name: 'General Assistant',
      data: {
        jw_name: 'General Assistant',
        jw_systemprompt: GENERAL_ASSISTANT_PROMPT,
        jw_allowmcp: true,
        jw_modelconfig: JSON.stringify({
          temperature: 0.7,
          max_completion_tokens: 2000,
          tool_choice: 'auto',
        }),
      },
    },
    // ─── Agent-Tool Links ─────────────────────────────────────────────
    { type: 'agent_tool_link', name: 'General Assistant → search_dataverse', data: {}, agentName: 'General Assistant', toolName: 'search_dataverse' },
    { type: 'agent_tool_link', name: 'General Assistant → get_table_schema', data: {}, agentName: 'General Assistant', toolName: 'get_table_schema' },
    { type: 'agent_tool_link', name: 'General Assistant → execute_dataverse_query', data: {}, agentName: 'General Assistant', toolName: 'execute_dataverse_query' },
    { type: 'agent_tool_link', name: 'General Assistant → create_visual', data: {}, agentName: 'General Assistant', toolName: 'create_visual' },
    // ─── Playbook + Instructions (sample) ─────────────────────────────
    {
      type: 'playbook',
      name: 'Data Exploration',
      data: {
        jw_name: 'Data Exploration',
        jw_description: 'Guided data exploration workflow — search tables, inspect schemas, query data, visualize results.',
      },
    },
    {
      type: 'instruction',
      name: 'Step 1: Identify relevant tables',
      data: {
        jw_name: 'Step 1: Identify relevant tables',
        jw_content: 'Use search_dataverse to find tables related to the user\'s question. Present a summary of matching tables.',
        jw_ordernumber: 1,
      },
    },
    {
      type: 'instruction',
      name: 'Step 2: Inspect and query',
      data: {
        jw_name: 'Step 2: Inspect and query',
        jw_content: 'Use get_table_schema to understand the data structure, then execute_dataverse_query to retrieve relevant records.',
        jw_ordernumber: 2,
      },
    },
    {
      type: 'instruction',
      name: 'Step 3: Visualize findings',
      data: {
        jw_name: 'Step 3: Visualize findings',
        jw_content: 'Use create_visual to present the data as a chart or table. Choose the visualization type that best communicates the insight.',
        jw_ordernumber: 3,
      },
    },
  ];
}

// ─── Seed Executor ──────────────────────────────────────────────────────────

/**
 * Execute seed data creation. Idempotent — checks for existing records by jw_name.
 * Returns the updated seed records array with status/recordId populated.
 */
export async function executeSeed(
  records: SeedRecord[],
  onProgress?: SeedProgress
): Promise<SeedRecord[]> {
  const results = [...records];
  const agentIdMap = new Map<string, string>();
  const toolIdMap = new Map<string, string>();

  for (let i = 0; i < results.length; i++) {
    const record = results[i];

    try {
      switch (record.type) {
        case 'agent': {
          const existing = await findByName<Jw_agents>(jwAgents.getAll, record.data.jw_name as string);
          if (existing) {
            record.status = 'exists';
            record.recordId = existing.jw_agentid;
            await jwAgents.update(existing.jw_agentid, record.data as Parameters<typeof jwAgents.update>[1]);
          } else {
            const result = await jwAgents.create(record.data as Parameters<typeof jwAgents.create>[0]);
            if (!result.data?.jw_agentid) {
              throw new Error(`Agent create returned no ID — response: ${JSON.stringify(result)}`);
            }
            record.status = 'created';
            record.recordId = result.data.jw_agentid;
          }
          if (record.recordId) agentIdMap.set(record.data.jw_name as string, record.recordId);
          break;
        }

        case 'tool': {
          const existing = await findByName<Jw_tools>(jwTools.getAll, record.data.jw_name as string);
          if (existing) {
            record.status = 'exists';
            record.recordId = existing.jw_toolid;
            await jwTools.update(existing.jw_toolid, record.data as Parameters<typeof jwTools.update>[1]);
          } else {
            const result = await jwTools.create(record.data as Parameters<typeof jwTools.create>[0]);
            if (!result.data?.jw_toolid) {
              throw new Error(`Tool create returned no ID — response: ${JSON.stringify(result)}`);
            }
            record.status = 'created';
            record.recordId = result.data.jw_toolid;
          }
          if (record.recordId) toolIdMap.set(record.data.jw_name as string, record.recordId);
          break;
        }

        case 'playbook': {
          const existing = await findByName(jwPlaybooks.getAll, record.data.jw_name as string);
          if (existing) {
            record.status = 'exists';
            record.recordId = (existing as unknown as Record<string, string>).jw_playbookid;
          } else {
            const result = await jwPlaybooks.create(record.data as Parameters<typeof jwPlaybooks.create>[0]);
            if (!result.data) {
              throw new Error(`Playbook create returned no data — response: ${JSON.stringify(result)}`);
            }
            record.status = 'created';
            record.recordId = (result.data as unknown as Record<string, string>).jw_playbookid;
          }
          break;
        }

        case 'instruction': {
          const existing = await findByName(jwInstructions.getAll, record.data.jw_name as string);
          if (existing) {
            record.status = 'exists';
            record.recordId = (existing as unknown as Record<string, string>).jw_instructionid;
          } else {
            const result = await jwInstructions.create(record.data as Parameters<typeof jwInstructions.create>[0]);
            if (!result.data) {
              throw new Error(`Instruction create returned no data — response: ${JSON.stringify(result)}`);
            }
            record.status = 'created';
            record.recordId = (result.data as unknown as Record<string, string>).jw_instructionid;
          }
          break;
        }

        case 'agent_tool_link': {
          const agentId = agentIdMap.get(record.agentName!);
          const toolId = toolIdMap.get(record.toolName!);
          if (!agentId || !toolId) {
            record.status = 'error';
            record.error = `Missing ${!agentId ? 'agent' : 'tool'} ID — parent record likely failed to create`;
            break;
          }
          try {
            await linkAgentTool(agentId, toolId);
            record.status = 'created';
          } catch (linkErr) {
            // Check if it's a duplicate (already exists) vs real error
            const msg = linkErr instanceof Error ? linkErr.message : String(linkErr);
            if (msg.toLowerCase().includes('duplicate') || msg.includes('0x80040237')) {
              record.status = 'exists';
            } else {
              throw linkErr;
            }
          }
          break;
        }
      }
    } catch (err) {
      record.status = 'error';
      record.error = err instanceof Error ? err.message : String(err);
    }

    onProgress?.(record, i, results.length);
  }

  return results;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function findByName<T = any>(
  getAllFn: (opts: any) => Promise<{ data?: T[] }>,
  name: string
): Promise<T | null> {
  try {
    const result = await getAllFn({
      filter: `jw_name eq '${name.replace(/'/g, "''")}'`,
      top: 1,
    });
    const records = result.data ?? [];
    return records.length > 0 ? records[0] : null;
  } catch {
    return null;
  }
}
