/**
 * Connector Wrappers - Normalized access to all custom connectors.
 * Each connector gets a normalizer that handles the variable response wrapping
 * patterns (body, data, result, raw.success.data) and emits debug events.
 */

import { CustCon_AzureOpenAI_ResponsesService } from '../generated/services/CustCon_AzureOpenAI_ResponsesService';
import { CustCon_AzureDocIntService } from '../generated/services/CustCon_AzureDocIntService';
import { CustCon_SAP_OdataService } from '../generated/services/CustCon_SAP_OdataService';
import { tracedOperation } from './sdk';
import type { IOperationResult } from '@microsoft/power-apps/data';

// ─── Response Normalization ──────────────────────────────────────────────────

/**
 * Connectors wrap responses differently. This helper unwraps common patterns
 * to extract the actual payload. Returns the most deeply nested data found.
 */
export function normalizeConnectorResponse(raw: unknown): unknown {
  if (raw == null) return null;

  // Handle string responses — connectors may return raw JSON strings
  if (typeof raw === 'string') {
    try { return JSON.parse(raw); } catch { return raw; }
  }
  if (typeof raw !== 'object') return raw;

  const obj = raw as Record<string, unknown>;

  // Try common wrapper keys in order of specificity
  if (obj.raw && typeof obj.raw === 'object') {
    const rawObj = obj.raw as Record<string, unknown>;
    if (rawObj.success && typeof rawObj.success === 'object') {
      const successObj = rawObj.success as Record<string, unknown>;
      if (successObj.data !== undefined) return tryParseJson(successObj.data);
    }
    if (rawObj.data !== undefined) return tryParseJson(rawObj.data);
  }
  if (obj.result !== undefined) return tryParseJson(obj.result);
  if (obj.data !== undefined) return tryParseJson(obj.data);
  if (obj.body !== undefined) return tryParseJson(obj.body);

  return raw;
}

/** If value is a JSON string, parse it. Otherwise return as-is. */
function tryParseJson(value: unknown): unknown {
  if (typeof value === 'string') {
    try { return JSON.parse(value); } catch { return value; }
  }
  return value;
}

/**
 * Extract Operation-Location header or resultId from a Doc Intelligence response.
 * The async pattern returns an Operation-Location URL containing the result ID.
 */
