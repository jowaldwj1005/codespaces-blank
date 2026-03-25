/**
 * Dataverse Service - Domain-friendly CRUD helpers wrapping generated services.
 * All Dataverse operations go through traced wrappers for debug visibility.
 */

import { SystemusersService } from '../generated/services/SystemusersService';
import { TeamsService } from '../generated/services/TeamsService';
import { BusinessunitsService } from '../generated/services/BusinessunitsService';
import { Jw_agentsService } from '../generated/services/Jw_agentsService';
import { Jw_toolsService } from '../generated/services/Jw_toolsService';
import { Jw_playbooksService } from '../generated/services/Jw_playbooksService';
import { Jw_instructionsService } from '../generated/services/Jw_instructionsService';
import { Jw_agenttoolsService } from '../generated/services/Jw_agenttoolsService';
import { Jw_casesService } from '../generated/services/Jw_casesService';
import { Jw_artifactsService } from '../generated/services/Jw_artifactsService';
import { Jw_documentsService } from '../generated/services/Jw_documentsService';
import { Jw_threadcasesService } from '../generated/services/Jw_threadcasesService';
import { Jw_threadsService } from '../generated/services/Jw_threadsService';
import { Jw_messagesService } from '../generated/services/Jw_messagesService';
import { Jw_toolexecutionsService } from '../generated/services/Jw_toolexecutionsService';
import type { Systemusers, SystemusersBase } from '../generated/models/SystemusersModel';
import type { Teams, TeamsBase } from '../generated/models/TeamsModel';
import type { Businessunits } from '../generated/models/BusinessunitsModel';
import type { Jw_agents, Jw_agentsBase } from '../generated/models/Jw_agentsModel';
import type { Jw_tools, Jw_toolsBase } from '../generated/models/Jw_toolsModel';
import type { Jw_playbooks, Jw_playbooksBase } from '../generated/models/Jw_playbooksModel';
import type { Jw_instructions, Jw_instructionsBase } from '../generated/models/Jw_instructionsModel';
import type { Jw_agenttools, Jw_agenttoolsBase } from '../generated/models/Jw_agenttoolsModel';
import type { Jw_cases, Jw_casesBase } from '../generated/models/Jw_casesModel';
import type { Jw_artifacts, Jw_artifactsBase } from '../generated/models/Jw_artifactsModel';
import type { Jw_documents, Jw_documentsBase } from '../generated/models/Jw_documentsModel';
import type { Jw_threadcases, Jw_threadcasesBase } from '../generated/models/Jw_threadcasesModel';
import type { Jw_threads, Jw_threadsBase } from '../generated/models/Jw_threadsModel';
import type { Jw_messages, Jw_messagesBase } from '../generated/models/Jw_messagesModel';
import type { Jw_toolexecutions, Jw_toolexecutionsBase } from '../generated/models/Jw_toolexecutionsModel';
import { tracedOperation, tracedVoidOperation, lookupBind, escapeOData } from './sdk';
import type { IGetAllOptions, IGetOptions } from './sdk';

// ─── Systemusers ─────────────────────────────────────────────────────────────

export const systemusers = {
  getAll: (options?: IGetAllOptions) =>
    tracedOperation<Systemusers[]>(
      'Systemusers.getAll',
      'dataverse',
      { options },
      () => SystemusersService.getAll(options)
    ),

  get: (id: string, options?: IGetOptions) =>
    tracedOperation<Systemusers>(
      'Systemusers.get',
      'dataverse',
      { id, options },
      () => SystemusersService.get(id, options)
    ),

  create: (record: Omit<SystemusersBase, 'address1_addressid'>) =>
    tracedOperation<Systemusers>(
      'Systemusers.create',
      'dataverse',
      { record },
      () => SystemusersService.create(record)
    ),

  update: (id: string, fields: Partial<Omit<SystemusersBase, 'address1_addressid'>>) =>
    tracedOperation<Systemusers>(
      'Systemusers.update',
      'dataverse',
      { id, fields },
      () => SystemusersService.update(id, fields)
    ),

  delete: (id: string) =>
    tracedVoidOperation(
      'Systemusers.delete',
      'dataverse',
      { id },
      () => SystemusersService.delete(id)
    ),

  getMetadata: () =>
    tracedOperation(
      'Systemusers.getMetadata',
      'dataverse',
      {},
      () => SystemusersService.getMetadata()
    ),
};

