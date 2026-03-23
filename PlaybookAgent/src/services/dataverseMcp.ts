/**
 * Dataverse MCP (Model Context Protocol) - Explorer tools for AI agents.
 *
 * These tools allow an LLM to discover and query Dataverse tables
 * without having the entire CRM schema in its system prompt.
 *
 * Security: Only enabled when jw_agent.jw_allowmcp === true.
 * All queries are read-only. Writes MUST go through the HitL ToolExecution flow.
 *
 * Tools:
 * 1. search_dataverse_tables(intent) - Maps user intent to table logical names
 * 2. get_table_schema(logical_name) - Returns minified schema (columns/types)
 * 3. execute_dataverse_query(fetch_xml) - Executes read-only FetchXML
 */

import { tracedOperation } from './sdk';
import type { IOperationResult } from '@microsoft/power-apps/data';

// ─── Table Registry ──────────────────────────────────────────────────────────
// Whitelisted tables the MCP can discover. Maps intent keywords to tables.
// Expand this as jw_ entities are created in Dataverse.

export interface McpTableInfo {
  logicalName: string;
  displayName: string;
  pluralName: string;
  primaryKey: string;
  description: string;
  keywords: string[];
}

const TABLE_REGISTRY: McpTableInfo[] = [
  {
    logicalName: 'systemuser',
    displayName: 'System User',
    pluralName: 'systemusers',
    primaryKey: 'systemuserid',
    description: 'Users in the system (employees, admins)',
    keywords: ['user', 'employee', 'person', 'staff', 'admin', 'mitarbeiter', 'benutzer'],
  },
  {
    logicalName: 'team',
    displayName: 'Team',
    pluralName: 'teams',
    primaryKey: 'teamid',
    description: 'Teams and groups of users',
    keywords: ['team', 'group', 'department', 'abteilung', 'gruppe'],
  },
  {
    logicalName: 'businessunit',
    displayName: 'Business Unit',
    pluralName: 'businessunits',
    primaryKey: 'businessunitid',
    description: 'Organizational units / business divisions',
    keywords: ['business unit', 'organization', 'division', 'unit', 'organisation'],
  },
  // ─── jw_ entities (add as they're created in Dataverse) ───
  {
    logicalName: 'jw_agent',
    displayName: 'Agent',
    pluralName: 'jw_agents',
    primaryKey: 'jw_agentid',
    description: 'AI agent definitions with system prompts and model config',
    keywords: ['agent', 'ai', 'bot', 'assistant', 'ki'],
  },
  {
    logicalName: 'jw_tool',
    displayName: 'Tool',
    pluralName: 'jw_tools',
    primaryKey: 'jw_toolid',
    description: 'Tool definitions the LLM can invoke (SAP, connectors, etc)',
    keywords: ['tool', 'function', 'action', 'werkzeug', 'aktion'],
  },
  {
    logicalName: 'jw_playbook',
    displayName: 'Playbook',
    pluralName: 'jw_playbooks',
    primaryKey: 'jw_playbookid',
    description: 'Business process templates grouping instructions',
    keywords: ['playbook', 'process', 'workflow', 'prozess', 'ablauf'],
  },
  {
    logicalName: 'jw_case',
    displayName: 'Case',
    pluralName: 'jw_cases',
    primaryKey: 'jw_caseid',
    description: 'Business case instances linked to playbooks',
    keywords: ['case', 'ticket', 'request', 'fall', 'anfrage', 'vorgang'],
  },
  {
    logicalName: 'jw_artifact',
    displayName: 'Artifact',
    pluralName: 'jw_artifacts',
    primaryKey: 'jw_artifactid',
    description: 'Structured data payloads (JSON) driving the Semantic UI',
    keywords: ['artifact', 'data', 'payload', 'result', 'artefakt', 'ergebnis'],
  },
  {
    logicalName: 'jw_thread',
    displayName: 'Thread',
    pluralName: 'jw_threads',
    primaryKey: 'jw_threadid',
    description: 'Chat conversation threads linked to agents',
    keywords: ['thread', 'chat', 'conversation', 'gespräch', 'konversation'],
  },
  {
    logicalName: 'jw_message',
    displayName: 'Message',
    pluralName: 'jw_messages',
    primaryKey: 'jw_messageid',
    description: 'Individual messages within a thread (user/assistant/system/tool)',
    keywords: ['message', 'nachricht', 'chat message'],
  },
  {
    logicalName: 'jw_toolexecution',
    displayName: 'Tool Execution',
    pluralName: 'jw_toolexecutions',
    primaryKey: 'jw_toolexecutionid',
    description: 'HitL audit records for tool calls with approval state',
    keywords: ['execution', 'approval', 'hitl', 'genehmigung', 'ausführung'],
  },
  {
    logicalName: 'jw_document',
    displayName: 'Document',
    pluralName: 'jw_documents',
    primaryKey: 'jw_documentid',
    description: 'Uploaded files (PDF, images) linked to cases',
    keywords: ['document', 'file', 'upload', 'pdf', 'dokument', 'datei'],
  },
  {
    logicalName: 'jw_instruction',
    displayName: 'Instruction',
    pluralName: 'jw_instructions',
    primaryKey: 'jw_instructionid',
    description: 'Rules and cheat sheets for agents, tagged for retrieval',
    keywords: ['instruction', 'rule', 'cheatsheet', 'knowledge', 'anweisung', 'wissen'],
  },
  {
    logicalName: 'jw_agenttool',
    displayName: 'Agent-Tool Link',
    pluralName: 'jw_agenttools',
    primaryKey: 'jw_agenttoolid',
    description: 'N:N junction: which tools are assigned to which agents',
    keywords: ['agent tool', 'binding', 'junction', 'link', 'zuordnung'],
  },
  {
    logicalName: 'jw_threadcase',
    displayName: 'Thread-Case Link',
    pluralName: 'jw_threadcases',
    primaryKey: 'jw_threadcaseid',
    description: 'N:N junction: which threads belong to which cases',
    keywords: ['thread case', 'junction', 'link'],
  },
];