function extractOperationId(raw: unknown): string | null {
  if (raw == null || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;

  // Check headers for Operation-Location
  const headers = (obj.headers ?? obj.Headers) as Record<string, unknown> | undefined;
  if (headers) {
    const opLoc = (headers['Operation-Location'] ?? headers['operation-location']) as string | undefined;
    if (opLoc) {
      // Extract last path segment as resultId: .../analyzeResults/<id>?...
      const match = opLoc.match(/analyzeResults\/([^?]+)/);
      if (match) return match[1];
      return opLoc;
    }
  }

  // Check body-level fields
  if (typeof obj.operationLocation === 'string') {
    const match = obj.operationLocation.match(/analyzeResults\/([^?]+)/);
    if (match) return match[1];
    return obj.operationLocation;
  }
  if (typeof obj.resultId === 'string') return obj.resultId;

  // Recurse into data/body wrappers
  const inner = obj.data ?? obj.body ?? obj.result;
  if (inner && typeof inner === 'object') return extractOperationId(inner);

  return null;
}

// ─── Azure OpenAI Responses API ─────────────────────────────────────────────
// Uses the new CustCon_AzureOpenAI_Responses connector (POST /openai/responses)
// This is the Responses API — NOT Chat Completions. Format is completely different.

export type ReasoningEffort = 'low' | 'medium' | 'high';

export const OPENAI_DEFAULTS = {
  apiVersion: '2025-04-01-preview',
  model: 'gpt-5.2',
  max_output_tokens: 4096,
  /** Reasoning effort — undefined means no reasoning (GPT models). Set per-agent for o-series. */
  reasoningEffort: undefined as ReasoningEffort | undefined,
  /** Reasoning summary — 'auto' | 'detailed' | 'none'. Only used when reasoning is active. */
  reasoningSummary: 'auto' as 'auto' | 'detailed' | 'none',
  store: true,
} as const;

// ─── Responses API Request Types ────────────────────────────────────────────

/** Input item for the Responses API `input` array */
export type ResponseInputItem =
  | { type: 'message'; role: 'user' | 'system' | 'developer'; content: ResponseInputContent[] | string }
  | { type: 'function_call'; call_id: string; name: string; arguments: string }
  | { type: 'function_call_output'; call_id: string; output: string };

export interface ResponseInputContent {
  type: 'input_text' | 'input_image';
  text?: string;
  image_url?: string;
  detail?: 'auto' | 'low' | 'high';
}

/** Tool definition for the Responses API */
export type ResponseTool =
  | { type: 'function'; name: string; description: string; parameters: Record<string, unknown>; strict?: boolean }
  | { type: 'web_search'; search_context_size?: 'low' | 'medium' | 'high' };

export interface ResponsesApiRequest {
  model: string;
  input: ResponseInputItem[];
  instructions?: string;
  tools?: ResponseTool[];
  tool_choice?: 'auto' | 'required' | 'none';
  /** Reasoning config — only for models that support it. summary controls thought visibility */
  reasoning?: {
    effort: ReasoningEffort;
    summary?: 'auto' | 'detailed' | 'none';
  };
  max_output_tokens?: number;
  // NOTE: temperature removed — Responses API doesn't accept it
  store?: boolean;
  stream?: boolean;
  background?: boolean;
  /** Continue from a previous response — enables multi-turn without re-sending full input */
  previous_response_id?: string;
}

// ─── Responses API Response Types ───────────────────────────────────────────

/** Output item types from the Responses API */
export type ResponseOutputItem =
  | ResponseReasoningItem
  | ResponseMessageItem
  | ResponseFunctionCallItem
  | ResponseWebSearchItem;

export interface ResponseReasoningItem {
  id: string;
  type: 'reasoning';
  summary: Array<{ type: 'summary_text'; text: string }>;
}

export interface ResponseMessageItem {
  id: string;
  type: 'message';
  role: 'assistant';
  status: 'completed' | 'in_progress';
  content: Array<{
    type: 'output_text';
    text: string;
    annotations?: Array<{
      type: 'url_citation';
      url: string;
      title?: string;
      start_index: number;
      end_index: number;
    }>;
  }>;
}

export interface ResponseFunctionCallItem {
  id: string;
  type: 'function_call';
  status: 'completed';
  name: string;
  arguments: string;
  call_id: string;
}

export interface ResponseWebSearchItem {
  id: string;
  type: 'web_search_call';
  status: 'completed' | 'searching';
  action?: {
    type: 'search' | 'open_page';
    queries?: string[];
    query?: string;
    url?: string;
  };
}

export interface ResponsesApiResponse {
  id: string;
  object: 'response';
  status: 'completed' | 'failed' | 'in_progress' | 'incomplete';
  model: string;
  output: ResponseOutputItem[];
  usage?: {
    input_tokens: number;
    output_tokens: number;
    total_tokens: number;
    input_tokens_details?: { cached_tokens: number };
    output_tokens_details?: { reasoning_tokens: number };
  };
  error?: unknown;
  /** The tools that were available (echoed back) */
  tools?: ResponseTool[];
}

/** Extended token usage with reasoning and cache breakdown */
export interface ExtendedTokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  reasoningTokens: number;
  cachedTokens: number;
}

// ─── Responses API Client ───────────────────────────────────────────────────

export const azureOpenAI = {
  /**
   * Send a request to the Azure OpenAI Responses API.
   * Returns the full ResponsesApiResponse with typed output items.
   */
  createResponse: (request: ResponsesApiRequest, apiVersion = OPENAI_DEFAULTS.apiVersion) => {
    const body: Record<string, unknown> = {
      model: request.model || OPENAI_DEFAULTS.model,
      input: request.input,
      stream: false,
      background: false,
      store: request.store ?? OPENAI_DEFAULTS.store,
    };

    // Instructions (system prompt) — goes in `instructions` field, not as a message
    if (request.instructions) {
      body.instructions = request.instructions;
    }

    // Tools
    if (request.tools && request.tools.length > 0) {
      body.tools = request.tools;
      body.tool_choice = request.tool_choice ?? 'auto';
    }

    // Reasoning — only add if explicitly set
    if (request.reasoning) {
      body.reasoning = {
        effort: request.reasoning.effort,
        summary: request.reasoning.summary ?? OPENAI_DEFAULTS.reasoningSummary,
      };
    }

    // Max output tokens
    if (request.max_output_tokens) {
      body.max_output_tokens = request.max_output_tokens;
    }

    // NOTE: Temperature is NOT sent for the Responses API.
    // The API defaults to temperature=1 internally.
    // Sending temperature can cause errors or unexpected behavior.

    // Multi-turn continuation
    if (request.previous_response_id) {
      body.previous_response_id = request.previous_response_id;
    }

    return tracedOperation<void>(
      'AzureOpenAI.createResponse',
      'connector',
      { apiVersion, body },
      () =>
        CustCon_AzureOpenAI_ResponsesService.response_post(apiVersion, body)
    ).then((result: IOperationResult<void>) => {
      const normalized = normalizeConnectorResponse(result) as ResponsesApiResponse;
      return { raw: result, normalized };
    });
  },

  /**
   * Retrieve a previous response by ID (GET /openai/v1/responses/:id)
   */
  getResponse: (responseId: string) => {
    return tracedOperation<void>(
      'AzureOpenAI.getResponse',
      'connector',
      { responseId },
      () =>
        CustCon_AzureOpenAI_ResponsesService.response_get(responseId)
    ).then((result: IOperationResult<void>) => {
      const normalized = normalizeConnectorResponse(result) as ResponsesApiResponse;
      return { raw: result, normalized };
    });
  },
};