// ─── Teams ───────────────────────────────────────────────────────────────────

export const teams = {
  getAll: (options?: IGetAllOptions) =>
    tracedOperation<Teams[]>(
      'Teams.getAll',
      'dataverse',
      { options },
      () => TeamsService.getAll(options)
    ),

  get: (id: string, options?: IGetOptions) =>
    tracedOperation<Teams>(
      'Teams.get',
      'dataverse',
      { id, options },
      () => TeamsService.get(id, options)
    ),

  create: (record: Omit<TeamsBase, 'teamid'>) =>
    tracedOperation<Teams>(
      'Teams.create',
      'dataverse',
      { record },
      () => TeamsService.create(record)
    ),

  update: (id: string, fields: Partial<Omit<TeamsBase, 'teamid'>>) =>
    tracedOperation<Teams>(
      'Teams.update',
      'dataverse',
      { id, fields },
      () => TeamsService.update(id, fields)
    ),

  delete: (id: string) =>
    tracedVoidOperation(
      'Teams.delete',
      'dataverse',
      { id },
      () => TeamsService.delete(id)
    ),

  getMetadata: () =>
    tracedOperation(
      'Teams.getMetadata',
      'dataverse',
      {},
      () => TeamsService.getMetadata()
    ),
};

// ─── Business Units ──────────────────────────────────────────────────────────

export const businessunits = {
  getAll: (options?: IGetAllOptions) =>
    tracedOperation<Businessunits[]>(
      'Businessunits.getAll',
      'dataverse',
      { options },
      () => BusinessunitsService.getAll(options)
    ),

  get: (id: string, options?: IGetOptions) =>
    tracedOperation<Businessunits>(
      'Businessunits.get',
      'dataverse',
      { id, options },
      () => BusinessunitsService.get(id, options)
    ),

  getMetadata: () =>
    tracedOperation(
      'Businessunits.getMetadata',
      'dataverse',
      {},
      () => BusinessunitsService.getMetadata()
    ),
};

// ─── Agents ──────────────────────────────────────────────────────────────────

export const jwAgents = {
  getAll: (options?: IGetAllOptions) =>
    tracedOperation<Jw_agents[]>(
      'JwAgents.getAll',
      'dataverse',
      { options },
      () => Jw_agentsService.getAll(options)
    ),

  get: (id: string, options?: IGetOptions) =>
    tracedOperation<Jw_agents>(
      'JwAgents.get',
      'dataverse',
      { id, options },
      () => Jw_agentsService.get(id, options)
    ),

  create: (record: Omit<Jw_agentsBase, 'jw_agentid'>) =>
    tracedOperation<Jw_agents>(
      'JwAgents.create',
      'dataverse',
      { record },
      () => Jw_agentsService.create(record)
    ),

  update: (id: string, fields: Partial<Omit<Jw_agentsBase, 'jw_agentid'>>) =>
    tracedOperation<Jw_agents>(
      'JwAgents.update',
      'dataverse',
      { id, fields },
      () => Jw_agentsService.update(id, fields)
    ),

  delete: (id: string) =>
    tracedVoidOperation(
      'JwAgents.delete',
      'dataverse',
      { id },
      () => Jw_agentsService.delete(id)
    ),
};

// ─── Tools ───────────────────────────────────────────────────────────────────

export const jwTools = {
  getAll: (options?: IGetAllOptions) =>
    tracedOperation<Jw_tools[]>(
      'JwTools.getAll',
      'dataverse',
      { options },
      () => Jw_toolsService.getAll(options)
    ),

  get: (id: string, options?: IGetOptions) =>
    tracedOperation<Jw_tools>(
      'JwTools.get',
      'dataverse',
      { id, options },
      () => Jw_toolsService.get(id, options)
    ),

  create: (record: Omit<Jw_toolsBase, 'jw_toolid'>) =>
    tracedOperation<Jw_tools>(
      'JwTools.create',
      'dataverse',
      { record },
      () => Jw_toolsService.create(record)
    ),

  update: (id: string, fields: Partial<Omit<Jw_toolsBase, 'jw_toolid'>>) =>
    tracedOperation<Jw_tools>(
      'JwTools.update',
      'dataverse',
      { id, fields },
      () => Jw_toolsService.update(id, fields)
    ),

  delete: (id: string) =>
    tracedVoidOperation(
      'JwTools.delete',
      'dataverse',
      { id },
      () => Jw_toolsService.delete(id)
    ),
};