// ─── MCP Tool 1: Search Tables ──────────────────────────────────────────────

export interface McpSearchResultTable extends McpTableInfo {
  /** Number of custom columns in the schema */
  columnCount: number;
  /** Summary of relationships (lookups) */
  relationships: string[];
}

export interface McpSearchResult {
  tables: McpSearchResultTable[];
  matchedKeywords: string[];
  /** Total tables available in the registry */
  totalTablesAvailable: number;
}

/**
 * Search for Dataverse tables matching a user intent.
 * Returns whitelisted tables whose keywords match the intent string.
 */
export function searchDataverseTables(intent: string): McpSearchResult {
  const normalizedIntent = intent.toLowerCase();
  const words = normalizedIntent.split(/\s+/);

  const matched: { table: McpTableInfo; score: number; keywords: string[] }[] = [];

  for (const table of TABLE_REGISTRY) {
    const matchedKeywords: string[] = [];
    let score = 0;

    for (const keyword of table.keywords) {
      if (normalizedIntent.includes(keyword)) {
        matchedKeywords.push(keyword);
        score += keyword.length; // longer matches = more specific
      }
    }

    // Also check logical name and display name
    if (normalizedIntent.includes(table.logicalName)) {
      matchedKeywords.push(table.logicalName);
      score += 10;
    }
    if (normalizedIntent.includes(table.displayName.toLowerCase())) {
      matchedKeywords.push(table.displayName);
      score += 8;
    }

    // Word-level matching for partial hits
    for (const word of words) {
      if (word.length < 3) continue;
      for (const keyword of table.keywords) {
        if (keyword.includes(word) && !matchedKeywords.includes(keyword)) {
          matchedKeywords.push(keyword);
          score += 2;
        }
      }
    }

    if (score > 0) {
      matched.push({ table, score, keywords: matchedKeywords });
    }
  }

  matched.sort((a, b) => b.score - a.score);

  return {
    tables: matched.map((m) => {
      const schema = STATIC_SCHEMAS[m.table.logicalName];
      const lookups = schema?.filter(c => c.isLookup) ?? [];
      return {
        ...m.table,
        columnCount: schema?.length ?? 0,
        relationships: lookups.map(l => `${l.logicalName} → ${l.lookupTarget}`),
      };
    }),
    matchedKeywords: [...new Set(matched.flatMap((m) => m.keywords))],
    totalTablesAvailable: TABLE_REGISTRY.length,
  };
}

// ─── MCP Tool 2: Get Table Schema ──────────────────────────────────────────

export interface McpColumnInfo {
  logicalName: string;
  type: string;
  description?: string;
  isLookup?: boolean;
  lookupTarget?: string;
  required?: boolean;
  /** For Choice/Enum fields: the possible values */
  choices?: Record<number, string>;
}

export interface McpTableSchema {
  logicalName: string;
  displayName: string;
  pluralName: string;
  primaryKey: string;
  columns: McpColumnInfo[];
}

