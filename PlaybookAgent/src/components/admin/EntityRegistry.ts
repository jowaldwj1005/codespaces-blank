/**
 * EntityRegistry — Schema metadata for all jw_ entities.
 * Drives dynamic form rendering, list columns, and validation.
 * Source of truth: generated models in src/generated/models/
 */

export type FieldType = 'string' | 'memo' | 'boolean' | 'choice' | 'lookup' | 'json' | 'number';

export interface EntityField {
  logicalName: string;
  displayName: string;
  type: FieldType;
  required?: boolean;
  readOnly?: boolean;
  description?: string;
  placeholder?: string;
  choices?: Record<number | string, string>;
  lookupTarget?: {
    table: string;
    pluralName: string;
    displayField: string;
    primaryKey: string;
  };
  monacoLanguage?: string;
  maxLength?: number;
}

export interface EntityDefinition {
  logicalName: string;
  displayName: string;
  displayNamePlural: string;
  pluralApiName: string;
  primaryKey: string;
  nameField: string;
  icon: string;
  color: string;
  layer: 'definition' | 'state' | 'interaction';
  fields: EntityField[];
  listColumns: string[];
}

// ─── Entity Definitions ─────────────────────────────────────────────────────

export const ENTITY_REGISTRY: Record<string, EntityDefinition> = {
  jw_agent: {
    logicalName: 'jw_agent',
    displayName: 'Agent',
    displayNamePlural: 'Agents',
    pluralApiName: 'jw_agents',
    primaryKey: 'jw_agentid',
    nameField: 'jw_name',
    icon: '\u{1F916}',
    color: '#8b5cf6',
    layer: 'definition',
    fields: [
      { logicalName: 'jw_name', displayName: 'Name', type: 'string', required: true, description: 'Agent display name', placeholder: 'e.g. SAP Invoice Agent' },
      { logicalName: 'jw_systemprompt', displayName: 'System Prompt', type: 'memo', description: 'Base instructions for the LLM', monacoLanguage: 'markdown', placeholder: 'You are a helpful agent that...' },
      { logicalName: 'jw_modelconfig', displayName: 'Model Config', type: 'json', description: 'JSON: { temperature, max_completion_tokens, tool_choice }', monacoLanguage: 'json' },
      { logicalName: 'jw_allowmcp', displayName: 'Allow MCP', type: 'boolean', description: 'Auto-append Dataverse MCP tools (search, schema, query)', choices: { 0: 'No', 1: 'Yes' } },
    ],
    listColumns: ['jw_name', 'jw_allowmcp', 'createdon'],
  },

  jw_tool: {
    logicalName: 'jw_tool',
    displayName: 'Tool',
    displayNamePlural: 'Tools',
    pluralApiName: 'jw_tools',
    primaryKey: 'jw_toolid',
    nameField: 'jw_name',
    icon: '\u{1F527}',
    color: '#3b82f6',
    layer: 'definition',
    fields: [
      { logicalName: 'jw_name', displayName: 'Function Name', type: 'string', required: true, description: 'Exact name the LLM calls (e.g. search_dataverse)', placeholder: 'e.g. query_sap_orders' },
      { logicalName: 'jw_description', displayName: 'Description', type: 'memo', description: 'When and how the LLM should use this tool', placeholder: 'Use this tool to...' },
      { logicalName: 'jw_inputschema', displayName: 'Input Schema', type: 'json', description: 'JSON Schema defining tool parameters', monacoLanguage: 'json' },
      { logicalName: 'jw_requiresapproval', displayName: 'Requires Approval', type: 'boolean', description: 'If Yes, triggers Human-in-the-Loop approval gate', choices: { 0: 'No', 1: 'Yes' } },
      { logicalName: 'jw_endpointtype', displayName: 'Endpoint Type', type: 'choice', description: 'How this tool is executed', choices: { 100000000: 'CloudFlow', 100000001: 'CustomConnector', 100000002: 'InternalReact' } },
      { logicalName: 'jw_executiontarget', displayName: 'Execution Target', type: 'string', description: 'Flow ID or connector endpoint', placeholder: 'e.g. flow-guid or connector/action' },
    ],
    listColumns: ['jw_name', 'jw_endpointtype', 'jw_requiresapproval'],
  },

  jw_playbook: {
    logicalName: 'jw_playbook',
    displayName: 'Playbook',
    displayNamePlural: 'Playbooks',
    pluralApiName: 'jw_playbooks',
    primaryKey: 'jw_playbookid',
    nameField: 'jw_name',
    icon: '\u{1F4D6}',
    color: '#10b981',
    layer: 'definition',
    fields: [
      { logicalName: 'jw_name', displayName: 'Name', type: 'string', required: true, description: 'Process name', placeholder: 'e.g. Invoice Processing' },
      { logicalName: 'jw_description', displayName: 'Description', type: 'memo', description: 'Human-readable workflow description', placeholder: 'This playbook defines the workflow for...' },
    ],
    listColumns: ['jw_name', 'createdon'],
  },

  jw_instruction: {
    logicalName: 'jw_instruction',
    displayName: 'Instruction',
    displayNamePlural: 'Instructions',
    pluralApiName: 'jw_instructions',
    primaryKey: 'jw_instructionid',
    nameField: 'jw_name',
    icon: '\u{1F4CB}',
    color: '#f59e0b',
    layer: 'definition',
    fields: [
      { logicalName: 'jw_name', displayName: 'Name', type: 'string', description: 'Short identifier', placeholder: 'e.g. Step 1: Extract Data' },
      { logicalName: 'jw_type', displayName: 'Type', type: 'string', description: 'Rule (immediate inject) or CheatSheet (tool index)', placeholder: 'Rule or CheatSheet' },
      { logicalName: 'jw_tags', displayName: 'Tags', type: 'string', description: 'Comma-separated tags for LLM index', placeholder: 'e.g. sap, invoice, validation' },
      { logicalName: 'jw_content', displayName: 'Content', type: 'memo', description: 'Knowledge markdown', monacoLanguage: 'markdown' },
      {
        logicalName: 'jw_playbookid', displayName: 'Playbook', type: 'lookup', description: 'Parent playbook (null = global instruction)',
        lookupTarget: { table: 'jw_playbook', pluralName: 'jw_playbooks', displayField: 'jw_name', primaryKey: 'jw_playbookid' },
      },
    ],
    listColumns: ['jw_name', 'jw_type', 'jw_tags'],
  },

  jw_case: {
    logicalName: 'jw_case',
    displayName: 'Case',
    displayNamePlural: 'Cases',
    pluralApiName: 'jw_cases',
    primaryKey: 'jw_caseid',
    nameField: 'jw_title',
    icon: '\u{1F4C1}',
    color: '#ef4444',
    layer: 'state',
    fields: [
      { logicalName: 'jw_title', displayName: 'Title', type: 'string', required: true, placeholder: 'e.g. Invoice #4711 Processing' },
      { logicalName: 'jw_status', displayName: 'Status', type: 'string', placeholder: 'e.g. Active, Resolved' },
      { logicalName: 'jw_contextdata', displayName: 'Context Data', type: 'json', description: 'JSON: variables, state', monacoLanguage: 'json' },
      {
        logicalName: 'jw_playbookid', displayName: 'Playbook', type: 'lookup',
        lookupTarget: { table: 'jw_playbook', pluralName: 'jw_playbooks', displayField: 'jw_name', primaryKey: 'jw_playbookid' },
      },
    ],
    listColumns: ['jw_title', 'jw_status', 'createdon'],
  },

  jw_artifact: {
    logicalName: 'jw_artifact',
    displayName: 'Artifact',
    displayNamePlural: 'Artifacts',
    pluralApiName: 'jw_artifacts',
    primaryKey: 'jw_artifactid',
    nameField: 'jw_name',
    icon: '\u{1F4E6}',
    color: '#6366f1',
    layer: 'state',
    fields: [
      { logicalName: 'jw_name', displayName: 'Name', type: 'string', placeholder: 'e.g. SAP Order Payload' },
      { logicalName: 'jw_type', displayName: 'Type', type: 'string', required: true, description: 'Drives SemanticRenderer mapping', placeholder: 'e.g. SapPayload, Chart, Report' },
      { logicalName: 'jw_referencekey', displayName: 'Reference Key', type: 'string', description: 'Fast lookup key' },
      { logicalName: 'jw_payload', displayName: 'Payload', type: 'json', description: 'JSON data rendered by SemanticRenderer', monacoLanguage: 'json' },
      {
        logicalName: 'jw_caseid', displayName: 'Case', type: 'lookup',
        lookupTarget: { table: 'jw_case', pluralName: 'jw_cases', displayField: 'jw_title', primaryKey: 'jw_caseid' },
      },
      {
        logicalName: 'jw_parentartifactid', displayName: 'Parent Artifact', type: 'lookup',
        lookupTarget: { table: 'jw_artifact', pluralName: 'jw_artifacts', displayField: 'jw_name', primaryKey: 'jw_artifactid' },
      },
    ],
    listColumns: ['jw_name', 'jw_type', 'createdon'],
  },

  jw_thread: {
    logicalName: 'jw_thread',
    displayName: 'Thread',
    displayNamePlural: 'Threads',
    pluralApiName: 'jw_threads',
    primaryKey: 'jw_threadid',
    nameField: 'jw_title',
    icon: '\u{1F4AC}',
    color: '#06b6d4',
    layer: 'interaction',
    fields: [
      { logicalName: 'jw_title', displayName: 'Title', type: 'string', placeholder: 'Chat session name' },
      { logicalName: 'jw_status', displayName: 'Status', type: 'choice', choices: { 100000000: 'Active', 100000001: 'Completed', 100000002: 'Cancelled' } },
      {
        logicalName: 'jw_agentid', displayName: 'Agent', type: 'lookup', required: true,
        lookupTarget: { table: 'jw_agent', pluralName: 'jw_agents', displayField: 'jw_name', primaryKey: 'jw_agentid' },
      },
      {
        logicalName: 'jw_parentthreadid', displayName: 'Parent Thread', type: 'lookup',
        lookupTarget: { table: 'jw_thread', pluralName: 'jw_threads', displayField: 'jw_title', primaryKey: 'jw_threadid' },
      },
    ],
    listColumns: ['jw_title', 'jw_status', 'createdon'],
  },

  jw_message: {
    logicalName: 'jw_message',
    displayName: 'Message',
    displayNamePlural: 'Messages',
    pluralApiName: 'jw_messages',
    primaryKey: 'jw_messageid',
    nameField: 'jw_name',
    icon: '\u{1F4E8}',
    color: '#64748b',
    layer: 'interaction',
    fields: [
      { logicalName: 'jw_role', displayName: 'Role', type: 'string', required: true },
      { logicalName: 'jw_content', displayName: 'Content', type: 'memo' },
      { logicalName: 'jw_toolcalls', displayName: 'Tool Calls', type: 'json', monacoLanguage: 'json', readOnly: true },
      { logicalName: 'jw_tokenprompt', displayName: 'Prompt Tokens', type: 'string', readOnly: true },
      { logicalName: 'jw_tokencompletion', displayName: 'Completion Tokens', type: 'string', readOnly: true },
      {
        logicalName: 'jw_threadid', displayName: 'Thread', type: 'lookup', required: true,
        lookupTarget: { table: 'jw_thread', pluralName: 'jw_threads', displayField: 'jw_title', primaryKey: 'jw_threadid' },
      },
    ],
    listColumns: ['jw_role', 'jw_content', 'createdon'],
  },

  jw_toolexecution: {
    logicalName: 'jw_toolexecution',
    displayName: 'Tool Execution',
    displayNamePlural: 'Tool Executions',
    pluralApiName: 'jw_toolexecutions',
    primaryKey: 'jw_toolexecutionid',
    nameField: 'jw_name',
    icon: '\u{26A1}',
    color: '#f97316',
    layer: 'interaction',
    fields: [
      { logicalName: 'jw_callid', displayName: 'Call ID', type: 'string', readOnly: true },
      { logicalName: 'jw_requestpayload', displayName: 'Request', type: 'json', monacoLanguage: 'json', readOnly: true },
      { logicalName: 'jw_responsepayload', displayName: 'Response', type: 'json', monacoLanguage: 'json', readOnly: true },
      { logicalName: 'jw_approvalstate', displayName: 'Approval State', type: 'choice', choices: { 100000000: 'Pending', 100000001: 'Approved', 100000002: 'Rejected', 100000003: 'AutoExecuted' } },
      {
        logicalName: 'jw_messageid', displayName: 'Message', type: 'lookup', required: true,
        lookupTarget: { table: 'jw_message', pluralName: 'jw_messages', displayField: 'jw_name', primaryKey: 'jw_messageid' },
      },
      {
        logicalName: 'jw_toolid', displayName: 'Tool', type: 'lookup', required: true,
        lookupTarget: { table: 'jw_tool', pluralName: 'jw_tools', displayField: 'jw_name', primaryKey: 'jw_toolid' },
      },
    ],
    listColumns: ['jw_callid', 'jw_approvalstate', 'createdon'],
  },
};

/** Get entity definition by logical name or plural API name. */
export function getEntityDef(nameOrPlural: string): EntityDefinition | undefined {
  return ENTITY_REGISTRY[nameOrPlural] ??
    Object.values(ENTITY_REGISTRY).find(e => e.pluralApiName === nameOrPlural);
}

/** All entity definitions as array, sorted by layer then name. */
export function getAllEntities(): EntityDefinition[] {
  const layerOrder = { definition: 0, state: 1, interaction: 2 };
  return Object.values(ENTITY_REGISTRY).sort((a, b) =>
    layerOrder[a.layer] - layerOrder[b.layer] || a.displayName.localeCompare(b.displayName)
  );
}

/** Admin-visible entities (the ones users typically manage). */
export const ADMIN_ENTITIES = [
  'jw_agent', 'jw_tool', 'jw_playbook', 'jw_instruction',
  'jw_case', 'jw_artifact',
] as const;

/** Build OData lookup bind value from entity definition + id. */
export function buildLookupBind(field: EntityField, id: string): string {
  if (!field.lookupTarget) throw new Error(`${field.logicalName} is not a lookup field`);
  return `/${field.lookupTarget.pluralName}(${id})`;
}