// ─── Playbooks ───────────────────────────────────────────────────────────────

export const jwPlaybooks = {
  getAll: (options?: IGetAllOptions) =>
    tracedOperation<Jw_playbooks[]>(
      'JwPlaybooks.getAll',
      'dataverse',
      { options },
      () => Jw_playbooksService.getAll(options)
    ),

  get: (id: string, options?: IGetOptions) =>
    tracedOperation<Jw_playbooks>(
      'JwPlaybooks.get',
      'dataverse',
      { id, options },
      () => Jw_playbooksService.get(id, options)
    ),

  create: (record: Omit<Jw_playbooksBase, 'jw_playbookid'>) =>
    tracedOperation<Jw_playbooks>(
      'JwPlaybooks.create',
      'dataverse',
      { record },
      () => Jw_playbooksService.create(record)
    ),

  update: (id: string, fields: Partial<Omit<Jw_playbooksBase, 'jw_playbookid'>>) =>
    tracedOperation<Jw_playbooks>(
      'JwPlaybooks.update',
      'dataverse',
      { id, fields },
      () => Jw_playbooksService.update(id, fields)
    ),

  delete: (id: string) =>
    tracedVoidOperation(
      'JwPlaybooks.delete',
      'dataverse',
      { id },
      () => Jw_playbooksService.delete(id)
    ),
};

// ─── Instructions ────────────────────────────────────────────────────────────

export const jwInstructions = {
  getAll: (options?: IGetAllOptions) =>
    tracedOperation<Jw_instructions[]>(
      'JwInstructions.getAll',
      'dataverse',
      { options },
      () => Jw_instructionsService.getAll(options)
    ),

  get: (id: string, options?: IGetOptions) =>
    tracedOperation<Jw_instructions>(
      'JwInstructions.get',
      'dataverse',
      { id, options },
      () => Jw_instructionsService.get(id, options)
    ),

  create: (record: Omit<Jw_instructionsBase, 'jw_instructionid'>) =>
    tracedOperation<Jw_instructions>(
      'JwInstructions.create',
      'dataverse',
      { record },
      () => Jw_instructionsService.create(record)
    ),

  update: (id: string, fields: Partial<Omit<Jw_instructionsBase, 'jw_instructionid'>>) =>
    tracedOperation<Jw_instructions>(
      'JwInstructions.update',
      'dataverse',
      { id, fields },
      () => Jw_instructionsService.update(id, fields)
    ),

  delete: (id: string) =>
    tracedVoidOperation(
      'JwInstructions.delete',
      'dataverse',
      { id },
      () => Jw_instructionsService.delete(id)
    ),
};

// ─── Agent-Tool Junction (N:N) ───────────────────────────────────────────────

export const jwAgentTools = {
  getAll: (options?: IGetAllOptions) =>
    tracedOperation<Jw_agenttools[]>(
      'JwAgentTools.getAll',
      'dataverse',
      { options },
      () => Jw_agenttoolsService.getAll(options)
    ),

  get: (id: string, options?: IGetOptions) =>
    tracedOperation<Jw_agenttools>(
      'JwAgentTools.get',
      'dataverse',
      { id, options },
      () => Jw_agenttoolsService.get(id, options)
    ),

  create: (record: Omit<Jw_agenttoolsBase, 'jw_agenttoolid'>) =>
    tracedOperation<Jw_agenttools>(
      'JwAgentTools.create',
      'dataverse',
      { record },
      () => Jw_agenttoolsService.create(record)
    ),

  update: (id: string, fields: Partial<Omit<Jw_agenttoolsBase, 'jw_agenttoolid'>>) =>
    tracedOperation<Jw_agenttools>(
      'JwAgentTools.update',
      'dataverse',
      { id, fields },
      () => Jw_agenttoolsService.update(id, fields)
    ),

  delete: (id: string) =>
    tracedVoidOperation(
      'JwAgentTools.delete',
      'dataverse',
      { id },
      () => Jw_agenttoolsService.delete(id)
    ),
};