// ─── Response Helpers ───────────────────────────────────────────────────────

/** Extract all text content from a Responses API response */
export function extractResponseText(response: ResponsesApiResponse): string {
  return response.output
    .filter((item): item is ResponseMessageItem => item.type === 'message')
    .flatMap(msg => msg.content.filter(c => c.type === 'output_text').map(c => c.text))
    .join('\n\n');
}

/** Extract all function calls from a Responses API response */
export function extractFunctionCalls(response: ResponsesApiResponse): ResponseFunctionCallItem[] {
  return response.output.filter(
    (item): item is ResponseFunctionCallItem => item.type === 'function_call'
  );
}

/** Extract all reasoning summaries from a Responses API response */
export function extractReasoningSummaries(response: ResponsesApiResponse): string[] {
  return response.output
    .filter((item): item is ResponseReasoningItem => item.type === 'reasoning')
    .flatMap(r => r.summary.map(s => s.text))
    .filter(Boolean);
}

/** Extract web search calls from a Responses API response */
export function extractWebSearchCalls(response: ResponsesApiResponse): ResponseWebSearchItem[] {
  return response.output.filter(
    (item): item is ResponseWebSearchItem => item.type === 'web_search_call'
  );
}

/** Extract URL citations from message output */
export function extractCitations(response: ResponsesApiResponse): Array<{ url: string; title?: string }> {
  return response.output
    .filter((item): item is ResponseMessageItem => item.type === 'message')
    .flatMap(msg => msg.content)
    .flatMap(c => c.annotations ?? [])
    .filter(a => a.type === 'url_citation')
    .map(a => ({ url: a.url, title: a.title }));
}

/** Extract token usage from response into our ExtendedTokenUsage format */
export function extractTokenUsage(response: ResponsesApiResponse): ExtendedTokenUsage {
  const u = response.usage;
  return {
    inputTokens: u?.input_tokens ?? 0,
    outputTokens: u?.output_tokens ?? 0,
    totalTokens: u?.total_tokens ?? 0,
    reasoningTokens: u?.output_tokens_details?.reasoning_tokens ?? 0,
    cachedTokens: u?.input_tokens_details?.cached_tokens ?? 0,
  };
}

// ─── Azure Document Intelligence ─────────────────────────────────────────────

export interface AnalyzeDocumentRequest {
  urlSource?: string;
  base64Source?: string;
}

export interface AnalyzeDocumentResult {
  status: string;
  analyzeResult?: {
    content?: string;
    pages?: unknown[];
    tables?: unknown[];
    paragraphs?: unknown[];
    figures?: unknown[];
  };
}

const DOC_INTEL_POLL_INTERVAL_MS = 2000;
const DOC_INTEL_MAX_POLLS = 30; // 60s max

/** Central defaults for Document Intelligence. */
export const DOC_INTEL_DEFAULTS = {
  apiVersion: '2024-11-30',
  outputContentFormat: 'markdown',
  features: 'ocrHighResolution',
} as const;