/**
 * Get a minified schema for a Dataverse table.
 * Uses the getMetadata SDK call when available, falls back to static definitions.
 */
export async function getTableSchema(
  logicalName: string,
  getMetadataFn?: () => Promise<IOperationResult<unknown>>
): Promise<McpTableSchema | null> {
  const tableInfo = TABLE_REGISTRY.find((t) => t.logicalName === logicalName);
  if (!tableInfo) return null;

  // If a metadata function is provided, try to fetch live schema
  if (getMetadataFn) {
    try {
      const result = await tracedOperation(
        `MCP.getTableSchema(${logicalName})`,
        'dataverse',
        { logicalName },
        getMetadataFn
      );
      if (result.data) {
        return {
          logicalName: tableInfo.logicalName,
          displayName: tableInfo.displayName,
          pluralName: tableInfo.pluralName,
          primaryKey: tableInfo.primaryKey,
          columns: extractColumnsFromMetadata(result.data),
        };
      }
    } catch {
      // Fall through to static schema
    }
  }

  // Fallback: return static schema from the Data Model Blueprint
  const staticSchema = STATIC_SCHEMAS[logicalName];
  return {
    logicalName: tableInfo.logicalName,
    displayName: tableInfo.displayName,
    pluralName: tableInfo.pluralName,
    primaryKey: tableInfo.primaryKey,
    columns: staticSchema ?? [],
  };
}

function extractColumnsFromMetadata(metadata: unknown): McpColumnInfo[] {
  if (!metadata || typeof metadata !== 'object') return [];
  const obj = metadata as Record<string, unknown>;

  // Try to extract from Attributes array (common Dataverse metadata shape)
  const attrs = (obj.Attributes ?? obj.attributes ?? obj.Properties) as unknown[] | undefined;
  if (!Array.isArray(attrs)) return [];

  return attrs.slice(0, 50).map((attr) => {
    const a = attr as Record<string, unknown>;
    return {
      logicalName: String(a.LogicalName ?? a.logicalName ?? a.name ?? ''),
      type: String(a.AttributeType ?? a.type ?? a.dataType ?? 'unknown'),
      description: a.Description ? String(a.Description) : undefined,
    };
  });
}

// ─── MCP Tool 3: Execute Dataverse Query ────────────────────────────────────

export interface McpQueryResult {
  records: Record<string, unknown>[];
  totalCount?: number;
  truncated: boolean;
}

const MCP_QUERY_MAX_RECORDS = 50;

/**
 * Execute a read-only OData query against Dataverse via the SDK.
 * NOTE: FetchXML is the architecture target, but for MVP we use OData $filter.
 * The generated services support getAll with IGetAllOptions which includes
 * $top, $filter, $select, $orderby, and $expand.
 *
 * Security: This is READ-ONLY. All write operations must go through HitL.
 */
export async function executeDataverseQuery(
  tablePluralName: string,
  options: {
    select?: string[];
    filter?: string;
    top?: number;
    orderBy?: string;
    expand?: string;
  },
  getAllFn: (opts: unknown) => Promise<IOperationResult<unknown[]>>
): Promise<McpQueryResult> {
  const top = Math.min(options.top ?? MCP_QUERY_MAX_RECORDS, MCP_QUERY_MAX_RECORDS);

  const queryOptions: Record<string, unknown> = {};
  if (options.select?.length) queryOptions.$select = options.select.join(',');
  if (options.filter) queryOptions.$filter = options.filter;
  if (options.orderBy) queryOptions.$orderby = options.orderBy;
  if (options.expand) queryOptions.$expand = options.expand;
  queryOptions.$top = top;

  const result = await tracedOperation(
    `MCP.query(${tablePluralName})`,
    'dataverse',
    { tablePluralName, options: queryOptions },
    () => getAllFn(queryOptions)
  );

  const records = Array.isArray(result.data) ? result.data : [];

  return {
    records: records.slice(0, top) as Record<string, unknown>[],
    totalCount: records.length,
    truncated: records.length > top,
  };
}

// ─── Static Schemas (verified against src/generated/models/) ─────────────────
// Enriched with all writable fields, choice values, lookups, and descriptions.
// RULE: Always verify against generated *Base interface before adding fields.