// ─── Cases ───────────────────────────────────────────────────────────────────

export const jwCases = {
  getAll: (options?: IGetAllOptions) =>
    tracedOperation<Jw_cases[]>(
      'JwCases.getAll',
      'dataverse',
      { options },
      () => Jw_casesService.getAll(options)
    ),

  get: (id: string, options?: IGetOptions) =>
    tracedOperation<Jw_cases>(
      'JwCases.get',
      'dataverse',
      { id, options },
      () => Jw_casesService.get(id, options)
    ),

  create: (record: Omit<Jw_casesBase, 'jw_caseid'>) =>
    tracedOperation<Jw_cases>(
      'JwCases.create',
      'dataverse',
      { record },
      () => Jw_casesService.create(record)
    ),

  update: (id: string, fields: Partial<Omit<Jw_casesBase, 'jw_caseid'>>) =>
    tracedOperation<Jw_cases>(
      'JwCases.update',
      'dataverse',
      { id, fields },
      () => Jw_casesService.update(id, fields)
    ),

  delete: (id: string) =>
    tracedVoidOperation(
      'JwCases.delete',
      'dataverse',
      { id },
      () => Jw_casesService.delete(id)
    ),
};

// ─── Artifacts ───────────────────────────────────────────────────────────────

export const jwArtifacts = {
  getAll: (options?: IGetAllOptions) =>
    tracedOperation<Jw_artifacts[]>(
      'JwArtifacts.getAll',
      'dataverse',
      { options },
      () => Jw_artifactsService.getAll(options)
    ),

  get: (id: string, options?: IGetOptions) =>
    tracedOperation<Jw_artifacts>(
      'JwArtifacts.get',
      'dataverse',
      { id, options },
      () => Jw_artifactsService.get(id, options)
    ),

  create: (record: Omit<Jw_artifactsBase, 'jw_artifactid'>) =>
    tracedOperation<Jw_artifacts>(
      'JwArtifacts.create',
      'dataverse',
      { record },
      () => Jw_artifactsService.create(record)
    ),

  update: (id: string, fields: Partial<Omit<Jw_artifactsBase, 'jw_artifactid'>>) =>
    tracedOperation<Jw_artifacts>(
      'JwArtifacts.update',
      'dataverse',
      { id, fields },
      () => Jw_artifactsService.update(id, fields)
    ),

  delete: (id: string) =>
    tracedVoidOperation(
      'JwArtifacts.delete',
      'dataverse',
      { id },
      () => Jw_artifactsService.delete(id)
    ),
};

// ─── Documents ───────────────────────────────────────────────────────────────

export const jwDocuments = {
  getAll: (options?: IGetAllOptions) =>
    tracedOperation<Jw_documents[]>(
      'JwDocuments.getAll',
      'dataverse',
      { options },
      () => Jw_documentsService.getAll(options)
    ),

  get: (id: string, options?: IGetOptions) =>
    tracedOperation<Jw_documents>(
      'JwDocuments.get',
      'dataverse',
      { id, options },
      () => Jw_documentsService.get(id, options)
    ),

  create: (record: Omit<Jw_documentsBase, 'jw_documentid'>) =>
    tracedOperation<Jw_documents>(
      'JwDocuments.create',
      'dataverse',
      { record },
      () => Jw_documentsService.create(record)
    ),

  update: (id: string, fields: Partial<Omit<Jw_documentsBase, 'jw_documentid'>>) =>
    tracedOperation<Jw_documents>(
      'JwDocuments.update',
      'dataverse',
      { id, fields },
      () => Jw_documentsService.update(id, fields)
    ),

  delete: (id: string) =>
    tracedVoidOperation(
      'JwDocuments.delete',
      'dataverse',
      { id },
      () => Jw_documentsService.delete(id)
    ),
};

// ─── Thread-Case Junction (N:N) ──────────────────────────────────────────────