export const azureDocIntelligence = {
  /** Submit document for analysis - returns raw response with Operation-Location */
  analyzeDocument: (
    body: AnalyzeDocumentRequest,
    apiVersion = DOC_INTEL_DEFAULTS.apiVersion,
    outputContentFormat = DOC_INTEL_DEFAULTS.outputContentFormat,
    features = DOC_INTEL_DEFAULTS.features,
  ) =>
    tracedOperation<void>(
      'AzureDocIntelligence.AnalyzeDocument',
      'connector',
      { apiVersion, body, outputContentFormat, features },
      () =>
        CustCon_AzureDocIntService.AnalyzeDocument(
          apiVersion,
          body as Record<string, unknown>,
          outputContentFormat,
          features,
        )
    ).then((result: IOperationResult<void>) => {
      const normalized = normalizeConnectorResponse(result);
      const operationId = extractOperationId(result) ?? extractOperationId(normalized);
      return { raw: result, normalized, operationId };
    }),

  /** Poll for analysis result by ID */
  getAnalyzeResult: (resultId: string, apiVersion = DOC_INTEL_DEFAULTS.apiVersion) =>
    tracedOperation<void>(
      'AzureDocIntelligence.GetAnalyzeResult',
      'connector',
      { apiVersion, resultId },
      () =>
        CustCon_AzureDocIntService.GetAnalyzeResult(apiVersion, resultId)
    ).then((result: IOperationResult<void>) => {
      const normalized = normalizeConnectorResponse(result) as AnalyzeDocumentResult | null;
      return { raw: result, normalized };
    }),

  /**
   * Full flow: submit document, poll until done, return extracted content.
   * Uses ocrHighResolution + markdown output by default.
   * Emits debug events for each step.
   */
  analyzeAndWait: async (
    body: AnalyzeDocumentRequest,
    apiVersion = DOC_INTEL_DEFAULTS.apiVersion,
    outputContentFormat = DOC_INTEL_DEFAULTS.outputContentFormat,
    features = DOC_INTEL_DEFAULTS.features,
  ): Promise<{
    operationId: string | null;
    status: string;
    content: string | null;
    analyzeResult: unknown | null;
    raw: unknown;
  }> => {
    // Step 1: Submit
    const submitResult = await azureDocIntelligence.analyzeDocument(body, apiVersion, outputContentFormat, features);
    const operationId = submitResult.operationId;

    if (!operationId) {
      return {
        operationId: null,
        status: 'error',
        content: null,
        analyzeResult: null,
        raw: submitResult,
      };
    }

    // Step 2: Poll
    for (let i = 0; i < DOC_INTEL_MAX_POLLS; i++) {
      await new Promise((r) => setTimeout(r, DOC_INTEL_POLL_INTERVAL_MS));

      const pollResult = await azureDocIntelligence.getAnalyzeResult(operationId, apiVersion);
      const data = pollResult.normalized;

      if (data && typeof data === 'object') {
        const status = (data as AnalyzeDocumentResult).status;
        if (status === 'succeeded') {
          const analyzeResult = (data as AnalyzeDocumentResult).analyzeResult;
          return {
            operationId,
            status: 'succeeded',
            content: analyzeResult?.content ?? null,
            analyzeResult,
            raw: pollResult.raw,
          };
        }
        if (status === 'failed') {
          return {
            operationId,
            status: 'failed',
            content: null,
            analyzeResult: null,
            raw: pollResult.raw,
          };
        }
        // still running — continue polling
      }
    }

    return {
      operationId,
      status: 'timeout',
      content: null,
      analyzeResult: null,
      raw: null,
    };
  },
};

// ─── SAP OData ───────────────────────────────────────────────────────────────
// IMPORTANT: The custom connector only accepts POST requests.
// The `method` field inside the body tells the Power Automate proxy flow
// which HTTP method to execute against SAP (GET/POST/PATCH/DELETE).
// The connector itself always POSTs the request envelope to the flow trigger.

export interface SapODataRequest {
  /** HTTP method the proxy flow should execute against SAP */
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  /** SAP relative path, e.g. "/API_SALES_ORDER_SRV/A_SalesOrder" */
  relativePath: string;
  /** OData query string, e.g. "$top=10&$filter=SalesOrder eq '123'" */
  queryString?: string;
  /** Request body for POST/PATCH operations */
  body?: unknown;
  /** Custom headers — NOTE: may not be supported by all connector configurations */
  headers?: Record<string, string>;
}

/** Central defaults for SAP OData connector (Power Automate proxy flow). */
export const SAP_ODATA_DEFAULTS = {
  apiVersion: '1',
  sp: '/triggers/manual/run',
  sv: '1.0',
} as const;

export const sapOData = {
  /**
   * Execute a SAP OData request via Power Automate proxy flow.
   * The connector always sends POST — the `method` field in the body
   * tells the flow which HTTP verb to use against SAP.
   */
  execute: (request: SapODataRequest, apiVersion = SAP_ODATA_DEFAULTS.apiVersion, sp = SAP_ODATA_DEFAULTS.sp, sv = SAP_ODATA_DEFAULTS.sv) =>
    tracedOperation<Record<string, unknown>>(
      `SAP.OData.${request.method} ${request.relativePath}`,
      'connector',
      { apiVersion, sp, sv, body: request },
      () =>
        CustCon_SAP_OdataService.ExecuteSapODataRequest(
          apiVersion,
          sp,
          sv,
          request as unknown as Record<string, unknown>
        )
    ).then((result: IOperationResult<Record<string, unknown>>) => {
      const normalized = normalizeConnectorResponse(result);
      return { raw: result, normalized };
    }),
};
