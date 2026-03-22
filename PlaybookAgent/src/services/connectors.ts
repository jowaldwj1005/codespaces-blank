/**
 * Connector Wrappers - Normalized access to all custom connectors.
 * Each connector gets a normalizer that handles the variable response wrapping
 * patterns (body, data, result, raw.success.data) and emits debug events.
 */

import { CustomConnector_AzureOpenAIService } from '../generated/services/CustomConnector_AzureOpenAIService';
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
  if (typeof raw !== 'object') return raw;

  const obj = raw as Record<string, unknown>;

  // Try common wrapper keys in order of specificity
  if (obj.raw && typeof obj.raw === 'object') {
    const rawObj = obj.raw as Record<string, unknown>;
    if (rawObj.success && typeof rawObj.success === 'object') {
      const successObj = rawObj.success as Record<string, unknown>;
      if (successObj.data !== undefined) return successObj.data;
    }
    if (rawObj.data !== undefined) return rawObj.data;
  }
  if (obj.result !== undefined) return obj.result;
  if (obj.data !== undefined) return obj.data;
  if (obj.body !== undefined) return obj.body;

  return raw;
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

// ─── Azure OpenAI ────────────────────────────────────────────────────────────

/** Central defaults for OpenAI parameters. Change here to affect all calls. */
export const OPENAI_DEFAULTS = {
  apiVersion: '2025-01-01-preview',
  max_completion_tokens: 800,
  temperature: 0.7,
} as const;

export interface ChatCompletionRequest {
  messages: Array<{ role: string; content: string }>;
  temperature?: number;
  max_completion_tokens?: number;
  tools?: unknown[];
  tool_choice?: string | object;
}

export interface ChatCompletionResponse {
  id?: string;
  choices?: Array<{
    message?: {
      role?: string;
      content?: string | null;
      tool_calls?: Array<{
        id: string;
        type: string;
        function: { name: string; arguments: string };
      }>;
    };
    finish_reason?: string;
  }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
}

export const azureOpenAI = {
  chatCompletion: (request: ChatCompletionRequest, apiVersion = OPENAI_DEFAULTS.apiVersion) => {
    // Apply central defaults; caller can override
    const body = {
      ...request,
      temperature: request.temperature ?? OPENAI_DEFAULTS.temperature,
      max_completion_tokens: request.max_completion_tokens ?? OPENAI_DEFAULTS.max_completion_tokens,
    };
    return tracedOperation<void>(
      'AzureOpenAI.chatCompletion',
      'connector',
      { apiVersion, body },
      () =>
        CustomConnector_AzureOpenAIService.chat_completion(apiVersion, body as unknown as Record<string, unknown>)
    ).then((result: IOperationResult<void>) => {
      const normalized = normalizeConnectorResponse(result) as ChatCompletionResponse;
      return { raw: result, normalized };
    });
  },
};

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

export interface SapODataRequest {
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  relativePath: string;
  queryString?: string;
  body?: unknown;
  headers?: Record<string, string>;
}

/** Central defaults for SAP OData connector (Power Automate proxy flow). */
export const SAP_ODATA_DEFAULTS = {
  apiVersion: '1',
  sp: '/triggers/manual/run',
  sv: '1.0',
} as const;

export const sapOData = {
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
