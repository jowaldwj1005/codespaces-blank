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

// ─── Azure OpenAI ────────────────────────────────────────────────────────────

export interface ChatCompletionRequest {
  messages: Array<{ role: string; content: string }>;
  temperature?: number;
  max_tokens?: number;
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
  chatCompletion: (request: ChatCompletionRequest, apiVersion = '2025-01-01-preview') =>
    tracedOperation<void>(
      'AzureOpenAI.chatCompletion',
      'connector',
      { apiVersion, body: request },
      () =>
        CustomConnector_AzureOpenAIService.chat_completion(apiVersion, request as unknown as Record<string, unknown>)
    ).then((result: IOperationResult<void>) => {
      const normalized = normalizeConnectorResponse(result) as ChatCompletionResponse;
      return { raw: result, normalized };
    }),
};

// ─── Azure Document Intelligence ─────────────────────────────────────────────

export interface AnalyzeDocumentRequest {
  urlSource?: string;
  base64Source?: string;
}

export const azureDocIntelligence = {
  analyzeDocument: (
    body: AnalyzeDocumentRequest,
    apiVersion = '2024-11-30',
    outputContentFormat = 'markdown'
  ) =>
    tracedOperation<void>(
      'AzureDocIntelligence.AnalyzeDocument',
      'connector',
      { apiVersion, body, outputContentFormat },
      () =>
        CustCon_AzureDocIntService.AnalyzeDocument(
          apiVersion,
          body as Record<string, unknown>,
          outputContentFormat
        )
    ).then((result: IOperationResult<void>) => {
      const normalized = normalizeConnectorResponse(result);
      return { raw: result, normalized };
    }),

  getAnalyzeResult: (resultId: string, apiVersion = '2024-11-30') =>
    tracedOperation<void>(
      'AzureDocIntelligence.GetAnalyzeResult',
      'connector',
      { apiVersion, resultId },
      () =>
        CustCon_AzureDocIntService.GetAnalyzeResult(apiVersion, resultId)
    ).then((result: IOperationResult<void>) => {
      const normalized = normalizeConnectorResponse(result);
      return { raw: result, normalized };
    }),
};

// ─── SAP OData ───────────────────────────────────────────────────────────────

export interface SapODataRequest {
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  relativePath: string;
  queryString?: string;
  body?: unknown;
  headers?: Record<string, string>;
}

export const sapOData = {
  execute: (request: SapODataRequest, apiVersion = '2024-01-01', sp = '/triggers/manual/paths/invoke', sv = '1.0') =>
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