export const jwThreadCases = {
  getAll: (options?: IGetAllOptions) =>
    tracedOperation<Jw_threadcases[]>(
      'JwThreadCases.getAll',
      'dataverse',
      { options },
      () => Jw_threadcasesService.getAll(options)
    ),

  get: (id: string, options?: IGetOptions) =>
    tracedOperation<Jw_threadcases>(
      'JwThreadCases.get',
      'dataverse',
      { id, options },
      () => Jw_threadcasesService.get(id, options)
    ),

  create: (record: Omit<Jw_threadcasesBase, 'jw_threadcaseid'>) =>
    tracedOperation<Jw_threadcases>(
      'JwThreadCases.create',
      'dataverse',
      { record },
      () => Jw_threadcasesService.create(record)
    ),

  update: (id: string, fields: Partial<Omit<Jw_threadcasesBase, 'jw_threadcaseid'>>) =>
    tracedOperation<Jw_threadcases>(
      'JwThreadCases.update',
      'dataverse',
      { id, fields },
      () => Jw_threadcasesService.update(id, fields)
    ),

  delete: (id: string) =>
    tracedVoidOperation(
      'JwThreadCases.delete',
      'dataverse',
      { id },
      () => Jw_threadcasesService.delete(id)
    ),
};

// ─── Threads ─────────────────────────────────────────────────────────────────

export const jwThreads = {
  getAll: (options?: IGetAllOptions) =>
    tracedOperation<Jw_threads[]>(
      'JwThreads.getAll',
      'dataverse',
      { options },
      () => Jw_threadsService.getAll(options)
    ),

  get: (id: string, options?: IGetOptions) =>
    tracedOperation<Jw_threads>(
      'JwThreads.get',
      'dataverse',
      { id, options },
      () => Jw_threadsService.get(id, options)
    ),

  create: (record: Omit<Jw_threadsBase, 'jw_threadid'>) =>
    tracedOperation<Jw_threads>(
      'JwThreads.create',
      'dataverse',
      { record },
      () => Jw_threadsService.create(record)
    ),

  update: (id: string, fields: Partial<Omit<Jw_threadsBase, 'jw_threadid'>>) =>
    tracedOperation<Jw_threads>(
      'JwThreads.update',
      'dataverse',
      { id, fields },
      () => Jw_threadsService.update(id, fields)
    ),

  delete: (id: string) =>
    tracedVoidOperation(
      'JwThreads.delete',
      'dataverse',
      { id },
      () => Jw_threadsService.delete(id)
    ),
};

// ─── Messages ────────────────────────────────────────────────────────────────

export const jwMessages = {
  getAll: (options?: IGetAllOptions) =>
    tracedOperation<Jw_messages[]>(
      'JwMessages.getAll',
      'dataverse',
      { options },
      () => Jw_messagesService.getAll(options)
    ),

  get: (id: string, options?: IGetOptions) =>
    tracedOperation<Jw_messages>(
      'JwMessages.get',
      'dataverse',
      { id, options },
      () => Jw_messagesService.get(id, options)
    ),

  create: (record: Omit<Jw_messagesBase, 'jw_messageid'>) =>
    tracedOperation<Jw_messages>(
      'JwMessages.create',
      'dataverse',
      { record },
      () => Jw_messagesService.create(record)
    ),

  update: (id: string, fields: Partial<Omit<Jw_messagesBase, 'jw_messageid'>>) =>
    tracedOperation<Jw_messages>(
      'JwMessages.update',
      'dataverse',
      { id, fields },
      () => Jw_messagesService.update(id, fields)
    ),

  delete: (id: string) =>
    tracedVoidOperation(
      'JwMessages.delete',
      'dataverse',
      { id },
      () => Jw_messagesService.delete(id)
    ),
};

// ─── Tool Executions ─────────────────────────────────────────────────────────

