/**
 * Seed Data Service — Creates initial Dataverse records for testing.
 * Idempotent: checks for existing records by name before creating.
 * Traceable: emits events for every operation via debugEventBus.
 */

import {
  jwAgents, jwTools, jwPlaybooks, jwInstructions,
  jwAgentTools, linkAgentTool,
} from './dataverse';
import { lookupBind } from './sdk';
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
  /** For instruction: the playbook this instruction belongs to */
  playbookName?: string;
}

export type SeedProgress = (record: SeedRecord, index: number, total: number) => void;

// ─── General Assistant Seed Data ────────────────────────────────────────────

const GENERAL_ASSISTANT_PROMPT = `You are the Playbook Agent General Assistant. You help users explore Dataverse data, query SAP systems, analyze documents, manage cases, and create visualizations.

## Output Format — Rich Markdown

**IMPORTANT:** Always format your responses in beautiful, structured Markdown. Your output is rendered with full Markdown support including:
- **Headers** (##, ###) to structure sections
- **Bold** and *italic* for emphasis
- \`inline code\` and \`\`\`code blocks\`\`\` with language tags
- Bullet lists and numbered lists
- > Blockquotes for important callouts
- Tables for structured data comparisons
- Links where relevant
- Horizontal rules (---) to separate sections

Use these formatting features generously — they make your responses easy to scan and visually appealing. Structure longer responses with clear headers. Use code blocks with language tags (e.g. \`\`\`json, \`\`\`sql, \`\`\`javascript) for any data or code output.

When presenting analysis results, prefer:
1. A brief **summary** header with key finding
2. A table or list of details
3. A visualization recommendation or automatic chart

## Your Capabilities

### Data Exploration
- **search_dataverse**: Find relevant tables by natural language intent
- **get_table_schema**: Inspect table structure (columns, types, keys)
- **execute_dataverse_query**: Run OData queries (max 50 records)
- **create_visual**: Charts (bar/line/pie/area/scatter/radar) and tables from data

### Code-Based Data Analysis
- **run_data_code**: Execute JavaScript code for data analysis — has built-in helpers: \`sum()\`, \`avg()\`, \`median()\`, \`stddev()\`, \`groupBy()\`, \`sortBy()\`, \`unique()\`, \`pluck()\`, \`countBy()\`, \`daysBetween()\`. Use this for calculations, transformations, aggregations, and statistical analysis on query results.
- **cross_table_analysis**: Query 2–4 tables and run join/correlation analysis across them. Use for cross-entity insights, relationship discovery, and data quality checks.

### Connectors
- **query_sap**: Query SAP via OData — GET for reads, POST/PATCH for writes (requires approval)
- **analyze_document**: Extract text from documents (PDF, images, Office) via Azure Doc Intelligence

### Entity Management (requires approval)
- **create_dataverse_record**: Create agents, tools, playbooks, instructions, cases, artifacts
- **update_dataverse_record**: Update any Dataverse record
- **link_agent_tool**: Connect tools to agents

### Playbook Execution
- **start_playbook**: Start a playbook — creates a case, links thread, loads instructions
- **complete_instruction**: Mark a playbook step as done (tracks progress in case context)

### Artifacts
- **save_artifact**: Save reports, analyses, extracted data linked to a case (for audit trail)

## How to Work
1. When asked about data, first search for relevant tables
2. Inspect the schema to understand available columns
3. Query the data with appropriate filters
4. **Use run_data_code** for any calculations, aggregations, or transformations on the results
5. **Use cross_table_analysis** when questions span multiple entities
6. Visualize results when it makes sense — charts for trends, tables for details
7. When working on a playbook, follow instructions step by step and mark each complete
8. Save important outputs as artifacts linked to the active case
9. Always explain what you found and what it means — **use Markdown formatting**

## Communication Style
- **Richly formatted** Markdown in every response — headers, bold, code blocks, tables
- Clear, concise, bilingual (respond in user's language: German or English)
- Show your reasoning — explain which tables you're querying and why
- Proactively suggest follow-up analyses when you spot interesting patterns
- When presenting numbers, use tables and highlight key metrics in **bold**
- When using SAP tools, explain the OData path and what data you're requesting`;

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
        jw_description: 'Create a visualization (chart or table) from data. Supports bar, line, pie, area, scatter, radar, treemap, table, 3d types. Rendered inline in chat. Optionally saves as artifact when caseId is provided.',
        jw_endpointtype: 100000002,
        jw_requiresapproval: false,
        jw_inputschema: JSON.stringify({
          type: 'object',
          required: ['chartType', 'title', 'data'],
          properties: {
            chartType: { type: 'string', enum: ['bar', 'line', 'pie', 'area', 'scatter', 'radar', 'treemap', 'table', '3d'] },
            title: { type: 'string' },
            data: { type: 'array', items: { type: 'object' } },
            xAxisKey: { type: 'string' },
            yAxisKey: { oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }] },
            colors: { type: 'array', items: { type: 'string' } },
            options: { type: 'object', properties: {
              interactive: { type: 'boolean' },
              stacked: { type: 'boolean' },
              legend: { type: 'boolean' },
              sortable: { type: 'boolean' },
              filterable: { type: 'boolean' },
              pageSize: { type: 'integer' },
            } },
            caseId: { type: 'string', description: 'Optional: link visualization to a case as artifact' },
            artifactType: { type: 'string', description: 'Artifact type when saving (default: Chart)' },
            artifactName: { type: 'string', description: 'Artifact display name (defaults to title)' },
          },
        }),
      },
    },
    {
      type: 'tool',
      name: 'create_dataverse_record',
      data: {
        jw_name: 'create_dataverse_record',
        jw_description: 'Create a new record in a Dataverse table (agents, tools, playbooks, instructions, cases, artifacts). For boolean fields use true/false. For lookups use @odata.bind syntax.',
        jw_endpointtype: 100000002,
        jw_requiresapproval: true,
        jw_inputschema: JSON.stringify({
          type: 'object',
          required: ['tablePluralName', 'data'],
          properties: {
            tablePluralName: { type: 'string', description: 'Table: jw_agents, jw_tools, jw_playbooks, jw_instructions, jw_cases, jw_artifacts' },
            data: { type: 'object', description: 'Field values (e.g. { jw_name: "My Agent", jw_systemprompt: "..." })' },
          },
        }),
      },
    },
    {
      type: 'tool',
      name: 'update_dataverse_record',
      data: {
        jw_name: 'update_dataverse_record',
        jw_description: 'Update an existing Dataverse record. Only include fields you want to change.',
        jw_endpointtype: 100000002,
        jw_requiresapproval: true,
        jw_inputschema: JSON.stringify({
          type: 'object',
          required: ['tablePluralName', 'recordId', 'data'],
          properties: {
            tablePluralName: { type: 'string' },
            recordId: { type: 'string', description: 'GUID of the record' },
            data: { type: 'object', description: 'Fields to update' },
          },
        }),
      },
    },
    {
      type: 'tool',
      name: 'link_agent_tool',
      data: {
        jw_name: 'link_agent_tool',
        jw_description: 'Link a tool to an agent by creating a junction record. Makes the tool available to the agent in conversations.',
        jw_endpointtype: 100000002,
        jw_requiresapproval: false,
        jw_inputschema: JSON.stringify({
          type: 'object',
          required: ['agentId', 'toolId'],
          properties: {
            agentId: { type: 'string', description: 'GUID of the agent' },
            toolId: { type: 'string', description: 'GUID of the tool' },
          },
        }),
      },
    },
    {
      type: 'tool',
      name: 'exit',
      data: {
        jw_name: 'exit',
        jw_description: 'End the conversation loop. Call this when the task is complete or the user says goodbye.',
        jw_endpointtype: 100000002,
        jw_requiresapproval: false,
        jw_inputschema: JSON.stringify({
          type: 'object',
          properties: {
            summary: { type: 'string', description: 'Brief summary of what was accomplished' },
          },
        }),
      },
    },
    {
      type: 'tool',
      name: 'delete_dataverse_record',
      data: {
        jw_name: 'delete_dataverse_record',
        jw_description: 'Delete a record from a Dataverse table. Only available when agent has allowDelete capability. Requires approval.',
        jw_endpointtype: 100000002,
        jw_requiresapproval: true,
        jw_inputschema: JSON.stringify({
          type: 'object',
          required: ['tablePluralName', 'recordId'],
          properties: {
            tablePluralName: { type: 'string', description: 'Plural API name of the table' },
            recordId: { type: 'string', description: 'GUID of the record to delete' },
          },
        }),
      },
    },
    // ─── Data Exploration Code Tools ─────────────────────────────────
    {
      type: 'tool',
      name: 'run_data_code',
      data: {
        jw_name: 'run_data_code',
        jw_description: 'Execute JavaScript code for data analysis. Sandboxed with helpers: sum(), avg(), median(), stddev(), groupBy(), sortBy(), unique(), pluck(), countBy(), daysBetween(). Input data available as `data`. Return the result.',
        jw_endpointtype: 100000002, // InternalReact
        jw_requiresapproval: false,
        jw_inputschema: JSON.stringify({
          type: 'object',
          required: ['code'],
          properties: {
            code: { type: 'string', description: 'JavaScript code to execute. Must return a value.' },
            data: { description: 'Input data — available as `data` in the code' },
          },
        }),
      },
    },
    {
      type: 'tool',
      name: 'cross_table_analysis',
      data: {
        jw_name: 'cross_table_analysis',
        jw_description: 'Query 2-4 Dataverse tables and run analysis code across them. Each query result is available by its alias. Use for joins, correlations, and cross-entity insights.',
        jw_endpointtype: 100000002,
        jw_requiresapproval: false,
        jw_inputschema: JSON.stringify({
          type: 'object',
          required: ['queries', 'code'],
          properties: {
            queries: {
              type: 'array',
              items: {
                type: 'object',
                required: ['table', 'alias'],
                properties: {
                  table: { type: 'string', description: 'Plural table name' },
                  alias: { type: 'string', description: 'Variable name in code' },
                  select: { type: 'string', description: 'Comma-separated columns' },
                  filter: { type: 'string', description: 'OData $filter' },
                  top: { type: 'integer', description: 'Max records (max 100)' },
                },
              },
            },
            code: { type: 'string', description: 'JavaScript analysis code using query aliases' },
          },
        }),
      },
    },
    // ─── Connector Tools ─────────────────────────────────────────────
    {
      type: 'tool',
      name: 'query_sap',
      data: {
        jw_name: 'query_sap',
        jw_description: 'Query SAP via OData (Power Automate proxy). GET for reads, POST/PATCH/DELETE for writes. Requires approval for all operations.',
        jw_endpointtype: 100000002,
        jw_requiresapproval: true,
        jw_inputschema: JSON.stringify({
          type: 'object',
          required: ['relativePath'],
          properties: {
            method: { type: 'string', enum: ['GET', 'POST', 'PATCH', 'DELETE'], description: 'HTTP method (default: GET)' },
            relativePath: { type: 'string', description: 'SAP path, e.g. "/API_SALES_ORDER_SRV/A_SalesOrder"' },
            queryString: { type: 'string', description: 'OData query string' },
            body: { type: 'object', description: 'Request body for POST/PATCH' },
          },
        }),
      },
    },
    {
      type: 'tool',
      name: 'analyze_document',
      data: {
        jw_name: 'analyze_document',
        jw_description: 'Analyze a document using Azure Document Intelligence (OCR + layout). Provide a URL or base64 content. Returns extracted text as markdown.',
        jw_endpointtype: 100000002,
        jw_requiresapproval: false,
        jw_inputschema: JSON.stringify({
          type: 'object',
          description: 'Provide either urlSource OR base64Source (at least one required)',
          properties: {
            urlSource: { type: 'string', description: 'Public URL of the document' },
            base64Source: { type: 'string', description: 'Base64-encoded document content' },
          },
        }),
      },
    },
    // ─── Playbook & Case Tools ────────────────────────────────────────
    {
      type: 'tool',
      name: 'start_playbook',
      data: {
        jw_name: 'start_playbook',
        jw_description: 'Start a playbook execution. Creates a case, links thread, loads instructions for step-by-step execution.',
        jw_endpointtype: 100000002,
        jw_requiresapproval: true,
        jw_inputschema: JSON.stringify({
          type: 'object',
          required: ['playbookId', 'threadId'],
          properties: {
            playbookId: { type: 'string', description: 'GUID of the playbook' },
            threadId: { type: 'string', description: 'Current thread GUID' },
            title: { type: 'string', description: 'Optional case title' },
          },
        }),
      },
    },
    {
      type: 'tool',
      name: 'complete_instruction',
      data: {
        jw_name: 'complete_instruction',
        jw_description: 'Mark a playbook instruction as completed. Tracks progress in case context. Marks case complete when all instructions are done.',
        jw_endpointtype: 100000002,
        jw_requiresapproval: false,
        jw_inputschema: JSON.stringify({
          type: 'object',
          required: ['caseId', 'instructionId'],
          properties: {
            caseId: { type: 'string', description: 'Active case GUID' },
            instructionId: { type: 'string', description: 'Instruction GUID to mark complete' },
            notes: { type: 'string', description: 'Completion notes' },
          },
        }),
      },
    },
    {
      type: 'tool',
      name: 'save_artifact',
      data: {
        jw_name: 'save_artifact',
        jw_description: 'Save an artifact (report, analysis, extracted data) to Dataverse. Link to a case for audit trail. Types: Chart, Report, Invoice, SAP_Order, Document, Analysis, Summary.',
        jw_endpointtype: 100000002,
        jw_requiresapproval: false,
        jw_inputschema: JSON.stringify({
          type: 'object',
          required: ['type'],
          properties: {
            type: { type: 'string', description: 'Artifact type' },
            name: { type: 'string', description: 'Display name' },
            payload: { description: 'Artifact content (string or JSON)' },
            caseId: { type: 'string', description: 'Optional case link' },
            parentArtifactId: { type: 'string', description: 'Parent artifact (versioning)' },
            referenceKey: { type: 'string', description: 'External reference key' },
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
          model: 'gpt-5.2',
          temperature: 0.7,
          max_output_tokens: 4096,
          tool_choice: 'auto',
          web_search: true,
        }),
      },
    },
    // ─── Agent-Tool Links ─────────────────────────────────────────────
    { type: 'agent_tool_link', name: 'General Assistant → search_dataverse', data: {}, agentName: 'General Assistant', toolName: 'search_dataverse' },
    { type: 'agent_tool_link', name: 'General Assistant → get_table_schema', data: {}, agentName: 'General Assistant', toolName: 'get_table_schema' },
    { type: 'agent_tool_link', name: 'General Assistant → execute_dataverse_query', data: {}, agentName: 'General Assistant', toolName: 'execute_dataverse_query' },
    { type: 'agent_tool_link', name: 'General Assistant → create_visual', data: {}, agentName: 'General Assistant', toolName: 'create_visual' },
    { type: 'agent_tool_link', name: 'General Assistant → run_data_code', data: {}, agentName: 'General Assistant', toolName: 'run_data_code' },
    { type: 'agent_tool_link', name: 'General Assistant → cross_table_analysis', data: {}, agentName: 'General Assistant', toolName: 'cross_table_analysis' },
    { type: 'agent_tool_link', name: 'General Assistant → create_dataverse_record', data: {}, agentName: 'General Assistant', toolName: 'create_dataverse_record' },
    { type: 'agent_tool_link', name: 'General Assistant → update_dataverse_record', data: {}, agentName: 'General Assistant', toolName: 'update_dataverse_record' },
    { type: 'agent_tool_link', name: 'General Assistant → link_agent_tool', data: {}, agentName: 'General Assistant', toolName: 'link_agent_tool' },
    { type: 'agent_tool_link', name: 'General Assistant → query_sap', data: {}, agentName: 'General Assistant', toolName: 'query_sap' },
    { type: 'agent_tool_link', name: 'General Assistant → analyze_document', data: {}, agentName: 'General Assistant', toolName: 'analyze_document' },
    { type: 'agent_tool_link', name: 'General Assistant → start_playbook', data: {}, agentName: 'General Assistant', toolName: 'start_playbook' },
    { type: 'agent_tool_link', name: 'General Assistant → complete_instruction', data: {}, agentName: 'General Assistant', toolName: 'complete_instruction' },
    { type: 'agent_tool_link', name: 'General Assistant → save_artifact', data: {}, agentName: 'General Assistant', toolName: 'save_artifact' },
    { type: 'agent_tool_link', name: 'General Assistant → exit', data: {}, agentName: 'General Assistant', toolName: 'exit' },
    { type: 'agent_tool_link', name: 'General Assistant → delete_dataverse_record', data: {}, agentName: 'General Assistant', toolName: 'delete_dataverse_record' },
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
      playbookName: 'Data Exploration',
      data: {
        jw_name: 'Step 1: Identify relevant tables',
        jw_content: 'Use search_dataverse to find tables related to the user\'s question. Present a summary of matching tables.',
        jw_type: 'Rule',
      },
    },
    {
      type: 'instruction',
      name: 'Step 2: Inspect and query',
      playbookName: 'Data Exploration',
      data: {
        jw_name: 'Step 2: Inspect and query',
        jw_content: 'Use get_table_schema to understand the data structure, then execute_dataverse_query to retrieve relevant records.',
        jw_type: 'Rule',
      },
    },
    {
      type: 'instruction',
      name: 'Step 3: Visualize findings',
      playbookName: 'Data Exploration',
      data: {
        jw_name: 'Step 3: Visualize findings',
        jw_content: 'Use create_visual to present the data as a chart or table. Choose the visualization type that best communicates the insight.',
        jw_type: 'Rule',
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
  const playbookIdMap = new Map<string, string>();

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
          if (record.recordId) playbookIdMap.set(record.data.jw_name as string, record.recordId);
          break;
        }

        case 'instruction': {
          // Bind instruction to its playbook if playbookName is set
          const instrData = { ...record.data };
          if (record.playbookName) {
            const pbId = playbookIdMap.get(record.playbookName);
            if (pbId) {
              instrData['jw_playbookid@odata.bind'] = lookupBind('jw_playbooks', pbId);
            }
          }
          const existing = await findByName(jwInstructions.getAll, record.data.jw_name as string);
          if (existing) {
            record.status = 'exists';
            record.recordId = (existing as unknown as Record<string, string>).jw_instructionid;
            // Update to ensure playbook link is set
            await jwInstructions.update(
              record.recordId,
              instrData as Parameters<typeof jwInstructions.update>[1]
            );
          } else {
            const result = await jwInstructions.create(instrData as Parameters<typeof jwInstructions.create>[0]);
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
          // Check if link already exists BEFORE creating (prevents N:N duplicates)
          try {
            const existing = await jwAgentTools.getAll({
              filter: `_jw_agentid_value eq '${agentId}' and _jw_toolid_value eq '${toolId}'`,
              top: 1,
            } as Parameters<typeof jwAgentTools.getAll>[0]);
            if ((existing.data ?? []).length > 0) {
              record.status = 'exists';
              break;
            }
          } catch {
            // If query fails, try creating anyway
          }
          try {
            await linkAgentTool(agentId, toolId);
            record.status = 'created';
          } catch (linkErr) {
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
