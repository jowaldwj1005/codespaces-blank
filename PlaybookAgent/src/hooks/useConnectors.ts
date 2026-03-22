import { useState, useCallback } from 'react';
import { azureOpenAI, azureDocIntelligence, sapOData } from '../services/connectors';
import type { ChatCompletionRequest, SapODataRequest, AnalyzeDocumentRequest } from '../services/connectors';

interface UseConnectorState {
  result: unknown | null;
  loading: boolean;
  error: string | null;
}

export function useConnectors() {
  const [state, setState] = useState<UseConnectorState>({
    result: null,
    loading: false,
    error: null,
  });

  const callOpenAI = useCallback(async (request: ChatCompletionRequest) => {
    setState({ result: null, loading: true, error: null });
    try {
      const response = await azureOpenAI.chatCompletion(request);
      setState({ result: response, loading: false, error: null });
      return response;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setState({ result: null, loading: false, error: msg });
      return null;
    }
  }, []);

  const callDocIntelligence = useCallback(async (body: AnalyzeDocumentRequest) => {
    setState({ result: null, loading: true, error: null });
    try {
      const response = await azureDocIntelligence.analyzeDocument(body);
      setState({ result: response, loading: false, error: null });
      return response;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setState({ result: null, loading: false, error: msg });
      return null;
    }
  }, []);

  const callSapOData = useCallback(async (request: SapODataRequest) => {
    setState({ result: null, loading: true, error: null });
    try {
      const response = await sapOData.execute(request);
      setState({ result: response, loading: false, error: null });
      return response;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setState({ result: null, loading: false, error: msg });
      return null;
    }
  }, []);

  return { ...state, callOpenAI, callDocIntelligence, callSapOData };
}