export const jwToolExecutions = {
  getAll: (options?: IGetAllOptions) =>
    tracedOperation<Jw_toolexecutions[]>(
      'JwToolExecutions.getAll',
      'dataverse',
      { options },
      () => Jw_toolexecutionsService.getAll(options)
    ),

  get: (id: string, options?: IGetOptions) =>
    tracedOperation<Jw_toolexecutions>(
      'JwToolExecutions.get',
      'dataverse',
      { id, options },
      () => Jw_toolexecutionsService.get(id, options)
    ),

  create: (record: Omit<Jw_toolexecutionsBase, 'jw_toolexecutionid'>) =>
    tracedOperation<Jw_toolexecutions>(
      'JwToolExecutions.create',
      'dataverse',
      { record },
      () => Jw_toolexecutionsService.create(record)
    ),

  update: (id: string, fields: Partial<Omit<Jw_toolexecutionsBase, 'jw_toolexecutionid'>>) =>
    tracedOperation<Jw_toolexecutions>(
      'JwToolExecutions.update',
      'dataverse',
      { id, fields },
      () => Jw_toolexecutionsService.update(id, fields)
    ),

  delete: (id: string) =>
    tracedVoidOperation(
      'JwToolExecutions.delete',
      'dataverse',
      { id },
      () => Jw_toolexecutionsService.delete(id)
    ),
};

// ─── Convenience Helpers ─────────────────────────────────────────────────────

/**
 * Create a team with lookup bindings pre-built.
 * IMPORTANT: Dataverse OData API requires lowercase lookup property names
 * (e.g. businessunitid@odata.bind, NOT BusinessUnitId@odata.bind).
 * The PAC CLI TypeScript interface uses PascalCase, but the actual API rejects it.
 * We cast to bypass the typed interface and send the correct lowercase keys.
 */
export function createTeam(opts: {
  name: string;
  description?: string;
  businessUnitId: string;
  administratorId: string;
  teamType?: 0 | 1 | 2 | 3;
  membershipType?: 0 | 1 | 2 | 3;
}) {
  const record = {
    name: opts.name,
    description: opts.description,
    'businessunitid@odata.bind': lookupBind('businessunits', opts.businessUnitId),
    'administratorid@odata.bind': lookupBind('systemusers', opts.administratorId),
    teamtype: opts.teamType ?? 0,
    membershiptype: opts.membershipType ?? 0,
  };
  return teams.create(record as unknown as Omit<TeamsBase, 'teamid'>);
}

/** Create a thread with agent binding and optional parent thread. */
export function createThread(opts: {
  agentId: string;
  title?: string;
  parentThreadId?: string;
}) {
  const record: Record<string, unknown> = {
    'jw_agentid@odata.bind': lookupBind('jw_agents', opts.agentId),
    jw_title: opts.title,
    jw_status: '100000000', // Active
  };
  if (opts.parentThreadId) {
    record['jw_parentthreadid@odata.bind'] = lookupBind('jw_threads', opts.parentThreadId);
  }
  return jwThreads.create(record as unknown as Omit<Jw_threadsBase, 'jw_threadid'>);
}

/** Create a message in a thread.
 *  For tool-role messages: toolCallId and name are required by OpenAI.
 *  We store tool_call_id in jw_toolcalls (JSON) and tool name in jw_name.
 *  For assistant messages: jw_toolcalls stores the tool_calls array JSON.
 */
export function createMessage(opts: {
  threadId: string;
  role: string;
  content?: string;
  toolCalls?: string;
  toolCallId?: string;
  name?: string;
  tokenPrompt?: number;
  tokenCompletion?: number;
}) {
  let toolCallsValue = opts.toolCalls;
  // For tool-role messages, store tool_call_id in jw_toolcalls as JSON
  if (opts.role === 'tool' && opts.toolCallId) {
    toolCallsValue = JSON.stringify({ tool_call_id: opts.toolCallId });
  }
  const record: Record<string, unknown> = {
    'jw_threadid@odata.bind': lookupBind('jw_threads', opts.threadId),
    jw_role: opts.role,
    jw_content: opts.content,
    jw_toolcalls: toolCallsValue,
    jw_name: opts.name,
    jw_tokenprompt: opts.tokenPrompt,
    jw_tokencompletion: opts.tokenCompletion,
  };
  return jwMessages.create(record as unknown as Omit<Jw_messagesBase, 'jw_messageid'>);
}