const STATIC_SCHEMAS: Record<string, McpColumnInfo[]> = {
  jw_agent: [
    { logicalName: 'jw_name', type: 'String', description: 'Display name', required: true },
    { logicalName: 'jw_systemprompt', type: 'Memo', description: 'Base system prompt (instructions for the LLM)' },
    { logicalName: 'jw_modelconfig', type: 'Memo', description: 'JSON: LLM parameters (temperature, max_completion_tokens, tool_choice)' },
    { logicalName: 'jw_allowmcp', type: 'Boolean', description: 'Enable MCP discovery tools (search/schema/query)', choices: { 0: 'No', 1: 'Yes' } },
    { logicalName: 'statecode', type: 'Choice', description: 'Record state', choices: { 0: 'Active', 1: 'Inactive' } },
  ],
  jw_tool: [
    { logicalName: 'jw_name', type: 'String', description: 'Function name the LLM calls (e.g. search_dataverse)', required: true },
    { logicalName: 'jw_description', type: 'Memo', description: 'When and how the LLM should use this tool' },
    { logicalName: 'jw_inputschema', type: 'Memo', description: 'JSON Schema defining the tool parameters' },
    { logicalName: 'jw_requiresapproval', type: 'Boolean', description: 'Human-in-the-Loop: pause for user approval before execution', choices: { 0: 'No', 1: 'Yes' } },
    { logicalName: 'jw_endpointtype', type: 'Choice', description: 'How the tool is executed', choices: { 100000000: 'CloudFlow', 100000001: 'CustomConnector', 100000002: 'InternalReact' } },
    { logicalName: 'jw_executiontarget', type: 'String', description: 'Flow URL or connector endpoint (empty for InternalReact)' },
    { logicalName: 'statecode', type: 'Choice', description: 'Record state', choices: { 0: 'Active', 1: 'Inactive' } },
  ],
  jw_playbook: [
    { logicalName: 'jw_name', type: 'String', description: 'Playbook/process name', required: true },
    { logicalName: 'jw_description', type: 'Memo', description: 'What this playbook does, when to use it' },
    { logicalName: 'statecode', type: 'Choice', description: 'Record state', choices: { 0: 'Active', 1: 'Inactive' } },
  ],
  jw_instruction: [
    { logicalName: 'jw_name', type: 'String', description: 'Instruction title / identifier' },
    { logicalName: 'jw_content', type: 'Memo', description: 'Knowledge content (markdown supported)' },
    { logicalName: 'jw_type', type: 'String', description: 'Instruction type: Rule or CheatSheet' },
    { logicalName: 'jw_tags', type: 'String', description: 'Comma-separated search tags for retrieval' },
    { logicalName: 'jw_playbookid', type: 'Lookup', isLookup: true, lookupTarget: 'jw_playbook', description: 'Parent playbook' },
    { logicalName: 'statecode', type: 'Choice', description: 'Record state', choices: { 0: 'Active', 1: 'Inactive' } },
  ],
  jw_case: [
    { logicalName: 'jw_title', type: 'String', description: 'Case title / identifier', required: true },
    { logicalName: 'jw_contextdata', type: 'Memo', description: 'JSON: case variables and accumulated state' },
    { logicalName: 'jw_status', type: 'String', description: 'Case lifecycle status' },
    { logicalName: 'jw_playbookid', type: 'Lookup', isLookup: true, lookupTarget: 'jw_playbook', description: 'Playbook this case follows' },
    { logicalName: 'statecode', type: 'Choice', description: 'Record state', choices: { 0: 'Active', 1: 'Inactive' } },
  ],
  jw_artifact: [
    { logicalName: 'jw_type', type: 'String', description: 'Semantic UI type key (chart, table, document, etc.)', required: true },
    { logicalName: 'jw_name', type: 'String', description: 'Display name' },
    { logicalName: 'jw_payload', type: 'Memo', description: 'JSON payload (max 1MB) — data for SemanticRenderer' },
    { logicalName: 'jw_referencekey', type: 'String', description: 'External reference key for querying' },
    { logicalName: 'jw_caseid', type: 'Lookup', isLookup: true, lookupTarget: 'jw_case', description: 'Optional: linked case' },
    { logicalName: 'jw_parentartifactid', type: 'Lookup', isLookup: true, lookupTarget: 'jw_artifact', description: 'Optional: parent artifact (versioning)' },
    { logicalName: 'statecode', type: 'Choice', description: 'Record state', choices: { 0: 'Active', 1: 'Inactive' } },
  ],
  jw_thread: [
    { logicalName: 'jw_title', type: 'String', description: 'Thread title' },
    { logicalName: 'jw_agentid', type: 'Lookup', isLookup: true, lookupTarget: 'jw_agent', description: 'Agent handling this thread', required: true },
    { logicalName: 'jw_parentthreadid', type: 'Lookup', isLookup: true, lookupTarget: 'jw_thread', description: 'Parent thread (for sub-agent threads)' },
    { logicalName: 'jw_status', type: 'Choice', description: 'Thread lifecycle', choices: { 100000000: 'Active', 100000001: 'Completed', 100000002: 'Cancelled' } },
    { logicalName: 'statecode', type: 'Choice', description: 'Record state', choices: { 0: 'Active', 1: 'Inactive' } },
  ],
  jw_message: [
    { logicalName: 'jw_role', type: 'String', description: 'Message role: user, assistant, system, or tool', required: true },
    { logicalName: 'jw_content', type: 'Memo', description: 'Message text content' },
    { logicalName: 'jw_threadid', type: 'Lookup', isLookup: true, lookupTarget: 'jw_thread', description: 'Parent thread', required: true },
    { logicalName: 'jw_toolcalls', type: 'Memo', description: 'JSON: array of tool_calls from LLM response' },
    { logicalName: 'jw_tokenprompt', type: 'WholeNumber', description: 'Prompt tokens used (stored as string)' },
    { logicalName: 'jw_tokencompletion', type: 'WholeNumber', description: 'Completion tokens used (stored as string)' },
    { logicalName: 'jw_name', type: 'String', description: 'Optional message label' },
    { logicalName: 'statecode', type: 'Choice', description: 'Record state', choices: { 0: 'Active', 1: 'Inactive' } },
  ],
  jw_toolexecution: [
    { logicalName: 'jw_callid', type: 'String', description: 'LLM-generated tool_call_id for correlation' },
    { logicalName: 'jw_requestpayload', type: 'Memo', description: 'JSON: arguments the LLM passed to the tool' },
    { logicalName: 'jw_responsepayload', type: 'Memo', description: 'JSON: execution result returned to the LLM' },
    { logicalName: 'jw_approvalstate', type: 'Choice', description: 'HitL approval lifecycle', choices: { 100000000: 'Pending', 100000001: 'Approved', 100000002: 'Rejected', 100000003: 'AutoExecuted' } },
    { logicalName: 'jw_messageid', type: 'Lookup', isLookup: true, lookupTarget: 'jw_message', description: 'Message that triggered this execution', required: true },
    { logicalName: 'jw_toolid', type: 'Lookup', isLookup: true, lookupTarget: 'jw_tool', description: 'Tool that was executed', required: true },
    { logicalName: 'statecode', type: 'Choice', description: 'Record state', choices: { 0: 'Active', 1: 'Inactive' } },
  ],
  jw_document: [
    { logicalName: 'jw_name', type: 'String', description: 'Document name / filename' },
    { logicalName: 'jw_mimetype', type: 'String', description: 'MIME type (e.g. application/pdf)' },
    { logicalName: 'jw_caseid', type: 'Lookup', isLookup: true, lookupTarget: 'jw_case', description: 'Linked case', required: true },
    { logicalName: 'statecode', type: 'Choice', description: 'Record state', choices: { 0: 'Active', 1: 'Inactive' } },
  ],
  jw_agenttool: [
    { logicalName: 'jw_name', type: 'String', description: 'Junction record label' },
    { logicalName: 'jw_data', type: 'Memo', description: 'Optional: agent-specific tool config overrides' },
    { logicalName: 'jw_agentid', type: 'Lookup', isLookup: true, lookupTarget: 'jw_agent', description: 'Agent', required: true },
    { logicalName: 'jw_toolid', type: 'Lookup', isLookup: true, lookupTarget: 'jw_tool', description: 'Tool', required: true },
    { logicalName: 'statecode', type: 'Choice', description: 'Record state', choices: { 0: 'Active', 1: 'Inactive' } },
  ],
  jw_threadcase: [
    { logicalName: 'jw_name', type: 'String', description: 'Junction record label' },
    { logicalName: 'jw_data', type: 'Memo', description: 'Optional: thread-case context data' },
    { logicalName: 'jw_threadid', type: 'Lookup', isLookup: true, lookupTarget: 'jw_thread', description: 'Thread', required: true },
    { logicalName: 'jw_caseid', type: 'Lookup', isLookup: true, lookupTarget: 'jw_case', description: 'Case', required: true },
    { logicalName: 'statecode', type: 'Choice', description: 'Record state', choices: { 0: 'Active', 1: 'Inactive' } },
  ],
};