/** Get all messages for a thread, ordered by creation date ascending. */
export function getThreadMessages(threadId: string) {
  return jwMessages.getAll({
    filter: `_jw_threadid_value eq '${escapeOData(threadId)}'`,
    orderBy: ['createdon asc'],
  } as IGetAllOptions);
}

/** Get agent with expanded agent-tool junction records. */
export function getAgentWithTools(agentId: string) {
  return jwAgents.get(agentId, {
    expand: 'jw_agent_jw_agenttool($expand=jw_toolid)',
  } as IGetOptions);
}

/** Create an agent-tool junction record. */
export function linkAgentTool(agentId: string, toolId: string) {
  const record: Record<string, unknown> = {
    'jw_agentid@odata.bind': lookupBind('jw_agents', agentId),
    'jw_toolid@odata.bind': lookupBind('jw_tools', toolId),
  };
  return jwAgentTools.create(record as unknown as Omit<Jw_agenttoolsBase, 'jw_agenttoolid'>);
}

/** Create a tool execution record for HitL tracking. */
export function createToolExecution(opts: {
  messageId: string;
  toolId: string;
  callId: string;
  requestPayload: string;
  approvalState: 100000000 | 100000001 | 100000002 | 100000003; // Pending/Approved/Rejected/AutoExecuted
  responsePayload?: string;
}) {
  const record: Record<string, unknown> = {
    'jw_messageid@odata.bind': lookupBind('jw_messages', opts.messageId),
    'jw_toolid@odata.bind': lookupBind('jw_tools', opts.toolId),
    jw_callid: opts.callId,
    jw_requestpayload: opts.requestPayload,
    jw_approvalstate: opts.approvalState,
    jw_responsepayload: opts.responsePayload,
  };
  return jwToolExecutions.create(record as unknown as Omit<Jw_toolexecutionsBase, 'jw_toolexecutionid'>);
}

/** Create an artifact, optionally linked to a case. */
export function createArtifact(opts: {
  type: string;
  name?: string;
  payload?: string;
  referenceKey?: string;
  caseId?: string;
  parentArtifactId?: string;
}) {
  const record: Record<string, unknown> = {
    jw_type: opts.type,
    jw_name: opts.name,
    jw_payload: opts.payload,
    jw_referencekey: opts.referenceKey,
  };
  if (opts.caseId) {
    record['jw_caseid@odata.bind'] = lookupBind('jw_cases', opts.caseId);
  }
  if (opts.parentArtifactId) {
    record['jw_parentartifactid@odata.bind'] = lookupBind('jw_artifacts', opts.parentArtifactId);
  }
  return jwArtifacts.create(record as unknown as Omit<Jw_artifactsBase, 'jw_artifactid'>);
}

// ─── Generic CRUD by Table Name ─────────────────────────────────────────────
// Used by Admin Workspace and AI-assisted creation tools.

interface CrudService {
  getAll: (options?: IGetAllOptions) => Promise<{ data?: unknown[]; success: boolean }>;
  get: (id: string) => Promise<{ data?: unknown; success: boolean }>;
  create: (data: unknown) => Promise<{ data?: unknown; success: boolean }>;
  update: (id: string, data: unknown) => Promise<{ success: boolean }>;
  delete: (id: string) => Promise<{ success: boolean }>;
}

const TABLE_CRUD_MAP: Record<string, CrudService> = {
  jw_agents: jwAgents as unknown as CrudService,
  jw_tools: jwTools as unknown as CrudService,
  jw_playbooks: jwPlaybooks as unknown as CrudService,
  jw_instructions: jwInstructions as unknown as CrudService,
  jw_cases: jwCases as unknown as CrudService,
  jw_artifacts: jwArtifacts as unknown as CrudService,
  jw_threads: jwThreads as unknown as CrudService,
  jw_messages: jwMessages as unknown as CrudService,
  jw_toolexecutions: jwToolExecutions as unknown as CrudService,
  jw_agenttools: jwAgentTools as unknown as CrudService,
  jw_threadcases: jwThreadCases as unknown as CrudService,
  jw_documents: jwDocuments as unknown as CrudService,
};

export function getTableService(pluralName: string): CrudService | undefined {
  return TABLE_CRUD_MAP[pluralName];
}

export { lookupBind, escapeOData };

